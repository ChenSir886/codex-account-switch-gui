#!/bin/zsh
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

export PATH="/Applications/Codex.app/Contents/Resources:/opt/homebrew/bin:/usr/local/bin:$PATH"

open "http://localhost:4185" >/dev/null 2>&1 || true
if /usr/sbin/lsof -tiTCP:4185 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Codex Account Switch GUI is already running at http://localhost:4185"
  exit 0
fi

npm run gui
