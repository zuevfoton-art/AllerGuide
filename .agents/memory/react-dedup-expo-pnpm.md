---
name: React deduplication in pnpm + Expo monorepo
description: Fixes for multiple-React-instance crashes when npm pollutes pnpm's virtual store symlinks
---

# React Duplication Fix — pnpm + Expo Monorepo

## The Rule
Never run `npm install` at the root of a pnpm workspace. Always use `pnpm install`.

**Why:** `npm install` creates real `node_modules/react`, `node_modules/react-dom`, `node_modules/react-native-web` directories at the root. Metro Bundler then resolves these real directories instead of pnpm's carefully managed symlinks in `.pnpm/`, resulting in two React instances in the bundle ("Invalid hook call" / "Cannot read properties of null (reading 'useContext')").

**How to apply:** If the error appears:
1. `rm -rf node_modules/react node_modules/react-dom node_modules/react-native-web` at the root
2. `pnpm install` to restore correct symlinks
3. The Metro config `extraNodeModules` is a fallback but `resolveRequest` is stronger

## Metro Config
A `metro.config.js` at `apps/mobile/` with `resolver.extraNodeModules` is present as a safety net to force resolution to the mobile app's node_modules.

## pnpm Overrides
Root `package.json` has `pnpm.overrides: { react: "19.0.0", "react-dom": "19.0.0" }` — these only work when pnpm manages node_modules (not after npm pollution).
