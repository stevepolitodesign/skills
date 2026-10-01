export const meta = {
  name: 'investigate',
  description: 'Gather what the system does now, then write up the gap and the options',
  phases: [
    { title: 'Gather', detail: 'traces one at a time, readers alongside' },
    { title: 'Write', detail: 'check every citation, then write the investigation' },
  ],
}

const A = args || {}
if (!A.question || !A.slug || !A.skillDir || !Array.isArray(A.steps) || !A.steps.length) {
  throw new Error('investigate: pass {question, slug, skillDir, context, steps: [{kind, brief}]} as args')
}
const odd = A.steps.filter(s => s.kind !== 'trace' && s.kind !== 'explore')
if (odd.length) throw new Error('investigate: step kinds are trace or explore, got ' + odd.map(s => s.kind).join(', '))

const DOC = 'docs/investigations/' + A.slug + '.md'

const CONTEXT =
  'The question being investigated: ' + A.question + '\n\n' +
  'What the user said about it:\n' + (A.context || 'nothing beyond the question')

const BEHAVIOR =
  'Describe behavior, not code: what a person does and what they see, with real ' +
  'values. "Sam signs up as Sam@Example.com, later types sam@example.com, and sees ' +
  'Invalid email or password", not "find_by is case-sensitive". The citation carries ' +
  'the code.'

const READ_SCHEMA = {
  type: 'object',
  properties: {
    findings: { type: 'array', items: { type: 'object', properties: {
      claim: { type: 'string' },
      citation: { type: 'string' },
    }, required: ['claim', 'citation'] } },
    unreached: { type: 'string' },
  },
  required: ['findings', 'unreached'],
}

const TRACE_SCHEMA = {
  type: 'object',
  properties: {
    path: { type: 'string' },
    ran: { type: 'boolean' },
    headline: { type: 'string' },
    surprises: { type: 'array', items: { type: 'string' } },
    holes: { type: 'string' },
  },
  required: ['path', 'ran', 'headline'],
}

const traces = A.steps.filter(s => s.kind === 'trace')
const reads = A.steps.filter(s => s.kind === 'explore')

phase('Gather')

const read = (step, i) => agent(
  CONTEXT + '\n\nYour part: ' + step.brief + '\n\n' +
  'Read only. Run nothing that writes, installs, or starts a process: a trace may be ' +
  'running against this app while you read.\n\n' +
  'Every finding gets a citation someone can open, <file>:<line> or a commit sha. ' +
  BEHAVIOR + '\n\n' +
  'Say in `unreached` what you did not get to. An empty findings list is a real ' +
  'answer if you looked and nothing is there; say so in `unreached`, or it reads ' +
  'the same as a step that never looked.',
  { label: 'explore:' + (i + 1), phase: 'Gather', schema: READ_SCHEMA }
)

// One at a time: traces share the development database and ports.
async function traceAll() {
  const out = []
  for (let i = 0; i < traces.length; i++) {
    out.push(await agent(
      'Invoke the `trace` skill with this scenario: ' + traces[i].brief + '\n\n' +
      CONTEXT + '\n\n' +
      'The trace skill ends by replying with a path and three bullets. Return those in ' +
      '`path`, `headline`, `surprises` and `holes` instead. Set `ran` false if nothing ' +
      'executed and the trace was written from reading.',
      { label: 'trace:' + (i + 1), phase: 'Gather', schema: TRACE_SCHEMA }
    ))
  }
  return out
}

const [readResults, traceResults] = await Promise.all([
  parallel(reads.map((s, i) => () => read(s, i))),
  traceAll(),
])

const gathered = {
  traces: traces.map((s, i) => ({ brief: s.brief, result: traceResults[i] })),
  explores: reads.map((s, i) => ({ brief: s.brief, result: readResults[i] })),
}
const deadSteps = gathered.traces.concat(gathered.explores).filter(s => !s.result).map(s => s.brief)
if (deadSteps.length) log(deadSteps.length + ' step(s) died and checked nothing: ' + deadSteps.join('; '))

if (deadSteps.length === A.steps.length) {
  return { haltedAt: 'Gather', reason: 'every step died, so nothing was gathered', deadSteps: deadSteps }
}

phase('Write')

const doc = await agent(
  'Write up an investigation for a developer who wants to understand the behavior, ' +
  'not the implementation.\n\n' + CONTEXT + '\n\n' +
  'Read ' + A.skillDir + '/assets/investigation-template.md and fill it in. Save it to ' +
  DOC + ' at the repo root, creating the directory if needed. Commit nothing.\n\n' +
  'Before you use a finding, open its citation. Drop any that does not hold and list ' +
  'it under Holes. The user reads this doc instead of the code, so a wrong claim ' +
  'here gets believed. Read each trace file in full; its ran/read/stubbed marks ' +
  'carry over line for line.\n\n' +
  'Expected behavior comes from people, not code. Take it from what the user said, ' +
  'or a ticket or spec they named. Where nobody said, write it as assumed so they ' +
  'can correct it.\n\n' +
  'Cause is `established` only if a trace ran into it or a cited line plainly ' +
  'produces the reported behavior. `suspected` if the code allows it but nothing ' +
  'showed it happening. `unknown` otherwise, and then the first option is how to ' +
  'find out.\n\n' +
  'Two or three options. Each says what changes for someone using the app, what it ' +
  'costs, and what it does not fix. No code, no plan.\n\n' +
  BEHAVIOR + '\n\n' +
  (deadSteps.length ? 'These steps died and checked nothing. Name them under Holes: ' +
    deadSteps.join('; ') + '\n\n' : '') +
  'What was gathered:\n' + JSON.stringify(gathered, null, 2),
  { label: 'write', phase: 'Write', schema: {
    type: 'object',
    properties: {
      path: { type: 'string' },
      headline: { type: 'string' },
      cause: { type: 'string', enum: ['established', 'suspected', 'unknown'] },
      holes: { type: 'array', items: { type: 'string' } },
    },
    required: ['path', 'headline', 'cause', 'holes'],
  } }
)

if (!doc) {
  return { haltedAt: 'Write', reason: 'the write-up agent died; the findings are below', deadSteps: deadSteps, gathered: gathered }
}

return {
  doc: doc.path,
  headline: doc.headline,
  cause: doc.cause,
  holes: doc.holes,
  deadSteps: deadSteps,
  traces: gathered.traces.filter(t => t.result).map(t => t.result.path),
}
