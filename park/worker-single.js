/* ======================================================================
   Sunday Park - single file build

   Generated from worker.js and client.html so the whole park can be
   deployed as one Cloudflare module. Edit those two, not this.
   ====================================================================== */

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>Sunday Park</title>
<meta name="description" content="A 3D amusement park you walk around with whoever else is online. Ride the big wheel, spin the carousel, pop balloons, get lost in the mirror maze.">
<meta property="og:type" content="website">
<meta property="og:title" content="Sunday Park">
<meta property="og:description" content="A 3D amusement park you walk around with whoever else is online. No room code, just open it.">

<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>

<style>
:root{
  --ink:#F5F7FB; --muted:#A9B2C6; --line:rgba(255,255,255,.14);
  --panel:rgba(12,16,26,.78); --accent:#FFB443; --accent2:#5B7CFF;
}
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
html,body{height:100%;overflow:hidden;background:#0A0E16}
body{font:16px/1.5 "Trebuchet MS",Verdana,-apple-system,Segoe UI,Roboto,sans-serif;color:var(--ink)}
canvas{display:block}

/* ---------- gate ---------- */
#gate{
  position:fixed;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;
  padding:24px;text-align:center;overflow:hidden;
  background:
    radial-gradient(1100px 700px at 50% -8%, #FFCE7A22, transparent 62%),
    radial-gradient(800px 560px at 18% 96%, #5B7CFF33, transparent 68%),
    linear-gradient(#152238, #080C14);
}
/* a slow drift of lights behind the card, like a fairground at dusk */
#gate::before{
  content:"";position:absolute;inset:-30%;
  background:
    radial-gradient(5px 5px at 20% 30%, #FFD68A99, transparent 60%),
    radial-gradient(4px 4px at 68% 18%, #8FD4FF99, transparent 60%),
    radial-gradient(6px 6px at 82% 62%, #FF9BB399, transparent 60%),
    radial-gradient(4px 4px at 36% 78%, #B8FFB099, transparent 60%),
    radial-gradient(5px 5px at 54% 44%, #FFE9A899, transparent 60%);
  animation: drift 26s linear infinite;
  opacity:.75;
}
@keyframes drift{
  0%{transform:translate3d(0,0,0) rotate(0deg)}
  100%{transform:translate3d(-4%,-3%,0) rotate(6deg)}
}
#gate .box{
  position:relative;max-width:430px;width:100%;
  background:rgba(10,15,26,.66);border:1px solid rgba(255,255,255,.12);
  border-radius:22px;padding:34px 28px 28px;
  box-shadow:0 30px 80px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.08);
  backdrop-filter:blur(14px);
}
#gate h1{
  font-size:clamp(36px,10vw,58px);letter-spacing:-.025em;line-height:1;margin-bottom:8px;
  text-shadow:0 6px 30px rgba(255,180,67,.22);
}
#gate h1 span{
  background:linear-gradient(#FFD98A,#FF9E3D);
  -webkit-background-clip:text;background-clip:text;color:transparent;
}
#gate p{color:var(--muted);margin-bottom:24px;font-size:15px}
#gate input{
  width:100%;padding:15px 16px;border-radius:14px;font-size:17px;font-family:inherit;
  background:rgba(0,0,0,.45);border:1px solid var(--line);color:var(--ink);text-align:center;
  transition:border-color .18s, box-shadow .18s;
}
#gate input:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 4px rgba(255,180,67,.16)}
#gate button{
  width:100%;margin-top:12px;padding:16px;border:0;border-radius:14px;cursor:pointer;
  background:linear-gradient(#FFC463,#F59A22);color:#2A1A02;font:700 17px inherit;
  box-shadow:0 10px 26px rgba(245,154,34,.32);transition:transform .08s, box-shadow .18s;
}
#gate button:hover{box-shadow:0 14px 34px rgba(245,154,34,.42)}
#gate button:active{transform:translateY(1px)}
#gate button:disabled{opacity:.5;cursor:not-allowed;box-shadow:none}
#gate .err{color:#FF9A9A;font-size:14px;margin-top:12px;min-height:20px}
#gate .tips{
  margin-top:24px;padding-top:20px;border-top:1px solid rgba(255,255,255,.09);
  color:var(--muted);font-size:13.5px;line-height:1.9;text-align:left;
}
#gate .tips b{color:var(--accent)}

/* ---------- hud ---------- */
.hud{position:fixed;z-index:20;pointer-events:none}
#topleft{top:14px;left:14px}
#topright{top:14px;right:14px;text-align:right}
.chip{
  display:inline-block;background:var(--panel);border:1px solid var(--line);
  border-radius:14px;padding:9px 14px;font-size:13.5px;margin-bottom:7px;
  backdrop-filter:blur(10px);
  box-shadow:0 8px 22px rgba(0,0,0,.34), inset 0 1px 0 rgba(255,255,255,.07);
}
.chip b{color:var(--accent);font-size:15px}
#who{font-weight:700;letter-spacing:.01em}
#board{font-size:13px;line-height:1.8;min-width:168px}
#board .row{display:flex;justify-content:space-between;gap:14px}
#board .me{color:var(--accent);font-weight:700}
#board .hd{
  color:var(--muted);font-size:11px;letter-spacing:.11em;text-transform:uppercase;
  margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,.1);
}

#prompt{
  position:fixed;left:50%;bottom:136px;transform:translateX(-50%);z-index:20;
  background:linear-gradient(rgba(24,18,6,.9), rgba(14,11,4,.9));
  border:1px solid rgba(255,180,67,.55);border-radius:999px;
  padding:12px 22px;font-size:15px;backdrop-filter:blur(10px);display:none;
  box-shadow:0 12px 34px rgba(0,0,0,.45), 0 0 26px rgba(255,180,67,.16);
  animation:breathe 2.6s ease-in-out infinite;white-space:nowrap;
}
#prompt b{color:var(--accent)}
@keyframes breathe{
  0%,100%{box-shadow:0 12px 34px rgba(0,0,0,.45), 0 0 20px rgba(255,180,67,.12)}
  50%    {box-shadow:0 12px 34px rgba(0,0,0,.45), 0 0 34px rgba(255,180,67,.3)}
}

#toast{
  position:fixed;left:50%;top:22%;transform:translateX(-50%);z-index:25;
  font-size:clamp(20px,5vw,30px);font-weight:800;text-shadow:0 3px 16px rgba(0,0,0,.7);
  display:none;pointer-events:none;text-align:center;
}

/* ---------- controls ---------- */
#stick{position:fixed;left:0;bottom:0;width:46%;height:46%;z-index:15;touch-action:none}
#sbase,#sknob{position:absolute;border-radius:50%;pointer-events:none;opacity:0;transition:opacity .15s}
#sbase{width:120px;height:120px;border:2px solid rgba(255,255,255,.22);margin:-60px 0 0 -60px}
#sknob{width:54px;height:54px;background:rgba(255,255,255,.28);margin:-27px 0 0 -27px}
#stick.on #sbase,#stick.on #sknob{opacity:1}

#buttons{position:fixed;right:14px;bottom:18px;z-index:20;display:flex;flex-direction:column;gap:10px;align-items:flex-end}
.btn{
  pointer-events:auto;background:var(--panel);border:1px solid var(--line);color:var(--ink);
  border-radius:14px;padding:12px 17px;font:600 14px inherit;cursor:pointer;
  backdrop-filter:blur(10px);
  box-shadow:0 8px 22px rgba(0,0,0,.34), inset 0 1px 0 rgba(255,255,255,.07);
  transition:transform .08s, border-color .18s, background .18s;
}
.btn:hover{border-color:rgba(255,180,67,.5)}
.btn:active{transform:translateY(1px)}
.btn.go{
  background:linear-gradient(#FFC463,#F59A22);color:#2A1A02;border-color:transparent;
  box-shadow:0 10px 26px rgba(245,154,34,.34);
}
#emotes{display:none;flex-direction:column;gap:8px}

#chatbar{
  position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:22;
  display:none;width:min(440px,90vw);
}
#chatbar input{
  width:100%;padding:13px 15px;border-radius:12px;font-size:16px;font-family:inherit;
  background:rgba(8,12,20,.92);border:1px solid var(--accent);color:var(--ink);
}
#chatbar input:focus{outline:none}

