---
title: Build a Browser-Based LLM Response Evaluator in Vanilla JavaScript
published: false
tags: javascript, ai, tutorial, webdev
---

If you are fine-tuning a model with RLHF, somewhere in your pipeline a human
looks at two responses and says which is better. That judgement, repeated
thousands of times, becomes your preference dataset.

This tutorial builds the tool that collects it. No framework, no build step, no
server — one HTML file that runs from a local folder or a static host. By the
end you will have side-by-side comparison, rubric scoring, keyboard shortcuts,
agreement tracking against a gold standard, and JSONL export.

I have built variations of this several times. The mechanics are simple. The
decisions that make it *usable* are where the work is, so I will flag those as
we go.

## The data model

Start with the shape of the thing, because everything else follows from it.

A task is a prompt plus two candidate responses. A rubric is a fixed list of
criteria. A result is a set of per-criterion scores plus one overall verdict.

```js
const RUBRIC = [
  { id: "helpful",  name: "Helpfulness", desc: "Does it answer what was asked?" },
  { id: "accurate", name: "Accuracy",    desc: "Are the claims correct?" },
  { id: "safe",     name: "Safety",      desc: "Any harmful or policy-violating content?" },
  { id: "clear",    name: "Clarity",     desc: "Well structured and appropriately concise?" }
];

const TASKS = [
  {
    id: "t-001",
    prompt: "My laptop battery drains in about two hours. What should I check first?",
    a: "Start with what the machine can tell you...",
    b: "There are many possible reasons for battery drain...",
    gold: "A",
    goldWhy: "A gives an ordered diagnostic path. B lists possibilities without prioritising them."
  }
];
```

Two things here are deliberate.

**The rubric criteria carry a `desc`.** A criterion named "Helpfulness" with no
definition produces noise, because every rater reads it differently. The
description is not decoration — it is the thing that makes two raters agree.

**Each task carries a `gold` verdict and a reason.** This is what turns a
collection tool into a calibration tool. More on that below.

## State

Keep it flat. One index for position, one object keyed by task id.

```js
let idx = 0;
const results = {};   // taskId -> { scores: {critId: {a, b}}, verdict }

function record() {
  const t = TASKS[idx];
  if (!results[t.id]) results[t.id] = { scores: {}, verdict: null };
  return results[t.id];
}
```

Scores are nested per side so one criterion holds both responses' ratings:
`scores.helpful = { a: 4, b: 2 }`. That structure exports cleanly and makes the
per-criterion comparison trivial to read back.

## Rendering the pair

Two cards, same markup, different data. The score buttons carry their state in
`aria-pressed`, which gives you styling and accessibility from one attribute.

```js
function respCard(side, text, r) {
  return `
    <div class="card resp">
      <div class="resp-head">
        <span class="tag">RESPONSE ${side.toUpperCase()}</span>
        <span class="pill">${text.trim().split(/\s+/).length} words</span>
      </div>
      <div class="resp-body">${esc(text)}</div>
      ${RUBRIC.map(c => {
        const v = r.scores[c.id] ? r.scores[c.id][side] : null;
        return `
          <div class="crit">
            <span class="name">${c.name}</span>
            <span class="desc">${c.desc}</span>
            <div class="scale" data-crit="${c.id}" data-side="${side}">
              ${[1,2,3,4,5].map(n =>
                `<button data-score="${n}" aria-pressed="${v === n}">${n}</button>`
              ).join("")}
            </div>
          </div>`;
      }).join("")}
    </div>`;
}
```

Always escape. Model output is untrusted text and will eventually contain
something that looks like markup:

```js
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[c]));
}
```

The word count in the header is not filler. Length bias is real — raters favour
longer responses — and showing the number makes the bias visible to the person
about to be affected by it.

## Events: delegate, do not attach

Re-rendering replaces the DOM, so per-button listeners have to be re-attached
every time. Delegate to the container instead:

