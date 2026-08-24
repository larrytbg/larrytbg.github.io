import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const root = path.join("D:\\CodexCache\\self-learning-orchestration-tests", randomUUID());
const repo = path.join(root, "repo");
const baseline = path.join(root, "guard.json");
const project = process.cwd();

function git(args) {
  execFileSync("git", args, { cwd: repo, stdio: "pipe" });
}

function run(script, args = []) {
  return spawnSync(process.execPath, [path.join(project, script), ...args], {
    cwd: repo,
    encoding: "utf8",
  });
}

try {
  mkdirSync(repo, { recursive: true });
  git(["init", "-b", "main"]);
  git(["config", "user.name", "Repo Guard Test"]);
  git(["config", "user.email", "repo-guard@example.invalid"]);
  writeFileSync(path.join(repo, "tracked.txt"), "one\n", "utf8");
  git(["add", "tracked.txt"]);
  git(["commit", "-m", "baseline"]);

  assert.equal(run("scripts/capture-repo-guard.mjs", ["--out", baseline]).status, 0);
  assert.equal(run("scripts/verify-repo-guard.mjs", ["--baseline", baseline]).status, 0);

  writeFileSync(path.join(repo, "tracked.txt"), "two\n", "utf8");
  assert.equal(run("scripts/verify-repo-guard.mjs", ["--baseline", baseline]).status, 1,
    "tracked content rewrite must fail even when git status category remains modified");

  writeFileSync(path.join(repo, "tracked.txt"), "one\n", "utf8");
  writeFileSync(path.join(repo, "new.txt"), "new\n", "utf8");
  assert.equal(run("scripts/verify-repo-guard.mjs", ["--baseline", baseline]).status, 1,
    "new untracked file must fail");

  assert.equal(run("scripts/capture-repo-guard.mjs", ["--out", baseline]).status, 0);
  writeFileSync(path.join(repo, "new.txt"), "changed\n", "utf8");
  assert.equal(run("scripts/verify-repo-guard.mjs", ["--baseline", baseline]).status, 1,
    "rewriting an already-untracked file must fail");

  console.log("repo guard tests passed");
} finally {
  rmSync(root, { recursive: true, force: true });
}
