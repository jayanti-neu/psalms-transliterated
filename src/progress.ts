const STORAGE_KEY = "tehilim-reader:progress";

export type Progress = {
  knownLemmas: string[];
  knownForms: string[];
  completedLessons: number[];
  completedGrammarLessons: string[];
  startedOn: string;
};

const EMPTY: Progress = {
  knownLemmas: [],
  knownForms: [],
  completedLessons: [],
  completedGrammarLessons: [],
  startedOn: new Date().toISOString(),
};

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const fresh = { ...EMPTY, startedOn: new Date().toISOString() };
      saveProgress(fresh);
      return fresh;
    }

    const parsed = JSON.parse(raw) as Partial<Progress>;
    return {
      knownLemmas: Array.isArray(parsed.knownLemmas) ? parsed.knownLemmas.filter(isString) : [],
      knownForms: Array.isArray(parsed.knownForms) ? parsed.knownForms.filter(isString) : [],
      completedLessons: Array.isArray(parsed.completedLessons)
        ? parsed.completedLessons.filter((n) => Number.isInteger(n))
        : [],
      completedGrammarLessons: Array.isArray(parsed.completedGrammarLessons)
        ? parsed.completedGrammarLessons.filter(isString)
        : [],
      startedOn: typeof parsed.startedOn === "string" ? parsed.startedOn : new Date().toISOString(),
    };
  } catch (error) {
    console.warn("Could not load progress", error);
    return { ...EMPTY, startedOn: new Date().toISOString() };
  }
}

export function saveProgress(progress: Progress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    console.warn("Could not save progress", error);
  }
}

export function markLemmaKnown(progress: Progress, lemma: string): Progress {
  if (progress.knownLemmas.includes(lemma)) {
    return progress;
  }
  const next = { ...progress, knownLemmas: [...progress.knownLemmas, lemma] };
  saveProgress(next);
  return next;
}

export function unmarkLemmaKnown(progress: Progress, lemma: string): Progress {
  if (!progress.knownLemmas.includes(lemma)) {
    return progress;
  }
  const next = {
    ...progress,
    knownLemmas: progress.knownLemmas.filter((existing) => existing !== lemma),
  };
  saveProgress(next);
  return next;
}

export function markFormKnown(progress: Progress, formId: string): Progress {
  if (progress.knownForms.includes(formId)) {
    return progress;
  }
  const next = { ...progress, knownForms: [...progress.knownForms, formId] };
  saveProgress(next);
  return next;
}

export function markLessonCompleted(progress: Progress, chapter: number): Progress {
  if (progress.completedLessons.includes(chapter)) {
    return progress;
  }
  const next = {
    ...progress,
    completedLessons: [...progress.completedLessons, chapter].sort((a, b) => a - b),
  };
  saveProgress(next);
  return next;
}

export function markGrammarLessonCompleted(progress: Progress, lessonId: string): Progress {
  if (progress.completedGrammarLessons.includes(lessonId)) {
    return progress;
  }
  const next = {
    ...progress,
    completedGrammarLessons: [...progress.completedGrammarLessons, lessonId],
  };
  saveProgress(next);
  return next;
}

export function daysSinceStart(progress: Progress): number {
  const start = new Date(progress.startedOn).getTime();
  if (!Number.isFinite(start)) return 1;
  const diff = Date.now() - start;
  return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}
