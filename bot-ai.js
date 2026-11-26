/* =====================================================================
   bot-ai.js ─ ボットAI（内部レベル Lv1〜Lv3）
   script.js の ai(u,dt) から呼ばれます（このファイルが無い時は script.js の古いAIが動きます）。

   ■ レベルは「ボットごとに 1〜3 をランダム」に決まります（試合中は固定）。
       Lv1 … ちょっと下手。今までに近い動き：壁に向かってまっすぐ進んで引っかかる／壁越しでも撃つ／
             エイムが甘い／ウルトは溜まったらすぐ使う。ただしブッシュの中の敵は見えません（ズルしない）。
       Lv2 … ふつう。壁を避けて回り込む／壁越しには撃たない／少し先を読んで撃つ／体力が減ったら下がる。
       Lv3 … 上手い。
             ・ブッシュに隠れた敵は「見えていない」扱い。見失った場所を覚えて探す
             ・怪しいブッシュに偵察射撃（弾が満タンで余っている時）
             ・壁に隠れて、弾が溜まったら顔を出して撃つ（ヒット＆アウェイ）
             ・敵が弾を撃ち切った瞬間に詰める／近づかれたら撃ちながら下がる
             ・近距離キャラはブッシュで待ち伏せ
             ・投げ物（爆弾）や飛んでくる弾を避ける
             ・ウルトは「倒せる」「2人以上」「ピンチ」などの場面まで温存（溜めっぱなしも防止）
   ■ 【壁詰まり対策・全レベル共通】（Lv1 も壁にまっすぐ突っ込まなくなりました）
       ・移動はすべて経路探索(A*)で、壁・木箱・川・柵を避けて回り込みます。目的地が壁の中なら歩ける場所にずらします。
       ・届かない目的地は「行ける所まで行ってあきらめ」、別の目的地を選び直します（壁に向かって走り続けない）。
       ・0.5秒ごとに「動けていない／動いているのに近づいていない(壁づたいに滑っている)」を検出 →
         詰まった場所を避けて経路を引き直し → それでもダメなら少し脇へ抜ける → 何度も詰まる目的地は捨てます。
       ・Lv2/3：撃ちも撃たれもしない睨み合い・隠れっぱなしが続いたら、一気に詰めます(LV表の stall)。
   ■ 【人間らしい動き】
       ・向きをなめらかに変える(turn)／道中ちょっとふらつく(wob)／ときどき足を止めて周りを見回す(look)
       ・Lv2/3：見えない所から撃たれたら、弾が来た方向を探しに行く
       ・ジェムは一度狙ったら簡単に乗り換えない／壁の向こうのジェムは少し後回し
   ■ エイムは全レベルでばらつきがあり、全弾は当たりません（数値は下の LV 表）。
   ■ デバッグ用：URL に ?botlv=3 を付けると全ボットが Lv3（1・2も同様）、?botdebug=1 でコンソールにレベル表示。
       ゲーム中にコンソールで BOTAI.setLevel(3) と打っても全ボットを切り替えられます。
   ===================================================================== */
