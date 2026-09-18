# Aclearo × A-Claro — бренд-архитектура (диаграммы)

Master brand **Aclearo** · product mark **A-Claro** · один продукт (`com.aclearo.app`).

Lockup: **A-Claro** · *an Aclearo app*

Полная матрица touchpoints, фазы rollout и чеклисты — в plan artifact `allergocare_availability_check` (раздел «Полная схема»).

---

## 1. Иерархия имён

```mermaid
flowchart TB
  subgraph forbidden [Never use]
    X1["AClaro / aclaro.com"]
    X2["AllerClear OTC"]
  end
  subgraph l3 [L3 Descriptor ASO only]
    D1["Allergy companion"]
    D2["Аллергия — ясно"]
  end
  subgraph l2 [L2 Product Brand]
    ACL["A-Claro"]
    ACLRoles["Icon · Splash · Store Name"]
  end
  subgraph l1 [L1 Master Brand]
    AC["Aclearo"]
    ACRoles["Legal · Developer · TM · Website"]
  end
  APP["One app · com.aclearo.app"]
  l1 -->|endorses| l2
  l2 -->|described as| l3
  l1 -.-> APP
  l2 -.-> APP
  forbidden -.->|avoid| l2
```

| Уровень | Имя | Пользователь | Регулятор / партнёр |
|---------|-----|--------------|---------------------|
| L1 | Aclearo | About, PDF, press | TM, privacy, developer |
| L2 | A-Claro | Icon, store, splash | Product mark |
| L3 | Allergy companion | Subtitle, keywords | Health category |

---

## 2. User journey (touchpoints)

```mermaid
flowchart LR
  subgraph discover [Discovery]
    AD["Ads / ASO"]
    ST["Store listing"]
  end
  subgraph install [Install]
    ICO["Icon A monogram"]
    SPL["Splash lockup"]
  end
  subgraph daily [Daily use]
    ONB["Onboarding tagline"]
    UI["In-app UI"]
    SCAN["Scanner clarity"]
  end
  subgraph trust [Trust layer]
    LEG["Legal Aclearo"]
    PDF["Doctor PDF"]
    SOS["SOS card"]
  end
  AD -->|"A-Claro ES / Aclearo RU"| ST
  ST -->|"Name A-Claro"| ICO
  ICO --> SPL
  SPL --> ONB
  ONB --> UI
  UI --> SCAN
  UI --> SOS
  SCAN --> PDF
  UI --> LEG
```

---

## 3. Domains, identifiers & trademarks

```mermaid
flowchart TB
  subgraph domains [Domains]
    P["aclearo.app PRIMARY"]
    RU["aclearo.ru"]
    PR["a-claro.app REDIRECT"]
    PRU["a-claro.ru REDIRECT"]
  end
  subgraph identifiers [Identifiers]
    B["com.aclearo.app"]
    S["expo slug aclearo"]
    N["npm scope aclearo"]
  end
  subgraph trademarks [Trademarks RU US EU]
    T1["ACLEARO class 09 42"]
    T2["A-CLARO stylized"]
  end
  subgraph blocked [Do not register]
    BAD1["aclaro.com pharma"]
    BAD2["aclaro.app occupied"]
  end
  P --> B
  P --> S
  S --> N
  PR -->|"301"| P
  PRU -->|"301"| RU
  T1 --> P
  T2 --> PR
  blocked -.->|conflict| PR
```

| Актив | Назначение |
|-------|------------|
| `aclearo.app` | Privacy, terms, marketing |
| `a-claro.app` | 301 → primary или ES landing |
| `com.aclearo.app` | iOS + Android bundle ID |

---

## 4. Design tokens → marks

```mermaid
flowchart LR
  subgraph tokens [Design tokens]
    C["Claro Teal #2A9D8F"]
    CL["Claro Teal Light #E8F5F2"]
    TX["Text #1A1A2E"]
    RH["Risk high #C0392B data only"]
  end
  subgraph marks [Brand marks]
    M1["Aclearo wordmark"]
    M2["A-Claro wordmark"]
    M3["A monogram icon"]
  end
  subgraph usage [Usage]
    U1["Accent UI links"]
    U2["Card backgrounds"]
    U3["Body text"]
    U4["Scanner risk badge"]
  end
  C --> M1
  C --> M2
  C --> M3
  M2 --> M3
  C --> U1
  CL --> U2
  TX --> U3
  RH --> U4
```

