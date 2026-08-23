import { access, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  applyHighlightsToColumn,
  applyHighlightsToHome,
  normalizeHighlightEntries,
} from "./lib/daily-highlights.mjs";

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
const auditPath = path.resolve(args.audit ?? path.join(root, "data", `update-audit-${args.date}.json`));

await access(auditPath).catch(() => {
  throw new Error(`audit file not found: ${auditPath}`);
});

const audit = JSON.parse(await readFile(auditPath, "utf8"));
const date = args.date ?? audit.date;
if (args.date && audit.date && args.date !== audit.date) {
  throw new Error(`audit date mismatch: expected ${args.date}, got ${audit.date}`);
}
const entries = normalizeHighlightEntries({ ...audit, date });

const stylesheet = '<link rel="stylesheet" href="/assets/daily-highlights.css"/>';
const ensureStylesheet = (html) => (html.includes(stylesheet) ? html : html.replace("</head>", `${stylesheet}</head>`));

const homePath = path.join(site, "index.html");
const home = await readFile(homePath, "utf8");
await writeFile(homePath, ensureStylesheet(applyHighlightsToHome(home, entries)), "utf8");

const columnsRoot = path.join(site, "column");
const columns = (await readdir(columnsRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

for (const column of columns) {
  const columnPath = path.join(columnsRoot, column, "index.html");
  const html = await readFile(columnPath, "utf8");
  await writeFile(columnPath, ensureStylesheet(applyHighlightsToColumn(html, column, entries)), "utf8");
}

const counts = entries.reduce(
  (result, entry) => ({ ...result, [entry.changeType]: result[entry.changeType] + 1 }),
  { new: 0, updated: 0 },
);
console.log(`daily highlights applied: ${entries.length} (new ${counts.new}, updated ${counts.updated})`);