/* ---------- balloon game ---------- */
#gallery{
  position:fixed;inset:0;z-index:30;display:none;
  background:linear-gradient(#123, #061019);
}
#gallery .sky{position:absolute;inset:0;overflow:hidden}
#gallery .hdr{
  position:absolute;top:0;left:0;right:0;padding:16px;display:flex;justify-content:space-between;
  font-weight:700;font-size:17px;text-shadow:0 2px 8px rgba(0,0,0,.6);
}
.balloon{
  position:absolute;width:56px;height:70px;border-radius:50% 50% 45% 45%;cursor:pointer;
  box-shadow:inset -8px -10px 18px rgba(0,0,0,.28);
}
.balloon::after{
  content:"";position:absolute;left:50%;bottom:-12px;width:2px;height:14px;
  background:rgba(255,255,255,.45);transform:translateX(-50%);
}
.pop{animation:pop .22s ease-out forwards}
@keyframes pop{to{transform:scale(1.8);opacity:0}}
#gallery .done{
  position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);text-align:center;display:none;
}
#gallery .done h2{font-size:34px;margin-bottom:6px}
#gallery .done p{color:var(--muted);margin-bottom:18px}

@media(min-width:860px){ #stick{display:none} }
</style>
</head>
<body>

<div id="gate">
  <div class="box">
    <h1>Sunday <span>Park</span></h1>
    <p>Everyone who is online is in the same park. Walk in and say hello.</p>
    <input id="name" maxlength="12" placeholder="Your name" autocomplete="off">
    <button id="enter">Walk in</button>
    <div class="err" id="gate-err"></div>
    <div class="tips">
      <b>Move</b> with W A S D, arrows, or the stick on a phone.<br>
      <b>Look around</b> by dragging anywhere.<br>
      <b>Rides</b> start on their own, just walk onto the platform.<br>
      <b>Balloons</b> at the stall pay the best tickets.
    </div>
  </div>
</div>

<div class="hud" id="topleft">
  <div class="chip" id="who">-</div><br>
  <div class="chip"><b id="tickets">0</b> tickets</div>
</div>

<div class="hud" id="topright">
  <div class="chip" id="board"></div>
</div>

<div id="prompt"></div>
<div id="toast"></div>

<div id="stick"><div id="sbase"></div><div id="sknob"></div></div>

<div id="buttons">
  <div id="emotes">
    <button class="btn" data-emote="wave">Wave</button>
    <button class="btn" data-emote="dance">Dance</button>
    <button class="btn" data-emote="cheer">Cheer</button>
    <button class="btn" data-emote="sit">Sit</button>
  </div>
  <button class="btn" id="btn-emote">Emotes</button>
  <button class="btn" id="btn-say">Say</button>
</div>

<div id="chatbar"><input id="chatinput" maxlength="60" placeholder="Type, then Enter"></div>

<div id="gallery">
  <div class="sky" id="sky"></div>
  <div class="hdr"><div id="g-score">Popped 0</div><div id="g-time">20</div></div>
  <div class="done" id="g-done">
    <h2 id="g-final">Nice</h2>
    <p id="g-sub"></p>
    <button class="btn go" id="g-close">Back to the park</button>
  </div>
</div>

<script>
/* ==========================================================================
   Sunday Park - the browser half

   The server owns where everybody is. This file draws the park, sends the
   stick, and smooths other people between the fifteen updates a second that
   arrive. Your own movement is predicted locally so walking feels instant.
   ========================================================================== */

var MAP = ["ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff", "fgTggggTgggggggggggTgggggggggggggggggggTTggggggggggggggggggf", "fgggggggggggggggggggggggTggggggggTTggggggggggggTgggggggggggf", "fggggggggggggggggggggggggggTgggggggggggggggggggggggggggggggf", "fggg~~~~~~~~~~~~~gggggggggTgTgggTggggTTTTggggggggggggggggggf", "fgg~~~~~~~~~~~~~~~gTggggggggggggggggTggggggTgTgggggggggggggf", "fgg~~~~~~~~~~~~~~~ggTgggTgggggggggggggggggggggggTgggTggggggf", "fgg~~~~~~~~~~~~~~~ggggggTggggggggggTggggggggggggggggTggggggf", "fgg~~~~~~~~~~~~~~~gggggggggggggTggggggggTgggggggggggggTggggf", "fgg~~~~~~~~~~~~~~~gggTggggggggggggTgTgggggggggggggggggTTgTgf", "fgTg~~~~~~~~~~~~~ggggTggTggggggggggggTggggggggggggTgTggggggf", "fgggggTggggggggggggggggggggggggggggggggggggggggggggggggggggf", "fgggggTggg........................................gTgTgggggf", "fgggTggggg........................................gggggggggf", "fggggTgggg....XXXXXXX.................XXXXXXXX....gggTgggggf", "fgggTgggTg...gXXXXXXXggggggg...gggggggXXXXXXXXg...gggggggggf", "fggggTgggg...gXXXXXXXggggggg...gggggggXXXXXXXXg...ggTggggggf", "fgTggggggg...gXXXXXXXTgg............ggXXXXXXXXg...gggggggggf", "fgTggggggg...gXXXXXXXggg.B........B.ggXXXXXXXXg...gggggggggf", "fggggggggg...gXXXFXXXggg....~~~~....ggXXXXCXXXg...gggggggggf", "fgggTggggg...ggggggggggg....~~~~....ggggggggggg...gggggggggf", "fggggggggg...ggggggggggg....~~~~....gTggggggggg...gggggggggf", "fggggggTTg...ggggggggggg.B........B.ggggggggggg...gggggggggf", "fgggTggggg...gggggggggTg............gggggggTggg...gggggggTgf", "fggggggTgg...ggggggggggggggg...gggggggggggggggg...gggggggggf", "fggggggggg........................................gggggggggf", "fgggggTggg........................................gggTgggggf", "fggggggggg....XXXXXXX.................XXXXXXXX....gggggggggf", "fgggggggggggggXXXXXXXggggggg...gggggggXXXXXXXXgggggggTgggggf", "fgggggggggggggXXXXXXXggggggg...gggggggXXXXXXXXgTggggggggTggf", "fgTgggggggggggXXXXXXXggggggg...gggggggXXXXXXXXggggggggggggTf", "fggggggTggggggXXXMXXXggggggg...gggggggXXXXSXXXgggggggggggggf", "fTggggggTgTggggggggggggggggg...ggggggggTggggggggggggggggTggf", "fgggggggTggggggggggggggggggg...ggggggggggggggTggggTggggggggf", "fgTgggggggTggTTgggggTggggggg...ggggggggggggggggggggggTgggggf", "fggggTgggTTggggggggggggggggg...gTggTgggggggggTgggggggggggggf", "fggTggTgggTgggggggggTggggggg...ggggggggggggggggggTggggggTggf", "fgggTgTgTggggggggggggggggggg...gggggggggTgTggggggggggTgggggf", "fggggggTgggggggggggggggggggg...ggggggggggTTTgggggTggggTggggf", "ffffffffffffffffffffffffffffff..ffffffffffffffffffffffffffff"];
var MW = MAP[0].length, MH = MAP.length;
var SOLID = 'fT~X';
function cell(x,y){ if(x<0||y<0||x>=MW||y>=MH) return 'f'; return MAP[y][x]; }
function solid(x,y){ return SOLID.indexOf(cell(x,y)) >= 0; }
function blocked(x,z,r){
  return solid(Math.floor(x-r),Math.floor(z-r)) || solid(Math.floor(x+r),Math.floor(z-r)) ||
         solid(Math.floor(x-r),Math.floor(z+r)) || solid(Math.floor(x+r),Math.floor(z+r));
}
var SPEED = 4.6;

var RIDE_NAMES = { F:'The Big Wheel', C:'Carousel', S:'Swing Ride', M:'Mirror Maze' };
var RIDE_POS = { F:{x:17.5,z:16.5}, C:{x:42.0,z:16.5}, S:{x:42.0,z:29.0}, M:{x:17.5,z:29.0} };
var STALL = { x: 30.0, z: 25.0 };     /* balloon stall, on the plaza path */
var FOUNTAIN = { x: 30.0, z: 20.0 };

var $ = function(id){ return document.getElementById(id); };

/* ---------- state ---------- */
var ws = null, myId = null, myName = '', myHue = 40;
var others = {};            /* id -> {cur, target, data} */
var me = { x: 30, z: 38.2, h: 0, dir: -Math.PI/2, ride: null };
var input = { ax: 0, az: 0 };
var tickets = 0, wishes = 0;
var camYaw = 0, camPitch = 0.42, camDist = 9;
var inGallery = false, typing = false;

/* ==========================================================================
   Three.js scene
   ========================================================================== */
var scene, camera, renderer, clock;
var playerMeshes = {};
var wheelGroup, carouselGroup, swingGroup;

function init3D(){
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8FC3E8);
  scene.fog = new THREE.Fog(0x8FC3E8, 34, 70);

  camera = new THREE.PerspectiveCamera(58, innerWidth/innerHeight, 0.1, 300);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.setSize(innerWidth, innerHeight);
  document.body.appendChild(renderer.domElement);

  var sun = new THREE.DirectionalLight(0xFFF3DC, 1.05);
  sun.position.set(24, 40, 12);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xBFE0FF, 0x4B6340, 0.75));

  buildGround();
  buildTrees();
  buildFence();
  buildBuildings();
  buildWheel();
  buildCarousel();
  buildSwings();
  buildMaze();
  buildFountain();
  buildStall();

  clock = new THREE.Clock();
  addEventListener('resize', function(){
    camera.aspect = innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
}

/* the whole map painted onto one texture, far cheaper than thousands of tiles */
function buildGround(){
  var S = 16;
  var c = document.createElement('canvas');
  c.width = MW * S; c.height = MH * S;
  var g = c.getContext('2d');
  for (var y = 0; y < MH; y++){
    for (var x = 0; x < MW; x++){
      var ch = MAP[y][x], col;
      if (ch === '.' ) col = '#C9A97A';
      else if (ch === '~') col = '#3F86B8';
      else if (ch === 'X') col = '#6B6152';
      else if (ch === 'B') col = '#8A6A46';
      else if ('FCSM'.indexOf(ch) >= 0) col = '#E0B45A';
      else col = '#5C8C46';
      g.fillStyle = col;
      g.fillRect(x*S, y*S, S, S);
    }
  }
  /* Speckle at the pixel level rather than per tile. Tinting whole tiles
     made the lawn read as a chessboard, which is the one thing grass is not. */
  var img = g.getImageData(0, 0, c.width, c.height);
  var d = img.data;
  for (var i = 0; i < d.length; i += 4){
    var n = (Math.random() - 0.5) * 16;
    d[i] += n; d[i+1] += n; d[i+2] += n;
  }
  g.putImageData(img, 0, 0);

  var tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.LinearFilter;
  var mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(MW, MH),
    new THREE.MeshLambertMaterial({ map: tex })
  );
  mesh.rotation.x = -Math.PI/2;
  mesh.position.set(MW/2, 0, MH/2);
  scene.add(mesh);

  /* the lake gets real water on top of the painted patch */
  var water = new THREE.Mesh(
    new THREE.PlaneGeometry(15, 7),
    new THREE.MeshLambertMaterial({ color: 0x2E7FB5, transparent: true, opacity: 0.86 })
  );
  water.rotation.x = -Math.PI/2;
  water.position.set(10.5, 0.06, 7.5);
  scene.add(water);
}

