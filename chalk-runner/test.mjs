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
         speedAt, levelAt, nextMilestone, botStroke, botTargetY, leapsEarned, roomCode, pullBrake,
         rng, makeLevel, hardSegs, inPit, daySeed, dayStamp, WALL_W, ROOF_W, OBS_FROM, STUCK_S,
         thin, PATH_SEND, PATH_EVERY,
         ROUNDS, INK_MAX, INK_REFILL, MIN_SEG, MAX_SEG, READY_MS, LEDGE_END,
         REACH_FWD, REACH_BACK, SPEED_START, SPEED_STEP, SPEED_EVERY, SPEED_MAX,
         LEAP_EVERY, LEAP_V, JUMP_V, FLOAT_S, IDLE_MS, TOP_N, TOP_ROOM,
         BRAKE_S, BRAKE_MUL, BRAKE_CD, HOLD_MS,
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

  /* today's list keeps the same rows, separately, and empties itself tomorrow */
  const today = await top.loadDay();
  check('today has the same runs', today.length === (await top.loadTop()).length,
        today.length);
  await top.state.storage.put('day', { on:'2020-01-01', rows:[{ n:'Old', m:9, w:'' }] });
  top.day = null; top.dayOf = '';
  const tomorrow = await top.loadDay();
  check('and tomorrow it starts again', tomorrow.length === 0, tomorrow.length);
  check('but all time is untouched', (await top.loadTop()).length === TOP_N);

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



/* ---------- the level ----------------------------------------------------------
   Everything in the way comes out of one number, so the same seed has to give
   the same board to both people, and a different seed a different one.
   ---------------------------------------------------------------------------- */
{
  const a = makeLevel(12345), b = makeLevel(12345), c = makeLevel(999);
  check('a seed gives the same level twice', JSON.stringify(a) === JSON.stringify(b));
  check('and a different seed a different one', JSON.stringify(a) !== JSON.stringify(c));
  check('there is something to run into', a.length > 40, a.length);
  check('the start is left clear', a.every(o => o.x >= OBS_FROM), a[0].x);
  check('they are in order', a.every((o, i) => i === 0 || o.x > a[i-1].x));
  check('and never on top of each other',
        a.every((o, i) => i === 0 || o.x - a[i-1].x > 12),
        Math.min(...a.slice(1).map((o, i) => o.x - a[i].x)).toFixed(1));
  check('all three kinds turn up',
        [0,1,2].every(k => a.some(o => o.k === k)),
        JSON.stringify([0,1,2].map(k => a.filter(o => o.k === k).length)));

  const walls = a.filter(o => o.k === 0);
  check('a wall is low enough to ramp over', walls.every(o => o.h < 3.2),
        Math.max(...walls.map(o => o.h)));
  const roofs = a.filter(o => o.k === 1);
  check('a hanging block leaves room to run under', roofs.every(o => o.y > 2.6),
        Math.min(...roofs.map(o => o.y)));

  /* A pit has to be jumpable at the speed you will be doing when you meet it,
     or it is not an obstacle, it is a wall with extra steps. */
  const air = 2 * JUMP_V / 26;
  const pits = a.filter(o => o.k === 2);
  check('every pit can be cleared by a plain jump at that point',
        pits.every(o => o.w + 0.8 < speedAt(o.x) * air),
        JSON.stringify(pits.slice(0, 3).map(o =>
          o.w.toFixed(1) + '/' + (speedAt(o.x) * air).toFixed(1))));

  /* they get closer together */
  const early = a.filter(o => o.x < 300), late = a.filter(o => o.x > 1500 && o.x < 1800);
  const spread = list => (list[list.length-1].x - list[0].x) / (list.length - 1);
  check('and they crowd in as it goes on', spread(late) < spread(early),
        spread(early).toFixed(1) + ' then ' + spread(late).toFixed(1));

  check('the generator is a real generator, not a constant',
        (function(){ const f = rng(7); const v = [f(), f(), f()];
          return new Set(v).size === 3 && v.every(x => x >= 0 && x < 1); })());
  check('and the same seed replays', (function(){
    const p = rng(7), q = rng(7); return p() === q() && p() === q(); })());
}

