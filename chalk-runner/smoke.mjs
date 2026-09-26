/* ==========================================================================
   Chalk Runner - browser checks

   The client is not testable in a real browser from here, so this runs it in
   a tiny hand written DOM and drives it with the messages the server actually
   sends. It will not tell you whether the game looks good. It will tell you
   whether the screen says the right numbers and whether anything throws.
   ========================================================================== */
import fs from 'fs';
import vm from 'vm';
import { makeWindow } from './domshim.mjs';

import { fileURLToPath } from 'url';
const html = fs.readFileSync(fileURLToPath(new URL('./client.html', import.meta.url)), 'utf8');
const js = /<script>([\s\S]*)<\/script>/.exec(html)[1];

const win = makeWindow();
const ctx = vm.createContext(win);
ctx.globalThis = ctx; ctx.self = ctx;
ctx.setTimeout = setTimeout; ctx.clearTimeout = clearTimeout;
ctx.setInterval = setInterval; ctx.clearInterval = clearInterval;
ctx.console = console; ctx.Math = Math; ctx.JSON = JSON; ctx.Date = Date;
ctx.isFinite = isFinite; ctx.Number = Number; ctx.String = String;
ctx.Promise = Promise; ctx.Float32Array = Float32Array;

let failed = 0;
function ok(n,c,x){ console.log((c?'  ok   ':'  FAIL ')+n+(c?'':'   >> '+x)); if(!c) failed++; }

try { vm.runInContext(js, ctx, { filename:'client.js' }); }
catch(e){ console.log('THREW ON LOAD: ' + e.stack); process.exit(1); }

const D = win.document, E = id => D.getElementById(id);
await new Promise(r=>setTimeout(r,120));

ctx.sheet('top');
await new Promise(r=>setTimeout(r,120));
/* two tabs on one laptop are two players; the seat must not leak between them */
ctx.code = 'ABCD'; ctx.myKey = 'k1'; ctx.myName = 'Ann'; ctx.seatStore(true);
ok('a seat is kept per tab, not per browser',
   win.sessionStorage.getItem('cr.seat') !== null && win.localStorage.getItem('cr.seat') === null,
   'session=' + win.sessionStorage.getItem('cr.seat') + ' local=' + win.localStorage.getItem('cr.seat'));
ctx.forgetSeat();
ok('and it can be let go', ctx.seatStore() === null);

ok('the record list loads into its sheet', /312/.test(E('top-list').innerHTML), E('top-list').innerHTML.slice(0,80));
ok('the sheet opens', !E('sheet').classList.contains('hidden'));
ok("today's board is separate", /Eve/.test(E('day-list').innerHTML) && !/Eve/.test(E('top-list').innerHTML),
   E('day-list').innerHTML.slice(0,70));
ctx.sheet(null);
ok('and closes again', E('sheet').classList.contains('hidden'));

function base(o){
  return Object.assign({ t:'state', ph:'play', round:0, rounds:4, host:true, role:'drawer',
    solo:false, ink:20, inkMax:34, result:'', cd:0,
    roster:[{i:'p1',n:'Ann',s:0,b:0,r:'runner'},{i:'p2',n:'Bob',s:0,b:0,r:'drawer'}],
    r:{ x:5, y:1.56, g:1, a:1, d:0, lp:0, fl:0, bk:0, bc:0, lv:1, ms:50, sp:4.6 },
    s:[[-1,1.2,13,1.2]] }, o);
}
const S = ctx.onServer, btn = { disabled:false, textContent:'' };

S({ t:'state', ph:'lobby', host:true, role:'drawer', solo:false, ink:34, inkMax:34,
    result:'', round:0, rounds:4, roster:[{i:'p1',n:'Ann',s:0,b:0,r:'drawer'}] }, btn, true, '');
/* the look ahead strip, the chalk tray and the QR */
S(base({ ph:'play', role:'drawer', o:[[0, 20, 2.1], [2, 48, 3.4]],
  r:{ x:12, y:1.6, g:1, a:1, d:10, lp:0, fl:0, bk:0, bc:0, lv:1, ms:50, sp:4.6 } }), btn, true, '');
ok('the drawer is told what is coming', /wall/.test(E('ahead').innerHTML), E('ahead').innerHTML);
ok('with how high to build', /2.1 m high/.test(E('ahead').innerHTML));
ok('and how far off it is', /in 8 m/.test(E('ahead').innerHTML), E('ahead').innerHTML);
ok('the one after it too', /no chalk/.test(E('ahead').innerHTML));
ok('and nothing already passed', !/in -/.test(E('ahead').innerHTML));

