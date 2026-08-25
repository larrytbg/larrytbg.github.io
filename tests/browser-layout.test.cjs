const assert = require("node:assert/strict");
const { chromium } = require("playwright");

const updatedColumns = [
  "codex", "daily", "finance", "financial-literacy", "health", "history",
  "logic", "management", "papers", "philosophy", "ted",
];
const routes = [
  "/", "/audit/", "/archive/", "/briefing/2026-08-22/",
  ...updatedColumns.flatMap((column) =>
    ["01", "02", "03", "04", "05"].map((index) => `/column/${column}/${index}/`),
  ),
];

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" });
  try {
    for (const width of [390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.route("https://cloud.umami.is/**", (route) => route.abort());
      for (const route of routes) {
        const response = await page.goto(`http://127.0.0.1:4173${route}`, { waitUntil: "domcontentloaded" });
        assert.equal(response?.status(), 200, `${route} HTTP状态异常`);
        const layout = await page.evaluate(() => {
          const overflowing = [...document.querySelectorAll("body *")].filter((element) => {
            const style = getComputedStyle(element);
            const box = element.getBoundingClientRect();
            return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0
              && (box.left < -1 || box.right > innerWidth + 1);
          }).slice(0, 5).map((element) => `${element.tagName}.${element.className}`);
          return { innerWidth, scrollWidth: document.documentElement.scrollWidth, overflowing };
        });
        assert.ok(layout.scrollWidth <= layout.innerWidth + 1, `${width}px ${route} 横向溢出 ${JSON.stringify(layout)}`);
        assert.deepEqual(layout.overflowing, [], `${width}px ${route} 元素越界`);
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
  console.log(`browser layout ok: ${routes.length} routes at 390px and 1440px`);
})();
