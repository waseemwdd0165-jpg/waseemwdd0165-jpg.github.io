/* ======================================================================
   Chalk Runner - single file build

   Generated from worker.js and client.html so the whole game can be
   deployed as one Cloudflare module. Edit those two, not this.
   ====================================================================== */

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>Chalk Runner</title>
<meta name="description" content="One player draws. The other runs on what was drawn. A blackboard game where the ground does not exist until somebody makes it, and the runner never stops.">
<meta property="og:type" content="website">
<meta property="og:title" content="Chalk Runner">
<meta property="og:description" content="One step ahead. One player draws the ground, the other runs on it, and the runner never stops.">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

<style>
:root{
  --board:#232E28; --board-2:#1B2420;
  --chalk:#F4F3E9; --soft:rgba(244,243,233,.62); --dim:rgba(244,243,233,.40);
  --line:rgba(244,243,233,.16);
  --warn:#F0A65C; --bad:#E8776B; --good:#8FCB8B;
}
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
html,body{height:100%;overflow:hidden;background:#151C19}
body{
  font:400 16px/1.5 "Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  color:var(--chalk);
}
canvas{position:fixed;inset:0;width:100%;height:100%;display:block;touch-action:none}
.hand{font-family:"Caveat",cursive}
.hidden{display:none!important}

/* ---------- gate ---------- */
#gate{
  position:fixed;inset:0;z-index:40;overflow-y:auto;
  background:
    radial-gradient(1100px 620px at 50% -6%, rgba(244,243,233,.07), transparent 62%),
    linear-gradient(var(--board), var(--board-2));
}
#gate .wrap{min-height:100%;display:flex;align-items:center;justify-content:center;padding:26px 20px 40px}
#gate .box{width:100%;max-width:400px}
.brand{text-align:center;margin-bottom:6px}
.brand h1{
  font-family:"Caveat",cursive;font-weight:700;
  font-size:clamp(56px,16vw,92px);line-height:.9;letter-spacing:.01em;
}
.brand .tag{
  font-family:"Caveat",cursive;font-size:clamp(20px,5.5vw,28px);
  color:var(--warn);line-height:1;margin-top:-2px;
}
.brand .say{color:var(--soft);font-size:15px;margin-top:12px;line-height:1.45}
.brand .say b{color:var(--chalk);font-weight:600}

/* the little looping demo, so you see the game before you read about it */
#demo{
  width:100%;height:132px;margin:18px 0 6px;border-radius:14px;
  border:1px solid var(--line);background:rgba(0,0,0,.2);display:block;
}

.card{
  background:rgba(0,0,0,.22);border:1px solid var(--line);
  border-radius:16px;padding:16px;margin-top:12px;
}
.card h2{font-size:14px;font-weight:600;margin-bottom:3px}
.card p{color:var(--soft);font-size:13px;margin-bottom:11px;line-height:1.45}
label{display:block;font-size:11.5px;color:var(--dim);margin:0 0 5px 2px;
      letter-spacing:.06em;text-transform:uppercase}
input[type=text]{
  width:100%;padding:12px 14px;border-radius:11px;font-size:15px;font-family:inherit;
  background:rgba(0,0,0,.3);border:1px solid var(--line);color:var(--chalk);
}
input[type=text]:focus{outline:none;border-color:rgba(244,243,233,.5)}
input.code{font:700 21px/1 "Inter",monospace;letter-spacing:.26em;text-transform:uppercase;text-align:center}
button{
  width:100%;font:600 15px inherit;cursor:pointer;border:0;border-radius:11px;padding:13px;
  background:var(--chalk);color:#1D2723;transition:transform .06s,opacity .15s;
}
button:active{transform:translateY(1px)}
button:disabled{opacity:.45;cursor:not-allowed}
button.ghost{background:transparent;border:1px solid var(--line);color:var(--chalk)}
button.warm{background:var(--warn);color:#2A1B08}
.row{margin-top:10px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:10px}
.err{color:var(--bad);font-size:13px;margin-top:9px}
.status{font-size:12px;color:var(--dim);text-align:center;margin-top:14px}

/* ---------- lobby, board, results ---------- */
.roomcode{font:700 40px/1 "Inter",monospace;letter-spacing:.22em;text-align:center;padding:10px 0 4px}
ul.list{list-style:none;margin-top:8px}
ul.list li{
  display:flex;justify-content:space-between;gap:12px;padding:8px 0;
  border-top:1px solid var(--line);font-size:14px;
}
ul.list li:first-child{border-top:0}
.tag2{font-size:10.5px;color:var(--dim);text-transform:uppercase;letter-spacing:.1em}
.me{color:var(--warn)}
.rank{color:var(--dim);width:22px;display:inline-block}
.metres{font-family:"Caveat",cursive;font-size:20px;line-height:1}

/* ---------- hud ---------- */
#hud{position:fixed;top:0;left:0;right:0;padding:12px 14px;z-index:20;pointer-events:none;
     display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
.pill{
  background:rgba(12,18,15,.5);border:1px solid var(--line);
  border-radius:999px;padding:6px 13px;font-size:12.5px;display:inline-block;
  backdrop-filter:blur(6px);
}
#role{font-weight:600}
#dist{font-family:"Caveat",cursive;font-size:30px;line-height:1;padding:3px 15px 5px}
#lvl{color:var(--warn)}

/* the run of milestones across the top, filling as you pass them */
#track{
  position:fixed;left:50%;transform:translateX(-50%);top:54px;z-index:20;
  width:min(360px,62vw);height:5px;border-radius:999px;
  background:rgba(0,0,0,.35);border:1px solid var(--line);overflow:hidden;pointer-events:none;
}
#track i{display:block;height:100%;background:var(--warn);width:0%;transition:width .15s linear}
#tracklbl{
  position:fixed;left:50%;transform:translateX(-50%);top:64px;z-index:20;
  font-size:10.5px;color:var(--dim);letter-spacing:.1em;text-transform:uppercase;pointer-events:none;
}

