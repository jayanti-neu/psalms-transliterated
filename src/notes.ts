const NOTES_STORAGE_KEY = "tehilim-reader:notes";

// A user's private notes for one psalm: a single note on the whole psalm, plus
// a note per verse keyed by verse number.
export type PsalmNotes = {
  psalm: string;
  verses: Record<number, string>;
};

// All notes, keyed by chapter. Chapters with no notes are not stored.
export type NotesStore = Record<number, PsalmNotes>;

const EMPTY_NOTES: PsalmNotes = { psalm: "", verses: {} };

export function loadNotes(): NotesStore {
  try {
    const parsed = JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY) ?? "{}") as unknown;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    const store: NotesStore = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      const chapter = Number.parseInt(key, 10);
      if (!Number.isInteger(chapter)) {
        continue;
      }

      const entry = sanitizePsalmNotes(value);
      if (entry) {
        store[chapter] = entry;
      }
    }

    return store;
  } catch (error) {
    console.warn("Could not load notes", error);
    return {};
  }
}

export function saveNotes(store: NotesStore) {
  try {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    console.warn("Could not save notes", error);
  }
}

export function getPsalmNotes(store: NotesStore, chapter: number): PsalmNotes {
  return store[chapter] ?? EMPTY_NOTES;
}

// Return a new store with the whole-psalm note updated.
export function withPsalmNote(store: NotesStore, chapter: number, text: string): NotesStore {
  const current = store[chapter] ?? EMPTY_NOTES;
  return pruneChapter({ ...store, [chapter]: { ...current, psalm: text } }, chapter);
}

// Return a new store with one verse's note updated; an empty note is removed.
export function withVerseNote(
  store: NotesStore,
  chapter: number,
  verse: number,
  text: string,
): NotesStore {
  const current = store[chapter] ?? EMPTY_NOTES;
  const verses = { ...current.verses };

  if (text.trim()) {
    verses[verse] = text;
  } else {
    delete verses[verse];
  }

  return pruneChapter({ ...store, [chapter]: { ...current, verses } }, chapter);
}

function sanitizePsalmNotes(value: unknown): PsalmNotes | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const psalm = typeof record.psalm === "string" ? record.psalm : "";
  const verses: Record<number, string> = {};

  if (record.verses && typeof record.verses === "object") {
    for (const [key, note] of Object.entries(record.verses as Record<string, unknown>)) {
      const number = Number.parseInt(key, 10);
      if (Number.isInteger(number) && typeof note === "string" && note.trim()) {
        verses[number] = note;
      }
    }
  }

  if (!psalm.trim() && Object.keys(verses).length === 0) {
    return null;
  }

  return { psalm, verses };
}

// Drop a chapter's entry entirely once it has no psalm note and no verse notes,
// so an empty store stays empty.
function pruneChapter(store: NotesStore, chapter: number): NotesStore {
  const entry = store[chapter];

  if (entry && !entry.psalm.trim() && Object.keys(entry.verses).length === 0) {
    const { [chapter]: _removed, ...rest } = store;
    return rest;
  }

  return store;
}
