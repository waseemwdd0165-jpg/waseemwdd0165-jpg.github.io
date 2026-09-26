/* ==========================================================================
   Sunday Park - a 3D park you walk around with whoever else is online

   There is one park, not a room per group. Open the link, type a name, and
   you are standing at the gate with everyone else. No code to share, no
   lobby. One Durable Object holds the park and everybody dials out to it,
   which is what makes it work from any network.

   The server owns where people are. The browser only draws it.
   ========================================================================== */

/* ---------- the park ------------------------------------------------------
   Map x runs east, map y runs north into the screen, which is world z.
   g grass   . path   T tree   ~ water   f fence   X building   B bench
   F big wheel   C carousel   S swings   M mirror maze
   A ride letter is its boarding tile. Walk onto it and the park takes over.
   ------------------------------------------------------------------------ */
export const MAP = [
  "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
  "fgTggggTgggggggggggTgggggggggggggggggggTTggggggggggggggggggf",
  "fgggggggggggggggggggggggTggggggggTTggggggggggggTgggggggggggf",
  "fggggggggggggggggggggggggggTgggggggggggggggggggggggggggggggf",
  "fggg~~~~~~~~~~~~~gggggggggTgTgggTggggTTTTggggggggggggggggggf",
  "fgg~~~~~~~~~~~~~~~gTggggggggggggggggTggggggTgTgggggggggggggf",
  "fgg~~~~~~~~~~~~~~~ggTgggTgggggggggggggggggggggggTgggTggggggf",
  "fgg~~~~~~~~~~~~~~~ggggggTggggggggggTggggggggggggggggTggggggf",
  "fgg~~~~~~~~~~~~~~~gggggggggggggTggggggggTgggggggggggggTggggf",
  "fgg~~~~~~~~~~~~~~~gggTggggggggggggTgTgggggggggggggggggTTgTgf",
  "fgTg~~~~~~~~~~~~~ggggTggTggggggggggggTggggggggggggTgTggggggf",
  "fgggggTggggggggggggggggggggggggggggggggggggggggggggggggggggf",
  "fgggggTggg........................................gTgTgggggf",
  "fgggTggggg........................................gggggggggf",
  "fggggTgggg....XXXXXXX.................XXXXXXXX....gggTgggggf",
  "fgggTgggTg...gXXXXXXXggggggg...gggggggXXXXXXXXg...gggggggggf",
  "fggggTgggg...gXXXXXXXggggggg...gggggggXXXXXXXXg...ggTggggggf",
  "fgTggggggg...gXXXXXXXTgg............ggXXXXXXXXg...gggggggggf",
  "fgTggggggg...gXXXXXXXggg.B........B.ggXXXXXXXXg...gggggggggf",
  "fggggggggg...gXXXFXXXggg....~~~~....ggXXXXCXXXg...gggggggggf",
  "fgggTggggg...ggggggggggg....~~~~....ggggggggggg...gggggggggf",
  "fggggggggg...ggggggggggg....~~~~....gTggggggggg...gggggggggf",
  "fggggggTTg...ggggggggggg.B........B.ggggggggggg...gggggggggf",
  "fgggTggggg...gggggggggTg............gggggggTggg...gggggggTgf",
  "fggggggTgg...ggggggggggggggg...gggggggggggggggg...gggggggggf",
  "fggggggggg........................................gggggggggf",
  "fgggggTggg........................................gggTgggggf",
  "fggggggggg....XXXXXXX.................XXXXXXXX....gggggggggf",
  "fgggggggggggggXXXXXXXggggggg...gggggggXXXXXXXXgggggggTgggggf",
  "fgggggggggggggXXXXXXXggggggg...gggggggXXXXXXXXgTggggggggTggf",
  "fgTgggggggggggXXXXXXXggggggg...gggggggXXXXXXXXggggggggggggTf",
  "fggggggTggggggXXXMXXXggggggg...gggggggXXXXSXXXgggggggggggggf",
  "fTggggggTgTggggggggggggggggg...ggggggggTggggggggggggggggTggf",
  "fgggggggTggggggggggggggggggg...ggggggggggggggTggggTggggggggf",
  "fgTgggggggTggTTgggggTggggggg...ggggggggggggggggggggggTgggggf",
  "fggggTgggTTggggggggggggggggg...gTggTgggggggggTgggggggggggggf",
  "fggTggTgggTgggggggggTggggggg...ggggggggggggggggggTggggggTggf",
  "fgggTgTgTggggggggggggggggggg...gggggggggTgTggggggggggTgggggf",
  "fggggggTgggggggggggggggggggg...ggggggggggTTTgggggTggggTggggf",
  "ffffffffffffffffffffffffffffff..ffffffffffffffffffffffffffff"
];

