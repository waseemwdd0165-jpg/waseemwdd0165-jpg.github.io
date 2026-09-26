/* ==========================================================================
   Chalk Runner
   One step ahead

   One player draws. The other runs on what was drawn.

   The runner never stops and there is no ground in front of them. Everything
   they cross has to be chalked in a second before they reach it. Every fifty
   metres they speed up, every hundred they bank a leap, and the roles swap
   each round so whoever was panicking with the chalk is next to be falling.

   The server owns the runner and every line. A drawer sends the points their
   finger passed through and the server decides whether they had the chalk to
   spend, so the physics happens in one place and both people are watching
   the same fall.
   ========================================================================== */

/* ---------- the shape of a round ------------------------------------------ */
export const ROUNDS      = 4;
export const TICK_MS     = 33;      /* about thirty a second */
export const GRAVITY     = 26;
export const JUMP_V      = 10.2;
export const RUNNER_R    = 0.36;
export const START_X     = 2;
export const START_Y     = 3;
export const DEATH_Y     = -6;
export const MAX_PLAYERS = 6;
export const READY_MS    = 4000;    /* the runner waits while you lay ground */
export const LEDGE_END   = 13;

/* ---------- getting harder -------------------------------------------------
   Speed follows distance, not the clock, so the difficulty is something the
   pair earned rather than something that happened to them while they stood
   still. A step every fifty metres is small enough not to feel unfair and
   often enough that a long run genuinely turns into a different game.
   ------------------------------------------------------------------------ */
export const SPEED_START = 4.6;
export const SPEED_STEP  = 0.42;
export const SPEED_EVERY = 50;      /* metres between steps */
export const SPEED_MAX   = 10.0;

export function levelAt(dist){ return Math.floor(Math.max(0, dist) / SPEED_EVERY); }
export function speedAt(dist){
  return Math.min(SPEED_MAX, SPEED_START + levelAt(dist) * SPEED_STEP);
}
export function nextMilestone(dist){
  return (levelAt(dist) + 1) * SPEED_EVERY;
}

/* ---------- the leap -------------------------------------------------------
   Banked every hundred metres. It goes high and then hangs, which is the
   only moment in the game where the drawer gets to breathe.
   ------------------------------------------------------------------------ */
export const LEAP_EVERY  = 100;
export const LEAP_V      = 15.5;
export const FLOAT_S     = 1.1;
export const FLOAT_G     = 0.34;
export function leapsEarned(dist){ return Math.floor(Math.max(0, dist) / LEAP_EVERY); }

/* ---------- chalk ----------------------------------------------------------
   The whole balance of the game. Too much and the drawer paves a motorway,
   too little and nobody gets anywhere.
   ------------------------------------------------------------------------ */
export const INK_MAX     = 34;      /* metres of line you can hold */
export const INK_REFILL  = 7.5;     /* metres a second */
export const MIN_SEG     = 0.10;
export const MAX_SEG     = 3.0;

/* You can only work near the runner, so the level cannot be pre built */
export const REACH_BACK  = 6;
export const REACH_FWD   = 22;
export const REACH_UP    = 9;
export const REACH_DOWN  = 7;

/* How much chalk is sent to a browser. This has to be wider than any screen,
   because a window narrower than the view made lines vanish at the edges. */
export const SEND_BACK   = 34;
export const SEND_FWD    = 60;

/* A room with a socket open still costs, whether or not anyone is playing,
   so an abandoned tab gets shown the door. */
export const IDLE_MS     = 20 * 60 * 1000;

export const TOP_N       = 10;      /* how many scores the board keeps */
export const TOP_ROOM    = '__top__';

export function roomCode(rnd){
  const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ';   /* no I or O, they misread aloud */
  let s = '';
  for (let i = 0; i < 4; i++) s += L[Math.floor((rnd || Math.random)() * L.length)];
  return s;
}

/* ---------- geometry ------------------------------------------------------ */
export function segDistance(px, py, x1, y1, x2, y2){
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / len2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const cx = x1 + dx * t, cy = y1 + dy * t;
  return { d: Math.hypot(px - cx, py - cy), cx, cy, t };
}

export function withinReach(runnerX, runnerY, x, y){
  return x > runnerX - REACH_BACK && x < runnerX + REACH_FWD &&
         y > runnerY - REACH_DOWN && y < runnerY + REACH_UP;
}

