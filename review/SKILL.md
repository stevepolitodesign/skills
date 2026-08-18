---
name: review
description: Review a change against its spec, the codebase's conventions, and the domains trying to emerge from it.
argument-hint: "[PR number, branch, or paths to review]"
disable-model-invocation: true
---

# Code review

Three reviewers, dispatched in parallel, each reading the same change from a different distance:

| Agent | Question |
| --- | --- |
| `agents/spec-fidelity.md` | Did we build what was asked for, and only that? |
| `agents/conventions.md` | Does this look like the rest of the codebase? |
| `agents/domains.md` | Is a domain concept trying to emerge here? |

They stay separate because the altitudes don't mix. One reviewer asked all three questions spends its attention on the cheapest findings, and thirty naming nits bury "these four files are one domain object in a trenchcoat." Splitting them leaves the structural reviewer nothing else to do.

## The confidence bar

Every finding carries a confidence out of 100: how sure the reviewer is that it's true and that the author would agree it's worth changing. Below 80, drop it without mentioning it.

The scarce thing in a review isn't reading time, it's the author's trust. Twenty findings where six are wrong teaches them to skim the next review. Six findings that are all right get acted on. Print the score with each finding so the author can calibrate how much to argue.

## Workflow

1. Fix the target — one diff, captured once.
2. Find the intent the change was supposed to satisfy.
3. Dispatch the three agents in parallel.
4. Synthesize into one report.
5. Offer the fix.

### 1. Fix the target

`$ARGUMENTS` may hold a PR number, a branch, paths, or nothing.

Resolve it to one diff, then capture that diff to a file (`mktemp`) and hand every agent the same path. If each agent runs its own `git diff` instead, one reviews the commits while another reviews the working tree, and their findings won't line up with each other or with what the author sees.

- A number: `gh pr diff <n>`.
- A branch or ref: diff against its merge-base with the default branch.
- Nothing: everything not on the default branch, committed and uncommitted both — `git diff $(git merge-base HEAD origin/HEAD)`.
- Paths: diff limited to them.

### 2. Find the intent

Fidelity needs acceptance criteria the change was measured against. Two places hold them: a path in `$ARGUMENTS`, or `docs/specs/`, where `/slice` writes. Match on the branch name or a slug in the commit messages, and if two are close, ask instead of guessing.

PR bodies, issues, and commit messages don't count. They describe goals in prose, and prose doesn't draw a scope boundary — so creep is invisible against it, and every finding turns into an argument about what the sentence implied. Criteria or nothing.

If you found a SPEC, check whether it's itself in the diff. A SPEC edited in the same change as the code was either renegotiated in the open or quietly reshaped to match what got built, and only the author knows which — so ask.

**When there's no SPEC.** This is the common case, and the tempting move is to let the agent infer the intent from the diff. Don't. Intent reconstructed from code always matches that code, so the check passes by construction and the author gets a clean bill of health they never earned.

Instead, write the criteria yourself: read the diff and draft the five or six given/when/then lines it looks like it was built from, then show them to the user and ask what's wrong. The corrections are the whole point. A plain list of what the change actually does is the artifact that makes "I never asked for that" obvious, and the user is the only one who can say it. Once they've signed off, those criteria are binding and the agent runs on them normally.

If they'd rather not, skip the agent and say the fidelity check didn't run. An absent check is information; a manufactured pass isn't.

### 3. Dispatch

Read the three agent files and launch them as `Explore` agents in one message so they run concurrently. `Explore` can't edit, which is what makes the read-only promise real rather than a request — a reviewer holding `Edit` will eventually decide some finding is too small to bother reporting and quietly fix it, and the author never learns it happened.

Give each the diff path, the base ref, this skill's own absolute directory (so an agent can read a reference file it's pointed at), and this finding format:

```
{one-line claim}
{file}:{line} · confidence {N}
{Why it costs something, in a sentence or two. Name the smell or the convention.}
{The change you'd make.}
```

Pass the confidence bar along with the format, in your own words but carrying the reason: score every finding out of 100 on whether it's true *and* worth changing, drop anything under 80 without mentioning it, and understand that the budget being protected is the author's trust rather than anyone's reading time. An agent told only to print a number has no reason not to inflate it — the threshold is what makes the number mean something, and the reason is what stops it becoming a formality.

The fidelity agent also needs the criteria from step 2, as a path. If they came out of the conversation rather than a SPEC file, write them to a temp file first so all three agents are reading files rather than transcript.

Ask for findings only — no summary, no praise, no "overall this looks good." Anything an agent adds around the findings is noise the synthesis step has to strip.

### 4. Synthesize

Lead with what you reviewed: the target, the intent source and its kind, and a one-line verdict a person can act on. Say up front if a check didn't run — a review missing its fidelity pass looks identical to one that passed it, unless you name the difference.

Then the findings under three headings, highest confidence first inside each. Drop anything that came back under 80 even though the agent was told the bar — an agent arguing for its own finding is the one party with a reason to round up, so the threshold needs enforcing where the report is assembled too.

Two agents often catch the same code from different heights — duplication as a smell and as an unnamed domain. Keep the higher-altitude version and drop the other, because the author fixes it once.

If every agent came back empty, say that plainly. A review with nothing in it is a real result, and padding it with observations you scored below the bar is how the bar rots.

### 5. Offer the fix

Number the findings and ask which to apply. Don't apply them unasked: a reviewer who edits starts defending its own edits, and the author loses the chance to say "that's deliberate, here's why."

Apply only what they name, one finding at a time, and stop if a fix turns out to be bigger than the finding described.

## Notes

- The agents run read-only, so anything they'd change comes back as a recommendation rather than a diff. If `Explore` isn't available, say so and pick the most restricted agent type there is rather than reaching for a general-purpose one.
- Nothing here assumes a language or a framework, and the review is worse the moment it starts to. Whatever pattern you're about to recommend, point at the place this repo already does it. If you can't find one, you're recommending a habit from somewhere else.
- Findings about generated files, lockfiles, and vendored code are almost always noise. Skip them unless the change to one is the actual bug.
- Don't report what a linter or formatter already catches. The author gets that for free, and spending review on it makes the review look cheap.
