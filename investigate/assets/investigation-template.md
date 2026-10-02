# {the question, as asked}

{date} · `{git rev-parse --short HEAD}` · cause: {established | suspected | unknown}

## Answer

{Two or three lines. What's going on, in terms of what people do and see.}

## What happens now

{In order. Each line marked `ran` (seen in a trace), `read` (from the code), or
`stubbed`, with real values and a citation.}

1. `ran` Sam submits `sam@example.com` on /sign_in and sees "Invalid email or
   password" (`docs/traces/sign-in-lowercase-email.md`)

## What should happen

{Each line says where the expectation comes from: user, ticket, spec, or assumed.}

- Sam signs in whatever the case of their email. (user)

## The gap

{Where the two lists disagree, and why, if that's known.}

## Options

### {Short name}

- **Changes for users:** {what someone using the app would notice}
- **Costs:** {effort, risk, what else it touches}
- **Doesn't fix:** {what stays broken or slow}

## Holes

- {Steps that died, places nobody could reach, citations dropped because they
  didn't hold}

## Traces

- `docs/traces/{slug}.md`
