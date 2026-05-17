import { BookOpen, ChevronLeft, ChevronRight, Loader2, Search, Sparkles } from "lucide-react";
import { transliterate } from "hebrew-transliteration";
import { useEffect, useMemo, useState } from "react";
import { fetchPsalm, type Verse } from "./sefaria";
import { getLocalWordGloss, getRemoteWordGloss } from "./glossary";

const PSALM_COUNT = 150;
const featuredChapters = [1, 16, 23, 27, 30, 51, 91, 100, 121, 130, 145, 150];

type LoadState =
  | { status: "loading"; verses: Verse[]; error: "" }
  | { status: "ready"; verses: Verse[]; error: "" }
  | { status: "error"; verses: Verse[]; error: string };

function App() {
  const [chapter, setChapter] = useState(23);
  const [typedChapter, setTypedChapter] = useState("23");
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

  const chapterOptions = useMemo(
    () => Array.from({ length: PSALM_COUNT }, (_, index) => index + 1),
    [],
  );

  function chooseChapter(nextChapter: number) {
    const safeChapter = Math.min(PSALM_COUNT, Math.max(1, nextChapter));
    setChapter(safeChapter);
    setTypedChapter(String(safeChapter));
  }

  function submitTypedChapter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = Number.parseInt(typedChapter, 10);
    if (Number.isFinite(parsed)) {
      chooseChapter(parsed);
    }
  }

  return (
    <main className="app-shell">
      <aside className="reader-panel">
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

        <div className="stepper" aria-label="Chapter navigation">
          <button
            type="button"
            onClick={() => chooseChapter(chapter - 1)}
            disabled={chapter <= 1}
            aria-label="Previous psalm"
          >
            <ChevronLeft size={18} />
          </button>
          <strong>Psalm {chapter}</strong>
          <button
            type="button"
            onClick={() => chooseChapter(chapter + 1)}
            disabled={chapter >= PSALM_COUNT}
            aria-label="Next psalm"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="quick-grid" aria-label="Featured psalms">
          {featuredChapters.map((item) => (
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

        <select
          className="chapter-select"
          value={chapter}
          onChange={(event) => chooseChapter(Number(event.target.value))}
          aria-label="Choose any psalm"
        >
          {chapterOptions.map((item) => (
            <option key={item} value={item}>
              Psalm {item}
            </option>
          ))}
        </select>

        <p className="source-note">
          Hebrew and English are loaded from Sefaria. Transliteration is generated locally
          from the Hebrew and simplified for readable Jewish pronunciation.
        </p>
      </aside>

      <section className="text-area" aria-live="polite">
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
          ) : (
            <span className="status">
              <Sparkles size={18} />
              {loadState.verses.length} verses
            </span>
          )}
        </header>

        {loadState.status === "error" ? (
          <div className="notice" role="alert">
            Sefaria text could not be loaded right now. {loadState.error}
          </div>
        ) : (
          <div className="verse-list">
            {loadState.verses.map((verse) => (
              <VerseCard key={`${chapter}-${verse.number}`} verse={verse} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function VerseCard({ verse }: { verse: Verse }) {
  const words = tokenizeHebrewWords(stripCantillation(verse.hebrew));

  return (
    <article className="verse-card">
      <div className="verse-number">{verse.number}</div>
      <div className="interlinear" dir="rtl" lang="he" aria-label={`Psalm verse ${verse.number}`}>
        {words.map((word, index) => (
          <WordPair word={word} key={`${word}-${index}`} />
        ))}
      </div>
      <p className="english">{verse.english}</p>
    </article>
  );
}

function WordPair({ word }: { word: string }) {
  const localGloss = getLocalWordGloss(word);
  const [remoteGloss, setRemoteGloss] = useState<string | null>(null);
  const [isLoadingGloss, setIsLoadingGloss] = useState(!localGloss);

  useEffect(() => {
    let cancelled = false;

    if (localGloss) {
      setRemoteGloss(null);
      setIsLoadingGloss(false);
      return;
    }

    setIsLoadingGloss(true);
    getRemoteWordGloss(word)
      .then((gloss) => {
        if (!cancelled) {
          setRemoteGloss(gloss);
        }
      })
      .catch((error: unknown) => {
        console.warn("Sefaria lexicon lookup failed", error);
        if (!cancelled) {
          setRemoteGloss(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingGloss(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [localGloss, word]);

  const gloss = localGloss ?? remoteGloss ?? (isLoadingGloss ? "looking up" : "not found");

  return (
    <span className="word-pair">
      <span className="hebrew-word">{word}</span>
      <span className="transliteration" dir="ltr" lang="en">
        {safeTransliterate(word)}
      </span>
      <span className={`gloss${!localGloss && !remoteGloss ? " muted" : ""}`} dir="ltr" lang="en">
        {gloss}
      </span>
    </span>
  );
}

function tokenizeHebrewWords(value: string): string[] {
  return value.split(/\s+/).filter(Boolean);
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
    .replaceAll("yhwh", "Adonai")
    .replaceAll("Yhwh", "Adonai")
    .replace(/\u02BE?\u0103?\u1E0F?\u014Dn\u0101y/gi, "Adonai")
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
    .replace(/w/g, "v")
    .replace(/W/g, "V")
    .replace(/p\u0304/g, "f")
    .replace(/k\u0304/g, "ch")
    .replace(/[\uA723]/g, "")
    .replace(/'/g, "")
    .replace(/[\u05C3]/g, "")
    .replace(/shsh/g, "sh")
    .replace(/tztz/g, "tz")
    .replace(/chch/g, "ch")
    .replace(/([bcdfghjklmnpqrstvxyz])\1/gi, "$1")
    .replace(/\s+([:;,.!?])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export default App;
