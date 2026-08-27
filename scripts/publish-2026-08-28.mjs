import { execFileSync } from "node:child_process";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const site = path.join(root, "site");
const date = "2026-08-28";
const dateCn = "2026年8月28日";
const version = "28";
const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i], process.argv[i + 1]);
const inputPath = args.get("--input");
if (!inputPath) throw new Error("Usage: node scripts/publish-2026-08-28.mjs --input <approved-json>");

const input = JSON.parse(await readFile(path.resolve(inputPath), "utf8"));
const updates = input.articles ?? [];
const expectedScope = { daily: 1, finance: 2, health: 1, papers: 3, management: 1 };
if (input.date !== date) throw new Error(`input date mismatch: ${input.date}`);
if (JSON.stringify(input.scope) !== JSON.stringify(expectedScope)) throw new Error("input scope mismatch");
if (!/^2026-08-28 \d{2}:\d{2}（北京时间）$/.test(input.checkedAt ?? "")) throw new Error("invalid checkedAt");
if (!/^2026-08-27T18:\d{2}:\d{2}\.000Z$/.test(input.generatedAt ?? "")) throw new Error("invalid generatedAt");
if (updates.length === 0 || updates.length > 30) throw new Error(`invalid update count: ${updates.length}`);
if (new Set(updates.map((item) => item.target)).size !== updates.length) throw new Error("duplicate targets");
for (const item of updates) {
  if (!/^[a-z0-9-]+\/\d{2}$/.test(item.target)) throw new Error(`invalid target: ${item.target}`);
  if (!item.title || !item.sourceDate || !item.sources?.length || item.facts?.length < 3) {
    throw new Error(`incomplete approved item: ${item.id}`);
  }
}

const ledgerPath = path.resolve(args.get("--ledger") ?? path.join(root, "data", "article-date-ledger.json"));
const baselinePath = path.resolve(args.get("--baseline") ?? path.join(root, "data", `article-baseline-${date}.json`));
const ledger = JSON.parse(await readFile(ledgerPath, "utf8"));
const columnNames = {
  daily: "每日资讯", finance: "金融", "financial-literacy": "财务学习", health: "身体健康",
  papers: "论文研究", ted: "TED 学习", codex: "Codex 学习", history: "历史",
  logic: "逻辑", management: "管理", philosophy: "哲学",
};
const accentByColumn = {
  daily: "accent-vermilion", finance: "accent-navy", "financial-literacy": "accent-gold",
  health: "accent-green", papers: "accent-blue", ted: "accent-rose", codex: "accent-teal",
  history: "accent-bronze", logic: "accent-purple", management: "accent-orange", philosophy: "accent-indigo",
};
const esc = (value = "") => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const summary = (item) => item.facts.slice(0, 2).join(" ");
const changeSummary = (item) => `新增并核准${columnNames[item.column]}资料：${item.facts[0]}`;
const checkedAt = input.checkedAt;

function renderSources(item, detailed = false) {
  return item.sources.map((source, index) => `<a href="${esc(source.url)}" target="_blank" rel="noreferrer"><span>${esc(source.name)}${detailed && index === 0 ? ` · ${esc(item.sourceDate)}` : ""}</span><b>打开原文 ↗</b></a>`).join("");
}

function renderHero(item) {
  const [column, index] = item.target.split("/");
  const publishedOn = ledger.articles[item.target]?.publishedOn ?? date;
  return `<header class="shell reading-hero"><div class="breadcrumbs"><a href="/">首页</a><span>/</span><a href="/column/${column}">${columnNames[column]}</a><span>/</span><span>第 ${index} 篇</span></div><p class="eyebrow">8月28日实质更新 ${index} · 原始来源与事实复核通过</p><h1>${esc(item.title)}</h1><p class="reading-deck">${esc(item.summary ?? summary(item))}</p><div class="reading-meta"><span>本站首次发布：${publishedOn}</span><span>本站最后更新：${date}</span><span>原文日期：${esc(item.sourceDate)}</span><span class="source-grade grade-a">来源复核通过</span><span>预计阅读：7—10分钟</span></div><div class="summary-blueprint"><div class="summary-blueprint-lead"><span>30秒先看懂</span><p>${esc(item.facts[0])}</p><small>先确认来源事实，再看解释、用途与边界。</small></div><div class="summary-threads"><div><b>01</b><strong>来源确认了什么</strong><p>${esc(item.facts[1] ?? item.facts[0])}</p></div><div><b>02</b><strong>为什么值得关注</strong><p>${esc(item.interpretation[0])}</p></div><div><b>03</b><strong>不能推出什么</strong><p>${esc(item.boundary)}</p></div></div><div class="source-digest-attribution"><strong>主要依据</strong><a href="${esc(item.sources[0].url)}" target="_blank" rel="noreferrer">${esc(item.sources[0].name)} ↗</a></div></div></header>`;
}

