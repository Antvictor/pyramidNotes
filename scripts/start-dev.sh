#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck source=/dev/null
  . "$HOME/.nvm/nvm.sh"
  nvm use
else
  echo "nvm is not available at $HOME/.nvm/nvm.sh"
  echo "Install nvm or run: nvm use && npm start"
  exit 1
fi

npm start
