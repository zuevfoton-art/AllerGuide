# PR triage — August 2026

Snapshot **2026-08-17**. Open PRs: **40**. This is a recommendation list, not an action log.

**Rule:** do not merge or close any PR without an explicit owner decision. Do not open another mega-merge branch — #237 and #249 are already `CONFLICTING` and that failure mode repeats.

## Process recommendation

Land **one focused PR at a time** onto `main`. If two agents finish related work, rebase the second onto the new `main` instead of merging the two topic branches together.

Recreate roadmap milestones/labels with `scripts/create-roadmap-issues.sh` only when `gh` has `issues:write`. Seed **unfinished** work only (Phase 3–5, P0.5 lawyer review, P2.8).

## Basket A — June leftovers (likely superseded)

Most are `CONFLICTING` or months stale. Prefer close-as-superseded after a 60-second skim, not a rebase.

| PR | Title | Mergeable | Note |
|----|-------|-----------|------|
| #10 | Профили: просмотр, редактирование, добавление и выход | MERGEABLE | Core profile UX is on `main` |
| #12 | Functional roadmap: scanner OFF, market, map, analytics, sync | MERGEABLE | Docs/features landed in later phases |
| #22 | docs: HTML-макеты трёх вариантов строгого дизайна | MERGEABLE | Design already chosen (Clinical Calm) |
| #50 | docs: детальная архитектура AllerGuide | CONFLICTING | `docs/architecture.md` is current on `main` |
| #52 | docs: TypeScript и стандарты кода в development-rules §10 | CONFLICTING | §10 already in `development-rules.md` |
| #53 | feat(diary): голосовые заметки с расшифровкой в текст | CONFLICTING | STT exists on `main` (`EXPO_PUBLIC_YC_STT`) |
| #64 | UX Этап B — примитивы загрузки/ошибок | MERGEABLE | Likely absorbed |
| #65 | Wellness Engine v2 | MERGEABLE | Wellness/GINA on `main` |
| #66 | Phase C: Diary & Symptoms | MERGEABLE | Diary refactor already merged |
| #67 | UX Этап C — sticky SOS, haptics | MERGEABLE | SOS/haptics on `main` |
| #76 | docs: sync design mockup | CONFLICTING | Stale mockup |
| #85 | Security audit fixes | CONFLICTING | Audits on `main` show 0 critical |
| #86 | chore: Phase 0 stabilization — legal i18n | CONFLICTING | Legal drafts now in #260 |

## Basket B — July features / docs

| PR | Title | Mergeable | Note |
|----|-------|-----------|------|
| #110 | docs(gtm): GTM materials | MERGEABLE | Keep if GTM pack is still wanted |
| #112 | docs: brand mermaid diagrams | MERGEABLE | Optional docs |
| #122 | feat(mobile): profile setup P2 | CONFLICTING | Rebase or close vs current profile flow |
| #133 | feat(marketplace): checkout + discount API | CONFLICTING | Marketplace is still catalog-first; high conflict cost |
| #137 | feat(auth): password recovery | CONFLICTING | API already has forgot-password / reset token |
| #138 | feat(auth): Face ID | CONFLICTING | Product decision needed |
| #174 | docs: стартовый пакет экранных форм | MERGEABLE | Canvas starter; low risk |
| #221 | ci(staging): enable YC_STT_MIC on Gradle APK | MERGEABLE | 1-line CI; easy to take if still missing on `main` |

## Basket C — August UX / map / scanner (active)

Review these **individually** after the RC-unblock PRs. Several overlap.

| PR | Title | Mergeable | Note |
|----|-------|-----------|------|
| #236 | Split scanner-service | CONFLICTING | **Superseded by #258** |
| #240 | docs: UX/UI-аудит стадии E | MERGEABLE | Useful checklist; no code |
| #241 | fix(sos): экстренный вызов без профиля | MERGEABLE | Small SOS UX |
| #242 | fix(auth): фокус и автозаполнение | MERGEABLE | Auth keyboard |
| #243 | fix(map): карта в первый экран на 667 pt | MERGEABLE | Layout |
| #244 | fix(a11y): hitSlop 44 pt | MERGEABLE | a11y |
| #245 | refactor(ui): единый ScreenHeader | MERGEABLE | Touches many screens — rebase last |
| #246 | Close residual August 13 remark gaps | MERGEABLE | 60 files; skim for overlap with #238 (merged) |
| #247 | fix(scanner): закреплённый вердикт | MERGEABLE | Scanner UI; rebase onto #258 if that lands first |
| #248 | feat(mobile): Stage E polish | MERGEABLE | Tokens / font scaling / a11y lint |
| #252 | feat(diary): entry type picker | MERGEABLE | New diary UX |
| #253 | feat(pollen): birch / alder / olive levels | MERGEABLE | API+mobile pollen |
| #254 | fix(map): AQ и Places включены по умолчанию | MERGEABLE | Feature-flag default — product call |
| #255 | feat(mobile): logo top-left → Home | MERGEABLE | Brand header |

## Basket D — mega-merges (do not revive)

| PR | Title | Mergeable | Note |
|----|-------|-----------|------|
| #237 | merge: land PRs #235–#236 | CONFLICTING | #235 is on `main`. Isolation + scanner + docs split into #256 / #258 / #257. **Close as superseded.** |
| #249 | Объединение PR #235–#248 | CONFLICTING | 107 files. Same anti-pattern. **Close as superseded.** |

## This wave (RC unblock, 2026-08-17)

Land in this order unless a later PR is preferred:

| PR | Title | Why first |
|----|-------|-----------|
| #256 | isolate Pollen key from Places/AQ | Small, unblocks honest health flags |
| #258 | rebase scanner-service split | Replaces #236; keeps `ScanCloudAuthError` |
| #259 | Maestro nightly Ubuntu + KVM | Unblocks G3 (then enable the workflow) |
| #257 | roadmap / RC / soak / Phase 3 docs | This document’s parent PR |
| #260 | DE/ES/FR/IT legal drafts | P0.5 texts; lawyer still required |

## Suggested owner actions

1. Close #236, #237, #249 as superseded (after #256/#258/#257 are merged or explicitly dropped).
2. Merge the RC-unblock PRs one by one.
3. Walk Basket C newest-first; rebase anything that touches `scanner.tsx` after #258.
4. Mass-close Basket A after a skim, or leave them parked — do not rebase the June set.
5. Recreate milestones when `issues:write` is available.
