/* ======================================================================
   Chalk - single file build

   Generated from worker.js and client.html so the whole game can be
   deployed as one Cloudflare module. Edit those two, not this.
   ====================================================================== */

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>Chalk</title>
<meta name="description" content="One player draws. The other runs on what was drawn. A two player game on a blackboard where the ground does not exist until somebody makes it.">
<meta property="og:type" content="website">
<meta property="og:title" content="Chalk">
<meta property="og:description" content="One player draws. The other runs on what was drawn. The ground does not exist until somebody makes it.">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Inter:wght@400;600&display=swap" rel="stylesheet">

<style>
:root{
  --board:#26332C; --chalk:#F2F1E6; --dim:#9FB0A4; --warn:#F5A65B; --bad:#E8776B;
}
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
html,body{height:100%;overflow:hidden;background:#1A231E}
body{
  font:400 16px/1.5 "Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  color:var(--chalk);
}
canvas{position:fixed;inset:0;width:100%;height:100%;display:block;touch-action:none}

.hand{ font-family:"Caveat", cursive }

/* ---------- gate ---------- */
#gate{
  position:fixed;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;
  padding:22px;background:
    radial-gradient(1200px 700px at 50% 8%, rgba(255,255,255,.05), transparent 60%),
    var(--board);
}
#gate .box{width:100%;max-width:420px;text-align:center}
#gate h1{
  font-family:"Caveat",cursive;font-size:clamp(54px,15vw,86px);line-height:.95;
  font-weight:700;letter-spacing:.01em;
}
#gate .sub{ color:var(--dim);margin:2px 0 22px;font-size:16px }
#gate .sub b{ color:var(--chalk);font-weight:600 }
label{display:block;text-align:left;font-size:12.5px;color:var(--dim);margin:0 0 6px 2px}
input[type=text]{
  width:100%;padding:13px 15px;border-radius:12px;font-size:16px;font-family:inherit;
  background:rgba(0,0,0,.28);border:1px solid rgba(242,241,230,.22);color:var(--chalk);
}
input[type=text]:focus{outline:none;border-color:var(--chalk)}
input.code{
  font:700 22px/1 "Inter",monospace;letter-spacing:.26em;text-transform:uppercase;text-align:center;
}
button{
  width:100%;font:600 16px inherit;cursor:pointer;border:0;border-radius:12px;padding:14px;
  background:var(--chalk);color:#1F2A23;
}
button.ghost{background:transparent;border:1px solid rgba(242,241,230,.3);color:var(--chalk)}
button:disabled{opacity:.45;cursor:not-allowed}
.row{margin-top:12px}
.card{
  background:rgba(0,0,0,.2);border:1px solid rgba(242,241,230,.14);
  border-radius:16px;padding:18px;margin-top:14px;text-align:left;
}
.card h2{font-size:15px;font-weight:600;margin-bottom:4px}
.card p{color:var(--dim);font-size:13.5px;margin-bottom:12px}
.err{color:var(--bad);font-size:13.5px;margin-top:10px}
.hidden{display:none!important}
.status{font-size:12.5px;color:var(--dim);text-align:center;margin-top:14px}

/* ---------- lobby ---------- */
.roomcode{
  font:700 42px/1 "Inter",monospace;letter-spacing:.24em;text-align:center;padding:14px 0 6px;
}
ul.players{list-style:none;margin-top:10px}
ul.players li{
  display:flex;justify-content:space-between;padding:9px 0;
  border-top:1px solid rgba(242,241,230,.12);font-size:14.5px;
}
ul.players li:first-child{border-top:0}
.tag{font-size:11px;color:var(--dim);text-transform:uppercase;letter-spacing:.1em}

/* ---------- hud ---------- */
#hud{position:fixed;top:0;left:0;right:0;padding:14px 16px;z-index:20;pointer-events:none;
     display:flex;justify-content:space-between;align-items:flex-start}
