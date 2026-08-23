import assert from "node:assert/strict";
import {
  extractArticleRecord,
  renderDetailDates,
  renderDirectoryDate,
  semanticArticleHash,
} from "../scripts/lib/article-timeline.mjs";

const detail = `<html><body><header><div class="live-status">2026.08.22</div></header><main class="reading-page"><header class="reading-hero"><h1>示例文章</h1><div class="reading-meta"><span>首次收录：历史日期待核</span><span>最后实质更新：2026-08-22</span><span>来源发布日期：资料发布日期待核</span></div></header><article class="long-article"><section><h2>核心事实</h2><p>正文里的数字是42。</p></section><section id="sources" class="full-source-list"><a href="https://example.com/report"><span>原始报告</span></a></section></article></main></body></html>`;

const record = extractArticleRecord(detail, "daily/01");
assert.equal(record.target, "daily/01");
assert.equal(record.title, "示例文章");
assert.deepEqual(record.sourceUrls, ["https://example.com/report"]);
assert.match(record.semanticHash, /^[a-f0-9]{64}$/);

const chromeOnly = detail
  .replace("2026.08.22", "2026.08.23")
  .replace("最后实质更新：2026-08-22", "最后实质更新：2026-08-23")
  .replace('<main class="reading-page">', '<main class="reading-page"><span class="daily-highlight-badge">今日更新</span>');
assert.equal(semanticArticleHash(detail), semanticArticleHash(chromeOnly));
assert.notEqual(semanticArticleHash(detail), semanticArticleHash(detail.replace("数字是42", "数字是43")));

const directory = '<h3><a href="/column/daily/01">示例文章</a><small class="article-updated-date">资料发布：资料发布日期待核</small></h3>';
assert.match(
  renderDirectoryDate(directory, { publishedOn: "2026-08-08", updatedOn: null }),
  /本站发布：2026-08-08/,
);
assert.match(
  renderDirectoryDate(directory, { publishedOn: "2026-08-08", updatedOn: "2026-08-23" }),
  /本站更新：2026-08-23/,
);

const withoutSourceDate = renderDetailDates(detail, {
  publishedOn: "2026-08-08",
  updatedOn: null,
  sourcePublishedOn: null,
});
assert.match(withoutSourceDate, /本站首次发布：2026-08-08/);
assert.doesNotMatch(withoutSourceDate, /原文发布|资料发布日期待核|历史日期待核/);

const withAllDates = renderDetailDates(detail, {
  publishedOn: "2026-08-08",
  updatedOn: "2026-08-23",
  sourcePublishedOn: "2026-08-21",
});
assert.match(withAllDates, /本站首次发布：2026-08-08/);
assert.match(withAllDates, /本站最后更新：2026-08-23/);
assert.match(withAllDates, /原文发布：2026-08-21/);

console.log("article timeline checks passed");
