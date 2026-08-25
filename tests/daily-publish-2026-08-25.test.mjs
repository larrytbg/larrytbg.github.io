import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  applySourceOverrides,
  articleLedgerEntries,
  buildApprovedUpdates,
  parseDraftPackage,
  parseFactReview,
} from "../scripts/lib/daily-publish-2026-08-25.mjs";
import { extractArticleRecord } from "../scripts/lib/article-timeline.mjs";

const draft = `1.
- target：codex/01
- 标题：Codex CLI 入门
- 事实段：旧草稿事实。
- 解释/边界段：旧草稿边界。
- 来源与原文日期：OpenAI；日期未核准；https://example.com/old
- changeSummary：旧摘要。

2.
- target：daily/01
- 标题：官方疫情通报
- 事实段：旧草稿事实二。
- 解释/边界段：旧草稿边界二。
- 来源与原文日期：WHO；2026-08-24；https://example.com/who
- changeSummary：旧摘要二。`;

const review = `1. \`codex/01\` — **REVISE**；等级A；\`sourceVerification.ok: true\`

问题：必须使用修订链接。
最终批准正文：事实——OpenAI说明CLI在本地工作目录中执行任务。解释/边界——具体权限取决于环境，不能泛化。
来源与日期：[OpenAI Codex CLI](https://learn.chatgpt.com/docs/codex/cli)；页面未标注发布日期，核验于2026-08-25。

2. \`daily/01\` — **PASS**；等级A；\`sourceVerification.ok: true\`

问题：无。
最终批准正文：事实——WHO发布了新的群体疫情通报。解释与边界——群体数据不能推断个人风险。
来源与日期：[WHO](https://example.com/who)；2026-08-24。`;

test("解析55条发布包时以事实复核正文和来源覆盖草稿", () => {
  const drafts = parseDraftPackage(draft);
  const reviews = parseFactReview(review);
  const updates = buildApprovedUpdates(drafts, reviews, { expected: 2 });

  assert.equal(updates.length, 2);
  assert.deepEqual(updates.map((item) => item.target), ["codex/01", "daily/01"]);
  assert.equal(updates[0].title, "Codex CLI 入门");
  assert.match(updates[0].facts, /本地工作目录/);
  assert.match(updates[0].boundary, /不能泛化/);
  assert.equal(updates[0].sources[0].url, "https://learn.chatgpt.com/docs/codex/cli");
  assert.equal(updates[0].sourceVerification.ok, true);
  assert.equal(updates[0].status, "REVISE");
  assert.equal(updates[1].status, "PASS");
});

test("缺项、重复目标或未通过来源复核时拒绝生成发布包", () => {
  const drafts = parseDraftPackage(draft);
  const reviews = parseFactReview(review);
  assert.throws(() => buildApprovedUpdates(drafts, reviews, { expected: 3 }), /expected 3/);
  assert.throws(
    () => buildApprovedUpdates(drafts, [...reviews, reviews[0]], { expected: 3 }),
    /duplicate review target codex\/01/,
  );
  assert.throws(
    () => buildApprovedUpdates(drafts, [{ ...reviews[0], sourceVerification: { ok: false } }, reviews[1]], { expected: 2 }),
    /source verification failed for codex\/01/,
  );
});

test("日期台账同时兼容对象映射和数组表示", () => {
  assert.deepEqual(articleLedgerEntries({ articles: { "codex/01": { firstPublished: "2026-08-14" } } }), [
    ["codex/01", { firstPublished: "2026-08-14" }],
  ]);
  assert.deepEqual(articleLedgerEntries({ articles: [{ target: "codex/01", firstPublished: "2026-08-14" }] }), [
    ["codex/01", { target: "codex/01", firstPublished: "2026-08-14" }],
  ]);
});

test("已确认失效的来源链接使用重新核验后的同站有效页面", () => {
  const updates = [{ target: "management/01", sources: [
    { name: "What Matters", url: "https://www.whatmatters.com/resources/okr-guide" },
    { name: "Microsoft", url: "https://learn.microsoft.com/en-us/viva/goals/get-to-know-okrs" },
  ] }];
  const fixed = applySourceOverrides(updates, new Map([
    ["https://www.whatmatters.com/resources/okr-guide", "https://www.whatmatters.com/okrs-explained/good-example-okrs"],
  ]));
  assert.equal(fixed[0].sources[0].url, "https://www.whatmatters.com/okrs-explained/good-example-okrs");
  assert.equal(fixed[0].sources[1].url, "https://learn.microsoft.com/en-us/viva/goals/get-to-know-okrs");
});

const columns = [
  "codex", "daily", "finance", "financial-literacy", "health", "history",
  "logic", "management", "papers", "philosophy", "ted",
];
const expectedTargets = columns.flatMap((column) =>
  ["01", "02", "03", "04", "05"].map((index) => `${column}/${index}`),
);

test("8月25日发布包恰好更新55篇且全部有核准来源", async () => {
  const audit = JSON.parse(await readFile("data/update-audit-2026-08-25.json", "utf8"));
  const ledger = JSON.parse(await readFile("data/article-date-ledger.json", "utf8"));
  assert.equal(audit.date, "2026-08-25");
  assert.equal(audit.totalArticles, 110);
  assert.equal(audit.substantivelyUpdated, 55);
  assert.equal(audit.articles.length, 55);
  assert.deepEqual(audit.articles.map((item) => item.target).sort(), expectedTargets.sort());
  assert.ok(audit.articles.every((item) => item.changeType === "updated"));
  assert.ok(audit.articles.every((item) => item.sourceVerification?.ok === true));

  for (const item of audit.articles) {
    const html = await readFile(`site/column/${item.target}/index.html`, "utf8");
    assert.match(html, /data-substantive-update="2026-08-25"/);
    assert.ok(item.sourceDate?.trim(), `${item.target} missing audited sourceDate`);
    if (/^\d{4}-\d{2}-\d{2}$/.test(item.sourceDate)) {
      assert.equal(ledger.articles[item.target].sourcePublishedOn, item.sourceDate);
      assert.ok(html.includes(`原文发布：${item.sourceDate}`));
      assert.ok(!html.includes("原文日期："));
    } else {
      assert.equal(ledger.articles[item.target].sourcePublishedOn, null);
      assert.ok(html.includes(`原文日期：${item.sourceDate}`));
    }
    for (const source of item.sourceVerification.sources) assert.ok(html.includes(source.url));
  }
});

test("与更新前基线相比正文语义变化恰好是55个目标", async () => {
  const baseline = JSON.parse(await readFile("data/article-baseline-2026-08-25.json", "utf8"));
  const changed = [];
  for (const [target, before] of Object.entries(baseline.articles)) {
    const html = await readFile(`site/column/${target}/index.html`, "utf8");
    const after = extractArticleRecord(html, target);
    if (after.semanticHash !== before.semanticHash) changed.push(target);
  }
  assert.deepEqual(changed.sort(), expectedTargets.sort());
});

test("55篇右侧文章目录只指向当前正文中存在的章节", async () => {
  for (const target of expectedTargets) {
    const html = await readFile(`site/column/${target}/index.html`, "utf8");
    const sidebar = html.match(/<aside class="reading-sidebar">([\s\S]*?)<\/aside>/)?.[1] ?? "";
    const anchors = [...sidebar.matchAll(/href="#([^"]+)"/g)].map((match) => match[1]);
    assert.deepEqual(anchors, ["conclusion", "source", "interpretation", "practice", "boundary", "sources"]);
    for (const anchor of anchors) assert.ok(html.includes(`id="${anchor}"`), `${target} missing #${anchor}`);
  }
});
