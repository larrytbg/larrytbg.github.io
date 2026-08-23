import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const highlightCss = readFileSync(path.join(root, "site/assets/daily-highlights.css"), "utf8");
const baseCss = readFileSync(path.join(root, "site/assets/index-CVB57ELS.css"), "utf8");

assert.match(highlightCss, /#3c78a8/i, "高亮左侧提示线必须使用已确认的蓝色");
assert.match(highlightCss, /rgba\(144,\s*197,\s*239,\s*0?\.28\)/i, "高亮背景必须使用浅蓝渐变");
assert.doesNotMatch(highlightCss, /255,\s*218,\s*122|#e5a72d|#8d5400/i, "不得保留旧黄色高亮");
assert.match(baseCss, /\/\* readability-2026-08-23 \*\//, "缺少全站字体放大覆盖块");
assert.match(baseCss, /\.today-card p\{font-size:14px/, "首页摘要应为14px");
assert.match(baseCss, /\.directory-card li\{font-size:15px/, "目录正文应为15px");
assert.match(baseCss, /\.article-preview-summary\{font-size:16px/, "文章摘要应为16px");
assert.match(baseCss, /\.sourced-paragraph p\{font-size:17px/, "文章正文应为17px");
assert.match(baseCss, /\.directory-item-date[^}]*font-size:12px/, "日期文字不得小于12px");
assert.doesNotMatch(
  baseCss.split("/* readability-2026-08-23 */")[1] ?? "",
  /\.directory-header h1|\.column-hero h1|\.reading-hero h1/,
  "本次不得放大主要大标题",
);

console.log("visual style checks passed");
