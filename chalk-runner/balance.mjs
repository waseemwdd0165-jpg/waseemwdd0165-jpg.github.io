/* ==========================================================================
   Chalk Runner - is it fair?

   Not a test. The tests say the rules work; this says whether the rules make
   a game worth playing. It plays sixty whole rounds with nobody watching: the
   practice bot lays the ground, a scripted runner jumps, and it reports how
   far they got and what finished them.

   Two runners are worth trying. A late jumper dies at pits around 150 metres.
   One who leaves the ground in time gets to about 950, where the bot simply
   cannot lay chalk faster than the runner crosses it. Real people land
   between the two, which is the range the numbers were tuned for.

   Run it after changing any of: the speed steps, the chalk budget, the jump,
   or anything in makeLevel.
   ========================================================================== */

import { newRunner, stepRunner, makeLevel, hardSegs, botStroke, inPit,
         INK_MAX, INK_REFILL, LEDGE_END, MIN_SEG, MAX_SEG, START_X, leapsEarned,
         speedAt, LEAP_V, FLOAT_S }
  from './worker-single.js';

/* one whole solo round, driven by the bot, no browser and no clock */
function run(seed, useLeaps){
  const obs = makeLevel(seed), hard = hardSegs(obs);
  const r = newRunner();
  const segs = [{x1:-1,y1:1.2,x2:LEDGE_END,y2:1.2}];
  let from = LEDGE_END, ink = INK_MAX;
  const dt = 1/30;
  for (let i = 0; i < 30 * 240; i++){
    ink = Math.min(INK_MAX, ink + INK_REFILL * dt);
    const s = botStroke(r, from, ink, obs);
    if (s){
      const p = s.pts;
      for (let j = 0; j + 3 < p.length; j += 2){
        const len = Math.hypot(p[j+2]-p[j], p[j+3]-p[j+1]);
        if (len < MIN_SEG || len > MAX_SEG || ink < len) break;
        if (inPit(obs, p[j]) || inPit(obs, p[j+2])) continue;
        ink -= len;
        segs.push({x1:p[j],y1:p[j+1],x2:p[j+2],y2:p[j+3]});
      }
      from = s.end;
    }
    /* a plain runner: jumps when a wall or a pit is close, leaps when it has one */
    /* a player who can see: leave the ground early enough for the arc to land */
    const v = speedAt(r.dist);
    const air = 2 * 10.2 / 26;
    const ahead = obs.find(o => o.x > r.x - 0.5 && o.x < r.x + 14 && o.k !== 1);
    if (ahead && r.grounded){
      const need = ahead.k === 2 ? ahead.w + 0.8 : 1.6;
      const lead = Math.max(0.4, (v * air - need) / 2);
      const takeoff = ahead.x - lead;
      if (r.x >= takeoff - v * dt && r.x <= takeoff + v * dt * 2){
        if (useLeaps && ahead.k === 2 && need > v * air * 0.85 && r.leaps > 0){
          r.leaps--; r.vy = LEAP_V; r.float = FLOAT_S; r.grounded = false;
        } else { r.vy = 10.2; r.grounded = false; }
      }
    }
    const earned = leapsEarned(r.dist);
    if (earned > r.banked){ r.leaps += earned - r.banked; r.banked = earned; }
    stepRunner(r, segs, dt, undefined, hard);
    if (!r.alive) break;
  }
  let why = 'fell';
  if (r.stuck > 0.3) why = 'blocked';
  const near = obs.filter(o => Math.abs(o.x - r.x) < 6).sort((a,b)=>Math.abs(a.x-r.x)-Math.abs(b.x-r.x))[0];
  return { d: Math.floor(r.dist), why, on: near ? ['wall','roof','pit'][near.k] : 'nothing' };
}

const raw = [];
for (let s = 1; s <= 60; s++) raw.push(run(s * 7919, true));
const tally = {};
for (const x of raw){ const k = x.why + ' at a ' + x.on; tally[k] = (tally[k]||0)+1; }
console.log('  how it ended:', JSON.stringify(tally));
const res = raw.map(x=>x.d);
res.sort((a,b)=>a-b);
const q = p => res[Math.floor((res.length-1)*p)];
console.log('bot runs over 60 seeds');
console.log('  min', res[0], ' 25%', q(0.25), ' median', q(0.5), ' 75%', q(0.75), ' max', res[res.length-1]);
console.log('  under 45m (died on the first obstacle):', res.filter(x=>x<45).length);
console.log('  over 400m:', res.filter(x=>x>400).length);

/* what kills it: count obstacle kinds in the first 200m of one level */
const L = makeLevel(7919).filter(o=>o.x<250);
console.log('  first 250m has', L.length, 'obstacles:',
  L.filter(o=>o.k===0).length,'walls',
  L.filter(o=>o.k===1).length,'roofs',
  L.filter(o=>o.k===2).length,'pits');
console.log('  widest pit in 250m:', Math.max(...L.filter(o=>o.k===2).map(o=>o.w)).toFixed(1));
