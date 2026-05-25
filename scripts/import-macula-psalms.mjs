import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SOURCE = path.join("data", "source", "macula-hebrew.tsv");
const OUTPUT = path.join("public", "data", "psalms-macula.json");
const BOOK = "PSA";
const MAQQEF = "\u05BE";
const DIVINE_NAME_LEMMAS = new Set(["\u05D9\u05D4\u05D5\u05D4"]);
const ADONAI_LEMMAS = new Set(["\u05D0\u05D3\u05E0\u05D9"]);

const tsv = await readFile(SOURCE, "utf8");
const [headerLine, ...lines] = tsv.split(/\r?\n/);
const headers = headerLine.split("\t");
const indexes = Object.fromEntries(headers.map((header, index) => [header, index]));

const chapters = {};

for (const line of lines) {
  if (!line.trim()) {
    continue;
  }

  const cells = line.split("\t");
  const ref = get(cells, "ref");
  const parsedRef = parsePsalmsRef(ref);

  if (!parsedRef) {
    continue;
  }

  const chapter = getChapter(chapters, parsedRef.chapter);
  const verse = getVerse(chapter, parsedRef.verse);
  const word = getWord(verse, parsedRef.word);

  const text = stripCantillation(get(cells, "text"));
  const after = get(cells, "after");
  const transliteration = normalizeTransliteration(get(cells, "transliteration"));
  const gloss = cleanGloss(get(cells, "english") || get(cells, "gloss"));
  const lemma = get(cells, "lemma");
  const pos = get(cells, "pos");
  const morph = get(cells, "morph");
  const display = getDisplayValues({ transliteration, gloss, lemma });

  word.ref ??= parsedRef;
  word.text += text + normalizeAfter(after);
  if (!text && !display.transliteration) {
    word.inlineGlosses.push(display.gloss);
    continue;
  }

  word.parts.push({
    text,
    transliteration: display.transliteration,
    gloss: getPartGloss({
      gloss: display.gloss,
      pos,
      morph,
      ref: parsedRef,
    }),
    lemma,
    pos,
    morph,
  });
}

const output = {
  source: {
    name: "MACULA Hebrew",
    url: "https://github.com/Clear-Bible/macula-hebrew",
    license: "CC BY 4.0",
  },
  chapters: Object.fromEntries(
    Object.entries(chapters).map(([chapterNumber, chapter]) => [
      chapterNumber,
      Object.fromEntries(
        Object.entries(chapter).map(([verseNumber, words]) => [
          verseNumber,
          mergeMaqqefWords(words).map((word) => {
            const transliteration = word.segments.map(getSegmentTransliteration);

            return {
              text: word.text,
              transliteration: transliteration.every(Boolean) ? transliteration : [],
              gloss: getWordGloss(word),
              parts: word.segments.flatMap((segment) => segment.parts),
            };
          }),
        ]),
      ),
    ]),
  ),
};

await mkdir(path.dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify(output)}\n`, "utf8");

console.log(`Imported Psalms data to ${OUTPUT}`);

function get(cells, header) {
  return cells[indexes[header]]?.trim() ?? "";
}

function parsePsalmsRef(ref) {
  const match = /^PSA (\d+):(\d+)!(\d+)/.exec(ref);

  if (!match) {
    return null;
  }

  return {
    chapter: Number(match[1]),
    verse: Number(match[2]),
    word: Number(match[3]),
  };
}

function getChapter(chapters, chapterNumber) {
  chapters[chapterNumber] ??= {};
  return chapters[chapterNumber];
}

function getVerse(chapter, verseNumber) {
  chapter[verseNumber] ??= [];
  return chapter[verseNumber];
}

function getWord(verse, wordNumber) {
  verse[wordNumber - 1] ??= { text: "", parts: [], inlineGlosses: [], ref: null };
  return verse[wordNumber - 1];
}

function normalizeAfter(after) {
  return after === MAQQEF ? MAQQEF : "";
}

function normalizeTransliteration(value) {
  return value
    .replace(/-$/g, "")
    .replace(/[\u2010-\u2015]/g, "")
    .trim();
}

function cleanGloss(value) {
  return value
    .replace(/\[[^\]]*\]/g, "")
    .replace(/[.!]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getDisplayValues({ transliteration, gloss, lemma }) {
  if (DIVINE_NAME_LEMMAS.has(stripHebrewMarks(lemma))) {
    return {
      transliteration: "Adonai",
      gloss: "Hashem",
    };
  }

  if (ADONAI_LEMMAS.has(stripHebrewMarks(lemma))) {
    return {
      transliteration: "Adonai",
      gloss: gloss || "Lord",
    };
  }

  return { transliteration, gloss };
}

function getPartGloss({ gloss, pos, morph, ref }) {
  if (gloss || pos !== "preposition" || morph !== "R") {
    return gloss;
  }

  if (ref.chapter === 2 && ref.verse === 1 && ref.word === 1) {
    return "part of phrase";
  }

  return gloss;
}

function getWordGloss(word) {
  const ref = word.ref;

  if (ref.chapter === 2 && ref.verse === 1 && ref.word === 1) {
    return ["why"];
  }

  return word.segments
    .map((segment) => [...segment.inlineGlosses, joinParts(segment.parts, "gloss")]
      .filter(Boolean)
      .join(" "))
    .filter(Boolean);
}

function stripHebrewMarks(value) {
  return value.replace(/[\u0591-\u05C7]/g, "");
}

function stripCantillation(value) {
  return value.replace(/[\u0591-\u05AF\u05BD\u05BF\u05C0\u05C5]/g, "");
}

function mergeMaqqefWords(words) {
  const merged = [];

  for (const word of words.filter(Boolean)) {
    const previous = merged.at(-1);
    const segment = {
      text: word.text,
      parts: [...word.parts],
      inlineGlosses: [...word.inlineGlosses],
    };

    if (previous?.text.endsWith(MAQQEF)) {
      previous.text += word.text;
      previous.segments.push(segment);
    } else {
      merged.push({
        text: word.text,
        ref: word.ref,
        segments: [segment],
      });
    }
  }

  return merged.map((word) => ({
    ...word,
    text: word.text.replace(new RegExp(`${MAQQEF}$`), ""),
  }));
}

function joinParts(parts, field) {
  return parts
    .map((part) => part[field])
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function getSegmentTransliteration(segment) {
  const joined = joinParts(segment.parts, "transliteration");
  const hasMissingWordPart = segment.parts.some(
    (part) => part.text && part.pos !== "suffix" && !part.transliteration,
  );

  return hasMissingWordPart ? "" : joined;
}
