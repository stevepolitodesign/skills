export const meta = {
  name: 'ship',
  description: 'Take a SPEC from prepare through TDD, review, verification, and a walkthrough',
  phases: [
    { title: 'Prepare', detail: 'identify a preparatory refactor, then make it' },
    { title: 'Implement', detail: 'drive the SPEC out with TDD' },
    { title: 'Review', detail: 'five lenses in parallel, then synthesize and fix' },
    { title: 'Verify', detail: 'run the real app against the criteria' },
    { title: 'Explain', detail: 'publish the walkthrough artifact' },
  ],
}

const SPEC = args && args.spec
if (!SPEC) throw new Error('ship: pass {spec: "<path to the SPEC>"} as args')

const COMMIT =
  'Then commit with git. The message says why the change was made, not what changed. ' +
  'Commit only what this step produced.'

const NO_NESTING =
  'You have no tool for spawning subagents. Where the skill says to dispatch them, ' +
  'follow its own stated fallback and say in your report that you did, so nobody ' +
  'reads a timeboxed skim as a full sweep.'

// Everything the run has established so far. Every halt carries this out, because a
// halt is where a human picks the work up by hand and the reports are all they get.
const sofar = { spec: SPEC, suiteGreen: null }

function halt(phaseName, reason) {
  log('Halted at ' + phaseName + ' — ' + reason)
  return Object.assign({ haltedAt: phaseName, reason: reason }, sofar)
}

// ---------------------------------------------------------------- Prepare

phase('Prepare')

const prep = await agent(
  'Invoke the `preparatory-refactor` skill with this SPEC as its argument: ' + SPEC + '\n\n' +
  NO_NESTING + '\n\n' +
  'The skill is right that you identify and do not edit. Change nothing. Nobody is ' +
  'watching this run, so there is no one to show the naive diff to — write it, use ' +
  'it, and fold what it proves into the report.\n\n' +
  'Return the report verbatim in `report`, and the moves you would defend.',
  { label: 'prepare:identify', phase: 'Prepare', schema: {
    type: 'object',
    properties: {
      report: { type: 'string' },
      moves: { type: 'array', items: { type: 'object', properties: {
        move: { type: 'string' },
        confidence: { type: 'number' },
      }, required: ['move', 'confidence'] } },
      testCommand: { type: 'string' },
    },
    required: ['report', 'moves'],
  } }
)

if (!prep) {
  // Distinct from "it found nothing". Saying "no move cleared the bar" here would be a
  // claim about the repo made by a run where nobody looked at it.
  return halt('Prepare', 'the preparatory-refactor agent returned nothing — the repo was never assessed')
}

sofar.preparatoryReport = prep.report

const justified = (prep.moves || []).filter(m => m.confidence >= 80)
let made = null

if (justified.length) {
  log(justified.length + ' preparatory move(s) cleared the bar — making them')
  made = await agent(
    'Make this behavior-preserving refactor. It was proposed by a session that could ' +
    'not edit code, and you are not that session — if the move turns out not to be ' +
    'behavior-preserving once you are in the files, stop and say so rather than ' +
    'reshaping it into something that is. Set `made` false and name the reason; ' +
    'stopping is a real result here and the run records it.\n\n' +
    prep.report + '\n\n' +
    'The suite that covers the site: ' + (prep.testCommand || 'find it yourself') + '. ' +
    'It passes now and passes after, unchanged. A move that needs a new test is the ' +
    'feature, not preparation — stop there.\n\n' + COMMIT,
    { label: 'prepare:refactor', phase: 'Prepare', schema: {
      type: 'object',
      properties: {
        report: { type: 'string' },
        made: { type: 'boolean' },
        movesMade: { type: 'array', items: { type: 'string' } },
        stopReason: { type: 'string' },
        suiteGreen: { type: 'boolean' },
      },
      required: ['report', 'made', 'suiteGreen'],
    } }
  )

  if (!made) {
    return halt('Prepare', 'the refactor agent was skipped or died — the tree may hold a ' +
                'partial refactor, so check it before rerunning')
  }
  if (!made.made) {
    return halt('Prepare', 'the refactor was not made: ' + (made.stopReason || 'no reason given'))
  }
  if (made.suiteGreen === false) {
    return halt('Prepare', 'the suite is red after a refactor that was supposed to be ' +
                'behavior-preserving — that is the one thing it promised')
  }
  sofar.preparatoryMoves = made.movesMade || justified.map(m => m.move)
} else {
  log('The preparatory pass found no move worth defending — going straight to the feature')
  sofar.preparatoryMoves = []
}

