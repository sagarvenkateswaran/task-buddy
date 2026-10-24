const CHECKIN_MS=150000, CALM=["Good.","Nice and easy.","Well done.","Lovely."], PRAISE=["Great job!","Well done!","Awesome!","Nice work!","You're doing great!","Fantastic!"];
const IOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
let lastErr=null,stepT=[],rec,listening=false,speaking=false,paused=false,active=false,list=null,i=0,timer,checks=0,wake;
const $=id=>document.getElementById(id);
let firstDone=false,sayId=0;
function say(t,cb,_r){speaking=true;const id=++sayId;try{rec&&rec.abort()}catch(e){}
 speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.rate=.9;
 u.onend=()=>{if(id!==sayId)return;speaking=false;cb&&cb();listen()};
 u.onerror=ev=>{if(id!==sayId)return;speaking=false;   // re-speak step 1 if it got interrupted (e.g. permission prompt)
  if(_r&&_r<3)return setTimeout(()=>{if(id===sayId)say(t,cb,_r+1)},500);cb&&cb();listen()};
 speechSynthesis.speak(u);}
function listen(){if(!SR||speaking||listening||!active)return;
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
const T=x=>typeof x==='string'?x:x.weather?weatherText():x.text, cur=()=>LISTS[list][i], timed=()=>list&&cur()&&typeof cur()==='object'&&cur().wait;
const sfx=x=>(typeof x==='object'&&x.auto===true)?'':(/done/i.test(T(x))||/\?\s*$/.test(T(x))?'':" Say I am done.");
function later(ms,f){stepT.push(setTimeout(()=>{if(active&&!paused)f()},ms))}
function clearStep(){stepT.forEach(clearTimeout);stepT=[]}
function runStep(intro){clearStep();const x=cur();if(typeof x==='object'&&x.pre){if(intro||x.lead)say((intro?intro+' ':'')+(x.lead||''));later(x.pre,()=>speakStep(''))}else speakStep(intro?intro+' ':'')}
function speakStep(intro){const x=cur(),me=i,first=i===0&&!firstDone;say(intro+P_(x.speak||T(x))+sfx(x),()=>{if(first)firstDone=true;if(i!==me||!list)return;
 if(typeof x==='string'||!x.wait)return armCheck();
 let n=1;const rep=()=>{if(n<(x.repeat||1)){n++;later(x.gap||20000,()=>{if(i===me)say(P_(x.speak||T(x)),rep)})}else later(x.wait,()=>{if(i===me)next()})};rep()},first?1:0)}
function names(){return Object.keys(LISTS).join(', ')}
function ask(){if(typeof ROUTINE!=='undefined')return begin(ROUTINE);clearStep();list=null;$('list').textContent='';$('step').textContent='Say: '+names();bar();
 say('Which list would you like to do? You can say '+names()+'.');armCheck()}
function handle(t){resetCheck();
 if(/\b(stop|quit|exit|end)\b/.test(t))return stop();
 if(paused){if(/\b(resume|continue|start|go|ready|unpause)\b/.test(t)){paused=false;if(list)runStep("Okay, let's keep going.");else{say("Okay, let's keep going.");armCheck()}}return}
 if(!list){if(typeof ROUTINE!=="undefined")return;const k=Object.keys(LISTS).find(n=>t.includes(n)||t.includes(n.split(' ')[0]));
  if(k)return begin(k); if(/\b(list|menu|options|help)\b/.test(t))return ask(); return}
 if(/\b(done|finished|finish|next|did it|complete|ok next|fine|yes|yeah|ok|okay)\b/.test(t))return next();
 if(/\b(repeat|again|what)\b/.test(t))return say('Your step is: '+T(cur()));
 if(/\bhelp\b/.test(t))return say('Say I am done when you finish a step. Say repeat to hear it again, pause to take a break, or stop to end. Your step now is: '+T(cur()));
 if(/\b(pause|break|wait)\b/.test(t)){paused=true;clearTimeout(timer);clearStep();$('status').innerHTML='<span class=off>⏸ Paused — say "resume"</span>';return say('Okay, pausing. Say resume when you are ready.')}
 if(/\b(back|previous)\b/.test(t)){i=Math.max(0,i-1);show();return runStep('Going back.')}
}
function begin(k){ORIG[k]=ORIG[k]||LISTS[k];const d=new Date().getDay();
 LISTS[k]=ORIG[k].filter(x=>!(x&&x.days&&!x.days.includes(d))&&!(x&&x.weather&&TEMP>=65));list=k;i=0;$('list').textContent=k;show();
 const g=k==='bedtime routine'?"Hi. It's time to get ready for bed. Take a deep breath. We'll go nice and slow.":"Good morning! Let's get ready for the day. Take a moment.";
 say(g,()=>setTimeout(()=>{if(list===k&&i===0)runStep("Here's your first step.")},4000))}
function show(){$('step').textContent=T(cur());bar()}
function bar(){const n=list?LISTS[list].length:1,d=list?i:0;$('bar').style.width=(d/n*100)+'%';$('count').textContent=list?`Step ${i+1} of ${n}`:''}
function next(){clearStep();const s=LISTS[list],calm=(typeof CALM_MODE!=='undefined'&&CALM_MODE)||list==='bedtime routine',P=calm?CALM:PRAISE,p=P[Math.floor(Math.random()*P.length)];i++;
 if(i>=s.length&&calm){$('bar').style.width='100%';$('step').textContent='🌙 Good night';list=null;
  return say("You did everything. I'm proud of you. Snuggle in, close your eyes, and sleep well. Good night.",()=>{active=false;clearTimeout(timer);try{rec&&rec.abort()}catch(e){};wake&&wake.release()})}
 if(i>=s.length){$('bar').style.width='100%';$('step').textContent='🎉 All done!';const k=list;list=null;
  let E=typeof ENDINGS!=='undefined'&&ENDINGS[k];if(typeof E==='function')E=E();return say(E==='GOODJOB'?'Good job!':p+' '+(E||('You finished your whole '+k+'! I am proud of you. Have a wonderful day!')),()=>{active=false;clearTimeout(timer);try{rec&&rec.abort()}catch(e){};wake&&wake.release()})}
 show();const left=s.length-i;
 runStep(p+(left===1?' Last one!':(i===Math.floor(s.length/2)?' Halfway there!':'')))}
function resetCheck(){clearTimeout(timer);checks=0}
function armCheck(){clearTimeout(timer);if(!active||paused||timed())return;timer=setTimeout(()=>{checks++;
 if(list){const t=T(cur()),q=/\?\s*$/.test(t),s=t.toLowerCase().replace(/[.!?]$/,"");say(q?t+' Say I am done.':(checks<3?`Still on ${s}? Say I am done.`:`Still here. ${t.replace(/[.!?]$/,'')}. Say I am done.`))}
 else say('Which list would you like to do? Say '+names()+'.');armCheck()},CHECKIN_MS)}
function stop(){active=false;clearTimeout(timer);clearStep();try{rec&&rec.abort()}catch(e){}
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
 // 1) unlock speech inside the tap
 try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(' ');u.volume=0;speechSynthesis.speak(u)}catch(x){}
 if(SR&&!rec)setup();getWeather();$('start').style.display='none';$('app').style.display='block';
 $('step').textContent='🎤 Allow the microphone';$('status').innerHTML='<span class=off>Tap “Allow” if asked…</span>';
 // 2) get mic + speech-recognition permission BEFORE talking
 let mic='ok';try{const s=await navigator.mediaDevices.getUserMedia({audio:true});s.getTracks().forEach(t=>t.stop())}catch(x){mic='denied'}
 const r=await primeRec();
 const blocked=mic==='denied'||r==='not-allowed'||r==='service-not-allowed';
 active=true;paused=false;keepAwake();
 if(blocked||!SR){$('status').innerHTML='<span class=off>Microphone blocked — use the buttons below. (Settings › Safari › Microphone)</span>';
  say("The microphone is blocked. You can use the buttons on the screen.",()=>ask());return}
 ask()};
document.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>handle(b.dataset.c==='done'?'done':b.dataset.c));
