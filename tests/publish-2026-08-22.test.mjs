import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const site = path.join(root, "site");

async function articleFiles() {
  const columns = await readdir(path.join(site, "column"), { withFileTypes: true });
  const files = [];
  for (const column of columns.filter((entry) => entry.isDirectory())) {
    const columnDir = path.join(site, "column", column.name);
    const entries = await readdir(columnDir, { withFileTypes: true });
    for (const entry of entries.filter((item) => item.isDirectory() && /^\d\d$/.test(item.name))) {
      files.push(path.join(columnDir, entry.name, "index.html"));
    }
  }
  return files;
}

const files = await articleFiles();
assert.equal(files.length, 110, "必须保留11个知识专栏、每栏10篇，共110篇");

let updated = 0;
let sourceDatesChangedToToday = 0;
const sourceUpdateLinks = new Set();
for (const file of files) {
  const html = await readFile(file, "utf8");
  assert.doesNotMatch(html, /class="daily-learning-update"/, "不得用通用阅读模板冒充实质更新");
  if (html.includes('data-source-update="2026-08-22"')) {
    updated += 1;
    assert.match(html, /最后实质更新：(?:<!-- -->)?2026-08-22/);
    assert.match(html, /新增来源事实/);
    assert.match(html, /原始资料说明了什么/);
    assert.match(html, /局限与下一步/);
    const link = html.match(/data-source-update="2026-08-22"[\s\S]*?<a href="(https:[^"]+)"/)?.[1];
    assert.ok(link, `实质更新必须有逐篇原始来源：${file}`);
    sourceUpdateLinks.add(link);
  }
  if (/来源发布日期：(?:<!-- -->)?2026-08-22/.test(html)) sourceDatesChangedToToday += 1;
}

assert.equal(updated, 5, "今天只统计5篇有新增原始来源和逐篇分析的真实更新");
assert.equal(sourceUpdateLinks.size, 5, "5篇更新必须分别对应5个原始来源");
assert.equal(sourceDatesChangedToToday, 0, "不能把本站更新日套成来源发布日期");

const index = await readFile(path.join(site, "index.html"), "utf8");
assert.match(index, /2026\.08\.22/);
assert.match(index, /2026年8月22日/);
assert.match(index, /href="\/briefing\/2026-08-22"/);

const briefingPath = path.join(site, "briefing", "2026-08-22", "index.html");
const briefingExists = await access(briefingPath).then(() => true, () => false);
assert.equal(briefingExists, true, "必须生成8月22日最新资料页");
const briefing = await readFile(briefingPath, "utf8");
assert.equal((briefing.match(/class="briefing-item"/g) ?? []).length, 5, "最新资料页必须有5条完整解读");
assert.match(briefing, /2026-08-21/);
assert.match(briefing, /2026-08-20/);
assert.match(briefing, /2026-08-19/);
assert.match(briefing, /https:\/\/www\.ecb\.europa\.eu\/press\/pr\/date\/2026\/html\/ecb\.pr260821/);
assert.match(briefing, /https:\/\/www\.who\.int\/news\/item\/20-08-2026/);
assert.match(briefing, /https:\/\/openai\.com\/index\/introducing-ai-futures/);
assert.match(briefing, /https:\/\/openai\.com\/index\/offering-zero-data-retention-for-frontier-models/);
assert.match(briefing, /https:\/\/www\.nature\.com\/articles\/d41586-026-02352-4/);

const audit = await readFile(path.join(site, "audit", "index.html"), "utf8");
assert.match(audit, /5\s*\/\s*110/);
assert.match(audit, /4\.5%/);
assert.match(audit, /未达到80%/);
assert.match(audit, /本地模型[^<]*不可用/);

const archive = await readFile(path.join(site, "archive", "index.html"), "utf8");
assert.match(archive, /data-archive-date="2026-08-22"/);
assert.match(archive, /<strong>2026\.08\.16<\/strong>/, "历史归档日期不得被当天发布脚本改写");
assert.equal((archive.match(/data-archive-date="2026-08-22"/g) ?? []).length, 1, "8月22日归档只能有一个条目");
assert.equal((archive.match(/<strong>2026\.08\.22<\/strong>/g) ?? []).length, 1, "历史日期不得被改写成8月22日");
assert.match(archive, /href="\/briefing\/2026-08-22"/);
assert.match(archive, /href="\/audit"/);

console.log("publish acceptance checks passed");
