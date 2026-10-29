const CHECKIN_MS=150000, CALM=["Good.","Nice and easy.","Well done.","Lovely."], PRAISE=["Great job!","Well done!","Awesome!","Nice work!","You're doing great!","Fantastic!"];
const IOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
let lastErr=null,stepT=[],rec,listening=false,speaking=false,paused=false,active=false,list=null,i=0,timer,checks=0,wake;
const $=id=>document.getElementById(id);
let firstDone=false,sayId=0;
const VOICE=()=>{try{return localStorage.mode==='voice'}catch(e){return false}};
function say(t,cb,_r){if(VOICE())t=t.replace(/press Done/gi,'say I am done');speaking=true;const id=++sayId;try{rec&&rec.abort()}catch(e){}
 speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.rate=.9;u.lang='en-US';window._u=u; // keep ref (Chrome/Android can drop onend otherwise)
 let fired=false;const fin=()=>{if(fired||id!==sayId)return;fired=true;speaking=false;cb&&cb();listen()};
 setTimeout(fin,3000+t.split(/\s+/).length*600); // safety net if onend never fires (Android)
 u.onend=fin;
 u.onerror=ev=>{if(fired||id!==sayId)return;speaking=false;   // re-speak step 1 if it got interrupted (e.g. permission prompt)
  if(_r&&_r<3)return setTimeout(()=>{if(id===sayId)say(t,cb,_r+1)},500);fired=true;cb&&cb();listen()};
 speechSynthesis.speak(u);}
function listen(){if(!VOICE())return;if(Water.active)return;if(!SR||speaking||listening||!active)return;
 try{rec.start();listening=true}catch(e){$('heard').textContent='Start error: '+e.message;listening=false;setTimeout(listen,800)}}
function setup(){if(!SR){$('status').innerHTML='<span class=off>Voice listening not supported in this browser — use buttons. Steps will still be read aloud.</span>';return}
 rec=new SR();rec.lang='en-US';rec.continuous=!IOS;rec.maxAlternatives=1;rec.interimResults=false;
 rec.onstart=()=>$('status').innerHTML='<span class=mic>🎤 Listening…</span>';
 rec.onresult=e=>{const t=e.results[e.results.length-1][0].transcript.toLowerCase().trim();$('heard').textContent='Heard: "'+t+'"';handle(t)};
 rec.onerror=e=>{lastErr=e.error;$('heard').textContent='Last mic error: '+e.error;listening=false;
  if(e.error==='not-allowed'||e.error==='service-not-allowed'){active=false;$('status').innerHTML='<span class=off>Microphone blocked ('+e.error+'). Open in Safari, allow mic + Siri/Dictation, reload.</span>'}};
 rec.onend=()=>{listening=false;if(active&&!speaking)setTimeout(listen,lastErr==='no-speech'||!lastErr?150:600);lastErr=null}; // auto-restart
}
let TEMP;  // undefined=loading/failed
function weatherText(){if(TEMP==null)return "Check the weather. If it's cold, wear a jacket.";const n=Math.round(TEMP);
 return n<50?`It's cold outside, about ${n} degrees. Wear your winter jacket.`:`It's about ${n} degrees outside. Make sure you are wearing a light jacket.`}
function getWeather(){if(typeof WEATHER_URL==='undefined')return;const c=new AbortController();setTimeout(()=>c.abort(),5000);
 fetch(WEATHER_URL,{signal:c.signal}).then(r=>r.json()).then(d=>{TEMP=d.current.temperature_2m;
  if(TEMP>=65&&list){const s=LISTS[list],w=s.findIndex(x=>x&&x.weather);if(w>i){s.splice(w,1);bar()}}}).catch(()=>{})}
const ORIG={},P_=t=>/[.!?]$/.test(t)?t:t+'.';

