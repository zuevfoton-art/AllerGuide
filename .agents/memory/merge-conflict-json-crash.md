---
name: Merge conflict JSON crash
description: Unresolved git merge conflict markers crash pnpm startup — how to find and fix them
---

When a pnpm workspace has unresolved git conflict markers (<<<<<<< HEAD) in any file pnpm reads at startup (package.json, .ts/.tsx), pnpm throws:

  Exit prior to config file resolving
  cause
  call config.load() before reading values

This looks like a pnpm internal error but is actually triggered by JSON.parse failing on the conflict-polluted package.json.

**Why:** Task agents from different branches merge their work into main, sometimes leaving unresolved conflicts across multiple files simultaneously.

**How to apply:** When the workflow fails with this error:
1. Run: grep -rl "<<<<<<< HEAD" apps/mobile/ to find ALL conflicted files at once
2. Fix all of them before restarting (there are typically 3-5 files in a batch)
3. Run pnpm install after fixing if any package.json was involved
4. Do NOT add manage-package-manager-versions=false to .npmrc — it breaks npx in this pnpm version
