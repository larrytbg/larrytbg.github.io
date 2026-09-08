import { execFileSync } from "node:child_process";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { requireExactIdSet } from "./lib/review-chain.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const site = path.join(root, "site");
const date = "2026-09-09";
const dateCn = "2026年9月9日";
const checkedAt = "2026-09-09 07:36（北京时间）";
const version = "30";

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i], process.argv[i + 1]);
const requiredArgs = ["--drafts-1", "--drafts-2", "--revised", "--review-1", "--review-2", "--final-review"];
for (const name of requiredArgs) {
  if (!args.get(name)) throw new Error(`missing required argument: ${name}`);
}

const load = async (name) => JSON.parse(await readFile(path.resolve(args.get(name)), "utf8"));
const [drafts1, drafts2, revised, review1, review2, finalReview] = await Promise.all(requiredArgs.map(load));
const originalDrafts = [...drafts1.items, ...drafts2.items];
const revisedById = new Map(revised.items.map((item) => [item.id, item]));
const initialReviews = [...review1.items, ...review2.items];
const initialById = new Map(initialReviews.map((item) => [item.id, item]));
const finalById = new Map(finalReview.items.map((item) => [item.id, item]));
const revisedIds = initialReviews.filter((item) => item.verdict === "REVISE").map((item) => item.id);
requireExactIdSet("revised drafts", revisedIds, revised.items);
requireExactIdSet("final review", revisedIds, finalReview.items);
if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(finalReview.generatedAt ?? "")) {
  throw new Error("final review generatedAt is missing or invalid");
}

const mappings = new Map([
  ["daily-20260908-who-dili-declaration", { target: "daily/01" }],
  ["daily-20260908-who-searo-achievements", { target: "daily/02" }],
  ["daily-20260908-nasa-tno-hubble-webb", { target: "daily/03" }],
  ["finance-20260908-fed-consumer-credit", { target: "finance/01" }],
  ["finance-20260908-ecb-weekly-statement", { target: "finance/02" }],
  ["health-20260908-who-tobacco-infertility", { target: "health/01" }],
  ["papers-20260908-metapneumovirus-reverse-orfs", { target: "papers/01" }],
]);
requireExactIdSet("initial review", originalDrafts.map((item) => item.id), initialReviews);
requireExactIdSet("release mapping", [...mappings.keys()], originalDrafts);

if (originalDrafts.length !== 9 || initialReviews.length !== 9 || revised.items.length !== 3 || finalReview.items.length !== 3) {
  throw new Error("unexpected batch size");
}

const updates = [];
const rejected = [];
for (const original of originalDrafts) {
  const initialVerdict = initialById.get(original.id)?.verdict;
  const finalVerdict = finalById.get(original.id)?.verdict;
  if (initialVerdict === "PASS") {
    updates.push({ ...original, ...mappings.get(original.id) });
  } else if (initialVerdict === "REVISE" && finalVerdict === "PASS") {
    updates.push({ ...revisedById.get(original.id), ...mappings.get(original.id) });
  } else if (initialVerdict === "REVISE" && finalVerdict === "REJECT") {
    rejected.push(original.id);
  } else {
    throw new Error(`unexpected review chain: ${original.id}`);
  }
}
if (updates.length !== 7 || rejected.length !== 2 || updates.some((item) => !item.target)) {
  throw new Error(`release gate mismatch: ${updates.length} approved, ${rejected.length} rejected`);
}

for (const item of updates) {
  if (!item.title || !item.sourceName || !item.sourceUrl || !item.publishedAt || !item.bodyHtml) {
    throw new Error(`incomplete approved draft: ${item.id}`);
  }
  item.facts = item.facts.map((fact) => fact.claim ?? fact);
  if (item.facts.length < 3 || item.boundaries.length < 1) throw new Error(`incomplete evidence: ${item.id}`);
  item.sourceDate = String(item.publishedAt).slice(0, 10);
}

const directPass = initialReviews.filter((item) => item.verdict === "PASS").length;
const revisedAndPassed = finalReview.items.filter((item) => item.verdict === "PASS").length;
const reviewSummary = { pass: directPass, revisedAndPassed, rejected: rejected.length, reworkRounds: 1 };
if (JSON.stringify(reviewSummary) !== JSON.stringify({ pass: 6, revisedAndPassed: 1, rejected: 2, reworkRounds: 1 })) {
  throw new Error("review summary does not match verified chain");
}
const reviewSentence = `${directPass}篇直接通过事实复核，${revisedAndPassed}篇一次修订后通过，${rejected.length}篇在一次返工后驳回`;

