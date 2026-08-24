# Daily 55 Source Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a truthful daily production pipeline that targets at least 55 new, source-verified articles across the 11 knowledge columns and reports any shortfall without recycling old content.

**Architecture:** A private three-tier source registry feeds a monitor that records source activity and produces a deduplicated candidate queue. A gate escalates from tier one to tier two and then tier three until at least 55 verified candidates exist. Candidate packages can be drafted locally, but Codex must approve each article before registration, ordering, highlighting, audit generation, and release.

**Tech Stack:** Node.js ESM, JSON source registry and candidate queue, HTTP fetch with bounded retries, local-model worker when available, static GitHub Pages publication.

---

### Task 1: Create a private three-tier source registry

**Files:**
- Create: `data/source-library.json`
- Create: `scripts/lib/source-library.mjs`
- Create: `tests/source-library.test.mjs`

- [ ] **Step 1: Write failing source registry tests**

The tests must require:

```js
assert.ok(registry.sources.length >= 66);
assert.deepEqual([...new Set(registry.sources.map((source) => source.tier))].sort(), [1, 2, 3]);
assert.ok(registry.sources.every((source) => source.id && source.name && source.url));
assert.ok(registry.sources.every((source) => source.language && source.trustGrade && source.columns.length));
assert.ok(registry.sources.filter((source) => source.tier === 1).every((source) => source.trustGrade === "A" || source.role === "core-wire"));
assert.ok(registry.sources.filter((source) => source.tier === 3).every((source) => source.role === "lead-only"));
assert.equal(new Set(registry.sources.map((source) => source.url)).size, registry.sources.length);
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test tests/source-library.test.mjs`

Expected: FAIL because the registry does not exist.

- [ ] **Step 3: Implement the registry schema and seed at least 66 validated sources**

Use this record shape:

```json
{
  "id": "fda-recalls",
  "name": "U.S. Food and Drug Administration Recalls",
  "url": "https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts",
  "tier": 1,
  "trustGrade": "A",
  "role": "primary",
  "language": "en",
  "columns": ["health", "daily"],
  "scanMode": "html",
  "enabled": true
}
```

The initial registry must contain at least six applicable sources for each column, with shared sources allowed across columns. Tier one must include official institutions and primary research; tier two must include large and specialist media; tier three must include only discovery communities. Validate every URL during implementation before enabling it. Do not publish this file into `site/` or link it from public navigation.

- [ ] **Step 4: Implement validation and normalization**

`scripts/lib/source-library.mjs` must export `validateSourceLibrary`, `sourcesForTier`, and `deduplicateSources`. It must reject duplicate URLs, invalid tiers, a tier-three source without `role: "lead-only"`, and a source with no applicable column.

- [ ] **Step 5: Run tests and commit**

Run: `node --test tests/source-library.test.mjs`

Expected: all registry tests pass.

```powershell
git add data/source-library.json scripts/lib/source-library.mjs tests/source-library.test.mjs
git commit -m "feat: add private three-tier source registry"
```

### Task 2: Monitor source activity and record real yield

**Files:**
- Create: `scripts/monitor-sources.mjs`
- Create: `scripts/lib/source-monitor.mjs`
- Create: `data/source-monitor-history.json`
- Create: `tests/source-monitor.test.mjs`

- [ ] **Step 1: Write failing monitor tests with mocked responses**

Test success, timeout, HTTP error, duplicate item, and empty feed. Each source-day observation must contain:

```js
{
  checkedAt: "2026-08-24T02:10:00+08:00",
  reachable: true,
  discovered: 12,
  relevant: 4,
  adopted: 0,
  latestPublishedAt: "2026-08-24T00:30:00Z",
  error: null
}
```

- [ ] **Step 2: Run the tests and verify failure**

Run: `node --test tests/source-monitor.test.mjs`

Expected: FAIL because the monitor module does not exist.

- [ ] **Step 3: Implement bounded monitoring**

The monitor must use a 15-second request timeout, identify itself with a stable user agent, retain failed sources instead of deleting them, and write through a D-drive temporary checkpoint. It must record data from the current run only and never invent historical observations.

CLI:

```powershell
node scripts/monitor-sources.mjs --registry data/source-library.json --history data/source-monitor-history.json --date 2026-08-24 --tier 1
```

- [ ] **Step 4: Add 7-day and 30-day summaries**

