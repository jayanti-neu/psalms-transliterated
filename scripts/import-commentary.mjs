import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// Downloads Rashi + Steinsaltz (English) for every verse of Psalms from Sefaria
// once, into a local JSON the app reads instantly at runtime. We eat Sefaria's
// slow "cold ref" compilation here at build time, not in front of the reader.

const MACULA = path.join("public", "data", "psalms-macula.json");
const OUTPUT = path.join("public", "data", "psalms-commentary.json");
const API_ROOT = "https://www.sefaria.org/api";
const TITLES = {
  Rashi: "Rashi on Psalms",
  Steinsaltz: "Steinsaltz on Psalms",
};
const CONCURRENCY = 8;
const REQUEST_TIMEOUT_MS = 90_000; // cold refs can take ~60s server-side
const MAX_ATTEMPTS = 4;

const macula = JSON.parse(await readFile(MACULA, "utf8"));
const targets = [];
for (const [chapter, verses] of Object.entries(macula.chapters)) {
  for (const verse of Object.keys(verses)) {
    targets.push({ chapter, verse });
  }
}

console.log(`Fetching commentary for ${targets.length} verses (×2 sources)…`);

const chapters = {};
let done = 0;
let failed = 0;

await pool(targets, CONCURRENCY, async ({ chapter, verse }) => {
  const [rashi, steinsaltz] = await Promise.all([
    fetchCommentaryText(`${TITLES.Rashi} ${chapter}:${verse}`),
    fetchCommentaryText(`${TITLES.Steinsaltz} ${chapter}:${verse}`),
  ]);

  (chapters[chapter] ??= {})[verse] = {
    Rashi: rashi ?? [],
    Steinsaltz: steinsaltz ?? [],
  };

  if (rashi === null || steinsaltz === null) {
    failed += 1;
  }

  done += 1;
  if (done % 100 === 0 || done === targets.length) {
    console.log(`  ${done}/${targets.length} verses (${failed} with errors)`);
  }
});

const output = {
  source: {
    name: "Sefaria",
    url: "https://www.sefaria.org",
    commentaries: ["Rashi", "Steinsaltz"],
  },
  chapters: sortChapters(chapters),
};

await mkdir(path.dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify(output)}\n`, "utf8");

console.log(`Wrote commentary for ${targets.length} verses to ${OUTPUT}`);
if (failed) {
  console.log(`${failed} verses had a source that failed after retries (stored empty).`);
}

// Returns an array of raw comment strings, [] if the source has nothing for
// this verse, or null if every attempt failed (network/timeout).
async function fetchCommentaryText(ref) {
  const url = `${API_ROOT}/texts/${encodeURIComponent(ref)}?context=0&commentary=0`;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (response.status === 404) {
        return [];
      }
      if (!response.ok) {
        throw new Error(`status ${response.status}`);
      }

      const data = await response.json();
      return flattenText(data.text);
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) {
        console.warn(`  ! ${ref} failed: ${error.message}`);
        return null;
      }
      await sleep(1_000 * attempt);
    }
  }

  return null;
}

function flattenText(value) {
  if (typeof value === "string") {
    return value.trim() ? [value] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap(flattenText);
  }
  return [];
}

function sortChapters(chapters) {
  const sorted = {};
  for (const chapter of Object.keys(chapters).sort((a, b) => Number(a) - Number(b))) {
    const verses = chapters[chapter];
    sorted[chapter] = {};
    for (const verse of Object.keys(verses).sort((a, b) => Number(a) - Number(b))) {
      sorted[chapter][verse] = verses[verse];
    }
  }
  return sorted;
}

async function pool(items, size, worker) {
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: size }, run));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
