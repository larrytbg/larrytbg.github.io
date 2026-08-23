# Site Date and Daily Highlight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make public dates follow the site's actual publication timeline and allow daily highlights only when the current page contains verifiable new content compared with the saved baseline.

**Architecture:** Add a Git-derived article date ledger and a semantic article snapshot. Date rendering reads the ledger instead of source-date placeholders; highlight rendering validates the daily audit against the pre-update snapshot before writing any HTML. Existing incorrect highlights are cleared, while verified original-source dates remain optional detail-page metadata.

**Tech Stack:** Node.js ESM, static HTML, Git history, Node built-in test/assert APIs, Playwright.

---

## File structure

- Create `scripts/lib/article-timeline.mjs`: extract article identity, semantic content, sources and public date labels.
- Create `scripts/build-article-date-ledger.mjs`: derive the first publication date of each current article title from Git history.
- Create `scripts/capture-article-baseline.mjs`: save pre-update semantic hashes and source URLs.
- Create `scripts/apply-article-dates.mjs`: render site publication/update dates and hide unknown original dates.
- Modify `scripts/lib/daily-highlights.mjs`: validate audit entries against baseline/current semantic evidence.
- Modify `scripts/apply-daily-highlights.mjs`: require baseline input before applying highlights.
- Create `data/article-date-ledger.json`: 110 article timeline entries.
- Create `data/article-baseline.json`: current public semantic baseline for the next update.
- Modify `docs/operations/daily-update.md`: put baseline capture before content work and date/highlight rendering after it.
- Modify `tests/daily-highlights.test.mjs`: cover false-positive rejection and atomic writes.
- Create `tests/article-timeline.test.mjs`: cover Git-derived dates and public label rendering.
- Modify `tests/daily-highlights-browser.test.cjs`: use the new `本站发布/本站更新` labels.

### Task 1: Article timeline primitives

**Files:**
- Create: `scripts/lib/article-timeline.mjs`
- Test: `tests/article-timeline.test.mjs`

- [ ] **Step 1: Write failing extraction and rendering tests**

Test that a detail page produces a target, title, semantic hash and source URL list; verify that date/highlight markup does not change the semantic hash. Test these render cases:

```js
assert.match(renderDirectoryDate(html, { publishedOn: "2026-08-08" }), /本站发布：2026-08-08/);
assert.match(renderDirectoryDate(html, { publishedOn: "2026-08-08", updatedOn: "2026-08-23" }), /本站更新：2026-08-23/);
assert.doesNotMatch(renderDetailDates(html, { publishedOn: "2026-08-08" }), /原文发布|待核/);
assert.match(renderDetailDates(html, {
  publishedOn: "2026-08-08",
  updatedOn: "2026-08-23",
  sourcePublishedOn: "2026-08-21",
}), /本站首次发布：.*2026-08-08.*本站最后更新：.*2026-08-23.*原文发布：.*2026-08-21/s);
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `node tests/article-timeline.test.mjs`

Expected: FAIL because `scripts/lib/article-timeline.mjs` does not exist.

- [ ] **Step 3: Implement focused timeline helpers**

Export these functions:

```js
export function extractArticleRecord(html, target) {}
export function semanticArticleHash(html) {}
export function renderDirectoryDate(html, timeline) {}
export function renderDetailDates(html, timeline) {}
```

`semanticArticleHash()` must remove site chrome, date spans, highlighter markup and whitespace-only differences before hashing; it must retain article headings, paragraphs, lists and source links.

- [ ] **Step 4: Run the test and confirm GREEN**

Run: `node tests/article-timeline.test.mjs`

Expected: `article timeline checks passed`.

- [ ] **Step 5: Commit**

```powershell
git add scripts/lib/article-timeline.mjs tests/article-timeline.test.mjs
git commit -m "feat: add article timeline primitives"
```

### Task 2: Build the 110-article site date ledger

**Files:**
- Create: `scripts/build-article-date-ledger.mjs`
- Create: `data/article-date-ledger.json`
- Modify: `tests/article-timeline.test.mjs`

- [ ] **Step 1: Write a failing Git-history test**

Create a temporary Git repository with one article title introduced on day one and replaced on day two. Assert that the ledger assigns the current title to day two, not the first day the slot existed.

```js
assert.equal(ledger.articles["daily/01"].publishedOn, "2026-08-02");
assert.equal(ledger.articles["daily/01"].evidence, "git-current-title-first-seen");
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `node tests/article-timeline.test.mjs`

