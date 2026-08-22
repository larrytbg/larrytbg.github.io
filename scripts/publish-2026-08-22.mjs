import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const site = path.join(root, "site");
const today = "2026-08-22";
const todayCn = "2026年8月22日";
const cutoff = "2026年8月22日 09:30（北京时间）";

const sourceUpdates = {
  "codex/01": {
    sourceDate: "2026-08-19",
    sourceName: "OpenAI：Offering zero data retention for frontier models",
    url: "https://openai.com/index/offering-zero-data-retention-for-frontier-models/",
    title: "零数据保留扩大到前沿模型，但只面向符合条件的API客户",
    facts: [
      "OpenAI在8月19日说明，符合条件的API客户可以为前沿模型申请零数据保留。大白话说，这是一种更严格的数据处理方式：请求完成后，服务方不按普通方式保留提示词和输出内容。",
      "公告同时介绍了Private Safety Processing的预览。它把部分安全检测放到受保护环境中运行，目标是在进行滥用检测时尽量减少数据暴露；OpenAI说会在9月发布更完整的技术白皮书。",
      "这不是‘所有ChatGPT聊天都自动不留痕’。适用对象、产品范围和申请资格都有边界，而且公告保留了儿童性虐待材料等法定义务相关例外。"
    ],
    impact: "这条更新与本页原有的Computer History隐私边界直接相关：判断一个功能是否安全，不能只看‘能不能删除’，还要分别问默认是否开启、数据在哪里处理、保存多久、谁有资格使用以及有哪些法律例外。企业使用API时应把这些问题写进数据分类和采购审查，而不是把‘零保留’理解成没有任何风险。",
    limit: "目前主要依据是OpenAI自己的产品公告，Private Safety Processing仍是预览，独立审计、实际适用范围和长期效果还要等待后续白皮书与客户实践。"
  },
  "codex/10": {
    sourceDate: "2026-08-20",
    sourceName: "OpenAI：Introducing AI Futures",
    url: "https://openai.com/index/introducing-ai-futures/",
    title: "OpenAI成立AI Futures讨论长期治理，重点是权力集中与自主系统",
    facts: [
      "OpenAI在8月20日介绍AI Futures团队，称其工作重点包括：能力很强的AI可能带来的权力集中、越来越自主的系统，以及社会如何提前讨论制度选择。",
      "这篇页面不是实验论文，也没有给出已经验证的预测模型。它更接近机构的研究议程：告诉外界接下来准备研究哪些长期问题、希望和哪些群体讨论。",
      "把它放进Codex长任务场景，最实用的提醒是：任务越长、自主性越高，越需要把权限、停止条件、复核点和责任人提前写清，而不是只在最后检查结果。"
    ],
    impact: "普通人不必把‘AI未来’理解成遥远哲学。只要一个代理可以连续调用工具、修改文件或替人执行决定，就已经涉及控制权分配：谁能授权、谁能看见过程、谁能中止、出错后谁负责。本站把这条机构主张转成可执行检查表，但不把它冒充OpenAI已经证明的事实。",
    limit: "AI Futures页面表达的是OpenAI自己的判断和研究方向，不能单独证明未来一定会发生权力集中或自主系统失控。需要继续对照独立研究、监管文件和真实事故记录。"
  },
  "daily/06": {
    sourceDate: "2026-08-20",
    sourceName: "WHO与Africa CDC：向刚果（金）分配埃博拉疫苗",
    url: "https://www.who.int/news/item/20-08-2026-who-and-africa-cdc-welcome-the-allocation-of-ebola-vaccines-to-the-democratic-republic-of-the-congo",
    title: "刚果（金）将获得7万剂埃博拉疫苗，但对邦迪布焦毒株的人体保护仍待确认",
    facts: [
      "WHO与Africa CDC在8月20日宣布，国际疫苗协调机制向刚果（金）分配7万剂埃博拉疫苗。其中2万剂计划用于三期试验，5万剂用于高风险地区的一线工作人员。",
      "公告特别提醒，现有疫苗对邦迪布焦型埃博拉病毒的人体保护效果还不确定。因此，‘已经分配疫苗’不等于‘疫情已经得到控制’，试验和暴露防护必须同时推进。",
      "阅读这类消息要分清三个数字：分配多少、真正运到并接种多少、最终产生多大保护。它们处在不同环节，不能用第一个数字替代后两个结果。"
    ],
    impact: "对普通读者，最重要的不是记住7万这个大数，而是理解公共卫生决策经常要在证据尚不完整时行动。合理做法是同时保留防护措施、透明记录试验结果，并根据新证据调整；不能因为启动接种就忽略隔离、接触者追踪和医护防护。",
    limit: "公告说明的是疫苗分配计划，不是最终接种完成报告，也没有证明对邦迪布焦毒株已经有效。后续要观察到货、入组、三期试验结果和疫情曲线。"
  },
  "finance/09": {
    sourceDate: "2026-08-21",
    sourceName: "欧洲央行：2026年7月消费者预期调查",
    url: "https://www.ecb.europa.eu/press/pr/date/2026/html/ecb.pr260821~a044fdddd9.en.html",
    title: "欧元区消费者短期通胀预期降到2.9%，但收入预期只有1.0%",
    facts: [
      "欧洲央行8月21日公布7月消费者预期调查：未来一年通胀预期中位数从3.0%降到2.9%，未来三年从2.8%降到2.7%，未来五年保持2.4%。这是‘预期’，不是已经实现的通胀率。",
      "同一调查中，家庭未来12个月名义收入增长预期为1.0%，支出增长预期为3.6%。如果两者最终接近现实，很多家庭仍会感觉预算吃紧，因为计划支出的增速明显高于收入预期。",
      "受访者对未来一年经济增长的平均预期为-1.2%，失业率预期为11.2%，按揭贷款利率预期为4.9%。调查覆盖11个欧元区国家、约1.9万名成年人。"
    ],
    impact: "这组数据可以解释为什么‘通胀预期下降’不一定立刻带来轻松感：价格仍可能上涨，只是预计涨得慢一些；如果收入增长更慢，实际购买力仍受挤压。对个人财务，应该分别看收入、必要支出和借款利率，不要只用一个通胀数字决定消费或投资。",
    limit: "调查记录的是受访者预期，不是官方预测，也不是保证会发生的结果。情绪、近期价格体验和新闻都可能影响回答，后续还需与实际通胀、工资和就业数据交叉验证。"
  },
  "papers/09": {
    sourceDate: "2026-08-21",
    sourceName: "Nature News：多项衰老研究可能使用了错误抗体",
    url: "https://www.nature.com/articles/d41586-026-02352-4",
    title: "五十多项衰老研究可能用了错误抗体，说明试剂身份也必须核验",
    facts: [
      "Nature在8月21日报道，五十多项衰老研究可能使用了并不识别目标蛋白的抗体。抗体在实验中像‘带标签的探针’，如果它认错对象，后面的图片、统计和机制解释都可能建立在错误信号上。",
      "这类问题不能只靠增加样本量补救。样本再多，如果测量工具从一开始就认错了对象，结果只会更稳定地重复错误。",
      "对系统综述来说，‘纳入论文很多’也不自动等于证据可靠。审查者还要看关键试剂、货号、验证方法、原始图像以及论文之间是否其实重复依赖同一种有问题的工具。"
    ],
    impact: "普通读者看健康或抗衰老新闻时，可以增加一个简单问题：研究测量的东西真的是它声称的那个东西吗？对实验人员，这意味着在采购和使用抗体时保留货号、批次、阳性与阴性对照，并优先选择经过独立验证的试剂。",
    limit: "本站依据的是Nature新闻报道的公开摘要，没有在本次更新中逐篇复核五十多篇论文。受影响范围、各论文结论是否完全失效，以及后续更正或撤稿情况仍要跟踪原论文和期刊声明。"
  }
};

