/* ==========================================================================
   Chalk Runner - server checks

   The physics is the game here, so most of this is about the runner: does a
   drawn line actually hold them up, does a gap actually kill them, and can a
   drawer cheat by drawing the whole level in one go from a mile away.

   The rest is about the things that were added after somebody actually played
   it: the countdown, the speed steps, the leap, the practice bot, the stored
   leaderboard, and the idle board that would otherwise sit there costing money.
   ========================================================================== */

import { Board, stepRunner, newRunner, segDistance, withinReach,
         speedAt, levelAt, nextMilestone, botStroke, leapsEarned, roomCode,
         ROUNDS, INK_MAX, INK_REFILL, MIN_SEG, MAX_SEG, READY_MS, LEDGE_END,
         REACH_FWD, REACH_BACK, SPEED_START, SPEED_STEP, SPEED_EVERY, SPEED_MAX,
         LEAP_EVERY, LEAP_V, JUMP_V, FLOAT_S, IDLE_MS, TOP_N, TOP_ROOM,
         SEND_BACK, SEND_FWD, START_X, DEATH_Y, RUNNER_R }
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
  const s = { msgs: [], closed: false,
              send(j){ s.msgs.push(JSON.parse(j)); },
              close(){ s.closed = true; },
              addEventListener(){} };
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

/* A stand in for the Durable Object platform: storage that remembers, and a
   namespace that hands every room the same leaderboard object, which is the
   whole point of the leaderboard. */
function fakeStorage(){
  const map = new Map();
  return { async get(k){ return map.get(k); }, async put(k, v){ map.set(k, v); } };
}
function fakePlatform(){
  const objects = new Map();
  const env = { BOARD: {
    idFromName: n => n,
    get(n){
      if (!objects.has(n)){
        const o = new Board({ storage: fakeStorage() }, env);
        /* a real stub takes a url and options, the class takes a Request */
        const raw = o.fetch.bind(o);
        o.fetch = (input, init) =>
          raw(input instanceof Request ? input : new Request(input, init));
        objects.set(n, o);
      }
      return objects.get(n);
    }
  } };
  return env;
}
function newBoard(env){
  const e = env || fakePlatform();
  return new Board({ storage: fakeStorage() }, e);
}

console.log('\nchalk runner\n');

