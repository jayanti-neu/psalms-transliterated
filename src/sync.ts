import type { NotesStore, PsalmNotes } from "./notes";

// The shape of the per-user synced document.
export type SyncData = {
  favorites: number[];
  notes: NotesStore;
};

// Merge a device's local data with whatever is already in the cloud. Used once
// when signing in on a device, so nothing is lost: favorites are unioned and
// notes that differ are kept (combined), rather than one side overwriting the
// other. After this initial merge, ongoing edits propagate as last-write-wins.
export function mergeSyncData(local: SyncData, remote: Partial<SyncData> | undefined): SyncData {
  if (!remote) {
    return local;
  }

  return {
    favorites: mergeFavorites(local.favorites, remote.favorites ?? []),
    notes: mergeNotes(local.notes, remote.notes ?? {}),
  };
}

function mergeFavorites(a: number[], b: number[]): number[] {
  return Array.from(new Set([...a, ...b])).sort((first, second) => first - second);
}

function mergeNotes(a: NotesStore, b: NotesStore): NotesStore {
  const result: NotesStore = {};
  const chapters = new Set(
    [...Object.keys(a), ...Object.keys(b)].map((key) => Number(key)),
  );

  for (const chapter of chapters) {
    const fromA = a[chapter];
    const fromB = b[chapter];

    if (!fromA) {
      result[chapter] = fromB;
    } else if (!fromB) {
      result[chapter] = fromA;
    } else {
      result[chapter] = mergePsalmNotes(fromA, fromB);
    }
  }

  return result;
}

function mergePsalmNotes(a: PsalmNotes, b: PsalmNotes): PsalmNotes {
  const verses: Record<number, string> = {};
  const verseNumbers = new Set(
    [...Object.keys(a.verses), ...Object.keys(b.verses)].map((key) => Number(key)),
  );

  for (const verse of verseNumbers) {
    verses[verse] = mergeText(a.verses[verse], b.verses[verse]);
  }

  return {
    psalm: mergeText(a.psalm, b.psalm),
    verses,
  };
}

// Keep both notes when they differ; otherwise take whichever side has text.
function mergeText(a: string | undefined, b: string | undefined): string {
  const left = (a ?? "").trim();
  const right = (b ?? "").trim();

  if (!left) {
    return right;
  }
  if (!right || left === right) {
    return left;
  }

  return `${left}\n\n${right}`;
}
