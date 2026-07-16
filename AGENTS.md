# Repository Instructions

This repository publishes `pre-commit-config-nick2bad4u`. Treat `.pre-commit-config.yaml`, every file under `configs/`, the typed preset API, and the materializer CLI as public package surfaces.

## Priorities

- Freeze hook revisions to full commit SHAs with version comments.
- Keep local consumer commands and language versions out of shared presets.
- Never overwrite an existing consumer config without explicit `--force`.
- Preserve `--check` as a read-only drift gate.
- Validate every preset with `pre-commit validate-config` when available.
- This package supplies hook configuration only; it must not claim to install pre-commit.

## Commands

```sh
npm run build:runtime
npm run typecheck
npm test
npm run release:verify
```
