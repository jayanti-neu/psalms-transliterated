import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Languages,
  Loader2,
  LogIn,
  LogOut,
  Menu,
  NotebookPen,
  ScrollText,
  Search,
  StickyNote,
  Star,
  X,
} from "lucide-react";
import { transliterate } from "hebrew-transliteration";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  COMMENTATORS,
  fetchVerseCommentary,
  type CommentarySource,
  type VerseCommentary,
} from "./commentary";
import {
  signInWithGoogle,
  signOutUser,
  subscribeUserDoc,
  watchAuth,
  writeUserDoc,
  type User,
} from "./firebase";
import type { MaculaWord, MaculaWordPart } from "./macula";
import {
  getPsalmNotes,
  loadNotes,
  saveNotes,
  withPsalmNote,
  withVerseNote,
  type NotesStore,
} from "./notes";
import { getPrayer, PRAYERS, type Prayer, type PrayerLine } from "./prayers";
import { getMonthlyReading, getWeeklyReading } from "./schedule";
import { fetchPsalm, type Verse } from "./sefaria";
import { mergeSyncData, type SyncData } from "./sync";

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
// Common small words the source data leaves without a gloss.
const KNOWN_PART_MEANINGS: Record<string, string> = {
  "\u05DB\u05DF": "so / thus", // \u05DB\u05DF
};

type LoadState =
  | { status: "loading"; verses: Verse[]; error: "" }
  | { status: "ready"; verses: Verse[]; error: "" }
  | { status: "error"; verses: Verse[]; error: string };

