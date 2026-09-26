/* ==========================================================================
   Sunday Park - server checks

   Runs the Durable Object in plain Node with fake sockets and a fake clock.
   The things worth checking are the ones a player would actually hit: can
   you walk into a tree, can a ride strand you inside a wall or under the
   ground, does the park survive nonsense input and people leaving.
   ========================================================================== */

import { Park, MAP, MW, MH, RIDES, SPAWN, solid, blocked,
         seatPose, rideAngles, nearestSeat, rideSeconds, randomOpenTile }
  from './worker-single.js';

const pending = [];
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};

let pass = 0, fail = 0;
const check = (name, ok, extra) => {
  if (ok){ pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? '   >> ' + extra : '')); }
};
function sock(){
  const s = { msgs: [], send(j){ s.msgs.push(JSON.parse(j)); }, addEventListener(){} };
  return s;
}
const last = (w, t) => [...w.msgs].reverse().find(m => m.t === t);

console.log('\nsunday park\n');

/* ---------- the map itself ------------------------------------------------ */
{
  check('map is a clean rectangle',
        MAP.every(r => r.length === MW) && MAP.length === MH, MW + 'x' + MH);
  check('the park is walled all the way round',
        MAP[0].split('').every(c => c === 'f') &&
        MAP.every(r => r[0] === 'f' && r[MW-1] === 'f'));
  check('there is a gate to walk in through',
        MAP[MH-1].indexOf('.') > 0, MAP[MH-1].slice(26, 34));
  check('the spawn point is not inside anything',
        !solid(Math.floor(SPAWN.x), Math.floor(SPAWN.z)));

  /* every ride has a boarding tile you can stand on */
  for (const key of Object.keys(RIDES)){
    let found = null;
    for (let y = 0; y < MH; y++){
      const x = MAP[y].indexOf(key);
      if (x >= 0) found = [x, y];
    }
    check('ride ' + key + ' has a boarding tile', !!found, String(found));
    if (found) check('  and it is standable', !solid(found[0], found[1]));
  }
}

/* ---------- walking out of the park --------------------------------------- */
{
  const park = new Park({}, {});
  const w = sock();
  park.onMessage(w, { t: 'join', name: 'Walker' });
  const p = park.players[0];
  check('joining puts you in the park', park.players.length === 1);
  check('you are told who you are', !!last(w, 'you').id);

  let stuck = 0;
  for (let i = 0; i < 900; i++){
    const a = (i * 0.37) % (Math.PI * 2);
    park.onMessage(w, { t: 'in', ax: Math.cos(a), az: Math.sin(a) });
    park.lastTick = Date.now() - 66;
    park.tick();
    if (solid(Math.floor(p.x), Math.floor(p.z))) stuck++;
    if (p.ride) p.ride = null;          /* ignore rides for this one */
  }
  check('900 ticks of walking and never inside a tree or wall', stuck === 0, stuck);
  check('still inside the fence',
        p.x > 0 && p.z > 0 && p.x < MW && p.z < MH, p.x.toFixed(1) + ',' + p.z.toFixed(1));
}

/* ---------- rides ---------------------------------------------------------- */
{
  /* Sweep a whole turn of each ride, every seat, and see where riders go. */
  const heights = [];
  for (let i = 0; i <= 60; i++){
    const rot = (i/60) * Math.PI * 2;
    for (let s = 0; s < RIDES.F.seats; s++) heights.push(seatPose('F', s, rot).h);
  }
  check('the big wheel lifts you well off the ground',
        Math.max(...heights) > 10, Math.max(...heights).toFixed(1));
  check('and brings you back down low',
        Math.min(...heights) < 1.5, Math.min(...heights).toFixed(1));
  check('nothing on the wheel goes underground',
        heights.every(h => h >= -0.01), Math.min(...heights).toFixed(2));

  for (const key of ['C', 'S']){
    let lo = 99, outside = 0;
    for (let i = 0; i <= 60; i++){
      const rot = (i/60) * Math.PI * 2;
      for (let s = 0; s < RIDES[key].seats; s++){
        const q = seatPose(key, s, rot);
        lo = Math.min(lo, q.h);
        if (q.x < 1 || q.z < 1 || q.x > MW-1 || q.z > MH-1) outside++;
      }
    }
    check('ride ' + key + ' stays above ground', lo >= -0.01, lo.toFixed(2));
    check('ride ' + key + ' stays inside the park', outside === 0, outside);
  }

  /* Two riders must never be handed the same seat at the same moment, and a
     seat must stay the same seat as the ride turns. */
  const rot0 = rideAngles(0).F;
  const seatsA = [];
  for (let s = 0; s < RIDES.F.seats; s++){
    const p = seatPose('F', s, rot0);
    seatsA.push(p.x.toFixed(2) + ',' + p.h.toFixed(2));
  }
  check('every cabin is in a different place',
        new Set(seatsA).size === RIDES.F.seats, seatsA.join(' '));

  /* a full turn brings a seat back to where it started */
  const a0 = seatPose('F', 0, 0), a1 = seatPose('F', 0, Math.PI * 2);
  check('a full turn returns a cabin to its start',
        Math.abs(a0.x - a1.x) < 1e-6 && Math.abs(a0.h - a1.h) < 1e-6);

  /* boarding picks a car near you, not one across the ride */
  for (const key of ['F', 'C', 'S']){
    const rot = rideAngles(1234567)[key];
    let at = null;
    for (let y = 0; y < MH; y++){ const x = MAP[y].indexOf(key); if (x >= 0) at = [x+0.5, y+0.5]; }
    const seat = nearestSeat(key, rot, at[0], at[1]);
    const p = seatPose(key, seat, rot);
    const d = Math.hypot(p.x - at[0], p.z - at[1]);
    check(key + ': you board a car near the platform, not across the ride',
          d < RIDES[key].r * 1.4 + 1, d.toFixed(2));
  }
}

