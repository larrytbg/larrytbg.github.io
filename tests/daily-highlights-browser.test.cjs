const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

(async () => {
  const root = path.resolve(__dirname, "..");
  const css = readFileSync(path.join(root, "site", "assets", "daily-highlights.css"), "utf8");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  });

  try {
    for (const width of [390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
        * { box-sizing: border-box; }
        body { margin: 0; font-family: sans-serif; }
        main { max-width: 100%; padding: 12px; }
        article { max-width: 100%; padding: 16px; }
        h3 { overflow-wrap: anywhere; }
        ${css}
      </style></head><body><main><article class="article-card is-daily-highlight" data-daily-highlight="updated"><span class="daily-highlight-badge">今日更新</span><h3>这是一个用于检查手机宽度的较长文章标题，不能挤压或截断</h3></article></main></body></html>`);

      const layout = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        badgeText: document.querySelector(".daily-highlight-badge")?.textContent,
      }));
      assert.ok(layout.scrollWidth <= layout.innerWidth + 1, `${width}px横向溢出`);
      assert.equal(layout.badgeText, "今日更新");
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
