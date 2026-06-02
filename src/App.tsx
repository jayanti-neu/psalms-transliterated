import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Menu,
  Search,
  Star,
  X,
} from "lucide-react";
import { transliterate } from "hebrew-transliteration";
import { useEffect, useMemo, useState } from "react";
import type { MaculaWord, MaculaWordPart } from "./macula";
import { fetchPsalm, type Verse } from "./sefaria";

const PSALM_COUNT = 150;
const FAVORITES_STORAGE_KEY = "tehilim-reader:favorites";
const MAQQEF = "\u05BE";
const MEANING_RANGES: Record<string, string[]> = {
  "\u05D0\u05DC": ["to", "toward", "unto"],
  "\u05D1": ["in", "with", "by"],
  "\u05DC": ["to", "for", "of"],
  "\u05DE": ["from", "out of", "because of"],
  "\u05E2\u05D3": ["until", "as far as"],
  "\u05E2\u05DC": ["on", "upon", "over", "against", "concerning"],
  "\u05DB": ["like", "as", "according to"],
};

type LoadState =
  | { status: "loading"; verses: Verse[]; error: "" }
  | { status: "ready"; verses: Verse[]; error: "" }
  | { status: "error"; verses: Verse[]; error: string };

function App() {
  const initialChapter = getInitialChapter();
  const [chapter, setChapter] = useState(initialChapter);
  const [typedChapter, setTypedChapter] = useState(String(initialChapter));
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isDesktopPanelHidden, setIsDesktopPanelHidden] = useState(true);
  const [isNearBottom, setIsNearBottom] = useState(false);
  const [openWordId, setOpenWordId] = useState<string | null>(null);
  const [favoriteChapters, setFavoriteChapters] = useState<number[]>(() => loadFavorites());
  const [loadState, setLoadState] = useState<LoadState>({
    status: "loading",
    verses: [],
    error: "",
  });

  useEffect(() => {
    let cancelled = false;

    setLoadState((current) => ({ status: "loading", verses: current.verses, error: "" }));

    fetchPsalm(chapter)
      .then((verses) => {
        if (!cancelled) {
          setLoadState({ status: "ready", verses, error: "" });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadState({
            status: "error",
            verses: [],
            error:
              error instanceof Error
                ? error.message
                : "The chapter could not be loaded from Sefaria.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [chapter]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [chapter]);

  useEffect(() => {
    function closeWordDetails() {
      setOpenWordId(null);
    }

    document.addEventListener("click", closeWordDetails);

    return () => {
      document.removeEventListener("click", closeWordDetails);
    };
  }, []);

  useEffect(() => {
    function updateBottomState() {
      const remaining =
        document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
      setIsNearBottom(remaining < 180);
    }

    updateBottomState();
    window.addEventListener("scroll", updateBottomState, { passive: true });
    window.addEventListener("resize", updateBottomState);

    return () => {
      window.removeEventListener("scroll", updateBottomState);
      window.removeEventListener("resize", updateBottomState);
    };
  }, [chapter]);

  const isFavorite = favoriteChapters.includes(chapter);

  function chooseChapter(nextChapter: number) {
    const safeChapter = Math.min(PSALM_COUNT, Math.max(1, nextChapter));
    setChapter(safeChapter);
    setTypedChapter(String(safeChapter));
    setIsPanelOpen(false);
    setOpenWordId(null);
    setUrlChapter(safeChapter);
  }

  function submitTypedChapter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = Number.parseInt(typedChapter, 10);
    if (Number.isFinite(parsed)) {
      chooseChapter(parsed);
    }
  }

  function toggleFavorite() {
    setFavoriteChapters((current) => {
      const next = current.includes(chapter)
        ? current.filter((item) => item !== chapter)
        : [...current, chapter].sort((first, second) => first - second);

      saveFavorites(next);
      return next;
    });
  }

  return (
    <main className={`app-shell${isDesktopPanelHidden ? " panel-hidden" : ""}`}>
      <button
        type="button"
        className="desktop-panel-toggle"
        onClick={() => setIsDesktopPanelHidden((current) => !current)}
        aria-label={isDesktopPanelHidden ? "Show reader controls" : "Hide reader controls"}
        aria-pressed={isDesktopPanelHidden}
      >
        {isDesktopPanelHidden ? <Menu size={20} /> : <X size={20} />}
      </button>

      <button
        type="button"
        className="mobile-panel-toggle"
        onClick={() => setIsPanelOpen(true)}
        aria-label="Open reader controls"
      >
        <BookOpen size={20} />
      </button>

      <aside className={`reader-panel${isPanelOpen ? " open" : ""}`}>
        <button
          type="button"
          className="panel-close"
          onClick={() => setIsPanelOpen(false)}
          aria-label="Close reader controls"
        >
          <X size={20} />
        </button>

        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <BookOpen size={22} />
          </span>
          <div>
            <p className="eyebrow">Tanakh / Ketuvim</p>
            <h1>Tehilim Reader</h1>
          </div>
        </div>

        <form className="chapter-search" onSubmit={submitTypedChapter}>
          <label htmlFor="chapter-input">Psalm</label>
          <div className="chapter-input-row">
            <Search size={18} aria-hidden="true" />
            <input
              id="chapter-input"
              inputMode="numeric"
              min={1}
              max={150}
              value={typedChapter}
              onChange={(event) => setTypedChapter(event.target.value)}
              aria-label="Psalm chapter number"
            />
            <button type="submit">Go</button>
          </div>
        </form>

        <button
          type="button"
          className={`favorite-toggle${isFavorite ? " active" : ""}`}
          onClick={toggleFavorite}
          aria-pressed={isFavorite}
        >
          <Star size={18} fill={isFavorite ? "currentColor" : "none"} />
          <span>{isFavorite ? "Saved to favorites" : "Save this psalm"}</span>
        </button>

        <div className="favorites-block">
          <div className="favorites-heading">
            <span>Favorites</span>
            <span>{favoriteChapters.length}</span>
          </div>
          {favoriteChapters.length ? (
            <div className="favorites-grid" aria-label="Favorite psalms">
              {favoriteChapters.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={item === chapter ? "active" : ""}
                  onClick={() => chooseChapter(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          ) : (
            <p className="favorites-empty">Save a psalm to keep it here.</p>
          )}
        </div>

        <p className="source-note">
          Hebrew word data is loaded locally from MACULA Hebrew (CC BY 4.0). English is
          loaded from Sefaria.
        </p>
      </aside>

      <section className="text-area" aria-live="polite">
        <button
          type="button"
          className={`page-nav page-nav-prev${isNearBottom ? " near-bottom" : ""}`}
          onClick={() => chooseChapter(chapter - 1)}
          disabled={chapter <= 1}
          aria-label="Previous psalm"
        >
          <ChevronLeft size={28} />
        </button>
        <button
          type="button"
          className={`page-nav page-nav-next${isNearBottom ? " near-bottom" : ""}`}
          onClick={() => chooseChapter(chapter + 1)}
          disabled={chapter >= PSALM_COUNT}
          aria-label="Next psalm"
        >
          <ChevronRight size={28} />
        </button>

        <header className="text-header">
          <div>
            <p className="eyebrow">Sefer Tehilim</p>
            <h2>Psalm {chapter}</h2>
          </div>
            {loadState.status === "loading" ? (
              <span className="status">
                <Loader2 size={18} className="spin" />
                Loading
              </span>
            ) : null}
        </header>

        {loadState.status === "error" ? (
          <div className="notice" role="alert">
            Sefaria text could not be loaded right now. {loadState.error}
          </div>
        ) : (
          <div className="verse-list">
            {loadState.verses.map((verse) => (
              <VerseCard
                key={`${chapter}-${verse.number}`}
                verse={verse}
                chapter={chapter}
                openWordId={openWordId}
                setOpenWordId={setOpenWordId}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function getInitialChapter(): number {
  const params = new URLSearchParams(window.location.search);
  const parsed = Number.parseInt(params.get("psalm") ?? "", 10);

  if (!Number.isFinite(parsed)) {
    return 1;
  }

  return Math.min(PSALM_COUNT, Math.max(1, parsed));
}

function setUrlChapter(chapter: number) {
  const url = new URL(window.location.href);
  url.searchParams.set("psalm", String(chapter));
  window.history.replaceState(null, "", url);
}

function loadFavorites(): number[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) ?? "[]") as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is number => Number.isInteger(item) && item >= 1 && item <= PSALM_COUNT)
      .filter((item, index, list) => list.indexOf(item) === index)
      .sort((first, second) => first - second);
  } catch (error) {
    console.warn("Could not load favorites", error);
    return [];
  }
}

function saveFavorites(favorites: number[]) {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  } catch (error) {
    console.warn("Could not save favorites", error);
  }
}

function VerseCard({
  verse,
  chapter,
  openWordId,
  setOpenWordId,
}: {
  verse: Verse;
  chapter: number;
  openWordId: string | null;
  setOpenWordId: (wordId: string | null) => void;
}) {
  const words = verse.words ?? tokenizeHebrewWords(stripCantillation(verse.hebrew));
  const [showTranslation, setShowTranslation] = useState(false);

  return (
    <article className="verse-card">
      <button
        type="button"
        className={`verse-number${showTranslation ? " active" : ""}`}
        onClick={(event) => {
          event.stopPropagation();
          setShowTranslation((current) => !current);
        }}
        aria-expanded={showTranslation}
        aria-label={
          showTranslation
            ? `Hide translation for verse ${verse.number}`
            : `Show translation for verse ${verse.number}`
        }
        title={showTranslation ? "Hide translation" : "Show translation"}
      >
        {verse.number}
      </button>
      <div className="interlinear" dir="rtl" lang="he" aria-label={`Psalm verse ${verse.number}`}>
        {words.map((word, index) => (
          <WordPair
            word={typeof word === "string" ? word : word.text}
            maculaWord={typeof word === "string" ? undefined : word}
            wordId={`${chapter}-${verse.number}-${index}`}
            isDetailsOpen={openWordId === `${chapter}-${verse.number}-${index}`}
            setOpenWordId={setOpenWordId}
            key={`${typeof word === "string" ? word : word.text}-${index}`}
          />
        ))}
      </div>
      {showTranslation && verse.english ? (
        <p className="translation">
          <span>Translation</span>
          {verse.english}
        </p>
      ) : null}
    </article>
  );
}

function WordPair({
  word,
  maculaWord,
  wordId,
  isDetailsOpen,
  setOpenWordId,
}: {
  word: string;
  maculaWord?: MaculaWord;
  wordId: string;
  isDetailsOpen: boolean;
  setOpenWordId: (wordId: string | null) => void;
}) {
  const lookupParts = useMemo(() => getLookupParts(word), [word]);
  const transliterationParts = useMemo(
    () => getTransliterationParts(word, lookupParts, maculaWord),
    [lookupParts, maculaWord, word],
  );

  return (
    <span className="word-pair">
      <button
        type="button"
        className="word-trigger"
        onClick={(event) => {
          event.stopPropagation();
          setOpenWordId(isDetailsOpen ? null : wordId);
        }}
        aria-expanded={isDetailsOpen}
      >
      <span className="hebrew-word">{word}</span>
      <span
        className={`transliteration${transliterationParts.length > 1 ? " compound" : ""}`}
        dir={transliterationParts.length > 1 ? "rtl" : "ltr"}
        lang="en"
      >
        <CompoundParts parts={transliterationParts} className="transliteration-part" />
      </span>
      </button>
      {isDetailsOpen && maculaWord ? (
        <WordDetails word={word} maculaWord={maculaWord} onClose={() => setOpenWordId(null)} />
      ) : null}
    </span>
  );
}

function WordDetails({
  word,
  maculaWord,
  onClose,
}: {
  word: string;
  maculaWord: MaculaWord;
  onClose: () => void;
}) {
  return (
    <span
      className="word-popover"
      dir="ltr"
      lang="en"
      onClick={(event) => event.stopPropagation()}
    >
      <span className="word-popover-header">
        <span dir="rtl" lang="he">
          {word}
        </span>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          aria-label="Close word details"
        >
          <X size={16} />
        </button>
      </span>
      <span className="word-popover-list">
        {maculaWord.parts.map((part, index) => (
          <span className="word-popover-row" key={`${part.text}-${index}`}>
            <span dir="rtl" lang="he">
              {part.text}
            </span>
            <span>{getPopoverPartPronunciation(part)}</span>
            <strong>{getPopoverMeaning(part)}</strong>
          </span>
        ))}
      </span>
    </span>
  );
}

function getPopoverMeaning(part: MaculaWordPart): string {
  const range = MEANING_RANGES[normalizeHebrew(part.lemma)] ?? MEANING_RANGES[normalizeHebrew(part.text)];

  if (range?.length) {
    return range.join(" / ");
  }

  return part.gloss || "-";
}

function normalizeHebrew(value: string): string {
  return stripCantillation(value).replace(/[\u05B0-\u05BC\u05C1-\u05C2\u05C7]/g, "");
}

function getPopoverPartPronunciation(part: MaculaWordPart): string {
  const transliteration = makeReadableTransliteration(part.transliteration);

  if (transliteration) {
    return transliteration;
  }

  if (part.pos === "suffix") {
    return "[suffix]";
  }

  if (part.pos === "prefix") {
    return "[prefix]";
  }

  if (part.pos === "verb" || part.pos === "noun" || part.pos === "adjective") {
    return "[stem]";
  }

  return "[part]";
}

function CompoundParts({ parts, className }: { parts: string[]; className: string }) {
  // Maqef-joined words are rendered as separate segments spaced apart by the
  // flex gap on the container (a normal word space). The hyphen for the maqef
  // itself is intentionally omitted — it only affects pronunciation.
  return parts.map((part, index) => (
    <span className={`${className}-group`} dir="rtl" key={`${part}-${index}`}>
      <span className={className} dir="ltr">
        {part}
      </span>
    </span>
  ));
}

function tokenizeHebrewWords(value: string): string[] {
  return value.split(/\s+/).filter(Boolean);
}

function getLookupParts(word: string): string[] {
  return word
    .split(MAQQEF)
    .map((part) => part.trim())
    .filter(Boolean);
}

function getTransliterationParts(
  word: string,
  lookupParts: string[],
  maculaWord?: MaculaWord,
): string[] {
  // Each segment is one whole word; maqef-joined words are separate segments
  // (rendered with a space). Spaces *within* a segment separate the grammar
  // pieces of a single word (conjunction/preposition/article + stem), so we
  // join those with a hyphen and no space.
  return getTransliterationSegments(word, lookupParts, maculaWord).map((segment) =>
    segment.replace(/\s+/g, "-"),
  );
}

function getTransliterationSegments(
  word: string,
  lookupParts: string[],
  maculaWord?: MaculaWord,
): string[] {
  if (maculaWord?.parts.some((part) => stripCantillation(part.lemma) === "\u05D0\u05D3\u05E0\u05D9")) {
    return ["Adonai"];
  }

  if (maculaWord?.transliteration.length) {
    return maculaWord.transliteration.map(makeReadableTransliteration);
  }

  return lookupParts.map(safeTransliterate);
}

function safeTransliterate(value: string): string {
  try {
    return makeReadableTransliteration(transliterate(stripCantillation(value)));
  } catch (error) {
    console.warn("Transliteration failed", error);
    return "";
  }
}

function stripCantillation(value: string): string {
  return value
    .replace(/[\u0591-\u05AF\u05BD\u05BF\u05C0\u05C5]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function makeReadableTransliteration(scholarly: string): string {
  return scholarly
    .replace(/^adonai$/i, "Adonai")
    .replaceAll("yhwh", "Adonai")
    .replaceAll("Yhwh", "Adonai")
    .replace(/^\u02BE?\u0103?\u1E0F?\u014Dn\u0101y$/gi, "Adonai")
    .replace(/y[e\u0259]h[o\u014D]v[a\u0101]/gi, "Adonai")
    .replace(/\u02BE?\u0115?l\u014Dh\u00EEm/gi, "Elohim")
    .replace(/[\u02BE\u02BF]/g, "'")
    .replace(/[\u0101\u0103\u00E2]/g, "a")
    .replace(/[\u0113\u0115\u00EA]/g, "e")
    .replace(/[\u012B\u00EE]/g, "i")
    .replace(/[\u014D\u014F\u00F4]/g, "o")
    .replace(/[\u016B\u00FB]/g, "u")
    .replace(/[\u0259\u0115]/g, "e")
    .replace(/\u1E25/g, "ch")
    .replace(/\u1E2B/g, "ch")
    .replace(/\u1E35/g, "ch")
    .replace(/\u1E6D/g, "t")
    .replace(/\u1E63/g, "tz")
    .replace(/\u0161/g, "sh")
    .replace(/\u015B/g, "s")
    .replace(/\u1E0F/g, "d")
    .replace(/\u1E21/g, "g")
    .replace(/\u1E6F/g, "t")
    .replace(/\u1E07/g, "v")
    .replace(/iy/g, "i")
    .replace(/q/g, "k")
    .replace(/Q/g, "K")
    .replace(/w/g, "v")
    .replace(/W/g, "V")
    .replace(/p\u0304/g, "f")
    .replace(/k\u0304/g, "ch")
    .replace(/[\uA723]/g, "")
    .replace(/'/g, "")
    .replace(/[\u05C3]/g, "")
    .replace(/[\u1D2C-\u1D7F]/g, "")
    .replace(/[:]/g, "")
    .replace(/shsh/g, "sh")
    .replace(/tztz/g, "tz")
    .replace(/chch/g, "ch")
    .replace(/([bcdfghjklmnpqrstvxyz])\1/gi, "$1")
    .replace(/\s+([:;,.!?])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export default App;
