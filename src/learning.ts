import type { Progress } from "./progress";

export type LemmaEntry = {
  lemma: string;
  display: string;
  gloss: string;
  pos: string;
  count: number;
  firstSeen: { chapter: number; verse: number };
};

export type PsalmSummary = {
  verseCount: number;
  wordCount: number;
  lemmas: string[];
};

export type LemmaIndex = {
  generatedAt: string;
  source: { name: string; url: string; license: string };
  lessonOrder: number[];
  psalms: Record<string, PsalmSummary>;
  lemmas: Record<string, LemmaEntry>;
};

export type LessonStats = {
  chapter: number;
  verseCount: number;
  wordCount: number;
  uniqueLemmas: number;
  knownLemmas: number;
  newLemmas: number;
  estMinutes: number;
};

let indexPromise: Promise<LemmaIndex | null> | null = null;

export async function loadLemmaIndex(): Promise<LemmaIndex | null> {
  indexPromise ??= fetch(`${import.meta.env.BASE_URL}data/lemma-index.json`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`lemma-index.json returned ${response.status}`);
      }
      return response.json() as Promise<LemmaIndex>;
    })
    .catch((error: unknown) => {
      console.warn("Could not load lemma index", error);
      return null;
    });

  return indexPromise;
}

export function getNextLessonChapter(index: LemmaIndex, progress: Progress): number {
  for (const chapter of index.lessonOrder) {
    if (!progress.completedLessons.includes(chapter)) {
      return chapter;
    }
  }
  return index.lessonOrder[0] ?? 1;
}

export function getLessonStats(
  index: LemmaIndex,
  chapter: number,
  progress: Progress,
): LessonStats | null {
  const summary = index.psalms[String(chapter)];
  if (!summary) return null;

  const knownSet = new Set(progress.knownLemmas);
  const knownLemmas = summary.lemmas.filter((lemma) => knownSet.has(lemma)).length;
  const newLemmas = summary.lemmas.length - knownLemmas;

  // 30s per new lemma + 20s per verse for reading, rounded up.
  const estMinutes = Math.max(2, Math.round((newLemmas * 30 + summary.verseCount * 20) / 60));

  return {
    chapter,
    verseCount: summary.verseCount,
    wordCount: summary.wordCount,
    uniqueLemmas: summary.lemmas.length,
    knownLemmas,
    newLemmas,
    estMinutes,
  };
}

export function normalizeLemma(value: string): string {
  if (!value) return "";
  return value
    .replace(/[֑-֯]/g, "")
    .replace(/[ְ-ׇּֽֿׁׂ]/g, "")
    .trim();
}
