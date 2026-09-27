---
name: trace
description: Run a scenario and record what actually happened.
argument-hint: "[scenario, e.g. \"user creates an account\"]"
---

# Trace

Reading code tells you what *should* happen. Running it tells you what does: the
callback nobody mentioned, the job that enqueues two more, the email that goes out
twice. That's the gap this fills. The output is a record, in order, of what one
scenario did when it ran, with every step marked as seen or only read.

Two ways this fails. You read the code, write it up in the past tense, and it looks
exactly like a run — so the reader trusts a guess as much as an observation. Or you
run it for real against something that matters: a real card gets charged, a real
inbox gets mail, a process gets killed. The first is worse, because nothing about it
looks wrong.

## 1. Pin the scenario

The scenario is `$ARGUMENTS`, or ask for one. It arrives as a sentence ("user creates
an account"), a route, a command, a job name.

Turn it into three things before running anything:

- **Entry point.** The route and action, CLI command, or job that starts it — found
  in the code, not assumed. Two plausible ones (sign up by form, sign up by invite)?
  Take the common one, say which, and name the other as its own trace.
- **Starting state.** Who is acting and what exists already. "A signed-in user who
  owns one project with one app" — the factory or fixture that builds it, if there is
  one. Give every association the scenario reads or deletes at least one row. A
  delete run against a record with no children can't show you the child table it
  forgets to clean up.
- **Input.** The real params: `email: "sam@example.com"`, not "valid params".

Don't ask the user for these. Find them; say what you picked in one line.

## 2. Decide how to run it, and what not to run

Safest route that still actually executes the code, in this order:

1. **An existing test** that drives this scenario end to end (request, system,
   integration spec). It already builds the starting state, and the test database
   rolls back.
2. **A throwaway test** you write for this, in the test environment, deleted after.
3. **A script** against the development environment, only if the test environment
   can't run it. Never production, never a shared staging database.

Read `references/recording.md` now. It has the instrumentation that captures what
happened, for Rails and in general.

**Before you run, list the dangerous side effects.** Skim the path for anything that
reaches outside the process: HTTP calls, payment or email providers, LLM APIs,
`Process.kill`, shelling out, deleting or moving files, dropping databases. For each:

- Already stubbed by the test setup (WebMock, VCR, a fake adapter)? Fine — record
  that it was stubbed.
- Not stubbed? Stub it in your throwaway test, and record the call it *would* have
  made — URL, arguments — as the observation. The attempted call is the fact worth
  having; the response isn't. Read the request body you captured, not just the URL.
  What the app actually sends is where bugs hide that no one reading the code sees.
- Can't be stubbed safely? Don't run past it. Stop the run there, and trace the rest
  by reading, marked as read.

Never run a destructive step for real to see what it does. A trace that says "would
have run `rails db:drop:all` in `/apps/42`" is complete; one that ran it isn't a
trace, it's an incident.

**Follow the chain.** Jobs enqueued during the scenario are part of it. Run them the
way production does: after the request returns, not inside it. Many test setups run
jobs inline, which hides the order — a broadcast that lands before the record it
refers to, a response that comes back before the work it promised. So queue during
the request (Rails: the `:test` adapter for this one example), then perform them
(`perform_enqueued_jobs`, or the stack's equivalent) and keep recording, one level at
a time, until nothing new is enqueued or you hit an outside call you stubbed. Say
which adapter the app normally uses, and where you stopped and why.

## 3. Run it and leave nothing behind

Note `git status --porcelain` before. Put throwaway files where you'd delete them
anyway, run, capture the output, then delete them. `git status` after has to match
before; if the run touched something you didn't write, say so.

If it fails to run — missing database, broken setup, a test that was already red —
that's a result. Report it, try the next route once, and if nothing runs, fall back
to reading the whole path and say plainly at the top that nothing was executed.

## 4. Write it up

Read `assets/trace-template.md` and fill it in. What makes a trace worth having:

**Every step is marked `ran` or `read`.** `ran` means you saw it in the recorded
output of this run. `read` means you got it from the code. `stubbed` means the code
reached it and you stopped it. No step goes unmarked, and a step you saw only in the
code is never written up as though you watched it happen.

**Real values from the run.** `INSERT INTO users (email) VALUES ('sam@example.com')`,
`Project id=17 "Sam's project"`, `ChatResponseJob enqueued on default`. Not "a user
is created". The numbers in the drawing and the ledger come from the same run.

**Order is the point.** Draw it as a sequence, what happened then what, with
branches only where the run took one or a guard stopped it. Plain text, under about
seventy characters wide, labels from the codebase.

```
POST /users  email=sam@example.com
   |
   v
UsersController#create (Clearance)
   |-- INSERT users id=31
   |-- after_create User#provision_workspace
   |     |-- INSERT organizations id=9
   |     `-- INSERT projects id=17
   |-- enqueue WelcomeMailer#welcome  (deliver_later)
   v
302 -> /projects/17
```

**Surprises get their own list.** The things someone reading the code would miss: a
callback three files away, a query per row, a job that runs twice, a write inside a
GET. If there are none, say "none" rather than inventing one — that's also a finding.

**Holes get named.** What you stubbed, what you only read, where you stopped the
chain. Those are what the next person would have to check by hand.

Keep prose short. The ledger and the drawing carry it; prose explains the surprises.

## 5. Save and show it

Write the trace to `docs/traces/<slug>.md` at the repo root, a short kebab-case slug
(`user-creates-account`). Create the directory if needed. If the file exists, it's an
older trace of the same scenario: overwrite it, and say in one line what changed
since, if anything did — that diff is often the most useful thing in it.

Don't paste the trace into the chat. The file is the record; the chat is the
headline. Reply with the path and at most three bullets: what the scenario
did in one line, the biggest surprise, and anything stubbed or only read that
changes how far to trust it. If the run turned up nothing surprising, say so.
Don't end on an offer.

It's a record of what the code did on one run, not a spec and not a review. Don't
recommend changes in it. If the run turned up a real bug — a double charge, a write
that skips authorization — tell the user directly, outside the file, in one line.
