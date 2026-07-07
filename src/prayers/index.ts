import anaBekoach from "./ana-bekoach.json";

// Special (non-psalm) texts shown in the reader with the same interlinear
// Hebrew + transliteration style. Unlike the psalms, these have no MACULA
// morphology, so there's no per-word grammar popover — just the paired
// Hebrew/transliteration and a per-line translation, plus a curated
// transliteration bundled alongside the pointed Hebrew.

export type PrayerWord = { he: string; tr: string };

export type PrayerLine = {
  /** 1-based line number, or 0 for an unnumbered line (e.g. the seal). */
  number: number;
  words: PrayerWord[];
  english: string;
  note?: string;
};

export type Prayer = {
  id: string;
  title: string;
  hebrewTitle?: string;
  subtitle?: string;
  note?: string;
  lines: PrayerLine[];
  /** An optional closing line rendered apart from the numbered lines. */
  seal?: PrayerLine;
};

type RawWord = [string, string];
type RawLine = { words: RawWord[]; english: string; note?: string };

function toLine(raw: RawLine, number: number): PrayerLine {
  return {
    number,
    english: raw.english,
    note: raw.note,
    words: raw.words.map(([he, tr]) => ({ he, tr })),
  };
}

export const ANA_BEKOACH: Prayer = {
  id: anaBekoach.id,
  title: anaBekoach.title,
  hebrewTitle: anaBekoach.hebrewTitle,
  subtitle: anaBekoach.subtitle,
  note: anaBekoach.note,
  lines: (anaBekoach.lines as RawLine[]).map((line, index) => toLine(line, index + 1)),
  seal: toLine(anaBekoach.seal as RawLine, 0),
};

export const PRAYERS: Prayer[] = [ANA_BEKOACH];

export function getPrayer(id: string): Prayer | undefined {
  return PRAYERS.find((prayer) => prayer.id === id);
}
