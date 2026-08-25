function normalizedLines(text) {
  return text.replace(/\r\n/g, "\n").trim();
}

function numberedBlocks(text) {
  const input = normalizedLines(text);
  const starts = [...input.matchAll(/^(\d+)\.\s*(?:`([^`]+)`\s+—[^\n]*)?$/gm)];
  return starts.map((match, index) => ({
    number: Number(match[1]),
    heading: match[0],
    body: input.slice(match.index, starts[index + 1]?.index ?? input.length).trim(),
  }));
}

export function parseDraftPackage(text) {
  return numberedBlocks(text).map(({ body }) => {
    const target = body.match(/^-\s*target[：:]\s*([^\s]+)\s*$/m)?.[1];
    const title = body.match(/^-\s*标题[：:]\s*(.+?)\s*$/m)?.[1];
    const facts = body.match(/^-\s*事实段[：:]\s*(.+?)\s*$/m)?.[1];
    const boundary = body.match(/^-\s*解释\/边界段[：:]\s*(.+?)\s*$/m)?.[1];
    const changeSummary = body.match(/^-\s*changeSummary[：:]\s*(.+?)\s*$/m)?.[1];
    if (!target || !title || !facts || !boundary || !changeSummary) {
      throw new Error(`invalid draft block: ${body.slice(0, 80)}`);
    }
    return { target, title, facts, boundary, changeSummary };
  });
}

export function parseFactReview(text) {
  return numberedBlocks(text)
    .filter(({ heading }) => /`[^`]+`\s+—\s+\*\*(?:PASS|REVISE|REJECT)\*\*/.test(heading))
    .map(({ heading, body }) => {
      const [, target, status] = heading.match(/`([^`]+)`\s+—\s+\*\*(PASS|REVISE|REJECT)\*\*/);
      const approved = body.match(/最终批准正文[：:]\s*([\s\S]*?)\n来源与日期[：:]/)?.[1]?.trim();
      const facts = approved?.match(/^事实[—-]{1,2}([\s\S]*?)(?=解释(?:\/边界|与边界)?[—-]{1,2})/)?.[1]?.trim();
      const boundary = approved?.match(/解释(?:\/边界|与边界)?[—-]{1,2}([\s\S]*)$/)?.[1]?.trim();
      const sourceLine = body.match(/^来源与日期[：:]\s*(.+?)\s*$/m)?.[1];
      const sources = [...(sourceLine ?? "").matchAll(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g)]
        .map((match) => ({ name: match[1], url: match[2] }));
      const sourceDate = (sourceLine ?? "")
        .replace(/\[[^\]]+\]\(https?:\/\/[^)]+\)/g, "")
        .replace(/^[、；;，,\s]+|[。\s]+$/g, "") || "原文日期未标注";
      const ok = /sourceVerification\.ok[：:]\s*true/.test(heading);
      if (!facts || !boundary || sources.length === 0) {
        throw new Error(`invalid fact review block for ${target}`);
      }
      return {
        target,
        status,
        facts,
        boundary,
        sources,
        sourceDate,
        sourceVerification: { ok },
      };
    });
}

function assertUnique(items, kind) {
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item.target)) throw new Error(`duplicate ${kind} target ${item.target}`);
    seen.add(item.target);
  }
}

export function articleLedgerEntries(ledger) {
  if (Array.isArray(ledger?.articles)) return ledger.articles.map((item) => [item.target, item]);
  if (ledger?.articles && typeof ledger.articles === "object") return Object.entries(ledger.articles);
  throw new Error("article ledger must contain an articles array or object map");
}

export function applySourceOverrides(updates, overrides) {
  return updates.map((item) => ({
    ...item,
    sources: item.sources.map((source) => ({
      ...source,
      url: overrides.get(source.url) ?? source.url,
    })),
  }));
}

export function buildApprovedUpdates(drafts, reviews, { expected = 55 } = {}) {
  assertUnique(drafts, "draft");
  assertUnique(reviews, "review");
  if (drafts.length !== expected || reviews.length !== expected) {
    throw new Error(`expected ${expected} drafts and reviews, got ${drafts.length} and ${reviews.length}`);
  }
  const draftByTarget = new Map(drafts.map((item) => [item.target, item]));
  return reviews.map((review) => {
    const draft = draftByTarget.get(review.target);
    if (!draft) throw new Error(`missing draft for ${review.target}`);
    if (review.status === "REJECT" || review.sourceVerification?.ok !== true) {
      throw new Error(`source verification failed for ${review.target}`);
    }
    return { ...draft, ...review, title: draft.title, changeSummary: draft.changeSummary };
  });
}
