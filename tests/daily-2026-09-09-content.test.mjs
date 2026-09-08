import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { requireExactIdSet } from "../scripts/lib/review-chain.mjs";
import { extractArticleRecord } from "../scripts/lib/article-timeline.mjs";

const date = "2026-09-09";
const expected = new Map([
  ["daily/01", { title: "世卫组织东南亚区域卫生部长通过帝力宣言，推进专科医疗公平", source: "https://www.who.int/southeastasia/news/detail/08-09-2026-health-ministers-of-who-south-east-asia-region-adopt-dili-declaration-to-advance-equity-in-specialized-care" }],
  ["daily/02", { title: "世卫组织东南亚区域公布成员国公共卫生进展与消除疾病里程碑", source: "https://www.who.int/southeastasia/news/detail/08-09-2026-who-south-east-asia-region-recognizes-major-public-health-achievements-across-member-states" }],
  ["daily/03", { title: "哈勃与韦布望远镜发现小型海王星外天体保留早期形成线索", source: "https://science.nasa.gov/missions/hubble/nasas-hubble-webb-find-far-out-solar-system-objects-remember-past/" }],
  ["finance/01", { title: "美联储发布2026年7月消费信贷数据", source: "https://www.federalreserve.gov/releases/g19/current/default.htm" }],
  ["finance/02", { title: "欧洲央行发布截至9月4日的欧元体系合并财务报表", source: "https://www.ecb.europa.eu/press/annual-reports-financial-statements/wfs/2026/html/ecb.fs260908.et.html" }],
  ["health/01", { title: "WHO发布烟草与不孕相关证据总结", source: "https://www.who.int/news/item/08-09-2026-tobacco-smoking-may-be-harming-your-chances-of-having-a-baby" }],
  ["papers/01", { title: "偏肺病毒基因组中发现非随机分布的反向开放阅读框", source: "https://www.nature.com/articles/s41598-026-66235-4" }],
]);
const expectedTargets = [...expected.keys()].sort();

test("9月9日只发布七篇事实复核通过的真实新增", async () => {
  const audit = JSON.parse(await readFile(`data/update-audit-${date}.json`, "utf8"));
  assert.equal(audit.date, date);
  assert.equal(audit.substantivelyUpdated, 7);
  assert.deepEqual(audit.articles.map((item) => item.target).sort(), expectedTargets);
  assert.deepEqual(audit.scope, { daily: 3, finance: 2, health: 1, papers: 1, ted: 0, financialLiteracy: 0 });
  assert.deepEqual(audit.reviewSummary, { pass: 6, revisedAndPassed: 1, rejected: 2, reworkRounds: 1 });
  assert.ok(audit.articles.every((item) => item.changeType === "new" && item.sourceVerification?.ok === true));
});

test("返工包必须与初审REVISE集合完全一致且不得重复", () => {
  const expected = ["a", "b", "c"];
  assert.doesNotThrow(() => requireExactIdSet("revision", expected, [{ id: "c" }, { id: "a" }, { id: "b" }]));
  assert.throws(() => requireExactIdSet("revision", expected, [{ id: "a" }, { id: "b" }, { id: "x" }]), /ID set mismatch/);
  assert.throws(() => requireExactIdSet("revision", expected, [{ id: "a" }, { id: "b" }, { id: "b" }]), /duplicate ID/);
});

test("七篇详情页与来源、正文和更新前基线一致", async () => {
  const baseline = JSON.parse(await readFile(`data/article-baseline-${date}.json`, "utf8"));
  const changed = [];
  for (const [target, before] of Object.entries(baseline.articles)) {
    const html = await readFile(`site/column/${target}/index.html`, "utf8");
    const after = extractArticleRecord(html, target);
    if (after.semanticHash !== before.semanticHash) changed.push(target);
  }
  assert.deepEqual(changed.sort(), expectedTargets);
  for (const [target, item] of expected) {
    const html = await readFile(`site/column/${target}/index.html`, "utf8");
    assert.ok(html.includes(item.title));
    assert.ok(html.includes(item.source));
    assert.ok(html.includes(`data-substantive-update="${date}"`));
    const article = html.match(/<article class="long-article"[^>]*>[\s\S]*?<\/article>/)?.[0] ?? "";
    assert.ok(article.replace(/<[^>]+>/g, "").replace(/\s+/g, "").length >= 600);
  }
});

test("公开审计、首页、高亮和新文章日期台账同步", async () => {
  const audit = JSON.parse(await readFile(`data/update-audit-${date}.json`, "utf8"));
  const publicAudit = JSON.parse(await readFile(`site/audit/update-${date}.json`, "utf8"));
  assert.deepEqual(publicAudit, audit);
  const home = await readFile("site/index.html", "utf8");
  const mirror = JSON.parse(await readFile("site/mirror-status.json", "utf8"));
  assert.ok(home.includes("2026年9月9日"));
  assert.ok(home.includes("7篇真实实质更新"));
  assert.equal(mirror.generatedAt, "2026-09-09T07:35:27.2114558+08:00");
  assert.deepEqual(mirror.update, { date, articles: 7, mode: "quality-first", targetMet: true });
  assert.ok(!home.includes("NASA图像增强技术帮助识别古代褪色图像"));
  assert.ok(!home.includes("美国财政部宣布针对伊朗航空业的制裁行动"));
  const ledger = JSON.parse(await readFile("data/article-date-ledger.json", "utf8"));
  const publishedToday = Object.entries(ledger.articles)
    .filter(([, entry]) => entry.publishedOn === date && entry.updatedOn === null && entry.evidence === "daily-audit")
    .map(([target]) => target)
    .sort();
  assert.deepEqual(publishedToday, expectedTargets);
  for (const target of expectedTargets) {
    const html = await readFile(`site/column/${target}/index.html`, "utf8");
    assert.ok(html.includes(`本站首次发布：${date}`));
    assert.ok(!html.includes("本站最后更新："));
  }
});

test("相邻文章分页标题随七篇新增同步", async () => {
  const checks = [
    ["site/column/daily/01/index.html", "/column/daily/02", expected.get("daily/02").title],
    ["site/column/daily/02/index.html", "/column/daily/03", expected.get("daily/03").title],
    ["site/column/finance/01/index.html", "/column/finance/02", expected.get("finance/02").title],
  ];
  for (const [file, href, title] of checks) {
    const html = await readFile(file, "utf8");
    assert.ok(html.includes(`<a href="${href}"><span>下一篇 →</span><strong>${title}</strong></a>`));
  }
});

test("本次公开文件不包含本机路径或任务UUID", async () => {
  const files = [
    `data/update-audit-${date}.json`,
    `data/article-baseline-${date}.json`,
    "data/article-date-ledger.json",
    `site/audit/update-${date}.json`,
    "site/audit/index.html",
    "site/archive/index.html",
    "site/index.html",
    ...expectedTargets.map((target) => `site/column/${target}/index.html`),
    "scripts/publish-2026-09-09.mjs",
  ];
  for (const file of files) {
    const text = await readFile(file, "utf8");
    assert.doesNotMatch(text, /[A-Z]:\\\\(?:[^\r\n\"<]|\\.)+/);
    const withoutPublicAnalyticsId = text.replace(/data-website-id="[0-9a-f-]+"/gi, "");
    assert.doesNotMatch(withoutPublicAnalyticsId, /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i);
  }
});
