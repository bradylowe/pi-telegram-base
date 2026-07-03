# Scheduled Job Scripts

Put shell scripts for scheduled jobs in this directory.

The scheduler should execute them with crontab entries like:

```cron
*/5 * * * * bash /workspace/scheduler/jobs/my-job.sh
```

Scripts can also call Pi in print mode for LLM-backed work:

```bash
cd /workspace
pi -p "Do the scheduled task."
```