/* A sphere on a stick reads as a lollipop, not a tree. Pushing the sphere's
   vertices around with a cheap hash gives a lumpy canopy that catches the
   light unevenly, which is most of what makes a tree look like a tree. */
function lumpySphere(r, lumps, seed){
  var g = new THREE.SphereGeometry(r, 10, 8);
  var pos = g.attributes.position;
  for (var i = 0; i < pos.count; i++){
    var x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    var h = Math.sin((x*12.9898 + y*78.233 + z*37.719 + seed) * 43758.5453);
    h = h - Math.floor(h);
    var k = 1 + (h - 0.5) * lumps;
    pos.setXYZ(i, x*k, y*k*0.86, z*k);
  }
  g.computeVertexNormals();
  return g;
}

function buildTrees(){
  var spots = [];
  for (var y = 0; y < MH; y++) for (var x = 0; x < MW; x++)
    if (MAP[y][x] === 'T') spots.push([x+0.5, y+0.5]);

  var barkM = new THREE.MeshLambertMaterial({ color: 0x5E4530 });
  var trunkG = new THREE.CylinderGeometry(0.1, 0.22, 1.9, 6);

  /* three greens and two silhouettes, so a stand of trees is not one shape
     repeated forty times */
  var greens = [0x2F6B2C, 0x3E8438, 0x53994A];
  var round = [
    lumpySphere(0.95, 0.44, 1.7),
    lumpySphere(0.78, 0.52, 9.1),
    lumpySphere(0.62, 0.48, 4.3)
  ];
  var pineG = new THREE.ConeGeometry(0.92, 2.4, 8);

  var buckets = [];
  for (var c = 0; c < greens.length; c++){
    buckets.push({
      colour: greens[c],
      round: [[], [], []],   /* three blobs per broadleaf tree */
      pine: []
    });
  }

  var trunkXf = [];
  for (var i = 0; i < spots.length; i++){
    var hx = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
    var hy = Math.abs(Math.sin(i * 78.233)  * 43758.5453) % 1;
    var s  = 0.78 + hy * 0.62;
    var lean = (hx - 0.5) * 0.13;
    var b = buckets[i % buckets.length];
    var isPine = hx > 0.74;

    trunkXf.push({ x: spots[i][0], z: spots[i][1], s: s, lean: lean, pine: isPine });

    if (isPine){
      b.pine.push({ x: spots[i][0], z: spots[i][1], s: s, lean: lean, rot: hy * 6.28 });
    } else {
      /* three blobs, stacked and nudged sideways, make a crown */
      b.round[0].push({ x: spots[i][0], z: spots[i][1], s: s, y: 2.05, ox: 0,            oz: 0,            rot: hy*6.28 });
      b.round[1].push({ x: spots[i][0], z: spots[i][1], s: s, y: 2.55, ox: (hx-0.5)*0.7, oz: (hy-0.5)*0.7, rot: hx*6.28 });
      b.round[2].push({ x: spots[i][0], z: spots[i][1], s: s, y: 1.7,  ox: (hy-0.5)*0.9, oz: (hx-0.5)*0.9, rot: hy*3.14 });
    }
  }

  var m = new THREE.Matrix4(), q = new THREE.Quaternion(),
      e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();

  var trunks = new THREE.InstancedMesh(trunkG, barkM, trunkXf.length);
  for (var t = 0; t < trunkXf.length; t++){
    var a = trunkXf[t];
    e.set(a.lean, 0, a.lean * 0.7); q.setFromEuler(e);
    v.set(a.x, 0.95 * a.s, a.z); sc.set(a.s, a.s, a.s);
    m.compose(v, q, sc);
    trunks.setMatrixAt(t, m);
  }
  scene.add(trunks);

  for (var bi = 0; bi < buckets.length; bi++){
    var bk = buckets[bi];
    var mat = new THREE.MeshLambertMaterial({ color: bk.colour });

    for (var ri = 0; ri < 3; ri++){
      var list = bk.round[ri];
      if (!list.length) continue;
      var im = new THREE.InstancedMesh(round[ri], mat, list.length);
      for (var k = 0; k < list.length; k++){
        var o = list[k];
        e.set(0, o.rot, 0); q.setFromEuler(e);
        v.set(o.x + o.ox * o.s, o.y * o.s, o.z + o.oz * o.s);
        sc.set(o.s, o.s, o.s);
        m.compose(v, q, sc);
        im.setMatrixAt(k, m);
      }
      scene.add(im);
    }

    if (bk.pine.length){
      var pm = new THREE.InstancedMesh(pineG, mat, bk.pine.length);
      for (var pi = 0; pi < bk.pine.length; pi++){
        var pp = bk.pine[pi];
        e.set(pp.lean, pp.rot, pp.lean * 0.7); q.setFromEuler(e);
        v.set(pp.x, 2.5 * pp.s, pp.z);
        sc.set(pp.s, pp.s * 1.25, pp.s);
        m.compose(v, q, sc);
        pm.setMatrixAt(pi, m);
      }
      scene.add(pm);
    }
  }
}

function buildFence(){
  var mat = new THREE.MeshLambertMaterial({ color: 0x7C6A55 });
  function rail(x, z, w, d){
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, 1.5, d), mat);
    m.position.set(x, 0.75, z);
    scene.add(m);
  }
  rail(MW/2, 0.5, MW, 0.5);
  rail(14.5, MH-0.5, 29, 0.5);
  rail(46.5, MH-0.5, 27, 0.5);
  rail(0.5, MH/2, 0.5, MH);
  rail(MW-0.5, MH/2, 0.5, MH);
}

