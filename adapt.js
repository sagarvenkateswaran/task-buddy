// Adaptive reminder timing — learns each step's pace from how long it takes to press (or say) Done.
// Local only (localStorage on this device). No buttons, no UI, never changes words, never skips or completes a step.
// Per routine key (user + routine id) and per step (normalised instruction text + occurrence), so renaming a routine
// keeps learning and rewording a step starts that step fresh. Callers never pass shower / silent / once / timed steps.
// Rule: after MIN_N good samples, move the step's reminder ratio 20% toward median(sample)/base, at most ±15% of base
// per completed step, clamped to 0.4×–2.5× of the parent's interval (never under 10 s). Samples exclude paused and
// backgrounded time; quick taps (<3 s) and very long gaps (>6× base or >20 min) are ignored; abandoned steps are dropped.
const Adapt=(()=>{
 const KEY='adapt.v1',VER=1,MIN_N=3,KEEP=7,ALPHA=0.2,MAX_STEP=0.15,LO=0.4,HI=2.5,FLOOR_MS=10000,TAP_MS=3000,CEIL_X=6,CEIL_ABS=1200000;
 let db=null,cur=null;const off=new Set(); // reasons the clock is stopped: 'pause','hidden'
 const now=()=>Date.now();
 const ls=()=>{try{return typeof localStorage!=='undefined'?localStorage:null}catch(e){return null}};
 function load(){if(db)return db;
  try{const s=ls(),raw=s&&s[KEY],o=raw?JSON.parse(raw):null;db=(o&&o.v===VER&&o.r&&typeof o.r==='object'&&!Array.isArray(o.r))?o:{v:VER,r:{}}}catch(e){db={v:VER,r:{}}}
  return db}
 function save(){try{const s=ls();if(s)s[KEY]=JSON.stringify(db)}catch(e){}}
 const norm=t=>String(t||'').toLowerCase()
  .replace(/,?\s*(and )?then (press|say) (done|i am done)\.?/g,'').replace(/\b(press|say) (done|i am done)\b/g,'')
  .replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
 // stable step id: normalised text + occurrence (so two "Wash your hands." steps learn separately)
 function stepKey(list,idx,text){const n=norm(text(list[idx]));let occ=0;for(let j=0;j<idx;j++)if(norm(text(list[j]))===n)occ++;return n+'#'+occ}
 function rec(rk,sk){const R=load().r[rk],x=R&&R[sk];
  if(!x||typeof x!=='object'||!Array.isArray(x.s)||!x.s.every(v=>typeof v==='number'&&isFinite(v)&&v>0)||!(typeof x.k==='number'&&isFinite(x.k)))return null;return x}
 function ratio(rk,sk){const x=rec(rk,sk);if(!x||x.s.length<MIN_N)return 1;return Math.min(HI,Math.max(LO,x.k))}
 function interval(rk,sk,base){if(!(base>0))return base;const iv=Math.round(base*ratio(rk,sk));return Math.max(Math.min(FLOOR_MS,base),iv)}
 function running(){return off.size===0}
 function start(rk,sk,base){if(cur&&cur.rk===rk&&cur.sk===sk)return; // same step re-shown (repeat / resume): keep timing
  cur={rk,sk,base:+base||0,acc:0,t0:now()}}
 function acc(){if(cur&&running())cur.acc+=now()-cur.t0;if(cur)cur.t0=now()}
 function stopClock(why){acc();off.add(why)}
 function startClock(why){acc();off.delete(why);if(cur)cur.t0=now()}
 function abandon(){cur=null}
 function median(a){const b=[...a].sort((x,y)=>x-y),m=b.length>>1;return b.length%2?b[m]:(b[m-1]+b[m])/2}
 function done(){if(!cur)return null;acc();const c=cur;cur=null;const ms=c.acc,base=c.base;
  if(!(base>0)||ms<TAP_MS||ms>Math.min(CEIL_ABS,CEIL_X*base))return null; // accidental tap / left the room
  const d=load(),R=d.r[c.rk]=(d.r[c.rk]&&typeof d.r[c.rk]==='object')?d.r[c.rk]:{};let x=rec(c.rk,c.sk);if(!x)x=R[c.sk]={s:[],k:1};
  x.s.push(Math.round(ms));if(x.s.length>KEEP)x.s.splice(0,x.s.length-KEEP);
  if(x.s.length>=MIN_N){const target=Math.min(HI,Math.max(LO,median(x.s)/base));let step=ALPHA*(target-x.k);
   step=Math.max(-MAX_STEP,Math.min(MAX_STEP,step));x.k=Math.min(HI,Math.max(LO,x.k+step))}
  x.t=Date.now();save();return {ms,k:x.k}}
 return {norm,stepKey,interval,ratio,start,done,abandon,pause:()=>stopClock('pause'),resume:()=>startClock('pause'),
  hidden:h=>h?stopClock('hidden'):startClock('hidden'),_reset:()=>{db=null;cur=null;off.clear()},_cur:()=>cur,
  K:{MIN_N,KEEP,ALPHA,MAX_STEP,LO,HI,FLOOR_MS,TAP_MS,CEIL_X,CEIL_ABS}}})();