function paragraphs(values) {
  return values.map((value) => `<div class="sourced-paragraph"><p>${esc(value)}</p></div>`).join("");
}

function renderArticle(item) {
  const factList = item.facts.map((fact) => `<li>${esc(fact)}</li>`).join("");
  const practiceList = `${item.practice.map((step) => `<li>${esc(step)}</li>`).join("")}<li>复查时确认链接仍指向同一版本，而不是被新版静默替换。</li>`;
  const deepSections = item.sections.map((section) => `<h3>${esc(section.heading)}</h3>${paragraphs(section.paragraphs)}`).join("");
  return `<article class="long-article" data-substantive-update="${date}"><section id="conclusion"><p class="section-pattern-label">先说结果 · 事实复核通过</p><h2>一、今天确认了什么</h2><div class="sourced-paragraph"><p>${esc(item.summary ?? summary(item))}</p></div></section><section id="evidence"><p class="section-pattern-label">逐项核对原始资料</p><h2>二、来源中的关键事实</h2><ul>${factList}</ul><div class="sourced-paragraph"><p>上述事实均按${esc(item.sourceDate)}对应原始资料核对；若来源后续修订，应以新版和本站后续审计为准。</p></div></section><section id="interpretation"><p class="section-pattern-label">采用复核后的深度稿</p><h2>三、怎样理解与使用</h2>${deepSections}</section><section id="method"><p class="section-pattern-label">检查证据等级</p><h2>四、如何避免读错</h2><div class="sourced-paragraph"><p>先确认发布机构和原文日期，再区分计划与完成、关联与因果、群体统计与个人结果、模型推断与直接测量。来源能支持到哪里，结论就停在哪里。</p></div></section><section id="practice"><p class="section-pattern-label">转成可执行的学习动作</p><h2>五、接下来可以怎样用</h2><ol>${practiceList}</ol></section><section id="boundary"><p class="section-pattern-label">局限与适用边界</p><h2>六、哪些结论不能说得太满</h2><div class="sourced-paragraph"><p>${esc(item.boundary)}</p></div></section><section id="review"><p class="section-pattern-label">留给下一次复查</p><h2>七、后续应关注什么</h2><div class="sourced-paragraph"><p>后续只在来源出现修订、补充数据、正式决定、同行复现或实施结果时更新，不用日期、排版或同义改写冒充变化。</p></div></section><section id="sources" class="full-source-list"><h2>参考资料与原始来源</h2><p>以下链接用于核对原始内容；本站中文整理不代替来源全文。</p>${renderSources(item, true)}</section></article>`;
}

function renderSidebar() {
  return `<aside class="reading-sidebar"><p>文章目录</p><nav aria-label="文章目录"><a href="#conclusion">一、今天确认了什么</a><a href="#evidence">二、来源中的关键事实</a><a href="#interpretation">三、怎样理解这些信息</a><a href="#method">四、如何避免读错</a><a href="#practice">五、接下来可以怎样用</a><a href="#boundary">六、哪些结论不能说得太满</a><a href="#review">七、后续应关注什么</a><a href="#sources">参考资料与原始来源</a></nav><div class="reading-note"><strong>阅读说明</strong><span>来源事实、本站解释和适用边界分开呈现。</span></div><div class="reading-note source-grade-note"><strong>事实复核通过</strong><span>数字、日期、主体、因果和范围已按原始页面复核。</span></div></aside>`;
}

