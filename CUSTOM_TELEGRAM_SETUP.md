# Pi Agent Telegram Customization

This file records the Telegram auto-connect behavior expected by this `pi-agent` container.

## Telegram Auto-Connect

Purpose: the Pi Telegram bridge should reconnect automatically when the Docker container starts, without manually attaching to tmux and running `/telegram-connect`.

### Runtime Behavior

The `pi-telegram` extension checks:

```bash
PI_TELEGRAM_AUTOCONNECT=1
```

On Pi `session_start`, if that variable is enabled and `~/.pi/agent/telegram.json` already contains a bot token, the extension starts Telegram polling automatically.

### Repo Configuration

- `docker-compose.yml`
  - Passes `PI_TELEGRAM_AUTOCONNECT` through to the container.
- `.env.example`
  - Defaults `PI_TELEGRAM_AUTOCONNECT=1`.
- `data/pi-home`
  - Runtime-only persisted Pi home. This is ignored by git because it can contain `telegram.json`, session logs, tool cache, and other private state.

### First-Time Setup

Auto-connect does not create the Telegram bot token. Run this once in an interactive Pi session:

```text
/telegram-setup
```

Then send `/start` to the Telegram bot to pair the allowed user.

After that, the container can be started normally:

```bash
docker compose up -d pi-agent
```

Pi starts inside tmux through `start-pi.sh`, which delegates to `connect-to-pi-tmux.sh`. The Telegram bridge should connect automatically.

### Verification

Check the running container:

```bash
docker compose exec -T pi-agent tmux ls
docker compose exec -T pi-agent tmux capture-pane -pt pi -S -40
```

The Pi footer should show:

```text
telegram connected
```

### Porting To Another Project

1. Install the Telegram adapter with `pi install npm:@llblab/pi-telegram`.
2. Add `PI_TELEGRAM_AUTOCONNECT=1` to the container/runtime environment.
3. Persist `~/.pi/agent` as a volume so `telegram.json` survives restarts.
4. Run `/telegram-setup` once, then restart the container.
