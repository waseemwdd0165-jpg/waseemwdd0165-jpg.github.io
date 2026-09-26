/* ==========================================================================
   A whole match against the Durable Object, with no Cloudflare involved.

   The Arena class only touches WebSockets through `send`, so a socket here is
   an object that records what it was told. Timers are captured rather than
   waited on, because three rounds with a four second gap is twelve seconds of
   a test doing nothing.
   ========================================================================== */

import { Arena } from '../src/index.js';
import { EXIT, ROUNDS, MAX_PLAYERS, solid } from '../public/game.js';

/* ---------- controllable timers ------------------------------------------ */
const pending = [];
const realSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = (fn, ms) => { pending.push(fn); return pending.length; };
globalThis.setInterval = () => 0;      /* the test drives tick() itself */
globalThis.clearInterval = () => {};
function flushTimers(){
  const q = pending.splice(0, pending.length);
  q.forEach(fn => fn());
}

let pass = 0, fail = 0;
const check = (name, ok, extra) => {
  if (ok){ pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? '   >> ' + extra : '')); }
};

function sock(){
  const s = { msgs: [], send(j){ s.msgs.push(JSON.parse(j)); }, addEventListener(){} };
  return s;
}
function join(a, name, opts){
  const w = sock();
  a.onMessage(w, Object.assign({ t: 'join', name }, opts || {}));
  return w;
}
const last = (w, t) => [...w.msgs].reverse().find(m => m.t === t);

console.log('\npitch black - a full match\n');

/* ---------- lobby --------------------------------------------------------- */
const a = new Arena({}, {});
const w1 = join(a, 'Waseem');
const w2 = join(a, 'Asha');
const w3 = join(a, 'Rahul');

check('everyone got in', a.players.length === 3, a.players.length);
check('the first player is told they host', last(w1, 'you').host === true);
check('later players are not', last(w2, 'you').host === false);
check('each player gets a distinct id',
      new Set(a.players.map(p => p.id)).size === 3);
check('the lobby slice lists everyone', last(w3, 'state').roster.length === 3);

/* a second join on the same socket must not clone the player */
a.onMessage(w2, { t: 'join', name: 'Asha again' });
check('joining twice on one socket is ignored', a.players.length === 3, a.players.length);

/* only the host may start */
a.onMessage(w2, { t: 'start' });
check('a non-host cannot start the match', a.phase === 'lobby', a.phase);

/* ---------- the match starts ---------------------------------------------- */
a.onMessage(w1, { t: 'start' });
check('the match started', a.phase === 'play', a.phase);
check('exactly one hunter', a.players.filter(p => p.role === 'hunter').length === 1);
check('nobody spawns in a wall',
      a.players.every(p => !solid(Math.floor(p.x), Math.floor(p.y))));
check('nobody shares a spawn',
      new Set(a.players.map(p => p.x + ',' + p.y)).size === 3);
const hunter0 = a.players.find(p => p.role === 'hunter');
check('runners start well away from the hunter',
      a.players.filter(p => p.role === 'runner')
        .every(r => Math.hypot(r.x - hunter0.x, r.y - hunter0.y) > 5));

/* ---------- movement, walls ------------------------------------------------ */
const mover = a.players[1];
const startAt = { x: mover.x, y: mover.y };
a.onMessage(w2, { t: 'in', ax: 1, ay: 0 });
for (let i = 0; i < 12; i++){ a.lastTick = Date.now() - 50; a.tick(); }
check('input moves a player', mover.x !== startAt.x || mover.y !== startAt.y,
      startAt.x + ' -> ' + mover.x);

let escaped = 0;
for (let i = 0; i < 400; i++){
  const ang = (i * 0.41) % (Math.PI * 2);
  a.players.forEach((p, k) => a.onMessage([w1, w2, w3][k],
    { t: 'in', ax: Math.cos(ang + k), ay: Math.sin(ang + k) }));
  a.lastTick = Date.now() - 50;
  if (a.phase === 'play') a.tick();
  if (a.players.every(p => !solid(Math.floor(p.x), Math.floor(p.y)))) continue;
  escaped++;
}
check('400 ticks of shoving at walls and nobody got through', escaped === 0, escaped);
check('everyone is still inside the map',
      a.players.every(p => p.x > 0 && p.y > 0 && p.x < 38 && p.y < 22));

/* ---------- bad input ------------------------------------------------------ */
a.onMessage(w2, { t: 'in', ax: 'banana', ay: Infinity });
a.lastTick = Date.now() - 50;
a.tick();
check('nonsense input does not break the simulation',
      isFinite(mover.x) && isFinite(mover.y), mover.x + ',' + mover.y);
a.onMessage(w2, { t: 'in', ax: 9999, ay: 9999 });
a.lastTick = Date.now() - 50;
a.tick();
check('input is clamped, so nobody can teleport',
      Math.abs(mover.ax) <= 1 && Math.abs(mover.ay) <= 1, mover.ax + ',' + mover.ay);

