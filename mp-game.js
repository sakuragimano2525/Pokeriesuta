/* ============================================================
   マルチプレイ：試合中の同期（script.js の MPG フックから呼ばれる）
   ------------------------------------------------------------
   考え方
   ・各ユニットには「持ち主の端末」が1つ決まっている
       人間のユニット … その人の端末 ／ ボット(や切断した人)のユニット … ホスト（先に入った人）の端末
   ・持ち主の端末だけが、そのユニットの位置・HP・ジェム・死亡を決める（u.rem=false）
   ・それ以外の端末では「分身」(u.rem=true)。位置は届いた状態へ滑らかに寄せる（速度で先読み）
   ・攻撃/ジェム/やられ/終了は「イベント」で全員に配り、各端末が同じ弾を再生する。
       イベントの遅れ分は弾を進めて合わせる（遅延補正）
   ・ダメージ判定は「やられる側の端末」で行う → 自分の画面で当たったものが当たり
   ・座標は「Aチーム基準」で通信。Bチームの端末は点対称に反転して使う（マップは点対称）
   ============================================================ */
(function () {
  'use strict';
  const M = window.MPG;
  let net = null, cfg = null, flip = false, myT = 0, myS = 0;
  let claimed = {}, pend = {}, gseq = 0, lastSend = 0, lastJson = '';
  const KINDS = ['', 'stealth', 'guard', 'blaze'];
  const SPX = [8.5, 10.5, 12.5];

  const nrm = a => Math.atan2(Math.sin(a), Math.cos(a));
  const cX = x => flip ? W - x : x;
  const cZ = z => flip ? H - z : z;
  const cA = a => flip ? nrm(a + Math.PI) : nrm(a);     // 反転は自己逆変換（通信用⇄自分の画面用 どちらにも使える）
  const cV = v => flip ? -v : v;

  M.on = false; M.U = {}; M.hostPid = null; M.slot = -1; M.t0 = 0; M.bt0 = 0; M.dropped = false;

  /* ---------- 開始 ---------- */
  M.begin = function (n, game) {
    net = n; M.net = n; cfg = game.cfg; M.cfg = cfg;
    myS = cfg.findIndex(e => e.pid === n.pid);
    myT = myS < 3 ? 0 : 1; flip = myT === 1;
    M.slot = myS; M.myT = myT;
    M.t0 = game.t0; M.bt0 = game.t0 + 4400;      // 4.4秒 = イントロの長さ
    claimed = {}; pend = {}; gseq = 0; lastSend = 0; lastJson = '';
    M.U = {}; M.dropped = false; M.reqT = 0; M.reqL = 0;
    M.on = true;
    refreshHost();
    n.openGame({ onState, onEvent, onClaim });
  };

  M.leave = function () {
    const n = net;
    M.on = false; M.U = {}; M.net = null; net = null; cfg = null;
    if (n) n.leave();
  };

  /* ---------- ユニット作成（自分のチームが必ず team 0 ＝画面の下） ---------- */
  const canonSpawn = s => s < 3 ? { x: SPX[s], z: 30.5 } : { x: W - SPX[s - 3], z: 2.5 };
  function ownerPid(s) {
    const e = cfg[s], L = net.lobby;
    if (e.pid) {
      if (!L || !L.players) return e.pid;
      const p = L.players[e.pid];
      if (p && !p.lost) return e.pid;
    }
    return M.hostPid;
  }
  function refreshHost() {
    const L = net.lobby;
    M.hostPid = (L && L.players) ? (net.leaderOf(L.players) || net.pid) : net.pid;
  }
  M.isHost = () => !!net && M.hostPid === net.pid;

  M.makeUnits = function () {
    const order = [myS];
    for (let s = 0; s < 6; s++) if (s !== myS && (s < 3 ? 0 : 1) === myT) order.push(s);
    for (let s = 0; s < 6; s++) if ((s < 3 ? 0 : 1) !== myT) order.push(s);
    M.U = {};
    order.forEach(s => {
      const e = cfg[s], t = (s < 3 ? 0 : 1) === myT ? 0 : 1;
      const ci = Math.max(0, Math.min(CH.length - 1, e.ch | 0));
      const u = mkUnit(ci, t, s % 3, s === myS);
      u.slot = s;
      u.pn = s === myS ? 'あなた' : e.name;
      if (!e.bot && s !== myS) u.nm = e.name;
      if (s === myS) P0 = u;
      u.rem = ownerPid(s) !== net.pid;
      if (u.rem) {
        const p = canonSpawn(s);
        u.x = cX(p.x); u.z = cZ(p.z);
        u.root.position.set(u.x, 0, u.z);
      }
      M.U[s] = u;
    });
    for (const s in pend) { const u = M.U[s]; if (u && u.rem) apply(u, pend[s]); }
    pend = {};
  };

  /* ---------- 時計（全員同じサーバー時刻で進める） ---------- */
  M.introT = () => Math.max(0, (net.now() - M.t0) / 1000);
  M.left = () => net ? Math.min(180, 180 - (net.now() - M.bt0) / 1000) : 180;

  /* ---------- 状態の送受信 ---------- */
  function pack(u, now) {
    let n = u._pk;
    if (!n) n = u._pk = { t: now, x: u.x, z: u.z, vx: 0, vz: 0 };
    const dtp = (now - n.t) / 1000;
    if (dtp >= .04) {
      let vx = (u.x - n.x) / dtp, vz = (u.z - n.z) / dtp;
      if (Math.abs(vx) > 30 || Math.abs(vz) > 30) { vx = 0; vz = 0; }    // ワープ（復活など）は速度0
      n.vx = vx; n.vz = vz; n.t = now; n.x = u.x; n.z = u.z;
    }
    const bk = u.bf ? Math.max(0, KINDS.indexOf(u.bf.k)) : 0;
    const fl = (u.alive ? 1 : 0) | (u.fz > 0 ? 2 : 0) | (bk << 2) | (u.bn > 0 ? 16 : 0) | ((u.str > 0 && u.c.a.en) ? 32 : 0);
    return [u.slot, Math.round(cX(u.x) * 100), Math.round(cZ(u.z) * 100), Math.round(cA(u.dir || 0) * 100),
      Math.round(cV(n.vx) * 10), Math.round(cV(n.vz) * 10), Math.round(Math.max(0, u.hp)), Math.round(Math.max(0, u.ammo) * 10),
      u.gems | 0, fl, Math.round(cA(u.sa || 0) * 100), Math.round(u.stt.dm), Math.round(u.stt.hl)];
  }

  function onState(pid, o) {
    if (!o || !o.u) return;
    const ts = o.t || net.now();
    for (const a of o.u) {
      if (!a) continue;
      const e = { ts, x: a[1] / 100, z: a[2] / 100, a: a[3] / 100, vx: a[4] / 10, vz: a[5] / 10, hp: a[6], am: a[7] / 10, gm: a[8], fl: a[9], sa: a[10] / 100, dm: a[11], hl: a[12] };
      const u = M.U[a[0]];
      if (!u) { pend[a[0]] = e; continue; }      // まだユニットを作る前
      if (!u.rem) continue;                      // 自分が持ち主のユニットの情報は使わない
      apply(u, e);
    }
  }

  function apply(u, e) {
    if (u.nt && e.ts < u.nt.ts) return;          // 古い状態が追い越してきた
    const n = u.nt || (u.nt = {});
    n.ts = e.ts; n.x = cX(e.x); n.z = cZ(e.z); n.a = cA(e.a); n.vx = cV(e.vx); n.vz = cV(e.vz);
    const al = !!(e.fl & 1);
    if (al && !u.alive) {
      if (e.ts <= (u.dieTs || 0)) return;        // やられる前に送られた古い状態は無視
      u.alive = true; u.root.visible = true; u.hp = e.hp; u.x = n.x; u.z = n.z; u.ammo = 3; u.fz = 0; u.bf = null;
      try { fx(u.x, 1, u.z, 0xffffff, 12); } catch (_) {}
    } else if (!al && u.alive) {
      u.dieTs = Math.max(u.dieTs || 0, e.ts);
      die(u, null, true);
    }
    if (!al) return;
    u.hp = e.hp; u.ammo = e.am; u.gems = e.gm;
    u.stt.dm = e.dm; u.stt.hl = e.hl;
    if (e.fl & 2) { u.fz = .5; u.fzF = 1; u.frost = 1; } else if (u.fz > 0) u.fz = 0;
    const bk = (e.fl >> 2) & 3;
    if (bk) { if (!u.bf || u.bf.k !== KINDS[bk]) u.bf = { k: KINDS[bk], t: .6 }; else u.bf.t = .6; }
    else if (u.bf) u.bf = null;
    u.bn = (e.fl & 16) ? .3 : 0;
    if (e.fl & 32) { u.str = .2; u.sa = cA(e.sa); } else u.str = 0;     // 炎の連射中
  }

  // 分身の動き：届いた位置へ滑らかに寄せる（速度で先読みして遅れを消す）
  M.move = function (u, dt) {
    const n = u.nt;
    if (!n) { u.mvg = 0; return; }
    const age = Math.min(.25, Math.max(0, (net.now() - n.ts) / 1000));
    const tx = n.x + n.vx * age, tz = n.z + n.vz * age;
    const dx = tx - u.x, dz = tz - u.z;
    if (dx * dx + dz * dz > 25) { u.x = tx; u.z = tz; }
    else { const k = 1 - Math.exp(-dt * 24); u.x += dx * k; u.z += dz * k; }
    u.mvg = (n.vx * n.vx + n.vz * n.vz > .5) ? 1 : 0;
    u.dir = n.a;
  };

  /* ---------- 毎フレーム：持ち主の見直し・状態の送信 ---------- */
  function adopt(u) {                // 切断した人／ボットのユニットを、この端末のAIが引き継ぐ
    u.isP = false; u.at = 0; u.cd = .5; u.pk = { x: u.x, z: u.z }; u.kn = null; u.iv = { x: 0, z: 0 }; u.nt = null;
  }
  M.tick = function (dt) {
    if (!net || !net.rid || M.dropped) return;
    if (state !== 'intro' && state !== 'play' && state !== 'end') return;
    const L = net.lobby;
    if (!L || (L.players[net.pid] && L.players[net.pid].lost)) { drop(); return; }
    refreshHost();
    for (const s in M.U) {
      const u = M.U[s], own = ownerPid(+s) === net.pid;
      if (own === !u.rem) continue;
      u.rem = !own;
      if (own) adopt(u);
    }
    const now = performance.now();
    if (now - lastSend < 60) return;
    const arr = [];
    for (const u of U) if (!u.rem && u.slot != null) arr.push(pack(u, now));
    const j = JSON.stringify(arr);
    if (j === lastJson && now - lastSend < 400) return;      // 変化がなければ0.4秒ごとの生存通知だけ
    lastSend = now; lastJson = j;
    net.sendState({ t: net.now(), u: arr });
  };

  function drop() {
    if (M.dropped) return;
    M.dropped = true;
    try { msg('通信が切れました', 1800); } catch (_) {}
    if (state === 'play' || state === 'intro') { try { end(-1); } catch (e) { console.error(e); } }
  }

  /* ---------- イベント ---------- */
  M.sendAtk = function (u, ang, sp, d) {
    net.sendEvent({ k: 'a', s: u.slot, a: Math.round(cA(ang) * 1000) / 1000, p: sp ? 1 : 0, d: d == null ? -1 : Math.round(d * 100) / 100 });
  };
  M.sendDie = function (e, o) {
    net.sendEvent({ k: 'd', s: e.slot, b: (o && o !== e && o.slot != null) ? o.slot : -1 });
  };
  M.gemNew = function (q) {
    const id = net.pid + '_' + (gseq++).toString(36);
    net.sendEvent({ k: 'g', i: id, x: cX(q.x), z: cZ(q.z), vx: cV(q.vx), vz: cV(q.vz), o: q.o });
    return id;
  };
  M.claim = function (q, u) {
    if (q.id == null) return;
    claimed[q.id] = u.slot;
    net.claimGem(q.id, u.slot).then(won => { if (!won && M.on && u.gems > 0) u.gems--; });   // 取り合いに負けたら戻す
  };
  M.reqEnd = function (w) {
    if (state !== 'play') return true;
    if (M.isHost()) {
      net.sendEvent({ k: 'e', w: w < 0 ? -1 : (w === 0 ? myT : 1 - myT) });
      end(w);
      return true;
    }
    const now = performance.now();
    if (now - M.reqL > 1500) M.reqT = now;
    M.reqL = now;
    if (now - M.reqT > 4000) { end(w); return true; }       // ホストから終了の知らせが来ないときの保険
    return false;
  };

  function onEvent(ev) {
    switch (ev.k) {
      case 'a': replay(ev); break;
      case 'g': {
        if (claimed[ev.i] != null || G.some(q => q.id === ev.i)) break;
        sg(cX(ev.x), cZ(ev.z), { vx: cV(ev.vx), vz: cV(ev.vz), o: ev.o, id: ev.i });
        break;
      }
      case 'd': {
        const v = M.U[ev.s];
        if (!v || !v.rem) break;
        v.dieTs = Math.max(v.dieTs || 0, ev.ts || 0);
        v.stt.d++;
        const k = M.U[ev.b];
        if (k && k !== v) k.stt.k++;
        if (v.alive) die(v, null, true);
        break;
      }
      case 'e': {
        if (state === 'play' || state === 'intro') end(ev.w < 0 ? -1 : (ev.w === myT ? 0 : 1));
        break;
      }
    }
  }

  // 他の人の攻撃を、この画面で再生する（イベントの遅れ分だけ弾を進める）
  function replay(ev) {
    const u = M.U[ev.s];
    if (!u || !u.rem || !u.alive || state !== 'play') return;
    const lag = Math.min(.2, Math.max(0, (net.now() - ev.ts) / 1000));
    const n0 = B.length, q0 = u.q.length;
    try { atk(u, cA(ev.a), !!ev.p, ev.d < 0 ? null : ev.d); } catch (e) { console.error(e); }
    for (let i = n0; i < B.length; i++) {
      const b = B[i];
      if (b.lob) continue;
      b.x += b.vx * lag; b.z += b.vz * lag; b.l -= Math.hypot(b.vx, b.vz) * lag;
      if (b.m && b.m.position) { b.m.position.x = b.x; b.m.position.z = b.z; }
    }
    for (let i = q0; i < u.q.length; i++) u.q[i].t -= lag;
  }

  function onClaim(id, slot) {
    claimed[id] = slot;
    for (let i = G.length - 1; i >= 0; i--) {
      const q = G[i];
      if (q.id !== id) continue;
      gs.remove(q.m); G.splice(i, 1);
      try { fx(q.x, 1, q.z, 0xd08aff, 6); snd('gem', q.x, q.z); } catch (_) {}
    }
  }
})();