#inkwrap{position:fixed;left:14px;bottom:14px;z-index:20;width:min(220px,40vw);pointer-events:none}
#inkwrap .lbl{font-size:10.5px;color:var(--dim);letter-spacing:.12em;text-transform:uppercase;margin-bottom:5px}
#inkbar{height:8px;background:rgba(0,0,0,.4);border-radius:999px;overflow:hidden;border:1px solid var(--line)}
#inkbar i{display:block;height:100%;background:var(--chalk);width:100%;transition:width .07s linear}
#inkbar.low i{background:var(--warn)}

#pad{position:fixed;right:12px;bottom:12px;z-index:20;display:none;align-items:flex-end;gap:11px}
#pad button{
  width:104px;height:104px;border-radius:50%;padding:0;
  background:rgba(244,243,233,.12);border:2px solid rgba(244,243,233,.4);
  color:var(--chalk);font:600 15px inherit;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;
}
#pad button:active{background:rgba(244,243,233,.3)}
#leap{
  width:92px;height:92px;border-color:var(--warn);color:var(--warn);
  background:rgba(240,166,92,.14);animation:ready 1.6s ease-in-out infinite;
}
#leap small{font:700 19px "Caveat",cursive;line-height:1}
@keyframes ready{
  0%,100%{box-shadow:0 0 0 0 rgba(240,166,92,.32)}
  50%{box-shadow:0 0 0 12px rgba(240,166,92,0)}
}

#banner{position:fixed;left:50%;top:32%;transform:translate(-50%,-50%);z-index:25;
        text-align:center;pointer-events:none;display:none;width:88%}
#banner .big{font-family:"Caveat",cursive;font-size:clamp(50px,13vw,92px);line-height:1}
#banner .small{color:var(--soft);font-size:14px;margin-top:2px}

#audiobar{
  position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:21;
  display:none;gap:6px;
}
#audiobar button{
  background:rgba(12,18,15,.5);border:1px solid var(--line);color:var(--dim);
  width:auto;padding:6px 12px;border-radius:999px;font-size:11.5px;
  letter-spacing:.06em;text-transform:uppercase;
}
#audiobar button.on{color:var(--chalk);border-color:rgba(244,243,233,.42)}

.record{
  text-align:center;font-family:"Caveat",cursive;font-size:22px;line-height:1.15;
  padding:4px 0 2px;
}
.record b{color:var(--warn);font-weight:700}
.record.beat b{color:var(--good)}
</style>
</head>
<body>

<canvas id="cv"></canvas>

<div id="gate">
 <div class="wrap">
  <div class="box">
    <div class="brand">
      <h1 class="hand">Chalk Runner</h1>
      <div class="tag hand">One step ahead</div>
      <canvas id="demo"></canvas>
      <p class="say">One of you <b>draws</b>. The other <b>runs</b> on it.
      The runner never stops, and there is no ground until somebody makes some.</p>
    </div>

    <section id="s-landing">
      <div class="card">
        <label for="host-name">Your name</label>
        <input type="text" id="host-name" maxlength="12" placeholder="Your name"
               autocomplete="off" spellcheck="false">
        <div class="two">
          <button id="btn-create">Start a board</button>
          <button class="ghost" id="btn-solo">Practise alone</button>
        </div>
      </div>

      <div class="card">
        <h2>Join a friend</h2>
        <label for="join-name">Your name</label>
        <input type="text" id="join-name" maxlength="12" placeholder="Your name"
               autocomplete="off" spellcheck="false">
        <label for="join-code" style="margin-top:10px">Board code</label>
        <input type="text" id="join-code" class="code" maxlength="4" placeholder="ABCD"
               autocomplete="off" spellcheck="false">
        <div class="row"><button class="ghost" id="btn-join">Join board</button></div>
        <div class="err hidden" id="join-err"></div>
      </div>

      <div class="card">
        <h2>How it goes</h2>
        <p style="margin:0">
          Drag anywhere to lay chalk and it becomes real ground. You can only draw
          near the runner and the chalk runs out, so you are always one line behind.
          Every 50 metres they speed up. Every 100 they bank a leap, a huge floating
          jump that buys you a breath. Four rounds, roles swap, the score is metres.
        </p>
        <p style="margin:11px 0 0">
          The record is drawn on the board as a red line out ahead of you. Run past it.
        </p>
      </div>

      <div class="card">
        <h2>Furthest runs</h2>
        <ul class="list" id="top-list"><li><span class="tag2">loading</span></li></ul>
      </div>
    </section>

    <section id="s-lobby" class="hidden">
      <div class="card">
        <h2 style="text-align:center">Board code</h2>
        <div class="roomcode" id="lobby-code">----</div>
        <p style="text-align:center;margin-bottom:6px" id="copy-hint">Tap the code to copy the join link</p>
        <ul class="list" id="lobby-players"></ul>
        <div id="host-controls">
          <div class="row"><button id="btn-start" disabled>Start</button></div>
          <div class="row"><button class="ghost" id="btn-solo2">Practise alone instead</button></div>
        </div>
        <div class="status hidden" id="lobby-wait">Waiting for the host</div>
      </div>
    </section>

    <section id="s-over" class="hidden">
      <div class="card">
        <h2>Final</h2>
        <p id="over-sub"></p>
        <div class="record" id="over-record"></div>
        <ul class="list" id="over-list"></ul>
        <div class="row" id="over-controls"><button id="btn-again">Play again</button></div>
        <div class="status hidden" id="over-wait">Waiting for the host</div>
      </div>
      <div class="card">
        <h2>Furthest runs</h2>
        <ul class="list" id="top-list-2"></ul>
      </div>
    </section>

    <div class="status" id="conn"></div>
  </div>
 </div>