// ---------- Shower water listen (morning only): AnalyserNode loudness, no recording ----------
// Thresholds: calibrate ambient ~3.5s; water = 1–8 kHz band energy ≥ max(ambient*2.2, ambient+0.012) for 3s;
// water-off = below that for 25s. Enter waits for water or 3min fallback.
const Water={
  ok:false,perm:false,active:false,water:false,calibrating:false,ambient:0,
  stream:null,ctx:null,analyser:null,src:null,_raf:0,_cal:[],_above:0,_below:0,_onAt:0,
  CAL_MS:3500,ON_MS:3000,OFF_MS:25000,ENTER_FALLBACK:180000,BAND_LO:1000,BAND_HI:8000,MARGIN:2.2,FLOOR:0.012,
  cue(msg){const el=$('showerCue');if(!el)return;el.style.display=msg?'block':'none';el.textContent=msg||''},
  async unlock(){ // call from Start tap (iOS gesture)
    try{this.ctx=new(window.AudioContext||window.webkitAudioContext)();await this.ctx.resume()}catch(e){this.ctx=null}
    try{const s=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});
      this.perm=true;s.getTracks().forEach(tr=>tr.stop())}catch(e){this.perm=false}
    return this.perm},
  async start(){
    if(this.active)return this.ok;this.ok=false;this.water=false;this.calibrating=true;this.ambient=0;this._cal=[];this._above=0;this._below=0;
    this.cue('Shower: calibrating…');
    try{
      if(this.ctx&&this.ctx.state==='suspended')await this.ctx.resume();
      if(!this.ctx){this.ctx=new(window.AudioContext||window.webkitAudioContext)();await this.ctx.resume()}
      this.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});
      this.src=this.ctx.createMediaStreamSource(this.stream);
      this.analyser=this.ctx.createAnalyser();this.analyser.fftSize=2048;this.analyser.smoothingTimeConstant=0.7;
      this.src.connect(this.analyser); // do NOT connect to destination (no feedback/record)
      this.active=true;this.ok=true;this._t0=performance.now();this._tick();
    }catch(e){this.ok=false;this.active=false;this.cue('Shower: mic off');this.stopTracks()}
    return this.ok},
  stopTracks(){try{this.stream&&this.stream.getTracks().forEach(tr=>tr.stop())}catch(e){}this.stream=null},
  stop(){cancelAnimationFrame(this._raf);this.active=false;this.ok=false;this.water=false;this.calibrating=false;
    try{this.src&&this.src.disconnect()}catch(e){}this.src=null;this.analyser=null;this.stopTracks();this.cue('')},
  bandEnergy(){
    const a=this.analyser;if(!a)return 0;
    const n=a.frequencyBinCount,buf=new Uint8Array(n);a.getByteFrequencyData(buf);
    const sr=this.ctx.sampleRate,binHz=sr/a.fftSize;
    let sum=0,c=0;for(let i=0;i<n;i++){const f=i*binHz;if(f<this.BAND_LO)continue;if(f>this.BAND_HI)break;sum+=buf[i]/255;c++}
    return c?sum/c:0},
  _tick(){
    if(!this.active||!this.analyser)return;
    const e=this.bandEnergy(),now=performance.now();
    if(this.calibrating){
      this._cal.push(e);
      if(now-this._t0>=this.CAL_MS){
        this.ambient=this._cal.reduce((a,b)=>a+b,0)/Math.max(this._cal.length,1);
        this.calibrating=false;this.cue('Shower: water off');
      }else this.cue('Shower: calibrating…');
    }else{
      const thr=Math.max(this.ambient*this.MARGIN,this.ambient+this.FLOOR);
      if(e>=thr){if(!this._above)this._above=now;this._below=0;
        if(!this.water&&now-this._above>=this.ON_MS){this.water=true;this._onAt=now;this.cue('Shower: water on');if(typeof onWaterOn==='function')onWaterOn()}}
      else{if(!this._below)this._below=now;this._above=0;
        if(this.water&&now-this._below>=this.OFF_MS){this.water=false;this.cue('Shower: water off');if(typeof onWaterOff==='function')onWaterOff()}
        else if(!this.water)this.cue('Shower: water off')}
    }
    this._raf=requestAnimationFrame(()=>this._tick())},
  inShowerStep(){const x=cur();return !!(list&&x&&typeof x==='object'&&x.shower)},
  exitIndex(){if(!list)return -1;return LISTS[list].findIndex(x=>x&&x.shower==='exit')}
};
function showerOf(x){return x&&typeof x==='object'?x.shower:null}
function jumpToShowerExit(why){
  if(!list)return;const ex=Water.exitIndex();if(ex<0||i>=ex)return;
  clearStep();i=ex;show();runStep('');
}
function onWaterOn(){ // enter step may be waiting
  const x=cur();if(showerOf(x)==='enter'&&Water._enterWaiting){Water._enterWaiting=false;clearStep();next()}
}
function onWaterOff(){
  const x=cur(),sh=showerOf(x);
  if(sh==='wash'||sh==='rinse'||sh==='enter')jumpToShowerExit('quiet');
}