function renderCard(item) {
  const [, index] = item.target.split("/");
  return `<article class="article-card"><div class="article-order">${index}</div><div class="article-preview-main"><p class="card-label">8月28日实质更新 · 已复核</p><h3><a href="/column/${item.target}">${esc(item.title)}</a><small class="article-updated-date">本站更新：${date}</small></h3><p class="article-preview-summary">${esc(item.summary ?? summary(item))}</p><div class="article-meta"><span>事实与解释分开</span><span>主要资料：${esc(item.sources[0].name)}</span><span class="source-grade grade-a">来源复核通过</span></div></div><a href="/column/${item.target}" class="article-enter" aria-label="进入全文：${esc(item.title)}"><span>进入全文</span><b>→</b></a></article>`;
}

function updateChrome(html) {
  return html
    .replace(/<div class="live-status"><span><\/span>[\s\S]*?<\/div>/, `<div class="live-status"><span></span> 2026.08.28 · 每日更新 ${version}</div>`)
    .replace(/(<aside class="column-status"><span>)[\s\S]*?(<\/span>)/, `$1${dateCn} · 每日更新 ${version}$2`)
    .replace(/(<footer class="site-footer">[\s\S]*?<p>)(?:\d{4}年\d{1,2}月\d{1,2}日)([\s\S]*?每日更新(?:<!-- -->)?\s*)\d+(<\/p>)/, `$1${dateCn}$2 ${version}$3`);
}

for (const item of updates) {
  const [column, index] = item.target.split("/");
  const detailPath = path.join(site, "column", column, index, "index.html");
  let detail = await readFile(detailPath, "utf8");
  item.oldTitle = detail.match(/<h1>([\s\S]*?)<\/h1>/)?.[1]?.replace(/<[^>]+>/g, "") ?? "";
  detail = detail
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(item.title)} · 自学总站</title>`)
    .replace(/<meta name="description" content="[^"]*"\/>/, `<meta name="description" content="${esc(summary(item))}"/>`)
    .replace(/<main class="reading-page [^"]+">/, `<main class="reading-page ${accentByColumn[column]}">`)
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
  for (const item of updates) if (item.oldTitle) html = html.replaceAll(item.oldTitle, item.title);
  await writeFile(file, updateChrome(html), "utf8");
}

const featuredTargets = ["daily/01", "finance/01", "health/01", "papers/01", "management/01"];
let home = await readFile(path.join(site, "index.html"), "utf8");
const featured = featuredTargets.map((target, index) => {
  const item = updates.find((entry) => entry.target === target);
  const [column] = target.split("/");
  return `<a href="/column/${target}" class="today-card ${accentByColumn[column]}"><span>0${index + 1} · ${columnNames[column]}</span><h3>${esc(item.title)}</h3><small class="today-updated-date">本站更新：${date}</small><p>${esc(summary(item))}</p></a>`;
}).join("");
home = home
  .replace(/(<section class="shell directory-header"><p>)[\s\S]*?(<\/p>)/, `$1${dateCn} · 每日更新 ${version}$2`)
  .replace(/资料截止：[^<]+/, `资料截止：${checkedAt}`)
  .replace(/<div class="today-grid">[\s\S]*?<\/div><\/section>/, `<div class="today-grid">${featured}</div></section>`);
const note = `<p class="today-update-note">8月28日完成8篇真实实质更新：每日资讯1篇、金融2篇、健康1篇、论文3篇、管理1篇；TED过去24小时无新增，因此更新0篇。3篇直接通过，5篇最小修订后通过，0篇驳回。<a href="/audit">查看逐篇审计 →</a></p>`;
home = home.includes('class="today-update-note"')
  ? home.replace(/<p class="today-update-note">[\s\S]*?<\/p>/, note)
  : home.replace('<h2 id="today-title">今日必读</h2>', `<h2 id="today-title">今日必读</h2>${note}`);
await writeFile(path.join(site, "index.html"), home, "utf8");

const revisedIds = new Set(["F01", "H01", "P01", "P03", "M01"]);
for (const id of revisedIds) if (!updates.some((item) => item.id === id)) throw new Error(`missing revised item: ${id}`);
const auditArticles = updates.map((item) => ({
  target: item.target, changeType: "updated", changeSummary: changeSummary(item), title: item.title,
  sourceDate: item.sourceDate,
  sourceVerification: { ok: true, checkedAt, sources: item.sources },
}));
const audit = {
  date, sourceCutoff: checkedAt, totalArticles: 110, substantivelyUpdated: updates.length,
  updateRate: Number((updates.length / 110).toFixed(4)), target: "quality-first, no padding", targetMet: true,
  scope: input.scope, tedScan: input.tedScan,
  reviewSummary: { pass: updates.length - revisedIds.size, revisedAndPassed: revisedIds.size, rejected: 0, reworkRounds: 1 },
  articles: auditArticles,
};
const auditText = `${JSON.stringify(audit, null, 2)}\n`;
await writeFile(path.join(root, "data", `update-audit-${date}.json`), auditText, "utf8");
await writeFile(path.join(site, "audit", `update-${date}.json`), auditText, "utf8");

const rows = auditArticles.map((item) => `<li><strong>${item.target}</strong><span>${esc(item.title)}</span><small>${esc(item.changeSummary)}</small></li>`).join("");
const auditPage = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><link rel="stylesheet" href="/assets/index-CVB57ELS.css"/><link rel="stylesheet" href="/assets/daily-highlights.css"/><title>8月28日更新审计 · 自学总站</title></head><body><header class="site-header"><div class="shell header-inner"><a href="/" class="brand"><span class="brand-mark">知</span><span>自学总站</span></a><nav class="main-nav"><a href="/">全部专栏</a><a href="/ski-training">滑雪训练</a><a href="/archive">每日归档</a></nav><div class="live-status"><span></span> 2026.08.28 · 每日更新 ${version}</div></div></header><main class="shell audit-page"><header class="directory-header"><p>${dateCn} · 真实更新审计</p><h1>${updates.length} 篇真实实质更新，按新鲜度与质量发布</h1><p>每日资讯1篇、金融2篇、健康1篇、论文3篇、管理1篇；TED过去24小时无新增，因此更新0篇。3篇直接通过，5篇按事实复核意见最小修订后通过，0篇驳回；没有用旧稿、日期或同义改写补数。</p></header><section class="audit-summary"><h2>质量说明</h2><p>每条审计均对应正文语义变化，包含核准来源、原文日期与适用边界。Spark只负责证据卡格式归一化和查漏，最终事实结论均由Sol复核。</p></section><section class="audit-list"><h2>逐篇变更</h2><ul>${rows}</ul></section></main><footer class="site-footer"><div class="shell footer-inner"><p>自学总站 · 长期自学知识库</p><p>${dateCn} · 每日更新 ${version}</p></div></footer></body></html>`;
await writeFile(path.join(site, "audit", "index.html"), auditPage, "utf8");

