import { createHash } from "node:crypto";

const dateLabelPattern = /(?:本站首次发布|本站最后更新|原文发布|首次收录|最后实质更新|来源发布日期)/;

function textContent(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function articleCore(html) {
  const title = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "";
  const deck = html.match(/<p class="reading-deck"[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? "";
  const summary = html.match(/<div class="summary-blueprint"[^>]*>([\s\S]*?)<\/header>/i)?.[1] ?? "";
  const article = html.match(/<article class="long-article"[^>]*>([\s\S]*?)<\/article>/i)?.[1] ?? "";
  return `${title}\n${deck}\n${summary}\n${article}`;
}

export function semanticArticleHash(html) {
  const normalized = articleCore(html)
    .replace(/<span class="daily-highlight-badge">[\s\S]*?<\/span>/gi, "")
    .replace(/\sdata-daily-highlight="(?:new|updated)"/gi, "")
    .replace(/\sis-daily-highlight(?=[\s"])/gi, "")
    .replace(/<div class="reading-meta"[^>]*>[\s\S]*?<\/div>/gi, "")
    .replace(/<!--\s*-->/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return createHash("sha256").update(normalized).digest("hex");
}

export function extractArticleRecord(html, target) {
  const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!titleMatch) throw new Error(`article title not found: ${target}`);
  const sourceBlock = html.match(/<section[^>]*id="sources"[^>]*>[\s\S]*?<\/section>/i)?.[0] ?? "";
  const sourceUrls = [...sourceBlock.matchAll(/href="(https?:\/\/[^"#]+)"/gi)]
    .map((match) => match[1])
    .filter((url, index, list) => list.indexOf(url) === index);
  return {
    target,
    title: textContent(titleMatch[1]),
    semanticHash: semanticArticleHash(html),
    sourceUrls,
  };
}

export function renderDirectoryDate(html, timeline) {
  const value = timeline.updatedOn && timeline.updatedOn !== timeline.publishedOn
    ? `本站更新：${timeline.updatedOn}`
    : `本站发布：${timeline.publishedOn}`;
  return html.replace(
    /(<small class="article-updated-date">)[\s\S]*?(<\/small>)/i,
    `$1${value}$2`,
  );
}

export function renderDetailDates(html, timeline) {
  if (!timeline?.publishedOn) throw new Error("missing site publication date");
  const metaPattern = /(<div class="reading-meta"[^>]*>)([\s\S]*?)(<\/div>)/i;
  if (!metaPattern.test(html)) throw new Error("reading metadata not found");

  return html.replace(metaPattern, (_whole, start, body, end) => {
    const retained = [...body.matchAll(/<span(?:\s[^>]*)?>[\s\S]*?<\/span>/gi)]
      .map((match) => match[0])
      .filter((span) => !dateLabelPattern.test(textContent(span)))
      .join("");
    const dates = [
      `<span>本站首次发布：${timeline.publishedOn}</span>`,
      timeline.updatedOn && timeline.updatedOn !== timeline.publishedOn
        ? `<span>本站最后更新：${timeline.updatedOn}</span>`
        : "",
      timeline.sourcePublishedOn ? `<span>原文发布：${timeline.sourcePublishedOn}</span>` : "",
    ].join("");
    return `${start}${dates}${retained}${end}`;
  });
}