const T=x=>typeof x==='string'?x:x.weather?weatherText():x.text, cur=()=>LISTS[list][i], timed=()=>list&&cur()&&typeof cur()==='object'&&cur().wait;
const needsDone=x=>!(typeof x==='object'&&x.auto===true)&&!/done/i.test(T(x))&&!/\?\s*$/.test(T(x));
const withDone=(t,x)=>{const b=String(t).replace(/[.!?]+$/,'');return needsDone(x)?b+', and then press Done.':P_(String(t))};
const stepVoice=x=>withDone(x.speak||T(x),x), stepLabel=x=>withDone(T(x),x);
function later(ms,f){stepT.push(setTimeout(()=>{if(active&&!paused)f()},ms))}
function clearStep(){stepT.forEach(clearTimeout);stepT=[]}
function runStep(intro){clearStep();const x=cur();if(typeof x==='object'&&x.pre){if(intro||x.lead)say((intro?intro+' ':'')+(x.lead||''));later(x.pre,()=>speakStep(''))}else speakStep(intro?intro+' ':'')}
function speakStep(intro){const x=cur(),me=i,first=i===0&&!firstDone,sh=showerOf(x);
 const afterSay=()=>{if(first)firstDone=true;if(i!==me||!list)return;
  if(typeof x==='object'&&x.hold){const gap=x.gap||120000,prompt=x.prompt||'Press Done when you are ready.';
   const loop=()=>later(gap,()=>{if(i===me)say(P_(prompt),loop)});loop();return}
  if(typeof x==='string'||!x.wait)return armCheck();
  const hints=(typeof x==='object'&&x.hints)||[];
  const sayHint=n=>{const h=hints.length?hints[(n-2+hints.length*10)%hints.length]:null;return P_(h||x.speak||T(x))};
  // enter + water mic: wait for water (or 3min fallback); keep nudging
  if(sh==='enter'&&Water.ok){
   Water._enterWaiting=true;let n=1;
   const nudge=()=>{if(i!==me||!Water._enterWaiting)return;n++;later(x.gap||15000,()=>{if(i!==me||!Water._enterWaiting)return;say(sayHint(n),nudge)})};
   nudge();later(Water.ENTER_FALLBACK,()=>{if(i===me&&Water._enterWaiting){Water._enterWaiting=false;next()}});
   return}
  // timed wash/rinse; stretch while water runs; rinse holds nudges until water-off
  let n=1;
  const afterTimed=()=>{if(i!==me)return;
   if(Water.ok&&(sh==='wash'||sh==='rinse')&&Water.water){
    if(sh==='rinse'){const keep=()=>later(x.gap||20000,()=>{if(i!==me)return;if(!Water.water)return jumpToShowerExit('quiet');say(sayHint(++n),keep)});return keep()}
    let extra=0;const stretch=()=>later(x.gap||20000,()=>{if(i!==me)return;if(!Water.water)return jumpToShowerExit('quiet');extra++;say(sayHint(++n),()=>{if(extra>=2)next();else stretch()})});return stretch()}
   next()};
  const rep=()=>{if(n<(x.repeat||1)){n++;later(x.gap||20000,()=>{if(i!==me)return;say(sayHint(n),rep)})}
   else later(x.wait,afterTimed)};rep()};
 const beginSay=()=>say(intro+stepVoice(x),afterSay,first?1:0);
 // Morning shower enter: start water mic (await) then speak — keeps TTS + analyser together
 if(sh==='enter'&&typeof ROUTINE!=='undefined'&&ROUTINE==='morning routine'){
  keepAwake();Water.start().then(()=>{
   // Finish ambient calibration (fan) before TTS so speaker audio isn't in the baseline
   const waitCal=()=>{if(i!==me)return;if(!Water.ok||!Water.calibrating)return beginSay();setTimeout(waitCal,200)};
   waitCal()});return}
 beginSay()}
