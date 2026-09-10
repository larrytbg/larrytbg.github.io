import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { extractArticleRecord } from "../scripts/lib/article-timeline.mjs";
import { requireReleaseCandidateSet } from "../scripts/lib/review-chain.mjs";

const date = "2026-09-11";
const expected = new Map([
  ["daily/01", { title: "NASA卫星影像记录马里尘暴羽流", source: "https://science.nasa.gov/earth/earth-observatory/dust-storm-sweeps-over-mali/", sourceDate: "2026-09-10" }],
  ["finance/01", { title: "欧洲央行上调三项关键利率并发布新基线预测", source: "https://www.ecb.europa.eu/press/pr/date/2026/html/ecb.mp260910~314e508016.en.html", sourceDate: "2026-09-10" }],
  ["health/01", { title: "WHO以改变叙事为主题推动自杀预防公共行动", source: "https://www.who.int/campaigns/world-suicide-prevention-day/2026", sourceDate: "2026-09-10" }],
  ["papers/01", { title: "专家建议文章提炼锂离子电池研发与商业化的可迁移经验", source: "https://www.nature.com/articles/s44359-026-00203-z", sourceDate: "2026-09-10" }],
]);
const targets = [...expected.keys()].sort();

test("发布候选必须精确等于四个发布ID加指定历史排除ID", () => {
  const mappingIds = ["daily", "finance", "health", "papers"];
  const exclusionId = "history";
  assert.doesNotThrow(() => requireReleaseCandidateSet({ mappingIds, exclusionId, drafts: [...mappingIds, exclusionId].map((id) => ({ id })) }));
  assert.throws(
    () => requireReleaseCandidateSet({ mappingIds, exclusionId, drafts: [...mappingIds, "unknown"].map((id) => ({ id })) }),
    /release candidates ID set mismatch/,
  );
});

test("9月11日只发布四篇最终事实复核通过且来源可访问的真实新增", async () => {
  const audit = JSON.parse(await readFile(`data/update-audit-${date}.json`, "utf8"));
  assert.equal(audit.date, date);
  assert.equal(audit.substantivelyUpdated, 4);
  assert.deepEqual(audit.articles.map((item) => item.target).sort(), targets);
  assert.deepEqual(audit.scope, { daily: 1, finance: 1, health: 1, papers: 1, ted: 0, history: 0 });
  assert.deepEqual(audit.reviewSummary, { pass: 3, revisedAndPassed: 1, rejected: 0, reworkRounds: 1 });
  assert.ok(audit.articles.every((item) => item.changeType === "new" && item.sourceVerification?.ok === true));
  assert.equal(audit.postReviewExclusions.length, 1);
  assert.equal(audit.postReviewExclusions[0].id, "history-20260911-loc-documenting-911");
});

test("四篇详情页与基线、终稿、来源及精确原文日期一致", async () => {
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
    assert.ok(html.includes(item.title));
    assert.ok(html.includes(item.source));
    assert.ok(html.includes(`data-substantive-update="${date}"`));
    const article = html.match(/<article class="long-article"[^>]*>[\s\S]*?<\/article>/)?.[0] ?? "";
    const meta = html.match(/<div class="reading-meta">[\s\S]*?<\/div>/)?.[0] ?? "";
    assert.ok(article.replace(/<[^>]+>/g, "").replace(/\s+/g, "").length >= 800, target);
    assert.ok((article.match(/<h2>/g) ?? []).length >= 7, target);
    assert.doesNotMatch(article, /<p>(?:(?!<\/p>)[\s\S])*<p>/);
    assert.doesNotMatch(article, /。。|。；|；。/);
    assert.ok(meta.includes(`原文发布：${item.sourceDate}`), `${target} 原文日期显示错误`);
  }
  const papers = await readFile("site/column/papers/01/index.html", "utf8");
  assert.ok(papers.includes("这种专家建议文章的价值在于跨阶段整理经验"));
  assert.ok(!papers.includes("这种综述的价值在于跨阶段整理经验"));
  const history = await readFile("site/column/history/01/index.html", "utf8");
  assert.equal(extractArticleRecord(history, "history/01").semanticHash, baseline.articles["history/01"].semanticHash);
});

test("首页、审计、高亮、镜像和日期台账同步", async () => {
  const audit = JSON.parse(await readFile(`data/update-audit-${date}.json`, "utf8"));
  const publicAudit = JSON.parse(await readFile(`site/audit/update-${date}.json`, "utf8"));
  assert.deepEqual(publicAudit, audit);
  const home = await readFile("site/index.html", "utf8");
  const mirror = JSON.parse(await readFile("site/mirror-status.json", "utf8"));
  assert.ok(home.includes("2026年9月11日"));
  assert.ok(home.includes("4篇真实实质更新"));
  assert.equal(mirror.generatedAt, "2026-09-11T07:24:20.3522565+08:00");
  assert.deepEqual(mirror.update, { date, articles: 4, mode: "quality-first", targetMet: true });
  const ledger = JSON.parse(await readFile("data/article-date-ledger.json", "utf8"));
  const publishedToday = Object.entries(ledger.articles)
    .filter(([, entry]) => entry.publishedOn === date && entry.updatedOn === null && entry.evidence === "daily-audit")
    .map(([target]) => target).sort();
  assert.deepEqual(publishedToday, targets);
  for (const target of targets) {
    const html = await readFile(`site/column/${target}/index.html`, "utf8");
    assert.ok(html.includes(`本站首次发布：${date}`));
    assert.ok(!html.includes("本站最后更新："));
  }
  for (const [target, item] of expected) {
    assert.equal(ledger.articles[target].sourcePublishedOn, item.sourceDate, `${target} 台账原文日期错误`);
  }
});

test("日期状态栏与本次公开文件不泄露私有信息", async () => {
  const files = [
    `data/update-audit-${date}.json`, `data/article-baseline-${date}.json`, "data/article-date-ledger.json",
    `site/audit/update-${date}.json`, "site/audit/index.html", "site/archive/index.html", "site/index.html",
    ...targets.map((target) => `site/column/${target}/index.html`), "scripts/publish-2026-09-11.mjs",
  ];
  for (const file of files) {
    const content = await readFile(file, "utf8");
    assert.ok(!content.includes("· ·"), file);
    assert.doesNotMatch(content, /[A-Z]:\\\\(?:[^\r\n"<]|\\.)+/);
    assert.doesNotMatch(content.replace(/data-website-id="[0-9a-f-]+"/gi, ""), /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i);
  }
});
