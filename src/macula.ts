export type MaculaWordPart = {
  text: string;
  transliteration: string;
  gloss: string;
  lemma: string;
  pos: string;
  morph: string;
};

export type MaculaWord = {
  text: string;
  transliteration: string[];
  gloss: string[];
  parts: MaculaWordPart[];
};

export type MaculaVerse = {
  number: number;
  hebrew: string;
  words: MaculaWord[];
};

type MaculaData = {
  source: {
    name: string;
    url: string;
    license: string;
  };
  chapters: Record<string, Record<string, MaculaWord[]>>;
};

let maculaDataPromise: Promise<MaculaData | null> | null = null;

export async function fetchMaculaPsalm(chapter: number): Promise<MaculaVerse[] | null> {
  const data = await getMaculaData();
  const psalm = data?.chapters[String(chapter)];

  if (!psalm) {
    return null;
  }

  return Object.entries(psalm)
    .map(([verseNumber, words]) => ({
      number: Number(verseNumber),
      hebrew: words.map((word) => word.text).join(" "),
      words,
    }))
    .sort((first, second) => first.number - second.number);
}

async function getMaculaData(): Promise<MaculaData | null> {
  maculaDataPromise ??= fetch(`${import.meta.env.BASE_URL}data/psalms-macula.json`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`MACULA data returned ${response.status}`);
      }

      return response.json() as Promise<MaculaData>;
    })
    .catch((error: unknown) => {
      console.warn("Could not load local MACULA Psalms data", error);
      return null;
    });

  return maculaDataPromise;
}