(function(){
'use strict';
const rnd=Math.random,hyp=Math.hypot,atan2=Math.atan2,cos=Math.cos,sin=Math.sin,abs=Math.abs,min=Math.min,max=Math.max,floor=Math.floor;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const gauss=()=>(rnd()+rnd()+rnd()-1.5)*2;            /* 平均0・標準偏差≒1 */

/* ---------- レベル表（ここを書き換えると強さを調整できます） ----------
   think   : 周りを見直す間隔(秒)         react  : 敵を見つけてから動き出すまで(秒)
   sight   : 敵に気づく距離(マス)          aimSd  : エイムのばらつき(ラジアン。距離が遠いほど大きくなる)
   lead    : 動く敵の少し先を撃つ度合い(0=狙わない)   mem : 見失った敵を覚えておく秒数
   los     : 1=壁に遮られる時は撃たない   cover : 1=壁に隠れて顔を出す/ヒット&アウェイ
   probe   : 1=ブッシュに偵察射撃          ambush : 1=ブッシュで待ち伏せ
   dodge   : 飛んでくる弾・爆弾を避ける確率  ult : 0=すぐ使う 1=ふつう 2=温存して使いどころを選ぶ
   spd     : 移動速度の倍率                hesitate : 撃つのをためらう確率   retreatHp : この体力割合を切ると下がる */
const LV={
 1:{n:1,think:.4,react:.5,sight:11,aimSd:.13,lead:0,mem:0,los:0,cover:0,probe:0,ambush:0,dodge:0,ult:0,spd:.9,hesitate:.2,retreatHp:0,turn:6,wob:.22,look:.06,stall:0},
 2:{n:2,think:.2,react:.3,sight:12.5,aimSd:.09,lead:.5,mem:3,los:1,cover:0,probe:0,ambush:0,dodge:.3,ult:1,spd:.96,hesitate:.08,retreatHp:.25,turn:9,wob:.16,look:.05,stall:4},
 3:{n:3,think:.1,react:.16,sight:13.5,aimSd:.065,lead:.9,mem:8,los:1,cover:1,probe:1,ambush:1,dodge:.7,ult:2,spd:1,hesitate:.02,retreatHp:.4,turn:13,wob:.1,look:.03,stall:4.5}
};
/*   turn : 向きを変える速さ(大きいほど機敏)   wob : 道中のふらつき(ラジアン)   look : 立ち止まって周りを見回す頻度(回/秒)
     stall: 睨み合い・隠れっぱなしがこの秒数続いたら、一気に詰める(0=しない) */
let QS;try{QS=new URLSearchParams(location.search)}catch(e){QS=new URLSearchParams('')}
const OPT={force:(()=>{const v=parseInt(QS.get('botlv'),10);return v>=1&&v<=3?v:0})(),debug:QS.get('botdebug')!=null};

/* ---------- ちょっとした道具 ---------- */
const okc=(tx,tz)=>tx>=0&&tz>=0&&tx<W&&tz<H&&!solid(tx+.5,tz+.5);   /* そのマスは歩ける？ */
const wr=u=>u.c.wr!=null?u.c.wr:.34;
const reach=u=>u.tf&&u.c.tf?u.c.tf.reach:u.c.a.rng;
const roundId=()=>KO?KR.seq:0;
const fwdOf=u=>u.team?1:-1;                                     /* 敵陣に向かう z の向き(上の赤チーム=+1 / 下の青チーム=-1) */
/* 弾が壁(bsolid)に止められずに届くか。柵・水は弾が通る */
function los(x0,z0,x1,z1){const dx=x1-x0,dz=z1-z0,d=hyp(dx,dz);if(d<.3)return true;const n=Math.ceil(d/.25);for(let i=1;i<n;i++){const k=i/n;if(bsolid(x0+dx*k,z0+dz*k))return false}return true}
/* 体を横にずらさず、まっすぐ歩いて行けるか(壁に引っかからないか) */
function sweep(u,x1,z1){const r=wr(u)+.05,dx=x1-u.x,dz=z1-u.z,d=hyp(dx,dz),n=Math.ceil(d/.2);for(let i=1;i<=n;i++){const k=i/n;if(hit(u.x+dx*k,u.z+dz*k,r))return false}return true}
/* 目的地が壁・木箱・水の中だったら、いちばん近い歩けるマスの中心にずらす(ずらせなければ null) */
function snapOK(x,z){const c=nearestOK(floor(x),floor(z),3);return c?{x:c[0]+.5,z:c[1]+.5}:null}
/* 毒ガス(ノックアウト) */
function gasP(){if(!KO)return 0;let p=KR.gas||0;if(p<=0&&KR.t>KR.GS-5&&KR.ph===0)p=.02;return p}
function inGas(x,z,pad){const p=gasP();if(p<=0)return false;const ix=p*KR.GX+(pad||0),iz=p*KR.GZ+(pad||0);return x<ix||x>W-ix||z<iz||z>H-iz}

/* ---------- 経路探索(A*)：壁を避けて目的地まで ---------- */
const DX=[1,-1,0,0,1,1,-1,-1],DZ=[0,0,1,-1,1,-1,1,-1];
const NAV={n:0,g:null,cf:null,se:null,cl:null,id:0,hk:[],hv:[]};
function navInit(){const n=W*H;if(NAV.n!==n){NAV.n=n;NAV.g=new Float32Array(n);NAV.cf=new Int32Array(n);NAV.se=new Int32Array(n);NAV.cl=new Int32Array(n);NAV.id=0}}
function hpush(k,v){const K=NAV.hk,V=NAV.hv;let i=K.length;K.push(k);V.push(v);while(i>0){const p=(i-1)>>1;if(K[p]<=k)break;K[i]=K[p];V[i]=V[p];i=p}K[i]=k;V[i]=v}
function hpop(){const K=NAV.hk,V=NAV.hv,top=V[0],lk=K.pop(),lv=V.pop(),n=K.length;if(n){let i=0;for(;;){let c=i*2+1;if(c>=n)break;if(c+1<n&&K[c+1]<K[c])c++;if(K[c]>=lk)break;K[i]=K[c];V[i]=V[c];i=c}K[i]=lk;V[i]=lv}return top}
function nearestOK(tx,tz,R){if(okc(tx,tz))return[tx,tz];for(let r=1;r<=R;r++)for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){if(max(abs(dx),abs(dz))!==r)continue;if(okc(tx+dx,tz+dz))return[tx+dx,tz+dz]}return null}
function findPath(sx,sz,gx,gz,extra){
 navInit();
 const s=nearestOK(Math.floor(sx),Math.floor(sz),2),g=nearestOK(Math.floor(gx),Math.floor(gz),6);
 if(!s||!g)return null;
 const id=++NAV.id,G=NAV.g,CF=NAV.cf,SE=NAV.se,CL=NAV.cl,Wd=W,si=s[1]*Wd+s[0],gi=g[1]*Wd+g[0];
 NAV.hk.length=0;NAV.hv.length=0;G[si]=0;CF[si]=-1;SE[si]=id;hpush(0,si);
 let found=false,it=0,bi=si,bh=1e9;const LIM=W*H*12;           /* 上限が小さいと遠回りの道で探索が途中で切れて「道なし」→壁に突っ込む原因になっていた */
 while(NAV.hv.length&&it++<LIM){
  const cur=hpop();if(CL[cur]===id)continue;CL[cur]=id;
  const cx=cur%Wd,cz=(cur/Wd)|0,hx=abs(cx-g[0]),hz=abs(cz-g[1]),hh=hx+hz-.5858*min(hx,hz);
  if(hh<bh){bh=hh;bi=cur}
  if(cur===gi){found=true;break}
  for(let k=0;k<8;k++){
   const dx=DX[k],dz=DZ[k],nx=cx+dx,nz=cz+dz;
   if(!okc(nx,nz))continue;
   if(dx&&dz&&(!okc(cx+dx,cz)||!okc(cx,cz+dz)))continue;        /* 角をかすめて斜めに抜けない */
   const ni=nz*Wd+nx;if(CL[ni]===id)continue;
   const c=G[cur]+(dx&&dz?1.4142:1)+(extra?extra(nx,nz):0);
   if(SE[ni]!==id||c<G[ni]){SE[ni]=id;G[ni]=c;CF[ni]=cur;const ax=abs(nx-g[0]),az=abs(nz-g[1]);hpush(c+ax+az-.5858*min(ax,az),ni)}}}
 let end=gi;
 if(!found){if(bi===si)return null;end=bi}                      /* ゴールが囲まれている等：いちばん近づける所まで行く */
 const out=[];for(let i=end;i!==si&&i>=0;i=CF[i])out.push({x:i%Wd+.5,z:((i/Wd)|0)+.5});
 out.reverse();
 const exact=found&&g[0]===Math.floor(gx)&&g[1]===Math.floor(gz);
 if(exact&&out.length)out[out.length-1]={x:gx,z:gz};
 out.partial=!exact;                                           /* 目的地そのものには立てない(壁の中など) */
 return out}
/* 自分から歩いて行ける範囲を距離つきで列挙(隠れ場所・顔を出す場所の候補に使う) */
function flood(u,maxD){
 navInit();const s=nearestOK(Math.floor(u.x),Math.floor(u.z),1);if(!s)return[];
 const id=++NAV.id,SE=NAV.se,D=NAV.g,Wd=W,q=[s[1]*Wd+s[0]],out=[];SE[q[0]]=id;D[q[0]]=0;
 for(let h=0;h<q.length;h++){
  const cur=q[h],cx=cur%Wd,cz=(cur/Wd)|0,dc=D[cur];out.push({x:cx+.5,z:cz+.5,pl:dc});
  if(dc>=maxD)continue;
  for(let k=0;k<8;k++){const dx=DX[k],dz=DZ[k],nx=cx+dx,nz=cz+dz;if(!okc(nx,nz))continue;if(dx&&dz&&(!okc(cx+dx,cz)||!okc(cx,cz+dz)))continue;
   const ni=nz*Wd+nx;if(SE[ni]===id)continue;SE[ni]=id;D[ni]=dc+(dx&&dz?1.4142:1);q.push(ni)}}
 return out}

/* ---------- ボットごとの状態 ---------- */
function mkState(u){
 const lv=OPT.force||1+Math.floor(rnd()*3);
 const S={u,lv,L:LV[lv],t:0,last:null,round:-1};
 if(OPT.debug)console.info('[BOTAI] '+u.c.n+' = Lv'+lv);
 return S}
function resetTac(S,u){
 S.round=roundId();S.t0=S.t;
 S.mem=new Map();S.tgt=null;S.lastT=null;S.pt=0;S.tt=0;S.tp=S.t;S.dtPlan=.3;
 S.mv='hold';S.goal=null;S.goalKind='';S.path=null;S.pathT=-9;S.pg={x:0,z:0};S.vec={x:0,z:0};S.vk=1;S.sneak=false;
 S.side=rnd()<.5?1:-1;S.sf=0;S.fc=.2;S.pb=1+rnd()*2;S.ph='peek';S.phT=S.t;S.volley=0;S.volMax=2;S.amb=0;
 S.hp=u.hp;S.hurt=0;S.hurtAt=-9;S.dodgeUntil=0;S.dodgeVec={x:0,z:0};S.grp=new WeakSet();S.dodged=new WeakSet();
 S.upT=null;S.upDelay=0;S.escape=0;S.rn=0;S.ra=0;S.sk=.5;S.px=u.x;S.pz=u.z;S.want=0;S.stuck=0;S.retreat=0;
 S.av=[];S.bad=[];S.stuckAll=0;S.stuckT=-9;S.prPath=null;S.prLen=0;S.hx=0;S.hz=0;S.hl=0;S.pause=0;S.glanceT=S.t;S.wph=rnd()*6.28;S.unreach=-9;S.noPath=0;
 S.lastShot=-9;S.push=0;S.engT=S.t;S.tgtT=null;S.nT=0;S.nx=0;S.nz=0;S.l1g=null;
 S.hsP=null;S.hsD=null;S.hsF=0;S.pushT=(S.lv===3?6+rnd()*9:3+rnd()*6);S.pat=null;S.patT=0;S.patI=0;S.huntT=0;
 /* Lv1(古い動き)用 */
 u.at=0;u.cd=.5;u.pt=.5;u.pk={x:u.x,z:u.z};u.rn=0;u.en=null}

/* =====================================================================
   強奪(ヘイスト)：敵の金庫を壊しに行く／自分の金庫を守る
   ・攻め役：敵の金庫が撃てる位置(射線が通る所)へ行き、敵が見えていなければ金庫を撃つ
   ・守り役：金庫の前をうろうろして、近づく敵を迎え撃つ。自分の金庫のHPが大きく負けている時は、他のボットも守りに戻る
   ・敵が見えている時は、今まで通り敵との戦いを優先します
   ===================================================================== */
const hsOwn=u=>HSS.s[u.team],hsEn=u=>HSS.s[1-u.team];
function hsStand(u,S){
 const en=hsEn(u);if(!en)return{x:MX,z:MZ};
 const R=min(reach(u)*.8,8.2),fw=fwdOf(u);
 for(let i=0;i<9;i++){
  const d=R*(.55+rnd()*.45),x=clamp(en.x+(u.si-1)*2.6+(rnd()-.5)*4.2,2,W-2),z=en.z-fw*d;
  const pt=snapOK(x,z);
  if(pt&&hyp(pt.x-en.x,pt.z-en.z)<R+.6&&los(pt.x,pt.z,en.x,en.z)&&!isBad(S,pt.x,pt.z))return pt}
 return snapOK(en.x,en.z-fw*R*.7)||{x:MX,z:MZ}}
function hsGoal(u,S){
 const own=hsOwn(u),en=hsEn(u);if(!own||!en)return{x:MX,z:MZ};
 let th=null,td=1e9;
 for(const m of S.mem.values()){if(!m.vis&&S.t-m.last>2.5)continue;const d=hyp(m.x-own.x,m.z-own.z);if(d<11&&d<td){td=d;th=m}}
 const ownR=own.hp/own.mx,enR=en.hp/en.mx,def=u.si===2||ownR<enR-.2;
 if(th&&(def||td<7))return{x:th.x,z:th.z};                       /* 自分の金庫に近づく敵を迎え撃つ */
 if(def){                                                          /* 金庫の前を守る */
  if(!S.hsD||S.t-S.hsDT>4||hyp(S.hsD.x-u.x,S.hsD.z-u.z)<1){S.hsDT=S.t;const fw=fwdOf(u);S.hsD=snapOK(clamp(own.x+(rnd()-.5)*8,2.5,W-2.5),own.z+fw*(2+rnd()*3.5))||{x:own.x,z:own.z+fw*3}}
  return S.hsD}
 if(!S.hsP||S.t-S.hsPT>8||isBad(S,S.hsP.x,S.hsP.z)){S.hsP=hsStand(u,S);S.hsPT=S.t}   /* 攻め役：金庫の前へ(一度決めたらしばらく動かない) */
 return S.hsP}
/* 敵が見えていない時、射程に敵の金庫が入っていたら撃つ */
function hsShoot(u,S,dt){
 const en=hsEn(u);if(!HSS.on||HSS.over||!en||en.hp<=0||u.fz>0||u.lp||KR.lock||(u.acd||0)>0)return;
 const a=u.c.a,R=reach(u);if(a.en){if(u.ammo<.15)return}else if(u.ammo<1)return;
 const d=hyp(en.x-u.x,en.z-u.z);if(d>R*.95+.4)return;
 if(!a.lob&&!los(u.x,u.z,en.x,en.z))return;
 S.hsF=(S.hsF||0)-(dt||0);if(S.hsF>0)return;S.hsF=.1+rnd()*.12;
 const ang=atan2(en.z-u.z,en.x-u.x)+gauss()*.02;
 const k=ultKind(u.c.s);
 if(u.sup>=100&&(k==='shot'||k==='lob')&&d<(u.c.s.air||u.c.s.rng||6)&&!(u.c.s.piper)){atk(u,ang,1,d);return}
 atk(u,ang,0,a.lob?min(d,a.rng):null)}

/* =====================================================================
   Lv1：今までのAIに近い動き（壁に向かってまっすぐ進み、引っかかったらランダムに動いて抜ける）
   変えた点：ブッシュに隠れた敵の本当の位置を知らない / エイムがばらつく
   ===================================================================== */
function lv1Goal(u,S){
 if(HS){const e=near(u,12);if(e)return{x:e.x+S.nx,z:e.z+S.nz};return hsGoal(u,S)}
 if(!KO){                                  /* ジェム：近いジェムへ。壁の向こうのジェムは少し後回し／一度決めたら簡単には乗り換えない */
  let gx=MX+(rnd()-.5)*2,gz=MZ+(u.team?-1.5:1.5),bg=1e9,bq=null;
  for(const q of G){if(isBad(S,q.x,q.z))continue;const d=hyp(q.x-u.x,q.z-u.z)*(los(u.x,u.z,q.x,q.z)?1:1.35);if(d<bg){bg=d;bq=q}}
  if(S.l1g&&G.indexOf(S.l1g)>=0&&bq!==S.l1g){const o=S.l1g,d=hyp(o.x-u.x,o.z-u.z)*(los(u.x,u.z,o.x,o.z)?1:1.35);if(d<bg+2.2){bq=o;bg=d}}
  S.l1g=bq;if(bq){gx=bq.x;gz=bq.z}
  if(tg[u.team]>=10&&u.gems>0){gx=MX;gz=u.team?SPZ.t+.5:SPZ.b-.5}
  return{x:gx,z:gz}}
 /* ノックアウト：見えている敵にだけ向かう。見えなければ自陣の前で構えて、だんだん前へ出る */
 const fwd=fwdOf(u),e=near(u,12);
 if(inGas(u.x,u.z,1.5))return{x:MX,z:MZ};
 if(e)return{x:e.x+S.nx,z:e.z+S.nz};
 if(KR.t<6)return snapOK(MX+(u.si-1)*4,MZ-fwd*5)||{x:MX,z:MZ};
 return snapOK(clamp(MX+(u.si-1)*4+S.nx*1.5,2.5,W-2.5),MZ+fwd*(1+min(11,(KR.t-6)*.35)))||{x:MX,z:MZ}}
function runClassic(u,S,dt){
 u.at-=dt;u.cd-=dt;
 if(u.at<=0){u.at=.35+rnd()*.3;u.st=rnd()<.5?1:-1;u.en=near(u,u.c.a.rng);
  if(S.t>S.nT){S.nT=S.t+1.5+rnd()*1.2;S.nx=(rnd()-.5)*2;S.nz=(rnd()-.5)*2}
  S.goal=lv1Goal(u,S);S.goalKind='l1';S.mv='goal';S.sneak=false}
 const e=u.en;
 if(e&&e.alive){const dx=e.x-u.x,dz=e.z-u.z,d=hyp(dx,dz)||1,rg=reach(u);
  if(d<rg+1.5){const k=d>rg*.7?1:(d<rg*.4&&u.c.id!=2&&u.c.id!=12?-1:0);
   if(k>0&&!sweep(u,e.x,e.z)){S.mv='goal'}                      /* 壁や川をはさんでいる → 回り込む(経路探索) */
   else{S.vec={x:dx/d*k-dz/d*u.st*.7,z:dz/d*k+dx/d*u.st*.7};S.vk=1;S.mv='steer'}
   if(u.cd<=0&&(d<rg||(u.sup>=100&&useSup(u,d)))){
    const a=atan2(dz,dx)+gauss()*S.L.aimSd*(.7+d/15);
    u.cd=min(.3+rnd()*.3,(u.c.ad||.6)+rnd()*.1);
    if(u.sup>=100&&useSup(u,d))atk(u,u.c.s.piper?a+Math.PI:a,1,u.c.s.piper?null:d);else if(d<rg)atk(u,a,0,d)}}}
 move(u,S,dt);
 if(HS&&!(e&&e.alive))hsShoot(u,S,dt)}

/* =====================================================================
   Lv2 / Lv3：認知 → 方針 → 移動 → 攻撃
   ===================================================================== */
/* ---------- 認知：見えている敵だけを知っていて、見失っても少しの間は覚えている ---------- */
function perceive(u,S){
 const L=S.L,now=S.t,dtp=max(.03,now-S.tp);S.tp=now;
 /* 敵の「撃った回数」を数える(弾切れの推定用)。1回の攻撃の弾は同じ grp を共有している */
 for(const b of B){
  if(b.dead||!b.o||b.o.team===u.team||!b.grp||S.grp.has(b.grp))continue;
  S.grp.add(b.grp);const m=S.mem.get(b.o);if(m&&!b.o.c.a.en)m.shots.push(now);
  if((!m||!m.vis)&&L.mem>0)hearShot(S,u,b,now)}
 for(const e of U){
  if(e.team===u.team)continue;
  if(!e.alive){S.mem.delete(e);continue}
  const d=hyp(e.x-u.x,e.z-u.z),seen=d<=L.sight&&vis(e,u);   /* vis = ブッシュに隠れている敵は見えない */
  let m=S.mem.get(e);
  if(seen){
   if(!m){m={e,x:e.x,z:e.z,vx:0,vz:0,first:now,last:now,vis:true,shots:[],hideB:null,d};S.mem.set(e,m)}
   else{
    if(!m.vis&&now-m.last>.7)m.first=now;                    /* 見失ってから再発見 → 気づき直し */
    const k=min(1,dtp*5);m.vx+=((e.x-m.x)/dtp-m.vx)*k;m.vz+=((e.z-m.z)/dtp-m.vz)*k;
    m.x=e.x;m.z=e.z;m.last=now;m.vis=true;m.hideB=null;m.d=d;
    const sp=hyp(m.vx,m.vz);if(sp>9){m.vx*=9/sp;m.vz*=9/sp}}
  }else if(m){
   if(m.vis){m.vis=false;guessHide(m)}                       /* 見失った瞬間：ブッシュに入ったかも？ */
   m.d=hyp(m.x-u.x,m.z-u.z);
   if(now-m.last>L.mem)S.mem.delete(e)}}
 /* 目標を選ぶ（気づくまで L.react 秒かかる） */
 let best=null,bs=1e9;
 for(const m of S.mem.values()){
  if(!m.vis||now-m.first<L.react)continue;
  const e=m.e;let sc=m.d;
  if(L.cover){sc+=(e.hp/e.mx)*5;if(e.hp<=killDmg(u))sc-=4;if(!KO&&e.gems>=3)sc-=2}   /* 弱った敵・ジェムを持った敵を優先 */
  if(S.tgt===m)sc-=1.6;
  if(sc<bs){bs=sc;best=m}}
 S.tgt=best}
/* 見えない敵から飛んできた弾：来た方向に敵がいるはず → だいたいの位置を覚えて探しに行く(人間も弾の向きで気づく) */
function hearShot(S,u,b,now){
 const vx=b.vx||0,vz=b.vz||0,sp=hyp(vx,vz);if(sp<2)return;
 const rx=u.x-b.x,rz=u.z-b.z,along=(rx*vx+rz*vz)/sp,miss=abs(rx*vz-rz*vx)/sp;
 if(along<-1||miss>3)return;                                /* こちらに向かってきた弾だけ */
 const e=b.o;if(!e.alive)return;
 const x=e.x+gauss()*1.3,z=e.z+gauss()*1.3;let m=S.mem.get(e);
 if(!m){m={e,x,z,vx:0,vz:0,first:now,last:now,vis:false,shots:[],hideB:null,d:hyp(x-u.x,z-u.z)};S.mem.set(e,m)}
 else{m.x=x;m.z=z;m.last=now;m.d=hyp(x-u.x,z-u.z)}
 if(inBush(e.x,e.z))m.hideB={x:floor(e.x)+.5,z:floor(e.z)+.5}}
function guessHide(m){
 m.hideB=null;
 if(inBush(m.x,m.z)){m.hideB={x:Math.floor(m.x)+.5,z:Math.floor(m.z)+.5};return}
 const sp=hyp(m.vx,m.vz);if(sp<.5)return;
 for(let k=.7;k<=2.8;k+=.7){const x=m.x+m.vx/sp*k,z=m.z+m.vz/sp*k;if(inBush(x,z)){m.hideB={x:Math.floor(x)+.5,z:Math.floor(z)+.5};return}}}
/* 行けなかった目的地を少しの間おぼえて、そこを選び直さない */
function markBad(S){const g=S.goal;if(!g)return;S.bad.push({x:g.x,z:g.z,t:S.t});if(S.bad.length>8)S.bad.shift()}
function isBad(S,x,z){for(const b of S.bad)if(S.t-b.t<8&&hyp(b.x-x,b.z-z)<2.2)return true;return false}
const killDmg=u=>{const a=u.c.a;return a.d*(a.n||a.sh||1)*.6};
function enemyEmpty(m,now){const sh=m.shots;while(sh.length&&now-sh[0]>3)sh.shift();if(sh.length<3)return false;return now-sh[sh.length-1]<(m.e.c.rl||1.3)*.85}
function trackHurt(u,S,dt){const d=S.hp-u.hp;if(d>0){S.hurt+=d;S.hurtAt=S.t}S.hp=u.hp;S.hurt*=max(0,1-dt*.9)}

/* ---------- 避ける：飛んでくる弾と、投げ物の着地点 ---------- */
function dodgeCheck(u,S){
 const L=S.L;if(S.t<S.dodgeUntil)return;
 for(const b of B){
  if(b.dead||!b.o||b.o.team===u.team)continue;
  if(b.lob){                                                 /* 投げ物：着地マーカーが見える */
   if(!b.grp||S.dodged.has(b.grp))continue;
   const dd=hyp(b.tx-u.x,b.tz-u.z);if(dd>(b.aoe||1.5)+.8)continue;
   S.dodged.add(b.grp);
   if(rnd()<min(1,L.dodge*1.2)){const l=dd||1;S.dodgeVec=dd<.2?{x:rnd()-.5,z:rnd()-.5}:{x:(u.x-b.tx)/l,z:(u.z-b.tz)/l};S.dodgeUntil=S.t+.6}
   return}
  const vx=b.vx,vz=b.vz,sp2=vx*vx+vz*vz;if(sp2<1)continue;
  const rx=u.x-b.x,rz=u.z-b.z,tca=(rx*vx+rz*vz)/sp2;          /* 弾がいちばん近づくまでの時間 */
  if(tca<.08||tca>.55||b.l<Math.sqrt(sp2)*tca)continue;
  const cx=b.x+vx*tca-u.x,cz=b.z+vz*tca-u.z;if(hyp(cx,cz)>(b.r||.35)+.5)continue;
  if(!b.grp||S.dodged.has(b.grp))continue;S.dodged.add(b.grp);
  if(rnd()<L.dodge*.55){const sp=Math.sqrt(sp2),sg=(rx*vz-rz*vx)>0?-1:1;S.dodgeVec={x:-vz/sp*sg,z:vx/sp*sg};S.dodgeUntil=S.t+.4}
  return}}

/* ---------- 撃つ ---------- */
const projV=a=>a.ac?a.ac[0]+(a.ac[1]-a.ac[0])/(a.ac[2]+1):(a.v||20);
function aimPoint(u,S,m,d){
 const e=m.e,L=S.L;let tx=e.x,tz=e.z;
 if(L.lead>0){const t=d/max(4,projV(u.c.a)),k=L.lead*(.55+rnd()*.5);tx+=m.vx*t*k;tz+=m.vz*t*k}
 return{x:tx,z:tz}}
function shootAt(u,S,T){
 const L=S.L,e=T.e,a=u.c.a,R=reach(u);
 if(S.fc>0||(u.acd||0)>0)return;
 if(a.en){if(u.ammo<.15)return}else if(u.ammo<1)return;
 const d=hyp(e.x-u.x,e.z-u.z);
 if(d>R*.97||!vis(e,u))return;                               /* 射程外／ブッシュに入られた */
 if(L.los&&!a.lob&&!los(u.x,u.z,e.x,e.z))return;             /* 壁に遮られている */
 if(L.cover&&!a.en&&u.ammo<2&&d>R*.8&&!T.empty&&e.hp>killDmg(u))return;   /* 弾を節約 */
 if(rnd()<L.hesitate){S.fc=.1+rnd()*.25;return}
 const p=aimPoint(u,S,T,d),ang=atan2(p.z-u.z,p.x-u.x)+gauss()*L.aimSd*(.7+d/15);
 const D=a.lob?clamp(hyp(p.x-u.x,p.z-u.z)+gauss()*.35,.8,R):d;
 atk(u,ang,0,D);S.lastShot=S.t;S.fc=a.en?.12:.04+rnd()*.06;
 if(S.ph==='peek')S.volley++;
 if(L.cover&&S.volley>=S.volMax)S.tt=min(S.tt,.1)}           /* 撃ち終えたらすぐ隠れる */

/* ブッシュへの偵察射撃(Lv3)：見えていない敵の本当の位置は使わず、「怪しい」ブッシュを狙う */
function huntPoint(u,S){
 let best=null;for(const m of S.mem.values()){if(m.vis)continue;if(!best||m.last>best.last)best=m}
 if(!best)return null;const age=S.t-best.last;if(age>S.L.mem)return null;
 let x=best.x,z=best.z;if(best.hideB){x=best.hideB.x;z=best.hideB.z}else{const k=min(age,1.6);x+=best.vx*k;z+=best.vz*k}
 return{x,z,m:best,age}}
function tryProbe(u,S,dt){
 const L=S.L,a=u.c.a,R=reach(u);
 if(!L.probe||a.en||u.tf||u.fz>0||u.lp||(u.acd||0)>0||S.fc>0)return;
 S.pb-=dt;if(S.pb>0)return;
 const hp=huntPoint(u,S);let tx=null,tz=null,fast=false;
 if(hp&&hp.m.hideB&&hp.age<5){                               /* 見失ったブッシュ */
  const d=hyp(hp.x-u.x,hp.z-u.z);
  if(d>2.6&&d<R*.95&&(a.lob||los(u.x,u.z,hp.x,hp.z))&&u.ammo>=1&&rnd()<.75){tx=hp.x;tz=hp.z;fast=true}}
 else if(u.ammo>=2.9&&!inGas(u.x,u.z,2)&&rnd()<.6){          /* 弾が満タンで余っている時だけ、ふつうのブッシュも撃つ */
  const g=S.goal,gx=g?g.x-u.x:0,gz=g?g.z-u.z:fwdOf(u)*5,gl=hyp(gx,gz)||1,cand=[];let tot=0;
  const r=Math.ceil(R*.95);
  for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){
   const cx=Math.floor(u.x)+dx+.5,cz=Math.floor(u.z)+dz+.5;if(!inBush(cx,cz))continue;
   const d=hyp(cx-u.x,cz-u.z);if(d<3.4||d>R*.95)continue;
   if(!a.lob&&!los(u.x,u.z,cx,cz))continue;
   let w=1;const cs=((cx-u.x)*gx+(cz-u.z)*gz)/(d*gl);if(cs>.5)w+=2;
   if(KO&&(cz-MZ)*fwdOf(u)>0)w+=1.5;                          /* 敵陣側 */
   for(const m of S.mem.values())if(!m.vis&&hyp(cx-m.x,cz-m.z)<3.2)w+=5;
   cand.push({x:cx,z:cz,w});tot+=w}
  if(tot>0){let r0=rnd()*tot;for(const c of cand){r0-=c.w;if(r0<=0){tx=c.x+(rnd()-.5)*.6;tz=c.z+(rnd()-.5)*.6;break}}}}
 if(tx==null){S.pb=.4+rnd()*.3;return}
 const d=hyp(tx-u.x,tz-u.z),ang=atan2(tz-u.z,tx-u.x)+gauss()*L.aimSd*(.7+d/15);
 atk(u,ang,0,a.lob?clamp(d+gauss()*.4,.8,R):d);S.pb=fast?1+rnd()*.8:3+rnd()*3.5}
