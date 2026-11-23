/* ============================================================
   プロフィール：名前・名前の色・アイコン
   ------------------------------------------------------------
   ・ホーム左上の「プロフィール」ボタン → 設定画面(#pf)
   ・名前は gemrush_name_v1（マルチプレイの名前と共通）／色は gemrush_ncol_v1／アイコンは gemrush_icon_v1 に保存
   ・アイコン＝キャラの顔（VSカットイン・ノックアウト上部と同じ素材。script.js の vsPortrait を使う）
   ・フレンドバトルでは名前と色が相手にも伝わる（mp-ui.js / mp-net.js / mp-game.js が PF を参照）
   ============================================================ */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const NK = 'gemrush_name_v1', CK = 'gemrush_ncol_v1', IK = 'gemrush_icon_v1', MAXN = 10;

  /* 名前の色（代表12色）。通信では番号だけを送る */
  const COLS = [
    ['白', '#ffffff'], ['赤', '#ff4a4a'], ['オレンジ', '#ff9a1a'], ['黄', '#ffe14a'],
    ['黄緑', '#a6e83c'], ['緑', '#3ccf4c'], ['ターコイズ', '#14d6b8'], ['水色', '#5ad0ff'],
    ['青', '#4a7dff'], ['紫', '#b46bff'], ['ピンク', '#ff7ab8'], ['シルバー', '#b9c2d6']
  ];

  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  const clampName = v => Array.from(String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, '').trim()).slice(0, MAXN).join('');
  const clampCol = v => { v = v | 0; return v >= 0 && v < COLS.length ? v : 0; };
  const clampIc = v => { v = v | 0; return v >= 0 && v < CH.length ? v : 0; };

  let name = '', nc = 0, ic = 0;

  function load() {
    name = clampName(ls.get(NK));
    if (!name) {
      name = 'ゲスト' + (1000 + Math.floor(Math.random() * 9000));
      ls.set(NK, name);
    }
    nc = clampCol(ls.get(CK));
    ic = clampIc(ls.get(IK));
  }

  const PF = {
    COLS, MAXN,
    name: () => name,
    nc: () => nc,
    ic: () => ic,
    colorOf: i => COLS[clampCol(i)][1],
    color: () => COLS[nc][1],
    setName(v) {
      const n = clampName(v);
      if (!n) return false;
      name = n; ls.set(NK, n); refresh();
      return true;
    },
    setColor(i) { nc = clampCol(i); ls.set(CK, String(nc)); refresh(); },
    setIcon(i) { ic = clampIc(i); ls.set(IK, String(ic)); refresh(); },
    /* 別マップ(別iframe)で変更された内容を読み直す */
    reload() { load(); refresh(); }
  };
  window.PF = PF;
  load();

  /* ---------- 表示 ---------- */
  function portrait(i) {
    try { return vsPortrait({ c: CH[i] }); }
    catch (e) {
      const d = document.createElement('div'), s = document.createElement('span');
      d.className = 'vp'; s.textContent = CH[i].ic; d.append(s);
      return d;
    }
  }
  function put(box, i) { box.innerHTML = ''; box.append(portrait(i)); }

  let opened = false, rq = 0, built = false, sw = [], tiles = [];

  function drawHome() {
    const b = $('#hpf');
    if (!b) return;
    put(b.querySelector('.pfi'), ic);
    const n = b.querySelector('.pfn'), len = Array.from(name).length;
    n.textContent = name;
    n.style.color = PF.color();
    n.style.fontSize = len > 8 ? '2.8vmin' : len > 6 ? '3.3vmin' : '';
  }

  function drawScreen() {
    if (!built) return;
    put($('#pfp'), ic);
    const nm = $('#pfnm'), len = Array.from(name).length;
    nm.textContent = name;
    nm.style.color = PF.color();
    nm.style.fontSize = len > 8 ? '3.6vmin' : len > 6 ? '4.2vmin' : '';
    sw.forEach((e, i) => e.classList.toggle('on', i === nc));
    tiles.forEach((e, i) => { e.classList.toggle('on', i === ic); put(e.querySelector('.pic'), i); });
  }

  /* サムネイルが後から出来上がる時など、何度も呼ばれても1フレームに1回だけ描き直す */
  function refresh() {
    if (rq) return;
    rq = requestAnimationFrame(() => { rq = 0; drawHome(); if (opened) drawScreen(); });
  }

  /* ---------- 設定画面 ---------- */
  function build() {
    if (built) return;
    built = true;
    const sg = $('#pfs'), ig = $('#pfg');
    COLS.forEach(([label, hex], i) => {
      const b = document.createElement('button');
      b.className = 'pfsw'; b.style.setProperty('--c', hex); b.setAttribute('aria-label', label);
      sg.append(b); sw[i] = b;
      tap(b, () => { sfx('cli', .9); PF.setColor(i); });
    });
    CH.forEach((c, i) => {
      const b = document.createElement('button');
      b.className = 'pit'; b.setAttribute('aria-label', c.n);
      b.innerHTML = '<div class="pic"></div><i class="pck"></i>';
      ig.append(b); tiles[i] = b;
      tap(b, () => { sfx('cli', .9); PF.setIcon(i); });
    });
    /* アイコンが増えて1画面に収まらなくなった時のため、ドラッグでスクロール（画面回転モードでも動くよう自前処理） */
    const g = $('#pfr');
    let dr = null;
    g.addEventListener('pointerdown', e => { dr = { y: gp(e).y, s: g.scrollTop, m: 0 }; });
    addEventListener('pointermove', e => {
      if (!dr) return;
      const y = gp(e).y;
      if (Math.abs(y - dr.y) > 10) dr.m = 1;
      if (dr.m) g.scrollTop = dr.s - (y - dr.y);
    });
    addEventListener('pointerup', () => { dr = null; });
    addEventListener('pointercancel', () => { dr = null; });
  }

  /* ゲーム内の名前入力欄。ブラウザ標準の prompt() を使うと全画面・横向き固定が解除されてしまうため、自前で出す */
  let askCb = null;
  function ask(cur, cb) {
    const box = $('#pn'), inp = $('#pni');
    if (!box || !inp) { const v = prompt('名前を入力してください（' + MAXN + '文字まで）', cur); if (v != null) cb(v); return; }
    askCb = cb;
    inp.value = cur || '';
    box.hidden = false;
    try { inp.focus(); inp.select(); } catch (e) {}
  }
  function askDone(ok) {
    const box = $('#pn'), inp = $('#pni');
    if (ok) {
      const v = clampName(inp.value);
      if (!v) { inp.focus(); return; }          // 空のままでは確定しない
      const cb = askCb; askCb = null; box.hidden = true; inp.blur();
      if (cb) cb(v);
      return;
    }
    askCb = null; box.hidden = true; inp.blur();
  }
  PF.ask = ask;
  function editName() {
    sfx('cli', .9);
    ask(name, v => PF.setName(v));
  }

  window.PFUI = {
    open() {
      build();
      opened = true;
      try { $('#pf').style.backgroundImage = 'url(' + HBG.image.toDataURL('image/jpeg', .8) + ')'; } catch (e) {}
      $('#pfr').scrollTop = 0;
      drawScreen();
    },
    close() { opened = false; },
    refresh
  };

  function init() {
    if (!$('#hpf')) return;
    tap($('#hpf'), () => { sfx('cli', .9); setView('profile'); });
    const back = () => { sfx('clib', .9); window.PFUI.close(); setView('home'); };
    tap($('#pfb'), back);
    tap($('#pfh'), back);
    tap($('#pfe'), editName);
    tap($('#pfnm'), editName);
    if ($('#pn')) {
      tap($('#pno'), () => { sfx('cli', .9); askDone(true); });
      tap($('#pnx'), () => { sfx('clib', .9); askDone(false); });
      $('#pn').addEventListener('pointerdown', e => { if (e.target === $('#pn')) askDone(false); });   // 外側タップ＝キャンセル
      $('#pni').addEventListener('keydown', e => {
        if (e.isComposing || e.keyCode === 229) return;                                                  // 日本語変換中のEnterは確定に使わない
        if (e.key === 'Enter') { e.preventDefault(); askDone(true); }
        else if (e.key === 'Escape') askDone(false);
        e.stopPropagation();
      });
    }
    drawHome();
  }
  init();
})();
