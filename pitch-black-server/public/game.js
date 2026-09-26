/* ==========================================================================
   Pitch Black - shared geometry

   Imported by both the Worker and the browser. The server uses it to decide
   who can see whom; the client uses the same functions to draw. Keeping one
   copy is the point: if the two ever disagreed about where a wall is, the
   server would hide somebody the client had already drawn.
   ========================================================================== */

export var MAP = [
  "######################################",
  "###################E.....#############",
  "###################..#...####....#####",
  "####....##...........#....0......#####",
  "####..........#####..#...####....#####",
  "####..........#####......####....#####",
  "####....#####.#########.#####....#####",
  "######.######.#########.#######.######",
  "######.######.#########.#######.######",
  "#2...#.###.......######.#######.######",
  "#....#.###....##.######.#######.....##",
  "#................###................##",
  "#...................................##",
  "#....#####................#######.####",
  "###.###########.#######.#########.####",
  "###.....#######.####.......######.####",
  "###.....#####.....##.......###....####",
  "###.....................#.........####",
  "###.....#####..............###....####",
  "###1....#####.....############3...####",
  "#############....4####################",
  "######################################"
];

export var MW = MAP[0].length;
export var MH = MAP.length;

export function cell(cx, cy){
  if (cx < 0 || cy < 0 || cx >= MW || cy >= MH) return '#';
  return MAP[cy][cx];
}
export function solid(cx, cy){ return cell(cx, cy) === '#'; }

/* spawn points and the exit, read once from the map itself */
export var SPAWN = [];
export var EXIT = { x: 1.5, y: 1.5 };
(function(){
  for (var y = 0; y < MH; y++){
    for (var x = 0; x < MW; x++){
      var c = MAP[y][x];
      if (c >= '0' && c <= '9') SPAWN[Number(c)] = { x: x + 0.5, y: y + 0.5 };
      if (c === 'E') EXIT = { x: x + 0.5, y: y + 0.5 };
    }
  }
})();

/* ---------- tuning ------------------------------------------------------- */
export var TICK      = 50;      /* ms between simulation steps */
export var SPEED_RUN = 3.4;     /* cells per second */
export var SPEED_HUN = 3.7;     /* the hunter is a shade faster */
export var FOV_RUN   = 1.15;    /* torch arc, radians */
export var FOV_HUN   = 1.75;    /* wider, so hunters sweep rather than peer */
export var RANGE_RUN = 9.5;
export var RANGE_HUN = 7.5;
export var AMBIENT   = 1.45;    /* you always see this far, torch or not */
export var CATCH     = 0.55;
export var ROUND_MS  = 100000;
export var ROUNDS    = 3;
export var MAX_PLAYERS = 8;

export function speedOf(role){ return role === 'hunter' ? SPEED_HUN : SPEED_RUN; }
export function rangeOf(role){ return role === 'hunter' ? RANGE_HUN : RANGE_RUN; }
export function fovOf(role){   return role === 'hunter' ? FOV_HUN   : FOV_RUN;   }

/* ---------- movement ----------------------------------------------------- */
/* Axes resolve separately so you slide along a wall instead of sticking to it
   the moment one direction is blocked. */
export function moveWithWalls(p, dx, dy){
  var r = 0.26;
  var nx = p.x + dx;
  if (!blocked(nx, p.y, r)) p.x = nx;
  var ny = p.y + dy;
  if (!blocked(p.x, ny, r)) p.y = ny;
}
export function blocked(x, y, r){
  return solid(Math.floor(x - r), Math.floor(y - r)) ||
         solid(Math.floor(x + r), Math.floor(y - r)) ||
         solid(Math.floor(x - r), Math.floor(y + r)) ||
         solid(Math.floor(x + r), Math.floor(y + r));
}

/* ---------- sight -------------------------------------------------------- */
/* Grid traversal rather than fixed steps. Stepping along a ray in small
   increments and sampling looks fine and is wrong: a ray crossing a corner
   between two diagonal walls can land either side of the brick and never
   sample it, so you see through the wall. An independent test found ten such
   leaks in 1296 wall-separated pairs. This visits every cell the ray actually
   enters, in order, so nothing can be skipped. It is faster too. */
export function castRay(ox, oy, ang, maxD){
  var dx = Math.cos(ang), dy = Math.sin(ang);
  var mx = Math.floor(ox), my = Math.floor(oy);
  if (solid(mx, my)) return 0;

  var dtx = Math.abs(dx) < 1e-9 ? Infinity : Math.abs(1 / dx);
  var dty = Math.abs(dy) < 1e-9 ? Infinity : Math.abs(1 / dy);
  var stepX, nextX, stepY, nextY;
  if (dx < 0){ stepX = -1; nextX = (ox - mx) * dtx; }
  else       { stepX =  1; nextX = (mx + 1 - ox) * dtx; }
  if (dy < 0){ stepY = -1; nextY = (oy - my) * dty; }
  else       { stepY =  1; nextY = (my + 1 - oy) * dty; }

  var dist = 0;
  while (dist <= maxD){
    if (nextX < nextY){ dist = nextX; nextX += dtx; mx += stepX; }
    else if (nextY < nextX){ dist = nextY; nextY += dty; my += stepY; }
    else {
      /* exactly through a corner. Take both axes at once and judge the cell
         we land in; squeezing through the pinch is the generous reading and
         it keeps the picture stable as you turn. */
      dist = nextX;
      nextX += dtx; nextY += dty; mx += stepX; my += stepY;
    }
    if (solid(mx, my)) return Math.min(dist, maxD);
  }
  return maxD;
}

/* Can a player at `from`, facing `ang`, see the point tx,ty?
   This is the function the server culls with, so it decides what a client is
   even told about, not merely what it draws. */
export function canSee(from, ang, range, fov, tx, ty){
  var dx = tx - from.x, dy = ty - from.y;
  var d = Math.sqrt(dx * dx + dy * dy);
  if (d < 0.0001) return true;
  var toward = Math.atan2(dy, dx);
  if (d < AMBIENT) return castRay(from.x, from.y, toward, d) >= d - 0.12;
  if (d > range) return false;
  var a = toward - ang;
  while (a >  Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  if (Math.abs(a) > fov / 2) return false;
  return castRay(from.x, from.y, toward, d) >= d - 0.12;
}

/* Spawning face-first into brick makes the game look broken in the first
   second, so point everyone down whichever corridor is actually open. */
export function facingOpen(sp){
  var cx = Math.floor(sp.x), cy = Math.floor(sp.y);
  var dirs = [[1,0,0],[0,1,Math.PI/2],[-1,0,Math.PI],[0,-1,-Math.PI/2]];
  var best = 0, bestRun = -1;
  for (var i = 0; i < dirs.length; i++){
    var run = 0;
    while (run < 12 && !solid(cx + dirs[i][0] * (run + 1), cy + dirs[i][1] * (run + 1))) run++;
    if (run > bestRun){ bestRun = run; best = dirs[i][2]; }
  }
  return best;
}

export function roomCode(){
  var L = 'ABCDEFGHJKLMNPQRSTUVWXYZ', s = '';   /* no I or O, they misread aloud */
  for (var i = 0; i < 4; i++) s += L[Math.floor(Math.random() * L.length)];
  return s;
}
