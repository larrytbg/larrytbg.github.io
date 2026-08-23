import assert from "node:assert/strict";
import {
  applyHighlightsToColumn,
  applyHighlightsToHome,
  clearHighlightMarkup,
  normalizeHighlightEntries,
} from "../scripts/lib/daily-highlights.mjs";

const audit = {
  date: "2026-08-23",
  articles: [
    {
      target: "daily/01",
      changeType: "new",
      changeSummary: "替换为当天新资料",
      sourceVerification: { ok: true },
    },
    {
      target: "logic/02",
      changeType: "updated",
      changeSummary: "新增反例和使用方法",
      sourceVerification: { ok: true },
    },
  ],
};

const entries = normalizeHighlightEntries(audit);
assert.deepEqual(
  entries.map(({ target, changeType }) => ({ target, changeType })),
  [
    { target: "daily/01", changeType: "new" },
    { target: "logic/02", changeType: "updated" },
  ],
);

const home = [
  '<a href="/column/daily/01" class="today-card accent-vermilion"><span>01 · 资讯</span><h3>今日必读标题</h3></a>',
  '<a href="/column/daily" class="directory-card accent-vermilion"><ul>',
  '<li class="is-primary"><span>01</span><span class="directory-item-title">目录标题一</span></li>',
  '<li class="is-primary"><span>02</span><span class="directory-item-title">目录标题二</span></li>',
  '</ul><span class="directory-enter">进入专栏 →</span></a>',
].join("");

const markedHome = applyHighlightsToHome(home, entries);
assert.equal((markedHome.match(/data-daily-highlight="new"/g) ?? []).length, 2);
assert.equal((markedHome.match(/今日新增/g) ?? []).length, 2);
assert.match(markedHome, /<li class="is-primary is-daily-highlight" data-daily-highlight="new"><span>01<\/span><span class="daily-highlight-badge">今日新增<\/span>/);

const column = [
  '<article class="article-card"><h3><a href="/column/logic/01">标题一</a></h3></article>',
  '<article class="article-card"><h3><a href="/column/logic/02">标题二</a></h3></article>',
].join("");
const markedColumn = applyHighlightsToColumn(column, "logic", entries);
assert.equal((markedColumn.match(/data-daily-highlight="updated"/g) ?? []).length, 1);
assert.equal((markedColumn.match(/今日更新/g) ?? []).length, 1);
assert.match(markedColumn, /<article class="article-card is-daily-highlight" data-daily-highlight="updated"><span class="daily-highlight-badge">今日更新<\/span><h3><a href="\/column\/logic\/02">/);

const nextRun = applyHighlightsToHome(markedHome, [entries[1]]);
assert.doesNotMatch(nextRun, /data-daily-highlight="new"/);
assert.doesNotMatch(nextRun, /今日新增/);

const staleMarkup = '<article class="article-card is-daily-highlight" data-daily-highlight="updated"><span class="daily-highlight-badge">今日更新</span><h3>旧标记</h3></article>';
assert.equal(clearHighlightMarkup(staleMarkup), '<article class="article-card"><h3>旧标记</h3></article>');

assert.throws(
  () => normalizeHighlightEntries({
    date: "2026-08-23",
    articles: [{ target: "daily/01", changeType: "updated", changeSummary: "", sourceVerification: { ok: true } }],
  }),
  /changeSummary/,
);

assert.throws(
  () => normalizeHighlightEntries({
    date: "2026-08-23",
    articles: [{ target: "daily/01", changeType: "updated", changeSummary: "新增解释", sourceVerification: { ok: false } }],
  }),
  /source verification/,
);

assert.throws(
  () => normalizeHighlightEntries({
    date: "2026-08-23",
    articles: [
      { target: "daily/01", changeType: "new", changeSummary: "新增资料", sourceVerification: { ok: true } },
      { target: "daily/01", changeType: "updated", changeSummary: "新增解释", sourceVerification: { ok: true } },
    ],
  }),
  /duplicate target/,
);

console.log("daily highlight unit checks passed");