/* 回復弾のキャラ：敵がいなければ弱った味方を撃つ */
function tryHeal(u,S){
 const a=u.c.a;if(!a.heal||S.fc>0||(u.acd||0)>0||u.ammo<1)return;
 let best=null,bs=1e9;
 for(const e of U){if(e.team!==u.team||e===u||!e.alive||e.hp>e.mx*.85)continue;const d=hyp(e.x-u.x,e.z-u.z);if(d>a.rng*.9)continue;if(!los(u.x,u.z,e.x,e.z))continue;if(d<bs){bs=d;best=e}}
 if(!best)return;atk(u,atan2(best.z-u.z,best.x-u.x)+gauss()*S.L.aimSd,0,bs);S.fc=.15}

/* ---------- ウルト ---------- */
function ultKind(s){
 if(s.rev)return'heal';if(s.buff)return s.buff;if(s.tur)return'tur';if(s.piper)return'piper';if(s.leap)return'leap';
 if(s.chain)return'chain';if(s.tf)return'tf';if(s.nova)return'nova';if(s.lob||s.mine||s.zone||s.ice)return'lob';if(s.oil)return'oil';return'shot'}
const ultDmg=s=>(s.d||0)*(s.n||s.sh||1)*.6;
function escapeAngle(u,e){
 const base=e?atan2(u.z-e.z,u.x-e.x):u.dir+Math.PI;let best=base,bd=-1;
 for(const off of[0,.5,-.5,1,-1,1.5,-1.5]){const a=base+off;let d=0;for(;d<7;d+=.4)if(hit(u.x+cos(a)*d,u.z+sin(a)*d,.4))break;if(d>bd+.01){bd=d;best=a}if(d>=6.8&&off===0)break}
 return best}
