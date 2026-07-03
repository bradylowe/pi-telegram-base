# Pi Scheduler

The Pi container starts `agent-cron-runner.js` from `start-pi.sh`. The runner watches `crontab`, reloads it after edits, and executes jobs from `/workspace`.

Inside `pi-agent`, this directory is mounted at:

```text
/workspace/scheduler
```

Use `crontab` for schedules and `jobs/` for shell scripts.

Typical job:

```cron
*/5 * * * * bash /workspace/scheduler/jobs/example-shell-job.sh
@every 15m bash /workspace/scheduler/jobs/check-email.sh
```

LLM-backed job:

```cron
0 9 * * * cd /workspace && pi -p "Check whether any LLMs need to be pinged."
```

Schedule changes are picked up automatically. No container restart is required.

Logs are written to:

```text
/workspace/scheduler/logs/scheduler.log
```

Agents should use the `pi-scheduler` skill before adding scheduled jobs. It contains the job-design checklist, one-off cleanup pattern, and LLM job conventions.
