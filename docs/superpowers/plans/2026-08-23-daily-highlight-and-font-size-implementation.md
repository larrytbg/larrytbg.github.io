# Daily Highlight and Font Size Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the yellow daily-update highlight with the approved light-blue treatment and enlarge reading text across the static site without changing content, dates, layouts, or highlight eligibility.

**Architecture:** Keep the highlight treatment isolated in `daily-highlights.css`. Append a clearly named readability override block to the one shared production stylesheet so all existing static pages inherit the larger type without editing 194 HTML files. Add a focused static test before changing CSS, then run the existing responsive and release suites.

**Tech Stack:** Static HTML/CSS, Node.js test scripts, Playwright with Microsoft Edge, GitHub Pages.

---

### Task 1: Add visual-style regression coverage

**Files:**
- Create: `tests/visual-style.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const highlightCss = readFileSync(path.join(root, "site/assets/daily-highlights.css"), "utf8");
const baseCss = readFileSync(path.join(root, "site/assets/index-CVB57ELS.css"), "utf8");

assert.match(highlightCss, /#3c78a8/i, "高亮左侧提示线必须使用已确认的蓝色");
assert.match(highlightCss, /rgba\(144,\s*197,\s*239,\s*\.28\)/i, "高亮背景必须使用浅蓝渐变");
assert.doesNotMatch(highlightCss, /255,\s*218,\s*122|#e5a72d|#8d5400/i, "不得保留旧黄色高亮");
assert.match(baseCss, /\/\* readability-2026-08-23 \*\//, "缺少全站字体放大覆盖块");
assert.match(baseCss, /\.today-card p\{font-size:14px/, "首页摘要应为14px");
assert.match(baseCss, /\.directory-card li\{font-size:15px/, "目录正文应为15px");
assert.match(baseCss, /\.article-preview-summary\{font-size:16px/, "文章摘要应为16px");
assert.match(baseCss, /\.sourced-paragraph p\{font-size:17px/, "文章正文应为17px");
assert.match(baseCss, /\.directory-item-date[^}]*font-size:12px/, "日期文字不得小于12px");
assert.doesNotMatch(baseCss.split("/* readability-2026-08-23 */")[1] ?? "", /\.directory-header h1|\.column-hero h1|\.reading-hero h1/, "本次不得放大主要大标题");

console.log("visual style checks passed");
```

- [ ] **Step 2: Run the test and verify it fails on the old yellow style**

Run: `node tests/visual-style.test.mjs`

Expected: FAIL because `#3c78a8`, the readability marker, and the larger font rules are not yet present.

- [ ] **Step 3: Commit the failing test**

```powershell
git add -- tests/visual-style.test.mjs
git commit -m "test: define highlight color and readability targets"
```

### Task 2: Apply the approved blue highlight and font sizes

**Files:**
- Modify: `site/assets/daily-highlights.css`
- Modify: `site/assets/index-CVB57ELS.css`

- [ ] **Step 1: Replace the old yellow highlight rules**

Use these exact visual values in `site/assets/daily-highlights.css`:

```css
.is-daily-highlight {
  position: relative;
  background: linear-gradient(90deg, rgba(144, 197, 239, 0.28), rgba(255, 255, 255, 0));
  box-shadow: inset 4px 0 0 #3c78a8;
}

.daily-highlight-badge {
  background: #245f8c;
  color: #f7fbff;
}
```

Retain the existing badge spacing, weight, wrapping, and mobile sizing. Change the mobile inset line from the old yellow value to `#3c78a8`.

- [ ] **Step 2: Append the shared readability override block**

Append this block to `site/assets/index-CVB57ELS.css` so it wins after existing desktop and mobile rules:

```css
/* readability-2026-08-23 */
.today-card p{font-size:14px;line-height:1.7}
.today-updated-date,.directory-item-date,.article-updated-date{font-size:12px}
.directory-card li{font-size:15px;line-height:1.55}
.article-preview-summary{font-size:16px;line-height:1.75}
.reading-deck{font-size:19px;line-height:1.75}
.summary-blueprint-lead p,.summary-threads p,.summary-card-grid p,.beginner-primer p,.sourced-paragraph p{font-size:17px;line-height:1.75}
```

- [ ] **Step 3: Run the new test and verify it passes**

Run: `node tests/visual-style.test.mjs`

Expected: `visual style checks passed`.

- [ ] **Step 4: Run the focused highlight layout test**

Run with the bundled Playwright path:

```powershell
$env:NODE_PATH='C:\Users\Larry Grant\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
node tests/daily-highlights-browser.test.cjs
```

Expected: `daily highlight browser layout passed` at 390px and 1440px.

- [ ] **Step 5: Commit the production CSS change**

```powershell
git add -- site/assets/daily-highlights.css site/assets/index-CVB57ELS.css
git commit -m "style: use blue update highlights and larger text"
```

### Task 3: Verify the complete site

**Files:**
- Test: `tests/visual-style.test.mjs`
- Test: `tests/daily-highlights-browser.test.cjs`
- Test: `tests/browser-layout.test.cjs`
- Test: `tests/internal-links.test.mjs`
- Test: `tests/article-timeline.test.mjs`
- Test: `tests/daily-highlights.test.mjs`
- Test: `tests/publish-2026-08-22.test.mjs`
- Test: `tests/publish-2026-08-22-round2.test.mjs`

- [ ] **Step 1: Run the static regression suite**

```powershell
$tests = @(
  'tests/visual-style.test.mjs',
  'tests/article-timeline.test.mjs',
  'tests/article-baseline.test.mjs',
  'tests/daily-highlights.test.mjs',
  'tests/daily-highlights-browser.test.cjs',
  'tests/internal-links.test.mjs',
  'tests/publish-2026-08-22.test.mjs',
  'tests/publish-2026-08-22-round2.test.mjs'
)
foreach ($test in $tests) {
  node $test
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
```

Expected: every test prints its success line; internal links remain at zero failures.

- [ ] **Step 2: Start a local static server and run the full responsive test**

```powershell
$server = Start-Process -FilePath python -ArgumentList '-m','http.server','4173','--directory','site' -WindowStyle Hidden -PassThru
try {
  node tests/browser-layout.test.cjs
} finally {
  Stop-Process -Id $server.Id -ErrorAction SilentlyContinue
}
```

Expected: `browser layout ok: 29 routes at 390px and 1440px`.

- [ ] **Step 3: Inspect the diff and repository state**

```powershell
git diff --check
git status --short --branch
```

Expected: no whitespace errors and only intentional plan/test/style files are committed.

### Task 4: Review, publish, and verify the public site

**Files:**
- Review: all commits created by Tasks 1-3

- [ ] **Step 1: Perform the required code review**

Check that only CSS and its tests changed; confirm no HTML content, article dates, source links, highlight eligibility data, or automation rules changed.

- [ ] **Step 2: Push the verified main branch**

```powershell
git push origin main
```

Expected: local `HEAD` and `origin/main` resolve to the same commit.

- [ ] **Step 3: Verify GitHub Pages after deployment**

Request the public homepage, one column page, and one article page with a cache-busting query. Confirm HTTP 200, the shared stylesheet contains the readability marker, and the highlight stylesheet contains the blue values with no old yellow values.

- [ ] **Step 4: Send the completion report to the phone-push task**

Send the public URL, visual changes, test results, and completion time to task `01a005a4-0fe0-7933-a7fe-500b77dd496c`. Claim phone delivery only after an ntfy `status=accepted` receipt with a message ID.
