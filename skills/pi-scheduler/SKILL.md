---
name: pi-scheduler
description: Use when creating, modifying, deleting, debugging, or reviewing scheduled jobs for the pi-agent in-container cron system, including shell-only jobs, LLM-backed pi -p jobs, one-off reminders, recurring automation, scheduler logs, and job state under /workspace/scheduler.
---

# Pi Scheduler

Use this skill for any work involving scheduled jobs in the `pi-agent` workspace.

The scheduler runs inside the `pi-agent` container and watches:

```text
/workspace/scheduler/crontab
```

Edits are picked up automatically; no container restart is required.

Before adding or changing jobs, read [references/scheduler.md](references/scheduler.md). It contains the job format, LLM job conventions, one-off cleanup pattern, state guidance, and validation checklist.

Core locations:

- `/workspace/scheduler/crontab` - schedule entries
- `/workspace/scheduler/jobs` - reusable shell scripts
- `/workspace/scheduler/state` - small state files, cursors, and queues
- `/workspace/scheduler/logs/scheduler.log` - scheduler logs

Default workflow:

1. Read the scheduler reference.
2. Decide whether the job is recurring or one-off.
3. Decide whether it is shell-only, inline `pi -p`, or a shell script that invokes `pi -p`.
4. Create or update scripts under `/workspace/scheduler/jobs` when needed.
5. Edit `/workspace/scheduler/crontab`.
6. For one-off jobs, include self-removal logic after successful completion.
7. Check `/workspace/scheduler/logs/scheduler.log` after the scheduled run when validation is possible.
