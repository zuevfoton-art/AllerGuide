---
name: rework-commits
description: Safely reorganize git commit history on a feature branch — squash, split, reorder, or reword commits before opening or updating a PR. Use when the user asks to rework, clean up, squash, split, reorder, or reword commits, or to fix a messy branch history.
---

# Rework Commits

Reorganize branch history into logical, reviewable commits **without changing the resulting tree**.

## When to use

- WIP or "fix typo" commits cluttering a PR
- Mixed concerns in one commit (e.g. refactor + feature + migration)
- Unclear or non-Conventional commit messages
- User explicitly asks to rework / squash / split / reorder commits

## Hard rules

1. **Never rework on protected branches**: `main`, `master`, `develop`, `staging`, `production`, `release/*`, `hotfix/*`. Create or switch to a feature branch first.
2. **Working tree must be clean** before starting (`git status` shows nothing to commit).
3. **Never use interactive TTY commands** — they hang in agent shells:
   - ❌ `git rebase -i` without `GIT_SEQUENCE_EDITOR`
   - ❌ `git add -i`, `git add -p` (use path-based staging instead)
4. **Verify the tree is unchanged** after rework (mandatory before push).
5. **Push with** `git push --force-with-lease`, never `--force`.
6. **Show the new history and get user approval** before force-pushing (review gate).

## Commit message format (AllerGuide)

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>

[optional body]
```

| Type | Use for |
|------|---------|
| `feat` | New behavior |
| `fix` | Bug fix |
| `refactor` | Behavior-preserving restructure |
| `test` | Tests only |
| `docs` | Documentation only |
| `chore` | Tooling, deps, CI |
| `db` | API migrations / schema |

Scopes: `mobile`, `api`, `core`, `ai`, or package name. Example: `feat(mobile): profile dual-write to staging API`.

One logical change per commit. Order: foundational changes first (types/core), then implementation, then tests/docs.

## Workflow

Copy and track progress:

```
Rework progress:
- [ ] Step 1: Assess current history
- [ ] Step 2: Plan target commits
- [ ] Step 3: Create backup branch
- [ ] Step 4: Execute rework
- [ ] Step 5: Verify tree unchanged
- [ ] Step 6: Review gate
- [ ] Step 7: Force-push (after approval)
```

### Step 1: Assess

```bash
git branch --show-current
git status
git log --oneline origin/main..HEAD
git diff --stat origin/main..HEAD
```

Identify logical groups (by concern, package, or layer). Note overlapping files that need careful splitting.

### Step 2: Plan target commits

Write the target history **before** executing. Example plan:

```
1. refactor(core): extract allergen mapping helper
2. feat(api): add product search endpoint
3. test(api): cover product search route
```

Each group maps to specific paths or hunks. Prefer path-based groups when files don't overlap.

### Step 3: Backup

```bash
BRANCH=$(git branch --show-current)
git branch "backup/${BRANCH}-$(date +%Y%m%d-%H%M%S)" HEAD
```

### Step 4: Execute rework

Pick **one** strategy.

#### Strategy A — Soft reset (simplest; use when squashing everything)

Best when all branch commits should become N new logical commits.

```bash
BASE=$(git merge-base HEAD origin/main)
git reset --soft "$BASE"
# Stage and commit each logical group:
git add packages/core/src/...
git commit -m "refactor(core): extract allergen mapping helper"
git add apps/api/src/routes/products.ts apps/api/src/routes/products.test.ts
git commit -m "feat(api): add product search endpoint"
# ...repeat until git status is clean
```

#### Strategy B — Pre-built rebase todo (reorder / squash / drop / reword)

Use when you need to preserve some commits and only change others.

```bash
# List commits oldest-first (reverse of --oneline)
git log --reverse --format="%h %s" origin/main..HEAD

# Write todo (oldest commit = top line). Example:
# pick a1b2c3d feat(api): add endpoint
# squash d4e5f6 fix typo
# reword g7h8i9j wip stuff
# drop j0k1l2m debug logging

cat > /tmp/rebase-todo.txt <<'EOF'
pick a1b2c3d feat(api): add endpoint
squash d4e5f6 fix typo
reword g7h8i9j wip stuff
drop j0k1l2m debug logging
EOF

BASE=$(git merge-base HEAD origin/main)
GIT_SEQUENCE_EDITOR="cp /tmp/rebase-todo.txt" git rebase -i "$BASE"
```

For `reword` commits, set messages non-interactively:

```bash
GIT_EDITOR='sh -c "echo \"feat(api): add product search endpoint\" > \"$1\""' git rebase --continue
```

#### Strategy C — Extract one commit from a mixed commit

When a single commit contains separable concerns:

```bash
# Start from the commit BEFORE the mixed one
git reset --soft <parent-of-mixed-commit>
# Re-commit in logical pieces via path-based staging
git add -A packages/core/
git commit -m "refactor(core): ..."
git add -A apps/api/
git commit -m "feat(api): ..."
```

On conflicts: `git rebase --abort` or `git reset --hard backup/...` and retry.

### Step 5: Verify tree unchanged

**Mandatory.** The rework must not alter file contents vs the backup.

```bash
BACKUP=$(git branch --list 'backup/*' | tail -1 | tr -d ' *')
git diff "$BACKUP" HEAD          # must be empty
git diff --stat "$BACKUP" HEAD   # must show 0 files changed
```

If the diff is non-empty, abort the push, restore from backup, and replan.

### Step 6: Review gate

Show the user:

```bash
echo "=== Before ===" && git log --oneline "$BACKUP" ^origin/main
echo "=== After ==="  && git log --oneline HEAD ^origin/main
git diff --stat "$BACKUP" HEAD
```

Wait for explicit approval before pushing.

### Step 7: Force-push

Only after approval:

```bash
git push --force-with-lease -u origin "$(git branch --show-current)"
```

If push is rejected (remote moved), fetch and reassess — do not blind force-push.

## Recovery

| Situation | Command |
|-----------|---------|
| Rework went wrong | `git reset --hard backup/<branch>-<timestamp>` |
| Rebase in progress | `git rebase --abort` |
| Lost branch | `git reflog` → `git checkout -b <branch> <sha>` |
| Undo pushed rework | `git push --force-with-lease origin backup/<branch>-<timestamp>:<branch>` |

## Anti-patterns

- ❌ Reworking commits already merged to `main`
- ❌ Combining unrelated concerns to reduce commit count
- ❌ Skipping tree verification
- ❌ Force-pushing without `--force-with-lease`
- ❌ Rewriting history on a branch others are actively using (warn the user)

## Quick example

**Before:** 7 commits (`wip`, `fix`, `more fixes`, `feat X`, `lint`, `oops`, `tests`)

**After plan:**
1. `feat(mobile): add barcode history screen`
2. `test(mobile): cover barcode history service`

**Execute:** Strategy A (soft reset to `origin/main`, two path-based commits).

**Verify:** `git diff backup/... HEAD` → empty → review gate → `git push --force-with-lease`.