/* ---------- walls and roofs are real ------------------------------------------- */
{
  const wall = [{ k:0, x:20, h:2.0 }];
  const hard = hardSegs(wall);
  check('a wall becomes segments', hard.length === 3, hard.length);

  const r = newRunner();
  const ground = [floor(-2, 400, 1.2)];
  for (let i = 0; i < 900 && r.alive; i++) stepRunner(r, ground, 1/30, undefined, hard);
  check('a wall stops the runner', !r.alive);
  check('and it stops them at the wall', r.x > 18 && r.x < 21.5, r.x.toFixed(2));
  check('it was being blocked, not a fall', r.y > 0, r.y.toFixed(2));

  /* a ramp over it works */
  const r2 = newRunner();
  const ramped = [floor(-2, 15, 1.2), { x1:15, y1:1.2, x2:19.6, y2:2.5 },
                  floor(19.6, 400, 2.5)];
  for (let i = 0; i < 900 && r2.alive; i++) stepRunner(r2, ramped, 1/30, undefined, hard);
  check('a ramp gets them over it', r2.alive && r2.x > 40, r2.x.toFixed(1));

  /* and a road that is too high meets the hanging block */
  const roof = hardSegs([{ k:1, x:30, y:3.2 }]);
  const high = [floor(-2, 400, 3.0)];
  const r3 = newRunner();
  r3.y = 4;
  for (let i = 0; i < 900 && r3.alive; i++) stepRunner(r3, high, 1/30, undefined, roof);
  check('a road built too high runs into the hanging block', !r3.alive, r3.x.toFixed(1));

  const low = [floor(-2, 400, 1.2)];
  const r4 = newRunner();
  for (let i = 0; i < 900 && r4.alive; i++) stepRunner(r4, low, 1/30, undefined, roof);
  check('a low road goes under it', r4.alive && r4.x > 60, r4.x.toFixed(1));

  check('nothing gets stuck on an empty board',
        (function(){ const q = newRunner();
          for (let i = 0; i < 20; i++) stepRunner(q, [floor(-2,400,1.2)], 1/30);
          return q.stuck === 0; })());
  check('and a third of a second of nothing is a crash', STUCK_S < 0.5, STUCK_S);
}

/* ---------- chalk does not stick in a pit -------------------------------------- */
{
  const obs = [{ k:2, x:20, w:4 }];
  check('inside a pit is inside', inPit(obs, 22));
  check('the near edge is out', !inPit(obs, 19.9));
  check('the far edge is out', !inPit(obs, 24.1));
  check('a wall is not a pit', !inPit([{ k:0, x:20, h:2 }], 20.4));

  const b = newBoard();
  const host = join(b, 'A'); join(b, 'B');
  b.onMessage(host, { t:'start' });
  const drawer = b.players.find(p => p.role === 'drawer');
  b.obs = [{ k:2, x:6, w:4 }];
  const n = b.segs.length;
  b.onMessage(drawer.ws, { t:'draw', pts: [6.5,1.2, 7,1.2, 7.5,1.2] });
  check('a stroke inside a pit is refused', b.segs.length === n, b.segs.length);
  b.onMessage(drawer.ws, { t:'draw', pts: [12,1.2, 12.5,1.2, 13,1.2] });
  check('but just past it is fine', b.segs.length > n);

  /* the bot knows about all of it too */
  const runner = newRunner(); runner.x = 20;
  check('the bot leaves a pit alone', botTargetY([{ k:2, x:22, w:4 }], 23) === null);
  check('the bot ramps up to a wall',
        botTargetY([{ k:0, x:26, h:2 }], 24) > 1.2, botTargetY([{ k:0, x:26, h:2 }], 24));
  check('and clears the top of it',
        botTargetY([{ k:0, x:26, h:2 }], 26.4) > 2, botTargetY([{ k:0, x:26, h:2 }], 26.4));
  check('the bot ducks under a hanging block',
        botTargetY([{ k:1, x:22, y:3.2 }], 23) < 2.2, botTargetY([{ k:1, x:22, y:3.2 }], 23));
}


