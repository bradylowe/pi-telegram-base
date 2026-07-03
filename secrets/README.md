# Secrets

Put machine-local secret files here. This directory is ignored by git except for this README and `.gitkeep`.

Common examples:

- `secrets/ssh/id_ed25519`
- `secrets/ssh/id_ed25519.pub`
- `secrets/ssh/known_hosts`

Use `chmod 700 secrets/ssh` and `chmod 600 secrets/ssh/id_*` for private SSH keys.
