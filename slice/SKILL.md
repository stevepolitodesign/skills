---
name: slice
description: Cut a feature or idea down to one full-stack slice.
argument-hint: "[feature or idea to slice]"
disable-model-invocation: true
---

# Full-stack slice SPEC

A full-stack slice cuts vertically through every layer a feature needs: storage, logic, interface, integration. It ships on its own, and a user gets something they couldn't get before. The opposite is a horizontal slice ("add the schema", "build the API", "design the UI"), which ships nothing anyone can use and hides the integration pain until the end.

Full stack means whatever this project's fullest stack is. For a web app, storage through to screen. For a CLI, argument parsing through to printed output. Let the repo tell you its layers instead of assuming.

The job is finding the version that costs a fraction of the work and is still worth shipping. The SPEC goes to a session that has none of this conversation, so it has to stand alone.

## Workflow

1. Capture the raw idea in the user's words.
2. Recon the codebase with subagents. Wait for them; the interview depends on what they find.
3. Run the Socratic interview to cut scope.
4. Play the slice back and stop for confirmation.
5. Write `docs/specs/<slug>.md` and tell the user the path.

### 1. Capture the raw idea

The feature, if the user passed one: `$ARGUMENTS`

If that's empty, ask what they're building. Don't tidy up the answer. The messy version carries the motivation you need for the job story.

### 2. Recon the codebase, before any questions

Finish this before you ask anything. An interview run blind produces cuts that sound reasonable and turn out wrong: you propose building something the app already has, or you cut something load-bearing because you didn't know what depended on it. In a mature codebase the best cut is usually "that already exists, reuse it", and questioning the user won't surface it. They usually don't know either.

Check how much codebase there is first (`git log --oneline | wc -l`, a source file count). A near-empty repo has nothing to find, so say that and go straight to the interview.

Otherwise tell the user you're reading the codebase first. Then launch subagents in parallel (`Explore`, or `general-purpose`), one per angle:

- **Closest prior art.** The existing feature most like this one, traced end to end. These are the files worth copying.
- **Territory.** Every layer this would touch, in whatever form the project has them. What's already there, what's missing.
- **Conventions.** How the codebase handles its inputs, its trust boundaries if it has any, and its tests.

Ask for exact file paths rather than prose, because you need that specificity to argue for cuts the user can verify. Have each name up to 10 files worth reading, fewer if fewer are worth it, then read those files yourself.

Then give the user 3 to 5 lines on what you found: what already exists, the closest pattern, what's missing. If recon misread the codebase, this is where they catch it, and that's far cheaper than finding out once the SPEC is written.

No repo, or no subagents available? Do a timeboxed grep and skim yourself, or say plainly that you're cutting scope without knowing what already exists, which is the weaker version of this.

### 3. The Socratic interview

If the idea already arrives slice-sized, say so, play it back, and stop. The rounds below are for ideas that need cutting.

Rounds of 2 to 4 questions. One at a time is a slog; twelve at once is a survey.

**Lead with a cut.** "Should we include search?" makes the user do the work, and they'll say yes. Instead: *"I'm cutting search. With a dozen records the user can scan the list. Push back if that's wrong."* A proposed cut is easy to accept and easy to reject, so it moves fast, and whatever they defend tells you what actually matters. Use `AskUserQuestion` when the choices are genuinely enumerable, plain questions otherwise.

**Spend the recon.** You did the reading so the cuts could be specific, so use it. *"I'm not building an exporter. The reports page already renders CSV at `<the file you found>`, and this can go through the same path"* is a cut the user can verify. Name the file. Vague cuts get argued about; grounded ones get accepted in one line.

**One test for everything.** For each behavior still standing: cut it, and does the slice still deliver the job story's outcome? If yes, cut it. Nothing earns an acceptance criterion until it has survived that question out loud. Guardrails are exempt.