function names(){return Object.keys(LISTS).join(', ')}
function ask(){if(typeof ROUTINE!=='undefined')return begin(ROUTINE);clearStep();list=null;$('list').textContent='';$('step').textContent='Say: '+names();bar();
 say('Which list would you like to do? You can say '+names()+'.');armCheck()}
function handle(t){resetCheck();
 if(/\b(stop|quit|exit|end)\b/.test(t))return stop();
 if(paused){if(/\b(resume|continue|start|go|ready|unpause)\b/.test(t)){paused=false;if(list)runStep("Okay, let's keep going.");else{say("Okay, let's keep going.");armCheck()}}return}
 if(!list){if(typeof ROUTINE!=="undefined")return;const k=Object.keys(LISTS).find(n=>t.includes(n)||t.includes(n.split(' ')[0]));
  if(k)return begin(k); if(/\b(list|menu|options|help)\b/.test(t))return ask(); return}
 if(/\b(done|finished|finish|next|did it|complete|ok next|fine|yes|yeah|ok|okay)\b/.test(t))return next();
 if(/\b(repeat|again|what)\b/.test(t))return say('Your step is: '+stepVoice(cur()));
 if(/\bhelp\b/.test(t))return say('Press Done when you finish a step. Press Repeat to hear it again. Your step now is: '+stepVoice(cur()));
 if(/\b(pause|break|wait)\b/.test(t)){paused=true;clearTimeout(timer);clearStep();$('status').innerHTML='<span class=off>⏸ Paused — say "resume"</span>';return say('Okay, pausing. Say resume when you are ready.')}
 if(/\b(back|previous)\b/.test(t)){i=Math.max(0,i-1);show();return runStep('Going back.')}
}
function begin(k){ORIG[k]=ORIG[k]||LISTS[k];const d=new Date().getDay();
 LISTS[k]=ORIG[k].filter(x=>!(x&&x.days&&!x.days.includes(d))&&!(x&&x.weather&&TEMP>=65));list=k;i=0;$('list').textContent=k;show();
 const nm=(($('kidname')&&$('kidname').value)||'').trim();try{localStorage.kidName=nm}catch(e){}
 const g=k==='bedtime routine'?"Hi"+(nm?' '+nm:'')+". It's time to get ready for bed. Take a deep breath. We'll go nice and slow.":"Good morning"+(nm?', '+nm:'')+"! Let's get ready for the day. Take a moment.";
 say(g,()=>setTimeout(()=>{if(list===k&&i===0)runStep("Here's your first step.")},4000))}
function show(){$('step').textContent=stepLabel(cur());bar()}
function bar(){const n=list?LISTS[list].length:1,d=list?i:0;$('bar').style.width=(d/n*100)+'%';$('count').textContent=list?`Step ${i+1} of ${n}`:''}
function next(){const prev=cur();clearStep();
 // Leaving shower exit (Done) → release water mic
 if(showerOf(prev)==='exit')Water.stop();
 const s=LISTS[list],calm=(typeof CALM_MODE!=='undefined'&&CALM_MODE)||list==='bedtime routine',P=calm?CALM:PRAISE,p=P[Math.floor(Math.random()*P.length)];i++;
 if(i>=s.length&&calm){$('bar').style.width='100%';$('step').textContent='🌙 Good night';list=null;
  return say("You did everything. I'm proud of you. Snuggle in, close your eyes, and sleep well. Good night.",()=>{active=false;clearTimeout(timer);try{rec&&rec.abort()}catch(e){};wake&&wake.release()})}
 if(i>=s.length){$('bar').style.width='100%';$('step').textContent='🎉 All done!';const k=list;list=null;
  let E=typeof ENDINGS!=='undefined'&&ENDINGS[k];if(typeof E==='function')E=E();return say(E==='GOODJOB'?'Good job!':p+' '+(E||('You finished your whole '+k+'! I am proud of you. Have a wonderful day!')),()=>{active=false;clearTimeout(timer);try{rec&&rec.abort()}catch(e){};wake&&wake.release()})}
 show();const left=s.length-i;
 runStep(p+(left===1?' Last one!':(i===Math.floor(s.length/2)?' Halfway there!':'')))}
