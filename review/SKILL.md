---
name: review
description: Review a change for defects, then against its spec, its codebase's conventions, and the domains trying to emerge from it.
argument-hint: "[PR number, branch, or paths to review]"
disable-model-invocation: true
---

# Code review

Four reviewers, dispatched in parallel, each reading the same change from a different distance:

| Agent | Question |
| --- | --- |
| `agents/defects.md` | Is this code wrong — broken, slow, or exploitable? |
| `agents/spec-fidelity.md` | Did we build what was asked for, and only that? |
| `agents/conventions.md` | Does this look like the rest of the codebase? |
| `agents/domains.md` | Is a domain concept trying to emerge here? |

They stay separate so the structural reviewer has nothing cheaper to do. One reviewer asked all four questions spends its attention on naming nits, and never reaches "those five files are one domain object in a trenchcoat."

## The confidence bar

Every finding carries a confidence out of 100: how sure the reviewer is that it's true and that the author would agree it's worth changing. Below 80, the agent drops it without mentioning it. Print the score with each finding so the author can calibrate how much to argue.

What's scarce in a review is the author's trust, not their reading time.

## Workflow

1. Fix the target — one diff, captured once.
2. Find the intent the change was supposed to satisfy.
3. Dispatch the four agents in parallel.
4. Synthesize into one report.
5. Offer the fix.

### 1. Fix the target

`$ARGUMENTS` may hold a PR number, a branch, paths, or nothing. A path under `docs/specs/` is the intent, never the target; anything else is a target. If one argument could be either, ask — reviewing a SPEC file against nothing is a wasted run.

Resolve it to one diff, then capture that diff to a file (`mktemp`) and hand every agent the same path. If each agent runs its own `git diff` instead, one reviews the commits while another reviews the working tree, and their findings won't line up with each other or with what the author sees.

First resolve a base — `base=$(git rev-parse --verify --quiet origin/HEAD || git rev-parse --verify --quiet origin/main)`. If that comes back empty, ask which branch to diff against rather than proceeding; the substitution failing silently collapses `git diff $base` into a bare `git diff`, which is unstaged changes only.

Then `git add -N .`, so new files land in the diff. Without it they don't appear at all, and the criterion a new file implements comes back unmet.

- A number: `gh pr diff <n>`, and `gh pr checkout <n>` — the agents read the code around the diff, and without the checkout that code is whatever `HEAD` happened to be.
- A branch or ref: `git diff "$(git merge-base <ref> "$base")" <ref>`. Both refs, or you've diffed the working tree.
- Nothing: `git diff "$(git merge-base HEAD "$base")"` — committed and uncommitted both.
- Paths: `git diff "$(git merge-base HEAD "$base")" -- <paths>`.

Check the result before going further. An empty diff means stop and say so — four agents handed an empty file will find something in the neighboring code they read instead. Past roughly 1500 lines, ask for paths or a commit range; agents silently review the first part of a diff that big and report nothing to say they did.

### 2. Find the intent

Fidelity needs acceptance criteria the change was measured against. Two places hold them: a path in `$ARGUMENTS`, or `docs/specs/`, where `/slice` writes. Match on the branch name or a slug in the commit messages, and if two are close, ask instead of guessing. A PR has both locally, because step 1 checked its branch out.

PR bodies, issues, and commit messages don't count. They describe goals in prose, and prose doesn't draw a scope boundary — so creep is invisible against it, and every finding turns into an argument about what the sentence implied. Criteria or nothing.

If you found a SPEC, check whether it's itself in the diff. A SPEC edited in the same change as the code was either renegotiated in the open or quietly reshaped to match what got built, and only the author knows which — so ask.

**When there's no SPEC.** This is the common case, and the tempting move is to let the agent infer the intent from the diff. Don't. Intent reconstructed from code always matches that code, so the check passes by construction and the author gets a clean bill of health they never earned.

Instead, write the criteria yourself: read the diff and draft the five or six given/when/then lines it looks like it was built from, then show them to the user and ask what's wrong. The corrections are the whole point. A plain list of what the change actually does is the artifact that makes "I never asked for that" obvious, and the user is the only one who can say it. Once they've signed off, those criteria are binding and the agent runs on them normally.

If they'd rather not, skip the agent and say the fidelity check didn't run. An absent check is information; a manufactured pass isn't.

### 3. Dispatch

Read the four agent files and launch them as `Explore` agents in one message so they run concurrently. `Explore` has no `Edit` or `Write` — but it does have `Bash`, so tell each agent plainly: no command that writes, stages, or checks anything out. A reviewer that quietly fixes a finding instead of reporting it is one the author can't learn from.

`agents/defects.md` states a tighter allowlist for itself, since proving a bug is the natural next step for that one. Pass it through as written rather than substituting the looser rule above.