.pill{
  background:rgba(0,0,0,.42);border:1px solid rgba(242,241,230,.16);
  border-radius:999px;padding:7px 14px;font-size:13px;margin-bottom:7px;display:inline-block;
}
#role{font-weight:600}
#dist{font-family:"Caveat",cursive;font-size:30px;line-height:1;padding:6px 16px}

#inkwrap{
  position:fixed;left:16px;bottom:16px;z-index:20;width:min(230px,42vw);pointer-events:none;
}
#inkwrap .lbl{font-size:11px;color:var(--dim);letter-spacing:.12em;text-transform:uppercase;margin-bottom:5px}
#inkbar{height:9px;background:rgba(0,0,0,.4);border-radius:999px;overflow:hidden;
        border:1px solid rgba(242,241,230,.18)}
#inkbar i{display:block;height:100%;background:var(--chalk);width:100%;transition:width .08s linear}
#inkbar.low i{background:var(--warn)}

#jump{
  position:fixed;right:16px;bottom:16px;z-index:20;width:104px;height:104px;border-radius:50%;
  background:rgba(242,241,230,.14);border:2px solid rgba(242,241,230,.45);
  color:var(--chalk);font:600 15px inherit;display:none;cursor:pointer;
}
#jump:active{background:rgba(242,241,230,.3)}

#banner{
  position:fixed;left:50%;top:34%;transform:translate(-50%,-50%);z-index:25;text-align:center;
  pointer-events:none;display:none;width:88%;
}
#banner .big{font-family:"Caveat",cursive;font-size:clamp(46px,12vw,86px);line-height:1}
#banner .small{color:var(--dim);font-size:15px;margin-top:2px}
</style>
</head>
<body>

<canvas id="cv"></canvas>

<div id="gate">
  <div class="box">
    <h1 class="hand">Chalk</h1>
    <p class="sub">One of you <b>draws</b>. The other <b>runs</b> on it.<br>
    There is no ground until somebody makes some.</p>

    <section id="s-landing">
      <div class="card">
        <h2>Start a board</h2>
        <p>You host. Share the four letters with whoever is playing.</p>
        <label for="host-name">Your name</label>
        <input type="text" id="host-name" maxlength="12" placeholder="Your name"
               autocomplete="off" spellcheck="false">
        <div class="row"><button id="btn-create">Create board</button></div>
      </div>

      <div class="card">
        <h2>Join a board</h2>
        <label for="join-name">Your name</label>
        <input type="text" id="join-name" maxlength="12" placeholder="Your name"
               autocomplete="off" spellcheck="false">
        <label for="join-code" style="margin-top:12px">Board code</label>
        <input type="text" id="join-code" class="code" maxlength="4" placeholder="ABCD"
               autocomplete="off" spellcheck="false">
        <div class="row"><button class="ghost" id="btn-join">Join board</button></div>
        <div class="err hidden" id="join-err"></div>
      </div>

      <div class="card">
        <h2>How it goes</h2>
        <p style="margin:0">
          The runner never stops and cannot go back. Drag anywhere to lay chalk,
          and it becomes real ground the moment you let go of nothing at all.
          You can only draw near the runner, and the chalk runs out, so you are
          always one line behind. Four rounds, roles swap, the score is metres.
        </p>
      </div>
    </section>

    <section id="s-lobby" class="hidden">
      <div class="card">
        <h2>Board code</h2>
        <div class="roomcode" id="lobby-code">----</div>
        <p style="text-align:center" id="copy-hint">Tap the code to copy the join link</p>
        <ul class="players" id="lobby-players"></ul>
        <div class="row" id="host-controls"><button id="btn-start" disabled>Start</button></div>
        <div class="status hidden" id="lobby-wait">Waiting for the host</div>
      </div>
    </section>

    <section id="s-over" class="hidden">
      <div class="card">
        <h2>Final</h2>
        <p id="over-sub"></p>
        <ul class="players" id="over-list"></ul>
        <div class="row" id="over-controls"><button id="btn-again">Play again</button></div>
        <div class="status hidden" id="over-wait">Waiting for the host</div>
      </div>
    </section>

    <div class="status" id="conn"></div>
  </div>
