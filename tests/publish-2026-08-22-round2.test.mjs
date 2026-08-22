import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const site = path.join(root, "site");
const baseline = "edcb7bb8c39d304b28d27f1b468f9f5ee6a39cf9";
const targets = [
  "codex/02", "codex/03", "codex/04",
  "daily/01", "daily/02", "daily/03", "daily/04",
  "finance/01", "finance/02", "finance/03",
  "financial-literacy/01", "financial-literacy/02",
  "papers/01", "papers/02", "papers/03",
  "health/01", "health/02", "health/03",
  "philosophy/01", "logic/01", "management/01", "history/01",
  "ted/01", "ted/02", "ted/03",
];

assert.equal(targets.length, 25);
const topics = new Set();
const sourceLinks = new Set();
const customTexts = [];

for (const target of targets) {
  const html = await readFile(path.join(site, "column", ...target.split("/"), "index.html"), "utf8");
  const baselineHtml = execFileSync("git", ["show", `${baseline}:site/column/${target}/index.html`], { cwd: root, encoding: "utf8" });
  assert.match(html, /data-round2-update="2026-08-22"/, `${target} 缺少第二轮更新标记`);
  assert.match(html, /原始资料再提炼/);
  assert.match(html, /白话拆解/);
  assert.match(html, /具体场景/);
  assert.match(html, /行动步骤/);
  assert.match(html, /停止条件与局限/);
  assert.match(html, /最后实质更新：(?:<!-- -->)?2026-08-22/);

  const section = html.match(/<section[^>]+data-round2-update="2026-08-22"[\s\S]*?<\/section>/)?.[0] ?? "";
  const custom = section.match(/<div class="round2-custom-content">([\s\S]*?)<\/div><div class="source-digest-attribution">/)?.[1] ?? "";
  const customText = custom.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  assert.ok(customText.length >= 600, `${target} 独立正文不足600字，当前${customText.length}字`);
  assert.doesNotMatch(customText, /(^|\s)\?(?=\s|$)/, `${target} 仍有孤立问号`);
  customTexts.push({ target, text: customText });

  const sourceDate = html.match(/来源发布日期：(?:<!-- -->)?([^<]+)</)?.[1]?.trim();
  const baselineSourceDate = baselineHtml.match(/来源发布日期：(?:<!-- -->)?([^<]+)</)?.[1]?.trim();
  assert.equal(sourceDate, baselineSourceDate, `${target} 来源发布日期被改动`);

  const topic = section.match(/data-round2-topic="([^"]+)"/)?.[1];
  assert.ok(topic, `${target} 缺少独立主题`);
  topics.add(topic);

  const link = section.match(/<a href="(https:[^"]+)"/)?.[1];
  assert.ok(link, `${target} 缺少原始来源链接`);
  sourceLinks.add(link);
}

const codex02 = await readFile(path.join(site, "column", "codex", "02", "index.html"), "utf8");
const stripTags = (value) => value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const lead = stripTags(codex02.match(/<div class="summary-blueprint-lead">[\s\S]*?<p>([\s\S]*?)<\/p>/)?.[1] ?? "");
const conclusion = stripTags(codex02.match(/<section id="conclusion">[\s\S]*?<div class="sourced-paragraph"><p>([\s\S]*?)<\/p>/)?.[1] ?? "");
assert.match(lead, /Daybreak Red/, "codex/02 顶部摘要没有讲 Daybreak Red");
assert.match(conclusion, /Daybreak Red/, "codex/02 主结论没有讲 Daybreak Red");
assert.doesNotMatch(`${lead} ${conclusion}`, /对话分节|长转录/, "codex/02 仍混入无关的对话分节内容");

