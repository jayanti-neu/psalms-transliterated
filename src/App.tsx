import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Languages,
  Loader2,
  Menu,
  NotebookPen,
  ScrollText,
  Search,
  Sparkles,
  StickyNote,
  Star,
  X,
} from "lucide-react";
import { transliterate } from "hebrew-transliteration";
import { useEffect, useMemo, useState } from "react";
import {
  COMMENTATORS,
  fetchVerseCommentary,
  type CommentarySource,
  type VerseCommentary,
} from "./commentary";
import type { MaculaWord, MaculaWordPart } from "./macula";
import {
  getPsalmNotes,
  loadNotes,
  saveNotes,
  withPsalmNote,
  withVerseNote,
  type NotesStore,
} from "./notes";
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
// Common small words the source data leaves without a gloss.
const KNOWN_PART_MEANINGS: Record<string, string> = {
  "\u05DB\u05DF": "so / thus", // \u05DB\u05DF
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
  const [grammarLens, setGrammarLens] = useState(false);
  const [showAllTranslations, setShowAllTranslations] = useState(false);
  const [favoriteChapters, setFavoriteChapters] = useState<number[]>(() => loadFavorites());
  const [notes, setNotes] = useState<NotesStore>(() => loadNotes());
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
              className={`grammar-toggle${grammarLens ? " active" : ""}`}
              onClick={() => setGrammarLens((current) => !current)}
              aria-pressed={grammarLens}
              title="Highlight grammar in the text"
            >
              <Sparkles size={16} />
              <span>Grammar</span>
            </button>
          </div>
        </header>

        {grammarLens ? (
          <div className="lens-legend">
            <span className="lens-key k-verb" title="Verbs — what someone does: walk, sit, knows.">
              action words
            </span>
            <span className="lens-key k-noun" title="Naming and describing words: man, way, wicked.">
              nouns
            </span>
            <span
              className="lens-key k-relationship"
              title="Show position or direction: in, to, on, from, with."
            >
              relationship words
            </span>
            <span
              className="lens-key k-connector"
              title="Join or flag things: and, but, the, not, who."
            >
              connectors &amp; markers
            </span>
            <span
              className="lens-key k-suffix"
              title="Attached endings meaning my / your / him / me."
            >
              endings
            </span>
            <span
              className="lens-key k-oflink"
              title="A word bound to the next one: “counsel of”, “way of”."
            >
              “… of …” link
            </span>
            <span className="lens-hint">Hover a label, or tap any word, to see what it means.</span>
          </div>
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
                grammarLens={grammarLens}
                showAllTranslations={showAllTranslations}
                note={chapterNotes.verses[verse.number] ?? ""}
                onNoteChange={updateVerseNote}
              />
            ))}
          </div>
        )}

        {loadState.status === "ready" ? (
          <PsalmNote chapter={chapter} value={chapterNotes.psalm} onChange={updatePsalmNote} />
        ) : null}
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
  grammarLens,
  showAllTranslations,
  note,
  onNoteChange,
}: {
  verse: Verse;
  chapter: number;
  openWordId: string | null;
  setOpenWordId: (wordId: string | null) => void;
  grammarLens: boolean;
  showAllTranslations: boolean;
  note: string;
  onNoteChange: (verseNumber: number, text: string) => void;
}) {
  const words = verse.words ?? tokenizeHebrewWords(stripCantillation(verse.hebrew));
  const [showTranslation, setShowTranslation] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [showCommentary, setShowCommentary] = useState(false);
  const [commentary, setCommentary] = useState<VerseCommentary | null>(null);
  const [commentaryStatus, setCommentaryStatus] = useState<"idle" | "loading" | "error">("idle");
  const [activeSource, setActiveSource] = useState<CommentarySource>("Steinsaltz");
  const shown = showTranslation || showAllTranslations;
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
      <button
        type="button"
        className={`verse-number${shown ? " active" : ""}`}
        onClick={(event) => {
          event.stopPropagation();
          setShowTranslation((current) => !current);
        }}
        aria-expanded={shown}
        aria-label={
          shown
            ? `Hide translation for verse ${verse.number}`
            : `Show translation for verse ${verse.number}`
        }
        title={shown ? "Hide translation" : "Show translation"}
      >
        {verse.number}
      </button>
      <button
        type="button"
        className={`verse-note-toggle${hasNote ? " has-note" : ""}`}
        onClick={(event) => {
          event.stopPropagation();
          setShowNote((current) => !current);
        }}
        aria-expanded={showNote}
        aria-controls={noteFieldId}
        aria-label={
          hasNote ? `Edit your note on verse ${verse.number}` : `Add a note to verse ${verse.number}`
        }
        title={hasNote ? "Edit your note" : "Add a note"}
      >
        <StickyNote size={16} />
      </button>
      <div className="interlinear" dir="rtl" lang="he" aria-label={`Psalm verse ${verse.number}`}>
        {words.map((word, index) => (
          <WordPair
            word={typeof word === "string" ? word : word.text}
            maculaWord={typeof word === "string" ? undefined : word}
            wordId={`${chapter}-${verse.number}-${index}`}
            isDetailsOpen={openWordId === `${chapter}-${verse.number}-${index}`}
            setOpenWordId={setOpenWordId}
            grammarLens={grammarLens}
            key={`${typeof word === "string" ? word : word.text}-${index}`}
          />
        ))}
      </div>
      {shown && verse.english ? (
        <p className="translation">
          <span>Translation</span>
          {verse.english}
        </p>
      ) : null}
      <div className="verse-tools">
        <button
          type="button"
          className={`commentary-toggle${showCommentary ? " active" : ""}`}
          onClick={(event) => {
            event.stopPropagation();
            if (!showCommentary && commentaryStatus === "error") {
              setCommentaryStatus("idle");
            }
            setShowCommentary((current) => !current);
          }}
          aria-expanded={showCommentary}
          aria-controls={commentaryId}
        >
          <ScrollText size={15} />
          <span>Commentary</span>
        </button>
      </div>
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
  grammarLens,
}: {
  word: string;
  maculaWord?: MaculaWord;
  wordId: string;
  isDetailsOpen: boolean;
  setOpenWordId: (wordId: string | null) => void;
  grammarLens: boolean;
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
      <span className="hebrew-word">
        {grammarLens && maculaWord ? (
          <ColoredHebrew word={word} maculaWord={maculaWord} />
        ) : (
          word
        )}
      </span>
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

// ---------------------------------------------------------------------------
// Grammar lens (prototype): color each *piece* of a word by what it does, so a
// word like בַּעֲצַת shows its prefix and its noun in different colors instead
// of one flat color for the whole word.
// ---------------------------------------------------------------------------

// Renders the Hebrew word as colored pieces. We walk the original text and the
// known parts together so any leftover characters (e.g. a maqef "־" that sits
// between parts) are kept as plain separators.
function ColoredHebrew({ word, maculaWord }: { word: string; maculaWord: MaculaWord }) {
  const segments = getHebrewSegments(word, maculaWord);

  if (!segments) {
    return <>{word}</>;
  }

  return (
    <>
      {segments.map((segment, index) => (
        <span className={segment.className} title={segment.title} key={`${segment.text}-${index}`}>
          {segment.text}
        </span>
      ))}
    </>
  );
}

type HebrewSegment = { text: string; className: string; title?: string };

function getHebrewSegments(word: string, maculaWord: MaculaWord): HebrewSegment[] | null {
  const hostsSuffix = maculaWord.parts.some((part) => part.pos === "suffix");
  const segments: HebrewSegment[] = [];
  let cursor = 0;

  for (const part of maculaWord.parts) {
    if (!part.text) continue;

    const index = word.indexOf(part.text, cursor);
    if (index === -1) {
      // Text and parts didn't line up — fall back to the plain word.
      return null;
    }

    if (index > cursor) {
      segments.push({ text: word.slice(cursor, index), className: "hebrew-seg" });
    }
    segments.push({
      text: part.text,
      className: `hebrew-seg ${getPartClasses(part, hostsSuffix)}`,
      title: isOfLinkPart(part, hostsSuffix)
        ? "“…-of” — this word is bound to the next one"
        : undefined,
    });
    cursor = index + part.text.length;
  }

  if (cursor < word.length) {
    segments.push({ text: word.slice(cursor), className: "hebrew-seg" });
  }

  return segments;
}

// A "bound" (construct) noun/adjective means "X of …" and links to the next
// word — unless it instead carries its own possessive ending ("your rod").
function isOfLinkPart(part: MaculaWordPart, hostsSuffix: boolean): boolean {
  return (
    (part.pos === "noun" || part.pos === "adjective") &&
    part.morph?.[4] === "c" &&
    !hostsSuffix
  );
}

// The color/role classes for one piece of a word. A piece can be both a kind
// (noun) and a link ("of"), e.g. a bound noun gets seg-noun + seg-oflink.
function getPartClasses(part: MaculaWordPart, hostsSuffix: boolean): string {
  const classes: string[] = [];

  switch (part.pos) {
    case "verb":
      classes.push("seg-verb");
      break;
    case "preposition":
    case "prefix":
      classes.push("seg-relationship");
      break;
    case "conjunction":
    case "particle":
      classes.push("seg-connector");
      break;
    case "suffix":
      classes.push("seg-suffix");
      break;
    default:
      // noun, adjective, pronoun, etc. — the main "content" words.
      classes.push("seg-noun");
  }

  if (isOfLinkPart(part, hostsSuffix)) {
    classes.push("seg-oflink");
  }

  return classes.join(" ");
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
