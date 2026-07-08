# Allergy taxonomy — backlog issues

Tracking issues for the allergy profile taxonomy workstream. Implemented in PR for items marked **done**.

## Issue 1 — Condition option → allergen id mapping **done**

**Title:** `core: map condition option ids to canonical allergen ids`

**Scope:**
- `packages/core/src/condition-allergen-map.ts`
- Legacy aliases (`wheat` → `wheat-gluten`, `birch` → `birch-pollen`, …)
- Pollen taxon crosswalk for calendar-only options (alder, oak, …)

**Acceptance:**
- [x] `resolveConditionOptionAllergenId()` for food, pollinosis, household, animal, insect
- [x] Unit tests in `condition-allergen-map.test.ts`
- [ ] Wire into profile onboarding hints (follow-up)

---

## Issue 2 — Expand SYMPTOM_CATALOG **done**

**Title:** `core: expand SNOMED/ICD symptom catalog for systemic reactions`

**Added symptoms (18 total, was 10):**
- Покраснение глаз, стеснение в груди
- Анафилаксия, отёк гортани, падение давления / обморок
- Тошнота, рвота, диарея (ЖКТ split from umbrella)
- Diary uses `getSymptomCatalogChoices()` dynamically

**Acceptance:**
- [x] SNOMED + ICD-11 crosswalk per symptom
- [x] Keyword inference updated
- [x] `symptom-coding.test.ts` coverage

---

## Issue 3 — Urticaria condition type **done**

**Title:** `core: add urticaria as explicit AllergyConditionId (11th type)`

**Scope:**
- `AllergyConditionId`: `'urticaria'`
- Label: «Крапивница / ангиоотёк»
- UAS7 scale via `SCALE_BY_CONDITION.urticaria`
- Inference from «крапивница» keywords

**Acceptance:**
- [x] 11 types in `ALLERGY_CONDITION_TYPES`
- [x] UAS7 recommended for explicit `urticaria`
- [ ] Mobile i18n for condition label (follow-up — currently RU in core catalog)

---

## Issue 4 — Align condition option ids in catalog **done**

**Title:** `core: align allergy-conditions option ids with allergen-database`

**Changed ids:** `wheat-gluten`, `birch-pollen`, `ragweed-pollen`, `mugwort-pollen`, `house-dust`, `dust-mites`, `cat-dander`, `dog-dander`

**Acceptance:**
- [x] Option ids match catalog where row exists
- [x] Legacy ids resolve via `LEGACY_CONDITION_OPTION_ALIASES`

---

## Issue 5 — Condition history & clinical phenotypes (planned)

**Title:** `core+mobile: condition onset timeline and comorbidity phenotypes`

**Depends on:** Issues 1–3

**Scope:** `ConditionEpisode`, `ClinicalPhenotype`, onboarding steps, PDF block

**Reference:** EAACI ARIA 2024 multimorbid phenotypes, РААКИ атопический марш

---

## Issue 6 — Mobile condition i18n for urticaria (planned)

**Title:** `mobile: i18n for urticaria condition type (6 locales)`

**Files:** `apps/mobile/src/i18n/locales/*.ts`, `ConditionPicker` if labels move to i18n

---

## Issue 7 — Per-allergen ICD/SNOMED gaps (planned)

**Title:** `core: clinical-coding crosswalk for remaining 24 allergens`

**Reference:** `clinical-accuracy-roadmap.md` Phase A
