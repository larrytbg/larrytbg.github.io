import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const source = new URL(
  process.env.SOURCE_SITE ??
    "https://larry-self-learning-hub.larrytbg16.chatgpt.site/",
);
const output = path.resolve(process.env.OUTPUT_DIR ?? "_site");

const pageQueue = ["/"];
const visitedPages = new Set();
const assetQueue = new Set(["/favicon.svg", "/og.png"]);

function localPagePath(pathname) {
  const clean = decodeURIComponent(pathname).replace(/^\/+|\/+$/g, "");
  return clean ? path.join(output, clean, "index.html") : path.join(output, "index.html");
}

function localAssetPath(pathname) {
  return path.join(output, ...decodeURIComponent(pathname).split("/").filter(Boolean));
}

function addDiscoveredUrl(raw, baseUrl) {
  if (!raw || /^(?:#|mailto:|tel:|javascript:|data:)/i.test(raw)) return;

  let url;
  try {
    url = new URL(raw, baseUrl);
  } catch {
    return;
  }

  if (url.origin !== source.origin) return;
  const pathname = url.pathname.replace(/\/+$/, "") || "/";

  if (/\.[a-z0-9]{1,8}$/i.test(pathname) || pathname.startsWith("/assets/")) {
    if (!pathname.endsWith(".js")) assetQueue.add(pathname);
    return;
  }

  if (!visitedPages.has(pathname) && !pageQueue.includes(pathname)) {
    pageQueue.push(pathname);
  }
}

function makeStatic(html, pageUrl) {
  for (const match of html.matchAll(/(?:href|src)=["']([^"']+)["']/gi)) {
    addDiscoveredUrl(match[1], pageUrl);
  }

  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<link\b[^>]*rel=["']modulepreload["'][^>]*>/gi, "")
    .replace(/\sdata-rsc-css-href=["'][^"']*["']/gi, "")
    .replace(/\sdata-precedence=["'][^"']*["']/gi, "")
    .replace(/<\/head>/i, '<meta name="mirror-source" content="GitHub Pages static mirror"/></head>');
}

async function fetchChecked(url) {
  const delays = [0, 2_000, 5_000, 15_000];
  let lastError;

  for (const delay of delays) {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    try {
      const response = await fetch(url, {
        redirect: "follow",
        headers: {
          "user-agent": "Larry-Self-Learning-Hub-Mirror/1.0",
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}: ${url}`);
      }
      return response;
    } catch (error) {
      lastError = error;
      console.warn(`retry ${url} after: ${error.message}`);
    }
  }

  throw lastError;
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

while (pageQueue.length) {
  const pathname = pageQueue.shift();
  if (visitedPages.has(pathname)) continue;
  visitedPages.add(pathname);

  const pageUrl = new URL(pathname, source);
  const response = await fetchChecked(pageUrl);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) continue;

  const html = makeStatic(await response.text(), pageUrl);
  const destination = localPagePath(pathname);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, html, "utf8");
  console.log(`page  ${pathname}`);
}

for (const pathname of assetQueue) {
  const assetUrl = new URL(pathname, source);
  const response = await fetchChecked(assetUrl);
  const bytes = Buffer.from(await response.arrayBuffer());
  const destination = localAssetPath(pathname);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, bytes);
  console.log(`asset ${pathname}`);

  if (pathname.endsWith(".css")) {
    const css = bytes.toString("utf8");
    for (const match of css.matchAll(/url\((?:["']?)([^"')]+)(?:["']?)\)/gi)) {
      addDiscoveredUrl(match[1], assetUrl);
    }
  }
}

await writeFile(path.join(output, ".nojekyll"), "", "utf8");
await writeFile(
  path.join(output, "mirror-status.json"),
  JSON.stringify(
    {
      source: source.href,
      generatedAt: new Date().toISOString(),
      pages: visitedPages.size,
      assets: assetQueue.size,
    },
    null,
    2,
  ),
  "utf8",
);

console.log(`Built ${visitedPages.size} pages and ${assetQueue.size} assets.`);
