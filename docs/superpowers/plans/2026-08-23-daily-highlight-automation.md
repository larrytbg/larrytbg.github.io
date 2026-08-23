# 自学总站每日自动更新与当日高亮 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 恢复每天02:00运行的自学总站自动任务，并让当天真实新增或实质更新的文章在首页和专栏目录高亮到下一次发布。

**Architecture:** 当天审计JSON是唯一高亮数据源。一个纯函数模块负责标准化审计记录、清除旧标记并向静态HTML写入新标记；一个命令行脚本负责读取文件、更新首页与十一项专栏目录。每日自动任务在内容审计完成后运行该脚本，再执行现有验收、链接、移动端和发布流程。

**Tech Stack:** Node.js 22、ES modules、静态HTML/CSS、Node assert测试、Playwright、Codex heartbeat automation、GitHub Pages。

---

## 文件职责

- `scripts/lib/daily-highlights.mjs`：纯函数；解析审计、清除旧标记、给首页和专栏目录写入标记。
- `scripts/apply-daily-highlights.mjs`：命令行入口；读取日期、审计和站点目录，更新静态文件并输出统计。
- `site/assets/daily-highlights.css`：高亮、标签及390px手机适配样式。
- `tests/daily-highlights.test.mjs`：纯函数和命令行验收，覆盖新增、更新、旧标记清除及错误审计。
- `tests/browser-layout.test.cjs`：增加有高亮页面的390px与1440px布局检查。
- `docs/operations/daily-update.md`：记录每日任务顺序、命令、失败处理和人工复核方法。
- Codex automation：每天北京时间02:00唤醒当前任务，按操作文档完成内容、审计、高亮、测试和发布。

### Task 1: 建立审计到高亮的失败测试

**Files:**
- Create: `tests/daily-highlights.test.mjs`
- Test: `tests/daily-highlights.test.mjs`

- [ ] **Step 1: 写审计标准化和页面标记的失败测试**

```js
import assert from "node:assert/strict";
import {
  normalizeHighlightEntries,
  applyHighlightsToHome,
  applyHighlightsToColumn,
} from "../scripts/lib/daily-highlights.mjs";

const entries = normalizeHighlightEntries({
  date: "2026-08-23",
  articles: [
    { target: "daily/01", changeType: "new", changeSummary: "替换为当天新资料", sourceVerification: { ok: true } },
    { target: "logic/02", changeType: "updated", changeSummary: "新增反例", sourceVerification: { ok: true } },
  ],
});
assert.deepEqual(entries.map(({ target, changeType }) => ({ target, changeType })), [
  { target: "daily/01", changeType: "new" },
  { target: "logic/02", changeType: "updated" },
]);

const home = '<a href="/column/daily" class="directory-card"><ul><li class="is-primary"><span>01</span><span class="directory-item-title">标题</span></li></ul></a>';
const markedHome = applyHighlightsToHome(home, entries);
assert.match(markedHome, /data-daily-highlight="new"/);
assert.match(markedHome, /今日新增/);

const column = '<article class="article-card"><h3><a href="/column/logic/02">标题</a></h3></article>';
const markedColumn = applyHighlightsToColumn(column, "logic", entries);
assert.match(markedColumn, /data-daily-highlight="updated"/);
assert.match(markedColumn, /今日更新/);
```

- [ ] **Step 2: 运行测试并确认按预期失败**

Run: `node tests/daily-highlights.test.mjs`  
Expected: FAIL，提示找不到 `scripts/lib/daily-highlights.mjs`。

- [ ] **Step 3: 增加边界测试**

```js
assert.throws(() => normalizeHighlightEntries({
  date: "2026-08-23",
  articles: [{ target: "daily/01", changeType: "updated", changeSummary: "", sourceVerification: { ok: true } }],
}), /changeSummary/);

assert.throws(() => normalizeHighlightEntries({
  date: "2026-08-23",
  articles: [{ target: "daily/01", changeType: "updated", changeSummary: "新增解释", sourceVerification: { ok: false } }],
}), /source verification/);
```

- [ ] **Step 4: 再次运行并确认仍为失败状态**

Run: `node tests/daily-highlights.test.mjs`  
Expected: FAIL；实现文件仍不存在。

### Task 2: 实现纯函数高亮模块

**Files:**
- Create: `scripts/lib/daily-highlights.mjs`
- Test: `tests/daily-highlights.test.mjs`

- [ ] **Step 1: 实现审计记录标准化**