/* ---------- the replay ---------------------------------------------------------
   A number at the end of a round says nothing about the run, so the path is
   kept and sent back. It has to be short enough to send and long enough to
   look like the run.
   ---------------------------------------------------------------------------- */
{
  const long = [];
  for (let i = 0; i < 900; i++) long.push([i, Math.sin(i / 20)]);
  const cut = thin(long, 180);
  check('a long path is thinned to fit', cut.length === 180, cut.length);
  check('it still starts where the run started', cut[0][0] === long[0][0]);
  check('and ends where it ended', cut[cut.length-1][0] === long[long.length-1][0]);
  check('and keeps its order', cut.every((p, i) => i === 0 || p[0] > cut[i-1][0]));
  check('a short path is left alone', thin(long.slice(0, 10), 180).length === 10);
  check('a path of one point does not blow up', thin([[1,1]], 180).length === 1);

  const b = newBoard();
  const host = join(b, 'Ann'); join(b, 'Bob');
  b.onMessage(host, { t:'start' });
  b.runAt = Date.now() - 1;
  for (let i = 0; i < 60; i++){ b.lastTick = Date.now() - 33; b.tick(); }
  check('the path is being kept', b.path.length > 10, b.path.length);
  check('but not every single tick', b.path.length < 60, b.path.length);

  b.runner.alive = false;
  b.lastTick = Date.now() - 33; b.tick();
  check('the round is over', b.phase === 'result');
  const slice = b.sliceFor(b.players[0]);
  check('the run comes down with it', Array.isArray(slice.rp) && slice.rp.length > 5, slice.rp && slice.rp.length);
  check('and it is small enough to send', JSON.stringify(slice.rp).length < 4000,
        JSON.stringify(slice.rp).length + ' bytes');
  check('with what was in the way', Array.isArray(slice.ro));
  check('and whose run it was', slice.rn === 'Ann', slice.rn);
  check('nothing of the sort while a round is running',
        (function(){
          const c = newBoard(); const h = join(c, 'X'); join(c, 'Y');
          c.onMessage(h, { t:'start' });
          return c.sliceFor(c.players[0]).rp === undefined;
        })());
}

/* ---------- the board of the day ------------------------------------------------ */
{
  const monday = Date.UTC(2026, 8, 28, 3, 0, 0);
  const alsoMonday = Date.UTC(2026, 8, 28, 22, 40, 0);
  const tuesday = Date.UTC(2026, 8, 29, 3, 0, 0);
  check('the seed is the same all day', daySeed(monday) === daySeed(alsoMonday));
  check('and different tomorrow', daySeed(monday) !== daySeed(tuesday));
  check('the stamp reads as a date', dayStamp(monday) === '2026-09-28', dayStamp(monday));
  check('the same level comes back from it',
        JSON.stringify(makeLevel(daySeed(monday))) ===
        JSON.stringify(makeLevel(daySeed(alsoMonday))));
}

/* ---------- both people see the same level -------------------------------------- */
{
  const b = newBoard();
  const host = join(b, 'A'); const guest = join(b, 'B');
  b.onMessage(host, { t:'start' });
  check('a round has a level', b.obs.length > 0, b.obs.length);
  const s1 = b.sliceFor(b.players[0]), s2 = b.sliceFor(b.players[1]);
  check('and the two players are sent the same obstacles',
        JSON.stringify(s1.o) === JSON.stringify(s2.o));
  check('only the ones nearby are sent', s1.o.length < b.obs.length, s1.o.length);
  void guest;

  const first = JSON.stringify(b.obs);
  b.runner.dist = 5; b.runner.alive = false;
  b.lastTick = Date.now() - 33; b.tick();
  flush();
  check('the next round is a different level', JSON.stringify(b.obs) !== first);
}

