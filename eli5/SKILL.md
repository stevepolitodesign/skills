---
name: eli5
description: Explain something to someone who knows nothing about it, in plain language and diagrams. Use when the user is lost rather than fuzzy — an unfamiliar stack, a tool they keep seeing named, a business word off a ticket.
argument-hint: "[code, tool, process, or word you have no foothold on]"
---

# ELI5

The user has no foothold. Not "I follow this but the retry logic is fuzzy" — that's
`/understand`, which questions them about a model they already hold. Here there is no
model to question. Ask someone what they think a Terraform module does when they've
never seen one and you get a guess, and then you're correcting a guess you caused.

So read the thing, then explain it. Plainly, concretely, once.

Two ways this fails. You explain it in the vocabulary of the thing itself — "the
reconciler converges the cluster toward desired state" — a sentence only someone who
already understands it can read. Or you reach for concreteness and invent it: a config
value that isn't in the file, a sample record nobody has. A made-up example is worse
than an abstract one, because it's memorable and wrong, and the person you're talking
to has nothing to catch it with.

## 1. Find the thing

The target is `$ARGUMENTS`, or ask. It shows up as a path, a name they keep seeing
(`sidekiq`, `helm`, `useEffect`), a word off a ticket (`chargeback`, `dunning`), a
link, or pasted text.

If it's a path, that's the thing. If it's a name or a word, look for it in this repo
first — dependency manifests, config, `grep -ri`. A thing explained as this codebase
actually uses it beats the same thing explained in general, because the general version
covers ten features they'll never touch. Not in the repo at all? Say so before you
start, and explain it in general.

Size it before reading. If the target is a whole directory, pick the entry point and
say that's what you're doing. An ELI5 of 4,000 lines isn't one.

Don't ask what they already know, and don't ask what they're going to do with it. They
told you they're lost; questions are the thing they came here to be spared.

## 2. Send agents to read it

Say you're reading first, then launch subagents in parallel (`Explore`, or
`general-purpose`) and wait. They burn their context on the files and hand you back
facts, instead of you carrying a whole subsystem into an explanation that needs about a
page of it. No subagents available, say plainly you're skimming.

Three angles, one agent each:

- **What it's for.** What job this does for a person, who that person is, and what
  would visibly break if it vanished tomorrow. Tell the agent to answer without using
  the thing's own vocabulary — that constraint is most of the value, because an agent
  left to itself hands back the README's first paragraph.
- **One real trace.** Follow a single instance start to finish using actual values
  pulled from the repo: a real route, a real config value, a row from seeds or
  fixtures, a real filename. Cited `file:line`. Ask for the steps in order and the
  branch at each one, including what happens when it fails — that ordering is what
  step 4 draws, and a trace that only walks the happy path can't be drawn honestly.
- **The words.** Every term a newcomer would bounce off, and what each one means *in
  this repo*, which is usually narrower than what it means in general.

Tell each one that "I couldn't find a real example" is an acceptable answer. An agent
asked for concrete values and given no way to come back empty will manufacture one, and
it will read exactly like a real one.

Then open five or so of the cited files yourself. You're about to state things as fact
to someone who can't check them, and a secondhand citation is how you confidently
explain a function that doesn't exist.

## 3. Explain it

**Lead with the job, not the mechanism.** "This decides who gets charged and when"
comes before any of how. Someone with no model can't hold mechanism — it has nowhere to
attach.

**Anchor it to something they already have.** The best anchor is elsewhere in this same
repo, since you know they've seen it: "this file is the routing table for the front
end, same job as the one in `config/`." Failing that, something outside software
entirely. Say the plain version first and the real name once, after, so they can go
search for it — "the server kills the process when the machine runs low on memory; the
logs call that *evicted*."

**Say where the anchor breaks** if the gap will bite them. An analogy they trust one
step too far costs more than the one you didn't draw.

**Show the real values.** Input and output, not a description of the transformation.
`ORDERS_PER_PAGE = 25`, so page 3 starts at order 51. This is the whole reason step 2
went looking for actual data.

**Draw it.** Most confusion is about shape — what order, what contains what, what
changes — and shape is the one thing prose is bad at. See step 4; the drawing usually
carries the explanation and the words around it are captions.

**Stop early.** The bar is that they could describe this to a coworker in two
sentences, not that they could maintain it. If the explanation runs past a screen
you've started teaching the subsystem.

**Name the holes.** What recon couldn't find, what the code doesn't answer. A hole you
name is one they can go ask a person about; a hole you smooth over is one they walk
into believing they understood it.

## 4. Draw it

Draw in plain text, in the chat. It renders in a terminal, in a browser, and in
whatever they paste it into later. Build it out of the values the trace agent came back
with — that's what step 2 collected them for.

Pick the shape from whatever is actually confusing:

**Order — what happens, then what.** Boxes and arrows, with the failure branches drawn,
since a happy path alone is the version that leaves them stuck at 2am.

```
POST /webhooks/stripe
      |
      v
  verify signature --- bad --> 400, nothing else runs
      |
     good
      v
  ChargeSucceeded job --> invoice #4821 marked paid
      |
      +-- card declined --> retry in 1h, then 6h, then give up
```

**Change — what goes in, what comes out.** Two columns of real values beats any
sentence describing the transformation.

```
"123 Main St."      -->   "123 main st"
"123 main street"   -->   "123 main st"
"123 Main Street."  -->   "123 main st"
```

**Time — what happens days apart.** A timeline, because "eventually" and "later" are
where people build the wrong model.

```
day 0        day 3        day 7          day 14
  |------------|------------|--------------|
charge      email 1      email 2       account
fails                                  suspended
```

**Containment — what wraps what.** Nested boxes. This is the one that makes a stack of
wrappers stop being magic.

**Choices — how three similar things differ.** A table with the columns that actually
matter, and nothing else.

Four rules hold all of this up:

- **Real labels, always.** Boxes that say "Service A" and "Service B" draw a picture of
  the category, not of their system — the same diagram would be true of any app, which
  means it taught nothing. Their route, their job class, their column name.
- **One idea per drawing.** If it needs a legend it's a second drawing.
- **Under about sixty characters wide.** Wrapped ASCII in a terminal is noise, and noise
  they can't read is worse than the paragraph you replaced.
- **Don't narrate the drawing afterward.** Saying it twice signals the picture didn't
  work; if that's true, redraw it.

And skip it when there's no shape to show. A box with one word in it is decoration, and
decoration next to a real diagram teaches them not to look closely at either.

## 5. After

Answer follow-ups straight, and go read if you don't know. Never bluff here. Everywhere
else a wrong answer gets caught by the user; this user has nothing to catch it with,
which is exactly why they asked.

If they want a piece of it in more depth, that's another ELI5 on a smaller target, not
a licence to switch into the vocabulary you spent step 3 avoiding.

Don't quiz them. Being tested is `/understand`, and it's the right next thing once they
have a foothold — offer it once at the end and drop it if they don't bite.

## Notes

- Reread the draft hunting for words that are only clear to someone who already knows
  the thing. Replace or gloss every one. This pass catches more than anything else here.
- "Basically", "simply", "under the hood" and "just" don't simplify anything; they
  signal that the next clause is about to be hard. Cut them and fix the clause.
- Don't apologize for simplifying, and don't append the full-complexity version at the
  end. That's the explanation you were asked not to give, with a disclaimer.
