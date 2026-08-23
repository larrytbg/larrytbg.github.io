const targetPattern = /^[a-z0-9-]+\/\d{2}$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeHighlightEntries(audit) {
  if (!datePattern.test(audit?.date ?? "")) throw new Error("invalid audit date");
  if (!Array.isArray(audit.articles)) throw new Error("articles must be an array");

  const seen = new Set();
  return audit.articles.map((article) => {
    const target = article?.target ?? `${article?.column}/${article?.index}`;
    if (!targetPattern.test(target)) throw new Error(`invalid target: ${target}`);
    if (!['new', 'updated'].includes(article.changeType)) throw new Error(`invalid changeType: ${target}`);
    if (!article.changeSummary?.trim()) throw new Error(`missing changeSummary: ${target}`);
    if (article.sourceVerification?.ok !== true) throw new Error(`source verification failed: ${target}`);
    if (seen.has(target)) throw new Error(`duplicate target: ${target}`);
    seen.add(target);

    return {
      target,
      changeType: article.changeType,
      changeSummary: article.changeSummary.trim(),
    };
  });
}

export function clearHighlightMarkup(input) {
  return input
    .replace(/\sdata-daily-highlight="(?:new|updated)"/g, "")
    .replace(/\sis-daily-highlight(?=[\s"])/g, "")
    .replace(/<span class="daily-highlight-badge">(?:今日新增|今日更新)<\/span>/g, "");
}

function badge(type) {
  return `<span class="daily-highlight-badge">${type === "new" ? "今日新增" : "今日更新"}</span>`;
}

export function applyHighlightsToHome(input, entries) {
  let html = clearHighlightMarkup(input);

  for (const entry of entries) {
    const [column, index] = entry.target.split("/");
    let foundDirectoryItem = false;
    const directoryPattern = new RegExp(`(<a href="/column/${column}" class="directory-card[^>]*>[\\s\\S]*?<ul>)([\\s\\S]*?)(</ul>[\\s\\S]*?</a>)`);
    html = html.replace(directoryPattern, (whole, start, list, end) => {
      const itemPattern = new RegExp(`<li class="([^"]*)"><span>${index}</span><span class="directory-item-title">`);
      const markedList = list.replace(
        itemPattern,
        `<li class="$1 is-daily-highlight" data-daily-highlight="${entry.changeType}"><span>${index}</span><span class="directory-item-title">${badge(entry.changeType)}`,
      );
      foundDirectoryItem = markedList !== list;
      return `${start}${markedList}${end}`;
    });
    if (!foundDirectoryItem) throw new Error(`highlight target not found on home: ${entry.target}`);

    const todayPattern = new RegExp(`<a href="/column/${column}/${index}" class="([^"]*today-card[^"]*)">`);
    html = html.replace(
      todayPattern,
      `<a href="/column/${column}/${index}" class="$1 is-daily-highlight" data-daily-highlight="${entry.changeType}">${badge(entry.changeType)}`,
    );
  }

  return html;
}

export function applyHighlightsToColumn(input, column, entries) {
  let html = clearHighlightMarkup(input);

  for (const entry of entries.filter(({ target }) => target.startsWith(`${column}/`))) {
    const [, index] = entry.target.split("/");
    const href = `href="/column/${column}/${index}"`;
    let foundArticle = false;
    html = html.replace(/<article class="[^"]*article-card[^"]*">[\s\S]*?<\/article>/g, (article) => {
      if (!article.includes(href)) return article;
      const markedArticle = article.replace(
        /^<article class="([^"]*)">/,
        `<article class="$1 is-daily-highlight" data-daily-highlight="${entry.changeType}">`,
      ).replace(
        '<div class="article-preview-main">',
        `<div class="article-preview-main">${badge(entry.changeType)}`,
      );
      foundArticle = markedArticle !== article && markedArticle.includes(badge(entry.changeType));
      return markedArticle;
    });
    if (!foundArticle) throw new Error(`highlight target not found in column ${column}: ${entry.target}`);
  }

  return html;
}