export const MW = MAP[0].length;
export const MH = MAP.length;
const SOLID = 'fT~X';

export function cell(x, y){
  if (x < 0 || y < 0 || x >= MW || y >= MH) return 'f';
  return MAP[y][x];
}
export function solid(x, y){ return SOLID.indexOf(cell(x, y)) >= 0; }

/* ---------- the rides -----------------------------------------------------
   Four rides, one machine. The wheel turns in the vertical plane so it lifts
   you over the treetops; the others turn flat. The maze does not turn at
   all, it just loses you somewhere else in the park.
   ------------------------------------------------------------------------ */
/* Each ride turns for ever at its own steady rate. The server publishes the
   angle with every update and the browser rotates the model to match, so a
   rider and the seat they are sitting in can never drift apart. Getting this
   wrong once meant people floated through the wheel beside the cabins. */
export const RIDES = {
  F: { name: 'The Big Wheel', cx: 17.5, cz: 16.5, r: 5.4, hub: 6.2,
       plane: 'vertical', seats: 10, period: 30, revs: 1 },
  C: { name: 'Carousel',      cx: 42.0, cz: 16.5, r: 2.4, high: 1.2,
       plane: 'flat',     seats: 8,  period: 9,  revs: 3 },
  S: { name: 'Swing Ride',    cx: 42.0, cz: 29.0, r: 4.0, high: 3.4,
       plane: 'flat',     seats: 8,  period: 11, revs: 2 },
  M: { name: 'Mirror Maze',   cx: 17.5, cz: 29.0, plane: 'lost', secs: 6 }
};

/* how far each ride has turned, right now */
export function rideAngles(nowMs){
  const t = (nowMs === undefined ? Date.now() : nowMs) / 1000;
  return {
    F: -t * (Math.PI * 2 / RIDES.F.period),   /* the wheel turns one way */
    C:  t * (Math.PI * 2 / RIDES.C.period),
    S:  t * (Math.PI * 2 / RIDES.S.period)
  };
}

/* Where seat `seat` of a ride is, given how far the ride has turned. This is
   the same arithmetic the browser uses to place the model, which is the
   whole point. */
export function seatPose(key, seat, rot){
  const R = RIDES[key];
  if (!R || R.plane === 'lost') return null;
  const base = (seat / R.seats) * Math.PI * 2;
  if (R.plane === 'vertical'){
    const a = base + rot;
    return { x: R.cx + Math.cos(a) * R.r, z: R.cz, h: R.hub + Math.sin(a) * R.r, dir: 0 };
  }
  const a = base - rot;
  return { x: R.cx + Math.cos(a) * R.r, z: R.cz + Math.sin(a) * R.r,
           h: R.high, dir: a + Math.PI / 2 };
}

/* the seat nearest the boarding point, so you get into the car in front of
   you rather than teleporting across the ride */
export function nearestSeat(key, rot, x, z){
  const R = RIDES[key];
  let best = 0, bestD = Infinity;
  for (let s = 0; s < R.seats; s++){
    const p = seatPose(key, s, rot);
    const d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z) + p.h * p.h * 0.35;
    if (d < bestD){ bestD = d; best = s; }
  }
  return best;
}

