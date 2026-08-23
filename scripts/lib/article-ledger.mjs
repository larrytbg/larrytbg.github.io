import { execFileSync } from "node:child_process";

function decodeText(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function titleFromHtml(html) {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return match ? decodeText(match[1]) : null;
}

export function findTitleFirstSeen({ repo, file, title }) {
  const output = execFileSync(
    "git",
    ["log", "--all", "--reverse", "--format=%H%x09%ad", "--date=format:%Y-%m-%d", "--", file],
    { cwd: repo, encoding: "utf8" },
  ).trim();
  for (const line of output.split(/\r?\n/).filter(Boolean)) {
    const [commit, date] = line.split("\t");
    let historic;
    try {
      historic = execFileSync("git", ["show", `${commit}:${file.replaceAll("\\", "/")}`], {
        cwd: repo,
        encoding: "utf8",
        maxBuffer: 20 * 1024 * 1024,
      });
    } catch {
      continue;
    }
    if (titleFromHtml(historic) === title) return { commit, date };
  }
  throw new Error(`current title not found in git history: ${file}`);
}

export function extractSourcePublishedOn(html) {
  const plain = decodeText(html);
  const match = plain.match(/(?:原文发布|来源发布日期)\s*[：:]\s*(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}
