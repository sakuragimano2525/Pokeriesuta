/* ============================================================
   設定画面（ホーム右上の歯車）：解像度 / アンチエイリアス / 影 / マップ先読み
   各項目は 低・中・高 の3段階（初期値は全部「高」＝いちばんきれい）。値は GCFG（script.js）が端末に保存する。
   ・解像度とマップ先読みは、押した瞬間に反映される
   ・アンチエイリアスと影は描画の作り直しが必要なので、変更したら「再読み込みして反映」（あとで反映でもOK）
   ============================================================ */
(function () {
  'use strict';
  const ROWS = [
    { k: 'res', t: '解像度（画質）',
      h: ['描画サイズ 50%（いちばん軽い）', '描画サイズ 75%', '描画サイズ 100%（いちばんきれい）'] },
    { k: 'aa', t: 'アンチエイリアス',
      h: ['なし（輪郭がギザギザ・いちばん軽い）', 'FXAA（軽めのなめらか処理）', 'MSAA（いちばんきれい）'] },
    { k: 'sh', t: '影',
      h: ['なし（いちばん軽い）', '軽い影（解像度 1024）', 'きれいな影（解像度 2048・なめらか）'] },
    { k: 'pl', t: 'マップの先読み',
      h: ['しない（切り替え時に読み込む・メモリ節約）', '1つだけ先読み', 'すべて先読み（ブロスタ本家のようにすぐ切り替わる）'] }
  ];
  const NM = ['低', '中', '高'];
  let built = false;
  const ref = {};   // k -> { btns:[…], hint:el }

  function build() {
    if (built) return;
    built = true;
    const list = $('#stl');
    ROWS.forEach(r => {
      const row = document.createElement('div');
      row.className = 'str';
      const title = document.createElement('b');
      title.className = 'tx';
      title.textContent = r.t;
      const grp = document.createElement('div');
      grp.className = 'stg';
      const btns = NM.map((n, i) => {
        const b = document.createElement('button');
        b.className = 'tx';
        b.textContent = n;
        grp.appendChild(b);
        tap(b, () => choose(r.k, i));
        return b;
      });
      const hint = document.createElement('small');
      hint.className = 'tx';
      row.append(title, grp, hint);
      list.appendChild(row);
      ref[r.k] = { btns, hint };
    });
    tap($('#stx'), () => { sfx('cli', .9); close(); });
    tap($('#sto'), () => { sfx('cli', .9); reload(); });
  }

  function refresh() {
    ROWS.forEach(r => {
      const v = GCFG.get(r.k), o = ref[r.k];
      o.btns.forEach((b, i) => b.classList.toggle('on', i === v));
      o.hint.textContent = r.h[v];
    });
    const need = GCFG.need();
    $('#stn').hidden = !need;
    $('#sto').hidden = !need;
    $('#stx').textContent = need ? 'あとで' : '閉じる';
  }

  function choose(k, v) {
    if (GCFG.get(k) === v) return;
    sfx('cli', .9);
    GCFG.set(k, v);            // 保存（他のマップ/外枠には storage イベントで伝わる）
    if (k === 'res') applyRes();   // 解像度はすぐ反映
    refresh();
  }

  function reload() {
    $('#sto').disabled = true;
    msg('再読み込みします…', 1200);
    setTimeout(() => {
      try { (window.top !== window ? window.parent : window).location.reload(); }
      catch (e) { location.reload(); }
    }, 250);
  }

  function open() {
    build();
    GCFG.sync();
    refresh();
    $('#st').hidden = false;
  }
  function close() { $('#st').hidden = true; }

  tap($('#hcfg'), () => { sfx('cli', .9); open(); });
})();
