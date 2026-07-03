# Scheduler Reference

## Overview

The scheduler is an in-container cron runner started by `start-pi.sh`. It watches:

```text
/workspace/scheduler/crontab
```

Edits to that file are picked up automatically. No container restart is required.

Logs are written to:

```text
/workspace/scheduler/logs/scheduler.log
```

Reusable scripts belong in:

```text
/workspace/scheduler/jobs
```

## Schedule Format

Supported entries:

```cron
*/5 * * * * bash /workspace/scheduler/jobs/example-shell-job.sh
0 9 * * * cd /workspace && pi -p "Summarize today's queued reminders."
@every 15m bash /workspace/scheduler/jobs/check-email.sh
@hourly cd /workspace && pi -p "Check scheduled objectives."
```

Supported aliases:

```text
@every <Ns|Nm|Nh|Nd>
@hourly
@daily
@weekly
@monthly
```

The scheduler runs commands with `bash -lc` from `/workspace`. It skips a job if the previous run of the same crontab line is still active.

## Job Types

Use a shell script when the task needs multiple steps, external CLIs, state files, cleanup, retries, or readable logs.

Use inline `pi -p` when the task is mostly an LLM prompt and does not need much shell logic:

```cron
0 9 * * * cd /workspace && pi -p "Review /workspace/scheduler/state/inbox.md and decide whether Brady needs a Telegram update."
```

For LLM jobs that need setup or cleanup, create a shell script that calls `pi -p`:

```bash
#!/usr/bin/env bash
set -euo pipefail

cd /workspace
pi -p "Do the scheduled task."
```

Make scripts executable when practical:

```bash
chmod +x /workspace/scheduler/jobs/my-job.sh
```

Cron entries may still call scripts through `bash`, so executable mode is helpful but not required.

## One-Off Jobs

For a one-off job, the job must remove or disable its own crontab entry after it succeeds. Prefer a unique marker comment around the entry:

```cron
# BEGIN one-off:send-reminder-2026-07-04
30 14 4 7 * bash /workspace/scheduler/jobs/send-reminder-2026-07-04.sh
# END one-off:send-reminder-2026-07-04
```

Then the script can remove that block:

```bash
tmp="$(mktemp)"
sed '/# BEGIN one-off:send-reminder-2026-07-04/,/# END one-off:send-reminder-2026-07-04/d' \
  /workspace/scheduler/crontab > "$tmp"
cat "$tmp" > /workspace/scheduler/crontab
rm -f "$tmp"
```

Only remove the schedule after the task has completed successfully. If failure should stop retries, remove the entry in the failure path intentionally and log why.

## State

Use `/workspace/scheduler/state` for job state files, cursors, last-run records, and small queues. Do not store secrets there unless the host repository is private and ignored appropriately.

## Current Limitations

- Scheduled LLM jobs run as fresh `pi -p` processes.
- Targeting an existing interactive Telegram conversation is not currently supported by this scheduler.
- If a scheduled job should notify the user, make the script or prompt use whatever notification path is available in the environment.

## Checklist

1. Decide whether the job is recurring or one-off.
2. Decide whether it is shell-only, LLM-only, or a shell script that invokes `pi -p`.
3. Create or update scripts under `/workspace/scheduler/jobs` when needed.
4. Add the schedule to `/workspace/scheduler/crontab`.
5. For one-off jobs, include self-removal logic.
6. Check `/workspace/scheduler/logs/scheduler.log` after the scheduled run.