export function rideSeconds(key){
  const R = RIDES[key];
  return R.plane === 'lost' ? R.secs : R.period * R.revs;
}

export const SPAWN = { x: 30.0, z: 38.2 };
export const TICK_MS = 66;        /* about fifteen a second */
export const SPEED = 4.6;         /* tiles per second */
export const MAX_PLAYERS = 40;
export const EMOTES = ['wave', 'dance', 'sit', 'cheer'];

/* ---------- movement ------------------------------------------------------ */
export function moveWithWalls(p, dx, dz){
  const r = 0.3;
  const nx = p.x + dx;
  if (!blocked(nx, p.z, r)) p.x = nx;
  const nz = p.z + dz;
  if (!blocked(p.x, nz, r)) p.z = nz;
}
export function blocked(x, z, r){
  return solid(Math.floor(x - r), Math.floor(z - r)) ||
         solid(Math.floor(x + r), Math.floor(z - r)) ||
         solid(Math.floor(x - r), Math.floor(z + r)) ||
         solid(Math.floor(x + r), Math.floor(z + r));
}
export function randomOpenTile(rnd){
  for (let i = 0; i < 500; i++){
    const x = Math.floor(rnd() * MW), z = Math.floor(rnd() * MH);
    if (!solid(x, z) && 'FCSM'.indexOf(cell(x, z)) < 0) return { x: x + 0.5, z: z + 0.5 };
  }
  return { x: SPAWN.x, z: SPAWN.z };
}

/* ==========================================================================
   Worker
   ========================================================================== */
export default {
  async fetch(request, env){
    const url = new URL(request.url);
    if (url.pathname === '/api/ws'){
      return env.PARK.get(env.PARK.idFromName('the-park')).fetch(request);
    }
    return new Response(PAGE, { headers: { 'content-type': 'text/html; charset=utf-8' } });
  }
};

export class Park {
  constructor(state, env){
    this.sockets = new Map();
    this.players = [];
    this.seq = 0;
    this.timer = null;
    this.lastTick = 0;
  }

