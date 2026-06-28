import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// Post-build static-site step. `vite build` emits a single client-rendered
// index.html (empty <div id="root">), which is invisible to search engines.
// This script reads that built shell as a template and stamps out:
//   • dist/psalm/<n>/index.html — one crawlable page per psalm, with a unique
//     title/description/canonical, Open Graph + JSON-LD, and the real Hebrew +
//     transliteration in the body. React replaces #root on hydration, so users
//     still get the full app; crawlers (and no-JS visitors) get real content.
//   • dist/index.html — the home page, enhanced with links to every psalm.
//   • dist/404.html — copy of the shell so GitHub Pages serves the SPA for any
//     unmatched path (GitHub Pages ignores Netlify-style _redirects).
//   • dist/sitemap.xml + dist/robots.txt — so crawlers can discover all pages.
//
// Content comes from the per-psalm JSON the build already wrote to dist/api
// (see scripts/build-api.mjs), so there's no extra data source or network call.

const DIST = "dist";
// Canonical site origin + base path. UPDATE the origin here if you move to a
// custom domain (and drop the "/psalms-transliterated" base if hosting at root).
const ORIGIN = "https://jayanti-neu.github.io";
const BASE = "/psalms-transliterated/";
const SITE = ORIGIN + BASE.replace(/\/$/, ""); // no trailing slash
const PSALM_COUNT = 150;

const template = await readFile(path.join(DIST, "index.html"), "utf8");

function escapeHtml(value) {
  return (value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function truncate(value, max) {
  const text = (value || "").trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

// Stamps per-page <head> tags and optional #root body content into the shell.
function buildPage({ title, description, canonicalPath, jsonLd, bodyContent }) {
  const canonical = `${SITE}${canonicalPath}`;
  let html = template;

  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`);

  const descTag = `<meta name="description" content="${escapeHtml(description)}" />`;
  html = /<meta name="description"[^>]*>/.test(html)
    ? html.replace(/<meta name="description"[^>]*>/, descTag)
    : html.replace("</head>", `    ${descTag}\n  </head>`);

  const head = [
    `<link rel="canonical" href="${canonical}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:image" content="${SITE}/icon.svg" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>`,
  ].join("\n    ");
  html = html.replace("</head>", `    ${head}\n  </head>`);

  if (bodyContent) {
    html = html.replace('<div id="root"></div>', `<div id="root">${bodyContent}</div>`);
  }
  return html;
}

async function readPsalm(n) {
  try {
    return JSON.parse(await readFile(path.join(DIST, "api", "psalm", `${n}.json`), "utf8"));
  } catch {
    return null;
  }
}

function verseRows(data) {
  return Object.keys(data.verses)
    .map(Number)
    .sort((a, b) => a - b)
    .map((v) => {
      const words = data.verses[String(v)].words || [];
      const he = words.map((w) => w.he).join(" ");
      const tr = words.map((w) => w.translit).filter(Boolean).join(" ");
      return (
        `<li><span dir="rtl" lang="he">${escapeHtml(he)}</span>` +
        ` <span lang="en">${escapeHtml(tr)}</span></li>`
      );
    })
    .join("");
}

function firstVerseTranslit(data) {
  const first = data.verses["1"];
  return first ? (first.words || []).map((w) => w.translit).filter(Boolean).join(" ") : "";
}

function psalmLink(n, label) {
  return `<a href="${BASE}psalm/${n}/">${label}</a>`;
}

// --- Per-psalm pages -------------------------------------------------------

let written = 0;
for (let n = 1; n <= PSALM_COUNT; n += 1) {
  const data = await readPsalm(n);
  if (!data) {
    console.warn(`prerender: no data for psalm ${n}, skipping`);
    continue;
  }

  const opening = truncate(firstVerseTranslit(data), 90);
  const title = `Psalm ${n} — Hebrew, Transliteration & Commentary | Tehilim Reader`;
  const description = truncate(
    `Psalm ${n} (Tehilim ${n}) in Hebrew with English transliteration` +
      (opening ? `: “${opening}”. ` : ". ") +
      "Includes translation and Rashi & Steinsaltz commentary.",
    180,
  );

  const nav = [
    n > 1 ? psalmLink(n - 1, `← Psalm ${n - 1}`) : "",
    n < PSALM_COUNT ? psalmLink(n + 1, `Psalm ${n + 1} →`) : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const bodyContent =
    `<main><article>` +
    `<h1>Psalm ${n}</h1>` +
    `<p>${escapeHtml(`Psalm ${n} (Tehilim ${n}) in Hebrew with English transliteration, translation, and traditional commentary.`)}</p>` +
    `<ol>${verseRows(data)}</ol>` +
    (nav ? `<nav>${nav}</nav>` : "") +
    `</article></main>`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: `Psalm ${n}`,
    alternateName: `Tehilim ${n}`,
    inLanguage: ["he", "en"],
    isPartOf: { "@type": "Book", name: "Book of Psalms", alternateName: "Tehilim" },
    url: `${SITE}/psalm/${n}/`,
    description,
  };

  const html = buildPage({
    title,
    description,
    canonicalPath: `/psalm/${n}/`,
    jsonLd,
    bodyContent,
  });

  const dir = path.join(DIST, "psalm", String(n));
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "index.html"), html);
  written += 1;
}

// --- Home page -------------------------------------------------------------

const psalmIndex = Array.from({ length: PSALM_COUNT }, (_, i) => psalmLink(i + 1, String(i + 1))).join(
  " ",
);
const homeBody =
  `<main>` +
  `<h1>Tehilim Reader</h1>` +
  `<p>Read all 150 Psalms (Tehilim) in Hebrew with English transliteration, translation, ` +
  `and Rashi &amp; Steinsaltz commentary — plus the daily and weekly reading schedules.</p>` +
  `<nav aria-label="All psalms"><p>${psalmIndex}</p></nav>` +
  `</main>`;

const homeHtml = buildPage({
  title: "Tehilim Reader — Psalms 1–150 in Hebrew with Transliteration & Commentary",
  description:
    "Read all 150 Psalms (Tehilim) in Hebrew with English transliteration, translation, " +
    "and Rashi & Steinsaltz commentary. Daily and weekly reading schedules included.",
  canonicalPath: "/",
  jsonLd: {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Tehilim Reader",
    url: `${SITE}/`,
    description: "Read the Psalms (Tehilim) in Hebrew with transliteration and commentary.",
  },
  bodyContent: homeBody,
});
await writeFile(path.join(DIST, "index.html"), homeHtml);

// SPA fallback: GitHub Pages serves 404.html for any path without a file.
await copyFile(path.join(DIST, "index.html"), path.join(DIST, "404.html"));

// --- sitemap.xml + robots.txt ---------------------------------------------

const urls = [`${SITE}/`];
for (let n = 1; n <= PSALM_COUNT; n += 1) {
  urls.push(`${SITE}/psalm/${n}/`);
}
const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map((u) => `  <url><loc>${u}</loc></url>`).join("\n") +
  `\n</urlset>\n`;
await writeFile(path.join(DIST, "sitemap.xml"), sitemap);

await writeFile(
  path.join(DIST, "robots.txt"),
  `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`,
);

console.log(
  `prerender: wrote ${written} psalm pages + home, 404, sitemap (${urls.length} urls), robots`,
);