/* ---------- geometry ------------------------------------------------------- */
{
  const a = segDistance(0, 1, -1, 0, 1, 0);
  check('distance to a line below is the height', Math.abs(a.d - 1) < 1e-9, a.d);
  const b = segDistance(5, 0, -1, 0, 1, 0);
  check('past the end it measures to the end', Math.abs(b.d - 4) < 1e-9, b.d);
  const c = segDistance(0, 0, 0, 0, 0, 0);
  check('a zero length line does not blow up', isFinite(c.d), c.d);

  const seen = new Set();
  for (let i = 0; i < 400; i++) seen.add(roomCode());
  check('room codes are four letters', [...seen].every(s => /^[A-Z]{4}$/.test(s)));
  check('and they are not all the same', seen.size > 300, seen.size);
  check('and none of them contain I or O', ![...seen].some(s => /[IO]/.test(s)));
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
  const segs = [floor(-2, 400, 1.2)];
  let lowest = 99;
  for (let i = 0; i < 600; i++){
    stepRunner(r, segs, 1/30);
    lowest = Math.min(lowest, r.y);
  }
  check('a long line holds the runner up', r.alive);
  check('and they rest on top of it, not inside it',
        Math.abs(r.y - (1.2 + RUNNER_R)) < 0.12, r.y.toFixed(3));
  check('they never sank through', lowest > 1.2, lowest.toFixed(3));
  check('twenty seconds carries them a hundred metres or so',
        r.dist > SPEED_START * 20 && r.dist < SPEED_MAX * 20, r.dist.toFixed(1));
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

/* ---------- getting harder by distance --------------------------------------
   This is the thing he asked for in so many words: slow at the start, and
   faster every fifty metres rather than every few seconds.
   -------------------------------------------------------------------------- */
{
  check('the first step is the slow one', speedAt(0) === SPEED_START);
  check('nothing changes before the first milestone',
        speedAt(SPEED_EVERY - 1) === SPEED_START, speedAt(SPEED_EVERY - 1));
  check('and it steps up exactly on it',
        Math.abs(speedAt(SPEED_EVERY) - (SPEED_START + SPEED_STEP)) < 1e-9,
        speedAt(SPEED_EVERY));
  check('two milestones is two steps',
        Math.abs(speedAt(SPEED_EVERY * 2) - (SPEED_START + 2 * SPEED_STEP)) < 1e-9);
  check('it never runs away with itself', speedAt(100000) === SPEED_MAX);
  check('and the ceiling really is reachable', SPEED_MAX > SPEED_START);

  check('the first stretch is level zero', levelAt(0) === 0 && levelAt(SPEED_EVERY - 1) === 0);
  check('the next is level one', levelAt(SPEED_EVERY) === 1);
  check('a runner who somehow went backwards is still level zero', levelAt(-40) === 0);

  check('the next milestone from nothing is the first one',
        nextMilestone(0) === SPEED_EVERY, nextMilestone(0));
  check('and it is always ahead of you, never behind',
        [0, 1, 49, 50, 51, 123, 999].every(d => nextMilestone(d) > d));
  check('and never more than one step away',
        [0, 1, 49, 50, 51, 123, 999].every(d => nextMilestone(d) - d <= SPEED_EVERY));

  /* the steps have to be small enough that none of them feels like a wall */
  const jumps = [];
  for (let i = 1; i <= 8; i++){
    jumps.push(speedAt(i * SPEED_EVERY) - speedAt(i * SPEED_EVERY - 1));
  }
  check('no single step more than doubles the pace',
        jumps.every(j => j < SPEED_START * 0.2), JSON.stringify(jumps.map(j => +j.toFixed(2))));

  /* and the runner really does move faster later on */
  function metresIn(seconds, startDist){
    const r = newRunner();
    r.dist = startDist;
    r.x = START_X + startDist;
    const segs = [floor(-2, 100000, 1.2)];
    const x0 = r.x;
    for (let i = 0; i < seconds * 30; i++) stepRunner(r, segs, 1/30);
    return r.x - x0;
  }
  check('three hundred metres in is genuinely faster than the start',
        metresIn(3, 300) > metresIn(3, 0) * 1.3,
        metresIn(3, 300).toFixed(1) + ' vs ' + metresIn(3, 0).toFixed(1));
}

/* ---------- a board, and a drawer who tries things -------------------------- */
{
  const b = newBoard();
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
  /* The bug this exists for: the ledge has to outlast the countdown plus a
     beat, or the drawer never gets a chance and every round dies the same. */
  const b = newBoard();
  const host = join(b, 'A'); join(b, 'B');
  b.onMessage(host, { t:'start' });
  const startX = b.runner.x;

  /* a second of ticks before the whistle should move nobody */
  for (let i = 0; i < 30; i++){ b.lastTick = Date.now() - 33; b.tick(); }
  check('the runner does not move during the countdown',
        Math.abs(b.runner.x - startX) < 0.01, b.runner.x);
  check('but the drawer can already work', b.phase === 'play');
  check('and the countdown is on the wire',
        b.sliceFor(b.players[0]).cd > 0, b.sliceFor(b.players[0]).cd);

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
  const secondsOnLedge = (LEDGE_END - startX) / SPEED_START;
  check('the opening ledge lasts about two seconds', secondsOnLedge > 1.7,
        secondsOnLedge.toFixed(2) + 's');
  check('so a person has the countdown plus that to draw in',
        READY_MS / 1000 + secondsOnLedge > 5,
        (READY_MS/1000 + secondsOnLedge).toFixed(1) + 's');
}

/* ---------- jumping ---------------------------------------------------------- */
{
  const b = newBoard();
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
  check('none earned before the first hundred', leapsEarned(LEAP_EVERY - 1) === 0);
  check('one at a hundred', leapsEarned(LEAP_EVERY) === 1);
  check('three at three hundred and a bit', leapsEarned(LEAP_EVERY * 3 + 42) === 3);

  const b = newBoard();
  const host = join(b, 'A'); join(b, 'B');
  b.onMessage(host, { t:'start' });
  const runner = b.players.find(p => p.role === 'runner');
  const drawer = b.players.find(p => p.role === 'drawer');

  b.onMessage(runner.ws, { t:'leap' });
  check('you cannot leap without having earned one', b.runner.vy === 0, b.runner.vy);

  /* walk the runner past a hundred metres */
  b.runner.dist = LEAP_EVERY * 2 + 5;
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

  const slice = b.sliceFor(runner);
  check('the leap count is sent', slice.r.lp === 1, slice.r.lp);
  check('the level is sent', slice.r.lv === levelAt(b.runner.dist) + 1, slice.r.lv);
  check('so is the next milestone', slice.r.ms === nextMilestone(b.runner.dist), slice.r.ms);
  check('and the milestone is still ahead of them', slice.r.ms > slice.r.d, slice.r.ms);
  check('the current speed is sent', Math.abs(slice.r.sp - speedAt(b.runner.dist)) < 0.02, slice.r.sp);
}

/* ---------- practising alone ---------------------------------------------------
   A judge who opens the link on their own should get a game, not a lobby that
   says "waiting for one more".
   ------------------------------------------------------------------------------ */
{
  const runner = newRunner();
  runner.x = 20;
  const s = botStroke(runner, LEDGE_END, INK_MAX);
  check('the bot draws something', !!s && s.pts.length >= 4);
  check('and it draws ahead of the runner', s.end > runner.x, s.end);
  check('but not miles ahead', s.end < runner.x + 20, s.end);
  check('every point it lays is within reach',
        (function(){
          for (let i = 0; i < s.pts.length; i += 2){
            if (!withinReach(runner.x, runner.y, s.pts[i], s.pts[i+1])) return false;
          }
          return true;
        })());
  check('with no chalk it draws nothing', botStroke(runner, LEDGE_END, 0.2) === null ||
        botStroke(runner, LEDGE_END, 0.2).pts.length < 4);
  check('and it does not redraw ground it already laid',
        botStroke(runner, runner.x + 40, INK_MAX) === null);

  const b = newBoard();
  const only = join(b, 'Solo');
  b.onMessage(only, { t:'start' });
  check('one player cannot start a two player match', b.phase === 'lobby', b.phase);
  b.onMessage(only, { t:'solo' });
  check('but they can practise', b.phase === 'play', b.phase);
  check('and they are the one running', b.players[0].role === 'runner');

  b.runAt = Date.now() - 1;
  for (let i = 0; i < 400 && b.phase === 'play'; i++){
    b.lastTick = Date.now() - 33; b.tick();
  }
  check('the bot keeps them alive for a while', b.runner.dist > 20, b.runner.dist.toFixed(1));
  check('the bot laid real ground', b.segs.length > 20, b.segs.length);
}

/* ---------- a whole match ------------------------------------------------------ */
{
  const b = newBoard();
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

/* ---------- the leaderboard that outlives the session -------------------------- */
{
  const env = fakePlatform();
  const top = env.BOARD.get(TOP_ROOM);

  await top.recordScore('Ann', 120, 'Bob');
  await top.recordScore('Cat', 300, 'Dan');
  await top.recordScore('Eve', 40, 'Fay');
  const rows = await top.loadTop();
  check('scores are kept', rows.length === 3, rows.length);
  check('and sorted, furthest first', rows[0].n === 'Cat' && rows[2].n === 'Eve',
        rows.map(r => r.n).join(','));
  check('the partner is remembered too', rows[0].w === 'Dan', rows[0].w);

  await top.recordScore('Nil', 0, 'x');
  check('a zero metre run is not worth recording', (await top.loadTop()).length === 3);

  for (let i = 0; i < TOP_N + 8; i++) await top.recordScore('P' + i, i + 1, '');
  const capped = await top.loadTop();
  check('the board is capped', capped.length === TOP_N, capped.length);
  check('and it kept the best ones, not the newest',
        capped[0].m >= capped[capped.length - 1].m, JSON.stringify(capped.map(r => r.m)));

  /* it survives the object being thrown away and rebuilt on the same storage */
  const kept = top.top;
  top.top = null;
  check('it is read back from storage, not from memory',
        JSON.stringify(await top.loadTop()) === JSON.stringify(kept));

  /* and a finished round actually reaches it */
  const env2 = fakePlatform();
  const b = new Board({ storage: fakeStorage() }, env2);
  const a = join(b, 'Runner'), c = join(b, 'Drawer');
  b.onMessage(a, { t:'start' });
  b.runner.dist = 77;
  b.runner.alive = false;
  b.lastTick = Date.now() - 33;
  b.tick();
  await new Promise(r => realTimeout(r, 30));
  const board2 = await env2.BOARD.get(TOP_ROOM).loadTop();
  check('a real round lands on the shared board', board2.length === 1, JSON.stringify(board2));
  check('with the distance that was run', board2.length && board2[0].m === 77, board2[0] && board2[0].m);
  check('and both names on it',
        board2.length && board2[0].n === 'Runner' && board2[0].w === 'Drawer',
        JSON.stringify(board2[0]));
  void c;

  /* practice is practice */
  const env3 = fakePlatform();
  const b3 = new Board({ storage: fakeStorage() }, env3);
  const s3 = join(b3, 'Alone');
  b3.onMessage(s3, { t:'solo' });
  b3.runner.dist = 500;
  b3.runner.alive = false;
  b3.lastTick = Date.now() - 33;
  b3.tick();
  await new Promise(r => realTimeout(r, 30));
  check('a solo run does not go on the board',
        (await env3.BOARD.get(TOP_ROOM).loadTop()).length === 0);
}

/* ---------- people leaving ------------------------------------------------------ */
{
  const b = newBoard();
  const a = join(b, 'A'), c = join(b, 'B');
  b.onMessage(a, { t:'start' });
  const runner = b.players.find(p => p.role === 'runner');
  b.onClose(runner.ws);
  check('the round ends if the runner walks out', b.phase === 'result', b.phase);
  check('and it says so', /left/.test(b.result), b.result);
  void c;

  const b2 = newBoard();
  const x = join(b2, 'X'), y = join(b2, 'Y');
  b2.onClose(x); b2.onClose(y);
  check('an empty board resets', b2.players.length === 0 && b2.phase === 'lobby');
}

/* ---------- a board nobody is playing ------------------------------------------- */
{
  const b = newBoard();
  const a = join(b, 'A'), c = join(b, 'B');
  b.onMessage(a, { t:'start' });
  b.lastActive = Date.now() - (IDLE_MS + 1000);
  b.lastTick = Date.now() - 33;
  b.tick();
  check('an abandoned board shuts itself down', b.players.length === 0 && b.phase === 'lobby',
        b.phase + '/' + b.players.length);
  check('and it hangs up on the sockets', a.closed && c.closed);

  /* but a board somebody is touching is left alone */
  const b2 = newBoard();
  const x = join(b2, 'X'); join(b2, 'Y');
  b2.onMessage(x, { t:'start' });
  b2.lastTick = Date.now() - 33;
  b2.tick();
  check('a board in use is not shut down', b2.players.length === 2 && b2.phase === 'play');
}

/* ---------- the door ------------------------------------------------------------ */
{
  const b = newBoard();
  const a = join(b, 'A'); join(b, 'B');
  b.onMessage(a, { t:'start' });
  const late = sock();
  b.onMessage(late, { t:'join', name:'Late' });
  check('a late joiner is turned away', !!last(late, 'closed'));

  const b2 = newBoard();
  join(b2, 'Occupant');
  const would = sock();
  b2.onMessage(would, { t:'join', name:'Host2', create:true });
  check('creating on a taken code is refused', !!last(would, 'taken'));

  const b3 = newBoard();
  const blank = join(b3, '   ');
  check('a blank name still gets a name', last(blank, 'you').name === 'Player',
        last(blank, 'you').name);
  const longish = join(b3, 'Bartholomew the Third');
  check('a very long name is cut down', last(longish, 'you').name.length <= 12,
        last(longish, 'you').name);
}

/* ---------- what travels -------------------------------------------------------- */
{
  const b = newBoard();
  const a = join(b, 'A'); join(b, 'B');
  b.onMessage(a, { t:'start' });
  const p = b.players[0];
  /* a lot of chalk, most of it far behind */
  for (let i = 0; i < 300; i++) b.segs.push({ x1:i*0.2 - 60, y1:1, x2:i*0.2 - 59.8, y2:1 });
  const slice = b.sliceFor(p);
  const wire = JSON.stringify(slice);
  check('only nearby chalk is sent', wire.length < 12000, wire.length + ' bytes');
  check('your own chalk level is sent', typeof slice.ink === 'number');
  check('the runner position is sent', typeof slice.r.x === 'number');

  /* The vanishing lines bug. The window has to be wider than a wide screen at
     the zoom the browser uses, or chalk disappears while you are looking at it. */
  check('the window sent is wider than any screen shows',
        SEND_BACK + SEND_FWD > 80, SEND_BACK + SEND_FWD);
  check('and it reaches further behind than a camera ever trails',
        SEND_BACK > 20, SEND_BACK);
  check('nothing outside the window is sent',
        slice.s.every(s => s[2] > b.runner.x - SEND_BACK - 0.01 &&
                           s[0] < b.runner.x + SEND_FWD + 0.01));
  check('and everything inside it is',
        b.segs.filter(s => s.x2 > b.runner.x - SEND_BACK && s.x1 < b.runner.x + SEND_FWD).length
        === slice.s.length);
}

globalThis.setTimeout = realTimeout;
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