ok('there are three sticks of chalk', ctx.CHALKS.length === 3);
ok('the board follows the drawer, not the watcher', (function(){
  ctx.chalkPick = 2;
  const used = [];
  const fake = { lineCap:'', lineJoin:'', strokeStyle:'', lineWidth:0,
                 stroke(){ used.push(this.strokeStyle); } };
  ctx.strokeChalk(fake, {}, 9, 3, 1);
  return used[1] === ctx.CHALKS[1].hard;
})());

ok('a QR of the join link builds', (function(){
  const q = ctx.QR.build('https://chalk-runner.test/?room=ABCD');
  return !!q && q.size === 17 + q.version * 4;
})());

ok('the lobby renders', /Ann/.test(E('lobby-players').innerHTML), E('lobby-players').innerHTML);

S(base({ cd:3 }), btn, true, '');
ok('the countdown banner shows', E('banner').style.display === 'block');
ok('and it counts', E('banner-big').textContent === 3, E('banner-big').textContent);

S(base({}), btn, true, '');
await new Promise(r=>setTimeout(r,120));
ok('the board is showing', E('gate').classList.contains('hidden'));
ok('the chalk bar is on for a drawer', !E('inkwrap').classList.contains('hidden'));
ok('the pad is hidden for a drawer', E('pad').style.display === 'none');

/* obstacles: they must render without throwing, and block the chalk */
S(base({ o: [[0, 20, 2.1], [1, 40, 3.3], [2, 60, 3.4]] }), btn, true, '');
await new Promise(r=>setTimeout(r,120));
ok('a board with obstacles still draws', true);
ok('chalk is refused inside a pit', ctx.inPit(61) === true);
ok('and allowed outside one', ctx.inPit(58) === false);
ctx.pending = [];
ctx.penTo(61, 1.2);
ok('so the drawer cannot even start a line there', ctx.pending.length === 0, ctx.pending.length);

S(base({ role:'runner', r:{ x:160, y:2.1, g:1, a:1, d:155, lp:1, fl:0, bk:0, bc:0, lv:4, ms:200, sp:5.86 } }), btn, true, '');
await new Promise(r=>setTimeout(r,120));
ok('the distance shows', E('dist').textContent === '155 m', E('dist').textContent);
ok('the leap button appears', !E('leap').classList.contains('hidden'));
ok('the leap count shows', E('leap-n').textContent === 1, E('leap-n').textContent);
ok('the milestone countdown reads right', E('tracklbl').textContent === '45 m to level 5', E('tracklbl').textContent);
ok('the pad is on for a runner', E('pad').style.display === 'flex');
ok('the music started', ctx.music.playing());

const runPath = [];
for (let i = 0; i <= 120; i++) runPath.push([2 + i * 1.3, 1.6 + Math.sin(i / 9) * 1.4]);
S(base({ role:'runner', ph:'result', result:'155 metres',
  rp: runPath, ro: [[0, 40, 2], [2, 90, 3.4], [1, 130, 3.2]], rn:'Ann', rc:'PFNK',
  r:{ x:160, y:-7, g:0, a:0, d:155, lp:1, fl:0, bk:0, bc:0, lv:4, ms:200, sp:5.86 } }), btn, true, '');
await new Promise(r=>setTimeout(r,80));
ok('the banner gets out of the way of the replay', E('banner').style.display === 'none',
   E('banner').style.display + ' / ' + E('banner-big').textContent);
ok('the music stopped when they fell', !ctx.music.playing());
ok('the run was captured for the replay', !!ctx.replay && ctx.replay.dist === 155, ctx.replay && ctx.replay.dist);
ok('and kept as the best of the match', !!ctx.bestRun && ctx.bestRun.who === 'Ann');
ok('the picture can be built without throwing', (function(){
  try { ctx.makeCard(ctx.bestRun); return true; } catch(e){ return 'threw: ' + e.message; }
})() === true);

S({ t:'state', ph:'over', host:true, role:'runner', solo:false, ink:34, inkMax:34, result:'',
  round:4, rounds:4,
  hist:[{r:1,n:'Ann',w:'Bob',d:155},{r:2,n:'Bob',w:'Ann',d:135}],
  roster:[{i:'p1',n:'Ann',s:290,b:155,r:'runner'},{i:'p2',n:'Bob',s:290,b:135,r:'drawer'}] }, btn, true, '');