| Token | Value | Применение |
|-------|-------|------------|
| Claro Teal | `#2A9D8F` | Accent, monogram A |
| Claro Teal Light | `#E8F5F2` | Cards, surfaces |
| Text primary | `#1A1A2E` | Body |
| Risk high | `#C0392B` | Только data UI, не бренд |

Lockup: A-Claro 100% · «an Aclearo app» 28% · clear space = высота «A».

---

## 5. Rollout pipeline

```mermaid
flowchart TB
  subgraph p0 [Phase 0 Legal]
    P0A["TM search ACLEARO A-CLARO"]
    P0B["Register aclearo and a-claro domains"]
    P0C["Draft privacy and terms"]
  end
  subgraph p1 [Phase 1 Stores]
    P1A["Reserve com.aclearo.app"]
    P1B["Listing A-Claro developer Aclearo"]
    P1C["RuStore publisher"]
  end
  subgraph p2 [Phase 2 Code]
    P2A["app.json slug bundleId"]
    P2B["i18n taglines x6"]
    P2C["PDF legal strings"]
  end
  subgraph p3 [Phase 3 Visual]
    P3A["Icon A monogram 1024"]
    P3B["Splash lockup"]
    P3C["Store screenshots"]
  end
  subgraph p4 [Phase 4 Comms]
    P4A["Press kit"]
    P4B["ADAIR co-brand"]
    P4C["Store submit"]
  end
  subgraph p5 [Phase 5 Optional]
    P5A["Legacy redirects"]
    P5B["npm scope aclearo"]
  end
  p0 --> p1
  p1 --> p2
  p2 --> p3
  p3 --> p4
  p4 --> p5
```

| Phase | Gate |
|-------|------|
| 0 | TM report без блокеров |
| 1 | Bundle ID уникален |
| 2 | `pnpm typecheck` + tests |
| 3 | Assets в store console |
| 4 | Review submitted |

---

## 6. Go / no-go flow

```mermaid
flowchart TD
  startNode["Start rollout"]
  q1{"TM clear?"}
  q2{"Domains live?"}
  q3{"Bundle reserved?"}
  q4{"Typecheck and tests pass?"}
  q5{"Icon and splash ready?"}
  shipNode["Submit to stores"]
  b1["Resolve TM"]
  b2["Register DNS"]
  b3["Store consoles"]
  b4["Fix code"]
  b5["Design assets"]
  startNode --> q1
  q1 -->|no| b1
  b1 --> q1
  q1 -->|yes| q2
  q2 -->|no| b2
  b2 --> q2
  q2 -->|yes| q3
  q3 -->|no| b3
  b3 --> q3
  q3 -->|yes| q4
  q4 -->|no| b4
  b4 --> q4
  q4 -->|yes| q5
  q5 -->|no| b5
  b5 --> q5
  q5 -->|yes| shipNode
```

### Checklist

| ☐ | Check | Owner |
|---|-------|-------|
| ☐ | TM search ACLEARO + A-CLARO | Legal |
| ☐ | aclearo.app + .ru registered | Ops |
| ☐ | a-claro.app + .ru registered | Ops |
| ☐ | com.aclearo.app reserved | Product |
| ☐ | app.json updated | Eng |
| ☐ | i18n taglines ×6 | Eng |
| ☐ | Icon A monogram | Design |
| ☐ | Privacy/Terms on aclearo.app | Legal |
| ☐ | pnpm rc-gate green | Eng |

---

## Guardrails

| Не путать с | Наше написание |
|-------------|----------------|
| Aclaro® (hydroquinone) | **A-Claro** с дефисом |
| Claro (telecom LATAM) | Health category + allergy subtitle |
| klarify (ALK) | Full app scope in copy |
| AllerClear (Costco OTC) | **Aclearo** |
| ComerClaro (food ES) | Allergy companion positioning |
