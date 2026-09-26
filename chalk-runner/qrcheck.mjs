/* ==========================================================================
   Chalk Runner - is the QR a real QR?

   There is no scanner on the machine this was written on, so the code cannot
   be checked by pointing a phone at it here. Instead it is taken apart again
   from the other end, the way a reader would:

     1  the three finder patterns are where the spec says
     2  the timing lines really alternate
     3  the fifteen format squares decode through the BCH code back to the
        error correction level and the mask that were chosen
     4  unmasking and walking the data path returns the exact string
     5  every Reed-Solomon syndrome is zero, which is the property a scanner
        relies on and the one a wrong generator polynomial destroys

   Five is the one that matters most: it is computed straight from the field
   and has nothing to do with how the encoder built the parity.

   None of this proves a phone camera will read it off a screen, which is why
   it is still worth scanning once by hand.
   ========================================================================== */

import fs from 'fs';
import vm from 'vm';
import { fileURLToPath } from 'url';

const html = fs.readFileSync(fileURLToPath(new URL('./client.html', import.meta.url)), 'utf8');
const js = /<script>([\s\S]*)<\/script>/.exec(html)[1];
const src = /var QR = \(function\(\)\{[\s\S]*?\n\}\)\(\);/.exec(js);
if (!src) { console.log('could not find the QR code in client.html'); process.exit(1); }

const ctx = vm.createContext({ Math, Uint8Array, Array, Infinity, console });
vm.runInContext(src[0] + '\nglobalThis.QR = QR;', ctx);
const QR = ctx.QR;

let pass = 0, fail = 0;
const check = (n, ok, extra) => {
  if (ok){ pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (extra !== undefined ? '   >> ' + extra : '')); }
};

/* ---------- the field, written again rather than borrowed ---------------- */
const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++){ EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11D; }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
}
const mul = (a, b) => (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]];

const MASKS = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0
];

/* which squares a reader must not treat as data */
function reserved(size, ver){
  const f = [];
  for (let r = 0; r < size; r++) f.push(new Array(size).fill(0));
  const block = (r0, c0, h, w) => {
    for (let r = r0; r < r0 + h; r++) for (let c = c0; c < c0 + w; c++){
      if (r >= 0 && c >= 0 && r < size && c < size) f[r][c] = 1;
    }
  };
  block(0, 0, 9, 9);
  block(0, size - 8, 9, 8);
  block(size - 8, 0, 8, 9);
  for (let i = 0; i < size; i++){ f[6][i] = 1; f[i][6] = 1; }
  const A = { 1:null, 2:18, 3:22, 4:26, 5:30 }[ver];
  if (A) block(A - 2, A - 2, 5, 5);
  return f;
}

function readFormat(g, size){
  let bits = 0;
  for (let i = 0; i <= 5; i++) bits |= g[8][i] << i;
  bits |= g[8][7] << 6;
  bits |= g[8][8] << 7;
  bits |= g[7][8] << 8;
  for (let i = 9; i <= 14; i++) bits |= g[14 - i][8] << i;
  const raw = bits ^ 0x5412;
  /* the BCH remainder of a clean format word is zero */
  let d = raw;
  for (let i = 4; i >= 0; i--) if (d & (1 << (i + 10))) d ^= 0x537 << i;
  return { ec: (raw >> 13) & 3, mask: (raw >> 10) & 7, residue: d & 0x3FF, raw, bits };
}

function readData(g, size, ver, mask){
  const f = reserved(size, ver);
  const bits = [];
  let up = true;
  for (let col = size - 1; col > 0; col -= 2){
    if (col === 6) col--;
    for (let step = 0; step < size; step++){
      const row = up ? size - 1 - step : step;
      for (let d = 0; d < 2; d++){
        const c = col - d;
        if (f[row][c]) continue;
        let v = g[row][c];
        if (MASKS[mask](row, c)) v ^= 1;
        bits.push(v);
      }
    }
    up = !up;
  }
  const words = [];
  for (let i = 0; i + 7 < bits.length; i += 8){
    let w = 0;
    for (let k = 0; k < 8; k++) w = (w << 1) | bits[i + k];
    words.push(w);
  }
  return words;
}

function payload(words){
  let at = 0;
  const take = n => {
    let v = 0;
    for (let i = 0; i < n; i++){
      const bit = (words[at >> 3] >> (7 - (at & 7))) & 1;
      v = (v << 1) | bit; at++;
    }
    return v;
  };
  const mode = take(4);
  if (mode !== 4) return { mode, text: null };
  const len = take(8);
  let s = '';
  for (let i = 0; i < len; i++) s += String.fromCharCode(take(8));
  return { mode, len, text: s };
}

