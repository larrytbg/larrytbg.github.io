import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const cacheRoot = "D:\\CodexCache\\article-baseline-tests";
await mkdir(cacheRoot, { recursive: true });
const tempSite = await mkdtemp(path.join(cacheRoot, "site-"));
try {
  const detailPath = path.join(tempSite, "column", "daily", "01");
  await mkdir(detailPath, { recursive: true });
  await writeFile(
    path.join(detailPath, "index.html"),
    '<html><main class="reading-page"><header class="reading-hero"><h1>基线文章</h1></header><article class="long-article"><p>基线事实</p><section id="sources"><a href="https://example.com/source">来源</a></section></article></main></html>',
    "utf8",
  );
  const root = path.resolve(import.meta.dirname, "..");
  const output = path.join(tempSite, "baseline.json");
  const cli = spawnSync(process.execPath, [
    path.join(root, "scripts", "capture-article-baseline.mjs"),
    "--site", tempSite,
    "--date", "2026-08-23",
    "--out", output,
    "--expected", "1",
  ], { encoding: "utf8" });
  assert.equal(cli.status, 0, `${cli.stdout}${cli.stderr}`);
  assert.match(cli.stdout, /article baseline captured: 1/);
  const baseline = JSON.parse(await readFile(output, "utf8"));
  assert.equal(baseline.capturedOn, "2026-08-23");
  assert.equal(baseline.articles["daily/01"].title, "基线文章");
  assert.match(baseline.articles["daily/01"].semanticHash, /^[a-f0-9]{64}$/);
  assert.deepEqual(baseline.articles["daily/01"].sourceUrls, ["https://example.com/source"]);
} finally {
  await rm(tempSite, { recursive: true, force: true });
}

console.log("article baseline checks passed");
