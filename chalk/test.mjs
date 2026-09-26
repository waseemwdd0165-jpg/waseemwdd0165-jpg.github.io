/* ==========================================================================
   Chalk - server checks

   The physics is the game here, so most of this is about the runner: does a
   drawn line actually hold them up, does a gap actually kill them, and can a
   drawer cheat by drawing the whole level in one go from a mile away.
   ========================================================================== */

import { Board, stepRunner, newRunner, segDistance, withinReach,
         ROUNDS, INK_MAX, INK_REFILL, MIN_SEG, MAX_SEG,
         REACH_FWD, REACH_BACK, RUN_SPEED, START_X, START_Y, DEATH_Y, RUNNER_R }
  from './worker-single.js';

const pendingTimers = [];
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};
const realTimeout = globalThis.setTimeout;
globalThis.setTimeout = (fn) => { pendingTimers.push(fn); return pendingTimers.length; };
const flush = () => pendingTimers.splice(0).forEach(f => f());

let pass = 0, fail = 0;
const check = (n, ok, extra) => {
  if (ok){ pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (extra !== undefined ? '   >> ' + extra : '')); }
};
function sock(){
  const s = { msgs: [], send(j){ s.msgs.push(JSON.parse(j)); }, addEventListener(){} };
  return s;
}
const last = (w, t) => [...w.msgs].reverse().find(m => m.t === t);
function join(b, name, opts){
  const w = sock();
  b.onMessage(w, Object.assign({ t:'join', name }, opts || {}));
  return w;
}
/* a long flat line to run along */
const floor = (x1, x2, y) => ({ x1, y1: y, x2, y2: y });

console.log('\nchalk\n');

/* ---------- geometry ------------------------------------------------------- */
{
  const a = segDistance(0, 1, -1, 0, 1, 0);
  check('distance to a line below is the height', Math.abs(a.d - 1) < 1e-9, a.d);
  const b = segDistance(5, 0, -1, 0, 1, 0);
  check('past the end it measures to the end', Math.abs(b.d - 4) < 1e-9, b.d);
  const c = segDistance(0, 0, 0, 0, 0, 0);
  check('a zero length line does not blow up', isFinite(c.d), c.d);
}

/* ---------- the runner falls ----------------------------------------------- */
{
  const r = newRunner();
  for (let i = 0; i < 400 && r.alive; i++) stepRunner(r, [], 1/30);
  check('with nothing drawn the runner falls and dies', !r.alive);
  check('and the fall was downwards', r.y <= DEATH_Y, r.y.toFixed(1));
}

/* ---------- the runner runs on what is drawn -------------------------------- */
{
  const r = newRunner();
  const segs = [floor(-2, 200, 1.2)];
  let lowest = 99;
  for (let i = 0; i < 600; i++){
    stepRunner(r, segs, 1/30);
    lowest = Math.min(lowest, r.y);
  }
  check('a long line holds the runner up', r.alive);
  check('and they rest on top of it, not inside it',
        Math.abs(r.y - (1.2 + RUNNER_R)) < 0.12, r.y.toFixed(3));
  check('they never sank through', lowest > 1.2, lowest.toFixed(3));
  check('they travelled at the speed they should',
        Math.abs(r.dist - RUN_SPEED * 20) < 1.5, r.dist.toFixed(1));
}

/* ---------- a gap is really a gap ------------------------------------------- */
{
  const r = newRunner();
  const segs = [floor(-2, 12, 1.2), floor(30, 200, 1.2)];
  for (let i = 0; i < 900 && r.alive; i++) stepRunner(r, segs, 1/30);
  check('an eighteen metre hole is fatal', !r.alive);
  check('and they got at least as far as the hole', r.dist > 8, r.dist.toFixed(1));
}

/* ---------- slopes ---------------------------------------------------------- */
{
  const r = newRunner();
  /* the flat run has to outlast the test, or the runner simply reaches the
     end of the world and the ramp gets the blame */
  const segs = [floor(-2, 6, 1.2), { x1:6, y1:1.2, x2:16, y2:5 }, floor(16, 400, 5)];
  for (let i = 0; i < 400 && r.alive; i++) stepRunner(r, segs, 1/30);
  check('a ramp carries the runner uphill', r.alive && r.y > 4, r.y.toFixed(2));
  check('and they are standing on the upper level, not floating',
        Math.abs(r.y - (5 + RUNNER_R)) < 0.15, r.y.toFixed(3));
}

