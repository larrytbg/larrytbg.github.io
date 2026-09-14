import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { extractArticleRecord } from "../scripts/lib/article-timeline.mjs";

const date = "2026-09-15";
const expected = new Map([
  ["daily/04", { title: "气候适应不能只给预报：南部非洲牧场模型显示风险缓冲要与信息配套", source: "https://www.nature.com/articles/s41893-026-01938-0", sourceDate: "2026-09-14" }],
  ["finance/04", { title: "合同链与数字链协同和农户正规信贷相关，但组织参与不等于因果保证", source: "https://www.nature.com/articles/s41599-026-09015-9", sourceDate: "2026-09-14" }],
  ["health/04", { title: "一枚皮层植入物同时解码说话与手势：三人研究仍是侵入式概念验证", source: "https://www.nature.com/articles/s41593-026-02446-2", sourceDate: "2026-09-14" }],
  ["papers/04", { title: "22小时近自然实验发现海上风电低频噪声改变浮游植物生长，长期生态效应仍未知", source: "https://www.nature.com/articles/s41598-026-71531-0", sourceDate: "2026-09-14" }],
  ["management/04", { title: "阿曼202名女教师问卷显示变革型领导评价较高，但感知相关不能代替绩效因果", source: "https://www.nature.com/articles/s41599-026-08871-9", sourceDate: "2026-09-14" }],
]);
const targets = [...expected.keys()].sort();

test("9月15日只发布五篇通过事实复核的真实新增", async () => {
  const audit = JSON.parse(await readFile(`data/update-audit-${date}.json`, "utf8"));
  assert.equal(audit.date, date);
  assert.equal(audit.substantivelyUpdated, 5);
  assert.deepEqual(audit.articles.map((item) => item.target).sort(), targets);
  assert.deepEqual(audit.scope, { daily: 1, finance: 1, health: 1, papers: 1, ted: 0, management: 1 });
  assert.deepEqual(audit.reviewSummary, { pass: 5, revisedAndPassed: 0, rejected: 0, reworkRounds: 0 });
  assert.ok(audit.articles.every((item) => item.changeType === "new" && item.sourceVerification?.ok === true));
});

test("五篇详情页与基线、终稿、来源和原文日期一致", async () => {
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
    const paragraphs = [...article.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((match) => match[1].trim());
    assert.ok(article.replace(/<[^>]+>/g, "").replace(/\s+/g, "").length >= 1000, target);
    assert.ok((article.match(/<h2>/g) ?? []).length >= 8, target);
    assert.equal(new Set(paragraphs).size, paragraphs.length, `${target} 段落重复`);
    assert.doesNotMatch(article, /<p>(?:(?!<\/p>)[\s\S])*<p>/);
    assert.doesNotMatch(article, /。。|。；|；。/);
    assert.ok(meta.includes(`原文发布：${item.sourceDate}`), `${target} 原文日期错误`);
  }
});

test("首页、审计、高亮、镜像和110篇日期台账同步", async () => {
  const audit = JSON.parse(await readFile(`data/update-audit-${date}.json`, "utf8"));
  const publicAudit = JSON.parse(await readFile(`site/audit/update-${date}.json`, "utf8"));
  assert.deepEqual(publicAudit, audit);
  const home = await readFile("site/index.html", "utf8");
  const mirror = JSON.parse(await readFile("site/mirror-status.json", "utf8"));
  assert.ok(home.includes("2026年9月15日"));
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
    ...targets.map((target) => `site/column/${target}/index.html`), "scripts/publish-2026-09-15.mjs",
  ];
  for (const file of files) {
    const content = await readFile(file, "utf8");
    assert.doesNotMatch(content, /[A-Z]:\\\\(?:[^\r\n"<]|\\.)+/);
    assert.doesNotMatch(content.replace(/data-website-id="[0-9a-f-]+"/gi, ""), /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i);
  }
});