function resetCheck(){clearTimeout(timer);checks=0}
function armCheck(){clearTimeout(timer);if(!active||paused||timed())return;timer=setTimeout(()=>{checks++;
 if(list){const t=T(cur()),lab=stepLabel(cur()),hasDone=/done/i.test(lab),q=/\?\s*$/.test(t),s=t.toLowerCase().replace(/[.!?]$/,"");say(hasDone?(checks<3?`Still on that step? ${lab}`:lab):(q?t+' Press done.':(checks<3?`Still on ${s}? Press done.`:`Still here. ${t.replace(/[.!?]$/,'')}. Press done.`)))}
 else say('Which list would you like to do? Say '+names()+'.');armCheck()},CHECKIN_MS)}
function stop(){active=false;clearTimeout(timer);clearStep();Water.stop();try{rec&&rec.abort()}catch(e){}
 say('Okay, stopping. Great work today. Tap start whenever you want to go again.');
 setTimeout(()=>{$('app').style.display='none';$('start').style.display='inline-block'},500);wake&&wake.release()}
async function keepAwake(){try{if('wakeLock' in navigator)wake=await navigator.wakeLock.request('screen')}catch(e){}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&active){keepAwake();listen()}});
function primeRec(){return new Promise(res=>{if(!rec)return res('none');let done=false;const fin=r=>{if(done)return;done=true;
  rec.onstart=rec._os;rec.onerror=rec._oe;rec.onend=rec._oe2;try{rec.abort()}catch(e){};listening=false;setTimeout(()=>res(r),300)};
 rec._os=rec.onstart;rec._oe=rec.onerror;rec._oe2=rec.onend;
 rec.onstart=()=>fin('ok');rec.onerror=ev=>fin(ev.error);rec.onend=()=>fin('end');
 try{rec.start()}catch(x){fin('err')}setTimeout(()=>fin('timeout'),15000)})}
$('start').onclick=async()=>{
 // 1) unlock speech + AudioContext inside the tap (iOS)
 try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(' ');u.volume=0;speechSynthesis.speak(u)}catch(x){}
 getWeather();$('start').style.display='none';$('app').style.display='block';
 // Morning: ask mic once for shower water listen (loudness only; nothing recorded)
 if(typeof ROUTINE!=='undefined'&&ROUTINE==='morning routine'){
  $('step').textContent='🎤 Allow the microphone';$('status').innerHTML='<span class=off>Needed to hear the shower water (not for talking). Tap Allow…</span>';
  await Water.unlock();
  if(!Water.perm)$('status').innerHTML='<span class=off>Mic off — shower will use timers only. Press Done when you finish each step.</span>';
  else $('status').innerHTML='<span class=off>Press Done when you finish each step. Shower mic ready.</span>';
 }
 if(!VOICE()){if(!Water.perm||ROUTINE!=='morning routine')$('status').innerHTML=$('status').innerHTML||'<span class=off>Press Done when you finish each step.</span>';active=true;paused=false;keepAwake();return ask()}
 if(SR&&!rec)setup();
 if(!Water.perm){ // voice mode still needs mic for speech
  $('step').textContent='🎤 Allow the microphone';$('status').innerHTML='<span class=off>Tap “Allow” if asked…</span>';
  let mic='ok';try{const s=await navigator.mediaDevices.getUserMedia({audio:true});s.getTracks().forEach(t=>t.stop())}catch(x){mic='denied'}
  const r=await primeRec();
  const blocked=mic==='denied'||r==='not-allowed'||r==='service-not-allowed';
  active=true;paused=false;keepAwake();
  if(blocked||!SR){localStorage.mode='touch';$('status').innerHTML='<span class=off>Microphone not available. Using touch: press Done.</span>';
   say("I can't use the microphone, so press done after each step.",()=>ask());return}
  ask();return}
 active=true;paused=false;keepAwake();
 if(SR){const r=await primeRec();if(r==='not-allowed'||r==='service-not-allowed'){localStorage.mode='touch';say("Voice listening isn't available, so press done after each step.",()=>ask());return}}
 ask()};
document.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>handle(b.dataset.c==='done'?'done':b.dataset.c));

try{const n=$('kidname');if(n&&localStorage.kidName)n.value=localStorage.kidName}catch(e){}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&active)keepAwake()});
try{const m=$('mode');if(m){m.value=localStorage.mode||'touch';m.onchange=()=>{localStorage.mode=m.value}}}catch(e){}
