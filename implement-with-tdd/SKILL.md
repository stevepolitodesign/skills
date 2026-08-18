---
name: implement-with-tdd
description: Implement a SPEC, plan, or feature  outside-in, with TDD. 
argument-hint: "[path to a SPEC or plan, or a description of the change]"
disable-model-invocation: true
---

# Implement with TDD

Work from the outside in and let each failure name the next move. Stop at
shameless green; a later step refactors.

The discipline exists because you're fluent enough to write plausible code for
almost anything, and plausible isn't correct. A failing test tells them apart.

## What you were handed

The thing to build: `$ARGUMENTS`

If that's empty, ask. If it's a path, read it.

Take the acceptance criteria and nothing else. Those are behavior, and behavior is
what you can test. A file list, a suggested test path, an ordering: that's a guess
from a session that never ran the suite. Yours will run it, so your evidence is
better. Where the repo contradicts the plan the repo is right — say so rather than
diverge quietly.

## Before the first test

**Run the whole suite before touching anything** and keep the list of what fails.
Those failures are inherited: you don't fix them and they don't count against you.
Without that list you'll adopt someone else's broken test as your problem and
spend the session on it. If the suite can't be made to run using the repo's
documented setup, stop and report what's missing — a missing database or service
isn't something to work around.

Then learn the suite:

- The command for one test file, and the one for everything
- Which layers exist here (end-to-end, request or API, unit) — you can only start
  at the outermost layer the repo actually has
- The local idiom: factories or fixtures, helpers, naming

Read the two or three tests nearest your area and copy their style, even where
you'd write it differently. `references/test-style.md` covers how to write the
test itself and what belongs at each layer; read it before the first one.

If there's no test framework at all, stop and ask which to use.

## The loop

One criterion at a time, and only one test you wrote red at once.

1. **Write the outermost test for the criterion.** Drive it the way a user reaches
   the behavior. It should fail on the thing you haven't built, not on a typo.
2. **Run it and read the failure.** Literally — not the failure you expected.
3. **Make the smallest change the failure asks for.** Not the change that finishes
   the feature. `references/failures.md` maps each kind of failure to its next
   move, including which ones send you down a layer and which don't.
4. **Run it again.** A new message means you moved. An unchanged message means you
   did something necessary but insufficient, or you guessed — say which, and drop
   the change if you can't name what it unblocks.
5. **Repeat until green**, then run the tests around what you touched. A *new*
   failure is yours; one from the inherited list isn't. Then take the next
   criterion, and run everything once at the end.

Work through every criterion without checking in. Three things earn a stop: a
suite you can't run, the same failure surviving two different fixes, and anything
needing a new runtime dependency — that last is a project decision, not an
implementation detail.

Watch the diff. Past roughly 200 lines of implementation, say so in the report and
name the criterion that crossed it.

## Shameless green

Reach green with explicit, duplicated, readable cases. Spell the value out. Copy
the neighboring case and change what differs. Write one branch per case the tests
name, and none for a case no test named, since that branch is a guess you'd have
to maintain. A passing test is the signal to stop writing code.

You're trading changeability for clarity, not clarity for speed. Duplication is
cheap to remove later; a wrong abstraction drawn from one example spreads into
every caller first. The duplication is also the evidence the refactor runs on —
it shows where the seam really is.

Fakes aren't shameless, they're false. A hardcoded return value that satisfies the
test is fine; an accessor standing in for a column that ought to exist, or a stub
where the real call belongs, makes the test lie about what works. If the criterion
needs schema, add the schema.

No comments apologizing for the shortcut, no TODO promising to fix it, no
half-built abstraction for later.

## When you're done

Report the criteria you covered, the tests you added and where, the suite result
against your inherited-failure list, and the diff size. Then name the ugliest
thing you left standing, because that's where the refactor starts. Leave
everything uncommitted.
