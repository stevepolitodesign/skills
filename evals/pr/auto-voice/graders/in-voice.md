---
type: llm
---

The user's `docs/my-prs.md` holds PRs they wrote. Their voice: each body opens with what prompted the change, using phrases like "Now that ...", "Prior to this commit ...", "In an effort to ...", or "Relates to ..."; speaks as "we"; and runs one to three short paragraphs with no headings.

The PR body is the description the reply hands back, usually in a fenced block; a title on its first line is fine. Notes tied to a file and line are not the body. Judge only the body.

PASS if the body reads like the same writer: it opens with what prompted the change in that framing (one of those phrases or a close variant), speaks as "we" (or "us", "our") at least once, and has no headings.

FAIL if it opens straight with what changed, never speaks as "we", "us", or "our", adds headings, or there is no body.