const ledgerPath = path.join(root, "data", "article-date-ledger.json");
const baselinePath = path.join(root, "data", `article-baseline-${date}.json`);
const ledger = JSON.parse(await readFile(ledgerPath, "utf8"));
const columnNames = { daily: "每日资讯", finance: "金融", health: "身体健康", papers: "论文研究" };
const accents = { daily: "accent-vermilion", finance: "accent-gold", health: "accent-green", papers: "accent-indigo" };
const esc = (value = "") => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const summary = (item) => item.facts.slice(0, 2).join(" ");
const sourceName = (item) => item.sourceName;

function renderHero(item) {
  const [column, index] = item.target.split("/");
  return `<header class="shell reading-hero"><div class="breadcrumbs"><a href="/">首页</a><span>/</span><a href="/column/${column}">${columnNames[column]}</a><span>/</span><span>第 ${index} 篇</span></div><p class="eyebrow">9月9日实质更新 ${index} · 原始来源与事实复核通过</p><h1>${esc(item.title)}</h1><p class="reading-deck">${esc(summary(item))}</p><div class="reading-meta"><span>本站首次发布：${date}</span><span>原文日期：${esc(item.sourceDate)}</span><span class="source-grade grade-a">A级 · 官方或原始来源</span><span>预计阅读：5—8分钟</span></div><div class="summary-blueprint"><div class="summary-blueprint-lead"><span>30秒先看懂</span><p>${esc(item.facts[0])}</p><small>先确认来源事实，再看解释与边界。</small></div><div class="summary-threads"><div><b>01</b><strong>来源确认了什么</strong><p>${esc(item.facts[1])}</p></div><div><b>02</b><strong>还不能推出什么</strong><p>${esc(item.boundaries.join(" "))}</p></div></div><div class="source-digest-attribution"><strong>主要依据</strong><a href="${esc(item.sourceUrl)}" target="_blank" rel="noreferrer">${esc(sourceName(item))} ↗</a></div></div></header>`;
}

function renderArticle(item) {
  return `<article class="long-article" data-substantive-update="${date}"><section id="conclusion"><p class="section-pattern-label">事实复核通过 · 来源与解释分开</p>${item.bodyHtml}</section><section id="sources" class="full-source-list"><h2>参考资料与原始来源</h2><p>本站中文整理不代替来源全文；后续如有正式决定、数据或更正，以原始页面为准。</p><a href="${esc(item.sourceUrl)}" target="_blank" rel="noreferrer"><span>${esc(sourceName(item))} · ${esc(item.sourceDate)}</span><b>打开原文 ↗</b></a></section></article>`;
}

function renderSidebar() {
  return `<aside class="reading-sidebar"><p>文章目录</p><nav aria-label="文章目录"><a href="#conclusion">事实、解释与边界</a><a href="#sources">参考资料与原始来源</a></nav><div class="reading-note"><strong>阅读说明</strong><span>本页只发布通过事实复核的内容；来源事实、本站解释与不能推出的结论保持分开。</span></div></aside>`;
}

function renderCard(item) {
  const [, index] = item.target.split("/");
  return `<article class="article-card"><div class="article-order">${index}</div><div class="article-preview-main"><p class="card-label">9月9日实质更新 · 已复核</p><h3><a href="/column/${item.target}">${esc(item.title)}</a><small class="article-updated-date">本站发布：${date}</small></h3><p class="article-preview-summary">${esc(summary(item))}</p><div class="article-meta"><span>事实与解释分开</span><span>主要资料：${esc(sourceName(item))}</span><span class="source-grade grade-a">来源复核通过</span></div></div><a href="/column/${item.target}" class="article-enter" aria-label="进入全文：${esc(item.title)}"><span>进入全文</span><b>→</b></a></article>`;
}

