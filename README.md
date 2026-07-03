# Pi Agent Docker Workspace

A small Docker Compose setup for running a persistent `pi` coding-agent workspace with tmux, Git, SSH, ripgrep, jq, and Playwright/Chromium available in the container.

The repo is designed to be public. Local state, secrets, agent sessions, mounted project checkouts, and SSH keys are kept out of git.

## What Gets Committed

- `Dockerfile` builds the agent image.
- `docker-compose.yml` defines the container and configurable mounts.
- `start-pi.sh` is the Docker startup command.
- `connect-to-pi-tmux.sh` starts or attaches to the tmux-backed Pi session.
- `extensions/` contains homemade Pi extensions mounted into Pi's global extension path.
- `skills/` contains homemade Pi skills mounted into Pi's global skill path.
- `scheduler/` contains the in-container cron config and job scripts for scheduled agent work.
- `.env.example` documents local environment variables and API keys.
- `AGENTS.example.md` is a safe starter workspace instruction file.
- `secrets/README.md` documents where to place local secret files.

## What Stays Local

- `.env`
- `AGENTS.md`
- `data/`
- `workspace/`
- `secrets/*`

Those paths can contain API keys, Telegram tokens, SSH keys, session transcripts, private repos, and generated caches.

## Setup

1. Copy the environment template:

   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and fill in only the keys and paths you need.

3. Optional: create machine-local agent instructions:

   ```bash
   cp AGENTS.example.md AGENTS.md
   ```

   If you do this, set `AGENTS_FILE=./AGENTS.md` in `.env`.

4. Optional: add SSH keys for git access:

   ```bash
   mkdir -p secrets/ssh
   chmod 700 secrets/ssh
   # Put id_ed25519, id_ed25519.pub, and known_hosts in secrets/ssh.
   chmod 600 secrets/ssh/id_*
   ```

5. Start the container:

   ```bash
   docker compose up -d --build
   ```

6. Attach to the running Pi session:

   ```bash
   docker compose exec pi-agent connect-to-pi-tmux.sh
   ```

## Mounting Projects

By default, the container stores workspace data under `./data`:

- `./data/workspace` mounted at `/workspace`
- `./data/worktrees` mounted at `/workspace/worktrees`
- `./data/workspace-agents` mounted at `/workspace/.agents`
- `./data/pi-home` mounted at `/home/node/.pi`
- `./extensions` mounted read-only at `/home/node/.pi/agent/extensions`
- `./skills` mounted read-only at `/home/node/.pi/agent/skills`
- `./scheduler` mounted read-write at `/workspace/scheduler` in `pi-agent`

For private project checkouts, either clone them inside `/workspace` after the container starts or add machine-local overrides in `docker-compose.override.yml`. Keep override files private if they expose local paths.

Example override:

```yaml
services:
  pi-agent:
    volumes:
      - /host/path/to/private-repo:/workspace/private-repo
```

## Homemade Pi Extensions

Put custom extension files in `extensions/`. Pi auto-discovers TypeScript modules in `/home/node/.pi/agent/extensions` on startup, so these host-backed files survive container restarts and image rebuilds.

Use either a single file:

```text
extensions/my-extension.ts
```

or a directory with an entrypoint:

```text
extensions/my-extension/index.ts
```

After editing an extension, restart the Pi session or run `/reload` inside Pi. The mount is read-only inside the container so the container can use extensions without accidentally rewriting the source files.

Put homemade skills in `skills/<skill-name>/SKILL.md`. Pi loads global skills from `/home/node/.pi/agent/skills`.

Included skills:

- `pi-scheduler` for scheduled jobs and long-running automation.
- `playwright-browser-checks` for frontend browser validation with Playwright/Chromium.

## Scheduled Jobs

The Pi container starts a lightweight Node scheduler from `start-pi.sh`. It reads `scheduler/crontab`, watches that file for edits, and runs jobs inside the existing `pi-agent` container from `/workspace`.

Use normal five-field cron syntax or `@every` intervals:

```cron
*/5 * * * * bash /workspace/scheduler/jobs/example-shell-job.sh
@every 15m bash /workspace/scheduler/jobs/check-email.sh
```

For an LLM-backed scheduled job, run Pi in print mode from inside the same container:

```cron
0 9 * * * cd /workspace && pi -p "Summarize today's queued reminders."
```

The Telegram-connected Pi agent can edit `/workspace/scheduler/crontab` and scripts under `/workspace/scheduler/jobs`. Schedule changes are picked up automatically; no container restart is required.

Scheduler logs are written to `/workspace/scheduler/logs/scheduler.log`. Set `PI_SCHEDULER_ENABLED=0` to disable the scheduler process.

## Secrets

Use `.env` for API tokens that should become environment variables inside the container. Use `secrets/` for file-based credentials such as SSH keys.

Do not commit real values. If a secret is ever accidentally committed, rotate it; deleting it from a later commit is not enough for a public repository.

Be careful with `docker compose config`: it prints resolved environment values. Do not paste that output publicly when your real `.env` contains tokens.

## Telegram

`PI_TELEGRAM_AUTOCONNECT=1` is enabled by default in `.env.example`. The Telegram token itself is created by the Pi Telegram setup flow and stored under the persisted Pi home volume, normally `data/pi-home`. That directory is ignored by git.

Run `/telegram-setup` once inside an interactive Pi session, then restart the container.
