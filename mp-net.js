/* ============================================================
   マルチプレイ通信層（Firebase Realtime Database）
   ------------------------------------------------------------
   DBの形（すべて gr/ の下。別ゲームのデータとは混ざらない）
     gr/open                         … いま入れるルームの目印 { room, ts }
     gr/rooms/{rid}/lobby            … { state:'lobby'|'playing', jo, players:{pid:{slot,jo,name,nc,ch,ready,lost}}, game:{t0,cfg[6]} }   nc＝名前の色の番号(0〜11)
     gr/rooms/{rid}/st/{pid}         … その人が持っているユニットの状態（位置・HPなど。約16回/秒）
     gr/rooms/{rid}/ev/{push}        … みんなに配るイベント（攻撃・ジェム・やられ・終了）
     gr/rooms/{rid}/gm/{gemId}       … ジェムの取り合い判定（先にtransactionで取った人の勝ち）

   スロット：0〜2 = Aチーム(上段) / 3〜5 = Bチーム(下段)。人がいない枠はBOT。
   ============================================================ */
(function (root) {
  'use strict';
  const P = 'gr/';
  const MAXP = 6;
  const START_DELAY = 1800;   // 「開始」から試合の頭までの猶予(ms)。全員の端末が準備する時間
  const STALE_MS = 8000;      // これ以上状態が来なければ「切断」とみなす

  function makeId() {
    return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  }

  function create(db, opts) {
    opts = opts || {};
    const N = {};
    const pid = opts.pid || makeId();
    const chCount = opts.chCount || 12;
    const ref = p => db.ref(P + p);
    let offset = 0, connected = true;
    try { db.ref('.info/serverTimeOffset').on('value', s => { offset = +s.val() || 0; }); } catch (e) {}
    try { db.ref('.info/connected').on('value', s => { const c = s.val() !== false; if (c && !connected) grace = performance.now() + 4000; connected = c; }); } catch (e) {}

    N.pid = pid;
    N.now = () => Date.now() + offset;
    N.rid = null;
    N.lobby = null;
    N.START_DELAY = START_DELAY;

    let lobbyRef = null, lobbyCb = null, lobbyListener = null;
    let gameRefs = null, staleTimer = null;
    const lastRecv = {};
    let lastAny = 0, gameT0 = 0, grace = 0, lastChk = 0;

    /* ---------- 小道具 ---------- */
    const keys = o => Object.keys(o || {});
    const live = ps => keys(ps).filter(k => !ps[k].lost);
    const leaderOf = ps => {                       // 先に入った人（lost除く）がリーダー兼ホスト
      let b = null;
      for (const k of live(ps)) if (b === null || ps[k].jo < ps[b].jo) b = k;
      return b;
    };
    N.leaderOf = leaderOf;
    function pickSlot(ps) {
      const used = new Set(keys(ps).map(k => ps[k].slot));
      const cnt = [0, 0];
      used.forEach(s => cnt[s < 3 ? 0 : 1]++);
      const team = cnt[1] < cnt[0] ? 1 : 0;        // 人が少ないチームから埋める（同数ならA）
      for (const t of [team, 1 - team]) for (let i = 0; i < 3; i++) if (!used.has(t * 3 + i)) return t * 3 + i;
      return -1;
    }
    function buildCfg(ps) {
      const cfg = [];
      let bn = 0;
      for (let s = 0; s < MAXP; s++) {
        const k = keys(ps).find(q => ps[q].slot === s && !ps[q].lost);
        if (k) cfg.push({ pid: k, name: ps[k].name, ch: ps[k].ch, nc: ps[k].nc | 0 });
        else cfg.push({ bot: 1, name: 'ボット' + (++bn), ch: Math.floor(Math.random() * chCount) });
      }
      return cfg;
    }
    function derive(v) {
      const ps = v.players || {};
      return { state: v.state, players: ps, leader: leaderOf(ps), game: v.game || null, map: v.map || null, me: pid };
    }
    function freshLobby(profile) {
      const o = { state: 'lobby', jo: 0, ts: N.now(), players: {} };
      if (profile.map) o.map = profile.map;          // ルームのマップ(リーダーが左下のボタンで変えられる)
      o.players[pid] = { slot: 0, jo: 0, name: profile.name, nc: profile.nc | 0, ch: profile.ch, ready: false };
      return o;
    }
    const newRoomId = () => 'r' + Date.now().toString(36) + makeId();

    /* ---------- 1. ランダムマッチ（入れるルームがあれば入る／なければ作る） ---------- */
    async function tryJoin(rid, profile) {
      const lr = ref('rooms/' + rid + '/lobby');
      const warm = lr.on('value', () => {});
      try {
        await lr.once('value');
        for (let i = 0; i < 4; i++) {
          const res = await lr.transaction(cur => {
            if (!cur || cur.state !== 'lobby' || !cur.players) return;
            const ps = cur.players;
            if (keys(ps).length >= MAXP) return;
            const slot = pickSlot(ps);
            if (slot < 0) return;
            cur.jo = (cur.jo || 0) + 1;
            ps[pid] = { slot, jo: cur.jo, name: profile.name, nc: profile.nc | 0, ch: profile.ch, ready: false };
            return cur;
          }, undefined, false);
          if (res.committed) return 'ok';
          const now = (await lr.once('value')).val();
          if (!now || !now.players || !keys(now.players).length) return 'dead';     // 誰もいない＝本当に死んだルーム
          if (now.state !== 'lobby') return 'started';                              // 試合中（消してはいけない）
          if (keys(now.players).length >= MAXP) return 'full';
          // それ以外（取り合いに負けた等）は少し待ってもう一度
          await new Promise(r => setTimeout(r, 60 + Math.random() * 120));
        }
        return 'full';
      } finally {
        try { lr.off('value', warm); } catch (e) {}
      }
    }

    N.joinRandom = async function (profile, cb) {
      await N.leave(true);
      const deadline = Date.now() + 15000;
      while (Date.now() < deadline) {
        const op = (await ref('open').once('value')).val();
        if (op && op.room) {
          const r = await tryJoin(op.room, profile);
          if (r === 'ok') return attach(op.room, cb);
          if (r === 'dead') ref('rooms/' + op.room).remove().catch(() => {});
          await ref('open').transaction(c => (c && c.room === op.room) ? null : c, undefined, false);   // 閉じたルームの目印を外す
          continue;
        }
        const rid = newRoomId();
        await ref('rooms/' + rid + '/lobby').set(freshLobby(profile));
        const res = await ref('open').transaction(c => (c && c.room) ? undefined : { room: rid, ts: N.now() }, undefined, false);
        if (res.committed) return attach(rid, cb);
        await ref('rooms/' + rid).remove();       // 先に別の人が作っていた → そっちに入り直す
      }
      throw new Error('timeout');
    };

    function attach(rid, cb) {
      N.rid = rid;
      lobbyRef = ref('rooms/' + rid + '/lobby');
      lobbyCb = cb || null;
      try { lobbyRef.child('players/' + pid).onDisconnect().remove(); } catch (e) {}
      let first = true;
      lobbyListener = lobbyRef.on('value', s => {
        const v = s.val();
        if (!v || !v.players || !v.players[pid]) {
          if (first) return;                       // 入った直後の一瞬は無視
          N.lobby = null;
          if (lobbyCb) lobbyCb(null);
          return;
        }
        first = false;
        N.lobby = derive(v);
        if (N.lobby.state === 'playing' && N.lobby.game) gameT0 = N.lobby.game.t0;
        if (lobbyCb) lobbyCb(N.lobby);
      });
      return rid;
    }

    /* ---------- 2. ルーム内の操作 ---------- */
    function lobbyTx(fn) {
      if (!lobbyRef) return Promise.resolve({ committed: false });
      return lobbyRef.transaction(cur => {
        if (!cur || !cur.players || !cur.players[pid]) return;
        return fn(cur);
      }, undefined, false);
    }
    // 空き枠(BOT)をタップ → 移動／人のいる枠をタップ → 場所を交代
    N.moveTo = slot => lobbyTx(cur => {
      if (cur.state !== 'lobby') return;
      const ps = cur.players, me = ps[pid];
      if (!(slot >= 0 && slot < MAXP) || me.slot === slot) return;
      const other = keys(ps).find(k => ps[k].slot === slot);
      if (other) ps[other].slot = me.slot;
      me.slot = slot;
      return cur;
    });
    N.setReady = b => lobbyTx(cur => {
      if (cur.state !== 'lobby') return;
      cur.players[pid].ready = !!b;
      return cur;
    });
    N.setProfile = p => lobbyTx(cur => {
      if (cur.state !== 'lobby') return;
      if (p.name != null) cur.players[pid].name = p.name;
      if (p.nc != null) cur.players[pid].nc = p.nc | 0;
      if (p.ch != null) cur.players[pid].ch = p.ch;
      return cur;
    });
    // リーダーだけ：ルームのマップを変える(全員の端末に配られ、各自そのマップの画面へ移る)。変えたら全員の「準備完了」は外れる
    N.setMap = id => lobbyTx(cur => {
      if (cur.state !== 'lobby' || leaderOf(cur.players) !== pid || !/^[\w-]+$/.test(id || '') || cur.map === id) return;
      cur.map = id;
      keys(cur.players).forEach(k => { cur.players[k].ready = false; });
      return cur;
    });
    // 別のマップの画面(別の iframe / 再読み込み後のページ)へルームを引き継ぐ：DBは触らず、この端末の監視だけやめる
    N.detach = function () {
      const rid = N.rid, lr = lobbyRef, lis = lobbyListener;
      clearInterval(staleTimer); staleTimer = null;
      if (gameRefs) { try { gameRefs.st.off(); gameRefs.ev.off(); gameRefs.gm.off(); } catch (e) {} gameRefs = null; }
      N.rid = null; N.lobby = null; lobbyRef = null; lobbyCb = null; lobbyListener = null;
      if (lr) {
        try { lr.child('players/' + pid).onDisconnect().cancel(); } catch (e) {}
        try { lr.off('value', lis); } catch (e) {}
      }
      return rid ? { rid, pid } : null;
    };
    N.attach = attach;     // 引き継ぐ側：N.attach(rid, onLobby)
    // リーダーだけ。リーダー以外の全員が「準備完了」のときに開始できる
    N.start = async function () {
      let msg = 'fail';
      const res = await lobbyTx(cur => {
        if (cur.state !== 'lobby') { msg = 'started'; return; }
        const ps = cur.players;
        if (leaderOf(ps) !== pid) { msg = 'leader'; return; }
        for (const k of live(ps)) if (k !== pid && !ps[k].ready) { msg = 'notready'; return; }
        cur.state = 'playing';
        cur.game = { t0: N.now() + START_DELAY, cfg: buildCfg(ps) };
        return cur;
      });
      if (!res.committed) return msg;
      ref('open').transaction(c => (c && c.room === N.rid) ? null : c, undefined, false).catch(() => {});
      return 'ok';
    };

    /* ---------- 3. 試合中の通信 ---------- */
    // h: { onState(pid, obj), onEvent(ev), onClaim(gemId, slot) }
    N.openGame = function (h) {
      const base = 'rooms/' + N.rid;
      gameRefs = { st: ref(base + '/st'), ev: ref(base + '/ev'), gm: ref(base + '/gm') };
      const onSt = s => {
        if (s.key === pid) return;
        const now = performance.now();
        lastRecv[s.key] = now; lastAny = now;
        h.onState(s.key, s.val());
      };
      gameRefs.st.on('child_added', onSt);
      gameRefs.st.on('child_changed', onSt);
      gameRefs.ev.on('child_added', s => {
        const v = s.val();
        if (!v || v.f === pid) return;
        lastAny = performance.now();
        h.onEvent(v);
      });
      gameRefs.gm.on('child_added', s => h.onClaim(s.key, s.val()));
      const t = performance.now();
      keys(N.lobby && N.lobby.players).forEach(k => { lastRecv[k] = t; });
      lastAny = t;
      // 状態が途切れた人を「切断」にする（誰が見ても同じ結果になるようDBに書く）
      lastChk = performance.now();
      staleTimer = setInterval(() => {
        const L = N.lobby;
        const now = performance.now();
        const gap = now - lastChk; lastChk = now;
        if (!L || !connected || now < grace) return;
        if (gap > 2500) { grace = now + 4000; return; }       // 自分の端末が止まっていた直後は判定しない（相手が悪いとは限らない）
        for (const k of live(L.players)) {
          if (k === pid) continue;
          if (now - (lastRecv[k] || t) > STALE_MS) N.markLost(k);
        }
      }, 1000);
    };
    N.markLost = k => {
      if (!lobbyRef) return;
      lobbyRef.child('players/' + k).transaction(c => { if (!c || c.lost) return; c.lost = 1; return c; }, undefined, false).catch(() => {});
    };
    N.sendState = obj => { if (gameRefs) { const r = gameRefs.st.child(pid).set(obj); if (r && r.catch) r.catch(() => {}); } };
    N.sendEvent = obj => {
      if (!gameRefs) return;
      const r = gameRefs.ev.push(Object.assign({ f: pid, ts: N.now() }, obj));
      if (r && r.catch) r.catch(() => {});
    };
    // ジェムの取り合い：先にDBへ書けた人の勝ち（結果は Promise<boolean>）
    N.claimGem = (id, slot) => {
      if (!gameRefs) return Promise.resolve(true);
      return gameRefs.gm.child(id).transaction(c => (c != null) ? undefined : slot, undefined, false)
        .then(r => !!r.committed).catch(() => true);
    };
    N.gameT0 = () => gameT0;

    /* ---------- 4. 退出 ---------- */
    N.leave = async function (silent) {
      clearInterval(staleTimer); staleTimer = null;
      if (gameRefs) {
        try { gameRefs.st.off(); gameRefs.ev.off(); gameRefs.gm.off(); } catch (e) {}
        gameRefs = null;
      }
      const rid = N.rid, lr = lobbyRef, lis = lobbyListener;
      N.rid = null; N.lobby = null; lobbyRef = null; lobbyCb = null; lobbyListener = null;
      if (!rid || !lr) return;
      try { lr.child('players/' + pid).onDisconnect().cancel(); } catch (e) {}
      try {
        // リスナーを付けたまま実行する（キャッシュが空だとtransactionが誤って中断されるため）
        const res = await lr.transaction(cur => {
          if (!cur || !cur.players) return;
          delete cur.players[pid];
          if (!keys(cur.players).length) return null;     // 最後の1人が抜けたらルームごと消す
          return cur;
        }, undefined, false);
        const after = res.snapshot ? res.snapshot.val() : null;
        if (res.committed && (!after || !after.players)) {
          ref('rooms/' + rid).remove().catch(() => {});
          ref('open').transaction(c => (c && c.room === rid) ? null : c, undefined, false).catch(() => {});
        }
      } catch (e) {}
      try { lr.off('value', lis); } catch (e) {}
    };

    return N;
  }

  const api = { create, MAXP, START_DELAY, STALE_MS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MPNet = api;
})(typeof window !== 'undefined' ? window : globalThis);
