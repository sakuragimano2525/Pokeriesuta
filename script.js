/* MiSans を先に読み込む（3D内の名前表示など canvas 文字にも使うため） */
try{document.fonts&&document.fonts.load('700 24px MiSans','あAa0')}catch(e){}
const MAPS_=Array.isArray(window.MAPS)?window.MAPS:[],MAPID=(()=>{try{const ok=q=>q==='ko'||q==='gem'||MAPS_.some(m=>m.id===q&&!m.builtin);const q=new URLSearchParams(location.search).get('map');if(ok(q)){if(!/[?&]bg=1/.test(location.search))localStorage.setItem('gemrush_map',q);return q}const s=localStorage.getItem('gemrush_map');return ok(s)?s:'gem'}catch(e){return'gem'}})(),CMAP=MAPS_.find(m=>m.id===MAPID&&!m.builtin),KO=(CMAP?CMAP.mode:MAPID)==='ko';
const T=THREE,W=21,H=CMAP?CMAP.rows.length:KO?35:33,$=s=>document.querySelector(s);
/* マップメーカー(index.htm)で作ったマップの出撃位置。無い時は従来の固定位置 */
const SPW=(()=>{const d=CMAP&&CMAP.spawn,df=KO?{b:H-1.5,t:1.5}:{b:30.5,t:2.5},f=(a,z)=>{const p=(a&&a.length?a:[8.5,10.5,12.5].map(x=>[x,z])).slice(0,3);while(p.length<3)p.push(p[p.length-1]);return p};return{b:f(d&&d.blue,df.b),t:f(d&&d.red,df.t)}})();
/* ---------- キャラ定義 ---------- */
const CH=[
{id:0,n:'エルゼ',role:'ブイブイ言わせてる',col:'#b46bff',ic:'🔮',hp:3800,sp:3.9,rl:1.3,ch:.012,sf:'elzeShot',ss:'elzeStar',su:'スーパースター',a:{n:5,spr:.55,d:340,v:20,rng:7},s:{n:9,spr:.95,jit:.03,d:360,v:22,rng:7,size:.26,star:1,kb:3.4,brk:.3,air:5.5},da:'近距離で5発の散弾を放つ',ds:'障害物も敵も吹き飛ばす高威力。攻撃に耐えた敵も押し戻してしまう。'},
{id:1,n:'スーリシャム',role:'砂漠の魔法使い',col:'#37a3ff',ic:'🤠',hp:3000,sp:4.2,rl:1.2,ch:.014,sf:'magicBolt',ss:'magicBurst',su:'魔導バースト',a:{sh:3,gap:.08,jit:.06,d:300,v:26,rng:8.5},s:{sh:12,gap:.07,jit:.02,d:340,v:30,rng:15,size:.22,brk:.3,air:11},da:'3連射の正確なショット',ds:'爆発的な衝撃とともに飛び出す魔法の弾は、障害物も粉砕するパワーと圧倒的な飛距離を誇る。'},
{id:2,n:'ゴウエモン',role:'レッツコンボイ',col:'#ff8a2b',ic:'👊',hp:6200,sp:3.5,rl:1.4,ch:.006,sc:1.3,sf:'goeFist',ss:'goeSlam',su:'ボディプレス',a:{n:3,spr:.7,d:650,v:14,rng:3.6,size:.5},s:{leap:1,d:1500,r:2.8,rng:7,air:7.5,brk:2.3},da:'短距離の強烈な衝撃波',ds:'壁を飛び越えてジャンプ。着地で範囲ダメージ＆吹き飛ばし。着地点の壁を破壊'},
{id:3,n:'アカリリュウ',role:'双子の妹 あかりちゃん',col:'#14b8a6',ic:'👻',hp:2800,sp:4.0,rl:1.6,ch:.02,bc:0x66fff0,sf:'akariSnipe',ss:'poppins',su:'亡霊の瞳',a:{d:900,v:30,rng:11,pierce:1,size:.3},s:{d:1900,v:36,rng:16,pierce:1,size:.7,gh:1,rv:3.5,air:14},da:'敵を貫通する長射程弾',ds:'壁を貫通する亡霊の弾を放ち、全ての敵を3.5秒間透視'},
{id:4,n:'ユニバード',role:'ユニバーサルなやつ',col:'#ff6a2b',ic:'🔥',hp:3600,sp:4,rl:1.1,ch:.02,bc:0xffa030,sf:'flameJet',ss:'oilSpill',su:'ファイアスターター',a:{en:1,gap:.05,jit:.2,d:60,v:15,rng:5.2,size:.26,fl:1,ed:.85,er:.8,ew:.6},s:{oil:5,st:1.1,sp:.95,r:.95,t:12,ft:4,d:110,rng:6,air:6.5},da:'ボタンを押している間、炎を噴射。燃料ゲージを消費し、離すと回復する',ds:'燃料のオイルを撒き散らす。攻撃の炎が触れると燃え上がり、炎の中の敵に継続ダメージ'},
{id:5,n:'グレナーデ',role:'戦場に紅く咲く華',col:'#7fbf4a',ic:'💣',hp:3400,sp:3.8,rl:1.5,ch:.014,bc:0x3a3a48,sf:'dynaThrow',ss:'barrelThrow',su:'地雷原',a:{d:800,v:11,rng:7.5,size:.3,lob:1,aoe:1.6},s:{mine:3,d:1200,aoe:2.2,t:14,rng:5.5,air:7,na:1,brk:1.8},da:'壁を越える爆弾を投げる',ds:'地雷を3つ設置。踏んだ敵は大爆発（敵からは見えない）。爆風で壁も壊れる'},
{id:6,n:'エマ',role:'ちょっと待って！',col:'#e02a3a',ic:'🥷',hp:2600,sp:4.8,rl:1,ch:.012,bc:0xe8eeff,sf:'shuriken',ss:'smokeBomb',su:'霧隠れ',a:{n:3,spr:.3,d:330,v:28,rng:8,size:.14},s:{buff:'stealth',t:4.5,rng:6,air:6.5,na:1},da:'手裏剣を3枚同時に投げる',ds:'4.5秒間、姿を消して加速。その間の与ダメージ+40%'},
{id:7,n:'アルタオーロ',role:'極光',col:'#7ad8ff',ic:'❄️',hp:3300,sp:3.9,rl:1.4,ch:.014,bc:0xaaf0ff,sf:'iceCone',ss:'syrupCan',su:'アブソリュート・ゼロ',a:{n:3,spr:.4,d:380,v:18,rng:8.5,pierce:1,size:.2,slow:1},s:{nova:1,r:4.4,rng:4.4,h:0,d:350,fz:1.8,na:1,air:4.6},da:'貫通する氷弾で敵を減速',ds:'範囲内の敵を1.8秒間凍結して行動不能にする'},
{id:8,n:'アルトマーレ',role:'回復のプロフェッショナル',col:'#ff7ab8',ic:'💉',hp:3200,sp:4,rl:1.2,ch:.02,bc:0xff7ab8,sf:'nurseDart',ss:'nurseCall',su:'ナースコール',a:{d:620,v:20,rng:8,size:.22,heal:1},s:{nova:1,r:4.6,rng:4.6,h:1800,d:700,rev:1,na:1},da:'敵にダメージ・味方を回復する弾',ds:'周囲の味方を大回復し、倒れた味方を全員蘇生'},
{id:9,n:'ヴァルアフィ',role:'鉄爪',col:'#aab4d0',ic:'🛡️',hp:5200,sp:3.6,rl:1.3,ch:.008,sc:1.12,bc:0xcfd8ff,sf:'ironFist',ss:'ironGuard',su:'アイアンガード',a:{n:5,spr:.9,d:380,v:15,rng:3.2,size:.4},s:{buff:'guard',t:4,r:3.8,rng:4,air:5.5,na:1},da:'剣の広範囲スラッシュ',ds:'自分と周囲の味方が4秒間、受けるダメージ-70%'},
{id:10,n:'イヴクロース',role:'ガトリング鬼軍曹',col:'#d0a020',ic:'🔫',hp:5000,sp:3.4,rl:2,ch:.02,sc:1.2,bc:0xffd23f,sf:'rocket',ss:'shockwave',su:'自動砲台',a:{sh:10,gap:.045,jit:.22,d:170,v:24,rng:8,size:.14},s:{tur:1,t:8,d:100,rng:3,air:8,na:1},da:'ガトリング連射',ds:'自動砲台を設置。8秒間、近くの敵を自動で撃ち続ける'},
{id:11,n:'ディザレッジ',role:'電撃ロボ',col:'#8ae6ff',ic:'⚡',hp:3000,sp:4.1,rl:1,ch:.014,bc:0x8ae6ff,sf:'arcZap',ss:'lightning',su:'チェインライトニング',a:{n:2,spr:.2,d:520,v:26,rng:8.5,pierce:1,size:.16},s:{chain:5,d:900,rng:9,hop:5.2,na:1,air:9},da:'貫通する電撃を2本発射',ds:'壁を無視する雷が最大5体に連鎖。感電で一瞬動きを止める'},
{id:12,n:'セイリュウ',role:'変身ヒロイン',col:'#ffd45a',ic:'🌟',hp:5920,sp:4.556,rl:1.6,ch:.02,sch:10,bc:0xffe27a,sf:'nova',ss:'novaForm',su:'ノヴァチェンジ',a:{n:2,pair:.34,spr:0,jit:0,d:768,v:21,rng:5.67,size:.3,pierce:1,star:1},s:{tf:1,d:480,dv:17,rng:4.33,w:2,t:7},tf:{t:7,d:1760,heal:.3,spd:1.25,reach:3.4,arc:130,form:'12t'},stA:[['弾丸ごとのダメージ','768'],['射程','普通 5.67マス'],['リロード速度','普通 1.6秒'],['弾数','3'],['DPS','480']],stS:[['ダッシュダメージ','480'],['剣ダメージ','1760'],['ダメージ回復','30%'],['効果時間','7秒'],['移動速度','+25%'],['射程','普通 4.33マス'],['必殺技チャージに必要なヒット数','10']],da:'髪から貫通する大きなキラキラ弾を2発放つ',ds:'ダッシュしたのちにアルティメットフォームへ変身し、ノヴァソードを召喚！移動速度が上昇し、与えたダメージの30%分HPを回復する。通常攻撃は剣の形に変化する。変身時間は7秒。'}];

/* 元キャラの基礎性能に寄せた設定（スターパワーなどの追加効果は含めない） */
Object.assign(CH.find(c=>c.id===6),{n:'エマ',role:'ちょっと待って！',hp:3200,sp:4.1,rl:1.9,ch:.0252,sf:'shuriken',ss:'smokeBomb',su:'煙玉',a:{n:4,sweep:1,gap:.055,spr:.24,d:440,v:17.5,rng:9.67,size:.14,blade:1,fan:1,ramp:-.595},s:{buff:'stealth',t:6,rng:6.5,air:6.5,na:1},da:'4枚の手裏剣を扇状に、左から右へ順に投げる。近距離ほど全弾が当たり、遠いほどダメージが下がる',ds:'6秒間透明になる。攻撃すると姿が見える。近くの敵や被弾時にも見えてしまう'});
Object.assign(CH.find(c=>c.id===7),{n:'アルタオーロ',role:'極光',hp:3500,sp:3.9,rl:1.1,ch:.0285,sf:'iceCone',ss:'syrupCan',su:'シロップ缶',a:{sh:3,gap:.28,d:440,v:25,rng:9.33,size:.2,cone:1,frost:.1573},s:{lob:1,can:1,v:13,d:40,aoe:3.1,r:3.5,rng:7.67,air:7,t:10,na:1},da:'3連続でスノーコーンを投げる。当たるたびに凍結ゲージが溜まり、満タンで1.5秒間凍結',ds:'壁を越えて缶を投げ、10秒間残る滑る氷のエリアを作る。中の敵は滑って動きにくく、ゲージが溜まり、毎秒40ダメージ'});
Object.assign(CH.find(c=>c.id===5),{n:'グレナーデ',role:'ボムボムボぽむあゆ',hp:3000,sp:3.85,rl:1.6,ch:.03125,sf:'dynaThrow',ss:'barrelThrow',su:'ビッグバレル',a:{n:2,d:800,v:8,rng:7.33,size:.3,lob:1,aoe:1.15,sep:.8},s:{n:1,d:2200,v:5.9,rng:7.33,size:.55,lob:1,aoe:2.27,big:1,nc:1,kb:2.6,brk:2.67},da:'攻撃ボタンを引いて着弾距離を調整。2本のダイナマイトを壁越しに投げ、着地点で爆発',ds:'巨大な樽爆弾を投げる。範囲内の敵に大ダメージ＆吹き飛ばし。壁やブッシュも破壊'});
Object.assign(CH.find(c=>c.id===3),{n:'アカリリュウ',role:'双子の妹 あかりちゃん',hp:2400,sp:3.6,rl:2,ch:.012,sf:'akariSnipe',ss:'poppins',su:'ポピンズ',a:{d:500,v:17,rng:10,size:.25,ramp:2.1},s:{piper:1,n:4,T:.34,ah:1.4,fuse:.45,d:900,aoe:1.6,kb:2,brk:1.5,rng:7.5,air:3.6},da:'遠くまで飛ぶほど威力が上がる狙撃弾（近いと約1/3、最大射程で最大ダメージ）',ds:'ドラッグで着地点を決めて素早くジャンプし、足元に4つの爆弾を落とす。空中では攻撃を受けない。爆弾は少し遅れて爆発し、敵を吹き飛ばして壁も壊す'});
Object.assign(CH.find(c=>c.id===9),{n:'ヴァルアフィ',role:'鉄爪',hp:5400,sp:3.6,rl:1,ch:.012,sf:'ironFist',ss:'ironGuard',su:'強ダメージシールド',a:{n:3,spr:.5,d:460,v:19,rng:3.7,size:.42},s:{buff:'guard',t:3,r:0,rng:0,air:7,na:1},da:'短距離に3連続パンチ',ds:'3秒間、自分が受けるダメージを70%減らす'});
Object.assign(CH.find(c=>c.id===10),{n:'イヴクロース',role:'サンタだけどアイドルなんですぅ～',hp:3600,sp:3.9,rl:1.4,ch:.0168,bc:0xf4f8ff,sf:'rocket',ss:'shockwave',su:'ショックウェーブ',a:{d:1500,v:6,ac:[6,48,2.2],rng:12.5,size:.36,cloud:1},s:{nova:1,wind:.3,sm:1,nc:1,r:3.7,rng:3.7,d:1240,kb:4.6,brk:2.2,air:3.4,hits:4,na:1},da:'遠くに飛ぶほど弾速が上がるロケットを放つ。最初はゆっくり、最後は一気に加速する',ds:'自分だけの空間を作りたいならこれで決まり。周囲の敵を一気に吹き飛ばす。'});

/* ---------- バランス調整ツール(editor.html)の出力 balance.js を反映 ---------- */
if(window.BALANCE)for(const k in BALANCE){const c=CH.find(x=>x.id==k);if(c)Object.assign(c,BALANCE[k])}
/* 通常攻撃の発射間隔(秒)：原作のように連打しても即連射できない */
{const AD={0:.65,1:.6,2:.7,3:.9,5:.8,6:.55,7:.65,8:.6,9:.7,10:.9,11:.55,12:.65};for(const c of CH)if(c.ad==null)c.ad=AD[c.id]||.6}
/* 必殺技チャージ: sch=必要ヒット数(原作と同じ。1ヒットごとに 100÷sch % 溜まる)。未指定なら従来のch(ダメージ比例)から換算 */
CH.forEach(c=>{if(c.sch==null)c.sch=Math.max(1,Math.round(100/((c.a.d||300)*(c.ch||.01))))});
const chr=c=>100/c.sch/(c.a.d||300);/* 継続ダメージ(炎・ゾーンなど)用：ダメージ比例の換算率 */

/* ---------- three 基本 ---------- */
const R=new T.WebGLRenderer({antialias:true,alpha:true});R.setPixelRatio(Math.min(devicePixelRatio,1.75));R.shadowMap.enabled=true;R.shadowMap.type=T.PCFSoftShadowMap;R.outputEncoding=T.sRGBEncoding;$('#app').prepend(R.domElement);
/* ---------- 診断表示：描画で例外・シェーダーエラー・コンテキスト喪失が起きたら画面左上に赤字で出す。URLに ?debug=1 を付けると描画状況も常時表示 ---------- */
const DIAG=(()=>{const L=[],always=/[?&]debug=1/.test(location.search);let el=null,fr=0,gl=null,last='';
 const show=()=>{try{if(!el){el=document.createElement('pre');el.style.cssText='position:fixed;left:6px;top:56px;max-width:92vw;max-height:62vh;overflow:hidden;margin:0;padding:4px 6px;background:rgba(0,0,0,.75);color:#ff9a9a;font:11px/1.35 monospace;white-space:pre-wrap;word-break:break-all;z-index:99999;pointer-events:none;border-radius:4px;text-align:left';document.body.appendChild(el)}el.textContent=(last?last+'\n':'')+L.slice(-12).join('\n')}catch(e){}};
 const add=s=>{s=String(s).slice(0,260);if(L.length&&L[L.length-1]===s)return;L.push(s);if(L.length>40)L.shift();show()};
 ['error','warn'].forEach(k=>{const o=console[k];console[k]=function(){try{const m=Array.prototype.slice.call(arguments).join(' ');if(k=='error'||/THREE/.test(m))add(k+': '+m)}catch(e){}return o.apply(console,arguments)}});
 addEventListener('error',e=>add('JS: '+e.message+' ('+String(e.filename||'').split('/').pop()+':'+e.lineno+')'));
 addEventListener('unhandledrejection',e=>add('Promise: '+(e.reason&&e.reason.message||e.reason)));
 R.domElement.addEventListener('webglcontextlost',()=>add('WebGL context LOST'));R.domElement.addEventListener('webglcontextrestored',()=>add('WebGL context restored'));
 return{add,err(w,e){add(w+': '+(e&&e.message||e)+' | '+String(e&&e.stack||'').split('\n').slice(1,3).join(' ').replace(/https?:\/\/[^ )]*\//g,''))},
  frame(scene){if(++fr%30)return;try{gl=gl||R.getContext();const i=R.info,e=gl.getError(),ch=scene.children;let vis=0,ins=0,msh=0;for(const o of ch){if(o.visible)vis++;if(o.isInstancedMesh)ins++;else if(o.isMesh)msh++}
   last='map='+MAPID+' draws='+i.render.calls+' tris='+i.render.triangles+' progs='+(i.programs?i.programs.length:'?')+' tex='+i.memory.textures+' geo='+i.memory.geometries+' glErr='+e+' objs='+ch.length+'(visible '+vis+', instanced '+ins+', mesh '+msh+')';
   if(always||L.length)show()}catch(x){}}}})();
const gs=new T.Scene(),ps=new T.Scene(),cam=new T.PerspectiveCamera(40,1,.5,90),pc=new T.PerspectiveCamera(35,1,.1,50);
gs.background=new T.Color(KO?0xe3986c:0x1b1850);gs.fog=new T.Fog(KO?0xe3986c:0x1b1850,KO?170:45,KO?340:95);ps.background=new T.Color(0x1d0f3a);VFX.init(gs,cam);
/* ノックアウト用カメラ：本家のスクリーンショット(2340×1080)から逆算した値。
   画角19.15°の望遠・注視点までの距離42.7マス・見下ろし角53.5°。遠近感が弱く、1マス≒77px(縦1080px時)。
   zm=注視点が行ける端(マップ端から4.93マス内側)。これより奥へは動かず、自陣側の手前の地形(柵・崖)まで画面に入る */
const KCAM={fov:19.15,pt:53.5*Math.PI/180,d:42.74,zm:4.93,mg:5.4,amin:1.7};
var CD=1,JR=64,AW=800,AH=400;const gp=e=>innerHeight>innerWidth?{x:e.clientY,y:innerWidth-e.clientX}:{x:e.clientX,y:e.clientY};
const rs=()=>{const p=innerHeight>innerWidth,w=p?innerHeight:innerWidth,h=p?innerWidth:innerHeight,a=$('#app');a.className=p?'rot':'';a.style.width=w+'px';a.style.height=h+'px';a.style.left=p?innerWidth+'px':'0';R.setSize(w,h);AW=w;AH=h;JR=Math.round(Math.max(44,Math.min(60,Math.min(w,h)*.14)));document.documentElement.style.setProperty('--jr',JR+'px');cam.aspect=pc.aspect=w/h;CD=Math.min(1.7,Math.max(.85,2.4/(w/h)));if(KO){cam.fov=2*Math.atan(Math.tan(KCAM.fov*Math.PI/360)*Math.max(1,KCAM.amin/(w/h)))*180/Math.PI;cam.near=10;cam.far=170}cam.updateProjectionMatrix();pc.updateProjectionMatrix()};addEventListener('resize',rs);rs();
function land(cb){if(window.top!==window){try{parent.postMessage({gf:'fs'},'*')}catch(e){}cb&&cb();return}const P=window,D=document;   /* iframe内なら外枠(parent)を全画面にする＝マップ切替で再読み込みしても全画面が続く */
 if(D.fullscreenElement||(land.n=(land.n||0)+1)>4){cb&&cb();return}const d=D.documentElement,L=()=>{try{P.screen.orientation.lock('landscape').catch(()=>{})}catch(e){}cb&&cb()};try{const p=d.requestFullscreen&&d.requestFullscreen();p?p.then(L,L):L()}catch(e){L()}}
addEventListener('pointerup',()=>land());addEventListener('click',()=>land());
const SP=new T.SphereGeometry(1,18,14),CY=new T.CylinderGeometry(1,1,1,18),BX=new T.BoxGeometry(1,1,1),CN=new T.ConeGeometry(1,1,18),TR=new T.TorusGeometry(1,.14,8,24);
const SHARED_GEOMETRIES=new Set([SP,CY,BX,CN,TR]);
const OL=new T.MeshBasicMaterial({color:0x120818,side:T.BackSide});
/* キャラのプレビュー・試合終了時に専用GPUリソースを解放（共有ジオメトリと共通アウトラインは保持） */
function disposeCharacterRoot(root,keepMaterials){if(!root)return;const seenG=new Set(),seenM=new Set(),keep=new Set(keepMaterials||[]);root.traverse(o=>{if(o.geometry&&!SHARED_GEOMETRIES.has(o.geometry)&&!seenG.has(o.geometry)){seenG.add(o.geometry);o.geometry.dispose()}if(o.material){const list=Array.isArray(o.material)?o.material:[o.material];for(const m of list){if(!m||m===OL||(m.userData&&m.userData.ol)||keep.has(m)||seenM.has(m))continue;seenM.add(m);m.dispose()}}})}
function disposeUnit(u){if(!u||!u.root)return;const keep=u.shd?[u.shd.material]:[];disposeCharacterRoot(u.root,keep);[u.root.rg,u.root.dk,u.hb,u.nb,u.gsp,u.ice,u.shd].forEach(o=>{if(o&&!u.root.getObjectById(o.id))disposeCharacterRoot(o,keep)});[u.nb&&u.nb.material&&u.nb.material.map,u.gsp&&u.gsp.material&&u.gsp.material.map].forEach(t=>{if(t&&t.dispose)t.dispose()})}
const mat=(c,e,r)=>new T.MeshStandardMaterial({color:c,roughness:r||.55,metalness:.1,emissive:c,emissiveIntensity:e||0});
function P(p,g,c,x,y,z,s,o){o=o||{};const m=new T.Mesh(g,mat(c,o.e,o.r));m.position.set(x,y,z);m.scale.set(...(s||[1,1,1]));if(o.r2)m.rotation.set(...o.r2);m.castShadow=true;m.userData.e=o.e||0;if(!o.no){const l=new T.Mesh(g,OL);l.scale.setScalar(1.08);m.add(l)}p.add(m);return m}
const KL={a:0xfff4ea,ai:1,hs:0xfff6ee,hg:0xe2a878,hi:.5,dc:0xfff2e0,di:1.15},KC=h=>[(h>>16&255)/255,(h>>8&255)/255,(h&255)/255];
[[ps,.9],[gs,1.05]].forEach(([s,i])=>{if(KO&&s===gs){s.add(new T.AmbientLight(KL.a,KL.ai));s.add(new T.HemisphereLight(KL.hs,KL.hg,KL.hi))}else{s.add(new T.AmbientLight(0x9080d0,i));s.add(new T.HemisphereLight(0xb8a0ff,0x302040,.5))}});
const dl=new T.DirectionalLight(KO?KL.dc:0xfff0e0,KO?KL.di:1.2);dl.castShadow=true;dl.shadow.mapSize.set(2048,2048);dl.shadow.bias=-.0004;Object.assign(dl.shadow.camera,KO?{left:-21,right:21,top:18,bottom:-18,near:1,far:80}:{left:-18,right:18,top:16,bottom:-16,near:1,far:70});gs.add(dl,dl.target);
const dl2=dl.clone();if(KO){dl2.color.setHex(0xfff0e0);dl2.intensity=1.2}dl2.position.set(3,6,5);ps.add(dl2);

/* ---------- マップ ---------- */
/*const hf=["###########","#..........","#..........","#..##...bb.","#..#....bb.","#......#...","#.bb...##..","#.bb....#..","#.....#...b","##..#.##..b","#...#.....b","#.b...bb...","#.b..##b...","#.....#....","#..##....bb","#.....b....","#..bb......"];
const g=[];for(let r=0;r<17;r++){const a=hf[r],f=a+[...a.slice(0,10)].reverse().join('');g[r]=f;g[32-r]=f}
const tile=(x,z)=>x<0||z<0||x>=W||z>=H?'#':g[z][x],solid=(x,z)=>tile(Math.floor(x),Math.floor(z))=='#',inBush=(x,z)=>tile(Math.floor(x),Math.floor(z))=='b';
function tex(a,b,rx,rz){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.fillStyle=a;x.fillRect(0,0,128,128);for(let i=0;i<280;i++){x.fillStyle=Math.random()<.5?b:'rgba(0,0,0,.2)';x.beginPath();x.arc(Math.random()*128,Math.random()*128,1+Math.random()*7,0,7);x.fill()}const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(rx,rz);t.encoding=T.sRGBEncoding;return t}
const fl=new T.Mesh(new T.PlaneGeometry(W,H),new T.MeshStandardMaterial({map:tex('#5a4a78','#6c5a8e',W/3,H/3),roughness:.95}));fl.rotation.x=-Math.PI/2;fl.position.set(W/2,0,H/2);fl.receiveShadow=true;gs.add(fl);
[[30.5,0x2a7be0],[2.5,0xe03a3a]].forEach(([z,c])=>[8.5,10.5,12.5].forEach(x=>{const m=new T.Mesh(new T.CircleGeometry(.8,24),new T.MeshBasicMaterial({color:c,transparent:true,opacity:.35}));m.rotation.x=-Math.PI/2;m.position.set(x,.02,z);gs.add(m)}));
let wc=0,bc=0;for(let z=0;z<H;z++)for(let x=0;x<W;x++){const t=g[z][x];if(t=='#')wc++;if(t=='b')bc++}
const WM=new T.InstancedMesh(BX,new T.MeshStandardMaterial({map:tex('#ffffff','#dddddd',1,1),roughness:.9}),wc),CM=new T.InstancedMesh(CN,new T.MeshBasicMaterial(),wc),BM=new T.InstancedMesh(SP,mat(0x2fbf4a,.08,.8),bc*3);
WM.castShadow=WM.receiveShadow=true;BM.castShadow=true;
{let w=0,b=0,cr=0;const d=new T.Object3D(),col=new T.Color();
for(let z=0;z<H;z++)for(let x=0;x<W;x++){const t=g[z][x];
 if(t=='#'){const h=1.1+Math.random()*.5;d.position.set(x+.5,h/2,z+.5);d.scale.set(1,h,1);d.rotation.set(0,0,0);d.updateMatrix();WM.setMatrixAt(w,d.matrix);WM.setColorAt(w,col.setHSL(.72+Math.random()*.06,.3,.32+Math.random()*.12));w++;
  const edge=x==0||z==0||x==W-1||z==H-1;if(!edge&&Math.random()<.45){const s=.3+Math.random()*.3;d.position.set(x+.2+Math.random()*.6,h+s*.4,z+.2+Math.random()*.6);d.scale.set(s*.5,s,s*.5);d.rotation.set(0,0,(Math.random()-.5)*.5);d.updateMatrix();CM.setMatrixAt(cr,d.matrix);CM.setColorAt(cr,col.set(Math.random()<.5?0xff6bd6:0x66e8ff));cr++}}
 if(t=='b'){for(let i=0;i<3;i++){const s=.5+Math.random()*.15;d.position.set(x+.25+i*.25+(Math.random()-.5)*.1,.5,z+.3+Math.random()*.4);d.scale.set(s,s*.9,s);d.rotation.set(0,0,0);d.updateMatrix();BM.setMatrixAt(b,d.matrix);BM.setColorAt(b,col.setHSL(.3+Math.random()*.05,.6,.3+Math.random()*.15));b++}}}
CM.count=cr;gs.add(WM,CM,BM)}
const MX=10.5,MZ=16.5;
for(let i=0;i<7;i++){const a=i/7*6.28,r=i?.5+Math.random()*.3:0,s=.35+Math.random()*.4;const m=new T.Mesh(CN,new T.MeshBasicMaterial({color:i%2?0x7dffb0:0x3dffc0}));m.position.set(MX+Math.cos(a)*r,s*.5,MZ+Math.sin(a)*r);m.scale.set(.18,s,.18);m.rotation.z=(Math.random()-.5)*.4;gs.add(m)}
const ml0=0;*/
/* ---------- 新マップ(本家風・縦長)：洞窟ステージ ---------- */
const hf=['###########','#..........','#..........','#.bb..RR...','#.bb..RK...','#.bb.......','#.bbb..CC..','#..bb......','#.....RR.bb','#.CC..RK.bb','#.CC.....bb','#..bbbb....','#..bbbb..RR','#.BB......K','#.RR...bbbb','#.RK...bbbb','#..........'];
const g=[];for(let r=0;r<17;r++){const a=hf[r],f=a+[...a.slice(0,10)].reverse().join('');g[r]=[...f];g[32-r]=[...f]}
const KOH=["FFFFFFFFFFFFFFFFFFFFF", ".....................", ".....................", "..bbW..WbbbbbW..Wbb..", "..bbW..WbbbbbW..Wbb..", "..WWW..WWWWWWW..WWW..", ".....................", ".....................", "bb~~~..~~~~~~~..~~~bb", "bb~~~..~~~~~~~..~~~bb", "bb.................bb", "bb.................bb", "bb...cW..WWW..bbb..bb", "bb..WWW..WW...bbb..bb", "bb.......W.........bb", "bb.................bb", "bb...BW.......WWW..bb", "bb..CCW.......WCC..bb"];
/* マップ選択画面(mapselect.js)の簡易マップ表示用：どちらのマップの地形も文字列の行として持っておく */
const MAPROWS=(()=>{const gm=[],ko=[];for(let r=0;r<17;r++){const a=hf[r],f=a+[...a.slice(0,10)].reverse().join('');gm[r]=f;gm[32-r]=f}for(let r=0;r<18;r++){ko[r]=KOH[r];if(r<17)ko[34-r]=[...KOH[r]].reverse().join('')}const o={gem:gm,ko};MAPS_.forEach(m=>{if(!m.builtin&&m.rows)o[m.id]=m.rows.slice()});return o})();
if(KO){g.length=0;for(let r=0;r<18;r++){g[r]=[...KOH[r]];if(r<17)g[34-r]=[...KOH[r]].reverse()}}
if(CMAP){g.length=0;for(const r of CMAP.rows)g.push([...r])}
const tile=(x,z)=>x<0||z<0||x>=W||z>=H?'#':g[z][x],solid=(x,z)=>'#RKCBWF~'.includes(tile(Math.floor(x),Math.floor(z))),bsolid=(x,z)=>'#RKCBW'.includes(tile(Math.floor(x),Math.floor(z))),inBush=(x,z)=>tile(Math.floor(x),Math.floor(z))=='b',MX=10.5,MZ=H/2,rnd=Math.random;
/* 実際のシーン光(環境光+半球光+平行光)の合計。表示したい色を「ライティング後にその色に見える反射率」に直すために使う */
const LU=KO?[0,1,2].map(i=>KC(KL.a)[i]*KL.ai+KC(KL.hs)[i]*KL.hi+KC(KL.dc)[i]*KL.di*.872):[2.0,1.83,2.24],LS=KO?[0,1,2].map(i=>KC(KL.a)[i]*KL.ai+(KC(KL.hs)[i]+KC(KL.hg)[i])/2*KL.hi+KC(KL.dc)[i]*KL.di*.39):[1.29,1.16,1.56],AN=Math.min(8,R.capabilities.getMaxAnisotropy());
function bakeTex(x,w,h,k){const L=[0,1,2].map(i=>LU[i]*(1-k)+LS[i]*k),d=x.getImageData(0,0,w,h),a=d.data,tb=L.map(l=>{const t=new Uint8ClampedArray(256);for(let i=0;i<256;i++)t[i]=Math.round(255*Math.pow(Math.min(1,Math.pow(i/255,2.2)/l),1/2.2));return t});for(let i=0;i<a.length;i+=4){a[i]=tb[0][a[i]];a[i+1]=tb[1][a[i+1]];a[i+2]=tb[2][a[i+2]]}x.putImageData(d,0,0)}
function cv(w,h,f,rx,ry,k){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');f(x);if(k!=null)bakeTex(x,w,h,k);const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=AN;if(rx)t.repeat.set(rx,ry);return t}
const ln=(x,a,b,c,d)=>{x.beginPath();x.moveTo(a,b);x.lineTo(c,d);x.stroke()};
const DM={},DY=[],bush=[],bd=new T.Object3D(),BSI={},bx=new T.BoxGeometry(1,1,1),std=o=>new T.MeshStandardMaterial(o);
let stageFx,mineBurst,bsKill,mkGem,BM,BS;
const bp=new T.Mesh(new T.CircleGeometry(1.9,32),new T.MeshBasicMaterial({color:0x26343a,transparent:true,opacity:0,depthWrite:false}));bp.rotation.x=-Math.PI/2;gs.add(bp);
{
/* ===== 乱数・色の道具 ===== */
const sr=(()=>{let s=20261119;return()=>{s=(s+0x6D2B79F5)|0;let t=Math.imul(s^(s>>>15),1|s);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296}})();
const sv=(a,b)=>a+(b-a)*sr(),ss=(a,b,x)=>{x=Math.max(0,Math.min(1,(x-a)/(b-a)));return x*x*(3-2*x)};
const hsh=(a,b,c)=>{let h=Math.imul(Math.round(a*997)+31,374761393)^Math.imul(Math.round(b*997)+57,668265263)^Math.imul(Math.round(c*997)+91,1274126177);h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296};
const hex3=h=>[(h>>16&255)/255,(h>>8&255)/255,(h&255)/255];
const lmix=(k)=>[0,1,2].map(i=>LU[i]*(1-k)+LS[i]*k);
const dcol=(h,k,m)=>{const c=hex3(h),L=lmix(k||0);m=m||1;return c.map((v,i)=>Math.min(1,Math.pow(v,2.2)*m/L[i]))};   /* 表示色→反射率(リニア) */
const dlin=h=>{const c=hex3(h);return new T.Color(Math.pow(c[0],2.2),Math.pow(c[1],2.2),Math.pow(c[2],2.2))};   /* ライト無し素材用 */
const mix3=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
const wrap=(S,f)=>{for(const a of[-S,0,S])for(const b of[-S,0,S])f(a,b)};   /* 継ぎ目なしテクスチャ用 */
const rg=(x,px,py,r,rgb,a)=>{const q=x.createRadialGradient(px,py,0,px,py,r);q.addColorStop(0,`rgba(${rgb},${a})`);q.addColorStop(1,`rgba(${rgb},0)`);x.fillStyle=q;x.fillRect(px-r,py-r,r*2,r*2)};
function soft(p,S,a0){const c=document.createElement('canvas');c.width=c.height=S;const x=c.getContext('2d'),d=x.createImageData(S,S);for(let j=0;j<S;j++)for(let i=0;i<S;i++){const u=(i+.5)/S*2-1,v=(j+.5)/S*2-1,r=Math.pow(Math.pow(Math.abs(u),p)+Math.pow(Math.abs(v),p),1/p),o=(j*S+i)*4;d.data[o]=d.data[o+1]=d.data[o+2]=255;d.data[o+3]=Math.round(255*(1-ss(a0,1,r)))}x.putImageData(d,0,0);return new T.CanvasTexture(c)}
const AOR=soft(4,64,.3),AOT=soft(4,64,.58),AOC=soft(2,64,.25);
const AQ=new T.PlaneGeometry(1,1);AQ.rotateX(-Math.PI/2);
/* 頂点色を関数で塗る */
function paint(geo,fn){const p=geo.attributes.position,n=geo.attributes.normal,C=new Float32Array(p.count*3);for(let i=0;i<p.count;i++){const c=fn(p.getX(i),p.getY(i),p.getZ(i),n.getX(i),n.getY(i),n.getZ(i),i);C[i*3]=c[0];C[i*3+1]=c[1];C[i*3+2]=c[2]}geo.setAttribute('color',new T.BufferAttribute(C,3));return geo}
/* 照明補正だけの頂点色(質感はテクスチャ側に持たせる素材用)。下ほど少し暗く */
const comp=(geo,ao)=>paint(geo,(x,y,z,nx,ny)=>{const t=ss(.3,.85,ny),a=ao==null?.28:ao;return mix3(LS.map(l=>(1-a*(.5-y))/l),LU.map(l=>1/l),t)});
/* 角を丸めた立方体(サイズ1)。jit>0 で少し欠けた岩肌にする */
function rbox(r,n,jit,seed){const geo=new T.BoxGeometry(1,1,1,n,n,n),p=geo.attributes.position,nm=geo.attributes.normal,h=.5-r,v=new T.Vector3(),q=new T.Vector3();
 for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const ox=v.x,oy=v.y,oz=v.z;q.set(Math.max(-h,Math.min(h,ox)),Math.max(-h,Math.min(h,oy)),Math.max(-h,Math.min(h,oz)));v.sub(q);const l=v.length();
  if(l>1e-6){v.divideScalar(l);nm.setXYZ(i,v.x,v.y,v.z);v.multiplyScalar(r).add(q)}else v.copy(q);
  if(jit){const k=seed||0;v.x+=(hsh(ox,oy+k,oz)-.5)*jit;v.y+=(hsh(oy,oz+k,ox+3)-.5)*jit*.5;v.z+=(hsh(oz,ox+k,oy+7)-.5)*jit}
  p.setXYZ(i,v.x,v.y,v.z)}
 return geo}
/* 小さな房(草の束)を1つのジオメトリにまとめて、根元→先端のグラデーションを頂点色にする */
function mgc(L,c0,c1,k){const Pp=[],N=[],C=[],a=hex3(c0),b=hex3(c1),LL=lmix(k);for(let q of L){q=q.toNonIndexed();Pp.push(...q.attributes.position.array);N.push(...q.attributes.normal.array)}const r=new T.BufferGeometry();r.setAttribute('position',new T.Float32BufferAttribute(Pp,3));r.setAttribute('normal',new T.Float32BufferAttribute(N,3));for(let i=1;i<Pp.length;i+=3){const t=Math.max(0,Math.min(1,Pp[i]));for(let j=0;j<3;j++)C.push(Math.min(1,Math.pow(a[j]+(b[j]-a[j])*t,2.2)/LL[j]))}r.setAttribute('color',new T.Float32BufferAttribute(C,3));return r}
function inst(geo,mt,L,cs,rc){const m=new T.InstancedMesh(geo,mt,L.length),d=new T.Object3D(),c=new T.Color();L.forEach((o,i)=>{d.position.set(o.x,o.y,o.z);d.scale.set(...o.s);d.rotation.order=o.ro||'XYZ';d.rotation.set(o.rx||0,o.r||0,o.rz||0);d.updateMatrix();m.setMatrixAt(i,d.matrix);if(o.cc)m.setColorAt(i,o.cc);else if(o.c!=null)m.setColorAt(i,c.set(o.c))});m.castShadow=cs!==0;m.receiveShadow=rc!==0;gs.add(m);return m}
/* 壊せるブロック用：どのインスタンスがどのマスかを記録(壊れたときに消せるように) */
const regDM=(gm,mt,L,cs,rc)=>{if(!L.length)return null;const m=inst(gm,mt,L,cs,rc);L.forEach((o,i)=>{const k=o.tz*W+o.tx;(DM[k]=DM[k]||{ins:[]}).ins.push([m,i,o])});return m};

/* ===== テクスチャ ===== */
/* 床：暗い赤紫の土。横長のひび割れ・小石・赤い小さな石 */
const FT=KO?null:cv(1024,1024,x=>{const S=1024;x.fillStyle='#6c5462';x.fillRect(0,0,S,S);
 for(let i=0;i<60;i++){const px=sr()*S,py=sr()*S,r=70+sr()*170,hi=sr()<.5;wrap(S,(a,b)=>rg(x,px+a,py+b,r,hi?'142,110,130':'64,40,58',hi?.13:.16))}
 x.lineCap='round';x.lineJoin='round';
 for(let i=0;i<16;i++){let px=sr()*S,py=sr()*S;const pts=[[px,py]],n=7+Math.floor(sr()*7);for(let j=0;j<n;j++){px+=26+sr()*46;py+=(sr()-.5)*14;pts.push([px,py])}
  wrap(S,(a,b)=>{x.beginPath();pts.forEach((q,j)=>x[j?'lineTo':'moveTo'](q[0]+a,q[1]+b+4));x.strokeStyle='rgba(150,118,138,.32)';x.lineWidth=3.5;x.stroke();x.beginPath();pts.forEach((q,j)=>x[j?'lineTo':'moveTo'](q[0]+a,q[1]+b));x.strokeStyle='rgba(48,30,44,.78)';x.lineWidth=3.4;x.stroke()})}
 for(let i=0;i<70;i++){const px=sr()*S,py=sr()*S,rw=3+sr()*7,rh=rw*.6;wrap(S,(a,b)=>{x.fillStyle='rgba(50,32,46,.35)';x.beginPath();x.ellipse(px+a+2,py+b+3,rw,rh,0,0,7);x.fill();x.fillStyle='rgba(140,108,126,.55)';x.beginPath();x.ellipse(px+a,py+b,rw,rh,0,0,7);x.fill()})}
 for(let i=0;i<14;i++){const px=sr()*S,py=sr()*S;wrap(S,(a,b)=>{x.fillStyle='rgba(60,30,40,.4)';x.beginPath();x.arc(px+a+1,py+b+2,6,0,7);x.fill();x.fillStyle='#c9625a';x.beginPath();x.arc(px+a,py+b,5,0,7);x.fill();x.fillStyle='#f08a7e';x.beginPath();x.arc(px+a-1.5,py+b-1.5,2,0,7);x.fill()})}
},W/10.5,H/10.5,0);
/* 岩肌の模様(白黒。色は頂点色で付ける) */
const RT=KO?null:cv(256,256,x=>{x.fillStyle='#f6f4fa';x.fillRect(0,0,256,256);
 for(let i=0;i<46;i++){const px=sr()*256,py=sr()*256,r=14+sr()*38,hi=sr()<.5;wrap(256,(a,b)=>rg(x,px+a,py+b,r,hi?'255,255,255':'110,100,160',hi?.4:.2))}
 x.lineCap='round';x.lineJoin='round';
 for(let i=0;i<9;i++){let px=sr()*256,py=sr()*256;const pts=[[px,py]];for(let j=0;j<4;j++){px+=(sr()-.5)*54;py+=(sr()-.5)*54;pts.push([px,py])}
  wrap(256,(a,b)=>{x.beginPath();pts.forEach((q,j)=>x[j?'lineTo':'moveTo'](q[0]+a+1.5,q[1]+b+1.5));x.strokeStyle='rgba(255,255,255,.55)';x.lineWidth=2;x.stroke();x.beginPath();pts.forEach((q,j)=>x[j?'lineTo':'moveTo'](q[0]+a,q[1]+b));x.strokeStyle='rgba(70,60,120,.5)';x.lineWidth=2.6;x.stroke()})}
 for(let i=0;i<26;i++){const px=sr()*256,py=sr()*256;x.fillStyle='rgba(90,80,140,.25)';x.beginPath();x.arc(px,py,1+sr()*2.4,0,7);x.fill()}
});
/* 木箱 */
const CT=cv(256,256,x=>{x.fillStyle='#f2a93a';x.fillRect(0,0,256,256);
 for(let i=0;i<4;i++){const y=i*64;x.fillStyle=i%2?'#f0a232':'#f8b64e';x.fillRect(0,y,256,64);x.fillStyle='#b9681a';x.fillRect(0,y+60,256,4);x.fillStyle='rgba(255,232,170,.5)';x.fillRect(0,y,256,3)}
 x.lineWidth=1.5;for(let i=0;i<46;i++){x.strokeStyle='rgba(160,90,20,.22)';const y=sr()*256,xx=sr()*200;ln(x,xx,y,xx+30+sr()*50,y+(sr()-.5)*3)}
 x.strokeStyle='#cf7d1e';x.lineWidth=28;x.strokeRect(14,14,228,228);
 x.strokeStyle='#8e4a0e';x.lineWidth=3.5;x.strokeRect(1,1,254,254);x.strokeRect(28,28,200,200);
 x.strokeStyle='#dc8c2c';x.lineWidth=26;ln(x,30,30,226,226);x.strokeStyle='#8e4a0e';x.lineWidth=3.5;ln(x,17,38,218,239);ln(x,38,17,239,218);
 x.strokeStyle='rgba(255,236,176,.55)';x.lineWidth=3;ln(x,30,17,236,222);
 [[16,16],[240,16],[16,240],[240,240]].forEach(([a,b])=>{x.fillStyle='#6a3a10';x.beginPath();x.arc(a,b,5.5,0,7);x.fill();x.fillStyle='#e6b070';x.beginPath();x.arc(a-1.5,b-1.5,1.8,0,7);x.fill()})});
/* 補強ブロック(薄紫の石箱・Xの刻印) */
const XT=KO?null:cv(256,256,x=>{x.fillStyle='#b9aee2';x.fillRect(0,0,256,256);
 for(let i=0;i<40;i++){rg(x,sr()*256,sr()*256,10+sr()*30,sr()<.5?'255,255,255':'110,100,170',.14)}
 x.fillStyle='#d3c9f2';x.fillRect(0,0,256,10);x.fillRect(0,0,10,256);x.fillStyle='#8579c0';x.fillRect(0,246,256,10);x.fillRect(246,0,10,256);
 x.strokeStyle='#7d70bb';x.lineWidth=6;x.strokeRect(18,18,220,220);x.fillStyle='#aa9ed8';x.fillRect(24,24,208,208);x.lineCap='round';
 x.strokeStyle='#6f62ad';x.lineWidth=26;ln(x,54,54,202,202);ln(x,202,54,54,202);x.strokeStyle='#8f84cc';x.lineWidth=16;ln(x,54,52,202,200);ln(x,202,52,54,200);
 x.strokeStyle='rgba(235,228,255,.7)';x.lineWidth=3;ln(x,48,44,196,192);ln(x,208,44,60,192);
 [[16,16],[240,16],[16,240],[240,240]].forEach(([a,b])=>{x.fillStyle='#6d60aa';x.beginPath();x.arc(a,b,5,0,7);x.fill()})});
/* 木の板(足場・枕木・鉱山の枠) */
const WT=cv(256,256,x=>{x.fillStyle='#ea9a3e';x.fillRect(0,0,256,256);
 for(let i=0;i<4;i++){const y=i*64;x.fillStyle=i%2?'#e8963a':'#f0a548';x.fillRect(0,y,256,64);x.fillStyle='#a95a18';x.fillRect(0,y+61,256,3);x.fillStyle='rgba(255,226,160,.5)';x.fillRect(0,y,256,3)}
 x.lineWidth=1.6;for(let i=0;i<60;i++){x.strokeStyle=sr()<.5?'rgba(150,80,16,.28)':'rgba(255,214,140,.3)';const y=sr()*256,xx=sr()*180;ln(x,xx,y,xx+30+sr()*70,y+(sr()-.5)*3)}
 for(let i=0;i<5;i++){const px=sr()*240+8,py=sr()*240+8;x.strokeStyle='rgba(120,60,10,.45)';x.lineWidth=2;x.beginPath();x.ellipse(px,py,6,3.4,0,0,7);x.stroke()}});
/* 樽の側面と上面 */
const BT=cv(256,256,x=>{x.fillStyle='#e8b05a';x.fillRect(0,0,256,256);
 for(let i=0;i<8;i++){x.fillStyle=i%2?'#e0a24c':'#efbc68';x.fillRect(i*32,0,32,256);x.fillStyle='#9c6422';x.fillRect(i*32+29,0,3,256);x.fillStyle='rgba(255,230,170,.4)';x.fillRect(i*32,0,3,256)}
 [[6,34],[110,144],[222,250]].forEach(([a,b])=>{x.fillStyle='#4a4f7c';x.fillRect(0,a,256,b-a);x.fillStyle='#7a80b4';x.fillRect(0,a,256,5);x.fillStyle='#2c2f55';x.fillRect(0,b-5,256,5)})});
const BTT=cv(128,128,x=>{x.fillStyle='#4a4f7c';x.fillRect(0,0,128,128);x.fillStyle='#f3c268';x.beginPath();x.arc(64,64,52,0,7);x.fill();x.strokeStyle='#b97a2c';x.lineWidth=3;for(let r=10;r<52;r+=11){x.beginPath();x.arc(64,64,r,0,7);x.stroke()}x.strokeStyle='rgba(120,60,10,.5)';x.lineWidth=2;ln(x,16,64,112,64);x.strokeStyle='#7a80b4';x.lineWidth=4;x.beginPath();x.arc(64,64,54,0,7);x.stroke()});
/* 洞窟の床(濃い青。薄い輪郭線で岩盤のつなぎ目を描く) */
const CF=KO?null:cv(512,512,x=>{const S=512;x.fillStyle='#2c5cc4';x.fillRect(0,0,S,S);
 const cl=['#2f60c8','#3567d0','#2b58bd','#3a6fd8'];x.lineJoin='round';
 for(let i=0;i<30;i++){const px=sr()*S,py=sr()*S,n=7+Math.floor(sr()*3),R0=38+sr()*60,pts=[];for(let j=0;j<n;j++){const a=j/n*6.283,r=R0*(.7+sr()*.5);pts.push([Math.cos(a)*r,Math.sin(a)*r*.8])}
  wrap(S,(a,b)=>{x.beginPath();pts.forEach((q,j)=>x[j?'lineTo':'moveTo'](px+q[0]+a,py+q[1]+b));x.closePath();x.fillStyle=cl[i%4];x.fill();x.strokeStyle='rgba(120,168,255,.75)';x.lineWidth=3;x.stroke()})}
 for(let i=0;i<60;i++){const px=sr()*S,py=sr()*S,r=2+sr()*5;wrap(S,(a,b)=>{x.fillStyle='rgba(18,34,86,.55)';x.beginPath();x.arc(px+a,py+b,r,0,7);x.fill()})}},9,10,0);
/* 光の柱(下が明るく上へ消えていく) */
const BMT=cv(8,128,x=>{const q=x.createLinearGradient(0,0,0,128);q.addColorStop(0,'rgba(255,150,255,0)');q.addColorStop(.7,'rgba(255,150,255,.55)');q.addColorStop(1,'rgba(255,205,255,1)');x.fillStyle=q;x.fillRect(0,0,8,128)});
const GLOW=cv(64,64,x=>{const r=x.createRadialGradient(32,32,2,32,32,32);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=r;x.fillRect(0,0,64,64)});

/* ===== ジオメトリ ===== */
/* 岩：角が丸く、少し欠けた塊。上面は明るい薄紫、側面は青紫(下ほど暗い) */
const rkPaint=geo=>paint(geo,(x,y,z,nx,ny)=>mix3(mix3(dcol(0x45448c,1),dcol(0x7d79c8,1),Math.max(0,Math.min(1,y+.5))),dcol(0xc4b2ec,0),ss(.3,.85,ny)));
const RGA=rkPaint(rbox(.09,4,.07,1)),RGB=rkPaint(rbox(.07,4,.09,2));
const CRG=comp(rbox(.07,3,0),.3);
/* 結晶：多面体(平面シェーディング)。面ごとに明るさを変えて立体感を出す */
function crystalGeo(c0,c1,sy){const geo=new T.IcosahedronGeometry(.5,0);geo.scale(1,sy||1.5,1);const p=geo.attributes.position,C=new Float32Array(p.count*3),a=hex3(c0),b=hex3(c1),LL=lmix(.5),n=geo.attributes.normal,hh=.43*(sy||1.5);
 for(let i=0;i<p.count;i+=3){const cx=(p.getX(i)+p.getX(i+1)+p.getX(i+2))/3,cy=(p.getY(i)+p.getY(i+1)+p.getY(i+2))/3,cz=(p.getZ(i)+p.getZ(i+1)+p.getZ(i+2))/3,lam=Math.max(0,n.getX(i)*.35+n.getY(i)*.8+n.getZ(i)*.45),t=Math.max(0,Math.min(1,(cy+hh)/(hh*2))),f=.72+.5*lam+(hsh(cx,cy,cz)-.5)*.16,c=mix3(a,b,t);
  for(let k=0;k<3;k++)for(let j=0;j<3;j++)C[(i+k)*3+j]=Math.min(1,Math.pow(Math.min(1,c[j]*f),2.2)/LL[j])}
 geo.setAttribute('color',new T.BufferAttribute(C,3));return geo}
/* アメジスト：6角柱＋とがった先端。面ごとに明暗をつけたマゼンタの結晶 */
function amethystGeo(c0,c1){const N=6,LL=lmix(.5),L0=[.35,.8,.45],Pp=[],Cc=[],a0=hex3(c0),b0=hex3(c1);
 const ring=(y,r,rot,k)=>Array.from({length:N},(_,j)=>{const t=j/N*Math.PI*2+rot,q=1+(hsh(j+k,y*7,r*5)-.5)*.2;return[Math.cos(t)*r*q,y,Math.sin(t)*r*q]});
 const R0=ring(-.64,.34,.2,0),R1=ring(.04,.44,.2,3),R2=ring(.38,.27,.5,7),tip=[.03,.66,-.02];
 const tri=(a,b,c)=>{const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]],cx=(a[0]+b[0]+c[0])/3,cy=(a[1]+b[1]+c[1])/3,cz=(a[2]+b[2]+c[2])/3;let n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];if(n[0]*cx+n[1]*(cy-.0)+n[2]*cz<0){[b,c]=[c,b];n=n.map(q=>-q)}
  const l=Math.hypot(n[0],n[1],n[2])||1,lam=Math.max(0,(n[0]*L0[0]+n[1]*L0[1]+n[2]*L0[2])/l),col=mix3(a0,b0,Math.max(0,Math.min(1,(cy+.64)/1.3))),f=.6+.68*lam+(hsh(cx,cy,cz)-.5)*.22;
  [a,b,c].forEach(p=>{Pp.push(p[0],p[1],p[2]);for(let j=0;j<3;j++)Cc.push(Math.min(1,Math.pow(Math.min(1,col[j]*f),2.2)/LL[j]))})};
 for(let j=0;j<N;j++){const k=(j+1)%N;tri(R0[j],R1[j],R1[k]);tri(R0[j],R1[k],R0[k]);tri(R1[j],R2[j],R2[k]);tri(R1[j],R2[k],R1[k]);tri(R2[j],tip,R2[k]);tri([0,-.64,0],R0[k],R0[j])}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(Pp,3));geo.setAttribute('color',new T.Float32BufferAttribute(Cc,3));geo.computeVertexNormals();return geo}
const CG=amethystGeo(0x7a1aa8,0xf070ff);
/* きらめき(4方向の星) */
const STAR=cv(64,64,x=>{rg(x,32,32,30,'255,255,255',.5);x.fillStyle='#fff';x.beginPath();x.moveTo(32,0);x.quadraticCurveTo(34,30,64,32);x.quadraticCurveTo(34,34,32,64);x.quadraticCurveTo(30,34,0,32);x.quadraticCurveTo(30,30,32,0);x.fill()});
const RKG=crystalGeo(0x1e3478,0x4a6ac4,.8);
/* エメラルド：6角形の双角錐っぽい宝石 */
const GG=(()=>{const R0=[.24,.44,.47,.3,0],Y0=[.5,.28,.1,-.2,-.5],N=6,V=(i,j)=>{const a=(j%N)/N*Math.PI*2+.5,r=R0[i];return[Math.cos(a)*r,Y0[i],Math.sin(a)*r]},Pp=[],Cc=[],L0=[.35,.8,.45],LL=lmix(.5);
 const tri=(a,b,c)=>{const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]],cx=(a[0]+b[0]+c[0])/3,cy=(a[1]+b[1]+c[1])/3,cz=(a[2]+b[2]+c[2])/3;let n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];if(n[0]*cx+n[1]*(cy-.05)+n[2]*cz<0){[b,c]=[c,b];n=n.map(q=>-q)}
  const l=Math.hypot(n[0],n[1],n[2])||1,lam=Math.max(0,(n[0]*L0[0]+n[1]*L0[1]+n[2]*L0[2])/l),col=mix3(hex3(0x7228d0),hex3(0xd2a8ff),(cy+.5)/1.0),f=.62+.7*lam+(hsh(cx,cy,cz)-.5)*.14;
  [a,b,c].forEach(p=>{Pp.push(p[0],p[1],p[2]);for(let j=0;j<3;j++)Cc.push(Math.min(1,Math.pow(Math.min(1,col[j]*f),2.2)/LL[j]))})};
 for(let i=0;i<4;i++)for(let j=0;j<N;j++){const a=V(i,j),b=V(i,j+1),c=V(i+1,j),d=V(i+1,j+1);if(i==0){tri(a,c,d);tri(a,d,b);tri([0,Y0[0],0],a,b)}else if(i==3)tri(a,c,b);else{tri(a,c,d);tri(a,d,b)}}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(Pp,3));geo.setAttribute('color',new T.Float32BufferAttribute(Cc,3));geo.computeVertexNormals();return geo})();
const GEMM=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,emissive:0x4a18a0,emissiveIntensity:.8,roughness:.22,metalness:.15,flatShading:true});
const GSH=new T.MeshBasicMaterial({map:AOC,color:0x080210,transparent:true,opacity:.6,depthWrite:false}),GGL=new T.MeshBasicMaterial({map:GLOW,color:0xff4ad8,transparent:true,opacity:.6,blending:T.AdditiveBlending,depthWrite:false}),GOL=new T.MeshBasicMaterial({color:dlin(0x260a48),side:T.BackSide}),SSM=new T.SpriteMaterial({map:STAR,blending:T.AdditiveBlending,depthWrite:false,transparent:true});
mkGem=()=>{const g0=new T.Group(),m=new T.Mesh(GG,GEMM),o=new T.Mesh(GG,GOL),s=new T.Sprite(new T.SpriteMaterial({map:GLOW,blending:T.AdditiveBlending,depthWrite:false,transparent:true,color:0xd060ff,opacity:.5})),st=new T.Sprite(SSM),sh=new T.Mesh(AQ,GSH),gl=new T.Mesh(AQ,GGL);
 m.scale.setScalar(.68);o.scale.setScalar(.75);s.scale.set(1.5,1.5,1);st.scale.set(.4,.4,1);st.position.set(-.16,.16,.14);sh.scale.set(.8,1,.8);sh.position.y=-.47;gl.scale.set(1.6,1,1.6);gl.position.y=-.45;g0.add(sh,gl,o,m,s,st);g0.userData.st=st;return g0};
/* 草の束：細い葉をたくさん。根元は濃い青緑、先端は明るい水色 */
const BLD=mgc(Array.from({length:16},(_,i)=>{const a=i/16*6.283+sr()*.5,r=.03+sr()*.3,h=.4+sr()*.3,b=new T.ConeGeometry(.19+sr()*.06,h,3,1,true);b.translate(0,h/2,0);b.rotateX(.1+sr()*.3);b.rotateY(a);b.translate(Math.cos(a)*r,0,Math.sin(a)*r);return b}),0x1c82a0,0x86e8e6,.45);
const BMAT=std({vertexColors:true,roughness:.95,side:2});
/* ノックアウトの草：本家は「ほぼ直立した丸い葉」がマスの中にきっちり収まる。細い円錐を放射状に広げると
   マスの外へ大きくはみ出して見えるので、カメラ(南)側に面を向けた幅広の葉を、小さな束に密集させて作る。
   葉は7頂点・5三角形の扁平な形(根元が細く中ほどが太く先がとがる)。束の広がりは±.14以内、倒れ込みもごく小さい */
const BLK=KO?(()=>{const leaf=(w,h,yaw,lean,ox,oz)=>{const v=[-w*.5,0,0,w*.5,0,0,-w*.64,h*.4,0,w*.64,h*.4,0,-w*.46,h*.72,-h*.03,w*.46,h*.72,-h*.03,0,h,-h*.07],g=new T.BufferGeometry();
  g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex([0,1,2,1,3,2,2,3,4,3,5,4,4,5,6]);g.computeVertexNormals();g.rotateX(lean);g.rotateY(yaw);g.translate(ox,0,oz);return g};
 return mgc(Array.from({length:12},()=>{const a=sr()*6.283,r=.03+sr()*.11;return leaf(.26+sr()*.1,.78+sr()*.26,(sr()-.5)*1.3,-.05+(sr()-.5)*.2,Math.cos(a)*r,Math.sin(a)*r*.8)}),0xf28a1a,0xffd445,.75)})():null;

/* ===== 床 ===== */
if(!KO){
const fl2=new T.Mesh(new T.PlaneGeometry(W,H),std({map:FT,roughness:1}));fl2.rotation.x=-Math.PI/2;fl2.position.set(W/2,0,H/2);fl2.receiveShadow=true;gs.add(fl2);
/* 出撃位置：暗い円盤＋光る輪(本家風) */
[[SPW.b,0x3aa8ff,0x0a1c5c],[SPW.t,0xff4a4a,0x4c0c14]].forEach(([pp,c,d])=>pp.forEach(([x,z])=>{const m=new T.Mesh(new T.CircleGeometry(.8,32),new T.MeshBasicMaterial({color:dlin(d),transparent:true,opacity:.6,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(x,.02,z);gs.add(m);const r=new T.Mesh(new T.RingGeometry(.66,.82,40),new T.MeshBasicMaterial({color:dlin(c),transparent:true,opacity:.95,depthWrite:false}));r.rotation.x=-Math.PI/2;r.position.set(x,.025,z);gs.add(r)}));
}

/* ===== マスごとの配置 ===== */
const IT={RA:[],RB:[],C:[],K:[],PK:[],AO:[],AC:[],b:[],BP:[],X:[]};
const barrelGeo=(()=>{const pts=[[0,0],[.33,0],[.4,.1],[.45,.32],[.46,.45],[.45,.58],[.4,.8],[.34,.9]].map(p=>new T.Vector2(p[0],p[1]));return new T.LatheGeometry(pts,16)})();
const barrelTop=new T.CircleGeometry(.34,16);barrelTop.rotateX(-Math.PI/2);
const brM=std({map:BT,color:new T.Color(...LS.map(l=>1/l)),roughness:.8,side:2}),btM=std({map:BTT,color:new T.Color(...LU.map(l=>1/l)),roughness:.8});
for(let z=0;z<H;z++)for(let x=0;x<W;x++){const t=g[z][x],X=x+.5,Z=z+.5;
 if(t=='R'){const sy=.28+sr()*.2,sw=.2+sr()*.1,xb=(Math.min(x,W-1-x)*5+Math.min(z,H-1-z)*3)%4==1,ro=Math.floor(sr()*4)*Math.PI/2;
  if(xb)IT.X.push({tx:x,tz:z,x:X,y:.47,z:Z,s:[.94,.94,.94],r:0,c:0xffffff});else(((x+z)&1)?IT.RA:IT.RB).push({tx:x,tz:z,x:X,y:.56,z:Z,s:[.98,1.12,.98],r:ro,c:[0xffffff,0xf0ecff,0xe6e2f8][(x+z)%3]});
  if(sr()<.42&&!xb)IT.PK.push({tx:x,tz:z,x:X+(sr()-.5)*.55,y:1.12+.64*sy-.1,z:Z+(sr()-.5)*.55,s:[sw,sy,sw],rz:(sr()-.5)*.5,c:0xffffff});
  IT.AO.push({tx:x,tz:z,x:X,y:.014,z:Z+.1,s:[1.7,1,1.75]})}
 else if(t=='C'){IT.C.push({tx:x,tz:z,x:X,y:.47,z:Z,s:[.94,.94,.94],r:(sr()-.5)*.1,c:[0xffffff,0xf4efe8,0xece6dc][(x*3+z)%3]});IT.AO.push({tx:x,tz:z,x:X,y:.014,z:Z+.1,s:[1.65,1,1.7]})}
 else if(t=='K'){[[-.22,-.15,.62,.9],[.2,.1,.5,.72],[-.05,.28,.4,.5]].forEach(([ox,oz,w,h])=>{const sy=h*(.9+sr()*.2),sw=w*(.92+sr()*.16);IT.K.push({tx:x,tz:z,x:X+ox,y:.64*sy-.03,z:Z+oz,s:[sw,sy,sw],r:sr()*6,rz:(sr()-.5)*.25,c:[0xffffff,0xf2e8ff,0xffe8f6][Math.floor(sr()*3)]})});IT.AO.push({tx:x,tz:z,x:X,y:.014,z:Z+.08,s:[1.5,1,1.55]})}
 else if(t=='b'){[[.22,.22],[.72,.26],[.47,.5],[.25,.78],[.74,.76]].forEach(([a,b])=>IT.b.push({x:x+a+(rnd()-.5)*.1,z:z+b+(rnd()-.5)*.1,s:.8+rnd()*.3,r:rnd()*6.28}));BSI[z*W+x]=IT.BP.length;IT.BP.push({x:X,y:.03,z:Z,s:KO?[1.12,1,1.12]:[1.3,1,1.3]})}
 else if(t=='B'){const bg=new T.Group();bg.position.set(X,0,Z);gs.add(bg);DM[z*W+x]={ins:[],obj:bg};const bm=new T.Mesh(barrelGeo,brM),tp=new T.Mesh(barrelTop,btM);bm.castShadow=bm.receiveShadow=true;tp.position.y=.9;bg.add(bm,tp);IT.AC.push({tx:x,tz:z,x:X,y:.014,z:Z+.05,s:[1.4,1,1.4]})}}
const rockM=std({map:RT,vertexColors:true,roughness:.9}),crysM=()=>std({vertexColors:true,flatShading:true,roughness:.25,emissive:0xa020c8,emissiveIntensity:.32});
regDM(RGA,rockM,IT.RA);regDM(RGB,rockM,IT.RB);
regDM(CRG,std({map:CT,vertexColors:true,roughness:.75}),IT.C);regDM(CRG,std({map:XT,vertexColors:true,roughness:.7}),IT.X);
regDM(CG,crysM(),IT.K);regDM(CG,crysM(),IT.PK,0,1);
const aoM=t=>new T.MeshBasicMaterial({map:t,color:KO?dlin(0x6e2c1a):0x0a0310,transparent:true,opacity:KO?.42:.5,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
regDM(AQ,aoM(AOR),IT.AO,0,0);regDM(AQ,aoM(AOC),IT.AC,0,0);
/* 草むら：床に濃い青緑の下地を敷き、葉の束を重ねる */
BS=inst(AQ,new T.MeshBasicMaterial({map:AOT,color:dlin(KO?0xe5892a:0x1f7f9a),transparent:true,opacity:.85,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),IT.BP,0,0);
bsKill=(tx,tz)=>{const i=BSI[tz*W+tx];if(i!=null){BS.setMatrixAt(i,ZMX);BS.instanceMatrix.needsUpdate=true}};
IT.b.forEach(o=>bush.push({...o,f:0}));
BM=new T.InstancedMesh(KO?BLK:BLD,BMAT,bush.length);
{const col=new T.Color();bush.forEach((b,i)=>{bd.position.set(b.x,0,b.z);bd.rotation.set(0,b.r,0);bd.scale.setScalar(b.s);bd.updateMatrix();BM.setMatrixAt(i,bd.matrix);const v=.86+sr()*.2;BM.setColorAt(i,col.setRGB(v,v,v*(.96+sr()*.08)))})}
BM.castShadow=false;gs.add(BM);

/* ===== 線路・木の足場 ===== */
if(!KO){const WL=[],SL=[],wp=(x,y,z,sx,sy,sz,o)=>WL.push({x,y,z,s:[sx,sy,sz],...(o||{})});
[13.5,19.5].forEach(z=>[0,1].forEach(m=>{const f=x=>m?W-x:x;[-.2,.2].forEach(o=>SL.push({x:f(6.35),y:.1,z:z+o,s:[4.5,.08,.09]}));for(let i=0;i<9;i++)wp(f(4.4+i*.5),.045,z,.22,.07,.84,{r:(sr()-.5)*.1})}));
[7,26].forEach(z=>[0,1].forEach(m=>{const f=x=>m?W-x:x,x=f(1.14);wp(x,.8,z-.9,.17,1.6,.17);wp(x,.8,z+.9,.17,1.6,.17);wp(x,1.58,z,.2,.17,2.3);wp(x,.78,z-.45,.1,1.05,.1,{rx:.62});wp(x,.78,z+.45,.1,1.05,.1,{rx:-.62})}));
inst(comp(rbox(.05,2,0),.2),std({map:WT,vertexColors:true,roughness:.85}),WL);
inst(bx,std({color:new T.Color(...dcol(0x8e99bd,.3)),roughness:.45,metalness:.15}),SL);
/* 床に落ちる線路の影 */
inst(AQ,aoM(AOR),[13.5,19.5].flatMap(z=>[[6.3],[W-6.3]].map(([x])=>({x,y:.012,z,s:[5.2,1,1.6]}))),0,0);
}

/* ===== 鉱山(中央の穴)・光・エメラルドの湧き ===== */
const mine=new T.Group();mine.position.set(MX,0,MZ);gs.add(mine);
{const wd=comp(rbox(.06,3,0),.25),wm=std({map:WT,vertexColors:true,roughness:.85});
 [[0,.19,-.45,1.9,.38,.3],[0,.19,.45,1.9,.38,.3],[-.8,.19,0,.3,.38,.6],[.8,.19,0,.3,.38,.6]].forEach(([x,y,z,w,h,d])=>{const m=new T.Mesh(wd,wm);m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=m.receiveShadow=true;mine.add(m)})}
const mineHoleG=new T.PlaneGeometry(1.3,.6);mineHoleG.rotateX(-Math.PI/2);
const mineHole=new T.Mesh(mineHoleG,new T.MeshBasicMaterial({map:GLOW,color:0xff9cff,transparent:true,opacity:.5,blending:T.AdditiveBlending,depthWrite:false}));mineHole.scale.set(1.7,1,2.1);mineHole.position.y=.3;mine.add(mineHole);
{const h=new T.Mesh(mineHoleG,new T.MeshBasicMaterial({color:dlin(0xc23cf2)}));h.position.y=.2;mine.add(h)}
const mineGround=new T.Mesh(AQ,new T.MeshBasicMaterial({map:GLOW,color:0xff4ad0,transparent:true,opacity:.3,blending:T.AdditiveBlending,depthWrite:false}));mineGround.scale.set(3.8,1,3.2);mineGround.position.set(0,.03,0);mine.add(mineGround);
{const a=new T.Mesh(AQ,aoM(AOR));a.scale.set(2.4,1,1.8);a.position.set(0,.012,.1);mine.add(a)}
const beam=new T.Mesh(new T.CylinderGeometry(.55,.4,3.2,20,1,true),new T.MeshBasicMaterial({map:BMT,color:0xffffff,transparent:true,opacity:.3,depthWrite:false,blending:T.AdditiveBlending,side:2}));beam.position.set(MX,1.8,MZ);gs.add(beam);
const ml=new T.PointLight(0xff60f0,1.6,7);ml.position.set(MX,1.3,MZ);gs.add(ml);
const MS=Array.from({length:14},(_,i)=>{const s=new T.Sprite(new T.SpriteMaterial({map:STAR,color:i%3?0xff9cff:0xffffff,transparent:true,blending:T.AdditiveBlending,depthWrite:false}));s.userData={p:sr(),sp:.35+sr()*.4,ox:(sr()-.5)*1.2,oz:(sr()-.5)*.7,sz:.18+sr()*.22};gs.add(s);return s});

/* ===== 洞窟(ステージの外) ===== */
const CGL=[];
if(!KO){/* 床：濃い青。アリーナから遠いほど暗く */
 const pg=new T.PlaneGeometry(100,120,34,40);pg.rotateX(-Math.PI/2);const pp=pg.attributes.position,cc=new Float32Array(pp.count*3);
 for(let i=0;i<pp.count;i++){const wx=pp.getX(i)+W/2,wz=pp.getZ(i)+H/2,dx=Math.max(0,Math.abs(wx-W/2)-W/2),dz=Math.max(0,Math.abs(wz-H/2)-H/2),f=1-.5*ss(4,30,Math.hypot(dx,dz));cc[i*3]=f;cc[i*3+1]=f;cc[i*3+2]=f}
 pg.setAttribute('color',new T.BufferAttribute(cc,3));const cf=new T.Mesh(pg,std({map:CF,vertexColors:true,roughness:1}));cf.position.set(W/2,-.55,H/2);gs.add(cf);
 /* 岩壁：6角柱をぎっしり並べた崖。根元は暗い藍色、上へ行くほど明るい青紫、頂上は薄いラベンダー */
 const PG=new T.CylinderGeometry(.62,1,1,6,3),p=PG.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=.2;p.setXYZ(i,x*(1+(hsh(x,y,z)-.5)*k*2)+(hsh(z,x,y)-.5)*.1,y+(Math.abs(y)<.49?(hsh(y,z,x)-.5)*.1:0),z*(1+(hsh(y,z,x+1)-.5)*k*2)+(hsh(x,z,y)-.5)*.1)}
 paint(PG,(x,y,z,nx,ny)=>{if(ny>.5)return dcol(0x7d72d2,0);const t=y+.5;return t<.55?mix3(dcol(0x181a5c,1),dcol(0x3b3a9e,1),t/.55):mix3(dcol(0x3b3a9e,1),dcol(0x6a60c6,1),(t-.55)/.45)});
 const PL=[],CY2=[],rows=[{d:.65,st:.78,h:[2.4,3.5],r:[.5,.68],m:1},{d:1.85,st:.95,h:[2.2,3.3],r:[.75,.95],m:.92},{d:3.05,st:1.2,h:[1.8,2.9],r:[.95,1.2],m:.82},{d:6.8,st:3,h:[4,7],r:[1.4,2],m:.6}];
 rows.forEach((rw,ri)=>{const x0=1-rw.d,x1=W-1+rw.d,z0=1-rw.d,z1=H-1+rw.d,add=(x,z,s)=>{const h=sv(rw.h[0],rw.h[1]),r=sv(rw.r[0],rw.r[1]),px=x+(sr()-.5)*rw.st*.6,pz=z+(sr()-.5)*rw.st*.6,tl=ri<3?.08+sr()*.07:0,v=(.82+sr()*.2)*rw.m,o={x:px,y:(h-1.7)/2,z:pz,s:[r,h+1.7,r],r:sr()*6.28,cc:new T.Color(v,v,v*(.95+sr()*.1))};
   if(s=='w'){o.rz=-tl;o.ro='ZYX'}else if(s=='e'){o.rz=tl;o.ro='ZYX'}else if(s=='n')o.rx=tl;else o.rx=-tl;PL.push(o);
   if(ri<2&&sr()<.26){const w=sv(.3,.55),hh=sv(.5,1.1),k=sr();CY2.push({x:px+(sr()-.5)*r*.4,y:h+.64*hh-.12,z:pz+(sr()-.5)*r*.4,s:[w,hh,w],r:sr()*6,rz:(sr()-.5)*.4,cc:k<.5?new T.Color(1,1,1):k<.8?new T.Color(.9,.95,1.05):new T.Color(1.05,.85,1)})}};
  for(let z=z0;z<=z1;z+=rw.st){add(x0,z,'w');add(x1,z,'e')}for(let x=x0+rw.st;x<x1-rw.st*.5;x+=rw.st){add(x,z0,'n');add(x,z1,'s')}});
 inst(PG,std({vertexColors:true,flatShading:true,roughness:.95}),PL,0,0);
 /* 洞窟の床に散らばる：ピンクの大きな結晶・青い岩・水色の草・木の板 */
 const CY3=[],RK3=[],TF=[],WB=[],per=(d)=>{const a=sr()*(2*(W+H+4*d)),q=W+2*d,w=H+2*d;let x,z;if(a<q){x=-d+a;z=-d}else if(a<q+w){x=W+d;z=-d+(a-q)}else if(a<2*q+w){x=W+d-(a-q-w);z=H+d}else{x=-d;z=H+d-(a-2*q-w)}return[x,z]};
 for(let i=0;i<40;i++){const [x,z]=per(sv(4.6,9.5)),k=sr();
  if(k<.4){const w=sv(.7,1.5),hh=sv(1.2,2.6);CY3.push({x,y:-.5+.64*hh-.1,z,s:[w,hh,w],r:sr()*6,rz:(sr()-.5)*.3,cc:new T.Color(1,1,1)})}
  else if(k<.65){const w=sv(.5,1.3);RK3.push({x,y:-.5+.3*w,z,s:[w,w*.8,w],r:sr()*6,cc:new T.Color(1,1,1)})}
  else if(k<.9)TF.push({x,y:-.52,z,s:[.8,.8,.8],r:sr()*6,cc:new T.Color(.7,.8,.8)});
  else WB.push({x,y:-.43,z,s:[sv(1.8,2.8),.1,sv(.7,1)],r:sr()*3,c:0xffffff})}
 inst(CG,crysM(),CY2,0,0);const cm3=inst(CG,crysM(),CY3,0,0);inst(RKG,std({vertexColors:true,flatShading:true,roughness:.8}),RK3,0,0);inst(BLD,BMAT,TF,0,0);
 inst(comp(rbox(.05,2,0),.2),std({map:WT,vertexColors:true,roughness:.85}),WB,0,0);
 CY3.slice(0,10).forEach(o=>{const s=new T.Sprite(new T.SpriteMaterial({map:GLOW,color:0xff7aff,transparent:true,blending:T.AdditiveBlending,depthWrite:false,opacity:.35}));s.position.set(o.x,o.y+.3,o.z);s.scale.set(o.s[0]*3.4,o.s[0]*3.4,1);gs.add(s);CGL.push(s)})}

/* ===== 毎フレームの演出(光の柱・きらめき・エメラルドの出現) ===== */
let sx=0,mb=0;
mineBurst=()=>{mb=1};
stageFx=dt=>{sx+=dt;mb=Math.max(0,mb-dt*1.5);const k=mb;
 beam.material.opacity=.13+.04*Math.sin(sx*2.4)+k*.45;beam.scale.set(1+k*.35,1,1+k*.35);
 mineGround.material.opacity=.3+.06*Math.sin(sx*3)+k*.45;mineHole.material.opacity=.5+.12*Math.sin(sx*3.4)+k*.4;ml.intensity=1.5+.3*Math.sin(sx*3.7)+k*2.6;
 for(const s of MS){const u=s.userData;u.p=(u.p+dt*u.sp*(1+k*1.5))%1;s.position.set(MX+u.ox*(.6+u.p),.4+u.p*1.7,MZ+u.oz*(.6+u.p));s.material.opacity=Math.sin(u.p*Math.PI)*(.55+k*.4);const z=u.sz*(1.1-.5*u.p);s.scale.set(z,z,1)}
 for(const q of G){q.age=(q.age||0)+dt;const a=Math.min(1,q.age*5),e=1-Math.pow(1-a,3);q.m.scale.setScalar(.15+.85*e*(1+.18*Math.sin(a*Math.PI)));const st=q.m.userData.st;if(st)st.scale.setScalar(.12+.5*(.5+.5*Math.sin(sx*6+q.o*5)))}
 CGL.forEach((s,i)=>{s.material.opacity=.32+.12*Math.sin(sx*1.7+i*1.3)})};

/* ===== ノックアウト：砂漠マップ(本家ノックアウトのマップを再現。21×35) ===== */
if(KO){
 const WH=1.2,LOW=-2.3,V3=(x,y,z)=>new T.Vector3(x,y,z);
 const mx=(px,py,pz,sx,sy,sz,rx,ry,rz)=>new T.Matrix4().compose(V3(px,py,pz),new T.Quaternion().setFromEuler(new T.Euler(rx||0,ry||0,rz||0)),V3(sx==null?1:sx,sy==null?1:sy,sz==null?1:sz));
 const gc=(a,b,t,k)=>mix3(dcol(a,k),dcol(b,k),Math.max(0,Math.min(1,t)));
 /* 部品を1つのジオメトリに結合(頂点色つき)。色関数には「変形前の座標・変形後の法線・変形後の座標」を渡す */
 const mrg=L=>{const Q=L.map(([geo,m,fn])=>{const q=geo.index?geo.toNonIndexed():geo.clone();const p0=Float32Array.from(q.attributes.position.array);q.applyMatrix4(m);return[q,p0,fn]});let n=0;Q.forEach(([q])=>{n+=q.attributes.position.count});
  const P=new Float32Array(n*3),N=new Float32Array(n*3),C=new Float32Array(n*3);let o=0;
  for(const[q,p0,fn]of Q){const p=q.attributes.position.array,nm=q.attributes.normal.array,k=q.attributes.position.count;
   for(let i=0;i<k;i++){const j=i*3,t=(o+i)*3,c=fn(p0[j],p0[j+1],p0[j+2],nm[j],nm[j+1],nm[j+2],p[j],p[j+1],p[j+2]);P[t]=p[j];P[t+1]=p[j+1];P[t+2]=p[j+2];N[t]=nm[j];N[t+1]=nm[j+1];N[t+2]=nm[j+2];C[t]=c[0];C[t+1]=c[1];C[t+2]=c[2]}o+=k}
  const r=new T.BufferGeometry();r.setAttribute('position',new T.BufferAttribute(P,3));r.setAttribute('normal',new T.BufferAttribute(N,3));r.setAttribute('color',new T.BufferAttribute(C,3));return r};

 /* ---------- テクスチャ ---------- */
 const poly=(x,pts,px,py,a,b)=>{x.beginPath();pts.forEach((q,j)=>x[j?'lineTo':'moveTo'](px+q[0]+a,py+q[1]+b));x.closePath()};
 /* 砂の地面：サーモンオレンジ。うねる細い線・平たい石・小石 */
 const SAND=cv(1024,1024,x=>{const S=1024;x.fillStyle='#f4a775';x.fillRect(0,0,S,S);
  for(let i=0;i<54;i++){const px=sr()*S,py=sr()*S,r=70+sr()*170,hi=sr()<.55;wrap(S,(a,b)=>rg(x,px+a,py+b,r,hi?'255,200,152':'224,130,90',hi?.22:.15))}
  x.lineCap='round';x.lineJoin='round';
  for(let i=0;i<6;i++){let px=sr()*S,py=sr()*S,d=sr()*6.28;const pts=[[px,py]],n=8+Math.floor(sr()*6);for(let j=0;j<n;j++){d+=(sr()-.5)*.8;px+=Math.cos(d)*38;py+=Math.sin(d)*22;pts.push([px,py])}
   wrap(S,(a,b)=>{x.beginPath();pts.forEach((q,j)=>x[j?'lineTo':'moveTo'](q[0]+a,q[1]+b+4));x.strokeStyle='rgba(255,210,170,.5)';x.lineWidth=4.5;x.stroke();x.beginPath();pts.forEach((q,j)=>x[j?'lineTo':'moveTo'](q[0]+a,q[1]+b));x.strokeStyle='rgba(222,126,86,.6)';x.lineWidth=4;x.stroke()})}
  for(let i=0;i<7;i++){const px=sr()*S,py=sr()*S,r=36+sr()*30,rot=sr()*6.28,pts=[];for(let j=0;j<5;j++){const a=rot+j/5*6.283,q=.8+sr()*.34;pts.push([Math.cos(a)*r*q,Math.sin(a)*r*q*.9])}
   wrap(S,(a,b)=>{poly(x,pts,px,py,a+2,b+5);x.fillStyle='rgba(200,108,72,.5)';x.fill();poly(x,pts,px,py,a,b);x.fillStyle='#f7ba90';x.fill();x.strokeStyle='rgba(222,128,88,.95)';x.lineWidth=2.6;x.stroke();poly(x,pts.map(q=>[q[0]*.55-r*.12,q[1]*.55-r*.1]),px,py,a,b);x.fillStyle='rgba(255,226,196,.35)';x.fill()})}
  for(let i=0;i<14;i++){const px=sr()*S,py=sr()*S,r=2+sr()*4;wrap(S,(a,b)=>{x.fillStyle='rgba(196,104,70,.45)';x.beginPath();x.arc(px+a+1,py+b+2,r,0,7);x.fill();x.fillStyle='#f9c39c';x.beginPath();x.arc(px+a,py+b,r,0,7);x.fill()})}
 },1,1,0);
 /* 壁・崖の地層(横縞。上から順に色を重ねる) */
 const wv=(xk,i)=>Math.sin(xk*.05+i*2.1)*3.5+Math.sin(xk*.13+i*5)*2;
 const strata=(pal,k,rim)=>cv(256,256,x=>{const S=256;x.fillStyle=pal[pal.length-1][0];x.fillRect(0,0,S,S);let y0=0;
  pal.forEach((p,i)=>{const yy=y0*S;y0+=p[1];x.beginPath();x.moveTo(0,S);for(let xk=0;xk<=S;xk+=8)x.lineTo(xk,yy+(i?wv(xk,i):0));x.lineTo(S,S);x.closePath();x.fillStyle=p[0];x.fill();
   if(i){x.lineWidth=3;x.strokeStyle='rgba(255,206,170,.3)';x.beginPath();for(let xk=0;xk<=S;xk+=8)x[xk?'lineTo':'moveTo'](xk,yy+wv(xk,i)+2);x.stroke();x.lineWidth=2.6;x.strokeStyle='rgba(32,10,4,.42)';x.beginPath();for(let xk=0;xk<=S;xk+=8)x[xk?'lineTo':'moveTo'](xk,yy+wv(xk,i)-1.5);x.stroke()}});
  x.fillStyle=rim;x.fillRect(0,0,S,9);x.fillStyle='rgba(255,226,196,.28)';x.fillRect(0,9,S,3);
  for(let i=0;i<90;i++){x.fillStyle=sr()<.5?'rgba(255,200,160,.22)':'rgba(40,14,6,.22)';x.beginPath();x.arc(sr()*S,sr()*S,1+sr()*2.4,0,7);x.fill()}
  x.fillStyle='rgba(30,10,4,.5)';x.fillRect(0,0,3,S);x.fillRect(S-3,0,3,S)},1,1,k);
 const WPAL=[['#bd6a40',.2],['#8c4a2b',.14],['#a95b34',.17],['#6b3721',.15],['#96532f',.18],['#5c2e1b',.16]];
 const CPAL=[['#e2786a',.22],['#c05b4c',.14],['#d26b58',.18],['#a84b3e',.16],['#c55d4d',.16],['#8e3c33',.14]];
 /* 壁の上面：赤橙。小さな割れ目のしるし */
 const WTOP=cv(256,256,x=>{x.fillStyle='#ec7557';x.fillRect(0,0,256,256);
  for(let i=0;i<14;i++){const px=sr()*256,py=sr()*256,r=24+sr()*50,hi=sr()<.5;wrap(256,(a,b)=>rg(x,px+a,py+b,r,hi?'255,150,118':'196,84,60',hi?.16:.14))}
  x.lineCap='round';x.lineJoin='round';
  for(let i=0;i<3;i++){const px=26+sr()*190,py=26+sr()*190;x.strokeStyle='rgba(172,72,50,.9)';x.lineWidth=4.2;x.beginPath();x.arc(px,py,9,Math.PI*1.08,Math.PI*1.92);x.stroke();x.beginPath();x.arc(px+16,py+4,8,Math.PI*1.08,Math.PI*1.92);x.stroke();x.strokeStyle='rgba(255,170,140,.45)';x.lineWidth=2;x.beginPath();x.arc(px,py+4,9,Math.PI*1.1,Math.PI*1.9);x.stroke()}},1,1,0);
 /* 水面のきらめき */
 const SHINE=cv(128,128,x=>{x.lineCap='round';for(let i=0;i<5;i++){const px=sr()*128,py=sr()*128,l=18+sr()*22;wrap(128,(a,b)=>{x.strokeStyle='rgba(255,255,255,.55)';x.lineWidth=3+sr()*2;x.beginPath();x.moveTo(px+a,py+b);x.lineTo(px+a+l,py+b-l*.35);x.stroke()})}},1/3,1/3);

 /* ---------- 地面：台地(アリーナ)と、その外の低地 ---------- */
 {const t1=SAND,t2=SAND.clone();t2.needsUpdate=true;t1.repeat.set((W+.1)/10.5,(H+1.1)/10.5);t2.repeat.set(150/10.5,170/10.5);
  const pl=new T.Mesh(new T.PlaneGeometry(W+.1,H+1.1),std({map:t1,roughness:1}));pl.rotation.x=-Math.PI/2;pl.position.set(W/2,0,H/2);pl.receiveShadow=true;gs.add(pl);
  const lw=new T.Mesh(new T.PlaneGeometry(150,170),std({map:t2,roughness:1,color:new T.Color(.92,.84,.8)}));lw.rotation.x=-Math.PI/2;lw.position.set(W/2,LOW,H/2);lw.receiveShadow=true;gs.add(lw)}

 /* ---------- 壁(赤い岩ブロック)・柵・サボテン(マスごとの配置) ---------- */
 const WSM=[0,1].map(i=>std({map:strata(WPAL,1,'#d6804f'),roughness:.95})),WTM=std({map:WTOP,roughness:.95});
 const wl=[[],[]],fl=[],ao=[],aow=[],cs=[];
 /* 内側の壁(W)は「壁を壊せる攻撃(brk を持つ攻撃)」で壊れる。tx,tz を持たせて regDM に登録してあり、通常攻撃では壊れない(外周・柵・水は壊れない) */
 for(let z=0;z<H;z++)for(let x=0;x<W;x++){const t=g[z][x],X=x+.5,Z=z+.5;
  if(t=='W'){wl[(x*7+z*3)&1].push({tx:x,tz:z,x:X,y:WH/2,z:Z,s:[1,WH,1],r:Math.floor(sr()*4)*Math.PI/2});aow.push({tx:x,tz:z,x:X,y:.014,z:Z+.12,s:[1.75,1,1.8]})}
  else if(t=='c')cs.push({x:X,y:0,z:Z+.05,s:[1.2,1.2,1.2],r:sr()*6.28})}
 /* 柵：マップの縁(Fのマス)の外寄りに立てる。本家は自陣側でz=35.0(Fのマスの外縁)。杭は1.3と2.0マスを交互に空ける */
 const fp=[],fr=[];
 [.02,H-.02].forEach(zz=>{const xs=[];let px=.55,i=0;while(px<W-.5){xs.push(px+(sr()-.5)*.1);px+=i++%2?1.3:2.0}xs.push(W-.5);
  xs.forEach(x=>{fp.push({x,y:0,z:zz,s:[1,.94+sr()*.14,1],r:sr()*6.28});ao.push({x,y:.014,z:zz+.06,s:[1.5,1,1.3]})});
  for(let k=0;k<xs.length-1;k++){const a=xs[k],b=xs[k+1];[.52,.86].forEach(y=>fr.push({x:(a+b)/2,y,z:zz,s:[b-a,1,1],r:(sr()-.5)*.02}))}});
 [0,1].forEach(i=>regDM(BX,[WSM[i],WSM[i],WTM,WSM[i],WSM[i],WSM[i]],wl[i]));
 {const AOM=new T.MeshBasicMaterial({map:AOR,color:dlin(0x6e2c1a),transparent:true,opacity:.42,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
  inst(AQ,AOM,ao,0,0);regDM(AQ,AOM,aow,0,0)/* 壁の足もとの影も、壁といっしょに消える */}
 const VM=std({vertexColors:true,roughness:.85}),VMF=std({vertexColors:true,roughness:.85,flatShading:true});

 /* 丸太の柵：太めの杭(渦巻きの切り口)＋横木＋縄。杭は直径.6・高さ1.25(本家の画面比から) */
 const [postG,railG]=(()=>{const wd=(wy,nx,ny)=>mix3(dcol(0xa4633a,1),dcol(0xd8a060,0),ss(.3,.85,ny)).map(v=>v*(.8+.2*Math.min(1,wy/.5)));
  return[mrg([[new T.CylinderGeometry(.27,.31,1.25,12),mx(0,.625,0),(a,b,c,nx,ny,nz,wx,wy)=>wd(wy,nx,ny)],
   [new T.CylinderGeometry(.275,.275,.07,12),mx(0,1.25,0),()=>dcol(0xe8b878,0)],[new T.CylinderGeometry(.17,.17,.08,12),mx(0,1.265,0),()=>dcol(0xf8dca6,0)],
   [new T.TorusGeometry(.3,.045,6,14),mx(0,.9,0,1,1,1,Math.PI/2,0,0),()=>dcol(0xd8b070,.5)]]),
   mrg([[new T.BoxGeometry(1,.14,.12),mx(0,0,0),(a,b,c,nx,ny,nz,wx,wy)=>wd(wy+.5,nx,ny)]])]})();
 inst(postG,VM,fp);inst(railG,VM,fr);

 /* ---------- 池(水)：茶色い縁＋明るい青。まとまりごとに角丸の長方形 ---------- */
 const rrS=(w,h,r)=>{const s=new T.Shape(),a=-w/2,b=-h/2;s.moveTo(a+r,b);s.lineTo(a+w-r,b);s.absarc(a+w-r,b+r,r,-Math.PI/2,0,false);s.lineTo(a+w,b+h-r);s.absarc(a+w-r,b+h-r,r,0,Math.PI/2,false);s.lineTo(a+r,b+h);s.absarc(a+r,b+h-r,r,Math.PI/2,Math.PI,false);s.lineTo(a,b+r);s.absarc(a+r,b+r,r,Math.PI,Math.PI*1.5,false);return s};
 const ringS=(w1,h1,r1,w2,h2,r2)=>{const s=rrS(w1,h1,r1);s.holes.push(rrS(w2,h2,r2));return s};
 const SH=SHINE,flat=(geo)=>{geo.rotateX(-Math.PI/2);return geo};
 {const seen=new Set();
  for(let z=0;z<H;z++)for(let x=0;x<W;x++){if(g[z][x]!='~'||seen.has(z*W+x))continue;let x0=x,x1=x,z0=z,z1=z;const st=[[x,z]];seen.add(z*W+x);
   while(st.length){const[a,b]=st.pop();x0=Math.min(x0,a);x1=Math.max(x1,a);z0=Math.min(z0,b);z1=Math.max(z1,b);[[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dz])=>{const nx=a+dx,nz=b+dz;if(nx>=0&&nz>=0&&nx<W&&nz<H&&g[nz][nx]=='~'&&!seen.has(nz*W+nx)){seen.add(nz*W+nx);st.push([nx,nz])}})}
   const w=x1-x0+1,h=z1-z0+1,cx=x0+w/2,cz=z0+h/2,grp=new T.Group();grp.position.set(cx,0,cz);gs.add(grp);
   const rim=new T.Mesh(flat(new T.ExtrudeGeometry(ringS(w+.04,h+.04,.6,w-.2,h-.2,.44),{depth:.1,bevelEnabled:false})),std({color:new T.Color(...dcol(0x95503a,.3)),roughness:.9}));rim.castShadow=false;rim.receiveShadow=true;grp.add(rim);
   const fill=new T.Mesh(flat(new T.ShapeGeometry(rrS(w-.16,h-.16,.44))),new T.MeshBasicMaterial({color:dlin(0x2297e3)}));fill.position.y=.05;grp.add(fill);
   const edge=new T.Mesh(flat(new T.ShapeGeometry(ringS(w-.16,h-.16,.44,w-.42,h-.42,.32))),new T.MeshBasicMaterial({color:dlin(0x5cbdf6)}));edge.position.y=.056;grp.add(edge);
   }}

 /* ---------- 飾り：サボテン・髑髏・平たい岩・草・木箱(アリーナの外) ---------- */
 const cacS=mrg([[new T.SphereGeometry(1,22,14),mx(0,.34,0,.37,.33,.37),(lx,ly,lz,nx,ny,nz,wx,wy)=>gc(0x2a7a48,0x5cc275,(wy-.02)/.62,.5).map(v=>v*(1+.07*Math.cos(Math.atan2(lz,lx)*9)))]]
  .concat(Array.from({length:6},(_,i)=>{const a=i/6*6.283;return[new T.SphereGeometry(1,8,6),mx(Math.cos(a)*.11,.7,Math.sin(a)*.11,.09,.045,.09),()=>dcol(0xe2303c,.3)]}))
  .concat([[new T.SphereGeometry(1,8,6),mx(0,.72,0,.06,.05,.06),()=>dcol(0xffd23a,.3)]]));
 const cacB=(()=>{const cy=(r,h)=>new T.CylinderGeometry(r,r*1.05,h,14,1),sp=()=>new T.SphereGeometry(1,16,10),cf=(lx,ly,lz,nx,ny,nz,wx,wy)=>gc(0x1f7a45,0x52bd6e,wy/2.1,.5).map(v=>v*(1+.09*Math.cos(Math.atan2(lz,lx)*8)));
  return mrg([[cy(.4,1.9),mx(0,.95,0),cf],[sp(),mx(0,1.9,0,.4,.38,.4),cf],[cy(.24,.8),mx(.62,1.05,0,1,1,1,0,0,Math.PI/2),cf],[cy(.25,.9),mx(.98,1.5,0),cf],[sp(),mx(.98,1.95,0,.25,.26,.25),cf],
   [cy(.22,.7),mx(-.58,.7,0,1,1,1,0,0,Math.PI/2),cf],[cy(.23,.8),mx(-.9,1.05,0),cf],[sp(),mx(-.9,1.45,0,.23,.24,.23),cf]])})();
 /* 大きな丸サボテン：花なしのリブつき球。半径1の球を埋め込んで置く */
 const cacR=mrg([[new T.SphereGeometry(1,24,16),mx(0,.62,0,1,.9,1),(lx,ly,lz,nx,ny,nz,wx,wy)=>gc(0x2a7a48,0x5cc275,(wy+.3)/1.8,.5).map(v=>v*(1+.08*Math.cos(Math.atan2(lz,lx)*10)))]]);
 const skullG=mrg([[new T.SphereGeometry(1,14,10),mx(0,.26,0,.3,.22,.28),()=>dcol(0xf1e6cc,.5)],[new T.SphereGeometry(1,12,8),mx(0,.2,.3,.15,.13,.22),()=>dcol(0xeadcbc,.5)],
  [new T.SphereGeometry(1,8,6),mx(-.11,.3,.22,.07,.07,.05),()=>dcol(0x3a2a22,.5)],[new T.SphereGeometry(1,8,6),mx(.11,.3,.22,.07,.07,.05),()=>dcol(0x3a2a22,.5)],
  [new T.ConeGeometry(.07,.62,8),mx(-.5,.42,0,1,1,1,0,0,1.0),()=>dcol(0xe8d8b4,.5)],[new T.ConeGeometry(.07,.62,8),mx(.5,.42,0,1,1,1,0,0,-1.0),()=>dcol(0xe8d8b4,.5)]]);
 const slabG=(()=>{const g0=new T.CylinderGeometry(1,1.12,.42,5,1),p=g0.attributes.position;for(let i=0;i<p.count;i++)p.setXYZ(i,p.getX(i)*(1+(hsh(i,1,2)-.5)*.3),p.getY(i),p.getZ(i)*(1+(hsh(i,3,4)-.5)*.3));g0.computeVertexNormals();
  return paint(g0,(x,y,z,nx,ny)=>ny>.5?dcol(0xec8a74,0):mix3(dcol(0xb5503f,1),dcol(0xd8705c,1),Math.max(0,Math.min(1,y+.5))))})();
 const tuftG=mgc(Array.from({length:9},(_,i)=>{const a=i/9*6.283+sr()*.5,r=.02+sr()*.1,h=.22+sr()*.28,b=new T.ConeGeometry(.1+sr()*.04,h,3,1,true);b.translate(0,h/2,0);b.rotateX(.1+sr()*.3);b.rotateY(a);b.translate(Math.cos(a)*r,0,Math.sin(a)*r);return b}),0xf07a14,0xffc83c,.45);
 /* ---------- 峡谷：アリーナの左右は、深い谷(赤い地層の壁)と、その向こうの岩台地。本家の見た目に合わせた地形メッシュ(頂点色＋地層テクスチャ)。高さは CNY.sh(x,z) で取れる ---------- */
 function makeCanyon(env){
 const {W,H,LOW,dcol,mix3,ss,hsh}=env;
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const lerp=(a,b,t)=>a+(b-a)*t;
 /* 単調な3次エルミート補間(端は水平)。谷底は極小点で水平になる */
 const pchip=(xs,ys)=>{const n=xs.length,d=[],m=[];for(let i=0;i<n-1;i++)d[i]=(ys[i+1]-ys[i])/(xs[i+1]-xs[i]);
  m[0]=0;m[n-1]=0;for(let i=1;i<n-1;i++)m[i]=d[i-1]*d[i]<=0?0:(d[i-1]+d[i])/2;
  for(let i=0;i<n-1;i++){if(d[i]===0){m[i]=m[i+1]=0;continue}const a=m[i]/d[i],b=m[i+1]/d[i],s=a*a+b*b;if(s>9){const t=3/Math.sqrt(s);m[i]=t*a*d[i];m[i+1]=t*b*d[i]}}
  return x=>{if(x<=xs[0])return ys[0];if(x>=xs[n-1])return ys[n-1];let i=0;while(x>xs[i+1])i++;const h=xs[i+1]-xs[i],t=(x-xs[i])/h,t2=t*t,t3=t2*t;
   return(2*t3-3*t2+1)*ys[i]+(t3-2*t2+t)*h*m[i]+(-2*t3+3*t2)*ys[i+1]+(t3-t2)*h*m[i+1]}};
 const wob=(z,a,b)=>Math.sin(z*.31+a)*.26+Math.sin(z*.83+b)*.14+Math.sin(z*1.9+a*b)*.05;
 /* 谷の断面(u=アリーナの縁から外への距離)。ふち→肩→谷底→向こう側の壁→岩棚 */
 const prof=(u,z,L)=>{const o1=wob(z,.7+L,2.1),o2=wob(z,2.2+L,.4),o3=wob(z,4.1+L,1.3);
  const xs=[.38+o1*.3,.8+o1*.45,1.25+o2*.4,1.8+o2*.5,2.5+o3*.6,3.12+o3*.7,3.55+o3*.8],ys=[0,-1.3,-3.0,-3.3,-1.9,-.5,-.35];
  for(let i=1;i<xs.length;i++)if(xs[i]<=xs[i-1]+.05)xs[i]=xs[i-1]+.05;
  return pchip(xs,ys)(u)};
 /* 岩台地(まるい岩の台。てっぺんは平ら) */
 const MESA=[
  [[5.9,26.6,2.4,1.05],[4.5,17.8,1.3,.45],[5.6,8.6,2.1,.8],[3.9,2.4,1.5,.5],[6.2,13.4,1.2,.35]],
  [[4.7,25.2,2.7,1.15],[2.8,22.4,.95,.4],[5.7,16.2,1.5,.5],[5.2,7.4,2.2,.9],[3.3,3.2,1.2,.45]]];
 const mesa=(u,z,L)=>{let a=0;for(const[cu,cz,r,hh]of MESA[L]){const dx=u-cu,dz=(z-cz)*.9,d=Math.hypot(dx,dz),th=Math.atan2(dz,dx),re=r*(1+.1*Math.sin(th*3+cu)+.06*Math.sin(th*5+cz));
   const m=1-ss(re-.55,re,d);if(m>0)a=Math.max(a,hh*m)}return a};
 /* 左の座標系(u=-x)での高さ。L=0 左, 1 右 */
 const th=z=>{const d=z<0?-z:z>H?z-H:0;return d<.55?-.03:d<4.7?-.9:d<8.3?-1.7:LOW};
 const hU=(u,z,L)=>{let y=prof(u,z,L);
  if(u>3.5){const f=ss(5.8,9.3,u);y=lerp(y,LOW,f)+.12*Math.sin(u*1.3+z*.7)*(1-f)*ss(3.8,4.8,u)}
  y+=mesa(u,z,L)*(1-ss(7.2,9,u));
  if(z<0||z>H)y=Math.min(y,th(z)-.03);
  return y};
 /* 世界座標(x,z)での高さ。左側 x<0・右側 x>W 以外は null */
 const sh=(x,z)=>{if(x<0)return hU(-x,z,0);if(x>W)return hU(x-W,z,1);return 0};
 /* ---- 色 ---- */
 /* 地層の縞(テクスチャの1周期=4つの層)。f=0..1 → 明るさの係数。層ごとに少し濃淡があり、層の境目に暗い線とそのすぐ下の明るい線 */
 const strataMul=f=>{f=f-Math.floor(f);const q=Math.floor(f*4),g=f*4-q,base=[.9,.96,.86,.82][q];
  let m=base;if(g<.06)m=base*(.7+.3*ss(0,.06,g));else if(g<.17)m=base+(1-base)*Math.sin((g-.06)/.11*Math.PI);return m};
 const TAN=0xe8b383,TAN2=0xe3a97c,LIP=0xf6b888,RIM=0xf0bd90;
 const cc=new Map();const dc=(h,k)=>{const key=h*2+(k?1:0);let v=cc.get(key);if(!v){v=dcol(h,k||0);cc.set(key,v)}return v};
 /* 縞テクスチャの v 座標(高さ+なみ打ち)。壁の面の上でなめらかに変わる */
 const uvv=(y,z,L)=>y*.7+Math.sin(z*.9+y*1.3+L)*.07+Math.sin(z*.37+2+L*3)*.1;
 const colorAt=(u,z,y,ny,L)=>{
  /* 壁の色: 谷の壁=明るい赤ピンク、岩台地の側面=少し濃い赤茶 */
  const k=ss(-1.3,-.15,y)*ss(3.7,4.6,u);
  let wall=mix3(dc(0xdc6b5d,1),dc(0xbd5b4b,1),k);
  const d=ss(0,3.4,-y)*.12;wall=wall.map((v,i)=>v*(1-d)*1.1*(L?[.84,.78,.74][i]:1));   /* 谷底ほど暗く / 縞テクスチャの平均(≒.9)を補う */
  let top;if(u<.55)top=dc(u<.45?LIP:RIM,0);else{const q=.5+.5*Math.sin(u*.9+z*.35);top=mix3(dc(TAN,0),dc(TAN2,0),q*.7);if(ny<.985)top=mix3(top,dc(RIM,0),clamp((.985-ny)*14,0,.8))}
  return mix3(wall,top,ss(.55,.9,ny))};
 /* ---- メッシュ ---- */
 const build=L=>{
  const us=[];for(let u=.05;u<4.6;u+=.08)us.push(u);for(let u=4.6;u<8;u+=.12)us.push(u);for(let u=8;u<9.45;u+=.3)us.push(u);
  const zs=[];for(let z=-3;z<=H+3+1e-6;z+=.2)zs.push(z);
  const nu=us.length,nz=zs.length,P=new Float32Array(nu*nz*3),N=new Float32Array(nu*nz*3),C=new Float32Array(nu*nz*3),UV=new Float32Array(nu*nz*2),NY=new Float32Array(nu*nz);
  const hh=(u,z)=>hU(u,z,L);
  for(let j=0;j<nz;j++)for(let i=0;i<nu;i++){const u=us[i],z=zs[j],y=hh(u,z),e=.04;
   const dyu=(hh(u+e,z)-hh(u-e,z))/(2*e),dyz=(hh(u,z+e)-hh(u,z-e))/(2*e);let nx=-dyu,ny=1,nz_=-dyz;const l=Math.hypot(nx,ny,nz_);nx/=l;ny/=l;nz_/=l;
   const n=j*nu+i,k=n*3,wx=L?W+u:-u,wnx=L?nx:-nx;P[k]=wx;P[k+1]=y;P[k+2]=z;N[k]=wnx;N[k+1]=ny;N[k+2]=nz_;NY[n]=ny;
   const c=colorAt(u,z,y,ny,L);C[k]=c[0];C[k+1]=c[1];C[k+2]=c[2];UV[n*2]=z*.12;UV[n*2+1]=uvv(y,z,L)}
  /* 面を「壁(縞テクスチャつき)」と「上面(頂点色のみ)」に分ける */
  const wl=[],tp=[];
  for(let j=0;j<nz-1;j++)for(let i=0;i<nu-1;i++){const a=j*nu+i,b=a+1,c=a+nu,d=c+1;
   const t1=L===0?[a,b,c]:[a,c,b],t2=L===0?[b,d,c]:[b,c,d];
   for(const t of[t1,t2]){const ny=(NY[t[0]]+NY[t[1]]+NY[t[2]])/3;(ny<.86?wl:tp).push(...t)}}
  const all=wl.concat(tp),I=nu*nz>65000?Uint32Array.from(all):Uint16Array.from(all);
  return{P,N,C,UV,I,nWall:wl.length}};
 const strataTable=n=>{const a=[];for(let i=0;i<n;i++)a.push(strataMul(i/n));return a};
 return{sh,build,hU,strataMul,strataTable};
}
 const CNY=(()=>{const c=makeCanyon({W,H,LOW,dcol,mix3,ss,hsh});
  const sc=document.createElement('canvas');sc.width=8;sc.height=256;{const x=sc.getContext('2d');for(let i=0;i<256;i++){const m=Math.round(255*c.strataMul(1-(i+.5)/256));x.fillStyle='rgb('+m+','+m+','+m+')';x.fillRect(0,i,8,1)}}
  const st=new T.CanvasTexture(sc);st.wrapS=st.wrapT=T.RepeatWrapping;st.anisotropy=AN;
  const mTop=std({vertexColors:true,roughness:.95}),mWall=std({map:st,vertexColors:true,roughness:.95});
  [0,1].forEach(Lr=>{const b=c.build(Lr),g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(b.P,3));g.setAttribute('normal',new T.BufferAttribute(b.N,3));g.setAttribute('color',new T.BufferAttribute(b.C,3));g.setAttribute('uv',new T.BufferAttribute(b.UV,2));g.setIndex(new T.BufferAttribute(b.I,1));
   if(b.nWall)g.addGroup(0,b.nWall,1);if(b.I.length>b.nWall)g.addGroup(b.nWall,b.I.length-b.nWall,0);
   const m=new T.Mesh(g,[mTop,mWall]);m.castShadow=false;m.receiveShadow=true;gs.add(m)});
  return c})();
 const D={cacS:cs.slice(),cacB:[],cacR:[],skull:[],slab:[],tuft:[],crate:[]};
 /* 柵の外の地面の高さ：.55マスまで砂のでっぱり(y=0)→岩棚(-.9)→さらに下(-1.7)→低地。zはマスの座標(上=負) */
 const th=z=>{const d=z<0?-z:z>H?z-H:0;return d<.55?0:d<4.7?-.9:d<8.3?-1.7:LOW};
 const put=(k,x,y,z,s,r)=>D[k].push({x,y,z,s:[s,s,s],r:r==null?sr()*6.28:r});
 /* 上側(敵陣)の飾りを作り、180°回転したものを下側(自陣)に置く */
 const both=f=>{f(a=>a,b=>b);f(a=>W-a,b=>H-b)};
 both((fx,fz)=>{
  [[1.5,-1.1,.47],[2.6,-1.0,.47],[2.05,-1.05,1.41],[3.3,-2.1,.47]].forEach(([x,z,y])=>put('crate',fx(x),y+th(fz(z)),fz(z),.94,(sr()-.5)*.3));
  [[18.1,-1.0,.47],[19.2,-1.1,.47],[19.8,-2.1,.47],[18.65,-1.05,1.41]].forEach(([x,z,y])=>put('crate',fx(x),y+th(fz(z)),fz(z),.94,(sr()-.5)*.3));
  [[4.3,-.4,1.1],[5.1,-.25,.9],[14.0,-.4,1.1],[14.7,-.3,.85],[9.5,-2.1,1.0],[11.5,-2.7,.9]].forEach(([x,z,s])=>put('cacS',fx(x),th(fz(z)),fz(z),s));
  /* 手前の低地の大きな丸サボテン(自陣側の世界座標 x=-2.8,2.2,4.6,15.6,22.8 に当たる) */
  [[23.8,-2.9,2.0],[18.8,-3.0,.9],[16.4,-2.9,1.4],[5.4,-3.1,1.1],[-1.8,-2.2,2.4]].forEach(([x,z,s])=>put('cacR',fx(x),th(fz(z)),fz(z),s));
  put('skull',fx(-4.6),CNY.sh(fx(-4.6),fz(2.6)),fz(2.6),1.5,.6);put('skull',fx(7),th(fz(-2.6)),fz(-2.6),1.1,-.4);
  for(let i=0;i<12;i++){const za=-1.5-sr()*6,zb=-.3-sr()*8;put('slab',fx(1+sr()*19),th(fz(za))+.2,fz(za),.35+sr()*.45);put('tuft',fx(sr()*21),th(fz(zb)),fz(zb),.8+sr()*.7)}
  for(let i=0;i<8;i++)put('tuft',fx(-.3+sr()*.4),0,fz(sr()*17),.8+sr()*.5)});
  /* 谷の向こう(岩台地・岩棚)の飾り。サボテン・平たい岩・草は、地形の高さ CNY.sh の上に置く */
  const okSpot=(x,z)=>{const y=CNY.sh(x,z);return y>-.9&&[[.4,0],[-.4,0],[0,.4],[0,-.4]].every(([a,b])=>Math.abs(CNY.sh(x+a,z+b)-y)<.2)};
  [[0,[[5.9,26.4,'cacB',1.25],[3.9,33.3,'cacS',1.3],[5.6,8.4,'cacB',1.4],[4.5,17.8,'cacB',.95],[6.2,3.2,'cacB',1.15],[6.0,31.6,'cacB',1.05]]],
   [1,[[5.0,24.6,'cacB',1.5],[2.9,22.4,'cacB',1.0],[3.9,32.4,'cacB',1.3],[5.5,7.2,'cacB',1.35],[6.3,14,'cacB',1.0],[3.4,3.4,'cacS',1.1]]]].forEach(([Lr,a])=>a.forEach(([u,z,k,sz])=>{const x=Lr?W+u:-u;put(k,x,CNY.sh(x,z),z,sz)}));
  for(const Lr of[0,1])for(let i=0,n=0;n<16&&i<300;i++){const u=3.6+sr()*5,z=-1+sr()*(H+2),x=Lr?W+u:-u;if(!okSpot(x,z))continue;n++;put('slab',x,CNY.sh(x,z)+.2,z,.4+sr()*.5);if(sr()<.7){const tx=x+(sr()-.5)*1.4;put('tuft',tx,CNY.sh(tx,z),z,.8+sr()*.7)}}
 inst(cacS,VM,D.cacS);inst(cacB,VM,D.cacB);inst(cacR,VM,D.cacR);inst(skullG,VM,D.skull);inst(slabG,VMF,D.slab);inst(tuftG,std({vertexColors:true,roughness:.95,side:2}),D.tuft,0,0);/* 草むら(BMAT=個体色あり)と材質を共有すると、three.js r128 が instanceColor 無しの房を描く時に例外→以降の描画が全部止まる */inst(CRG,std({map:CT,vertexColors:true,roughness:.75}),D.crate);

 /* ---------- 崖：左右は上の峡谷メッシュ(CNY)。手前(自陣)と奥(敵陣)は赤い地層の段々 ---------- */
 {
  /* 手前(自陣)と奥(敵陣)：柵の外は砂のでっぱり.55マス→崖→1段下の岩棚(y=-.9)→さらに下(-1.7)→低地。以前は平らな砂が9マス続いていた */
  const TPAL=[['#e6b183',.22],['#d99b6d',.14],['#e0a679',.18],['#c98c5f',.16],['#d89b6e',.16],['#b97d55',.14]],CS2=strata(TPAL,1,'#f3cca4'),side2=std({map:CS2,roughness:.95}),
   top2=std({color:new T.Color(...dcol(0xeb9e72,0)),roughness:.95}),cmat2=[side2,side2,top2,side2,side2,side2],cl2=[];
  for(const m of[0,1]){const f=z=>m?H-z:z;
   [[-.275,.55,-.03],[-2.6,4.2,-.9],[-6.45,3.7,-1.7]].forEach(([cz,d,tp])=>{for(let x=-7;x<W+7;){const len=1.6+sr()*1.4,h=tp-LOW+sr()*.1,d2=d*(.97+sr()*.06),k=.95+sr()*.08;cl2.push({x:x+len/2,y:tp-h/2,z:f(cz),s:[len*1.02,h,d2],r:0,c:new T.Color(k,k*.98,k*.97)});x+=len}})}
  inst(BX,cmat2,cl2)}

 /* ---------- 見た目の仕上げ：中央の鉱山は隠す(ノックアウトでは使わない)・水面を動かす ---------- */
 mine.visible=false;beam.visible=false;ml.visible=false;MS.forEach(s=>{s.visible=false});
 {const s0=stageFx;stageFx=dt=>{s0(dt);SH.offset.x+=dt*.035;SH.offset.y+=dt*.012}}
}

}
['#bb','#br'].forEach(s=>{for(let i=0;i<10;i++)$(s).append(document.createElement('i'))});
const HUDUI={gb:$('#gb'),gr:$('#gr'),bb:Array.from($('#bb').children),br:Array.from($('#br').children),clock:$('#clock'),cdb:$('#cdb'),sup:$('#sup'),ammo:Array.from($('#ammo').children)};
function bushUpd(dt){const p=P0,on=p.alive&&inBush(p.x,p.z);let ch=0;
 /* ブッシュに入っているキャラ(自分・味方・見えている敵)の足もとは、本家のように草がぺたんと寝て、キャラの周りだけ丸く見える。
    見えていない敵(root.visible=false)では寝かさない＝位置がばれない。足もとの輪は寝た草に埋もれないよう少し持ち上げる */
 const FL=[];for(const u of U){const ib=u.alive&&inBush(u.x,u.z),rg=u.root.rg,dk=u.root.dk;if(rg&&u.ibr!==ib){u.ibr=ib;rg.material.depthTest=!ib;rg.material.transparent=!!ib;rg.renderOrder=ib?20:0;if(dk)dk.visible=!ib}}
 for(let i=0;i<bush.length;i++){const b=bush[i];if(b.dead)continue;let t=0;for(let j=0;j<FL.length;j++){const d=Math.hypot(b.x-FL[j].x,b.z-FL[j].z);if(d<1.8){const k=Math.max(0,Math.min(1,(d-.9)/.9)),v=1-k*k*(3-2*k);if(v>t)t=v}}
  if(b.f!=t){b.f+=(t-b.f)*Math.min(1,dt*9);if(Math.abs(t-b.f)<.02)b.f=t;bd.position.set(b.x,0,b.z);bd.rotation.set(0,b.r,0);bd.scale.set(b.s,b.s*(1-.93*b.f),b.s);bd.updateMatrix();BM.setMatrixAt(i,bd.matrix);ch=1}}
 if(ch)BM.instanceMatrix.needsUpdate=true;const m=bp.material;m.opacity+=(0-m.opacity)*Math.min(1,dt*9);bp.visible=m.opacity>.02;bp.position.set(p.x,.02,p.z);for(let i=HF.length-1;i>=0;i--){const h=HF[i];h.t-=dt;h.s.position.y+=dt*(h.n?1:1.6);if(h.u){h.s.position.x=h.u.x;h.s.position.z=h.u.z}h.s.material.opacity=Math.min(1,h.t*2);if(h.t<=0){gs.remove(h.s);if(h.n)h.s.material.map.dispose();h.s.material.dispose();HF.splice(i,1)}}for(let i=NV.length-1;i>=0;i--){const n=NV[i];n.t-=dt;const k=1-Math.max(0,n.t)/.45;n.m.scale.setScalar(Math.max(.2,n.r*2*k));n.m.material.opacity=1-k;if(n.t<=0){gs.remove(n.m);n.m.geometry.dispose();n.m.material.dispose();NV.splice(i,1)}}}
function setOp(u,o){u.op=o;u.opa=o;u.body.traverse(m=>{if(!m.isMesh)return;if(isOL(m)){m.visible=o>=1;return}m.material.transparent=o<1;m.material.opacity=o;m.material.needsUpdate=true})}
function gsp(n,tex){const c=tex&&tex.image&&tex.image.getContext?tex.image:document.createElement('canvas');if(!c.width)c.width=c.height=64;const x=c.getContext('2d');x.clearRect(0,0,64,64);x.fillStyle='#8a3cf0';x.strokeStyle='#fff';x.lineWidth=4;x.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3-Math.PI/2;x[i?'lineTo':'moveTo'](32+26*Math.cos(a),32+26*Math.sin(a))}x.closePath();x.fill();x.stroke();x.fillStyle='#fff';x.font='bold 30px MiSans,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(n,32,34);if(!tex)tex=new T.CanvasTexture(c);else tex.needsUpdate=true;return tex}
const HF=[],NV=[];
const PT=cv(64,64,x=>{x.fillStyle='#3dff5a';x.strokeStyle='#fff';x.lineWidth=7;x.lineJoin='round';x.beginPath();[[22,4],[42,4],[42,22],[60,22],[60,42],[42,42],[42,60],[22,60],[22,42],[4,42],[4,22],[22,22]].forEach((p,i)=>x[i?'lineTo':'moveTo'](...p));x.closePath();x.stroke();x.fill()});
function dnum(e,v){const c=document.createElement('canvas');c.width=192;c.height=64;const x=c.getContext('2d'),t=String(Math.round(v));x.font='900 44px MiSans,system-ui,sans-serif';x.textAlign='center';x.textBaseline='middle';x.lineWidth=8;x.strokeStyle='#5a1a00';x.lineJoin='round';x.strokeText(t,96,34);x.fillStyle=v>=1200?'#ffe14a':'#ffffff';x.fillText(t,96,34);const sp=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(c),transparent:true,depthTest:false}));sp.scale.set(1.5,.5,1);sp.position.set(e.x+(Math.random()-.5)*.6,1.9*(e.c.sc||1),e.z);sp.renderOrder=14;gs.add(sp);HF.push({s:sp,t:.8,n:1})}
function hnum(u,v){const c=document.createElement('canvas');c.width=192;c.height=64;const x=c.getContext('2d');x.font='900 46px MiSans,system-ui,sans-serif';x.textAlign='center';x.textBaseline='middle';x.lineWidth=8;x.strokeStyle='#0a3a14';x.lineJoin='round';x.strokeText('+'+v,96,34);x.fillStyle='#6dff7a';x.fillText('+'+v,96,34);const s=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(c),transparent:true,depthTest:false}));s.scale.set(1.5,.5,1);s.position.set(u.x,1.3*(u.c.sc||1),u.z);s.renderOrder=14;gs.add(s);HF.push({s,t:1.1,n:1,u})}
function heal(u){if(u.team!=P0.team&&!vis(u,P0))return;const s=new T.Sprite(new T.SpriteMaterial({map:PT,transparent:true,depthTest:false})),k=.35+rnd()*.25;s.scale.set(k,k,1);s.position.set(u.x+(rnd()-.5)*.9,.4+rnd()*.5,u.z+(rnd()-.5)*.6);s.renderOrder=13;gs.add(s);HF.push({s,t:.9});fx(u.x,.4,u.z,0x6dff7a,2)}
function nova(u,s){snd(u.c.ss,u.x,u.z);if(s.rev)for(const e of U)if(!e.alive&&e.team==u.team&&!e.rem){e.alive=true;e.root.visible=true;e.hp=e.mx*.6;e.x=u.x;e.z=u.z;e.ammo=3;e.rt=0;e.lh=0;fx(e.x,1,e.z,0x6dff7a,16);if(e.isP)msg('ナースに蘇生された！',1500)}VFX.nova(u,s);shake=Math.max(shake,s.sm||s.slam?.5:.25);for(const e of U){if(!e.alive||Math.hypot(e.x-u.x,e.z-u.z)>s.r)continue;if(e.team==u.team){if(!e.rem){const b0=e.hp;e.hp=Math.min(e.mx,e.hp+(s.h||0));u.stt.hl+=e.hp-b0}if(s.h)for(let i=0;i<4;i++)heal(e)}else{if(s.d)dmg(e,s.d,u,s.nc);if(e.alive){if(s.fz&&!e.rem){e.fz=s.fz;e.dash=null;e.q=[]}if(s.kb&&!e.c.hv){const ka=Math.atan2(e.z-u.z,e.x-u.x);if(s.sm){if(!e.rem){knock(e,ka,s.kb);e.q=[]}fx(e.x,.6,e.z,0xffffff,8)}else knock(e,ka,s.kb,1)}}}}}
const rr=(x,a,b,w,h,r,c)=>{r=Math.min(r,w/2,h/2);x.fillStyle=c;x.beginPath();x.moveTo(a+r,b);x.arcTo(a+w,b,a+w,b+h,r);x.arcTo(a+w,b+h,a,b+h,r);x.arcTo(a,b+h,a,b,r);x.arcTo(a,b,a+w,b,r);x.closePath();x.fill()};
function nbUpd(u){if(tm-u.bt<.07)return;u.bt=tm;const k=Math.ceil(u.hp)+'|'+Math.floor(u.ammo*4)+'|'+Math.round((u.frost||0)*24)+'|'+(u.tf&&u.c.tf?Math.ceil(Math.max(0,u.tf.t)*30):-1);if(k==u.bk)return;u.bk=k;
 /* 画像をsRGBとして扱い、トーンマップなしで描いた色のまま出す(色がうすく見える問題の対策)。
    1ピクセル＝0.009375の大きさ。バーの幅130px＝約1.2＝キャラとほぼ同じ幅(本家と同じ) */
 if(!u.nbc){u.nbc=document.createElement('canvas');u.nbc.width=256;u.nbc.height=128;u.nb.scale.set(2.4,1.2,1);u.nb.position.y-=.197;const tx=new T.CanvasTexture(u.nbc);tx.encoding=T.sRGBEncoding;u.nb.material.map=tx;u.nb.material.toneMapped=false}
 const x=u.nbc.getContext('2d'),col=u.isP?'#4ccf33':u.team?'#ff3b30':'#2f9bff',n=Math.ceil(u.hp),RIM='#141c30',hr=Math.max(0,Math.min(1,u.hp/u.mx)),L=63,W=130;x.clearRect(0,0,256,128);
 x.textAlign='center';x.textBaseline='middle';x.lineJoin='round';
 /* 名前(いちばん上) */
 x.font='bold 24px MiSans,sans-serif';x.lineWidth=5;x.strokeStyle='#000';x.fillStyle=u.ncol||(u.isP?'#5cff3a':u.team?'#ff8f86':'#8fd0ff');x.strokeText(u.nm,128,15);x.fillText(u.nm,128,15);
 /* HPバー：太くて丸い。濃い縁取り＋上にツヤ */
 rr(x,L,42,W,24,11,RIM);rr(x,L+2,44,W-4,20,9,'#26324a');
 if(hr>0){const w=Math.max(20,(W-4)*hr);rr(x,L+2,44,w,20,9,col);rr(x,L+6,46,Math.max(8,w-8),6,3,'rgba(255,255,255,.38)')}
 /* HPの数字：バーの上端に少し重ねる */
 x.font='900 27px MiSans,sans-serif';x.lineWidth=6;x.strokeStyle='#0a1a33';x.fillStyle='#fff';x.strokeText(n,128,36);x.fillText(n,128,36);
 /* リロード(弾数)バー：バーのすぐ下に3つ。太くて縁取りあり */
 rr(x,L,65,W,16,7,RIM);for(let i=0;i<3;i++){const sx=L+2+i*43,f=Math.max(0,Math.min(1,u.ammo-i));rr(x,sx,67,40,12,4,'#4a2a14');if(f>0){const w=Math.max(8,40*f);rr(x,sx,67,w,12,4,'#f07a1e');rr(x,sx+2,68,Math.max(4,w-4),4,2,'rgba(255,255,255,.4)')}}
 /* 変身(必殺技)の継続ゲージ：弾数バーの下に黄色。残り時間に合わせて減る */
 if(u.tf&&u.c.tf){const f=Math.max(0,Math.min(1,u.tf.t/u.c.tf.t));rr(x,L,80,W,16,7,RIM);rr(x,L+2,82,W-4,12,5,'#272850');if(f>0){const w=Math.max(10,(W-4)*f);rr(x,L+2,82,w,12,5,'#ffe03a');rr(x,L+4,83,Math.max(4,w-4),4,2,'rgba(255,255,255,.45)')}}
 if((u.frost||0)>.001){const f=Math.min(1,u.frost),fz=u.fz>0;x.beginPath();x.arc(30,16,13,0,6.283);x.fillStyle='#0a1c3a';x.fill();x.beginPath();x.moveTo(30,16);x.arc(30,16,11,-Math.PI/2,-Math.PI/2+6.283*f);x.closePath();x.fillStyle=fz?'#ffffff':'#4fd8ff';x.fill();x.lineWidth=3;x.strokeStyle=fz?'#bff6ff':'#1a7fb0';x.beginPath();x.arc(30,16,13,0,6.283);x.stroke()}
 u.nb.material.map.needsUpdate=true;u.nb.material.needsUpdate=true}

/* ---------- キャラ生成 ---------- */
function eyes(b,y,z,w,pc){[-1,1].forEach(s=>{P(b,SP,0xffffff,s*.11*w,y,z,[.075,.085,.05],{no:1});P(b,SP,pc||0x221133,s*.11*w,y-.005,z+.04,[.04,.05,.03],{no:1})})}
/* ---------- ハイグラ（ブロスタ風）キャラ：トゥーン階調＋太い輪郭＋光沢ハイライト＋リムライト ---------- */
const TG=new T.DataTexture(new Uint8Array([120,120,120,255,168,168,168,255,216,216,216,255,255,255,255,255]),4,1,T.RGBAFormat);TG.minFilter=TG.magFilter=T.NearestFilter;TG.needsUpdate=true;
const OLQ={},isOL=m=>m.material==OL||m.material.userData.ol;
function olm(w){if(!OLQ[w]){const m=new T.MeshBasicMaterial({color:0x160a24,side:T.BackSide});m.userData.ol=1;m.customProgramCacheKey=()=>'ol'+w;m.onBeforeCompile=s=>{s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','vec3 transformed=position+normalize(normal)*'+w.toFixed(3)+';')};OLQ[w]=m}return OLQ[w]}
function tmat(c,o){const gl=o.gl==null?.45:o.gl,rm=o.rim==null?.4:o.rim,m=new T.MeshToonMaterial({color:c,gradientMap:TG,emissive:c,emissiveIntensity:o.e||0});m.customProgramCacheKey=()=>'tq'+gl+rm;
 m.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <tonemapping_fragment>','{vec3 N_=normalize(vNormal),V_=normalize(vViewPosition);gl_FragColor.rgb*=.78+.22*smoothstep(-.7,.7,N_.y);gl_FragColor.rgb+=vec3(1.,.96,.88)*pow(1.-max(dot(N_,V_),0.),3.)*'+rm.toFixed(2)+';gl_FragColor.rgb+=smoothstep(.42,.58,pow(max(dot(N_,normalize(vec3(-.35,.65,.68))),0.),14.))*'+gl.toFixed(2)+';}\n#include <tonemapping_fragment>')};return m}
function Q(b,g,c,x,y,z,o){o=o||{};const m=new T.Mesh(g,tmat(c,o));m.position.set(x,y,z);if(o.r)m.rotation.set(o.r[0],o.r[1],o.r[2]);m.castShadow=true;m.userData.e=o.e||0;if(o.ol!==0)m.add(new T.Mesh(g,olm(o.ol||.03)));b.add(m);return m}
const gS=(x,y,z,n)=>new T.SphereGeometry(1,n||22,n?Math.ceil(n*.7):16).scale(x,y,z),gL=(p,n)=>new T.LatheGeometry(p.map(a=>new T.Vector2(a[0],a[1])),n||24),
 gD=(r,h,e,n)=>{e=e||Math.min(r,h/2)*.6;return gL([[0,-h/2],[r-e,-h/2],[r,-h/2+e],[r,h/2-e],[r-e,h/2],[0,h/2]],n||24)},gT=(R,t,a)=>new T.TorusGeometry(R,t,10,24,a||6.283),
 bnd=(g,y0,k)=>{const p=g.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i);if(y>y0)p.setZ(i,p.getZ(i)-k*(y-y0)*(y-y0))}return g};
function gB(w,h,d,r){const g=new T.BoxGeometry(w,h,d,8,8,8),p=g.attributes.position,n=g.attributes.normal,a=new T.Vector3(w/2-r,h/2-r,d/2-r),v=new T.Vector3(),c=new T.Vector3(),k=new T.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);c.copy(v).clamp(k.copy(a).negate(),a);k.copy(v).sub(c).normalize();n.setXYZ(i,k.x,k.y,k.z);v.copy(c).addScaledVector(k,r);p.setXYZ(i,v.x,v.y,v.z)}return g}
/* 顔：大きな目（ハイライト付き）＋太い眉＋口 */
function hface(b,y,z,o){o=o||{};const w=o.w||1,k=o.s||1;[-1,1].forEach(s=>{const x=s*.15*w;
 Q(b,gS(.1*k,.125*k,.06,14),0xffffff,x,y,z,{ol:.012,gl:.9,rim:.05});
 Q(b,gS(.064*k,.092*k,.04,12),o.pc||0x1b1022,x*.93,y-.012,z+.036,{ol:0,gl:.8,rim:0});
 Q(b,gS(.026,.032,.02,8),0xffffff,x*.93-s*.012,y+.04,z+.068,{ol:0,e:1,gl:0,rim:0});
 Q(b,gB(.19,.05,.06,.022),o.br||0x2a1608,x,y+.18*k,z-.02,{r:[0,0,s*(o.bt==null?.15:o.bt)],ol:.012,gl:.2,rim:0})});
 if(o.m)Q(b,gT(.075,.018,Math.PI),0x2a0f18,0,y-.17,z+(o.mz==null?.03:o.mz),{r:[0,0,Math.PI],ol:0,gl:0,rim:0})}
const HK={2:.84},HQ={
/* エルゼ：魔女ガンナー */
0:(q,b)=>{
 [-1,1].forEach(s=>{q(gS(.13,.1,.17,14),0x3b1f6e,s*.14,.1,.04);q(gD(.115,.06,.02,16),0xff6bd6,s*.14,.21,0);q(gS(.14,.15,.14,14),0x7a3cff,s*.33,.76,0);q(gS(.12,.2,.12,12),0x7a3cff,s*.35,.64,.05,{r:[0,0,s*.2]});q(gS(.11,.3,.12,12),0xff6bd6,s*.44,.8,-.08,{r:[0,0,-s*.2]})});
 q(gS(.09,.09,.09,12),0xffd9c0,-.31,.5,.16,{gl:.3});q(gS(.09,.09,.09,12),0xffd9c0,.33,.6,.3,{gl:.3});
 q(gL([[0,.2],[.3,.22],[.4,.3],[.34,.5],[.25,.72],[.17,.84],[0,.86]]),0x7a3cff,0,0,0);q(gD(.3,.07,.03),0xff6bd6,0,.74,0,{e:.35});q(gS(.09,.09,.04,12),0xffd23f,0,.74,.28,{e:.5,gl:1});
 q(gS(.4,.37,.37),0xffd9c0,0,1.1,0,{gl:.35});q(gS(.44,.4,.4),0xff6bd6,0,1.16,-.1);q(gS(.42,.18,.32,16),0xff6bd6,0,1.29,.07,{r:[.3,0,0]});
 [-1,1].forEach(s=>q(gS(.1,.28,.13,12),0xff6bd6,s*.38,.98,0));
 q(gD(.62,.06,.03,32),0x4a2a9a,0,1.36,0,{r:[-.08,0,0]});q(bnd(gL([[0,1.34],[.36,1.36],[.33,1.5],[.25,1.66],[.16,1.8],[.07,1.9],[0,1.94]]),1.5,.9),0x5b2fc0,0,0,0);
 q(gD(.35,.08,.03),0xff6bd6,0,1.45,0,{e:.3});q(gS(.09,.09,.04,12),0xffd23f,0,1.45,.35,{e:.6,gl:1});
 hface(b,1.12,.31,{pc:0x4a2090,bt:-.12,m:1});
 q(gB(.13,.14,.5,.05),0x3a2d4a,.34,.6,.46,{gl:.7});q(gD(.05,.55,.02,14),0xffc83a,.34,.62,.78,{r:[Math.PI/2,0,0],gl:1});q(gS(.07,.07,.07,10),0x66e8ff,.34,.62,1.07,{e:1.3,ol:0})},
/* スーリシャム：ガンスリンガー */
1:(q,b)=>{
 [-1,1].forEach(s=>{q(gS(.11,.15,.12,14),0x22304a,s*.13,.22,0);q(gS(.125,.1,.18,14),0x6b3b1a,s*.13,.08,.05);q(gS(.12,.2,.13,14),0x2a5cff,s*.34,.66,.04,{r:[0,0,s*.25]});
  q(gS(.09,.09,.09,12),0xe8b48a,s*.4,.52,.2,{gl:.3});q(gB(.08,.13,.38,.03),0x70778a,s*.4,.55,.38,{gl:1});q(gB(.07,.2,.09,.03),0x6b3b1a,s*.4,.44,.22,{r:[.3,0,0]});
  q(gS(.08,.17,.11,12),0x6b3b1a,s*.35,1.0,.03)});
 q(gL([[0,.3],[.27,.32],[.31,.48],[.29,.7],[.2,.82],[0,.84]]),0x2a5cff,0,0,0);q(gS(.19,.27,.1,14),0xf4f4f4,0,.6,.22);
 q(gD(.3,.07,.03),0x6b3b1a,0,.38,0);q(gB(.1,.08,.04,.02),0xffd23f,0,.38,.3,{gl:1,e:.3});
 q(gT(.2,.06),0xe23b3b,0,.84,0,{r:[Math.PI/2,0,0]});q(gS(.11,.13,.05,12),0xe23b3b,0,.76,.2);q(gS(.07,.07,.02,10),0xffd23f,.14,.68,.29,{e:.5,gl:1});
 q(gS(.38,.36,.36),0xe8b48a,0,1.08,0,{gl:.35});q(gS(.05,.05,.06,10),0xd9986c,0,1.03,.35,{gl:.3,ol:.012});q(gS(.4,.3,.34),0x6b3b1a,0,1.2,-.1);
 q(gD(.66,.06,.03,32),0x7a3f18,0,1.3,0,{r:[.06,0,0]});q(gL([[0,1.28],[.36,1.3],[.36,1.5],[.31,1.62],[.15,1.6],[0,1.56]]),0x9a5224,0,0,0);
 q(gD(.37,.08,.03),0xd62828,0,1.38,0);q(gB(.1,.09,.04,.02),0xffd23f,0,1.38,.37,{e:.5,gl:1});
 hface(b,1.07,.31,{bt:.25,m:1})},
/* ゴウエモン：パワーファイター（ルチャ風マスク） */
2:(q,b)=>{const SK=0xf2993f,RD=0xd62828,GD=0xffd23f;
 [-1,1].forEach(s=>{q(gS(.17,.22,.17,14),0x2a4fd0,s*.2,.22,0);q(gS(.2,.11,.26,14),RD,s*.2,.09,.05);q(gD(.17,.07,.02,16),GD,s*.2,.2,0,{e:.3,gl:1});
  q(gS(.2,.22,.2,14),SK,s*.56,.9,0,{gl:.3});q(gS(.16,.28,.16,14),SK,s*.6,.68,.06,{r:[.15,0,s*.12],gl:.3});q(gD(.18,.13,.03,16),GD,s*.62,.5,.12,{r:[.35,0,0],e:.3,gl:1});
  q(gS(.22,.21,.22,16),SK,s*.64,.34,.22,{gl:.3});q(gS(.17,.14,.1,12),0xffad5a,s*.17,.86,.36,{gl:.3});
  q(gL([[0,0],[.1,.01],[.07,.26],[0,.4]],14),0xffffff,s*.2,1.48,-.02,{r:[0,0,-s*.5]})});
 q(gL([[0,.34],[.3,.36],[.4,.5],[.45,.76],[.37,1.0],[0,1.04]]),SK,0,0,0,{gl:.3});q(gL([[0,.3],[.34,.3],[.42,.38],[.41,.56],[0,.58]]),0x2a4fd0,0,0,0);
 q(gD(.44,.1,.04),GD,0,.52,0,{e:.3,gl:1});q(gS(.1,.09,.04,12),RD,0,.52,.42,{e:.4,gl:1});
 q(gS(.37,.33,.34),RD,0,1.22,0);q(gS(.27,.16,.14,14),SK,0,1.1,.26,{gl:.3});q(gS(.06,.12,.28,10),GD,0,1.5,-.02,{e:.4});
 hface(b,1.25,.29,{br:GD,bt:.5,s:1.1,m:1,mz:.1})},
/* グレナーデ：爆弾ゴブリン */
5:(q,b)=>{const G=0x7fbf4a,OR=0xff8a1a,Y=0xffd23f;
 [-1,1].forEach(s=>{q(gS(.1,.14,.1,12),0x4a3020,s*.16,.15,0);q(gS(.12,.09,.17,12),0x2a1a10,s*.16,.07,.06);q(gS(.09,.17,.09,12),G,s*.37,.66,.04,{r:[0,0,s*.4],gl:.3});q(gS(.1,.1,.1,12),G,s*.42,.52,.12,{gl:.3});
  q(gL([[0,0],[.1,.01],[.075,.2],[0,.46]],14).scale(1,1,.45),G,s*.36,1.12,0,{r:[0,0,-s*1.25],gl:.3});q(gS(.03,.055,.03,8),0xfff6dd,s*.11,.9,.33,{ol:.01,gl:.8})});
 q(gS(.36,.33,.33),OR,0,.58,0,{e:.12});q(gS(.2,.22,.1,12),G,0,.54,.27,{gl:.3});q(gD(.34,.07,.03),0x2a2a2a,0,.4,0);
 [-1,0,1].forEach(s=>q(gS(.08,.08,.08,10),0x222230,s*.2,.4,.3-Math.abs(s)*.1,{gl:.8}));
 q(gS(.4,.34,.36),G,0,1.05,0,{gl:.3});q(gS(.07,.08,.08,10),0x5fa030,0,1.0,.37,{gl:.3,ol:.015});
 q(gS(.4,.23,.38),Y,0,1.37,-.02,{e:.1,gl:1});q(gD(.45,.05,.02,28),0xe0a818,0,1.3,.04,{r:[.15,0,0],gl:.8});q(gS(.1,.1,.06,12),0xffffff,0,1.42,.36,{e:1.4,ol:.015});
 hface(b,1.07,.31,{w:1.1,s:1.15,pc:0x111111,br:0x2a5a1a,bt:.35,m:1});
 q(gS(.17,.17,.17,14),0x2a2a36,.4,.72,.34,{gl:.9});q(gD(.02,.12,.008,8),0x886644,.4,.9,.34,{ol:.01});q(gS(.07,.07,.07,8),0xff9a2b,.4,.99,.34,{e:1.8,ol:0})}
};
Object.assign(HK,{9:.95,10:.9});Object.assign(HQ,{
/* アカリリュウ：ファントムスナイパー */
3:(q,b)=>{
 q(gL([[0,.05],[.2,.08],[.42,.18],[.38,.45],[.28,.75],[.22,.9],[0,.95]]),0x14b8a6,0,0,0,{e:.1});q(gS(.12,.2,.12,12),0x14b8a6,0,.14,-.3,{r:[.7,0,0]});q(gT(.31,.03),0x66fff0,0,.55,0,{r:[Math.PI/2,0,0],e:1,ol:0});q(gS(.34,.12,.3,14),0x0e4f5c,0,.92,0);
 [-1,1].forEach(s=>q(gS(.1,.17,.1,12),0x14b8a6,s*.31,.72,.05,{r:[0,0,s*.3]}));q(gS(.09,.09,.09,12),0x9ff2e8,-.3,.55,.15,{gl:.3});q(gS(.09,.09,.09,12),0x9ff2e8,.46,.78,.24,{gl:.3});
 q(gS(.4,.37,.37),0x0e4f5c,0,1.1,0);q(bnd(gL([[0,1.3],[.2,1.34],[.12,1.55],[0,1.68]],16),1.35,1.2),0x0e4f5c,0,0,0);q(gS(.27,.24,.12,14),0x07121a,0,1.08,.28,{ol:0,rim:0});
 [-1,1].forEach(s=>q(gS(.085,.06,.03,10),0x66fff0,s*.11,1.1,.385,{e:1.5,ol:0,r:[0,0,s*.3]}));
 q(gD(.025,1.5,.01,10),0x3b2a5a,.5,.8,.25);q(gS(.14,.14,.14,14),0x66fff0,.5,1.65,.25,{e:1.3,ol:.02});q(gT(.19,.016),0x66fff0,.5,1.65,.25,{e:1,ol:0,r:[Math.PI/3,0,0]})},
/* ユニバード：ファイアブランド */
4:(q,b)=>{
 [-1,1].forEach(s=>{q(gS(.1,.15,.11,14),0xd9381e,s*.14,.2,0);q(gS(.125,.09,.17,14),0xff8a1a,s*.14,.07,.05);q(gS(.1,.18,.11,12),0x2a2a33,s*.34,.64,.05,{r:[0,0,s*.25]})});
 q(gS(.095,.095,.095,12),0xffc83a,-.39,.5,.15,{e:.2});q(gS(.095,.095,.095,12),0xffc83a,.34,.58,.3,{e:.2});
 q(gL([[0,.3],[.26,.32],[.3,.48],[.27,.7],[.2,.8],[0,.82]]),0x2a2a33,0,0,0);q(gD(.305,.06),0xffc83a,0,.55,0,{e:.4});
 q(gS(.37,.35,.35),0xf2c09a,0,1.08,0,{gl:.35});hface(b,1.08,.31,{pc:0xff6a2b,bt:.3,m:1});
 q(gT(.265,.035),0x222222,0,1.33,0,{r:[Math.PI/2,0,0]});[-1,1].forEach(s=>{q(gT(.1,.03),0x222222,s*.13,1.35,.26,{r:[-.35,0,0]});q(gS(.1,.09,.04,12),0x66f0ff,s*.13,1.35,.26,{e:1.2,ol:0,gl:1,r:[-.35,0,0]})});
 q(gS(.36,.18,.32),0xff6a2b,0,1.38,-.06,{e:.4});
 for(let i=0;i<6;i++){const a=(i-2.5)*.42,h=.36+(i%3)*.08;q(gL([[0,0],[.1,.01],[.07,h*.55],[0,h]],12),i%2?0xffd23f:0xff6a2b,Math.sin(a)*.22,1.46+Math.cos(a)*.03,-.08,{e:1,ol:.02,r:[-.15,0,-a*.8]})}
 q(gD(.14,.4,.05,16),0xd9381e,0,.7,-.34);q(gB(.1,.1,.5,.04),0x333344,.34,.58,.42,{gl:.7});q(gS(.09,.09,.12,10),0xff9a2b,.34,.58,.74,{e:1.5,ol:0});q(gS(.05,.05,.07,8),0xffe070,.34,.58,.79,{e:1.8,ol:0})},
/* エマ：疾風の忍者 */
6:(q,b)=>{const NV=0x26264a,RD=0xe02a3a,SV=0xc0c8d8;
 [-1,1].forEach(s=>{q(gS(.09,.14,.1,14),0x1c1c3a,s*.12,.2,0);q(gS(.11,.08,.16,12),0x111122,s*.12,.07,.05);q(gS(.09,.17,.1,12),NV,s*.32,.62,.05,{r:[0,0,s*.3]})});
 q(gS(.085,.085,.085,12),0xf2c09a,-.37,.5,.15,{gl:.3});q(gS(.085,.085,.085,12),0xf2c09a,.38,.6,.28,{gl:.3});
 q(gL([[0,.28],[.24,.3],[.27,.46],[.24,.7],[.17,.8],[0,.82]]),NV,0,0,0);q(gD(.265,.08),RD,0,.46,0,{e:.3});q(gT(.2,.06),RD,0,.82,0,{r:[Math.PI/2,0,0],e:.2});q(gB(.1,.45,.04,.02),RD,-.1,.62,-.28,{r:[.4,0,0],e:.2});
 q(gS(.37,.35,.35),NV,0,1.1,0);q(gS(.3,.12,.12,14),0xf2c09a,0,1.1,.25,{gl:.3});hface(b,1.11,.3,{pc:RD,br:0x0e0e22,bt:.4});
 q(gT(.335,.045),RD,0,1.27,0,{r:[Math.PI/2,0,0],e:.3});q(gB(.14,.08,.03,.02),SV,0,1.27,.34,{gl:1});
 q(gB(.07,.3,.03,.012),RD,-.08,1.18,-.4,{r:[.5,0,.2],e:.3});q(gB(.07,.3,.03,.012),RD,.08,1.1,-.42,{r:[.6,0,-.2],e:.3});
 q(gB(.05,.8,.03,.012),SV,0,.78,-.3,{r:[0,0,.7],gl:1});q(gB(.07,.2,.05,.02),0x3a1a1a,-.28,1.14,-.3,{r:[0,0,.7]});
 q(gB(.34,.07,.03,.012),SV,.42,.62,.34,{r:[0,0,Math.PI/4],gl:1});q(gB(.34,.07,.03,.012),SV,.42,.62,.34,{r:[0,0,-Math.PI/4],gl:1});q(gD(.04,.05,.015,10),0x333344,.42,.62,.34,{r:[Math.PI/2,0,0]})},
/* アルタオーロ：氷の女王 */
7:(q,b)=>{const IC=0x7ad8ff,WH=0xeaf7ff,SK=0xfde8ee;
 [-1,1].forEach(s=>{q(gS(.12,.09,.16,12),WH,s*.14,.07,.06);q(gS(.1,.18,.1,12),IC,s*.32,.68,.05,{r:[0,0,s*.3],e:.15});q(gS(.1,.28,.13,12),WH,s*.38,.95,0)});
 q(gS(.09,.085,.09,12),SK,-.34,.52,.14,{gl:.3});q(gS(.09,.085,.09,12),SK,.39,.62,.28,{gl:.3});
 q(gL([[0,.1],[.34,.12],[.46,.22],[.36,.5],[.26,.74],[.17,.86],[0,.88]]),IC,0,0,0,{e:.2});q(gT(.44,.06),0xdff6ff,0,.2,0,{r:[Math.PI/2,0,0]});q(gD(.27,.06,.02),0xffffff,0,.74,0);
 q(gS(.37,.35,.35),SK,0,1.08,0,{gl:.35});q(gS(.42,.4,.4),WH,0,1.06,-.12);q(gS(.36,.5,.2),WH,0,.85,-.3);q(gS(.4,.17,.3,16),WH,0,1.27,.07,{r:[.3,0,0]});
 hface(b,1.1,.31,{pc:0x3aa0ff,bt:.05,m:1});q(gT(.24,.035),0x9be8ff,0,1.4,0,{r:[Math.PI/2,0,0],e:.8,ol:.015});
 for(let i=0;i<5;i++){const a=(i-2)*.45;q(gL([[0,0],[.06,0],[.04,.12],[0,.26+(i==2?.12:0)]],10),0x9be8ff,Math.sin(a)*.24,1.4,Math.cos(a)*.17,{e:1,ol:.015,r:[0,0,-a*.7]})}
 q(gD(.03,1.5,.012,10),0xcfefff,.46,.8,.28,{e:.3});q(gS(.1,.22,.1,8),0x66e8ff,.46,1.7,.28,{e:1.3,ol:.02});
 [[-.5,.5,.3],[.55,1.3,-.2],[-.4,1.5,.2]].forEach(([x,y,z])=>q(gL([[0,0],[.06,0],[0,.2]],8),0xbff3ff,x,y,z,{e:.9,ol:0,r:[0,0,x]}))},
/* アルトマーレ：メディックナース */
8:(q,b)=>{const PK=0xff7ab8,SK=0xffe0cc,HR=0xff9ad0;
 [-1,1].forEach(s=>{q(gS(.09,.14,.1,14),0xf5f5ff,s*.13,.2,0);q(gS(.12,.08,.17,12),PK,s*.13,.07,.05);q(gS(.13,.14,.13,14),0xffffff,s*.32,.76,0);q(gS(.1,.18,.1,12),0xffffff,s*.34,.62,.05,{r:[0,0,s*.25]});q(gS(.12,.28,.12,12),HR,s*.45,.9,-.05,{r:[0,0,s*.25]})});
 q(gS(.09,.09,.09,12),SK,-.36,.5,.14,{gl:.3});q(gS(.09,.09,.09,12),SK,.34,.58,.28,{gl:.3});
 q(gL([[0,.28],[.32,.3],[.38,.4],[.3,.6],[.22,.78],[.16,.84],[0,.86]]),0xffffff,0,0,0);q(gD(.24,.06),PK,0,.74,0,{e:.3});q(gB(.1,.03,.02,.01),0xff4f6a,0,.6,.315,{ol:0,e:.5});q(gB(.03,.1,.02,.01),0xff4f6a,0,.6,.315,{ol:0,e:.5});
 q(gS(.38,.36,.36),SK,0,1.1,0,{gl:.35});q(gS(.42,.38,.38),HR,0,1.15,-.1);q(gS(.4,.17,.3,16),HR,0,1.28,.08,{r:[.3,0,0]});
 q(gD(.26,.1,.03),0xffffff,0,1.47,.03);q(gB(.1,.03,.02,.01),0xff4f6a,0,1.47,.27,{ol:0,e:.5});q(gB(.03,.1,.02,.01),0xff4f6a,0,1.47,.27,{ol:0,e:.5});
 hface(b,1.11,.31,{pc:0xff4f9a,bt:-.1,m:1});
 q(gD(.065,.2,.02,12),0xe8f6ff,.34,.6,.27,{r:[Math.PI/2,0,0],gl:1});q(gD(.065,.3,.02,12),PK,.34,.6,.52,{r:[Math.PI/2,0,0],e:1,gl:1});q(gL([[0,0],[.03,0],[.015,.2],[0,.3]],8),0xcccccc,.34,.6,.67,{r:[Math.PI/2,0,0],gl:1,ol:.01});q(gD(.075,.03,.01,12),0xe8f6ff,.34,.6,.15,{r:[Math.PI/2,0,0]})},
/* ヴァルアフィ：鉄壁の騎士 */
9:(q,b)=>{const ST=0xaab4d0,GD=0xffd23f;
 [-1,1].forEach(s=>{q(gS(.11,.15,.12,14),0x8a93b0,s*.15,.2,0,{gl:.9});q(gS(.13,.09,.19,12),0x4a5270,s*.15,.07,.06,{gl:.8});q(gS(.07,.07,.07,10),GD,s*.15,.32,.1,{e:.3,gl:1});
  q(gS(.2,.16,.2,14),ST,s*.44,.92,0,{gl:.9});q(gT(.17,.03),GD,s*.44,.95,0,{r:[Math.PI/2,0,0],e:.3,ol:.015});q(gS(.1,.17,.1,12),ST,s*.43,.68,.06,{r:[0,0,s*.2],gl:.9})});
 q(gS(.1,.1,.1,12),0x8a93b0,-.47,.52,.14,{gl:.9});q(gS(.1,.1,.1,12),0x8a93b0,.5,.52,.22,{gl:.9});
 q(gL([[0,.3],[.3,.32],[.4,.45],[.4,.68],[.3,.85],[0,.88]]),ST,0,0,0,{gl:.9});q(gD(.34,.07),GD,0,.42,0,{e:.3,gl:1});q(gS(.08,.08,.03,10),0x4ab0ff,0,.7,.4,{e:1.3,ol:0});
 q(gS(.37,.35,.34),ST,0,1.1,0,{gl:.9});q(gB(.3,.08,.04,.02),0x1a2038,0,1.1,.34,{ol:0,rim:0});[-1,1].forEach(s=>q(gS(.05,.027,.02,8),0x66f0ff,s*.1,1.1,.365,{e:1.6,ol:0}));
 q(gS(.05,.1,.3,10),GD,0,1.45,0,{e:.3,gl:1});q(gS(.1,.16,.32,12),0xe03a3a,0,1.52,-.12,{e:.3,r:[.4,0,0]});
 q(gB(.08,.95,.03,.012),0xe8eeff,.52,1.0,.3,{r:[.35,0,0],gl:1,e:.3});q(gB(.26,.06,.06,.02),GD,.52,.55,.22,{r:[.35,0,0],e:.3,gl:1});
 q(gD(.3,.06,.02,24),0x3a5bd0,-.58,.72,.16,{r:[0,0,Math.PI/2],gl:.8});q(gT(.3,.03),GD,-.58,.72,.16,{r:[0,Math.PI/2,0],e:.3,ol:.015});q(gS(.08,.08,.08,10),GD,-.63,.72,.16,{e:.5,gl:1})},
/* イヴクロース：ガトリング鬼軍曹 */
10:(q,b)=>{const GD=0xd0a020,SK=0xd9a066;
 [-1,1].forEach(s=>{q(gS(.12,.15,.13,14),0x4a5a3a,s*.16,.2,0);q(gS(.14,.1,.19,12),0x2a2a2a,s*.16,.07,.06);q(gS(.13,.2,.13,12),0x56673f,s*.45,.68,.04,{r:[0,0,s*.3]})});
 q(gS(.1,.1,.1,12),SK,-.5,.5,.14,{gl:.3});q(gS(.1,.1,.1,12),SK,.4,.6,.3,{gl:.3});
 q(gL([[0,.3],[.32,.32],[.42,.48],[.4,.7],[.3,.84],[0,.86]]),0x56673f,0,0,0);q(gD(.36,.07),0x333333,0,.4,0);q(gS(.07,.07,.03,10),GD,0,.4,.38,{e:.3,gl:1});
 [-1,1].forEach(s=>q(gB(.06,.8,.04,.02),GD,0,.65,.38,{r:[0,0,s*.75],e:.3,gl:.8}));
 q(gS(.37,.33,.34),SK,0,1.1,0,{gl:.35});q(gS(.3,.2,.2,14),0x4a2a12,0,.93,.14);q(gS(.18,.05,.06,10),0x4a2a12,0,1.0,.33);hface(b,1.15,.3,{pc:0x331100,br:0x2a1a0a,bt:.45});
 q(gS(.38,.18,.36),0x5a6a4a,0,1.44,0,{gl:.7});q(gD(.4,.05,.02,24),0x3a4a2a,0,1.3,.02);q(gS(.07,.07,.02,10),GD,0,1.45,.36,{e:.5,gl:1});
 q(gB(.22,.22,.5,.06),0x333344,.36,.62,.34,{gl:.7});[[0,.06],[.06,-.04],[-.06,-.04]].forEach(([dx,dy])=>q(gD(.035,.5,.012,8),0x8a8a9a,.36+dx,.62+dy,.74,{r:[Math.PI/2,0,0],gl:1,ol:.015}));
 q(gD(.09,.06,.02,12),GD,.36,.62,.82,{r:[Math.PI/2,0,0],e:.3,gl:1});q(gD(.16,.1,.03,16),GD,.56,.62,.26,{r:[0,0,Math.PI/2],e:.3,gl:.8})},
/* ディザレッジ：電撃ロボ */
11:(q,b)=>{const WH=0xe8f2ff,CY=0x66f0ff;
 [-1,1].forEach(s=>{q(gS(.1,.14,.11,14),0x2a3a5a,s*.13,.2,0);q(gB(.18,.08,.24,.03),WH,s*.13,.07,.04);q(gS(.07,.17,.07,12),WH,s*.36,.68,.1,{r:[.4,0,s*.2]});q(gS(.12,.12,.12,12),0x8ae6ff,s*.4,.58,.26,{e:1.7,ol:0});
  q(gS(.07,.09,.03,10),CY,s*.12,1.13,.35,{e:1.8,ol:0});q(gD(.1,.08,.03,14),0x9aa8c0,s*.36,1.1,0,{r:[0,0,Math.PI/2]})});
 q(gB(.5,.42,.4,.12),WH,0,.62,0);q(gB(.46,.07,.36,.03),0x2a3a5a,0,.4,0);q(gS(.12,.12,.05,12),CY,0,.65,.2,{e:1.6,ol:0});q(gT(.17,.02),CY,0,.65,.2,{e:1,ol:0});
 q(gB(.7,.55,.6,.18),WH,0,1.1,0);q(gB(.54,.36,.1,.1),0x0a1530,0,1.1,.29,{ol:0,gl:.9});q(gT(.08,.014,Math.PI),CY,0,1.05,.35,{r:[0,0,Math.PI],e:1.5,ol:0});
 q(gD(.02,.18,.008,8),0x9aa8c0,0,1.46,0);q(gS(.08,.08,.08,12),0xffe14a,0,1.6,0,{e:1.6,ol:.015});q(gT(.13,.015),0xffe14a,0,1.6,0,{r:[Math.PI/2,0,0],e:1,ol:0});
 q(gB(.06,.3,.03,.012),0xffe14a,-.05,.72,-.22,{r:[0,0,.5],e:1.3,ol:0});q(gB(.06,.26,.03,.012),0xffe14a,.03,.6,-.22,{r:[0,0,-.5],e:1.3,ol:0})}
});
/* ---------- ゴウエモン：Bedrock geo.json / animation.json ローダー ---------- */
const GO=(function makeGO(T,GOD,tmat,OL){
 const D=Math.PI/180,V=a=>[a[0],a[1],-a[2]],setR=(o,r)=>o.rotation.set(r[0]*D,-r[1]*D,-r[2]*D);
 const Q={anim_time:0,life_time:0},M={sin:x=>Math.sin(x*D),cos:x=>Math.cos(x*D),abs:Math.abs,min:Math.min,max:Math.max,sqrt:Math.sqrt,pow:Math.pow,floor:Math.floor,ceil:Math.ceil,round:Math.round,pi:Math.PI,clamp:(x,a,b)=>Math.min(b,Math.max(a,x)),lerp:(a,b,t)=>a+(b-a)*t,mod:(a,b)=>a%b};
 const mol=s=>{if(typeof s=='number')return()=>s;const j=String(s).toLowerCase().replace(/\bquery\./g,'Q.').replace(/\bq\./g,'Q.').replace(/\bmath\./g,'M.');
  if(!/^[\w\s.+\-*\/()%,]*$/.test(j))return()=>0;try{const f=new Function('Q','M','return ('+j+')');f(Q,M);return()=>f(Q,M)}catch(e){return()=>0}};
 function cubeGeo(c,TW,TH){
  const[w,h,d]=c.size,inf=c.inflate||0,o=c.origin,mir=!!c.mirror;
  const x0=o[0]-inf,x1=o[0]+w+inf,y0=o[1]-inf,y1=o[1]+h+inf,z0=-(o[2]+d)-inf,z1=-o[2]+inf,W=x1-x0,H=y1-y0,Dp=z1-z0;
  const cx=(x0+x1)/2,cy=(y0+y1)/2,cz=(z0+z1)/2,uv=c.uv||[0,0],pf=!Array.isArray(uv);let u=0,v=0;if(!pf)[u,v]=uv;
  const tl={north:[u+d,v+d,w,h],south:[u+2*d+w,v+d,w,h],east:[u,v+d,d,h],west:[u+d+w,v+d,d,h],up:[u+d,v,w,d],down:[u+d+w,v,w,d]};
  const F=[['north',[x0,y1,z1],[1,0,0],[0,-1,0],W,H],['south',[x1,y1,z0],[-1,0,0],[0,-1,0],W,H],['east',[x0,y1,z0],[0,0,1],[0,-1,0],Dp,H],
   ['west',[x1,y1,z1],[0,0,-1],[0,-1,0],Dp,H],['up',[x0,y1,z0],[1,0,0],[0,0,1],W,Dp],['down',[x0,y0,z1],[1,0,0],[0,0,-1],W,Dp]];
  const P=[],UV=[],I=[],pfT=n=>{const q=uv[n];if(!q)return[0,0,0,0];const z=q.uv_size||(n=='east'||n=='west'?[d,h]:n=='up'||n=='down'?[w,d]:[w,h]);return[q.uv[0],q.uv[1],z[0],z[1]]};
  for(const[n,t,r,dn,rl,dl]of F){if(rl<=0||dl<=0)continue;
   let k=n;if(mir&&n=='east')k='west';else if(mir&&n=='west')k='east';
   const[tx,ty,tw,th]=pf?pfT(n):tl[k];
   let a=tx,b=tx+tw;if(mir&&!pf)[a,b]=[b,a];
   const TL=t,TR=t.map((e,i)=>e+r[i]*rl),BL=t.map((e,i)=>e+dn[i]*dl),BR=TR.map((e,i)=>e+dn[i]*dl),n0=P.length/3;
   [[TL,a,ty],[BL,a,ty+th],[BR,b,ty+th],[TR,b,ty]].forEach(([p,pu,pv])=>{P.push(p[0]-cx,p[1]-cy,p[2]-cz);UV.push(pu/TW,1-pv/TH)});
   I.push(n0,n0+1,n0+2,n0,n0+2,n0+3)}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(P,3));g.setAttribute('uv',new T.Float32BufferAttribute(UV,2));g.setIndex(I);g.computeVertexNormals();
  return{g,c:[cx,cy,cz],s:[W,H,Dp]}}
 const chan=v=>{if(typeof v=='number'||typeof v=='string')v=[v,v,v];return Array.isArray(v)?{f:v.map(mol)}:{ks:Object.entries(v).map(([t,a])=>({t:+t,f:(Array.isArray(a)?a:a.post||a.pre||[0,0,0]).map(mol)})).sort((a,b)=>a.t-b.t)}};
 const ev=(f,t)=>{Q.anim_time=Q.life_time=t;return f.map(g=>g())};
 function samp(ch,t){if(ch.f)return ev(ch.f,t);const k=ch.ks;if(t<=k[0].t)return ev(k[0].f,t);if(t>=k[k.length-1].t)return ev(k[k.length-1].f,t);
  for(let i=0;i<k.length-1;i++)if(t<=k[i+1].t){const q=(t-k[i].t)/(k[i+1].t-k[i].t),a=ev(k[i].f,t),b=ev(k[i+1].f,t);return a.map((x,j)=>x+(b[j]-x)*q)}}
 const LP=new WeakMap(),pose=(c,t)=>{const o={};if(!c)return o;const LL=LP.get(c);if(LL>0)t=t%LL;for(const b in c){o[b]={};for(const k in c[b])o[b][k]=samp(c[b][k],t)}return o};
 const ID={rotation:[0,0,0],position:[0,0,0],scale:[1,1,1]};
 function mix(A,B,w,skip){const o={...A};for(const b in B){if(b==skip)continue;const a=A[b]||{},r={};for(const k in ID){const x=a[k]||ID[k],y=B[b][k]||ID[k];r[k]=x.map((e,i)=>e+(y[i]-e)*w)}o[b]={...a,...r}}return o}
 const cache={};
 function prep(id){if(cache[id])return cache[id];const d=GOD[id],G=d.geo['minecraft:geometry'][0],TW=G.description.texture_width,TH=G.description.texture_height,tex=new T.Texture(),im=new Image();
  im.onload=()=>{tex.image=im;tex.needsUpdate=true};im.src=d.png;tex.magFilter=tex.minFilter=T.NearestFilter;tex.encoding=T.sRGBEncoding;
  const clips={};for(const[n,a]of Object.entries(d.anim.animations)){const c={};for(const[b,v]of Object.entries(a.bones||{})){c[b]={};for(const k in v)c[b][k]=chan(v[k])}let LL=+a.animation_length||0;if(!LL)for(const bv of Object.values(a.bones||{}))for(const vv of Object.values(bv))if(vv&&typeof vv=='object'&&!Array.isArray(vv))for(const kk in vv)LL=Math.max(LL,+kk||0);LP.set(c,a.loop===true?LL:0);clips[n]=c}
  return cache[id]={G,TW,TH,tex,clips,c:d.cfg}}
 /* ===== 自動フィット =====
    idleで浮遊したときの「一番低い位置」を地面のすぐ上(HOVER)に合わせ、浮きすぎ/めり込みを自動補正。
    大きすぎるモデルは MAXH(高さ) / MAXW(横幅・はみ出す武器や尻尾は除外)に収まるまで縮小(拡大はしない)。
    数値はワールド単位。好みに合わせてここだけ調整してください。 */
 const FIT={HOVER:.08,MAXH:1.75,MAXW:1.9};
 function fitModel(R,grp,m,SC){
  if(!m.fit){
   let k=1,y=4*SC;
   try{
    const I=m.clips[m.c.idle],tv=new T.Vector3(),inv=new T.Matrix4(),mm=new T.Matrix4(),xs=[],zs=[];let lo=1e9,hi=-1e9;
    const idleSpan=LP.get(I)||0,scanEnd=idleSpan===0?.01:Number.isInteger(idleSpan)?idleSpan:30;
    for(let t=0,n=0;t<scanEnd;t+=.25,n++){ /* 静止ポーズは1回、整数秒周期のidleは1周期だけ走査 */
     apply(R,pose(I,t));grp.updateMatrixWorld(true);inv.copy(grp.matrixWorld).invert();
     for(const me of R.meshes){mm.multiplyMatrices(inv,me.matrixWorld);if(Math.abs(mm.determinant())<1e-9)continue;
      const p=me.geometry.attributes.position;
      for(let i=0;i<p.count;i++){tv.fromBufferAttribute(p,i).applyMatrix4(mm);if(tv.y<lo)lo=tv.y;if(tv.y>hi)hi=tv.y;if(n%4==0){xs.push(tv.x);zs.push(tv.z)}}}}
    const q=(a,f)=>{a=Float32Array.from(a).sort();return a[Math.min(a.length-1,Math.floor(a.length*f))]};
    const h=(hi-lo)*SC,w=Math.max(q(xs,.97)-q(xs,.03),q(zs,.97)-q(zs,.03))*SC;
    const kk=Math.min(1,FIT.MAXH/h,FIT.MAXW/w),yy=FIT.HOVER-lo*SC*kk;
    if(isFinite(kk)&&isFinite(yy)&&kk>0){k=kk;y=yy}
    apply(R,pose(I,0));
   }catch(e){console.error(e)}
   m.fit={k,y}}
  grp.scale.setScalar(SC*m.fit.k);grp.position.set(0,m.fit.y,0)}
 function mergeBoneGeometries(parts){
  if(parts.length===1)return parts[0];
  let vertexCount=0,indexCount=0;
  for(const geo of parts){vertexCount+=geo.attributes.position.count;indexCount+=geo.index?geo.index.count:geo.attributes.position.count}
  const positions=new Float32Array(vertexCount*3),normals=new Float32Array(vertexCount*3),uvs=new Float32Array(vertexCount*2);
  const IndexArray=vertexCount>65535?Uint32Array:Uint16Array,indices=new IndexArray(indexCount);let vertexOffset=0,indexOffset=0;
  for(const geo of parts){const p=geo.attributes.position.array,n=geo.attributes.normal.array,uv=geo.attributes.uv.array,ix=geo.index?geo.index.array:null,count=geo.attributes.position.count;
   positions.set(p,vertexOffset*3);normals.set(n,vertexOffset*3);uvs.set(uv,vertexOffset*2);
   if(ix){for(let i=0;i<ix.length;i++)indices[indexOffset+i]=ix[i]+vertexOffset;indexOffset+=ix.length}else{for(let i=0;i<count;i++)indices[indexOffset+i]=vertexOffset+i;indexOffset+=count}
   vertexOffset+=count;geo.dispose()}
  const merged=new T.BufferGeometry();merged.setAttribute('position',new T.BufferAttribute(positions,3));merged.setAttribute('normal',new T.BufferAttribute(normals,3));merged.setAttribute('uv',new T.BufferAttribute(uvs,2));merged.setIndex(new T.BufferAttribute(indices,1));merged.computeBoundingBox();merged.computeBoundingSphere();return merged}
 function build(body,id){
  const m=prep(id),G=m.G,SC=m.c.sc,grp=new T.Group();grp.scale.setScalar(SC);grp.position.y=4*SC;body.add(grp);
  const mt=tmat(0xffffff,{gl:.3,rim:.3});mt.map=mt.emissiveMap=m.tex;mt.alphaTest=.5;
  const nodes={},R={nodes,m,grp,t:0,ww:0,a:null,pf:0,meshes:[]};
  for(const b of G.bones){const g=new T.Group();g.rotation.order='ZYX';g.userData.pv=V(b.pivot||[0,0,0]);g.userData.rest=b.rotation||[0,0,0];nodes[b.name]=g}
  for(const b of G.bones){const g=nodes[b.name],par=b.parent&&nodes[b.parent],pv=g.userData.pv,pp=par?par.userData.pv:[0,0,0];
   (par||grp).add(g);g.userData.base=[pv[0]-pp[0],pv[1]-pp[1],pv[2]-pp[2]];g.position.set(...g.userData.base);setR(g,g.userData.rest);
   const parts=[];
   for(const c of b.cubes||[]){const{g:geo,c:ce}=cubeGeo(c,m.TW,m.TH);
    if(c.rotation){const cp=V(c.pivot||b.pivot||[0,0,0]),cg=new T.Group();cg.rotation.order='ZYX';cg.position.set(cp[0]-pv[0],cp[1]-pv[1],cp[2]-pv[2]);setR(cg,c.rotation);cg.updateMatrix();geo.applyMatrix4(new T.Matrix4().multiplyMatrices(cg.matrix,new T.Matrix4().makeTranslation(ce[0]-cp[0],ce[1]-cp[1],ce[2]-cp[2])))}
    else geo.translate(ce[0]-pv[0],ce[1]-pv[1],ce[2]-pv[2]);
    parts.push(geo)}
   if(parts.length){const geo=mergeBoneGeometries(parts),me=new T.Mesh(geo,mt);me.castShadow=true;me.userData.e=.3;R.meshes.push(me);g.add(me)}}
  fitModel(R,grp,m,SC);
  return R}
 function tick(R,u,dt,renderPose){
  const m=R.m,c=m.c,I=m.clips[c.idle],Wk=m.clips[c.walk]||I,At=m.clips[c.atk],a0=c.a0,a1=c.a1,sk=c.skip||'';
  if(u&&(u.fz>0||!u.alive))dt=0;R.t+=dt;
  R.ww+=(((u&&u.mvg)?1:0)-R.ww)*Math.min(1,dt*9);
  let a=R.a;
  if(u){if(At&&u.lp){if(!a||a.k!='leap')a=R.a={k:'leap',w:0,ct:a0}}
   else if(a&&a.k=='leap'&&!a.e)a.e=1;
   else if(At&&!a&&u.fa>R.pf+.15)a=R.a={k:'punch',t:0,w:0,ct:a0};
   R.pf=u.fa}
  if(a){if(a.k=='leap'){if(u&&u.lp){a.ct=a0+(a1-a0)*Math.min(1,u.lp.t/u.lp.T);a.w=Math.min(1,a.w+dt*8)}else{a.ct=Math.min(a1,a.ct+dt*(a1-a0)*2);a.w-=dt*4;if(a.w<=0)R.a=a=null}}
   else{a.t+=dt;const p=a.t/.45;a.ct=a0+(a1-a0)*Math.min(1,p);a.w=a.t<.07?a.t/.07:p<.7?1:Math.max(0,(1-p)/.3);if(p>=1)R.a=a=null}}
  if(renderPose===false)return;
  let P=pose(I,R.t);if(R.ww>.01)P=mix(P,pose(Wk,R.t*1.7),R.ww);
  if(a)P=mix(P,pose(At,a.ct),a.w,sk);
  apply(R,P)}
 function apply(R,P){for(const b in P){const g=R.nodes[b];if(!g)continue;const p=P[b],r=p.rotation||ID.rotation,s=p.scale||ID.scale,o=p.position||ID.position,rs=g.userData.rest,bs=g.userData.base;
   setR(g,[rs[0]+r[0],rs[1]+r[1],rs[2]+r[2]]);g.scale.set(s[0],s[1],s[2]);g.position.set(bs[0]+o[0],bs[1]+o[1],bs[2]-o[2])}}
 return{build,tick}})(T,GOD,tmat,OL);/*GO-END*/

function mk(id,team){
 const root=new T.Group(),mdl=new T.Group(),body=new T.Group();mdl.add(body);root.add(mdl);root.mdl=mdl;root.body=body;
 const A=(gm,c,x,y,z,s,o)=>P(body,gm,c,x,y,z,s,o),L=(c,w)=>{A(CY,c,-.15*(w||1),.2,0,[.12*(w||1),.4,.12*(w||1)]);A(CY,c,.15*(w||1),.2,0,[.12*(w||1),.4,.12*(w||1)])};
 const old=!HQ[id];if(GOD[id]){try{root.rig=GO.build(body,id)}catch(e){console.error(e)}}if(!old&&!root.rig){const g=new T.Group();g.scale.setScalar(HK[id]||1);body.add(g);HQ[id]((...a)=>Q(g,...a),g)}
 if(old&&id==0){L(0x3a2466);A(CN,0x7a3cff,0,.6,0,[.42,.75,.38]);A(CY,0xff6bd6,0,.74,0,[.27,.07,.25],{e:.5});A(SP,0xffd9c0,0,1.12,0,[.32,.3,.3]);eyes(body,1.14,.25,1,0x7a3cff);
  A(SP,0xff6bd6,0,1.22,-.08,[.34,.22,.3]);[-1,1].forEach(s=>{A(SP,0xff6bd6,s*.36,1.02,-.05,[.15,.3,.15]);A(SP,0xffd9c0,s*.3,.62,.12,[.09,.09,.09])});
  A(CY,0x2a1a55,0,1.36,0,[.54,.04,.54]);A(CN,0x4a2a9a,0,1.72,0,[.3,.72,.3],{r2:[-.15,0,0]});A(CY,0xff6bd6,0,1.41,0,[.32,.07,.32],{e:.5});A(SP,0x66e8ff,0,1.43,.3,[.07,.07,.07],{e:1.2,no:1});
  A(BX,0x333344,.34,.62,.38,[.1,.11,.7]);A(CY,0xffc83a,.34,.62,.74,[.07,.5,.07],{r2:[Math.PI/2,0,0],e:.3});}
 if(old&&id==1){L(0x22304a);A(CY,0x2a5cff,0,.62,0,[.3,.55,.26]);A(CY,0xf2f2f2,0,.62,.02,[.31,.3,.26]);A(SP,0xffd23f,.12,.75,.27,[.07,.07,.02],{e:.6,no:1});
  A(CY,0xff3b3b,0,.92,0,[.23,.1,.21]);A(CN,0xff3b3b,0,.86,.2,[.08,.18,.05],{r2:[3.14,0,0]});A(SP,0xe8b48a,0,1.12,0,[.3,.29,.28]);eyes(body,1.13,.25,.95);
  A(SP,0xd2691e,0,1.25,-.05,[.31,.16,.3]);A(CY,0x6b3b1a,0,1.34,0,[.58,.04,.58]);A(CY,0x8b4a1f,0,1.47,0,[.3,.2,.3]);A(CY,0xffd23f,0,1.41,0,[.31,.05,.31],{e:.5});
  [-1,1].forEach(s=>{A(CY,0x2a5cff,s*.32,.62,.05,[.08,.3,.08],{r2:[0,0,s*.3]});A(BX,0x555566,s*.34,.5,.32,[.08,.13,.4]);A(BX,0xffd23f,s*.34,.4,.18,[.08,.2,.09],{e:.3})});}
 if(old&&id==2){L(0x1a3a8a,1.3);A(CY,0x2a4fd0,0,.42,0,[.4,.22,.36]);A(CY,0xffd23f,0,.54,0,[.4,.08,.37],{e:.4});A(SP,0xff8a2b,0,.82,0,[.52,.46,.4]);A(SP,0xff8a2b,0,1.12,.03,[.28,.26,.26]);
  A(BX,0xd62828,0,1.14,.22,[.48,.2,.1]);[-1,1].forEach(s=>{A(BX,0xffd23f,s*.12,1.16,.28,[.1,.04,.03],{e:1.2,no:1});A(CN,0xffffff,s*.25,1.42,0,[.07,.3,.07],{r2:[0,0,-s*.5]});A(SP,0xff8a2b,s*.5,.98,0,[.2,.2,.2]);A(SP,0xff8a2b,s*.6,.62,.18,[.27,.27,.27]);A(CY,0xffd23f,s*.6,.8,.14,[.2,.08,.2],{e:.4,r2:[.4,0,0]})});}
 if(old&&id==3){A(CN,0x14b8a6,0,.58,0,[.5,1.15,.44]);A(TR,0x66fff0,0,.55,0,[.5,.5,.5],{e:1,r2:[Math.PI/2,0,0],no:1});A(SP,0x0e4f5c,0,1.12,0,[.36,.35,.34]);A(CN,0x0e4f5c,0,1.5,-.1,[.2,.42,.2],{r2:[-.5,0,0]});
  A(SP,0x07121a,0,1.09,.17,[.26,.24,.2],{no:1});[-1,1].forEach(s=>{A(SP,0x66fff0,s*.1,1.11,.33,[.06,.04,.03],{e:1.5,no:1});A(SP,0x0f6a73,s*.34,.9,0,[.16,.14,.16])});
  A(CY,0x3b2a5a,.5,.8,.25,[.04,1.6,.04]);A(SP,0x66fff0,.5,1.65,.25,[.14,.14,.14],{e:1.3,no:1});}
 if(old&&id==4){L(0x3a1a1a);[-1,1].forEach(s=>A(BX,0xff8a1a,s*.15,.07,.06,[.15,.12,.2]));A(CY,0xd9381e,0,.45,0,[.28,.2,.25]);A(CY,0x2a2a33,0,.68,0,[.3,.4,.26]);A(CY,0xffc83a,0,.62,.02,[.31,.12,.26],{e:.5});
  A(SP,0xf2c09a,0,1.12,0,[.31,.3,.29]);eyes(body,1.11,.25,1,0xff6a2b);A(TR,0x222222,0,1.3,.1,[.3,.3,.3],{r2:[1.1,0,0],no:1});A(SP,0x66f0ff,0,1.31,.33,[.1,.06,.03],{e:1.2,no:1});
  for(let i=0;i<6;i++){const a=(i-2.5)*.42;A(CN,i%2?0xffd23f:0xff6a2b,Math.sin(a)*.22,1.5+Math.cos(a)*.05,-.06,[.1,.45+(i%3)*.1,.1],{e:1,r2:[0,0,-a*.8]})}A(SP,0xff6a2b,0,1.2,-.1,[.33,.24,.3],{e:.5});
  [-1,1].forEach(s=>{A(CY,0xd9381e,s*.12,.72,-.3,[.1,.34,.1]);A(SP,0xffc83a,s*.3,.62,.1,[.09,.09,.09])});A(BX,0x333344,.32,.6,.35,[.1,.12,.6]);A(CN,0xff9a2b,.32,.6,.75,[.1,.25,.1],{r2:[Math.PI/2,0,0],e:1.5,no:1})}
 if(old&&id==5){[-1,1].forEach(s=>{A(CY,0x4a3020,s*.17,.18,0,[.13,.36,.13]);A(SP,0x2a1a10,s*.17,.06,.06,[.15,.1,.2])});A(SP,0x7fbf4a,0,.62,0,[.42,.4,.38]);A(CY,0xff8a1a,0,.66,0,[.37,.34,.33],{e:.15});A(CY,0x222222,0,.5,0,[.38,.07,.34]);
  [-1,0,1].forEach(s=>A(SP,0x222222,s*.2,.44,.3-Math.abs(s)*.08,[.09,.09,.09]));
  A(SP,0x7fbf4a,0,1.12,0,[.35,.3,.31]);eyes(body,1.14,.27,1.4,0x222222);A(SP,0x5fa030,0,1.07,.31,[.07,.06,.06]);[-1,1].forEach(s=>{A(CN,0x7fbf4a,s*.38,1.15,0,[.07,.24,.12],{r2:[0,0,-s*1.4]});A(SP,0x7fbf4a,s*.4,.65,.1,[.1,.1,.1])});
  A(SP,0xffd23f,0,1.3,0,[.36,.2,.34]);A(CY,0xe8b020,0,1.25,0,[.4,.04,.4]);A(SP,0xffffff,0,1.33,.3,[.08,.08,.05],{e:1.6,no:1});
  A(SP,0x333333,0,.75,-.32,[.22,.22,.2]);A(SP,0x2a2a33,.4,.66,.3,[.2,.2,.2]);A(CY,0x886644,.4,.88,.3,[.025,.1,.025]);A(SP,0xff9a2b,.4,.98,.3,[.07,.07,.07],{e:1.8,no:1})}
 if(old&&id==6){L(0x1c1c3a,.9);A(CY,0x26264a,0,.62,0,[.27,.5,.23]);A(CY,0xe02a3a,0,.5,0,[.28,.08,.25],{e:.3});A(CY,0x26264a,0,.9,0,[.2,.1,.18]);
  A(SP,0x26264a,0,1.1,0,[.3,.29,.28]);A(BX,0xf2c09a,0,1.12,.28,[.22,.07,.03],{no:1});[-1,1].forEach(s=>{A(SP,0xffffff,s*.1,1.12,.295,[.06,.04,.03],{no:1,e:.6});A(SP,0xe02a3a,s*.1,1.12,.315,[.025,.03,.02],{no:1,e:1.2})});
  A(CY,0xe02a3a,0,1.25,0,[.31,.07,.29],{e:.3});A(BX,0xc0c8d8,0,1.25,.3,[.07,.04,.015],{e:.3});A(SP,0x111122,0,1.24,-.3,[.1,.1,.2]);A(BX,0xe02a3a,-.1,.95,-.4,[.09,.03,.5],{r2:[.5,0,0],e:.3});
  A(BX,0xc0c8d8,0,.78,-.28,[.04,.8,.05],{r2:[0,0,.7],e:.2});A(BX,0x333344,.26,.58,-.28,[.08,.16,.06],{r2:[0,0,.7]});
  [-1,1].forEach(s=>{A(SP,0x26264a,s*.3,.64,.12,[.09,.09,.09]);A(CY,0xd0d8e8,s*.4,.7,.28,[.17,.02,.17],{e:.4,r2:[Math.PI/2,0,s*.5]})})}
 if(old&&id==7){A(CN,0xdff6ff,0,.2,0,[.58,.3,.52]);A(CN,0x7ad8ff,0,.55,0,[.44,.95,.4],{e:.2});A(TR,0xffffff,0,.95,0,[.28,.28,.28],{r2:[Math.PI/2,0,0],e:.3});A(SP,0xfde8ee,0,1.13,0,[.31,.3,.29]);eyes(body,1.14,.26,1,0x3aa0ff);
  A(SP,0xeaf7ff,0,1.2,-.07,[.35,.32,.33]);A(SP,0xeaf7ff,0,.85,-.26,[.26,.5,.17]);[-1,1].forEach(s=>{A(SP,0xeaf7ff,s*.3,.98,.02,[.1,.34,.1]);A(SP,0xfde8ee,s*.3,.64,.12,[.09,.09,.09])});
  for(let i=0;i<5;i++){const a=(i-2)*.42;A(CN,0x9be8ff,Math.sin(a)*.24,1.45+(i==2?.12:0)-Math.abs(a)*.1,0,[.07,.28+(i==2?.14:0),.07],{e:1,r2:[0,0,-a*.7]})}
  A(CY,0xcfefff,.46,.8,.2,[.035,1.6,.035],{e:.3});A(CN,0x66e8ff,.46,1.74,.2,[.12,.3,.12],{e:1.3,no:1});A(CN,0x66e8ff,.46,1.5,.2,[.12,.26,.12],{e:1.3,r2:[Math.PI,0,0],no:1});
  [[-.5,.5,.3],[.55,1.3,-.2],[-.4,1.5,.2]].forEach(([x,y,z])=>A(CN,0xbff3ff,x,y,z,[.06,.2,.06],{e:.9,no:1,r2:[0,0,x]}))}
 if(old&&id==8){L(0xf5f5ff,.9);[-1,1].forEach(s=>A(SP,0xff7ab8,s*.15,.06,.06,[.14,.09,.19]));A(CN,0xffffff,0,.55,0,[.42,.8,.38]);A(CY,0xff7ab8,0,.74,0,[.28,.07,.26],{e:.3});A(SP,0xff4f9a,-.045,.69,.31,[.055,.055,.03],{e:.8,no:1});A(SP,0xff4f9a,.045,.69,.31,[.055,.055,.03],{e:.8,no:1});A(CN,0xff4f9a,0,.63,.31,[.075,.08,.03],{r2:[0,0,Math.PI],e:.8,no:1});
  A(SP,0xffe0cc,0,1.12,0,[.32,.3,.3]);eyes(body,1.13,.26,1.05,0xff4f9a);A(SP,0xff9ad0,0,1.2,-.06,[.35,.3,.34]);A(SP,0xff9ad0,0,1.28,.14,[.3,.12,.18]);[-1,1].forEach(s=>A(SP,0xff9ad0,s*.3,1.05,0,[.1,.2,.1]));
  A(CY,0xffffff,0,1.45,0,[.3,.1,.26]);A(BX,0xff4f6a,0,1.46,.26,[.12,.04,.02],{no:1,e:.4});A(BX,0xff4f6a,0,1.46,.26,[.04,.12,.02],{no:1,e:.4});
  A(BX,0xffffff,0,.72,-.3,[.34,.3,.14]);A(BX,0xff4f6a,0,.72,-.38,[.16,.05,.02],{no:1});A(BX,0xff4f6a,0,.72,-.38,[.05,.16,.02],{no:1});
  A(CY,0xe8f6ff,.34,.6,.4,[.07,.5,.07],{r2:[Math.PI/2,0,0]});A(CY,0xff7ab8,.34,.6,.4,[.05,.3,.05],{r2:[Math.PI/2,0,0],e:1,no:1});A(CN,0xcccccc,.34,.6,.82,[.03,.28,.03],{r2:[Math.PI/2,0,0]});A(SP,0xffe0cc,.3,.64,.1,[.09,.09,.09])}
 if(old&&id==9){L(0x8a93b0,1.2);[-1,1].forEach(s=>A(BX,0x4a5270,s*.17,.07,.06,[.17,.12,.24]));A(SP,0xaab4d0,0,.74,0,[.42,.42,.35]);A(CY,0xffd23f,0,.5,0,[.4,.07,.34],{e:.3});A(SP,0x4ab0ff,0,.76,.3,[.09,.09,.04],{e:1.3,no:1});[-1,1].forEach(s=>{A(SP,0xaab4d0,s*.44,.98,0,[.2,.17,.2]);A(TR,0xffd23f,s*.44,.98,0,[.17,.17,.17],{r2:[Math.PI/2,0,0],e:.3,no:1})});
  A(SP,0xaab4d0,0,1.14,0,[.3,.3,.28]);A(BX,0x1a2038,0,1.14,.26,[.3,.08,.04],{no:1});[-1,1].forEach(s=>A(SP,0x66f0ff,s*.1,1.14,.285,[.05,.025,.02],{e:1.6,no:1}));A(CY,0xffd23f,0,1.4,0,[.06,.1,.3],{e:.3});A(SP,0xe03a3a,0,1.5,-.05,[.1,.14,.3],{e:.3});
  A(BX,0xe8eeff,.5,.95,.32,[.07,.9,.03],{r2:[.35,0,0],e:.3});A(BX,0xffd23f,.5,.55,.2,[.22,.05,.05],{r2:[.35,0,0],e:.3});A(CY,0x3a5bd0,-.46,.72,.14,[.33,.05,.33],{r2:[0,0,Math.PI/2]});A(SP,0xffd23f,-.5,.72,.14,[.09,.09,.09],{e:.8,no:1})}
 if(old&&id==10){L(0x4a5a3a,1.3);A(SP,0x56673f,0,.7,0,[.44,.44,.37]);[-1,1].forEach(s=>A(BX,0xd0a020,0,.72,.3,[.05,.75,.04],{r2:[0,0,s*.75],e:.3}));A(CY,0x333333,0,.48,0,[.4,.07,.34]);
  A(SP,0xd9a066,0,1.12,0,[.3,.28,.27]);A(SP,0x4a2a12,0,.98,.08,[.28,.2,.24]);A(SP,0x4a2a12,0,1.04,.3,[.16,.04,.04]);eyes(body,1.17,.25,.95,0x331100);[-1,1].forEach(s=>A(BX,0x2a1a0a,s*.1,1.25,.27,[.11,.03,.02],{r2:[0,0,s*.35],no:1}));
  A(SP,0x5a6a4a,0,1.34,0,[.34,.2,.32]);A(CY,0x3a4a2a,0,1.27,0,[.35,.04,.33]);
  A(BX,0x333344,.3,.62,.3,[.22,.22,.5]);[[0,.06],[.06,-.04],[-.06,-.04]].forEach(([dx,dy])=>A(CY,0x8a8a9a,.3+dx,.62+dy,.72,[.035,.5,.035],{r2:[Math.PI/2,0,0]}));A(CY,0xd0a020,.5,.62,.2,[.16,.1,.16],{r2:[0,0,Math.PI/2],e:.3});A(SP,0xd9a066,.28,.7,.05,[.1,.1,.1])}
 if(old&&id==11){L(0x2a3a5a,.9);A(CY,0xe8f2ff,0,.62,0,[.3,.34,.27]);A(SP,0x66f0ff,0,.66,.27,[.12,.12,.05],{e:1.6,no:1});A(TR,0x66f0ff,0,.66,.26,[.17,.17,.17],{e:1,no:1});A(CY,0x2a3a5a,0,.42,0,[.28,.07,.25]);
  A(BX,0xe8f2ff,0,1.1,0,[.32,.27,.28]);A(BX,0x0a1530,0,1.1,.27,[.28,.13,.03],{no:1});[-1,1].forEach(s=>{A(SP,0x66f0ff,s*.07,1.1,.3,[.045,.045,.02],{e:1.8,no:1});A(TR,0x9aa8c0,s*.3,1.1,0,[.12,.12,.12],{r2:[0,Math.PI/2,0],no:1});A(CY,0xe8f2ff,s*.38,.7,.1,[.07,.28,.07],{r2:[.5,0,0]});A(SP,0x8ae6ff,s*.4,.62,.28,[.12,.12,.12],{e:1.7,no:1})});
  A(CY,0x9aa8c0,0,1.38,0,[.025,.18,.025]);A(SP,0xffe14a,0,1.52,0,[.07,.07,.07],{e:1.6,no:1});A(TR,0xffe14a,0,1.52,0,[.14,.14,.14],{e:1,r2:[Math.PI/2,0,0],no:1});
  A(BX,0xffe14a,-.05,.72,-.2,[.06,.3,.03],{r2:[0,0,.5],e:1.3,no:1});A(BX,0xffe14a,.03,.6,-.2,[.06,.26,.03],{r2:[0,0,-.5],e:1.3,no:1})}
 if(id==12&&!root.rig){const ph=new T.Mesh(new T.BoxGeometry(.5,1.6,.5),new T.MeshBasicMaterial({visible:false}));ph.position.y=.8;body.add(ph)}
 body.scale.setScalar(CH[id].sc||1);
 const rg=new T.Mesh(new T.RingGeometry(.5,.64,28),new T.MeshBasicMaterial({color:team==null?0xffd23f:team?0xff4a4a:0x37a3ff,side:2}));rg.rotation.x=-Math.PI/2;rg.position.y=.03;root.add(rg);const dk=new T.Mesh(new T.CircleGeometry(.62,28),rg.material.clone());dk.material.transparent=true;dk.material.opacity=.28;dk.rotation.x=-Math.PI/2;dk.position.y=.025;root.add(dk);root.rg=rg;root.dk=dk;
 return root}

/* ---------- 状態 ---------- */
let state='home',hT=0,sel=0,pv=null,U=[],B=[],G=[],FX=[],P0,tg=[0,0],cdv=[null,null],cdk=[12,12],tleft=180,gt=4,shake=0,tm=0,jv={x:0,z:0},aim={on:0};
const kb={};
const SPZ={b:SPW.b[0][1],t:SPW.t[0][1]};
const spawn=(t,i)=>{const p=(t?SPW.t:SPW.b)[i];return{x:p[0],z:p[1]}};
/* ノックアウト(本家ルール)：復活なし／相手を全滅させたらラウンド勝ち／最大3ラウンドで先に2勝／時間がたつと毒ガスが迫る
   RT=毒ガスが閉じきる秒数 GS=毒ガスが動き出す秒数 BRK=ラウンド終了後の余韻 PRE=次ラウンド開始前の「ラウンドN」表示 */
const KR={RT:90,GS:60,GX:8,GZ:15,BRK:2.8,PRE:1.8,res:[],ph:0,pt:0,t:0,seq:0,lock:false,done:false,gas:0,gw:false,te:0,fs:0};
const BB=new T.MeshBasicMaterial({color:0x7ad8ff}),BR=new T.MeshBasicMaterial({color:0xff8a6a}),GM=new T.MeshStandardMaterial({color:0xb25cff,emissive:0x8a2be2,emissiveIntensity:1.1,roughness:.15,metalness:.3,flatShading:true});
let pvId=-1,vw=0;
function setPv(i){pvId=i;if(pv){ps.remove(pv);disposeCharacterRoot(pv)}pv=mk(i,null);pv.scale.setScalar(state=='home'?1.8:2.1);pv.position.x=0;ps.add(pv)}
const setSel=i=>{sel=i;$('#hci').textContent=CH[i].ic};
pc.position.set(0,2.4,9.5);pc.lookAt(0,1.1,0);
const pf=new T.Mesh(new T.CylinderGeometry(2,2.2,.2,32),mat(0x5b2bb5,.4));pf.position.set(-3.2,-.1,0);ps.add(pf);setPv(0);setSel(0);
const psh=new T.Mesh(new T.CircleGeometry(1.5,32).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:0x04245a,transparent:true,opacity:.3,depthWrite:false}));psh.scale.set(1.25,1,.45);psh.position.y=.01;ps.add(psh);
const DBG=ps.background,HBG=(()=>{const c=document.createElement('canvas');c.width=1024;c.height=512;const x=c.getContext('2d'),g=x.createRadialGradient(505,215,10,505,215,640);g.addColorStop(0,'#33b0ff');g.addColorStop(.45,'#1b86f8');g.addColorStop(1,'#0b4fd2');x.fillStyle=g;x.fillRect(0,0,1024,512);
 /* ドクロ柄：絵文字をやめて、背景より少し濃い青の影絵にして控えめに */
 const sk=new Path2D();sk.moveTo(-.3,.46);sk.lineTo(-.3,.3);sk.bezierCurveTo(-.5,.18,-.52,-.12,-.4,-.3);sk.bezierCurveTo(-.3,-.48,.3,-.48,.4,-.3);sk.bezierCurveTo(.52,-.12,.5,.18,.3,.3);sk.lineTo(.3,.46);sk.closePath();
 sk.moveTo(-.05,.04);sk.ellipse(-.17,.04,.12,.13,0,0,7);sk.moveTo(.29,.04);sk.ellipse(.17,.04,.12,.13,0,0,7);
 sk.moveTo(0,.14);sk.lineTo(-.05,.25);sk.lineTo(.05,.25);sk.closePath();
 sk.rect(-.15,.34,.04,.12);sk.rect(-.02,.34,.04,.12);sk.rect(.11,.34,.04,.12);
 let sd=7;const rnd=()=>(sd=sd*16807%2147483647)/2147483647;
 x.fillStyle='rgba(6,48,168,.10)';
 for(let r=0;r<6;r++)for(let q=-1;q<8;q++){const px=q*150+(r%2?75:0)+(rnd()-.5)*30,py=r*105+20+(rnd()-.5)*24,s=62+rnd()*18;x.save();x.translate(px,py);x.rotate((rnd()-.5)*.9);x.scale(s,s*.9);x.fill(sk,'evenodd');x.restore()}
 const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;return t})();
/* ホーム背景：haike1.mp4 をループ再生（canvas を透明にして背面の動画を見せる。動画が無ければ従来の青背景） */
const HV=(()=>{const v=document.getElementById('hv'),o={ok:!!v&&!v.error};const pl=()=>{const q=v.play();if(q&&q.catch)q.catch(()=>{})};
 o.set=on=>{if(!v)return;v.hidden=!on;if(on&&o.ok)pl();else v.pause()};
 if(v){v.addEventListener('error',()=>{o.ok=false;v.hidden=true;v.pause();if(state=='home')ps.background=HBG});['pointerup','touchend','keydown'].forEach(e=>addEventListener(e,()=>{if(o.ok&&state=='home'&&v.paused)pl()}))}
 return o})();
function setView(m){state=m;const h=m=='home',d=m=='select';
 $('#home').hidden=!h;$('#mr').hidden=m!='room';$('#cl').hidden=m!='list';$('#dt').hidden=!d;{const ms=$('#ms');if(ms)ms.hidden=m!='maps'}{const pf=$('#pf');if(pf)pf.hidden=m!='profile'}if(m!='profile'&&window.PFUI)PFUI.close();if(!d)$('#dp').hidden=true;
 if(h&&pvId!=sel)setPv(sel);
 ps.background=(h&&HV.ok)?null:HBG;HV.set(h);pf.visible=false;psh.visible=h||d;psh.scale.set(1.25,1,.45);if(pv.rg){pv.rg.visible=pv.dk.visible=!d}
 pv.position.x=0;pv.scale.setScalar(h?1.8:2.1);pv.rotation.y=0;pc.position.set(0,2.4,9.5);pc.lookAt(0,h?1.55:1.75,0);
 if(m=='list')openList();if(m=='maps'&&window.MSUI)MSUI.open();if(m=='profile'&&window.PFUI)PFUI.open();if(d){fillDetail();fitDetail()}}
setView('home');

/* ---------- トロフィー / ランク（キャラごと・localStorageに保存） ---------- */
const TKEY='gemrush_trophies_v1';
let TRO=CH.map(()=>0);try{const a=JSON.parse(localStorage.getItem(TKEY));if(Array.isArray(a))TRO=CH.map((_,i)=>Math.max(0,+a[i]||0))}catch(e){}
const saveTR=()=>{try{localStorage.setItem(TKEY,JSON.stringify(TRO))}catch(e){}};
/* ---------- 外枠(index.html)との連携：マップ切替を「再読み込み」ではなく「表示の入れ替え」だけで行う ----------
   ・裏に待機している間(GF.p)は描画・動画・音を止める(最初の数フレームだけ描いてシェーダー等を準備しておく)
   ・手前に出る時(act)：トロフィーを読み直し、選択中のキャラを引き継いでホームを表示、BGM再開 */
const GF={bg:/[?&]bg=1/.test(location.search),p:false,w:6,
 act(o){GF.p=false;
  try{const a=JSON.parse(localStorage.getItem(TKEY));if(Array.isArray(a))TRO=CH.map((_,i)=>Math.max(0,+a[i]||0))}catch(e){}
  if(o&&typeof o.sel=='number'&&CH[o.sel])setSel(o.sel);
  try{if(window.PF)PF.reload()}catch(e){}
  try{setView('home')}catch(e){console.error(e)}
  try{if(o&&o.room&&window.MRUI)MRUI.adopt(o.room)}catch(e){console.error(e)}   /* マルチ：ルームのマップが変わった時は、同じルームのままこの画面へ引き継ぐ */
  try{au();bgm('menu',.6,o&&o.bo)}catch(e){}},   /* o.bo=外枠から教えてもらった「メニューBGMがここまで進んでいる秒数」→続きから流す */
 off(){GF.p=true;GF.w=2;
  try{bgm(null)}catch(e){}
  try{if(AC&&AC.state=='running')AC.suspend()}catch(e){}
  try{setView('home');HV.set(false)}catch(e){}}};
addEventListener('message',e=>{if(window.parent===window||e.source!==window.parent)return;const d=e.data;if(!d||typeof d!='object')return;if(d.gf=='active')GF.act(d);else if(d.gf=='inactive')GF.off()});
if(GF.bg){GF.p=true;GF.w=6;try{HV.set(false)}catch(e){}}

const rkTh=r=>r<=5?(r-1)*10:40+(r-5)*20,rkOf=t=>{let r=1;while(r<35&&t>=rkTh(r+1))r++;return r};   /* ランクrに必要なトロフィー数 */
const rkCol=r=>r<5?'#8793b0':r<10?'#9aa8d8':r<15?'#f5a21c':r<20?'#3a8cf0':r<25?'#a24cf0':r<30?'#e84a7a':'#ff3b3b';
const rkInfo=t=>{const r=rkOf(t),a=rkTh(r),b=r>=35?null:rkTh(r+1);return{r,max:b,p:b?Math.min(100,Math.round(t/b*100)):100}};
function trophyResult(w){const id=P0.c.id,o=TRO[id],d=w==0?8:w==1?-3:0,n=Math.max(0,o+d);TRO[id]=n;saveTR();return{o,n,d:n-o,r0:rkOf(o),r1:rkOf(n)}}   /* 勝ち+8 / 負け-3 / 引き分け0 */

/* ---------- タップ（pointerupで即反応。直後のclickは重複しないよう無視） ---------- */
let TAPT=0;
function tap(el,fn){let d=null;
 el.addEventListener('pointerdown',e=>{d={x:e.clientX,y:e.clientY}});
 el.addEventListener('pointerup',e=>{if(!d)return;const m=Math.hypot(e.clientX-d.x,e.clientY-d.y);d=null;if(m<16){TAPT=performance.now();fn(e)}});
 el.addEventListener('pointercancel',()=>{d=null});
 el.addEventListener('click',e=>{if(performance.now()-TAPT<700)return;TAPT=performance.now();fn(e)})}

/* ---------- キャラ一覧 / 詳細 ---------- */
const UT=[3,3,2,4,2,3,3,4,5,4,3,3,3]; /* 有用性(1〜5)：手動設定。攻撃性・防衛性はキャラのデータから自動計算 */
const dpsOf=c=>{const a=c.a;if(a.en)return a.d/a.gap*.5;return a.d*(a.n||a.sh||1)/c.rl*(a.pierce?1.1:1)},DPSMAX=Math.max(...CH.map(dpsOf)),HPMAX=Math.max(...CH.map(c=>c.hp/(1-(c.dr||0))));
const rate=c=>[Math.max(1,Math.min(5,dpsOf(c)/DPSMAX*5)),Math.max(1,Math.min(5,c.hp/(1-(c.dr||0))/HPMAX*5)),UT[c.id]||3];
const CI=[],THU={},NEED={},THB=new T.Color(0x9fd8f7);
function refreshCards(){CI.forEach((d,i)=>{const t=TRO[i],k=rkInfo(t),ch=d.querySelector('.ch'),rk=d.querySelector('.rk');ch.innerHTML='<i class="tri"></i> '+t;ch.style.setProperty('--hp',k.p+'%');rk.style.setProperty('--c',rkCol(k.r));rk.querySelector('b').textContent=k.r})}
function buildList(){const g=$('#cg');$('#clc').textContent=CH.length+'/'+CH.length;
 try{$('#cl').style.backgroundImage='url('+HBG.image.toDataURL('image/jpeg',.8)+')'}catch(e){}
 CH.forEach((c,i)=>{const d=document.createElement('div');d.className='cd';
  d.innerHTML=`<div class="ch tx"></div><div class="rk"><i><small>ランク</small><b></b></i></div><div class="cp"><span>${c.ic}</span><img alt=""><canvas></canvas></div><div class="cn tx">${c.n}<small>${c.role}</small></div><div class="sl" hidden>選択中</div>`;
  CI[i]=d;{const im=d.querySelector('img'),cp=d.querySelector('.cp');im.onload=()=>{cp.classList.add('im');if(window.PFUI)PFUI.refresh()};im.onerror=()=>{NEED[i]=1;thumbs()};im.src='ch'+c.id+'.png'}   /* 一覧アイコン：chX.png（X=キャラID）。無ければ3Dから自動生成 */
  d.onclick=()=>{if(performance.now()-TAPT<700)return;TAPT=performance.now();sfx('cli',.9);openDetail(i)};g.append(d)});
 refreshCards();
 /* タップ＝pointerupで即オープン／ドラッグでスクロール（画面回転モードでも動くよう自前処理） */
 let dr=null,vy=0,raf=0;
 g.addEventListener('pointerdown',e=>{const y=gp(e).y;dr={y,s:g.scrollTop,m:0,l:y,c:e.target.closest('.cd')};vy=0;cancelAnimationFrame(raf)});
 addEventListener('pointermove',e=>{if(!dr)return;const y=gp(e).y;if(Math.abs(y-dr.y)>10)dr.m=1;if(dr.m){g.scrollTop=dr.s-(y-dr.y);vy=y-dr.l;dr.l=y}});
 addEventListener('pointerup',()=>{if(!dr)return;const d=dr;dr=null;TAPT=performance.now();
  if(d.m){const f=()=>{if(Math.abs(vy)<.4)return;g.scrollTop-=vy;vy*=.94;raf=requestAnimationFrame(f)};f()}
  else if(d.c){sfx('cli',.9);openDetail(CI.indexOf(d.c))}});
 addEventListener('pointercancel',()=>{dr=null})}
/* 3Dモデルから上半身のサムネイルを撮ってカードに描く（テクスチャ未読込のモデルは後で再挑戦） */
function makeThumb(i){
 if(state!='home'&&state!='list'&&state!='select'&&state!='room'&&state!='profile')return false;
 const root=mk(i,null);root.rotation.y=.3;ps.add(root);
 const ob=ps.background,vs=[pv.visible,pf.visible,psh.visible];let ok=false;
 try{
  if(!root.rig||root.rig.m.tex.image){
   if(root.rig)GO.tick(root.rig,null,0);
   const bb=new T.Box3().setFromObject(root),hg=bb.max.y-bb.min.y,hf=hg*.58,cy=bb.max.y+hg*.06-hf/2,src=R.domElement,H=src.height,Wc=Math.min(src.width,Math.round(H*1.75)),ar=Wc/H;
   const tc=new T.PerspectiveCamera(30,src.width/src.height,.1,60),dist=hf/2/Math.tan(15*Math.PI/180),cx=(.5-.36)*ar*hf;
   tc.position.set(cx,cy,dist);tc.lookAt(cx,cy,0);
   pv.visible=pf.visible=psh.visible=false;ps.background=THB;R.render(ps,tc);
   const cv=CI[i].querySelector('canvas');cv.width=360;cv.height=Math.round(360/ar);
   cv.getContext('2d').drawImage(src,(src.width-Wc)/2,0,Wc,H,0,0,cv.width,cv.height);
   CI[i].querySelector('.cp').classList.add('ld');ok=true}
 }catch(e){console.error(e)}
 pv.visible=vs[0];pf.visible=vs[1];psh.visible=vs[2];ps.background=ob;ps.remove(root);disposeCharacterRoot(root);return ok}
/* 1回に2体ずつ少しずつ生成（タップ操作を妨げない） */
let thT=0,thN=0;
function thumbs(){clearTimeout(thT);if(thN++>300)return;let n=0,got=0,miss=0;
 for(let i=0;i<CH.length;i++){if(THU[i]||!NEED[i])continue;if(n>=2){miss++;continue}n++;if(makeThumb(i)){THU[i]=1;got++;if(window.MRUI)MRUI.refresh();if(window.PFUI)PFUI.refresh()}else miss++}
 if(miss)thT=setTimeout(thumbs,got?40:250)}
function openList(){CI.forEach((e,j)=>{e.classList.toggle('on',j==sel);e.querySelector('.sl').hidden=j!=sel});refreshCards();$('#cg').scrollTop=0;thumbs()}
function openDetail(i){vw=i;setPv(i);setView('select')}
function fillDetail(){const c=CH[vw],r=rate(c),t=TRO[vw],k=rkInfo(t);
 $('#dn').textContent=c.n;$('#dr span').textContent=c.role;fitName();$('#dd').textContent=c.da;$('#dsn').textContent=c.su;
 $('#dk .rk').style.setProperty('--c',rkCol(k.r));$('#dk .rk b').textContent=k.r;$('#dkt').innerHTML='<i class="tri"></i> '+t+(k.max?'/'+k.max:'');$('#dk .trb').style.setProperty('--hp',k.p+'%');
 [['a',r[0]],['d',r[1]],['u',r[2]]].forEach(([k,v])=>{$('#sr'+k+' .sb').innerHTML=[0,1,2,3,4].map(j=>`<i><u style="width:${Math.round(Math.max(0,Math.min(1,v-j))*100)}%"></u></i>`).join('')});
 $('#dpb').innerHTML=statusHTML(c)}
/* ---------- キャラクターステータス画面 ---------- */
const ATN=['ウィッチショット','トリプルショット','ショックナックル','ファントムショット','フレイムブレス','ボムトス','トリプル手裏剣','ブレインフリーズ','ヒールダート','ブレードスラッシュ','プレッシャーロケット','ツインボルト','ノヴァヘアー'];
const spdL=v=>v<3.47?'超低速':v<3.8?'低速':v<4.14?'普通':v<4.42?'高速':'超高速',rngL=v=>v<=4.8?'短距離':v<=7.6?'中距離':v<=9?'長距離':'超長距離',rldL=v=>v<=1.3?'超高速':v<=1.45?'高速':v<=1.95?'普通':v<=2.3?'低速':'超低速';
const BURST=(()=>{const R=[1,.42,.74,.42,.95,.42,.68,.42,1,.42,.74,.42,.9,.42];return R.map((r,i)=>{const a=-Math.PI/2+i/R.length*Math.PI*2;return(12+Math.cos(a)*r*10.5).toFixed(1)+','+(12.6+Math.sin(a)*r*10.5).toFixed(1)}).join(' ')})();
const BIC={g:'<path d="M12 21.2C5 16.2 2.2 12.8 2.2 9.2a4.9 4.9 0 0 1 9.8-1.6 4.9 4.9 0 0 1 9.8 1.6c0 3.6-2.8 7-9.8 12z" fill="#fff"/>',b:`<polygon points="${BURST}" fill="#fff" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/>`};
const BDG=(k,ic,c1,c2)=>`<svg class="kv" viewBox="0 0 110 100"><defs><linearGradient id="bg${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><polygon points="2,14 96,10 84,98 1,100" fill="#06143c"/><polygon points="10,5 106,1 92,88 8,92" fill="url(#bg${k})"/><polyline points="12,7 104,3" stroke="#fff" stroke-opacity=".5" stroke-width="3" fill="none"/><g transform="translate(19,13) scale(2.7)">${BIC[ic]}</g></svg>`;
const stBox=(l,v)=>`<div class="ks"><small>${l}</small><b>${v}</b></div>`;
function atkStats(c){if(c.stA)return c.stA;const a=c.a,n=a.n||a.sh||1;
 return[['ダメージ',a.spin?`${a.d}～${a.edge}`:a.en?`${a.d} x 連続`:n>1?`${n} x ${a.d}`:`${a.d}`],['射程',rngL(a.rng)],['リロード速度',rldL(c.rl)]]}
function supStats(c){if(c.stS)return c.stS;const s=c.s,n=s.n||s.sh||1,o=[];
 if(s.d)o.push(['ダメージ',s.can?`${s.d} /秒`:s.oil?`${s.d} x 継続`:s.tur?`${s.d} x 連射`:n>1?`${n} x ${s.d}`:`${s.d}`]);
 o.push(['射程',rngL(s.rng)]);
 if(s.chain)o.push(['連鎖数',s.chain+'体']);
 if(s.mine)o.push(['設置数',s.mine+'個']);if(s.hits)o.push(['チャージヒット数',s.hits+'ヒット']);
 const t=s.t||s.fz||s.rv;if(t)o.push(['効果時間',t+'秒']);
 if(s.h>0)o.push(['回復量',s.h]);
 return o.slice(0,4)}
function statusHTML(c){
 const card=(k,lb,nm,ds,st,bd)=>`<div class="kc k${k.toUpperCase()}">${bd}<div class="kh"><small>${lb}</small><b>${nm}</b></div><div class="kd">${ds}</div><div class="kg">${st.map(x=>stBox(...x)).join('')}</div></div>`;
 return `<div class="kr"><div class="kc kT">${BDG('g','g','#37e24c','#0fa524')}<div class="kg">${stBox('HP',c.hp)}${stBox('移動速度',spdL(c.sp))}</div></div></div>`+
  `<div class="kr kw">${card('a','通常攻撃',ATN[c.id]||'通常攻撃',c.da,atkStats(c),BDG('p','b','#ff5f8c','#e0295b'))}${card('s','必殺技',c.su,c.ds,supStats(c),BDG('y','b','#ffd53d','#f0a600'))}</div>`+
  (c.pa?`<div class="kn">特性：${c.pa}</div>`:'')}

/* 名前が左パネルからはみ出す時だけ、文字を縮めて収める */
function fitName(){const n=$('#dn'),l=$('#dl');if(!n||!l)return;n.style.fontSize='';
 const ml=parseFloat(getComputedStyle(n).marginLeft)||0,av=l.offsetWidth-ml-4;
 if(av>20&&n.offsetWidth>av)n.style.fontSize=(parseFloat(getComputedStyle(n).fontSize)*av/n.offsetWidth)+'px'
 const sb=$('#dsn');if(sb){sb.style.fontSize='';if(sb.clientWidth>20&&sb.scrollWidth>sb.clientWidth)sb.style.fontSize=(parseFloat(getComputedStyle(sb).fontSize)*sb.clientWidth/sb.scrollWidth)+'px'}}   /* 必殺技名も1行に収める */
/* モデルの実際の頂点から範囲を測る（Box3.setFromObjectは回転した腕・爪の箱ごと測って横幅を大きく見積もり、キャラが小さくなっていた）。リング・影は除外 */
function bodyBox(root){root.updateMatrixWorld(true);const b=new T.Box3(),v=new T.Vector3();
 root.traverse(o=>{if(!o.isMesh||o===root.rg||o===root.dk||!o.visible||!o.geometry)return;const p=o.geometry.attributes.position;if(!p)return;
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);b.expandByPoint(v)}});
 return b.isEmpty()?new T.Box3(new T.Vector3(-.5,0,-.5),new T.Vector3(.5,1.7,.5)):b}
/* 詳細画面(本家風)：キャラは「画面の上から約20%〜足元が約90%」で左右パネルの間の中央・下寄りに置き、足元に小さな影を敷く */
function fitDetail(){
 if(state!='select'||!pv)return;
 try{fitDetail2()}catch(e){console.error(e);try{pv.scale.setScalar(1.9);pv.position.set(0,0,0);pc.position.set(0,2.4,9.5);pc.lookAt(0,1.2,0)}catch(_){}}}
function fitDetail2(){
 fitName();
 const D=9.5,TOP=.60,BOT=-.80,vh=2*D*Math.tan(17.5*Math.PI/180),vw2=vh*pc.aspect;
 const dt=$('#dt'),dl=$('#dl'),dr=$('#drt'),AWd=Math.max(1,dt.offsetWidth),lE=dl.offsetLeft+dl.offsetWidth,rS=dr.offsetLeft;   /* 左パネルの右端〜右パネルの左端＝キャラを置ける幅 */
 const free=Math.max(.3,Math.min(.55,(rS-lE)/AWd)),xc=Math.max(-.2,Math.min(.2,((lE+rS)/2/AWd)*2-1));
 pv.rotation.y=0;pv.scale.setScalar(1);pv.position.set(0,0,0);pv.updateMatrixWorld(true);
 const bb=bodyBox(pv),y0=Math.min(0,bb.min.y),h0=Math.max(.1,bb.max.y-y0),w0=Math.max(.1,bb.max.x-bb.min.x),smax=vw2*free*.96/w0,v=new T.Vector3(),cx=-xc*vw2/2,pr=y=>v.set(0,y,0).project(pc).y;
 let s=Math.min(1.9,smax),ty=y0*s+h0*s/2;
 for(let k=0;k<10;k++){
  pc.position.set(cx,ty+.7,D);pc.lookAt(cx,ty,0);pc.updateMatrixWorld(true);
  const yt=pr((y0+h0)*s),yb=pr(y0*s);
  s=Math.min(s*(TOP-BOT)/Math.max(.05,yt-yb),smax);
  ty+=(yb-BOT)*vh/2}   /* 足元を常に BOT(約90%) に固定。横幅の制限で小さくなる時も、足元は下のまま */
 pv.scale.setScalar(s);pv.position.set(0,0,0);pc.position.set(cx,ty+.7,D);pc.lookAt(cx,ty,0);pc.updateMatrixWorld(true);
 /* 足元の影：キャラの大きさに合わせる（本家は足元に小さな楕円） */
 const rad=Math.max(.5,h0*s*.25);psh.position.set(0,.01,0);psh.scale.set(rad/1.5,1,rad/1.5*.55)}
addEventListener('resize',()=>{if(state=='select')fitDetail()});
tap($('#clb'),()=>{sfx('clib',.9);setView('home')});tap($('#clh'),()=>{sfx('clib',.9);setView('home')});
tap($('#dtb'),()=>{sfx('clib',.9);setView('list')});tap($('#dth'),()=>{sfx('clib',.9);setView('home')});
tap($('#dsel'),()=>{sfx('cli',.9);setSel(vw);setView('home')});
tap($('#dtry'),()=>{setSel(vw);sfx('ma',1);bgm(null);startGame()});
tap($('#di'),()=>{sfx('cli',.9);$('#dp').hidden=false});tap($('#dx'),()=>{$('#dp').hidden=true});tap($('#dp'),e=>{if(e.target==$('#dp'))$('#dp').hidden=true});
buildList();setTimeout(thumbs,900);

function mkUnit(ci,team,i,isP){const c=CH[ci],r=mk(ci,team);const s=spawn(team,i);r.position.set(s.x,0,s.z);gs.add(r);if(isP)[r.rg,r.dk].forEach(m=>{m.material.color.setHex(0x4cff7a);m.scale.setScalar(1.2)});
 const hb=new T.Group(),pg=new T.PlaneGeometry(1,1);pg.translate(.5,0,0);const bg=new T.Mesh(pg,new T.MeshBasicMaterial({color:0,transparent:true,opacity:.6,depthTest:false})),fg=new T.Mesh(pg,new T.MeshBasicMaterial({color:isP?0x4cff7a:team?0xff4a4a:0x37a3ff,depthTest:false}));
 bg.scale.set(1.2,.18,1);bg.position.x=-.6;fg.position.set(-.55,0,.01);fg.scale.set(1.1,.12,1);bg.renderOrder=9;fg.renderOrder=10;hb.add(bg,fg);hb.position.y=2.1*(c.sc||1)+.2;r.add(hb);const gp0=new T.Sprite(new T.SpriteMaterial({transparent:true,depthTest:false}));gp0.scale.set(.8,.8,1);gp0.position.y=hb.position.y+1.15;gp0.visible=false;gp0.renderOrder=11;r.add(gp0);const nb=new T.Sprite(new T.SpriteMaterial({depthTest:false,transparent:true}));nb.scale.set(2.4,.9,1);nb.position.y=hb.position.y+.4;nb.renderOrder=12;r.add(nb);hb.visible=false;
 const u={c,team,x:s.x,z:s.z,hp:c.hp,mx:c.hp,ammo:3,sup:0,gems:0,dir:team?Math.PI/2:-Math.PI/2,root:r,mdl:r.mdl,body:r.body,hb,fg,alive:true,rt:0,q:[],rc:0,rv:0,lh:9,fl:0,isP,gsp:gp0,gl:0,nb,nm:isP?'あなた':c.n,bt:0,bk:'',at:0,cd:0,pk:{x:s.x,z:s.z},pt:.5,rn:0,fa:0,dash:null,si:i,fz:0,bn:0,bf:null,sl:0,lp:null,stt:{k:0,d:0,dm:0,hl:0}};{const ic=new T.Mesh(BX,new T.MeshBasicMaterial({color:0x9be8ff,transparent:true,opacity:.55,depthWrite:false}));ic.scale.set(1.1,1.7,1.1);ic.position.y=.85;ic.visible=false;r.add(ic);u.ice=ic;const sh=new T.Mesh(SP,VFX.shieldMat());sh.scale.setScalar(1.1*(c.sc||1));sh.position.y=.8;sh.visible=false;r.add(sh);u.shd=sh}U.push(u);return u}
function startGame(){au();land();if(!W0)snapWorld();state='intro';$('#sup b').textContent=CH[sel].ic;$('#cl').hidden=true;$('#dt').hidden=true;$('#home').hidden=true;$('#mr').hidden=true;$('#hud').hidden=true;ps.remove(pv);
 if(MPG.on)MPG.makeUnits();else{P0=mkUnit(sel,0,1,true);mkUnit((sel+1)%CH.length,0,0);mkUnit((sel+3)%CH.length,0,2);for(let i=0;i<3;i++)mkUnit(Math.floor(Math.random()*CH.length),1,i);
 U.forEach((u,i)=>{u.pn=['あなた','ボット4','ボット5','ボット1','ボット2','ボット3'][i]})}
 const am=new T.Mesh(new T.PlaneGeometry(1,1).rotateX(-Math.PI/2).translate(0,0,.5),new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.35,depthWrite:false}));am.visible=false;am.position.y=.06;gs.add(am);aim.m=am;{const f=new T.Mesh(fanGeo(.3),new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.32,depthWrite:false,side:2}));f.visible=false;f.position.y=.06;gs.add(f);aim.f=f}aim.c=[0,1,2,3,4].map(()=>{const g=new T.Group(),f=new T.Mesh(new T.CircleGeometry(1,40).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:0xff5a4a,transparent:true,opacity:.3,depthWrite:false})),r=new T.Mesh(new T.RingGeometry(.93,1,48).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.9,depthWrite:false}));g.add(f,r);g.position.y=.07;g.visible=false;gs.add(g);return g});introInit()}
/* ---------- バトル前イントロ: 相手陣地 → 自陣へカメラが降りる → go.mp3 + BATTLE!! → 操作開始 ---------- */
const IN={t:0,cz:3,go:0,h:null,vs:0,v0:0};
function introInit(){IN.t=0;IN.cz=3;IN.go=0;IN.vs=0;$('#bt').hidden=true;$('#vs').hidden=true;vsBuild();IN.h=sfx('intro',1);U.forEach(u=>{u.bt=-9})}
function introStep(dt){IN.t+=dt;if(MPG.on)IN.t=MPG.introT();
 const k=Math.min(1,Math.max(0,(IN.t-.5)/2.5)),e=k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;{const a0=KO?KCAM.zm:3,a1=KO?H-KCAM.zm:H-6.5;IN.cz=a0+(a1-a0)*e}
 for(const u of U){u.root.position.set(u.x,0,u.z);u.root.visible=true;u.mdl.rotation.y=Math.PI/2-u.dir;if(u.root.rig)GO.tick(u.root.rig,u,dt);u.hb.quaternion.copy(cam.quaternion);nbUpd(u)}
 /* カメラがマップ中央あたりを通る時に VS カットイン（baio.mp3） */
 if(!IN.vs&&IN.t>=1.35){IN.vs=1;IN.v0=IN.t;vsShow()}
 if(IN.vs==1&&IN.t-IN.v0>=1.6){IN.vs=2;vsHide()}
 if(k>=1&&!IN.go){IN.go=1;IN.g0=IN.t;if(IN.vs==1){IN.vs=2;vsHide()}if(IN.h){IN.h.stop(.25);IN.h=null}sfx('go',1);$('#bt').hidden=false}
 if(IN.go&&IN.t-IN.g0>=1.4)beginBattle()}
/* ---------- VS カットイン（相手=右上の赤、自チーム=左下の青） ---------- */
function vsPortrait(u){
 const ci=CH.indexOf(u.c),cp=CI[ci]&&CI[ci].querySelector('.cp'),box=document.createElement('div');box.className='vp';
 try{
  if(cp&&cp.classList.contains('im')){const im=cp.querySelector('img'),n=new Image();n.src=im.src;box.append(n);return box}
  if(cp&&cp.classList.contains('ld')){const sc=cp.querySelector('canvas'),cv=document.createElement('canvas');cv.width=sc.width;cv.height=sc.height;cv.getContext('2d').drawImage(sc,0,0);box.append(cv);return box}
 }catch(e){}
 const sp=document.createElement('span');sp.textContent=u.c.ic;box.append(sp);return box}
function vsBuild(){
 const row=(sel,ids)=>{const r=$(sel);r.innerHTML='';ids.forEach((i,k)=>{const u=U[i],d=vsPortrait(u),n=document.createElement('b');n.className='vn tx';n.textContent=u.pn;if(u.ncol)n.style.color=u.ncol;d.append(n);d.style.setProperty('--i',k);r.append(d)})};
 row('#vsr .vpr',[5,4,3]);row('#vsb .vpr',[2,1,0])}
function vsShow(){const v=$('#vs');v.classList.remove('on','out');v.hidden=false;void v.offsetWidth;v.classList.add('on');sfx('baio',1)}
function vsHide(){const v=$('#vs');v.classList.add('out');setTimeout(()=>{if(v.classList.contains('out')){v.hidden=true;v.classList.remove('on','out')}},320)}
function beginBattle(){cdv=[null,null];cdk=[12,12];step.pn=0;state='play';$('#bt').hidden=true;$('#vs').hidden=true;$('#hud').hidden=false;if(KO)koStart();hud();bgm('ame',.5)}
tap($('#hp'),()=>{sfx('ma',1);bgm(null);startGame()});tap($('#hmp'),()=>{sfx('cli',.9);if(window.MRUI)MRUI.open()});tap($('#hc'),()=>{sfx('cli',.9);setView('list')});
function msg(t,ms){const m=$('#msg');m.textContent=t;m.style.opacity=1;clearTimeout(m.t);m.t=setTimeout(()=>m.style.opacity=0,ms)}

/* ---------- 戦闘 ---------- */
const hit=(x,z,r)=>solid(x-r,z-r)||solid(x+r,z-r)||solid(x-r,z+r)||solid(x+r,z+r);
/* ---- ルー：凍結ゲージ（スノーコーン1発=15.73%、満タンで1.5秒凍結、2秒間受けないと毎秒5%減少）---- */
const FZT=1.5;
function addFrost(e,a){if(!e.alive||e.lp||e.fz>0||e.rem)return;e.frost=Math.min(1,(e.frost||0)+a);e.fq=2;if(e.frost>=1)freezeUnit(e)}
function freezeUnit(e){if(e.rem)return;e.frost=1;e.fz=FZT;e.fzF=1;e.q=[];e.dash=null;e.str=0;e.kn=null;e.iv={x:0,z:0};snd('freeze',e.x,e.z);fx(e.x,.9,e.z,0xbff6ff,16);fx(e.x,.5,e.z,0x79eaff,10);if(e.isP)msg('凍結！',900)}
/* 氷の上では慣性が強く、急に曲がれない・止まれない */
function drive(u,dt,vx,vz){const iv=u.iv||(u.iv={x:0,z:0});if(u.oi>0){const k=Math.min(1,dt*1.6);iv.x+=(vx-iv.x)*k;iv.z+=(vz-iv.z)*k}else{iv.x=vx;iv.z=vz}const sx=u.x,sz=u.z;mv(u,iv.x*dt,iv.z*dt);if(u.oi>0){if(Math.abs(u.x-sx)<Math.abs(iv.x*dt)*.4)iv.x*=-.25;if(Math.abs(u.z-sz)<Math.abs(iv.z*dt)*.4)iv.z*=-.25;if(Math.hypot(iv.x,iv.z)>.4)u.mvg=1}}
function mv(u,dx,dz){if(u.rem&&!u.dash)return;const r=u.c.wr!=null?u.c.wr:.34; if(!hit(u.x+dx,u.z,r))u.x+=dx;if(!hit(u.x,u.z+dz,r))u.z+=dz}
/* ---------- 壁の破壊（外周の#は壊れない） ---------- */
const TC={R:0xcdbff3,C:0xf4a533,K:0xe650e0,B:0x9a5a2a,W:0xe0764f},ZMX=new T.Matrix4().makeScale(0,0,0),dO=new T.Object3D();
/* 1マスだけ壊す(演出つき)。マルチプレイで他の端末から「壊れた」と知らされたときにも使う */
function brkT(tx,tz){if(tx<1||tz<1||tx>=W-1||tz>=H-1)return 0;const t=g[tz][tx],d=DM[tz*W+tx];if(!d||!TC[t])return 0;
 g[tz][tx]='.';delete DM[tz*W+tx];DY.push({d,t:0});fx(tx+.5,.6,tz+.5,TC[t],10);fx(tx+.5,.4,tz+.5,0xffffff,4);return 1}
/* o=壊した攻撃の持ち主：自分の端末のユニットなら、壊したマスを他の端末へ知らせる */
function brk(x,z,r,o){let n=0;const bt=[];
 for(let tz=Math.floor(z-r);tz<=Math.floor(z+r);tz++)for(let tx=Math.floor(x-r);tx<=Math.floor(x+r);tx++){
  if(tx<1||tz<1||tx>=W-1||tz>=H-1)continue;const t=g[tz][tx];if(!DM[tz*W+tx]||!TC[t])continue;
  if(Math.hypot(Math.max(Math.abs(x-tx-.5)-.5,0),Math.max(Math.abs(z-tz-.5)-.5,0))>r)continue;
  if(brkT(tx,tz)){n++;bt.push([tx,tz])}}
 if(n){snd('crack',x,z);if(Math.hypot(x-P0.x,z-P0.z)<11)shake=Math.max(shake,.22);if(o&&!o.rem&&MPG.on)MPG.sendWall(bt)}return n}
/* ---------- ブッシュを焼く（ユニバードのジェットダッシュ） ---------- */
const SY=[];
/* 1マスのブッシュだけ焼く(演出つき)。マルチプレイで他の端末から「焼けた」と知らされたときにも使う */
function scorchT(tx,tz){if(tx<1||tz<1||tx>=W-1||tz>=H-1||g[tz][tx]!='b')return 0;
 g[tz][tx]='.';bsKill(tx,tz);
 bush.forEach((b,i)=>{if(!b.dead&&Math.floor(b.x)==tx&&Math.floor(b.z)==tz){b.dead=1;SY.push({b,i,t:0,d:Math.random()*.2})}});
 fx(tx+.5,.5,tz+.5,0xff6a1a,10);fx(tx+.5,.6,tz+.5,0xffd23f,6);fx(tx+.5,.4,tz+.5,0x333333,4);return 1}
/* o=焼いた攻撃の持ち主：自分の端末のユニットなら、焼いたマスを他の端末へ知らせる */
function scorch(x,z,r,q,o){let n=0;const bt=[];
 for(let tz=Math.floor(z-r);tz<=Math.floor(z+r);tz++)for(let tx=Math.floor(x-r);tx<=Math.floor(x+r);tx++){
  if(tx<1||tz<1||tx>=W-1||tz>=H-1||g[tz][tx]!='b')continue;
  if(Math.hypot(Math.max(Math.abs(x-tx-.5)-.5,0),Math.max(Math.abs(z-tz-.5)-.5,0))>r)continue;
  if(scorchT(tx,tz)){n++;bt.push([tx,tz])}}
 if(n&&!q)snd('flame',x,z);if(n&&o&&!o.rem&&MPG.on)MPG.sendBurn(bt);return n}
function byUpd(dt){for(let i=SY.length-1;i>=0;i--){const y=SY[i],b=y.b;y.t+=dt;const k=Math.min(1,Math.max(0,(y.t-y.d)/.5));
  if(k>0&&Math.random()<dt*18)fx(b.x,.35,b.z,Math.random()<.5?0xff7a1a:0xffd23f,1);
  bd.position.set(b.x,0,b.z);bd.rotation.set(0,b.r,0);bd.scale.set(b.s*(1-k*.6),b.s*(1-k),b.s*(1-k*.6));bd.updateMatrix();BM.setMatrixAt(y.i,k>=1?ZMX:bd.matrix);BM.instanceMatrix.needsUpdate=true;
  if(k>=1)SY.splice(i,1)}}
function dyUpd(dt){for(let i=DY.length-1;i>=0;i--){const y=DY[i];y.t+=dt;const k=Math.min(1,y.t/.3),s=Math.max(.001,1-k*k);
 for(const[m,j,o]of y.d.ins){dO.position.set(o.x,o.y-k*.4,o.z);dO.scale.set(o.s[0]*s,o.s[1]*s,o.s[2]*s);dO.rotation.set(0,(o.r||0)+k*.8,o.rz||0);dO.updateMatrix();m.setMatrixAt(j,k>=1?ZMX:dO.matrix);m.instanceMatrix.needsUpdate=true}
 if(y.d.obj){y.d.obj.scale.setScalar(s);if(k>=1)gs.remove(y.d.obj)}
 if(k>=1)DY.splice(i,1)}}
const vis=(e,v)=>{const d=Math.hypot(e.x-v.x,e.z-v.z);if(e.bf&&e.bf.k=='stealth')return d<4||e.vf>0;return !inBush(e.x,e.z)||e.rv>0||d<((v.c&&v.c.sn)||3.2)};
function fx(x,y,z,c,n){VFX.burst(x,y,z,c,n)}
function flash(e){e.root.traverse(o=>{if(o.isMesh&&o.material.emissive&&!isOL(o)){o.material.emissive.setHex(0xffffff);o.material.emissiveIntensity=.9}});e.fl=.08}
function unf(e){e.root.traverse(o=>{if(o.isMesh&&o.material.emissive&&!isOL(o)){o.material.emissive.copy(o.material.color);o.material.emissiveIntensity=o.userData.e||0}})}
function dmg(e,d,o,nc,h){if(e.lp||KR.lock)return;const er=e.rem,or=o.rem;if(o.c.rage)d*=1+(1-Math.max(0,o.hp)/o.mx)*o.c.rage;if(e.c.dr)d*=1-e.c.dr;if(e.bf&&e.bf.k=='guard')d*=.3;if(o.c.ls&&!or){const b0=o.hp;o.hp=Math.min(o.mx,o.hp+d*o.c.ls);o.stt.hl+=o.hp-b0}if(e.bf&&e.bf.k=='stealth')e.vf=.5;if(tm-(e.hs||0)>.08){e.hs=tm;snd(/Fist|punch/.test(o.c.sf)?'punch':'hit',e.x,e.z)}if(!or)o.stt.dm+=Math.max(0,Math.min(d,e.hp));if(!er)e.hp-=d;if(o===P0&&d>=1)dnum(e,d);if(!er)e.lh=0;if(!nc&&!or)o.sup=Math.min(100,o.sup+(h?100/o.c.sch:d*chr(o.c)));o.rv=1;flash(e);fx(e.x,1,e.z,0xffd23f,6);if(e.isP)shake=.25;if(!er&&e.hp<=0){if(e.alive&&o!==e)o.stt.k++;die(e,o)}}
function die(e,o,net){if(e.rem&&!net)return;if(MPG.on&&!e.rem&&e.alive)MPG.sendDie(e,o);if(e.alive&&!e.rem)e.stt.d++;deathSnd(e);e.alive=false;e.root.visible=false;e.rt=3.5;e.kn=null;e.bf=null;if(e.tf)tfEnd(e,1);e.fz=0;e.fzF=0;e.q=[];e.frost=0;e.fq=0;e.oi=0;e.iv=null;e.bn=0;e.lp=null;if(!e.rem)for(let i=0;i<e.gems;i++)sg(e.x,e.z);e.gems=0;e.gl=0;e.gsp.visible=false;fx(e.x,1,e.z,0xffffff,18);if(e.isP)msg('やられた！',1500)}
function sg(x,z,p){if(x===MX&&z===MZ)mineBurst();gemSnd(x,z);const a=Math.random()*6.28,s=2+Math.random()*2.5;p=p||{vx:Math.cos(a)*s,vz:Math.sin(a)*s,o:Math.random()*6};const m=mkGem();m.position.set(x,.5,z);gs.add(m);const q={x,z,vx:p.vx,vz:p.vz,m,o:p.o};if(p.id!=null)q.id=p.id;G.push(q);if(MPG.on&&p.id==null)q.id=MPG.gemNew(q)}
/* ====== SFXE-BEGIN : キャラ別の効果音エンジン(下の snd() から使う) ====== */
/* ---------- 効果音(WebAudio合成) ---------- */
let AC,NB;
function mkAC(){if(AC)return;try{AC=new(window.AudioContext||window.webkitAudioContext)();NB=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);const d=NB.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1}catch(e){}}
function au(){mkAC();if(AC&&AC.state=='suspended'){const p=AC.resume();p&&p.catch&&p.catch(()=>{})}}
/* ---------- mp3 再生 (index.html と同じフォルダに置く) ---------- */
const mpN=['dashs','swords','menu','ma','intro','go','death','ame','panic','heal','emes','ur','cli','clib','baio','win','make'],mpBuf={},mpEl={};let bgmN=null,bgmV=1,bgmH=null,bgmOf=null;
function mpLoad(){mkAC();mpN.forEach(n=>{
 const fb=()=>{const a=new Audio(n+'.mp3');a.preload='auto';a.onerror=()=>{a.bad=1};mpEl[n]=a;bgmTry()};
 if(!AC||!window.fetch){fb();return}
 fetch(n+'.mp3').then(r=>{if(!r.ok)throw 0;return r.arrayBuffer()}).then(b=>new Promise((ok,ng)=>{const p=AC.decodeAudioData(b,ok,ng);p&&p.catch&&p.catch(ng)})).then(b=>{mpBuf[n]=b;bgmTry()}).catch(fb)})}
const mpHas=n=>!!(mpBuf[n]||(mpEl[n]&&!mpEl[n].bad));
/* 効果音:v=音量 0-1, loop=ループ。戻り値は stop(フェード秒) を持つハンドル(未読込なら null) */
function sfx(n,v,loop,off){v=v==null?1:v;if(v<=.02)return null;
 if(AC&&mpBuf[n]){const s=AC.createBufferSource(),g=AC.createGain();s.buffer=mpBuf[n];s.loop=!!loop;g.gain.value=Math.min(1,v);s.connect(g);g.connect(AC.destination);s.start(0,off>0&&s.buffer.duration?off%s.buffer.duration:0);   /* off=途中から再生(マップ切替でBGMを続けるため) */
  return{stop(f){try{const t=AC.currentTime;if(f){g.gain.setValueAtTime(Math.min(1,v),t);g.gain.linearRampToValueAtTime(0,t+f);s.stop(t+f+.02)}else s.stop()}catch(e){}}}}
 const a=mpEl[n];if(a&&!a.bad){const c=loop?a:a.cloneNode();c.loop=!!loop;c.volume=Math.min(1,v);if(loop)try{c.currentTime=off>0&&c.duration?off%c.duration:0}catch(e){}const p=c.play();p&&p.catch&&p.catch(()=>{});return{stop(){c.pause()}}}
 return null}
function bgm(n,v,off){if(n==bgmN&&bgmH)return;if(bgmH){bgmH.stop(.15);bgmH=null}bgmN=n;bgmV=v==null?1:v;bgmOf=off>0?{o:off,t:performance.now()}:null;bgmTry();
 try{if(window.top!==window)parent.postMessage({gf:'bgm',n:n},'*')}catch(e){}}   /* いま何のBGMかを外枠に知らせる(マップ切替で曲を頭から鳴らし直さないため) */
function bgmTry(){if(bgmN&&!bgmH){const o=bgmOf?bgmOf.o+(performance.now()-bgmOf.t)/1000:0;bgmH=sfx(bgmN,bgmV,1,o);if(bgmH)bgmOf=null}}
mpLoad();
/* ---------- SFXE の再生: 事前にAudioBufferへレンダリングして鳴らす ---------- */
const SB={},SLAST={},SACT={};let SBUS=null,SVOX=0;const SFXE_OK=typeof SFXE!=='undefined';
/* 合成音の出力先: 大乱戦で音が重なっても割れないよう、小さい音は素通し・大きすぎる合計だけをなめらかに丸めるソフトクリップを通す(音量は変えない) */
function sbus(){if(SBUS)return SBUS;const g=AC.createGain();g.gain.value=.5;const w=AC.createWaveShaper(),n=2048,c=new Float32Array(n);
 for(let i=0;i<n;i++){const v=(i/(n-1)*2-1)*2,a=Math.abs(v);c[i]=a<.6?v:Math.sign(v)*(.6+.4*Math.tanh((a-.6)/.4))}
 w.curve=c;g.connect(w);w.connect(AC.destination);return SBUS=g}
function sbuf(n,k){const key=n+'#'+k;let b=SB[key];if(b)return b;const x=SFXE.render(n,k);if(!x||!AC)return null;b=AC.createBuffer(1,x.length,SFXE.SR);b.getChannelData(0).set(x);return SB[key]=b}
/* v=0〜1(距離で小さくなる)。遠い音ほどこもる(高域が減る)。連射の「機関銃感」を消すため音程と音量を毎回少しゆらす */
function fxPlay(n,v){
 if(!SFXE_OK||!AC)return 0;let d=SFXE.DEF[n];if(!d)return 0;const now=AC.currentTime;
 if(d.st&&SFXE.DEF[d.st]){const first=now-(SLAST[n]==null?-9:SLAST[n])>d.sg;SLAST[n]=now;if(first){n=d.st;d=SFXE.DEF[n]}}
 if((SACT[n]||0)>=d.mx||SVOX>=40)return 1;
 const b=sbuf(n,d.vr>1?(Math.random()*d.vr|0):0);if(!b)return 0;
 const s=AC.createBufferSource(),g=AC.createGain(),bus=sbus();
 s.buffer=b;s.playbackRate.value=1+(Math.random()*2-1)*d.pv;g.gain.value=Math.min(1,v)*(.92+Math.random()*.16);
 if(v<.97){const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.value=1500+13000*Math.pow(v,1.7);s.connect(f);f.connect(g)}else s.connect(g);
 g.connect(bus);SACT[n]=(SACT[n]||0)+1;SVOX++;s.onended=()=>{SACT[n]--;SVOX--};s.start(0);return 1}
/* 起動直後に空き時間で全部レンダリングしておく(初回の発砲で処理が重くならないように) */
function sfxWarm(){if(!SFXE_OK)return;const Q=[];for(const n of SFXE.names)for(let k=0;k<SFXE.DEF[n].vr;k++)Q.push([n,k]);let i=0;
 const idle=window.requestIdleCallback?f=>requestIdleCallback(f,{timeout:1500}):f=>setTimeout(f,40);
 const go=()=>{if(i>=Q.length||!AC)return;try{sbuf(Q[i][0],Q[i][1])}catch(e){}i++;idle(go)};setTimeout(()=>idle(go),1500)}
sfxWarm();
document.addEventListener('visibilitychange',()=>{if(!AC)return;try{document.hidden?AC.suspend():AC.resume()}catch(e){}});
/* 最初に画面のどこかをタップ → 全画面+横向き → メニューBGM */
let tap1=0;
function firstTap(){if(tap1)return;tap1=1;au();let d=0;const go=()=>{if(d)return;d=1;if(state=='home'||state=='select'||state=='list'||state=='maps'||state=='profile')bgm('menu',.6)};land(go);setTimeout(go,1200)}
['pointerup','keydown'].forEach(e=>addEventListener(e,firstTap));
/* 距離で減衰する自然回復/エメラルド/死亡の音 */
function healSnd(u){if(!u.isP)return;sfx('heal',.9)}
function gemSnd(x,z){if(tm-(gemSnd.t==null?-9:gemSnd.t)<.12)return;const v=1-Math.hypot(x-P0.x,z-P0.z)/13;if(v<=.05)return;gemSnd.t=tm;sfx('emes',Math.min(1,v+.15))}
function deathSnd(e){const v=e.isP?1:Math.max(0,1-Math.hypot(e.x-P0.x,e.z-P0.z)/20);if(mpHas('death')){sfx('death',v)}else snd('die',e.x,e.z)}
addEventListener('pointerdown',au);addEventListener('keydown',au);
/* 効果音をmp3で差し替える対応表：dashs.mp3=セイリュウのダッシュ / swords.mp3=セイリュウの剣 */
const MPS={novaDash:'dashs',sword:'swords'};
function snd(n,x,z){if(!AC||AC.state!='running')return;const v=x==null?1:Math.max(0,1-Math.hypot(x-P0.x,z-P0.z)/18);if(v<.05)return;const mf=MPS[n];if(mf&&mpHas(mf)){sfx(mf,Math.min(1,v));return}
 if(SFXE_OK&&SFXE.DEF[n]){try{if(fxPlay(n,Math.min(1,v)))return}catch(e){}}   /* 新エンジンで鳴らす。失敗したら下の旧合成音へ */
 const t=AC.currentTime,m=AC.createGain();m.gain.value=v*.5;m.connect(AC.destination);
 const nb=(dur,f,ty,vol,f2)=>{const s=AC.createBufferSource();s.buffer=NB;const fl=AC.createBiquadFilter();fl.type=ty;fl.frequency.setValueAtTime(f,t);if(f2)fl.frequency.exponentialRampToValueAtTime(f2,t+dur);const g=AC.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(fl);fl.connect(g);g.connect(m);s.start(t);s.stop(t+dur+.05)};
 const os=(ty,f1,f2,dur,vol,dl)=>{const o=AC.createOscillator(),g=AC.createGain(),s=t+(dl||0);o.type=ty;o.frequency.setValueAtTime(f1,s);o.frequency.exponentialRampToValueAtTime(f2,s+dur);g.gain.setValueAtTime(vol,s);g.gain.exponentialRampToValueAtTime(.001,s+dur);o.connect(g);g.connect(m);o.start(s);o.stop(s+dur+.05)};
 const S={shot:()=>{nb(.3,2800,'lowpass',1.3,250);os('sine',150,40,.28,1.1)},
 pistol:()=>{nb(.09,5000,'highpass',.8);nb(.14,2200,'lowpass',.9,500);os('square',420,80,.08,.25)},
 punch:()=>{os('sine',170,35,.22,1.4);nb(.12,500,'lowpass',1.2,150);nb(.18,300,'bandpass',.5,1800)},
 laser:()=>{os('sawtooth',1500,120,.35,.35);os('sine',900,200,.35,.5);nb(.12,6000,'highpass',.4)},
 flame:()=>{nb(.14,1200,'bandpass',.7,500)},big:()=>{nb(.5,1500,'lowpass',1.2,200);os('sine',200,50,.4,1)},
 lob:()=>{nb(.3,400,'bandpass',.5,1600);os('sine',300,500,.2,.3)},boom:()=>{nb(.7,900,'lowpass',1.6,80);os('sine',100,25,.6,1.4)},
 star:()=>{nb(.09,7000,'highpass',.6,2500);os('triangle',2400,900,.08,.2)},
 ice:()=>{os('triangle',2600,1300,.25,.4);os('sine',3500,1800,.2,.25,.03);nb(.15,6000,'highpass',.3)},
 dart:()=>{os('sine',900,1500,.1,.4);nb(.06,5000,'highpass',.4)},slash:()=>{nb(.18,3000,'bandpass',.8,800);os('sawtooth',400,150,.12,.25)},zap:()=>{os('sawtooth',1800,300,.15,.3);nb(.1,4000,'highpass',.5)},hit:()=>{os('square',260,70,.07,.35);nb(.05,1500,'bandpass',.5)},gem:()=>{os('sine',900,1500,.1,.4);os('sine',1350,2000,.12,.3,.07)},
 crack:()=>{nb(.5,1400,'lowpass',1.4,100);os('square',150,40,.28,.45);nb(.3,3500,'bandpass',.5,700)},die:()=>{os('sawtooth',500,40,.5,.5);nb(.4,1500,'lowpass',.6,100)},dash:()=>{nb(.4,300,'bandpass',.9,2500)},poof:()=>{nb(.6,2600,'bandpass',.9,250);os('sine',600,200,.3,.3)},bolt:()=>{os('sawtooth',2600,200,.25,.35);nb(.3,5000,'highpass',.7);os('square',1400,120,.2,.2,.06)},hole:()=>{os('sine',90,28,.9,1.3);nb(.8,200,'lowpass',.6,1400)},mine:()=>{os('square',800,800,.05,.3);os('square',1000,1000,.05,.3,.1);os('sine',200,100,.15,.5,.2)},guard:()=>{os('triangle',180,420,.35,.7);os('sine',110,60,.4,.9);nb(.2,3000,'bandpass',.4)},freeze:()=>{os('triangle',3200,500,.6,.45);nb(.5,7000,'highpass',.6);os('sine',200,60,.5,.8)},
 nova:()=>{os('sine',1320,1980,.14,.30);os('sine',1760,2640,.18,.22,.03);os('triangle',880,1320,.12,.22);os('sine',2349,3136,.2,.16,.07);nb(.14,7000,'highpass',.32,3200);os('sine',220,110,.12,.5)},
  sword:()=>{nb(.24,1100,'bandpass',.95,5600);nb(.2,5200,'highpass',.34,2000);os('sawtooth',720,170,.17,.2);os('sine',2093,3136,.2,.2,.05);os('sine',130,52,.22,.75,.06)},
  swordHit:()=>{os('square',1800,900,.05,.22);os('sine',2600,1300,.16,.3);os('sine',3951,3951,.12,.12,.02);nb(.07,3500,'bandpass',.7,900);os('sine',160,60,.12,.65)},
  novaDash:()=>{nb(.38,380,'bandpass',.9,4200);os('sawtooth',300,1300,.3,.18);os('sine',1500,3200,.32,.16,.05)},
  novaForm:()=>{[523,659,784,1047,1319,1568].forEach((f,i)=>{os('sine',f,f*1.004,.5,.3,i*.06);os('triangle',f*2,f*2.01,.35,.1,i*.06)});nb(.7,2500,'highpass',.34,9000);os('sine',110,45,.55,.95,.25);os('sine',2093,2093,.8,.16,.4)},
  novaEnd:()=>{[1319,988,784].forEach((f,i)=>os('sine',f,f*.98,.26,.2,i*.07));nb(.3,6000,'bandpass',.28,1500)},
  sup:()=>{[600,800,1000,1300].forEach((f,i)=>os('triangle',f,f*1.01,.12,.4,i*.07))},
 win:()=>{[523,659,784,1046].forEach((f,i)=>os('triangle',f,f*1.01,.3,.5,i*.12))},lose:()=>{[400,330,260,200].forEach((f,i)=>os('triangle',f,f*.99,.35,.5,i*.18))}};
 S[n]&&S[n]()}
const BC={},bm=u=>u.c.bc?(BC[u.c.bc]||(BC[u.c.bc]=new T.MeshBasicMaterial({color:u.c.bc}))):u.team?BR:BB;
function boom(b){const big=b.big,R=b.aoe+.4,bk=b.br||b.brk;snd(big?'boomBig':'boom',b.x,b.z);if(bk){brk(b.x,b.z,bk,b.o);if(big)scorch(b.x,b.z,bk,1,b.o)}
 VFX.explode(b,R);if(Math.hypot(b.x-P0.x,b.z-P0.z)<(big?14:10))shake=Math.max(shake,big?.55:.3);
 for(const e of U){if(e.team==b.o.team||!e.alive||e.lp)continue;const dx=e.x-b.x,dz=e.z-b.z,l=Math.hypot(dx,dz);if(l>=R)continue;dmg(e,b.d,b.o,b.nc);
  if(e.alive&&b.kb&&!e.c.hv){knock(e,l>.05?Math.atan2(dz,dx):(b.a||0),b.kb);fx(e.x,.6,e.z,0xffd23f,8)}}}
/* ---------- 投擲（ダイナマイク型）：ドラッグ距離＝着弾距離 ---------- */
const MKF=new T.CircleGeometry(1,40).rotateX(-Math.PI/2),MKR=new T.RingGeometry(.94,1,48).rotateX(-Math.PI/2);
const lobD=(s,r)=>r==null?s.rng:1+(s.rng-1)*Math.max(0,Math.min(1,r));   /* 引き量0〜1 → 着弾距離(1〜最大射程) */
const aimR=(dd,el)=>Math.max(0,Math.min(1,dd/Math.max(64,el.clientWidth*.85)));
function lobPts(u,a,D,s){const n=s.n||1,px=-Math.sin(a),pz=Math.cos(a),o=[];for(let j=0;j<n;j++){const off=n>1?(j-(n-1)/2)*(s.sep||.8):0;o.push({x:Math.max(.6,Math.min(W-.6,u.x+Math.cos(a)*D+px*off)),z:Math.max(.6,Math.min(H-.6,u.z+Math.sin(a)*D+pz*off))})}return o}
function lobAuto(u,s){const e=near(u,s.rng);if(!e)return{a:u.dir,D:s.rng};const dx=e.x-u.x,dz=e.z-u.z;return{a:Math.atan2(dz,dx),D:Math.max(.8,Math.min(s.rng,Math.hypot(dx,dz)))}}
function autoShot(u,sp){const s=sp?u.c.s:u.c.a;if(sp&&s.piper){const e=near(u,12);atk(u,e?Math.atan2(u.z-e.z,u.x-e.x):u.dir+Math.PI,1);return}if(s.lob){const l=lobAuto(u,s);atk(u,l.a,sp,l.D)}else atk(u,autoAim(u),sp)}
function mkCloud(){const g=new T.Group();[[0,0,0,.34],[.2,-.02,-.2,.26],[-.2,-.02,-.18,.27],[.05,.14,-.32,.2],[0,-.04,.2,.22]].forEach(([x,y,z,r])=>P(g,SP,0xf6fbff,x,y,z,[r,r,r],{e:.3,no:1}));P(g,SP,0xc8d6f0,0,-.12,-.05,[.3,.18,.3],{e:.1,no:1});return g}
function mkCone(){const g=new T.Group();P(g,CN,0xe9c27d,0,0,-.2,[.17,.5,.17],{r2:[-Math.PI/2,0,0]});P(g,SP,0x8fe8ff,0,0,.12,[.2,.2,.2],{e:.35});P(g,SP,0xffffff,0,.07,.2,[.11,.11,.11],{e:.3,no:1});return g}
function mkCan(){const g=new T.Group(),pv=new T.Group();g.add(pv);g.userData.pv=pv;P(pv,CY,0x6fd8ff,0,0,0,[.3,.5,.3],{e:.3});P(pv,CY,0xffffff,0,.26,0,[.31,.06,.31],{no:1});P(pv,CY,0xff6aa8,0,0,0,[.315,.14,.315],{no:1,e:.2});return g}
/* 缶が着地：滑る氷のエリアを作る */
function canLand(b){snd('iceField',b.x,b.z);VFX.ring(b.x,b.z,.3,b.zr*1.1,.5,0xbff6ff,.95);VFX.burst(b.x,.4,b.z,0xbff6ff,24);mkZone({k:'ice',x:b.x,z:b.z,r:b.zr,t:b.zt,t0:b.zt,d:b.zd,tk:.5,o:b.o})}
function blastFxC(x,z,R){const m=new T.Mesh(new T.RingGeometry(.3,.5,40),new T.MeshBasicMaterial({color:0xbff6ff,transparent:true,side:2,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(x,.12,z);gs.add(m);NV.push({m,t:.45,r:R})}
function mkDyna(big){const g=new T.Group(),pv=new T.Group(),X=[Math.PI/2,0,0];g.add(pv);g.userData.pv=pv;
 if(big){P(pv,CY,0x8a5a2a,0,0,0,[.36,.7,.36],{r2:X});[-.24,.24].forEach(z=>P(pv,CY,0x3a3a46,0,0,z,[.38,.08,.38],{r2:X,no:1}));P(pv,CY,0xd62828,0,0,0,[.385,.12,.385],{r2:X,e:.25,no:1});P(pv,CY,0x886644,0,.38,0,[.03,.2,.03],{no:1});P(pv,SP,0xff9a2b,0,.52,0,[.1,.1,.1],{e:2,no:1})}
 else{P(pv,CY,0xd62828,0,0,0,[.1,.52,.1],{r2:X});P(pv,CY,0xf0e0b0,0,0,0,[.108,.12,.108],{r2:X,no:1});P(pv,CY,0x886644,0,0,.33,[.022,.14,.022],{r2:X,no:1});P(pv,SP,0xff9a2b,0,0,.43,[.07,.07,.07],{e:2,no:1})}
 return g}
function blastFx(x,z,R){[[0xffb040,R],[0xffffff,R*.7]].forEach(([c,r])=>{const m=new T.Mesh(new T.RingGeometry(.3,.5,40),new T.MeshBasicMaterial({color:c,transparent:true,side:2,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(x,.12,z);gs.add(m);NV.push({m,t:.45,r})})}
/* ---------- ノックバック：本家のように「ふっ飛んで、だんだん減速して止まる」 ----------
   距離d(マス)を T秒かけて進む。最初が最速で、そこから減速(イージングアウト)。
   KN_P を大きくするほど「最初に勢いよく飛び、最後はゆっくり止まる」。 KN_T0/KN_TD で飛んでいる時間を調整。
   壁に当たったらそこで止まる。ノックバックは必ずこの knock() を通す(座標を直接ずらさない＝瞬間移動の原因) */
const KN_P=2.4,KN_T0=.26,KN_TD=.05,KN_TMAX=.7;
function knock(e,a,d,keepDash){if(e.rem||e.c.hv||!(d>0))return;e.kn={a,d,d0:d,t:0,T:Math.min(KN_TMAX,KN_T0+KN_TD*d),p:0};if(!keepDash)e.dash=null}
function KN(u,dt){const k=u.kn;if(k.v!=null&&k.d0==null){k.d0=k.d;k.T=Math.max(.2,k.d/k.v);k.t=0;k.p=0}
 k.t+=dt;const s=Math.min(1,k.t/k.T),q=k.d0*(1-Math.pow(1-s,KN_P)),m=q-k.p;k.p=q;u.mvg=0;
 if(m>1e-5){const x=u.x,z=u.z,n=Math.ceil(m/.12),c=Math.cos(k.a)*m/n,w=Math.sin(k.a)*m/n;for(let i=0;i<n;i++)mv(u,c,w);if(Math.abs(u.x-x)+Math.abs(u.z-z)<m*.3){u.kn=null;return}}
 if(s>=1)u.kn=null}
/* ★弾（スーパースター用）とノックバック */
const SHG=(()=>{const sh=new T.Shape();for(let i=0;i<8;i++){const r=i%2?.3:1,an=Math.PI/4*i,x=Math.cos(an)*r,y=Math.sin(an)*r;i?sh.lineTo(x,y):sh.moveTo(x,y)}sh.closePath();const g=new T.ExtrudeGeometry(sh,{depth:.12,bevelEnabled:false});g.center();g.rotateX(Math.PI/2);return g})();
const FANG={};function fanGeo(spr){const k=spr.toFixed(3);if(FANG[k])return FANG[k];const h=spr/2,N=18,p=[0,0,0],ix=[];for(let i=0;i<=N;i++){const t=-h+2*h*i/N;p.push(Math.sin(t),0,Math.cos(t));if(i)ix.push(0,i,i+1)}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);return FANG[k]=g}
const STG=(()=>{const sh=new T.Shape();for(let i=0;i<10;i++){const r=i%2?.45:1,an=Math.PI/5*i,x=Math.sin(an)*r,y=Math.cos(an)*r;i?sh.lineTo(x,y):sh.moveTo(x,y)}sh.closePath();const g=new T.ExtrudeGeometry(sh,{depth:.35,bevelEnabled:false});g.center();g.rotateX(Math.PI/2);return g})(),STM=new T.MeshBasicMaterial({color:0xffd23f}),KQ=[];
function kback(e,a,d){knock(e,a,d);fx(e.x,.6,e.z,0xffd23f,8)}
function bul(u,s,a,ox,oz,grp){ox=ox==null?u.x:ox;oz=oz==null?u.z:oz;const sz=s.size||.2,m=s.lob?(s.can?mkCan():mkDyna(s.big)):s.cone?mkCone():s.cloud?mkCloud():new T.Mesh(s.blade?SHG:s.star?STG:SP,s.star?STM:bm(u));if(s.lob||s.cone||s.cloud){}else if(s.blade){m.scale.setScalar(sz*2.3);const l=new T.Mesh(SHG,OL);l.scale.setScalar(1.22);m.add(l)}else if(s.star){m.scale.setScalar(sz*1.7);const l=new T.Mesh(STG,OL);l.scale.setScalar(1.18);m.add(l)}else m.scale.set(sz,sz,sz*(s.pierce?3.5:1.4));m.position.set(ox,.9,oz);m.rotation.y=Math.PI/2-a;gs.add(m);
 let mk=null,tx=0,tz=0;if(s.lob){tx=ox+Math.cos(a)*s.rng;tz=oz+Math.sin(a)*s.rng;const R=s.aoe+.4,f=new T.Mesh(MKF,new T.MeshBasicMaterial({color:s.can?0x4ad0ff:s.big?0xff2a1a:0xff4a3a,transparent:true,opacity:.34,depthWrite:false})),r=new T.Mesh(MKR,new T.MeshBasicMaterial({color:s.can?0xd8f8ff:0xffb0a0,transparent:true,opacity:.9,depthWrite:false}));f.scale.set(.05,1,.05);mk=new T.Group();mk.add(f,r);mk.scale.set(R,1,R);mk.position.set(tx,.06,tz);mk.userData.f=f;gs.add(mk)}
 B.push({mk,tx,tz,big:s.big,nc:s.nc,x:ox,z:oz,vx:Math.cos(a)*s.v,vz:Math.sin(a)*s.v,l:s.rng,d:s.d,o:u,p:s.pierce,h:new Set(),m,r:(s.hr!=null?s.hr:sz+.15),lob:s.lob,aoe:s.aoe,cloud:s.cloud,ac:s.ac,can:s.can,zr:s.r,zt:s.t,zd:s.d,cone:s.cone,fr:s.frost,hl:s.heal,s0:s.rng,bn:s.bn||0,gh:s.gh,rp:s.ramp||0,brn:s.burn,kb:s.kb||0,brk:s.brk||0,star:s.star||s.blade,fl:s.fl,z0:sz,grp:grp||new Set()});VFX.bInit(B[B.length-1],u,s,a)}
function atk(u,ang,sp,aimDist){if(u.fz>0||u.lp||KR.lock)return;let s=sp?u.c.s:u.c.a;if(!sp&&s.en){if(u.ammo<.05)return;u.str=Math.max(u.str||0,.3);u.sa=ang;u.dir=ang;u.fa=.4;return}if(sp){if(!u.rem){if(u.sup<100)return;u.sup=0}}else{if(!u.rem){if((u.acd||0)>0)return;if(u.ammo<1)return;u.ammo-=1;u.acd=u.c.ad||.6}if(u.bf&&u.bf.k=='stealth')u.bf=null}if(MPG.on&&!u.rem)MPG.sendAtk(u,ang,sp,aimDist);if(!sp&&u.tf&&u.c.tf){u.dir=ang;u.fa=.45;u.rv=1.2;u.lh=0;sword(u,ang);return}

 if(!sp&&s.spin){u.dir=ang;u.fa=.3;u.rc=.22;u.q.push({t:s.wind||.22,f:()=>{snd(u.c.sf,u.x,u.z);fx(u.x,.65,u.z,0xd4a36a,18);for(const e of U){if(!e.alive||e.team==u.team)continue;const d=Math.hypot(e.x-u.x,e.z-u.z);if(d>s.aoe)continue;dmg(e,d<s.aoe*.48?s.d:s.edge,u)}mkZone({k:'ants',x:u.x,z:u.z,r:2,t:3,t0:3,o:u})}});return}
 u.dir=ang;u.fa=.4;u.rv=1.2;u.lh=0;
 if(sp&&u.isP)msg(u.c.su+'！',1100);if(sp&&spc(u,ang,s,aimDist))return;if(s.nova){if(s.wind){u.fa=Math.max(u.fa,s.wind+.2);snd('shockCharge',u.x,u.z);fx(u.x,.8,u.z,0xffffff,14);VFX.charge(u,s);u.q.push({t:s.wind,f:()=>{if(!u.alive)return;if(s.brk)brk(u.x,u.z,s.brk,u);nova(u,s)}})}else nova(u,s);return}if(s.dash){snd('dash',u.x,u.z);u.dash={t:.5,a:ang,h:new Set(),d:s.d,v:s.dv||13};return}if(s.antDash){snd('dash',u.x,u.z);u.dash={t:.6,a:ang,h:new Set(),d:s.d,v:s.v,ants:1,at:0};return}
 if(s.lob){const D=aimDist==null?s.rng:Math.max(.8,Math.min(s.rng,aimDist)),LS=lobPts(u,ang,D,s),gr=new Set();LS.forEach((p,j)=>u.q.push({t:j*.07,f:()=>{snd(sp?u.c.ss:u.c.sf,u.x,u.z);const o=LS.length>1?(j-(LS.length-1)/2)*.35:0,sx=u.x-Math.sin(ang)*o,sz=u.z+Math.cos(ang)*o;bul(u,{...s,rng:Math.max(.3,Math.hypot(p.x-sx,p.z-sz))},Math.atan2(p.z-sz,p.x-sx),sx,sz,gr);u.rc=.12}}));return}
 if(s.sweep){const n=s.n,gr=new Set();u.fa=Math.max(u.fa,s.gap*(n-1)+.15);for(let i=0;i<n;i++)u.q.push({t:s.gap*i,f:()=>{if(!u.alive)return;snd(sp?u.c.ss:u.c.sf,u.x,u.z);bul(u,s,ang+(n>1?(i/(n-1)-.5)*s.spr:0),null,null,gr);u.rc=.12}});return}
 const sh=s.sh||1,n=s.n||1,grp=new Set();if(s.cone)u.fa=Math.max(u.fa,(s.gap||0)*(sh-1)+.15);for(let i=0;i<sh;i++)u.q.push({t:(s.gap||0)*i,f:()=>{snd(sp?u.c.ss:u.c.sf,u.x,u.z);for(let j=0;j<n;j++){const a=ang+(n>1?(j/(n-1)-.5)*s.spr:0)+(Math.random()-.5)*(s.jit||0);if(s.pair){const off=j?1:-1,side=ang+Math.PI/2;bul(u,s,a,u.x+Math.cos(side)*s.pair*off,u.z+Math.sin(side)*s.pair*off,grp)}else bul(u,s,a,null,null,grp)}u.rc=.12}})}
/* エナジー式（アンバー型）：撃っている間だけ燃料が減り、少し止めると回復 */
function enUpd(u,dt){const s=u.c.a;
 if(u.isP&&HOLD.on&&state=='play'){u.str=Math.max(u.str||0,.1);u.sa=aim.on&&!aim.sp?aim.a:autoAim(u)}
 if((u.str||0)>0&&u.ammo>.02&&u.fz<=0&&!u.lp&&!u.dash){u.str-=dt;u.dir=u.sa;u.fa=.25;u.rv=1.2;u.lh=0;u.rc=.1;u.ammo=Math.max(0,u.ammo-dt/s.ed);u.nf=s.ew;u.ft=(u.ft||0)-dt;
  for(let k=0;k<3&&u.ft<=0;k++){u.ft+=s.gap;if((u.fc=(u.fc||0)+1)%2==1)snd(u.c.sf,u.x,u.z);bul(u,s,u.sa+(Math.random()-.5)*s.jit)}}
 else{u.str=0;u.ft=0;u.nf=(u.nf||0)-dt;if(u.nf<=0)u.ammo=Math.min(3,u.ammo+dt/s.er)}}
function near(u,rng){let b=null,bd=rng+3;for(const e of U){if(e.team==u.team||!e.alive||!vis(e,u))continue;const d=Math.hypot(e.x-u.x,e.z-u.z);if(d<bd){bd=d;b=e}}return b}
function autoAim(u){const e=near(u,u.tf&&u.c.tf?u.c.tf.reach:u.c.a.rng);return e?Math.atan2(e.z-u.z,e.x-u.x):u.dir}

/* ---------- キャラ固有ギミック ---------- */
const ZN=[],BL=[],BLM=new T.MeshBasicMaterial({color:0xbff6ff,transparent:true});
const spd=u=>u.c.sp*(u.tf?u.c.tf.spd:1)*(u.sl>0?.55:1)*(u.bf&&u.bf.k=='blaze'?1.55:1)*(u.c.id===10&&ZN.some(q=>q.k=='ants'&&q.o.team===u.team&&Math.hypot(q.x-u.x,q.z-u.z)<q.r)?1.25:1)*(u.c.bs&&inBush(u.x,u.z)?u.c.bs:1);
const useSup=(u,d)=>{const s=u.c.s;if(s.tf&&u.tf)return 0;if(s.rev)return U.some(a=>a.team==u.team&&a!=u&&(a.alive?a.hp<a.mx*.45&&Math.hypot(a.x-u.x,a.z-u.z)<s.r:1));return d<(s.air||s.rng)};
function burn(e,o){if(e.rem)return;e.bn=2;e.bo=o}
function fpt(x,z,a,d){let px=x+Math.cos(a)*d,pz=z+Math.sin(a)*d;for(let i=0;i<16&&hit(px,pz,.4);i++){d=Math.max(0,d-.4);px=x+Math.cos(a)*d;pz=z+Math.sin(a)*d}return{x:px,z:pz}}
function tgt(u,a,rng){let bd=1e9,d=rng*.8;for(const e of U){if(e.team==u.team||!e.alive||!vis(e,u))continue;const dx=e.x-u.x,dz=e.z-u.z,l=Math.hypot(dx,dz);if(l>rng+1.5)continue;let df=Math.atan2(dz,dx)-a;df=Math.abs(Math.atan2(Math.sin(df),Math.cos(df)));if(df<.45&&l<bd){bd=l;d=Math.min(l,rng)}}return fpt(u.x,u.z,a,d)}
function bolt(p,q){VFX.bolt(p,q)}
function chain(u,a,s){let c=null,bs=1e9;for(const e of U){if(e.team==u.team||!e.alive||e.lp||!vis(e,u))continue;const dx=e.x-u.x,dz=e.z-u.z,dd=Math.hypot(dx,dz);if(dd>s.rng)continue;let df=Math.atan2(dz,dx)-a;df=Math.abs(Math.atan2(Math.sin(df),Math.cos(df)));const sc=dd+df*5;if(sc<bs){bs=sc;c=e}}
 if(!c)return 0;const seen=new Set([c]);let p={x:u.x,z:u.z},e=c,dm=s.d;snd(u.c.ss,u.x,u.z);
 for(let i=0;i<s.chain&&e;i++){bolt(p,e);VFX.zapHit(e.x,e.z);dmg(e,dm,u);if(e.alive&&!e.rem){e.fz=Math.max(e.fz,.4);e.q=[]}dm*=.85;seen.add(e);p=e;let n=null,nd=s.hop;for(const f of U){if(f.team==u.team||!f.alive||f.lp||seen.has(f))continue;const dd=Math.hypot(f.x-e.x,f.z-e.z);if(dd<nd){nd=dd;n=f}}e=n}
 shake=Math.max(shake,.2);return 1}
let OID=0;
function mkZone(o){const m=new T.Group(),F=(g,c,op,add)=>{const x=new T.Mesh(g,new T.MeshBasicMaterial({color:c,transparent:true,opacity:op,depthWrite:false,side:2,blending:add?T.AdditiveBlending:T.NormalBlending}));x.rotation.x=-Math.PI/2;return x};
 if(o.k=='hole'){const d=F(new T.CircleGeometry(o.r,40),0x14002a,.8),r1=F(new T.RingGeometry(o.r*.88,o.r,48),0xb46bff,.95,1),r2=F(new T.RingGeometry(o.r*.3,o.r*.55,6),0xe0a0ff,.8,1);d.position.y=.03;r1.position.y=.05;r2.position.y=.06;m.add(d,r1,r2);o.sp=r2}
 else if(o.k=='oil'){const d=F(new T.CircleGeometry(o.r,20),0x1a1020,.85),c=F(new T.CircleGeometry(o.r*.6,16),0x5a3a8a,.45,1);d.position.y=.03;c.position.y=.04;m.add(d,c)}
 else if(o.k=='fire'){const d=F(new T.CircleGeometry(o.r,18),0xff6a1a,.6,1),c=F(new T.CircleGeometry(o.r*.5,14),0xffd23f,.7,1);d.position.y=.04;c.position.y=.05;m.add(d,c);o.mat=d.material;o.mat2=c.material}
 else if(o.k=='ice'||o.k=='ants'){const c=o.k=='ice'?0x79eaff:0x8acb5a,d=F(new T.CircleGeometry(o.r,32),c,.28,1),r=F(new T.RingGeometry(o.r*.88,o.r,32),c,.72,1);d.position.y=.035;r.position.y=.05;m.add(d,r);o.mat=d.material;o.mat2=r.material;if(o.k=='ice'){const r3=F(new T.RingGeometry(o.r*.45,o.r*.5,6),0xffffff,.45,1);r3.position.y=.045;m.add(r3);o.sp=r3}}
 else if(o.k=='pbomb'){const b=new T.Mesh(SP,mat(0x2a2a38,0,.5));b.scale.setScalar(.24);b.position.y=.24;const l=new T.Mesh(SP,new T.MeshBasicMaterial({color:0xff3b3b}));l.scale.setScalar(.1);l.position.y=.5;const d=F(new T.CircleGeometry(o.R,32),0xff4a3a,.22,1),r=F(new T.RingGeometry(o.R*.93,o.R,40),0xffd0c0,.8,1);d.position.y=.04;r.position.y=.05;m.add(b,l,d,r);o.led=l;o.ring=r}
 else if(o.k=='mine'){const b=new T.Mesh(CY,mat(0x444455,0,.5));b.scale.set(.36,.14,.36);b.position.y=.08;const l=new T.Mesh(SP,new T.MeshBasicMaterial({color:0xff3b3b}));l.scale.setScalar(.12);l.position.y=.2;const r=F(new T.RingGeometry(.9,1,24),0xff6a3a,.35,1);r.position.y=.03;m.add(b,l,r);o.led=l}
 else{const b=new T.Mesh(CY,mat(0x555566,0,.5));b.scale.set(.5,.3,.5);b.position.y=.15;const h=new T.Mesh(BX,mat(0xd0a020,.2,.5));h.scale.set(.5,.35,.5);h.position.y=.45;const br=new T.Group(),g=new T.Mesh(BX,mat(0x333344,0,.5));g.scale.set(.14,.14,.8);g.position.z=.45;br.add(g);br.position.y=.5;const r=F(new T.RingGeometry(.55,.7,20),o.o.team?0xff4a4a:0x37a3ff,.9);r.position.y=.03;m.add(b,h,br,r);o.br=br}
 m.position.set(o.x,0,o.z);gs.add(m);o.m=m;ZN.push(o);VFX.zInit(o);return o}
function LP(u,dt){const l=u.lp;l.t+=dt;VFX.leapTick(u,l,dt);const k=Math.min(1,l.t/l.T);const q=l.s.piper?1-Math.pow(1-k,1.8):k;u.x=l.sx+(l.ex-l.sx)*q;u.z=l.sz+(l.ez-l.sz)*q;u.mvg=0;if(!l.s.piper)u.dir=Math.atan2(l.ez-l.sz,l.ex-l.sx);if(k>=1){u.lp=null;if(l.s.piper){fx(u.x,.3,u.z,0xffffff,10);return}if(l.s.brk)brk(u.x,u.z,l.s.brk,u);nova(u,{r:l.s.r,d:l.s.d,h:0,kb:2.2,slam:1})}}
/* ---------- セイリュウ：変身（ノヴァチェンジ） ----------
   ・必殺技＝ダッシュ(480ダメージ)→アルティメットフォームに変身(7秒)
   ・変身中：移動速度+25%／通常攻撃が剣(扇形130°・1760ダメージ)に変化／与えたダメージの30%を回復
   ・変身後モデルは converter.html のスロット「セイリュウ（変身後）」で登録(GOD['12t'])。未登録なら透明のまま */
/* ---------- セイリュウ：爪痕エフェクト（星竜が爪で引っ掻く） ----------
   先細りの弧を4本、横にさっと描く(描画範囲を伸ばして「引っ掻く動き」にする)。白い芯＋金色の光。当たった敵にも3本の爪痕を残す */
const CLW=[];
function clawGeo(R,w,a0,a1,N){const P=[],I=[];for(let i=0;i<=N;i++){const t=i/N,a=a0+(a1-a0)*t,wd=w*Math.pow(Math.sin(Math.PI*Math.pow(Math.min(.999,Math.max(.001,t)),.7)),.8),ro=R+wd/2,ri=R-wd/2;P.push(Math.sin(a)*ri,0,Math.cos(a)*ri,Math.sin(a)*ro,0,Math.cos(a)*ro);if(i){const k=(i-1)*2;I.push(k,k+1,k+2,k+1,k+3,k+2)}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(P,3));g.setIndex(I);return g}
function clawFx(x,y,z,rotY,tilt,defs,sw,fu){const g=new T.Group(),ti=new T.Group(),mo={transparent:true,depthWrite:false,side:2,blending:T.AdditiveBlending},cm=new T.MeshBasicMaterial({color:0xffffff,...mo}),gm=new T.MeshBasicMaterial({color:0xffc94a,...mo}),parts=[];
 g.position.set(x,y,z);g.rotation.y=rotY;ti.rotation.z=tilt;g.add(ti);
 defs.forEach(([R,w,a0,a1,dz])=>{const N=16,core=new T.Mesh(clawGeo(R,w,a0,a1,N),cm),glow=new T.Mesh(clawGeo(R,w*2.6,a0,a1,N),gm);[core,glow].forEach(m=>{m.position.z=dz||0;m.renderOrder=15;m.geometry.setDrawRange(0,0);ti.add(m)});parts.push({core,glow,N})});
 gs.add(g);CLW.push({g,parts,cm,gm,t:0,sw,fu})}
function clawSwing(u,ang,reach,half){const f=u._cf=!u._cf,defs=[.5,.68,.84,1].map((k,i)=>{const sp=half*(.97-.07*i),R0=(reach-.27)*k;return f?[R0,.2,-sp,sp,0]:[R0,.2,sp,-sp,0]});
 clawFx(u.x,.95,u.z,Math.PI/2-ang,f?.38:-.38,defs,.13,u)}
function clawMark(e,a){clawFx(e.x,1,e.z,Math.PI/2-a+.55,0,[-1,0,1].map(k=>[1.7,.13,-.3,.3,-1.7+k*.3]),.08,null)}
/* ---------- セイリュウ：剣の当たり判定を白い半透明で自動表示（実際の判定＝扇形(射程reach・角度arc)＋足元の円0.9） ---------- */
const SZN=[],SZC=new T.CircleGeometry(.9,24).rotateX(-Math.PI/2);
function swordZone(u,ang,reach,half){const mt=new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.38,depthWrite:false,side:2}),f=new T.Mesh(fanGeo(half*2),mt),c=new T.Mesh(SZC,mt);
 f.position.set(u.x,.06,u.z);f.rotation.y=Math.PI/2-ang;f.scale.set(reach,1,reach);c.position.set(u.x,.06,u.z);f.renderOrder=c.renderOrder=3;gs.add(f,c);SZN.push({f,c,mt,u,t:0})}
function swordZoneUpd(dt){for(let i=SZN.length-1;i>=0;i--){const s=SZN[i];s.t+=dt;if(s.u&&s.u.alive){s.f.position.set(s.u.x,.06,s.u.z);s.c.position.set(s.u.x,.06,s.u.z)}
 const k=s.t<.12?1:Math.max(0,1-(s.t-.12)/.22);s.mt.opacity=.38*k;if(k<=0){gs.remove(s.f,s.c);s.mt.dispose();SZN.splice(i,1)}}}
function clawUpd(dt){swordZoneUpd(dt);for(let i=CLW.length-1;i>=0;i--){const c=CLW[i];c.t+=dt;
 c.parts.forEach((p,k)=>{const q=Math.min(1,Math.max(0,(c.t-k*.016)/c.sw)),n=Math.ceil(q*p.N)*6;p.core.geometry.setDrawRange(0,n);p.glow.geometry.setDrawRange(0,n)});
 const f=c.t<c.sw+.05?1:Math.max(0,1-(c.t-c.sw-.05)/.2);c.cm.opacity=f;c.gm.opacity=f*.55;
 if(c.fu&&c.fu.alive)c.g.position.set(c.fu.x,c.g.position.y,c.fu.z);
 if(f<=0){gs.remove(c.g);c.parts.forEach(p=>{p.core.geometry.dispose();p.glow.geometry.dispose()});c.cm.dispose();c.gm.dispose();CLW.splice(i,1)}}}
function setForm(u,f){const r=u.root,rs=r.rigs||(r.rigs=[r.rig||null,null]);
 if(f&&!rs[1]){const id=u.c.tf.form;if(GOD[id]){try{rs[1]=GO.build(u.body,id)}catch(e){console.error(e)}}}
 if(f&&!rs[1])return;
 if(rs[0]&&rs[0].grp)rs[0].grp.visible=!f;if(rs[1]&&rs[1].grp)rs[1].grp.visible=!!f;
 r.rig=f?rs[1]:rs[0];if(r.rig)r.rig.t=0;u.opa=null;u.body.position.set(0,0,0);u.body.rotation.z=0}
function tfStart(u){if(!u.alive)return;u.tf={t:u.c.tf.t};setForm(u,1);snd('novaForm',u.x,u.z);VFX.tfStart(u);if(u.isP)shake=Math.max(shake,.45)}
function tfEnd(u,quiet){u.tf=null;setForm(u,0);if(!quiet){snd('novaEnd',u.x,u.z);VFX.tfEnd(u)}}
function sword(u,ang){const K=u.c.tf,reach=K.reach,half=K.arc*Math.PI/360;
 snd('sword',u.x,u.z);VFX.slash(u,ang,reach,half);
 swordZone(u,ang,reach,half);clawSwing(u,ang,reach,half);
 u.q.push({t:.09,f:()=>{if(!u.alive)return;let n=0;
  for(const e of U){if(!e.alive||e.team==u.team||e.lp)continue;const dx=e.x-u.x,dz=e.z-u.z,d=Math.hypot(dx,dz),hr=e.c.hr!=null?e.c.hr:.4;if(d>reach+hr)continue;
   if(d>.9){let da=Math.atan2(dz,dx)-ang;da=Math.atan2(Math.sin(da),Math.cos(da));if(Math.abs(da)>half+Math.asin(Math.min(1,hr/d)))continue}
   const dealt=e.rem?K.d:Math.max(0,Math.min(K.d,e.hp));dmg(e,K.d,u,0,1);n++;snd('swordHit',e.x,e.z);VFX.slashHit(e,ang);clawMark(e,ang);
   if(!u.rem&&dealt>0){const h0=u.hp;u.hp=Math.min(u.mx,u.hp+dealt*K.heal);const g=u.hp-h0;if(g>0){u.stt.hl+=g;if(u.team==P0.team)hnum(u,Math.round(g));heal(u)}}}
  if(n&&u.isP)shake=Math.max(shake,.28)}})}
function spc(u,a,s,aimDist){
  if(s.tf){u.dash={t:s.rng/s.dv,a,h:new Set(),d:s.d,v:s.dv,r:s.w/2,tf:1};u.dir=a;u.kn=null;snd('novaDash',u.x,u.z);VFX.dashStart(u,a);return 1}
 if(s.piper){const D=aimDist==null?s.rng:Math.max(1,Math.min(s.rng,aimDist)),p=fpt(u.x,u.z,a,D);snd(u.c.ss,u.x,u.z);u.lp={t:0,T:s.T,sx:u.x,sz:u.z,ex:p.x,ez:p.z,s};u.dir=a+Math.PI;u.dash=null;fx(u.x,.4,u.z,0xffffff,14);VFX.leapStart(u,s);
  [[1.1,0],[-1.1,0],[0,1.1],[0,-1.1]].slice(0,s.n).forEach((o,i)=>{let x=u.x+o[0],z=u.z+o[1];if(hit(x,z,.3)){x=u.x;z=u.z}mkZone({k:'pbomb',x,z,t:s.fuse+i*.06,d:s.d,aoe:s.aoe,br:s.brk,kb:s.kb,R:s.aoe+.4,o:u})});return 1}
 if(s.rv){for(const e of U)if(e.team!=u.team&&e.alive){e.rv=Math.max(e.rv,s.rv);if(e.bf&&e.bf.k=='stealth')e.bf=null}fx(u.x,1,u.z,0x66fff0,24);return 0}
 if(s.buff){u.bf={k:s.buff,t:s.t};snd(u.c.ss,u.x,u.z);fx(u.x,.8,u.z,u.c.bc||0xffffff,24);VFX.buff(u,s.buff);if(s.buff=='guard')for(const e of U)if(e.alive&&e.team==u.team&&e!=u&&!e.bf&&Math.hypot(e.x-u.x,e.z-u.z)<s.r){e.bf={k:'guard',t:s.t};fx(e.x,.8,e.z,0x7aa8ff,10)}return 1}
 if(s.ice){const p=tgt(u,a,s.rng);snd(u.c.ss,p.x,p.z);mkZone({k:'ice',x:p.x,z:p.z,r:s.r,t:s.t,t0:s.t,d:s.d,tk:0,o:u});return 1}
 if(s.oil){snd(u.c.ss,u.x,u.z);const gid=++OID;let n=0;for(let i=0;i<s.oil;i++){const d=s.st+i*s.sp,x=u.x+Math.cos(a)*d,z=u.z+Math.sin(a)*d;if(hit(x,z,.3))break;mkZone({k:'oil',gid,x,z,r:s.r,t:s.t,t0:s.t,d:s.d,ft:s.ft,o:u});n++}if(!n)mkZone({k:'oil',gid,x:u.x,z:u.z,r:s.r,t:s.t,t0:s.t,d:s.d,ft:s.ft,o:u});return 1}
 if(s.zone){const p=tgt(u,a,s.rng);snd(u.c.ss,p.x,p.z);mkZone({k:s.zone,x:p.x,z:p.z,r:s.r,t:s.t,t0:s.t,d:s.d,tk:0,o:u});return 1}
 if(s.mine){snd(u.c.ss,u.x,u.z);for(let i=0;i<s.mine;i++){const m=fpt(u.x,u.z,a+(i-(s.mine-1)/2)*.6,s.rng*(i==1?.55:.9));mkZone({k:'mine',x:m.x,z:m.z,t:s.t,d:s.d,aoe:s.aoe,a:.7,o:u,br:s.brk})}return 1}
 if(s.tur){const p=fpt(u.x,u.z,a,1.6);snd(u.c.ss,p.x,p.z);mkZone({k:'tur',x:p.x,z:p.z,t:s.t,d:s.d,rg:8,fc:.3,o:u});return 1}
 if(s.leap){const p=tgt(u,a,s.rng);u.lp={t:0,T:.6,sx:u.x,sz:u.z,ex:p.x,ez:p.z,s};snd('goeLeap',u.x,u.z);VFX.leapStart(u,s);return 1}
 if(s.chain){if(!chain(u,a,s))u.sup=100;return 1}
 return 0}
function zst(dt){
 for(let i=BL.length-1;i>=0;i--){const l=BL[i];l.t-=dt;l.m.material.opacity=Math.max(0,l.t*3.3);if(l.t<=0){gs.remove(l.m);l.m.material.dispose();BL.splice(i,1)}}
 for(let i=ZN.length-1;i>=0;i--){const q=ZN[i],o=q.o;q.t-=dt;VFX.zTick(q,dt);
  if(q.k=='hole'){q.m.scale.setScalar(Math.min(1,(q.t0-q.t)*4+.15));q.sp.rotation.z+=dt*4;q.tk-=dt;const tk=q.tk<=0;if(tk)q.tk=.4;
   for(const e of U){if(!e.alive||e.team==o.team||e.lp)continue;const dx=q.x-e.x,dz=q.z-e.z,d=Math.hypot(dx,dz);if(d>q.r)continue;if(!e.c.hv&&d>.3){const k=Math.min(d,3*dt);mv(e,dx/d*k,dz/d*k)}if(tk)dmg(e,q.d*.4,o)}}
  else if(q.k=='oil'){q.m.scale.setScalar(Math.min(1,(q.t0-q.t)*5+.2));if(!q.ign)for(const b of B)if(b.o===o&&b.fl&&!b.dead&&Math.hypot(b.x-q.x,b.z-q.z)<q.r+b.z0){snd('ignite',q.x,q.z);for(const z of ZN)if(z.k=='oil'&&z.gid==q.gid&&!z.ign){z.ign=1;z.t=0;mkZone({k:'fire',x:z.x,z:z.z,r:z.r,t:z.ft,t0:z.ft,d:z.d,tk:0,o})}break}}
  else if(q.k=='ice'){const sc=Math.min(1,(q.t0-q.t)*5+.2);q.m.scale.setScalar(sc);const fd=Math.min(1,q.t*1.2);q.mat.opacity=(.25+.08*Math.sin(tm*5))*fd;q.mat2.opacity=.72*fd;q.sp.rotation.z+=dt*.6;q.tk-=dt;const tick=q.tk<=0;if(tick)q.tk=.5;
   for(const e of U)if(e.alive&&e.team!=o.team&&!e.lp&&Math.hypot(e.x-q.x,e.z-q.z)<q.r){e.oi=.2;addFrost(e,.126*dt);if(tick)dmg(e,q.d*.5,o,1)}}
  else if(q.k=='ants'){q.mat.opacity=.2+.07*Math.sin(tm*6);for(const e of U)if(e.alive&&e.team!=o.team&&!e.lp&&Math.hypot(e.x-q.x,e.z-q.z)<q.r){e.sl=Math.max(e.sl,.25);q.tk-=dt;if(q.tk<=0){q.tk=.6;dmg(e,q.d||150,o)}}}
  else if(q.k=='fire'){if(q.d){q.tk-=dt;if(q.tk<=0){q.tk=.4;for(const e of U)if(e.alive&&e.team!=o.team&&!e.lp&&Math.hypot(e.x-q.x,e.z-q.z)<q.r)dmg(e,q.d,o)}}const f=Math.min(1,q.t*1.2);q.mat.opacity=.6*f;q.mat2.opacity=.7*f;q.m.scale.setScalar(.92+Math.sin(tm*14+q.x*3)*.08);for(const e of U)if(e.alive&&e.team!=o.team&&!e.lp&&Math.hypot(e.x-q.x,e.z-q.z)<q.r)burn(e,o)}
  else if(q.k=='pbomb'){q.led.scale.setScalar(.1+.05*Math.sin(tm*40));q.ring.material.opacity=.5+.4*Math.sin(tm*30);if(q.t<=0&&!q.bm){q.bm=1;boom({x:q.x,z:q.z,o,aoe:q.aoe,d:q.d,br:q.br,kb:q.kb})}}
  else if(q.k=='mine'){q.a-=dt;q.m.visible=o.team==0||Math.hypot(q.x-P0.x,q.z-P0.z)<3.5;q.led.scale.setScalar(.12+.04*Math.sin(tm*8));if(q.a<=0)for(const e of U)if(e.alive&&e.team!=o.team&&!e.lp&&Math.hypot(e.x-q.x,e.z-q.z)<1.05){boom({x:q.x,z:q.z,o,aoe:q.aoe,d:q.d,br:q.br});q.t=0;break}}
  else if(q.k=='tur'){q.fc-=dt;let b=null,bd=q.rg;for(const e of U){if(!e.alive||e.team==o.team||e.lp||!vis(e,{x:q.x,z:q.z}))continue;const d=Math.hypot(e.x-q.x,e.z-q.z);if(d<bd){bd=d;b=e}}
   if(b){const a=Math.atan2(b.z-q.z,b.x-q.x);q.br.rotation.y=Math.PI/2-a;if(q.fc<=0){q.fc=.2;bul(o,{d:q.d,v:24,rng:q.rg+1,size:.15},a+(rnd()-.5)*.12,q.x,q.z);snd('pistol',q.x,q.z)}}}
  if(q.t<=0){gs.remove(q.m);disposeCharacterRoot(q.m);ZN.splice(i,1)}}}
function ai(u,dt){u.at-=dt;u.cd-=dt;u.pt-=dt;
 if(u.at<=0){u.at=.35+Math.random()*.3;u.st=Math.random()<.5?1:-1;u.en=near(u,u.c.a.rng);let bg=99;u.gx=MX+(Math.random()-.5)*2;u.gz=MZ+(u.team?-1.5:1.5);
  for(const q of G){const d=Math.hypot(q.x-u.x,q.z-u.z);if(d<bg){bg=d;u.gx=q.x;u.gz=q.z}}
  if(tg[u.team]>=10&&u.gems>0){u.gx=MX;u.gz=u.team?SPZ.t+.5:SPZ.b-.5}if(KO)koGoal(u)}
 let mx=u.gx-u.x,mz=u.gz-u.z;const e=u.en;
 if(e&&e.alive){const dx=e.x-u.x,dz=e.z-u.z,d=Math.hypot(dx,dz)||1,rg=u.tf?u.c.tf.reach:u.c.a.rng;
  if(d<rg+1.5){const k=d>rg*.7?1:(d<rg*.4&&u.c.id!=2&&u.c.id!=12?-1:0);mx=dx/d*k-dz/d*u.st*.7;mz=dz/d*k+dx/d*u.st*.7;
   if(u.cd<=0&&(d<rg||(u.sup>=100&&useSup(u,d)))){const a=Math.atan2(dz,dx)+(Math.random()-.5)*.14;u.cd=Math.min(.3+Math.random()*.3,(u.c.ad||.6)+Math.random()*.1);if(u.sup>=100&&useSup(u,d))atk(u,u.c.s.piper?a+Math.PI:a,1,u.c.s.piper?null:d);else if(d<rg)atk(u,a,0,d)}}}
 if(u.pt<=0){u.pt=.5;if(Math.hypot(u.x-u.pk.x,u.z-u.pk.z)<.15&&Math.hypot(mx,mz)>.3){u.rn=.9;u.ra=Math.random()*6.28}u.pk={x:u.x,z:u.z}}
 if(u.rn>0){u.rn-=dt;mx=Math.cos(u.ra);mz=Math.sin(u.ra)}
 const l=Math.hypot(mx,mz);let vx=0,vz=0;if(l>.2){const s=spd(u)*.92;vx=mx/l*s;vz=mz/l*s;u.mvg=1;if(u.fa<=0)u.dir=Math.atan2(mz,mx)}drive(u,dt,vx,vz)}


 tleft-=dt;if(MPG.on)tleft=MPG.left();gt-=dt;if(gt<=0){gt=5;if(G.length<22&&(!MPG.on||MPG.isHost()))sg(MX,MZ)}
 tg=[0,0];for(const u of U){tg[u.team]+=u.gems}
 for(let t=0;t<2;t++){if(tg[t]>=10){if(cdv[t]==null){cdv[t]=cdk[t];msg(t?'敵がカウントダウン開始！':'カウントダウン開始！',1500)}cdv[t]-=dt;cdk[t]=cdv[t];if(cdv[t]<=0){if(!MPG.on)return end(t);if(MPG.reqEnd(t))return;cdv[t]=.001;cdk[t]=.001}}else cdv[t]=null}
 const pn=cdv[0]!=null||cdv[1]!=null;if(pn!=!!step.pn){if(!pn||mpHas('panic')){step.pn=pn;bgm(pn?'panic':'ame',pn?.6:.5)}}
 if(tleft<=0){const w=tg[0]>tg[1]?0:tg[1]>tg[0]?1:-1;if(!MPG.on)return end(w);if(MPG.reqEnd(w))return;tleft=.001}
 }
 for(const u of U){
  if(!u.alive){if(u.rem||KO)continue;u.rt-=dt;if(u.rt<=0){const s=spawn(u.team,u.si);u.x=s.x;u.z=s.z;u.hp=u.mx;u.ammo=3;u.alive=true;u.root.visible=true}continue}
  u.mvg=0;u.sl-=dt;u.fz-=dt;u.oi=(u.oi||0)-dt;if(u.fz>0&&u.fzF)u.frost=Math.max(0,u.fz/FZT);else{if(u.fzF&&u.fz<=0){u.fzF=0;u.frost=0}u.fq=(u.fq||0)-dt;if(u.fq<=0)u.frost=Math.max(0,(u.frost||0)-dt*.05)}if(u.bf){u.bf.t-=dt;if(u.bf.t<=0)u.bf=null}if(u.tf){u.tf.t-=dt;if(u.tf.t<=0)tfEnd(u);else VFX.tfTick(u,dt)}u.ice.visible=u.fz>0;u.shd.visible=!!(u.bf&&u.bf.k=='guard');VFX.auraTick(u,dt);if(u.bn>0){u.bn-=dt;if(!u.rem){u.hp-=180*dt;if(u.bo&&u.bo.stt&&!u.bo.rem)u.bo.stt.dm+=180*dt;u.lh=0;if(u.bo&&!u.bo.rem)u.bo.sup=Math.min(100,u.bo.sup+180*dt*chr(u.bo.c))}u.bq=(u.bq||0)-dt;if(u.bq<=0){u.bq=.12;fx(u.x,.9,u.z,0xff8a2b,1)}if(u.hp<=0&&!u.rem){if(u.bo&&u.bo!==u&&u.bo.stt)u.bo.stt.k++;die(u,u.bo);continue}}u.fa-=dt;u.rv-=dt;u.vf=Math.max(0,(u.vf||0)-dt);u.lh+=dt;u.rc=Math.max(0,u.rc-dt);if(!u.rem&&u.hp<u.mx&&u.lh>(u.c.rgd||3)){u.hq=(u.hq||0)-dt;if(u.hq<=0){u.hq=1;const hv=Math.min(u.mx-u.hp,Math.round(u.mx*.13));u.hp+=hv;for(let i=0;i<4;i++)heal(u);healSnd(u);if(u.team==P0.team)hnum(u,Math.round(hv))}}else u.hq=0;
  u.acd=(u.acd||0)-dt;if(u.c.a.en)enUpd(u,dt);else if(!u.rem)u.ammo=Math.min(3,u.ammo+dt/u.c.rl);
  for(const q of u.q){q.t-=dt;if(q.t<=0){q.f();q.done=1}}u.q=u.q.filter(q=>!q.done);
  if(u.fl>0){u.fl-=dt;if(u.fl<=0)unf(u)}
  if(u.lp)LP(u,dt);else if(u.kn)KN(u,dt);else if(u.fz>0){u.mvg=0;u.dash=null}else if(u.dash){const d=u.dash;d.t-=dt;const s=d.v*dt,ox=u.x,oz=u.z,dx=Math.cos(d.a)*s,dz=Math.sin(d.a)*s;mv(u,dx,dz);if(d.ants){if(Math.abs(u.x-ox)<Math.abs(dx)*.5)d.a=Math.PI-d.a;if(Math.abs(u.z-oz)<Math.abs(dz)*.5)d.a=-d.a}u.mvg=1;u.dir=d.a;if(d.ants){d.at-=dt;if(d.at<=0){d.at=.12;mkZone({k:'ants',x:u.x,z:u.z,r:1.15,t:4,t0:4,d:150,tk:.6,o:u})}}
   for(const e of U)if(e.team!=u.team&&e.alive&&!d.h.has(e)&&Math.hypot(e.x-u.x,e.z-u.z)<(d.r||1.3)){d.h.add(e);dmg(e,d.d,u);knock(e,Math.atan2(e.z-u.z,e.x-u.x),1,1)}
   if(d.t<=0){if(d.piper){for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4;boom({x:u.x+Math.cos(a)*1.25,z:u.z+Math.sin(a)*1.25,o:u,aoe:1.45,d:900,br:d.s.brk})}}u.dash=null;fx(u.x,.3,u.z,0xff8a2b,20);if(d.tf)tfStart(u)}}
  else if(u.isP){let x=jv.x,z=jv.z;if(kb.a||kb.arrowleft)x-=1;if(kb.d||kb.arrowright)x+=1;if(kb.w||kb.arrowup)z-=1;if(kb.s||kb.arrowdown)z+=1;if(KR.lock){x=0;z=0}
   const l=Math.hypot(x,z);let vx=0,vz=0;if(l>.12){const k=Math.min(1,l)/l*spd(u);vx=x*k;vz=z*k;u.mvg=1;if(u.fa<=0)u.dir=Math.atan2(z,x)}drive(u,dt,vx,vz)}
  else if(!u.rem){if(KR.lock)drive(u,dt,0,0);else ai(u,dt)}
  if(u.rem&&!u.lp&&!u.dash)MPG.move(u,dt);
  if(u.c.cg&&u.mvg)u.sup=Math.min(100,u.sup+u.c.cg*dt);if(u.bf&&u.bf.k=='blaze'&&u.mvg){u.tt=(u.tt||0)-dt;if(u.tt<=0){u.tt=.14;mkZone({k:'fire',x:u.x,z:u.z,r:.95,t:2.6,t0:2.6,o:u});scorch(u.x,u.z,u.c.s.bu||1.1,0,u)}}u.root.position.set(u.x,u.lp?Math.sin(Math.PI*Math.min(1,u.lp.t/u.lp.T))*(u.lp.s.ah||2.4):0,u.z);
  const tr=Math.PI/2-u.dir;let df=tr-u.mdl.rotation.y;df=Math.atan2(Math.sin(df),Math.cos(df));u.mdl.rotation.y+=df*Math.min(1,dt*14);
  const visible=u.team==0||vis(u,P0);u.root.visible=visible;
  if(u.root.rig)GO.tick(u.root.rig,u,dt,visible);else{u.body.position.y=u.mvg?Math.abs(Math.sin(tm*11))*.1:0;u.body.position.z=-u.rc*1.6;u.body.rotation.z=u.mvg?Math.sin(tm*11)*.06:0}
  if(visible){const r=Math.max(0,u.hp/u.mx);u.fg.scale.x=1.1*r;u.hb.quaternion.copy(cam.quaternion)}
  {/* ブッシュの中に入っているキャラは半透明(本家と同じ)。ステルス中はさらに薄く。0.15秒ほどでふわっと切り替わる */const tg=(u.bf&&u.bf.k=='stealth')?.45:(visible&&u.alive&&inBush(u.x,u.z))?.6:1;let o=u.op==null?1:u.op;if(o!=tg){o+=(tg-o)*Math.min(1,dt*12);if(Math.abs(tg-o)<.02)o=tg}if(o!==u.opa)setOp(u,o)}if(visible){if(u.gl!=u.gems){u.gl=u.gems;u.gsp.visible=u.gems>0;if(u.gems){u.gsp.material.map=gsp(u.gems,u.gsp.material.map);u.gsp.material.needsUpdate=true}}nbUpd(u)}
  if(!u.rem)for(let i=G.length-1;i>=0;i--){const q=G[i];if(Math.hypot(q.x-u.x,q.z-u.z)<.85){u.gems++;snd('gem',u.x,u.z);gs.remove(q.m);if(q.m.children[4]&&q.m.children[4].material)q.m.children[4].material.dispose();G.splice(i,1);fx(u.x,1,u.z,0xd08aff,6);if(MPG.on)MPG.claim(q,u)}}}
 for(const q of G){let nx=q.x+q.vx*dt,nz=q.z+q.vz*dt;if(solid(nx,q.z))q.vx*=-.4;else q.x=nx;if(solid(q.x,nz))q.vz*=-.4;else q.z=nz;q.vx*=1-3*dt;q.vz*=1-3*dt;q.m.position.set(q.x,.5+Math.sin(tm*3+q.o)*.08,q.z);q.m.rotation.y+=dt*2}
 for(const b of B){if(b.ac&&!b.lob){const k=Math.max(0,Math.min(1,1-b.l/b.s0)),v=b.ac[0]+(b.ac[1]-b.ac[0])*Math.pow(k,b.ac[2]),m0=Math.hypot(b.vx,b.vz)||1;b.vx*=v/m0;b.vz*=v/m0}const sp=Math.hypot(b.vx,b.vz)*dt;b.x+=b.vx*dt;b.z+=b.vz*dt;b.l-=sp;b.m.position.x=b.x;b.m.position.z=b.z;VFX.bTick(b,dt);
  if(b.lob){const k=1-Math.max(0,b.l)/b.s0;b.m.position.y=1+Math.sin(Math.PI*k)*(.6+Math.min(2.6,b.s0*.34));b.m.userData.pv.rotation.x+=dt*(b.big?5:12);if(b.mk){b.mk.userData.f.scale.set(Math.max(.05,k),1,Math.max(.05,k));b.mk.children[1].material.opacity=.65+.3*Math.sin(tm*14)}if(b.l<=0){b.x=b.tx;b.z=b.tz;b.a=Math.atan2(b.vz,b.vx);b.dead=1;if(b.can)canLand(b);else boom(b)}continue}if(b.l<=0){b.dead=1;VFX.bEnd(b,0);continue}if(b.brk&&!b.gh&&bsolid(b.x,b.z))brk(b.x,b.z,b.brk,b.o);if(b.star)b.m.rotation.y+=dt*(b.big?16:22);if(b.cone&&Math.random()<dt*40)fx(b.x,.9,b.z,0xd8f8ff,1);if(b.rp>0&&!b.lob){const k=Math.max(0,Math.min(1,1-b.l/b.s0)),g=.55+.95*k;b.m.scale.set(b.z0*g,b.z0*g,b.z0*1.4*g)}if(b.cloud){const k=Math.max(0,Math.min(1,1-b.l/b.s0)),c=(.8+.5*k)*(1+.05*Math.sin(tm*25));b.m.scale.set(c,c,c*(1+k*1.1));if(Math.random()<dt*(20+60*k))fx(b.x,.9,b.z,0xffffff,1)}if(b.fl)b.m.scale.setScalar(b.z0*(1+(1-Math.max(0,b.l)/b.s0)*1.3));if(!b.gh&&bsolid(b.x,b.z)){if(b.bn>0){b.bn--;const px=b.x-b.vx*dt,pz=b.z-b.vz*dt,sx=bsolid(b.x,pz),sz=bsolid(px,b.z);if(sx||!sz)b.vx*=-1;if(sz||!sx)b.vz*=-1;b.x=px;b.z=pz;b.m.rotation.y=Math.PI/2-Math.atan2(b.vz,b.vx);VFX.bEnd(b,1)}else{b.dead=1;VFX.bEnd(b,1);continue}}
  for(const e of U){if(!e.alive||e.lp||b.h.has(e)||e==b.o)continue;const al=e.team==b.o.team;if(al&&!b.hl)continue;if(Math.hypot(e.x-b.x,e.z-b.z)<b.r+(e.c.hr!=null?e.c.hr:.4)){b.h.add(e);if(al){const b0=e.hp;if(e.rem){if(b.o&&!b.o.rem&&b.o.stt)b.o.stt.hl+=Math.max(0,Math.min(e.mx-e.hp,b.d*1.2))}else{e.hp=Math.min(e.mx,e.hp+b.d*1.2);if(b.o&&b.o.stt)b.o.stt.hl+=e.hp-b0}heal(e);heal(e);VFX.bHit(b,e,1)}else{VFX.bHit(b,e,0);if(b.brn)burn(e,b.o);dmg(e,b.d*(1+(b.s0-b.l)/b.s0*b.rp),b.o,0,1);if(b.fr&&e.alive){addFrost(e,b.fr);fx(e.x,1,e.z,0xbff6ff,5)}if(b.kb&&e.alive&&!e.c.hv&&!b.grp.has(e)){b.grp.add(e);KQ.push([e,Math.atan2(b.vz,b.vx),b.kb])}}if(!b.p){b.dead=1;break}}}}
 for(const[q,a,d]of KQ)if(q.alive)kback(q,a,d);KQ.length=0;
 B=B.filter(b=>{if(b.dead){gs.remove(b.m);if(b.lob)b.m.traverse(c=>{if(c.material&&c.material!==OL)c.material.dispose()});if(b.mk){gs.remove(b.mk);b.mk.children.forEach(c=>c.material.dispose())}}return!b.dead});
 for(let i=FX.length-1;i>=0;i--){const f=FX[i];f.t-=dt;f.vy-=12*dt;f.m.position.x+=f.vx*dt;f.m.position.y=Math.max(.05,f.m.position.y+f.vy*dt);f.m.position.z+=f.vz*dt;f.m.material.opacity=f.t*2;if(f.t<=0){gs.remove(f.m);f.m.material.dispose();FX.splice(i,1)}}zst(dt);clawUpd(dt);dyUpd(dt);byUpd(dt);VFX.update(dt);
 hud()}
function hud(){if(KO)koHud();const p=P0,gb=String(tg[0]),gr=String(tg[1]);if(HUDUI.gb.textContent!==gb)HUDUI.gb.textContent=gb;if(HUDUI.gr.textContent!==gr)HUDUI.gr.textContent=gr;
 for(let i=0;i<HUDUI.bb.length;i++){const on=tg[0]>i;if(HUDUI.bb[i].classList.contains('l')!==on)HUDUI.bb[i].classList.toggle('l',on)}
 for(let i=0;i<HUDUI.br.length;i++){const on=tg[1]>i;if(HUDUI.br[i].classList.contains('l')!==on)HUDUI.br[i].classList.toggle('l',on)}
 const m=Math.max(0,Math.ceil(tleft)),clock=Math.floor(m/60)+':'+String(m%60).padStart(2,'0');if(HUDUI.clock.textContent!==clock)HUDUI.clock.textContent=clock;
 const c=cdv[0]!=null?['💎 '+Math.ceil(cdv[0]),'#7ad8ff']:cdv[1]!=null?['⚠ 敵 '+Math.ceil(cdv[1]),'#ff7a6a']:['',''];if(HUDUI.cdb.textContent!==c[0])HUDUI.cdb.textContent=c[0];if(HUDUI.cdb.style.color!==c[1])HUDUI.cdb.style.color=c[1];
 const ready=p.sup>=100;if(hud.supValue!==p.sup){HUDUI.sup.style.setProperty('--sp',Math.max(0,Math.min(100,p.sup)).toFixed(1));hud.supValue=p.sup}if(HUDUI.sup.classList.contains('rdy')!==ready)HUDUI.sup.classList.toggle('rdy',ready);if(ready&&!hud.r&&!sfx('ur',1))snd('sup');hud.r=ready;
 for(let i=0;i<HUDUI.ammo.length;i++){const f=Math.max(0,Math.min(1,p.ammo-i)),pe=p.c.a.en&&f>0&&f<.999,filled=f>=.999,bg=pe?`linear-gradient(90deg,#ffd23f ${f*100}%,#fff4 ${f*100}%)`:'';if(HUDUI.ammo[i].classList.contains('f')!==filled)HUDUI.ammo[i].classList.toggle('f',filled);if(hud.ammoBg[i]!==bg){HUDUI.ammo[i].style.background=bg;hud.ammoBg[i]=bg}}}
hud.ammoBg=[];
/* ================= 試合終了 → 結果画面 → ホームへ戻る ================= */
function end(w){if(state=='end')return;state='end';bgm(null);RS.w=w;RS.t=0;RS.ph=0;aim.on=0;HOLD.on=0;try{jEnd()}catch(e){}msg(w==0?'勝利！':w==1?'敗北':'引き分け',1100)}
/* 結果画面用の3Dシーン（バトルのキャラをそのまま並べ直して使う） */
const rsn=new T.Scene(),rc=new T.PerspectiveCamera(30,1.78,.1,80),RS={ph:0,t:0,t2:0,w:0,sx:.5,tx:.5,L:[[],[]],P:[[],[]],st:['',''],cv:null,tex:null,dirty:0,lf:0};
/* 照明の強さ（リザルト画面のキャラが眩しい時はここを下げる）。バトル中の照明は 環境1.05/半球.5/直射1.2 */
const RESL={a:.8,h:.38,d:.75};
rsn.add(new T.AmbientLight(0x9a8ad8,RESL.a),new T.HemisphereLight(0xb8a0ff,0x302040,RESL.h));
{const l=new T.DirectionalLight(0xfff0e0,RESL.d);l.position.set(3,8,12);rsn.add(l)}
const RIC={
 gun:'<svg viewBox="0 0 32 32"><path d="M3 8h19l4 4h4v6h-5l-1.5 8h-6l1.5-8H3z" fill="#8fc4ff" stroke="#0a1840" stroke-width="2" stroke-linejoin="round"/><rect x="6" y="19" width="9" height="7" rx="2" fill="#ff9a2e" stroke="#0a1840" stroke-width="2"/><rect x="6" y="11" width="9" height="3" rx="1.5" fill="#fff" opacity=".75"/></svg>',
 skull:'<svg viewBox="0 0 32 32"><path d="M16 3C9.9 3 5 7.4 5 13.2c0 3.3 1.5 5.6 3.5 7V27h15v-6.8c2-1.4 3.5-3.7 3.5-7C27 7.4 22.1 3 16 3z" fill="#fff" stroke="#0a1840" stroke-width="2" stroke-linejoin="round"/><circle cx="11.5" cy="14" r="3" fill="#0a1840"/><circle cx="20.5" cy="14" r="3" fill="#0a1840"/><path d="M14 20h4l-2 3z" fill="#0a1840"/><path d="M12 27v-3M16 27v-3M20 27v-3" stroke="#0a1840" stroke-width="1.6"/></svg>',
 dmg:'<svg viewBox="0 0 32 32"><path d="M16 2l3.4 7.2 7.8-1.6-3 7.4 6.3 4.7-7.9.9-.9 7.9L16 22.6l-5.7 4.9-.9-7.9-7.9-.9 6.3-4.7-3-7.4 7.8 1.6z" fill="#ffd23f" stroke="#0a1840" stroke-width="2" stroke-linejoin="round"/></svg>'};
const resHH=16*Math.tan(15*Math.PI/180);   /* 距離16・縦FOV30° のときの画面半分の高さ(ワールド単位) */

function resShow(){
 RS.ph=1;RS.t2=0;RS.lf=0;const w=RS.w;
 $('#msg').style.opacity=0;$('#hud').hidden=true;$('#vs').hidden=true;
 /* キャラを結果シーンへ移す（頭上バー・名前・リング等は外す） */
 U.forEach(u=>{[u.hb,u.nb,u.gsp,u.ice,u.shd,u.root.rg,u.root.dk].forEach(o=>{if(o&&o.parent)o.parent.remove(o)});try{unf(u);setOp(u,1)}catch(e){}u.root.visible=true;rsn.add(u.root)});
 RS.L=[0,1].map(t=>U.filter(u=>u.team==t).reverse());   /* 表示順はカットインと同じ（自分が一番右） */
 RS.st=[0,1].map(t=>w<0?'draw':w==t?'win':'lose');
 RS.tx=w==0?.6:w==1?.4:.5;RS.sx=.5;
 /* MVP（勝った側の最高スコア）/ 与ダメージNo.1 / 回復量No.1 */
 let mvp=null,dmx=null,hlx=null,best=-1e9;
 U.forEach(u=>{const s=u.stt;if(s.dm>0&&(!dmx||s.dm>dmx.stt.dm))dmx=u;if(s.hl>0&&(!hlx||s.hl>hlx.stt.hl))hlx=u;
  if(w>=0&&u.team==w){const sc=s.k*3000+s.dm+s.hl*.6-s.d*1500;if(sc>best){best=sc;mvp=u}}});
 /* ネームプレート */
 const P=$('#rp');P.innerHTML='';RS.P=[[],[]];
 RS.L.forEach((a,t)=>a.forEach((u,j)=>{const s=u.stt,el=document.createElement('div'),tags=[u===dmx?'与ダメージNo.1':'',u===hlx?'回復量No.1':''].filter(Boolean);
  el.className='rp'+(u.isP?' me':'');el.style.setProperty('--d',(.25+(t?.35:0)+j*.1)+'s');
  el.innerHTML=(u===mvp?'<div class="rpm tx">MVP</div>':'')+
   `<div class="rpb"><div class="rpn tx"${u.ncol?` style="color:${u.ncol}"`:''}>${String(u.pn).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';')}</div><div class="rpg"><div class="rpc">${RIC.gun}<b class="tx">${s.k}</b></div><div class="rpc">${RIC.skull}<b class="tx">${s.d}</b></div></div><div class="rpc rpd">${RIC.dmg}<b class="tx">${Math.round(s.dm)}</b></div></div>`+
   (tags.length?`<div class="rpt tx">${tags.join('<br>')}</div>`:'');
  P.append(el);RS.P[t][j]=el}));
 /* タイトル・トロフィー */
 $('#et').textContent=w==0?'勝利！':w==1?'敗北':'引き分け';
 try{const t=trophyResult(w);$('#etr').innerHTML=`<i class="tri"></i> ${t.o} → ${t.n}（${t.d>=0?'+':''}${t.d}）`+(t.r1>t.r0?`<br>🎉 ランクアップ！ ランク${t.r1}`:'')}catch(e){console.error(e);$('#etr').textContent=''}
 $('#end').hidden=false;
 resLayout();
 /* BGM：勝ち=win.mp3 / 負け・引き分け=make.mp3（無ければ従来の合成音） */
 const bn=w==0?'win':'make';if(mpHas(bn))bgm(bn,.85);else snd(w==0?'win':'lose')}

/* キャラの大きさ・位置、プレートの位置、背景を画面サイズに合わせて決める */
function resLayout(){
 const W=AW,H=AH,hh=resHH,wpp=2*hh/H,CY=1.5,tx=RS.tx;
 rc.aspect=W/H;rc.updateProjectionMatrix();rc.position.set(0,CY,16);rc.lookAt(0,CY,0);
 const cw=1024,ch=Math.max(256,Math.round(cw*H/W));
 if(!RS.cv||RS.cv.height!=ch){RS.cv=document.createElement('canvas');RS.cv.width=cw;RS.cv.height=ch;if(RS.tex)RS.tex.dispose();RS.tex=new T.CanvasTexture(RS.cv);RS.tex.encoding=T.sRGBEncoding;RS.tex.minFilter=RS.tex.magFilter=T.LinearFilter;RS.tex.generateMipmaps=false;rsn.background=RS.tex}
 RS.dirty=1;
 const rg=[[.012,tx-.012],[tx+.012,.988]];   /* 左=自チーム(青) 右=相手(赤)。勝った側ほど広い */
 [0,1].forEach(t=>{
  const a=rg[t][0]*W,sl=(rg[t][1]-rg[t][0])*W/3,st=RS.st[t],pw=Math.min(sl*.94,H*.33);
  RS.L[t].forEach((u,j)=>{
   const cx=a+sl*(j+.5),r=u.root,m=u.mdl,lie=st=='lose';
   /* 勝ち/引き分け＝正面向きで立つ　負け＝横になって倒れる */
   m.rotation.set(0,lie?(j%2?.35:-.3):(t?[.4,-.05,-.5]:[.5,.05,-.4])[j],lie?(j%2?-1:1)*Math.PI/2:0);
   r.rotation.set(0,0,0);r.scale.setScalar(1);r.position.set(0,0,0);r.updateMatrixWorld(true);
   if(r.rig)GO.tick(r.rig,null,0);
   let bb=new T.Box3().setFromObject(r);const bw=Math.max(.1,bb.max.x-bb.min.x),bh=Math.max(.1,bb.max.y-bb.min.y);
   const hT=(lie?.26:st=='win'?.36:.32)*H*wpp,s=Math.min(hT/bh,sl*(lie?1.06:.95)*wpp/bw);
   r.scale.setScalar(s);r.updateMatrixWorld(true);bb=new T.Box3().setFromObject(r);
   u.rb={s,lx:(bb.min.x+bb.max.x)/2/s,ly:bb.min.y/s,x:(cx-W/2)*wpp,y:CY+(H/2-H*.6)*wpp};
   r.position.set(u.rb.x-u.rb.lx*s,u.rb.y-u.rb.ly*s,0)});
  RS.P[t].forEach((el,j)=>{el.style.left=(a+sl*(j+.5)-pw/2)+'px';el.style.top=(H*.625)+'px';el.style.width=pw+'px'})});
 resBG(RS.sx)}

/* 背景：左=青 右=赤 の斜めの境目（sx=境目の位置）。負けた側は少し暗く */
function resBG(sx){
 const cv=RS.cv,x=cv.getContext('2d'),w=cv.width,h=cv.height,xt=(sx+.04)*w,xb=(sx-.04)*w;
 let gr=x.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#3a93ff');gr.addColorStop(.6,'#1d62ea');gr.addColorStop(1,'#163fb8');x.fillStyle=gr;x.fillRect(0,0,w,h);
 gr=x.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#ee4422');gr.addColorStop(1,'#b3180f');x.fillStyle=gr;
 const poly=(pts)=>{x.beginPath();pts.forEach((p,i)=>x[i?'lineTo':'moveTo'](p[0],p[1]));x.closePath()};
 const L=[[0,0],[xt,0],[xb,h],[0,h]],Rr=[[xt,0],[w,0],[w,h],[xb,h]];
 poly(Rr);x.fill();
 /* 斜めの光の筋 */
 [L,Rr].forEach(pg=>{x.save();poly(pg);x.clip();x.fillStyle='rgba(255,255,255,.07)';[.05,.27,.46,.68,.86].forEach((c,i)=>{const o=.13*w,fw=(i%2?.045:.08)*w;poly([[c*w+o,0],[c*w+o+fw,0],[c*w-o+fw,h],[c*w-o,h]]);x.fill()});x.restore()});
 /* 負けた側を暗く */
 [0,1].forEach(t=>{if(RS.st[t]=='lose'){x.fillStyle='rgba(0,0,30,.22)';poly(t?Rr:L);x.fill()}});
 x.strokeStyle='rgba(255,255,255,.85)';x.lineWidth=h*.012;x.beginPath();x.moveTo(xt,0);x.lineTo(xb,h);x.stroke();
 RS.tex.needsUpdate=true}

/* 毎フレーム：境目スライド → キャラがポップイン → 勝った側は元気に弾む */
function resStep(dt){
 RS.t2+=dt;const t=RS.t2,k=Math.min(1,t/.5);
 if(k<1||RS.dirty){RS.sx=.5+(RS.tx-.5)*(1-Math.pow(1-k,3));resBG(RS.sx);RS.dirty=0}
 for(let tt=0;tt<2;tt++)RS.L[tt].forEach((u,j)=>{
  const r=u.root,b=u.rb,st=RS.st[tt];if(!b)return;
  const d=.2+(tt?.3:0)+j*.1,p=Math.max(0,Math.min(1,(t-d)/.4)),c1=1.70158,c3=c1+1,e=p<=0?0:1+c3*Math.pow(p-1,3)+c1*Math.pow(p-1,2),sc=b.s*Math.max(.001,e);
  r.visible=p>0;r.scale.setScalar(sc);
  const by=st=='win'&&p>=1?Math.abs(Math.sin(t*4.2+j*1.1))*.05*resHH:0;
  r.position.set(b.x-b.lx*sc,b.y-b.ly*sc+by,0);
  if(st!='lose'&&r.rig&&p>0)GO.tick(r.rig,null,dt)});
 R.render(rsn,rc)}

/* ---------- 「終了」→ ホーム（ページを再読み込みせずに世界を元に戻す） ---------- */
let W0=null;
function snapWorld(){   /* 最初のバトル開始前に、壊れる壁・ブッシュの初期状態を保存 */
 W0={g:g.map(r=>r.slice()),dm:Object.assign({},DM),ms:[],bm:BM.instanceMatrix.array.slice(),bs:BS.instanceMatrix.array.slice()};
 for(const k in DM)(DM[k].ins||[]).forEach(([m])=>{if(!W0.ms.some(e=>e.m===m))W0.ms.push({m,a:m.instanceMatrix.array.slice()})})}
function clearField(){
 B.forEach(b=>{gs.remove(b.m);if(b.mk)gs.remove(b.mk)});B=[];
 G.forEach(q=>{gs.remove(q.m);if(q.m.children[4]&&q.m.children[4].material)q.m.children[4].material.dispose()});G=[];
 FX.forEach(f=>{gs.remove(f.m);if(f.m.material)f.m.material.dispose()});FX=[];
 ZN.forEach(q=>{gs.remove(q.m);disposeCharacterRoot(q.m)});ZN.length=0;
 BL.forEach(l=>gs.remove(l.m));BL.length=0;
 HF.forEach(h=>{gs.remove(h.s);if(h.n&&h.s.material.map)h.s.material.map.dispose();if(h.s.material)h.s.material.dispose()});HF.length=0;
 NV.forEach(n=>{gs.remove(n.m);disposeCharacterRoot(n.m)});NV.length=0;
 VFX.reset();SY.length=0;DY.length=0;KQ.length=0;
 if(W0){
  W0.g.forEach((r,i)=>{g[i]=r.slice()});
  for(const k in DM)delete DM[k];Object.assign(DM,W0.dm);
  W0.ms.forEach(e=>{e.m.instanceMatrix.array.set(e.a);e.m.instanceMatrix.needsUpdate=true});
  for(const k in DM){const o=DM[k].obj;if(o){o.scale.setScalar(1);if(!o.parent)gs.add(o)}}
  BM.instanceMatrix.array.set(W0.bm);BM.instanceMatrix.needsUpdate=true;BS.instanceMatrix.array.set(W0.bs);BS.instanceMatrix.needsUpdate=true;bush.forEach(b=>{b.f=0;b.dead=0})}
 bp.material.opacity=0;bp.visible=false;}
function resetWorld(){
 U.forEach(u=>{if(u.root.parent)u.root.parent.remove(u.root);disposeUnit(u)});U=[];
 clearField();
 if(aim.m)gs.remove(aim.m);if(aim.f)gs.remove(aim.f);(aim.c||[]).forEach(c=>gs.remove(c));aim={on:0};
 tleft=180;gt=4;tg=[0,0];cdv=[null,null];cdk=[12,12];shake=0;jv={x:0,z:0};hud.r=false;step.pn=0;koClear()}
function leaveResult(){
 if(state!='end'||RS.ph!=1||RS.t2<1.2||RS.lf)return;RS.lf=1;   /* 表示直後の連打(攻撃ボタンの押しっぱなし等)では反応しない */
 sfx('cli',.9);bgm('menu',.6);if(MPG.on)MPG.leave();   /* 勝ち/負けBGMを止めて、ホームのBGMだけにする */
 try{resetWorld()}catch(e){console.error(e);location.reload();return}
 $('#end').hidden=true;$('#rp').innerHTML='';RS.ph=0;RS.lf=0;
 setPv(sel);setView('home')}
tap($('#endb'),leaveResult);
addEventListener('resize',()=>{if(state=='end'&&RS.ph==1)resLayout()});


/* ---------- 入力 ---------- */
const jz=$('#zl'),jb=$('#joy'),jt=jb.firstChild;let jp=null,jo={x:0,y:0};
/* 浮動スティック：触った所に出現／指が外周を越えたら土台が指に追従／最大速度は小さい傾きで到達 */
const jPos=()=>{jb.style.left=(jo.x-JR)+'px';jb.style.top=(jo.y-JR)+'px';jb.style.bottom='auto'};
const jEnd=()=>{jp=null;jv={x:0,z:0};jb.classList.remove('on');jb.style.cssText='';jt.style.transform=''};
jz.onpointerdown=e=>{if(jp!=null)return;e.preventDefault();jp=e.pointerId;try{jz.setPointerCapture(jp)}catch(_){}jo=gp(e);jPos();jb.classList.add('on');jt.style.transform='';jv={x:0,z:0}};
jz.onpointermove=e=>{if(e.pointerId!=jp)return;const q=gp(e);let dx=q.x-jo.x,dy=q.y-jo.y,l=Math.hypot(dx,dy);
 if(l>JR){const k=(l-JR)/l;jo.x+=dx*k;jo.y+=dy*k;jPos();dx=q.x-jo.x;dy=q.y-jo.y;l=Math.hypot(dx,dy)}
 jt.style.transform=`translate(${dx}px,${dy}px)`;
 const m=l/JR;if(m<.12){jv={x:0,z:0};return}const f=Math.min(1,.3+(m-.12)/.28*.7);jv={x:dx/l*f,z:dy/l*f}};
jz.onpointerup=jz.onpointercancel=e=>{if(e.pointerId==jp)jEnd()};
jz.onlostpointercapture=e=>{if(e.pointerId==jp)jEnd()};
jz.oncontextmenu=e=>e.preventDefault();
const HOLD={on:0,t0:0};
const cancelR=el=>Math.max(16,el.clientWidth*.2);   /* キャンセル範囲の半径(css px)。ボタンの大きさの20%（最低16）。広げたいなら .2 を大きく */
function btn(el,sp){let id=null,o,on=0;
 el.onpointerdown=e=>{id=e.pointerId;el.setPointerCapture(id);o=gp(e);on=0;if(!sp&&state=='play'&&P0.alive&&P0.c.a.en){HOLD.on=1;HOLD.t0=performance.now()}};
 el.onpointermove=e=>{if(e.pointerId!=id)return;const q=gp(e),dx=q.x-o.x,dy=q.y-o.y,dd=Math.hypot(dx,dy);if(dd>16)on=1;
  /* エイム中に指を最初の位置(中心)付近まで戻したら＝キャンセル範囲：照準を消す（離しても撃たない） */
  if(on){if(dd<cancelR(el)){if(aim.sp===sp)aim.on=0}else{aim.on=1;aim.sp=sp;aim.a=Math.atan2(dy,dx);aim.d=aimR(dd,el)}}};
 el.onpointerup=e=>{if(e.pointerId!=id)return;id=null;aim.on=0;const hd=!sp&&HOLD.on;HOLD.on=0;if(hd&&performance.now()-HOLD.t0>=260)return;if(state!='play'||!P0.alive)return;const q=gp(e),dx=q.x-o.x,dy=q.y-o.y,dd=Math.hypot(dx,dy),s=sp?P0.c.s:P0.c.a;if(on&&dd<cancelR(el))return;   /* キャンセル範囲で離した → 攻撃も必殺技チャージ消費もしない */
  if(on)atk(P0,dd>3?Math.atan2(dy,dx):aim.a,sp,(s.lob||s.piper)?lobD(s,aimR(dd,el)):null);else autoShot(P0,sp)};
 el.onpointercancel=()=>{id=null;aim.on=0;HOLD.on=0}}
btn($('#atk'),0);btn($('#sup'),1);
addEventListener('keydown',e=>{const k=e.key.toLowerCase();kb[k]=1;if(state=='play'&&P0.alive){if(k=='j'||k==' ')autoShot(P0,0);if(k=='k')autoShot(P0,1)}});addEventListener('keyup',e=>kb[e.key.toLowerCase()]=0);

/* ---------- ループ ---------- */
let last=performance.now();const cameraTarget=new T.Vector3();
function loop(n){requestAnimationFrame(loop);const dt=Math.min(.05,(n-last)/1e3);last=n;if(GF.p){if(GF.w>0)GF.w--;else return}
 if(state=='list'||state=='room'||state=='maps'||state=='profile')return;
 if(state=='select'||state=='home'){hT+=dt*.8;pv.rotation.y=Math.sin(hT)*.4;if(pv.rig)GO.tick(pv.rig,null,dt);R.render(ps,pc);return}
 if(state=='end'){RS.t+=dt;if(RS.ph==0&&RS.t>=1)resShow();if(RS.ph==1){resStep(dt);return}}
 if(state=='intro')introStep(dt);if(state=='play'){step(dt);bushUpd(dt)}if(MPG.on)MPG.tick(dt);stageFx(dt);
 const p=P0,cp=KO&&!p.alive?(U.find(u=>u.team==p.team&&u.alive)||p):p;shake=Math.max(0,shake-dt);
 /* ノックアウト：注視点(cx,cz)は自キャラに追従するが、マップ端で止まる(本家と同じ)。横幅が足りる画面ではx固定 */
 const it=state=='intro',kh=KCAM.d*Math.sin(KCAM.pt),kz=KCAM.d*Math.cos(KCAM.pt),
  kp=Math.max(0,10.5+KCAM.mg-cam.aspect*Math.tan(cam.fov*Math.PI/360)*KCAM.d),
  cx=KO?10.5+Math.max(-kp,Math.min(kp,cp.x-10.5)):10.5+(p.x-10.5)*.35,
  cz=it?IN.cz:KO?Math.min(H-KCAM.zm,Math.max(KCAM.zm,cp.z)):Math.min(H-6.5,Math.max(6.5,p.z)),
  ch=KO?kh:15*CD,co=KO?kz:7*CD,cl=KO?kz:7*CD+1;
 if(it)cam.position.set(cx,ch,cz+co);else cam.position.lerp(cameraTarget.set(cx+(Math.random()-.5)*shake,ch,cz+co+(Math.random()-.5)*shake),Math.min(1,dt*8));cam.lookAt(cam.position.x,0,cam.position.z-cl);
 {const lx=KO?cx:it?cx:p.x,lz=KO?cz:it?cz+1:p.z;dl.position.set(lx+6,18,lz+8);dl.target.position.set(lx,0,lz)}
 const am=aim.m,s0=aim.sp?p.c.s:p.c.a;let cs=[],ln=0,ad=0;
 if(aim.on&&p.alive){const A=aim.a;
  if(s0.lob){const D=lobD(s0,aim.d);cs=lobPts(p,A,D,s0).map(q=>[q.x,q.z,s0.aoe+.4,s0.can?0x4ad0ff:undefined]);ln=1;ad=D}
  else if(aim.sp&&(s0.zone||s0.leap)){const t=tgt(p,A,s0.rng);cs=[[t.x,t.z,s0.r]];ln=1}
  else if(aim.sp&&s0.piper){const D=lobD(s0,aim.d),t=fpt(p.x,p.z,A,D);ln=1;ad=D;cs=[[1.1,0],[-1.1,0],[0,1.1],[0,-1.1]].map(o=>[p.x+o[0],p.z+o[1],s0.aoe+.4]);cs.push([t.x,t.z,.8,0x7ad8ff])}
  else if(aim.sp&&s0.mine)cs=[...Array(s0.mine).keys()].map(i=>{const m=fpt(p.x,p.z,A+(i-(s0.mine-1)/2)*.6,s0.rng*(i==1?.55:.9));return[m.x,m.z,s0.aoe]});
  else if(aim.sp&&s0.nova)cs=[[p.x,p.z,s0.r,s0.h?0x6dff7a:0x7ad8ff]]}
 (aim.c||[]).forEach((g,i)=>{const c=cs[i];g.visible=!!c;if(c){g.position.x=c[0];g.position.z=c[1];g.scale.set(c[2],1,c[2]);g.children[0].material.color.setHex(c[3]||0xff5a4a)}});
 const TK=!aim.sp&&p.tf&&p.c.tf?p.c.tf:null,fan=!!(aim.on&&p.alive&&(TK||s0.fan)&&!ln);am.visible=!fan&&!TK&&!!(aim.on&&p.alive&&(ln||(!s0.na&&!cs.length)));
 if(aim.f){aim.f.visible=fan;if(fan){const sp0=TK?TK.arc*Math.PI/180:s0.spr,rg0=TK?TK.reach:s0.rng;if(aim.f.userData.k!=sp0){aim.f.userData.k=sp0;aim.f.geometry=fanGeo(sp0)}aim.f.position.set(p.x,.06,p.z);aim.f.rotation.y=Math.PI/2-aim.a;aim.f.scale.set(rg0,1,rg0)}}
 if(am.visible){const s=s0;am.position.x=p.x;am.position.z=p.z;am.rotation.y=Math.PI/2-aim.a;if(ln)am.scale.set(.08,1,ad||Math.hypot(cs[0][0]-p.x,cs[0][1]-p.z));else am.scale.set(s.tf?s.w:s.n>1?Math.min(s.rng*(s.spr||.5),4):s.pierce?.7:.5,1,s.rng)}
 try{R.render(gs,cam);DIAG.frame(gs)}catch(e){DIAG.err('render',e)}}
requestAnimationFrame(loop);

/* マップ選択・ホームのイベント枠(i)は mapselect.js */
