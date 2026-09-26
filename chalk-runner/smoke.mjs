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

ok('the record list loaded', /312/.test(E('top-list').innerHTML), E('top-list').innerHTML.slice(0,80));

function base(o){
  return Object.assign({ t:'state', ph:'play', round:0, rounds:4, host:true, role:'drawer',
    solo:false, ink:20, inkMax:34, result:'', cd:0,
    roster:[{i:'p1',n:'Ann',s:0,b:0,r:'runner'},{i:'p2',n:'Bob',s:0,b:0,r:'drawer'}],
    r:{ x:5, y:1.56, g:1, a:1, d:0, lp:0, fl:0, lv:1, ms:50, sp:4.6 },
    s:[[-1,1.2,13,1.2]] }, o);
}
const S = ctx.onServer, btn = { disabled:false, textContent:'' };

S({ t:'state', ph:'lobby', host:true, role:'drawer', solo:false, ink:34, inkMax:34,
    result:'', round:0, rounds:4, roster:[{i:'p1',n:'Ann',s:0,b:0,r:'drawer'}] }, btn, true, '');
ok('the lobby renders', /Ann/.test(E('lobby-players').innerHTML), E('lobby-players').innerHTML);

S(base({ cd:3 }), btn, true, '');
ok('the countdown banner shows', E('banner').style.display === 'block');
ok('and it counts', E('banner-big').textContent === 3, E('banner-big').textContent);

S(base({}), btn, true, '');
await new Promise(r=>setTimeout(r,120));
ok('the board is showing', E('gate').classList.contains('hidden'));
ok('the chalk bar is on for a drawer', !E('inkwrap').classList.contains('hidden'));
ok('the pad is hidden for a drawer', E('pad').style.display === 'none');

S(base({ role:'runner', r:{ x:160, y:2.1, g:1, a:1, d:155, lp:1, fl:0, lv:4, ms:200, sp:5.86 } }), btn, true, '');
await new Promise(r=>setTimeout(r,120));
ok('the distance shows', E('dist').textContent === '155 m', E('dist').textContent);
ok('the leap button appears', !E('leap').classList.contains('hidden'));
ok('the leap count shows', E('leap-n').textContent === 1, E('leap-n').textContent);
ok('the milestone countdown reads right', E('tracklbl').textContent === '45 m to level 5', E('tracklbl').textContent);
ok('the pad is on for a runner', E('pad').style.display === 'flex');
ok('the music started', ctx.music.playing());

S(base({ role:'runner', ph:'result', result:'155 metres',
  r:{ x:160, y:-7, g:0, a:0, d:155, lp:1, fl:0, lv:4, ms:200, sp:5.86 } }), btn, true, '');
await new Promise(r=>setTimeout(r,80));
ok('the result banner shows the metres', /155/.test(E('banner-big').textContent), E('banner-big').textContent);
ok('the music stopped when they fell', !ctx.music.playing());

S({ t:'state', ph:'over', host:true, role:'runner', solo:false, ink:34, inkMax:34, result:'',
  round:4, rounds:4,
  roster:[{i:'p1',n:'Ann',s:290,b:155,r:'runner'},{i:'p2',n:'Bob',s:290,b:135,r:'drawer'}] }, btn, true, '');
await new Promise(r=>setTimeout(r,150));
const rec = E('over-record').innerHTML;
ok('the end screen names the gap to the record', /157 m/.test(rec) && /312 m/.test(rec), rec);
ok('the end list shows the best run', /best run 155/.test(E('over-list').innerHTML), E('over-list').innerHTML);
ok('the stored board is on the end screen', /Cat/.test(E('top-list-2').innerHTML), E('top-list-2').innerHTML);

ctx.recordBefore = 100;
ctx.view = { roster:[{i:'p1',n:'Ann',s:290,b:155,r:'runner'}], host:true };
ctx.renderRecord([{ n:'Ann', m:155, w:'Bob' }]);
ok('a new record is announced', /New record/.test(E('over-record').innerHTML), E('over-record').innerHTML);

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

/* the canvas keeps the view inside the window the server sends */
win.innerWidth = 1920; win.innerHeight = 1080;
win.fireWindow('resize');
ok('a wide screen never shows more world than is sent',
   1920 / ctx.PPM <= 34 + 60, (1920 / ctx.PPM).toFixed(1) + ' metres across');

console.log('\n' + (failed ? failed + ' FAILED' : 'client smoke test clean'));
process.exit(failed ? 1 : 0);
