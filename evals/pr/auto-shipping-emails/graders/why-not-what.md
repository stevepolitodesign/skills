---
type: llm
---

Judge only the PR body, the description the reply hands back, usually in a fenced block. Line notes tied to a file and line aren't the body.

PASS if the PR body explains why the change exists and stays short, under about 15 lines of prose. A sentence on what changes for customers or staff is fine.

FAIL if the body walks through what changed file by file, lists the files or methods added, or repeats what the diff already shows.
