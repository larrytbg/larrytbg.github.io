# Latest-First Article History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every column show its newest ten articles first while preserving every older article at a permanent URL and in a complete column history.

**Architecture:** Introduce a single article catalog as the source of truth for article identity, dates, card metadata, and permanent URLs. Pure helper functions sort and split catalog entries; a renderer rebuilds column indexes, home directory lists, and static history pages without moving detail pages. Existing `/column/<column>/01` through `/10` URLs remain permanent legacy entries, while new articles use `/column/<column>/articles/<date>-<slug>/`.

**Tech Stack:** Node.js ESM, static HTML/CSS, JSON catalog, Node test runner, Playwright layout tests, GitHub Pages.

---

### Task 1: Define and test the article catalog contract

**Files:**
- Create: `scripts/lib/article-catalog.mjs`
- Create: `tests/article-catalog.test.mjs`

- [ ] **Step 1: Write the failing catalog tests**

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  activityDate,
  compareArticleActivity,
  splitLatestAndHistory,
  validateArticleCatalog,
} from "../scripts/lib/article-catalog.mjs";

const article = (id, publishedOn, updatedOn = null, changeType = "none") => ({
  id,
  column: "daily",
  href: `/column/daily/articles/${id}/`,
  title: id,
  summary: `${id} summary`,
  label: "重点",
  meta: ["测试"],
  primarySource: "测试来源",
  sourceGrade: "A",
  publishedOn,
  updatedOn,
  changeType,
});

test("activity date uses real substantive update before publication", () => {
  assert.equal(activityDate(article("a", "2026-08-20", "2026-08-24")), "2026-08-24");
  assert.equal(activityDate(article("b", "2026-08-23")), "2026-08-23");
});

test("same-day new precedes updated and older articles follow by date", () => {
  const rows = [
    article("old", "2026-08-20"),
    article("updated", "2026-08-18", "2026-08-24", "updated"),
    article("new", "2026-08-24", null, "new"),
  ].sort(compareArticleActivity);
  assert.deepEqual(rows.map((row) => row.id), ["new", "updated", "old"]);
});

test("latest ten and history never lose an article", () => {
  const rows = Array.from({ length: 13 }, (_, index) => article(`a-${index}`, `2026-08-${String(24 - index).padStart(2, "0")}`));
  const result = splitLatestAndHistory(rows, 10);
  assert.equal(result.latest.length, 10);
  assert.equal(result.history.length, 3);
  assert.equal(new Set([...result.latest, ...result.history].map((row) => row.href)).size, 13);
});

test("catalog rejects duplicate ids, duplicate hrefs, and missing dates", () => {
  const row = article("a", "2026-08-24");
  assert.throws(() => validateArticleCatalog([row, { ...row }]), /duplicate article id/);
  assert.throws(() => validateArticleCatalog([{ ...row, publishedOn: "" }]), /publishedOn/);
});
```

- [ ] **Step 2: Run the tests and verify they fail because the module does not exist**

Run: `node --test tests/article-catalog.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `scripts/lib/article-catalog.mjs`.

- [ ] **Step 3: Implement the pure catalog helpers**

```js
const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export function activityDate(article) {
  return article.updatedOn || article.publishedOn;
}

export function compareArticleActivity(left, right) {
  const dateOrder = activityDate(right).localeCompare(activityDate(left));
  if (dateOrder) return dateOrder;
  const rank = { new: 0, updated: 1, none: 2 };
  const typeOrder = (rank[left.changeType] ?? 2) - (rank[right.changeType] ?? 2);
  if (typeOrder) return typeOrder;
  const publicationOrder = right.publishedOn.localeCompare(left.publishedOn);
  return publicationOrder || left.id.localeCompare(right.id);
}

export function splitLatestAndHistory(articles, limit = 10) {
  const sorted = [...articles].sort(compareArticleActivity);
  return { latest: sorted.slice(0, limit), history: sorted.slice(limit) };
}

export function validateArticleCatalog(articles) {
  const ids = new Set();
  const hrefs = new Set();
  for (const article of articles) {
    if (!article.id || ids.has(article.id)) throw new Error(`duplicate article id: ${article.id}`);
    if (!article.href || hrefs.has(article.href)) throw new Error(`duplicate article href: ${article.href}`);
    if (!isoDate.test(article.publishedOn || "")) throw new Error(`invalid publishedOn: ${article.id}`);
    if (article.updatedOn && !isoDate.test(article.updatedOn)) throw new Error(`invalid updatedOn: ${article.id}`);
    ids.add(article.id);
    hrefs.add(article.href);
  }
  return articles;
}
```