Expected: FAIL because the ledger builder is missing.

- [ ] **Step 3: Implement the ledger builder**

For every `site/column/<column>/<NN>/index.html`, extract the current `<h1>` and run Git history from oldest to newest until that exact title first appears. Store:

```json
{
  "version": 1,
  "articles": {
    "daily/01": {
      "title": "current title",
      "publishedOn": "2026-08-14",
      "updatedOn": null,
      "sourcePublishedOn": "2026-08-14",
      "evidence": "git-current-title-first-seen",
      "commit": "..."
    }
  }
}
```

Only preserve a source date when the current detail page contains a valid `YYYY-MM-DD`; omit unknown values rather than writing a placeholder. The builder must fail unless exactly 110 article entries are produced.

- [ ] **Step 4: Generate and inspect the real ledger**

Run: `node scripts/build-article-date-ledger.mjs --site site --out data/article-date-ledger.json`

Expected: `article date ledger written: 110` and zero `待核` values.

- [ ] **Step 5: Run tests and commit**

```powershell
node tests/article-timeline.test.mjs
git add scripts/build-article-date-ledger.mjs tests/article-timeline.test.mjs data/article-date-ledger.json
git commit -m "feat: derive site publication dates from git"
```

### Task 3: Render the new public date standard

**Files:**
- Create: `scripts/apply-article-dates.mjs`
- Modify: `scripts/lib/article-timeline.mjs`
- Modify: `tests/article-timeline.test.mjs`
- Modify: `site/index.html`
- Modify: `site/column/*/index.html`
- Modify: `site/column/*/NN/index.html`

- [ ] **Step 1: Write failing atomic-render tests**

Use a temporary site containing a homepage, one column index and one detail page. Assert that all three show the same site date, unknown original dates disappear, and a missing target leaves every file unchanged.

- [ ] **Step 2: Run the test and confirm RED**

Run: `node tests/article-timeline.test.mjs`

Expected: FAIL because `apply-article-dates.mjs` is missing.

- [ ] **Step 3: Implement the atomic renderer**

The CLI must accept:

```powershell
node scripts/apply-article-dates.mjs --site site --ledger data/article-date-ledger.json
```

Read and validate all 110 detail pages before writing. Update homepage directory items, homepage today cards, eleven column indexes and detail metadata. Remove every public `资料发布日期待核` and do not alter article bodies or source links.

- [ ] **Step 4: Confirm GREEN and apply to the real site**

```powershell
node tests/article-timeline.test.mjs
node scripts/apply-article-dates.mjs --site site --ledger data/article-date-ledger.json
rg -n "资料发布日期待核|历史日期待核" site -g "*.html"
```

Expected: tests pass; renderer reports 110 articles; `rg` returns no public placeholders.

- [ ] **Step 5: Commit**

```powershell
git add scripts/apply-article-dates.mjs scripts/lib/article-timeline.mjs tests/article-timeline.test.mjs site
git commit -m "fix: show site publication dates publicly"
```

### Task 4: Require semantic evidence before highlighting

**Files:**
- Create: `scripts/capture-article-baseline.mjs`
- Modify: `scripts/lib/daily-highlights.mjs`
- Modify: `scripts/apply-daily-highlights.mjs`
- Modify: `tests/daily-highlights.test.mjs`
- Modify: `tests/fixtures/daily-highlight-audit.json`

- [ ] **Step 1: Write failing false-positive tests**

Add cases proving that the highlighter rejects:

```js
// Audit says updated but semantic hash is unchanged.
assert.throws(() => validateHighlightEvidence(entry, baseline, current), /no semantic article change/);

// Only date/highlight markup changed.
assert.throws(() => validateHighlightEvidence(entry, baseline, dateOnlyCurrent), /no semantic article change/);

// Existing article text changed but has no new source or dated substantive section.
assert.throws(() => validateHighlightEvidence(entry, baseline, wordingOnlyCurrent), /missing substantive evidence/);
```