function App() {
  const initialView = getInitialView();
  const [chapter, setChapter] = useState(initialView.chapter);
  const [typedChapter, setTypedChapter] = useState(String(initialView.chapter));
  const [activePrayer, setActivePrayer] = useState<Prayer | null>(initialView.prayer);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isDesktopPanelHidden, setIsDesktopPanelHidden] = useState(true);
  const [isNearBottom, setIsNearBottom] = useState(false);
  const [openWordId, setOpenWordId] = useState<string | null>(null);
  const [showAllTranslations, setShowAllTranslations] = useState(false);
  const [showPsalmNote, setShowPsalmNote] = useState(false);
  const [favoriteChapters, setFavoriteChapters] = useState<number[]>(() => loadFavorites());
  const [notes, setNotes] = useState<NotesStore>(() => loadNotes());
  const [user, setUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string>("");
  const [syncError, setSyncError] = useState<string>("");
  const [loadState, setLoadState] = useState<LoadState>({
    status: "loading",
    verses: [],
    error: "",
  });

  // Keep the latest favorites/notes reachable from the sign-in merge, which
  // runs in an effect keyed only on `user` and would otherwise see stale values.
  const favoritesRef = useRef(favoriteChapters);
  const notesRef = useRef(notes);
  favoritesRef.current = favoriteChapters;
  notesRef.current = notes;
  // Serialized payload we last reconciled with the cloud, so we don't write
  // back data we just received (which would loop) or write unchanged data.
  const lastSyncedRef = useRef<string>("");
  const mergedOnceRef = useRef(false);

  useEffect(() => {
    // A prayer is showing its own content; no psalm to fetch.
    if (activePrayer) {
      return;
    }

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
  }, [chapter, activePrayer]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [chapter, activePrayer]);

  // Keep the document title and description in sync with the open text, so
  // shared links, browser history, and tabs are all meaningful.
  useEffect(() => {
    if (activePrayer) {
      document.title = `${activePrayer.title} — Hebrew & Transliteration | Tehilim Reader`;
      setMetaDescription(
        `${activePrayer.title} in Hebrew with English transliteration and translation.`,
      );
      return;
    }

    document.title = `Psalm ${chapter} — Hebrew & Transliteration | Tehilim Reader`;
    setMetaDescription(
      `Read Psalm ${chapter} (Tehilim ${chapter}) in Hebrew with English transliteration, translation, and Rashi & Steinsaltz commentary.`,
    );
  }, [chapter, activePrayer]);

  // Track the signed-in user.
  useEffect(() => watchAuth(setUser), []);

  // While signed in, keep favorites + notes in sync with the cloud. On first
  // connect we merge this device's data with the cloud (so nothing is lost);
  // afterwards, remote changes from another device flow in here.
  useEffect(() => {
    mergedOnceRef.current = false;
    if (!user) {
      return;
    }

    setSyncError("");
    const unsubscribe = subscribeUserDoc(
      user.uid,
      (remote) => {
        setSyncError("");
        if (!mergedOnceRef.current) {
          mergedOnceRef.current = true;
          const local: SyncData = { favorites: favoritesRef.current, notes: notesRef.current };
          const merged = mergeSyncData(local, remote as Partial<SyncData> | undefined);

          lastSyncedRef.current = JSON.stringify(merged);
          applySyncData(merged);
          writeUserDoc(user.uid, merged).catch((error: unknown) => {
            setSyncError((error as { code?: string })?.code ?? "Could not save to cloud.");
            console.warn("Could not write merged sync data", error);
          });
          return;
        }

        if (!remote) {
          return;
        }

        const incoming: SyncData = {
          favorites: (remote.favorites as number[]) ?? [],
          notes: (remote.notes as NotesStore) ?? {},
        };
        lastSyncedRef.current = JSON.stringify(incoming);
        applySyncData(incoming);
      },
      (error: unknown) => {
        setSyncError((error as { code?: string })?.code ?? "Sync connection failed.");
        console.warn("Sync subscription error", error);
      },
    );

    return () => unsubscribe();
    // applySyncData is stable (defined in component scope, no deps captured).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Push local favorites/notes changes up to the cloud (debounced), once the
  // initial merge has happened. Skips data we just received to avoid loops.
  useEffect(() => {
    if (!user || !mergedOnceRef.current) {
      return;
    }

    const payload = JSON.stringify({ favorites: favoriteChapters, notes });
    if (payload === lastSyncedRef.current) {
      return;
    }
    lastSyncedRef.current = payload;

    const timer = setTimeout(() => {
      writeUserDoc(user.uid, { favorites: favoriteChapters, notes }).catch((error: unknown) => {
        setSyncError((error as { code?: string })?.code ?? "Could not save to cloud.");
        console.warn("Could not sync to cloud", error);
      });
    }, 600);

    return () => clearTimeout(timer);
  }, [favoriteChapters, notes, user]);

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
  // Today's portions in the two traditional cycles. Computed once on mount so
  // the panel stays put while the reader navigates around within the day.
  const weeklyReading = useMemo(() => getWeeklyReading(), []);
  const monthlyReading = useMemo(() => getMonthlyReading(), []);

  function chooseChapter(nextChapter: number) {
    const safeChapter = Math.min(PSALM_COUNT, Math.max(1, nextChapter));
    setActivePrayer(null);
    setChapter(safeChapter);
    setTypedChapter(String(safeChapter));
    setIsPanelOpen(false);
    setOpenWordId(null);
    setUrlChapter(safeChapter);
  }

  function choosePrayer(prayer: Prayer) {
    setActivePrayer(prayer);
    setIsPanelOpen(false);
    setOpenWordId(null);
    setUrlPrayer(prayer.id);
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

  // Apply a synced snapshot to state and local storage (without re-triggering a
  // cloud write — the sync effects guard that via lastSyncedRef).
  function applySyncData(data: SyncData) {
    setFavoriteChapters(data.favorites);
    saveFavorites(data.favorites);
    setNotes(data.notes);
    saveNotes(data.notes);
  }

  function handleSignIn() {
    setAuthError("");
    signInWithGoogle().catch((error: unknown) => {
      const code = (error as { code?: string })?.code;
      const message = (error as { message?: string })?.message;
      setAuthError(code ?? message ?? "Sign-in failed.");
      console.warn("Sign-in failed", error);
    });
  }

  function handleSignOut() {
    signOutUser().catch((error) => console.warn("Sign-out failed", error));
  }

  function updatePsalmNote(text: string) {
    setNotes((current) => {
      const next = withPsalmNote(current, chapter, text);
      saveNotes(next);
      return next;
    });
  }

  function updateVerseNote(verseNumber: number, text: string) {
    setNotes((current) => {
      const next = withVerseNote(current, chapter, verseNumber, text);
      saveNotes(next);
      return next;
    });
  }

  const chapterNotes = getPsalmNotes(notes, chapter);
  const hasPsalmNote = chapterNotes.psalm.trim().length > 0;

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

        <div className="account-block">
          {user ? (
            <>
              <div className="account-info">
                <span className="account-name">{user.displayName ?? user.email ?? "Signed in"}</span>
                {syncError ? (
                  <span className="account-error">Sync error: {syncError}</span>
                ) : (
                  <span className="account-status">Notes &amp; favorites sync across your devices</span>
                )}
              </div>
              <button type="button" className="account-action" onClick={handleSignOut}>
                <LogOut size={16} />
                <span>Sign out</span>
              </button>
            </>
          ) : (
            <>
              <button type="button" className="account-action primary" onClick={handleSignIn}>
                <LogIn size={16} />
                <span>Sign in with Google</span>
              </button>
              {authError ? (
                <p className="account-error">{authError}</p>
              ) : (
                <p className="account-status">Sign in to sync notes &amp; favorites across devices.</p>
              )}
            </>
          )}
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

        <div className="today-block">
          <div className="today-heading">
            <CalendarDays size={16} aria-hidden="true" />
            <span>Today&rsquo;s Tehilim</span>
          </div>
          <TodayReadingRow
            cycle="Weekly"
            when={weeklyReading.dayName}
            portion={weeklyReading.portion}
            chapter={chapter}
            onSelect={chooseChapter}
          />
          <TodayReadingRow
            cycle="Monthly"
            when={monthlyReading.hebrewDate}
            portion={monthlyReading.portion}
            chapter={chapter}
            onSelect={chooseChapter}
          />
        </div>

        <div className="today-block">
          <div className="today-heading">
            <ScrollText size={16} aria-hidden="true" />
            <span>Prayers</span>
          </div>
          {PRAYERS.map((prayer) => (
            <button
              key={prayer.id}
              type="button"
              className={`today-row${activePrayer?.id === prayer.id ? " active" : ""}`}
              onClick={() => choosePrayer(prayer)}
              aria-current={activePrayer?.id === prayer.id ? "true" : undefined}
            >
              <span className="today-cycle">{prayer.title}</span>
              {prayer.hebrewTitle ? (
                <span className="today-range" dir="rtl" lang="he">
                  {prayer.hebrewTitle}
                </span>
              ) : null}
            </button>
          ))}
        </div>

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
                  className={!activePrayer && item === chapter ? "active" : ""}
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
        {!activePrayer ? (
          <>
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
          </>
        ) : null}

        {activePrayer ? (
          <>
            <header className="text-header">
              <div>
                <p className="eyebrow">
                  Prayer
                  {activePrayer.hebrewTitle ? (
                    <>
                      {" · "}
                      <span dir="rtl" lang="he">
                        {activePrayer.hebrewTitle}
                      </span>
                    </>
                  ) : null}
                </p>
                <h2>{activePrayer.title}</h2>
                {activePrayer.subtitle ? (
                  <p className="text-subtitle">{activePrayer.subtitle}</p>
                ) : null}
              </div>
              <div className="text-header-actions">
                <button
                  type="button"
                  className={`grammar-toggle${showAllTranslations ? " active" : ""}`}
                  onClick={() => setShowAllTranslations((current) => !current)}
                  aria-pressed={showAllTranslations}
                  title={showAllTranslations ? "Hide all translations" : "Show all translations"}
                >
                  <Languages size={16} />
                  <span>{showAllTranslations ? "Hide all" : "Translate all"}</span>
                </button>
              </div>
            </header>
            <PrayerText prayer={activePrayer} showAllTranslations={showAllTranslations} />
          </>
        ) : (
          <>
        <header className="text-header">
          <div>
            <p className="eyebrow">Sefer Tehilim</p>
            <h2>Psalm {chapter}</h2>
          </div>
          <div className="text-header-actions">
            {loadState.status === "loading" ? (
              <span className="status">
                <Loader2 size={18} className="spin" />
                Loading
              </span>
            ) : null}
            <button
              type="button"
              className={`grammar-toggle${showAllTranslations ? " active" : ""}`}
              onClick={() => setShowAllTranslations((current) => !current)}
              aria-pressed={showAllTranslations}
              title={showAllTranslations ? "Hide all translations" : "Show all translations"}
            >
              <Languages size={16} />
              <span>{showAllTranslations ? "Hide all" : "Translate all"}</span>
            </button>
            <button
              type="button"
              className={`grammar-toggle${showPsalmNote ? " active" : ""}${
                hasPsalmNote ? " has-note" : ""
              }`}
              onClick={() => setShowPsalmNote((current) => !current)}
              aria-pressed={showPsalmNote}
              title={showPsalmNote ? "Hide your notes" : "Show your notes"}
            >
              <StickyNote size={16} />
              <span>Notes</span>
            </button>
          </div>
        </header>

        {loadState.status === "ready" && showPsalmNote ? (
          <PsalmNote chapter={chapter} value={chapterNotes.psalm} onChange={updatePsalmNote} />
        ) : null}

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
                showAllTranslations={showAllTranslations}
                note={chapterNotes.verses[verse.number] ?? ""}
                onNoteChange={updateVerseNote}
              />
            ))}
          </div>
        )}

          </>
        )}
      </section>
    </main>
  );
}