**Stop early.** Two rounds with no new cuts means you're at the floor, where removing one more thing would break the demo or leave the user with nothing new. Past that you're negotiating trivia, and the remaining scope is the user's to defend rather than yours to keep whittling. Before you stop, say which cut you considered and rejected, and why. They can overrule you, and this is their last chance.

**Guardrails.** Four things survive however thin the slice gets: anything that risks data loss or corruption, authorization boundaries that would expose other people's data, whatever makes the slice demo-able, and tests for the acceptance criteria. Each becomes an acceptance criterion even though it would pass the cut test, which is why they're listed separately. Deferring one is a decision rather than a cut, so say it plainly and record it under `## Owed`. It isn't gone, it's owed.

**If it won't cut, change the axis.** A feature that resists slicing is usually being cut in the wrong direction. Cut by workflow step, by user, or by input, not by layer and not by a "phase one" that ships nothing. The tell is a slice nobody can exercise end to end without you narrating it for them. Change the axis instead of thinning it further.

### 4. Play it back

Before writing anything, give the user the job story, the slice in one sentence, and the list of what you cut. Mark which cuts they pushed back on and which passed without comment, because a silent round isn't agreement. Then stop. Don't write the file in the same turn as the playback, whatever their last message implied. If they push back, that's another round, so go back to step 3.

The SPEC won't carry the cut list. This message is the only place the user sees what's out while they can still object, so make it a real list rather than a summary.

### 5. Write the SPEC

The shape is in `assets/spec-template.md`: title, one-sentence summary, job story, acceptance criteria, and `## Owed` only if something was deferred.

That austerity is deliberate. This is a contract rather than a design doc. The session that implements it does its own codebase reading, and anything you write about file layout or sequencing will be staler than what it finds. Decisions are different. "Go through the existing export path rather than building a new one" doesn't go stale, it goes missing, so the summary sentence carries whatever reuse the user approved.

**The acceptance criteria are the scope boundary.** There's no in/out list because there doesn't need to be one: if a behavior isn't in a criterion, it isn't in the slice. That only holds if the criteria are tight, so write them as behavior someone can observe by using the thing. Given a starting state, when the user does something, then something is observably true. "A blank title is rejected by the validation layer" names an implementation the next session should get to choose; "when I submit with the title empty, then I see the form again with an error on the title field" says the same thing and decides nothing. Outside a UI the same rule holds: "when I run `report --format=csv` with no matching records, then it prints the header row and exits 0". Where recon found something specific enough to change the work, put it in the criterion itself.

One criterion per observable behavior, usually three to six. One means you spec'd a fragment; ten means you didn't cut.

Replace every `{placeholder}`. Nothing in braces survives into the finished file.

Write to `docs/specs/<slug>.md` at the repo root (`git rev-parse --show-toplevel`), with a short kebab-case slug (`invoice-csv-export`, not `export-invoices-as-csv-file-v1`). Create the directory if it doesn't exist. If the file already exists, read it: same feature, ask whether to replace it or revise it in place; different feature, pick a different slug. Never auto-suffix, because `/review` finds SPECs by slug and can't tell two near-identical ones apart. Then tell the user the path.

## Job story craft

The shape is in the template. There's no persona in a job story. "As a hiring manager" tells you nothing about when the need arises; the situation does that work.

- **Situation** is a concrete moment with a trigger. "When I'm closing out the month and my accountant asks for our invoice history", not "When I am a finance user."
- **Motivation** is the problem rather than your solution. "I want our invoices out of the app in one file", not "I want to click an Export button." If the UI shows up here, you've written the implementation into the story.
- **Outcome** is why it's worth anything. It should imply what gets worse if you don't build it.

One job story per slice. If yours needs an "and", you have two slices. Spec the first and tell the user what the second one is.

## Notes

- Resist appending sections. A design note or a roadmap is defensible on its own, and together they turn the contract back into the design doc this avoids. If something must survive, it belongs in an acceptance criterion, in `## Owed`, or in conversation.
- If the feature is genuinely large, you're still speccing exactly one slice. Tell the user what the remaining slices look like, in order, but keep them out of the file.
