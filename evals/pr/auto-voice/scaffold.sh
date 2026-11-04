#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/../shop-app.sh"

git checkout -q main
mkdir -p docs
cat > CLAUDE.md <<'MD'
# Writing

PRs I wrote by hand are in `docs/my-prs.md`. They show how I write.
MD
cat > docs/my-prs.md <<'MD'
# Prepare for `v0.4.0` release

Now that we have a performance improvement, it feels like a good
opportunity to release a new version.

# Prevent filtering labels

Closes #98

Prior to this commit, we were making multiple passes over the
substituted text, resulting in labels being filtered.

This commit substitutes the text on one pass.

# Cache `Mitie::NER` initialization

Initializing `Mitie::NER` is expensive, so we cache it. In an effort to
make it thread-safe, we use a Mutex.

Claude Code helped drive this out, but it was tested in a
production-like environment and worked. The first request was slow, but
subsequent requests were cached.

# Allow NER filtering to be disabled

Relates to this [discussion][1].

NER filtering can be expensive, and requires training data to exist in
deployed environments. Because of this, it may not be possible or
practical to use it. This commit allows those filters to be ignored by
setting `TopSecret.model_path` to `nil`.

[1]: https://github.com/thoughtbot/top_secret/discussions/61
MD
commit -m "Add writing notes"
git checkout -q shipping-emails
git rebase -q main

git init -q --bare .origin.git
echo .origin.git >> .git/info/exclude
git remote set-url origin "$PWD/.origin.git"
git push -q origin main
