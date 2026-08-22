import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const site = path.join(root, "site");

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else if (entry.name.endsWith(".html")) files.push(full);
  }
  return files;
}

const pages = await walk(site);
const broken = [];
let checked = 0;
for (const page of pages) {
  const html = await readFile(page, "utf8");
  for (const match of html.matchAll(/href="(\/[^"#?]*)(?:[?#][^"]*)?"/g)) {
    const pathname = decodeURIComponent(match[1]);
    const target = path.extname(pathname)
      ? path.join(site, pathname.slice(1))
      : path.join(site, pathname.slice(1), "index.html");
    checked += 1;
    const exists = await access(target).then(() => true, () => false);
    if (!exists) broken.push(`${path.relative(site, page)} -> ${pathname}`);
  }
}

assert.deepEqual(broken, [], `发现内部断链：\n${broken.join("\n")}`);
console.log(`internal links ok: ${checked} checked across ${pages.length} pages`);