/* ---------- the runner ----------------------------------------------------- */
export function newRunner(){
  return { x: START_X, y: START_Y, vy: 0, grounded: false, alive: true,
           dist: 0, leaps: 0, banked: 0, float: 0 };
}

export function stepRunner(r, segs, dt, speed){
  if (!r.alive) return r;

  const floating = r.float > 0;
  if (floating) r.float = Math.max(0, r.float - dt);
  r.vy -= GRAVITY * (floating ? FLOAT_G : 1) * dt;

  let nx = r.x + (speed === undefined ? speedAt(r.dist) : speed) * dt;
  let ny = r.y + r.vy * dt;
  r.grounded = false;

  /* Two passes settles the common case of landing in the crook of two
     strokes without the runner jittering between them. */
  for (let pass = 0; pass < 2; pass++){
    for (let i = 0; i < segs.length; i++){
      const s = segs[i];
      if (s.x2 < nx - 3 || s.x1 > nx + 3) continue;
      const hit = segDistance(nx, ny, s.x1, s.y1, s.x2, s.y2);
      if (hit.d >= RUNNER_R || hit.d === 0) continue;

      const push = RUNNER_R - hit.d;
      const ox = (nx - hit.cx) / hit.d, oy = (ny - hit.cy) / hit.d;
      nx += ox * push;
      ny += oy * push;
      if (oy > 0.45 && r.vy < 0){ r.vy = 0; r.grounded = true; }
      else if (oy < -0.45 && r.vy > 0){ r.vy = 0; }
    }
  }

  r.x = nx; r.y = ny;
  r.dist = Math.max(r.dist, r.x - START_X);
  if (r.y < DEATH_Y) r.alive = false;
  return r;
}

/* ---------- the practice partner -------------------------------------------
   A judge opening the link on their own would otherwise reach a lobby that
   says "need one more player" and close the tab having seen nothing. The bot
   is deliberately mediocre: it lays flat ground a fixed distance ahead and
   runs out of chalk if the runner is quick, so a solo game is a real game
   rather than a cutscene.
   ------------------------------------------------------------------------ */
export function botStroke(runner, from, ink){
  const target = runner.x + 11;
  if (from >= target) return null;
  const pts = [];
  let x = Math.max(from, runner.x - 2);
  /* keep to a height the runner can actually land on */
  const y = 1.2;
  let spend = 0;
  pts.push(x, y);
  while (x < target && spend < ink - 0.5){
    const step = Math.min(0.5, target - x);
    x += step; spend += step;
    pts.push(x, y);
  }
  return pts.length >= 4 ? { pts, end: x } : null;
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
    /* The leaderboard lives in one object so every room can see it. Only
       reads are forwarded from the open internet. Scores are posted to that
       object by a room, never by a browser, or the board would be fiction. */
    if (url.pathname === '/api/top'){
      if (request.method !== 'GET') return new Response('read only', { status: 405 });
      return env.BOARD.get(env.BOARD.idFromName(TOP_ROOM)).fetch(request);
    }
    return new Response(PAGE, { headers: { 'content-type': 'text/html; charset=utf-8' } });
  }
};

export class Board {
  constructor(state, env){
    this.state = state;
    this.env = env;
    this.sockets = new Map();
    this.players = [];
    this.phase = 'lobby';
    this.round = 0;
    this.seq = 0;
    this.timer = null;
    this.lastTick = 0;
    this.lastActive = Date.now();
    this.runner = newRunner();
    this.segs = [];
    this.runnerId = null;
    this.result = '';
    this.solo = false;
    this.botFrom = LEDGE_END;
    this.botInk = INK_MAX;
    this.top = null;         /* lazily loaded leaderboard */
  }

  /* ---------- the stored leaderboard --------------------------------------- */
  async loadTop(){
    if (this.top) return this.top;
    try { this.top = (await this.state.storage.get('top')) || []; }
    catch { this.top = []; }
    return this.top;
  }
  async recordScore(name, metres, partner){
    if (!(metres > 0)) return;
    const top = await this.loadTop();
    top.push({ n: name, m: Math.floor(metres), w: partner || '', at: Date.now() });
    top.sort((a, b) => b.m - a.m);
    this.top = top.slice(0, TOP_N);
    try { await this.state.storage.put('top', this.top); } catch {}
  }

