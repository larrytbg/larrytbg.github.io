import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
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
  '<a href="/column/logic" class="directory-card accent-violet"><ul>',
  '<li class="is-primary"><span>01</span><span class="directory-item-title">逻辑标题一</span></li>',
  '<li class="is-primary"><span>02</span><span class="directory-item-title">逻辑标题二</span></li>',
  '</ul><span class="directory-enter">进入专栏 →</span></a>',
].join("");

const markedHome = applyHighlightsToHome(home, entries);
assert.equal((markedHome.match(/data-daily-highlight="new"/g) ?? []).length, 2);
assert.equal((markedHome.match(/今日新增/g) ?? []).length, 2);
assert.equal((markedHome.match(/data-daily-highlight="updated"/g) ?? []).length, 1);
assert.match(markedHome, /<li class="is-primary is-daily-highlight" data-daily-highlight="new"><span>01<\/span><span class="directory-item-title"><span class="daily-highlight-badge">今日新增<\/span>/);

const column = [
  '<article class="article-card"><div class="article-order">01</div><div class="article-preview-main"><h3><a href="/column/logic/01">标题一</a></h3></div><a class="article-enter">进入</a></article>',
  '<article class="article-card"><div class="article-order">02</div><div class="article-preview-main"><h3><a href="/column/logic/02">标题二</a></h3></div><a class="article-enter">进入</a></article>',
].join("");
const markedColumn = applyHighlightsToColumn(column, "logic", entries);
assert.equal((markedColumn.match(/data-daily-highlight="updated"/g) ?? []).length, 1);
assert.equal((markedColumn.match(/今日更新/g) ?? []).length, 1);
assert.match(markedColumn, /<article class="article-card is-daily-highlight" data-daily-highlight="updated"><div class="article-order">02<\/div><div class="article-preview-main"><span class="daily-highlight-badge">今日更新<\/span><h3><a href="\/column\/logic\/02">/);
assert.throws(
  () => applyHighlightsToHome(home, [{ ...entries[0], target: "daily/09" }]),
  /highlight target not found on home/,
);
assert.throws(
  () => applyHighlightsToColumn(column, "logic", [{ ...entries[1], target: "logic/09" }]),
  /highlight target not found in column/,
);

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

const missingAudit = spawnSync(
  process.execPath,
  ["scripts/apply-daily-highlights.mjs", "--date", "2026-08-23", "--audit", "missing.json"],
  { encoding: "utf8" },
);
assert.notEqual(missingAudit.status, 0);
assert.match(`${missingAudit.stdout}${missingAudit.stderr}`, /audit file not found/);

const root = path.resolve(import.meta.dirname, "..");
const cacheRoot = "D:\\CodexCache\\daily-highlights-tests";
await mkdir(cacheRoot, { recursive: true });
const tempSite = await mkdtemp(path.join(cacheRoot, "site-"));
try {
  await mkdir(path.join(tempSite, "column", "daily"), { recursive: true });
  await mkdir(path.join(tempSite, "column", "logic"), { recursive: true });
  await writeFile(path.join(tempSite, "index.html"), `<html><head></head><body>${home}</body></html>`, "utf8");
  await writeFile(path.join(tempSite, "column", "daily", "index.html"), `<html><head></head><body>${column.replaceAll("logic", "daily")}</body></html>`, "utf8");
  await writeFile(path.join(tempSite, "column", "logic", "index.html"), `<html><head></head><body>${column}</body></html>`, "utf8");

  const cli = spawnSync(
    process.execPath,
    [
      path.join(root, "scripts", "apply-daily-highlights.mjs"),
      "--date", "2026-08-23",
      "--audit", path.join(root, "tests", "fixtures", "daily-highlight-audit.json"),
      "--site", tempSite,
    ],
    { encoding: "utf8" },
  );
  assert.equal(cli.status, 0, `${cli.stdout}${cli.stderr}`);
  assert.match(cli.stdout, /daily highlights applied: 2 \(new 1, updated 1\)/);

  const generatedHome = await readFile(path.join(tempSite, "index.html"), "utf8");
  const generatedDaily = await readFile(path.join(tempSite, "column", "daily", "index.html"), "utf8");
  const generatedLogic = await readFile(path.join(tempSite, "column", "logic", "index.html"), "utf8");
  for (const html of [generatedHome, generatedDaily, generatedLogic]) {
    assert.match(html, /\/assets\/daily-highlights\.css/);
  }
  assert.equal((generatedHome.match(/data-daily-highlight=/g) ?? []).length, 3);
  assert.equal((generatedDaily.match(/data-daily-highlight="new"/g) ?? []).length, 1);
  assert.equal((generatedLogic.match(/data-daily-highlight="updated"/g) ?? []).length, 1);

  const nextAuditPath = path.join(tempSite, "next-audit.json");
  await writeFile(nextAuditPath, JSON.stringify({ date: "2026-08-24", articles: [audit.articles[1]] }), "utf8");
  const nextCli = spawnSync(
    process.execPath,
    [
      path.join(root, "scripts", "apply-daily-highlights.mjs"),
      "--date", "2026-08-24",
      "--audit", nextAuditPath,
      "--site", tempSite,
    ],
    { encoding: "utf8" },
  );
  assert.equal(nextCli.status, 0, `${nextCli.stdout}${nextCli.stderr}`);
  const nextHome = await readFile(path.join(tempSite, "index.html"), "utf8");
  const nextDaily = await readFile(path.join(tempSite, "column", "daily", "index.html"), "utf8");
  assert.doesNotMatch(nextHome, /data-daily-highlight="new"/);
  assert.doesNotMatch(nextDaily, /data-daily-highlight=/);
  assert.equal((nextHome.match(/\/assets\/daily-highlights\.css/g) ?? []).length, 1);

  const atomicSite = path.join(tempSite, "atomic-site");
  await mkdir(path.join(atomicSite, "column", "daily"), { recursive: true });
  const atomicHome = `<html><head></head><body>${home}</body></html>`;
  await writeFile(path.join(atomicSite, "index.html"), atomicHome, "utf8");
  await writeFile(
    path.join(atomicSite, "column", "daily", "index.html"),
    '<html><head></head><body><article class="article-card"><a href="/column/daily/02">只有第二篇</a></article></body></html>',
    "utf8",
  );
  const atomicAuditPath = path.join(tempSite, "atomic-audit.json");
  await writeFile(atomicAuditPath, JSON.stringify({ date: "2026-08-25", articles: [audit.articles[0]] }), "utf8");
  const atomicCli = spawnSync(
    process.execPath,
    [
      path.join(root, "scripts", "apply-daily-highlights.mjs"),
      "--date", "2026-08-25",
      "--audit", atomicAuditPath,
      "--site", atomicSite,
    ],
    { encoding: "utf8" },
  );
  assert.notEqual(atomicCli.status, 0);
  assert.match(`${atomicCli.stdout}${atomicCli.stderr}`, /highlight target not found in column/);
  assert.equal(await readFile(path.join(atomicSite, "index.html"), "utf8"), atomicHome, "校验失败时不得留下半更新页面");
} finally {
  await rm(tempSite, { recursive: true, force: true });
}

console.log("daily highlight unit checks passed");
