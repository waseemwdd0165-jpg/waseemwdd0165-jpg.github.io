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
  /* a school chalkboard, not a slate one */
  --board:#2E5B49; --board-2:#264B3C; --board-3:#1E3C30;
  --chalk:#F4F3E9; --soft:rgba(244,243,233,.66); --dim:rgba(244,243,233,.44);
  --line:rgba(244,243,233,.18);
  --warn:#F5B973; --bad:#E8776B; --good:#9FD79A;
}
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
html,body{height:100%;overflow:hidden;background:var(--board-3)}
body{
  font:400 16px/1.5 "Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  color:var(--chalk);
}
/* only the game board is the fullscreen one. The demo canvas on the gate is
   an ordinary element, and styling every canvas here threw it across the page. */
#cv{position:fixed;inset:0;width:100%;height:100%;display:block;touch-action:none}
.hand{font-family:"Caveat",cursive}
.hidden{display:none!important}

/* ---------- gate ----------
   One screen, no scrolling. The stage is a column that centres itself and the
   only thing allowed to scroll is the panel in the middle, and then only on a
   short phone at the end of a match. */
#gate{
  position:fixed;inset:0;z-index:40;overflow:hidden;display:flex;
  background:
    radial-gradient(1200px 700px at 50% -10%, rgba(244,243,233,.08), transparent 60%),
    linear-gradient(var(--board), var(--board-2));
}
#gate .stage{
  margin:auto;width:100%;max-width:420px;height:100%;
  padding:18px 18px calc(14px + env(safe-area-inset-bottom));
  display:flex;flex-direction:column;justify-content:center;
}
.brand{text-align:center;flex:0 0 auto}
.brand h1{
  font-family:"Caveat",cursive;font-weight:700;
  font-size:clamp(40px,12.5vw,68px);line-height:.92;letter-spacing:.01em;
}
.brand .tag{
  font-family:"Caveat",cursive;font-size:clamp(18px,5vw,25px);
  color:var(--warn);line-height:1;margin-top:1px;
}
.say{color:var(--soft);font-size:13.5px;line-height:1.45;text-align:center;
     margin:10px 0 2px;flex:0 0 auto}
.say b{color:var(--chalk);font-weight:600}

