# pre-commit-config-nick2bad4u

[![CI](https://github.com/Nick2bad4u/pre-commit-config-nick2bad4u/actions/workflows/ci.yml/badge.svg)](https://github.com/Nick2bad4u/pre-commit-config-nick2bad4u/actions/workflows/ci.yml) [![npm](https://img.shields.io/npm/v/pre-commit-config-nick2bad4u.svg)](https://www.npmjs.com/package/pre-commit-config-nick2bad4u)

Portable shared [pre-commit](https://pre-commit.com/) hook suites with frozen upstream revisions and a safe materializer for the conventional root config file.

## Install

```sh
npm install --save-dev pre-commit-config-nick2bad4u
python -m pip install pre-commit
```

Pre-commit does not support config inheritance and normal tooling discovers `.pre-commit-config.yaml` at the repository root. Materialize a reviewed preset:

```sh
npx pre-commit-config-nick2bad4u init --preset node
pre-commit install --install-hooks
pre-commit run --all-files
```

The command refuses to replace a different existing file. Use `--check` for drift detection and `--force` only after reviewing the replacement:

```sh
npx pre-commit-config-nick2bad4u init --preset node --check
npx pre-commit-config-nick2bad4u init --preset node --force
```

## Presets

| Preset     | Hook suite                                                                  |
| ---------- | --------------------------------------------------------------------------- |
| `minimal`  | Portable file-format and repository hygiene                                 |
| `security` | Minimal plus private-key detection and Gitleaks                             |
| `node`     | Security plus correctly mapped package.json, tsconfig, and workflow schemas |
| `strict`   | Node plus shebang checks and protected default/development branches         |
| `assets`   | Node plus opt-in PNG optimization with Oxipng                               |

All upstream hook revisions are frozen full commit SHAs with their release tags recorded in comments. The presets intentionally omit consumer-specific TypeScript, Vite, Electron, commit-message, and package-script hooks.

## Typed API

```ts
import {
 getPreCommitConfigPath,
 materializePreCommitConfig,
 preCommitConfigPaths,
 preCommitPresets,
} from "pre-commit-config-nick2bad4u";

const path = getPreCommitConfigPath("security");
await materializePreCommitConfig({ preset: "security" });
```

Advanced callers can run a package-owned file directly:

```sh
pre-commit run \
  --config node_modules/pre-commit-config-nick2bad4u/configs/security.yaml \
  --all-files
```

Materializing remains recommended because pre-commit.ci and normal local discovery expect the conventional root filename.

## Updating frozen hooks

Run `pre-commit autoupdate --freeze --config <preset>` for every public preset, review upstream changes, run all fixture tests, and keep repeated hook blocks synchronized.

## Development

```sh
npm install
npm run release:verify
```

Tests validate all YAML suites, full-SHA pins, modern stage names, correct SchemaStore mappings, idempotent writes, drift checks, overwrite refusal, forced replacement, CLI help, and packed assets.
