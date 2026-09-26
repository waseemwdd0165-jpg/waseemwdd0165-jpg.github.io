/* ==========================================================================
   Pitch Black - Worker and Durable Object

   One Durable Object per room. It holds the only real copy of the game and
   every player talks to it over a WebSocket, which is what makes the game
   work across different networks: nobody has to accept an incoming
   connection, they all dial out.

   The other reason this exists is honesty. In the peer-to-peer version the
   host sent every position to every client and each client decided what to
   draw, so opening the console showed you the whole map. Here `sliceFor`
   is the only way a player learns anything, and it runs the same visibility
   test the renderer does. A player is not sent a position it cannot see, so
   there is nothing in the console to read.
   ========================================================================== */

import {
  SPAWN, EXIT, TICK, ROUND_MS, ROUNDS, CATCH, MAX_PLAYERS,
  speedOf, rangeOf, fovOf, moveWithWalls, canSee, facingOpen
} from '../public/game.js';

export default {
  async fetch(request, env){
    const url = new URL(request.url);

    if (url.pathname === '/api/ws'){
      const code = (url.searchParams.get('room') || '').toUpperCase();
      if (!/^[A-Z]{4}$/.test(code)){
        return new Response('bad room code', { status: 400 });
      }
      const id = env.ARENA.idFromName(code);
      return env.ARENA.get(id).fetch(request);
    }

    /* anything else is the game itself, served from public/ */
    return env.ASSETS.fetch(request);
  }
};

export class Arena {
  constructor(state, env){
    this.state = state;
    this.env = env;
    this.sockets = new Map();   /* ws -> player */
    this.players = [];
    this.phase = 'lobby';
    this.round = 0;
    this.endsAt = 0;
    this.lastTick = 0;
    this.timer = null;
    this.seq = 0;
    this.resultBig = '';
    this.resultSmall = '';
  }