/* ---------- the brake ---------------------------------------------------------
   The runner's only say in the pace, so it has to actually slow them and it
   has to run out.
   ------------------------------------------------------------------------- */
{
  const r = newRunner();
  check('a fresh runner can brake', pullBrake(r) === true);
  check('and it is on', r.brake === BRAKE_S, r.brake);
  check('but not twice in a row', pullBrake(r) === false);

  const floor2 = [floor(-2, 100000, 1.2)];
  function ran(braking){
    const q = newRunner();
    for (let i = 0; i < 40; i++) stepRunner(q, floor2, 1/30);   /* settle onto the line */
    if (braking) pullBrake(q);
    const x0 = q.x;
    for (let i = 0; i < 15; i++) stepRunner(q, floor2, 1/30);   /* half a second */
    return q.x - x0;
  }
  const slow = ran(true), full = ran(false);
  check('braking really is slower', slow < full * 0.7, slow.toFixed(2) + ' vs ' + full.toFixed(2));
  check('and it is about the fraction it claims',
        Math.abs(slow / full - BRAKE_MUL) < 0.06, (slow / full).toFixed(3));

  /* it wears off, and then you have to wait */
  /* on solid ground, or the runner dies and the timers stop with them */
  const q = newRunner();
  pullBrake(q);
  for (let i = 0; i < Math.ceil(BRAKE_S * 30) + 2; i++) stepRunner(q, floor2, 1/30);
  check('the brake wears off', q.brake === 0, q.brake);
  check('but the cooldown is still running', q.cd > 0, q.cd.toFixed(2));
  check('so you cannot brake again yet', pullBrake(q) === false);
  for (let i = 0; i < Math.ceil(BRAKE_CD * 30) + 2; i++) stepRunner(q, floor2, 1/30);
  check('once it clears you can brake again', pullBrake(q) === true);

  check('a dead runner cannot brake',
        (function(){ const d = newRunner(); d.alive = false; return pullBrake(d) === false; })());

  const b = newBoard();
  const host = join(b, 'A'); join(b, 'B');
  b.onMessage(host, { t:'start' });
  const runner = b.players.find(p => p.role === 'runner');
  const drawer = b.players.find(p => p.role === 'drawer');
  b.onMessage(drawer.ws, { t:'brake' });
  check('the drawer cannot brake', b.runner.brake === 0, b.runner.brake);
  b.onMessage(runner.ws, { t:'brake' });
  check('the runner can', b.runner.brake > 0, b.runner.brake);
  const slice = b.sliceFor(runner);
  check('the brake is on the wire', slice.r.bk === 1, slice.r.bk);
  check('and so is the cooldown', slice.r.bc > 0, slice.r.bc);
}

