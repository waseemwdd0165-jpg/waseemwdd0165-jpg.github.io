/* ==========================================================================
   Does the server actually withhold what it says it withholds?

   This is the test the whole rewrite exists for. The old peer-to-peer build
   sent every position to every client and let the renderer decide what to
   draw, which meant the console showed you the entire map. The claim now is
   that a player is never sent a position their own torch cannot reach.

   A claim like that is worth nothing untested, so this walks a runner along
   every open cell of the map and checks the two things that could go wrong:
   the server must never leak a position the player cannot see, and it must
   never withhold one they can.
   ========================================================================== */

import { Arena } from '../src/index.js';
import { MAP, MW, MH, solid, canSee, rangeOf, fovOf, AMBIENT } from '../public/game.js';

let pass = 0, fail = 0;
const check = (name, ok, extra) => {
  if (ok){ pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? '   >> ' + extra : '')); }
};

/* a socket that just records what the server said to it */
function sock(){
  const s = { msgs: [], send(j){ s.msgs.push(JSON.parse(j)); }, addEventListener(){} };
  return s;
}

function arenaWith(names){
  const a = new Arena({}, {});
  const socks = names.map(n => {
    const w = sock();
    a.onMessage(w, { t: 'join', name: n });
    return w;
  });
  return { a, socks };
}

console.log('\npitch black - culling\n');

/* ---------- 1. the lobby gives away nothing ------------------------------- */
{
  const { a, socks } = arenaWith(['Waseem', 'Asha', 'Rahul']);
  const slice = a.sliceFor(a.players[1]);
  check('lobby slice carries no positions', slice.see === undefined && slice.me === undefined,
        JSON.stringify(Object.keys(slice)));
  check('lobby slice still names everyone', slice.roster.length === 3);
  check('roster rows carry no coordinates',
        slice.roster.every(r => r.x === undefined && r.y === undefined),
        JSON.stringify(slice.roster[0]));
  void socks;
}

/* ---------- 2. in play, only what the torch reaches ----------------------- */
{
  const { a } = arenaWith(['Waseem', 'Asha']);
  a.startMatch();
  a.stopLoop();

  const me = a.players[0], other = a.players[1];

  /* put them nose to nose, facing each other */
  me.x = 11.5; me.y = 11.5; me.dir = 0;
  other.x = 13.5; other.y = 11.5;
  let s = a.sliceFor(me);
  check('a player in front is sent', s.see.length === 1 && s.see[0].n === 'Asha',
        JSON.stringify(s.see));

  /* same spot, but looking the other way */
  me.dir = Math.PI;
  s = a.sliceFor(me);
  check('a player behind is not sent', s.see.length === 0, JSON.stringify(s.see));

  /* in front, but far beyond the torch */
  me.dir = 0;
  other.x = 34.5; other.y = 11.5;
  s = a.sliceFor(me);
  check('a player past the torch range is not sent', s.see.length === 0, JSON.stringify(s.see));

  /* close behind counts, because you always see a pace or two around you */
  other.x = 11.5 - (AMBIENT * 0.5); other.y = 11.5;
  s = a.sliceFor(me);
  check('somebody right at your shoulder is sent', s.see.length === 1, JSON.stringify(s.see));

  /* your own state always comes through */
  check('you are always told where you are', s.me && typeof s.me.x === 'number');
  check('your own score comes with it', s.me.s === 0);
}

/* ---------- 3. walls really block ----------------------------------------- */
/* Written independently of the game's own raycast on purpose. If I checked
   the server with the same function the server uses, a bug in that function
   would agree with itself and the test would pass regardless. This samples
   the straight line between two points and asks whether it crosses brick. */
/* Three answers, not two. A sight line that grazes exactly along the edge of
   a wall is genuinely ambiguous, and a test that demands a particular answer
   for those is testing my opinion rather than the code. So this reports
   'blocked' only when the line passes well inside brick, 'clear' only when it
   stays well away from any, and 'grazing' otherwise, which the sweep skips. */
const M = 0.14;   /* how far inside or outside counts as definite */
function sightline(ax, ay, bx, by){
  const steps = Math.ceil(Math.hypot(bx - ax, by - ay) * 60);
  let deep = false, near = false;
  for (let i = 1; i < steps; i++){
    const t = i / steps;
    const x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
    if (solid(Math.floor(x), Math.floor(y))){
      const fx = x - Math.floor(x), fy = y - Math.floor(y);
      if (fx > M && fx < 1 - M && fy > M && fy < 1 - M) deep = true;
      near = true;
    } else if (solid(Math.floor(x + M), Math.floor(y)) || solid(Math.floor(x - M), Math.floor(y)) ||
               solid(Math.floor(x), Math.floor(y + M)) || solid(Math.floor(x), Math.floor(y - M))){
      near = true;
    }
  }
  if (deep) return 'blocked';
  if (!near) return 'clear';
  return 'grazing';
}

