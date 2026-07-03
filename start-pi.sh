#!/usr/bin/env bash
set -euo pipefail

/usr/local/bin/start-pi-scheduler.sh

exec /usr/local/bin/connect-to-pi-tmux.sh
