---
description: The user's CLAUDE.md points at PRs they wrote. Run unattended, the skill writes the body in that voice without borrowing claims from the samples.
max_turns: 60
timeout_seconds: 1200
allowed_tools: [Read, Glob, Grep, Bash, Skill, Agent, Write, AskUserQuestion]
---

Run /pr --auto on this branch. Nobody is watching; your reply gets posted to the team channel.
