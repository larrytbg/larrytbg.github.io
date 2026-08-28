import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function parseArgs(values) {
  const args = new Map();
  for (let index = 0; index < values.length; index += 2) args.set(values[index], values[index + 1]);
  return args;
}

const args = parseArgs(process.argv.slice(2));
const basePath = args.get("--base");
const sourcePath = args.get("--source");
const draftLogPath = args.get("--draft-log");
const outputPath = args.get("--out");
const turnIds = new Set((args.get("--turns") ?? "").split(",").filter(Boolean));
if (!basePath || !sourcePath || !draftLogPath || !outputPath || turnIds.size !== 2) {
  throw new Error("Usage: node scripts/prepare-2026-08-28-expanded-approved.mjs --base <json> --source <json> --draft-log <jsonl> --turns <id,id> --out <json>");
}

const base = JSON.parse(await readFile(path.resolve(basePath), "utf8"));
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
    if (part.type !== "output_text" || !part.text.trimStart().startsWith("{")) continue;
    const parsed = JSON.parse(part.text);
    if (Array.isArray(parsed.articles)) drafts.push(...parsed.articles);
  }
}

if (base.date !== "2026-08-28" || base.articles?.length !== 8) {
  throw new Error(`expected 8-article base package for 2026-08-28, got ${base.articles?.length ?? 0}`);
}
if (drafts.length !== 7 || new Set(drafts.map((item) => item.id)).size !== 7) {
  throw new Error(`expected 7 unique expansion drafts, got ${drafts.length}`);
}

const candidates = new Map(source.candidates.map((item) => [item.id, item]));
const revisedIds = new Set(["D02", "H03", "M02"]);
const revisions = {
  D02: { title: "美国2025—2035年就业预测：总就业预计增长3.5%，公用事业预计增长9.8%" },
  H03: { title: "急性间质性肾炎的空间图谱：炎症信号与预测相互作用不等于新疗法" },
  M02: { title: "把发射前关键节点拆成门禁：Roman望远镜的阶段闸门管理" },
};

const additions = drafts.map((draft) => {
  const evidence = candidates.get(draft.id);
  if (!evidence || draft.target !== evidence.target || draft.category !== evidence.category) {
    throw new Error(`evidence mapping mismatch: ${draft.id}`);
  }
  const sections = draft.sections.map((section) => ({
    heading: section.heading,
    paragraphs: section.body,
  }));
  const allParagraphs = sections.flatMap((section) => section.paragraphs);
  const interpretation = allParagraphs
    .filter((paragraph) => paragraph.startsWith("本站解释："))
    .map((paragraph) => paragraph.replace(/^本站解释：/, ""));
  const practice = allParagraphs
    .filter((paragraph) => paragraph.startsWith("本站行动："))
    .map((paragraph) => paragraph.replace(/^本站行动：/, ""));
  const boundary = allParagraphs
    .filter((paragraph) => paragraph.startsWith("边界："))
    .map((paragraph) => paragraph.replace(/^边界：/, ""))
    .join(" ");
  if (sections.length < 7 || interpretation.length === 0 || practice.length === 0 || !boundary) {
    throw new Error(`incomplete normalized draft: ${draft.id}`);
  }
  return {
    id: draft.id,
    target: draft.target,
    column: draft.category,
    title: revisions[draft.id]?.title ?? draft.title,
    summary: draft.summary,
    facts: evidence.facts,
    sections,
    interpretation,
    practice,
    boundary,
    sourceDate: evidence.sourceDate,
    sources: [{ name: evidence.sourceTitle, url: evidence.sourceUrl }],
    factReview: revisedIds.has(draft.id) ? "REVISE_PASSED" : "PASS",
  };
});

const articles = [...base.articles, ...additions];
if (articles.length !== 15 || new Set(articles.map((item) => item.target)).size !== 15) {
  throw new Error("merged package must contain 15 unique targets");
}

const output = {
  date: "2026-08-28",
  checkedAt: "2026-08-28 12:18（北京时间）",
  generatedAt: "2026-08-28T04:18:19.000Z",
  scope: { daily: 3, finance: 3, health: 3, papers: 4, management: 2 },
  tedScan: { newOfficialTalksInLast24Hours: 0, updated: 0, decision: "No backfill." },
  articles,
};

await writeFile(path.resolve(outputPath), `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`expanded approved package written: ${articles.length}`);