/* ---------- reach ----------------------------------------------------------- */
{
  check('you can draw just ahead of the runner', withinReach(10, 2, 10 + REACH_FWD - 1, 2));
  check('you cannot draw far ahead',           !withinReach(10, 2, 10 + REACH_FWD + 1, 2));
  check('you cannot draw far behind',          !withinReach(10, 2, 10 - REACH_BACK - 1, 2));
  check('you cannot draw high in the sky',     !withinReach(10, 2, 12, 40));
}

/* ---------- a board, and a drawer who tries things -------------------------- */
{
  const b = new Board({}, {});
  const host = join(b, 'Ann');      /* runner first round */
  const mate = join(b, 'Bob');
  check('two players make a board', b.players.length === 2);
  check('the first player hosts', last(host, 'state').host === true);
  check('start is refused by the guest', (b.onMessage(mate, { t:'start' }), b.phase === 'lobby'));

  b.onMessage(host, { t: 'start' });
  check('the match starts', b.phase === 'play', b.phase);
  check('exactly one runner', b.players.filter(p => p.role === 'runner').length === 1);
  check('there is a ledge to stand on at the start', b.segs.length === 1);

  const drawer = b.players.find(p => p.role === 'drawer');
  const runner = b.players.find(p => p.role === 'runner');
  const drawerSock = drawer.ws;

  /* a normal stroke just ahead */
  const before = b.segs.length, inkBefore = drawer.ink;
  b.onMessage(drawerSock, { t:'draw', pts: [6,1.2, 7,1.2, 8,1.2, 9,1.2] });
  check('a stroke near the runner is accepted', b.segs.length > before, b.segs.length);
  check('and it costs chalk', drawer.ink < inkBefore, drawer.ink.toFixed(1));

  /* the whole level, from far away */
  const n1 = b.segs.length;
  b.onMessage(drawerSock, { t:'draw', pts: [500,1, 501,1, 502,1, 503,1] });
  check('a stroke far ahead is refused', b.segs.length === n1, b.segs.length);

  /* one enormous jump of the pen */
  const n2 = b.segs.length;
  b.onMessage(drawerSock, { t:'draw', pts: [6,1.2, 6 + MAX_SEG + 2, 1.2] });
  check('a pen that teleports is refused', b.segs.length === n2);

  /* jitter */
  const n3 = b.segs.length;
  b.onMessage(drawerSock, { t:'draw', pts: [6,1.2, 6 + MIN_SEG/3, 1.2] });
  check('a twitch smaller than the minimum is ignored', b.segs.length === n3);

  /* rubbish */
  const n4 = b.segs.length;
  b.onMessage(drawerSock, { t:'draw', pts: ['x', null, 1, 2] });
  check('nonsense points are refused', b.segs.length === n4);
  b.onMessage(drawerSock, { t:'draw', pts: 'not an array' });
  check('a non list does not crash it', b.segs.length === n4);

  /* the runner cannot draw, the drawer cannot jump */
  const n5 = b.segs.length;
  b.onMessage(runner.ws, { t:'draw', pts: [6,1.2, 7,1.2] });
  check('the runner is not allowed to draw', b.segs.length === n5);
  const vy = b.runner.vy;
  b.onMessage(drawerSock, { t:'jump' });
  check('the drawer is not allowed to jump', b.runner.vy === vy);

  /* chalk runs out, then comes back */
  drawer.ink = 0.05;
  const n6 = b.segs.length;
  b.onMessage(drawerSock, { t:'draw', pts: [6,1.2, 7,1.2, 8,1.2] });
  check('with no chalk left nothing is drawn', b.segs.length === n6);
  /* a tick never counts more than a tenth of a second, however long the gap
     was, so refilling a second of chalk takes ten of them */
  for (let i = 0; i < 10; i++){ b.lastTick = Date.now() - 100; b.tick(); }
  check('chalk refills over time', drawer.ink > 0.05 + INK_REFILL * 0.7, drawer.ink.toFixed(2));
  check('but never past the maximum',
        (drawer.ink = INK_MAX, b.lastTick = Date.now() - 5000, b.tick(), drawer.ink <= INK_MAX + 1e-9),
        drawer.ink);
}