/* ---------- somebody's wifi ---------------------------------------------------
   Losing a round to a train tunnel is the worst way to lose one.
   ------------------------------------------------------------------------- */
{
  const b = newBoard();
  const aSock = join(b, 'Ann'), bSock = join(b, 'Bob');
  const key = last(aSock, 'you').key;
  check('a seat comes with a key', typeof key === 'string' && key.length > 12, key);
  check('and the two keys are different', key !== last(bSock, 'you').key);

  b.onMessage(aSock, { t:'start' });
  b.runAt = Date.now() - 1;
  for (let i = 0; i < 20; i++){ b.lastTick = Date.now() - 33; b.tick(); }
  const ranTo = b.runner.x;
  check('the runner is moving', ranTo > START_X, ranTo.toFixed(2));

  /* Ann goes into a tunnel */
  b.onClose(aSock);
  check('the seat is kept, not emptied', b.players.length === 2, b.players.length);
  check('and the board knows who it is waiting for',
        b.waitingFor() && b.waitingFor().name === 'Ann');

  for (let i = 0; i < 30; i++){ b.lastTick = Date.now() - 33; b.tick(); }
  check('everything holds still while it waits',
        Math.abs(b.runner.x - ranTo) < 0.001, b.runner.x);
  check('the other player is told', last(bSock, 'state').held === 'Ann');
  check('and told how long', last(bSock, 'state').hold > 0, last(bSock, 'state').hold);
  check('the roster marks them away',
        last(bSock, 'state').roster.find(o => o.n === 'Ann').off === 1);

  /* Ann comes back on a new socket with the same key */
  const again = sock();
  b.onMessage(again, { t:'join', name:'Ann', key });
  check('the key gets her seat back', !!last(again, 'you') && last(again, 'you').back === true);
  check('with the same player id', last(again, 'you').id === 'p1', last(again, 'you').id);
  check('nobody was added', b.players.length === 2, b.players.length);
  check('and the wait is over', !b.waitingFor());

  b.lastTick = Date.now() - 33; b.tick();
  check('the round carries on', b.runner.x > ranTo, b.runner.x.toFixed(2));

  /* a key nobody holds is just a stranger at a closed door */
  const stranger = sock();
  b.onMessage(stranger, { t:'join', name:'Nope', key:'not-a-real-key' });
  check('a made up key does not open a seat', !!last(stranger, 'closed'));
  check('and it did not add anyone', b.players.length === 2);
}

/* the wait does run out */
{
  const b = newBoard();
  const aSock = join(b, 'Ann'), bSock = join(b, 'Bob');
  b.onMessage(aSock, { t:'start' });          /* Ann runs */
  b.runAt = Date.now() - 1;
  b.lastTick = Date.now() - 33; b.tick();

  b.onClose(aSock);
  b.players.find(p => p.name === 'Ann').gone = Date.now() - (HOLD_MS + 500);
  b.lastTick = Date.now() - 33; b.tick();
  check('after the wait they are dropped', b.players.length === 1, b.players.length);
  check('and the round ends because the runner is gone', b.phase === 'result', b.phase);
  check('with a reason', /left/.test(b.result), b.result);
  void bSock;

  /* the drawer leaving is survivable */
  const b2 = newBoard();
  const x = join(b2, 'X'), y = join(b2, 'Y');
  b2.onMessage(x, { t:'start' });
  b2.runAt = Date.now() - 1;
  const drawer = b2.players.find(p => p.role === 'drawer');
  b2.onClose(drawer.ws);
  drawer.gone = Date.now() - (HOLD_MS + 500);
  b2.lastTick = Date.now() - 33; b2.tick();
  check('a drawer who never comes back is dropped', b2.players.length === 1);
  check('but the round is still going', b2.phase === 'play', b2.phase);
  void y;

  /* in the lobby there is nothing to hold */
  const b3 = newBoard();
  const l1 = join(b3, 'L1'); join(b3, 'L2');
  b3.onClose(l1);
  check('leaving the lobby just leaves', b3.players.length === 1, b3.players.length);
}

/* ---------- people leaving ------------------------------------------------------ */
{
  /* Walking out now looks exactly like a tunnel, because from here it does.
     The round only ends once the wait is over. */
  const b = newBoard();
  const a = join(b, 'A'), c = join(b, 'B');
  b.onMessage(a, { t:'start' });
  const runner = b.players.find(p => p.role === 'runner');
  b.onClose(runner.ws);
  check('the round does not end the moment the runner drops', b.phase === 'play', b.phase);
  runner.gone = Date.now() - (HOLD_MS + 500);
  b.lastTick = Date.now() - 33; b.tick();
  check('but it ends once the wait is up', b.phase === 'result', b.phase);
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