</div>

<div id="audiobar">
  <button id="btn-sfx" class="on">sound</button>
  <button id="btn-music" class="on">music</button>
</div>

<div id="hud">
  <div><span class="pill" id="role">-</span></div>
  <div style="text-align:right">
    <span class="pill" id="round">-</span><br>
    <span class="pill hand" id="dist">0 m</span>
  </div>
</div>
<div id="track"><i></i></div>
<div id="tracklbl"></div>

<div id="inkwrap" class="hidden">
  <div class="lbl">Chalk</div>
  <div id="inkbar"><i></i></div>
</div>

<div id="pad">
  <button id="leap" class="hidden">LEAP<small id="leap-n">0</small></button>
  <button id="jump">JUMP</button>
</div>

<div id="banner"><div class="big hand" id="banner-big"></div><div class="small" id="banner-small"></div></div>

<script>
/* ==========================================================================
   Chalk Runner - the browser half

   The server owns the runner and every line. This draws the board, sends the
   points a finger passes through, and smooths what it is given: the runner
   arrives thirty times a second and is drawn sixty, so it is eased between
   the two rather than stepped.
   ========================================================================== */

var RUNNER_R = 0.36, START_X = 2, LEDGE_END = 13;
var REACH_BACK = 6, REACH_FWD = 22, REACH_UP = 9, REACH_DOWN = 7;
var SPEED_EVERY = 50;
/* the server sends chalk within this window, so the view must never be wider */
var SEND_BACK = 34, SEND_FWD = 60;

var $ = function(id){ return document.getElementById(id); };
var esc = function(s){ return String(s).replace(/[&<>"]/g, function(c){
  return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); };

function showMenu(id){
  ['s-landing','s-lobby','s-over'].forEach(function(s){ $(s).classList.add('hidden'); });
  if (id) $(id).classList.remove('hidden');
  $('gate').classList.remove('hidden');
  $('hud').style.display = 'none';
  $('track').style.display = 'none';
  $('tracklbl').style.display = 'none';
  $('inkwrap').classList.add('hidden');
  $('pad').style.display = 'none';
  $('audiobar').style.display = 'none';
}
function showBoard(){
  $('gate').classList.add('hidden');
  $('hud').style.display = 'flex';
  $('track').style.display = 'block';
  $('tracklbl').style.display = 'block';
  $('audiobar').style.display = 'flex';
}
function status(m){ $('conn').textContent = m || ''; }
function joinErr(m){
  $('join-err').textContent = m || '';
  $('join-err').classList.toggle('hidden', !m);
}

/* ==========================================================================
   Sound. Made with an oscillator and some noise, so there is nothing to
   download and nothing that can fail to load.
   ========================================================================== */
var actx = null, soundOn = true, musicOn = true;
function audio(){
  if (!actx){
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch(_){ return null; }
  }
  if (actx.state === 'suspended') actx.resume();
  return actx;
}
/* A phone in a pocket says more with a buzz than with a noise. Desktops and
   iPhones do not have this at all, hence the guard. */
function buzz(pattern){
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch(_){}
}
function noise(dur, filter, gain){
  var a = audio(); if (!a || !soundOn) return;
  var n = Math.floor(a.sampleRate * dur);
  var buf = a.createBuffer(1, n, a.sampleRate);
  var d = buf.getChannelData(0);
  for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  var src = a.createBufferSource(); src.buffer = buf;
  var bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = filter; bp.Q.value = 1.1;
  var g = a.createGain(); g.gain.value = gain;
  src.connect(bp); bp.connect(g); g.connect(a.destination);
  src.start();
}
function tone(f1, f2, dur, gain, type){
  var a = audio(); if (!a || !soundOn) return;
  var o = a.createOscillator(); o.type = type || 'triangle';
  var g = a.createGain();
  o.frequency.setValueAtTime(f1, a.currentTime);
  o.frequency.exponentialRampToValueAtTime(Math.max(30, f2), a.currentTime + dur);
  g.gain.setValueAtTime(gain, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0008, a.currentTime + dur);
  o.connect(g); g.connect(a.destination);
  o.start(); o.stop(a.currentTime + dur + 0.02);
}
var sfx = {
  chalk: function(){ noise(0.045, 2600 + Math.random() * 900, 0.035); },
  step:  function(){ noise(0.05, 320, 0.05); },
  jump:  function(){ tone(420, 700, 0.14, 0.08); },
  leap:  function(){ tone(300, 1100, 0.45, 0.11, 'sine'); },
  land:  function(){ noise(0.09, 190, 0.09); },
  level: function(){ tone(700, 1050, 0.2, 0.07, 'square'); },
  die:   function(){ tone(260, 70, 0.55, 0.13, 'sawtooth'); noise(0.3, 500, 0.08); },
  tick:  function(){ tone(900, 900, 0.07, 0.05, 'sine'); }
};

/* ==========================================================================
   Music

   Also made out of nothing: a sequencer that schedules a few oscillators a
   fraction of a second ahead of the clock. The tempo climbs with the runner's
   level, so the board sounds more frantic the further the pair have got,
   which is free tension and costs no bytes.
   ========================================================================== */
var music = (function(){
  var on = false, timer = null, step = 0, nextAt = 0, bus = null, lvl = 1;
  var SCALE = [110.00, 130.81, 146.83, 164.81, 196.00, 220.00, 261.63, 293.66];
  var LEAD  = [0, 4, 2, 5, 0, 6, 4, 7, 2, 5, 4, 6, 0, 4, 7, 5];
  var BASS  = [0, null, 0, null, 2, null, 4, null];

  function bpm(){ return Math.min(152, 92 + (lvl - 1) * 5); }

  function voice(freq, at, dur, gain, type){
    var a = actx;
    var o = a.createOscillator(); o.type = type;
    var g = a.createGain();
    o.frequency.setValueAtTime(freq, at);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain, at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); g.connect(bus);
    o.start(at); o.stop(at + dur + 0.03);
  }

  function schedule(){
    var a = actx; if (!a) return;
    var spb = 60 / bpm() / 2;                 /* eighth notes */
    while (nextAt < a.currentTime + 0.18){
      var at = Math.max(nextAt, a.currentTime + 0.01);

      var b = BASS[step % BASS.length];
      if (b !== null) voice(SCALE[b] / 2, at, spb * 1.5, 0.10, 'triangle');

      if (step % 2 === 0 || step % 8 === 3){
        voice(SCALE[LEAD[step % LEAD.length]] * 2, at, spb * 0.85, 0.035, 'sine');
      }
      /* a soft tick on the beat, so there is something to run to */
      if (step % 4 === 0) voice(1400, at, 0.035, 0.018, 'square');

      nextAt = at + spb;
      step++;
    }
  }

  return {
    start: function(){
      if (on || !musicOn) return;
      var a = audio(); if (!a) return;
      bus = a.createGain();
      bus.gain.setValueAtTime(0.0001, a.currentTime);
      bus.gain.exponentialRampToValueAtTime(0.5, a.currentTime + 1.2);
      bus.connect(a.destination);
      step = 0; nextAt = a.currentTime + 0.05; on = true;
      timer = setInterval(schedule, 40);
      schedule();
    },
    stop: function(){
      if (!on) return;
      on = false;
      clearInterval(timer); timer = null;
      var a = actx, b = bus; bus = null;
      if (a && b){
        try {
          b.gain.cancelScheduledValues(a.currentTime);
          b.gain.setValueAtTime(b.gain.value || 0.0001, a.currentTime);
          b.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.35);
          setTimeout(function(){ try { b.disconnect(); } catch(_){} }, 600);
        } catch(_){}
      }
    },
    level: function(n){ lvl = n || 1; },
    playing: function(){ return on; }
  };
})();