Also test the allowed cases: current title/source changed (`new`) and an existing article gained a new source URL or a section marked `data-substantive-update="YYYY-MM-DD"` (`updated`).

- [ ] **Step 2: Run the test and confirm RED**

Run: `node tests/daily-highlights.test.mjs`

Expected: FAIL because baseline validation is not implemented.

- [ ] **Step 3: Implement baseline capture and validation**

Baseline records use this shape:

```json
{
  "capturedOn": "2026-08-23",
  "articles": {
    "daily/01": {
      "title": "...",
      "semanticHash": "sha256...",
      "sourceUrls": ["https://..."]
    }
  }
}
```

Require `--baseline` in the highlighter CLI. Validate all entries before calculating any pending writes. `new` requires a missing baseline target, changed title, or changed primary source; `updated` requires a changed semantic hash plus a new source URL or a matching dated substantive-update section.

- [ ] **Step 4: Confirm GREEN**

```powershell
node tests/daily-highlights.test.mjs
node scripts/capture-article-baseline.mjs --site site --date 2026-08-23 --out data/article-baseline.json
```

Expected: unit checks pass and baseline contains exactly 110 articles.

- [ ] **Step 5: Commit**

```powershell
git add scripts/capture-article-baseline.mjs scripts/lib/daily-highlights.mjs scripts/apply-daily-highlights.mjs tests/daily-highlights.test.mjs tests/fixtures/daily-highlight-audit.json data/article-baseline.json
git commit -m "fix: require real article changes for highlights"
```

### Task 5: Clear current false highlights and update operations

**Files:**
- Modify: `site/index.html`
- Modify: `site/column/*/index.html`
- Modify: `tests/daily-highlights-browser.test.cjs`
- Modify: `docs/operations/daily-update.md`
- Modify: `data/article-date-ledger.json`

- [ ] **Step 1: Add a failing next-run cleanup assertion**

Assert that an empty, valid audit clears all previous highlight attributes and badges from homepage and column pages while preserving the stylesheet.

- [ ] **Step 2: Run the test and confirm RED if cleanup is incomplete**

Run: `node tests/daily-highlights.test.mjs`

Expected: FAIL if any stale badge remains.

- [ ] **Step 3: Clear the public site and document the new order**

Run the highlighter with an empty audited list and the current baseline. Update the runbook to this order:

```text
capture baseline -> edit content -> verify sources -> update ledger -> render dates -> validate audit against baseline -> apply highlights -> tests -> deploy
```

The runbook must explicitly prohibit highlighting an old-source rewrite, link recheck, date change or formatting change.

- [ ] **Step 4: Run focused checks**

```powershell
node tests/article-timeline.test.mjs
node tests/daily-highlights.test.mjs
node tests/daily-highlights-browser.test.cjs
rg -n "资料发布日期待核|历史日期待核|data-daily-highlight|daily-highlight-badge" site -g "*.html"
```

Expected: all tests pass; public placeholders and current highlight markers are absent.

- [ ] **Step 5: Commit**

```powershell
git add site docs/operations/daily-update.md tests/daily-highlights-browser.test.cjs data/article-date-ledger.json
git commit -m "fix: reset daily highlights to verified changes only"
```

### Task 6: Full verification and publication

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run the full acceptance suite**

```powershell
node tests/article-timeline.test.mjs
node tests/daily-highlights.test.mjs
node tests/daily-highlights-browser.test.cjs
node tests/browser-layout.test.cjs
node tests/publish-2026-08-22.test.mjs
git diff --check
```

Expected: all checks exit 0; 390px and 1440px layouts pass; internal links report zero broken links.

- [ ] **Step 2: Review the final diff against the design**

Confirm all 110 article routes have a ledger entry, public directories use only site dates, detail pages contain optional original dates, and zero highlight marker exists without baseline-backed audit evidence.

- [ ] **Step 3: Push and verify GitHub Pages**

```powershell
git push origin main
```

Verify `https://larrytbg.github.io/` returns HTTP 200 and the live HTML contains `本站发布` or `本站更新`, contains no `资料发布日期待核`, and contains no stale highlight marker.

- [ ] **Step 4: Send completion report**

Send the public URL, date-rule change, current verified highlight count, test totals and publication result to the phone-push task. Mark delivery successful only after a server receipt.
