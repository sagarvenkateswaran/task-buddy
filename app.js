const CHECKIN_MS=150000, CALM=["Good.","Nice and easy.","Well done.","Lovely."], PRAISE=["Great job!","Well done!","Awesome!","Nice work!","You're doing great!","Fantastic!"];
const IOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
let lastErr=null,stepT=[],rec,listening=false,speaking=false,paused=false,active=false,list=null,i=0,timer,checks=0,wake;
const $=id=>document.getElementById(id);
function say(t,cb){speaking=true;try{rec&&rec.abort()}catch(e){}
 speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.rate=.9;
 u.onend=u.onerror=()=>{speaking=false;cb&&cb();listen()};speechSynthesis.speak(u);}
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
const T=x=>typeof x==='string'?x:x.text, cur=()=>LISTS[list][i], timed=()=>list&&cur()&&typeof cur()==='object'&&cur().wait;
const sfx=x=>(typeof x==='object'&&x.auto===true)?'':(/say done/i.test(T(x))?'':" Say done when you're finished.");
function later(ms,f){stepT.push(setTimeout(()=>{if(active&&!paused)f()},ms))}
function clearStep(){stepT.forEach(clearTimeout);stepT=[]}
function runStep(intro){clearStep();const x=cur();if(typeof x==='object'&&x.pre){if(intro)say(intro);later(x.pre,()=>speakStep(''))}else speakStep(intro?intro+' ':'')}
function speakStep(intro){const x=cur(),me=i;say(intro+(x.speak||T(x)).replace(/[.!?]$/,'')+'.'+sfx(x),()=>{if(i!==me||!list)return;
 if(typeof x==='string'||!x.wait)return armCheck();
 let n=1;const rep=()=>{if(n<(x.repeat||1)){n++;later(x.gap||20000,()=>{if(i===me)say(T(x)+'.',rep)})}else later(x.wait,()=>{if(i===me)next()})};rep()})}
function names(){return Object.keys(LISTS).join(', ')}
function ask(){if(typeof ROUTINE!=='undefined')return begin(ROUTINE);clearStep();list=null;$('list').textContent='';$('step').textContent='Say: '+names();bar();
 say('Which list would you like to do? You can say '+names()+'.');armCheck()}
function handle(t){resetCheck();
 if(/\b(stop|quit|exit|end)\b/.test(t))return stop();
 if(paused){if(/\b(resume|continue|start|go|ready|unpause)\b/.test(t)){paused=false;if(list)runStep("Okay, let's keep going.");else{say("Okay, let's keep going.");armCheck()}}return}
 if(!list){if(typeof ROUTINE!=="undefined")return;const k=Object.keys(LISTS).find(n=>t.includes(n)||t.includes(n.split(' ')[0]));
  if(k)return begin(k); if(/\b(list|menu|options|help)\b/.test(t))return ask(); return}
 if(/\b(done|finished|finish|next|did it|complete|ok next)\b/.test(t))return next();
 if(/\b(repeat|again|what)\b/.test(t))return say('Your step is: '+T(cur()));
 if(/\bhelp\b/.test(t))return say('Say done when you finish a step. Say repeat to hear it again, pause to take a break, or stop to end. Your step now is: '+T(cur()));
 if(/\b(pause|break|wait)\b/.test(t)){paused=true;clearTimeout(timer);clearStep();$('status').innerHTML='<span class=off>⏸ Paused — say "resume"</span>';return say('Okay, pausing. Say resume when you are ready.')}
 if(/\b(back|previous)\b/.test(t)){i=Math.max(0,i-1);show();return runStep('Going back.')}
}
function begin(k){list=k;i=0;$('list').textContent=k;show();
 runStep("Let's do your "+k+". There are "+LISTS[k].length+" steps. Step one:")}
function show(){$('step').textContent=T(cur());bar()}
function bar(){const n=list?LISTS[list].length:1,d=list?i:0;$('bar').style.width=(d/n*100)+'%';$('count').textContent=list?`Step ${i+1} of ${n}`:''}
function next(){clearStep();const s=LISTS[list],calm=(typeof CALM_MODE!=='undefined'&&CALM_MODE)||list==='bedtime routine',P=calm?CALM:PRAISE,p=P[Math.floor(Math.random()*P.length)];i++;
 if(i>=s.length&&calm){$('bar').style.width='100%';$('step').textContent='🌙 Good night';list=null;
  return say("You did everything. I'm proud of you. Snuggle in, close your eyes, and sleep well. Good night.",()=>{active=false;clearTimeout(timer);try{rec&&rec.abort()}catch(e){};wake&&wake.release()})}
 if(i>=s.length){$('bar').style.width='100%';$('step').textContent='🎉 All done!';const k=list;list=null;
  return say(p+' You finished your whole '+k+'! I am proud of you. Have a wonderful day!',()=>{active=false;clearTimeout(timer);try{rec&&rec.abort()}catch(e){};wake&&wake.release()})}
 show();const left=s.length-i;
 runStep(`${p} That's ${i} done, ${left} to go.`+(typeof s[i]==='object'&&s[i].pre?'':' Next step:'))}
function resetCheck(){clearTimeout(timer);checks=0}
function armCheck(){clearTimeout(timer);if(!active||paused||timed())return;timer=setTimeout(()=>{checks++;
 if(list)say(checks<3?`How's it going with: ${T(cur()).toLowerCase().replace(/[.!?]$/,"")}? Say done when you're finished, or help if you need it.`:`I'm still here. Your step is: ${T(cur()).toLowerCase().replace(/[.!?]$/,"")}. Say done when you're ready.`);
 else say('Which list would you like to do? Say '+names()+'.');armCheck()},CHECKIN_MS)}
function stop(){active=false;clearTimeout(timer);clearStep();try{rec&&rec.abort()}catch(e){}
 say('Okay, stopping. Great work today. Tap start whenever you want to go again.');
 setTimeout(()=>{$('app').style.display='none';$('start').style.display='inline-block'},500);wake&&wake.release()}
async function keepAwake(){try{if('wakeLock' in navigator)wake=await navigator.wakeLock.request('screen')}catch(e){}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&active){keepAwake();listen()}});
$('start').onclick=async()=>{if(SR&&!rec)setup();$('start').style.display='none';$('app').style.display='block';active=true;paused=false;
 try{const s=await navigator.mediaDevices.getUserMedia({audio:true});s.getTracks().forEach(t=>t.stop())}catch(e){}
 keepAwake();if(!rec)setup();ask()};
document.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>handle(b.dataset.c==='done'?'done':b.dataset.c));
