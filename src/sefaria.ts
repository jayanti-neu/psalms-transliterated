export type Verse = {
  number: number;
  hebrew: string;
  english: string;
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
      return pairVerses(hebrew, english);
    }
  } catch (error) {
    console.warn("Falling back to Sefaria legacy texts API", error);
  }

  const legacy = await fetch(
    `${API_ROOT}/texts/${encodeURIComponent(ref)}?context=0&commentary=0`,
  );
  if (!legacy.ok) {
    throw new Error(`Sefaria returned ${legacy.status}`);
  }

  const data = (await legacy.json()) as SefariaLegacyResponse;
  return pairVerses(flattenText(data.he), flattenText(data.text));
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