/* ---------- the checks -------------------------------------------------- */
const LINK = 'https://chalk-runner.waseemwdd0165.workers.dev/?room=PFNK';
console.log('\nqr\n');

const q = QR.build(LINK);
check('it produced something', !!q);
check('and picked a version that fits', q.version >= 1 && q.version <= 5, q.version);
check('the grid is the size that version means', q.size === 17 + q.version * 4, q.size);

const g = q.grid, size = q.size;

/* 1 - finders */
function finderAt(r0, c0){
  for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++){
    const want = (r === 0 || r === 6 || c === 0 || c === 6) ? 1
               : (r >= 2 && r <= 4 && c >= 2 && c <= 4) ? 1 : 0;
    if (g[r0 + r][c0 + c] !== want) return false;
  }
  return true;
}
check('the finder in the top left is right', finderAt(0, 0));
check('the finder in the top right is right', finderAt(0, size - 7));
check('the finder in the bottom left is right', finderAt(size - 7, 0));
check('and there is no fourth one in the bottom right',
      !finderAt(size - 7, size - 7));

/* 2 - timing */
let timingOk = true;
for (let i = 8; i < size - 8; i++){
  if (g[6][i] !== (i % 2 === 0 ? 1 : 0)) timingOk = false;
  if (g[i][6] !== (i % 2 === 0 ? 1 : 0)) timingOk = false;
}
check('the timing lines alternate', timingOk);
check('the module that is always dark is dark', g[size - 8][8] === 1);

/* 3 - format */
const fmt = readFormat(g, size);
check('the format word passes its own BCH check', fmt.residue === 0, fmt.residue);
check('it says error correction L', fmt.ec === 1, fmt.ec);
check('and it names the mask that was used', fmt.mask === q.mask, fmt.mask + ' vs ' + q.mask);

/* both copies of the format have to agree, or half of a damaged code is junk */
let second = 0;
for (let i = 0; i <= 7; i++) second |= g[8][size - 1 - i] << i;
for (let i = 8; i <= 14; i++) second |= g[size - 15 + i][8] << i;
check('the two copies of the format word match', second === fmt.bits,
      second.toString(2) + ' vs ' + fmt.bits.toString(2));

/* 4 - the message comes back out */
const words = readData(g, size, q.version, fmt.mask);
const got = payload(words);
check('the mode reads as bytes', got.mode === 4, got.mode);
check('the length is the length of the link', got.len === LINK.length, got.len);
check('and the link comes back exactly', got.text === LINK, JSON.stringify(got.text));

/* 5 - the parity is real parity */
const nTotal = { 1:26, 2:44, 3:70, 4:100, 5:134 }[q.version];
const nEc = { 1:7, 2:10, 3:15, 4:20, 5:26 }[q.version];
const code = words.slice(0, nTotal);
check('the codeword is the right length', code.length === nTotal, code.length);
let synOk = true, worst = 0;
for (let i = 0; i < nEc; i++){
  let s = 0;
  for (let j = 0; j < code.length; j++) s = mul(s, EXP[i]) ^ code[j];
  if (s !== 0){ synOk = false; worst = s; }
}
check('every Reed-Solomon syndrome is zero', synOk, 'one was ' + worst);

/* a damaged square must break it, or the check above proves nothing */
const hurt = code.slice();
hurt[3] ^= 0x5A;
let broke = false;
for (let i = 0; i < nEc; i++){
  let s = 0;
  for (let j = 0; j < hurt.length; j++) s = mul(s, EXP[i]) ^ hurt[j];
  if (s !== 0) broke = true;
}
check('and a corrupted codeword fails it', broke);

/* other strings, including the shapes a real board code takes */
['https://chalk-runner.waseemwdd0165.workers.dev/?room=ABCD',
 'https://chalk-runner.waseemwdd0165.workers.dev/?room=ZZZZ',
 'http://localhost:8787/?room=WXYZ',
 'a'].forEach(function(text){
  const qq = QR.build(text);
  if (!qq){ check('builds for ' + text.slice(0, 28), false); return; }
  const ff = readFormat(qq.grid, qq.size);
  const ww = readData(qq.grid, qq.size, qq.version, ff.mask);
  const pp = payload(ww);
  check('round trips: ' + (text.length > 30 ? text.slice(-12) : text),
        pp.text === text && ff.residue === 0, JSON.stringify(pp.text));
});

check('something far too long is refused, not mangled',
      QR.build('x'.repeat(200)) === null);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
console.log('a scanner has still never seen it. Point a phone at the lobby once.\n');
process.exit(fail ? 1 : 0);
