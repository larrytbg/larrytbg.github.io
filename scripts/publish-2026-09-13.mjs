import { execFileSync } from "node:child_process";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { requireExactIdSet } from "./lib/review-chain.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const site = path.join(root, "site");
const date = "2026-09-13";
const dateCn = "2026年9月13日";
const checkedAt = "2026-09-13 07:23（北京时间）";
const version = "34";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) args.set(process.argv[index], process.argv[index + 1]);
const required = ["--drafts", "--review"];
for (const name of required) if (!args.get(name)) throw new Error(`missing required argument: ${name}`);
const load = async (name) => JSON.parse(await readFile(path.resolve(args.get(name)), "utf8"));
const [draftsFile, reviewFile] = await Promise.all(required.map(load));
const drafts = structuredClone(draftsFile.items);
const reviews = reviewFile.items;

const mappings = new Map([
  ["daily-20260912-cross-border-warning", { target: "daily/02" }],
  ["finance-202609-imf-global-imbalances", { target: "finance/02" }],
  ["health-20260912-youth-mental-health-review", { target: "health/02" }],
  ["papers-20260912-amorphous-ice-local-structure", { target: "papers/02" }],
  ["philosophy-20260912-llm-latent-persona", { target: "philosophy/02" }],
]);

requireExactIdSet("fact review", drafts.map((item) => item.id), reviews);
requireExactIdSet("release mapping", [...mappings.keys()], drafts);
if (drafts.length !== 5 || reviews.length !== 5 || reviews.some((item) => item.verdict !== "PASS")) {
  throw new Error("release requires five direct PASS records");
}
if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(reviewFile.generatedAt ?? "")) {
  throw new Error("fact review generatedAt is missing or invalid");
}