function cast(u,S,T,k){
 const e=T&&T.e;let ang=u.dir,D=null;
 if(e){const d=hyp(e.x-u.x,e.z-u.z),p=aimPoint(u,S,T,d);ang=atan2(p.z-u.z,p.x-u.x)+gauss()*S.L.aimSd*.6;D=hyp(p.x-u.x,p.z-u.z)}
 if(k==='piper'){ang=escapeAngle(u,e);D=null}
 atk(u,ang,1,D);S.upT=null;S.fc=.3;return true}
function tryUlt(u,S,T){
 const L=S.L,s=u.c.s,k=ultKind(s),now=S.t,wait=now-(S.upT==null?now:S.upT);
 if(wait<S.upDelay)return false;
 if(k==='heal')return useSup(u,0)?cast(u,S,null,k):false;
 if(!T)return false;
 const e=T.e,d=hyp(e.x-u.x,e.z-u.z),airR=s.air||s.rng||6,R=reach(u);
 if(d>airR+(k==='guard'||k==='stealth'?R-airR+3:0))return false;
 const clean=()=>los(u.x,u.z,e.x,e.z);
 if(L.ult<2){                                                /* Lv2：撃てる場面なら、たまに使う(雑) */
  if(k==='shot'&&!clean())return false;
  if(rnd()<.35){S.fc=.3+rnd()*.5;return false}               /* 迷って少し間が空く */
  return cast(u,S,T,k)}
 /* Lv3：使いどころを選ぶ */
 const hpf=u.hp/u.mx,killable=e.hp<=ultDmg(s),hoard=wait>16,pinch=hpf<.45||S.hurt>u.mx*.2;
 let nIn=0;for(const m of S.mem.values())if(m.vis&&hyp(m.e.x-u.x,m.e.z-u.z)<airR)nIn++;
 let ok=false;
 switch(k){
  case'guard':ok=(d<R+3.5)&&(hpf<.75||nIn>=2||S.hurt>u.mx*.12||hoard)&&u.ammo>=1.5;break;
  case'stealth':
   if(hpf<.42&&d<7&&S.hurt>u.mx*.08){S.escape=now+3.5;ok=true}
   else ok=d>2.5&&u.ammo>=2&&(killable||nIn>=2||wait>3||hoard);break;
  case'tur':ok=d>3&&d<8.5&&(S.ph==='peek'||hpf<.7||hoard);break;
  case'piper':ok=(d<4.2&&(pinch||killable))||(hoard&&d<5);break;
  case'leap':ok=d>3.2&&(killable||nIn>=2||(hpf>.5&&wait>2.5)||hoard);break;
  case'chain':ok=killable||nIn>=2||wait>5||pinch;break;
  case'tf':ok=wait>1.2&&u.ammo>=1;break;
  case'nova':ok=d<(s.r||3.7)&&(killable||nIn>=1);break;
  case'lob':ok=d>2.2&&(killable||nIn>=2||wait>4||hoard);break;
  case'oil':ok=d>1.5&&d<airR-.4&&clean()&&wait>1;break;
  default:ok=clean()&&(killable||nIn>=2||pinch||wait>5||hoard)}
 return ok?cast(u,S,T,k):false}