```js
export function normalizeHighlightEntries(audit) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(audit?.date ?? "")) throw new Error("invalid audit date");
  if (!Array.isArray(audit.articles)) throw new Error("articles must be an array");
  const seen = new Set();
  return audit.articles.map((article) => {
    const target = article.target ?? `${article.column}/${article.index}`;
    if (!/^[a-z-]+\/\d{2}$/.test(target)) throw new Error(`invalid target: ${target}`);
    if (!['new', 'updated'].includes(article.changeType)) throw new Error(`invalid changeType: ${target}`);
    if (!article.changeSummary?.trim()) throw new Error(`missing changeSummary: ${target}`);
    if (article.sourceVerification?.ok !== true) throw new Error(`source verification failed: ${target}`);
    if (seen.has(target)) throw new Error(`duplicate target: ${target}`);
    seen.add(target);
    return { target, changeType: article.changeType, changeSummary: article.changeSummary.trim() };
  });
}
```

- [ ] **Step 2: 实现旧标记清除**

```js
export function clearHighlightMarkup(html) {
  return html
    .replace(/\sdata-daily-highlight="(?:new|updated)"/g, "")
    .replace(/\sis-daily-highlight/g, "")
    .replace(/<span class="daily-highlight-badge">(?:今日新增|今日更新)<\/span>/g, "");
}
```

- [ ] **Step 3: 实现首页和专栏目录标记**

```js
const badge = (type) => `<span class="daily-highlight-badge">${type === "new" ? "今日新增" : "今日更新"}</span>`;

export function applyHighlightsToHome(input, entries) {
  let html = clearHighlightMarkup(input);
  for (const entry of entries) {
    const [column, index] = entry.target.split("/");
    const cardPattern = new RegExp(`(<a href="/column/${column}" class="directory-card[^>]*>[\\s\\S]*?<ul>)([\\s\\S]*?)(</ul>[\\s\\S]*?</a>)`);
    html = html.replace(cardPattern, (whole, start, list, end) => {
      const itemPattern = new RegExp(`<li class="([^"]*)"><span>${index}</span>`);
      const marked = list.replace(itemPattern, `<li class="$1 is-daily-highlight" data-daily-highlight="${entry.changeType}"><span>${index}</span>${badge(entry.changeType)}`);
      return `${start}${marked}${end}`;
    });
    const todayPattern = new RegExp(`<a href="/column/${column}/${index}" class="([^"]*today-card[^"]*)">`);
    html = html.replace(todayPattern, `<a href="/column/${column}/${index}" class="$1 is-daily-highlight" data-daily-highlight="${entry.changeType}">${badge(entry.changeType)}`);
  }
  return html;
}

export function applyHighlightsToColumn(input, column, entries) {
  let html = clearHighlightMarkup(input);
  for (const entry of entries.filter(({ target }) => target.startsWith(`${column}/`))) {
    const [, index] = entry.target.split("/");
    const pattern = new RegExp(`<article class="([^"]*article-card[^"]*)">([\\s\\S]*?<a href="/column/${column}/${index}")`);
    html = html.replace(pattern, `<article class="$1 is-daily-highlight" data-daily-highlight="${entry.changeType}">${badge(entry.changeType)}$2`);
  }
  return html;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node tests/daily-highlights.test.mjs`  
Expected: `daily highlight unit checks passed`。

- [ ] **Step 5: 提交纯函数与测试**

```powershell
git add scripts/lib/daily-highlights.mjs tests/daily-highlights.test.mjs
git commit -m "新增每日高亮生成模块"
```

### Task 3: 建立命令行入口与静态样式

**Files:**
- Create: `scripts/apply-daily-highlights.mjs`
- Create: `site/assets/daily-highlights.css`
- Modify: `tests/daily-highlights.test.mjs`

- [ ] **Step 1: 增加命令行失败场景测试**

```js
import { spawnSync } from "node:child_process";
const missing = spawnSync(process.execPath, ["scripts/apply-daily-highlights.mjs", "--date", "2026-08-23", "--audit", "missing.json"], { encoding: "utf8" });
assert.notEqual(missing.status, 0);
assert.match(`${missing.stdout}${missing.stderr}`, /audit file not found/);
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node tests/daily-highlights.test.mjs`  
Expected: FAIL；命令行脚本不存在。

- [ ] **Step 3: 实现命令行文件更新**

```js
import { access, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { applyHighlightsToColumn, applyHighlightsToHome, normalizeHighlightEntries } from "./lib/daily-highlights.mjs";

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, values) => {
  if (value.startsWith("--")) pairs.push([value.slice(2), values[index + 1]]);
  return pairs;
}, []));
const root = path.resolve(import.meta.dirname, "..");
const site = path.resolve(args.site ?? path.join(root, "site"));
const auditPath = path.resolve(args.audit ?? path.join(root, "data", `update-audit-${args.date}.json`));
await access(auditPath).catch(() => { throw new Error(`audit file not found: ${auditPath}`); });
const audit = JSON.parse(await readFile(auditPath, "utf8"));
const entries = normalizeHighlightEntries({ ...audit, date: args.date ?? audit.date });
const stylesheet = '<link rel="stylesheet" href="/assets/daily-highlights.css"/>';
const ensureStylesheet = (html) => html.includes(stylesheet) ? html : html.replace("</head>", `${stylesheet}</head>`);

