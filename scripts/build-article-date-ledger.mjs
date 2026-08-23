import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { extractArticleRecord } from "./lib/article-timeline.mjs";
import { extractSourcePublishedOn, findTitleFirstSeen } from "./lib/article-ledger.mjs";

function parseArgs(values) {
  const args = {};
  for (let index = 0; index < values.length; index += 1) {
    if (!values[index].startsWith("--")) continue;
    args[values[index].slice(2)] = values[index + 1];
    index += 1;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const repo = path.resolve(import.meta.dirname, "..");
const site = path.resolve(args.site ?? path.join(repo, "site"));
const output = path.resolve(args.out ?? path.join(repo, "data", "article-date-ledger.json"));
const articles = {};
const columnsRoot = path.join(site, "column");

for (const columnEntry of await readdir(columnsRoot, { withFileTypes: true })) {
  if (!columnEntry.isDirectory()) continue;
  const column = columnEntry.name;
  const columnPath = path.join(columnsRoot, column);
  for (const articleEntry of await readdir(columnPath, { withFileTypes: true })) {
    if (!articleEntry.isDirectory() || !/^\d{2}$/.test(articleEntry.name)) continue;
    const target = `${column}/${articleEntry.name}`;
    const filePath = path.join(columnPath, articleEntry.name, "index.html");
    const html = await readFile(filePath, "utf8");
    const record = extractArticleRecord(html, target);
    const relativeFile = path.relative(repo, filePath).replaceAll("\\", "/");
    const firstSeen = findTitleFirstSeen({ repo, file: relativeFile, title: record.title });
    articles[target] = {
      title: record.title,
      publishedOn: firstSeen.date,
      updatedOn: null,
      sourcePublishedOn: extractSourcePublishedOn(html),
      evidence: "git-current-title-first-seen",
      commit: firstSeen.commit,
    };
  }
}

if (Object.keys(articles).length !== 110) {
  throw new Error(`expected 110 article entries, got ${Object.keys(articles).length}`);
}

await writeFile(output, `${JSON.stringify({ version: 1, articles }, null, 2)}\n`, "utf8");
console.log(`article date ledger written: ${Object.keys(articles).length}`);
