---
name: pnpm in devDependencies breaks build
description: Having pnpm itself listed in devDependencies causes Replit's build container to self-install pnpm, which crashes with SIGABRT on @pnpm/exe.
---

## Rule

Never put `pnpm` (or any other package manager) in `devDependencies` of the root `package.json`.

## Why

Replit's autoscale build container reads `devDependencies` and runs `pnpm add pnpm@<version> --allow-build=@pnpm/exe`. The `@pnpm/exe` native binary gets killed with `SIGABRT` inside the sandboxed build environment, causing the entire build to fail in a tight error loop with no useful output except repeated `Command failed with exit code 1`.

## How to apply

- Remove `"pnpm": "<version>"` from `devDependencies` in the root `package.json`.
- The `"packageManager": "pnpm@<version>"` field in `package.json` is fine to keep — it is a Corepack hint and doesn't trigger an installation when `COREPACK_ENABLE_STRICT=0` is set (as it is in `scripts/replit-deploy-build.sh`).
- pnpm is already present in Replit's build environment; it does not need to be listed as a dependency.
