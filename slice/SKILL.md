---
name: slice
description: Cut a feature or idea down to one full-stack slice.
argument-hint: "[feature or idea to slice]"
disable-model-invocation: true
---

# Full-stack slice SPEC

A full-stack slice cuts vertically through every layer a feature needs: storage, logic, interface, integration. It ships on its own, and a user gets something they couldn't get before. The opposite is a horizontal slice ("add the schema", "build the API", "design the UI"), which ships nothing anyone can use and hides the integration pain until the end.

Full stack means whatever this project's fullest stack is. For a web app, storage through to screen. For a CLI, argument parsing through to printed output. For a library, the public interface through to the docs someone reads. Let the repo tell you its layers instead of assuming.

Your value here is subtraction. Anyone can list what a feature needs. The job is finding the version that costs a fraction of the work and is still worth shipping. The SPEC goes to a session that has none of this conversation, so it has to stand alone.

## Workflow

1. Capture the raw idea in the user's words.
2. Recon the codebase with subagents. Wait for them; the interview depends on what they find.
3. Run the Socratic interview to cut scope.
4. Play the slice back and get one confirmation.
5. Write `docs/specs/<slug>.md` and tell the user the path.

### 1. Capture the raw idea

The feature, if the user passed one: `$ARGUMENTS`

If that's empty, ask what they're building. Don't tidy up the answer. The messy version carries the motivation you need for the job story.

### 2. Recon the codebase, before any questions

Finish this before you ask anything. An interview run blind produces cuts that sound reasonable and turn out wrong: you propose building something the app already has, or you cut something load-bearing because you didn't know what depended on it. In a mature codebase the best cut is usually "that already exists, reuse it", and questioning the user won't surface it. They usually don't know either.

Tell the user you're reading the codebase first and it'll take a minute. Then launch 2 to 3 subagents in parallel (`Explore`, or `general-purpose`), each on a different angle:

- **Closest prior art.** The existing feature most like this one, traced end to end. These are the files worth copying.
- **Territory.** Every layer this would touch, in whatever form the project has them. What's already there, what's missing.
- **Conventions.** How the codebase handles input, authorization, asynchronous work, and tests.

Ask for exact file paths rather than prose, because you need that specificity to argue for cuts the user can verify. Have each name the 5 to 10 files most worth reading, then read those files yourself. The subagents build the map; you need the detail in context to propose cuts with any authority.

Then give the user 3 to 5 lines on what you found: what already exists, the closest pattern, what's missing. If recon misread the codebase, this is where they catch it, and that's far cheaper than finding out once the SPEC is written.

No repo, or no subagents available? Do a timeboxed grep and skim yourself, or say plainly that you're cutting scope without knowing what already exists, which is the weaker version of this.

### 3. The Socratic interview

Rounds of 2 to 4 questions. One at a time is a slog; twelve at once is a survey.

**Lead with a cut.** "Should we include search?" makes the user do the work, and they'll say yes. Instead: *"I'm cutting search. With a dozen records the user can scan the list. Push back if that's wrong."* A proposed cut is easy to accept and easy to reject, so it moves fast, and whatever they defend tells you what actually matters. Use `AskUserQuestion` when the choices are genuinely enumerable, plain questions otherwise.

**Spend the recon.** You did the reading so the cuts could be specific, so use it. *"I'm not building an exporter. The reports page already renders CSV at `<the file you found>`, and this can go through the same path"* is a cut the user can verify. Name the file. Vague cuts get argued about; grounded ones get accepted in one line.

**One test for everything.** For each behavior still standing: if we cut this, does the user still get value? If yes, cut it. Nothing earns an acceptance criterion until it has survived that question out loud.

**Stop early.** Two rounds with no new cuts means you're at the floor, where removing one more thing would break the demo or leave the user with nothing new. Most features get there in two or three rounds. By round five you're negotiating trivia, and the remaining scope is the user's to defend rather than yours to keep whittling. Before you stop, say which cut you considered and rejected, and why. They can overrule you, and this is their last chance.

**Guardrails.** Four things survive however thin the slice gets: anything that risks data loss or corruption, authorization boundaries that would expose other people's data, whatever makes the slice demo-able, and tests for the acceptance criteria. Deferring one of these is a decision rather than a cut, so say it plainly. It isn't gone, it's owed.

**If it won't cut, change the axis.** A feature that resists slicing is usually being cut in the wrong direction. By workflow step, by user, by input, by state, by fidelity: those produce shippable slices. By layer, by backend-then-frontend, or any "phase one" that ships nothing: those don't. The tell is a slice that touches a single layer. If what's left is a schema change plus a script somebody runs by hand, nobody can see it, so change the axis instead of thinning it further.

### 4. Play it back

Before writing anything, give the user the job story, the slice in one sentence, and the list of what you cut. One confirmation. If they push back, that's another round, so go back to step 3.

The SPEC won't carry the cut list. This message is the only place the user sees what's out while they can still object, so make it a real list rather than a summary.

### 5. Write the SPEC

The SPEC has three parts: title, job story, acceptance criteria. The shape is in `assets/spec-template.md`.

That austerity is deliberate. This is a contract rather than a design doc. The session that implements it does its own codebase reading, and anything you write about files or sequencing will be staler than what it finds. What can't be rediscovered is what the slice is for and how you'll know it's done.

**The acceptance criteria are the scope boundary.** There's no in/out list because there doesn't need to be one: if a behavior isn't in a criterion, it isn't in the slice. That only holds if the criteria are tight, so write them as behavior someone can observe by using the thing. Given a starting state, when the user does something, then something is observably true. "A blank title is rejected by the validation layer" names an implementation the next session should get to choose; "when I submit with the title empty, then I see the form again with an error on the title field" says the same thing and decides nothing. Where recon found something specific enough to change the work, put it in the criterion itself ("then the existing usage chart renders above the table").

Replace every `{placeholder}`. Nothing in braces survives into the finished file.

Write to `docs/specs/<slug>.md`, with a short kebab-case slug (`invoice-csv-export`, not `export-invoices-as-csv-file-v1`). Create the directory if it doesn't exist, and don't clobber an existing file: suffix it or ask. Then tell the user the path.

## Job story craft

```
When I {situation}
I want to {motivation/problem to solve}
So I can {outcome}
```

There's no persona in a job story. "As a hiring manager" tells you nothing about when the need arises; the situation does that work.

- **Situation** is a concrete moment with a trigger. "When I'm closing out the month and my accountant asks for our invoice history", not "When I am a finance user."
- **Motivation** is the problem rather than your solution. "I want our invoices out of the app in one file", not "I want to click an Export button." If the UI shows up here, you've written the implementation into the story.
- **Outcome** is why it's worth anything. It should imply what gets worse if you don't build it.

One job story per slice. If yours needs an "and", you have two slices. Spec the first and tell the user what the second one is.

## Notes

- Resist appending sections. A design note, a file list, a roadmap: each is defensible on its own, and together they turn the contract back into the design doc this avoids. If something must survive, it belongs in an acceptance criterion or in conversation.
- If the idea already arrives slice-sized, say so and write it up. The interview serves the user, so one confirming round beats five performative ones.
- If the feature is genuinely large, you're still speccing exactly one slice. Tell the user what the remaining slices look like, in order, but keep them out of the file.
