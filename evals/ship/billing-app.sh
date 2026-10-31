#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/../implement-with-tdd/billing-app.sh"

branch_off() {
  git remote add origin git@github.com:acme/billing.git
  git update-ref refs/remotes/origin/main main
  git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/main
  git checkout -q -b "$1"
}