/* ---------- catching and escaping ------------------------------------------ */
{
  const fresh = new Arena({}, {});
  const s1 = join(fresh, 'H'), s2 = join(fresh, 'R');
  fresh.onMessage(s1, { t: 'start' });
  const h = fresh.players.find(p => p.role === 'hunter');
  const r = fresh.players.find(p => p.role === 'runner');
  const before = h.score;
  r.x = h.x + 0.2; r.y = h.y;
  fresh.lastTick = Date.now() - 50;
  fresh.tick();
  check('a caught runner joins the hunt', r.role === 'hunter', r.role);
  check('catching pays 50', h.score === before + 50, before + ' -> ' + h.score);
  void s2;
}
{
  const fresh = new Arena({}, {});
  const s1 = join(fresh, 'H'), s2 = join(fresh, 'R');
  fresh.onMessage(s1, { t: 'start' });
  const r = fresh.players.find(p => p.role === 'runner');
  const before = r.score;
  r.x = EXIT.x; r.y = EXIT.y;
  fresh.lastTick = Date.now() - 50;
  fresh.tick();
  check('reaching the exit is an escape', r.escaped === true);
  check('escaping pays 100', r.score === before + 100, before + ' -> ' + r.score);
  check('the round ends once no runners are left', fresh.phase === 'result', fresh.phase);
  check('the result names what happened', /got out/.test(fresh.resultBig), fresh.resultBig);
  void s2;
}

/* ---------- three rounds, then the end ------------------------------------- */
{
  const m = new Arena({}, {});
  const s1 = join(m, 'A'), s2 = join(m, 'B'), s3 = join(m, 'C');
  m.onMessage(s1, { t: 'start' });

  const hunters = [];
  for (let round = 0; round < ROUNDS; round++){
    hunters.push(m.players.findIndex(p => p.role === 'hunter'));
    m.players.filter(p => p.role === 'runner').forEach(r => {
      r.x = EXIT.x; r.y = EXIT.y;
    });
    m.lastTick = Date.now() - 50;
    m.tick();
    flushTimers();
  }
  check('the match reaches the end', m.phase === 'over', m.phase);
  check('three rounds were played', m.round === ROUNDS, m.round);
  check('the hunter rotates round to round', new Set(hunters).size === ROUNDS,
        JSON.stringify(hunters));
  const scores = m.players.map(p => p.score);
  check('scores are never negative', scores.every(s => s >= 0), JSON.stringify(scores));
  check('scores are multiples of fifty', scores.every(s => s % 50 === 0), JSON.stringify(scores));
  check('the final slice still has the roster',
        last(s2, 'state').roster.length === 3);
  check('only the host is told they can restart',
        last(s1, 'state').host === true && last(s3, 'state').host === false);

  /* play again */
  m.onMessage(s2, { t: 'again' });
  check('a non-host cannot restart', m.phase === 'over', m.phase);
  m.onMessage(s1, { t: 'again' });
  check('the host can restart', m.phase === 'play', m.phase);
  check('the round counter resets', m.round === 0, m.round);
  check('scores reset', m.players.every(p => p.score === 0),
        JSON.stringify(m.players.map(p => p.score)));
}

/* ---------- people leaving -------------------------------------------------- */
{
  const m = new Arena({}, {});
  const s1 = join(m, 'A'), s2 = join(m, 'B'), s3 = join(m, 'C');
  m.onMessage(s1, { t: 'start' });
  m.onClose(s2);
  check('a player who drops is removed', m.players.length === 2, m.players.length);
  check('the game carries on', m.phase === 'play', m.phase);

  m.onClose(s1);
  check('the host leaving promotes the next player',
        m.players.length === 1 && m.isHost(m.players[0]));

  m.onClose(s3);
  check('an empty room resets to the lobby', m.phase === 'lobby' && m.players.length === 0,
        m.phase + '/' + m.players.length);
}

/* ---------- the door ------------------------------------------------------- */
{
  const m = new Arena({}, {});
  const host = join(m, 'A');
  join(m, 'B');
  m.onMessage(host, { t: 'start' });
  const latecomer = sock();
  m.onMessage(latecomer, { t: 'join', name: 'Late' });
  check('a late joiner is turned away', !!last(latecomer, 'closed'),
        JSON.stringify(latecomer.msgs));
  check('and is not added', m.players.length === 2, m.players.length);
}
{
  const m = new Arena({}, {});
  for (let i = 0; i < MAX_PLAYERS; i++) join(m, 'P' + i);
  const extra = sock();
  m.onMessage(extra, { t: 'join', name: 'Ninth' });
  check('the ninth player is refused', !!last(extra, 'full'));
  check('and the room stays at eight', m.players.length === MAX_PLAYERS, m.players.length);
}
{
  const m = new Arena({}, {});
  join(m, 'Occupant');
  const wouldbe = sock();
  m.onMessage(wouldbe, { t: 'join', name: 'Host2', create: true });
  check('creating a room on taken letters is refused', !!last(wouldbe, 'taken'));
  check('and the existing room is untouched', m.players.length === 1);
}

globalThis.setTimeout = realSetTimeout;
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
