const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

(async () => {
  const root = path.resolve(__dirname, "..");
  const baseCss = readFileSync(path.join(root, "site", "assets", "index-CVB57ELS.css"), "utf8");
  const css = readFileSync(path.join(root, "site", "assets", "daily-highlights.css"), "utf8");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  });

  try {
    for (const width of [390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${baseCss}\n${css}</style></head><body><main class="shell">
        <div class="today-grid"><a class="today-card is-daily-highlight" data-daily-highlight="new"><span class="daily-highlight-badge">今日新增</span><span>01 · 资讯</span><h3>这是一个用于检查手机宽度的较长今日必读标题</h3><p>摘要文字。</p></a></div>
        <a class="directory-card"><ul><li class="is-primary is-daily-highlight" data-daily-highlight="new"><span>01</span><span class="directory-item-title"><span class="daily-highlight-badge">今日新增</span>这是一个用于检查目录排版的较长标题</span><small class="directory-item-date">本站发布：2026-08-23</small></li></ul></a>
        <article class="article-card is-daily-highlight" data-daily-highlight="updated"><div class="article-order">01</div><div class="article-preview-main"><span class="daily-highlight-badge">今日更新</span><h3>这是一个用于检查专栏目录宽度的较长文章标题，不能挤压或截断</h3><p class="article-preview-summary">摘要文字。</p></div><a class="article-enter"><span>进入全文</span><b>→</b></a></article>
      </main></body></html>`);

      const layout = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        badgeTexts: [...document.querySelectorAll(".daily-highlight-badge")].map((element) => element.textContent),
      }));
      assert.ok(layout.scrollWidth <= layout.innerWidth + 1, `${width}px横向溢出`);
      assert.deepEqual(layout.badgeTexts, ["今日新增", "今日新增", "今日更新"]);
      await page.close();
    }
  } finally {
    await browser.close();
  }

  console.log("daily highlight browser layout passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
