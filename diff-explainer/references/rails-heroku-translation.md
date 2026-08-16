# Translating for a Rails reviewer

Read this when the project isn't Rails and you need the annotations to land with
someone whose mental model is Rails and Heroku.

## The point of an analogy

The reviewer isn't confused about programming. They're missing the *conventions* —
what this framework does for you, what's expected to live where, what's normal
versus what's a workaround. That's exactly what Rails gives a Rails developer, so
the analogy does real work: it hands them the conventions they'd otherwise have to
infer from the diff.

Which means: translate concepts and conventions, not syntax. "It's like a
`before_action`" is useful. "`const` is like `def`" is noise.

## How to use one

**Say the analogy, then the difference that matters.** An analogy without its
limit sets the reviewer up to be wrong later. "This is that stack's `ActiveJob`,
except there's no retry — a failed job is just gone" tells them where their
instincts stop applying, which is the part they can't get from the diff.

**One per idea, then move on.** Analogies stack badly. Once you've said a Django
view is a controller action, keep calling it a controller action; don't reach for
a second metaphor two paragraphs later.

**Skip it when the thing is already universal.** A typo fix, a renamed variable,
a null check — nobody needs Rails for that. Forcing an analogy onto something
obvious reads as condescension, and the reviewer starts skimming.

**Never make the analogy do the explaining.** The annotation still has to say why
the change was made. The analogy only makes the *what* cheap to parse so the why
has room.

## Common translations

These are a lookup for you, not content for the page. Never reproduce a table
like this in the walkthrough — the analogy belongs in the sentence where the
reviewer meets the unfamiliar thing, so it costs them nothing to use. A glossary
section makes them hold a mapping in their head and cross-reference it, which is
more work than the diff they came to read.

### Web request lifecycle

| Elsewhere | Rails |
| --- | --- |
| Express/Koa middleware, Django middleware | Rack middleware, or a `before_action` if it's per-controller |
| Express route handler, FastAPI path operation, Go `http.HandlerFunc` | Controller action |
| Express Router, Django `urls.py`, Next.js file routing | `config/routes.rb` |
| DRF serializer, GraphQL resolver, Go struct tags | Jbuilder / `as_json` / a serializer |
| React component, Vue SFC, Svelte component | A view partial, but it keeps its own state |
| Next.js server component | A view rendered server-side, which is just... a view |
| Client-side router | Turbo Drive |
| WebSocket handler, Socket.io, Phoenix Channel | Action Cable channel |

### Data

| Elsewhere | Rails |
| --- | --- |
| Prisma / TypeORM / SQLAlchemy / GORM model | Active Record model |
| Prisma migration, Alembic, `golang-migrate` | `db/migrate` — same idea, same one-way risk |
| Prisma schema, Django `models.py` | `schema.rb`, except it's the source of truth, not generated |
| Repository / DAO layer | A model class method, or a scope |
| N+1 in an ORM | The same N+1, `includes` is the same fix |
| Redis as cache | `Rails.cache` |
| Redis as queue | Sidekiq's backing store |

### Background and scheduled work

| Elsewhere | Rails |
| --- | --- |
| Celery / BullMQ / Sidekiq-in-another-language | Active Job + Sidekiq |
| Lambda / Cloud Function | A job that gets its own dyno, spun up per invocation |
| Cron in Kubernetes, EventBridge rule | Heroku Scheduler |
| SQS / Kafka consumer | A worker dyno, but the queue outlives the app |

### Config, deploy, runtime

| Elsewhere | Rails / Heroku |
| --- | --- |
| `.env`, ConfigMap, Secrets Manager | Heroku config vars |
| Dockerfile | Buildpack — the thing that decides how the app is built |
| `docker-compose.yml` | Your local `Procfile` plus whatever's in `brew services` |
| Kubernetes Deployment replicas | Dyno formation (`web=2 worker=1`) |
| Pod restart, container restart | Dyno restart — and the same "did we keep state in memory?" question |
| Blue/green, canary | Heroku's release phase and a rollback |
| Health/readiness probe | Nothing built in — but the same job as the boot check |
| Horizontal autoscaling | Adding dynos |

### Dependencies and tooling

| Elsewhere | Rails |
| --- | --- |
| `package.json` / `pyproject.toml` / `go.mod` | Gemfile |
| Lockfile | `Gemfile.lock` — same "don't hand-edit, do commit" rules |
| npm scripts, Makefile targets | Rake tasks |
| TypeScript types | No equivalent; nearest thing is what your tests were doing |
| ESLint / Ruff | RuboCop |
| Vitest / pytest / `go test` | RSpec or Minitest |
| Playwright / Cypress | System specs |
| CI pipeline | Heroku CI, or the checks that gate a merge |

### Ideas with no clean Rails match

When there's no real equivalent, say so plainly instead of stretching. These come
up often:

- **Type systems** — the honest framing is "the compiler catches a class of bug
  you'd normally catch in a test."
- **Explicit dependency injection** — Rails leans on constants and autoloading, so
  the closest thing is "the object gets handed its collaborators instead of
  reaching for a class name."
- **Immutable / functional state updates** — "we build a new object instead of
  mutating the one we have," and why that matters here.
- **Build steps and bundlers** — closest is the asset pipeline, but say what's
  different: the whole app is compiled, not just assets.
- **Eventual consistency** — no Rails analogy makes this safe. Describe the actual
  window where two things disagree.

## Worked examples

**Weak — syntax, no why:**
> This adds a middleware function to the Express app.

**Better — convention plus the reason:**
> Same slot as a Rack middleware: it runs on every request before any route sees
> it. It's here rather than in each handler because the auth check was already
> drifting between three of them.

**Weak — the analogy is the whole annotation:**
> BullMQ is basically Sidekiq.

**Better — analogy sets up the actual point:**
> BullMQ is this stack's Sidekiq. The difference that bites here: there's no
> `retry_on`, so a job that raises is dead on the first failure. That's why this
> one catches and re-enqueues by hand.
