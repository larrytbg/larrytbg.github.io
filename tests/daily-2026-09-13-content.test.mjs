import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { extractArticleRecord } from "../scripts/lib/article-timeline.mjs";

const date = "2026-09-13";
const expected = new Map([
  ["daily/02", { title: "跨境山地灾害预警要让制度时钟跑在灾害前面", source: "https://www.nature.com/articles/s44304-026-00271-y", sourceDate: "2026-09-12" }],
  ["finance/02", { title: "全球顺差与逆差背后是储蓄和投资选择，而不只是贸易竞争力", source: "https://www.imf.org/en/publications/fandd/issues/2026/09/back-to-basics-a-world-seeking-balance-manasa-patnam", sourceDate: null }],
  ["health/02", { title: "青少年心理健康诊断上升要区分真实恶化、识别改善与诊断扩张", source: "https://www.nature.com/articles/s41380-026-03884-x", sourceDate: "2026-09-12" }],
  ["papers/02", { title: "概率框架在分子模拟中找到区分高低密度非晶冰的局部结构变量", source: "https://www.nature.com/articles/s41467-026-77279-5", sourceDate: "2026-09-12" }],
  ["philosophy/02", { title: "把大模型潜在人格当作安全构造，不等于承认模型具有人的自我", source: "https://www.nature.com/articles/s44387-026-00154-7", sourceDate: "2026-09-12" }],
]);
const targets = [...expected.keys()].sort();

test("9月13日只发布五篇通过事实复核的真实新增", async () => {
  const audit = JSON.parse(await readFile(`data/update-audit-${date}.json`, "utf8"));
  assert.equal(audit.date, date);
  assert.equal(audit.substantivelyUpdated, 5);
  assert.deepEqual(audit.articles.map((item) => item.target).sort(), targets);
  assert.deepEqual(audit.scope, { daily: 1, finance: 1, health: 1, papers: 1, ted: 0, philosophy: 1 });
  assert.deepEqual(audit.reviewSummary, { pass: 5, revisedAndPassed: 0, rejected: 0, reworkRounds: 0 });
  assert.ok(audit.articles.every((item) => item.changeType === "new" && item.sourceVerification?.ok === true));
});

test("五篇详情页与基线、终稿、来源和可核准原文日期一致", async () => {
  const baseline = JSON.parse(await readFile(`data/article-baseline-${date}.json`, "utf8"));
  const changed = [];
  for (const [target, before] of Object.entries(baseline.articles)) {
    const html = await readFile(`site/column/${target}/index.html`, "utf8");
    const after = extractArticleRecord(html, target);
    if (after.semanticHash !== before.semanticHash) changed.push(target);
  }
  assert.deepEqual(changed.sort(), targets);

  for (const [target, item] of expected) {
    const html = await readFile(`site/column/${target}/index.html`, "utf8");
    assert.ok(html.includes(item.title), target);
    assert.ok(html.includes(item.source), target);
    assert.ok(html.includes(`data-substantive-update="${date}"`), target);
    const article = html.match(/<article class="long-article"[^>]*>[\s\S]*?<\/article>/)?.[0] ?? "";
    const meta = html.match(/<div class="reading-meta">[\s\S]*?<\/div>/)?.[0] ?? "";
    assert.ok(article.replace(/<[^>]+>/g, "").replace(/\s+/g, "").length >= 800, target);
    assert.ok((article.match(/<h2>/g) ?? []).length >= 8, target);
    assert.doesNotMatch(article, /<p>(?:(?!<\/p>)[\s\S])*<p>/);
    assert.doesNotMatch(article, /。。|。；|；。/);
    if (item.sourceDate) {
      assert.ok(meta.includes(`原文发布：${item.sourceDate}`), `${target} 原文日期错误`);
    } else {
      assert.doesNotMatch(meta, /原文发布：/u, `${target} 不得公开猜测的日级原文日期`);
    }
  }
});

test("首页、审计、高亮、镜像和110篇日期台账同步", async () => {
  const audit = JSON.parse(await readFile(`data/update-audit-${date}.json`, "utf8"));
  const publicAudit = JSON.parse(await readFile(`site/audit/update-${date}.json`, "utf8"));
  assert.deepEqual(publicAudit, audit);
  const home = await readFile("site/index.html", "utf8");
  const mirror = JSON.parse(await readFile("site/mirror-status.json", "utf8"));
  assert.ok(home.includes("2026年9月13日"));
  assert.ok(home.includes("5篇真实实质更新"));
  assert.deepEqual(mirror.update, { date, articles: 5, mode: "quality-first", targetMet: true });
  const ledger = JSON.parse(await readFile("data/article-date-ledger.json", "utf8"));
  assert.equal(Object.keys(ledger.articles).length, 110);
  const publishedToday = Object.entries(ledger.articles)
    .filter(([, entry]) => entry.publishedOn === date && entry.updatedOn === null && entry.evidence === "daily-audit")
    .map(([target]) => target).sort();
  assert.deepEqual(publishedToday, targets);
  for (const [target, item] of expected) {
    assert.equal(ledger.articles[target].sourcePublishedOn, item.sourceDate, `${target} 台账原文日期错误`);
  }
});

test("公开产物不泄露私有路径或内部任务身份", async () => {
  const files = [
    `data/update-audit-${date}.json`, `data/article-baseline-${date}.json`, "data/article-date-ledger.json",
    `site/audit/update-${date}.json`, "site/audit/index.html", "site/archive/index.html", "site/index.html",
    ...targets.map((target) => `site/column/${target}/index.html`), "scripts/publish-2026-09-13.mjs",
  ];
  for (const file of files) {
    const content = await readFile(file, "utf8");
    assert.doesNotMatch(content, /[A-Z]:\\\\(?:[^\r\n"<]|\\.)+/);
    assert.doesNotMatch(content.replace(/data-website-id="[0-9a-f-]+"/gi, ""), /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i);
  }
});
