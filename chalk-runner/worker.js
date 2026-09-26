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

/* ---------- the brake ------------------------------------------------------
   Until this the runner could only jump and everything else belonged to the
   drawer. The brake is the runner's one say in the pace: a second of going
   slow, which is a second the drawer gets to catch up. It cannot be held
   down, and it is on a cooldown, so it is a decision rather than a speed
   setting.
   ------------------------------------------------------------------------ */
export const BRAKE_S     = 1.0;
export const BRAKE_MUL   = 0.45;
export const BRAKE_CD    = 6.0;

/* ---------- somebody's wifi -------------------------------------------------
   A seat is kept warm rather than emptied, and the round holds still while it
   waits, because losing a round to a train tunnel is the worst way to lose.
   ------------------------------------------------------------------------ */
export const HOLD_MS     = 25000;

/* ---------- chalk ----------------------------------------------------------
   The whole balance of the game. Too much and the drawer paves a motorway,
   too little and nobody gets anywhere.
   ------------------------------------------------------------------------ */
export const INK_MAX     = 40;      /* metres of line you can hold */
export const INK_REFILL  = 8.5;     /* metres a second */
export const MIN_SEG     = 0.10;
export const MAX_SEG     = 3.0;

/* You can only work near the runner, so the level cannot be pre built.
   These were tighter. A drawer's instinct is to get well ahead, and the part
   of the stroke past the limit was thrown away without a word, which looked
   exactly like the line disappearing on its own. */
export const REACH_BACK  = 8;
export const REACH_FWD   = 26;
export const REACH_UP    = 9;
export const REACH_DOWN  = 7;

/* How much chalk is sent to a browser. This has to be wider than any screen,
   because a window narrower than the view made lines vanish at the edges, and
   wide enough behind that a line you just drew is still there when you glance
   back at it. */
export const SEND_BACK   = 55;
export const SEND_FWD    = 60;

/* A room with a socket open still costs, whether or not anyone is playing,
   so an abandoned tab gets shown the door. */
export const IDLE_MS     = 20 * 60 * 1000;

export const TOP_N       = 10;      /* how many scores the board keeps */
/* Naming the board rather than hard coding '__top__' means a bad set of scores
   can be left behind by pointing at a fresh object, which is what happened
   after the first live test filled it with two of mine. */
export const TOP_ROOM    = '__board_v1__';

/* ==========================================================================
   The level

   Without these the best thing a drawer can do is lay one long flat line, and
   the game is only about keeping up. Three things get in the way, and each
   one asks a different question.

     a wall   the runner must get over it, so the drawer must build a ramp
     a roof   the runner must stay under it, so the road cannot just go up
     a pit    chalk does not stick here at all, so the runner has to jump it

   The whole level comes out of one number. Both players are sent the same
   seed and the same obstacles, and tomorrow's board can be the same for
   everybody by picking the seed from the date.
   ========================================================================== */
export const WALL_W      = 0.9;
export const ROOF_W      = 2.6;
export const OBS_FROM    = 45;      /* nothing in the first stretch */
export const OBS_TO      = 3000;

/* a small deterministic generator, so a seed really is a level */
export function rng(seed){
  let a = (seed >>> 0) || 1;
  return function(){
    a += 0x6D2B79F5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeLevel(seed){
  const rnd = rng(seed);
  const out = [];
  let x = OBS_FROM;
  while (x < OBS_TO){
    /* they come closer together as the runner gets faster */
    const hard = Math.min(1, x / 700);
    const gap = 30 - 11 * hard + rnd() * (18 - 6 * hard);
    x += gap;
    if (x >= OBS_TO) break;

    const roll = rnd();
    if (roll < 0.42){
      out.push({ k: 0, x: r2(x), h: r2(1.1 + rnd() * (0.8 + 0.9 * hard)) });
    } else if (roll < 0.70){
      /* low enough to matter, high enough to get under */
      out.push({ k: 1, x: r2(x), y: r2(3.1 + rnd() * 1.1) });
    } else {
      /* A pit has to be clearable by a plain jump at the speed the runner will
         be doing when they meet it, with a margin. Otherwise it is not an
         obstacle, it is a wall that looks like a gap. */
      const air = 2 * JUMP_V / GRAVITY;
      const room = Math.max(2.2, speedAt(x) * air - 1.2);
      out.push({ k: 2, x: r2(x), w: r2(Math.min(2.6 + rnd() * (1.1 + 2.2 * hard), room)) });
    }
  }
  return out;
}

/* Obstacles become ordinary line segments, so the runner physics does not
   need to learn anything new. Walls and roofs reach well past the runner in
   both directions: going around one is not the idea. */
export function hardSegs(obs){
  const segs = [];
  for (const o of obs){
    if (o.k === 0){
      const x2 = o.x + WALL_W;
      segs.push({ x1:o.x, y1:o.h, x2:x2,   y2:o.h });
      segs.push({ x1:o.x, y1:-5.5, x2:o.x, y2:o.h });
      segs.push({ x1:x2,  y1:-5.5, x2:x2,  y2:o.h });
    } else if (o.k === 1){
      const x2 = o.x + ROOF_W;
      segs.push({ x1:o.x, y1:o.y, x2:x2,   y2:o.y });
      segs.push({ x1:o.x, y1:o.y, x2:o.x,  y2:o.y + 14 });
      segs.push({ x1:x2,  y1:o.y, x2:x2,   y2:o.y + 14 });
    }
  }
  return segs;
}

/* chalk does not stick in a pit, which is the whole point of a pit */
export function inPit(obs, x){
  for (const o of obs){
    if (o.k === 2 && x > o.x && x < o.x + o.w) return true;
  }
  return false;
}

/* the seed everybody shares on a given day */
export function daySeed(now){
  const d = new Date(now === undefined ? Date.now() : now);
  const key = d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
  return (key * 2654435761) >>> 0;
}
export function dayStamp(now){
  const d = new Date(now === undefined ? Date.now() : now);
  const p = n => (n < 10 ? '0' : '') + n;
  return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate());
}

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
           dist: 0, leaps: 0, banked: 0, float: 0, brake: 0, cd: 0, stuck: 0 };
}