</div>

<div id="hud">
  <div><span class="pill" id="role">-</span></div>
  <div style="text-align:right">
    <span class="pill" id="round">-</span><br>
    <span class="pill hand" id="dist">0 m</span>
  </div>
</div>

<div id="inkwrap" class="hidden">
  <div class="lbl">Chalk</div>
  <div id="inkbar"><i></i></div>
</div>

<button id="jump">JUMP</button>

<div id="banner"><div class="big hand" id="banner-big"></div><div class="small" id="banner-small"></div></div>

<script>
/* ==========================================================================
   Chalk - the browser half

   The server owns the runner and every line. This draws the board, sends the
   points a finger passes through, and predicts nothing, because a runner that
   guesses where the ground is would disagree with the person drawing it.
   ========================================================================== */

var RUNNER_R = 0.36, START_X = 2, LEDGE_END = 13;
var REACH_BACK = 6, REACH_FWD = 22, REACH_UP = 9, REACH_DOWN = 7;

var $ = function(id){ return document.getElementById(id); };
var esc = function(s){ return String(s).replace(/[&<>"]/g, function(c){
  return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); };

function showMenu(id){
  ['s-landing','s-lobby','s-over'].forEach(function(s){ $(s).classList.add('hidden'); });
  if (id) $(id).classList.remove('hidden');
  $('gate').classList.remove('hidden');
  $('hud').style.display = 'none';
  $('inkwrap').classList.add('hidden');
  $('jump').style.display = 'none';
}
function showBoard(){
  $('gate').classList.add('hidden');
  $('hud').style.display = 'flex';
}
function status(m){ $('conn').textContent = m || ''; }
function joinErr(m){
  $('join-err').textContent = m || '';
  $('join-err').classList.toggle('hidden', !m);
}

/* ---------- state ---------- */
var ws = null, myId = null, code = '', myName = '';
var view = null, role = 'drawer';
var cam = { x: 0, y: 0 };
var pending = [];          /* points waiting to be sent */

/* ---------- connection ---------- */
function roomCode(){
  var L = 'ABCDEFGHJKLMNPQRSTUVWXYZ', s = '';
  for (var i = 0; i < 4; i++) s += L[Math.floor(Math.random() * L.length)];
  return s;
}
var attempts = 0;

function connect(rc, name, create){
  code = rc; myName = name;
  var settled = false;
  var btn = create ? $('btn-create') : $('btn-join');
  btn.disabled = true;
  btn.textContent = create ? 'Opening...' : 'Connecting...';
  status(create ? 'Opening board ' + rc : 'Connecting to ' + rc);

  var giveUp = setTimeout(function(){
    if (settled) return;
    try { ws && ws.close(); } catch(_){}
    btn.disabled = false;
    btn.textContent = create ? 'Create board' : 'Join board';
    joinErr('No answer from the server after fifteen seconds.');
  }, 15000);

  var proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(proto + '//' + location.host + '/api/ws?room=' + rc);

  ws.onopen = function(){
    settled = true; clearTimeout(giveUp);
    ws.send(JSON.stringify({ t:'join', name:name, create: !!create }));
  };
  ws.onmessage = function(e){
    var m; try { m = JSON.parse(e.data); } catch(_){ return; }
    onServer(m, btn, create);
  };
  ws.onerror = function(){
    if (settled) return;
    settled = true; clearTimeout(giveUp);
    btn.disabled = false;
    btn.textContent = create ? 'Create board' : 'Join board';
    joinErr('Could not reach the server.');
  };
  ws.onclose = function(){ if (settled) status('Disconnected. Reload to come back.'); };
}

function onServer(m, btn, create){
  if (m.t === 'taken'){
    try { ws.close(); } catch(_){}
    if (++attempts < 8) connect(roomCode(), myName, true);
    else { btn.disabled = false; btn.textContent = 'Create board'; joinErr('No free code found.'); }
    return;
  }
  if (m.t === 'closed'){ resetBtn(); joinErr('That board has already started.'); showMenu('s-landing'); return; }
  if (m.t === 'full'){   resetBtn(); joinErr('That board is full.');            showMenu('s-landing'); return; }
  if (m.t === 'you'){
    myId = m.id; myName = m.name; resetBtn();
    status(create ? 'Board open. Code ' + code : 'Connected to ' + code);
    return;
  }
  if (m.t !== 'state') return;

  view = m;
  role = m.role;

  if (m.ph === 'lobby'){ renderLobby(); showMenu('s-lobby'); }
  else if (m.ph === 'over'){ renderOver(); showMenu('s-over'); }
  else {
    showBoard();
    $('role').textContent = role === 'runner' ? 'You are running' : 'You are drawing';
    $('round').textContent = 'Round ' + (m.round + 1) + ' of ' + m.rounds;
    $('dist').textContent = (m.r ? m.r.d : 0) + ' m';
    $('inkwrap').classList.toggle('hidden', role !== 'drawer');
    $('jump').style.display = role === 'runner' ? 'block' : 'none';
    var pct = Math.max(0, Math.min(1, m.ink / m.inkMax));
    $('inkbar').firstElementChild.style.width = (pct * 100) + '%';
    $('inkbar').classList.toggle('low', pct < 0.25);

    if (m.ph === 'result'){
      $('banner-big').textContent = m.result;
      $('banner-small').textContent = 'Next round in a moment';
      $('banner').style.display = 'block';
    } else if (m.cd > 0){
      $('banner-big').textContent = m.cd;
      $('banner-small').textContent = role === 'drawer'
        ? 'Draw the first stretch, quickly'
        : 'Hold on, they are laying the ground';
      $('banner').style.display = 'block';
    } else {
      $('banner').style.display = 'none';
    }
  }
}
function resetBtn(){
  $('btn-create').disabled = false; $('btn-create').textContent = 'Create board';
  $('btn-join').disabled = false;   $('btn-join').textContent = 'Join board';
}

function renderLobby(){
  var r = view ? view.roster : [];
  $('lobby-code').textContent = code || '----';
  $('lobby-players').innerHTML = r.map(function(p, i){
    return '<li><span>' + esc(p.n) + '</span><span class="tag">' +
           (i === 0 ? 'host' : 'ready') + '</span></li>';
  }).join('');
  var host = view && view.host;
  $('host-controls').classList.toggle('hidden', !host);
  $('lobby-wait').classList.toggle('hidden', !!host);
  if (host){
    $('btn-start').disabled = r.length < 2;
    $('btn-start').textContent = r.length < 2 ? 'Need one more player' : 'Start (' + r.length + ')';
  }
}
function renderOver(){
  var r = (view ? view.roster : []).slice().sort(function(a,b){ return b.s - a.s; });
  $('over-sub').textContent = r.length ? r[0].n + ' leads on ' + r[0].s + ' metres.' : '';
  $('over-list').innerHTML = r.map(function(p, i){
    return '<li><span>' + (i+1) + '. ' + esc(p.n) + '</span><span>' + p.s + ' m</span></li>';
  }).join('');
  var host = view && view.host;
  $('over-controls').classList.toggle('hidden', !host);
  $('over-wait').classList.toggle('hidden', !!host);
}

/* ==========================================================================
   Board
   ========================================================================== */
var cv = $('cv'), ctx = cv.getContext('2d');
var VW = 0, VH = 0, PPM = 40;      /* pixels per metre */

function resize(){
  var dpr = Math.min(2, devicePixelRatio || 1);
  VW = innerWidth; VH = innerHeight;
  cv.width = Math.round(VW * dpr); cv.height = Math.round(VH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  PPM = Math.max(26, Math.min(56, Math.min(VW, VH) / 13));
}
addEventListener('resize', resize);
resize();

/* world to screen. The camera sits a little behind and below the runner so
   there is room ahead to draw into. */
function sx(x){ return (x - cam.x) * PPM + VW * 0.34; }
function sy(y){ return VH * 0.62 - (y - cam.y) * PPM; }
function wx(px){ return (px - VW * 0.34) / PPM + cam.x; }
function wy(py){ return (VH * 0.62 - py) / PPM + cam.y; }

var dust = [];
function makeDust(){
  dust = [];
  for (var i = 0; i < 90; i++){
    dust.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.4 + 0.3,
                a: Math.random() * 0.05 + 0.015 });
  }
}
makeDust();