function buildBuildings(){
  /* the X blocks around each ride become low sheds, so the rides sit in a
     yard rather than floating on grass */
  /* One instanced mesh rather than a hundred and fifty separate boxes, so a
     phone is not asked for a draw call per paving slab. */
  var spots = [];
  for (var y = 0; y < MH; y++)
    for (var x = 0; x < MW; x++)
      if (MAP[y][x] === 'X') spots.push([x+0.5, y+0.5]);

  var mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 0.9, 1),
    new THREE.MeshLambertMaterial({ color: 0x9A7C5B }),
    spots.length
  );
  var m4 = new THREE.Matrix4();
  for (var i = 0; i < spots.length; i++){
    m4.makeTranslation(spots[i][0], 0.45, spots[i][1]);
    mesh.setMatrixAt(i, m4);
  }
  scene.add(mesh);
}

function buildWheel(){
  var g = new THREE.Group();
  var steel = new THREE.MeshLambertMaterial({ color: 0xD8DEE9 });
  var hub = 6.2, R = 5.4;

  /* two legs */
  [-2.2, 2.2].forEach(function(dx){
    var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, hub, 8), steel);
    leg.position.set(dx, hub/2, 0);
    leg.rotation.z = dx > 0 ? -0.18 : 0.18;
    g.add(leg);
  });

  var wheel = new THREE.Group();
  var rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.16, 8, 40), steel);
  wheel.add(rim);
  for (var i = 0; i < 10; i++){
    var a = i / 10 * Math.PI * 2;
    var spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, R*2, 5), steel);
    spoke.rotation.z = a;
    wheel.add(spoke);
    var carG = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.8, 1.0),
      new THREE.MeshLambertMaterial({ color: new THREE.Color().setHSL(i/10, 0.72, 0.56) })
    );
    carG.position.set(Math.cos(a)*R, Math.sin(a)*R, 0);
    wheel.add(carG);
  }
  wheel.position.y = hub;
  g.add(wheel);
  g.position.set(17.5, 0, 16.5);
  scene.add(g);
  wheelGroup = wheel;
}

function buildCarousel(){
  var g = new THREE.Group();
  var base = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.4, 0.4, 20),
    new THREE.MeshLambertMaterial({ color: 0xB07A4A }));
  base.position.y = 0.2; g.add(base);

  var spin = new THREE.Group();
  var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 3.4, 10),
    new THREE.MeshLambertMaterial({ color: 0xE8C86A }));
  pole.position.y = 1.9; spin.add(pole);
  var roof = new THREE.Mesh(new THREE.ConeGeometry(3.4, 1.5, 16),
    new THREE.MeshLambertMaterial({ color: 0xE5484D }));
  roof.position.y = 4.1; spin.add(roof);
  for (var i = 0; i < 8; i++){
    var a = i/8*Math.PI*2;
    var horse = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 0.9),
      new THREE.MeshLambertMaterial({ color: new THREE.Color().setHSL((i*0.13)%1, 0.6, 0.62) }));
    horse.position.set(Math.cos(a)*2.4, 1.2, Math.sin(a)*2.4);
    spin.add(horse);
  }
  g.add(spin);
  g.position.set(42.0, 0, 16.5);
  scene.add(g);
  carouselGroup = spin;
}

function buildSwings(){
  var g = new THREE.Group();
  var tower = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 6.2, 10),
    new THREE.MeshLambertMaterial({ color: 0xC0C8D6 }));
  tower.position.y = 3.1; g.add(tower);
  var spin = new THREE.Group();
  var top = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 0.3, 14),
    new THREE.MeshLambertMaterial({ color: 0x5B7CFF }));
  top.position.y = 5.6; spin.add(top);
  for (var i = 0; i < 8; i++){
    var a = i/8*Math.PI*2;
    var seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.5),
      new THREE.MeshLambertMaterial({ color: 0xE5A32B }));
    seat.position.set(Math.cos(a)*4.0, 3.4, Math.sin(a)*4.0);
    spin.add(seat);
    var rope = new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,2.4,4),
      new THREE.MeshLambertMaterial({ color: 0x33384A }));
    rope.position.set(Math.cos(a)*3.4, 4.5, Math.sin(a)*3.4);
    rope.rotation.z = 0.28 * Math.cos(a + Math.PI);
    rope.rotation.x = 0.28 * Math.sin(a);
    spin.add(rope);
  }
  g.add(spin);
  g.position.set(42.0, 0, 29.0);
  scene.add(g);
  swingGroup = spin;
}

function buildMaze(){
  var g = new THREE.Group();
  var glass = new THREE.MeshLambertMaterial({ color: 0xBFD8E8, transparent: true, opacity: 0.72 });
  for (var i = 0; i < 5; i++){
    var w = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.6, 3.2 + (i%2)*1.4), glass);
    w.position.set(-2.4 + i*1.2, 1.3, ((i%2)?1:-1) * 0.9);
    g.add(w);
  }
  var roof = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.25, 4.6),
    new THREE.MeshLambertMaterial({ color: 0x8E4EC6 }));
  roof.position.y = 2.7; g.add(roof);
  g.position.set(17.5, 0, 29.0);
  scene.add(g);
}

function buildFountain(){
  var g = new THREE.Group();
  var basin = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.5, 0.6, 18),
    new THREE.MeshLambertMaterial({ color: 0xC9CEDA }));
  basin.position.y = 0.3; g.add(basin);
  var water = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.05, 0.1, 18),
    new THREE.MeshLambertMaterial({ color: 0x4FA8DA, transparent:true, opacity:0.9 }));
  water.position.y = 0.6; g.add(water);
  var jet = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 2.4, 8),
    new THREE.MeshLambertMaterial({ color: 0xBFE6FF, transparent:true, opacity:0.55 }));
  jet.position.y = 1.7; g.add(jet);
  g.position.set(FOUNTAIN.x, 0, FOUNTAIN.z);
  scene.add(g);
}

function buildStall(){
  var g = new THREE.Group();
  var counter = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.0, 1.4),
    new THREE.MeshLambertMaterial({ color: 0xB4553F }));
  counter.position.y = 0.5; g.add(counter);
  var roof = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.2, 2.0),
    new THREE.MeshLambertMaterial({ color: 0xE5484D }));
  roof.position.y = 2.4; g.add(roof);
  [-1.6, 1.6].forEach(function(dx){
    var p = new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,2.4,6),
      new THREE.MeshLambertMaterial({ color: 0xEDE7DA }));
    p.position.set(dx, 1.2, 0.8); g.add(p);
  });
  for (var i = 0; i < 6; i++){
    var b = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 7),
      new THREE.MeshLambertMaterial({ color: new THREE.Color().setHSL(i/6, 0.75, 0.6) }));
    b.position.set(-1.3 + i*0.52, 1.7, -0.5); g.add(b);
  }
  g.position.set(STALL.x, 0, STALL.z);
  scene.add(g);
}

/* ---------- people ---------- */
function makeAvatar(hue, name){
  var g = new THREE.Group();
  var col = new THREE.Color().setHSL((hue % 360)/360, 0.62, 0.55);
  var body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.95, 10),
    new THREE.MeshLambertMaterial({ color: col }));
  body.position.y = 0.48; g.add(body);
  var head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 10),
    new THREE.MeshLambertMaterial({ color: 0xE8C49A }));
  head.position.y = 1.18; g.add(head);
  g.userData.body = body; g.userData.head = head;
  g.add(makeLabel(name));
  return g;
}

function makeLabel(text){
  var c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  var x = c.getContext('2d');
  x.font = 'bold 30px Verdana, sans-serif';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = 6; x.strokeStyle = 'rgba(0,0,0,.65)';
  x.strokeText(text, 128, 34);
  x.fillStyle = '#fff';
  x.fillText(text, 128, 34);
  var s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(c), transparent: true, depthTest: false
  }));
  s.scale.set(2.6, 0.65, 1);
  s.position.y = 1.95;
  return s;
}