$('btn-sfx').onclick = function(){
  soundOn = !soundOn;
  this.classList.toggle('on', soundOn);
  if (soundOn) sfx.tick();
};
$('btn-music').onclick = function(){
  musicOn = !musicOn;
  this.classList.toggle('on', musicOn);
  if (musicOn){ if (view && view.ph === 'play') music.start(); }
  else music.stop();
};

/* ---------- state ---------- */
var ws = null, myId = null, code = '', myName = '';
var view = null, role = 'drawer';
var cam = { x: 0, y: 0 }, camReady = false;
var smooth = null;                 /* the eased runner position */
var pending = [], localSegs = [];
var lastLevel = 1, wasGrounded = 1, lastAlive = 1, lastCd = 99, stepClock = 0;

/* ---------- connection ---------- */
function roomCode(){
  var L = 'ABCDEFGHJKLMNPQRSTUVWXYZ', s = '';
  for (var i = 0; i < 4; i++) s += L[Math.floor(Math.random() * L.length)];
  return s;
}
var attempts = 0, wantSolo = false;

function connect(rc, name, create, solo){
  code = rc; myName = name; wantSolo = !!solo;
  var settled = false;
  var btn = create ? (solo ? $('btn-solo') : $('btn-create')) : $('btn-join');
  var label = btn.textContent;
  btn.disabled = true; btn.textContent = 'Connecting...';

  var giveUp = setTimeout(function(){
    if (settled) return;
    try { ws && ws.close(); } catch(_){}
    btn.disabled = false; btn.textContent = label;
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
    onServer(m, btn, create, label);
  };
  ws.onerror = function(){
    if (settled) return;
    settled = true; clearTimeout(giveUp);
    btn.disabled = false; btn.textContent = label;
    joinErr('Could not reach the server.');
  };
  ws.onclose = function(){ if (settled) status('Disconnected. Reload to come back.'); };
}
function resetButtons(){
  $('btn-create').disabled = false; $('btn-create').textContent = 'Start a board';
  $('btn-solo').disabled = false;   $('btn-solo').textContent = 'Practise alone';
  $('btn-join').disabled = false;   $('btn-join').textContent = 'Join board';
}

function onServer(m, btn, create, label){
  if (m.t === 'taken'){
    try { ws.close(); } catch(_){}
    if (++attempts < 8) connect(roomCode(), myName, true, wantSolo);
    else { resetButtons(); joinErr('No free code found.'); }
    return;
  }
  if (m.t === 'closed'){ resetButtons(); joinErr('That board has already started.'); showMenu('s-landing'); return; }
  if (m.t === 'full'){   resetButtons(); joinErr('That board is full.');            showMenu('s-landing'); return; }
  if (m.t === 'you'){
    myId = m.id; myName = m.name; resetButtons();
    status(create ? 'Board open. Code ' + code : 'Connected to ' + code);
    if (wantSolo) ws.send(JSON.stringify({ t:'solo' }));
    return;
  }
  if (m.t !== 'state') return;

  var wasPh = view && view.ph;
  /* snapshot the record as the match begins, so the end screen can say how
     close you came without comparing you against your own run */
  if (m.ph === 'play' && wasPh !== 'play' && wasPh !== 'result'){
    recordBefore = topRows.length ? topRows[0].m : 0;
  }
  view = m;
  role = m.role;

  if (m.ph === 'lobby'){ music.stop(); renderLobby(); showMenu('s-lobby'); }
  else if (m.ph === 'over'){
    music.stop();
    buzz([60, 90, 60, 90, 160]);
    renderOver();
    loadTop('top-list-2', renderRecord);
    showMenu('s-over');
  }
  else {
    if (wasPh !== 'play' && wasPh !== 'result'){ camReady = false; smooth = null; localSegs.length = 0; }
    showBoard();
    if (m.ph === 'play' && m.r && m.r.a) music.start();
    renderHud(m);
  }
}

function renderHud(m){
  var r = m.r;
  $('round').textContent = (m.solo ? 'Practice' : 'Round ' + (m.round + 1) + ' of ' + m.rounds);
  $('dist').textContent = (r ? r.d : 0) + ' m';
  $('inkwrap').classList.toggle('hidden', role !== 'drawer');
  $('pad').style.display = role === 'runner' ? 'flex' : 'none';

  var leaps = (r && r.lp) || 0;
  $('leap').classList.toggle('hidden', leaps < 1);
  $('leap-n').textContent = leaps;

  if (role === 'runner' && r){
    $('role').innerHTML = leaps
      ? 'Running &nbsp;<span id="lvl">' + leaps + ' leap' + (leaps > 1 ? 's' : '') + '</span>'
      : 'Running &nbsp;<span id="lvl">level ' + r.lv + '</span>';
  } else {
    $('role').innerHTML = 'Drawing &nbsp;<span id="lvl">level ' + (r ? r.lv : 1) + '</span>';
  }

  if (r){
    var into = r.d % SPEED_EVERY;
    $('track').firstElementChild.style.width = (into / SPEED_EVERY * 100) + '%';
    $('tracklbl').textContent = (r.ms - r.d) + ' m to level ' + (r.lv + 1);
  }

  var pct = Math.max(0, Math.min(1, m.ink / m.inkMax));
  $('inkbar').firstElementChild.style.width = (pct * 100) + '%';
  $('inkbar').classList.toggle('low', pct < 0.25);

  if (m.ph === 'result'){
    $('banner-big').textContent = m.result;
    $('banner-small').textContent = m.solo ? 'Going again' : 'Next round in a moment';
    $('banner').style.display = 'block';
  } else if (m.cd > 0){
    $('banner-big').textContent = m.cd;
    $('banner-small').textContent = role === 'drawer'
      ? 'Draw the first stretch, quickly'
      : 'Hold on, the ground is being laid';
    $('banner').style.display = 'block';
    if (m.cd !== lastCd){ lastCd = m.cd; sfx.tick(); }
  } else {
    $('banner').style.display = 'none';
    lastCd = 99;
  }

  /* the sounds that belong to things changing, not to every frame */
  if (r){
    music.level(r.lv);
    if (r.lv !== lastLevel){
      lastLevel = r.lv;
      if (r.lv > 1){ sfx.level(); buzz([14, 50, 14]); }
    }
    if (r.g && !wasGrounded) sfx.land();
    wasGrounded = r.g;
    if (!r.a && lastAlive){
      sfx.die();
      buzz([90, 60, 150]);        /* the fall, felt rather than heard */
      music.stop();
    }
    if (r.a && !lastAlive) music.start();
    lastAlive = r.a;
  }
}

function renderLobby(){
  var r = view ? view.roster : [];
  $('lobby-code').textContent = code || '----';
  $('lobby-players').innerHTML = r.map(function(p, i){
    return '<li><span>' + esc(p.n) + '</span><span class="tag2">' +
           (i === 0 ? 'host' : 'ready') + '</span></li>';
  }).join('');
  var host = view && view.host;
  $('host-controls').classList.toggle('hidden', !host);
  $('lobby-wait').classList.toggle('hidden', !!host);
  if (host){
    $('btn-start').disabled = r.length < 2;
    $('btn-start').textContent = r.length < 2 ? 'Waiting for a second player' : 'Start (' + r.length + ')';
  }
}
function renderOver(){
  var r = (view ? view.roster : []).slice().sort(function(a,b){ return b.s - a.s; });
  $('over-sub').textContent = r.length
    ? r[0].n + ' leads on ' + r[0].s + ' metres across four rounds.' : '';
  $('over-list').innerHTML = r.map(function(p, i){
    return '<li><span><span class="rank">' + (i+1) + '</span>' + esc(p.n) +
           ' <span class="tag2">best run ' + p.b + ' m</span></span>' +
           '<span class="metres">' + p.s + ' m</span></li>';
  }).join('');
  var host = view && view.host;
  $('over-controls').classList.toggle('hidden', !host);
  $('over-wait').classList.toggle('hidden', !!host);
  renderRecord(topRows);
}

/* The bit that is meant to make somebody play again: what the best single run
   of this match was, and exactly how far off the record it landed. */
function renderRecord(rows){
  var el = $('over-record');
  if (!el) return;
  var roster = (view ? view.roster : []);
  var mine = 0, who = '';
  roster.forEach(function(p){ if (p.b > mine){ mine = p.b; who = p.n; } });
  var rec = recordBefore || ((rows && rows.length) ? rows[0].m : 0);
  var holder = (rows && rows.length) ? rows[0].n : '';

  if (!mine){ el.className = 'record'; el.textContent = ''; return; }
  if (!rec || mine > rec){
    el.className = 'record beat';
    el.innerHTML = 'New record. <b>' + mine + ' m</b> by ' + esc(who) + '.';
    buzz([30, 60, 30, 60, 30]);
  } else if (mine === rec){
    el.className = 'record beat';
    el.innerHTML = 'Level with the record, <b>' + mine + ' m</b>.';
  } else {
    el.className = 'record';
    el.innerHTML = 'Best run <b>' + mine + ' m</b>. The record is ' + rec + ' m' +
                   (holder ? ' by ' + esc(holder) : '') +
                   ', so you were <b>' + (rec - mine) + ' m</b> short.';
  }
}

/* ---------- the stored leaderboard ---------- */
var topRows = [], recordBefore = 0;
function loadTop(into, after){
  fetch('/api/top', { cache:'no-store' }).then(function(r){ return r.json(); }).then(function(j){
    var rows = (j.top || []).slice(0, 10);
    topRows = rows;
    if (after) after(rows);
    var el = $(into);
    if (!el) return;
    el.innerHTML = rows.length
      ? rows.map(function(p, i){
          return '<li><span><span class="rank">' + (i+1) + '</span>' + esc(p.n) +
                 (p.w ? ' <span class="tag2">with ' + esc(p.w) + '</span>' : '') +
                 '</span><span class="metres">' + p.m + ' m</span></li>';
        }).join('')
      : '<li><span class="tag2">nobody has run yet</span></li>';
  }).catch(function(){
    var el = $(into);
    if (el) el.innerHTML = '<li><span class="tag2">could not load</span></li>';
  });
}
loadTop('top-list');

/* ==========================================================================
   The board
   ========================================================================== */
var cv = $('cv'), ctx = cv.getContext('2d');
var VW = 0, VH = 0, PPM = 40;

function resize(){
  var dpr = Math.min(2, devicePixelRatio || 1);
  VW = innerWidth; VH = innerHeight;
  cv.width = Math.round(VW * dpr); cv.height = Math.round(VH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  /* Never show more world than the server is willing to send, or chalk
     disappears at the edges. That was a real bug, not a theory. */
  var minPPM = VW / (SEND_BACK + SEND_FWD - 12);
  PPM = Math.max(minPPM, Math.min(58, Math.min(VW, VH) / 12));
}
addEventListener('resize', resize);
resize();

function sx(x){ return (x - cam.x) * PPM + VW * 0.32; }
function sy(y){ return VH * 0.62 - (y - cam.y) * PPM; }
function wx(px){ return (px - VW * 0.32) / PPM + cam.x; }
function wy(py){ return (VH * 0.62 - py) / PPM + cam.y; }

var dust = [];
for (var i = 0; i < 80; i++){
  dust.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.3 + 0.3,
              a: Math.random() * 0.045 + 0.012 });
}