function frame(){
  requestAnimationFrame(frame);
  if (!view || !view.r){ drawBoardOnly(); return; }

  var r = view.r;
  cam.x += (r.x - cam.x) * 0.16;
  cam.y += (r.y - cam.y) * 0.10;

  paintBoard();
  drawReach(r);
  drawChalk(view.s || []);
  drawRunner(r);
  drawLocalStroke();
}

function paintBoard(){
  ctx.fillStyle = '#26332C';
  ctx.fillRect(0, 0, VW, VH);
  /* faint chalk dust so the board is not a flat colour */
  for (var i = 0; i < dust.length; i++){
    var d = dust[i];
    ctx.fillStyle = 'rgba(242,241,230,' + d.a + ')';
    ctx.beginPath();
    ctx.arc(d.x * VW, d.y * VH, d.r * 12, 0, Math.PI * 2);
    ctx.fill();
  }
  /* a horizon smudge, like a board wiped with a cloth */
  var g = ctx.createLinearGradient(0, VH * 0.25, 0, VH);
  g.addColorStop(0, 'rgba(255,255,255,.035)');
  g.addColorStop(1, 'rgba(0,0,0,.12)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VW, VH);
}
function drawBoardOnly(){ paintBoard(); }

/* the patch of board the drawer is allowed to work in */
function drawReach(r){
  if (role !== 'drawer') return;
  var x0 = sx(r.x - REACH_BACK), x1 = sx(r.x + REACH_FWD);
  var y0 = sy(r.y + REACH_UP),   y1 = sy(r.y - REACH_DOWN);
  ctx.save();
  ctx.setLineDash([7, 9]);
  ctx.strokeStyle = 'rgba(242,241,230,.18)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  ctx.restore();
}

/* Chalk is drawn twice, a soft wide pass and a bright thin one, which is what
   makes a line look dusty rather than printed. */
function drawChalk(segs){
  if (!segs.length) return;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  ctx.strokeStyle = 'rgba(242,241,230,.20)';
  ctx.lineWidth = 11;
  ctx.beginPath();
  for (var i = 0; i < segs.length; i++){
    var s = segs[i];
    ctx.moveTo(sx(s[0]), sy(s[1])); ctx.lineTo(sx(s[2]), sy(s[3]));
  }
  ctx.stroke();

  ctx.strokeStyle = 'rgba(242,241,230,.95)';
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  for (var j = 0; j < segs.length; j++){
    var t = segs[j];
    ctx.moveTo(sx(t[0]), sy(t[1])); ctx.lineTo(sx(t[2]), sy(t[3]));
  }
  ctx.stroke();
}

function drawLocalStroke(){
  if (role !== 'drawer' || pending.length < 4) return;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(242,241,230,.55)';
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(sx(pending[0]), sy(pending[1]));
  for (var i = 2; i + 1 < pending.length; i += 2) ctx.lineTo(sx(pending[i]), sy(pending[i+1]));
  ctx.stroke();
}

/* a chalk stick figure, legs swinging while it is on the ground */
function drawRunner(r){
  var x = sx(r.x), y = sy(r.y), s = PPM;
  var t = performance.now() / 1000;
  var swing = r.g ? Math.sin(t * 15) : 0.55;

  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = r.a ? 1 : 0.35;
  ctx.strokeStyle = 'rgba(242,241,230,.98)';
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2.4, s * 0.075);

  /* head */
  ctx.beginPath();
  ctx.arc(0, -s * 0.52, s * 0.19, 0, Math.PI * 2);
  ctx.stroke();
  /* body */
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.33); ctx.lineTo(0, s * 0.06);
  ctx.stroke();
  /* arms */
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.2);
  ctx.lineTo(-s * 0.26, -s * 0.05 + swing * s * 0.1);
  ctx.moveTo(0, -s * 0.2);
  ctx.lineTo( s * 0.26, -s * 0.05 - swing * s * 0.1);
  ctx.stroke();
  /* legs */
  ctx.beginPath();
  ctx.moveTo(0, s * 0.06);
  ctx.lineTo(-s * 0.2 + swing * s * 0.2, s * 0.36);
  ctx.moveTo(0, s * 0.06);
  ctx.lineTo( s * 0.2 + swing * s * 0.2, s * 0.36);
  ctx.stroke();
  ctx.restore();
}