const reviewById = new Map(reviews.map((item) => [item.id, item]));
const updates = drafts.map((item) => {
  const mapping = mappings.get(item.id);
  if (!mapping || reviewById.get(item.id)?.verdict !== "PASS") throw new Error(`unapproved item: ${item.id}`);
  if (!item.title || !item.sourceName || !item.sourceUrl || !item.bodyHtml) throw new Error(`incomplete draft: ${item.id}`);
  if (item.publishedAt !== null && !/^\d{4}-\d{2}-\d{2}$/.test(item.publishedAt ?? "")) throw new Error(`invalid source date: ${item.id}`);
  const facts = item.facts.map((fact) => fact.claim ?? fact);
  if (facts.length < 3 || item.boundaries.length < 1) throw new Error(`incomplete evidence: ${item.id}`);
  const plainLength = item.bodyHtml.replace(/<[^>]+>/g, "").replace(/\s+/g, "").length;
  const paragraphs = [...item.bodyHtml.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((match) => match[1].trim());
  const badStructure = plainLength < 800
    || (item.bodyHtml.match(/<h2>/g) ?? []).length < 7
    || /<p>(?:(?!<\/p>)[\s\S])*<p>/.test(item.bodyHtml)
    || /。。|。；|；。/.test(item.bodyHtml)
    || new Set(paragraphs).size !== paragraphs.length;
  if (badStructure) throw new Error(`draft structure failed: ${item.id}`);
  return { ...item, ...mapping, facts, sourceDate: item.publishedAt };
});

const reviewSummary = { pass: 5, revisedAndPassed: 0, rejected: 0, reworkRounds: 0 };
const reviewSentence = "5篇全部直接通过事实复核，0篇返工，0篇驳回";
const ledgerPath = path.join(root, "data", "article-date-ledger.json");
const baselinePath = path.join(root, "data", `article-baseline-${date}.json`);
const columnNames = { daily: "每日资讯", finance: "金融", health: "身体健康", papers: "论文研究", philosophy: "哲学" };
const accents = { daily: "accent-vermilion", finance: "accent-gold", health: "accent-green", papers: "accent-indigo", philosophy: "accent-indigo" };
const esc = (value = "") => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const summary = (item) => item.facts.slice(0, 2).join(" ");

function renderHero(item) {
  const [column, index] = item.target.split("/");
  const sourceDate = item.sourceDate ? `<span>原文发布：${item.sourceDate}</span>` : "";
  return `<header class="shell reading-hero"><div class="breadcrumbs"><a href="/">首页</a><span>/</span><a href="/column/${column}">${columnNames[column]}</a><span>/</span><span>第 ${index} 篇</span></div><p class="eyebrow">9月13日实质更新 ${index} · 原始来源与事实复核通过</p><h1>${esc(item.title)}</h1><p class="reading-deck">${esc(summary(item))}</p><div class="reading-meta"><span>本站首次发布：${date}</span>${sourceDate}<span class="source-grade grade-a">A级 · 官方或原始来源</span><span>预计阅读：6—9分钟</span></div><div class="summary-blueprint"><div class="summary-blueprint-lead"><span>30秒先看懂</span><p>${esc(item.facts[0])}</p><small>先确认来源事实，再看解释与边界。</small></div><div class="summary-threads"><div><b>01</b><strong>来源确认了什么</strong><p>${esc(item.facts[1])}</p></div><div><b>02</b><strong>还不能推出什么</strong><p>${esc(item.boundaries.join(" "))}</p></div></div><div class="source-digest-attribution"><strong>主要依据</strong><a href="${esc(item.sourceUrl)}" target="_blank" rel="noreferrer">${esc(item.sourceName)} ↗</a></div></div></header>`;
}

function renderArticle(item) {
  const sourceLabel = item.sourceDate ? `${item.sourceName} · ${item.sourceDate}` : item.sourceName;
  return `<article class="long-article" data-substantive-update="${date}"><section id="conclusion"><p class="section-pattern-label">事实复核通过 · 来源与解释分开</p>${item.bodyHtml}</section><section id="sources" class="full-source-list"><h2>参考资料与原始来源</h2><p>本站中文整理不代替来源全文；后续如有正式决定、数据或更正，以原始页面为准。</p><a href="${esc(item.sourceUrl)}" target="_blank" rel="noreferrer"><span>${esc(sourceLabel)}</span><b>打开原文 ↗</b></a></section></article>`;
}

function renderSidebar() {
  return `<aside class="reading-sidebar"><p>文章目录</p><nav aria-label="文章目录"><a href="#conclusion">事实、解释与边界</a><a href="#sources">参考资料与原始来源</a></nav><div class="reading-note"><strong>阅读说明</strong><span>本页只发布通过事实复核的内容；来源事实、本站解释与不能推出的结论保持分开。</span></div></aside>`;
}

function renderCard(item) {
  const [, index] = item.target.split("/");
  return `<article class="article-card"><div class="article-order">${index}</div><div class="article-preview-main"><p class="card-label">9月13日实质更新 · 已复核</p><h3><a href="/column/${item.target}">${esc(item.title)}</a><small class="article-updated-date">本站发布：${date}</small></h3><p class="article-preview-summary">${esc(summary(item))}</p><div class="article-meta"><span>事实与解释分开</span><span>主要资料：${esc(item.sourceName)}</span><span class="source-grade grade-a">来源复核通过</span></div></div><a href="/column/${item.target}" class="article-enter" aria-label="进入全文：${esc(item.title)}"><span>进入全文</span><b>→</b></a></article>`;
}

function updateChrome(html) {
  return html
    .replace(/<div class="live-status"><span><\/span>[\s\S]*?<\/div>/, `<div class="live-status"><span></span> 2026.09.13 · 每日更新 ${version}</div>`)
    .replace(/(<aside class="column-status"><span>)[\s\S]*?(<\/span>)/, `$1${dateCn} · 每日更新 ${version}$2`)
    .replace(/(<footer class="site-footer">[\s\S]*?<p>)(?:\d{4}年\d{1,2}月\d{1,2}日)([\s\S]*?每日更新(?:<!-- -->)?\s*)\d+(<\/p>)/, `$1${dateCn}$2${version}$3`);
}

for (const item of updates) {
  const [column, index] = item.target.split("/");
  const detailPath = path.join(site, "column", column, index, "index.html");
  let detail = await readFile(detailPath, "utf8");
  item.oldTitle = detail.match(/<h1>([\s\S]*?)<\/h1>/)?.[1]?.replace(/<[^>]+>/g, "") ?? "";
  detail = detail
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(item.title)} · 自学总站</title>`)
    .replace(/<meta name="description" content="[^"]*"\/>/, `<meta name="description" content="${esc(summary(item))}"/>`)
    .replace(/<main class="reading-page [^"]+">/, `<main class="reading-page ${accents[column]}">`)
    .replace(/<header class="shell reading-hero">[\s\S]*?<\/header>/, renderHero(item))
    .replace(/<article class="long-article"[^>]*>[\s\S]*?<\/article>/, renderArticle(item))
    .replace(/<aside class="reading-sidebar">[\s\S]*?<\/aside>/, renderSidebar());
  await writeFile(detailPath, updateChrome(detail), "utf8");

  const columnPath = path.join(site, "column", column, "index.html");
  let columnHtml = await readFile(columnPath, "utf8");
  columnHtml = columnHtml.replace(/<article class="[^"]*article-card[^"]*"[^>]*>[\s\S]*?<\/article>/g, (card) =>
    card.includes(`href="/column/${column}/${index}"`) ? renderCard(item) : card);
  await writeFile(columnPath, updateChrome(columnHtml), "utf8");
}

const htmlFiles = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(full);
    else if (entry.name === "index.html") htmlFiles.push(full);
  }
}
await walk(site);
for (const file of htmlFiles) {
  let html = await readFile(file, "utf8");
  for (const item of updates) {
    if (item.oldTitle) html = html.replaceAll(item.oldTitle, item.title);
    const pagination = new RegExp(`(<a href="/column/${item.target}"><span>[^<]+</span><strong>)[\\s\\S]*?(</strong></a>)`, "g");
    html = html.replace(pagination, `$1${esc(item.title)}$2`);
  }
  await writeFile(file, updateChrome(html), "utf8");
}

let home = await readFile(path.join(site, "index.html"), "utf8");
const featured = updates.map((item, index) => {
  const [column] = item.target.split("/");
  return `<a href="/column/${item.target}" class="today-card ${accents[column]}"><span>0${index + 1} · ${columnNames[column]}</span><h3>${esc(item.title)}</h3><small class="today-updated-date">本站发布：${date}</small><p>${esc(summary(item))}</p></a>`;
}).join("");
home = home
  .replace(/(<section class="shell directory-header"><p>)[\s\S]*?(<\/p>)/, `$1${dateCn} · 每日更新 ${version}$2`)
  .replace(/资料截止：[^<]+/, `资料截止：${checkedAt}`)
  .replace(/<div class="today-grid">[\s\S]*?<\/div><\/section>/, `<div class="today-grid">${featured}</div></section>`);
const note = `<p class="today-update-note">9月13日完成5篇真实实质更新：每日资讯、金融、身体健康、论文研究和轮换的哲学栏目各1篇；TED过去24小时没有核准到官方新演讲，未用旧内容补数。${reviewSentence}。<a href="/audit">查看逐篇审计 →</a></p>`;
home = home.includes('class="today-update-note"')
  ? home.replace(/<p class="today-update-note">[\s\S]*?<\/p>/, note)
  : home.replace('<h2 id="today-title">今日必读</h2>', `<h2 id="today-title">今日必读</h2>${note}`);
await writeFile(path.join(site, "index.html"), home, "utf8");

const scope = { daily: 1, finance: 1, health: 1, papers: 1, ted: 0, philosophy: 1 };
const auditArticles = updates.map((item) => ({
  target: item.target,
  changeType: "new",
  changeSummary: `新增并核准${columnNames[item.target.split("/")[0]]}资料：${item.facts[0]}`,
  title: item.title,
  sourceDate: item.sourceDate,
  sourceVerification: { ok: true, checkedAt, sources: [{ name: item.sourceName, url: item.sourceUrl }] },
}));
const audit = {
  date, sourceCutoff: checkedAt, totalArticles: 110, substantivelyUpdated: updates.length,
  updateRate: Number((updates.length / 110).toFixed(4)), target: "quality-first, no padding", targetMet: true,
  scope,
  sourceScan: { candidates: 3, readyFromWorker: 1, hold: 2, workerReadyRejected: 1, workerHoldPromoted: 1, controllerExpanded: true, selected: 5, note: "工作任务READY项超出24小时时窗；一项HOLD与前一日重复；非晶冰论文在总控补核摘要后采用，另补充4项A级来源。" },
  freshness: { within24Hours: 4, currentIssueWithoutExactDay: 1, note: "金融资料为IMF 2026年9月最新一期，原页无日级日期，公开页不猜日期。" },
  tedScan: { scanned: true, newItems: 0, updated: 0, note: "TED官网候选只标注月份，无法证明过去24小时新增；TEDx活动页不是已发布演讲，未用旧稿补数。" },
  rotation: { column: "philosophy", updated: 1, note: "哲学轮换栏目用于训练技术构造、经验假设与意识本体论主张的概念区分。" },
  draftSummary: { workerRounds: 2, workerResult: "first delivery missing; second failed quality gate", controllerTakeover: true, note: "总控依据已核验证据完成逐篇非模板化终稿。" },
  reviewSummary,
  articles: auditArticles,
};
const auditText = `${JSON.stringify(audit, null, 2)}\n`;
await writeFile(path.join(root, "data", `update-audit-${date}.json`), auditText, "utf8");
await writeFile(path.join(site, "audit", `update-${date}.json`), auditText, "utf8");

const rows = auditArticles.map((item) => `<li><strong>${item.target}</strong><span>${esc(item.title)}</span><small>${esc(item.changeSummary)}</small></li>`).join("");
const auditPage = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><link rel="stylesheet" href="/assets/index-CVB57ELS.css"/><link rel="stylesheet" href="/assets/daily-highlights.css"/><title>9月13日更新审计 · 自学总站</title></head><body><header class="site-header"><div class="shell header-inner"><a href="/" class="brand"><span class="brand-mark">知</span><span>自学总站</span></a><nav class="main-nav"><a href="/">全部专栏</a><a href="/ski-training">滑雪训练</a><a href="/archive">每日归档</a></nav><div class="live-status"><span></span> 2026.09.13 · 每日更新 ${version}</div></div></header><main class="shell audit-page"><header class="directory-header"><p>${dateCn} · 真实更新审计</p><h1>5篇真实实质更新，按新鲜度与质量发布</h1><p>每日资讯、金融、身体健康、论文研究和哲学各1篇。${reviewSentence}。</p></header><section class="audit-summary"><h2>质量说明</h2><p>4篇来自9月12日发布的原始期刊页；金融资料来自IMF 2026年9月最新一期，因原页没有具体日期而隐藏日级原文日期。全部条目已核对主体、文章类型、事实、因果与边界；TED没有核准到过去24小时新增演讲。</p></section><section class="audit-list"><h2>逐篇变更</h2><ul>${rows}</ul></section></main><footer class="site-footer"><div class="shell footer-inner"><p>自学总站 · 长期自学知识库</p><p>${dateCn} · 每日更新 ${version}</p></div></footer></body></html>`;
await writeFile(path.join(site, "audit", "index.html"), auditPage, "utf8");

let archive = await readFile(path.join(site, "archive", "index.html"), "utf8");
archive = archive.replace(/<article class="archive-entry" data-archive-date="2026-09-13">[\s\S]*?<\/article>/, "");
const archiveEntry = `<article class="archive-entry" data-archive-date="2026-09-13"><div class="archive-date"><strong>2026.09.13</strong><span>每日更新 ${version} · 5篇真实实质更新</span></div><div class="archive-content"><h2>${dateCn}</h2><p>本批按质量优先更新5篇：${reviewSentence}；TED没有合格新增，未用旧稿补数。</p><ul><li><span>更新审计</span><a href="/audit">查看5篇逐条审计 →</a></li></ul></div></article>`;
archive = archive.replace('<section class="shell archive-list" aria-label="每日版本">', `<section class="shell archive-list" aria-label="每日版本">${archiveEntry}`);
await writeFile(path.join(site, "archive", "index.html"), archive, "utf8");

const mirrorPath = path.join(site, "mirror-status.json");
const mirror = JSON.parse(await readFile(mirrorPath, "utf8"));
mirror.generatedAt = reviewFile.generatedAt;
mirror.update = { date, articles: updates.length, mode: "quality-first", targetMet: true };
await writeFile(mirrorPath, `${JSON.stringify(mirror, null, 2)}\n`, "utf8");

execFileSync(process.execPath, [path.join(root, "scripts", "apply-daily-highlights.mjs"), "--date", date, "--audit", path.join(root, "data", `update-audit-${date}.json`), "--baseline", baselinePath, "--ledger", ledgerPath], { cwd: root, stdio: "inherit" });
execFileSync(process.execPath, [path.join(root, "scripts", "apply-article-dates.mjs"), "--ledger", ledgerPath], { cwd: root, stdio: "inherit" });
console.log(`Prepared ${updates.length}/110 verified substantive updates; ${reviewSentence}.`);
