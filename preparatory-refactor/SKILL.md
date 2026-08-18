---
name: preparatory-refactor
description: Identify opportunities to introduce a refactor that would make a feature easy to implement.
argument-hint: "[feature description or path to a SPEC]"
disable-model-invocation: true
---

# Preparatory refactoring

> Make the change easy, then make the easy change. — Kent Beck

You're looking for the refactorings *this* feature asks for. A preparatory refactoring earns its place by making the feature's diff smaller and more obvious, so if you can't show that, leave it out — a finding that stands on its own without the feature is a code review finding, and `/review` is where it goes.

You identify, you don't refactor. Nothing here edits code. The report has to survive being pasted into a session that has none of this conversation, which is the real constraint on how long it can be.

## Workflow

1. Get the feature.
2. Find where it lands.
3. Sketch the naive diff — what you'd touch if you just wrote it now.
4. Name the moves that shrink that diff.
5. Report the ones you'd defend.

### 1. Get the feature

The feature, if the user passed one: `$ARGUMENTS`

It may be a path to a SPEC, a slug matching a file in `docs/specs/` (where `/slice` writes), or a sentence. Prose is fine — you need to know what the code has to do, not how it'll be worded. If it's vague enough that you can't guess which files it touches, ask one question rather than reading the whole repo hoping to find out.

### 2. Find where it lands

Launch 2 to 3 subagents in parallel (`Explore`, or `general-purpose`), each on a different angle:

- **The site.** The function, module, or file where this behavior would go, and its callers. Exact paths.
- **Prior art.** `git log --oneline -20 -- <the paths from the site angle>`, then read the two or three commits that added behavior rather than fixed it. Report each commit's file list. That list is your prediction for which files the naive diff touches, and where it's longer than you expected is where the code fights back.
- **The safety net.** Which tests cover the site, and the command that runs them.

Then read the site files yourself. You can't judge whether a move is behavior-preserving from a summary, and that judgment is the entire value of the report.

### 3. Sketch the naive diff

Write out what you would change if you started on the feature right now, save it to a file (`mktemp`), and show it to the user before you read anything else in this skill.

Every line names a real file, a real function, and what you'd add to it — `lib/highlighter.rb:12 CodeHighlighter#call, add a range check inside the map block` — not "update the highlighter."

Do this first because you can't recognize a preparatory refactoring without it. Without the sketch every finding collapses into "this method is long," which is true of the method whether or not the feature exists.

If the sketch comes out small and lands in one place, that's the answer: no preparation, just write it. Say so and stop. The highway detour is a loss when the trip is 20 miles.

### 4. Name the moves

Now read `references/tells.md` for the shapes worth looking for.

One to three, and zero is a legitimate result. Every move is behavior-preserving: the tests passing now pass after, unchanged. The moment a move needs a new test it isn't preparation, it's the feature.

**Score each one out of 100** — how sure you are that the move is genuinely behavior-preserving *and* that the feature's diff actually gets smaller. Below 80, drop it without mentioning it. The scarce thing isn't the reader's attention, it's their willingness to detour before starting on what they actually sat down to build. One move they can see the point of gets made; three speculative ones get the whole report ignored.

Judge the detour by what the sketch already tells you rather than estimating code you haven't written: how many files the feature touches, how many call sites move, whether the new behavior becomes a body for one function or edits threaded through several. "Goes from 4 files to 1, at the cost of moving 3 call sites" is checkable. Line counts for unwritten code read as measurements and aren't.

### 5. Report

Per move, and nothing around it — no preamble, no summary:

```
{the move, one line} · confidence {N}

Today this feature lands as:
  {file}:{line} — {what you'd add}
  {file}:{line} — {what you'd add}

{The move, in a sentence or two, and what the lines above collapse to.}

Covered by: {the command, and what it exercises at the site — or "nothing"}
```

The lines under *today* are the argument, so they name files and functions. If a line could describe any change — messy, clearer, easier to follow — it isn't filled in yet.

Close with one line on what to do with it: the refactor is behavior-preserving, so there's no failing test to drive it and it wants a plain session with a green suite. The feature is what goes to `/implement-with-tdd`, afterward.

## Notes

- `Covered by: nothing` is the most useful thing in the report when it's true. It doesn't disqualify the move; it tells the next session to write the characterization tests first.
- Match the repo's shapes, not your habits. If you're proposing a class where it uses functions, or a module where it uses a table, you've imported an idiom from somewhere else. The refactoring itself doesn't need a precedent — a no-op seam won't have one anywhere — but the thing you create has to look like something this codebase already holds.
- A no-op seam reads as Dead Code to a linter and Speculative Generality to a reviewer, including this repo's own `/review`. Say so in the report if the repo has a coverage gate, so it isn't a surprise.
- Cleanups you notice along the way — dead code, stale comments, a bad name three files over — are real, and they're not this. Keep them out of the numbered moves so the feature's justification stays intact.
- The feature needs one seam. A framework for five more looks like foresight and is a second unreviewable diff.
