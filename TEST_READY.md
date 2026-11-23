# E2E Test Suite Ready (`TEST_READY.md`)

**Project:** Pitt Intelligent Systems Program (ISP) Website Redesign — Raphael Session Improvements  
**Track:** Opaque-Box E2E Testing Track (`sub_orch_e2e_r3`)  
**Specification Reference:** `TEST_INFRA.md`, `.agents/teamwork/ORIGINAL_REQUEST.md`, `PROJECT.md`, `BRAND.md`, `AGENTS.md`

---

## Test Runner

```bash
python3 tests/e2e/run_e2e.py --tier 1|2|3|4|all
```

### Per-Tier & Verification Commands

```bash
# Run all 4 E2E tiers sequentially (default: --tier all, 106 tests)
python3 tests/e2e/run_e2e.py --tier all

# Run Tier 1: Isolated Feature Coverage (45 tests across F1–F8)
python3 tests/e2e/run_e2e.py --tier 1

# Run Tier 2: Boundary & Corner Cases (43 tests across F1–F8)
python3 tests/e2e/run_e2e.py --tier 2

# Run Tier 3: Cross-Feature Pairwise Combinations (12 tests)
python3 tests/e2e/run_e2e.py --tier 3

# Run Tier 4: Real-World Multi-Feature Application Scenarios (6 tests)
python3 tests/e2e/run_e2e.py --tier 4

# Run Harness Self-Check Suite (12 tests validating dual-mount server, CDP, viewports, emulation, and helpers)
python3 tests/e2e/run_e2e.py --tier self
```

Optional CLI flags:
- `--root <path>`: Override static site directory (defaults to `redesign/dist` if `redesign/dist/index.html` exists, else `redesign`).
- `--filter <pattern>`: Filter tests via Node `--test-name-pattern`.
- `--timeout <seconds>`: Per-invocation timeout safeguard (default: `300`).

Exit code contract:
- Exits `0` **only** when `>= 1` real test executed and **100%** of selected tests passed (`failed == 0`, `skipped == 0`, `cancelled == 0`, `todo == 0`).

---

## Coverage Summary

- **Tier 1:** 45 tests across 8 features (`tests/e2e/tier1_features.test.mjs`)
- **Tier 2:** 43 tests across 8 features (`tests/e2e/tier2_boundaries.test.mjs`)
- **Tier 3:** 12 combination tests (`tests/e2e/tier3_combinations.test.mjs`)
- **Tier 4:** 6 scenario tests (`tests/e2e/tier4_scenarios.test.mjs`)
- **Total:** 106 tests across Tiers 1–4 (+ 12 harness self-check tests in `tests/e2e/self_check.test.mjs`)

| Suite File | Tier | Test Count | Scope |
|---|---|---:|---|
| `tests/e2e/tier1_features.test.mjs` | Tier 1 | **45** | Isolated feature functional coverage (`>= 5` tests per feature `F1`–`F8`) |
| `tests/e2e/tier2_boundaries.test.mjs` | Tier 2 | **43** | Boundary, regression trap, no-JS, `320×568`, subpath & XSS corner cases (`>= 5` per feature `F1`–`F8`) |
| `tests/e2e/tier3_combinations.test.mjs` | Tier 3 | **12** | Cross-feature pairwise & multi-feature interaction workflows (`T3-01`–`T3-12`) |
| `tests/e2e/tier4_scenarios.test.mjs` | Tier 4 | **6** | End-to-end real-world user & release-readiness journeys (`T4-01`–`T4-06`) |
| `tests/e2e/self_check.test.mjs` | Self-Check | **12** | Zero-dependency dual-mount server, Chromium 156 CDP, viewport/media/no-JS emulation & helper verification (`SC-01`–`SC-12`) |

---

## Feature Checklist

- [x] **Feature F1 — Baseline Old-Design Screenshots (`docs/screenshots/before/`)**
  - **Tier 1 (5 tests):** `T1-F1-01`, `T1-F1-02`, `T1-F1-03`, `T1-F1-04`, `T1-F1-05`
  - **Tier 2 (5 tests):** `T2-F1-01`, `T2-F1-02`, `T2-F1-03`, `T2-F1-04`, `T2-F1-05`
  - **Tier 3:** `T3-10`
  - **Tier 4:** `T4-06`
