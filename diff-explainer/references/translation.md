# Translating for a reader from another stack

Read this when you know the reader's background and the project isn't in it.

## The point of an analogy

The reviewer isn't confused about programming. They're missing the *conventions*:
what this framework does for you, what's expected to live where, what's normal
versus what's a workaround. Their own stack gives them exactly that at home, so
the analogy does real work: it hands them the conventions they'd otherwise have
to infer from the diff.

Which means: translate concepts and conventions, not syntax. "It's their middleware,
running before every view" is useful. "`const` is like `$`" is noise.

## How to use one

**Say the analogy, then the difference that matters.** An analogy without its
limit sets the reviewer up to be wrong later. "This is this stack's background
job queue, except there's no retry; a failed job is just gone" tells them where
their instincts stop applying, which is the part they can't get from the diff.

**One per idea, then move on.** Analogies stack badly. Once you've said an
Express route handler is their controller action, keep calling it that; don't
reach for a second metaphor two paragraphs later.

**Skip it when the thing is already universal.** A typo fix, a renamed variable,
a null check: nobody needs a translation for that. Forcing an analogy onto
something obvious reads as condescension, and the reviewer starts skimming.

**Never make the analogy do the explaining.** The annotation still has to say
why the change was made. The analogy only makes the *what* cheap to parse so the
why has room.

**Say so when there's no match.** Type systems, eventual consistency, explicit
dependency injection often have no honest equivalent in the reader's stack.
Describe the actual thing plainly instead of stretching a comparison.

## Worked examples

For a Django developer reading an Express branch.

**Weak, syntax with no why:**
> This adds a middleware function to the Express app.

**Better, convention plus the reason:**
> Same slot as a Django middleware: it runs on every request before any view
> sees it. It's here rather than in each handler because the auth check was
> already drifting between three of them.

**Weak, the analogy is the whole annotation:**
> BullMQ is basically Celery.

**Better, analogy sets up the actual point:**
> BullMQ is this stack's Celery. Like an undecorated Celery task, a job that
> throws isn't retried, so it's gone on the first failure. That's why this one
> catches and re-enqueues by hand.