requestAnimationFrame(frame);

/* ==========================================================================
   Input
   ========================================================================== */
function sendJump(){ if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t:'jump' })); }

var drawing = false, penId = null, lastSent = 0;
function flush(force){
  if (!ws || ws.readyState !== 1) return;
  if (pending.length < 4) return;
  var now = performance.now();
  if (!force && now - lastSent < 60) return;
  lastSent = now;
  ws.send(JSON.stringify({ t:'draw', pts: pending }));
  /* keep the last point so the next batch joins on */
  pending = pending.slice(-2);
}

cv.addEventListener('pointerdown', function(e){
  if (role !== 'drawer' || !view || view.ph !== 'play') return;
  drawing = true; penId = e.pointerId; pending = [wx(e.clientX), wy(e.clientY)];
  cv.setPointerCapture(e.pointerId);
});
cv.addEventListener('pointermove', function(e){
  if (!drawing || e.pointerId !== penId) return;
  pending.push(wx(e.clientX), wy(e.clientY));
  if (pending.length > 80) flush(true);
  else flush(false);
});
function penUp(e){
  if (e.pointerId !== penId) return;
  flush(true);
  drawing = false; penId = null; pending = [];
}
cv.addEventListener('pointerup', penUp);
cv.addEventListener('pointercancel', penUp);