function paintBoard(c, w, h){
  c.fillStyle = '#232E28'; c.fillRect(0, 0, w, h);
  for (var i = 0; i < dust.length; i++){
    var d = dust[i];
    c.fillStyle = 'rgba(244,243,233,' + d.a + ')';
    c.beginPath(); c.arc(d.x * w, d.y * h, d.r * 11, 0, Math.PI * 2); c.fill();
  }
  var g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(255,255,255,.035)');
  g.addColorStop(1, 'rgba(0,0,0,.14)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
}

/* Chalk twice over: a soft wide pass and a bright thin one. That is what
   makes a line look dusty rather than printed. */
function strokeChalk(c, path, wide, thin){
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = 'rgba(244,243,233,.18)'; c.lineWidth = wide;
  c.stroke(path);
  c.strokeStyle = 'rgba(244,243,233,.95)'; c.lineWidth = thin;
  c.stroke(path);
}

/* Segments arrive as straight pieces. Joining them through their midpoints
   with quadratic curves hides the corners and looks like a hand moved. */
function chalkPath(segs, X, Y){
  var p = new Path2D();
  if (!segs.length) return p;
  var run = [];
  function flushRun(){
    if (run.length < 2){ run = []; return; }
    p.moveTo(X(run[0][0]), Y(run[0][1]));
    for (var i = 1; i < run.length - 1; i++){
      var mx = (run[i][0] + run[i+1][0]) / 2, my = (run[i][1] + run[i+1][1]) / 2;
      p.quadraticCurveTo(X(run[i][0]), Y(run[i][1]), X(mx), Y(my));
    }
    var last = run[run.length - 1];
    p.lineTo(X(last[0]), Y(last[1]));
    run = [];
  }
  for (var i = 0; i < segs.length; i++){
    var s = segs[i];
    if (!run.length){ run.push([s[0], s[1]], [s[2], s[3]]); continue; }
    var tail = run[run.length - 1];
    if (Math.abs(tail[0] - s[0]) < 0.02 && Math.abs(tail[1] - s[1]) < 0.02) run.push([s[2], s[3]]);
    else { flushRun(); run.push([s[0], s[1]], [s[2], s[3]]); }
  }
  flushRun();
  return p;
}

function liveSegs(){
  var now = performance.now();
  while (localSegs.length && now - localSegs[0].at > 700) localSegs.shift();
  var out = (view && view.s) ? view.s.slice() : [];
  for (var i = 0; i < localSegs.length; i++) out.push(localSegs[i].s);
  return out;
}

function frame(){
  requestAnimationFrame(frame);
  if (!view || !view.r || (view.ph !== 'play' && view.ph !== 'result')){
    paintBoard(ctx, VW, VH);
    return;
  }
  var r = view.r;
  var now = performance.now();
  var dt = Math.min(0.1, (now - (frame.last || now)) / 1000);
  frame.last = now;

  /* The runner arrives thirty times a second. Easing toward it on the clock
     turns that into something that looks like running. */
  if (!smooth) smooth = { x: r.x, y: r.y };
  var k = 1 - Math.pow(2e-9, dt);   /* about a fiftieth of a second to catch up */
  if (Math.abs(r.x - smooth.x) > 6){ smooth.x = r.x; smooth.y = r.y; }
  else { smooth.x += (r.x - smooth.x) * k; smooth.y += (r.y - smooth.y) * k; }

  if (!camReady){ cam.x = smooth.x; cam.y = smooth.y; camReady = true; }
  else if (Math.abs(smooth.x - cam.x) > 7 || Math.abs(smooth.y - cam.y) > 6){
    cam.x = smooth.x; cam.y = smooth.y;
  } else {
    cam.x += (smooth.x - cam.x) * (1 - Math.pow(0.0001, dt));
    cam.y += (smooth.y - cam.y) * (1 - Math.pow(0.03, dt));
  }

  paintBoard(ctx, VW, VH);
  drawMilestones(r);
  if (role === 'drawer') drawReach(r);
  strokeChalk(ctx, chalkPath(liveSegs(), sx, sy), 11, 4.5);
  if (role === 'drawer' && pending.length >= 4){
    var live = [];
    for (var i = 0; i + 3 < pending.length; i += 2) live.push([pending[i], pending[i+1], pending[i+2], pending[i+3]]);
    ctx.save(); ctx.globalAlpha = 0.6;
    strokeChalk(ctx, chalkPath(live, sx, sy), 10, 4);
    ctx.restore();
  }
  drawRunner(r, smooth);

  /* footsteps, but only while actually on the ground and running */
  if (r.a && r.g && view.ph === 'play'){
    stepClock -= dt;
    if (stepClock <= 0){ sfx.step(); stepClock = 0.26; }
  }
}

/* the ticks across the board that say how far you have come */
function drawMilestones(r){
  var from = Math.floor((cam.x - 20) / SPEED_EVERY) * SPEED_EVERY;
  var to = cam.x + 60;
  ctx.save();
  for (var d = Math.max(SPEED_EVERY, from); d < to; d += SPEED_EVERY){
    var X = sx(START_X + d);
    if (X < -40 || X > VW + 40) continue;
    var passed = r.d >= d;
    ctx.strokeStyle = passed ? 'rgba(240,166,92,.28)' : 'rgba(244,243,233,.14)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 8]);
    ctx.beginPath(); ctx.moveTo(X, 0); ctx.lineTo(X, VH); ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = '600 13px "Caveat", cursive';
    ctx.fillStyle = passed ? 'rgba(240,166,92,.7)' : 'rgba(244,243,233,.38)';
    ctx.textAlign = 'center';
    ctx.fillText(d + ' m', X, VH * 0.14);
  }

  /* the record, standing out there on the board waiting to be run past */
  if (recordBefore > 0 && recordBefore > r.d - 40 && recordBefore < cam.x + 70){
    var RX = sx(START_X + recordBefore);
    if (RX > -80 && RX < VW + 80){
      ctx.strokeStyle = 'rgba(232,119,107,.75)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(RX, 0); ctx.lineTo(RX, VH); ctx.stroke();
      ctx.font = '700 22px "Caveat", cursive';
      ctx.fillStyle = 'rgba(232,119,107,.95)';
      ctx.textAlign = 'center';
      ctx.fillText('record ' + recordBefore + ' m', RX, VH * 0.09);
    }
  }
  ctx.restore();
}

function drawReach(r){
  var x0 = sx(r.x - REACH_BACK), x1 = sx(r.x + REACH_FWD);
  var y0 = sy(r.y + REACH_UP),   y1 = sy(r.y - REACH_DOWN);
  ctx.save();
  ctx.setLineDash([6, 9]);
  ctx.strokeStyle = 'rgba(244,243,233,.15)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  ctx.restore();
}

function drawRunner(r, at){
  var x = sx(at.x), y = sy(at.y), s = PPM;
  var t = performance.now() / 1000;
  var swing = r.g ? Math.sin(t * 16) : 0.55;

  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = r.a ? 1 : 0.32;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2.4, s * 0.072);

  if (r.fl){
    ctx.strokeStyle = 'rgba(240,166,92,.45)';
    ctx.lineWidth = Math.max(3, s * 0.09);
    ctx.beginPath();
    for (var q = 1; q <= 3; q++){
      ctx.moveTo(-s * (0.3 + q * 0.26), s * 0.1 + q * 5);
      ctx.lineTo(-s * (0.08 + q * 0.26), s * 0.1 + q * 5);
    }
    ctx.stroke();
    ctx.lineWidth = Math.max(2.4, s * 0.072);
  }
  ctx.strokeStyle = r.fl ? 'rgba(250,212,164,1)' : 'rgba(244,243,233,.98)';

  ctx.beginPath(); ctx.arc(0, -s * 0.52, s * 0.19, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -s * 0.33); ctx.lineTo(0, s * 0.06); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.2); ctx.lineTo(-s * 0.26, -s * 0.04 + swing * s * 0.11);
  ctx.moveTo(0, -s * 0.2); ctx.lineTo( s * 0.26, -s * 0.04 - swing * s * 0.11);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, s * 0.06); ctx.lineTo(-s * 0.2 + swing * s * 0.2, s * 0.36);
  ctx.moveTo(0, s * 0.06); ctx.lineTo( s * 0.2 + swing * s * 0.2, s * 0.36);
  ctx.stroke();
  ctx.restore();
}
requestAnimationFrame(frame);

