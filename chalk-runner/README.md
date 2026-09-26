# Chalk Runner

**One step ahead.**

A two player browser game on a blackboard. One of you draws. The other runs on
what was drawn. The runner never stops, and there is no ground in front of them
until somebody makes some.

Play: https://chalk-runner.waseemwdd0165.workers.dev

No install, no account, no app store. One person opens the link and gets a four
letter board code, the other types it in from anywhere in the world.

---

## The idea

Most multiplayer games give both players the same job and let them race. This
one gives them two different jobs that only work together.

The **runner** cannot stop, cannot slow down, and can only jump. Everything
else is out of their hands.

The **drawer** holds the ground. They can only draw near the runner, and the
chalk runs out and refills slowly, so the level cannot be built in advance.
They are always one line behind, working in the couple of seconds before the
runner arrives.

Neither of you can win alone, and neither of you is the passenger. The score is
metres, the roles swap every round, and whoever was panicking with the chalk is
next to be the one falling.

## How a round goes

1. A four second countdown. The runner is frozen. The drawer draws.
2. The whistle. The runner starts at 4.6 metres a second along a short ledge.
3. Every **50 metres** the runner speeds up a little. The milestones are marked
   on the board and counted down at the top of the screen.
4. Every **100 metres** the runner banks a **Leap**: a very high jump that then
   hangs in the air. It is the only moment the drawer gets to breathe, and it
   is the runner who decides when to spend it.
5. The runner falls. The pair score the metres. Roles swap. Four rounds.

The furthest runs are kept on a leaderboard that survives everybody closing
their browsers. The record is drawn on the board as a red line out ahead of
you, so you can see the thing you are chasing, and the end screen tells you
exactly how many metres short you were.

## Practise alone

There is a **Practise alone** button. A bot lays flat ground about eleven
metres ahead of you and runs out of chalk if you are quick, so a solo game is a
real game rather than a demo. Solo runs are practice and do not go on the
leaderboard.

---

## How it is built

```
worker.js          the server: rules, physics, rooms, leaderboard
client.html        the browser: drawing, rendering, sound, music
build.py           folds the two into worker-single.js
worker-single.js   generated, the thing that gets deployed
test.mjs           124 checks against the built server
smoke.mjs          21 checks against the client, in a hand written DOM
domshim.mjs        that hand written DOM
```

**Cloudflare Workers with Durable Objects.** One Durable Object per room. It
holds the websockets, runs the simulation at 30 ticks a second, and fans the
state out to both players. A second, shared object named `__top__` holds the
leaderboard.

**The server owns everything.** The browser never decides where the runner is.
A drawer sends the raw points their finger passed through and the server
decides whether the stroke was near enough to the runner, short enough to be a
real pen movement, and whether they had the chalk to spend. So both people are
always watching the same fall, and a modified browser cannot draw itself a
motorway.

**Why not peer to peer.** The first version of a different game in this series
used WebRTC. Two phones on different networks could not reach each other
without a TURN relay, and a free TURN relay that actually works does not exist.
I checked by gathering ICE candidates and counting the relay ones: zero. A
Durable Object is reachable from anywhere by definition, so the problem
disappears rather than being worked around.

### Three things that were harder than they looked

**Lines vanishing while you looked at them.** The server only sends chalk near
the runner, to keep the messages small. The window was narrower than a wide
desktop screen, so chalk at the edge of the view had simply never been sent.
Fixed at both ends: the window is now 34 metres behind and 60 ahead, and the
browser refuses to zoom out past what the window covers.

**Every round ending at exactly nine metres.** The runner sprinted from the
whistle onto a three and a half metre ledge, which is about half a second.
Nobody can draw in half a second. This was only found by playing it. Fixed with
a four second countdown, a thirteen metre ledge, and a speed that starts slow.

**The camera falling 154 metres behind.** The chase was a fixed fraction per
frame, which is a different speed at 60 frames a second than at 20. On a
throttled tab it never caught up. Now it is a fraction per second, with a snap
if it somehow still falls too far behind.

### Making it feel smooth

The server ticks 30 times a second, the browser draws 60. The runner is eased
toward the server position on a time constant rather than snapped to it, so the
motion between ticks is filled in instead of stepped.

Chalk is drawn immediately in the browser and then handed over to the server's
copy when it arrives, so the line appears under your finger rather than a round
trip later. Fast drags are subdivided before they are sent, because the server
rejects any single segment longer than three metres and a flicked finger used
to leave a hole in the ground. Strokes are joined through their midpoints with
quadratic curves, and drawn twice, a soft wide pass under a bright thin one, so
they look like chalk rather than a graph.

### Sound, music and the buzz in your hand

Everything you hear is generated with the Web Audio API: an oscillator and
filtered noise. There are no audio files, so there is nothing to download and
nothing that can fail to load.

The music is a small step sequencer that schedules notes a fraction of a second
ahead of the audio clock. **Its tempo climbs with the runner's level**, so the
board sounds more frantic the further the pair have got. That is free tension
and it costs no bytes. Both sound and music can be turned off from the top of
the screen.

On a phone the fall, the leap, each new level and the end of the match come
through `navigator.vibrate` as well, because a phone in your hands says more
with a buzz than with a noise. It is guarded, so desktops and iPhones simply do
not get it.

### Tests

Two suites, both against the files that actually ship.

`node test.mjs` runs **124 checks against the built server**, `worker-single.js`,
not against the source: the geometry, the runner falling and landing and running
up slopes, a drawer trying to cheat by drawing far ahead or teleporting the pen
or drawing with no chalk left, the speed steps landing exactly on the
milestones, the leap being banked and spent, the practice bot staying within
reach, the leaderboard sorting and capping and surviving a reload, and the idle
board shutting itself down.

`node smoke.mjs` runs **21 checks against the browser half**. There is no real
browser here, so `domshim.mjs` is a small hand written DOM and the client is
driven with the exact messages the server sends. It cannot tell you whether the
game looks good. It can tell you whether the screen says the right numbers,
whether a flicked finger still produces segments the server will accept, whether
a wide screen ever shows more world than the server sends, and whether anything
throws.

## Build and deploy

```
python3 build.py        # writes worker-single.js, checks it is plain ASCII
node test.mjs           # 124 server checks
node smoke.mjs          # 21 client checks
```

Then upload `worker-single.js` as a Cloudflare Worker with a Durable Object
binding `BOARD` pointing at class `Board`, and a `new_sqlite_classes` migration
for it. The free plan is enough: Durable Objects with SQLite storage are
included, and the limit is on requests and object time rather than a bill.

---

## What is not built

Being straight about the edges:

- **No reconnect.** Close the tab mid round and you are out of that board. The
  round ends for your partner and says the runner left.
- **Nobody has playtested it at length.** Two people have run it end to end.
  The chalk budget, the 50 metre steps and the leap timing are reasoned guesses
  that survived contact with a real round, not numbers tuned over a hundred
  games.
- **No spectators, no rematch invites, no accounts.** A board code and a link.
- **The leaderboard is one global list of ten.** No filtering, no daily reset,
  and a name is whatever you typed.
- **The music is four bars of a sequencer,** not a composition. It gets faster
  and that is the whole idea of it.
- **Vibration is Android only.** iOS does not expose `navigator.vibrate` at all,
  so iPhone players get the sound and nothing in the hand.
- **Six players can be in a room** but only two roles exist, so extra people
  all draw. It works, it is just not designed for.

## Credit

Built by Waseem Ahmad Ansari with an AI coding assistant. The design decisions,
the playtesting that found the nine metre bug, and the calls on what was worth
building are mine; a lot of the typing is not.