// -------------------------------------------------------------- Implement

phase('Implement')

const impl = await agent(
  'Invoke the `implement-with-tdd` skill with this SPEC as its argument: ' + SPEC + '\n\n' +
  'One deviation from the skill, and only one: it tells you to leave everything ' +
  'uncommitted. Commit instead — a later step diffs against what you left. ' + COMMIT + '\n\n' +
  'Its stop conditions still hold. Nobody is watching this run, so a stop you cannot ' +
  'resolve alone is a stop: set `stopped` and name what you would have asked. Do not ' +
  'decide a scope question by starting.\n\n' +
  '`suiteGreen` is the one machine-checkable fact this whole chain produces. Report it ' +
  'honestly, including a failure in code you never touched — say so in the report, but ' +
  'do not round it up to true.',
  { label: 'implement:tdd', phase: 'Implement', schema: {
    type: 'object',
    properties: {
      report: { type: 'string' },
      stopped: { type: 'boolean' },
      stopReason: { type: 'string' },
      criteriaUnbuilt: { type: 'array', items: { type: 'string' } },
      suiteGreen: { type: 'boolean' },
    },
    required: ['report', 'stopped', 'suiteGreen'],
  } }
)

if (!impl) return halt('Implement', 'the implementation agent returned nothing')

sofar.implementationReport = impl.report
sofar.criteriaUnbuilt = impl.criteriaUnbuilt || []
sofar.suiteGreen = impl.suiteGreen

if (impl.stopped) {
  return halt('Implement', impl.stopReason || 'the implementation stopped without naming a reason')
}
if (sofar.criteriaUnbuilt.length) {
  log(sofar.criteriaUnbuilt.length + ' criteria left unbuilt — the review and the ' +
      'walkthrough below cover a partial SPEC')
}

// ----------------------------------------------------------------- Review

phase('Review')

const target = await agent(
  'Invoke the `review` skill, then carry out step 1 only — fix the target. Stop before ' +
  'the intent step and before dispatch; five reviewers run after you and they need the ' +
  'diff you capture.\n\n' +
  'The target is the working tree against its base. Capture the diff to a temp file ' +
  'exactly as the skill says, including the staging dance for untracked files.\n\n' +
  'The skill tells you to ask when the base will not resolve. Nobody is here to ask, ' +
  'and the failure it warns about is silent — the substitution collapses `git diff ' +
  '$base` into unstaged changes only, which is empty on a tree where every step has ' +
  'committed. So if the base ladder comes back empty, set `baseUnresolved` and stop ' +
  'rather than proceeding on a bare diff.\n\n' +
  'Report `lines` as the length of the captured diff. Return the review skill\'s own ' +
  'absolute base directory in `skillDir`.',
  { label: 'review:target', phase: 'Review', schema: {
    type: 'object',
    properties: {
      diffPath: { type: 'string' },
      mergeBase: { type: 'string' },
      skillDir: { type: 'string' },
      empty: { type: 'boolean' },
      baseUnresolved: { type: 'boolean' },
      lines: { type: 'number' },
    },
    required: ['diffPath', 'mergeBase', 'skillDir', 'empty', 'baseUnresolved', 'lines'],
  } }
)

if (!target) return halt('Review', 'the review-target agent returned nothing — the diff was never captured')
if (target.baseUnresolved) {
  return halt('Review', 'no base branch resolved, so there is nothing to diff against. ' +
              'The repo has no origin/HEAD, origin/main, or origin/master — say which ' +
              'branch to diff against and rerun')
}
if (target.empty) {
  return halt('Review', 'the captured diff is empty. Every step commits, so this means ' +
              'the implementation produced no change, not that work is uncommitted')
}
if (target.lines > 1500) {
  // review/SKILL.md's own ceiling. Past it the agents review the first part and report
  // nothing to say they stopped, which reads exactly like a clean pass.
  return halt('Review', 'the diff is ' + target.lines + ' lines, past the 1500 the review ' +
              'skill will read. Five reviewers handed more than that silently review the ' +
              'front of it. Review by commit range instead')
}

const LENSES = ['defects', 'spec-fidelity', 'conventions', 'domains', 'compatibility']