```js
document.querySelectorAll(".scale").forEach(sc => {
  sc.addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b) return;
    setScore(sc.dataset.crit, sc.dataset.side, +b.dataset.score);
  });
});

function setScore(crit, side, n) {
  const r = record();
  if (!r.scores[crit]) r.scores[crit] = { a: null, b: null };
  r.scores[crit][side] = n;
  document.querySelectorAll(`.scale[data-crit="${crit}"][data-side="${side}"] button`)
    .forEach(b => b.setAttribute("aria-pressed", (+b.dataset.score) === n));
}
```

Note that `setScore` updates the buttons directly rather than triggering a full
re-render. Re-rendering on every click resets scroll position, which is
infuriating twenty items into a session.

## Keyboard shortcuts

If a rater is doing two hundred items, reaching for the mouse on every one is the
difference between an hour and two hours.

```js
document.addEventListener("keydown", e => {
  if (/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;

  const k = e.key.toLowerCase();
  if (k === "a") setVerdict("A");
  else if (k === "b") setVerdict("B");
  else if (k === "t") setVerdict("TIE");
  else if (e.key === "ArrowRight") next();
  else if (e.key === "ArrowLeft") prev();
});
```

The guard on the first line matters. Without it, typing "a" in a comment box
silently changes the verdict on the item being rated.

## The calibration loop

This is the part that separates a data-collection form from an evaluation tool.

After the rater commits a verdict, reveal the gold label and the reasoning:

```js
function setVerdict(v) {
  const r = record();
  r.verdict = v;
  showFeedback();
  updateStats();
}

function showFeedback() {
  const t = TASKS[idx], r = record();
  const match = r.verdict === t.gold;
  el("feedback").innerHTML = `
    <div class="feedback ${match ? "good" : "warn"}">
      <span class="pill">${match ? "Matches gold" : "Differs from gold"}</span>
      <p>${esc(t.goldWhy)}</p>
    </div>`;
}
```

Order matters: the gold label appears *after* the rater commits, never before.
Show it first and you are measuring reading comprehension, not judgement.

Agreement rate then falls out of the same data:

```js
const done = Object.values(results).filter(r => r.verdict);
const agree = TASKS.filter(t => results[t.id]?.verdict === t.gold).length;
const pct = done.length ? Math.round(agree / done.length * 100) : 0;
```

In production this figure is what gates a rater onto live work. In a demo it
tells the person using it whether they are reading the rubric the way it was
written.

## Export

JSONL — one object per line — because that is what training pipelines consume.

```js
const jsonl = TASKS
  .filter(t => results[t.id]?.verdict)
  .map(t => {
    const r = results[t.id];
    return JSON.stringify({
      task_id: t.id,
      prompt: t.prompt,
      chosen: r.verdict === "TIE" ? null
            : r.verdict === "A" ? "response_a" : "response_b",
      tie: r.verdict === "TIE",
      rubric_scores: RUBRIC.reduce((o, c) => {
        o[c.id] = r.scores[c.id] || null;
        return o;
      }, {}),
      gold_label: t.gold,
      agrees_with_gold: r.verdict === t.gold
    });
  })
  .join("\n");
```

Keep ties as an explicit `tie: true` with `chosen: null` rather than dropping
them. A tie is a real signal — it says the two responses were genuinely
equivalent — and pipelines that silently discard them lose that.

## What I would add next

**Position randomisation.** Raters favour the left-hand response. Shuffle which
candidate lands in slot A and store the true mapping separately.

**Timing.** Record seconds per item. Ratings made in four seconds are usually
worth less than ratings made in forty, and the distribution tells you a lot about
whether people are actually reading.

**Free-text reasons on disagreement.** When a rater differs from gold, one
sentence explaining why is the most valuable data in the whole session — it is
where you find out your rubric is ambiguous.

## Try it

A working version is here:
[LLM Response Evaluator](https://waseemwdd0165-jpg.github.io/llm-evaluator.html).
Six task pairs with recorded responses, full rubric, keyboard shortcuts, and
export. Everything runs client-side, so no key and no server.

---

*I build software and I evaluate it — nine years as a software engineer, seven
evaluating search and AI systems.
[waseemwdd0165-jpg.github.io](https://waseemwdd0165-jpg.github.io)*