/* ---------- jumping ---------------------------------------------------------- */
{
  const b = new Board({}, {});
  const host = join(b, 'A'); join(b, 'B');
  b.onMessage(host, { t:'start' });
  const runner = b.players.find(p => p.role === 'runner');

  b.runner.grounded = false;
  b.onMessage(runner.ws, { t:'jump' });
  check('you cannot jump in mid air', b.runner.vy === 0, b.runner.vy);

  b.runner.grounded = true;
  b.onMessage(runner.ws, { t:'jump' });
  check('you can jump off the ground', b.runner.vy > 5, b.runner.vy);
  check('and jumping leaves the ground', b.runner.grounded === false);
}

/* ---------- a whole match ------------------------------------------------------ */
{
  const b = new Board({}, {});
  const a = join(b, 'A'), c = join(b, 'B');
  b.onMessage(a, { t:'start' });

  const runners = [];
  for (let round = 0; round < ROUNDS; round++){
    runners.push(b.players.findIndex(p => p.role === 'runner'));
    b.runner.alive = false;
    b.runner.dist = 12;
    b.lastTick = Date.now() - 33;
    b.tick();
    flush();
  }
  check('the match ends after four rounds', b.phase === 'over', b.phase);
  check('the runner swaps between players', new Set(runners).size === 2, JSON.stringify(runners));
  check('both players scored', b.players.every(p => p.score > 0),
        JSON.stringify(b.players.map(p => p.score)));
  check('the drawer is paid too, it is a team score',
        b.players[0].score === b.players[1].score,
        JSON.stringify(b.players.map(p => p.score)));

  b.onMessage(c, { t:'again' });
  check('a guest cannot restart', b.phase === 'over');
  b.onMessage(a, { t:'again' });
  check('the host can restart', b.phase === 'play');
  check('scores reset', b.players.every(p => p.score === 0));
}

/* ---------- people leaving ------------------------------------------------------ */
{
  const b = new Board({}, {});
  const a = join(b, 'A'), c = join(b, 'B');
  b.onMessage(a, { t:'start' });
  const runner = b.players.find(p => p.role === 'runner');
  b.onClose(runner.ws);
  check('the round ends if the runner walks out', b.phase === 'result', b.phase);
  check('and it says so', /left/.test(b.result), b.result);
  void c;

  const b2 = new Board({}, {});
  const x = join(b2, 'X'), y = join(b2, 'Y');
  b2.onClose(x); b2.onClose(y);
  check('an empty board resets', b2.players.length === 0 && b2.phase === 'lobby');
}

/* ---------- the door ------------------------------------------------------------ */
{
  const b = new Board({}, {});
  const a = join(b, 'A'); join(b, 'B');
  b.onMessage(a, { t:'start' });
  const late = sock();
  b.onMessage(late, { t:'join', name:'Late' });
  check('a late joiner is turned away', !!last(late, 'closed'));

  const b2 = new Board({}, {});
  join(b2, 'Occupant');
  const would = sock();
  b2.onMessage(would, { t:'join', name:'Host2', create:true });
  check('creating on a taken code is refused', !!last(would, 'taken'));
}

/* ---------- what travels -------------------------------------------------------- */
{
  const b = new Board({}, {});
  const a = join(b, 'A'); join(b, 'B');
  b.onMessage(a, { t:'start' });
  const p = b.players[0];
  /* a lot of chalk, most of it far behind */
  for (let i = 0; i < 300; i++) b.segs.push({ x1:i*0.2 - 60, y1:1, x2:i*0.2 - 59.8, y2:1 });
  const wire = JSON.stringify(b.sliceFor(p));
  check('only nearby chalk is sent', wire.length < 9000, wire.length + ' bytes');
  check('your own chalk level is sent', typeof b.sliceFor(p).ink === 'number');
  check('the runner position is sent', typeof b.sliceFor(p).r.x === 'number');
}

globalThis.setTimeout = realTimeout;
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
