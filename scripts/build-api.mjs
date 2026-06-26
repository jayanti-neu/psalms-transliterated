import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { transliterate } from "hebrew-transliteration";

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

const MAQQEF = "־"; // ־ Hebrew maqaf (word-joiner)

function stripCantillation(value) {
  // Keep niqqud vowels (U+05B0..U+05BC) so the library can read the word; strip
  // only cantillation accents (U+0591..U+05AF) + meteg/rafe/paseq/lower-dot.
  // Matches the web app's stripCantillation exactly.
  return (value || "")
    .replace(/[\u0591-\u05AF\u05BD\u05BF\u05C0\u05C5]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Converts MACULA's scholarly transliteration (ʾašərê, ḏereḵ, …) into the
// readable form the reader app shows (ashrei, derech, …). Ported verbatim from
// the web app (src/App.tsx) so this API matches it exactly.
function makeReadableTransliteration(scholarly) {
  return (scholarly || "")
    .replace(/^adonai$/i, "Adonai")
    .replaceAll("yhwh", "Adonai")
    .replaceAll("Yhwh", "Adonai")
    .replace(/^ʾ?ă?ḏ?ōnāy$/gi, "Adonai")
    .replace(/y[eə]h[oō]v[aā]/gi, "Adonai")
    .replace(/ʾ?ĕ?lōhîm/gi, "Elohim")
    // Drop a word-final shewa (ə) — silent at the end of a word.
    .replace(/ə(?=:?\s*$)/g, "")
    .replace(/[ʾʿ]/g, "'")
    .replace(/[āăâ]/g, "a")
    .replace(/[ēĕê]/g, "e")
    .replace(/[īî]/g, "i")
    .replace(/[ōŏô]/g, "o")
    .replace(/[ūû]/g, "u")
    .replace(/[əĕ]/g, "e")
    .replace(/ḥ/g, "ch")
    .replace(/ḫ/g, "ch")
    .replace(/ḵ/g, "ch")
    .replace(/ṭ/g, "t")
    .replace(/ṣ/g, "tz")
    .replace(/š/g, "sh")
    .replace(/ś/g, "s")
    .replace(/ḏ/g, "d")
    .replace(/ḡ/g, "g")
    .replace(/ṯ/g, "t")
    .replace(/ḇ/g, "v")
    .replace(/iy/g, "i")
    .replace(/q/g, "k")
    .replace(/Q/g, "K")
    .replace(/w/g, "v")
    .replace(/W/g, "V")
    .replace(/p̄/g, "f")
    .replace(/k̄/g, "ch")
    .replace(/[ꜣ]/g, "")
    .replace(/'/g, "")
    .replace(/[׃]/g, "")
    .replace(/[ᴬ-ᵿ]/g, "")
    .replace(/[:]/g, "")
    .replace(/shsh/g, "sh")
    .replace(/tztz/g, "tz")
    .replace(/chch/g, "ch")
    .replace(/([bcdfghjklmnpqrstvxyz])\1/gi, "$1")
    .replace(/\s+([:;,.!?])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

// Library fallback when MACULA has no transliteration for a token.
function libTranslit(hebrew) {
  try {
    return makeReadableTransliteration(transliterate(stripCantillation(hebrew)));
  } catch {
    return "";
  }
}

// Parts of speech that carry the word's core meaning (vs. attached
// prefixes/suffixes like the article, conjunctions, prepositions, suffixes).
const CONTENT_POS = new Set(["noun", "verb", "adjective", "adverb", "pronoun", "numeral"]);

// Readable transliteration for a whole word. MACULA gives one entry per
// maqaf-joined segment; grammar pieces within a segment are space-separated and
// joined with a hyphen (e.g. "ha-ish"), segments by a space ("ashrei ha-ish").
function wordTranslit(w) {
  if ((w.parts || []).some((pt) => stripCantillation(pt.lemma) === "אדני")) {
    return "Adonai";
  }
  const segments = (w.transliteration || []).length
    ? w.transliteration.map(makeReadableTransliteration)
    : (w.text || "").split(MAQQEF).map(libTranslit);
  return segments.map((s) => s.replace(/\s+/g, "-")).filter(Boolean).join(" ");
}

// Builds the per-word record: surface form + readable transliteration + gloss,
// plus the morphological breakdown (parts) and the dictionary form / part of
// speech of the main content part (for the lexicon lookup and "root" line).
function buildWord(w) {
  const parts = (w.parts || []).map((pt) => ({
    he: pt.text,
    translit: makeReadableTransliteration(pt.transliteration || "") || libTranslit(pt.text),
    gloss: (pt.gloss || "").trim(),
    pos: pt.pos || "",
  }));
  const content =
    (w.parts || []).find((pt) => CONTENT_POS.has(pt.pos)) ||
    (w.parts || [])[(w.parts || []).length - 1] ||
    {};
  return {
    he: w.text,
    translit: wordTranslit(w),
    gloss: (w.gloss || []).join(" ").trim(),
    lemma: content.lemma || "",
    pos: content.pos || "",
    parts,
  };
}

await rm(OUT_ROOT, { recursive: true, force: true });
await mkdir(OUT_PSALMS, { recursive: true });

const commCh = commentary.chapters || {};
let totalVerses = 0;

const psalmNumbers = Object.keys(macula.chapters);
for (const p of psalmNumbers) {
  const verses = {};
  for (const v of Object.keys(macula.chapters[p])) {
    const words = macula.chapters[p][v].map(buildWord);

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