let archive = await readFile(path.join(site, "archive", "index.html"), "utf8");
archive = archive.replace(/<article class="archive-entry" data-archive-date="2026-08-28">[\s\S]*?<\/article>/, "");
const archiveEntry = `<article class="archive-entry" data-archive-date="2026-08-28"><div class="archive-date"><strong>2026.08.28</strong><span>每日更新 ${version} · 8篇真实实质更新</span></div><div class="archive-content"><h2>2026年8月28日</h2><p>本批按质量优先更新8篇：3篇直接通过事实复核，5篇最小修订后通过；TED过去24小时无新增，未用旧稿补数。</p><ul><li><span>更新审计</span><a href="/audit">查看8篇逐条审计 →</a></li></ul></div></article>`;
archive = archive.replace('<section class="shell archive-list" aria-label="每日版本">', `<section class="shell archive-list" aria-label="每日版本">${archiveEntry}`);
await writeFile(path.join(site, "archive", "index.html"), archive, "utf8");

const mirrorPath = path.join(site, "mirror-status.json");
const mirror = JSON.parse(await readFile(mirrorPath, "utf8"));
mirror.generatedAt = input.generatedAt;
mirror.update = { date, articles: updates.length, mode: "quality-first", targetMet: true };
await writeFile(mirrorPath, `${JSON.stringify(mirror, null, 2)}\n`, "utf8");

execFileSync(process.execPath, [
  path.join(root, "scripts", "apply-daily-highlights.mjs"),
  "--date", date,
  "--audit", path.join(root, "data", `update-audit-${date}.json`),
  "--baseline", baselinePath,
  "--ledger", ledgerPath,
], { cwd: root, stdio: "inherit" });
execFileSync(process.execPath, [
  path.join(root, "scripts", "apply-article-dates.mjs"),
  "--ledger", ledgerPath,
], { cwd: root, stdio: "inherit" });

console.log(`Prepared ${updates.length}/110 verified substantive updates; 3 PASS and 5 revised-and-passed.`);
