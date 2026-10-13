---
name: prompt
description: Write the best prompt for a task, show it for approval, then run it. Use when someone asks how they should prompt you, or what the best way to ask for something is.
argument-hint: "[task, e.g. \"users can't sign up\"]"
---

# Prompt

"Users can't sign up" is a fine thing to say to a person who works on the app. They
know which sign-up, what changed last week, and what "fixed" means. Said to an agent,
the same words get a confident fix to the wrong flow. This turns the task into the
prompt a careful teammate would write, shows it, and runs it once the user signs off.

```
task
  |
  v
1. look ...... read the code the task names
2. ask ....... only what the code can't tell you
3. write ..... the prompt, shown for approval
4. run ....... here, as written
```

Two ways this fails. The prompt restates the task in more words and adds nothing the
agent couldn't have guessed. Or it's a wall of rules, and the one that matters is
buried. Every line should be something the agent would otherwise get wrong.

## 1. Look

The task is `$ARGUMENTS`, or ask for one.

Skim the README, the routes, the area the task names, recent commits there. You're
looking for what the prompt can point at: the file that handles it, the pattern to
copy, the test that covers it, the command that checks it. A prompt that names
`app/controllers/registrations_controller.rb` beats one that says "the sign-up code".

## 2. Ask

Ask in one turn, only what the code can't answer:

- **What's happening.** Who, what they see, since when. Pasted errors, tickets, logs
  beat a description. "Some users" is a clue: which ones?
- **What should happen.** Code shows what it does, never what it should.
- **What done looks like.** Diagnose and report, or fix? A fix they'll ship, or a
  spike to estimate from?

"Don't know" is a fine answer. It goes in the prompt as an unknown.

## 3. Write the prompt

Write it the way you'd brief a sharp colleague who's never seen this app. Use only
the parts that earn their place:

- **The ask, said outright.** "Find out why and fix it" and "find out why, change
  nothing" get different work. Say which.
- **What we know, and from whom.** The user's words, pasted evidence, and a source
  on each claim: user, ticket, unverified. The agent weighs a guess and a log line
  differently only if it can tell them apart.
- **Where to look.** Files, routes, commits you found in step 1, with paths.
- **The why behind each constraint.** "Don't touch the Google credentials, they're
  shared with the mobile app" gets followed more sensibly than "NEVER touch
  credentials". Skip ALL-CAPS; it makes agents overreact.
- **How to work, when the task needs it.** Bug: reproduce before fixing, with a
  failing test or `/trace`. Unfamiliar code or many files: explore and plan first.
  Broad reading across many places: subagents, each with a narrow question.
  One-line change: none of this.
- **Out of scope.** What not to touch, what not to add. Agents widen tasks on their
  own.
- **Done when.** A check that runs: a failing test that passes, a command, a page
  that loads. Then what to report: the cause in a line, the command and its output as
  proof, what changed, what it couldn't check.
- **Can't reach.** Production data, error trackers, third-party dashboards. Say so in
  the prompt, so a finding from development isn't read as one from production.

Say what to do, not only what to avoid. Plain prose and short lists; wrap pasted
material in tags like `<ticket>` so it's clearly data.

If another skill fits better, say so instead: `/slice` for a feature that isn't
scoped yet, `/domain-model` when the business process itself is unclear.

Show it like this, then stop:

````
```
Users report they can't sign up. Find out why and fix it if the cause is in our code.

What we know
- Started around Oct 6. 4 support tickets, all signing up with Google. (user)
- They see "Something went wrong" after Google redirects back. (ticket, below)
- Email sign-up seems fine. (user, unverified)

Where to look
- app/controllers/users/omniauth_callbacks_controller.rb, the Google callback
- commits since Sep 29 touching that file, config/initializers/devise.rb, Gemfile.lock

How to work
Reproduce first: write a failing request spec for the Google callback, or run it
with /trace. A cause you haven't seen happen is a guess, so label it as one. If the
cause is config or Google's side, stop and report. Credentials are shared with the
mobile app, so don't change them.

Out of scope
Email sign-up, unless the cause is shared. Refactoring the controller.

Done when
The new spec passes and bin/rails test is green. Report the cause in one line, the
command and output that show it, what you changed, and what you couldn't check.

Can't reach: production logs. Development only.

<ticket>Tried to sign up with Google, got "Something went wrong". -- Priya, Oct 7</ticket>
```

Change anything, or run it?
````

Don't run a prompt they haven't seen. That checkpoint is the point: a wrong
assumption in the prompt costs a sentence to fix now and an hour of work later.

## 4. Run it

On approval, do what the prompt says, here, as if they'd typed it. Edits: revise,
show it again.

If it's big enough that it would go better in a fresh session, say so and let them
pick. The prompt is written to stand on its own, so it can be pasted there as is.
