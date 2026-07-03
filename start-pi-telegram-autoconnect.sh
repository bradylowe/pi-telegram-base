#!/usr/bin/env bash
set -euo pipefail

if [[ "${PI_TELEGRAM_AUTOCONNECT:-1}" == "0" ]]; then
  exit 0
fi

SESSION="${PI_TMUX_SESSION:-pi}"
AGENT_DIR="${PI_CODING_AGENT_DIR:-$HOME/.pi/agent}"
TELEGRAM_CONFIG="$AGENT_DIR/telegram.json"
TELEGRAM_PACKAGE="$AGENT_DIR/npm/node_modules/@llblab/pi-telegram"
DELAY_SECONDS="${PI_TELEGRAM_AUTOCONNECT_DELAY_SECONDS:-5}"

if [[ ! -d "$TELEGRAM_PACKAGE" || ! -f "$TELEGRAM_CONFIG" ]]; then
  exit 0
fi

if ! jq -e '.botToken and (.botToken | type == "string") and ((.botToken | length) > 0)' "$TELEGRAM_CONFIG" >/dev/null; then
  exit 0
fi

(
  sleep "$DELAY_SECONDS"
  if tmux has-session -t "$SESSION" 2>/dev/null; then
    tmux send-keys -t "$SESSION" "/telegram-connect" Enter
  fi
) >/tmp/pi-telegram-autoconnect.log 2>&1 &