/* the runner taps anywhere, or uses the button, or the space bar */
cv.addEventListener('pointerdown', function(){ if (role === 'runner') sendJump(); });
$('jump').addEventListener('pointerdown', function(e){ e.preventDefault(); sendJump(); });
addEventListener('keydown', function(e){
  if (e.target && e.target.tagName === 'INPUT') return;
  if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w'){ sendJump(); e.preventDefault(); }
});

/* ---------- wiring ---------- */
$('btn-create').onclick = function(){
  joinErr('');
  attempts = 0;
  connect(roomCode(), ($('host-name').value || 'Host').trim().slice(0,12) || 'Host', true);
};
$('btn-join').onclick = function(){
  var rc = ($('join-code').value || '').trim().toUpperCase();
  if (rc.length !== 4){ joinErr('The board code is four letters.'); return; }
  joinErr('');
  connect(rc, ($('join-name').value || 'Player').trim().slice(0,12) || 'Player', false);
};
$('btn-start').onclick = function(){ if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t:'start' })); };
$('btn-again').onclick = function(){ if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t:'again' })); };

$('join-code').addEventListener('input', function(){
  this.value = this.value.toUpperCase().replace(/[^A-Z]/g, '');
});
$('join-code').addEventListener('keydown', function(e){ if (e.key === 'Enter') $('btn-join').click(); });

$('lobby-code').addEventListener('click', function(){
  if (!code || !navigator.clipboard) return;
  navigator.clipboard.writeText(location.origin + location.pathname + '?room=' + code)
    .then(function(){
      $('copy-hint').textContent = 'Join link copied';
      setTimeout(function(){ $('copy-hint').textContent = 'Tap the code to copy the join link'; }, 1800);
    }).catch(function(){});
});

var pre = location.search.match(/room=([A-Za-z]{4})/);
if (pre){ $('join-code').value = pre[1].toUpperCase(); $('join-name').focus(); }
</script>
</body>
</html>
`;

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
