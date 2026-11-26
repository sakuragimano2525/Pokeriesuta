/* =====================================================================
   vfx.js : 高グラフィックス エフェクトエンジン
   - インスタンシング描画のパーティクル(加算/通常の2レイヤー)で 1〜2 draw call
   - 光球・ブルーム風グロー・ストリーク・稲妻・地面衝撃波・焼け跡・爆発ライト
   - script.js から VFX.xxx() を呼ぶだけ（three.js r128 / 画像素材なし・全部プログラム生成）
   ===================================================================== */
const VFX=(()=>{
const T=THREE,rnd=Math.random,PI=Math.PI,TAU=PI*2;
let gs=null,cam=null,light=null,lt=0,fr=0;
const GT=(window.GQ&&GQ.t!=null)?GQ.t:2,lowEnd=(navigator.hardwareConcurrency||8)<=4||Math.min(devicePixelRatio||1,2)>=3||GT==0;
const Q=lowEnd?.6:GT==1?.8:1,N=k=>Math.max(1,Math.round(k*Q));
const R=(a,b)=>a+rnd()*(b-a),H=c=>[(c>>16&255)/255,(c>>8&255)/255,(c&255)/255];
const FLAME_W=.5;   /* ユニバードの炎の基準幅。攻撃範囲(エイム表示)の幅と同じ。炎の太さを変えたいときはこの数字だけ */

/* ---------- テクスチャアトラス(4x4, 各64px。白+アルファのみ) ---------- */
const TILE={glow:0,flare:1,smoke:2,ring:3,flame:4,shard:5,snow:6,streak:7,dot:8,cres:9,cross:10,star:11,hex:12,rays:13,blot:14,crack:15};
function atlas(){const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');
 const tl=(i,f)=>{x.save();x.translate(i%4*64,Math.floor(i/4)*64);x.beginPath();x.rect(0,0,64,64);x.clip();f();x.restore()};
 const rg=(r,st)=>{const g=x.createRadialGradient(32,32,0,32,32,r);st.forEach(s=>g.addColorStop(s[0],`rgba(255,255,255,${s[1]})`));return g};
 tl(0,()=>{x.fillStyle=rg(32,[[0,1],[.18,.6],[.45,.18],[1,0]]);x.fillRect(0,0,64,64)});
 tl(1,()=>{x.fillStyle=rg(30,[[0,1],[.1,.9],[.3,.3],[1,0]]);x.fillRect(0,0,64,64);[[0,29,64,6],[29,0,6,64]].forEach(([a,b,w,h])=>{const g=x.createLinearGradient(a?0:0,b?0:0,w>h?64:0,w>h?0:64);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.5,'rgba(255,255,255,.95)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(a,b,w,h)});});
 tl(2,()=>{for(let i=0;i<12;i++){const a=rnd()*TAU,d=rnd()*14,cx=32+Math.cos(a)*d,cy=32+Math.sin(a)*d,r=10+rnd()*12,g=x.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,'rgba(255,255,255,.34)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64)}});
 tl(3,()=>{x.fillStyle=rg(31,[[0,0],[.55,0],[.62,.08],[.8,.95],[.9,.5],[1,0]]);x.fillRect(0,0,64,64)});
 tl(4,()=>{x.translate(32,38);x.scale(.62,1);let g=x.createRadialGradient(0,2,0,0,2,28);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.5,'rgba(255,255,255,.55)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.beginPath();x.arc(0,2,28,0,TAU);x.fill();g=x.createRadialGradient(0,-16,0,0,-16,18);g.addColorStop(0,'rgba(255,255,255,.8)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.beginPath();x.arc(0,-16,18,0,TAU);x.fill()});
 tl(5,()=>{x.fillStyle=rg(30,[[0,.45],[1,0]]);x.fillRect(0,0,64,64);x.fillStyle='#fff';x.shadowColor='#fff';x.shadowBlur=6;x.beginPath();x.moveTo(32,3);x.lineTo(38,26);x.lineTo(61,32);x.lineTo(38,38);x.lineTo(32,61);x.lineTo(26,38);x.lineTo(3,32);x.lineTo(26,26);x.closePath();x.fill()});
 tl(6,()=>{x.strokeStyle='#fff';x.shadowColor='#fff';x.shadowBlur=5;x.lineCap='round';x.lineWidth=3;for(let i=0;i<6;i++){x.save();x.translate(32,32);x.rotate(i*PI/3);x.beginPath();x.moveTo(0,0);x.lineTo(0,-25);x.moveTo(0,-14);x.lineTo(-7,-21);x.moveTo(0,-14);x.lineTo(7,-21);x.stroke();x.restore()}});
 {const id=x.createImageData(64,64);for(let j=0;j<64;j++)for(let i=0;i<64;i++){const u=i/63,v=j/63,ex=Math.min(1,u/.22)*Math.min(1,(1-u)/.22),ey=Math.exp(-Math.pow((v-.5)*4.6,2));const p=(j*64+i)*4;id.data[p]=id.data[p+1]=id.data[p+2]=255;id.data[p+3]=Math.round(255*Math.min(1,ex*ey*1.15))}x.putImageData(id,7*64%256,Math.floor(7/4)*64)}
 tl(8,()=>{x.fillStyle=rg(30,[[0,1],[.5,1],[.72,.3],[1,0]]);x.fillRect(0,0,64,64)});
 tl(9,()=>{x.fillStyle='#fff';x.shadowColor='#fff';x.shadowBlur=8;x.beginPath();x.moveTo(8,4);x.quadraticCurveTo(66,32,8,60);x.quadraticCurveTo(34,32,8,4);x.fill()});
 tl(10,()=>{x.fillStyle='#fff';x.shadowColor='#fff';x.shadowBlur=8;x.fillRect(25,8,14,48);x.fillRect(8,25,48,14)});
 tl(11,()=>{x.fillStyle='#fff';x.shadowColor='#fff';x.shadowBlur=8;x.beginPath();for(let i=0;i<10;i++){const r=i%2?11:28,a=-PI/2+i*PI/5;x[i?'lineTo':'moveTo'](32+Math.cos(a)*r,32+Math.sin(a)*r)}x.closePath();x.fill()});
 tl(12,()=>{x.strokeStyle='#fff';x.shadowColor='#fff';x.shadowBlur=4;x.lineWidth=3;x.fillStyle='rgba(255,255,255,.25)';x.beginPath();for(let i=0;i<6;i++){const a=i*PI/3+PI/6;x[i?'lineTo':'moveTo'](32+Math.cos(a)*26,32+Math.sin(a)*26)}x.closePath();x.fill();x.stroke()});
 tl(13,()=>{x.translate(32,32);for(let i=0;i<14;i++){x.save();x.rotate(i/14*TAU+rnd()*.2);const w=.05+rnd()*.07,L=14+rnd()*18,g=x.createLinearGradient(0,0,L,0);g.addColorStop(0,'rgba(255,255,255,.9)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.beginPath();x.moveTo(0,-1.2);x.lineTo(L,-L*w);x.lineTo(L,L*w);x.lineTo(0,1.2);x.fill();x.restore()}});
 tl(14,()=>{for(let i=0;i<26;i++){const a=rnd()*TAU,d=Math.sqrt(rnd())*20,cx=32+Math.cos(a)*d,cy=32+Math.sin(a)*d,r=4+rnd()*9,g=x.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,'rgba(255,255,255,.55)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64)}x.globalCompositeOperation='destination-in';x.fillStyle=rg(31,[[0,1],[.7,.85],[1,0]]);x.fillRect(0,0,64,64)});
 tl(15,()=>{x.translate(32,32);x.strokeStyle='#fff';x.lineCap='round';for(let i=0;i<9;i++){x.save();x.rotate(i/9*TAU+rnd()*.3);x.lineWidth=2.6;x.beginPath();x.moveTo(3,0);let p=3;while(p<30){p+=R(4,8);x.lineTo(p,R(-3,3))}x.stroke();x.lineWidth=1.4;x.beginPath();x.moveTo(14,0);x.lineTo(22,R(-9,9));x.stroke();x.restore()}});
 const t=new T.CanvasTexture(c);t.generateMipmaps=false;t.minFilter=T.LinearFilter;t.magFilter=T.LinearFilter;return t}

/* ---------- インスタンシング粒子レイヤー ---------- */
const VS=`attribute vec3 iPos;attribute vec3 iD;attribute vec4 iCol;attribute vec4 iP;varying vec2 vUv;varying vec4 vCol;varying float vT;
void main(){vec2 q=position.xy;float sz=iP.x,rt=iP.y,m=iP.w;vec2 r=vec2(cos(rt)*q.x-sin(rt)*q.y,sin(rt)*q.x+cos(rt)*q.y);
vec4 a=modelViewMatrix*vec4(iPos,1.0);vec3 p=a.xyz;
if(m>.5&&m<1.5){vec4 b=modelViewMatrix*vec4(iPos+iD,1.0);vec2 d=b.xy-a.xy;float L=length(d);d=L>1e-4?d/L:vec2(1.,0.);vec2 n=vec2(-d.y,d.x);p=(a.xyz+b.xyz)*.5;p.xy+=d*q.x*(L+sz)+n*q.y*sz;}
else if(m>1.5){p=(modelViewMatrix*vec4(iPos+vec3(r.x,0.,r.y)*sz,1.0)).xyz;}
else{p.xy+=r*sz;}
vUv=q+.5;vCol=iCol;vT=iP.z;gl_Position=projectionMatrix*vec4(p,1.0);}`;
const FS=`uniform sampler2D tex;varying vec2 vUv;varying vec4 vCol;varying float vT;
void main(){float c=mod(vT,4.),r=3.-floor(vT/4.);vec2 uv=(vec2(c,r)+clamp(vUv,.012,.988))/4.;vec4 t=texture2D(tex,uv);gl_FragColor=vec4(vCol.rgb,vCol.a*t.a);}`;
const SZ=26;           /* 1粒子のシミュレーション領域 */
class Layer{
 constructor(cap,add,tex,order){this.cap=cap;this.n=0;this.i=0;this.s=new Float32Array(cap*SZ);
  this.pos=new Float32Array(cap*3);this.dd=new Float32Array(cap*3);this.col=new Float32Array(cap*4);this.pp=new Float32Array(cap*4);
  const g=new T.InstancedBufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,.5,0],3));g.setIndex([0,1,2,0,2,3]);
  this.A=[['iPos',this.pos,3],['iD',this.dd,3],['iCol',this.col,4],['iP',this.pp,4]].map(([k,a,n])=>{const at=new T.InstancedBufferAttribute(a,n);at.setUsage(T.DynamicDrawUsage);g.setAttribute(k,at);return at});
  g.instanceCount=0;this.g=g;
  const m=new T.ShaderMaterial({uniforms:{tex:{value:tex}},vertexShader:VS,fragmentShader:FS,transparent:true,depthWrite:false,depthTest:true,side:T.DoubleSide,blending:add?T.AdditiveBlending:T.NormalBlending});
  this.mesh=new T.Mesh(g,m);this.mesh.frustumCulled=false;this.mesh.renderOrder=order}
 clear(){this.s.fill(0);this.n=0;this.g.instanceCount=0}
 add(tile,x,y,z,vx,vy,vz,life,s0,s1,c0,c1,a0,a1,gr,dr,rot,rv,str,mode){
  let k=this.i;this.i=(this.i+1)%this.cap;const s=this.s,o=k*SZ,A=H(c0),B=H(c1);
  s[o]=x;s[o+1]=y;s[o+2]=z;s[o+3]=vx;s[o+4]=vy;s[o+5]=vz;s[o+6]=Math.max(.016,life);s[o+7]=0;s[o+8]=s0;s[o+9]=s1;s[o+10]=rot||0;s[o+11]=rv||0;s[o+12]=gr||0;s[o+13]=dr||0;s[o+14]=str||0;s[o+15]=mode||0;s[o+16]=tile;
  s[o+17]=A[0];s[o+18]=A[1];s[o+19]=A[2];s[o+20]=B[0];s[o+21]=B[1];s[o+22]=B[2];s[o+23]=a0;s[o+24]=a1;s[o+25]=1}
 update(dt){const s=this.s,P=this.pos,D=this.dd,C=this.col,Pp=this.pp;let n=0;
  for(let k=0;k<this.cap;k++){const o=k*SZ;if(!s[o+25])continue;
   const age=s[o+7]+dt,life=s[o+6];if(age>=life){s[o+25]=0;continue}s[o+7]=age;const kk=age/life,m=s[o+15];
   if(m!=1){const dr=1/(1+s[o+13]*dt);s[o+3]*=dr;s[o+4]=(s[o+4]-s[o+12]*dt)*dr;s[o+5]*=dr;s[o]+=s[o+3]*dt;s[o+1]+=s[o+4]*dt;s[o+2]+=s[o+5]*dt;if(s[o+1]<.04&&s[o+12]>0){s[o+1]=.04;s[o+4]*=-.35;s[o+3]*=.7;s[o+5]*=.7}}
   const a=(s[o+23]+(s[o+24]-s[o+23])*kk)*Math.min(1,age/.035),i3=n*3,i4=n*4,sc=s[o+8]+(s[o+9]-s[o+8])*kk;
   P[i3]=s[o];P[i3+1]=s[o+1];P[i3+2]=s[o+2];
   if(m==1){D[i3]=s[o+3];D[i3+1]=s[o+4];D[i3+2]=s[o+5]}else if(s[o+14]>0){D[i3]=-s[o+3]*s[o+14];D[i3+1]=-s[o+4]*s[o+14];D[i3+2]=-s[o+5]*s[o+14]}else{D[i3]=D[i3+1]=D[i3+2]=0}
   C[i4]=s[o+17]+(s[o+20]-s[o+17])*kk;C[i4+1]=s[o+18]+(s[o+21]-s[o+18])*kk;C[i4+2]=s[o+19]+(s[o+22]-s[o+19])*kk;C[i4+3]=a;
   Pp[i4]=sc;Pp[i4+1]=s[o+10]+s[o+11]*age;Pp[i4+2]=s[o+16];Pp[i4+3]=m==1||s[o+14]>0?1:m;n++}
  this.n=n;this.g.instanceCount=n;this.A.forEach(at=>{at.updateRange.count=-1;at.needsUpdate=true})}}
let LA=null,LN=null;
const E=(L,t,x,y,z,vx,vy,vz,life,s0,s1,c0,c1,a0,a1,g,d,rot,rv,str,mode)=>(L?LN:LA).add(t,x,y,z,vx,vy,vz,life,s0,s1,c0,c1,a0,a1,g,d,rot,rv,str,mode);

/* ---------- キャラ別パレット ---------- */
const PL=[{c:0xb46bff,h:0xf2dcff},{c:0x3aa6ff,h:0xdaf1ff},{c:0xff8a2b,h:0xffe2b0},{c:0x4ff0e0,h:0xe6fffb},{c:0xff7a1a,h:0xffe27a},{c:0x9fe05a,h:0xfff0a8},{c:0xdfe8ff,h:0xffffff},{c:0x8ae8ff,h:0xffffff},{c:0xff7ab8,h:0xffe3f1},{c:0xb8c8ff,h:0xffffff},{c:0xffd23f,h:0xffffff},{c:0x8ae6ff,h:0xffffff},{c:0xffd45a,h:0xffffff}];
const pal=id=>PL[id]||{c:0xffffff,h:0xffffff},tcol=u=>u&&u.team?0xff6a5a:0x6ac8ff;
const cs=()=>cam?cam.quaternion:null;

/* ---------- 基本パーツ ---------- */
function ring(x,z,r0,r1,life,c,a,y){E(0,TILE.ring,x,y||.09,z,0,0,0,life,r0*2,r1*2,c,c,a==null?.9:a,0,0,0,0,0,0,2)}
function flash(x,z,c,i){if(!light)return;light.color.setHex(c);light.position.set(x,1.6,z);light.userData.i=Math.max(light.userData.i||0,i)}
function burst(x,y,z,c,n){n=N(n);const w=H(c);for(let i=0;i<n;i++){const a=rnd()*TAU,s=R(1.5,6),up=R(1,5);
  E(0,TILE.dot,x,y,z,Math.cos(a)*s,up,Math.sin(a)*s,R(.25,.55),R(.07,.15),.02,c,c,1,0,14,1.2,0,0,.05,0)}
 E(0,TILE.glow,x,y,z,0,0,0,.2,.2,Math.min(1.4,.5+n*.04),0xffffff,c,.8,0,0,0,0,0,0,0)}
function sparks(x,y,z,c,n,sp,up,sz){n=N(n);for(let i=0;i<n;i++){const a=rnd()*TAU,s=R(.4,1)*sp;E(0,TILE.streak,x,y,z,Math.cos(a)*s,R(.2,1)*up,Math.sin(a)*s,R(.25,.6),sz||.07,.02,0xffffff,c,1,0,12,.8,0,0,.07,0)}}
function smoke(x,y,z,c,n,sz,life,sp,a){n=N(n);for(let i=0;i<n;i++){const an=rnd()*TAU,s=R(.2,1)*sp;E(1,TILE.smoke,x+R(-.2,.2),y,z+R(-.2,.2),Math.cos(an)*s,R(.3,1.1),Math.sin(an)*s,R(.7,1)*life,sz*.5,sz*1.5,c,c,a||.5,0,-.3,1.4,rnd()*TAU,R(-1,1),0,0)}}
function debris(x,z,n,c){n=N(n);for(let i=0;i<n;i++){const a=rnd()*TAU,s=R(1.5,5);E(1,TILE.shard,x,.3,z,Math.cos(a)*s,R(3,7),Math.sin(a)*s,R(.5,.9),.16,.08,c,0x2a1a10,1,.8,16,.6,rnd()*TAU,R(-8,8),0,0)}}
function scorch(x,z,r,c,life,a){E(1,TILE.blot,x,.045,z,0,0,0,life||4,r*2,r*2.1,c||0x120a08,c||0x120a08,a==null?.6:a,0,0,0,rnd()*TAU,0,0,2)}

/* ---------- 弾の見た目 ---------- */
const isU=(u,s)=>s===u.c.s||(!!u.c.s&&s.d===u.c.s.d&&s.v===u.c.s.v&&s.rng!==u.c.a.rng);
function muzzle(u,a,s){if(!u||u._mf===fr)return;u._mf=fr;const id=u.c.id,p=pal(id),ult=isU(u,s),k=(.6+(s.size||.2)*1.6)*(ult?1.5:1)*(id==2||id==9?1.3:1),x=u.x+Math.cos(a)*.75,z=u.z+Math.sin(a)*.75,y=.95;
 E(0,TILE.flare,x,y,z,0,0,0,.14,k*1.9,k*.7,0xffffff,p.c,1,0,0,0,rnd()*TAU,0,0,0);
 E(0,TILE.glow,x,y,z,0,0,0,.16,k*1.6,k*2.6,p.c,p.c,.7,0,0,0,0,0,0,0);
 const n=N(ult?9:5);for(let i=0;i<n;i++){const aa=a+R(-.45,.45),s2=R(4,11)*(ult?1.3:1);E(0,TILE.streak,x,y,z,Math.cos(aa)*s2,R(-.4,.9),Math.sin(aa)*s2,R(.12,.28),.07,.02,0xffffff,p.c,1,0,3,1.5,0,0,.08,0)}
 if(ult)ring(u.x,u.z,.3,2.4,.4,p.c,.7);
 if(id==4||id==2||id==9)return;flash(x,z,p.c,ult?1.4:.7)}
function bInit(b,u,s,a){const id=u.c.id,p=pal(id);b.vid=id;b.vc=p;b.ta=0;b.tc=tcol(u);b.isS=isU(u,s);
 const m=b.m;b.vk=s.lob?(s.can?'can':'lob'):s.cone?'cone':s.cloud?'cloud':s.blade?'blade':s.star?'star':s.fl?'flame':(id==2||id==9)?'punch':'orb';
 if(b.vk=='orb'||b.vk=='flame'||b.vk=='punch'){m.visible=false}
 if(b.vk=='punch'){b.pa=a}
 if(b.vk!='flame')muzzle(u,a,s)}
function bTick(b,dt){const p=b.vc;if(!p)return;const x=b.x,z=b.z,y=b.m.position.y,sc=b.m.scale.x,vk=b.vk,c=p.c,hc=p.h,id=b.vid,sp=Math.hypot(b.vx,b.vz),dx=b.vx/(sp||1),dz=b.vz/(sp||1);b.ta+=dt;const L=dt*1.7;
 if(vk=='orb'){const k=Math.max(.12,sc/.2),pr=b.p?1:0;
  E(0,TILE.glow,x,y,z,0,0,0,L,.9*k*2.3,.9*k*2.3,c,c,.55,.55,0,0,0,0,0,0);
  E(0,TILE.glow,x,y,z,0,0,0,L,.9*k*4.4,.9*k*4.4,b.tc,b.tc,.16,.16,0,0,0,0,0,0);
  E(0,TILE.flare,x,y,z,0,0,0,L,.62*k*1.4,.62*k*1.4,0xffffff,hc,1,1,0,0,b.ta*3,0,0,0);
  E(0,TILE.streak,x,y,z,b.vx,0,b.vz,L,.5*k*(id==3?1.6:1),.5*k,hc,c,.9,.9,0,0,0,0,(pr?.1:.055),0);
  if(b.ta>.025){b.ta=0;E(0,TILE.glow,x,y,z,R(-.3,.3),R(-.2,.5),R(-.3,.3),R(.25,.4),.55*k,.05,c,c,.5,0,0,3,0,0,0,0);
   if(id==0||id==1||id==6||id==10)E(0,TILE.shard,x,y,z,R(-1,1),R(0,1.2),R(-1,1),.3,.28*k,.02,0xffffff,c,.9,0,0,2,rnd()*TAU,R(-6,6),0,0);
   if(id==8)E(0,TILE.cross,x,y,z,R(-.4,.4),.6,R(-.4,.4),.45,.2*k,.05,0xffd0e8,c,.8,0,0,1,0,0,0,0);
   if(id==3)E(1,TILE.smoke,x,y,z,R(-.3,.3),R(.1,.5),R(-.3,.3),.6,.5*k,1.1*k,c,0x0a3a44,.35,0,0,1.5,rnd()*TAU,1,0,0);
   if(id==11)for(let i=0;i<2;i++){const a=rnd()*TAU,l=R(.3,.7);E(0,TILE.streak,x,y,z,Math.cos(a)*l,R(-.2,.2),Math.sin(a)*l,.07,.1,.05,0xffffff,c,1,0,0,0,0,0,0,1)}}}
 else if(vk=='flame'){const pr=Math.max(0,Math.min(1,1-b.l/(b.s0||5.2))),wv=FLAME_W*(1.2+.7*pr);   /* 見える炎の幅：根元は細く、先端でも攻撃範囲に近い太さ */
  for(let i=0;i<N(2);i++){const rx=R(-.2,.2),rz=R(-.2,.2);E(0,TILE.flame,x+rx*.25,.8,z+rz*.25,dx*2+rx,R(.6,1.6),dz*2+rz,R(.28,.45),wv*.45,wv*R(1.3,1.7),0xffe9a0,0xff3a06,.95,0,.5,2,rnd()*.5-.25,R(-2,2),0,0)}
  E(0,TILE.glow,x,.8,z,0,0,0,L,wv*1.2,wv*1.9,0xff9a30,0xff5010,.28,0,0,0,0,0,0,0);
  if(rnd()<dt*14)E(1,TILE.smoke,x,.9,z,dx,R(.5,1.2),dz,R(.5,.8),wv*.6,wv*1.2,0x303038,0x18181c,.28,0,-.3,1.3,rnd()*TAU,1,0,0);
  if(rnd()<dt*18)E(0,TILE.dot,x,.9,z,R(-1.5,1.5),R(1,3),R(-1.5,1.5),R(.4,.8),.07,.02,0xffe070,0xff6a10,1,6,0,.5,0,0,0,0)}
 else if(vk=='punch'){const a=b.pa,k=Math.max(.5,sc/.42);
  E(0,TILE.cres,x,.9,z,0,0,0,L,k*(id==2?2.9:2.4),k*(id==2?3.3:2.8),hc,c,.95,0,0,0,a,0,0,2);
  E(0,TILE.cres,x-dx*.25,.88,z-dz*.25,0,0,0,L,k*3.2,k*3.6,c,c,.5,0,0,0,a,0,0,2);
  E(0,TILE.glow,x,.9,z,0,0,0,L,k*2.2,k*2.2,c,c,.28,0,0,0,0,0,0,0);
  if(b.ta>.03){b.ta=0;const side=R(-1,1);E(0,TILE.streak,x+dz*side*.9,.9,z-dx*side*.9,-b.vx*.1,R(0,.6),-b.vz*.1,.25,.08,.02,0xffffff,c,.9,0,0,2,0,0,.14,0);
   E(1,TILE.smoke,x+dz*side,.4,z-dx*side,R(-.4,.4),R(.3,.8),R(-.4,.4),.6,.35,.9,id==2?0x8a6a50:0x8a94b0,0x8a8a90,.3,0,0,1.5,rnd()*TAU,1,0,0)}}
 else if(vk=='star'||vk=='blade'){const bl=vk=='blade',cc=bl?0xe8f0ff:0xffd23f;
  E(0,TILE.glow,x,y,z,0,0,0,L,sc*(bl?5:3.8),sc*(bl?5:3.8),cc,cc,.5,0,0,0,0,0,0,0);
  E(0,TILE.flare,x,y,z,0,0,0,L,sc*3,sc*3,0xffffff,cc,.9,.9,0,0,b.ta*9,0,0,0);
  if(b.ta>.03){b.ta=0;E(0,bl?TILE.streak:TILE.star,x,y,z,R(-1,1),R(-.3,.8),R(-1,1),.35,bl?.05:.2,.02,0xffffff,bl?0xaec4ff:0xffa020,.9,0,0,2,rnd()*TAU,R(-8,8),bl?.1:0,0);
   if(bl)E(0,TILE.streak,x,y,z,-b.vx*.4,0,-b.vz*.4,.16,.12,.02,0xffffff,0xff5a6a,.7,0,0,0,0,0,.1,0)}}
 else if(vk=='cone'){E(0,TILE.glow,x,y,z,0,0,0,L,1.4,1.4,0xaaf0ff,0x6ad0ff,.4,0,0,0,0,0,0,0);
  if(b.ta>.03){b.ta=0;E(0,TILE.snow,x,y,z,R(-.6,.6),R(-.2,.6),R(-.6,.6),.55,.28,.1,0xffffff,0x9be8ff,.9,0,0,1.5,rnd()*TAU,R(-4,4),0,0);E(1,TILE.smoke,x,y,z,R(-.3,.3),R(.1,.4),R(-.3,.3),.6,.35,.9,0xd8f6ff,0x9ad8ff,.28,0,0,1.5,rnd()*TAU,1,0,0)}}
 else if(vk=='cloud'){E(0,TILE.glow,x,y,z,0,0,0,L,1.5,1.5,0xfff2d0,0xffd23f,.38,0,0,0,0,0,0,0);
  if(b.ta>.03){b.ta=0;E(0,TILE.star,x,y,z,R(-.8,.8),R(0,1),R(-.8,.8),.5,.22,.04,0xffffff,0xffd23f,.9,0,0,2,rnd()*TAU,R(-5,5),0,0);E(1,TILE.smoke,x-dx*.3,y,z-dz*.3,R(-.3,.3),R(.1,.4),R(-.3,.3),.6,.5,1.1,0xffffff,0xf0e8ff,.35,0,0,1.5,rnd()*TAU,1,0,0)}}
 else if(vk=='lob'||vk=='can'){const can=vk=='can',big=b.big;
  E(0,TILE.glow,x,y,z,0,0,0,L,can?1.6:(big?2.2:1.2),can?1.6:(big?2.2:1.2),can?0x6adfff:0xff9a30,can?0x6adfff:0xff6010,.35,0,0,0,0,0,0,0);
  if(b.ta>.03){b.ta=0;if(can){E(0,TILE.snow,x,y,z,R(-.5,.5),R(-.2,.4),R(-.5,.5),.6,.3,.1,0xffffff,0x8ae8ff,.9,0,0,1.5,rnd()*TAU,R(-4,4),0,0)}
   else{E(0,TILE.dot,x,y+.25,z,R(-1,1),R(1,3),R(-1,1),.35,.12,.02,0xffffff,0xffa020,1,8,0,.5,0,0,0,0);E(1,TILE.smoke,x,y,z,R(-.3,.3),R(.1,.4),R(-.3,.3),.7,big?.6:.4,big?1.5:1,0x808088,0x303038,.32,0,0,1.5,rnd()*TAU,1,0,0)}}}}
function bHit(b,e,heal){if(b.vk=='flame'){for(let i=0;i<N(2);i++)E(0,TILE.flame,e.x+R(-.2,.2),.8,e.z+R(-.2,.2),R(-.5,.5),R(1,2.5),R(-.5,.5),.4,.4,.9,0xffe08a,0xff3a06,.9,0,-1,1,0,0,0,0);return}const x=e.x,z=e.z,p=b.vc||pal(-1),c=heal?0x6dff7a:p.c,id=b.vid;
 E(0,TILE.flare,x,1,z,0,0,0,.16,1.6,.5,0xffffff,c,1,0,0,0,rnd()*TAU,0,0,0);
 E(0,TILE.glow,x,1,z,0,0,0,.2,1.2,2.4,c,c,.7,0,0,0,0,0,0,0);
 sparks(x,1,z,heal?0x6dff7a:p.h,b.vk=='punch'?12:7,7,5,.07);burst(x,1,z,c,b.vk=='punch'?8:5);
 if(heal){for(let i=0;i<N(4);i++)E(0,TILE.cross,x+R(-.4,.4),.6,z+R(-.4,.4),0,R(1.5,3),0,.7,.22,.08,0xc8ffd0,0x40ff70,1,0,0,1,0,0,0,0)}
 if(b.vk=='punch'){ring(x,z,.2,1.8,.3,c,.8);E(0,TILE.rays,x,1,z,0,0,0,.22,1,3.2,0xffffff,c,.9,0,0,0,rnd()*TAU,0,0,0)}
 if(id==7||b.vk=='cone')for(let i=0;i<N(6);i++)E(0,TILE.shard,x,1,z,R(-3,3),R(1,4),R(-3,3),.5,.2,.04,0xffffff,0x7ad8ff,1,0,10,1,rnd()*TAU,R(-6,6),0,0);
 if(id==11)zapHit(x,z);
 flash(x,z,c,.6)}
function bEnd(b,kind){if(b.vk=='flame')return;const p=b.vc||pal(-1),x=b.x,z=b.z;if(kind==1){sparks(x,.9,z,p.h,6,6,3,.06);E(0,TILE.flare,x,.9,z,0,0,0,.14,.9,.3,0xffffff,p.c,1,0,0,0,rnd()*TAU,0,0,0);E(1,TILE.smoke,x,.7,z,0,.4,0,.5,.3,.8,0xb0a8c0,0x8a8498,.3,0,0,1,rnd()*TAU,1,0,0)}
 else E(0,TILE.glow,x,.9,z,0,0,0,.2,.8,.2,p.c,p.c,.5,0,0,0,0,0,0,0)}

/* ---------- 爆発 ---------- */
function explode(b,Rd){const o=b.o,id=o&&o.c?o.c.id:-1,big=!!b.big,teal=id===3,hot=teal?0xffffff:0xffeaa0,mid=teal?0x4ff0e0:0xff8a1a,dk=teal?0x0a5a66:0x5a1408,X=b.x,Z=b.z,r=Rd;
 flash(X,Z,teal?0x60fff0:0xff9a40,big?6:3.4);
 E(0,TILE.flare,X,.9,Z,0,0,0,.3,r*1.6,r*4,0xffffff,hot,1,0,0,0,rnd()*TAU,0,0,0);
 E(0,TILE.glow,X,.8,Z,0,0,0,.45,r*1.5,r*3.6,hot,mid,.9,0,0,0,0,0,0,0);
 for(let i=0,n=N(big?16:9);i<n;i++){const a=rnd()*TAU,s=R(.6,2.6)*r;E(0,TILE.glow,X+Math.cos(a)*r*.2,.6,Z+Math.sin(a)*r*.2,Math.cos(a)*s,R(.5,2.5),Math.sin(a)*s,R(.35,.6),r*.7,r*1.7,hot,dk,.85,0,0,3.2,0,0,0,0)}
 for(let i=0,n=N(big?12:7);i<n;i++){const a=rnd()*TAU,s=R(.4,2)*r;E(0,TILE.flame,X,.4,Z,Math.cos(a)*s,R(2.2,5.5),Math.sin(a)*s,R(.4,.7),r*.5,r*1.1,hot,mid,1,-1.5,0,2,R(-.3,.3),R(-1,1),0,0)}
 ring(X,Z,r*.2,r*2.3,.42,hot,.95,.1);ring(X,Z,r*.1,r*1.6,.55,mid,.7,.11);
 E(0,TILE.rays,X,.12,Z,0,0,0,.28,r*1.2,r*3,0xffffff,mid,.8,0,0,0,rnd()*TAU,0,0,2);
 for(let i=0,n=N(big?44:24);i<n;i++){const a=rnd()*TAU,s=R(5,14)*(big?1.3:1);E(0,TILE.streak,X,.6,Z,Math.cos(a)*s,R(1,6),Math.sin(a)*s,R(.35,.8),.1,.02,0xffffff,mid,1,0,16,.7,0,0,.09,0)}
 smoke(X,.5,Z,teal?0x1a4a54:0x38302e,big?11:6,big?2.1:1.4,1.6,r*.9,.5);
 debris(X,Z,big?12:6,0x6a4a30);
 scorch(X,Z,r*1.15,teal?0x0a2a30:0x120a08,big?6:4,.65);
 E(0,TILE.crack,X,.05,Z,0,0,0,big?4:2.5,r*2,r*2,mid,0x200400,.6,0,0,0,rnd()*TAU,0,0,2)}

/* ---------- nova (衝撃波・回復・着地) ---------- */
function nova(u,s){const id=u.c.id,p=pal(id),x=u.x,z=u.z,r=s.r;
 if(s.slam){flash(x,z,0xff9a40,6);
  E(0,TILE.flare,x,.8,z,0,0,0,.3,r,r*3.4,0xffffff,0xffc070,1,0,0,0,0,0,0,0);
  ring(x,z,.3,r*1.15,.5,0xffe0b0,1,.1);ring(x,z,.2,r*.85,.65,0xff8a2b,.8,.11);ring(x,z,.1,r*1.5,.38,0xffffff,.5,.12);
  E(1,TILE.crack,x,.05,z,0,0,0,5,r*2.3,r*2.3,0x1a0e08,0x1a0e08,.85,0,0,0,rnd()*TAU,0,0,2);E(0,TILE.crack,x,.06,z,0,0,0,1.4,r*2.2,r*2.3,0xff9a30,0x400800,.95,0,0,0,rnd()*TAU,0,0,2);
  scorch(x,z,r*.9,0x1a0e08,5,.5);
  for(let i=0,n=N(18);i<n;i++){const a=i/n*TAU+rnd()*.3;E(1,TILE.smoke,x+Math.cos(a)*r*.4,.25,z+Math.sin(a)*r*.4,Math.cos(a)*r*1.7,.5,Math.sin(a)*r*1.7,R(.7,1.1),.6,1.8,0x9a7a5a,0x6a5a4a,.5,0,0,3,rnd()*TAU,1,0,0)}
  debris(x,z,14,0x7a5a3a);sparks(x,.5,z,0xffc060,22,10,6,.09);return}
 if(s.rev||s.h){flash(x,z,0x7dffa0,3.4);
  ring(x,z,.2,r,.55,0x6dff7a,.95,.1);ring(x,z,.1,r*.7,.75,0xff9ad0,.8,.11);ring(x,z,.1,r*1.1,.4,0xffffff,.5,.12);
  E(0,TILE.glow,x,.1,z,0,0,0,.8,r*2,r*2.6,0x6dff7a,0x6dff7a,.35,0,0,0,0,0,0,2);
  E(0,TILE.streak,x,0,z,0,7,0,.6,r*.5,r*.15,0xffffff,0x6dff7a,.55,0,0,0,0,0,0,1);
  for(let i=0,n=N(22);i<n;i++){const a=rnd()*TAU,d=R(.3,r*.95);E(0,i%3?TILE.cross:TILE.star,x+Math.cos(a)*d,.2,z+Math.sin(a)*d,0,R(1.5,3.8),0,R(.8,1.4),R(.2,.34),.06,i%2?0xc8ffd0:0xffd0ec,i%2?0x40ff70:0xff7ab8,1,0,0,.6,0,R(-1,1),0,0)}return}
 if(id==10){flash(x,z,0xfff0b0,5);
  [[.15,r*1,.55,0xffffff],[.1,r*.7,.75,0xffd23f],[.1,r*1.35,.4,0xff9ad0]].forEach(([a,b,l,c],i)=>ring(x,z,a,b,l,c,.95-i*.15,.1+i*.01));
  E(0,TILE.rays,x,.14,z,0,0,0,.4,r*1.2,r*3.3,0xffffff,0xffd23f,.9,0,0,0,rnd()*TAU,.6,0,2);E(0,TILE.glow,x,.1,z,0,0,0,.5,r*2,r*3.4,0xfff0b0,0xffd23f,.55,0,0,0,0,0,0,2);
  E(0,TILE.flare,x,1,z,0,0,0,.3,r*.7,r*2.4,0xffffff,0xffd23f,1,0,0,0,0,0,0,0);
  for(let i=0,n=N(28);i<n;i++){const a=i/n*TAU,s2=R(5,9);E(0,i%2?TILE.star:TILE.shard,x,.7,z,Math.cos(a)*s2,R(.4,2),Math.sin(a)*s2,R(.5,.9),.34,.06,0xffffff,i%2?0xffd23f:0xff9ad0,1,2,2,0,rnd()*TAU,R(-6,6),0,0)}
  sparks(x,.7,z,0xfff0b0,16,11,3,.09);smoke(x,.3,z,0xf0e8ff,6,1.5,1,r*.9,.3);return}
 flash(x,z,p.c,2.4);ring(x,z,.2,r,.5,p.c,.95,.1);ring(x,z,.1,r*.7,.65,0xffffff,.7,.11);burst(x,.7,z,p.c,18);sparks(x,.7,z,p.h,12,8,3,.08)}
function charge(u,s){const id=u.c.id,p=pal(id),x=u.x,z=u.z,w=s.wind||.3;
 E(0,TILE.glow,x,.1,z,0,0,0,w+.2,.5,(s.r||3)*1.6,p.c,p.c,.6,0,0,0,0,0,0,2);ring(x,z,s.r||3,.3,w,p.h,.9,.1);
 for(let i=0,n=N(22);i<n;i++){const a=rnd()*TAU,d=R(1.8,3.2),sp=d/w;E(0,i%2?TILE.star:TILE.dot,x+Math.cos(a)*d,R(.2,1.4),z+Math.sin(a)*d,-Math.cos(a)*sp,0,-Math.sin(a)*sp,w,.22,.05,0xffffff,p.c,1,0,0,0,rnd()*TAU,R(-4,4),0,0)}}

/* ---------- 稲妻 ---------- */
function bolt(p,q){const a=[p.x,1.05,p.z],b=[q.x,1.05,q.z],d=Math.hypot(b[0]-a[0],b[2]-a[2])||1,nx=-(b[2]-a[2])/d,nz=(b[0]-a[0])/d;
 const one=(life,w,jit)=>{let px=a[0],py=a[1],pz=a[2];const n=Math.max(5,Math.round(d*1.5));for(let i=1;i<=n;i++){const k=i/n,j=i<n?R(-1,1)*jit:0,x=a[0]+(b[0]-a[0])*k+nx*j,y=a[1]+(b[1]-a[1])*k+(i<n?R(-.25,.25):0),z=a[2]+(b[2]-a[2])*k+nz*j;
   E(0,TILE.streak,px,py,pz,x-px,y-py,z-pz,life,w*3.4,w*3.4,0x4ac8ff,0x2a6aff,.55,.0,0,0,0,0,0,1);
   E(0,TILE.streak,px,py,pz,x-px,y-py,z-pz,life,w,w,0xffffff,0xbfeaff,1,0,0,0,0,0,0,1);
   if(i<n&&rnd()<.5)E(0,TILE.dot,x,y,z,R(-2,2),R(0,2),R(-2,2),.25,.1,.02,0xffffff,0x8ae6ff,1,6,1,0,0,0,0,0);
   if(i<n&&rnd()<.22){const bl=R(.5,1.4),ba=R(-1.2,1.2);E(0,TILE.streak,x,y,z,(b[0]-a[0])/d*bl*.6+nx*Math.sin(ba)*bl,R(-.3,.3),(b[2]-a[2])/d*bl*.6+nz*Math.sin(ba)*bl,life*.8,w*1.6,w*1.6,0xbfeaff,0x4ac8ff,.9,0,0,0,0,0,0,1)}
   px=x;py=y;pz=z}};
 one(.26,.13,.55);one(.17,.09,.8);one(.1,.07,.45);
 E(0,TILE.flare,a[0],a[1],a[2],0,0,0,.22,1.6,.4,0xffffff,0x4ac8ff,1,0,0,0,rnd()*TAU,0,0,0);flash(q.x,q.z,0x8ae6ff,2.2)}
function zapHit(x,z){E(0,TILE.flare,x,1,z,0,0,0,.25,2.2,.6,0xffffff,0x6ad0ff,1,0,0,0,rnd()*TAU,0,0,0);ring(x,z,.2,1.7,.3,0x8ae6ff,.9);sparks(x,1,z,0x9aeaff,12,8,5,.07);
 for(let i=0;i<N(3);i++){const a=rnd()*TAU;E(0,TILE.streak,x,.3,z,Math.cos(a)*1.3,.8,Math.sin(a)*1.3,.14,.1,.06,0xffffff,0x6ad0ff,1,0,0,0,0,0,0,1)}}

/* ---------- ジャンプ(ボディプレス/ポピンズ) ---------- */
function leapStart(u,s){const p=pal(u.c.id);E(0,TILE.flare,u.x,.5,u.z,0,0,0,.25,1,2.5,0xffffff,p.c,1,0,0,0,0,0,0,0);ring(u.x,u.z,.2,1.8,.35,p.c,.8);smoke(u.x,.2,u.z,u.c.id==3?0x4a9a90:0x8a7a68,6,.9,.8,2.2,.45);sparks(u.x,.3,u.z,p.h,12,7,3,.07)}
function leapTick(u,l,dt){const k=Math.min(1,l.t/l.T),p=pal(u.c.id),y=u.root.position.y;
 if(!l.s.piper){E(1,TILE.blot,l.ex,.05,l.ez,0,0,0,dt*2,1.5+k*l.s.r*1.4,1.5+k*l.s.r*1.4,0x000000,0x000000,.28*k+.05,0,0,0,0,0,0,2);ring(l.ex,l.ez,l.s.r*(1-k*.2),l.s.r*(1-k*.2),dt*2,0xff9a40,.35+.4*k,.08)}
 if(rnd()<dt*40)E(0,TILE.glow,u.x,y+.5,u.z,R(-.3,.3),R(-.3,.3),R(-.3,.3),.35,.8,.1,p.c,p.c,.45,0,0,1,0,0,0,0)}

/* ---------- バフ(スモーク/シールド) ---------- */
function buff(u,k){const x=u.x,z=u.z;
 if(k=='stealth'){E(0,TILE.flare,x,.9,z,0,0,0,.2,1.5,3.4,0xffffff,0xc8b0ff,.9,0,0,0,0,0,0,0);ring(x,z,.2,2.6,.45,0xc8b0ff,.7);
  for(let i=0,n=N(16);i<n;i++){const a=i/n*TAU+rnd()*.4,s=R(1.2,3);E(1,TILE.smoke,x,.4,z,Math.cos(a)*s,R(.2,1),Math.sin(a)*s,R(1.1,1.8),.8,2,i%2?0x6a5a8a:0x3a3050,0x2a2640,.65,0,0,2.2,rnd()*TAU,R(-1,1),0,0)}
  sparks(x,.8,z,0xffd0ff,12,6,3,.06);flash(x,z,0xb090ff,1.8)}
 else{flash(x,z,0x7aa8ff,2.6);ring(x,z,.2,2.2,.5,0x9ac0ff,.95);ring(x,z,.1,1.5,.6,0xffffff,.6);E(0,TILE.flare,x,.9,z,0,0,0,.25,1.5,3.2,0xffffff,0x7aa8ff,1,0,0,0,0,0,0,0);
  for(let i=0,n=N(14);i<n;i++){const a=i/n*TAU;E(0,TILE.hex,x+Math.cos(a)*1.1,R(.3,1.5),z+Math.sin(a)*1.1,Math.cos(a)*2.4,R(-.3,.5),Math.sin(a)*2.4,.7,.4,.12,0xffffff,0x7aa8ff,.9,0,0,2,rnd()*TAU,R(-3,3),0,0)}}}
function auraTick(u,dt){const b=u.bf;if(!b||(b.k!='stealth'&&b.k!='guard'))return;u._at=(u._at||0)-dt;if(u._at>0)return;u._at=.09;const x=u.x,z=u.z;
 if(b.k=='stealth'){const a=rnd()*TAU;E(1,TILE.smoke,x+Math.cos(a)*.5,.3,z+Math.sin(a)*.5,R(-.3,.3),R(.5,1),R(-.3,.3),1.1,.5,1.3,0x5a4a7a,0x2a2640,.45,0,0,1,rnd()*TAU,1,0,0);if(rnd()<.35)E(0,TILE.star,x+R(-.5,.5),R(.3,1.4),z+R(-.5,.5),0,.5,0,.7,.16,.03,0xffffff,0xc8b0ff,.9,0,0,0,rnd()*TAU,R(-3,3),0,0)}
 else{const a=rnd()*TAU;E(0,TILE.hex,x+Math.cos(a)*.9,R(.2,1.5),z+Math.sin(a)*.9,0,R(.4,1),0,.6,.26,.08,0xffffff,0x7aa8ff,.7,0,0,0,rnd()*TAU,R(-2,2),0,0)}}
/* フレネル＋六角グリッドのシールド素材 */
let SHM=null;function shieldMat(){return SHM||(SHM=new T.ShaderMaterial({uniforms:{t:{value:0},c:{value:new T.Color(0x7aa8ff)}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,
 vertexShader:`varying vec3 vN;varying vec3 vV;varying vec2 vU;void main(){vU=uv;vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
 fragmentShader:`uniform float t;uniform vec3 c;varying vec3 vN;varying vec3 vV;varying vec2 vU;void main(){float f=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.2);vec2 g=vU*vec2(46.,23.);vec2 h=abs(fract(g)-.5);float l=smoothstep(.42,.5,max(h.x*1.7,h.y*1.7+.0));float sc=smoothstep(.0,.25,fract(vU.y*2.-t*.6))*.35;gl_FragColor=vec4(c*(.35+f*1.6+l*.55+sc),.18+f*.75+l*.18);}`}))}

/* ---------- ゾーン(オイル/炎/氷/時限爆弾) ---------- */
const FL=new Set(['fire','ice']);   /* oil(燃料)は script.js 側の青いオイルの水たまり(canvas絵)をそのまま見せる。粒子だけだと暗くて見えなかった */
function zInit(o){const m=o.m;if(!m)return;
 m.children.forEach(c=>{const t=c.geometry&&c.geometry.type;if(!t)return;if(FL.has(o.k)&&(t=='CircleGeometry'||t=='RingGeometry'))c.visible=false;if(o.k=='pbomb'&&t=='CircleGeometry')c.visible=false});
 if(o.k=='ice'){const mt=new T.MeshStandardMaterial({color:0xbff4ff,emissive:0x4ac0ff,emissiveIntensity:.55,roughness:.15,metalness:.1,transparent:true,opacity:.82,flatShading:true});o.sk=[];
  for(let i=0,n=N(11);i<n;i++){const a=rnd()*TAU,d=Math.sqrt(rnd())*o.r*.92,h=R(.6,1.8)*(1-d/o.r*.5),s=new T.Mesh(new T.ConeGeometry(R(.12,.26),h,5),mt);s.position.set(Math.cos(a)*d,h/2,Math.sin(a)*d);s.rotation.set(R(-.25,.25),rnd()*TAU,R(-.25,.25));s.userData.h=h;m.add(s)}}
 if(o.k=='ice'){flash(o.x,o.z,0x7ad8ff,2.6);E(0,TILE.flare,o.x,.6,o.z,0,0,0,.3,1,o.r*1.2,0xffffff,0x7ad8ff,1,0,0,0,0,0,0,0);for(let i=0,n=N(16);i<n;i++){const a=rnd()*TAU,d=R(0,o.r);E(0,TILE.shard,o.x+Math.cos(a)*d,.3,o.z+Math.sin(a)*d,R(-2,2),R(2,6),R(-2,2),R(.6,1),.26,.06,0xffffff,0x7ad8ff,1,0,10,1,rnd()*TAU,R(-6,6),0,0)}}
 if(o.k=='oil'){E(0,TILE.glow,o.x,.1,o.z,0,0,0,.4,o.r*.5,o.r*2.2,0x3a78ff,0x3a78ff,.4,0,0,0,0,0,0,2);ring(o.x,o.z,.2,o.r*1.1,.35,0x9fd4ff,.6);
  for(let i=0,n=N(10);i<n;i++){const a=rnd()*TAU,s=R(1,3);E(0,TILE.dot,o.x,.2,o.z,Math.cos(a)*s,R(2,4),Math.sin(a)*s,R(.4,.7),.09,.03,0xcfe8ff,0x3a7cff,1,0,9,0,0,0,0,0)}}}
/* ユニバードのウルト：燃料(青いオイル)を前方へ撒き散らす演出 */
function oilSpray(u,a){const x=u.x,z=u.z,ca=Math.cos(a),sa=Math.sin(a);
 for(let i=0,n=N(30);i<n;i++){const s=R(5,12),aa=a+R(-.26,.26);E(0,TILE.dot,x+ca*.5,R(.6,.95),z+sa*.5,Math.cos(aa)*s,R(1.2,3.2),Math.sin(aa)*s,R(.4,.75),.12,.04,0xbfe0ff,0x2a64ff,1,0,10,.3,0,0,0,0)}
 E(0,TILE.flare,x+ca*.5,.8,z+sa*.5,0,0,0,.18,.6,1.4,0xffffff,0x6aa8ff,.7,0,0,0,0,0,0,0)}
function zTick(q,dt){const k=q.k,x=q.x,z=q.z,r=q.r,L=dt*1.6,tm2=lt;
 if(k=='oil'){const f=Math.min(1,(q.t0-q.t)*5+.2)*Math.min(1,q.t*1.2),rr=r*f,pu=.5+.5*Math.sin(tm2*3+q.x*2);
  /* 燃料 = 青黒くてかるオイル。水面のさざ波と立ちのぼる気化ガス(うす青)で「燃えるもの」だと分かる。本体の絵は script.js(oilTex) */
  E(0,TILE.glow,x,.05,z,0,0,0,L,rr*2.2,rr*2.2,0x3a78ff,0x3a78ff,(.1+.05*pu)*f,0,0,0,0,0,0,2);
  if(rnd()<dt*3)E(1,TILE.ring,x+R(-.6,.6)*rr,.07,z+R(-.6,.6)*rr,0,0,0,.6,.05,.3,0x9fd4ff,0x9fd4ff,.35,0,0,0,0,0,0,2);
  if(rnd()<dt*5)E(1,TILE.smoke,x+R(-.6,.6)*rr,.15,z+R(-.6,.6)*rr,0,R(.3,.7),0,1.4,.3,.9,0xa8d0ff,0xdcefff,.12*f,0,0,.6,rnd()*TAU,.4,0,0);
  if(rnd()<dt*4)E(0,TILE.dot,x+R(-.7,.7)*rr,.15,z+R(-.7,.7)*rr,R(-.2,.2),R(.5,1.2),R(-.2,.2),R(.7,1.2),.06,.02,0xcfe8ff,0x4a90ff,1,-.5,.6,0,0,0,0,0)}
 else if(k=='fire'){const f=Math.min(1,q.t*1.2),rr=r;
  E(0,TILE.glow,x,.1,z,0,0,0,L,rr*2.6,rr*2.6,0xff5a10,0xff5a10,.4*f,0,0,0,0,0,0,2);E(0,TILE.glow,x,.1,z,0,0,0,L,rr*1.4,rr*1.4,0xffc050,0xffc050,.4*f,0,0,0,0,0,0,2);
  for(let i=0,n=N(3);i<n;i++)if(rnd()<dt*34/3){const a=rnd()*TAU,d=Math.sqrt(rnd())*rr*.85;E(0,TILE.flame,x+Math.cos(a)*d,.1,z+Math.sin(a)*d,R(-.3,.3),R(1.4,3),R(-.3,.3),R(.4,.75),.5*f+.1,.9*f+.1,0xffe08a,0xff3a06,.95,0,-1,1,R(-.3,.3),0,0,0)}
  if(rnd()<dt*8)E(1,TILE.smoke,x+R(-.5,.5)*rr,.6,z+R(-.5,.5)*rr,0,R(.8,1.6),0,1.2,.5,1.4,0x2a2428,0x14121a,.35*f,0,0,.8,rnd()*TAU,1,0,0);
  if(rnd()<dt*14)E(0,TILE.dot,x+R(-.7,.7)*rr,.3,z+R(-.7,.7)*rr,R(-.5,.5),R(1,3),R(-.5,.5),R(.7,1.3),.07,.02,0xffe070,0xff4a10,1,-.5,.6,0,0,0,0,0)}
 else if(k=='ice'){const f=Math.min(1,q.t*1.2),sc=Math.min(1,(q.t0-q.t)*5+.2),rr=r*sc;
  E(0,TILE.glow,x,.05,z,0,0,0,L,rr*2.3,rr*2.3,0x7ad8ff,0x7ad8ff,(.2+.06*Math.sin(tm2*4))*f,0,0,0,0,0,0,2);
  E(0,TILE.hex,x,.055,z,0,0,0,L,rr*1.1,rr*1.1,0xd8f8ff,0xd8f8ff,.3*f,0,0,0,tm2*.15,0,0,2);E(0,TILE.crack,x,.06,z,0,0,0,L,rr*2,rr*2,0xeafcff,0xeafcff,.5*f,0,0,0,q.x*3,0,0,2);
  E(0,TILE.ring,x,.07,z,0,0,0,L,rr*2,rr*2,0xbff6ff,0xbff6ff,.7*f,0,0,0,0,0,0,2);
  if(rnd()<dt*16){const a=rnd()*TAU,d=Math.sqrt(rnd())*rr;E(0,rnd()<.5?TILE.snow:TILE.star,x+Math.cos(a)*d,.2,z+Math.sin(a)*d,R(-.2,.2),R(.5,1.5),R(-.2,.2),R(.9,1.5),.24,.06,0xffffff,0x9be8ff,.9*f,0,0,.5,rnd()*TAU,R(-2,2),0,0)}
  if(rnd()<dt*7)E(1,TILE.smoke,x+R(-.8,.8)*rr,.2,z+R(-.8,.8)*rr,R(-.3,.3),R(.2,.6),R(-.3,.3),1.4,.8,1.8,0xd8f6ff,0xa8dcff,.22*f,0,0,.5,rnd()*TAU,.5,0,0);
  if(q.sk)q.sk.forEach(s=>{s.scale.y=Math.min(1,(q.t0-q.t)*3.4+.05)*Math.min(1,q.t*1.5+.02)||.01})}
 else if(k=='pbomb'){const bl=.5+.5*Math.sin(tm2*38);E(0,TILE.glow,x,.5,z,0,0,0,L,1.1+bl*.5,1.1+bl*.5,0xff4a3a,0xff4a3a,.6,0,0,0,0,0,0,0);
  if(rnd()<dt*30)E(0,TILE.dot,x,.55,z,R(-1,1),R(1,3),R(-1,1),.3,.1,.02,0xffffff,0xffa030,1,8,0,0,0,0,0,0);E(0,TILE.ring,x,.07,z,0,0,0,L,q.R*2,q.R*2,0xff9a8a,0xff9a8a,.25+.25*bl,0,0,0,0,0,0,2)}}
/* ---------- セイリュウ：ダッシュ・剣・変身 ---------- */
const GD=0xffd45a,PK=0xff9ad8;
function dashStart(u,a){const x=u.x,z=u.z;E(0,TILE.flare,x,.6,z,0,0,0,.22,1.2,2.8,0xffffff,GD,1,0,0,0,0,0,0,0);ring(x,z,.2,1.3,.3,GD,.7);
 for(let i=0,n=N(10);i<n;i++){const aa=a+Math.PI+R(-.35,.35),s=R(3,8);E(0,TILE.streak,x,R(.3,1.3),z,Math.cos(aa)*s,0,Math.sin(aa)*s,R(.2,.4),.08,.02,0xffffff,i%2?GD:PK,1,0,0,1.5,0,0,.1,0)}
 sparks(x,.5,z,0xffffff,12,6,3,.07);flash(x,z,GD,1.6)}
function slash(u,a,reach,half){const x=u.x,z=u.z;
 for(let i=0;i<6;i++){const t=(i/5-.5)*2*half,aa=a+t,r=reach*.8,px=x+Math.cos(aa)*r,pz=z+Math.sin(aa)*r;
  E(0,TILE.streak,px,.95,pz,Math.cos(aa)*5,R(-.1,.2),Math.sin(aa)*5,.18,.4,.03,0xffffff,GD,1,0,0,2,0,0,.14,0)}
 sparks(x+Math.cos(a)*reach*.7,.95,z+Math.sin(a)*reach*.7,0xffffff,8,6,2,.06);flash(x,z,GD,1.4)}
function slashHit(e,a){const x=e.x,z=e.z;E(0,TILE.flare,x,.95,z,0,0,0,.18,1.3,.4,0xffffff,GD,1,0,0,0,rnd()*TAU,0,0,0);
 for(let i=0,n=N(5);i<n;i++){const aa=a+R(-.7,.7);E(0,TILE.streak,x,.95,z,Math.cos(aa)*R(3,7),R(-.3,1.2),Math.sin(aa)*R(3,7),R(.18,.32),.09,.02,0xffffff,GD,1,0,2,1,0,0,.1,0)}
 sparks(x,.95,z,GD,6,6,2,.06)}
function tfStart(u){const x=u.x,z=u.z;flash(x,z,GD,6);
 E(0,TILE.flare,x,1,z,0,0,0,.35,1.5,6,0xffffff,GD,1,0,0,0,0,0,0,0);E(0,TILE.glow,x,1.2,z,0,0,0,.6,2.5,4.5,GD,PK,.7,0,0,0,0,0,0,0);
 ring(x,z,.2,2.2,.5,GD,1,.1);ring(x,z,.1,1.6,.6,PK,.85,.11);ring(x,z,.1,2.8,.4,0xffffff,.6,.12);
 for(let i=0,n=N(26);i<n;i++){const aa=rnd()*TAU,s=R(1,3.5);E(0,TILE.star,x,.3,z,Math.cos(aa)*s,R(2,5.5),Math.sin(aa)*s,R(.8,1.3),.34,.05,0xffffff,i%2?GD:PK,1,0,3,.6,rnd()*TAU,R(-4,4),0,0)}
 for(let i=0,n=N(14);i<n;i++){const aa=i/n*TAU;E(0,TILE.streak,x+Math.cos(aa)*.4,.5,z+Math.sin(aa)*.4,Math.cos(aa)*9,R(.5,2),Math.sin(aa)*9,.35,.8,.05,0xffffff,GD,1,0,0,2,0,0,.18,0)}
 sparks(x,.6,z,0xffffff,20,8,4,.08)}
function tfTick(u,dt){u._tt=(u._tt||0)-dt;if(u._tt>0)return;u._tt=.06;const x=u.x,z=u.z;
 E(0,TILE.star,x+R(-.5,.5),R(.2,1.7),z+R(-.5,.5),R(-.3,.3),R(.5,1.2),R(-.3,.3),.6,.24,.02,0xffffff,rnd()<.5?GD:PK,.95,0,0,1,rnd()*TAU,R(-3,3),0,0);
 E(0,TILE.glow,x,.35,z,0,0,0,.14,1.6,1.6,GD,GD,.22,.22,0,0,0,0,0,0)}
function tfEnd(u){const x=u.x,z=u.z;ring(x,z,.2,2.2,.45,GD,.8);E(0,TILE.flare,x,.9,z,0,0,0,.2,1.5,.4,0xffffff,GD,1,0,0,0,0,0,0,0);
 for(let i=0,n=N(14);i<n;i++){const aa=rnd()*TAU;E(0,TILE.star,x,R(.4,1.5),z,Math.cos(aa)*R(.5,2),R(.5,2),Math.sin(aa)*R(.5,2),R(.5,.9),.26,.03,0xffffff,GD,.9,0,5,1,rnd()*TAU,R(-4,4),0,0)}}
function reset(){if(LA){LA.clear();LN.clear()}if(light)light.userData.i=0}
function update(dt){fr++;lt+=dt;if(!LA)return;LA.update(dt);LN.update(dt);if(SHM)SHM.uniforms.t.value=lt;
 if(light){let i=light.userData.i||0;light.intensity=i*.45*(lowEnd?.7:1);light.userData.i=Math.max(0,i-dt*9)}}
function init(scene,camera){gs=scene;cam=camera;const t=atlas();LA=new Layer(Math.round(2600*Q),true,t,31);LN=new Layer(Math.round(900*Q),false,t,30);gs.add(LN.mesh,LA.mesh);
 light=new T.PointLight(0xffa050,0,11,2);light.position.set(0,1.6,0);light.userData.i=0;gs.add(light)}
return{init,update,reset,burst,sparks,flash,ring,muzzle,bInit,bTick,bHit,bEnd,explode,nova,charge,bolt,zapHit,leapStart,leapTick,buff,auraTick,shieldMat,zInit,zTick,oilSpray,dashStart,slash,slashHit,tfStart,tfTick,tfEnd,TILE}})();
