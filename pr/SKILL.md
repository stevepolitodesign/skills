---
name: pr
description: Open a pull request whose description you write yourself, with a suggested title and a light proofread.
argument-hint: "[base branch, optional]"
---

# PR

The LLM wrote the commits. The user owns the feature, so the user writes the
description. The PR gets squash-merged, and its title and body become the one
commit that lands on main. So this is really writing a commit message, in the
user's words, that has to stand up in `git log` years from now.

Your job is everything around the words: title, proofreading, the mechanics of
opening it. The failure to avoid is drafting the description yourself. Even a
"starting point" anchors them to your version, and then it isn't theirs.

```
recon --> brief + title --> user writes --> proof --> sign-off --> open
                             ^                        |
                             +------ changes ---------+
```

Arguments start with `--auto`? Nobody will write or approve the description.
Read [Autonomous mode](#autonomous-mode) first; it replaces steps 2 through 6.

## 1. Recon

Base branch is `$ARGUMENTS` (minus `--auto`), or the repo default (`gh repo view --json
defaultBranchRef`, falling back to `main`).

Read, don't ask:

- `git status`. Uncommitted changes or sitting on the base branch: stop and say
  so. Committing and branching are other jobs.
- `git log <base>..HEAD` and `git diff <base>...HEAD --stat`. What the branch
  does, so you can title it and later check their description against it.
- House style: `gh pr list --state merged --limit 15 --json title`, plus
  `git log <base> --oneline -20` for repos without `gh` history. Look at mood
  ("Add" vs "Added"), prefixes (`feat:`, `[JIRA-123]`), capitalization, how code
  names are marked (backticks?), length.

If `gh` isn't available, say which checks you skipped and carry on with git.

## 2. Brief them

The user didn't write this code, and they're about to put their name on a
description of it. Before they write, give them a fast read of what they're
describing — a two-minute version of `/diff-explainer`, in chat, no artifact.

Start from the commits: subjects and bodies are the cheapest source, and the
LLM that wrote them often left its reasoning there. Then skim `git diff
<base>...HEAD` to check the commits against the code and find what they left
out. Skip generated files and lockfiles.

Three short groups, fragments not sentences, a handful of bullets total:

- **Changed** — behavior, not files. "Guests can check out without an
  account; orders store an email instead of a user," not "edited
  `orders_controller.rb`."
- **Risks** — what could break or bite later. A test that asserts nothing, a
  callback that now fires on every save, a query that grows with the table, a
  deploy-order problem (code that reads a column before the migration runs).
- **Tradeoffs** — the choices the code made, and the obvious alternative it
  didn't take. Polling over webhooks, a JSON column over a join table.

Only what the code or commits show. Don't guess at why; a wrong reason is
worse than none, because the user may repeat it in the description. Leave a
group out if there's nothing real to put in it. A trivial branch (a copy
change, a version bump) gets one line.

Keep it as notes, not paragraphs. Prose here turns into their description.

## 3. Suggest a title, ask for the description

Same message as the brief:

- A suggested title in the house style. Imperative, under ~65 characters,
  since GitHub appends ` (#123)` and it becomes a commit subject. Name the
  observable change, not the mechanism. Offer one alternate at most.
- Ask them to write the description. Mention the useful questions a squash
  commit should answer, briefly: why this change, why this way, anything a
  future reader would trip on.

Then stop and wait. Don't draft a description, a template, or an example.

If they hand back notes or fragments and say "clean this up", that's their
content, so turning it into sentences is fine. If they ask you to write it from
scratch, remind them once that the skill exists so the description is theirs,
then do what they say.

## 4. Proof

Fix what's wrong, leave what's theirs. Wrong means typos, grammar, broken
markdown, unclear sentences, a code name that should be in backticks. Theirs
means word choice, tone, structure, length, opinions, humor. A proofread that
reads like you wrote it has failed, even if every sentence got "better".

Also:

- **Check claims against the diff.** "Emails the customer a receipt" with
  no mailer in the diff is a problem. Flag it; don't fix it. They may know
  something the diff doesn't show, or the branch may be missing a commit.
- **Wrap prose at 72 columns.** It becomes a commit body. Leave code blocks,
  tables, and URLs alone.
