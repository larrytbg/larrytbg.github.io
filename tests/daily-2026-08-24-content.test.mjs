import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { extractArticleRecord } from "../scripts/lib/article-timeline.mjs";

const updates = [
  ["daily/10", "哈萨克斯坦首届库鲁尔泰选举完成投票", "https://www.election.gov.kz/rus/news/releases/index.php?ID=10571"],
  ["health/10", "美国召回苜蓿芽苗菜", "https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts/everything-sprouts-llc-recalls-alfalfa-sprouts-due-potential-e-coli-and-salmonella-risk"],
  ["papers/10", "热电材料有了更明确的设计规则", "https://doi.org/10.1016/j.mtadv.2026.100896"],
  ["codex/10", "OpenAI暂停部分前沿训练", "https://openai.com/index/pacing-model-development-cyber-capabilities/"],
  ["finance/10", "美加关税谈判破裂", "https://apnews.com/article/857ef76b20a766e370d70176135b678e"],
];

test("8月24日只把五篇逐项核验的新文章计入更新", async () => {
  for (const [target, title, source] of updates) {
    const html = await readFile(`site/column/${target}/index.html`, "utf8");
    assert.match(html, new RegExp(title));
    assert.match(html, new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(html, /data-substantive-update="2026-08-24"/);
  }

  const audit = JSON.parse(await readFile("data/update-audit-2026-08-24.json", "utf8"));
  assert.equal(audit.date, "2026-08-24");
  assert.equal(audit.substantivelyUpdated, 5);
  assert.equal(audit.articles.length, 5);
  assert.ok(audit.articles.every((entry) => entry.changeType === "new"));
  assert.ok(audit.articles.every((entry) => entry.sourceVerification?.ok === true));
});

test("与更新前基线相比恰好只有五篇正文发生语义变化", async () => {
  const baseline = JSON.parse(await readFile("data/article-baseline-2026-08-24.json", "utf8"));
  const changed = [];
  for (const [target, before] of Object.entries(baseline.articles)) {
    const html = await readFile(`site/column/${target}/index.html`, "utf8");
    const after = extractArticleRecord(html, target);
    if (after.semanticHash !== before.semanticHash) changed.push(target);
  }
  assert.deepEqual(changed.sort(), updates.map(([target]) => target).sort());
});

test("受更新专栏仍然各有01到10且每个目录项只出现一次", async () => {
  for (const column of ["daily", "health", "papers", "codex", "finance"]) {
    const html = await readFile(`site/column/${column}/index.html`, "utf8");
    const indexes = [...html.matchAll(new RegExp(`href="/column/${column}/(\\d{2})" class="article-enter"`, "g"))]
      .map((match) => match[1]);
    assert.deepEqual(indexes, ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10"]);
  }
});

test("首页版本信息使用8月24日且文章日期仍由台账单独控制", async () => {
  const home = await readFile("site/index.html", "utf8");
  assert.match(home, /2026年8月24日<!-- --> · <!-- -->每日更新 24/);
  assert.match(home, /资料截止：2026年8月24日 07:45（北京时间）/);
  const todayGrid = home.match(/<div class="today-grid">([\s\S]*?)<\/div><\/section>/)?.[1] ?? "";
  const links = [...todayGrid.matchAll(/href="\/column\/([a-z0-9-]+\/\d{2})"/g)].map((match) => match[1]);
  assert.deepEqual(links, ["finance/10", "daily/10", "health/10", "codex/10", "papers/10"]);
  assert.equal((todayGrid.match(/本站发布：2026-08-24/g) ?? []).length, 5);
});