const FINDINGS = {
  type: 'object',
  properties: {
    findings: { type: 'array', items: { type: 'object', properties: {
      claim: { type: 'string' },
      locator: { type: 'string' },
      confidence: { type: 'number' },
      evidence: { type: 'string' },
      cost: { type: 'string' },
      fix: { type: 'string' },
    }, required: ['claim', 'locator', 'confidence', 'evidence'] } },
    ranWithNothingToCheck: { type: 'string' },
  },
  required: ['findings'],
}

const reviews = await parallel(LENSES.map(lens => () => agent(
  'Read ' + target.skillDir + '/agents/' + lens + '.md and act only as that reviewer. ' +
  'Read no other file in that skill — its dispatch and synthesis steps are not yours, ' +
  'and they describe git commands that would write to a tree you are reviewing.\n\n' +
  'Wherever that file writes {skill_dir}, it means: ' + target.skillDir + '\n\n' +
  'The diff, already captured so every reviewer reads the same one: ' + target.diffPath + '\n' +
  'The acceptance criteria the change was measured against: ' + SPEC + '\n\n' +
  'Read the whole diff and whole files around it, not excerpts.\n\n' +
  (lens === 'defects'
    ? 'Your agent file states its own tool allowlist. It is tighter than the one the ' +
      'other four reviewers get, and it governs — follow it as written.\n\n'
    : 'Read and report only — no command that writes, stages, or checks anything out, ' +
      'and no fixing a finding instead of filing it.\n\n') +
  'Findings only. No summary, no verdict, nothing about how the run went. The one ' +
  'exception is `ranWithNothingToCheck`: if what you were handed is missing or empty, ' +
  'say so there. An empty findings list otherwise means you looked and found nothing, ' +
  'and the two must not look alike.',
  { label: 'review:' + lens, phase: 'Review', schema: FINDINGS }
)))

const roster = LENSES.map((lens, i) => ({
  lens: lens,
  ran: !!reviews[i],
  blocked: (reviews[i] && reviews[i].ranWithNothingToCheck) || null,
  findings: (reviews[i] && reviews[i].findings) || [],
}))

const dead = roster.filter(r => !r.ran)
if (dead.length) {
  log(dead.length + ' of 5 reviewers died — ' + dead.map(r => r.lens).join(', ') +
      ' went unchecked, and the report will say so')
}

const reviewed = await agent(
  'You are synthesizing a code review, then fixing what it found.\n\n' +
  'Invoke the `review` skill and follow step 4 — synthesize — against the roster ' +
  'below. Its dropping rules are the point: check every cited path against the ' +
  'merge-base ' + target.mergeBase + ', drop a finding whose evidence line is missing, ' +
  'move a misfiled one rather than dropping it, and keep the collisions it tells you ' +
  'to keep.\n\n' +
  'The roster carries a `ran` flag per lens. A lens with `ran: false` died and checked ' +
  'nothing; a lens with `blocked` set ran with nothing to check. Both are different ' +
  'from a lens that looked and found nothing, and step 4 opens by telling you to say ' +
  'so up front — a review missing a pass looks identical to one that passed it unless ' +
  'you name the difference.\n\n' +
  'Then step 5, with one deviation: there is nobody here to ask which findings to ' +
  'apply. Apply what you file under Defects and under Compatibility — those two cost ' +
  'something the moment this ships, which is why step 4 sorts them first. Leave ' +
  'Conventions, Domains and Fidelity for the human; those are judgment calls the ' +
  'author gets to make. Apply one at a time and stop on any fix that turns out bigger ' +
  'than its finding described. Say in `report` which you applied and which you left.\n\n' +
  'Run the suite after and report `suiteGreen` honestly. ' + COMMIT + '\n\n' +
  'Roster:\n' + JSON.stringify(roster, null, 2),
  { label: 'review:synthesize', phase: 'Review', schema: {
    type: 'object',
    properties: {
      report: { type: 'string' },
      applied: { type: 'array', items: { type: 'string' } },
      left: { type: 'array', items: { type: 'string' } },
      suiteGreen: { type: 'boolean' },
    },
    required: ['report', 'suiteGreen'],
  } }
)

if (!reviewed) return halt('Review', 'the synthesis agent returned nothing — five lenses ran and their findings are lost')

sofar.reviewReport = reviewed.report
sofar.reviewApplied = reviewed.applied || []
sofar.reviewLeft = reviewed.left || []
sofar.lensesUnchecked = dead.map(r => r.lens)
sofar.suiteGreen = reviewed.suiteGreen

// ----------------------------------------------------------------- Verify

phase('Verify')