function fire(u,S,dt,T){
 S.fc-=dt;
 if(u.fz>0||u.lp)return;
 if(u.sup>=100){if(S.upT==null){S.upT=S.t;S.upDelay=S.L.ult>=2?.8+rnd()*2.4:.3+rnd()*1.2}}else S.upT=null;
 if(u.sup>=100&&S.fc<=0&&tryUlt(u,S,T))return;
 if(T)shootAt(u,S,T);else{tryHeal(u,S);tryProbe(u,S,dt)}}

/* ---------- 方針：どこへ向かい、どう戦うか ---------- */
const ownBase=u=>spawn(u.team,u.si);
function gemGoal(u,S){
 const L=S.L;
 if(tg[u.team]>=10&&u.gems>0)return{x:MX,z:u.team?SPZ.t+.5:SPZ.b-.5};                  /* 10個そろったら自陣で守る(今まで通り) */
 if(tg[1-u.team]>=10&&L.cover){                                                         /* 敵が10個：持っている敵を探しに行く */
  let b=null,bd=1e9;for(const m of S.mem.values()){if(m.e.gems>0){const d=m.d;if(d<bd){bd=d;b=m}}}
  if(b)return{x:b.x,z:b.z};return{x:MX,z:u.team?SPZ.b-3:SPZ.t+3}}
 let best=null,bs=1e9;
 for(let pass=0;pass<2&&!best;pass++)for(const q of G){
  if(!pass&&isBad(S,q.x,q.z))continue;                                                /* 1周目：行けなかったジェムは除く／2周目：全部対象 */
  const d=hyp(q.x-u.x,q.z-u.z);let sc=d*(u.gems>=3?1.3:1)*(los(u.x,u.z,q.x,q.z)?1:1.25);
  if(L.cover){for(const m of S.mem.values())if(m.vis||S.t-m.last<4){const dd=hyp(q.x-m.x,q.z-m.z);if(dd<5.5)sc+=(5.5-dd)*1.3}}   /* 敵が近くにいるジェムは後回し */
  if(S.gemT===q)sc-=1.8;
  if(sc<bs){bs=sc;best=q}}
 S.gemT=best;
 if(best)return{x:best.x,z:best.z};
 return{x:MX+(rnd()-.5)*2,z:MZ+(u.team?-1.5:1.5)}}
