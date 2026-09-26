/* ==========================================================================
   Chalk

   One player draws. The other runs on what was drawn.

   The runner never stops and there is no ground ahead of them. Everything
   they cross has to be drawn, in chalk, a second before they get there. Roles
   swap every round, so whoever was panicking with the chalk is next to be the
   one falling.

   The server owns the runner and every line. A drawer sends the points their
   finger passed through; the server decides whether they had the chalk left
   to draw them, and the physics runs in one place so both people are looking
   at the same fall.
   ========================================================================== */

/* ---------- the shape of a round ------------------------------------------ */
export const ROUNDS      = 4;
export const TICK_MS     = 33;      /* about thirty a second */
/* The runner used to set off the instant the round began, which gave the
   drawer about half a second before the starting ledge ran out. Nobody can
   draw in half a second, so every round ended at the same nine metres. Now
   there is a countdown to lay the first stretch, a longer ledge, and a speed
   that creeps up rather than starting flat out. */
export const READY_MS    = 4000;
export const LEDGE_END   = 13;
export const RUN_SPEED   = 5.4;     /* metres a second at the start */
export const SPEED_MAX   = 9.0;
export const SPEED_RAMP  = 45;      /* seconds to reach the top speed */

export function speedAt(secs){
  const t = Math.max(0, Math.min(1, secs / SPEED_RAMP));
  return RUN_SPEED + (SPEED_MAX - RUN_SPEED) * t;
}
export const GRAVITY     = 26;
export const JUMP_V      = 10.2;
export const RUNNER_R    = 0.36;
export const START_X     = 2;
export const START_Y     = 3;
export const DEATH_Y     = -6;      /* fall past this and the round is over */
export const MAX_PLAYERS = 6;

/* Chalk is the whole balance of the game. Too much and the drawer paves a
   motorway; too little and nobody gets anywhere. */
export const INK_MAX     = 34;      /* metres of line you can hold */
export const INK_REFILL  = 7.5;     /* metres a second */
export const MIN_SEG     = 0.18;    /* ignore jitter smaller than this */
export const MAX_SEG     = 3.0;     /* and reject teleporting strokes */

/* the drawer can only work near the runner, so they cannot pre build the
   whole level while the runner waits */
export const REACH_BACK  = 6;
export const REACH_FWD   = 22;
export const REACH_UP    = 9;
export const REACH_DOWN  = 7;

export function roomCode(rnd){
  const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ';   /* no I or O, they misread aloud */
  let s = '';
  for (let i = 0; i < 4; i++) s += L[Math.floor((rnd || Math.random)() * L.length)];
  return s;
}

/* ---------- geometry ------------------------------------------------------ */
/* closest point on a segment to a circle centre, and how far away it is */
export function segDistance(px, py, x1, y1, x2, y2){
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / len2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const cx = x1 + dx * t, cy = y1 + dy * t;
  return { d: Math.hypot(px - cx, py - cy), cx, cy, t };
}

/* Is this stroke close enough to the runner to be allowed? Checked on the
   server because a client could otherwise draw the finish line. */
export function withinReach(runnerX, runnerY, x, y){
  return x > runnerX - REACH_BACK && x < runnerX + REACH_FWD &&
         y > runnerY - REACH_DOWN && y < runnerY + REACH_UP;
}

/* ---------- the runner ----------------------------------------------------
   Kept out of the class so a test can step a runner over a hand made set of
   lines without standing up a whole room.
   ------------------------------------------------------------------------ */
export function stepRunner(r, segs, dt, speed){
  if (!r.alive) return r;

  r.vy -= GRAVITY * dt;
  let nx = r.x + (speed === undefined ? RUN_SPEED : speed) * dt;
  let ny = r.y + r.vy * dt;

  r.grounded = false;

  /* Resolve against every nearby line. Two passes settles the common case of
     landing in the crook of two strokes without jittering. */
  for (let pass = 0; pass < 2; pass++){
    for (let i = 0; i < segs.length; i++){
      const s = segs[i];
      if (s.x2 < nx - 3 || s.x1 > nx + 3) continue;
      const hit = segDistance(nx, ny, s.x1, s.y1, s.x2, s.y2);
      if (hit.d >= RUNNER_R || hit.d === 0) continue;

      const push = (RUNNER_R - hit.d);
      let ox = (nx - hit.cx) / hit.d, oy = (ny - hit.cy) / hit.d;
      nx += ox * push;
      ny += oy * push;
      /* coming down onto something that is more floor than wall */
      if (oy > 0.45 && r.vy < 0){ r.vy = 0; r.grounded = true; }
      else if (oy < -0.45 && r.vy > 0){ r.vy = 0; }
    }
  }

  r.x = nx; r.y = ny;
  r.dist = Math.max(r.dist, r.x - START_X);
  if (r.y < DEATH_Y) r.alive = false;
  return r;
}

