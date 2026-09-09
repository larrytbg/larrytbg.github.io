import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { extractArticleRecord } from "../scripts/lib/article-timeline.mjs";

const date = "2026-09-10";
const expected = new Map([
  ["daily/01", { title: "WHO任命Vanessa Kerry博士为卫生韧性特别特使", source: "https://www.who.int/news/item/09-09-2026-dr-vanessa-kerry-appointed-to-new-role-as-who-director-general-s-special-envoy-for-health-resilience" }],
  ["daily/02", { title: "NASA钱德拉望远镜发现异常低能X射线天体群", source: "https://science.nasa.gov/missions/chandra/nasas-chandra-unveils-mysterious-x-ray-objects/" }],
  ["daily/03", { title: "NASA介绍卫星如何在厄尔尼诺期间辅助飓风研究", source: "https://www.nasa.gov/missions/jason-cs-sentinel-6/how-2-us-european-satellites-are-studying-hurricanes-during-el-nino/" }],
  ["finance/01", { title: "美国财政部公布疑似医疗保健欺诈资金活动分析", source: "https://home.treasury.gov/news/press-releases/sb0625/" }],
  ["finance/02", { title: "美国财政部制裁涉网络诈骗的跨国犯罪组织Xinbi Guarantee", source: "https://home.treasury.gov/news/press-releases/sb0624/" }],
  ["health/01", { title: "WHO预认证多剂量母体RSV疫苗瓶装规格", source: "https://www.who.int/news/item/09-09-2026-who-prequalifies-multi-dose-rsv-vaccine-vial--paving-the-way-to-protecting-more-infants-globally" }],
  ["management/01", { title: "WHO介绍传统医学研究、政策与公共卫生伙伴协作案例", source: "https://www.who.int/news/item/09-09-2026-public-health-leaders-explore-how-traditional-medicine-can-support-health-system-transformation" }],
]);
const targets = [...expected.keys()].sort();

test("9月10日只发布七篇事实复核通过的真实新增", async () => {
  const audit = JSON.parse(await readFile(`data/update-audit-${date}.json`, "utf8"));
  assert.equal(audit.date, date);
  assert.equal(audit.substantivelyUpdated, 7);
  assert.deepEqual(audit.articles.map((item) => item.target).sort(), targets);
  assert.deepEqual(audit.scope, { daily: 3, finance: 2, health: 1, papers: 0, ted: 0, management: 1 });
  assert.deepEqual(audit.reviewSummary, { pass: 0, revisedAndPassed: 7, rejected: 0, reworkRounds: 1 });
  assert.ok(audit.articles.every((item) => item.changeType === "new" && item.sourceVerification?.ok === true));
});

test("七篇详情页的来源、正文和语义变化与基线一致", async () => {
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
    const readingMeta = html.match(/<div class="reading-meta">[\s\S]*?<\/div>/)?.[0] ?? "";
    assert.equal((readingMeta.match(/原文/g) ?? []).length, 1, `${target} 原文日期重复`);
    assert.ok(article.replace(/<[^>]+>/g, "").replace(/\s+/g, "").length >= 600);
    assert.doesNotMatch(article, /<p>(?:(?!<\/p>)[\s\S])*<p>/);
    assert.doesNotMatch(article, /。。|。；|；。/);
  }
  const firstDaily = await readFile("site/column/daily/01/index.html", "utf8");
  const firstDailyVisible = firstDaily.replace(/https?:\/\/[^"<\s]+/g, "");
  assert.doesNotMatch(firstDailyVisible, /envoy|卫生韧性卫生韧性/iu);
});

test("首页、审计、高亮、镜像和日期台账同步", async () => {
  const audit = JSON.parse(await readFile(`data/update-audit-${date}.json`, "utf8"));
  const publicAudit = JSON.parse(await readFile(`site/audit/update-${date}.json`, "utf8"));
  assert.deepEqual(publicAudit, audit);
  const home = await readFile("site/index.html", "utf8");
  const mirror = JSON.parse(await readFile("site/mirror-status.json", "utf8"));
  assert.ok(home.includes("2026年9月10日"));
  assert.ok(home.includes("7篇真实实质更新"));
  assert.equal(mirror.generatedAt, "2026-09-10T07:42:30.8485239+08:00");
  assert.deepEqual(mirror.update, { date, articles: 7, mode: "quality-first", targetMet: true });
  assert.ok(!home.includes("Scientific Reports发表人偏肺病毒反向开放阅读框研究"));
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

test("日期状态栏不出现重复分隔符", async () => {
  const files = [
    "scripts/publish-2026-09-10.mjs",
    ...["codex", "daily", "finance", "financial-literacy", "health", "history", "logic", "management", "papers", "philosophy", "ted"]
      .map((column) => `site/column/${column}/index.html`),
  ];
  for (const file of files) assert.ok(!(await readFile(file, "utf8")).includes("· ·"), file);
});

test("本次公开文件不包含本机路径或任务UUID", async () => {
  const files = [
    `data/update-audit-${date}.json`, `data/article-baseline-${date}.json`, "data/article-date-ledger.json",
    `site/audit/update-${date}.json`, "site/audit/index.html", "site/archive/index.html", "site/index.html",
    ...targets.map((target) => `site/column/${target}/index.html`), "scripts/publish-2026-09-10.mjs",
  ];
  for (const file of files) {
    const content = await readFile(file, "utf8");
    assert.doesNotMatch(content, /[A-Z]:\\\\(?:[^\r\n"<]|\\.)+/);
    assert.doesNotMatch(content.replace(/data-website-id="[0-9a-f-]+"/gi, ""), /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i);
  }
});