function bubble(text){
  var c = document.createElement('canvas');
  c.width = 512; c.height = 96;
  var x = c.getContext('2d');
  x.fillStyle = 'rgba(12,16,26,.88)';
  roundRect(x, 4, 12, 504, 66, 16); x.fill();
  x.font = '26px Verdana, sans-serif';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = '#F5F7FB';
  x.fillText(text.slice(0, 40), 256, 46);
  var s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(c), transparent: true, depthTest: false
  }));
  s.scale.set(4.2, 0.8, 1);
  s.position.y = 2.5;
  return s;
}
function roundRect(x, l, t, w, h, r){
  x.beginPath();
  x.moveTo(l+r, t); x.lineTo(l+w-r, t); x.quadraticCurveTo(l+w, t, l+w, t+r);
  x.lineTo(l+w, t+h-r); x.quadraticCurveTo(l+w, t+h, l+w-r, t+h);
  x.lineTo(l+r, t+h); x.quadraticCurveTo(l, t+h, l, t+h-r);
  x.lineTo(l, t+r); x.quadraticCurveTo(l, t, l+r, t); x.closePath();
}

/* ==========================================================================
   Network
   ========================================================================== */
function connect(name){
  var proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(proto + '//' + location.host + '/api/ws');
  var settled = false;
  var giveUp = setTimeout(function(){
    if (!settled){ $('gate-err').textContent = 'The park is not answering. Check your connection.'; $('enter').disabled = false; }
  }, 12000);

  ws.onopen = function(){
    settled = true; clearTimeout(giveUp);
    ws.send(JSON.stringify({ t:'join', name: name }));
    setInterval(sendInput, 66);
  };
  ws.onmessage = function(e){
    var m; try { m = JSON.parse(e.data); } catch(_){ return; }
    if (m.t === 'busy'){ $('gate-err').textContent = 'The park is full right now. Try again shortly.'; $('enter').disabled = false; return; }
    if (m.t === 'you'){
      myId = m.id; myName = m.name; myHue = m.hue;
      $('who').textContent = m.name;
      $('gate').style.display = 'none';
      return;
    }
    if (m.t === 'world') onWorld(m);
  };
  ws.onerror = function(){
    if (settled) return;
    clearTimeout(giveUp);
    $('gate-err').textContent = 'Could not reach the park.';
    $('enter').disabled = false;
  };
  ws.onclose = function(){ if (settled) $('who').textContent = 'disconnected'; };
}

function sendInput(){
  if (!ws || ws.readyState !== 1) return;
  ws.send(JSON.stringify({ t:'in', ax: input.ax, az: input.az }));
}
function sendEmote(kind){ if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t:'emote', kind: kind })); }
function sendSay(text){ if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t:'say', text: text })); }

function onWorld(m){
  if (m.a){ rideAngle = m.a; rideAt = performance.now(); }
  var live = {};
  for (var i = 0; i < m.p.length; i++){
    var p = m.p[i];
    live[p.i] = 1;
    if (p.i === myId){
      /* the server is the truth; ease toward it rather than snapping */
      me.x += (p.x - me.x) * 0.25;
      me.z += (p.z - me.z) * 0.25;
      me.h = p.h;
      me.ride = p.r;
      if (p.c !== tickets){ /* ride count changed */ }
      continue;
    }
    if (!others[p.i]){
      var mesh = makeAvatar(p.u, p.n);
      scene.add(mesh);
      others[p.i] = { mesh: mesh, cur: { x:p.x, z:p.z, h:p.h, d:p.d }, tgt: { x:p.x, z:p.z, h:p.h, d:p.d }, say: null, data: p };
    }
    var o = others[p.i];
    o.tgt = { x:p.x, z:p.z, h:p.h, d:p.d };
    o.data = p;
    if (p.s && (!o.say || o.say.text !== p.s)){
      if (o.sprite) o.mesh.remove(o.sprite);
      o.sprite = bubble(p.s);
      o.mesh.add(o.sprite);
      o.say = { text: p.s };
    } else if (!p.s && o.sprite){
      o.mesh.remove(o.sprite); o.sprite = null; o.say = null;
    }
  }
  for (var id in others){
    if (!live[id]){ scene.remove(others[id].mesh); delete others[id]; }
  }
  drawBoard(m.p);
}

