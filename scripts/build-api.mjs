import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

// Builds a tiny per-psalm "API" from the bundled Macula word data and the
// Rashi/Steinsaltz commentary. One file per psalm (public/api/psalm/<n>.json)
// so consumers (e.g. the Holy Tongue new-tab extension) can fetch just the
// psalm they need (~tens of KB) instead of the full multi-MB datasets.
//
// Output is generated at build time and git-ignored; the Pages workflow runs
// `npm run build`, which runs this before `vite build` copies public/ to dist/.

const DATA = path.join("public", "data");
const OUT_ROOT = path.join("public", "api");
const OUT_PSALMS = path.join(OUT_ROOT, "psalm");

const macula = JSON.parse(await readFile(path.join(DATA, "psalms-macula.json"), "utf8"));
const commentary = JSON.parse(await readFile(path.join(DATA, "psalms-commentary.json"), "utf8"));

function stripHtml(s) {
  return (s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// Joins an array (or string) of HTML commentary segments into one clean string.
function joinComment(value) {
  const arr = Array.isArray(value) ? value : value ? [value] : [];
  return arr.map(stripHtml).filter(Boolean).join(" ");
}

// Trims trailing Hebrew/ASCII verse punctuation (sof pasuq ׃, colon) from a
// transliteration token.
function cleanTranslit(t) {
  return (t || "").replace(/[\s:׃.]+$/, "").trim();
}

await rm(OUT_ROOT, { recursive: true, force: true });
await mkdir(OUT_PSALMS, { recursive: true });

const commCh = commentary.chapters || {};
let totalVerses = 0;

const psalmNumbers = Object.keys(macula.chapters);
for (const p of psalmNumbers) {
  const verses = {};
  for (const v of Object.keys(macula.chapters[p])) {
    const words = macula.chapters[p][v].map((w) => ({
      he: w.text,
      translit: cleanTranslit((w.transliteration || []).join(" ")),
      gloss: (w.gloss || []).join(" ").trim(),
    }));

    const ce = (commCh[p] && commCh[p][v]) || {};
    verses[v] = {
      words,
      rashi: joinComment(ce.Rashi),
      steinsaltz: joinComment(ce.Steinsaltz),
    };
    totalVerses += 1;
  }
  await writeFile(
    path.join(OUT_PSALMS, `${p}.json`),
    JSON.stringify({ psalm: Number(p), verses })
  );
}

await writeFile(
  path.join(OUT_ROOT, "index.json"),
  JSON.stringify(
    {
      psalms: psalmNumbers.length,
      verses: totalVerses,
      route: "api/psalm/{n}.json",
      sources: {
        words: macula.source,
        commentary: commentary.source,
      },
    },
    null,
    2
  )
);

console.log(`build-api: wrote ${psalmNumbers.length} psalm files (${totalVerses} verses) to ${OUT_PSALMS}`);
