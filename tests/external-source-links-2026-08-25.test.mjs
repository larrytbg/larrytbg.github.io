import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const acceptedRestrictedStatuses = new Set([401, 403, 405, 429]);

async function checkUrl(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetch(url, {
          method: "GET",
          redirect: "follow",
          signal: controller.signal,
          headers: { "user-agent": "Mozilla/5.0 self-learning-source-audit/2026-08-25" },
        });
        return { url, status: response.status, finalUrl: response.url };
      } catch (error) {
        if (attempt === 1) return { url, error: String(error?.cause?.code ?? error) };
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  } finally {
    clearTimeout(timeout);
  }
}

test("8月25日审计中的外部来源均可到达且没有404或410", async () => {
  const audit = JSON.parse(await readFile("data/update-audit-2026-08-25.json", "utf8"));
  const urls = [...new Set(audit.articles.flatMap((item) =>
    item.sourceVerification.sources.map((source) => source.url),
  ))];
  assert.ok(urls.length >= 55);
  assert.ok(urls.every((url) => /^https:\/\//.test(url)));

  const failures = [];
  const results = await Promise.allSettled(urls.map(checkUrl));
  for (const result of results) {
    if (result.status === "rejected") {
      failures.push({ error: String(result.reason) });
      continue;
    }
    const { url, status, error } = result.value;
    if (error) {
      failures.push({ url, error });
      continue;
    }
    if (!(status >= 200 && status < 400) && !acceptedRestrictedStatuses.has(status)) {
      failures.push({ url, status });
    }
  }
  assert.deepEqual(failures, []);
  console.log(`external source links reachable: ${urls.length}`);
});