- **Don't add sections, headers, summaries, or a closing line.**
- **Don't add attribution.** No co-author trailer, since GitHub copies the
  branch commits' trailers into the squash commit already. No "Generated with"
  line either; the description isn't generated.

If it's already clean, say so and change nothing. Churn on good prose is the
opposite of help.

## 5. Sign-off

Show:

- What you changed, as a short list (`teh` → `the`, wrapped lines, backticked
  `User#email`). Not a diff of every line.
- Anything you flagged and didn't change.
- The final title and body exactly as they'll be sent, in a fenced block.

Ask for a yes. Any edit they request, apply it and show the full final version
again. The yes has to be to the exact text that goes out; approving "the title
change" isn't approving the body you haven't re-shown.

## 6. Open

Only after a yes to the text you last showed.

Push if the branch has no upstream (`git push -u origin HEAD`). Write the body
to a temp file and pass it with `--body-file`, so backticks and newlines
survive the shell:

```
gh pr create --base <base> --title "<title>" --body-file <tmpfile>
```

Reply with the PR URL.

## Autonomous mode

Only when the arguments start with `--auto`. Nobody is there: a human finds
the draft PR later, rewrites the description, and marks it ready. Without
`--auto`, ignore this section.

You write the description, since nobody else will. It does
`/diff-explainer`'s job as a PR: the why, not the what. Read its steps 3 and 4
(`../diff-explainer/SKILL.md`) for what earns a note and the rule against
inventing rationale. Short beats thorough; a reviewer skims a long PR.

- **Recon as in step 1.** Uncommitted changes or on the base branch: stop, and
  make the reply say why.
- **Gather the why.** Commit bodies, then a SPEC the branch adds or names,
  then the diff. A reason none of them state is "not recorded", never a guess.
- **Body: why, and where to start.** Why the change exists, with its source
  (commit sha or SPEC path). Which file to read first. Wrap at 72.
- **Notes go on the lines.** Each risk, tradeoff, or open question becomes an
  inline comment on the line it's about, starting `**Risk:**`,
  `**Tradeoff:**`, or `**Open question:**`. One to two sentences. Most
  branches get two to four; a typo fix gets none.
- **Screenshots when the diff changes what a user sees.** Boot the app and
  capture each changed screen with whatever browser tool you have. Can't boot
  it, or no browser: say so in the body. Never mock one up.
- **Have it checked.** One fresh subagent gets the body, the notes, and the
  base branch, and reads the diff itself. Ask for: claims the diff doesn't
  back, a why with no source, a risk you missed, and any note that would
  still be true with the diff hidden. Skip wording. Fix once.
- **Title** as in step 3.

The body:

~~~
```markdown
{why, one to three sentences} ({source})

Start with `{path}`.

{screenshots, or "No screenshots: {reason}". Leave out for no UI change.}
```
~~~

### Open it

Push (`git push -u origin HEAD`), whatever the host: the remote needs every
commit before anyone can open or review a PR from it. Then, on GitHub with
`gh`:

```bash
gh pr create --draft --base <base> --title "<title>" --body-file <tmpfile>
```

Screenshots can't go on the PR branch, or the squash lands them on main. Put
them on their own branch without touching the working tree, then link them in
the body (`gh pr edit <n> --body-file`):

```bash
blob=$(git hash-object -w shot.png)
tree=$(printf '100644 blob %s\tshot.png\n' "$blob" | git mktree)
sha=$(git commit-tree "$tree" -m "Screenshots for <branch>")
git push origin "${sha}:refs/heads/pr-screenshots/<branch>"
# ![Invoice list](https://github.com/<owner>/<repo>/blob/<sha>/shot.png?raw=true)
```

Inline notes go up as one review, so the PR gets one notification, not ten:

```bash
gh api repos/{owner}/{repo}/pulls/<n>/reviews --input review.json
# {"event": "COMMENT", "commit_id": "<head sha>", "comments": [
#   {"path": "app/models/order.rb", "line": 4, "side": "RIGHT",
#    "body": "**Risk:** ..."}]}
```

`line` has to be a line in the diff, numbered in the new file.

Not GitHub, no CLI, or a call fails: don't look for a workaround. The reply
is the handoff.

The reply: the PR URL, or why it wasn't opened plus the title and body in a
fenced block. Any notes that didn't get posted go there too, as `path:line`
bullets, ready to paste. Then what the check changed, one line each.