const history01 = await readFile(path.join(site, "column", "history", "01", "index.html"), "utf8");
const historyKeyAreas = [
  history01.match(/<meta name="description" content="([^"]+)"/)?.[1] ?? "",
  stripTags(history01.match(/<h1>([\s\S]*?)<\/h1>/)?.[1] ?? ""),
  stripTags(history01.match(/<p class="reading-deck">([\s\S]*?)<\/p>/)?.[1] ?? ""),
  stripTags(history01.match(/<div class="summary-blueprint-lead">[\s\S]*?<p>([\s\S]*?)<\/p>/)?.[1] ?? ""),
  stripTags(history01.match(/<section id="question">[\s\S]*?<div class="sourced-paragraph"><p>([\s\S]*?)<\/p>/)?.[1] ?? ""),
  stripTags(history01.match(/data-round2-update="2026-08-22"[\s\S]*?<h3>原始资料再提炼<\/h3><p>([\s\S]*?)<\/p>/)?.[1] ?? ""),
];
for (const [index, text] of historyKeyAreas.entries()) {
  assert.match(text, /1886|巡阅|图像史料/, `history/01 关键区域${index + 1}没有限定到故宫史料介绍`);
  assert.doesNotMatch(text, /战败说明|共同决定结果|财政、维修、弹药、训练/, `history/01 关键区域${index + 1}仍有来源不支持的因果断言`);
}

assert.equal(topics.size, 25, "25篇必须有25个不同的补充主题");
assert.ok(sourceLinks.size >= 15, "25篇至少应覆盖15个不同来源入口");

const grams = (text, size = 12) => new Set(Array.from({ length: Math.max(0, text.length - size + 1) }, (_, index) => text.slice(index, index + size)));
let maxSimilarity = { value: 0, pair: "" };
for (let i = 0; i < customTexts.length; i += 1) {
  const left = grams(customTexts[i].text);
  for (let j = i + 1; j < customTexts.length; j += 1) {
    const right = grams(customTexts[j].text);
    const intersection = [...left].filter((value) => right.has(value)).length;
    const similarity = intersection / (left.size + right.size - intersection);
    if (similarity > maxSimilarity.value) maxSimilarity = { value: similarity, pair: `${customTexts[i].target} / ${customTexts[j].target}` };
  }
}
assert.ok(maxSimilarity.value < 0.35, `独立正文相似度过高：${maxSimilarity.pair} = ${maxSimilarity.value.toFixed(3)}`);

let round2Count = 0;
for (const column of ["codex", "daily", "finance", "financial-literacy", "papers", "health", "philosophy", "logic", "management", "history", "ted"]) {
  for (let n = 1; n <= 10; n += 1) {
    const file = path.join(site, "column", column, String(n).padStart(2, "0"), "index.html");
    const html = await readFile(file, "utf8");
    if (html.includes('data-round2-update="2026-08-22"')) round2Count += 1;
  }
}
assert.equal(round2Count, 25, "第二轮只能统计实际完成的25篇");

const audit = await readFile(path.join(site, "audit", "index.html"), "utf8");
assert.match(audit, /30\s*\/\s*110/);
assert.match(audit, /27\.3%/);
assert.match(audit, /第一轮5篇/);
assert.match(audit, /第二轮25篇/);
const auditJson = JSON.parse(await readFile(path.join(site, "audit", "update-2026-08-22.json"), "utf8"));
assert.equal(auditJson.sourceVerification.length, 25, "25篇都必须保留来源入口核验记录");
for (const record of auditJson.sourceVerification) {
  assert.equal(record.ok, true, `${record.target} 来源入口未通过联网核验`);
  assert.ok(record.status >= 200 && record.status < 400, `${record.target} 来源HTTP状态无效`);
  assert.match(record.finalUrl, /^https:/, `${record.target} 缺少最终来源地址`);
}

const archive = await readFile(path.join(site, "archive", "index.html"), "utf8");
const baselineArchive = execFileSync("git", ["show", `${baseline}:site/archive/index.html`], { cwd: root, encoding: "utf8" });
assert.equal((archive.match(/<strong>2026\.08\.22<\/strong>/g) ?? []).length, 1);
assert.match(archive, /30篇真实实质更新/);
const stripCurrentEntry = (value) => value.replace(/<article class="archive-entry" data-archive-date="2026-08-22">[\s\S]*?<\/article>/, "");
assert.equal(stripCurrentEntry(archive), stripCurrentEntry(baselineArchive), "8月22日之外的历史归档被改动");

const index = await readFile(path.join(site, "index.html"), "utf8");
assert.match(index, /30篇真实实质更新/);

console.log("round2 acceptance checks passed");
