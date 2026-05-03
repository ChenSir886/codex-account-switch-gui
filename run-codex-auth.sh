#!/bin/zsh
set -euo pipefail

export PATH="/Applications/Codex.app/Contents/Resources:/opt/homebrew/bin:/usr/local/bin:$PATH"

DIR="$(cd "$(dirname "$0")" && pwd)"

if [[ -x "$DIR/node_modules/.bin/codex-auth" ]]; then
  exec "$DIR/node_modules/.bin/codex-auth" "$@"
fi

exec npx -y @loongphy/codex-auth "$@"