function updateChrome(html) {
  return html
    .replace(/<div class="live-status"><span><\/span>[\s\S]*?<\/div>/g, '<div class="live-status"><span></span> <!-- -->2026.08.22<!-- --> · <!-- -->每日更新 22</div>')
    .replace(/(<footer class="site-footer">[\s\S]*?<p>)(?:\d{4}年\d{1,2}月\d{1,2}日)([\s\S]*?每日更新(?:<!-- -->)?\s*)\d+(<\/p>)/g, `$1${todayCn}$2 22$3`)
    .replace(/资料截止：2026年8月16日 04:30（北京时间）；未发布新批次的平台采用最近完整资料/g, `资料截止：${cutoff}；未发布新批次的平台采用最近完整资料`);
}

function readHeadHtml(file) {
  const relative = path.relative(root, file).replaceAll("\\", "/");
  try {
    return execFileSync("git", ["show", `HEAD:${relative}`], { cwd: root, encoding: "utf8", maxBuffer: 8 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
}

function sourceSection(item) {
  const facts = item.facts.map((fact) => `<p>${fact}</p>`).join("");
  return `<section id="source-update-${today}" class="source-specific-update" data-source-update="${today}"><p class="section-pattern-label">新增来源事实 · ${today}</p><h2>${item.title}</h2><div class="sourced-paragraph"><h3>原始资料说明了什么</h3>${facts}</div><div class="sourced-paragraph"><h3>这对原文章有什么补充</h3><p>${item.impact}</p></div><div class="sourced-paragraph"><h3>局限与下一步</h3><p>${item.limit}</p></div><div class="source-digest-attribution"><strong>本次新增原始来源</strong><a href="${item.url}" target="_blank" rel="noreferrer">${item.sourceName} · 发布于 ${item.sourceDate} ↗</a></div></section>`;
}

const articleRecords = [];
for (const column of ["codex", "daily", "finance", "financial-literacy", "papers", "health", "philosophy", "logic", "management", "history", "ted"]) {
  for (let n = 1; n <= 10; n += 1) {
    const index = String(n).padStart(2, "0");
    const relative = `site/column/${column}/${index}/index.html`;
    const file = path.join(root, ...relative.split("/"));
    let html = execFileSync("git", ["show", `HEAD:${relative}`], { cwd: root, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
    html = updateChrome(html);
    const key = `${column}/${index}`;
    const item = sourceUpdates[key];
    if (item) {
      html = html.replace('<article class="long-article">', `<article class="long-article">${sourceSection(item)}`);
      html = html.replace(/最后实质更新：(?:<!-- -->)?\d{4}-\d{2}-\d{2}/, `最后实质更新：<!-- -->${today}`);
    }
    await writeFile(file, html, "utf8");
    const title = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() ?? key;
    articleRecords.push({ column, index, title, updated: Boolean(item), source: item ? { name: item.sourceName, url: item.url, date: item.sourceDate } : null });
  }
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
  if (/site[\\/]column[\\/][^\\/]+[\\/]\d\d[\\/]index\.html$/.test(file)) continue;
  const headHtml = readHeadHtml(file);
  let html = updateChrome(headHtml ?? await readFile(file, "utf8"));
  if (file === path.join(site, "index.html")) {
    html = html
      .replace(/2026年8月16日<!-- -->\s*·\s*<!-- -->每日更新 16/g, `${todayCn}<!-- --> · <!-- -->每日更新 22`)
      .replace(/资料截止：2026年8月16日 04:30（北京时间）；未发布新批次的平台采用最近完整资料/g, `资料截止：${cutoff}；未发布新批次的平台采用最近完整资料`);
    if (!html.includes('class="today-update-note"')) {
      html = html.replace('<h2 id="today-title">今日必读</h2>', '<h2 id="today-title">今日必读</h2><p class="today-update-note"></p>');
    }
    html = html.replace(/<p class="today-update-note">[\s\S]*?<\/p>/, '<p class="today-update-note">8月22日新增5条来源核验简报，并把5个原始来源分别补进相关旧文；其余文章未冒充更新。<a href="/briefing/2026-08-22">查看8月22日最新资料5条 →</a></p>');
  }
  if (file === path.join(site, "archive", "index.html")) {
    html = html.replace(/<article class="archive-entry" data-archive-date="2026-08-22">[\s\S]*?<\/article>/, "");
    const entry = '<article class="archive-entry" data-archive-date="2026-08-22"><div class="archive-date"><strong>2026.08.22</strong><span>每日更新 22 · 5篇来源型实质更新＋最新资料5条</span></div><div class="archive-content"><h2>2026年8月22日</h2><p>迁移到新电脑后恢复原GitHub Pages仓库。今天新增5条已核验资料，并把5个原始来源分别补进最相关的旧文。110篇知识文章中真实实质更新5篇，实际更新率4.5%；未用通用模板凑80%。</p><ul><li><span>最新资料</span><a href="/briefing/2026-08-22">查看8月22日最新资料5条 →</a></li><li><span>更新审计</span><a href="/audit">查看真实更新清单 →</a></li></ul></div></article>';
    html = html.replace('<section class="shell archive-list" aria-label="每日版本">', `<section class="shell archive-list" aria-label="每日版本">${entry}`);
  }
  await writeFile(file, html, "utf8");
}

const updated = articleRecords.filter((article) => article.updated);
const rows = updated.map((article) => `<li><strong>${article.column}/${article.index}</strong><span>${article.title}</span><small>新增来源：<a href="${article.source.url}" target="_blank" rel="noreferrer">${article.source.name}（${article.source.date}）</a>；补充事实、影响和局限。</small></li>`).join("");
const auditHtml = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><link rel="stylesheet" href="/assets/index-CVB57ELS.css"/><title>8月22日更新审计 · 自学总站</title><script defer src="https://cloud.umami.is/script.js" data-website-id="b0b06b94-08e9-4d2c-b764-b905e45e3da1"></script></head><body><header class="site-header"><div class="shell header-inner"><a href="/" class="brand"><span class="brand-mark">知</span><span>自学总站</span></a><nav class="main-nav"><a href="/">全部专栏</a><a href="/ski-training">滑雪训练</a><a href="/archive">每日归档</a></nav><div class="live-status"><span></span> 2026.08.22 · 每日更新 22</div></div></header><main class="shell audit-page"><header class="directory-header"><p>${todayCn} · 真实更新审计</p><h1>5 / 110 篇完成来源型实质更新，实际更新率 4.5%</h1><p>未达到80%目标。只统计新增了可核对原始来源、逐篇事实、现实影响和局限的文章；撤回此前通用模板形成的88篇计数。</p></header><section class="audit-summary"><h2>质量与工具说明</h2><p>新电脑上的本地模型服务不可用，本地模型实际处理0篇；本次由Codex检索、写作和复核。没有为了更新率批量修改来源日期或套用通用文字。</p><p>另有一页5条最新资料简报。它是新增页面，不计入110篇知识文章的更新率分母。</p></section><section class="audit-list"><h2>逐篇真实变更</h2><ul>${rows}</ul></section></main><footer class="site-footer"><div class="shell footer-inner"><p>自学总站 · 长期自学知识库</p><p>${todayCn} · 每日更新 22</p></div></footer></body></html>`;
await mkdir(path.join(site, "audit"), { recursive: true });
await writeFile(path.join(site, "audit", "index.html"), auditHtml, "utf8");

const manifest = { publishedDate: today, sourceCutoff: cutoff, totalArticles: 110, substantivelyUpdated: updated.length, updateRate: updated.length / 110, targetMet: false, target: 0.8, localModel: { available: false, used: 0, reason: "127.0.0.1:1234 refused connection; no local runner detected" }, datePolicy: "source publication dates unchanged; site substantive update date recorded separately", articles: updated };
await mkdir(path.join(root, "data"), { recursive: true });
await writeFile(path.join(root, "data", `update-audit-${today}.json`), JSON.stringify(manifest, null, 2), "utf8");
await writeFile(path.join(site, "audit", `update-${today}.json`), JSON.stringify(manifest, null, 2), "utf8");

const mirrorStatusPath = path.join(site, "mirror-status.json");
const mirrorStatus = JSON.parse(await readFile(mirrorStatusPath, "utf8"));
mirrorStatus.generatedAt = new Date().toISOString();
mirrorStatus.source = "GitHub Pages repository restored on migrated computer";
mirrorStatus.pages = htmlFiles.length;
mirrorStatus.update = { date: today, articles: updated.length, rate: "4.5%", targetMet: false };
await writeFile(mirrorStatusPath, JSON.stringify(mirrorStatus, null, 2), "utf8");

console.log(`Updated ${updated.length}/110 articles (4.5%); target 80% not met and not claimed.`);