/* Running into a wall used to mean grinding against it forever, because the
   collision just pushed the runner back and the next tick pushed them
   forward again. Not getting anywhere for a third of a second is a crash. */
export const STUCK_S = 0.34;

export function pullBrake(r){
  if (!r.alive || r.brake > 0 || r.cd > 0) return false;
  r.brake = BRAKE_S;
  r.cd = BRAKE_CD;
  return true;
}

export function stepRunner(r, segs, dt, speed, hard){
  if (!r.alive) return r;
  const wasX = r.x;

  const floating = r.float > 0;
  if (floating) r.float = Math.max(0, r.float - dt);
  if (r.brake > 0) r.brake = Math.max(0, r.brake - dt);
  if (r.cd > 0)    r.cd    = Math.max(0, r.cd - dt);
  r.vy -= GRAVITY * (floating ? FLOAT_G : 1) * dt;

  const pace = (speed === undefined ? speedAt(r.dist) : speed) * (r.brake > 0 ? BRAKE_MUL : 1);
  let nx = r.x + pace * dt;
  let ny = r.y + r.vy * dt;
  r.grounded = false;

  /* Two passes settles the common case of landing in the crook of two
     strokes without the runner jittering between them. */
  const resolve = list => {
    if (!list) return;
    for (let i = 0; i < list.length; i++){
      const s = list[i];
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
  };
  for (let pass = 0; pass < 2; pass++){ resolve(segs); resolve(hard); }

  r.x = nx; r.y = ny;
  r.dist = Math.max(r.dist, r.x - START_X);
  if (r.y < DEATH_Y) r.alive = false;

  /* nowhere for a third of a second means something is in the way */
  if (r.x <= wasX + 1e-4) r.stuck += dt;
  else r.stuck = 0;
  if (r.stuck > STUCK_S) r.alive = false;
  return r;
}

/* ---------- the practice partner -------------------------------------------
   A judge opening the link on their own would otherwise reach a lobby that
   says "need one more player" and close the tab having seen nothing. The bot
   is deliberately mediocre: it lays flat ground a fixed distance ahead and
   runs out of chalk if the runner is quick, so a solo game is a real game
   rather than a cutscene.
   ------------------------------------------------------------------------ */
/* what height the ground should be at a given x, given what is in the way.
   A ramp starts four metres before a wall so the runner can walk up it. */
export function botTargetY(obs, x){
  let y = 1.2;
  for (const o of obs){
    if (o.k === 2 && x > o.x - 0.3 && x < o.x + o.w + 0.3) return null;  /* no chalk */
    if (o.k === 0){
      const top = o.h + 0.45;
      if (x > o.x - 4 && x <= o.x)      y = Math.max(y, 1.2 + (top - 1.2) * (x - (o.x - 4)) / 4);
      else if (x > o.x && x < o.x + WALL_W + 1.2) y = Math.max(y, top);
    }
  }
  for (const o of obs){
    if (o.k === 1 && x > o.x - 1.2 && x < o.x + ROOF_W + 1.2){
      y = Math.min(y, o.y - 1.05);
    }
  }
  return y;
}

export function botStroke(runner, from, ink, obs){
  const target = runner.x + 11;
  if (from >= target) return null;
  const list = obs || [];
  const pts = [];
  let x = Math.max(from, runner.x - 2);
  let spend = 0;
  let y0 = botTargetY(list, x);
  if (y0 !== null) pts.push(x, y0);
  while (x < target && spend < ink - 0.5){
    const step = Math.min(0.5, target - x);
    const nx = x + step;
    const ny = botTargetY(list, nx);
    if (ny === null){
      /* a pit: leave it empty and pick the line up on the far side */
      x = nx;
      if (pts.length >= 4) break;
      pts.length = 0;
      continue;
    }
    if (!pts.length) pts.push(x, botTargetY(list, x) === null ? ny : botTargetY(list, x));
    spend += Math.hypot(step, ny - (pts[pts.length - 1] || ny));
    x = nx;
    pts.push(x, ny);
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
    this.day = null;         /* and today's, which resets itself */
    this.dayOf = '';
    this.seed = 0;
    this.obs = [];
    this.hard = [];
  }

  /* ---------- the stored leaderboard --------------------------------------- */
  async loadTop(){
    if (this.top) return this.top;
    try { this.top = (await this.state.storage.get('top')) || []; }
    catch { this.top = []; }
    return this.top;
  }
  /* Today's list, which empties itself when the date turns over. One list
     that only ever grows stops being worth looking at after a week; a list
     you can still get onto today is a reason to come back. */
  async loadDay(){
    if (this.day && this.dayOf === dayStamp()) return this.day;
    let saved = null;
    try { saved = await this.state.storage.get('day'); } catch {}
    this.dayOf = dayStamp();
    this.day = (saved && saved.on === this.dayOf) ? saved.rows : [];
    return this.day;
  }
  async recordScore(name, metres, partner){
    if (!(metres > 0)) return;
    const row = { n: name, m: Math.floor(metres), w: partner || '', at: Date.now() };

    const top = await this.loadTop();
    top.push(row);
    top.sort((a, b) => b.m - a.m);
    this.top = top.slice(0, TOP_N);
    try { await this.state.storage.put('top', this.top); } catch {}

    const day = await this.loadDay();
    day.push(row);
    day.sort((a, b) => b.m - a.m);
    this.day = day.slice(0, TOP_N);
    try { await this.state.storage.put('day', { on: this.dayOf, rows: this.day }); } catch {}
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
      const day = await this.loadDay();
      return new Response(JSON.stringify({ top, day, on: this.dayOf }), {
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

      /* somebody coming back to a seat that was being kept for them */
      if (m.key){
        const back = this.players.find(x => x.key === m.key);
        if (back){
          if (back.ws && back.ws !== ws){ try { back.ws.close(1000, 'replaced'); } catch {} }
          this.sockets.delete(back.ws);
          back.ws = ws; back.gone = 0;
          this.sockets.set(ws, back);
          send(ws, { t:'you', id: back.id, name: back.name, key: back.key, back: true });
          this.pushAll();
          return;
        }
        /* the seat is gone, so fall through and treat it as a fresh arrival */
      }

      if (m.create && this.players.length > 0){ send(ws, { t:'taken' }); return; }
      if (this.phase !== 'lobby'){ send(ws, { t:'closed' }); return; }
      if (this.players.length >= MAX_PLAYERS){ send(ws, { t:'full' }); return; }
      const p = {
        id: 'p' + (++this.seq),
        key: seatKey(),
        name: cleanName(m.name),
        ws, gone: 0, role: 'drawer', ink: INK_MAX, score: 0, best: 0
      };
      this.players.push(p);
      this.sockets.set(ws, p);
      send(ws, { t:'you', id: p.id, name: p.name, key: p.key });
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
    if (m.t === 'brake' && this.phase === 'play' && p.role === 'runner'){
      pullBrake(this.runner);
      return;
    }
    if (m.t === 'draw' && this.phase === 'play' && p.role === 'drawer'){
      this.drawFrom(p, m.pts);
      return;
    }
  }

  /* A dropped socket in the middle of a match is usually a tunnel, a locked
     phone or a tab the browser put to sleep, not somebody quitting. So the
     seat is kept and the round holds still until they are back or the wait
     runs out. In the lobby there is nothing to hold, so they just leave. */
  onClose(ws){
    const p = this.sockets.get(ws);
    this.sockets.delete(ws);
    if (!p || p.ws !== ws) return;
    p.ws = null;

    /* only a round in progress is worth holding up. Between rounds the loop is
       stopped, so a held seat would never be released. */
    if (this.phase !== 'play' || this.solo){
      this.players = this.players.filter(x => x !== p);
      if (this.players.length === 0){
        this.stopLoop(); this.phase = 'lobby'; this.round = 0; this.solo = false;
      } else this.pushAll();
      return;
    }
    p.gone = Date.now();
    this.pushAll();
  }

  /* who we are waiting for, if anyone */
  waitingFor(){ return this.players.find(p => p.gone); }

  /* the wait is over: they are out, and the round goes on without them */
  dropStale(now){
    const stale = this.players.filter(p => p.gone && now - p.gone > HOLD_MS);
    if (!stale.length) return false;
    for (const p of stale) this.players = this.players.filter(x => x !== p);
    if (this.players.length === 0){
      this.stopLoop(); this.phase = 'lobby'; this.round = 0; this.solo = false;
      return true;
    }
    if (this.phase === 'play' && stale.some(p => p.id === this.runnerId)){
      this.endRound('The runner left');
      return true;
    }
    this.pushAll();
    return true;
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
      if (inPit(this.obs, x1) || inPit(this.obs, x2)) continue;

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
    /* everybody in the room runs the same level in a given round */
    this.seed = (daySeed() ^ ((this.round + 1) * 0x9E3779B1)) >>> 0;
    this.obs = makeLevel(this.seed);
    this.hard = hardSegs(this.obs);
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
      for (const p of this.players){ try { p.ws && p.ws.close(1000, 'idle'); } catch {} }
      this.players = []; this.sockets.clear();
      this.stopLoop(); this.phase = 'lobby';
      return;
    }

    /* Somebody's connection went. Everything stops, including the clock the
       runner is measured against, until they are back or their time runs out.
       The countdown is pushed along too, so nobody loses their head start. */
    if (this.waitingFor()){
      if (this.dropStale(now)) return;
      /* only push the countdown along if it has not already finished, or a
         long wait would hand the runner a second head start */
      if (now < this.runAt) this.runAt += Math.round(dt * 1000);
      this.pushAll();
      return;
    }

    for (const p of this.players){
      if (p.role === 'drawer') p.ink = Math.min(INK_MAX, p.ink + INK_REFILL * dt);
    }
    if (this.solo){
      this.botInk = Math.min(INK_MAX, this.botInk + INK_REFILL * dt);
      this.botDraw();
    }

    if (now >= this.runAt) stepRunner(this.runner, this.segs, dt, undefined, this.hard);

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
    const stroke = botStroke(this.runner, this.botFrom, this.botInk, this.obs);
    if (!stroke) return;
    const pts = stroke.pts;
    for (let i = 0; i + 3 < pts.length; i += 2){
      const len = Math.hypot(pts[i+2] - pts[i], pts[i+3] - pts[i+1]);
      if (len < MIN_SEG || len > MAX_SEG || this.botInk < len) break;
      if (inPit(this.obs, pts[i]) || inPit(this.obs, pts[i+2])) continue;
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
      roster: this.players.map(o => ({ i:o.id, n:o.name, s:o.score, b:o.best,
                                       r:o.role, off:o.gone ? 1 : 0 }))
    };
    const waiting = this.waitingFor();
    if (waiting){
      msg.held = waiting.name;
      msg.hold = Math.max(0, Math.ceil((HOLD_MS - (Date.now() - waiting.gone)) / 1000));
    }
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
        bk: this.runner.brake > 0 ? 1 : 0,
        bc: Math.ceil(this.runner.cd),
        lv: levelAt(d) + 1,
        ms: nextMilestone(d),
        sp: r2(speedAt(d))
      };
      msg.s = this.segs
        .filter(s => s.x2 > this.runner.x - SEND_BACK && s.x1 < this.runner.x + SEND_FWD)
        .map(s => [s.x1, s.y1, s.x2, s.y2]);
      /* the obstacles in view. Both players see the same ones, and the drawer
         needs to see them sooner than the runner does. */
      msg.o = this.obs
        .filter(o => o.x > this.runner.x - 20 && o.x < this.runner.x + SEND_FWD)
        .map(o => o.k === 0 ? [0, o.x, o.h] : o.k === 1 ? [1, o.x, o.y] : [2, o.x, o.w]);
    }
    return msg;
  }

  pushAll(){
    for (const p of this.players){ if (p.ws) send(p.ws, this.sliceFor(p)); }
  }
}

/* ---------- helpers ------------------------------------------------------------- */
function send(ws, o){ try { ws && ws.send(JSON.stringify(o)); } catch {} }
/* enough to make a seat unguessable by anyone who is not in the room */
function seatKey(){
  let s = '';
  for (let i = 0; i < 4; i++) s += Math.random().toString(36).slice(2, 10);
  return s.slice(0, 24);
}
function r2(n){ return Math.round(n * 100) / 100; }
function num(v){ v = Number(v); return isFinite(v) ? v : null; }
function cleanName(n){
  const s = String(n || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 12);
  return s || 'Player';
}
