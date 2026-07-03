# Pi Agent Workspace Context

These are example instructions mounted into `/workspace/AGENTS.md` inside the container.
Copy this file to `AGENTS.md` and customize it for each machine or project.

## Workspace Layout

- `/workspace` is the neutral starting point for agents.
- `/workspace/worktrees` is for feature worktrees and throwaway checkouts.
- `/workspace/.agents` is persisted from the host and can store custom skills.

## Local Rules

- Check `pwd` and `git status` before editing files.
- Use the `pi-scheduler` skill before creating, modifying, or deleting scheduled jobs.
- Use the `playwright-browser-checks` skill before frontend browser validation.
- Keep secrets in `.env` or mounted files under `/workspace`/host `secrets/`.
- Prefer small, targeted checks over broad scans when working on resource-limited machines.

## Pull Request Handoff

If this machine cannot create pull requests directly, push the branch and provide:

- PR creation link
- base branch
- branch name
- suggested title
- concise description
