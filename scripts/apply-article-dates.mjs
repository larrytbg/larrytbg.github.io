import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  applyTimelineToColumn,
  applyTimelineToHome,
  extractArticleRecord,
  renderDetailDates,
} from "./lib/article-timeline.mjs";

function parseArgs(values) {
  const args = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) continue;
    const next = values[index + 1];
    if (!next || next.startsWith("--")) throw new Error(`missing value for ${value}`);
    args[value.slice(2)] = next;
    index += 1;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const root = path.resolve(import.meta.dirname, "..");
const site = path.resolve(args.site ?? path.join(root, "site"));
const ledgerPath = path.resolve(args.ledger ?? path.join(root, "data", "article-date-ledger.json"));
const ledger = JSON.parse(await readFile(ledgerPath, "utf8"));
const timelines = ledger?.articles;
if (!timelines || typeof timelines !== "object") throw new Error("invalid article date ledger");

const pendingWrites = new Map();
const columns = new Set();

for (const [target, timeline] of Object.entries(timelines)) {
  if (!/^[a-z0-9-]+\/\d{2}$/.test(target)) throw new Error(`invalid timeline target: ${target}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(timeline.publishedOn ?? "")) {
    throw new Error(`missing site publication date: ${target}`);
  }
  const [column, index] = target.split("/");
  columns.add(column);
  const detailPath = path.join(site, "column", column, index, "index.html");
  const detail = await readFile(detailPath, "utf8");
  const record = extractArticleRecord(detail, target);
  if (record.title !== timeline.title) {
    throw new Error(`timeline title mismatch: ${target}`);
  }
  pendingWrites.set(detailPath, renderDetailDates(detail, timeline));
}

const homePath = path.join(site, "index.html");
const home = await readFile(homePath, "utf8");
pendingWrites.set(homePath, applyTimelineToHome(home, timelines));

for (const column of columns) {
  const columnPath = path.join(site, "column", column, "index.html");
  const html = await readFile(columnPath, "utf8");
  pendingWrites.set(columnPath, applyTimelineToColumn(html, column, timelines));
}

for (const [file, html] of pendingWrites) {
  await writeFile(file, html, "utf8");
}

console.log(`article dates applied: ${Object.keys(timelines).length}`);