const verified = await agent(
  'Invoke the `run` skill and drive this project\'s real app against the acceptance ' +
  'criteria in ' + SPEC + '. Passing tests are not the claim being checked here — ' +
  'reach the behavior the way a user would.\n\n' +
  (sofar.suiteGreen === false
    ? 'The suite is currently RED. Find out whether that is yours to fix or predates ' +
      'this branch, and say which in the report.\n\n' : '') +
  (sofar.criteriaUnbuilt.length
    ? 'These criteria were never built, so do not go looking for them: ' +
      sofar.criteriaUnbuilt.join('; ') + '\n\n' : '') +
  'Fix what is broken, then commit. The message says why the change was made, not ' +
  'what changed. Report `suiteGreen` after any fix.\n\n' +
  'If the app cannot be started from the repo\'s documented setup, say that plainly ' +
  'and set `ran` false. A verification that never ran and a verification that passed ' +
  'look identical in a summary unless you name the difference.',
  { label: 'verify:app', phase: 'Verify', schema: {
    type: 'object',
    properties: {
      ran: { type: 'boolean' },
      report: { type: 'string' },
      criteriaConfirmed: { type: 'array', items: { type: 'string' } },
      fixed: { type: 'array', items: { type: 'string' } },
      suiteGreen: { type: 'boolean' },
    },
    required: ['ran', 'report'],
  } }
)

if (verified) {
  sofar.verificationReport = verified.report
  sofar.verified = verified.ran
  if (typeof verified.suiteGreen === 'boolean') sofar.suiteGreen = verified.suiteGreen
  if (!verified.ran) log('The app was never driven — the criteria are unconfirmed outside the suite')
} else {
  sofar.verified = false
  log('The verify agent returned nothing — the criteria are unconfirmed outside the suite')
}

if (sofar.suiteGreen === false) {
  log('The suite is red going into the walkthrough — the artifact will say so')
}

// ---------------------------------------------------------------- Explain

phase('Explain')

const walkthrough = await agent(
  'Invoke the `diff-explainer` skill against the current branch and publish the ' +
  'artifact.\n\n' +
  'You did not write this code and the session that did is gone, so its rule about ' +
  'never inventing rationale is the one that matters most here. What you have is the ' +
  'SPEC at ' + SPEC + ', the commits, and the reports below. Where none of them ' +
  'records a why, leave it unannotated rather than reconstructing one — the diff will ' +
  'always look like it justifies itself.\n\n' +
  (sofar.suiteGreen === false
    ? 'STATE OF THE BRANCH: the suite is RED. That is a risk the watch list has to ' +
      'carry, whatever the diff looks like.\n\n' : '') +
  (sofar.verified === false
    ? 'STATE OF THE BRANCH: nobody drove the running app. The criteria are unconfirmed ' +
      'outside the suite.\n\n' : '') +
  (sofar.criteriaUnbuilt.length
    ? 'DELIBERATELY NOT DONE, which the skill says belongs in "Start here": ' +
      sofar.criteriaUnbuilt.join('; ') + '\n\n' : '') +
  (sofar.lensesUnchecked.length
    ? 'UNREVIEWED: these review lenses never ran — ' + sofar.lensesUnchecked.join(', ') +
      '\n\n' : '') +
  'Preparatory refactoring:\n' + (prep.report || 'none') + '\n\n' +
  'Implementation:\n' + (impl.report || '') + '\n\n' +
  'Review:\n' + (sofar.reviewReport || 'did not complete') + '\n\n' +
  'Verification:\n' + (sofar.verificationReport || 'did not complete') + '\n\n' +
  'The skill tells you to tell the user directly if you find a real bug while writing ' +
  'up, rather than burying it in a note they may skim. Nobody is reading this as you ' +
  'work, so `bugsFound` is that channel — it is surfaced above the artifact link.\n\n' +
  'Return the published artifact URL.',
  { label: 'explain:walkthrough', phase: 'Explain', schema: {
    type: 'object',
    properties: {
      artifactUrl: { type: 'string' },
      name: { type: 'string' },
      bugsFound: { type: 'array', items: { type: 'string' } },
    },
    required: ['artifactUrl'],
  } }
)

if (!walkthrough) return halt('Explain', 'the walkthrough agent returned nothing — the work is committed but unexplained')

return Object.assign({}, sofar, {
  walkthrough: walkthrough.artifactUrl,
  walkthroughName: walkthrough.name,
  bugsFound: walkthrough.bugsFound || [],
})
