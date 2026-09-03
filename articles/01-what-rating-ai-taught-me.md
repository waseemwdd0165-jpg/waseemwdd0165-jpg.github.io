---
title: What Seven Years of Rating AI Output Taught Me About Evaluating Models
published: false
tags: ai, machinelearning, llm, career
---

I have spent seven years on the other side of the model. Not training it, not
fine-tuning it — reading what it produced and deciding whether it was any good.

Search results, ads, and for the last few years, language model responses. Tens
of thousands of judgements, made against written guidelines, one item at a time.
It is unglamorous work and most engineers never do it. I think that is a mistake,
because sitting in the rater's seat teaches you things about model quality that
you cannot learn from a benchmark score.

Here is what I have actually learned.

## The rubric is the hard part, not the rating

Every evaluation project I have worked on began with a document. Sometimes forty
pages, sometimes four. It defined what "good" meant for that task, and once you
had internalised it, the rating itself was mechanical.

The interesting failures were always in the rubric, not the rater.

A rubric that says "rate helpfulness from 1 to 5" will produce noise. Ten people
will read "helpfulness" ten different ways, and the disagreement will look like
rater error when it is actually specification error. A rubric that says
"a 5 answers the question in the first sentence; a 3 answers it but buries it;
a 1 does not answer it" produces agreement, because it has removed the judgement
call that was causing the spread.

When teams tell me their human evaluation is unreliable, my first question is not
about the raters. It is whether two careful people reading the same guideline
would land in the same place. Usually they would not, and that is fixable.

## Agreement is the metric that actually matters

Most evaluation platforms track how often your ratings match a gold standard set
by experienced raters. Fall below the threshold and you stop getting work.

That number is a better signal than people realise. It is not measuring whether
you are smart. It is measuring whether the task is *specifiable* — whether a
competent person following the instructions arrives at the intended answer.

I have worked on tasks where my agreement sat comfortably high, and tasks where
it hovered near chance no matter how carefully I read. The second kind was never
a rater problem. It was a task that had not been thought through: overlapping
categories, a scale with no anchors, edge cases the guideline never addressed.

If you are building an evaluation pipeline, measure inter-rater agreement before
you measure model quality. If your humans cannot agree, your model scores are
measuring the disagreement, not the model.

## Fluent and wrong is the dangerous combination

Early language models failed obviously. They lost the thread, contradicted
themselves, produced sentences that did not parse. You could spot a bad response
at a glance.

That stopped being true. The failures I flag now are confident, well-structured,
and wrong.

A response cites a study. It has an author, a journal, a year, a sample size, a
finding. Everything about its shape says "real". The study does not exist.

This is a specific skill and it is not the same as being a good engineer. It
means checking claims you have no particular reason to doubt, on topics where
you are not an expert, at volume, when ninety-five percent of what you check
turns out fine. The discipline is in continuing to check the ninety-sixth.

Automated factuality checking has improved a lot. It still misses the confident
fabrication that sits plausibly inside a mostly-correct answer, which is exactly
the case that matters.

## Over-refusal is a real failure, and it is underweighted

Ask a model to write a firm complaint to a landlord and it may decline, explain
that anger is unproductive, and suggest you calm down.

Nothing was harmful. Nothing was refused for a good reason. The user asked for a
legitimate thing and got a lecture.

I flag these constantly, and in my experience they are systematically
underweighted relative to the opposite error. Teams instrument harmful output
carefully — it generates incidents, complaints, headlines. Unhelpful output
generates a shrug and a user who does not come back.

If your evaluation only counts one of those, you will optimise into a model that
is safe and useless. Rate both directions.

## Instruction following degrades under pressure

The clearest pattern I see: a model follows constraints well on neutral input,
and drops them when the input carries emotional weight.

Ask for three bullets under fifteen words each on a dry business summary and you
get three bullets under fifteen words each. Ask for the same format on an angry
customer complaint and the format goes. You get four bullets, a preamble, and
a paragraph of empathy nobody requested.

The emotional content pulls the model toward a conversational register and the
formatting instruction loses. If you are testing instruction adherence, your test
set needs cases where following the instruction feels socially wrong. The easy
cases will not surface this.

## What I would tell an engineer building evaluation

Rate your own model for a week. Not a spot check — a real session, a hundred
items, against your own guideline. You will find out within an hour whether your
rubric is specified well enough for anyone to follow, and you will see failure
modes that your benchmark suite is not measuring.

Write your gold standard before you write your rating tool. If you cannot
produce the correct answer for fifty examples yourself, you do not yet know what
you are asking humans to do.

And treat rater disagreement as information about your task, not noise to
average away. Every time I have seen a team dismiss low agreement as "raters are
inconsistent", the guideline turned out to be ambiguous in a way that was
quietly costing them.

---

*I build software and I evaluate it — nine years as a software engineer, seven
evaluating search and AI systems. I write about the intersection at
[waseemwdd0165-jpg.github.io](https://waseemwdd0165-jpg.github.io).*
