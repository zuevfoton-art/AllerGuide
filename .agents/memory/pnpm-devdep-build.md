---
name: pnpm packageManager field breaks Replit build
description: The "packageManager" field in package.json causes Replit's build system to self-install pnpm, crashing with SIGABRT on @pnpm/exe.
---

## Rule

Never include a `"packageManager"` field (e.g. `"packageManager": "pnpm@10.34.4"`) in the root `package.json` of a Replit project. Also do not put `pnpm` itself in `devDependencies`.

## Why

Replit's autoscale build container reads the `packageManager` field and runs `pnpm add pnpm@<version> --allow-build=@pnpm/exe`. The `@pnpm/exe` native binary gets killed with `SIGABRT` inside the sandboxed build environment, causing the entire build to fail in a tight error loop with no useful output except repeated `Command failed with exit code 1`. Removing only `devDependencies.pnpm` is not enough — the `packageManager` field alone is sufficient to trigger the loop.

## How to apply

- Remove `"packageManager": "pnpm@<version>"` from the root `package.json`.
- Remove `"pnpm": "<version>"` from `devDependencies` as well if present.
- pnpm is already present in Replit's build environment; neither field is needed.
- The `pnpm.overrides` section (dependency overrides) is unaffected and can stay.