Compute `checks`, `reachableRate`, `relevantPerCheck`, `adoptionRate`, and `lastUsefulAt`. Do not promote or demote sources before the minimum observation window; emit recommendations separately from registry changes.

- [ ] **Step 5: Run tests and commit**

```powershell
node --test tests/source-monitor.test.mjs
git add scripts/monitor-sources.mjs scripts/lib/source-monitor.mjs data/source-monitor-history.json tests/source-monitor.test.mjs
git commit -m "feat: monitor source activity and yield"
```

### Task 3: Build the tier-escalating candidate queue

**Files:**
- Create: `scripts/build-daily-candidate-queue.mjs`
- Create: `scripts/lib/candidate-queue.mjs`
- Create: `tests/candidate-queue.test.mjs`
- Generate: `data/daily-candidates/YYYY-MM-DD/candidates.json`

- [ ] **Step 1: Write failing queue tests**

The tests must prove:

```js
assert.equal(result.target, 55);
assert.equal(result.tiersScanned.join(","), "1,2");
assert.equal(result.candidates.length, 55);
assert.equal(new Set(result.candidates.map((row) => row.canonicalUrl)).size, 55);
assert.ok(result.candidates.every((row) => row.columns.length));
```

Also test that tier three candidates have `verificationStatus: "lead-only"` and cannot enter the publishable set until linked to an A-grade primary source or two independent authoritative sources.

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test tests/candidate-queue.test.mjs`

Expected: FAIL because queue functions do not exist.

- [ ] **Step 3: Implement deduplication and tier escalation**

Deduplicate by canonical URL, DOI, normalized title, and same-event fingerprint. Scan tier one first; if fewer than 55 relevant candidates remain, scan tier two; if still fewer than 55, scan tier three only for leads. The output must record every rejection reason.

Candidate shape:

```json
{
  "id": "20260824-health-fda-sprouts",
  "title": "FDA recalls alfalfa sprouts",
  "canonicalUrl": "https://www.fda.gov/...",
  "sourceId": "fda-recalls",
  "sourceTier": 1,
  "trustGrade": "A",
  "publishedAt": "2026-08-22",
  "columns": ["health"],
  "verificationStatus": "primary-confirmed",
  "duplicateOf": null
}
```

- [ ] **Step 4: Run tests and commit**

```powershell
node --test tests/candidate-queue.test.mjs
git add scripts/build-daily-candidate-queue.mjs scripts/lib/candidate-queue.mjs tests/candidate-queue.test.mjs
git commit -m "feat: escalate source tiers for daily candidates"
```

### Task 4: Enforce 55 new articles without lowering review quality

**Files:**
- Create: `scripts/lib/daily-production-gate.mjs`
- Create: `scripts/run-daily-production.mjs`
- Create: `tests/daily-production-gate.test.mjs`
- Integrate: `scripts/local_draft_worker.py` when present

- [ ] **Step 1: Write failing production gate tests**

Test these cases:

```js
assert.equal(evaluateProduction(verified55).targetMet, true);
assert.equal(evaluateProduction(verified54).targetMet, false);
assert.equal(evaluateProduction([...verified54, recycledOldArticle]).newCount, 54);
assert.equal(evaluateProduction([...verified54, unverifiedArticle]).publishableCount, 54);
```

The gate must count only records with `changeType: "new"`, a new permanent href, a new main source, `sourceVerification.ok === true`, a passing content review, and an existing detail page.

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test tests/daily-production-gate.test.mjs`

Expected: FAIL because production gate functions do not exist.

- [ ] **Step 3: Implement the production state machine**

Use explicit states: `discovered`, `verified`, `drafted`, `codex-reviewed`, `registered`, and `published`. A local draft must retain `needs_codex_review: true` and `publish_allowed: false`; only Codex review may switch it to publishable.

Do not create a fake article when the queue is short. At cutoff, return:

```json
{
  "target": 55,
  "newCount": 43,
  "targetMet": false,
  "shortfall": 12,
  "reason": "43 candidates passed source and content review before cutoff"
}
```

- [ ] **Step 4: Add time checkpoints**

The runner must checkpoint after source scan, verification, drafting, review, registration, and rendering. Temporary files go under `D:\CodexCache\self-learning-build\YYYY-MM-DD`; repository files change only after a candidate passes Codex review.