{
  const { a } = arenaWith(['Waseem', 'Asha']);
  a.startMatch();
  a.stopLoop();
  const me = a.players[0], other = a.players[1];
  me.role = 'runner'; other.role = 'runner';

  const open = [];
  for (let y = 0; y < MH; y++){
    for (let x = 0; x < MW; x++){
      if (!solid(x, y)) open.push([x + 0.5, y + 0.5]);
    }
  }

  /* hunt for real pairs: close enough and dead ahead, but brick between */
  let blockedPairs = 0, blockedLeaked = 0;
  let clearPairs = 0, clearHidden = 0, grazing = 0;
  for (let i = 0; i < open.length; i++){
    for (let j = 0; j < open.length; j += 7){
      const [ax, ay] = open[i], [bx, by] = open[j];
      const d = Math.hypot(bx - ax, by - ay);
      if (d < 2 || d > 7) continue;             /* well inside torch range */
      me.x = ax; me.y = ay;
      me.dir = Math.atan2(by - ay, bx - ax);    /* looking straight at them */
      other.x = bx; other.y = by;
      const sent = a.sliceFor(me).see.length === 1;
      const verdict = sightline(ax, ay, bx, by);
      if (verdict === 'blocked'){ blockedPairs++; if (sent) blockedLeaked++; }
      else if (verdict === 'clear'){ clearPairs++; if (!sent) clearHidden++; }
      else grazing++;
    }
  }

  console.log('       (' + blockedPairs + ' blocked, ' + clearPairs + ' clear, ' +
              grazing + ' grazing and skipped)');
  check('found plenty of wall-separated pairs to test', blockedPairs > 400,
        'pairs=' + blockedPairs);
  check('a wall between you always hides them', blockedLeaked === 0,
        blockedLeaked + ' leaked through walls of ' + blockedPairs);
  check('found plenty of clear pairs too', clearPairs > 400, 'pairs=' + clearPairs);
  check('a clear line dead ahead is never hidden', clearHidden === 0,
        clearHidden + ' wrongly hidden of ' + clearPairs);
}

/* ---------- 4. sweep the whole map ---------------------------------------- */
/* The three cases above are the ones I thought of. This one does not care
   what I thought of: it walks a runner across every open cell, puts a second
   player at a spread of angles and distances around them, and compares what
   the server sent against what the visibility test says should be visible.
   Any disagreement is either a leak or a player wrongly hidden. */
{
  const { a } = arenaWith(['Watcher', 'Target']);
  a.startMatch();
  a.stopLoop();
  const me = a.players[0], other = a.players[1];
  me.role = 'runner'; other.role = 'runner';

  const open = [];
  for (let y = 0; y < MH; y++){
    for (let x = 0; x < MW; x++){
      if (!solid(x, y)) open.push([x + 0.5, y + 0.5]);
    }
  }

  let leaks = 0, hidden = 0, checked = 0, seenAtLeastOnce = 0;
  const range = rangeOf('runner'), fov = fovOf('runner');

  for (const [ox, oy] of open){
    me.x = ox; me.y = oy;
    for (let k = 0; k < 8; k++){
      me.dir = (k / 8) * Math.PI * 2;
      for (let j = 0; j < 12; j++){
        const idx = (j * 37 + k * 11) % open.length;
        other.x = open[idx][0]; other.y = open[idx][1];
        if (other.x === me.x && other.y === me.y) continue;

        const expected = canSee(me, me.dir, range, fov, other.x, other.y);
        const got = a.sliceFor(me).see.length === 1;
        checked++;
        if (got && !expected) leaks++;
        if (!got && expected) hidden++;
        if (got) seenAtLeastOnce++;
      }
    }
  }

  check('swept a real number of cases', checked > 20000, 'checked=' + checked);
  check('the sweep actually saw somebody sometimes', seenAtLeastOnce > 100,
        'visible in ' + seenAtLeastOnce + ' of ' + checked);
  check('no position was ever leaked', leaks === 0, leaks + ' leaks in ' + checked);
  check('no visible player was ever withheld', hidden === 0, hidden + ' wrongly hidden');
}

/* ---------- 5. nothing else on the wire carries a position ---------------- */
/* A leak does not have to be in `see`. This walks the whole serialised
   message looking for anything that smells like a coordinate belonging to
   somebody the player cannot see. */
{
  const { a } = arenaWith(['Watcher', 'Hider', 'Third']);
  a.startMatch();
  a.stopLoop();
  const me = a.players[0];
  me.x = 2.5; me.y = 11.5; me.dir = Math.PI;      /* facing away from both */
  a.players[1].x = 30.5; a.players[1].y = 11.5;
  a.players[2].x = 20.5; a.players[2].y = 17.5;

  const wire = JSON.stringify(a.sliceFor(me));
  const slice = JSON.parse(wire);
  check('nobody is in see', slice.see.length === 0, wire);
  check('the far player coordinates appear nowhere in the message',
        !wire.includes('30.5') && !wire.includes('17.5'), wire);
  check('the roster is still complete so the scoreboard works',
        slice.roster.length === 3);
}

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
