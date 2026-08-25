import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { findTitleFirstSeen } from "../scripts/lib/article-ledger.mjs";
import {
  extractArticleRecord,
  applyTimelineToColumn,
  applyTimelineToHome,
  renderDetailDates,
  renderDirectoryDate,
  semanticArticleHash,
} from "../scripts/lib/article-timeline.mjs";
import { extractSourcePublishedOn, hasSourceDateMetadata } from "../scripts/lib/article-ledger.mjs";

const detail = `<html><body><header><div class="live-status">2026.08.22</div></header><main class="reading-page"><header class="reading-hero"><h1>示例文章</h1><div class="reading-meta"><span>首次收录：历史日期待核</span><span>最后实质更新：2026-08-22</span><span>来源发布日期：资料发布日期待核</span></div><div class="source-digest-attribution"><a href="https://example.com/report">原始报告<!-- --> · 发布于 <!-- -->资料发布日期待核<!-- --> ↗</a></div></header><article class="long-article"><section><h2>核心事实</h2><p>正文里的数字是42。</p></section><section id="sources" class="full-source-list"><a href="https://example.com/report"><span>原始报告</span></a></section></article></main></body></html>`;

assert.equal(extractSourcePublishedOn('<span>原文日期：2026-08-24</span>'), "2026-08-24");
assert.equal(extractSourcePublishedOn('<span>原文日期：前者未标注日期，后者最后更新2024-11-05</span>'), null);
assert.equal(hasSourceDateMetadata('<span>原文日期：前者未标注日期</span>'), true);
assert.equal(hasSourceDateMetadata('<span>本站最后更新：2026-08-25</span>'), false);

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
assert.equal(
  semanticArticleHash(detail),
  semanticArticleHash(detail.replace("<h1>示例文章</h1>", "<h1>只改标题</h1>")),
  "只改标题不能算正文实质更新",
);
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
assert.match(withAllDates, /发布于 <!-- -->2026-08-21/);

const timelineEntries = {
  "daily/01": { publishedOn: "2026-08-08", updatedOn: null },
  "daily/02": { publishedOn: "2026-08-09", updatedOn: "2026-08-23" },
};
const homeDates = [
  '<a href="/column/daily/01" class="today-card"><h3>示例文章</h3><small class="today-updated-date">资料发布：资料发布日期待核</small></a>',
  '<a href="/column/daily" class="directory-card"><ul>',
  '<li><span>01</span><span class="directory-item-title">示例文章</span><small class="directory-item-date">资料发布：资料发布日期待核</small></li>',
  '<li><span>02</span><span class="directory-item-title">第二篇</span><small class="directory-item-date">资料发布：2026-08-01</small></li>',
  '</ul></a>',
].join("");
const renderedHome = applyTimelineToHome(homeDates, timelineEntries);
assert.match(renderedHome, /today-updated-date">本站发布：2026-08-08/);
assert.match(renderedHome, /directory-item-date">本站发布：2026-08-08/);
assert.match(renderedHome, /directory-item-date">本站更新：2026-08-23/);

const columnDates = [
  '<article class="article-card"><h3><a href="/column/daily/01">示例文章</a><small class="article-updated-date">资料发布：资料发布日期待核</small></h3></article>',
  '<article class="article-card"><h3><a href="/column/daily/02">第二篇</a><small class="article-updated-date">资料发布：2026-08-01</small></h3></article>',
].join("");
const renderedColumn = applyTimelineToColumn(columnDates, "daily", timelineEntries);
assert.match(renderedColumn, /article-updated-date">本站发布：2026-08-08/);
assert.match(renderedColumn, /article-updated-date">本站更新：2026-08-23/);
assert.throws(
  () => renderDirectoryDate('<h3><a href="/column/daily/01">缺少日期位置</a></h3>', timelineEntries["daily/01"]),
  /public date marker not found/,
);

const repo = await mkdtemp(path.join(os.tmpdir(), "article-ledger-"));
try {
  execFileSync("git", ["init"], { cwd: repo, stdio: "ignore" });
  execFileSync("git", ["config", "user.name", "Timeline Test"], { cwd: repo });
  execFileSync("git", ["config", "user.email", "timeline@example.com"], { cwd: repo });
  const articlePath = path.join(repo, "site", "column", "daily", "01", "index.html");
  await mkdir(path.dirname(articlePath), { recursive: true });
  await writeFile(articlePath, "<h1>旧文章</h1>", "utf8");
  execFileSync("git", ["add", "."], { cwd: repo });
  execFileSync("git", ["commit", "-m", "old"], {
    cwd: repo,
    env: { ...process.env, GIT_AUTHOR_DATE: "2026-08-01T00:00:00+08:00", GIT_COMMITTER_DATE: "2026-08-01T00:00:00+08:00" },
    stdio: "ignore",
  });
  await writeFile(articlePath, "<h1>当前文章</h1>", "utf8");
  execFileSync("git", ["add", "."], { cwd: repo });
  execFileSync("git", ["commit", "-m", "current"], {
    cwd: repo,
    env: { ...process.env, GIT_AUTHOR_DATE: "2026-08-02T00:00:00+08:00", GIT_COMMITTER_DATE: "2026-08-02T00:00:00+08:00" },
    stdio: "ignore",
  });
  const firstSeen = findTitleFirstSeen({ repo, file: "site/column/daily/01/index.html", title: "当前文章" });
  assert.equal(firstSeen.date, "2026-08-02");
  assert.match(firstSeen.commit, /^[a-f0-9]{40}$/);
} finally {
  await rm(repo, { recursive: true, force: true });
}

const tempSite = await mkdtemp(path.join(os.tmpdir(), "article-dates-site-"));
try {
  await mkdir(path.join(tempSite, "column", "daily", "01"), { recursive: true });
  const oneArticleHome = homeDates.replace(/<li><span>02<\/span>[\s\S]*?<\/li>/, "");
  await writeFile(path.join(tempSite, "index.html"), `<html>${oneArticleHome}</html>`, "utf8");
  await writeFile(path.join(tempSite, "column", "daily", "index.html"), `<html>${columnDates.split("</article>")[0]}</article></html>`, "utf8");
  await writeFile(path.join(tempSite, "column", "daily", "01", "index.html"), detail, "utf8");
  const ledgerPath = path.join(tempSite, "ledger.json");
  await writeFile(ledgerPath, JSON.stringify({
    version: 1,
    articles: {
      "daily/01": {
        title: "示例文章",
        publishedOn: "2026-08-08",
        updatedOn: null,
        sourcePublishedOn: null,
      },
    },
  }), "utf8");
  const root = path.resolve(import.meta.dirname, "..");
  const cli = spawnSync(process.execPath, [
    path.join(root, "scripts", "apply-article-dates.mjs"),
    "--site", tempSite,
    "--ledger", ledgerPath,
  ], { encoding: "utf8" });
  assert.equal(cli.status, 0, `${cli.stdout}${cli.stderr}`);
  assert.match(cli.stdout, /article dates applied: 1/);
  assert.match(await readFile(path.join(tempSite, "index.html"), "utf8"), /本站发布：2026-08-08/);
  assert.match(await readFile(path.join(tempSite, "column", "daily", "index.html"), "utf8"), /本站发布：2026-08-08/);
  const generatedDetail = await readFile(path.join(tempSite, "column", "daily", "01", "index.html"), "utf8");
  assert.match(generatedDetail, /本站首次发布：2026-08-08/);
  assert.doesNotMatch(generatedDetail, /待核/);
} finally {
  await rm(tempSite, { recursive: true, force: true });
}

console.log("article timeline checks passed");
