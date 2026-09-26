# PITCH BLACK

**One hunter. Everyone else is looking for the way out. Your torch is the only thing
that lets you see, and the only thing that gives you away.**

Two to eight players, each on their own phone or laptop, on any network. A four
letter room code and a link. No account, no install.

---

## What you are actually playing

The map is dark. You see what your torch reaches and about a pace either side of
your feet, and nothing else. Your torch points wherever you are walking, so you
cannot creep one way while looking another. One player starts as the hunter;
everyone else is trying to reach the exit. Get caught and you join the hunt, so
the odds tilt further with every runner who falls. Three rounds, the hunter
rotates, escaping scores 100 and catching scores 50.

The whole game is two people in the same corridor, one of them lighting it.

---

## Why there is a server at all

The first version was peer to peer over WebRTC and had no server. It worked on
one WiFi network and failed everywhere else, which is the normal outcome: two
devices behind ordinary home or mobile connections cannot usually accept
connections from each other, and without a relay in the middle the attempt just
hangs. Measured on a phone and a laptop in the same building on different
networks, it never connected.

It also could not keep a secret. The host broadcast every position to every
client and each client decided what to draw, so opening the browser console
showed you the whole map, hunter included. For a game about not knowing where
people are, that is not a rough edge, it is the game not existing.

A Durable Object fixes both. Every player dials outward to it, which always
works, and it holds the only real copy of the state.

**`sliceFor(player)` in [`src/index.js`](src/index.js) is the only way a client
ever learns anything.** It runs the same visibility test the renderer draws
with, and a player is simply not sent the position of somebody their torch
cannot reach. There is nothing in the console to read because nothing was sent.

---

## The parts

| File | What it does |
| ---- | ------------ |
| [`public/game.js`](public/game.js) | The map, the tuning, wall collision, and the raycast. Imported by both sides so the server and the browser can never disagree about where a wall is. |
| [`src/index.js`](src/index.js) | The Worker and the Durable Object: rooms, the tick loop, catches, escapes, rounds, and the per-player slice. |
| [`public/index.html`](public/index.html) | The whole client. Draws the torch, forwards the stick, predicts only your own movement. |

---

## Tests

```
node test/culling.mjs    # does the server really withhold what it claims to
node test/arena.mjs      # a whole match: joining, rounds, scoring, people leaving
```

64 checks. Two of them are worth describing, because they are the only ones that
found anything.

**The culling sweep is written against an independent line-of-sight check**, not
against the game's own raycast. Testing the server with the same function the
server uses would let a broken function agree with itself and pass. That
independence is what found the bug below.

**The raycast used to leak.** It stepped along the ray in fixed increments and
sampled the cell at each point, which looks reasonable and is wrong: a ray
crossing the corner between two diagonal walls can land either side of the brick
and never sample it. Ten of 1296 wall-separated pairs were visible through solid
wall. It now walks the grid cell by cell instead, so nothing can be skipped, and
it is faster. The circular version of the test passed the whole time.

**What the sweep refuses to answer.** A sight line that grazes exactly along the
edge of a wall is genuinely ambiguous, and demanding a particular answer would be
testing an opinion rather than the code. The sweep sorts pairs into definitely
blocked, definitely clear, and grazing, and reports the last group rather than
scoring it. The current run is 1201 blocked, 1012 clear, 217 grazing and skipped.
Zero leaks and zero wrongly hidden across the two definite groups.

---

## Running it

```
npm install
npm run dev      # local, at http://localhost:8787
npm run deploy   # to your own Cloudflare account
```

`npm run deploy` will open a browser once to log in. SQLite-backed Durable
Objects are on the Workers free plan, so this costs nothing to run at this size.

---

## What is not built

Easier to say than to let you find out.

- **Nobody has playtested it.** Every test drives players by script. Whether a
  hunter camping the exit is tense or infuriating is a real question and it has
  no answer yet. The hunter starts ten steps from the exit and is slightly
  faster, but runners see further, and that balance is a guess.
- **The host can still see the lobby roster of who is hunting.** That is
  deliberate, roles are announced, but worth stating.
- **No reconnection.** Close the tab and you are out of the match.
- **One map.** It was generated on a grid partition and checked for
  connectivity and spawn fairness, but there is only the one.
- **The four second gap between rounds is a fixed timer**, not something the
  players can skip.

---

Built for the Handshake AI Skills Studio and OpenAI multiplayer game challenge.
