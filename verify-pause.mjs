// Lightweight pause/resume behavior checks (mock DOM + shared helpers pattern)
import { readFileSync } from 'fs';

const htmlM = readFileSync(new URL('./morning/index.html', import.meta.url), 'utf8');
const htmlB = readFileSync(new URL('./bedtime/index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('./app.js', import.meta.url), 'utf8');

function assert(c, m){ if(!c){ console.error('FAIL', m); process.exitCode=1 } else console.log('OK', m) }

assert(/id="resumeBtn"/.test(htmlM), 'morning has resumeBtn');
assert(/id="resumeBtn"/.test(htmlB), 'bedtime has resumeBtn');
assert(/data-c="resume"/.test(htmlM) && /data-c="resume"/.test(htmlB), 'resume data-c on both');
assert(/#resumeBtn\{display:none/.test(htmlM) && /#resumeBtn\{display:none/.test(htmlB), 'resume hidden by default');
assert(/v=20261109a/.test(htmlM) && /v=20261109a/.test(htmlB), 'cache-bust bumped');

assert(/function doPause\(/.test(app), 'doPause exists');
assert(/function doResume\(/.test(app), 'doResume exists');
assert(/Press Resume when you are ready/.test(app), 'spoken prompt says press Resume');
assert(/Paused — press Resume/.test(app), 'status says press Resume');
assert(!/Say resume when you are ready/.test(app), 'no longer instructs saying resume');
assert(/if\(paused\)return;\n  const x=cur\(\);if\(showerOf\(x\)==='enter'/.test(app) || /onWaterOn\(\)\{[^}]*if\(paused\)return/.test(app), 'onWaterOn guarded');
assert(/function onWaterOff\(\)\{\n  if\(paused\)return/.test(app), 'onWaterOff guarded');
assert(/isSilent\(cur\(\)\)/.test(app) && /doResume/.test(app), 'resume special-cases silent');
assert(/voice resume is bonus/.test(app) || /bonus only/.test(app), 'voice resume documented as bonus');

// DigiMaa report fixture: pause toggles button label (no "say resume")
import { readFileSync as rf } from 'fs';
const digi = rf('/workspace/routine-app-store/www/app.js','utf8');
assert(/pauseBtn/.test(digi) && /paused\?RS\.resume:RS\.pause/.test(digi), 'DigiMaa toggles Pause→Resume on same button');
assert(/if\(!active\|\|paused\)return/.test(digi), 'DigiMaa ignores voice while paused');
assert(!/Say resume/.test(digi), 'DigiMaa does not say "Say resume"');

if(!process.exitCode) console.log('\nAll pause checks passed');