function koGoal2(u,S){
 const fwd=fwdOf(u),lx=MX+(u.si-1)*4.2;
 if(S.t-S.t0<S.pushT)return snapOK(lx,MZ-fwd*4.5)||{x:MX,z:MZ};                                         /* 最初は自陣の前で構える */
 if(!S.pat||hyp(S.pat.x-u.x,S.pat.z-u.z)<1.8||S.t-S.patT>9){                           /* そのあとは中央〜敵陣の前をパトロール */
  const ks=[0,4,8,11,8,4];S.patI++;                                                    /* 敵陣の入口(k=11)まで探しに行く */
  for(let i=0;i<5;i++){const lane=i<3?lx+(rnd()-.5)*8:MX+(rnd()-.5)*14;
   const pt=snapOK(clamp(lane,2.5,W-2.5),MZ+fwd*ks[(S.patI+(i>2?1:0))%ks.length]);
   if(pt){S.pat=pt;if(!isBad(S,pt.x,pt.z))break}}
  if(!S.pat)S.pat={x:MX,z:MZ}
  S.patT=S.t}
 return S.pat}
function planTravel(u,S){
 const L=S.L;S.sneak=!!L.cover;S.goalKind='travel';
 if(S.unreach>S.t-1.2&&S.goal){markBad(S);S.pat=null;S.unreach=-9;S.path=null}          /* 行ける所まで来たのに届かない目的地 → あきらめて別の所へ */
 const hp=huntPoint(u,S);
 if(hp&&isBad(S,hp.x,hp.z)){S.mem.delete(hp.m.e)}
 else if(hp){                                                                                 /* 見失った敵を探す */
  S.goal={x:hp.x,z:hp.z};S.goalKind='hunt';S.mv='goal';
  const R=reach(u),d=hyp(hp.x-u.x,hp.z-u.z);
  if(d<1.8){S.huntT+=S.dtPlan;if(S.huntT>1.3){S.mem.delete(hp.m.e);S.huntT=0}}          /* 着いたのにいない → 探すのをやめる */
  if(L.probe&&R>5.6&&hp.m.hideB&&d<R*.8&&(u.c.a.lob||los(u.x,u.z,hp.x,hp.z))){S.mv='hold';S.huntT+=S.dtPlan;if(S.huntT>3){S.mem.delete(hp.m.e);S.huntT=0}}   /* 射程内で止まって様子を見る */
  return}
 S.huntT=0;
 S.goal=KO?koGoal2(u,S):HS?hsGoal(u,S):gemGoal(u,S);S.mv='goal'
 /* 敵が見えていない道中：たまに足を止めて周りを見回す */
 if(L.look&&S.t-S.glanceT>7&&S.t-S.hurtAt>3&&!inGas(u.x,u.z,2)&&rnd()<L.look*S.dtPlan){S.pause=S.t+.25+rnd()*.35;S.glanceT=S.t}}

/* 角ぎりぎりの位置だと、数cmずれただけで射線が通る/通らないが変わる。左右に少しずらした線も含めて判定する */
function losM(x0,z0,x1,z1){                                   /* 余裕を持って撃てる(3本とも通る) */
 if(!los(x0,z0,x1,z1))return false;
 const dx=x1-x0,dz=z1-z0,d=hyp(dx,dz)||1,px=-dz/d*.28,pz=dx/d*.28;
 return los(x0,z0,x1+px,z1+pz)&&los(x0,z0,x1-px,z1-pz)}
function hiddenM(x0,z0,x1,z1){                                /* 余裕を持って隠れている(3本とも遮られる) */
 const dx=x1-x0,dz=z1-z0,d=hyp(dx,dz)||1,px=-dz/d*.28,pz=dx/d*.28;
 return!los(x0,z0,x1,z1)&&!los(x0,z0,x1+px,z1+pz)&&!los(x0,z0,x1-px,z1-pz)}
function scCover(c,q){
 if(inGas(q.x,q.z,.8))return-1e9;
 if(!hiddenM(c.ex,c.ez,q.x,q.z))return-1e9;                  /* 敵の弾が届く場所は隠れ場所ではない */
 const dE=hyp(q.x-c.ex,q.z-c.ez);let s=-q.pl*.9+min(dE,c.R)*.12+(dE<2.6?-4:0)+(inBush(q.x,q.z)?1.2:0);
 for(const o of c.others)if(hyp(q.x-o.x,q.z-o.z)<o.r&&los(o.x,o.z,q.x,q.z))s-=3;
 if(peekNear(c,q.x,q.z))s+=2.4;
 return s+rnd()*.5}
function scPeek(c,q){
 if(inGas(q.x,q.z,.8))return-1e9;
 const dE=hyp(q.x-c.ex,q.z-c.ez);if(dE>c.hi||dE<c.lo)return-1e9;
 const open=losM(c.ex,c.ez,q.x,q.z);
 if(!c.lob&&!open)return-1e9;                                /* 撃てる(弾が届く)場所 */
 let s=-q.pl*1.1-abs(dE-c.R*.78)*.4;
 if(coverNear(c,q.x,q.z))s+=2.8;                             /* すぐ隣に隠れられる＝角から顔を出す位置 */
 if(c.lob&&!open)s+=3;                                       /* 投げ物は壁の向こうから */
 for(const o of c.others)if(hyp(q.x-o.x,q.z-o.z)<o.r&&los(o.x,o.z,q.x,q.z))s-=2;
 if(inBush(q.x,q.z))s+=.8;
 return s+rnd()*.5}
const NB8=[[1.3,0],[-1.3,0],[0,1.3],[0,-1.3],[.92,.92],[-.92,.92],[.92,-.92],[-.92,-.92]];
function coverNear(c,x,z){for(const o of NB8){const x2=x+o[0],z2=z+o[1];if(okc(Math.floor(x2),Math.floor(z2))&&!los(c.ex,c.ez,x2,z2))return true}return false}
function peekNear(c,x,z){for(let i=0;i<4;i++){const o=NB8[i],x2=x+o[0]*1.15,z2=z+o[1]*1.15;if(!okc(Math.floor(x2),Math.floor(z2)))continue;const d=hyp(x2-c.ex,z2-c.ez);if(d>=c.lo&&d<=c.hi&&(c.lob||los(c.ex,c.ez,x2,z2)))return true}return false}
function bestCell(c,kind,S,u){
 const sc=kind==='cover'?scCover:scPeek,cells=flood(u,kind==='cover'?7:6);let best=null,bs=-1e8;
 for(const q of cells){const s=sc(c,q);if(s>bs){bs=s;best=q}}
 if(!best||bs<-1e7)return null;
 if(S.goal&&S.goalKind===kind){const old=sc(c,{x:S.goal.x,z:S.goal.z,pl:hyp(S.goal.x-u.x,S.goal.z-u.z)});if(old>bs-1.2)return S.goal}   /* 今の目的地が十分良ければ変えない */
 return{x:best.x,z:best.z}}

function planCombat2(u,S,T){                                  /* Lv2：ふつうの戦い方 */
 const e=T.e,R=reach(u),a=u.c.a,d=max(.01,T.d),short=R<=5.6,hpf=u.hp/u.mx;
 S.sneak=false;
 if(S.retreat&&hpf>.6)S.retreat=0;
 if(!S.retreat&&hpf<S.L.retreatHp&&d<R+3)S.retreat=1;
 if(S.retreat){S.mv='goal';S.goal=ownBase(u);S.goalKind='retreat';return}
 if(S.push>S.t&&d>R*.7){S.mv='goal';S.goal={x:e.x,z:e.z};S.goalKind='chase';return}   /* 睨み合い → 詰める */
 if(!a.lob&&d>2&&!los(u.x,u.z,e.x,e.z)){S.mv='goal';S.goal={x:e.x,z:e.z};S.goalKind='chase';return}   /* 壁の向こう → 回り込む */
 const k=d>R*.78?1:(d<R*.42&&!short?-1:0);
 if(k>0){S.mv='goal';S.goal={x:e.x,z:e.z};S.goalKind='chase';return}   /* 近づく時は経路探索(川や柵も避ける) */
 if(S.sf<=0){S.sf=.35+rnd()*.35;S.side=rnd()<.5?1:-1}
 const ux=(e.x-u.x)/d,uz=(e.z-u.z)/d;
 S.vec={x:ux*k-uz*S.side*.7,z:uz*k+ux*S.side*.7};S.vk=1;S.mv='steer'}