const homePath = path.join(site, "index.html");
await writeFile(homePath, ensureStylesheet(applyHighlightsToHome(await readFile(homePath, "utf8"), entries)), "utf8");
const columnEntries = await readdir(path.join(site, "column"), { withFileTypes: true });
for (const column of columnEntries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)) {
  const file = path.join(site, "column", column, "index.html");
  await writeFile(file, ensureStylesheet(applyHighlightsToColumn(await readFile(file, "utf8"), column, entries)), "utf8");
}
console.log(`daily highlights applied: ${entries.length}`);
```

- [ ] **Step 4: 创建静态样式**

```css
.is-daily-highlight {
  position: relative;
  background: linear-gradient(90deg, rgba(255, 218, 122, .22), rgba(255, 255, 255, 0));
  box-shadow: inset 4px 0 0 #e5a72d;
}
.daily-highlight-badge {
  display: inline-flex;
  align-items: center;
  width: max-content;
  margin: 0 .45rem .25rem 0;
  padding: .18rem .48rem;
  border-radius: 999px;
  background: #8d5400;
  color: #fff8e6;
  font-size: .72rem;
  font-weight: 700;
  line-height: 1.2;
}
@media (max-width: 520px) {
  .daily-highlight-badge { font-size: .68rem; margin-bottom: .35rem; }
  .is-daily-highlight { box-shadow: inset 3px 0 0 #e5a72d; }
}
```

- [ ] **Step 5: 运行单元与命令行测试**

Run: `node tests/daily-highlights.test.mjs`  
Expected: PASS，错误审计被阻断，合法审计正确生成标记。

- [ ] **Step 6: 提交命令行与样式**

```powershell
git add scripts/apply-daily-highlights.mjs site/assets/daily-highlights.css tests/daily-highlights.test.mjs
git commit -m "接入每日更新高亮样式"
```

### Task 4: 建立可复现的集成验收

**Files:**
- Create: `tests/fixtures/daily-highlight-audit.json`
- Modify: `tests/daily-highlights.test.mjs`
- Create: `tests/daily-highlights-browser.test.cjs`

- [ ] **Step 1: 创建包含新增和更新的审计夹具**

```json
{
  "date": "2026-08-23",
  "articles": [
    { "target": "daily/01", "changeType": "new", "changeSummary": "替换为当天新资料", "sourceVerification": { "ok": true } },
    { "target": "logic/02", "changeType": "updated", "changeSummary": "新增反例和使用方法", "sourceVerification": { "ok": true } }
  ]
}
```

- [ ] **Step 2: 测试两次运行会清除旧标记**

```js
const twice = applyHighlightsToHome(applyHighlightsToHome(home, entries), [entries[1]]);
assert.doesNotMatch(twice, /data-daily-highlight="new"/);
assert.equal((twice.match(/data-daily-highlight="updated"/g) ?? []).length, 1);
```

- [ ] **Step 3: 创建独立的高亮浏览器排版测试**

```js
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { chromium } = require("playwright");

(async () => {
  const css = readFileSync("site/assets/daily-highlights.css", "utf8");
  const browser = await chromium.launch({ headless: true, executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" });
  try {
    for (const width of [390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.setContent(`<style>${css}</style><main style="max-width:100%;padding:12px"><article class="article-card is-daily-highlight" data-daily-highlight="updated"><span class="daily-highlight-badge">今日更新</span><h3>这是一个用于检查手机宽度的较长文章标题</h3></article></main>`);
      const layout = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
      assert.ok(layout.scrollWidth <= layout.innerWidth + 1, `${width}px横向溢出`);
      assert.equal(await page.locator(".daily-highlight-badge").textContent(), "今日更新");
      await page.close();
    }
  } finally {
    await browser.close();
  }
  console.log("daily highlight browser layout passed");
})();
```

- [ ] **Step 4: 运行全部高亮验收**

Run: `node tests/daily-highlights.test.mjs`  
Expected: PASS。

Run: `$env:NODE_PATH='C:\Users\Larry Grant\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'; node tests/browser-layout.test.cjs`  
Expected: 现有29个页面在390px和1440px全部无溢出。

Run: `$env:NODE_PATH='C:\Users\Larry Grant\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'; node tests/daily-highlights-browser.test.cjs`  
Expected: `daily highlight browser layout passed`。

- [ ] **Step 5: 提交集成测试**

```powershell
git add tests/fixtures/daily-highlight-audit.json tests/daily-highlights.test.mjs tests/daily-highlights-browser.test.cjs
git commit -m "验证每日高亮生命周期与排版"
```

### Task 5: 编写每日运行手册并建立自动任务

**Files:**
- Create: `docs/operations/daily-update.md`
- External state: Codex heartbeat automation attached to the current task

- [ ] **Step 1: 编写固定运行顺序**

```markdown
# 自学总站每日更新
1. 02:00读取仓库和上一版审计，归档当前版本。
2. 检索、核验并逐篇更新；生成含target、changeType、changeSummary和sourceVerification的当天审计。
3. 运行 `node scripts/apply-daily-highlights.mjs --date YYYY-MM-DD --audit data/update-audit-YYYY-MM-DD.json`。
4. 运行内容验收、内部链接和浏览器布局检查；任一步失败都不发布。
5. 提交并推送main，等待GitHub Actions成功，再验证正式网址。
6. 调用手机消息推送任务；无服务端回执时记录失败。
```

- [ ] **Step 2: 使用automation_update创建每日heartbeat**

创建名为“自学总站每日更新”的heartbeat，附着当前任务；时间为北京时间每天02:00，状态ACTIVE。使用以下完整提示词：

```text
每天北京时间02:00开始更新“自学总站”。固定仓库D:\CodexProjects\codex自学习，唯一正式网址https://larrytbg.github.io/。更新前归档当前版本；检索和核验新资料后，只把真实新增或实质更新写入当天审计。每条审计必须包含target、changeType、changeSummary和sourceVerification.ok=true；改日期、排版、标点或同义改写不得计入。审计完成后运行node scripts/apply-daily-highlights.mjs --date 当天日期 --audit data/update-audit-当天日期.json，使首页、今日必读和各专栏目录显示“今日新增”或“今日更新”，并清除上一日高亮。随后运行内容验收、内部链接和390px/1440px布局测试；任何来源、测试、部署或公网验证失败都不得发布半成品。测试全部通过后提交并推送main，等待GitHub Actions成功并验证正式网址。最后调用任务01a005a4-0fe0-7933-a7fe-500b77dd496c发送手机完工消息；没有服务端成功回执时如实记录失败。目标06:20完成，最迟06:30发布。
```

- [ ] **Step 3: 重新读取自动任务确认配置**

使用 `automation_update` 的view模式检查：名称、ACTIVE状态、02:00规则、目标任务和完整提示词均正确；确认没有重复创建第二个同名任务。

- [ ] **Step 4: 提交运行手册**

```powershell
git add docs/operations/daily-update.md
git commit -m "记录自学总站每日自动更新流程"
```

### Task 6: 最终验证、发布和公网检查

**Files:**
- Verify: `scripts/lib/daily-highlights.mjs`
- Verify: `scripts/apply-daily-highlights.mjs`
- Verify: `site/assets/daily-highlights.css`
- Verify: `tests/daily-highlights.test.mjs`
- Verify: `tests/internal-links.test.mjs`
- Verify: `tests/browser-layout.test.cjs`

- [ ] **Step 1: 运行Fresh测试套件**

```powershell
node tests/daily-highlights.test.mjs
node tests/publish-2026-08-22-round2.test.mjs
node tests/publish-2026-08-22.test.mjs
node tests/internal-links.test.mjs
$env:NODE_PATH='C:\Users\Larry Grant\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
node tests/browser-layout.test.cjs
node tests/daily-highlights-browser.test.cjs
git diff --check
```

Expected: 所有命令退出码0；高亮集合等于夹具审计；194页内部链接无断链；390px和1440px无溢出。

- [ ] **Step 2: 请求独立代码审查并修复阻断项**

使用 `requesting-code-review` 对数据真实性、旧高亮清除、正则边界、移动端和自动任务配置做只读审查。Ready to merge不是YES时不得发布。

- [ ] **Step 3: 推送main并等待发布成功**

```powershell
git push origin main
```

通过GitHub Actions API确认本次提交的发布工作流为`completed/success`。

- [ ] **Step 4: 验证正式网址**

```powershell
$commit = git rev-parse --short HEAD
Invoke-WebRequest -UseBasicParsing "https://larrytbg.github.io/?v=$commit"
```

Expected: HTTP 200；网页包含高亮CSS链接。若当天审计中有文章，则对应标记和标签可见；若当天无真实更新，则标记数为0。

- [ ] **Step 5: 汇报真实结果**

汇报自动任务是否ACTIVE、下次运行时间、高亮测试结果、正式网址和手机推送结果。不得把测试夹具文章冒充当天真实更新。