- [ ] **Step 5: Run tests and commit**

```powershell
node --test tests/daily-production-gate.test.mjs
git add scripts/lib/daily-production-gate.mjs scripts/run-daily-production.mjs tests/daily-production-gate.test.mjs
git commit -m "feat: enforce truthful daily new article target"
```

### Task 5: Generate an audit that reconciles catalog, files, and highlights

**Files:**
- Create: `scripts/build-daily-audit.mjs`
- Create: `tests/daily-audit-reconciliation.test.mjs`
- Generate: `data/update-audit-YYYY-MM-DD.json`

- [ ] **Step 1: Write a failing reconciliation test**

For every audit article, assert:

```js
assert.equal(entry.changeType, "new");
assert.equal(entry.sourceVerification.ok, true);
assert.ok(entry.changeSummary.length >= 20);
assert.ok(catalogByHref.has(entry.href));
assert.ok(detailFileExists(entry.href));
assert.equal(catalogByHref.get(entry.href).publishedOn, audit.date);
```

Also assert `audit.newCount === audit.articles.length`, `audit.dailyDisplaySlots === 110`, `audit.rate === audit.newCount / audit.dailyDisplaySlots`, and that the set of shallow-blue `今日新增` hrefs equals the audit href set. The growing historical catalog is not the denominator; the fixed daily comparison base is the 110 visible slots across 11 columns.

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test tests/daily-audit-reconciliation.test.mjs`

Expected: FAIL because the audit builder does not exist.

- [ ] **Step 3: Implement audit generation from evidence, not declarations**

The builder must compare the pre-update catalog and semantic baseline with the post-review catalog and files. It must reject an article whose URL already existed, whose source did not change, or whose detail page does not contain reviewed substantive content.

- [ ] **Step 4: Run tests and commit**

```powershell
node --test tests/daily-audit-reconciliation.test.mjs tests/daily-highlights.test.mjs
git add scripts/build-daily-audit.mjs tests/daily-audit-reconciliation.test.mjs
git commit -m "feat: reconcile daily audit with new article files"
```

### Task 6: Update the daily schedule and complete an end-to-end dry run

**Files:**
- Modify: `docs/operations/daily-update.md`
- Create: `tests/daily-55-dry-run.test.mjs`
- Update: recurring automation instructions after code verification

- [ ] **Step 1: Add a deterministic 55-candidate dry-run fixture**

The fixture must contain five verified candidates for each of the 11 columns, use synthetic URLs under `https://example.invalid/`, and never be copied into `site/`. The test must prove that 55 permanent article files, 55 catalog entries, 11 latest-ten lists, 11 history lists, and one matching audit can be generated in an isolated D-drive temporary directory.

- [ ] **Step 2: Run the dry run and verify current pipeline failure**

Run: `node --test tests/daily-55-dry-run.test.mjs`

Expected: FAIL before the integrated pipeline is wired.

- [ ] **Step 3: Document and wire the new daily sequence**

Update operations to:

1. 01:00 archive, baseline, registry validation, and tier-one scan;
2. 01:30 tier-two escalation when needed;
3. 02:00 tier-three lead discovery when needed;
4. 02:30 source verification and drafting;
5. 04:30 stop new local-model dispatch;
6. 04:30—05:30 Codex review and registration;
7. 05:30—05:50 audit, ordering, dates, and highlights;
8. 05:50—06:10 tests and deployment;
9. 06:10—06:20 public verification and phone report.

This earlier 01:00 start provides one extra hour for the 55-article target without moving the 06:20 publication goal.

- [ ] **Step 4: Run the complete dry and real-site regression suite**

Run:

```powershell
node --test tests/*.test.mjs
node tests/daily-highlights-browser.test.cjs
node tests/browser-layout.test.cjs
git diff --check
```

Expected: all synthetic dry-run tests and all existing real-site regressions pass; no fixture URL appears under `site/`.

- [ ] **Step 5: Commit operations and request review**

```powershell
git add docs/operations/daily-update.md tests/daily-55-dry-run.test.mjs
git commit -m "docs: run expanded daily source workflow"
```

Review the final implementation for source tier boundaries, candidate deduplication, local-model restrictions, truthful target reporting, permanent links, and mobile layout. After review fixes, run the entire suite again before changing the recurring automation or publishing the first live 55-article edition.