  async fetch(request){
    if (request.headers.get('Upgrade') !== 'websocket'){
      return new Response('expected websocket', { status: 426 });
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();

    server.addEventListener('message', (e) => {
      let m;
      try { m = JSON.parse(e.data); } catch { return; }
      this.onMessage(server, m);
    });
    const drop = () => this.onClose(server);
    server.addEventListener('close', drop);
    server.addEventListener('error', drop);

    return new Response(null, { status: 101, webSocket: client });
  }

  /* ---------- messages in ------------------------------------------------ */
  onMessage(ws, m){
    if (m.t === 'join'){
      if (this.sockets.has(ws)) return;
      /* A host picks its own four letters, so it has to be told when those
         letters already belong to a live room and try again. */
      if (m.create && this.players.length > 0){ send(ws, { t: 'taken' }); return; }
      if (this.phase !== 'lobby'){ send(ws, { t: 'closed' }); return; }
      if (this.players.length >= MAX_PLAYERS){ send(ws, { t: 'full' }); return; }

      const p = {
        id: 'p' + (++this.seq),
        name: String(m.name || 'Player').slice(0, 12) || 'Player',
        ws,
        x: 1.5, y: 1.5, dir: 0,
        role: 'runner', escaped: false, score: 0,
        ax: 0, ay: 0
      };
      this.players.push(p);
      this.sockets.set(ws, p);
      send(ws, { t: 'you', id: p.id, host: this.players[0] === p });
      this.pushAll();
      return;
    }

    const p = this.sockets.get(ws);
    if (!p) return;

    if (m.t === 'in'){
      p.ax = clamp1(m.ax);
      p.ay = clamp1(m.ay);
      return;
    }
    if (m.t === 'start' && this.isHost(p) && this.phase === 'lobby'){
      this.startMatch();
      return;
    }
    if (m.t === 'again' && this.isHost(p) && this.phase === 'over'){
      this.startMatch();
      return;
    }
  }

  onClose(ws){
    const p = this.sockets.get(ws);
    this.sockets.delete(ws);
    if (!p) return;
    this.players = this.players.filter(x => x !== p);
    if (this.players.length === 0){
      this.stopLoop();
      this.phase = 'lobby';
      this.round = 0;
      return;
    }
    /* If everyone still running has gone, the round has no reason to continue */
    if (this.phase === 'play' && this.runnersLeft() === 0) this.endRound();
    else this.pushAll();
  }

  isHost(p){ return this.players[0] === p; }
  runnersLeft(){
    return this.players.filter(p => p.role === 'runner' && !p.escaped).length;
  }

  /* ---------- match flow -------------------------------------------------- */
  startMatch(){
    this.round = 0;
    this.players.forEach(p => { p.score = 0; });
    this.beginRound();
  }

  beginRound(){
    const ps = this.players;
    const hunterIdx = this.round % ps.length;
    let nth = 0;
    ps.forEach((p, i) => {
      p.role = (i === hunterIdx) ? 'hunter' : 'runner';
      p.escaped = false;
      p.ax = 0; p.ay = 0;
      const sp = (i === hunterIdx) ? SPAWN[0] : SPAWN[1 + (nth++ % 4)];
      const at = sp || SPAWN[0];
      p.x = at.x; p.y = at.y; p.dir = facingOpen(at);
    });
    this.phase = 'play';
    this.endsAt = Date.now() + ROUND_MS;
    this.lastTick = Date.now();
    this.resultBig = ''; this.resultSmall = '';
    this.startLoop();
    this.pushAll();
  }

  startLoop(){
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), TICK);
  }
  stopLoop(){
    if (this.timer){ clearInterval(this.timer); this.timer = null; }
  }

  tick(){
    if (this.phase !== 'play'){ return; }
    const now = Date.now();
    const dt = Math.min(0.2, (now - this.lastTick) / 1000);
    this.lastTick = now;

    for (const p of this.players){
      if (p.escaped) continue;
      let ax = p.ax, ay = p.ay;
      const mag = Math.hypot(ax, ay);
      if (mag > 1){ ax /= mag; ay /= mag; }
      if (mag > 0.08){
        p.dir = Math.atan2(ay, ax);
        const sp = speedOf(p.role) * dt;
        moveWithWalls(p, ax * sp, ay * sp);
      }
    }

    /* catches: a caught runner joins the hunt, so the odds shift all game */
    const hunters = this.players.filter(p => p.role === 'hunter' && !p.escaped);
    for (const r of this.players){
      if (r.role !== 'runner' || r.escaped) continue;
      for (const h of hunters){
        if (dist2(h, r) < CATCH * CATCH){
          r.role = 'hunter';
          h.score += 50;
          break;
        }
      }
    }

    /* escapes */
    for (const r of this.players){
      if (r.role !== 'runner' || r.escaped) continue;
      if (dist2(r, EXIT) < 0.45 * 0.45){
        r.escaped = true;
        r.score += 100;
      }
    }

    if (this.runnersLeft() === 0 || now >= this.endsAt) this.endRound();
    else this.pushAll();
  }

  endRound(){
    this.phase = 'result';
    this.stopLoop();
    const out = this.players.filter(p => p.escaped).length;
    this.resultBig = out ? (out === 1 ? 'One got out' : out + ' got out') : 'Nobody got out';
    this.resultSmall = 'Round ' + (this.round + 1) + ' of ' + ROUNDS;
    this.pushAll();

    setTimeout(() => {
      if (this.players.length === 0) return;
      this.round += 1;
      if (this.round >= ROUNDS){
        this.phase = 'over';
        this.pushAll();
      } else {
        this.beginRound();
      }
    }, 4000);
  }

  /* ---------- what each player is allowed to know ------------------------- */
  /* The whole point of the rewrite. A player gets their own state, the
     roster without positions, and the positions of exactly the players their
     own torch reaches. Nothing else crosses the wire, so there is nothing to
     find in the console. */
  sliceFor(p){
    const playing = this.phase === 'play' || this.phase === 'result';
    const msg = {
      t: 'state',
      ph: this.phase,
      round: this.round,
      rounds: ROUNDS,
      host: this.isHost(p),
      left: this.phase === 'play' ? Math.max(0, this.endsAt - Date.now()) : 0,
      big: this.resultBig,
      small: this.resultSmall,
      roster: this.players.map(o => ({
        i: o.id, n: o.name, s: o.score, r: o.role, e: o.escaped
      }))
    };

    if (!playing) return msg;

    msg.me = { x: r2(p.x), y: r2(p.y), d: r2(p.dir), r: p.role, e: p.escaped, s: p.score };

    const range = rangeOf(p.role), fov = fovOf(p.role);
    msg.see = [];
    for (const o of this.players){
      if (o === p || o.escaped) continue;
      if (!canSee(p, p.dir, range, fov, o.x, o.y)) continue;
      msg.see.push({ i: o.id, n: o.name, x: r2(o.x), y: r2(o.y), r: o.role });
    }
    return msg;
  }

  pushAll(){
    for (const p of this.players){
      send(p.ws, this.sliceFor(p));
    }
  }
}

/* ---------- helpers ------------------------------------------------------- */
function send(ws, obj){
  try { ws.send(JSON.stringify(obj)); } catch { /* socket already gone */ }
}
function clamp1(v){
  v = Number(v);
  if (!isFinite(v)) return 0;
  return v < -1 ? -1 : v > 1 ? 1 : v;
}
function dist2(a, b){ const dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy; }
function r2(n){ return Math.round(n * 100) / 100; }
