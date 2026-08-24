import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { captureRepoGuard } from "./repo-guard-lib.mjs";

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const output = arg("--out");
if (!output) throw new Error("Usage: node scripts/capture-repo-guard.mjs --out <absolute-json-path>");
if (!path.isAbsolute(output)) throw new Error("Guard output must use an absolute path outside the repository");

const snapshot = { ...captureRepoGuard(process.cwd()), capturedAt: new Date().toISOString() };
mkdirSync(path.dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
console.log(`repo guard captured: ${snapshot.tracked.length} tracked, ${snapshot.untracked.length} untracked`);