function planCombat3(u,S,T){                                  /* Lv3：壁に隠れて顔を出す／ヒット&アウェイ */
 const L=S.L,e=T.e,now=S.t,R=reach(u),a=u.c.a,lob=!!a.lob,short=R<=5.6;
 const d=max(.01,T.d),ux=(e.x-u.x)/d,uz=(e.z-u.z)/d,hpf=u.hp/u.mx,ammo=u.ammo;
 const rHp=L.retreatHp+(u.gems>0?.1:0),lo=lob?2.6:max(1.8,R*.36),hi=R*.92;
 S.sneak=false;
 /* 睨み合い・隠れっぱなしが続いた → 隠れるのをやめて一気に詰める(ある程度近づいたら撃ちながら左右に動く) */
 if(S.push>S.t&&hpf>rHp*.8){
  if(!((lob||los(u.x,u.z,e.x,e.z))&&d<=R*.7)){S.mv='goal';S.goal={x:e.x,z:e.z};S.goalKind='chase';S.ph='peek';return}
  if(S.sf<=0){S.sf=.3+rnd()*.5;S.side=-S.side||1}
  S.mv='steer';S.vec={x:-uz*S.side+ux*.25,z:ux*S.side+uz*.25};S.vk=.85;S.ph='peek';return}
 const emp=enemyEmpty(T,now);T.empty=emp;
 if(S.sf<=0){S.sf=.3+rnd()*.5;S.side=-S.side||1}
 /* ブッシュで待ち伏せ(近距離キャラ)：敵がこちらに気づいていないうちは動かず、射程に入ったら一気に攻める */
 if(L.ambush&&short&&!lob&&inBush(u.x,u.z)&&!vis(u,e)&&d>R+.6&&d<R+6.5&&ammo>=2&&hpf>rHp&&S.amb<4.5){S.mv='hold';S.amb+=S.dtPlan;return}
 /* フェーズ：peek(顔を出して撃つ) ⇔ cover(隠れて弾を溜める) */
 let ph=S.ph;
 if(ph==='peek'){
  if(ammo<(a.en?.12:1)||hpf<rHp||(S.hurt>u.mx*.3&&ammo<2.5)||(S.volley>=S.volMax&&!emp)){if(!(emp&&ammo>=1&&hpf>rHp*.8))ph='cover'}
  if(d<lo&&ammo>=1&&hpf>.25)ph='peek'}                        /* 近づかれたら撃ち返す */
 else{
  if(now-S.phT>.45&&ammo>=(a.en?.7:2)&&hpf>=rHp+.06&&S.hurt<u.mx*.1)ph='peek';
  else if(emp&&ammo>=1.5&&hpf>rHp)ph='peek';                  /* 敵が撃ち切った → 詰める */
  else if(now-S.phT>5||(d<lo&&ammo>=1))ph='peek'}
 if(ph!==S.ph){S.ph=ph;S.phT=now;S.volley=0;S.volMax=2+(rnd()<.45?1:0)}
 const others=[];for(const m of S.mem.values())if(m!==T&&m.vis)others.push({x:m.e.x,z:m.e.z,r:(m.e.tf&&m.e.c.tf?m.e.c.tf.reach:m.e.c.a.rng)+1});
 const ctx={u,S,ex:e.x,ez:e.z,lo,hi,R,lob,others};
 if(ph==='cover'){
  const seen=los(e.x,e.z,u.x,u.z)||others.some(o=>hyp(u.x-o.x,u.z-o.z)<o.r&&los(o.x,o.z,u.x,u.z));
  const atCell=S.goalKind==='cover'&&S.goal&&hyp(S.goal.x-u.x,S.goal.z-u.z)<.55;
  if(!seen||atCell){S.mv='hold';return}                         /* 隠れた(隠れ場所に着いた)。弾が溜まるまで待つ */
  const c=bestCell(ctx,'cover',S,u);
  if(c){S.mv='goal';S.goal=c;S.goalKind='cover'}else{S.mv='steer';S.vec={x:-ux-uz*S.side*.3,z:-uz+ux*S.side*.3};S.vk=1}
  return}
 const atkLos=lob||los(u.x,u.z,e.x,e.z);
 if(atkLos&&d>=lo&&d<=hi){                                    /* ここから撃てる */
  if(coverNear(ctx,u.x,u.z)&&!lob){S.mv='hold'}               /* 角から覗いている位置：動かない */
  else{S.mv='steer';S.vec={x:-uz*S.side,z:ux*S.side};S.vk=.7}  /* 左右に小さく動いて当たりにくく */
  return}
 if(atkLos&&d<lo&&!lob){S.mv='steer';S.vec={x:-ux-uz*S.side*.4,z:-uz+ux*S.side*.4};S.vk=1;return}   /* 近すぎ → 撃ちながら下がる */
 let c=bestCell(ctx,'peek',S,u);
 if(c&&hyp(c.x-u.x,c.z-u.z)<.5)c=null;                       /* 着いたのに撃てない(角の影) → 目的地を変えて詰める */
 if(c){S.mv='goal';S.goal=c;S.goalKind='peek'}else{S.mv='goal';S.goal={x:e.x,z:e.z};S.goalKind='chase'}}

function plan(u,S,T){
 S.dtPlan=max(.05,S.t-(S.planT==null?S.t-.3:S.planT));S.planT=S.t;
 if(KO&&inGas(u.x,u.z,1.2)){S.mv='goal';S.goal={x:MX,z:MZ};S.goalKind='gas';S.sneak=false;return}   /* 毒ガスが最優先 */
 if(T&&S.escape>S.t){S.mv='goal';S.goal=ownBase(u);S.goalKind='escape';S.sneak=false;return}
 if(T){
  S.huntT=0;
  if(S.tgtT!==T.e){S.tgtT=T.e;S.engT=S.t}                  /* 目標が変わった → 数え直し */
  const act=max(S.lastShot,S.hurtAt,S.engT);
  if(S.L.stall&&S.push<=S.t&&S.t-act>S.L.stall&&T.d>2.2){S.push=S.t+3.5+rnd()*2;S.engT=S.t}    /* 撃ちも撃たれもしないまま続いた */
  if(S.L.cover)planCombat3(u,S,T);else planCombat2(u,S,T);return}
 S.tgtT=null;
 S.amb=max(0,S.amb-S.dtPlan);S.retreat=S.retreat&&u.hp/u.mx<.6?1:0;
 planTravel(u,S)}

/* ---------- 移動 ---------- */
function pathTo(u,S,g){
 return findPath(u.x,u.z,g.x,g.z,(tx,tz)=>{
  let c=0;if(inGas(tx+.5,tz+.5,.8))c+=5;if(S.sneak&&inBush(tx+.5,tz+.5))c-=.3;
  if(!okc(tx+1,tz)||!okc(tx-1,tz)||!okc(tx,tz+1)||!okc(tx,tz-1))c+=.25;     /* 壁ぎわは少し遠回り扱い(角で引っかかりにくい道を選ぶ) */
  for(const a of S.av)if(S.t-a.t<6&&abs(tx+.5-a.x)<1.1&&abs(tz+.5-a.z)<1.1)c+=3;   /* さっき詰まった場所は避ける */
  return c})}