export function newRunner(){
  return { x: START_X, y: START_Y, vy: 0, grounded: false, alive: true, dist: 0 };
}

/* ==========================================================================
   Worker
   ========================================================================== */
export default {
  async fetch(request, env){
    const url = new URL(request.url);
    if (url.pathname === '/api/ws'){
      const code = (url.searchParams.get('room') || '').toUpperCase();
      if (!/^[A-Z]{4}$/.test(code)) return new Response('bad room', { status: 400 });
      return env.BOARD.get(env.BOARD.idFromName(code)).fetch(request);
    }
    return new Response(PAGE, { headers: { 'content-type': 'text/html; charset=utf-8' } });
  }
};

export class Board {
  constructor(state, env){
    this.sockets = new Map();
    this.players = [];
    this.phase = 'lobby';
    this.round = 0;
    this.seq = 0;
    this.timer = null;
    this.lastTick = 0;
    this.runner = newRunner();
    this.segs = [];
    this.runnerId = null;
    this.result = '';
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

  /* ---------- messages ---------------------------------------------------- */
  onMessage(ws, m){
    if (m.t === 'join'){
      if (this.sockets.has(ws)) return;
      if (m.create && this.players.length > 0){ send(ws, { t:'taken' }); return; }
      if (this.phase !== 'lobby'){ send(ws, { t:'closed' }); return; }
      if (this.players.length >= MAX_PLAYERS){ send(ws, { t:'full' }); return; }
      const p = {
        id: 'p' + (++this.seq),
        name: cleanName(m.name),
        ws, role: 'drawer', ink: INK_MAX, score: 0, best: 0
      };
      this.players.push(p);
      this.sockets.set(ws, p);
      send(ws, { t:'you', id: p.id, name: p.name });
      this.pushAll();
      return;
    }

    const p = this.sockets.get(ws);
    if (!p) return;

    if (m.t === 'start' && this.isHost(p) && this.phase === 'lobby'){
      this.startMatch(); return;
    }
    if (m.t === 'again' && this.isHost(p) && this.phase === 'over'){
      this.startMatch(); return;
    }
    if (m.t === 'jump' && this.phase === 'play' && p.role === 'runner'){
      if (this.runner.grounded && this.runner.alive){
        this.runner.vy = JUMP_V;
        this.runner.grounded = false;
      }
      return;
    }
    if (m.t === 'draw' && this.phase === 'play' && p.role === 'drawer'){
      this.drawFrom(p, m.pts);
      return;
    }
  }

  onClose(ws){
    const p = this.sockets.get(ws);
    this.sockets.delete(ws);
    if (!p) return;
    this.players = this.players.filter(x => x !== p);
    if (this.players.length === 0){ this.stopLoop(); this.phase = 'lobby'; this.round = 0; return; }
    /* if the runner walked out, end the round rather than freezing */
    if (this.phase === 'play' && p.id === this.runnerId) this.endRound('The runner left');
    else this.pushAll();
  }

  isHost(p){ return this.players[0] === p; }

  /* ---------- drawing ------------------------------------------------------ */
  /* Points arrive as a flat list of numbers. Each pair becomes a segment if
     the drawer is in range, has the chalk, and is not trying to jump the pen
     halfway across the board. */
  drawFrom(p, pts){
    if (!Array.isArray(pts) || pts.length < 4) return;
    const added = [];
    for (let i = 0; i + 3 < pts.length && added.length < 40; i += 2){
      const x1 = num(pts[i]),   y1 = num(pts[i+1]);
      const x2 = num(pts[i+2]), y2 = num(pts[i+3]);
      if (x1 === null || y1 === null || x2 === null || y2 === null) return;

      const len = Math.hypot(x2 - x1, y2 - y1);
      if (len < MIN_SEG || len > MAX_SEG) continue;
      if (p.ink < len) break;
      if (!withinReach(this.runner.x, this.runner.y, x1, y1)) continue;
      if (!withinReach(this.runner.x, this.runner.y, x2, y2)) continue;

      p.ink -= len;
      const seg = { x1: r2(x1), y1: r2(y1), x2: r2(x2), y2: r2(y2), n: this.segs.length };
      this.segs.push(seg);
      added.push(seg);
    }
    if (added.length) this.pushAll();
  }

  /* ---------- rounds -------------------------------------------------------- */
  startMatch(){
    this.round = 0;
    this.players.forEach(p => { p.score = 0; p.best = 0; });
    this.beginRound();
  }

  beginRound(){
    const ps = this.players;
    const idx = this.round % ps.length;
    ps.forEach((p, i) => {
      p.role = (i === idx) ? 'runner' : 'drawer';
      p.ink = INK_MAX;
    });
    this.runnerId = ps[idx].id;
    this.runner = newRunner();
    this.segs = [{ x1: -1, y1: 1.2, x2: LEDGE_END, y2: 1.2, n: 0 }];
    this.phase = 'play';
    this.result = '';
    this.lastTick = Date.now();
    this.runAt = Date.now() + READY_MS;   /* the runner waits for this */
    this.startLoop();
    this.pushAll();
  }

  startLoop(){
    if (this.timer) return;
    this.lastTick = Date.now();
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }
  stopLoop(){ if (this.timer){ clearInterval(this.timer); this.timer = null; } }

  tick(){
    if (this.phase !== 'play') return;
    const now = Date.now();
    const dt = Math.min(0.1, (now - this.lastTick) / 1000);
    this.lastTick = now;

    for (const p of this.players){
      if (p.role === 'drawer') p.ink = Math.min(INK_MAX, p.ink + INK_REFILL * dt);
    }

    /* during the countdown the drawer works and the runner stands still */
    if (now >= this.runAt){
      const secs = (now - this.runAt) / 1000;
      stepRunner(this.runner, this.segs, dt, speedAt(secs));
    }

    /* forget chalk the runner has long passed, so the room does not grow
       without limit over a long run */
    if (this.segs.length > 600){
      this.segs = this.segs.filter(s => s.x2 > this.runner.x - 24);
    }

    if (!this.runner.alive){ this.endRound(null); return; }
    this.pushAll();
  }

  endRound(why){
    this.phase = 'result';
    this.stopLoop();
    const d = Math.floor(this.runner.dist);
    const runner = this.players.find(p => p.id === this.runnerId);
    if (runner){
      runner.best = Math.max(runner.best, d);
      runner.score += d;
    }
    /* the drawers are the reason it went that far, so they share the score */
    this.players.filter(p => p.role === 'drawer').forEach(p => { p.score += d; });
    this.result = why || (d + ' metres');
    this.pushAll();

    setTimeout(() => {
      if (this.players.length === 0) return;
      this.round += 1;
      if (this.round >= ROUNDS){ this.phase = 'over'; this.pushAll(); }
      else this.beginRound();
    }, 3500);
  }

  /* ---------- what each side is told ---------------------------------------- */
  sliceFor(p){
    const msg = {
      t: 'state',
      ph: this.phase,
      round: this.round,
      rounds: ROUNDS,
      host: this.isHost(p),
      role: p.role,
      ink: r2(p.ink),
      inkMax: INK_MAX,
      result: this.result,
      roster: this.players.map(o => ({ i:o.id, n:o.name, s:o.score, b:o.best, r:o.role }))
    };
    if (this.phase === 'play' || this.phase === 'result'){
      msg.cd = Math.max(0, Math.ceil((this.runAt - Date.now()) / 1000));
      msg.r = {
        x: r2(this.runner.x), y: r2(this.runner.y),
        g: this.runner.grounded ? 1 : 0,
        a: this.runner.alive ? 1 : 0,
        d: Math.floor(this.runner.dist)
      };
      /* only the chalk near the runner needs to travel */
      msg.s = this.segs
        .filter(s => s.x2 > this.runner.x - 14 && s.x1 < this.runner.x + 30)
        .map(s => [s.x1, s.y1, s.x2, s.y2]);
    }
    return msg;
  }

  pushAll(){
    for (const p of this.players) send(p.ws, this.sliceFor(p));
  }
}

/* ---------- helpers --------------------------------------------------------- */
function send(ws, o){ try { ws.send(JSON.stringify(o)); } catch {} }
function r2(n){ return Math.round(n * 100) / 100; }
function num(v){ v = Number(v); return isFinite(v) ? v : null; }
function cleanName(n){
  const s = String(n || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 12);
  return s || 'Player';
}
