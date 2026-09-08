import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { extractArticleRecord } from "../scripts/lib/article-timeline.mjs";

const date = "2026-09-08";
const expectedTargets = ["daily/01", "daily/02", "health/01"];
const expectedTitles = new Map([
  ["daily/01", "世卫组织东南亚区域委员会第七十九届会议在帝力开幕"],
  ["daily/02", "世卫组织为老年人与老龄化专家工作组征集专家"],
  ["health/01", "世卫组织非洲区域启动区域卫生数据中心"],
]);

test("9月8日发布只包含三篇事实复核通过的真实更新", async () => {
  const audit = JSON.parse(await readFile(`data/update-audit-${date}.json`, "utf8"));
  assert.equal(audit.date, date);
  assert.equal(audit.substantivelyUpdated, 3);
  assert.deepEqual(audit.articles.map((item) => item.target).sort(), expectedTargets.slice().sort());
  assert.deepEqual(audit.scope, { daily: 2, finance: 0, health: 1, papers: 0, ted: 0, philosophy: 0 });
  assert.deepEqual(audit.reviewSummary, { pass: 1, revisedAndPassed: 2, rejected: 0, reworkRounds: 1 });
  assert.ok(audit.articles.every((item) => item.sourceVerification?.ok === true));
  assert.ok(audit.articles.every((item) => item.changeType === "new"));
});

test("三篇详情页与审计、原始来源和语义基线一致", async () => {
  const audit = JSON.parse(await readFile(`data/update-audit-${date}.json`, "utf8"));
  const baseline = JSON.parse(await readFile(`data/article-baseline-${date}.json`, "utf8"));
  const changed = [];
  for (const [target, before] of Object.entries(baseline.articles)) {
    const html = await readFile(`site/column/${target}/index.html`, "utf8");
    const after = extractArticleRecord(html, target);
    if (after.semanticHash !== before.semanticHash) changed.push(target);
  }
  assert.deepEqual(changed.sort(), expectedTargets.slice().sort());
  for (const item of audit.articles) {
    const html = await readFile(`site/column/${item.target}/index.html`, "utf8");
    assert.ok(html.includes(expectedTitles.get(item.target)));
    assert.ok(html.includes(`data-substantive-update="${date}"`));
    assert.ok(html.includes(item.sourceVerification.sources[0].url));
    const article = html.match(/<article class="long-article"[^>]*>[\s\S]*?<\/article>/)?.[0] ?? "";
    assert.ok(article.replace(/<[^>]+>/g, "").replace(/\s+/g, "").length >= 500);
  }
});

test("公开审计、首页日期、高亮和日期台账同步", async () => {
  const audit = JSON.parse(await readFile(`data/update-audit-${date}.json`, "utf8"));
  const publicAudit = JSON.parse(await readFile(`site/audit/update-${date}.json`, "utf8"));
  assert.deepEqual(publicAudit, audit);
  const home = await readFile("site/index.html", "utf8");
  assert.ok(home.includes("2026年9月8日"));
  assert.ok(home.includes("3篇真实实质更新"));
  const ledger = JSON.parse(await readFile("data/article-date-ledger.json", "utf8"));
  const publishedToday = Object.entries(ledger.articles)
    .filter(([, entry]) => entry.publishedOn === date && entry.updatedOn === null && entry.evidence === "daily-audit")
    .map(([target]) => target)
    .sort();
  assert.deepEqual(publishedToday, expectedTargets.slice().sort());
  for (const target of expectedTargets) {
    const html = await readFile(`site/column/${target}/index.html`, "utf8");
    assert.ok(html.includes(`本站首次发布：${date}`));
    assert.ok(!html.includes("本站最后更新："));
  }
  const mirror = JSON.parse(await readFile("site/mirror-status.json", "utf8"));
  assert.equal(mirror.generatedAt, "2026-09-08T07:48:01+08:00");
});

test("相邻文章分页标题随今日更新同步", async () => {
  const daily01 = await readFile("site/column/daily/01/index.html", "utf8");
  assert.match(
    daily01,
    /<a href="\/column\/daily\/02"><span>下一篇 →<\/span><strong>世卫组织为老年人与老龄化专家工作组征集专家<\/strong><\/a>/,
  );
});

test("公开文件不包含私有任务标识或本机批次路径", async () => {
  const files = [
    "data/update-audit-2026-09-08.json",
    "site/audit/update-2026-09-08.json",
    "site/audit/index.html",
    "site/archive/index.html",
    "site/index.html",
    "site/column/daily/01/index.html",
    "site/column/daily/02/index.html",
    "site/column/health/01/index.html",
    "data/article-date-ledger.json",
    "data/article-baseline-2026-09-08.json",
    "scripts/publish-2026-09-08.mjs",
  ];
  for (const file of files) {
    const text = await readFile(file, "utf8");
    assert.doesNotMatch(text, /[A-Z]:\\\\(?:[^\r\n\"<]|\\.)+/);
    const withoutPublicAnalyticsId = text.replace(/data-website-id="[0-9a-f-]+"/gi, "");
    assert.doesNotMatch(withoutPublicAnalyticsId, /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i);
  }
});