/* ==========================================================================
   The looping demo on the gate
   ========================================================================== */
(function(){
  var dc = $('demo'), g = dc.getContext('2d');
  var W = 0, H = 0, t = 0;
  function fit(){
    var dpr = Math.min(2, devicePixelRatio || 1);
    W = dc.clientWidth; H = dc.clientHeight;
    dc.width = Math.round(W * dpr); dc.height = Math.round(H * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener('resize', fit); fit();

  function tick(){
    requestAnimationFrame(tick);
    if ($('gate').classList.contains('hidden')) return;
    if (!W){ fit(); return; }
    t += 0.016;
    var loop = 5.0, u = (t % loop) / loop;

    g.fillStyle = '#1E2823'; g.fillRect(0, 0, W, H);
    var groundY = function(x){ return H * 0.70 + Math.sin(x * 0.028 + 1.2) * H * 0.10; };
    var drawnTo = u * (W + 60);

    var p = new Path2D();
    p.moveTo(0, groundY(0));
    for (var x = 0; x <= drawnTo; x += 6) p.lineTo(x, groundY(x));
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(244,243,233,.16)'; g.lineWidth = 8; g.stroke(p);
    g.strokeStyle = 'rgba(244,243,233,.9)';  g.lineWidth = 3; g.stroke(p);

    /* the chalk tip, always just ahead */
    g.fillStyle = 'rgba(240,166,92,.9)';
    g.beginPath(); g.arc(drawnTo, groundY(drawnTo), 3.4, 0, Math.PI * 2); g.fill();

    /* the runner, always just behind it */
    var rx = Math.max(12, drawnTo - 58), ry = groundY(rx) - 11;
    var sw = Math.sin(t * 16);
    g.strokeStyle = 'rgba(244,243,233,.95)'; g.lineWidth = 2.1; g.lineCap = 'round';
    g.beginPath(); g.arc(rx, ry - 11, 4.2, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(rx, ry - 7); g.lineTo(rx, ry + 2); g.stroke();
    g.beginPath();
    g.moveTo(rx, ry - 4); g.lineTo(rx - 6, ry + sw * 2.4);
    g.moveTo(rx, ry - 4); g.lineTo(rx + 6, ry - sw * 2.4);
    g.stroke();
    g.beginPath();
    g.moveTo(rx, ry + 2); g.lineTo(rx - 5 + sw * 5, ry + 10);
    g.moveTo(rx, ry + 2); g.lineTo(rx + 5 + sw * 5, ry + 10);
    g.stroke();
  }
  requestAnimationFrame(tick);
})();

/* ==========================================================================
   Input
   ========================================================================== */
function sendJump(){
  if (ws && ws.readyState === 1){ ws.send(JSON.stringify({ t:'jump' })); sfx.jump(); buzz(12); }
}
function sendLeap(){
  if (view && view.r && !view.r.lp) return;
  if (ws && ws.readyState === 1){ ws.send(JSON.stringify({ t:'leap' })); sfx.leap(); buzz([22, 40, 22]); }
}

var drawing = false, penId = null, lastSent = 0;
function flush(force){
  if (!ws || ws.readyState !== 1) return;
  if (pending.length < 4) return;
  var now = performance.now();
  if (!force && now - lastSent < 20) return;
  lastSent = now;
  ws.send(JSON.stringify({ t:'draw', pts: pending }));
  for (var i = 0; i + 3 < pending.length; i += 2){
    localSegs.push({ s: [pending[i], pending[i+1], pending[i+2], pending[i+3]], at: now });
  }
  pending = pending.slice(-2);
}

cv.addEventListener('pointerdown', function(e){
  audio();
  if (role === 'runner'){ sendJump(); return; }
  if (!view || view.ph !== 'play') return;
  drawing = true; penId = e.pointerId; pending = [wx(e.clientX), wy(e.clientY)];
  cv.setPointerCapture(e.pointerId);
});
/* A fast drag jumps several metres between two pointer events, and the server
   throws away any segment longer than three metres, which used to leave holes
   in the ground exactly where somebody was drawing in a hurry. So the gap gets
   filled in here before it is sent. */
function penTo(x, y){
  var n = pending.length;
  if (n >= 2){
    var px = pending[n-2], py = pending[n-1];
    var d = Math.hypot(x - px, y - py);
    if (d > 1.4){
      var steps = Math.min(24, Math.ceil(d / 1.4));
      for (var i = 1; i < steps; i++){
        pending.push(px + (x - px) * i / steps, py + (y - py) * i / steps);
      }
    } else if (d < 0.02) return;
  }
  pending.push(x, y);
}
cv.addEventListener('pointermove', function(e){
  if (!drawing || e.pointerId !== penId) return;
  var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
  if (evs && evs.length){
    for (var i = 0; i < evs.length; i++) penTo(wx(evs[i].clientX), wy(evs[i].clientY));
  } else {
    penTo(wx(e.clientX), wy(e.clientY));
  }
  if (pending.length % 8 < 2) sfx.chalk();
  flush(pending.length > 60);
});
function penUp(e){
  if (e.pointerId !== penId) return;
  flush(true);
  drawing = false; penId = null; pending = [];
}
cv.addEventListener('pointerup', penUp);
cv.addEventListener('pointercancel', penUp);

$('jump').addEventListener('pointerdown', function(e){ e.preventDefault(); e.stopPropagation(); sendJump(); });
$('leap').addEventListener('pointerdown', function(e){ e.preventDefault(); e.stopPropagation(); sendLeap(); });
addEventListener('keydown', function(e){
  if (e.target && e.target.tagName === 'INPUT') return;
  var k = e.key;
  if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W'){ sendJump(); e.preventDefault(); }
  if (k === 'Shift' || k === 'l' || k === 'L'){ sendLeap(); e.preventDefault(); }
});

/* ---------- wiring ---------- */
$('btn-create').onclick = function(){
  joinErr(''); attempts = 0; audio();
  connect(roomCode(), ($('host-name').value || 'Host').trim().slice(0,12) || 'Host', true, false);
};
$('btn-solo').onclick = function(){
  joinErr(''); attempts = 0; audio();
  connect(roomCode(), ($('host-name').value || 'You').trim().slice(0,12) || 'You', true, true);
};
$('btn-solo2').onclick = function(){ if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t:'solo' })); };
$('btn-join').onclick = function(){
  var rc = ($('join-code').value || '').trim().toUpperCase();
  if (rc.length !== 4){ joinErr('The board code is four letters.'); return; }
  joinErr(''); audio();
  connect(rc, ($('join-name').value || 'Player').trim().slice(0,12) || 'Player', false, false);
};
$('btn-start').onclick = function(){ if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t:'start' })); };
$('btn-again').onclick = function(){ if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t:'again' })); };

$('join-code').addEventListener('input', function(){
  this.value = this.value.toUpperCase().replace(/[^A-Z]/g, '');
});
$('join-code').addEventListener('keydown', function(e){ if (e.key === 'Enter') $('btn-join').click(); });
$('host-name').addEventListener('keydown', function(e){ if (e.key === 'Enter') $('btn-create').click(); });

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
