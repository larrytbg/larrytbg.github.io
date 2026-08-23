import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { extractArticleRecord } from "./lib/article-timeline.mjs";

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
if (!/^\d{4}-\d{2}-\d{2}$/.test(args.date ?? "")) throw new Error("valid --date is required");
const root = path.resolve(import.meta.dirname, "..");
const site = path.resolve(args.site ?? path.join(root, "site"));
const output = path.resolve(args.out ?? path.join(root, "data", "article-baseline.json"));
const expected = Number.parseInt(args.expected ?? "110", 10);
const articles = {};
const columnsRoot = path.join(site, "column");

for (const columnEntry of await readdir(columnsRoot, { withFileTypes: true })) {
  if (!columnEntry.isDirectory()) continue;
  const column = columnEntry.name;
  const columnPath = path.join(columnsRoot, column);
  for (const articleEntry of await readdir(columnPath, { withFileTypes: true })) {
    if (!articleEntry.isDirectory() || !/^\d{2}$/.test(articleEntry.name)) continue;
    const target = `${column}/${articleEntry.name}`;
    const html = await readFile(path.join(columnPath, articleEntry.name, "index.html"), "utf8");
    const record = extractArticleRecord(html, target);
    articles[target] = {
      title: record.title,
      semanticHash: record.semanticHash,
      sourceUrls: record.sourceUrls,
    };
  }
}

if (Object.keys(articles).length !== expected) {
  throw new Error(`expected ${expected} baseline articles, got ${Object.keys(articles).length}`);
}

await writeFile(output, `${JSON.stringify({ capturedOn: args.date, articles }, null, 2)}\n`, "utf8");
console.log(`article baseline captured: ${Object.keys(articles).length}`);
