/* ============================================================
   マップ選択画面（ホームのイベント枠をタップ → ブロスタ風のカード一覧）
   ・モードごとにカードが並ぶ。カードのヘッダ＝モードの色・アイコン・モード名・マップ名、下の絵＝バナー
       エメラルドハント … 紫 / アイコン=ui1.png(無ければ描いたマーク) / 洞窟マップ → banner.png
       ノックアウト     … オレンジ / アイコン=nocki.png(無ければ描いたマーク) / 砂漠マップ → banner2.png
       強奪(ヘイスト)  … ピンク / アイコン=gouda.png(無ければ描いたマーク) / お菓子マップ → banner3.png
     画像が同じフォルダに無いときは、描いたマークとグラデーションで代用する
   ・カードをタップ → そのマップを選んで読み込み直す(マップは起動時に組み立てるため)
   ・カード右上の i → マップ全体の簡易マップ(地形・出撃位置・凡例)
   ・モードやマップを増やすときは、下の MODES に足すだけ
       maps[].id = ゲーム本体のマップ名('gem'＝洞窟 / 'ko'＝砂漠)。新しい地形を足すなら script.js の MAPROWS と合わせる
   ============================================================ */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const HTML = document.documentElement;

  /* ---------- モードとマップの一覧 ---------- */
  const MODES = [
    { id: 'gem', name: 'エメラルドハント', col: '#a63ff0', dark: '#6d1fb8',
      rule: '中央の鉱山から出てくるジェムを10個集めて、そのまま12秒間守り切ったチームの勝ち。ジェムを持ったままやられると落としてしまう。',
      maps: [{ id: 'gem', name: 'ごつごつ坑道', bg: 'cave' }] },
    { id: 'ko', name: 'ノックアウト', col: '#f58a16', dark: '#b85d00',
      rule: '相手チームを全滅させたらそのラウンドの勝ち。やられたら、そのラウンドが終わるまで復活できない。3ラウンドのうち先に2ラウンド取ったチームの勝ち。時間がたつと毒ガスが迫ってくる。内側の壁は、壁を壊せる攻撃で壊れる。',
      maps: [{ id: 'ko', name: 'ゴールドアームの渓谷', bg: 'desert' }] },
    { id: 'hs', name: '強奪', col: '#e83fa0', dark: '#9c1a6c',
      rule: '相手チームの金庫(HP 80000)を先に壊したチームの勝ち。制限時間内に壊せなければ、金庫のHPが多く残っているチームの勝ち。やられても少しすると復活できるので、自分の金庫も守ろう。内側のクッキーの壁は、壁を壊せる攻撃で壊れる。',
      maps: [{ id: 'hs', name: 'お菓子の金庫室', bg: 'candy' }] }
  ];
  /* マップメーカーで作った maps.js のマップを、モードごとのカード一覧に足す */
  /* マップのテーマ(見た目)：maps.js の "theme"('cave'=洞窟 / 'desert'=砂漠 / 'candy'=お菓子)。無ければモードのもとのテーマ。ルール(mode)とは別々に選べる */
  const themeOf = m => (m.theme === 'cave' || m.theme === 'desert' || m.theme === 'candy') ? m.theme : m.mode === 'ko' ? 'desert' : m.mode === 'hs' ? 'candy' : 'cave';
  (window.MAPS || []).forEach(m => { if (m.builtin) return; const md = MODES.find(x => x.id === m.mode); if (md) md.maps.push({ id: m.id, name: String(m.name).replace(/[<>&"]/g, ''), bg: themeOf(m) }); });
  const ALL = [];
  MODES.forEach(m => m.maps.forEach(mp => ALL.push({ mode: m, map: mp })));
  const cur = () => ALL.find(e => e.map.id === MAPID) || ALL[0];
  let roomMode = null;   /* マルチのルーム左下のボタンから開いた時＝選んだマップは「ルームのマップ」になる(ルームのマップのidが入る) */
  const curId = () => roomMode !== null ? roomMode : MAPID;
  const curEntry = () => ALL.find(e => e.map.id === curId()) || cur();
  const closeView = () => { if (roomMode !== null) { roomMode = null; try { MRUI.cancelPick(); } catch (_) {} setView('room'); } else setView('home'); };

  /* ---------- モードのアイコン ---------- */
  const koSVG = (() => {
    let t = '';
    for (let i = 0; i < 8; i++) t += `<rect x="27" y="2.5" width="10" height="11" rx="2" transform="rotate(${i * 45} 32 32)"/>`;
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><g fill="#fff" stroke="#1b0a33" stroke-width="2.2" stroke-linejoin="round">${t}<circle cx="32" cy="32" r="21"/></g><circle cx="32" cy="32" r="13" fill="#e8302c" stroke="#1b0a33" stroke-width="2.2"/><circle cx="32" cy="32" r="5" fill="#ffd9d4"/></svg>`;
  })();
  const gemSVG = (() => {
    const g = document.querySelector('#hm .gm');
    return g ? g.outerHTML.replace('class="gm"', 'class="gs"') : '<svg viewBox="0 0 64 64"><path d="M38 14 60 27V52L38 64 16 52V27Z" fill="#a66bff" stroke="#1b0a33" stroke-width="3"/></svg>';
  })();
  const hsSVG = (() => {   /* gouda.png が無い時の強奪アイコン：金庫 */
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><g stroke="#1b0a33" stroke-width="2.6" stroke-linejoin="round"><rect x="9" y="8" width="46" height="46" rx="7" fill="#5f9be6"/><rect x="15" y="14" width="34" height="34" rx="4" fill="#3d72cc"/><rect x="14" y="54" width="8" height="5" fill="#2a4f96"/><rect x="42" y="54" width="8" height="5" fill="#2a4f96"/><circle cx="32" cy="31" r="10" fill="#ffc53a"/><circle cx="32" cy="31" r="4.5" fill="#ffe27a"/></g><path d="M32 31V22M32 31h8" stroke="#1b0a33" stroke-width="2.4" stroke-linecap="round"/></svg>`;
  })();
  const iconHTML = id => `<span class="mi ${id}">${id === 'ko' ? koSVG : id === 'hs' ? hsSVG : gemSVG}</span>`;

  /* ---------- ホームのイベント枠 ---------- */
  function applyHome() {
    const c = cur();
    HTML.classList.toggle('ko-sel', c.mode.id !== 'gem');   /* ジェム以外(ノックアウト・強奪)の時は、ホームの枠のジェムの絵をモードのアイコンに差し替える */
    const k = $('#hmko'); if (k) { k.className = 'mi ' + (c.mode.id === 'hs' ? 'hs' : 'ko'); k.innerHTML = c.mode.id === 'hs' ? hsSVG : koSVG; }
    const n = $('#hmn'), m = $('#hmm');
    if (n) n.textContent = c.mode.name;
    if (m) m.textContent = c.map.name;
  }

  /* ---------- カード一覧 ---------- */
  let built = false;
  function build() {
    if (built) return; built = true;
    const L = $('#msl'), N = $('#msn');
    MODES.forEach(mode => {
      const g = document.createElement('div'); g.className = 'mg'; g.dataset.mode = mode.id;
      mode.maps.forEach(map => {
        const d = document.createElement('div');
        d.className = 'mc'; d.dataset.map = map.id;
        d.style.setProperty('--mc', mode.col); d.style.setProperty('--md', mode.dark);
        d.innerHTML = `<div class="mco"><div class="mcq"><div class="mcs"></div><div class="mch">${iconHTML(mode.id)}<div class="mct"><b class="tx">${mode.name}</b><small class="tx">${map.name}</small></div></div><div class="mb ${map.bg}"></div></div></div><button class="mci" aria-label="マップ情報">i</button>`;
        tap(d, e => {
          if (e && e.target && e.target.closest && e.target.closest('.mci')) return;
          pick(map.id);
        });
        tap(d.querySelector('.mci'), () => { sfx('cli', .9); info(map.id); });
        g.appendChild(d);
      });
      L.appendChild(g);
      const b = document.createElement('button'); b.className = 'msi'; b.dataset.mode = mode.id; b.setAttribute('aria-label', mode.name);
      b.innerHTML = iconHTML(mode.id);
      tap(b, () => { sfx('cli', .9); const gg = L.querySelector(`.mg[data-mode="${mode.id}"]`); if (gg) L.scrollTo({ left: Math.max(0, gg.offsetLeft - 8 * vmin()), behavior: 'smooth' }); });
      N.appendChild(b);
    });
    dragScroll(L);
    tap($('#msb'), () => { sfx('clib', .9); closeView(); });
    tap($('#msh'), () => { sfx('clib', .9); closeView(); });
  }
  const vmin = () => Math.min(innerWidth, innerHeight) / 100;

  /* 横スクロール(縦持ちで画面が回転している時も、指の動きと向きが合うように自前で動かす) */
  function dragScroll(el) {
    let d = null;
    const X = e => (innerHeight > innerWidth ? e.clientY : e.clientX);
    el.addEventListener('pointerdown', e => { d = { x: X(e), s: el.scrollLeft, m: 0, id: e.pointerId }; });
    el.addEventListener('pointermove', e => {
      if (!d) return;
      const dx = X(e) - d.x;
      if (!d.m && Math.abs(dx) > 10) { d.m = 1; try { el.setPointerCapture(d.id); } catch (_) {} }
      if (d.m) el.scrollLeft = d.s - dx;
    });
    const end = () => { d = null; };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    el.addEventListener('wheel', e => { el.scrollLeft += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY; e.preventDefault(); }, { passive: false });
  }

  function open() {
    build();
    const L = $('#msl');
    /* 強奪はマルチプレイ未対応：ルームのマップ選びの時は出さない */
    document.querySelectorAll('#ms [data-mode="hs"]').forEach(el => { el.style.display = roomMode !== null ? 'none' : ''; });
    L.querySelectorAll('.mc').forEach(c => {
      const on = c.dataset.map === curId();
      c.classList.toggle('on', on);
      c.querySelector('.mcs').textContent = on ? '選択中' : '';
    });
    const c = curEntry();
    document.querySelectorAll('#msn .msi').forEach(b => b.classList.toggle('on', b.dataset.mode === c.mode.id));
    const sel = L.querySelector('.mc.on');
    L.scrollLeft = sel ? Math.max(0, sel.offsetLeft - 10 * vmin()) : 0;
  }

  function pick(id) {
    sfx('cli', .9);
    if (roomMode !== null) {            /* ルームの中：マップを決めてルーム画面に戻る(変更は全員に配られる) */
      roomMode = null;
      try { MRUI.pickMap(id); } catch (_) {}
      setView('room');
      return;
    }
    if (id === MAPID) { setView('home'); return; }
    try { localStorage.setItem('gemrush_map', id); } catch (_) {}
    /* 外枠(index.html)の中なら、再読み込みせず外枠に「表示の入れ替え」を頼む(先読み済みのマップが一瞬で出る) */
    if (window.top !== window) { try { parent.postMessage({ gf: 'map', id: id, sel: sel }, '*'); return; } catch (_) {} }
    setTimeout(() => {
      try { const u = new URL(location.href); u.searchParams.set('map', id); location.replace(u.toString()); }
      catch (_) { location.reload(); }
    }, 120);
  }

  /* ---------- 簡易マップ ---------- */
  const PAL = {
    gem: { bg: '#6c5462', '#': '#252a78', R: '#d8d0f4', K: '#e650e0', C: '#e0963a', B: '#8f5a2c', b: '#2fbfa0', S: '#4f86d8' },
    ko: { bg: '#f4a775', F: '#c98a4b', W: '#d0613f', '~': '#2fa3f0', b: '#f1a31a', C: '#e0963a', B: '#8f5a2c', c: '#3fa860', S: '#4f86d8' },
    hs: { bg: '#3f8791', W: '#f7a31f', S: '#4f86d8', b: '#e0307f', L: '#2f8cff', M: '#ff9fc8', P: '#e0307f', Y: '#e0123a' }
  };
  const NAMES = { '#': 'がけ', R: '岩', K: 'クリスタル', C: '木箱', B: 'たる', W: '壁(壊せる攻撃で壊れる)', F: '柵', '~': '水', b: 'ブッシュ', c: 'サボテン', S: '金庫(HP 80000)', L: 'ロリポップ', M: 'マシュマロ', P: 'ロープ', Y: 'さくらんぼ' };
  const NAMES_HS = { W: 'クッキーの壁(壊せる攻撃で壊れる)', L: 'ロリポップ(通れないが弾は通る)', M: 'マシュマロ(通れないが弾は通る)', P: 'キャンディロープ(通れないが弾は通る)', Y: 'さくらんぼ(通れないが弾は通る)', S: '金庫(HP 80000)', b: 'ブッシュ' };
  const SPAWN = { gem: { b: 30.5, t: 2.5 }, ko: { b: 33.5, t: 1.5 }, hs: { b: 32.25, t: 0.75 } };   /* キー: gem=洞窟 / ko=砂漠 / hs=お菓子 のテーマ */
  const PK = { cave: 'gem', desert: 'ko', candy: 'hs' };   /* テーマ → パレット・出撃位置のキー */
  const SPX = [8.5, 10.5, 12.5];
  const SPP = {};
  Object.keys(SPAWN).forEach(k => { SPP[k] = { b: SPX.map(x => [x, SPAWN[k].b]), t: SPX.map(x => [x, SPAWN[k].t]) }; });
  (window.MAPS || []).forEach(m => { if (m.builtin) return; const k = PK[themeOf(m)]; PAL[m.id] = PAL[k]; const s = m.spawn || {}; SPP[m.id] = { b: s.blue || SPP[k].b, t: s.red || SPP[k].t }; });

  function drawMap(cv, key, modeId) {
    const rows = MAPROWS[key], pal = PAL[key], T = 16, w = 21, h = rows.length;
    cv.width = w * T; cv.height = h * T;
    const x = cv.getContext('2d');
    x.fillStyle = pal.bg; x.fillRect(0, 0, cv.width, cv.height);
    x.strokeStyle = 'rgba(0,0,0,.07)'; x.lineWidth = 1;
    for (let i = 1; i < w; i++) { x.beginPath(); x.moveTo(i * T + .5, 0); x.lineTo(i * T + .5, cv.height); x.stroke(); }
    for (let j = 1; j < h; j++) { x.beginPath(); x.moveTo(0, j * T + .5); x.lineTo(cv.width, j * T + .5); x.stroke(); }
    const rr = (a, b, c, d, r) => { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + c, b, a + c, b + d, r); x.arcTo(a + c, b + d, a, b + d, r); x.arcTo(a, b + d, a, b, r); x.arcTo(a, b, a + c, b, r); x.closePath(); };
    for (let z = 0; z < h; z++) for (let i = 0; i < w; i++) {
      const t = rows[z][i], c = pal[t], px = i * T, py = z * T;
      if (!c || t === 'bg' || t === '.') continue;
      x.fillStyle = c;
      if (t === '#') { x.fillRect(px, py, T, T); continue; }
      if (t === 'S') { rr(px - 2, py - 2, T + 4, T + 4, 4); x.fill(); x.strokeStyle = '#1b2a5a'; x.lineWidth = 1.6; x.stroke(); x.fillStyle = '#ffd23f'; x.beginPath(); x.arc(px + T / 2, py + T / 2, T * .24, 0, 7); x.fill(); continue; }
      if (t === 'L' || t === 'M' || t === 'Y') { x.beginPath(); x.arc(px + T / 2, py + T / 2, T * .38, 0, 7); x.fill(); x.fillStyle = 'rgba(255,255,255,.45)'; x.beginPath(); x.arc(px + T * .38, py + T * .36, T * .1, 0, 7); x.fill(); continue; }
      if (t === 'P') { rr(px, py + T * .22, T, T * .56, T * .26); x.fill(); continue; }
      if (t === 'F') { x.fillRect(px, py + T * .3, T, T * .4); x.fillStyle = 'rgba(255,255,255,.3)'; x.fillRect(px, py + T * .3, T, 2); continue; }
      if (t === '~') { rr(px + 1, py + 1, T - 2, T - 2, 4); x.fill(); x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(px + 4, py + 5, T * .45, 2); continue; }
      if (t === 'b') {
        rr(px + 1, py + 1, T - 2, T - 2, 5); x.fill();
        x.fillStyle = pal === PAL.hs ? '#ff9ec7' : pal === PAL.ko ? '#ffd445' : '#7cf0d0';
        [[.3, .35], [.68, .4], [.48, .7]].forEach(([a, b]) => { x.beginPath(); x.arc(px + T * a, py + T * b, T * .16, 0, 7); x.fill(); });
        continue;
      }
      if (t === 'c') { x.beginPath(); x.arc(px + T / 2, py + T / 2, T * .36, 0, 7); x.fill(); x.fillStyle = '#e2303c'; x.beginPath(); x.arc(px + T / 2, py + T * .25, T * .1, 0, 7); x.fill(); continue; }
      if (t === 'B') { x.beginPath(); x.arc(px + T / 2, py + T / 2, T * .4, 0, 7); x.fill(); x.strokeStyle = '#4a2c10'; x.lineWidth = 1.4; x.stroke(); continue; }
      if (t === 'K') { x.beginPath(); x.moveTo(px + T / 2, py + 1); x.lineTo(px + T - 2, py + T * .45); x.lineTo(px + T / 2, py + T - 1); x.lineTo(px + 2, py + T * .45); x.closePath(); x.fill(); x.fillStyle = 'rgba(255,255,255,.4)'; x.beginPath(); x.moveTo(px + T / 2, py + 1); x.lineTo(px + 2, py + T * .45); x.lineTo(px + T / 2, py + T * .5); x.closePath(); x.fill(); continue; }
      if (t === 'W') { rr(px + .5, py + .5, T - 1, T - 1, 2); x.fill(); x.strokeStyle = 'rgba(70,20,10,.55)'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(px + 1, py + T / 2); x.lineTo(px + T - 1, py + T / 2); x.moveTo(px + T / 2, py + 1); x.lineTo(px + T / 2, py + T / 2); x.moveTo(px + T * .25, py + T / 2); x.lineTo(px + T * .25, py + T - 1); x.moveTo(px + T * .75, py + T / 2); x.lineTo(px + T * .75, py + T - 1); x.stroke(); continue; }
      /* R(岩)・C(木箱) */
      rr(px + 1, py + 1, T - 2, T - 2, 3); x.fill();
      x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 1.2; x.stroke();
      if (t === 'C') { x.beginPath(); x.moveTo(px + 3, py + 3); x.lineTo(px + T - 3, py + T - 3); x.moveTo(px + T - 3, py + 3); x.lineTo(px + 3, py + T - 3); x.stroke(); }
    }
    /* 中央(ジェムの湧く場所) */
    const cx = 10.5 * T, cz = modeId !== 'gem' ? -99 : h / 2 * T;   /* ジェムの湧く場所があるのはエメラルドハントだけ(ノックアウト・強奪は画面の外に描いて消す) */
    x.fillStyle = 'rgba(255,92,230,.9)'; x.strokeStyle = '#fff'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(cx, cz - T * .8); x.lineTo(cx + T * .8, cz); x.lineTo(cx, cz + T * .8); x.lineTo(cx - T * .8, cz); x.closePath(); x.fill(); x.stroke();
    /* 出撃位置：下＝自分のチーム(青)、上＝相手(赤) */
    const sp = SPAWN[key];
    const SP = SPP[key]; [[SP.b, '#37a3ff'], [SP.t, '#ff4a4a']].forEach(([ps, c]) => ps.forEach(([sx, z]) => {
      x.beginPath(); x.arc(sx * T, z * T, T * .5, 0, 7); x.fillStyle = c; x.fill(); x.lineWidth = 2; x.strokeStyle = '#fff'; x.stroke();
    }));
    return rows;
  }

  function info(id) {
    const e = ALL.find(a => a.map.id === id) || cur(), key = e.map.id;
    if (typeof MAPROWS === 'undefined' || !MAPROWS[key]) return;   // const は window に付かないので typeof で見る
    const P = $('#mp');
    P.style.setProperty('--mc', e.mode.col); P.style.setProperty('--md', e.mode.dark);
    $('#mpi').innerHTML = iconHTML(e.mode.id);
    $('#mpa').textContent = e.mode.name; $('#mpb').textContent = e.map.name;
    $('#mpd').textContent = e.mode.rule;
    const rows = drawMap($('#mpm'), key, e.mode.id), seen = {};
    rows.forEach(r => { for (const t of r) seen[t] = 1; });
    const L = $('#mpl'); L.innerHTML = '';
    const add = (c, n) => { const s = document.createElement('span'); s.innerHTML = `<i style="background:${c}"></i>${n}`; L.appendChild(s); };
    Object.keys(NAMES).forEach(t => { if (seen[t] && PAL[key][t]) add(PAL[key][t], (e.map.bg === 'candy' && NAMES_HS[t]) || NAMES[t]); });
    if (e.mode.id === 'gem') add('#ff5ce6', 'ジェムが出る場所');
    add('#37a3ff', '自分のチームの出撃位置');
    add('#ff4a4a', '相手の出撃位置');
    P.hidden = false;
  }

  tap($('#mpx'), () => { sfx('clib', .9); $('#mp').hidden = true; });
  $('#mp').addEventListener('pointerup', e => { if (e.target === $('#mp')) $('#mp').hidden = true; });

  /* ---------- ホームのイベント枠 ---------- */
  tap($('#hm'), e => {
    if (e && e.target && e.target.closest && e.target.closest('#hmi')) return;
    sfx('cli', .9); setView('maps');
  });
  tap($('#hmi'), () => { sfx('cli', .9); info(cur().map.id); });
  applyHome();

  window.MSUI = {
    open, info,
    entry: id => ALL.find(e => e.map.id === id) || null,
    icon: iconHTML,
    openFor(id) { const r = id || MAPID; roomMode = r === 'hs' ? 'gem' : r; setView('maps'); }
  };
})();