/* ---------- boarding and stepping off -------------------------------------- */
{
  for (const key of Object.keys(RIDES)){
    const park = new Park({}, {});
    const w = sock();
    park.onMessage(w, { t: 'join', name: 'Rider' });
    const p = park.players[0];

    /* find the tile and stand on it */
    let at = null;
    for (let y = 0; y < MH; y++){ const x = MAP[y].indexOf(key); if (x >= 0) at = [x, y]; }
    p.x = at[0] + 0.5; p.z = at[1] + 0.5;
    park.maybeBoard(p, Date.now());
    check(key + ': standing on the tile starts the ride', !!p.ride, String(p.ride));

    /* run it past its time, then keep ticking until it lets you off. The
       wheel deliberately waits until your cabin is near the bottom. */
    p.ride.started = Date.now() - rideSeconds(key) * 1000 - 10;
    for (let i = 0; i < 2000 && p.ride; i++){
      park.rideStep(p, Date.now() + i * 200);
    }
    check(key + ': the ride ends', p.ride === null);
    check(key + ': you are not left inside anything',
          !blocked(p.x, p.z, 0.3), p.x.toFixed(1) + ',' + p.z.toFixed(1));
    check(key + ': you are back on the ground', Math.abs(p.h) < 0.01, p.h);
    check(key + ': the ride was counted', p.rides === 1, p.rides);
  }
}

/* ---------- the maze always drops you somewhere legal ---------------------- */
{
  let bad = 0;
  for (let i = 0; i < 400; i++){
    const s = randomOpenTile(Math.random);
    if (blocked(s.x, s.z, 0.3)) bad++;
  }
  check('400 maze exits and every one is standable', bad === 0, bad);
}

/* ---------- rubbish input -------------------------------------------------- */
{
  const park = new Park({}, {});
  const w = sock();
  park.onMessage(w, { t: 'join', name: '   ' });
  const p = park.players[0];
  check('a blank name gets a fallback', p.name === 'Visitor', p.name);

  park.onMessage(w, { t: 'in', ax: 'banana', az: Infinity });
  park.lastTick = Date.now() - 66; park.tick();
  check('nonsense input does not break anything', isFinite(p.x) && isFinite(p.z));

  park.onMessage(w, { t: 'in', ax: 9e9, az: -9e9 });
  check('input is clamped', Math.abs(p.ax) <= 1 && Math.abs(p.az) <= 1, p.ax + ',' + p.az);

  park.onMessage(w, { t: 'emote', kind: 'somersault' });
  check('an unknown emote is ignored', p.emote === null);
  park.onMessage(w, { t: 'emote', kind: 'wave' });
  check('a real emote lands', p.emote && p.emote.kind === 'wave');

  park.onMessage(w, { t: 'say', text: 'x'.repeat(500) });
  check('a long message is cut down', p.say.text.length <= 60, p.say.text.length);

  const longName = sock();
  park.onMessage(longName, { t: 'join', name: 'aaaaaaaaaaaaaaaaaaaaaaaaa' });
  check('a long name is cut down', park.players[1].name.length <= 12, park.players[1].name);
}

/* ---------- people coming and going ---------------------------------------- */
{
  const park = new Park({}, {});
  const a = sock(), b = sock(), c = sock();
  park.onMessage(a, { t: 'join', name: 'A' });
  park.onMessage(b, { t: 'join', name: 'B' });
  park.onMessage(c, { t: 'join', name: 'C' });
  check('three people are in the park', park.players.length === 3);
  check('everyone gets a distinct id', new Set(park.players.map(p => p.id)).size === 3);
  check('nobody spawns on top of somebody else',
        new Set(park.players.map(p => p.x.toFixed(3))).size === 3);

  park.onMessage(a, { t: 'join', name: 'A again' });
  check('joining twice on one socket does nothing', park.players.length === 3);

  park.onClose(b);
  check('leaving removes you', park.players.length === 2);
  park.onClose(a); park.onClose(c);
  check('an empty park is empty', park.players.length === 0);
}

/* ---------- what goes over the wire ---------------------------------------- */
{
  const park = new Park({}, {});
  const a = sock(), b = sock();
  park.onMessage(a, { t: 'join', name: 'Ann' });
  park.onMessage(b, { t: 'join', name: 'Bob' });
  park.push();
  const world = last(a, 'world');
  check('everybody is in the update', world.p.length === 2);
  check('each row carries a name and a place',
        world.p.every(r => r.n && typeof r.x === 'number' && typeof r.z === 'number'));
  check('the update is small', JSON.stringify(world).length < 600,
        JSON.stringify(world).length + ' bytes');
}

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