await new Promise(r=>setTimeout(r,150));
const rec = E('over-record').innerHTML;
ok('the end screen names the gap to the record', /157 m/.test(rec) && /312 m/.test(rec), rec);
ok('a team score is not called a lead',
   !/leads/.test(E('over-sub').textContent) && /Together/.test(E('over-sub').textContent),
   E('over-sub').textContent);
ok('and it names the furthest single run',
   /Ann, 155 m/.test(E('over-sub').textContent), E('over-sub').textContent);
ok('the end list shows the furthest run', /furthest 155/.test(E('over-list').innerHTML), E('over-list').innerHTML);
ok('and the rounds are listed', /drawn by Bob/.test(E('over-rounds').innerHTML), E('over-rounds').innerHTML);
ok('the gate gets out of its own way once a match is on', E('gate').classList.contains('busy'));
ok('the stored board is on the end screen', /Cat/.test(E('top-list-2').innerHTML), E('top-list-2').innerHTML);
ok('and the picture is offered', !E('btn-card').classList.contains('hidden'));

ctx.recordBefore = 100; ctx.recordSeen = true;
ctx.view = { roster:[{i:'p1',n:'Ann',s:290,b:155,r:'runner'}], host:true };
ctx.renderRecord([{ n:'Ann', m:155, w:'Bob' }]);
ok('a new record is announced', /New record/.test(E('over-record').innerHTML), E('over-record').innerHTML);

ctx.recordBefore = 0; ctx.recordSeen = true;
ctx.renderRecord([]);
ok('the very first run is put differently', /First name on the board/.test(E('over-record').innerHTML), E('over-record').innerHTML);

/* drawing: a flicked finger must not produce segments the server will drop */
S(base({}), btn, true, '');
ctx.ws = win.__sock || { readyState:1, sent:[], send(j){ (ctx.__out = ctx.__out||[]).push(JSON.parse(j)); } };
const out = [];
ctx.ws = { readyState:1, send(j){ out.push(JSON.parse(j)); } };
ctx.drawing = true; ctx.penId = 1; ctx.pending = [10, 1.2];
ctx.penTo(30, 1.2);            /* a twenty metre flick */
ctx.flush(true);
const pts = out.length ? out[0].pts : [];
let longest = 0;
for (let i = 0; i + 3 < pts.length; i += 2){
  longest = Math.max(longest, Math.hypot(pts[i+2]-pts[i], pts[i+3]-pts[i+1]));
}
ok('a flicked finger is broken into short segments', pts.length > 4 && longest <= 3.0, longest);

/* the vanishing line: a point the server would throw away must never be
   drawn here either, or it appears for a moment and then goes */
ctx.pending = [];
ctx.penTo(5.5, 1.2);                     /* just ahead of a runner at x=5 */
const near = ctx.pending.length;
ctx.penTo(5 + 40, 1.2);                  /* far past the reach */
ok('a point inside the reach is taken', near === 2, near);
ok('a point outside it is refused', ctx.pending.length === 0, ctx.pending.length);
ok('and the drawer is told why', performance.now() - ctx.nudgedAt < 1000);

/* the canvas keeps the view inside the window the server sends */
win.innerWidth = 1920; win.innerHeight = 1080;
win.fireWindow('resize');
ok('a wide screen never shows more world than is sent',
   1920 / ctx.PPM <= 55 + 60, (1920 / ctx.PPM).toFixed(1) + ' metres across');
ok('and it shows a sensible amount of it',
   1920 / ctx.PPM > 24 && 1920 / ctx.PPM < 46, (1920 / ctx.PPM).toFixed(1));

/* the phone case, which is the one that was wrong: twelve metres of view
   against twenty six metres of reach */
win.innerWidth = 375; win.innerHeight = 812;
win.fireWindow('resize');
const across = 375 / ctx.PPM;
ok('a phone sees most of the reach, not half of it', across > 16,
   across.toFixed(1) + ' metres across');
ok('and the runner stands further left on it', ctx.CAM_X < 0.3, ctx.CAM_X);
const aheadM = 375 * (1 - ctx.CAM_X) / ctx.PPM;
ok('so there is real room in front of them', aheadM > 12, aheadM.toFixed(1) + ' m ahead');

console.log('\n' + (failed ? failed + ' FAILED' : 'client smoke test clean'));
process.exit(failed ? 1 : 0);
