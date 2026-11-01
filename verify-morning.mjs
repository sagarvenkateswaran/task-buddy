// Offline verification of morning routine day/temp filtering (mirrors app.js begin filter)
import { readFileSync } from 'fs';
import { pathToFileURL } from 'url';
import vm from 'vm';

const routinesSrc = readFileSync(new URL('./routines.js', import.meta.url), 'utf8');
const ctx = {};
vm.runInNewContext(routinesSrc + '\nthis.LISTS=LISTS;', ctx);
const ORIG = ctx.LISTS['morning routine'];

function tempStepOk(x, TEMP, month) {
  if (!x || x.tempBelow == null) return true;
  const thr = x.tempBelow;
  if (TEMP == null) {
    if (thr <= 40) return month >= 10 || month <= 2;
    return true;
  }
  return TEMP < thr;
}

function filterList(day, TEMP, month = 10) {
  return ORIG.filter(x => {
    if (x && x.days && !x.days.includes(day)) return false;
    if (x && x.weather && TEMP != null && TEMP >= 65) return false;
    if (x && x.tempBelow != null && !tempStepOk(x, TEMP, month)) return false;
    return true;
  }).map(x => {
    if (typeof x === 'string') return x;
    if (x.weather) return `[weather reminder]`;
    let t = x.text || '';
    const tags = [];
    if (x.days) tags.push(`days=${x.days.join(',')}`);
    if (x.tempBelow != null) tags.push(`tempBelow=${x.tempBelow}`);
    if (x.once) tags.push('once');
    if (x.silent) tags.push('silent');
    if (x.shower) tags.push(`shower=${x.shower}`);
    if (x.hold) tags.push('hold');
    return tags.length ? `${t}  (${tags.join('; ')})` : t;
  });
}

const samples = [
  { name: 'Sunday 35°F', day: 0, temp: 35 },
  { name: 'Tuesday 55°F', day: 2, temp: 55 },
  { name: 'Wednesday 70°F', day: 3, temp: 70 },
  { name: 'Fail-fallback Nov (TEMP null)', day: 1, temp: null, month: 10 },
  { name: 'Fail-fallback July (TEMP null)', day: 1, temp: null, month: 6 },
];

for (const s of samples) {
  const list = filterList(s.day, s.temp, s.month ?? 10);
  console.log('\n=== ' + s.name + ` (${list.length} steps) ===`);
  list.forEach((t, i) => console.log(`${String(i + 1).padStart(2)}. ${t}`));
}

// Assertions
function assert(cond, msg) { if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; } else console.log('OK:', msg); }

const sun = filterList(0, 35);
assert(sun.some(t => /shave/i.test(t)), 'Sunday includes shave');
assert(sun.some(t => /Take your phone and laundry downstairs/i.test(t)), 'Sunday phone+laundry downstairs');
assert(sun.some(t => /Load the laundry into the washer/i.test(t)), 'Sunday load washer');
assert(sun.some(t => /Turn on the washer/i.test(t)), 'Sunday includes turn on washer');
assert(sun.some(t => /light jacket/i.test(t)), 'Sunday 35F includes light jacket');
assert(sun.some(t => /heavy winter jacket/i.test(t)), 'Sunday 35F includes heavy jacket');
assert(!sun.some(t => /^Put on your socks/i.test(t) || /Put on your socks/i.test(t)), 'Sunday excludes socks');
assert(!sun.some(t => /Put on your shoes/i.test(t)), 'Sunday excludes shoes');
assert(sun.findIndex(t => /Comb your hair/i.test(t)) < sun.findIndex(t => /Take your phone and laundry downstairs/i.test(t)), 'phone+laundry after comb');
const sunLaundry = ['Take your phone and laundry downstairs.','Load the laundry into the washer.','Add detergent.','Turn on the washer.'].map(s=>sun.findIndex(t=>t.startsWith(s)||t.includes(s.replace(/\.$/,''))));
assert(sunLaundry.every(i=>i>=0) && sunLaundry[0]<sunLaundry[1]&&sunLaundry[1]<sunLaundry[2]&&sunLaundry[2]<sunLaundry[3], 'Sunday laundry order');
assert(sun.findIndex(t => /Turn on the washer/i.test(t)) < sun.findIndex(t => /Swami Namaskarams/i.test(t)), 'laundry before namaskarams');
assert(sun.findIndex(t => /Swami Namaskarams/i.test(t)) < sun.findIndex(t => /Eat breakfast/i.test(t)), 'namaskarams before breakfast');

const sunSwami = sun.find(t => /Swami Namaskarams/i.test(t));
assert(!!sunSwami, 'Sunday has Swami step');
assert(!/Take your phone/i.test(sunSwami), 'Sunday Swami omits Take your phone');
assert(/once/.test(sunSwami), 'Sunday Swami still once');

const tue = filterList(2, 55);
assert(tue.some(t => /shave/i.test(t)), 'Tuesday includes shave');
assert(tue.some(t => /socks/i.test(t)), 'Tuesday includes socks');
assert(tue.some(t => /light jacket/i.test(t)), 'Tuesday 55F includes light jacket');
assert(!tue.some(t => /heavy winter jacket/i.test(t)), 'Tuesday 55F excludes heavy jacket');
assert(!tue.some(t => /laundry/i.test(t) || /washer/i.test(t) || /detergent/i.test(t)), 'Tuesday excludes laundry');
assert(tue.some(t => /shoes/i.test(t)), 'Tuesday includes shoes');

const tueSwami = tue.find(t => /Swami Namaskarams/i.test(t));
assert(!!tueSwami, 'Tuesday has Swami step');
assert(/Take your phone with you/i.test(tueSwami), 'Tuesday Swami keeps Take your phone');
assert(/once/.test(tueSwami), 'Tuesday Swami still once');

const wed = filterList(3, 70);
assert(!wed.some(t => /shave/i.test(t)), 'Wednesday excludes shave');
assert(!wed.some(t => /aftershave/i.test(t)), 'Wednesday excludes aftershave');
assert(wed.some(t => /socks/i.test(t)), 'Wednesday includes socks');
assert(!wed.some(t => /light jacket/i.test(t)), 'Wednesday 70F excludes light jacket');
assert(!wed.some(t => /heavy winter jacket/i.test(t)), 'Wednesday 70F excludes heavy jacket');
assert(!wed.some(t => /weather reminder/i.test(t)), 'Wednesday 70F excludes weather reminder (>=65)');

const failNov = filterList(1, null, 10);
assert(failNov.some(t => /light jacket/i.test(t)), 'fail Nov includes light');
assert(failNov.some(t => /heavy winter jacket/i.test(t)), 'fail Nov includes heavy');
const failJul = filterList(1, null, 6);
assert(failJul.some(t => /light jacket/i.test(t)), 'fail Jul includes light');
assert(!failJul.some(t => /heavy winter jacket/i.test(t)), 'fail Jul excludes heavy');

if (process.exitCode) console.error('\nSome assertions failed');
else console.log('\nAll assertions passed');