// Resolves the initial view from the URL: a prayer (/prayer/<id>/) if the path
// names a known one, otherwise a psalm. Chapter is always resolved too so
// leaving a prayer falls back to a sensible psalm.
function getInitialView(): { chapter: number; prayer: Prayer | null } {
  const prayerId = readPrayerFromPath();
  return {
    chapter: getInitialChapter(),
    prayer: prayerId ? getPrayer(prayerId) ?? null : null,
  };
}

// Reads the prayer id from a "<base>prayer/<id>/" path, or "" if not one.
function readPrayerFromPath(): string {
  const base = import.meta.env.BASE_URL;
  const path = window.location.pathname.startsWith(base)
    ? window.location.pathname.slice(base.length)
    : window.location.pathname.replace(/^\//, "");
  const match = path.match(/^prayer\/([\w-]+)/);
  return match ? match[1] : "";
}

function getInitialChapter(): number {
  // Prefer the SEO-friendly path (/psalm/23/); fall back to the legacy ?psalm=23
  // query so older bookmarks and shared links keep working.
  const fromPath = readChapterFromPath();
  if (fromPath) {
    return clampChapter(fromPath);
  }

  const fromQuery = Number.parseInt(
    new URLSearchParams(window.location.search).get("psalm") ?? "",
    10,
  );
  return Number.isFinite(fromQuery) ? clampChapter(fromQuery) : 1;
}

// Reads the chapter from a "<base>psalm/<n>/" path, or 0 if the path isn't one.
function readChapterFromPath(): number {
  const base = import.meta.env.BASE_URL;
  const path = window.location.pathname.startsWith(base)
    ? window.location.pathname.slice(base.length)
    : window.location.pathname.replace(/^\//, "");
  const match = path.match(/^psalm\/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function clampChapter(chapter: number): number {
  return Math.min(PSALM_COUNT, Math.max(1, chapter));
}

function setUrlChapter(chapter: number) {
  // Real path per psalm so each has its own crawlable, shareable URL.
  const url = `${import.meta.env.BASE_URL}psalm/${chapter}/`;
  window.history.replaceState(null, "", url);
}

function setUrlPrayer(id: string) {
  const url = `${import.meta.env.BASE_URL}prayer/${id}/`;
  window.history.replaceState(null, "", url);
}

function setMetaDescription(content: string) {
  document.querySelector('meta[name="description"]')?.setAttribute("content", content);
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

function TodayReadingRow({
  cycle,
  when,
  portion,
  chapter,
  onSelect,
}: {
  cycle: string;
  when: string;
  portion: { from: number; to: number; rangeLabel: string };
  chapter: number;
  onSelect: (chapter: number) => void;
}) {
  // Highlight when the reader is already inside today's portion.
  const isActive = chapter >= portion.from && chapter <= portion.to;
  // A verse-range portion (Psalm 119 split) keeps a single-psalm label.
  const noun = portion.rangeLabel.includes(":") ? "Psalm" : "Psalms";

  return (
    <button
      type="button"
      className={`today-row${isActive ? " active" : ""}`}
      onClick={() => onSelect(portion.from)}
      aria-current={isActive ? "true" : undefined}
      title={`Read ${noun.toLowerCase()} ${portion.rangeLabel}`}
    >
      <span className="today-cycle">
        {cycle} <span className="today-when">· {when}</span>
      </span>
      <span className="today-range">
        {noun} {portion.rangeLabel}
      </span>
    </button>
  );
}

// Renders a prayer in the same interlinear style as the psalms. There's no
// MACULA morphology for these texts, so words show paired Hebrew +
// transliteration without the per-word grammar popover.
function PrayerText({
  prayer,
  showAllTranslations,
}: {
  prayer: Prayer;
  showAllTranslations: boolean;
}) {
  return (
    <>
      {prayer.note ? <p className="prayer-intro">{prayer.note}</p> : null}
      <div className="verse-list">
        {prayer.lines.map((line) => (
          <PrayerLineCard key={line.number} line={line} showAllTranslations={showAllTranslations} />
        ))}
        {prayer.seal ? (
          <PrayerLineCard line={prayer.seal} showAllTranslations={showAllTranslations} seal />
        ) : null}
      </div>
    </>
  );
}

function PrayerLineCard({
  line,
  showAllTranslations,
  seal = false,
}: {
  line: PrayerLine;
  showAllTranslations: boolean;
  seal?: boolean;
}) {
  const [showTranslation, setShowTranslation] = useState(false);
  const shown = showTranslation || showAllTranslations;

  return (
    <article className={`verse-card${seal ? " prayer-seal" : ""}`}>
      {seal ? null : (
        <span className={`verse-number${shown ? " active" : ""}`} aria-hidden="true">
          {line.number}
        </span>
      )}
      <div
        className="interlinear"
        dir="rtl"
        lang="he"
        aria-label={seal ? "Closing line" : `Line ${line.number}`}
      >
        {line.words.map((word, index) => (
          <span className="word-pair" key={`${word.he}-${index}`}>
            <span className="word-trigger static">
              <span className="hebrew-word">{word.he}</span>
              <span className="transliteration" dir="ltr" lang="en">
                {word.tr}
              </span>
            </span>
          </span>
        ))}
      </div>
      <div className="verse-tools">
        <button
          type="button"
          className={`verse-tool${shown ? " active" : ""}`}
          onClick={() => setShowTranslation((current) => !current)}
          aria-expanded={shown}
          title={shown ? "Hide translation" : "Show translation"}
        >
          <Languages size={14} />
          <span>Translation</span>
        </button>
      </div>
      {shown ? (
        <p className="translation">
          <span>Translation</span>
          {line.english}
        </p>
      ) : null}
      {line.note ? <p className="prayer-line-note">{line.note}</p> : null}
    </article>
  );
}

function VerseCard({
  verse,
  chapter,
  openWordId,
  setOpenWordId,
  showAllTranslations,
  note,
  onNoteChange,
}: {
  verse: Verse;
  chapter: number;
  openWordId: string | null;
  setOpenWordId: (wordId: string | null) => void;
  showAllTranslations: boolean;
  note: string;
  onNoteChange: (verseNumber: number, text: string) => void;
}) {
  const words = verse.words ?? tokenizeHebrewWords(stripCantillation(verse.hebrew));
  // Only one of translation / commentary / note is open per verse at a time.
  const [openPanel, setOpenPanel] = useState<"translation" | "commentary" | "note" | null>(null);
  const [commentary, setCommentary] = useState<VerseCommentary | null>(null);
  const [commentaryStatus, setCommentaryStatus] = useState<"idle" | "loading" | "error">("idle");
  const [activeSource, setActiveSource] = useState<CommentarySource>("Steinsaltz");
  const showTranslation = openPanel === "translation";
  const showCommentary = openPanel === "commentary";
  const showNote = openPanel === "note";
  const shown = showTranslation || showAllTranslations;

  function togglePanel(panel: "translation" | "commentary" | "note") {
    setOpenPanel((current) => (current === panel ? null : panel));
  }
  const hasNote = note.trim().length > 0;
  const noteFieldId = `note-${chapter}-${verse.number}`;
  const commentaryId = `commentary-${chapter}-${verse.number}`;

  // Fetch commentary the first time a reader opens it for this verse. Only fire
  // while idle so a failed request doesn't immediately retry in a loop;
  // reopening the panel resets to idle to allow a fresh attempt.
  //
  // Note: we deliberately do NOT cancel on cleanup. The effect re-runs as soon
  // as setCommentaryStatus("loading") flips the status (it's a dependency), and
  // a cancel-on-cleanup flag would then abort the in-flight request — which is
  // exactly what made the first-opened verse (whose fetch waits on the one-time
  // bundle download) spin forever. Setting state after unmount is a harmless
  // no-op in React 18.
  useEffect(() => {
    if (!showCommentary || commentary || commentaryStatus !== "idle") {
      return;
    }

    setCommentaryStatus("loading");

    fetchVerseCommentary(chapter, verse.number)
      .then((data) => {
        setCommentary(data);
        setCommentaryStatus("idle");
      })
      .catch(() => {
        setCommentaryStatus("error");
      });
  }, [showCommentary, commentary, commentaryStatus, chapter, verse.number]);

  const availableSources = commentary
    ? COMMENTATORS.filter((source) => commentary[source].length > 0)
    : [];
  const shownSource = availableSources.includes(activeSource)
    ? activeSource
    : availableSources[0];

  return (
    <article className="verse-card">
      <span className={`verse-number${shown ? " active" : ""}`} aria-hidden="true">
        {verse.number}
      </span>
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
      <div className="verse-tools">
        <button
          type="button"
          className={`verse-tool${shown ? " active" : ""}`}
          onClick={(event) => {
            event.stopPropagation();
            togglePanel("translation");
          }}
          aria-expanded={shown}
          disabled={!verse.english}
          title={
            verse.english
              ? shown
                ? "Hide translation"
                : "Show translation"
              : "No translation available"
          }
        >
          <Languages size={14} />
          <span>Translation</span>
        </button>
        <button
          type="button"
          className={`verse-tool${showCommentary ? " active" : ""}`}
          onClick={(event) => {
            event.stopPropagation();
            if (!showCommentary && commentaryStatus === "error") {
              setCommentaryStatus("idle");
            }
            togglePanel("commentary");
          }}
          aria-expanded={showCommentary}
          aria-controls={commentaryId}
        >
          <ScrollText size={14} />
          <span>Commentary</span>
        </button>
        <button
          type="button"
          className={`verse-tool${showNote ? " active" : ""}${hasNote ? " has-note" : ""}`}
          onClick={(event) => {
            event.stopPropagation();
            togglePanel("note");
          }}
          aria-expanded={showNote}
          aria-controls={noteFieldId}
          title={hasNote ? "Your note" : "Add a note"}
        >
          <StickyNote size={14} />
          <span>Note</span>
        </button>
      </div>
      {shown && verse.english ? (
        <p className="translation">
          <span>Translation</span>
          {verse.english}
        </p>
      ) : null}
      {showCommentary ? (
        <div className="verse-commentary" id={commentaryId} onClick={(event) => event.stopPropagation()}>
          {commentaryStatus === "loading" ? (
            <p className="commentary-status">
              <Loader2 size={16} className="spin" />
              Loading commentary…
            </p>
          ) : commentaryStatus === "error" ? (
            <p className="commentary-status">Commentary could not be loaded right now.</p>
          ) : commentary && shownSource ? (
            <>
              {availableSources.length > 1 ? (
                <div className="commentary-tabs" role="tablist">
                  {availableSources.map((source) => (
                    <button
                      key={source}
                      type="button"
                      role="tab"
                      aria-selected={source === shownSource}
                      className={`commentary-tab${source === shownSource ? " active" : ""}`}
                      onClick={() => setActiveSource(source)}
                    >
                      {source}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="commentary-source-label">{shownSource}</p>
              )}
              {commentary[shownSource].map((paragraph, index) => (
                <CommentaryText html={paragraph} key={index} />
              ))}
            </>
          ) : (
            <p className="commentary-status">No commentary available for this verse.</p>
          )}
        </div>
      ) : null}
      {showNote ? (
        <div className="verse-note" onClick={(event) => event.stopPropagation()}>
          <label htmlFor={noteFieldId}>Your note</label>
          <textarea
            id={noteFieldId}
            className="note-input"
            value={note}
            placeholder="Add a private note for this verse…"
            onChange={(event) => onNoteChange(verse.number, event.target.value)}
            rows={3}
            autoFocus
          />
          <div className="verse-note-actions">
            <button type="button" className="note-save" onClick={() => setOpenPanel(null)}>
              Save
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

// Renders one commentary segment, keeping Sefaria's inline formatting. Rashi
// marks the verse phrase it's explaining in bold (<b>) and quotes/terms in
// italics (<i>); we preserve those and strip footnote markers/notes.
const COMMENTARY_INLINE_TAGS = new Set(["B", "STRONG", "I", "EM"]);

function CommentaryText({ html }: { html: string }) {
  const nodes = useMemo(() => parseCommentaryHtml(html), [html]);
  return <p className="commentary-text">{nodes}</p>;
}

function parseCommentaryHtml(html: string): React.ReactNode[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc
    .querySelectorAll(".footnote, .footnote-marker, .mam-spi-pe, sup")
    .forEach((node) => node.remove());
  return commentaryNodes(doc.body);
}

function commentaryNodes(parent: Node): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];

  parent.childNodes.forEach((child, index) => {
    if (child.nodeType === Node.TEXT_NODE) {
      // Collapse runs of whitespace but keep a single space, so spacing between
      // adjacent formatted spans (e.g. "<b>x</b> <i>y</i>") isn't lost.
      const text = (child.textContent ?? "").replace(/\s+/g, " ");
      if (text) {
        nodes.push(text);
      }
      return;
    }

    if (child.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const element = child as Element;
    const inner = commentaryNodes(element);

    if (element.tagName === "B" || element.tagName === "STRONG") {
      nodes.push(<strong key={index}>{inner}</strong>);
    } else if (element.tagName === "I" || element.tagName === "EM") {
      nodes.push(<em key={index}>{inner}</em>);
    } else {
      // Unknown tag — keep its text, drop the wrapper.
      nodes.push(...inner);
    }
  });

  return nodes;
}

function PsalmNote({
  chapter,
  value,
  onChange,
}: {
  chapter: number;
  value: string;
  onChange: (text: string) => void;
}) {
  const fieldId = `psalm-note-${chapter}`;

  return (
    <section className="psalm-note" aria-label={`Your notes on Psalm ${chapter}`}>
      <header className="psalm-note-header">
        <NotebookPen size={18} aria-hidden="true" />
        <h3>
          <label htmlFor={fieldId}>Your notes on Psalm {chapter}</label>
        </h3>
      </header>
      <textarea
        id={fieldId}
        className="note-input"
        value={value}
        placeholder="Write your thoughts on this psalm…"
        onChange={(event) => onChange(event.target.value)}
        rows={4}
      />
    </section>
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
    <span className="word-pair" id={`word-${wordId}`}>
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
        {(() => {
          const hostsSuffix = maculaWord.parts.some((part) => part.pos === "suffix");
          return maculaWord.parts.map((part, index) => (
            <span className="word-popover-row" key={`${part.text}-${index}`}>
              <span dir="rtl" lang="he">
                {part.text}
              </span>
              <span>{getPopoverPartPronunciation(part)}</span>
              <strong>{getPopoverMeaning(part, isOfLinkPart(part, hostsSuffix))}</strong>
            </span>
          ));
        })()}
      </span>
    </span>
  );
}

function getPopoverMeaning(part: MaculaWordPart, isOfLink = false): string {
  const meaning = getBaseMeaning(part);

  // A bound ("construct") word means "X of …" — spell that out so the
  // underline on it reads correctly, e.g. "law" → "law of".
  if (isOfLink && meaning !== "-") {
    return `${meaning} of`;
  }

  return meaning;
}

function getBaseMeaning(part: MaculaWordPart): string {
  // Prefer the meaning this word actually has *here* (the contextual gloss)
  // over the generic dictionary list, so e.g. בְּ reads "through" in "through
  // the valley" rather than the confusing "in / with / by".
  if (part.gloss) {
    return part.gloss;
  }

  const range = MEANING_RANGES[normalizeHebrew(part.lemma)] ?? MEANING_RANGES[normalizeHebrew(part.text)];
  if (range?.length) {
    return range.join(" / ");
  }

  // Some small words have no gloss in the source data; fill in the common ones.
  const known = KNOWN_PART_MEANINGS[normalizeHebrew(part.lemma)] ?? KNOWN_PART_MEANINGS[normalizeHebrew(part.text)];
  if (known) {
    return known;
  }

  return "-";
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

// A "bound" (construct) noun/adjective means "X of …" and links to the next
// word — unless it instead carries its own possessive ending ("your rod").
// Used to spell out the "… of" meaning in the word-tap popover.
function isOfLinkPart(part: MaculaWordPart, hostsSuffix: boolean): boolean {
  return (
    (part.pos === "noun" || part.pos === "adjective") &&
    part.morph?.[4] === "c" &&
    !hostsSuffix
  );
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
    // Drop a word-final shewa (\u0259) \u2014 it's silent at the end of a word, so
    // "h\u0101la\u1E35\u0259" should read "halach", not "halache".
    .replace(/\u0259(?=:?\s*$)/g, "")
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