function remLen(u,P){let l=0,x=u.x,z=u.z;for(const p of P){l+=hyp(p.x-x,p.z-z);x=p.x;z=p.z}return l}
function follow(u,S){
 const g=S.goal;if(!g)return null;
 const dg=hyp(g.x-u.x,g.z-u.z);if(dg<.45)return null;                /* 着いた(ジェムは .85 以内で拾える) */
 if(dg<3&&sweep(u,g.x,g.z)){S.path=null;return g}              /* 近くて壁も無い → まっすぐ */
 if(!S.path||S.t-S.pathT>(S.L.cover?1.1:1.6)||hyp(S.pg.x-g.x,S.pg.z-g.z)>1.3){
  S.path=pathTo(u,S,g);S.pathT=S.t;S.pg={x:g.x,z:g.z};
  if(!S.path){S.noPath=1;return null}                           /* 完全に閉じ込められている */
  S.noPath=0}
 const P=S.path;
 if(!P.length)return g;
 while(P.length>1&&hyp(P[0].x-u.x,P[0].z-u.z)<.5)P.shift();
 if(P.partial&&P.length===1&&hyp(P[0].x-u.x,P[0].z-u.z)<.45){S.unreach=S.t;return null}   /* 行ける所まで来た(目的地には届かない) */
 let ix=0;
 for(let i=1;i<P.length&&i<8;i++){if(sweep(u,P[i].x,P[i].z))ix=i;else break}   /* 見通せるところまで先読み(角を丸く曲がる) */
 if(ix>0)P.splice(0,ix);                                          /* 通り過ぎた中継点は捨てる */
 return P[0]}
/* 行きたい向きに壁が近ければ、少し向きをずらす */
function safeDir(u,S,dx,dz){
 const r=wr(u)+.04,base=atan2(dz,dx),sg=S.side||1;
 for(const off of[0,.45,-.45,.9,-.9,1.4,-1.4,2,-2]){
  const a=base+off*sg,cx=cos(a),cz=sin(a);
  if(!hit(u.x+cx*.6,u.z+cz*.6,r)&&!hit(u.x+cx*.3,u.z+cz*.3,r))return{x:cx,z:cz}}
 return{x:dx,z:dz}}
/* 詰まった時に逃げる向き：歩ける向きの中から、今の進行方向と直角に近いものを選ぶ(壁づたいに抜ける) */
function freeAngle(u,S){
 const base=S.hl?atan2(S.hz,S.hx):rnd()*6.28,pref=base+(rnd()<.5?1:-1)*Math.PI/2;let best=null,bs=-1e9;
 for(let i=0;i<16;i++){const a=i/16*6.2832;let d=.3;for(;d<2.4;d+=.3)if(hit(u.x+cos(a)*d,u.z+sin(a)*d,wr(u)))break;
  if(d<1)continue;const sc=d+rnd()*1.2+cos(a-pref)*1.4;if(sc>bs){bs=sc;best=a}}
 return best==null?rnd()*6.28:best}
/* 引っかかり検出(0.5秒ごと)：動けていない／動いているのに目的地へ近づいていない(壁づたいに滑っている) */
function watch(u,S){
 const L=S.L,moved=hyp(u.x-S.px,u.z-S.pz),exp=spd(u)*L.spd*.5;let bad=false;
 if(S.want&&S.rn<=0&&S.t>=S.dodgeUntil){
  if(S.mv==='steer'){if(moved<exp*.2){S.side=-S.side||1;S.sf=0}}                        /* 戦闘中に壁にぶつかる → 反対側へ避ける */
  else if(S.goal&&hyp(S.goal.x-u.x,S.goal.z-u.z)<.9){}                          /* 目的地のすぐそば＝着いた */
  else if(moved<exp*.3)bad=true;
  else if(S.mv==='goal'&&S.path&&S.path.length&&S.prPath===S.path){const rl=remLen(u,S.path);if(rl>1&&S.prLen-rl<exp*.12)bad=true}}
 S.prPath=S.path;S.prLen=S.path&&S.path.length?remLen(u,S.path):0;
 S.px=u.x;S.pz=u.z;
 if(!bad){S.stuck=0;return}
 S.stuck++;S.stuckAll=(S.t-S.stuckT<8?S.stuckAll:0)+1;S.stuckT=S.t;
 S.path=null;S.av.push({x:u.x,z:u.z,t:S.t});if(S.av.length>6)S.av.shift();     /* 経路を引き直す(詰まった場所は避ける) */
 if(S.stuck>=2){S.rn=.3+rnd()*.3;S.ra=freeAngle(u,S);S.stuck=0}                   /* それでもダメなら少し脇へ抜ける */
 if(S.stuckAll>=4){markBad(S);S.stuckAll=0;S.pat=null;S.tt=0}}                    /* 何度も詰まる目的地はあきらめる */
function move(u,S,dt){
 const L=S.L;let mx=0,mz=0,k=0,snap=false;
 if(S.t<S.dodgeUntil){mx=S.dodgeVec.x;mz=S.dodgeVec.z;k=1;snap=true}
 else if(S.rn>0){S.rn-=dt;mx=cos(S.ra);mz=sin(S.ra);k=.9;snap=true}
 else if(S.pause>S.t){k=0}
 else if(S.mv==='steer'){mx=S.vec.x;mz=S.vec.z;k=S.vk}
 else if(S.mv==='goal'){const w=follow(u,S);if(w){mx=w.x-u.x;mz=w.z-u.z;k=1;
  /* 道中は少しだけ左右にふらつく(一直線だとロボットっぽい)。壁が近い時はしない */
  const gk=S.goalKind;
  if(L.wob&&(gk==='travel'||gk==='hunt'||gk==='l1'||gk==='chase')&&hyp(mx,mz)>3.5&&hyp(S.goal.x-u.x,S.goal.z-u.z)>5){
   const a=atan2(mz,mx)+sin(S.t*1.15+S.wph)*L.wob,cx=cos(a),cz=sin(a),r=wr(u)+.05;
   if(!hit(u.x+cx*.8,u.z+cz*.8,r)&&!hit(u.x+cx*.4,u.z+cz*.4,r)){mx=cx;mz=cz}}}}
 const l=hyp(mx,mz);let vx=0,vz=0;
 S.want=0;
 if(k>0&&l>.02){
  mx/=l;mz/=l;
  /* 向きをなめらかに変える(人間のスティック操作っぽく。回避や脱出は即座に) */
  if(!snap&&S.hl){const a=min(1,dt*L.turn),bx=S.hx+(mx-S.hx)*a,bz=S.hz+(mz-S.hz)*a,bl=hyp(bx,bz);if(bl>.25){mx=bx/bl;mz=bz/bl}}
  S.hx=mx;S.hz=mz;S.hl=1;
  const d=safeDir(u,S,mx,mz);
  const s=spd(u)*L.spd*k;vx=d.x*s;vz=d.z*s;u.mvg=1;S.want=1;if(u.fa<=0)u.dir=atan2(d.z,d.x)}
 else S.hl=0;
 S.sk-=dt;if(S.sk<=0){S.sk=.5;watch(u,S)}
 drive(u,dt,vx,vz)}

function runSmart(u,S,dt){
 const L=S.L;
 S.sf-=dt;
 S.pt-=dt;if(S.pt<=0){S.pt=L.think*(.8+rnd()*.4);perceive(u,S)}
 trackHurt(u,S,dt);
 if(L.dodge)dodgeCheck(u,S);
 const T=S.tgt&&S.tgt.vis&&S.tgt.e.alive?S.tgt:null;
 if(T)T.d=hyp(T.e.x-u.x,T.e.z-u.z);
 S.tt-=dt;
 const te=T?T.e:null;
 if(S.tt<=0||te!==S.lastT){S.tt=(L.cover?.35:.5)+rnd()*.15;S.lastT=te;plan(u,S,T)}
 move(u,S,dt);
 fire(u,S,dt,T);
 if(HS&&!T)hsShoot(u,S,dt)}

/* ---------- 入口 ---------- */
function run(u,dt){
 let S=u.ba;if(!S||S.u!==u)S=u.ba=mkState(u);
 if(S.last==null||tm-S.last>.5||S.round!==roundId())resetTac(S,u);   /* 復活・ラウンド替わりなどで状態をリセット */
 S.last=tm;S.t+=dt;S.L=LV[S.lv];
 if(S.lv===1)runClassic(u,S,dt);else runSmart(u,S,dt)}
function levels(){return U.filter(u=>u.ba).map(u=>({name:u.c.n,team:u.team,lv:u.ba.lv}))}
function setLevel(n){OPT.force=n>=1&&n<=3?n|0:0;for(const u of U)if(u.ba){u.ba.lv=OPT.force||1+Math.floor(rnd()*3);u.ba.L=LV[u.ba.lv];u.ba.last=null}}
window.BOTAI={run,LV,levels,setLevel,OPT};
})();
