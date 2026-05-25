import { fetchMaculaPsalm, type MaculaWord } from "./macula";

export type Verse = {
  number: number;
  hebrew: string;
  english: string;
  words?: MaculaWord[];
};

type SefariaV3TextVersion = {
  language?: string;
  text?: unknown;
  versionTitle?: string;
};

type SefariaV3Response = {
  ref?: string;
  heRef?: string;
  versions?: SefariaV3TextVersion[];
};

type SefariaLegacyResponse = {
  he?: unknown;
  text?: unknown;
  ref?: string;
  heRef?: string;
};

const API_ROOT = "https://www.sefaria.org/api";

export async function fetchPsalm(chapter: number): Promise<Verse[]> {
  const ref = `Psalms ${chapter}`;
  const localPsalm = await fetchMaculaPsalm(chapter);

  try {
    const legacy = await fetch(
      `${API_ROOT}/texts/${encodeURIComponent(ref)}?context=0&commentary=0`,
    );
    if (!legacy.ok) {
      throw new Error(`Sefaria returned ${legacy.status}`);
    }

    const data = (await legacy.json()) as SefariaLegacyResponse;
    return mergeLocalPsalm(localPsalm, pairVerses(flattenText(data.he), flattenText(data.text)));
  } catch (error) {
    console.warn("Falling back to Sefaria v3 texts API", error);
  }

  try {
    const v3 = await fetch(`${API_ROOT}/v3/texts/${encodeURIComponent(ref)}`);
    if (!v3.ok) {
      throw new Error(`Sefaria v3 returned ${v3.status}`);
    }

    const data = (await v3.json()) as SefariaV3Response;
    const hebrew = flattenText(
      data.versions?.find((version) => version.language === "he")?.text,
    );
    const english = flattenText(
      data.versions?.find((version) => version.language === "en")?.text,
    );

    if (hebrew.length || english.length) {
      return mergeLocalPsalm(localPsalm, pairVerses(hebrew, english));
    }
  } catch (error) {
    console.warn("Sefaria v3 text could not be loaded", error);
    if (localPsalm) {
      console.warn("Using local MACULA text without Sefaria English", error);
      return mergeLocalPsalm(localPsalm, []);
    }

    throw error;
  }
}

function pairVerses(hebrew: string[], english: string[]): Verse[] {
  const length = Math.max(hebrew.length, english.length);

  return Array.from({ length }, (_, index) => ({
    number: index + 1,
    hebrew: cleanText(hebrew[index] ?? ""),
    english: cleanText(english[index] ?? ""),
  }));
}

function flattenText(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(flattenText);
  }

  return [];
}

export function cleanText(value: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(value, "text/html");
  doc
    .querySelectorAll(".footnote, .footnote-marker, .mam-spi-pe")
    .forEach((node) => node.remove());

  return (doc.body.textContent ?? value)
    .replace(/\{[פס]\}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function mergeLocalPsalm(
  localPsalm: Awaited<ReturnType<typeof fetchMaculaPsalm>>,
  verses: Verse[],
): Verse[] {
  if (!localPsalm) {
    return verses;
  }

  const localByVerse = new Map(localPsalm.map((verse) => [verse.number, verse]));
  const length = Math.max(localPsalm.length, verses.length);

  return Array.from({ length }, (_, index) => {
    const number = index + 1;
    const localVerse = localByVerse.get(number);
    const verse = verses[index];

    return {
      number,
      hebrew: localVerse?.hebrew ?? verse?.hebrew ?? "",
      english: verse?.english ?? "",
      words: localVerse?.words,
    };
  });
}