/* the little looping demo, so you see the game before you read about it */
#demo{
  position:static;display:block;
  width:100%;flex:0 1 120px;min-height:0;margin:12px 0 2px;border-radius:14px;
  border:1px solid var(--line);background:rgba(0,0,0,.16);
}
@media (max-height:600px){ #demo{display:none} .say{display:none} }

.panel{flex:0 1 auto;min-height:0;overflow-y:auto;margin-top:12px}
.card{
  background:rgba(0,0,0,.20);border:1px solid var(--line);
  border-radius:16px;padding:14px;
}
.card + .card{margin-top:10px}
.card h2{font-size:14px;font-weight:600;margin-bottom:3px}
.card p{color:var(--soft);font-size:13px;margin-bottom:10px;line-height:1.45}
input[type=text]{
  width:100%;padding:12px 14px;border-radius:11px;font-size:15px;font-family:inherit;
  background:rgba(0,0,0,.26);border:1px solid var(--line);color:var(--chalk);
}
input[type=text]::placeholder{color:rgba(244,243,233,.35)}
input[type=text]:focus{outline:none;border-color:rgba(244,243,233,.52)}
input.code{font:700 19px/1 "Inter",monospace;letter-spacing:.22em;text-transform:uppercase;text-align:center}
button{
  width:100%;font:600 15px inherit;cursor:pointer;border:0;border-radius:11px;padding:12px;
  background:var(--chalk);color:#1D2723;transition:transform .06s,opacity .15s;
}
button:active{transform:translateY(1px)}
button:disabled{opacity:.45;cursor:not-allowed}
button.ghost{background:transparent;border:1px solid var(--line);color:var(--chalk)}
.row{margin-top:9px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:9px}
.joinrow{display:grid;grid-template-columns:1fr auto;gap:9px}
.joinrow button{width:auto;padding:12px 20px}
.err{color:var(--bad);font-size:13px;margin-top:8px}
.status{font-size:12px;color:var(--dim);text-align:center;margin-top:10px;flex:0 0 auto}

/* a hand drawn rule with a word sitting on it */
.orline{display:flex;align-items:center;gap:10px;margin:13px 0 11px;
        color:var(--dim);font-size:11px;letter-spacing:.12em;text-transform:uppercase}
.orline:before,.orline:after{content:"";flex:1;height:1px;background:var(--line)}

.links{display:flex;justify-content:center;gap:10px;align-items:center;
       margin-top:12px;color:var(--dim);font-size:12.5px}
button.link{width:auto;padding:2px 2px;background:none;color:var(--soft);
            font:500 12.5px inherit;text-decoration:underline;text-underline-offset:3px}

/* the two things that used to be cards below the fold */
#sheet{
  position:fixed;inset:0;z-index:50;display:flex;padding:18px;
  background:rgba(14,30,24,.82);backdrop-filter:blur(5px);
}
#sheet .sheetbox{
  margin:auto;width:100%;max-width:420px;max-height:88%;overflow-y:auto;
  background:var(--board-2);border:1px solid var(--line);border-radius:18px;padding:18px;
}
#sheet h2{font-size:15px;margin-bottom:8px}
#sheet p{color:var(--soft);font-size:13.5px;line-height:1.5}
#sheet p + p{margin-top:10px}
#sheet-x{margin-top:14px}

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
  position:fixed;left:50%;transform:translateX(-50%);top:67px;z-index:20;
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
  background:rgba(245,185,115,.16);animation:ready 1.6s ease-in-out infinite;
}
#leap small{font:700 19px "Caveat",cursive;line-height:1}
/* the runner's one say in the pace */
#brake{
  width:82px;height:82px;border-color:rgba(159,215,154,.55);color:var(--good);
  background:rgba(159,215,154,.12);font-size:13px;
}
#brake small{font:700 17px "Caveat",cursive;line-height:1;min-height:17px}
#brake.cooling{opacity:.4;border-color:var(--line);color:var(--dim);background:rgba(0,0,0,.2)}
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
 <div class="stage">
    <div class="brand">
      <h1 class="hand">Chalk Runner</h1>
      <div class="tag hand">One step ahead</div>
    </div>
    <canvas id="demo"></canvas>
    <p class="say">One of you <b>draws</b>. The other <b>runs</b> on it.
    The runner never stops, and there is no ground until somebody makes some.</p>

    <div class="panel">
      <section id="s-landing">
        <div class="card">
          <input type="text" id="host-name" maxlength="12" placeholder="Your name"
                 autocomplete="off" spellcheck="false">
          <div class="two">
            <button id="btn-create">Start a board</button>
            <button class="ghost" id="btn-solo">Practise alone</button>
          </div>
          <div class="orline">or join a friend</div>
          <div class="joinrow">
            <input type="text" id="join-code" class="code" maxlength="4" placeholder="CODE"
                   autocomplete="off" spellcheck="false">
            <button class="ghost" id="btn-join">Join</button>
          </div>
          <div class="err hidden" id="join-err"></div>
        </div>
        <div class="links">
          <button class="link" id="btn-how">How to play</button>
          <span>&middot;</span>
          <button class="link" id="btn-top">Furthest runs</button>
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
          <div class="row"><button class="ghost hidden" id="btn-card">Save the picture</button></div>
          <div class="row" id="over-controls"><button id="btn-again">Play again</button></div>
          <div class="status hidden" id="over-wait">Waiting for the host</div>
        </div>
        <div class="card">
          <h2>Furthest runs</h2>
          <ul class="list" id="top-list-2"></ul>
        </div>
      </section>
    </div>

    <div class="status" id="conn"></div>
 </div>
</div>

<div id="sheet" class="hidden">
  <div class="sheetbox">
    <div id="sheet-how" class="hidden">
      <h2>How to play</h2>
      <p>Drag anywhere to lay chalk and it becomes real ground. You can only draw
      near the runner and the chalk runs out, so you are always one line behind.</p>
      <p>Three things get in the way. A <b>wall</b> has to be got over, so build a
      ramp. A <b>hanging block</b> has to be got under, so keep the road low. And
      in a red <b>no chalk</b> band nothing sticks at all, so the runner has to
      jump it. Everyone in the room gets the same level.</p>
      <p>Every 50 metres the runner speeds up. Every 100 they bank a leap, a huge
      floating jump. The runner also has SLOW: one second at half pace, on a six
      second cooldown, which is the runner's one say in how hard the drawer's
      life is. Four rounds, roles swap, the score is metres.</p>
      <p>If somebody's connection drops, the whole round stops and waits
      twenty five seconds for them.</p>
      <p>The record stands on the board as a red line out ahead of you. Run past it.</p>
    </div>
    <div id="sheet-top" class="hidden">
      <h2>Today's board</h2>
      <p style="font-size:12.5px;margin-bottom:6px">Everybody gets the same level today.
      Tomorrow it changes and this list starts again.</p>
      <ul class="list" id="day-list"><li><span class="tag2">loading</span></li></ul>
      <h2 style="margin-top:18px">All time</h2>
      <ul class="list" id="top-list"><li><span class="tag2">loading</span></li></ul>
    </div>
    <button class="ghost" id="sheet-x">Close</button>
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
  <button id="brake">SLOW<small id="brake-n"></small></button>
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
var REACH_BACK = 8, REACH_FWD = 26, REACH_UP = 9, REACH_DOWN = 7;
var SPEED_EVERY = 50;
/* the server sends chalk within this window, so the view must never be wider */
var SEND_BACK = 55, SEND_FWD = 60;
/* how long a line drawn here is kept before the server's copy is the only one
   left. It used to be 700ms, which was long enough for the round trip and not
   long enough to look like anything but a line vanishing. */