Tell them to read whole files and the whole diff. `Explore` samples excerpts by default, and an agent that reviewed the first third of a diff reports nothing to say so.

Give each the diff path, this skill's own absolute directory — the agent files write it as `{skill_dir}`, so substitute the real path before handing the text over, or the reference file they're pointed at won't resolve from the target repo — and this finding format:

```
{one-line claim}
{file}:{line} · confidence {N}
evidence: {the citation this reviewer's own file demands}
{Why it costs something, in a sentence or two. Name the smell or the convention.}
{The change you'd make.}
```

Line numbers come off the new side of the `@@` header plus the offset inside the hunk. If one can't be computed, name the file and the enclosing function or class instead of guessing — a wrong line number costs the author more than a missing one. A domains finding spanning several files lists them all.

The evidence line is what makes the score checkable. Each agent file says what its own evidence is — a convention needs the path of the file that establishes it, a domain needs its three occurrence sites, a fidelity finding needs the criterion quoted, a defect needs the trigger plus where the triggering value comes from. A finding that can't produce one isn't a finding, and unlike a self-reported number it's something synthesis can verify.

Defect evidence is the weak case, and worth knowing about before you trust it. Three of the four cite an artifact you can open; a trigger is prose, and its truth is the claim under review. Checking the paths around it is all step 4 can do — so a defect that survives synthesis has been checked less than the findings next to it.

The confidence bar is stated in each agent file; don't restate it here.

The fidelity agent also needs the criteria from step 2, as a path. If they came out of the conversation rather than a SPEC file, write them to a temp file first so the fidelity agent reads a file rather than transcript.

Ask for findings only — no summary, no praise, no "overall this looks good." Some will add it anyway, which is why step 4 throws it away rather than trusting the instruction.

### 4. Synthesize

Lead with what you reviewed: the target, the intent source and its kind, and a one-line verdict a person can act on. Say up front if a check didn't run — a review missing its fidelity pass looks identical to one that passed it, unless you name the difference.

Then the findings under four headings, defects first because they're the ones with a cost attached to shipping. Sort inside each heading by highest confidence — except defects, which sort by consequence first: a confidence-95 off-by-one in a log line sits below a confidence-82 unbounded delete, and confidence alone puts them the wrong way round. Discard anything an agent returned outside the format — its preamble, its summary, its verdict — instead of editing it down. Drop any finding whose evidence line is missing, or whose cited path doesn't exist — check them. An agent arguing for its own finding is the one party with a reason to round its score up, so the number can't be the filter; the citation can.

Two agents often catch the same code from different heights — duplication as a smell and as an unnamed domain. Where one fix settles both, keep the higher-altitude version and drop the other, because the author fixes it once. Where the two fixes are different edits, keep both: a wrong return value and a long method live on the same lines and neither one resolves the other.

Defects also collide the other way, with a finding that argues the opposite. The clearest case: defects reports a fallback that quietly returns a wrong answer, and fidelity reports that same error handling as scope nobody asked for. One says fix it, the other says delete it. Report both, adjacent, and name the conflict — dropping either leaves the author fixing a bug in code that shouldn't exist, or deleting a path something now depends on.

If every agent came back empty, say that plainly. A review with nothing in it is a real result, and padding it with observations you scored below the bar is how the bar rots.

### 5. Offer the fix

Number the findings and ask which to apply. Don't apply them unasked: a reviewer who edits starts defending its own edits, and the author loses the chance to say "that's deliberate, here's why."

Apply only what they name, one finding at a time, and stop if a fix turns out to be bigger than the finding described.

## Notes

- `agents/defects.md` stands in for the built-in `/code-review`, and adds the security pass that lives in `/security-review`. Two things it doesn't do: it can't execute anything, so every defect is a claim with a trigger attached rather than a demonstrated failure, and its confidence bar cuts recall the built-in would keep at high effort. On a change where a missed bug is expensive, run the built-in too.
- The agents run read-only, so anything they'd change comes back as a recommendation rather than a diff. If `Explore` isn't available, say so and pick the most restricted agent type there is rather than reaching for a general-purpose one.
- Nothing here assumes a language or a framework, and the review is worse the moment it starts to. Whatever pattern you're about to recommend, point at the place this repo already does it. If you can't find one, you're recommending a habit from somewhere else.
- `agents/` holds prompt fragments, not registered subagents — no frontmatter, nothing validates them. What an agent can touch comes from the agent type dispatch launches, not from anything declared in those files.
- Findings about generated files, lockfiles, vendored code, and binaries are almost always noise. Skip them unless the change to one is the actual bug.
- Don't report what a linter or formatter already catches. The author gets that for free, and spending review on it makes the review look cheap.
