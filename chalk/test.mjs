/* ==========================================================================
   Chalk - server checks

   The physics is the game here, so most of this is about the runner: does a
   drawn line actually hold them up, does a gap actually kill them, and can a
   drawer cheat by drawing the whole level in one go from a mile away.
   ========================================================================== */

import { Board, stepRunner, newRunner, segDistance, withinReach, speedAt,
         ROUNDS, INK_MAX, INK_REFILL, MIN_SEG, MAX_SEG, READY_MS, LEDGE_END,
         REACH_FWD, REACH_BACK, RUN_SPEED, SPEED_MAX, SPEED_RAMP,
         LEAP_EVERY, LEAP_V, JUMP_V, FLOAT_S, leapsEarned,
         START_X, START_Y, DEATH_Y, RUNNER_R }
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

/* ---------- the countdown, which the whole game turned out to need ---------- */
{
  check('the runner starts slower than it finishes', RUN_SPEED < SPEED_MAX);
  check('speed at the whistle is the slow one', speedAt(0) === RUN_SPEED);
  check('speed tops out and stays there',
        speedAt(SPEED_RAMP) === SPEED_MAX && speedAt(SPEED_RAMP * 4) === SPEED_MAX);
  check('and it climbs in between',
        speedAt(SPEED_RAMP/2) > RUN_SPEED && speedAt(SPEED_RAMP/2) < SPEED_MAX,
        speedAt(SPEED_RAMP/2).toFixed(2));

  /* The bug this exists for: the ledge has to outlast the countdown plus a
     beat, or the drawer never gets a chance and every round dies the same. */
  const b = new Board({}, {});
  const host = join(b, 'A'); join(b, 'B');
  b.onMessage(host, { t:'start' });
  const startX = b.runner.x;

  /* a second of ticks before the whistle should move nobody */
  for (let i = 0; i < 30; i++){ b.lastTick = Date.now() - 33; b.tick(); }
  check('the runner does not move during the countdown',
        Math.abs(b.runner.x - startX) < 0.01, b.runner.x);
  check('but the drawer can already work', b.phase === 'play');

  const drawer = b.players.find(p => p.role === 'drawer');
  const n = b.segs.length;
  b.onMessage(drawer.ws, { t:'draw', pts: [13,1.2, 13.5,1.2, 14,1.2] });
  check('and their chalk lands during the countdown', b.segs.length > n);

  /* once the whistle goes the ledge must last long enough to matter */
  b.runAt = Date.now() - 1;
  let ticks = 0;
  while (b.runner.x < LEDGE_END && ticks < 500){
    b.lastTick = Date.now() - 33; b.tick(); ticks++;
  }
  const secondsOnLedge = (LEDGE_END - startX) / RUN_SPEED;
  check('the opening ledge lasts about two seconds', secondsOnLedge > 1.7,
        secondsOnLedge.toFixed(2) + 's');
  check('so a person has the countdown plus that to draw in',
        READY_MS / 1000 + secondsOnLedge > 5,
        (READY_MS/1000 + secondsOnLedge).toFixed(1) + 's');
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

/* ---------- leaps ------------------------------------------------------------- */
{
  check('a leap is worth more than a jump', LEAP_V > JUMP_V, LEAP_V + ' vs ' + JUMP_V);
  check('none earned before the first hundred', leapsEarned(99) === 0);
  check('one at a hundred', leapsEarned(100) === 1);
  check('three at three hundred and a bit', leapsEarned(342) === 3);

  const b = new Board({}, {});
  const host = join(b, 'A'); join(b, 'B');
  b.onMessage(host, { t:'start' });
  const runner = b.players.find(p => p.role === 'runner');
  const drawer = b.players.find(p => p.role === 'drawer');

  b.onMessage(runner.ws, { t:'leap' });
  check('you cannot leap without having earned one', b.runner.vy === 0, b.runner.vy);

  /* walk the runner past a hundred metres */
  b.runner.dist = 205;
  b.runAt = Date.now() - 1;
  b.lastTick = Date.now() - 33;
  b.tick();
  check('two hundred metres banks two leaps', b.runner.leaps === 2, b.runner.leaps);

  b.runner.vy = 0; b.runner.grounded = false;
  b.onMessage(runner.ws, { t:'leap' });
  check('a leap can be spent in mid air', b.runner.vy === LEAP_V, b.runner.vy);
  check('and it is spent', b.runner.leaps === 1, b.runner.leaps);
  check('it starts the float', b.runner.float === FLOAT_S, b.runner.float);

  b.onMessage(drawer.ws, { t:'leap' });
  check('the drawer cannot leap', b.runner.leaps === 1);

  /* a floating runner falls slower than a plain one */
  const plain = newRunner(); const light = newRunner();
  light.float = FLOAT_S;
  for (let i = 0; i < 20; i++){ stepRunner(plain, [], 1/30); stepRunner(light, [], 1/30); }
  check('floating means falling slower', light.y > plain.y,
        light.y.toFixed(2) + ' vs ' + plain.y.toFixed(2));

  /* and a leap really does clear more ground than a jump */
  function hop(v, float){
    const r = newRunner();
    r.y = 1.56; r.vy = v; r.float = float;
    let top = r.y;
    for (let i = 0; i < 120; i++){ stepRunner(r, [], 1/30); top = Math.max(top, r.y); }
    return top;
  }
  check('a leap goes markedly higher than a jump',
        hop(LEAP_V, FLOAT_S) > hop(JUMP_V, 0) * 1.6,
        hop(LEAP_V, FLOAT_S).toFixed(1) + ' vs ' + hop(JUMP_V, 0).toFixed(1));

  /* the count travels to the client */
  const slice = b.sliceFor(runner);
  check('the leap count is sent', slice.r.lp === 1, slice.r.lp);
  check('so is the distance to the next one',
        slice.r.nx > 0 && slice.r.nx <= LEAP_EVERY, slice.r.nx);
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