var LOCAL_SOLID = 1200, LOCAL_FADE = 900;
var WALL_W = 0.9, ROOF_W = 2.6;

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
  brake: function(){ tone(520, 220, 0.3, 0.07, 'sawtooth'); noise(0.22, 900, 0.05); },
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
var ws = null, myId = null, myKey = '', code = '', myName = '';
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
    ws.send(JSON.stringify({ t:'join', name:name, create: !!create, key: myKey || undefined }));
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
  ws.onclose = function(){ if (settled) lostConnection(); };
}

/* ==========================================================================
   Coming back

   A phone that locks, a train tunnel, a tab the browser puts to sleep. The
   seat is held for twenty five seconds on the server, so this just keeps
   trying, and says so, rather than telling somebody to reload.
   ========================================================================== */
var retryAt = 0, retries = 0, retryTimer = null;

function seatStore(save){
  try {
    if (save) localStorage.setItem('cr.seat', JSON.stringify({ c:code, k:myKey, n:myName, at:Date.now() }));
    else {
      var raw = localStorage.getItem('cr.seat');
      return raw ? JSON.parse(raw) : null;
    }
  } catch(_){ return null; }
}
function forgetSeat(){ try { localStorage.removeItem('cr.seat'); } catch(_){} }

function lostConnection(){
  if (!myKey || !code){ status('Disconnected. Reload to come back.'); return; }
  if (!retryAt) retryAt = Date.now();
  if (Date.now() - retryAt > 26000){
    forgetSeat();
    status('You were away too long and lost the seat.');
    banner('Disconnected', 'The board went on without you');
    return;
  }
  retries++;
  banner('Reconnecting', 'Hold on, your seat is being kept');
  clearTimeout(retryTimer);
  retryTimer = setTimeout(reopen, Math.min(2500, 400 * retries));
}
function reopen(){
  var proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  try { ws = new WebSocket(proto + '//' + location.host + '/api/ws?room=' + code); }
  catch(_){ lostConnection(); return; }
  ws.onopen = function(){ ws.send(JSON.stringify({ t:'join', name:myName, key:myKey })); };
  ws.onmessage = function(e){
    var m; try { m = JSON.parse(e.data); } catch(_){ return; }
    onServer(m, { disabled:false, textContent:'' }, false, '');
  };
  ws.onerror = function(){};
  ws.onclose = function(){ lostConnection(); };
}
function banner(big, small){
  $('banner-big').textContent = big;
  $('banner-small').textContent = small || '';
  $('banner').style.display = 'block';
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
  if (m.t === 'closed' || m.t === 'full'){
    var wasBack = !!myKey;
    myKey = ''; forgetSeat(); retryAt = 0;
    resetButtons();
    joinErr(wasBack ? 'You were away too long and lost your seat.'
                    : (m.t === 'full' ? 'That board is full.' : 'That board has already started.'));
    showMenu('s-landing');
    return;
  }
  if (m.t === 'you'){
    myId = m.id; myName = m.name; myKey = m.key || myKey;
    retryAt = 0; retries = 0;
    seatStore(true);
    resetButtons();
    status(m.back ? 'Back in' : (create ? 'Board open. Code ' + code : 'Connected to ' + code));
    if (m.back) $('banner').style.display = 'none';
    if (wantSolo && !m.back) ws.send(JSON.stringify({ t:'solo' }));
    return;
  }
  if (m.t !== 'state') return;

  var wasPh = view && view.ph;
  /* snapshot the record as the match begins, so the end screen can say how
     close you came without comparing you against your own run */
  if (m.ph === 'play' && wasPh !== 'play' && wasPh !== 'result'){
    recordBefore = topRows.length ? topRows[0].m : 0;
    recordSeen = true;
    if (wasPh === 'lobby' || wasPh === 'over' || !wasPh) bestRun = null;
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
    if (m.ph === 'result' && wasPh !== 'result' && m.rp && m.rp.length > 3) startReplay(m);
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

  var cool = (r && r.bc) || 0;
  $('brake').classList.toggle('cooling', cool > 0);
  $('brake-n').textContent = cool > 0 ? cool : '';

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

  if (m.held){
    banner('Waiting for ' + m.held,
           'Everything is paused. ' + m.hold + ' seconds before the round goes on without them.');
    lastCd = 99;
  } else if (m.ph === 'result'){
    /* while the run is being played back the board says it all */
    if (replay){ $('banner').style.display = 'none'; }
    else {
      $('banner-big').textContent = m.result;
      $('banner-small').textContent = m.solo ? 'Going again' : 'Next round in a moment';
      $('banner').style.display = 'block';
    }
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
  $('btn-card').classList.toggle('hidden', !bestRun);
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
  /* the record as it stood when this match began, so a pair are not measured
     against the run they have just made */
  var rec = recordSeen ? recordBefore : ((rows && rows.length) ? rows[0].m : 0);
  var holder = (rows && rows.length) ? rows[0].n : '';

  if (!mine){ el.className = 'record'; el.textContent = ''; return; }
  if (!rec || mine > rec){
    el.className = 'record beat';
    el.innerHTML = rec
      ? 'New record. <b>' + mine + ' m</b> by ' + esc(who) + '.'
      : 'First name on the board. <b>' + mine + ' m</b> by ' + esc(who) + '.';
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
var topRows = [], dayRows = [], recordBefore = 0, recordSeen = false;
function boardRows(rows, empty){
  return rows.length
    ? rows.map(function(p, i){
        return '<li><span><span class="rank">' + (i+1) + '</span>' + esc(p.n) +
               (p.w ? ' <span class="tag2">with ' + esc(p.w) + '</span>' : '') +
               '</span><span class="metres">' + p.m + ' m</span></li>';
      }).join('')
    : '<li><span class="tag2">' + empty + '</span></li>';
}
function loadTop(into, after){
  fetch('/api/top', { cache:'no-store' }).then(function(r){ return r.json(); }).then(function(j){
    topRows = (j.top || []).slice(0, 10);
    dayRows = (j.day || []).slice(0, 10);
    if (after) after(topRows);
    var el = $(into);
    if (el) el.innerHTML = boardRows(topRows, 'nobody has run yet');
    var d = $('day-list');
    if (d) d.innerHTML = boardRows(dayRows, 'nobody has run today');
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
  c.fillStyle = '#2E5B49'; c.fillRect(0, 0, w, h);
  /* smears of old chalk, which is most of what a school board looks like */
  for (var i = 0; i < dust.length; i++){
    var d = dust[i];
    c.fillStyle = 'rgba(244,243,233,' + d.a + ')';
    c.beginPath(); c.arc(d.x * w, d.y * h, d.r * 11, 0, Math.PI * 2); c.fill();
  }
  var g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(255,255,255,.045)');
  g.addColorStop(0.55, 'rgba(0,0,0,.04)');
  g.addColorStop(1, 'rgba(0,0,0,.20)');
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

/* The local echo is only there to cover the round trip, so anything older than
   a moment is dead weight. This gets pruned on the way in as well as on the way
   out, because a backgrounded tab stops drawing frames but keeps drawing chalk,
   and the list grew into the thousands during a live test. */
function pruneLocal(now){
  var life = LOCAL_SOLID + LOCAL_FADE;
  while (localSegs.length && now - localSegs[0].at > life) localSegs.shift();
  if (localSegs.length > 1400) localSegs.splice(0, localSegs.length - 1400);
}
/* Everything the board should show right now, split into the lines that are
   certain and the ones that are on their way out. */
function liveSegs(){
  var now = performance.now();
  pruneLocal(now);
  var solid = (view && view.s) ? view.s.slice() : [];
  var going = [], dim = 0;
  for (var i = 0; i < localSegs.length; i++){
    var age = now - localSegs[i].at;
    if (age <= LOCAL_SOLID) solid.push(localSegs[i].s);
    else {
      going.push(localSegs[i].s);
      dim = Math.max(dim, 1 - (age - LOCAL_SOLID) / LOCAL_FADE);
    }
  }
  return { solid: solid, going: going, dim: Math.max(0, Math.min(1, dim)) };
}

/* ==========================================================================
   The replay

   A round ends with a number, which tells you nothing about the run. So the
   board pulls back to show the whole thing and draws the path the runner
   actually took, ending where they fell. The same shape becomes the picture
   you can send somebody.
   ========================================================================== */
var replay = null, bestRun = null;

function startReplay(m){
  var dist = (m.r && m.r.d) || 0;
  replay = { path: m.rp, obs: m.ro || [], dist: dist,
             who: m.rn || '', code: m.rc || code, at: performance.now() };
  if (!bestRun || dist > bestRun.dist) bestRun = replay;
  $('btn-card').classList.toggle('hidden', !bestRun);
}

/* draw a run into any context, scaled to fit the box. Used by both the
   replay on the board and the picture that gets saved. */
function paintRun(c, run, x0, y0, w, h, upto){
  var path = run.path;
  if (!path || path.length < 2) return;
  var minX = path[0][0], maxX = path[0][0], minY = path[0][1], maxY = path[0][1];
  for (var i = 1; i < path.length; i++){
    if (path[i][0] < minX) minX = path[i][0];
    if (path[i][0] > maxX) maxX = path[i][0];
    if (path[i][1] < minY) minY = path[i][1];
    if (path[i][1] > maxY) maxY = path[i][1];
  }
  var spanX = Math.max(8, maxX - minX), spanY = Math.max(5, maxY - minY);
  var k = Math.min(w / (spanX * 1.04), h / (spanY * 2.6));
  var px = function(x){ return x0 + (x - minX) * k + (w - spanX * k) / 2; };
  var py = function(y){ return y0 + h * 0.58 - (y - (minY + maxY) / 2) * k; };

  /* what was in the way, marked along the bottom */
  c.save();
  for (var j = 0; j < run.obs.length; j++){
    var o = run.obs[j];
    var ox = px(o[1]);
    if (ox < x0 - 10 || ox > x0 + w + 10) continue;
    c.globalAlpha = 0.75;
    if (o[0] === 2){
      c.fillStyle = 'rgba(232,119,107,.35)';
      c.fillRect(ox, y0, Math.max(2, o[2] * k), h);
    } else {
      c.strokeStyle = o[0] === 0 ? 'rgba(244,243,233,.45)' : 'rgba(159,215,154,.45)';
      c.lineWidth = 2;
      c.beginPath();
      if (o[0] === 0){ c.moveTo(ox, py(0)); c.lineTo(ox, py(o[2])); }
      else { c.moveTo(ox, py(o[2])); c.lineTo(ox, py(o[2] + 2)); }
      c.stroke();
    }
  }
  c.restore();

  var shown = Math.max(2, Math.floor(path.length * Math.max(0, Math.min(1, upto))));
  var p = new Path2D();
  p.moveTo(px(path[0][0]), py(path[0][1]));
  for (var q = 1; q < shown; q++) p.lineTo(px(path[q][0]), py(path[q][1]));
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = 'rgba(244,243,233,.20)'; c.lineWidth = 9; c.stroke(p);
  c.strokeStyle = 'rgba(244,243,233,.95)'; c.lineWidth = 3; c.stroke(p);

  var head = path[shown - 1];
  c.fillStyle = upto >= 1 ? 'rgba(232,119,107,.95)' : 'rgba(245,185,115,.95)';
  c.beginPath(); c.arc(px(head[0]), py(head[1]), 5, 0, Math.PI * 2); c.fill();
  if (upto >= 1){
    c.font = '700 20px "Caveat", cursive';
    c.fillStyle = 'rgba(232,119,107,.95)';
    c.textAlign = 'center';
    c.fillText('fell here', px(head[0]), py(head[1]) + 26);
  }
}

function frame(){
  requestAnimationFrame(frame);

  /* the round is over: show what happened instead of where the body landed */
  if (view && view.ph === 'result' && replay){
    paintBoard(ctx, VW, VH);
    var t = (performance.now() - replay.at) / 2600;
    paintRun(ctx, replay, VW * 0.06, VH * 0.18, VW * 0.88, VH * 0.5, t);
    ctx.font = '700 15px "Inter", sans-serif';
    ctx.fillStyle = 'rgba(244,243,233,.5)';
    ctx.textAlign = 'center';
    ctx.fillText((replay.who ? replay.who + ' ran ' : '') + replay.dist + ' metres',
                 VW / 2, VH * 0.82);
    return;
  }

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
  drawPits();
  if (role === 'drawer'){ drawReach(r); drawHint(r); }
  var live = liveSegs();
  strokeChalk(ctx, chalkPath(live.solid, sx, sy), 11, 4.5);
  if (live.going.length){
    ctx.save();
    ctx.globalAlpha = live.dim;
    strokeChalk(ctx, chalkPath(live.going, sx, sy), 11, 4.5);
    ctx.restore();
  }
  if (role === 'drawer' && pending.length >= 4){
    var wet = [];
    for (var i = 0; i + 3 < pending.length; i += 2) wet.push([pending[i], pending[i+1], pending[i+2], pending[i+3]]);
    ctx.save(); ctx.globalAlpha = 0.7;
    strokeChalk(ctx, chalkPath(wet, sx, sy), 10, 4);
    ctx.restore();
  }
  drawBlocks();
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
    ctx.strokeStyle = passed ? 'rgba(245,185,115,.30)' : 'rgba(244,243,233,.16)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 8]);
    ctx.beginPath(); ctx.moveTo(X, 0); ctx.lineTo(X, VH); ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = '700 21px "Caveat", cursive';
    ctx.fillStyle = passed ? 'rgba(245,185,115,.85)' : 'rgba(244,243,233,.48)';
    ctx.textAlign = 'center';
    ctx.fillText(d + ' m', X, VH * 0.15);
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

/* ==========================================================================
   What is in the way

   Three shapes, all drawn in chalk so they belong on the board: a wall to get
   over, a hanging block to get under, and a band where chalk will not stick.
   ========================================================================== */
function hatch(x0, y0, x1, y1, gap, colour){
  ctx.save();
  ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip();
  ctx.strokeStyle = colour; ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (var x = x0 - (y1 - y0); x < x1; x += gap){
    ctx.moveTo(x, y1); ctx.lineTo(x + (y1 - y0), y0);
  }
  ctx.stroke();
  ctx.restore();
}

/* the pits go behind everything, because they are a hole in the board */
function drawPits(){
  var list = (view && view.o) || [];
  for (var i = 0; i < list.length; i++){
    var o = list[i];
    if (o[0] !== 2) continue;
    var x0 = sx(o[1]), x1 = sx(o[1] + o[2]);
    if (x1 < -30 || x0 > VW + 30) continue;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    ctx.fillRect(x0, 0, x1 - x0, VH);
    hatch(x0, 0, x1, VH, 16, 'rgba(232,119,107,.20)');
    ctx.strokeStyle = 'rgba(232,119,107,.55)';
    ctx.lineWidth = 2; ctx.setLineDash([8, 7]);
    ctx.beginPath();
    ctx.moveTo(x0, 0); ctx.lineTo(x0, VH);
    ctx.moveTo(x1, 0); ctx.lineTo(x1, VH);
    ctx.stroke();
    ctx.setLineDash([]);
    if (x1 - x0 > 54){
      ctx.font = '700 18px "Caveat", cursive';
      ctx.fillStyle = 'rgba(232,119,107,.85)';
      ctx.textAlign = 'center';
      ctx.fillText('no chalk', (x0 + x1) / 2, VH * 0.3);
    }
    ctx.restore();
  }
}

/* the solid things go on top of the chalk, because you can see them */
function drawBlocks(){
  var list = (view && view.o) || [];
  ctx.save();
  ctx.lineCap = 'square'; ctx.lineJoin = 'miter';
  for (var i = 0; i < list.length; i++){
    var o = list[i], x0, x1, y0, y1;
    if (o[0] === 0){
      x0 = sx(o[1]); x1 = sx(o[1] + WALL_W);
      y0 = sy(o[2]); y1 = sy(-0.9);
    } else if (o[0] === 1){
      x0 = sx(o[1]); x1 = sx(o[1] + ROOF_W);
      y0 = sy(o[2] + 3.4); y1 = sy(o[2]);
    } else continue;
    if (x1 < -30 || x0 > VW + 30) continue;
    ctx.fillStyle = 'rgba(20,40,32,.55)';
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    hatch(x0, y0, x1, y1, 9, 'rgba(244,243,233,.34)');
    ctx.strokeStyle = 'rgba(244,243,233,.92)';
    ctx.lineWidth = 3;
    ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  }
  ctx.restore();
}

/* ==========================================================================
   The first four seconds

   Somebody opening this for the first time has a countdown to work out that
   they are meant to drag. So on a first visit a ghost line draws itself in
   front of the runner, over and over, until they have played a round.
   ========================================================================== */
var taught = false;
try { taught = localStorage.getItem('cr.taught') === '1'; } catch(_){}
function learnt(){
  if (taught) return;
  taught = true;
  try { localStorage.setItem('cr.taught', '1'); } catch(_){}
}
function drawHint(r){
  if (taught || !view || view.cd <= 0) return;
  var loop = 1.9;
  var u = (performance.now() / 1000 % loop) / loop;
  var x0 = r.x + 2.5, x1 = r.x + 13;
  var upto = x0 + (x1 - x0) * Math.min(1, u * 1.35);
  ctx.save();
  ctx.globalAlpha = u > 0.82 ? (1 - u) / 0.18 : 1;
  ctx.setLineDash([9, 9]);
  ctx.strokeStyle = 'rgba(245,185,115,.85)';
  ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(sx(x0), sy(1.2));
  ctx.lineTo(sx(upto), sy(1.2));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(sx(upto), sy(1.2), 9, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(245,185,115,.85)';
  ctx.fill();
  ctx.font = '700 26px "Caveat", cursive';
  ctx.fillStyle = 'rgba(245,185,115,.95)';
  ctx.textAlign = 'center';
  ctx.fillText('drag like this to lay chalk', sx((x0 + x1) / 2), sy(1.2) - 34);
  ctx.restore();
}

/* The drawer needs to see where the chalk works. When this was almost
   invisible people drew past the edge and watched the line disappear. */
var nudgedAt = 0;
function drawReach(r){
  var x0 = sx(r.x - REACH_BACK), x1 = sx(r.x + REACH_FWD);
  var y0 = sy(r.y + REACH_UP),   y1 = sy(r.y - REACH_DOWN);
  var hot = performance.now() - nudgedAt < 700;
  ctx.save();
  ctx.setLineDash([7, 8]);
  ctx.strokeStyle = hot ? 'rgba(245,185,115,.75)' : 'rgba(244,243,233,.26)';
  ctx.lineWidth = hot ? 2.5 : 1.6;
  ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  ctx.setLineDash([]);
  ctx.font = '700 17px "Caveat", cursive';
  ctx.fillStyle = hot ? 'rgba(245,185,115,.95)' : 'rgba(244,243,233,.40)';
  ctx.textAlign = 'right';
  ctx.fillText(hot ? 'too far, draw inside' : 'chalk works in here', x1 - 8, y0 - 8);
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

  /* braking: heels dug in, and a scuff of chalk dust behind */
  if (r.bk){
    ctx.strokeStyle = 'rgba(159,215,154,.55)';
    ctx.lineWidth = Math.max(2.6, s * 0.08);
    ctx.beginPath();
    for (var b = 1; b <= 3; b++){
      ctx.moveTo(-s * (0.18 + b * 0.14), s * 0.34);
      ctx.lineTo(-s * (0.02 + b * 0.14), s * 0.30 - b * 2);
    }
    ctx.stroke();
    ctx.lineWidth = Math.max(2.4, s * 0.072);
    ctx.rotate(-0.16);
  }

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
  var W = 0, H = 0, born = performance.now();
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
    /* on the clock, not per frame: a throttled tab should drop frames, not
       run the whole loop in slow motion */
    var t = (performance.now() - born) / 1000 + 1.4;
    var loop = 5.0, u = (t % loop) / loop;

    g.fillStyle = '#28503F'; g.fillRect(0, 0, W, H);
    var groundY = function(x){ return H * 0.70 + Math.sin(x * 0.028 + 1.2) * H * 0.10; };
    var drawnTo = u * (W + 60);

    var p = new Path2D();
    p.moveTo(0, groundY(0));
    for (var x = 0; x <= drawnTo; x += 6) p.lineTo(x, groundY(x));
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(244,243,233,.16)'; g.lineWidth = 8; g.stroke(p);
    g.strokeStyle = 'rgba(244,243,233,.9)';  g.lineWidth = 3; g.stroke(p);

    /* the chalk tip, always just ahead */
    g.fillStyle = 'rgba(245,185,115,.95)';
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
function sendBrake(){
  if (view && view.r && view.r.bc > 0) return;
  if (ws && ws.readyState === 1){ ws.send(JSON.stringify({ t:'brake' })); sfx.brake(); buzz(18); }
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
  pruneLocal(now);
  pending = pending.slice(-2);
}

cv.addEventListener('pointerdown', function(e){
  audio();
  if (role === 'runner'){ sendJump(); return; }
  if (!view || view.ph !== 'play') return;
  drawing = true; penId = e.pointerId; pending = [wx(e.clientX), wy(e.clientY)];
  learnt();
  cv.setPointerCapture(e.pointerId);
});
/* A fast drag jumps several metres between two pointer events, and the server
   throws away any segment longer than three metres, which used to leave holes
   in the ground exactly where somebody was drawing in a hurry. So the gap gets
   filled in here before it is sent. */
/* A point the server is going to throw away should never be drawn here either,
   or the line appears and then goes. The back edge is pulled in by a metre and
   a half because the runner keeps moving while the message is in flight. */
function inPit(x){
  var list = (view && view.o) || [];
  for (var i = 0; i < list.length; i++){
    if (list[i][0] === 2 && x > list[i][1] && x < list[i][1] + list[i][2]) return true;
  }
  return false;
}
function inReach(x, y){
  var r = view && view.r;
  if (!r) return true;
  if (x < r.x - REACH_BACK + 1.5 || x > r.x + REACH_FWD - 0.5) return false;
  if (y < r.y - REACH_DOWN + 0.5 || y > r.y + REACH_UP - 0.5) return false;
  if (inPit(x)) return false;
  return true;
}
function penTo(x, y){
  if (!inReach(x, y)){
    nudgedAt = performance.now();
    if (pending.length >= 4) flush(true);
    pending = [];
    return;
  }
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
$('brake').addEventListener('pointerdown', function(e){ e.preventDefault(); e.stopPropagation(); sendBrake(); });
addEventListener('keydown', function(e){
  if (e.target && e.target.tagName === 'INPUT') return;
  var k = e.key;
  if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W'){ sendJump(); e.preventDefault(); }
  if (k === 'Shift' || k === 'l' || k === 'L'){ sendLeap(); e.preventDefault(); }
  if (k === 'ArrowDown' || k === 's' || k === 'S'){ sendBrake(); e.preventDefault(); }
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
  connect(rc, ($('host-name').value || 'Player').trim().slice(0,12) || 'Player', false, false);
};

/* ==========================================================================
   The picture

   The same run, drawn once at poster size onto its own canvas, so there is
   something to send somebody other than a number. No library: the card is
   the board, the path, and the words.
   ========================================================================== */
function makeCard(run){
  var W = 1080, H = 1080;
  var cc = document.createElement('canvas');
  cc.width = W; cc.height = H;
  var c = cc.getContext('2d');

  c.fillStyle = '#2E5B49'; c.fillRect(0, 0, W, H);
  for (var i = 0; i < dust.length; i++){
    var d = dust[i];
    c.fillStyle = 'rgba(244,243,233,' + d.a + ')';
    c.beginPath(); c.arc(d.x * W, d.y * H, d.r * 30, 0, Math.PI * 2); c.fill();
  }
  var g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(255,255,255,.05)');
  g.addColorStop(1, 'rgba(0,0,0,.22)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);

  c.textAlign = 'center';
  c.fillStyle = 'rgba(244,243,233,.98)';
  c.font = '700 96px "Caveat", cursive';
  c.fillText('Chalk Runner', W / 2, 128);
  c.fillStyle = 'rgba(245,185,115,.95)';
  c.font = '600 44px "Caveat", cursive';
  c.fillText('One step ahead', W / 2, 180);

  paintRun(c, run, 70, 250, W - 140, 400, 1);

  c.fillStyle = 'rgba(244,243,233,.98)';
  c.font = '700 190px "Caveat", cursive';
  c.fillText(run.dist + ' m', W / 2, 810);
  c.fillStyle = 'rgba(244,243,233,.70)';
  c.font = '500 36px "Inter", sans-serif';
  c.fillText(run.who ? run.who + ' ran it' : 'a run', W / 2, 872);
  c.fillStyle = 'rgba(244,243,233,.45)';
  c.font = '500 30px "Inter", sans-serif';
  c.fillText('chalk-runner.waseemwdd0165.workers.dev', W / 2, 990);
  if (run.code){
    c.fillStyle = 'rgba(245,185,115,.75)';
    c.font = '600 32px "Inter", sans-serif';
    c.fillText('board ' + run.code, W / 2, 1038);
  }
  return cc;
}

function saveCard(){
  if (!bestRun) return;
  var cc = makeCard(bestRun);
  cc.toBlob(function(blob){
    if (!blob) return;
    var file = null;
    try { file = new File([blob], 'chalk-runner.png', { type:'image/png' }); } catch(_){}
    if (file && navigator.canShare && navigator.canShare({ files:[file] })){
      navigator.share({ files:[file], title:'Chalk Runner',
                        text: bestRun.dist + ' metres on Chalk Runner' }).catch(function(){});
      return;
    }
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'chalk-runner-' + bestRun.dist + 'm.png';
    a.click();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
  }, 'image/png');
}
$('btn-card').onclick = saveCard;

/* the two things that used to sit below the fold */
function sheet(which){
  $('sheet-how').classList.toggle('hidden', which !== 'how');
  $('sheet-top').classList.toggle('hidden', which !== 'top');
  $('sheet').classList.toggle('hidden', !which);
  if (which === 'top') loadTop('top-list');
}
$('btn-how').onclick = function(){ sheet('how'); };
$('btn-top').onclick = function(){ sheet('top'); };
$('sheet-x').onclick = function(){ sheet(null); };
$('sheet').addEventListener('click', function(e){ if (e.target === this) sheet(null); });
addEventListener('keydown', function(e){ if (e.key === 'Escape') sheet(null); });
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
if (pre){ $('join-code').value = pre[1].toUpperCase(); $('host-name').focus(); }

/* A reload is the other way people vanish, and the seat is held for the same
   twenty five seconds, so walk straight back in rather than showing the gate. */
(function(){
  var seat = seatStore();
  if (!seat || !seat.k || !seat.c) return;
  if (Date.now() - seat.at > 30000){ forgetSeat(); return; }
  code = seat.c; myKey = seat.k; myName = seat.n || 'Player';
  $('host-name').value = myName;
  status('Going back to ' + code);
  reopen();
})();
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

/* ---------- the replay -----------------------------------------------------
   The runner's own path, kept every third tick, so the round can end by
   showing the pair what they actually did rather than a number. Sent down
   thinned to a couple of hundred points, which is plenty at the size the
   whole run gets drawn.
   ------------------------------------------------------------------------ */
export const PATH_EVERY  = 3;
export const PATH_MAX    = 3600;
export const PATH_SEND   = 180;

export function thin(path, most){
  const n = path.length;
  if (n <= most) return path;
  const out = [];
  const step = (n - 1) / (most - 1);
  for (let i = 0; i < most; i++) out.push(path[Math.round(i * step)]);
  return out;
}
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
    this.path = [];
    this.pathTick = 0;
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
    /* the object never knew its own name, and the share card wants it */
    this.code = (url.searchParams.get('room') || '').toUpperCase();
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
    this.path = [];
    this.pathTick = 0;
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

    if (now >= this.runAt){
      stepRunner(this.runner, this.segs, dt, undefined, this.hard);
      if (++this.pathTick % PATH_EVERY === 0 && this.path.length < PATH_MAX){
        this.path.push([r2(this.runner.x), r2(this.runner.y)]);
      }
    }

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
      const pack = o => o.k === 0 ? [0, o.x, o.h] : o.k === 1 ? [1, o.x, o.y] : [2, o.x, o.w];
      msg.o = this.obs
        .filter(o => o.x > this.runner.x - 20 && o.x < this.runner.x + SEND_FWD)
        .map(pack);

      /* when the round is over, the whole run comes down so it can be played
         back and turned into a picture worth sending somebody */
      if (this.phase === 'result'){
        msg.rp = thin(this.path, PATH_SEND);
        msg.ro = this.obs.filter(o => o.x < this.runner.x + 6).map(pack);
        const who = this.players.find(o => o.id === this.runnerId);
        msg.rn = who ? who.name : '';
        msg.rc = this.code || '';
      }
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