function drawBoard(list){
  var sorted = list.slice().sort(function(a,b){ return b.c - a.c; }).slice(0, 6);
  var html = '<div class="hd">In the park (' + list.length + ')</div>';
  for (var i = 0; i < sorted.length; i++){
    var p = sorted[i];
    html += '<div class="row' + (p.i === myId ? ' me' : '') + '"><span>' +
            esc(p.n) + '</span><span>' + p.c + '</span></div>';
  }
  $('board').innerHTML = html;
}
function esc(s){ return String(s).replace(/[&<>"]/g, function(c){
  return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }

/* ==========================================================================
   Frame
   ========================================================================== */
var myMesh = null;
function frame(){
  requestAnimationFrame(frame);
  if (!renderer) return;
  var dt = Math.min(0.05, clock.getDelta());

  /* predict my own walking so the stick feels immediate */
  if (!me.ride && !inGallery && !typing){
    var mag = Math.hypot(input.ax, input.az);
    if (mag > 0.08){
      var ax = input.ax / Math.max(1, mag), az = input.az / Math.max(1, mag);
      me.dir = Math.atan2(az, ax);
      var nx = me.x + ax * SPEED * dt, nz = me.z + az * SPEED * dt;
      if (!blocked(nx, me.z, 0.3)) me.x = nx;
      if (!blocked(me.x, nz, 0.3)) me.z = nz;
    }
  }

  if (!myMesh){ myMesh = makeAvatar(myHue, myName || 'you'); scene.add(myMesh); }
  myMesh.position.set(me.x, me.h, me.z);
  myMesh.rotation.y = -me.dir + Math.PI/2;

  /* other people, eased between updates */
  for (var id in others){
    var o = others[id];
    o.cur.x += (o.tgt.x - o.cur.x) * 0.22;
    o.cur.z += (o.tgt.z - o.cur.z) * 0.22;
    o.cur.h += (o.tgt.h - o.cur.h) * 0.22;
    o.mesh.position.set(o.cur.x, o.cur.h, o.cur.z);
    o.mesh.rotation.y = -o.tgt.d + Math.PI/2;
    poseFor(o.mesh, o.data, dt);
  }

  /* The rides are turned to the angle the server last reported, advanced by
     the time since it arrived. Guessing locally is what made riders float
     beside the cabins instead of sitting in them. */
  spinRides();

  updateCamera();
  updatePrompt();
  renderer.render(scene, camera);
}

/* one turn every this many seconds, matching the server exactly */
var PERIOD = { F: 30, C: 9, S: 11 };
var rideAngle = { F: 0, C: 0, S: 0 }, rideAt = 0;

function spinRides(){
  var since = (performance.now() - rideAt) / 1000;
  var f = rideAngle.F - since * (Math.PI*2 / PERIOD.F);
  var c = rideAngle.C + since * (Math.PI*2 / PERIOD.C);
  var s = rideAngle.S + since * (Math.PI*2 / PERIOD.S);
  if (wheelGroup)    wheelGroup.rotation.z = f;
  if (carouselGroup) carouselGroup.rotation.y = c;
  if (swingGroup)    swingGroup.rotation.y = s;
}

function poseFor(mesh, p, dt){
  var b = mesh.userData.body, h = mesh.userData.head;
  if (!b) return;
  var t = performance.now() / 1000;
  if (p.e === 'dance'){ b.rotation.z = Math.sin(t*8)*0.3; h.position.y = 1.18 + Math.abs(Math.sin(t*8))*0.1; }
  else if (p.e === 'wave'){ b.rotation.z = Math.sin(t*6)*0.14; h.position.y = 1.18; }
  else if (p.e === 'cheer'){ b.rotation.z = 0; h.position.y = 1.18 + Math.abs(Math.sin(t*5))*0.24; }
  else if (p.e === 'sit'){ b.rotation.z = 0; b.scale.y = 0.6; h.position.y = 0.86; }
  else {
    b.rotation.z = p.w ? Math.sin(t*9)*0.09 : 0;
    b.scale.y = 1; h.position.y = 1.18;
  }
}

function updateCamera(){
  var tx = me.x, ty = me.h + 1.3, tz = me.z;
  var cx = tx - Math.sin(camYaw) * Math.cos(camPitch) * camDist;
  var cz = tz - Math.cos(camYaw) * Math.cos(camPitch) * camDist;
  var cy = ty + Math.sin(camPitch) * camDist;
  camera.position.lerp(new THREE.Vector3(cx, Math.max(0.8, cy), cz), 0.12);
  camera.lookAt(tx, ty, tz);
}

function updatePrompt(){
  if (inGallery) return;
  var el = $('prompt');
  if (me.ride){
    el.style.display = 'block';
    el.innerHTML = 'Enjoying <b>' + RIDE_NAMES[me.ride] + '</b>';
    return;
  }
  var d = Math.hypot(me.x - STALL.x, me.z - STALL.z);
  if (d < 2.6){
    el.style.display = 'block';
    el.innerHTML = '<b>Pop the balloons</b> - press E or tap here';
    el.style.pointerEvents = 'auto';
    el.onclick = openGallery;
    return;
  }
  var f = Math.hypot(me.x - FOUNTAIN.x, me.z - FOUNTAIN.z);
  if (f < 3.4){
    el.style.display = 'block';
    el.innerHTML = '<b>Make a wish</b> - press E or tap here';
    el.style.pointerEvents = 'auto';
    el.onclick = makeWish;
    return;
  }
  var near = null, nd = 99;
  for (var k in RIDE_POS){
    var q = Math.hypot(me.x - RIDE_POS[k].x, me.z - RIDE_POS[k].z);
    if (q < nd){ nd = q; near = k; }
  }
  if (nd < 6){
    el.style.display = 'block';
    el.style.pointerEvents = 'none';
    el.innerHTML = 'Walk onto the platform to ride <b>' + RIDE_NAMES[near] + '</b>';
    return;
  }
  el.style.display = 'none';
  el.style.pointerEvents = 'none';
}

function toast(text, ms){
  var t = $('toast');
  t.textContent = text;
  t.style.display = 'block';
  clearTimeout(toast._t);
  toast._t = setTimeout(function(){ t.style.display = 'none'; }, ms || 2200);
}

function makeWish(){
  if (wishes >= 3){ toast('The fountain has heard enough from you'); return; }
  wishes++;
  tickets += 1;
  $('tickets').textContent = tickets;
  sendEmote('cheer');
  toast('You toss a coin. Plus one ticket.');
}

/* ==========================================================================
   Balloon stall
   ========================================================================== */
var gTimer = null, gPopped = 0, gLeft = 20, gSpawner = null;

function openGallery(){
  if (inGallery) return;
  inGallery = true;
  input.ax = 0; input.az = 0;
  gPopped = 0; gLeft = 20;
  $('g-score').textContent = 'Popped 0';
  $('g-time').textContent = gLeft;
  $('sky').innerHTML = '';
  $('g-done').style.display = 'none';
  $('gallery').style.display = 'block';
  $('prompt').style.display = 'none';

  gSpawner = setInterval(spawnBalloon, 520);
  gTimer = setInterval(function(){
    gLeft--;
    $('g-time').textContent = gLeft;
    if (gLeft <= 0) endGallery();
  }, 1000);
  for (var i = 0; i < 4; i++) spawnBalloon();
}

function spawnBalloon(){
  var sky = $('sky');
  var b = document.createElement('div');
  b.className = 'balloon';
  var hue = Math.floor(Math.random()*360);
  b.style.background = 'hsl(' + hue + ',75%,58%)';
  b.style.left = (6 + Math.random()*82) + '%';
  b.style.top = '100%';
  sky.appendChild(b);

  var y = 100, speed = 0.30 + Math.random()*0.42;
  var drift = (Math.random()-0.5) * 0.06;
  var x = parseFloat(b.style.left);
  var id = setInterval(function(){
    y -= speed; x += drift;
    b.style.top = y + '%';
    b.style.left = x + '%';
    if (y < -14){ clearInterval(id); b.remove(); }
  }, 16);

  b.addEventListener('pointerdown', function(ev){
    ev.stopPropagation();
    if (b.dataset.done) return;
    b.dataset.done = '1';
    b.classList.add('pop');
    clearInterval(id);
    setTimeout(function(){ b.remove(); }, 220);
    gPopped++;
    $('g-score').textContent = 'Popped ' + gPopped;
  });
}

function endGallery(){
  clearInterval(gTimer); clearInterval(gSpawner);
  var earned = gPopped * 2;
  tickets += earned;
  $('tickets').textContent = tickets;
  $('g-final').textContent = gPopped + ' popped';
  $('g-sub').textContent = 'That is ' + earned + ' tickets.';
  $('g-done').style.display = 'block';
  if (gPopped >= 12) sendSay('popped ' + gPopped + ' balloons');
}

$('g-close').onclick = function(){
  $('gallery').style.display = 'none';
  inGallery = false;
  /* nudge out of the stall so the prompt does not fire again instantly */
  me.z += 1.2;
};

/* ==========================================================================
   Controls
   ========================================================================== */
var keys = {};
addEventListener('keydown', function(e){
  if (typing){
    if (e.key === 'Enter'){ submitSay(); }
    if (e.key === 'Escape'){ closeSay(); }
    return;
  }
  var k = e.key.toLowerCase();
  keys[k] = true;
  if (['arrowup','arrowdown','arrowleft','arrowright',' '].indexOf(k) >= 0) e.preventDefault();
  if (k === 'e'){
    var d = Math.hypot(me.x - STALL.x, me.z - STALL.z);
    var f = Math.hypot(me.x - FOUNTAIN.x, me.z - FOUNTAIN.z);
    if (d < 2.6) openGallery(); else if (f < 3.4) makeWish();
  }
  if (k === 't'){ openSay(); e.preventDefault(); }
  readKeys();
});
addEventListener('keyup', function(e){ keys[e.key.toLowerCase()] = false; readKeys(); });

function readKeys(){
  if (typing || inGallery){ input.ax = 0; input.az = 0; return; }
  var f = 0, s = 0;
  if (keys['w'] || keys['arrowup'])    f += 1;
  if (keys['s'] || keys['arrowdown'])  f -= 1;
  if (keys['a'] || keys['arrowleft'])  s -= 1;
  if (keys['d'] || keys['arrowright']) s += 1;
  /* movement is relative to where the camera is looking */
  var fx = Math.sin(camYaw), fz = Math.cos(camYaw);
  var ax = fx * f + fz * s;
  var az = fz * f - fx * s;
  var m = Math.hypot(ax, az);
  if (m > 1){ ax /= m; az /= m; }
  input.ax = ax; input.az = az;
}

/* drag anywhere to look around */
var dragging = false, lastX = 0, lastY = 0, dragId = null;
addEventListener('pointerdown', function(e){
  if (inGallery || typing) return;
  if (e.target.closest && e.target.closest('#buttons, #chatbar, #prompt, #gate')) return;
  if (e.target.closest && e.target.closest('#stick')) return;
  dragging = true; dragId = e.pointerId; lastX = e.clientX; lastY = e.clientY;
});
addEventListener('pointermove', function(e){
  if (!dragging || e.pointerId !== dragId) return;
  camYaw   -= (e.clientX - lastX) * 0.006;
  camPitch += (e.clientY - lastY) * 0.004;
  camPitch = Math.max(0.05, Math.min(1.15, camPitch));
  lastX = e.clientX; lastY = e.clientY;
  readKeys();
});
addEventListener('pointerup', function(e){ if (e.pointerId === dragId) dragging = false; });
addEventListener('wheel', function(e){
  camDist = Math.max(4, Math.min(18, camDist + Math.sign(e.deltaY) * 0.8));
}, { passive: true });

/* touch stick */
var stick = $('stick'), knob = $('sknob'), base = $('sbase');
var sid = null, sx0 = 0, sy0 = 0, SR = 54;
stick.addEventListener('touchstart', function(e){
  var t = e.changedTouches[0];
  sid = t.identifier; sx0 = t.clientX; sy0 = t.clientY;
  var r = stick.getBoundingClientRect();
  base.style.left = knob.style.left = (sx0 - r.left) + 'px';
  base.style.top  = knob.style.top  = (sy0 - r.top) + 'px';
  stick.classList.add('on');
  e.preventDefault();
}, { passive:false });
stick.addEventListener('touchmove', function(e){
  for (var i = 0; i < e.changedTouches.length; i++){
    var t = e.changedTouches[i];
    if (t.identifier !== sid) continue;
    var dx = t.clientX - sx0, dy = t.clientY - sy0;
    var d = Math.hypot(dx, dy), k = d > SR ? SR/d : 1;
    var r = stick.getBoundingClientRect();
    knob.style.left = (sx0 - r.left + dx*k) + 'px';
    knob.style.top  = (sy0 - r.top  + dy*k) + 'px';
    var f = -dy / SR, s = dx / SR;
    var fx = Math.sin(camYaw), fz = Math.cos(camYaw);
    var ax = fx*f + fz*s, az = fz*f - fx*s;
    var m = Math.hypot(ax, az);
    if (m > 1){ ax /= m; az /= m; }
    input.ax = ax; input.az = az;
  }
  e.preventDefault();
}, { passive:false });
function endStick(e){
  for (var i = 0; i < e.changedTouches.length; i++){
    if (e.changedTouches[i].identifier === sid){
      sid = null; stick.classList.remove('on'); input.ax = 0; input.az = 0;
    }
  }
}
stick.addEventListener('touchend', endStick);
stick.addEventListener('touchcancel', endStick);

/* emotes and chat */
$('btn-emote').onclick = function(){
  var e = $('emotes');
  e.style.display = e.style.display === 'flex' ? 'none' : 'flex';
};
document.querySelectorAll('[data-emote]').forEach(function(b){
  b.onclick = function(){ sendEmote(b.dataset.emote); $('emotes').style.display = 'none'; };
});
$('btn-say').onclick = openSay;
function openSay(){
  typing = true; input.ax = 0; input.az = 0;
  $('chatbar').style.display = 'block';
  $('chatinput').value = '';
  $('chatinput').focus();
}
function closeSay(){ typing = false; $('chatbar').style.display = 'none'; }
function submitSay(){
  var v = $('chatinput').value.trim();
  if (v) sendSay(v);
  closeSay();
}
$('chatinput').addEventListener('keydown', function(e){
  if (e.key === 'Enter'){ submitSay(); e.preventDefault(); }
  if (e.key === 'Escape'){ closeSay(); }
});

/* ---------- in we go ---------- */
$('enter').onclick = function(){
  var n = ($('name').value || '').trim().slice(0, 12);
  if (!n){ $('gate-err').textContent = 'Type a name first.'; return; }
  $('gate-err').textContent = '';
  $('enter').disabled = true;
  if (!renderer) { init3D(); frame(); }
  connect(n);
};
$('name').addEventListener('keydown', function(e){ if (e.key === 'Enter') $('enter').click(); });
</script>
</body>
</html>
`;

/* ==========================================================================
   Sunday Park - a 3D park you walk around with whoever else is online

   There is one park, not a room per group. Open the link, type a name, and
   you are standing at the gate with everyone else. No code to share, no
   lobby. One Durable Object holds the park and everybody dials out to it,
   which is what makes it work from any network.

   The server owns where people are. The browser only draws it.
   ========================================================================== */

/* ---------- the park ------------------------------------------------------
   Map x runs east, map y runs north into the screen, which is world z.
   g grass   . path   T tree   ~ water   f fence   X building   B bench
   F big wheel   C carousel   S swings   M mirror maze
   A ride letter is its boarding tile. Walk onto it and the park takes over.
   ------------------------------------------------------------------------ */
export const MAP = [
  "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
  "fgTggggTgggggggggggTgggggggggggggggggggTTggggggggggggggggggf",
  "fgggggggggggggggggggggggTggggggggTTggggggggggggTgggggggggggf",
  "fggggggggggggggggggggggggggTgggggggggggggggggggggggggggggggf",
  "fggg~~~~~~~~~~~~~gggggggggTgTgggTggggTTTTggggggggggggggggggf",
  "fgg~~~~~~~~~~~~~~~gTggggggggggggggggTggggggTgTgggggggggggggf",
  "fgg~~~~~~~~~~~~~~~ggTgggTgggggggggggggggggggggggTgggTggggggf",
  "fgg~~~~~~~~~~~~~~~ggggggTggggggggggTggggggggggggggggTggggggf",
  "fgg~~~~~~~~~~~~~~~gggggggggggggTggggggggTgggggggggggggTggggf",
  "fgg~~~~~~~~~~~~~~~gggTggggggggggggTgTgggggggggggggggggTTgTgf",
  "fgTg~~~~~~~~~~~~~ggggTggTggggggggggggTggggggggggggTgTggggggf",
  "fgggggTggggggggggggggggggggggggggggggggggggggggggggggggggggf",
  "fgggggTggg........................................gTgTgggggf",
  "fgggTggggg........................................gggggggggf",
  "fggggTgggg....XXXXXXX.................XXXXXXXX....gggTgggggf",
  "fgggTgggTg...gXXXXXXXggggggg...gggggggXXXXXXXXg...gggggggggf",
  "fggggTgggg...gXXXXXXXggggggg...gggggggXXXXXXXXg...ggTggggggf",
  "fgTggggggg...gXXXXXXXTgg............ggXXXXXXXXg...gggggggggf",
  "fgTggggggg...gXXXXXXXggg.B........B.ggXXXXXXXXg...gggggggggf",
  "fggggggggg...gXXXFXXXggg....~~~~....ggXXXXCXXXg...gggggggggf",
  "fgggTggggg...ggggggggggg....~~~~....ggggggggggg...gggggggggf",
  "fggggggggg...ggggggggggg....~~~~....gTggggggggg...gggggggggf",
  "fggggggTTg...ggggggggggg.B........B.ggggggggggg...gggggggggf",
  "fgggTggggg...gggggggggTg............gggggggTggg...gggggggTgf",
  "fggggggTgg...ggggggggggggggg...gggggggggggggggg...gggggggggf",
  "fggggggggg........................................gggggggggf",
  "fgggggTggg........................................gggTgggggf",
  "fggggggggg....XXXXXXX.................XXXXXXXX....gggggggggf",
  "fgggggggggggggXXXXXXXggggggg...gggggggXXXXXXXXgggggggTgggggf",
  "fgggggggggggggXXXXXXXggggggg...gggggggXXXXXXXXgTggggggggTggf",
  "fgTgggggggggggXXXXXXXggggggg...gggggggXXXXXXXXggggggggggggTf",
  "fggggggTggggggXXXMXXXggggggg...gggggggXXXXSXXXgggggggggggggf",
  "fTggggggTgTggggggggggggggggg...ggggggggTggggggggggggggggTggf",
  "fgggggggTggggggggggggggggggg...ggggggggggggggTggggTggggggggf",
  "fgTgggggggTggTTgggggTggggggg...ggggggggggggggggggggggTgggggf",
  "fggggTgggTTggggggggggggggggg...gTggTgggggggggTgggggggggggggf",
  "fggTggTgggTgggggggggTggggggg...ggggggggggggggggggTggggggTggf",
  "fgggTgTgTggggggggggggggggggg...gggggggggTgTggggggggggTgggggf",
  "fggggggTgggggggggggggggggggg...ggggggggggTTTgggggTggggTggggf",
  "ffffffffffffffffffffffffffffff..ffffffffffffffffffffffffffff"
];

export const MW = MAP[0].length;
export const MH = MAP.length;
const SOLID = 'fT~X';

export function cell(x, y){
  if (x < 0 || y < 0 || x >= MW || y >= MH) return 'f';
  return MAP[y][x];
}
export function solid(x, y){ return SOLID.indexOf(cell(x, y)) >= 0; }

/* ---------- the rides -----------------------------------------------------
   Four rides, one machine. The wheel turns in the vertical plane so it lifts
   you over the treetops; the others turn flat. The maze does not turn at
   all, it just loses you somewhere else in the park.
   ------------------------------------------------------------------------ */
/* Each ride turns for ever at its own steady rate. The server publishes the
   angle with every update and the browser rotates the model to match, so a
   rider and the seat they are sitting in can never drift apart. Getting this
   wrong once meant people floated through the wheel beside the cabins. */
export const RIDES = {
  F: { name: 'The Big Wheel', cx: 17.5, cz: 16.5, r: 5.4, hub: 6.2,
       plane: 'vertical', seats: 10, period: 30, revs: 1 },
  C: { name: 'Carousel',      cx: 42.0, cz: 16.5, r: 2.4, high: 1.2,
       plane: 'flat',     seats: 8,  period: 9,  revs: 3 },
  S: { name: 'Swing Ride',    cx: 42.0, cz: 29.0, r: 4.0, high: 3.4,
       plane: 'flat',     seats: 8,  period: 11, revs: 2 },
  M: { name: 'Mirror Maze',   cx: 17.5, cz: 29.0, plane: 'lost', secs: 6 }
};

/* how far each ride has turned, right now */
export function rideAngles(nowMs){
  const t = (nowMs === undefined ? Date.now() : nowMs) / 1000;
  return {
    F: -t * (Math.PI * 2 / RIDES.F.period),   /* the wheel turns one way */
    C:  t * (Math.PI * 2 / RIDES.C.period),
    S:  t * (Math.PI * 2 / RIDES.S.period)
  };
}

/* Where seat `seat` of a ride is, given how far the ride has turned. This is
   the same arithmetic the browser uses to place the model, which is the
   whole point. */
export function seatPose(key, seat, rot){
  const R = RIDES[key];
  if (!R || R.plane === 'lost') return null;
  const base = (seat / R.seats) * Math.PI * 2;
  if (R.plane === 'vertical'){
    const a = base + rot;
    return { x: R.cx + Math.cos(a) * R.r, z: R.cz, h: R.hub + Math.sin(a) * R.r, dir: 0 };
  }
  const a = base - rot;
  return { x: R.cx + Math.cos(a) * R.r, z: R.cz + Math.sin(a) * R.r,
           h: R.high, dir: a + Math.PI / 2 };
}

/* the seat nearest the boarding point, so you get into the car in front of
   you rather than teleporting across the ride */
export function nearestSeat(key, rot, x, z){
  const R = RIDES[key];
  let best = 0, bestD = Infinity;
  for (let s = 0; s < R.seats; s++){
    const p = seatPose(key, s, rot);
    const d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z) + p.h * p.h * 0.35;
    if (d < bestD){ bestD = d; best = s; }
  }
  return best;
}

export function rideSeconds(key){
  const R = RIDES[key];
  return R.plane === 'lost' ? R.secs : R.period * R.revs;
}

export const SPAWN = { x: 30.0, z: 38.2 };
export const TICK_MS = 66;        /* about fifteen a second */
export const SPEED = 4.6;         /* tiles per second */
export const MAX_PLAYERS = 40;
export const EMOTES = ['wave', 'dance', 'sit', 'cheer'];

/* ---------- movement ------------------------------------------------------ */
export function moveWithWalls(p, dx, dz){
  const r = 0.3;
  const nx = p.x + dx;
  if (!blocked(nx, p.z, r)) p.x = nx;
  const nz = p.z + dz;
  if (!blocked(p.x, nz, r)) p.z = nz;
}
export function blocked(x, z, r){
  return solid(Math.floor(x - r), Math.floor(z - r)) ||
         solid(Math.floor(x + r), Math.floor(z - r)) ||
         solid(Math.floor(x - r), Math.floor(z + r)) ||
         solid(Math.floor(x + r), Math.floor(z + r));
}
export function randomOpenTile(rnd){
  for (let i = 0; i < 500; i++){
    const x = Math.floor(rnd() * MW), z = Math.floor(rnd() * MH);
    if (!solid(x, z) && 'FCSM'.indexOf(cell(x, z)) < 0) return { x: x + 0.5, z: z + 0.5 };
  }
  return { x: SPAWN.x, z: SPAWN.z };
}

/* ==========================================================================
   Worker
   ========================================================================== */
export default {
  async fetch(request, env){
    const url = new URL(request.url);
    if (url.pathname === '/api/ws'){
      return env.PARK.get(env.PARK.idFromName('the-park')).fetch(request);
    }
    return new Response(PAGE, { headers: { 'content-type': 'text/html; charset=utf-8' } });
  }
};

export class Park {
  constructor(state, env){
    this.sockets = new Map();
    this.players = [];
    this.seq = 0;
    this.timer = null;
    this.lastTick = 0;
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

  onMessage(ws, m){
    if (m.t === 'join'){
      if (this.sockets.has(ws)) return;
      if (this.players.length >= MAX_PLAYERS){ send(ws, { t: 'busy' }); return; }
      const p = {
        id: 'p' + (++this.seq),
        name: cleanName(m.name),
        hue: Math.floor(Math.random() * 360),
        ws,
        x: SPAWN.x + (Math.random() - 0.5) * 1.8,
        z: SPAWN.z,
        h: 0,
        dir: -Math.PI / 2,
        ax: 0, az: 0,
        walking: false,
        ride: null,
        emote: null,
        say: null,
        rides: 0
      };
      this.players.push(p);
      this.sockets.set(ws, p);
      send(ws, { t: 'you', id: p.id, name: p.name, hue: p.hue });
      this.startLoop();
      return;
    }

    const p = this.sockets.get(ws);
    if (!p) return;

    if (m.t === 'in'){ p.ax = clamp1(m.ax); p.az = clamp1(m.az); return; }
    if (m.t === 'emote' && EMOTES.indexOf(m.kind) >= 0){
      p.emote = { kind: m.kind, until: Date.now() + 2800 };
      return;
    }
    if (m.t === 'say'){
      const text = String(m.text || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 60);
      if (text) p.say = { text, until: Date.now() + 5500 };
      return;
    }
  }

  onClose(ws){
    const p = this.sockets.get(ws);
    this.sockets.delete(ws);
    if (!p) return;
    this.players = this.players.filter(x => x !== p);
    if (this.players.length === 0) this.stopLoop();
  }

  startLoop(){
    if (this.timer) return;
    this.lastTick = Date.now();
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }
  stopLoop(){ if (this.timer){ clearInterval(this.timer); this.timer = null; } }

  tick(){
    const now = Date.now();
    const dt = Math.min(0.25, (now - this.lastTick) / 1000);
    this.lastTick = now;

    for (const p of this.players){
      if (p.emote && now > p.emote.until) p.emote = null;
      if (p.say && now > p.say.until) p.say = null;

      if (p.ride){ this.rideStep(p, now); continue; }

      let ax = p.ax, az = p.az;
      const mag = Math.hypot(ax, az);
      if (mag > 1){ ax /= mag; az /= mag; }
      p.walking = mag > 0.08;
      if (p.walking){
        p.dir = Math.atan2(az, ax);
        moveWithWalls(p, ax * SPEED * dt, az * SPEED * dt);
        p.emote = null;
        this.maybeBoard(p, now);
      }
    }
    this.push();
  }

  maybeBoard(p, now){
    const c = cell(Math.floor(p.x), Math.floor(p.z));
    if (!RIDES[c]) return;
    const seat = RIDES[c].plane === 'lost'
      ? 0 : nearestSeat(c, rideAngles(now)[c], p.x, p.z);
    p.ride = { key: c, started: now, seat: seat, offX: p.x, offZ: p.z + 1.6 };
    p.rides += 1;
    p.walking = false;
  }

  rideStep(p, now){
    const key = p.ride.key;
    const R = RIDES[key];
    const done = (now - p.ride.started) >= rideSeconds(key) * 1000;

    if (R.plane === 'lost'){
      if (done){
        const spot = randomOpenTile(Math.random);
        p.x = spot.x; p.z = spot.z; p.h = 0; p.ride = null;
        p.say = { text: 'where am I', until: now + 4000 };
      }
      return;
    }

    const pose = seatPose(key, p.ride.seat, rideAngles(now)[key]);
    p.x = pose.x; p.z = pose.z; p.h = pose.h; p.dir = pose.dir;

    /* Only let people off near the bottom, so nobody is dropped from the top
       of the wheel the moment their time is up. */
    if (done && p.h < (R.plane === 'vertical' ? R.hub - R.r + 0.9 : 99)){
      let ox = p.ride.offX, oz = p.ride.offZ;
      if (blocked(ox, oz, 0.3)){ ox = SPAWN.x; oz = SPAWN.z; }
      p.x = ox; p.z = oz; p.h = 0; p.ride = null;
    }
  }

  push(){
    const all = this.players.map(p => ({
      i: p.id, n: p.name, u: p.hue,
      x: r2(p.x), z: r2(p.z), h: r2(p.h), d: r2(p.dir),
      w: p.walking ? 1 : 0,
      r: p.ride ? p.ride.key : null,
      e: p.emote ? p.emote.kind : null,
      s: p.say ? p.say.text : null,
      c: p.rides
    }));
    /* the ride angles travel with every update so the models the browser
       draws are turned to exactly where the server thinks they are */
    const a = rideAngles();
    const msg = JSON.stringify({
      t: 'world', p: all,
      a: { F: r2(a.F % (Math.PI*2)), C: r2(a.C % (Math.PI*2)), S: r2(a.S % (Math.PI*2)) }
    });
    for (const p of this.players){ try { p.ws.send(msg); } catch {} }
  }
}

function send(ws, o){ try { ws.send(JSON.stringify(o)); } catch {} }
function clamp1(v){ v = Number(v); if (!isFinite(v)) return 0; return v < -1 ? -1 : v > 1 ? 1 : v; }
function r2(n){ return Math.round(n * 100) / 100; }
function cleanName(n){
  const s = String(n || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 12);
  return s || 'Visitor';
}