- [ ] **Step 4: Run the catalog tests**

Run: `node --test tests/article-catalog.test.mjs`

Expected: 4 tests pass.

- [ ] **Step 5: Commit the catalog contract**

```powershell
git add scripts/lib/article-catalog.mjs tests/article-catalog.test.mjs
git commit -m "feat: define permanent article catalog"
```

### Task 2: Migrate the existing 110 articles without changing their links

**Files:**
- Create: `scripts/migrate-article-catalog.mjs`
- Create: `data/article-catalog.json`
- Create: `tests/article-catalog-migration.test.mjs`
- Read: `data/article-date-ledger.json`
- Read: `site/column/*/index.html`

- [ ] **Step 1: Write a failing migration test**

The test must execute the migration into a D-drive temporary directory, then assert:

```js
assert.equal(catalog.articles.length, 110);
assert.equal(new Set(catalog.articles.map((row) => row.href)).size, 110);
assert.ok(catalog.articles.every((row) => /^\/column\/[a-z0-9-]+\/\d{2}\/?$/.test(row.href)));
assert.ok(catalog.articles.every((row) => row.publishedOn));
assert.deepEqual([...new Set(catalog.articles.map((row) => row.column))].sort(), [
  "codex", "daily", "finance", "financial-literacy", "health", "history",
  "logic", "management", "papers", "philosophy", "ted",
]);
```

- [ ] **Step 2: Run the migration test and verify it fails**

Run: `node --test tests/article-catalog-migration.test.mjs`

Expected: FAIL because `scripts/migrate-article-catalog.mjs` and `data/article-catalog.json` do not exist.

- [ ] **Step 3: Implement migration from the current cards and ledger**

The migration script must:

1. Parse every `article-card` from each `site/column/<column>/index.html`.
2. Preserve its current `href` as both `id` and permanent `href` identity.
3. Read `publishedOn`, `updatedOn`, and `sourcePublishedOn` from `data/article-date-ledger.json`.
4. Extract title, summary, label, source grade, primary source, and metadata from the card.
5. Reject missing or duplicate links instead of inventing dates.
6. Write `{ "schemaVersion": 1, "articles": [...] }` to the requested output.

The CLI must support:

```powershell
node scripts/migrate-article-catalog.mjs --site site --ledger data/article-date-ledger.json --out data/article-catalog.json
```

- [ ] **Step 4: Generate and validate the real catalog**

Run:

```powershell
node scripts/migrate-article-catalog.mjs --site site --ledger data/article-date-ledger.json --out data/article-catalog.json
node --test tests/article-catalog.test.mjs tests/article-catalog-migration.test.mjs
```

Expected: 110 unique legacy articles; all tests pass; no existing file is moved.

- [ ] **Step 5: Commit the migration**

```powershell
git add scripts/migrate-article-catalog.mjs data/article-catalog.json tests/article-catalog-migration.test.mjs
git commit -m "feat: migrate existing articles into catalog"
```

### Task 3: Register new permanent articles

**Files:**
- Create: `scripts/register-new-article.mjs`
- Create: `scripts/lib/article-registration.mjs`
- Create: `tests/article-registration.test.mjs`

- [ ] **Step 1: Write failing registration tests**

Cover these exact cases:

```js
assert.equal(buildArticleSlug("2026-08-24", "Kazakhstan Kurultai"), "20260824-kazakhstan-kurultai");
assert.equal(buildArticleHref("daily", "20260824-kazakhstan-kurultai"), "/column/daily/articles/20260824-kazakhstan-kurultai/");
assert.throws(() => registerArticle(catalog, duplicateHref), /duplicate/);
assert.throws(() => registerArticle(catalog, { ...valid, sourceVerification: { ok: false } }), /source verification/);
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test tests/article-registration.test.mjs`

Expected: FAIL because the registration module does not exist.

- [ ] **Step 3: Implement strict registration**

`registerArticle` must require title, summary, column, permanent slug, `publishedOn`, primary source, at least one source URL, `sourceVerification.ok === true`, and a detail HTML file containing the same title. It must set `changeType: "new"`, append without replacing an existing article, validate the complete catalog, and write atomically through a temporary file in `D:\CodexCache\self-learning-build`.

The CLI usage must be:

```powershell
node scripts/register-new-article.mjs --catalog data/article-catalog.json --article data/daily-candidates/2026-08-24/daily-01.json --site site
```

- [ ] **Step 4: Run registration tests**

Run: `node --test tests/article-registration.test.mjs`

Expected: all registration tests pass and duplicate permanent links are rejected.

- [ ] **Step 5: Commit registration support**

```powershell
git add scripts/register-new-article.mjs scripts/lib/article-registration.mjs tests/article-registration.test.mjs
git commit -m "feat: register permanent new articles"
```

### Task 4: Render latest ten and complete history pages

**Files:**
- Create: `scripts/lib/article-directory-renderer.mjs`
- Create: `scripts/apply-article-ordering.mjs`
- Create: `tests/article-ordering.test.mjs`
- Modify: `site/assets/index-CVB57ELS.css`
- Generate: `site/column/<column>/history/index.html`
- Modify: `site/column/<column>/index.html`
- Modify: `site/index.html`

- [ ] **Step 1: Write failing renderer tests**

Use a 13-article fixture and assert:

```js
assert.deepEqual(extractCardHrefs(columnHtml).slice(0, 3), [
  "/column/daily/articles/20260824-new/",
  "/column/daily/articles/20260824-updated/",
  "/column/daily/articles/20260823-old/",
]);
assert.equal(extractCardHrefs(columnHtml).length, 10);
assert.equal(extractHistoryHrefs(historyHtml).length, 3);
assert.equal(new Set([...extractCardHrefs(columnHtml), ...extractHistoryHrefs(historyHtml)]).size, 13);
assert.match(columnHtml, /查看全部历史文章/);
```

Also assert that home directory entries for a column have the same first ten hrefs as its column page.

- [ ] **Step 2: Run the renderer tests and verify they fail**

Run: `node --test tests/article-ordering.test.mjs`

Expected: FAIL because ordering renderer functions do not exist.

- [ ] **Step 3: Implement card, directory, and history rendering**

The renderer must consume only `data/article-catalog.json`; it must never infer order from numeric URLs. It must render:

- ten cards on each column page;
- ten compact items on each homepage directory card;
- one static history page per column, grouped by `activityDate` month;
- `本站发布` or `本站更新` from the catalog;
- existing shallow-blue highlight classes only when `changeType` is `new` or `updated` for the build date.

The CLI must support:

```powershell
node scripts/apply-article-ordering.mjs --date 2026-08-24 --catalog data/article-catalog.json --site site
```

- [ ] **Step 4: Add responsive history styles**

Add focused classes to `site/assets/index-CVB57ELS.css`:

```css
.column-history-link{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-top:1.25rem}
.history-month{margin:1.5rem 0 .75rem;font-size:1.15rem}
.history-article-list{display:grid;gap:.75rem}
.history-article{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:1rem;padding:1rem;border:1px solid var(--line);border-radius:16px}
@media(max-width:600px){.history-article{grid-template-columns:1fr}.column-history-link{align-items:flex-start;flex-direction:column}}
```

- [ ] **Step 5: Run ordering and layout tests**

Run:

```powershell
node --test tests/article-ordering.test.mjs tests/internal-links.test.mjs
node tests/browser-layout.test.cjs
```

Expected: latest ten correct, every history link resolvable, no 390px or 1440px overflow.

- [ ] **Step 6: Commit ordering and history pages**

```powershell
git add scripts/lib/article-directory-renderer.mjs scripts/apply-article-ordering.mjs tests/article-ordering.test.mjs site
git commit -m "feat: show latest articles before history"
```

### Task 5: Generalize dates and highlights to arbitrary permanent URLs

**Files:**
- Modify: `scripts/lib/article-timeline.mjs`
- Modify: `scripts/lib/daily-highlights.mjs`
- Modify: `scripts/apply-article-dates.mjs`
- Modify: `scripts/apply-daily-highlights.mjs`
- Modify: `tests/article-timeline.test.mjs`
- Modify: `tests/daily-highlights.test.mjs`

- [ ] **Step 1: Add failing tests for legacy and permanent targets**

Both target forms must pass:

```js
const targets = [
  "daily/01",
  "daily/articles/20260824-kazakhstan-kurultai",
];
```

The tests must prove that date rendering, semantic baseline comparison, audit matching, and shallow-blue highlighting work for both forms and reject a missing detail page.

- [ ] **Step 2: Run the focused tests and verify the permanent target fails**

Run: `node --test tests/article-timeline.test.mjs tests/daily-highlights.test.mjs`

Expected: legacy target passes; permanent target fails under the current numeric-only assumptions.

- [ ] **Step 3: Replace numeric target assumptions with catalog href lookup**

Load the catalog, normalize hrefs by trimming leading and trailing slashes, and locate detail files from the stored `href`. Do not introduce a broad filesystem glob as the source of identity.

- [ ] **Step 4: Run all date and highlight tests**

Run:

```powershell
node --test tests/article-baseline.test.mjs tests/article-timeline.test.mjs tests/daily-highlights.test.mjs tests/article-ordering.test.mjs
```

Expected: all legacy and permanent URL cases pass.

- [ ] **Step 5: Commit generalized timeline support**

```powershell
git add scripts/lib/article-timeline.mjs scripts/lib/daily-highlights.mjs scripts/apply-article-dates.mjs scripts/apply-daily-highlights.mjs tests
git commit -m "feat: support permanent article urls in daily pipeline"
```

### Task 6: Update operations and run the full migration acceptance suite

**Files:**
- Modify: `docs/operations/daily-update.md`
- Create: `tests/permanent-article-history.test.mjs`

- [ ] **Step 1: Add an end-to-end failing acceptance test**

The test must check the real site and catalog:

```js
assert.equal(catalog.articles.length, 110);
assert.equal(allDetailFilesExist, true);
assert.equal(allColumnLatestCountsAreTen, true);
assert.equal(homeAndColumnOrderMatch, true);
assert.equal(allCatalogEntriesAppearInLatestOrHistory, true);
assert.equal(legacyLinksStillContainOriginalTitles, true);
```

- [ ] **Step 2: Update the daily operations order**

Document this exact generation order:

1. capture semantic baseline;
2. create and register new permanent articles;
3. apply dates and validated highlights;
4. apply article ordering;
5. verify latest ten, history completeness, links, and layouts;
6. deploy only after every check passes.

- [ ] **Step 3: Run the complete suite**

Run:

```powershell
node --test tests/*.test.mjs
node tests/daily-highlights-browser.test.cjs
node tests/browser-layout.test.cjs
git diff --check
```

Expected: all tests pass; no missing catalog entries; no broken legacy links; no layout overflow.

- [ ] **Step 4: Commit the documented workflow**

```powershell
git add docs/operations/daily-update.md tests/permanent-article-history.test.mjs
git commit -m "docs: require latest-first permanent article workflow"
```

- [ ] **Step 5: Request code review and verify before publication**

Review the final diff for URL preservation, sorting stability, archive completeness, date integrity, and mobile layout. Re-run the complete suite after any correction. Do not publish this structural migration until the review is clean.
