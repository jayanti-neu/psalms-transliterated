// The two commentaries we surface — both have English on Sefaria. Steinsaltz
// is listed first so it's the default tab: it's plain/modern and covers every
// verse (Rashi is terser and only ~62% of verses).
export const COMMENTATORS = ["Steinsaltz", "Rashi"] as const;
export type CommentarySource = (typeof COMMENTATORS)[number];

// English commentary for one verse: each source maps to its comment segments
// (Rashi often has several per verse; Steinsaltz usually one). Each string is
// raw Sefaria HTML — inline formatting (<b>/<i>) is preserved and rendered by
// the UI; footnotes are stripped at render time.
export type VerseCommentary = Record<CommentarySource, string[]>;

const LIVE_TIMEOUT_MS = 12_000;

// The Sefaria index title for each commentary on Psalms.
const COMMENTARY_TITLES: Record<CommentarySource, string> = {
  Rashi: "Rashi on Psalms",
  Steinsaltz: "Steinsaltz on Psalms",
};

const API_ROOT = "https://www.sefaria.org/api";

// The bundled file stores raw comment strings per verse; runtime cleaning
// (footnote stripping etc.) is shared with the live path via cleanText.
type RawVerseCommentary = { Rashi?: string[]; Steinsaltz?: string[] };
type CommentaryData = {
  chapters: Record<string, Record<string, RawVerseCommentary>>;
};

let bundledDataPromise: Promise<CommentaryData | null> | null = null;
const commentaryCache = new Map<string, Promise<VerseCommentary>>();

export async function fetchVerseCommentary(
  chapter: number,
  verse: number,
): Promise<VerseCommentary> {
  const key = `${chapter}:${verse}`;

  if (!commentaryCache.has(key)) {
    const promise = resolveVerseCommentary(chapter, verse);
    // Don't let a transient failure (e.g. a timed-out live request) poison this
    // verse for the whole session — drop it so reopening retries from scratch.
    promise.catch(() => commentaryCache.delete(key));
    commentaryCache.set(key, promise);
  }

  return commentaryCache.get(key)!;
}

// Prefer the locally bundled commentary (instant, offline). Only when the
// bundle is unavailable — or doesn't cover this chapter — fall back to a live
// Sefaria request, so the app keeps working before/without the import.
async function resolveVerseCommentary(chapter: number, verse: number): Promise<VerseCommentary> {
  const bundled = await getBundledData();
  const chapterData = bundled?.chapters[String(chapter)];

  if (chapterData) {
    return toVerseCommentary(chapterData[String(verse)] ?? {});
  }

  return liveVerseCommentary(chapter, verse);
}

function toVerseCommentary(entry: RawVerseCommentary): VerseCommentary {
  return {
    Rashi: (entry.Rashi ?? []).filter(hasText),
    Steinsaltz: (entry.Steinsaltz ?? []).filter(hasText),
  };
}

// True when the HTML contains visible text once tags are ignored.
function hasText(html: string): boolean {
  return html.replace(/<[^>]*>/g, "").trim().length > 0;
}

function getBundledData(): Promise<CommentaryData | null> {
  bundledDataPromise ??= fetch(`${import.meta.env.BASE_URL}data/psalms-commentary.json`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Commentary data returned ${response.status}`);
      }
      return response.json() as Promise<CommentaryData>;
    })
    .catch((error: unknown) => {
      console.warn("Could not load local commentary data; using live Sefaria", error);
      return null;
    });

  return bundledDataPromise;
}

// Fetch each commentary's text directly and in parallel. This is far lighter
// than the links graph for the verse, which would pull every cross-reference
// (Talmud, Midrash, liturgy …) just to keep these two sources.
async function liveVerseCommentary(chapter: number, verse: number): Promise<VerseCommentary> {
  const [rashi, steinsaltz] = await Promise.all([
    fetchCommentaryText(`${COMMENTARY_TITLES.Rashi} ${chapter}:${verse}`),
    fetchCommentaryText(`${COMMENTARY_TITLES.Steinsaltz} ${chapter}:${verse}`),
  ]);

  return { Rashi: rashi, Steinsaltz: steinsaltz };
}

async function fetchCommentaryText(ref: string): Promise<string[]> {
  // Bound the live request so a cold Sefaria ref (which can take ~60s to
  // compile server-side) can't leave the panel spinning forever — it aborts
  // and surfaces an error state instead.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LIVE_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${API_ROOT}/texts/${encodeURIComponent(ref)}?context=0&commentary=0`,
      { signal: controller.signal },
    );

    // A missing commentary for this verse returns a non-OK status — that's a
    // normal "no entry", not an error, so just yield nothing for this source.
    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as { text?: unknown };
    return flattenText(data.text).filter(hasText);
  } finally {
    clearTimeout(timer);
  }
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
