import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

function git(root, args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function gitPaths(root, args) {
  const output = execFileSync("git", args, { cwd: root });
  return output.toString("utf8").split("\0").filter(Boolean).sort();
}

function fingerprint(root, relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!existsSync(absolutePath)) {
    return { path: relativePath.replaceAll("\\", "/"), exists: false, size: 0, sha256: null };
  }
  const content = readFileSync(absolutePath);
  return {
    path: relativePath.replaceAll("\\", "/"),
    exists: true,
    size: statSync(absolutePath).size,
    sha256: createHash("sha256").update(content).digest("hex"),
  };
}

export function captureRepoGuard(root = process.cwd()) {
  const trackedPaths = gitPaths(root, ["ls-files", "-z"]);
  const untrackedPaths = gitPaths(root, ["ls-files", "--others", "--exclude-standard", "-z"]);
  return {
    schemaVersion: 1,
    branch: git(root, ["symbolic-ref", "--short", "HEAD"]),
    head: git(root, ["rev-parse", "HEAD"]),
    indexTree: git(root, ["write-tree"]),
    tracked: trackedPaths.map((item) => fingerprint(root, item)),
    untracked: untrackedPaths.map((item) => fingerprint(root, item)),
  };
}

export function compareRepoGuards(before, after) {
  const changes = [];
  for (const field of ["branch", "head", "indexTree"]) {
    if (before[field] !== after[field]) changes.push(`${field}: ${before[field]} -> ${after[field]}`);
  }
  for (const field of ["tracked", "untracked"]) {
    const left = JSON.stringify(before[field]);
    const right = JSON.stringify(after[field]);
    if (left !== right) changes.push(`${field} files changed`);
  }
  return changes;
}
