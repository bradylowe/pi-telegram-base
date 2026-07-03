#!/usr/bin/env bash
set -euo pipefail

SESSION="${PI_TMUX_SESSION:-pi}"
WORKDIR="${PI_WORKDIR:-/workspace}"

mkdir -p "$WORKDIR" "$HOME/.pi/agent"
cd "$WORKDIR"

if ! tmux has-session -t "$SESSION" 2>/dev/null; then
  tmux new-session -d -s "$SESSION" "pi"
fi

exec tmux attach-session -t "$SESSION"
