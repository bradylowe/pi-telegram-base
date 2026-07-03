#!/usr/bin/env bash
set -euo pipefail

if [[ "${PI_SCHEDULER_ENABLED:-1}" == "0" ]]; then
  exit 0
fi

SCHEDULER_DIR="${PI_SCHEDULER_WORKDIR:-/workspace/scheduler}"
RUNNER="${PI_SCHEDULER_RUNNER:-$SCHEDULER_DIR/agent-cron-runner.js}"
PIDFILE="${PI_SCHEDULER_PIDFILE:-/tmp/pi-agent-scheduler.pid}"
LOG_DIR="${PI_SCHEDULER_LOG_DIR:-$SCHEDULER_DIR/logs}"
LOG_FILE="${PI_SCHEDULER_LOG_FILE:-$LOG_DIR/scheduler.log}"

if [[ ! -f "$RUNNER" ]]; then
  echo "Pi scheduler runner not found at $RUNNER; scheduler disabled." >&2
  exit 0
fi

mkdir -p "$LOG_DIR"

if [[ -f "$PIDFILE" ]]; then
  PID="$(cat "$PIDFILE" 2>/dev/null || true)"
  if [[ -n "$PID" ]] && kill -0 "$PID" 2>/dev/null; then
    exit 0
  fi
fi

nohup node "$RUNNER" >>"$LOG_FILE" 2>&1 &
echo "$!" > "$PIDFILE"
