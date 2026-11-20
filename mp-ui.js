/* ============================================================
   マルチプレイ：ルーム画面（ブロスタのパワーマッチ風）
   ・ランダムマッチ：入れるルームがあればそこへ（最大6人）。いっぱいなら次の人は新しいルーム
   ・上段 = Aチーム / 下段 = Bチーム。人がいない枠は「？」= BOT
   ・BOT枠をタップ → そこへ移動 ／ 人のいる枠をタップ → 場所を交代 ／ 自分の枠をタップ → 名前変更
   ・リーダー（オレンジ）は「開始」、それ以外は「準備完了」
   ============================================================ */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const NAMEK = 'gemrush_name_v1';
  let net = null, L = null, started = false, tok = 0, cards = [], built = false, toastT = 0;

  function myName() {
    let n = null;
    try { n = localStorage.getItem(NAMEK); } catch (e) {}
    if (!n) {
      n = 'ゲスト' + (1000 + Math.floor(Math.random() * 9000));
      try { localStorage.setItem(NAMEK, n); } catch (e) {}
    }
    return n;
  }
  function getNet() {
    if (net) return net;
    if (typeof firebase === 'undefined' || typeof FIREBASE_CONFIG === 'undefined' || typeof MPNet === 'undefined') return null;
    try {
      if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
      net = MPNet.create(firebase.database(), { chCount: CH.length });
    } catch (e) { console.error(e); net = null; }
    return net;
  }

  const SIL = '<svg class="sil" viewBox="0 0 100 120" aria-hidden="true"><circle cx="50" cy="38" r="24" fill="#171a3e"/><path d="M8 120c0-30 18-44 42-44s42 14 42 44z" fill="#171a3e"/></svg><b class="q">?</b>';
  const CROWN = '<svg class="crown" viewBox="0 0 40 32" aria-hidden="true"><path d="M3 27 1 7l11 9L20 2l8 14 11-9-2 20z" fill="#ffc21a" stroke="#1a0f00" stroke-width="2.6" stroke-linejoin="round"/><circle cx="20" cy="21" r="2.6" fill="#ff5a3a"/></svg>';

  function build() {
    if (built) return;
    built = true;
    [['#mra', 0], ['#mrb2', 3]].forEach(([sel, base]) => {
      const row = $(sel);
      for (let i = 0; i < 3; i++) {
        const s = base + i, el = document.createElement('div');
        el.className = 'mrc bot';
        el.innerHTML = '<div class="mrp"></div><div class="mrn tx"></div><div class="mrbar tx"></div>';
        row.append(el);
        cards[s] = el;
        tap(el, () => onCard(s));
      }
    });
  }

  function toast(t, ms) {
    const e = $('#mrt');
    e.textContent = t; e.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(() => e.classList.remove('on'), ms || 2200);
  }
  function wait(t, err) {
    const w = $('#mrw');
    w.hidden = !t;
    if (t) { $('#mrwt').textContent = t; w.classList.toggle('err', !!err); }
  }

  /* ---------- 開く／戻る ---------- */
  function open() {
    const n = getNet();
    if (!n) { toast('オンライン機能を読み込めませんでした。通信を確認してください', 3200); return; }
    build();
    started = false; L = null;
    cards.forEach(c => { c.dataset.k = ''; });
    $('#mrh').hidden = true;
    setView('room');
    render();
    wait('マッチング中…');
    const my = ++tok;
    const fail = m => { if (my !== tok || started) return; wait(m || '接続できませんでした。戻ってもう一度お試しください', true); };
    const wd = setTimeout(() => { if (my === tok && !L) { fail('接続できませんでした（通信状態を確認してください）'); n.leave(); } }, 16000);
    n.joinRandom({ name: myName(), ch: sel }, onLobby).then(() => {
      clearTimeout(wd);
      if (my !== tok) { n.leave(); return; }      // 待っている間に戻った
      wait(null);
    }).catch(err => {
      clearTimeout(wd);
      console.error(err);
      const denied = err && /permission/i.test(String(err.message || err));
      fail(denied ? '接続できませんでした（Firebaseのルールで書き込みが許可されていません）' : null);
    });
  }
  function back(silent) {
    tok++;
    const was = started;
    started = false; L = null;
    if (!silent) sfx('cli', .9);
    try { if (was || MPG.on) MPG.leave(); } catch (e) { console.error(e); }
    if (net) net.leave();
    wait(null);
    $('#mrb3').hidden = true;
    setView('home');
  }

  /* ---------- ロビーの更新 ---------- */
  function onLobby(l) {
    if (!l) {
      if (state === 'room' && !started) { toast('ルームから切断されました', 2600); back(true); }
      return;
    }
    L = l;
    render();
    if (l.state === 'playing' && l.game && !started) beginGame(l);
  }

  function beginGame(l) {
    started = true;
    if (!l.game.cfg.some(e => e.pid === net.pid)) { toast('試合に参加できませんでした'); back(true); return; }
    MPG.begin(net, l.game);
    const b = $('#mrb3');
    b.hidden = false;
    const t0 = l.game.t0;
    const tick = () => {
      if (!started) return;
      const r = Math.ceil((t0 - net.now()) / 1000);
      b.textContent = r > 0 ? 'バトル開始まで ' + r : 'スタート！';
      if (r > 0) setTimeout(tick, 120);
    };
    tick();
    setTimeout(() => {
      if (!started || state !== 'room') return;
      b.hidden = true;
      sfx('ma', 1); bgm(null);
      startGame();
    }, Math.max(0, t0 - net.now() - 250));
  }

  function fillPortrait(el, p) {
    const box = el.querySelector('.mrp');
    box.innerHTML = '';
    if (!p) { box.innerHTML = SIL; return; }
    const ci = Math.max(0, Math.min(CH.length - 1, p.ch | 0));
    box.style.setProperty('--pc', CH[ci].col);
    try { box.append(vsPortrait({ c: CH[ci] })); } catch (e) { box.textContent = CH[ci].ic; }
  }

  function render() {
    if (!built) return;
    const ps = (L && L.players) || {}, me = net ? net.pid : '', leader = L ? L.leader : null;
    const ids = Object.keys(ps);
    let humans = 0;
    for (let s = 0; s < 6; s++) {
      const el = cards[s], k = ids.find(q => ps[q].slot === s), p = k ? ps[k] : null;
      if (p) humans++;
      const key = p ? k + '|' + p.ch : 'bot';
      if (el.dataset.k !== key) { el.dataset.k = key; fillPortrait(el, p); }
      el.classList.toggle('bot', !p);
      el.classList.toggle('me', k === me);
      el.classList.toggle('lead', !!k && k === leader);
      const nm = el.querySelector('.mrn'), tx = p ? p.name : 'BOT';
      nm.textContent = tx; nm.style.fontSize = tx.length > 7 ? '2vmin' : (tx.length > 5 ? '2.3vmin' : '');
      const bar = el.querySelector('.mrbar');
      const st = !p ? 'ready' : (k === leader ? 'lead' : (p.ready ? 'ready' : 'wait'));
      bar.className = 'mrbar tx ' + st;
      bar.textContent = st === 'wait' ? '準備中' : '準備完了';
      const cr = el.querySelector('.crown');
      if (k === leader && !cr) el.insertAdjacentHTML('beforeend', CROWN);
      else if (k !== leader && cr) cr.remove();
    }
    const btn = $('#mrg'), st = $('#mrs');
    if (!L || !ps[me]) { btn.hidden = true; st.textContent = ''; return; }
    btn.hidden = false;
    const isLead = me === leader, others = ids.filter(q => q !== leader), allReady = others.every(q => ps[q].ready);
    if (isLead) {
      btn.textContent = '開始';
      btn.classList.toggle('off', !allReady);
      st.textContent = allReady ? humans + '人でバトル開始できます（残りはBOT）' : '全員の準備完了を待っています…';
    } else {
      btn.textContent = ps[me].ready ? '準備取消' : '準備完了';
      btn.classList.remove('off');
      st.textContent = ps[me].ready ? 'リーダーの開始を待っています…' : '準備ができたら「準備完了」を押してね';
    }
  }

  /* ---------- 操作 ---------- */
  function onCard(s) {
    if (!L || started) return;
    const ps = L.players, k = Object.keys(ps).find(q => ps[q].slot === s);
    if (k === net.pid) {            // 自分の枠 → 名前変更
      const v = prompt('名前を入力してください（10文字まで）', ps[k].name);
      if (v && v.trim()) {
        const nm = v.trim().slice(0, 10);
        try { localStorage.setItem(NAMEK, nm); } catch (e) {}
        net.setProfile({ name: nm });
      }
      return;
    }
    sfx('cli', .9);
    net.moveTo(s);                  // BOT枠なら移動／人がいれば場所を交代
  }

  function init() {
    if (!$('#mr')) return;
    tap($('#mrb'), () => back());
    tap($('#mri'), () => { sfx('cli', .9); $('#mrh').hidden = !$('#mrh').hidden; });
    tap($('#mrh'), () => { $('#mrh').hidden = true; });
    tap($('#mrg'), async () => {
      if (!L || started) return;
      sfx('cli', .9);
      const ps = L.players, me = net.pid;
      if (!ps[me]) return;
      if (me === L.leader) {
        const r = await net.start();
        if (r === 'notready') toast('全員の準備完了を待っています');
        else if (r !== 'ok') toast('開始できませんでした。もう一度お試しください');
      } else net.setReady(!ps[me].ready);
    });
  }

  window.MRUI = {
    open,
    refresh() { if (state === 'room' && built) { cards.forEach(c => { c.dataset.k = ''; }); render(); } },
  };
  init();
})();
