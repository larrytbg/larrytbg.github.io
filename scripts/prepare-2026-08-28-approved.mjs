import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function parseArgs(values) {
  const args = new Map();
  for (let index = 0; index < values.length; index += 2) args.set(values[index], values[index + 1]);
  return args;
}

const args = parseArgs(process.argv.slice(2));
const sourcePath = args.get("--source");
const draftLogPath = args.get("--draft-log");
const outputPath = args.get("--out");
const turnIds = new Set((args.get("--turns") ?? "").split(",").filter(Boolean));
if (!sourcePath || !draftLogPath || !outputPath || turnIds.size !== 2) {
  throw new Error("Usage: node scripts/prepare-2026-08-28-approved.mjs --source <json> --draft-log <jsonl> --turns <id,id> --out <json>");
}

const source = JSON.parse(await readFile(path.resolve(sourcePath), "utf8"));
const drafts = [];
for (const line of (await readFile(path.resolve(draftLogPath), "utf8")).split(/\r?\n/)) {
  if (!line) continue;
  const event = JSON.parse(line);
  const payload = event.payload;
  if (event.type !== "response_item" || payload?.type !== "message" || payload.role !== "assistant") continue;
  const turnId = payload.internal_chat_message_metadata_passthrough?.turn_id;
  if (!turnIds.has(turnId)) continue;
  for (const part of payload.content ?? []) {
    if (part.type !== "output_text" || !part.text.trimStart().startsWith("[")) continue;
    drafts.push(...JSON.parse(part.text));
  }
}

const targets = {
  D01: "daily/01", F01: "finance/01", F02: "finance/02", H01: "health/01",
  P01: "papers/01", P02: "papers/02", P03: "papers/03", M01: "management/01",
};
const revisedIds = new Set(["F01", "H01", "P01", "P03", "M01"]);
const revisions = {
  F01: { title: "美国2023—2025年被裁劳动者：长期任职者重新就业率不能代表全部740万人" },
  H01: { title: "WHO在韩国设新监管培训中心：加强药品与疫苗监管人才和体系能力" },
  P01: { title: "量子发射体做神经网络激活函数：低光强阈值仍停留在数值验证" },
  P03: { sourceName: "Tidal tomography reveals a thermal anomaly beneath Mars’s crustal dichotomy" },
  M01: { title: "改革为什么常卡在执行：可信机构、沟通参与与过渡缓冲很关键" },
};

function replaceP01(value) {
  return value
    .replaceAll("作者估计量子激活可在nW/平方微米量级运行，阈值比常规材料低约7个数量级。", "论文分析显示，该量子激活的工作光强为nW/平方微米量级，较常规光学材料的非线性阈值低约7个数量级。")
    .replaceAll("来源事实逐条解读：功耗估算与阈值比较", "来源事实逐条解读：工作光强与阈值比较")
    .replaceAll("这里的关键词是“估计”。它可用于描述作者报告的架构预期，不等于实物设备在相同条件下已经测得该功耗；“低约7个数量级”也必须保留比较对象为常规材料。", "该数值来自论文分析，不是实物设备测得的总功耗；nW/平方微米是光强单位，“低约7个数量级”的比较对象是常规光学材料的非线性阈值。")
    .replaceAll("看到功耗数字时", "看到光强或功率数字时");
}

if (drafts.length !== 8 || new Set(drafts.map((item) => item.id)).size !== 8) {
  throw new Error(`expected 8 unique drafts, got ${drafts.length}`);
}

const candidates = new Map(source.candidates.map((item) => [item.id, item]));
const articles = drafts.map((draft) => {
  const evidence = candidates.get(draft.id);
  if (!evidence || !targets[draft.id]) throw new Error(`unmapped draft: ${draft.id}`);
  let normalized = draft;
  if (draft.id === "P01") normalized = JSON.parse(replaceP01(JSON.stringify(draft)));
  const revision = revisions[draft.id] ?? {};
  const sections = normalized.sections.map((section) => ({
    heading: section.heading,
    paragraphs: section.paragraphs,
  }));
  const interpretation = sections
    .flatMap((section) => section.paragraphs)
    .filter((paragraph) => paragraph.startsWith("本站解释：") || paragraph.startsWith("本站例子："))
    .map((paragraph) => paragraph.replace(/^本站(?:解释|例子)：/, ""));
  return {
    id: draft.id,
    target: targets[draft.id],
    column: targets[draft.id].split("/")[0],
    title: revision.title ?? normalized.title,
    summary: normalized.summary,
    facts: evidence.facts,
    sections,
    interpretation,
    practice: normalized.actions,
    boundary: normalized.boundary,
    sourceDate: evidence.sourceDate,
    sources: [{
      name: revision.sourceName ?? evidence.sourceTitle,
      url: evidence.sourceUrl,
    }],
    factReview: revisedIds.has(draft.id) ? "REVISE_PASSED" : "PASS",
  };
});

const output = {
  date: "2026-08-28",
  checkedAt: "2026-08-28 02:32（北京时间）",
  generatedAt: "2026-08-27T18:32:00.000Z",
  scope: { daily: 1, finance: 2, health: 1, papers: 3, management: 1 },
  tedScan: { newOfficialTalksInLast24Hours: 0, updated: 0, decision: "No backfill." },
  articles,
};
await writeFile(path.resolve(outputPath), `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`approved package written: ${articles.length}`);