function updateChrome(html) {
  return html
    .replace(/<div class="live-status"><span><\/span>[\s\S]*?<\/div>/, `<div class="live-status"><span></span> 2026.09.09 · 每日更新 ${version}</div>`)
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
    const paginationLink = new RegExp(`(<a href="/column/${item.target}"><span>[^<]+</span><strong>)[\\s\\S]*?(</strong></a>)`, "g");
    html = html.replace(paginationLink, `$1${esc(item.title)}$2`);
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
const note = `<p class="today-update-note">9月9日完成7篇真实实质更新：每日资讯3篇、金融2篇、身体健康1篇、论文研究1篇；TED和轮换的财务学习栏目没有通过当日来源门禁的新增内容，未用旧稿补数。${reviewSentence}。<a href="/audit">查看逐篇审计 →</a></p>`;
home = home.includes('class="today-update-note"')
  ? home.replace(/<p class="today-update-note">[\s\S]*?<\/p>/, note)
  : home.replace('<h2 id="today-title">今日必读</h2>', `<h2 id="today-title">今日必读</h2>${note}`);
await writeFile(path.join(site, "index.html"), home, "utf8");

const scope = { daily: 3, finance: 2, health: 1, papers: 1, ted: 0, financialLiteracy: 0 };
const auditArticles = updates.map((item) => ({
  target: item.target,
  changeType: "new",
  changeSummary: `新增并核准${columnNames[item.target.split("/")[0]]}资料：${item.facts[0]}`,
  title: item.title,
  sourceDate: item.sourceDate,
  sourceVerification: { ok: true, checkedAt, sources: [{ name: sourceName(item), url: item.sourceUrl }] },
}));
const audit = {
  date, sourceCutoff: checkedAt, totalArticles: 110, substantivelyUpdated: updates.length,
  updateRate: Number((updates.length / 110).toFixed(4)), target: "quality-first, no padding", targetMet: true,
  scope,
  tedScan: { scanned: true, newItems: 0, updated: 0, note: "过去24小时未核准到TED官方新增内容，未用旧演讲补数。" },
  rotation: { column: "financialLiteracy", updated: 0, note: "轮换栏目未核准到高价值新增来源，未用旧稿补数。" },
  reviewSummary,
  articles: auditArticles,
};
const auditText = `${JSON.stringify(audit, null, 2)}\n`;
await writeFile(path.join(root, "data", `update-audit-${date}.json`), auditText, "utf8");
await writeFile(path.join(site, "audit", `update-${date}.json`), auditText, "utf8");

const rows = auditArticles.map((item) => `<li><strong>${item.target}</strong><span>${esc(item.title)}</span><small>${esc(item.changeSummary)}</small></li>`).join("");
const auditPage = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><link rel="stylesheet" href="/assets/index-CVB57ELS.css"/><link rel="stylesheet" href="/assets/daily-highlights.css"/><title>9月9日更新审计 · 自学总站</title></head><body><header class="site-header"><div class="shell header-inner"><a href="/" class="brand"><span class="brand-mark">知</span><span>自学总站</span></a><nav class="main-nav"><a href="/">全部专栏</a><a href="/ski-training">滑雪训练</a><a href="/archive">每日归档</a></nav><div class="live-status"><span></span> 2026.09.09 · 每日更新 ${version}</div></div></header><main class="shell audit-page"><header class="directory-header"><p>${dateCn} · 真实更新审计</p><h1>7篇真实实质更新，按新鲜度与质量发布</h1><p>每日资讯3篇、金融2篇、身体健康1篇、论文研究1篇。${reviewSentence}。</p></header><section class="audit-summary"><h2>质量说明</h2><p>7篇均来自官方或原始来源，日期、主体、数字和边界经过独立事实复核；2篇未完整落实修订意见而放弃，没有用旧稿、页面日期或同义改写补数。</p></section><section class="audit-list"><h2>逐篇变更</h2><ul>${rows}</ul></section></main><footer class="site-footer"><div class="shell footer-inner"><p>自学总站 · 长期自学知识库</p><p>${dateCn} · 每日更新 ${version}</p></div></footer></body></html>`;
await writeFile(path.join(site, "audit", "index.html"), auditPage, "utf8");

let archive = await readFile(path.join(site, "archive", "index.html"), "utf8");
archive = archive.replace(/<article class="archive-entry" data-archive-date="2026-09-09">[\s\S]*?<\/article>/, "");
const archiveEntry = `<article class="archive-entry" data-archive-date="2026-09-09"><div class="archive-date"><strong>2026.09.09</strong><span>每日更新 ${version} · 7篇真实实质更新</span></div><div class="archive-content"><h2>${dateCn}</h2><p>本批按质量优先更新7篇：${reviewSentence}；TED和轮换栏目没有合格新增，未用旧稿补数。</p><ul><li><span>更新审计</span><a href="/audit">查看7篇逐条审计 →</a></li></ul></div></article>`;
archive = archive.replace('<section class="shell archive-list" aria-label="每日版本">', `<section class="shell archive-list" aria-label="每日版本">${archiveEntry}`);
await writeFile(path.join(site, "archive", "index.html"), archive, "utf8");

const mirrorPath = path.join(site, "mirror-status.json");
const mirror = JSON.parse(await readFile(mirrorPath, "utf8"));
mirror.generatedAt = finalReview.generatedAt;
mirror.update = { date, articles: updates.length, mode: "quality-first", targetMet: true };
await writeFile(mirrorPath, `${JSON.stringify(mirror, null, 2)}\n`, "utf8");

execFileSync(process.execPath, [path.join(root, "scripts", "apply-daily-highlights.mjs"), "--date", date, "--audit", path.join(root, "data", `update-audit-${date}.json`), "--baseline", baselinePath, "--ledger", ledgerPath], { cwd: root, stdio: "inherit" });
execFileSync(process.execPath, [path.join(root, "scripts", "apply-article-dates.mjs"), "--ledger", ledgerPath], { cwd: root, stdio: "inherit" });
console.log(`Prepared ${updates.length}/110 verified substantive updates; ${reviewSentence}.`);
