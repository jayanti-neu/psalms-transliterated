import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const INPUT = path.join("public", "data", "psalms-macula.json");
const OUTPUT = path.join("public", "data", "lemma-index.json");

const NIQQUD = /[ְ-ׇּֽֿׁׂ]/g;
const CANTILLATION = /[֑-֯]/g;
const EXCLUDED_POS = new Set(["suffix"]);
const STARTER_PSALMS = [117, 100, 23];

const data = JSON.parse(await readFile(INPUT, "utf8"));

const lemmas = new Map();
const psalms = new Map();

for (const [chapterKey, chapter] of Object.entries(data.chapters)) {
  const chapterNum = Number(chapterKey);
  const verseEntries = Object.entries(chapter);
  const lemmasInPsalm = new Set();
  let wordCount = 0;

  for (const [verseKey, words] of verseEntries) {
    const verseNum = Number(verseKey);
    wordCount += words.length;

    for (const word of words) {
      for (const part of word.parts) {
        if (EXCLUDED_POS.has(part.pos)) continue;
        const key = normalizeLemma(part.lemma);
        if (!key) continue;

        lemmasInPsalm.add(key);

        if (!lemmas.has(key)) {
          lemmas.set(key, {
            lemma: key,
            display: stripCantillation(part.lemma),
            gloss: cleanGloss(part.gloss) || "",
            pos: part.pos,
            count: 0,
            firstSeen: { chapter: chapterNum, verse: verseNum },
          });
        }

        const entry = lemmas.get(key);
        entry.count += 1;
        if (!entry.gloss && part.gloss) {
          entry.gloss = cleanGloss(part.gloss);
        }
      }
    }
  }

  psalms.set(chapterNum, {
    verseCount: verseEntries.length,
    wordCount,
    lemmas: Array.from(lemmasInPsalm),
  });
}

const lessonOrder = [
  ...STARTER_PSALMS,
  ...Array.from({ length: 150 }, (_, i) => i + 1).filter(
    (n) => !STARTER_PSALMS.includes(n) && psalms.has(n),
  ),
];

const output = {
  generatedAt: new Date().toISOString(),
  source: data.source,
  lessonOrder,
  psalms: Object.fromEntries(
    Array.from(psalms.entries())
      .sort(([a], [b]) => a - b)
      .map(([n, p]) => [String(n), p]),
  ),
  lemmas: Object.fromEntries(
    Array.from(lemmas.values())
      .sort((a, b) => b.count - a.count)
      .map((entry) => [entry.lemma, entry]),
  ),
};

await writeFile(OUTPUT, `${JSON.stringify(output)}\n`, "utf8");

console.log(
  `Wrote ${OUTPUT}: ${psalms.size} psalms, ${lemmas.size} unique lemmas.`,
);

function normalizeLemma(value) {
  if (!value) return "";
  return value.replace(CANTILLATION, "").replace(NIQQUD, "").trim();
}

function stripCantillation(value) {
  return (value ?? "").replace(CANTILLATION, "").trim();
}

function cleanGloss(value) {
  if (!value) return "";
  return value
    .replace(/\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