  /* A room does not own the leaderboard, so it hands the score to the one
     object that does. Without this the score would sit in the room's own
     storage where nobody would ever read it. */
  async postScore(name, metres, partner){
    try {
      const id = this.env.BOARD.idFromName(TOP_ROOM);
      await this.env.BOARD.get(id).fetch('https://board.internal/api/top', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ n: name, m: metres, w: partner })
      });
    } catch {}
  }

  async fetch(request){
    const url = new URL(request.url);
    if (url.pathname === '/api/top'){
      if (request.method === 'POST'){
        let body = {};
        try { body = await request.json(); } catch {}
        await this.recordScore(String(body.n || '').slice(0, 12),
                               Number(body.m) || 0,
                               String(body.w || '').slice(0, 12));
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'content-type': 'application/json' }
        });
      }
      const top = await this.loadTop();
      return new Response(JSON.stringify({ top }), {
        headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
      });
    }
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

  /* ---------- messages ------------------------------------------------------ */
  onMessage(ws, m){
    this.lastActive = Date.now();

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
      if (this.players.length < 2) return;
      this.solo = false;
      this.startMatch();
      return;
    }
    if (m.t === 'solo' && this.isHost(p) && this.phase === 'lobby'){
      this.solo = true;
      this.startMatch();
      return;
    }
    if (m.t === 'again' && this.isHost(p) && this.phase === 'over'){
      this.startMatch();
      return;
    }
    if (m.t === 'jump' && this.phase === 'play' && p.role === 'runner'){
      if (this.runner.grounded && this.runner.alive){
        this.runner.vy = JUMP_V;
        this.runner.grounded = false;
      }
      return;
    }
    if (m.t === 'leap' && this.phase === 'play' && p.role === 'runner'){
      const r = this.runner;
      if (r.alive && r.leaps > 0){
        r.leaps -= 1; r.vy = LEAP_V; r.float = FLOAT_S; r.grounded = false;
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
    if (this.players.length === 0){
      this.stopLoop(); this.phase = 'lobby'; this.round = 0; return;
    }
    if (this.phase === 'play' && p.id === this.runnerId) this.endRound('The runner left');
    else this.pushAll();
  }

  isHost(p){ return this.players[0] === p; }

  /* ---------- drawing -------------------------------------------------------- */
  drawFrom(p, pts){
    if (!Array.isArray(pts) || pts.length < 4) return;
    let added = 0;
    for (let i = 0; i + 3 < pts.length && added < 60; i += 2){
      const x1 = num(pts[i]),   y1 = num(pts[i+1]);
      const x2 = num(pts[i+2]), y2 = num(pts[i+3]);
      if (x1 === null || y1 === null || x2 === null || y2 === null) return;

      const len = Math.hypot(x2 - x1, y2 - y1);
      if (len < MIN_SEG || len > MAX_SEG) continue;
      if (p.ink < len) break;
      if (!withinReach(this.runner.x, this.runner.y, x1, y1)) continue;
      if (!withinReach(this.runner.x, this.runner.y, x2, y2)) continue;

      p.ink -= len;
      this.segs.push({ x1: r2(x1), y1: r2(y1), x2: r2(x2), y2: r2(y2) });
      added++;
    }
    if (added) this.pushAll();
  }

  /* ---------- rounds ---------------------------------------------------------- */
  startMatch(){
    this.round = 0;
    this.players.forEach(p => { p.score = 0; p.best = 0; });
    this.beginRound();
  }

  beginRound(){
    const ps = this.players;
    /* in solo the one human always runs and the bot always draws */
    const idx = this.solo ? 0 : this.round % ps.length;
    ps.forEach((p, i) => {
      p.role = (i === idx) ? 'runner' : 'drawer';
      p.ink = INK_MAX;
    });
    this.runnerId = ps[idx].id;
    this.runner = newRunner();
    this.segs = [{ x1: -1, y1: 1.2, x2: LEDGE_END, y2: 1.2 }];
    this.botFrom = LEDGE_END;
    this.botInk = INK_MAX;
    this.phase = 'play';
    this.result = '';
    this.lastTick = Date.now();
    this.runAt = Date.now() + READY_MS;
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

    /* an abandoned board should not sit there costing money */
    if (now - this.lastActive > IDLE_MS){
      for (const p of this.players){ try { p.ws.close(1000, 'idle'); } catch {} }
      this.players = []; this.sockets.clear();
      this.stopLoop(); this.phase = 'lobby';
      return;
    }

    for (const p of this.players){
      if (p.role === 'drawer') p.ink = Math.min(INK_MAX, p.ink + INK_REFILL * dt);
    }
    if (this.solo){
      this.botInk = Math.min(INK_MAX, this.botInk + INK_REFILL * dt);
      this.botDraw();
    }

    if (now >= this.runAt) stepRunner(this.runner, this.segs, dt);

    const earned = leapsEarned(this.runner.dist);
    if (earned > this.runner.banked){
      this.runner.leaps += earned - this.runner.banked;
      this.runner.banked = earned;
    }

    if (this.segs.length > 1200){
      this.segs = this.segs.filter(s => s.x2 > this.runner.x - SEND_BACK - 12);
    }

    if (!this.runner.alive){ this.endRound(null); return; }
    this.pushAll();
  }

  botDraw(){
    const stroke = botStroke(this.runner, this.botFrom, this.botInk);
    if (!stroke) return;
    const pts = stroke.pts;
    for (let i = 0; i + 3 < pts.length; i += 2){
      const len = Math.hypot(pts[i+2] - pts[i], pts[i+3] - pts[i+1]);
      if (len < MIN_SEG || this.botInk < len) break;
      this.botInk -= len;
      this.segs.push({ x1: r2(pts[i]), y1: r2(pts[i+1]), x2: r2(pts[i+2]), y2: r2(pts[i+3]) });
    }
    this.botFrom = stroke.end;
  }

  endRound(why){
    this.phase = 'result';
    this.stopLoop();
    const d = Math.floor(this.runner.dist);
    const runner = this.players.find(p => p.id === this.runnerId);
    const drawers = this.players.filter(p => p.role === 'drawer');
    if (runner){
      runner.best = Math.max(runner.best, d);
      runner.score += d;
    }
    drawers.forEach(p => { p.score += d; });
    this.result = why || (d + ' metres');

    /* a solo run is practice and does not go on the board */
    if (!this.solo && runner && d > 0){
      const mate = drawers.length ? drawers[0].name : '';
      const job = this.postScore(runner.name, d, mate);
      if (this.state.waitUntil) this.state.waitUntil(job);
    }
    this.pushAll();

    setTimeout(() => {
      if (this.players.length === 0) return;
      this.round += 1;
      if (this.round >= ROUNDS){ this.phase = 'over'; this.pushAll(); }
      else this.beginRound();
    }, 3500);
  }

  /* ---------- what each side is told -------------------------------------------- */
  sliceFor(p){
    const msg = {
      t: 'state',
      ph: this.phase,
      round: this.round,
      rounds: ROUNDS,
      host: this.isHost(p),
      role: p.role,
      solo: this.solo,
      ink: r2(p.ink),
      inkMax: INK_MAX,
      result: this.result,
      roster: this.players.map(o => ({ i:o.id, n:o.name, s:o.score, b:o.best, r:o.role }))
    };
    if (this.phase === 'play' || this.phase === 'result'){
      const d = this.runner.dist;
      msg.cd = Math.max(0, Math.ceil((this.runAt - Date.now()) / 1000));
      msg.r = {
        x: r2(this.runner.x), y: r2(this.runner.y),
        g: this.runner.grounded ? 1 : 0,
        a: this.runner.alive ? 1 : 0,
        d: Math.floor(d),
        lp: this.runner.leaps,
        fl: this.runner.float > 0 ? 1 : 0,
        lv: levelAt(d) + 1,
        ms: nextMilestone(d),
        sp: r2(speedAt(d))
      };
      msg.s = this.segs
        .filter(s => s.x2 > this.runner.x - SEND_BACK && s.x1 < this.runner.x + SEND_FWD)
        .map(s => [s.x1, s.y1, s.x2, s.y2]);
    }
    return msg;
  }

  pushAll(){
    for (const p of this.players) send(p.ws, this.sliceFor(p));
  }
}

/* ---------- helpers ------------------------------------------------------------- */
function send(ws, o){ try { ws.send(JSON.stringify(o)); } catch {} }
function r2(n){ return Math.round(n * 100) / 100; }
function num(v){ v = Number(v); return isFinite(v) ? v : null; }
function cleanName(n){
  const s = String(n || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 12);
  return s || 'Player';
}