- [x] **Feature F2 — Up-to-Date Course Prerequisites & Classes Offered (`courses.html`, `ms.html`, `phd.html`, `courses.json`)**
  - **Tier 1 (6 tests):** `T1-F2-01`, `T1-F2-02`, `T1-F2-03`, `T1-F2-04`, `T1-F2-05`, `T1-F2-06`
  - **Tier 2 (5 tests):** `T2-F2-01`, `T2-F2-02`, `T2-F2-03`, `T2-F2-04`, `T2-F2-05`
  - **Tier 3:** `T3-02`, `T3-06`, `T3-11`, `T3-12`
  - **Tier 4:** `T4-01`, `T4-03`, `T4-06`
- [x] **Feature F3 — Easy-to-Find Requirements Under Academics (`academics.html`, `ms.html`, `phd.html`, Academics Nav Submenu)**
  - **Tier 1 (5 tests):** `T1-F3-01`, `T1-F3-02`, `T1-F3-03`, `T1-F3-04`, `T1-F3-05`
  - **Tier 2 (5 tests):** `T2-F3-01`, `T2-F3-02`, `T2-F3-03`, `T2-F3-04`, `T2-F3-05`
  - **Tier 3:** `T3-02`, `T3-07`, `T3-12`
  - **Tier 4:** `T4-01`, `T4-02`, `T4-03`, `T4-05`, `T4-06`
- [x] **Feature F4 — Prominent Scholarships & Funding (`funding.html`, Home, Admissions, Academics, Resources, Nav, Footer)**
  - **Tier 1 (6 tests):** `T1-F4-01`, `T1-F4-02`, `T1-F4-03`, `T1-F4-04`, `T1-F4-05`, `T1-F4-06`
  - **Tier 2 (5 tests):** `T2-F4-01`, `T2-F4-02`, `T2-F4-03`, `T2-F4-04`, `T2-F4-05`
  - **Tier 3:** `T3-01`, `T3-03`, `T3-07`, `T3-08`, `T3-12`
  - **Tier 4:** `T4-01`, `T4-02`, `T4-03`, `T4-04`, `T4-06`
- [x] **Feature F5 — Faculty Explorer Replacing People Page (`people.html`)**
  - **Tier 1 (6 tests):** `T1-F5-01`, `T1-F5-02`, `T1-F5-03`, `T1-F5-04`, `T1-F5-05`, `T1-F5-06`
  - **Tier 2 (7 tests):** `T2-F5-01`, `T2-F5-02`, `T2-F5-03`, `T2-F5-04`, `T2-F5-05`, `T2-F5-06`, `T2-F5-07`
  - **Tier 3:** `T3-03`, `T3-04`, `T3-05`, `T3-08`, `T3-09`, `T3-12`
  - **Tier 4:** `T4-01`, `T4-02`, `T4-04`, `T4-05`, `T4-06`
- [x] **Feature F6 — Sticky Scroll-Following Navbar & Anchor Offsets (`layout.html`, `styles.css`, `main.js`)**
  - **Tier 1 (5 tests):** `T1-F6-01`, `T1-F6-02`, `T1-F6-03`, `T1-F6-04`, `T1-F6-05`
  - **Tier 2 (5 tests):** `T2-F6-01`, `T2-F6-02`, `T2-F6-03`, `T2-F6-04`, `T2-F6-05`
  - **Tier 3:** `T3-01`, `T3-02`, `T3-04`, `T3-08`, `T3-12`
  - **Tier 4:** `T4-01`, `T4-02`, `T4-04`, `T4-05`, `T4-06`
- [x] **Feature F7 — Zero-Dependency Site-Wide Search (`search-index.json`, `search.js`, `search.html`, Modal)**
  - **Tier 1 (6 tests):** `T1-F7-01`, `T1-F7-02`, `T1-F7-03`, `T1-F7-04`, `T1-F7-05`, `T1-F7-06`
  - **Tier 2 (6 tests):** `T2-F7-01`, `T2-F7-02`, `T2-F7-03`, `T2-F7-04`, `T2-F7-05`, `T2-F7-06`
  - **Tier 3:** `T3-01`, `T3-05`, `T3-06`, `T3-08`, `T3-11`, `T3-12`
  - **Tier 4:** `T4-01`, `T4-03`, `T4-04`, `T4-05`, `T4-06`
- [x] **Feature F8 — Written Change Log (`CHANGES.md`), Brand & WCAG 2.1 AA Compliance**
  - **Tier 1 (6 tests):** `T1-F8-01`, `T1-F8-02`, `T1-F8-03`, `T1-F8-04`, `T1-F8-05`, `T1-F8-06`
  - **Tier 2 (5 tests):** `T2-F8-01`, `T2-F8-02`, `T2-F8-03`, `T2-F8-04`, `T2-F8-05`
  - **Tier 3:** `T3-10`, `T3-11`
  - **Tier 4:** `T4-05`, `T4-06`
