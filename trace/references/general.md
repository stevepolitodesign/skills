# Tracing any other stack

Same shape as any trace: copy the data, drive the entry point with a script
that loads the app, intercept what leaves the process, record in order. Only
the taps change. Look for what the stack already gives you before writing your
own.

## Copy or build the data

Find the development database in the app's config or env file (`.env`,
`.env.local`, `.env.development`). Read the host, never print the password.

- **Local Postgres:** `createdb -T app_dev app_dev_trace_signup`, or
  `pg_dump -Fc app_dev | pg_restore -d app_dev_trace_signup` if something is
  connected to the source.
- **SQLite:** copy the file.
- **Hosted or shared** (any host that isn't `localhost`, `127.0.0.1`, or a
  socket): don't connect. `createdb app_trace_signup` locally and run the app's
  migrate command against it, the one that applies existing migrations without
  generating new ones.

Override the connection string for the one command, in the environment
(`DATABASE_URL=postgres://localhost:5432/app_trace_signup npx tsx tmp/trace.ts`).
Use a host and port, not a socket-style `postgres:///` URL; some tools, Prisma
among them, reject it. Many env
loaders don't overwrite a variable that's already set, but some do; print the
database the app actually connected to at the top of the script and abort if
it's the original.

## Drive it

A script in a gitignored folder that imports the app's own code and runs the
entry point in development:

- **A web handler:** build the request object the framework passes in and call
  the handler function directly, or use the framework's in-process test client
  if it has one that works outside the test runner.
- **A page or view that loads data:** call the data-loading function it calls,
  with the same arguments.
- **A CLI command or job:** invoke it the way the app's own entry point does.

Auth: create the user and whatever session or token record the app checks,
then pass it the same way a browser would. If the auth library can't be
satisfied from a script, call the code just past the auth check, and mark the
auth check `read`.

When nothing can be driven in-process, start the dev server on a spare port
with the overridden environment, send a real request, and stop the server.

## Intercept outside calls

Replace the outgoing HTTP function in the script before the scenario runs.
In JavaScript and TypeScript that's usually `globalThis.fetch`:

```ts
const calls: unknown[] = [];
globalThis.fetch = async (input, init) => {
  const url = String(input instanceof Request ? input.url : input);
  calls.push({ url, method: init?.method ?? "GET", body: init?.body });
  console.log("TRACE http", init?.method ?? "GET", url, init?.body ?? "");
  return new Response(JSON.stringify(cannedFor(url)), { status: 200 });
};
```

Throw on any URL you didn't plan for, so a call you missed shows up instead of
going out. Check the app doesn't use a different HTTP client (axios, got,
requests, an SDK with its own transport); if it does, intercept that.

Mail, file moves, process kills, shell-outs: replace the function the app calls,
or point its configured directory at a temp folder.

## Record

- **Queries:** nearly every ORM has a query log or event. Prisma:
  `new PrismaClient({ log: [{ emit: "event", level: "query" }] })` and
  `prisma.$on("query", e => ...)`, or pass a logged client where the app builds
  its own. Keep writes; keep reads only when there are suspiciously many.
- **Log level:** most frameworks log requests and queries at debug. Turn it up
  for the one run and filter.
- **Background work:** find where jobs are queued and replace that function with
  one that records the job and holds it, then run the held jobs yourself after
  the request returns.
- **Print statements** at each step's entry and exit, as a last resort, in a
  copy you delete after.

Tag every line `TRACE ...` so it filters out of the noise.
