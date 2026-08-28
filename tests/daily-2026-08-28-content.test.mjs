import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { extractArticleRecord } from "../scripts/lib/article-timeline.mjs";

const expectedCounts = {
  daily: 3,
  finance: 3,
  health: 3,
  papers: 4,
  management: 2,
};

const audit = JSON.parse(await readFile("data/update-audit-2026-08-28.json", "utf8"));
const targets = audit.articles.map((entry) => entry.target);

test("8月28日审计只包含15篇复核通过的实质更新", () => {
  assert.equal(audit.date, "2026-08-28");
  assert.equal(audit.substantivelyUpdated, 15);
  assert.equal(audit.articles.length, 15);
  assert.deepEqual(audit.scope, expectedCounts);
  assert.deepEqual(audit.reviewSummary, {
    pass: 7,
    revisedAndPassed: 8,
    rejected: 0,
    reworkRounds: 1,
  });
  assert.ok(audit.articles.every((entry) => entry.changeType === "updated"));
  assert.ok(audit.articles.every((entry) => entry.sourceVerification?.ok === true));
});

test("公开审计副本与数据审计完全一致", async () => {
  const publicAudit = JSON.parse(await readFile("site/audit/update-2026-08-28.json", "utf8"));
  assert.deepEqual(publicAudit, audit);
});

test("15篇专栏目录卡与审计的标题、日期、摘要和来源一致", async () => {
  for (const entry of audit.articles) {
    const [column, index] = entry.target.split("/");
    const html = await readFile(`site/column/${column}/index.html`, "utf8");
    const card = [...html.matchAll(/<article[^>]*class="[^"]*article-card[^"]*"[^>]*>[\s\S]*?<\/article>/g)]
      .map((match) => match[0])
      .find((item) => item.includes(`href="/column/${column}/${index}"`)) ?? "";
    assert.ok(card, `${entry.target} 目录卡不存在`);
    assert.ok(card.includes(entry.title), `${entry.target} 目录卡标题未同步`);
    assert.ok(card.includes("本站更新：2026-08-28"), `${entry.target} 目录卡日期未同步`);
    assert.ok(card.includes(entry.sourceVerification.sources[0].name), `${entry.target} 目录卡来源未同步`);
  }
});

test("15篇详情页标题、来源、深度正文和长度都满足发布要求", async () => {
  for (const entry of audit.articles) {
    const html = await readFile(`site/column/${entry.target}/index.html`, "utf8");
    assert.match(html, new RegExp(entry.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(html, /data-substantive-update="2026-08-28"/);
    for (const id of ["conclusion", "evidence", "interpretation", "method", "practice", "boundary", "review", "sources"]) {
      assert.match(html, new RegExp(`<section id="${id}"`));
    }
    for (const source of entry.sourceVerification.sources) assert.ok(html.includes(source.url));
    const article = html.match(/<article class="long-article"[\s\S]*?<\/article>/)?.[0] ?? "";
    const text = article.replace(/<[^>]+>/g, "").replace(/\s+/g, "");
    assert.ok(text.length >= 1300, `${entry.target} 正文只有 ${text.length} 字符`);
    assert.ok(text.length <= 3000, `${entry.target} 正文达到 ${text.length} 字符`);
  }
});

test("与更新前基线相比恰好15篇正文发生语义变化", async () => {
  const baseline = JSON.parse(await readFile("data/article-baseline-2026-08-28.json", "utf8"));
  const changed = [];
  for (const [target, before] of Object.entries(baseline.articles)) {
    const html = await readFile(`site/column/${target}/index.html`, "utf8");
    const after = extractArticleRecord(html, target);
    if (after.semanticHash !== before.semanticHash) changed.push(target);
  }
  assert.deepEqual(changed.sort(), targets.sort());
});

test("TED无新增且日期台账只标记本批15篇", async () => {
  assert.deepEqual(targets.filter((target) => target.startsWith("ted/")).sort(), []);
  const ledger = JSON.parse(await readFile("data/article-date-ledger.json", "utf8"));
  const updatedToday = Object.entries(ledger.articles)
    .filter(([, entry]) => entry.updatedOn === "2026-08-28")
    .map(([target]) => target)
    .sort();
  assert.deepEqual(updatedToday, targets.sort());
  for (const entry of audit.articles) {
    assert.equal(ledger.articles[entry.target].title, entry.title, `${entry.target} 台账标题不一致`);
    assert.equal(ledger.articles[entry.target].updatedOn, "2026-08-28");
    if (/^\d{4}-\d{2}-\d{2}$/.test(entry.sourceDate)) {
      assert.equal(ledger.articles[entry.target].sourcePublishedOn, entry.sourceDate);
    }
  }
});