  async fetch(request){
    if (request.headers.get('Upgrade') !== 'websocket'){
      return new Response('expected websocket', { status: 426 });
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();
    server.addEventListener('message', e => {
      let m; try { m = JSON.parse(e.data); } catch { return; }
      this.onMessage(server, m);
    });
    const gone = () => this.onClose(server);
    server.addEventListener('close', gone);
    server.addEventListener('error', gone);
    return new Response(null, { status: 101, webSocket: client });
  }

  onMessage(ws, m){
    if (m.t === 'join'){
      if (this.sockets.has(ws)) return;
      if (this.players.length >= MAX_PLAYERS){ send(ws, { t: 'busy' }); return; }
      const p = {
        id: 'p' + (++this.seq),
        name: cleanName(m.name),
        hue: Math.floor(Math.random() * 360),
        ws,
        x: SPAWN.x + (Math.random() - 0.5) * 1.8,
        z: SPAWN.z,
        h: 0,
        dir: -Math.PI / 2,
        ax: 0, az: 0,
        walking: false,
        ride: null,
        emote: null,
        say: null,
        rides: 0
      };
      this.players.push(p);
      this.sockets.set(ws, p);
      send(ws, { t: 'you', id: p.id, name: p.name, hue: p.hue });
      this.startLoop();
      return;
    }

    const p = this.sockets.get(ws);
    if (!p) return;

    if (m.t === 'in'){ p.ax = clamp1(m.ax); p.az = clamp1(m.az); return; }
    if (m.t === 'emote' && EMOTES.indexOf(m.kind) >= 0){
      p.emote = { kind: m.kind, until: Date.now() + 2800 };
      return;
    }
    if (m.t === 'say'){
      const text = String(m.text || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 60);
      if (text) p.say = { text, until: Date.now() + 5500 };
      return;
    }
  }

  onClose(ws){
    const p = this.sockets.get(ws);
    this.sockets.delete(ws);
    if (!p) return;
    this.players = this.players.filter(x => x !== p);
    if (this.players.length === 0) this.stopLoop();
  }

  startLoop(){
    if (this.timer) return;
    this.lastTick = Date.now();
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }
  stopLoop(){ if (this.timer){ clearInterval(this.timer); this.timer = null; } }

  tick(){
    const now = Date.now();
    const dt = Math.min(0.25, (now - this.lastTick) / 1000);
    this.lastTick = now;

    for (const p of this.players){
      if (p.emote && now > p.emote.until) p.emote = null;
      if (p.say && now > p.say.until) p.say = null;

      if (p.ride){ this.rideStep(p, now); continue; }

      let ax = p.ax, az = p.az;
      const mag = Math.hypot(ax, az);
      if (mag > 1){ ax /= mag; az /= mag; }
      p.walking = mag > 0.08;
      if (p.walking){
        p.dir = Math.atan2(az, ax);
        moveWithWalls(p, ax * SPEED * dt, az * SPEED * dt);
        p.emote = null;
        this.maybeBoard(p, now);
      }
    }
    this.push();
  }

  maybeBoard(p, now){
    const c = cell(Math.floor(p.x), Math.floor(p.z));
    if (!RIDES[c]) return;
    const seat = RIDES[c].plane === 'lost'
      ? 0 : nearestSeat(c, rideAngles(now)[c], p.x, p.z);
    p.ride = { key: c, started: now, seat: seat, offX: p.x, offZ: p.z + 1.6 };
    p.rides += 1;
    p.walking = false;
  }

  rideStep(p, now){
    const key = p.ride.key;
    const R = RIDES[key];
    const done = (now - p.ride.started) >= rideSeconds(key) * 1000;

    if (R.plane === 'lost'){
      if (done){
        const spot = randomOpenTile(Math.random);
        p.x = spot.x; p.z = spot.z; p.h = 0; p.ride = null;
        p.say = { text: 'where am I', until: now + 4000 };
      }
      return;
    }

    const pose = seatPose(key, p.ride.seat, rideAngles(now)[key]);
    p.x = pose.x; p.z = pose.z; p.h = pose.h; p.dir = pose.dir;

    /* Only let people off near the bottom, so nobody is dropped from the top
       of the wheel the moment their time is up. */
    if (done && p.h < (R.plane === 'vertical' ? R.hub - R.r + 0.9 : 99)){
      let ox = p.ride.offX, oz = p.ride.offZ;
      if (blocked(ox, oz, 0.3)){ ox = SPAWN.x; oz = SPAWN.z; }
      p.x = ox; p.z = oz; p.h = 0; p.ride = null;
    }
  }

  push(){
    const all = this.players.map(p => ({
      i: p.id, n: p.name, u: p.hue,
      x: r2(p.x), z: r2(p.z), h: r2(p.h), d: r2(p.dir),
      w: p.walking ? 1 : 0,
      r: p.ride ? p.ride.key : null,
      e: p.emote ? p.emote.kind : null,
      s: p.say ? p.say.text : null,
      c: p.rides
    }));
    /* the ride angles travel with every update so the models the browser
       draws are turned to exactly where the server thinks they are */
    const a = rideAngles();
    const msg = JSON.stringify({
      t: 'world', p: all,
      a: { F: r2(a.F % (Math.PI*2)), C: r2(a.C % (Math.PI*2)), S: r2(a.S % (Math.PI*2)) }
    });
    for (const p of this.players){ try { p.ws.send(msg); } catch {} }
  }
}

function send(ws, o){ try { ws.send(JSON.stringify(o)); } catch {} }
function clamp1(v){ v = Number(v); if (!isFinite(v)) return 0; return v < -1 ? -1 : v > 1 ? 1 : v; }
function r2(n){ return Math.round(n * 100) / 100; }
function cleanName(n){
  const s = String(n || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 12);
  return s || 'Visitor';
}
