import { readFileSync } from "node:fs";
import { captureRepoGuard, compareRepoGuards } from "./repo-guard-lib.mjs";

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const input = arg("--baseline");
if (!input) throw new Error("Usage: node scripts/verify-repo-guard.mjs --baseline <absolute-json-path>");

const before = JSON.parse(readFileSync(input, "utf8"));
const after = captureRepoGuard(process.cwd());
const changes = compareRepoGuards(before, after);
if (changes.length) {
  console.error(`repo guard failed: ${changes.join("; ")}`);
  process.exitCode = 1;
} else {
  console.log("repo guard passed: branch, HEAD, index, tracked and untracked content unchanged");
}
