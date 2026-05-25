const STRIP_MARKS = /[\u0591-\u05C7]/g;
const STRIP_PUNCTUATION = /[\u05BE\u05C3.,;:!?()[\]{}"']/g;

const BASE_GLOSSES: Record<string, string> = {
  "\u05E2\u05E6\u05D4": "counsel",
  "\u05E2\u05E6\u05EA": "counsel of",
  אדני: "Adonai",
  אדוני: "Adonai",
  אלהים: "God",
  אל: "God",
  יהוה: "Adonai",
  יהוהי: "Adonai",
  טוב: "good",
  חסד: "kindness",
  אמת: "truth",
  שלום: "peace",
  עולם: "forever",
  שמים: "heavens",
  ארץ: "earth",
  מים: "water",
  נפש: "soul",
  נפשי: "my soul",
  לב: "heart",
  לבי: "my heart",
  יד: "hand",
  ידי: "my hand",
  ראש: "head",
  בית: "house",
  ביתי: "my house",
  מלך: "king",
  דוד: "David",
  ישראל: "Israel",
  תורה: "Torah",
  שם: "name",
  שמו: "His name",
  יום: "day",
  ימי: "days of",
  לילה: "night",
  אור: "light",
  דרך: "way",
  דרךי: "my way",
  צדיק: "righteous",
  צדק: "righteousness",
  רשע: "wicked",
  רשעים: "wicked ones",
  איש: "person",
  עם: "people",
  גוי: "nation",
  גוים: "nations",
  אויב: "enemy",
  אויבי: "my enemy",
  צר: "foe",
  צררי: "my foes",
  עבד: "servant",
  עבדך: "Your servant",
  קול: "voice",
  עין: "eye",
  עיני: "my eyes",
  אזן: "ear",
  הר: "mountain",
  הרים: "mountains",
  עיר: "city",
  ציון: "Zion",
  ירושלים: "Jerusalem",
  כסא: "throne",
  משפט: "justice",
  חכמה: "wisdom",
  יראה: "awe",
  ירא: "fears",
  יראי: "those who fear",
  בטח: "trust",
  מבטח: "trust",
  צור: "rock",
  סלע: "rock",
  מגן: "shield",
  רעה: "shepherd",
  רעי: "my shepherd",
  מזמור: "psalm",
  שיר: "song",
  הללויה: "Halleluyah",
  ברך: "bless",
  ברכי: "bless",
  אשרי: "happy",
  אשר: "that",
  לא: "not",
  כי: "for",
  גם: "also",
  אך: "only",
  כל: "all",
  מן: "from",
  על: "upon",
  עד: "until",
  לפני: "before me",
  לך: "to You",
  לי: "to me",
  בי: "in me",
  בו: "in him",
  בם: "in them",
  הוא: "he",
  היא: "she",
  אתה: "You",
  אני: "I",
  המה: "they",
  אנחנו: "we",
  ישב: "sit/dwell",
  שבתי: "I shall dwell",
  הלך: "walk",
  אלך: "I walk",
  נחם: "comfort",
  ינחמני: "comfort me",
  נחה: "guide",
  ינחני: "guide me",
  רדף: "pursue",
  ירדפוני: "pursue me",
  פחד: "fear",
  אירא: "I fear",
  חיה: "life",
  חיי: "my life",
  ימים: "days",
};

const PREFIXES: Record<string, string> = {
  ו: "and",
  ב: "in",
  ל: "to",
  כ: "like",
  מ: "from",
  ה: "the",
};

const SUFFIXES = [
  "\u05E0\u05D9",
  "\u05EA\u05D9",
  "\u05DB\u05DD",
  "\u05DB\u05DF",
  "\u05D9\u05DB\u05DD",
  "\u05D9\u05DB\u05DF",
  "\u05D9\u05D5",
  "\u05D9\u05D4",
  "\u05D9",
  "\u05D5",
  "\u05DA",
  "\u05DB\u05DA",
  "\u05DD",
  "\u05DF",
  "\u05D4",
];

type SefariaLexiconEntry = {
  parent_lexicon?: string;
  content?: {
    senses?: LexiconSense[];
  };
  language_code?: string;
};

type LexiconSense = {
  definition?: string;
  senses?: LexiconSense[];
};

const remoteGlossCache = new Map<string, Promise<string | null>>();

export function getLocalWordGloss(word: string): string | null {
  const normalized = normalizeHebrewWord(word);
  if (!normalized) {
    return null;
  }

  if (BASE_GLOSSES[normalized]) {
    return BASE_GLOSSES[normalized];
  }

  const prefixedGloss = getPrefixedGloss(normalized);
  if (prefixedGloss) {
    return prefixedGloss;
  }

  return null;
}

export async function getRemoteWordGloss(word: string): Promise<string | null> {
  const normalized = normalizeHebrewWord(word);
  if (!normalized) {
    return null;
  }

  if (!remoteGlossCache.has(normalized)) {
    remoteGlossCache.set(normalized, fetchRemoteWordGloss(normalized));
  }

  return remoteGlossCache.get(normalized)!;
}

export function normalizeHebrewWord(word: string): string {
  return word.replace(STRIP_MARKS, "").replace(STRIP_PUNCTUATION, "").trim();
}

function getPrefixedGloss(word: string): string | null {
  if (word.length < 3) {
    return null;
  }

  const prefixes = Array.from(word.slice(0, 2)).filter((char) => PREFIXES[char]);

  for (let length = prefixes.length; length > 0; length -= 1) {
    const prefix = word.slice(0, length);
    const base = word.slice(length);
    const baseGloss = BASE_GLOSSES[base] ?? getSuffixGloss(base);

    if (baseGloss) {
      return `${Array.from(prefix)
        .map((char) => PREFIXES[char])
        .join(" ")} ${baseGloss}`;
    }
  }

  return null;
}

function getSuffixGloss(word: string): string | null {
  for (const suffix of SUFFIXES) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 2) {
      const base = word.slice(0, -suffix.length);
      if (BASE_GLOSSES[base]) {
        return BASE_GLOSSES[base];
      }
    }
  }

  return null;
}

async function fetchRemoteWordGloss(word: string): Promise<string | null> {
  const candidates = getLookupCandidates(word);

  for (const candidate of candidates) {
    const gloss = await fetchSefariaGloss(candidate);
    if (gloss) {
      return addPrefixGloss(word, candidate, gloss);
    }
  }

  return null;
}

function getLookupCandidates(word: string): string[] {
  const candidates = new Set<string>([word]);

  for (let length = 1; length <= 2 && length < word.length - 1; length += 1) {
    const prefix = word.slice(0, length);
    const base = word.slice(length);

    if (Array.from(prefix).every((char) => PREFIXES[char])) {
      candidates.add(base);
    }
  }

  return Array.from(candidates);
}

async function fetchSefariaGloss(word: string): Promise<string | null> {
  const response = await fetch(`https://www.sefaria.org/api/words/${encodeURIComponent(word)}`);
  if (!response.ok) {
    return null;
  }

  const entries = (await response.json()) as SefariaLexiconEntry[];
  const entry = chooseLexiconEntry(entries);
  const definition = entry ? extractDefinition(entry.content?.senses ?? []) : null;

  return definition ? cleanDefinition(definition) : null;
}

function chooseLexiconEntry(entries: SefariaLexiconEntry[]): SefariaLexiconEntry | null {
  const biblicalHebrew = entries.filter(
    (entry) =>
      entry.language_code === "heb" ||
      entry.parent_lexicon === "BDB Augmented Strong" ||
      entry.parent_lexicon === "BDB Dictionary",
  );

  return (
    biblicalHebrew.find((entry) => entry.parent_lexicon === "BDB Augmented Strong") ??
    biblicalHebrew.find((entry) => entry.parent_lexicon === "BDB Dictionary") ??
    entries.find((entry) => entry.parent_lexicon === "Klein Dictionary") ??
    entries[0] ??
    null
  );
}

function extractDefinition(senses: LexiconSense[]): string | null {
  for (const sense of senses) {
    if (sense.definition) {
      return sense.definition;
    }

    const nested = extractDefinition(sense.senses ?? []);
    if (nested) {
      return nested;
    }
  }

  return null;
}

function cleanDefinition(definition: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(definition, "text/html");
  const text = (doc.body.textContent ?? definition)
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const short = text.split(/[.;]/)[0] ?? text;
  return short.split(",").slice(0, 3).join(",").trim();
}

function addPrefixGloss(original: string, candidate: string, gloss: string): string {
  if (original === candidate) {
    return gloss;
  }

  const prefix = getMatchedPrefix(original, candidate);
  const prefixGloss = Array.from(prefix)
    .map((char) => PREFIXES[char])
    .filter(Boolean)
    .join(" ");

  return prefixGloss ? `${prefixGloss} ${gloss}` : gloss;
}

function getMatchedPrefix(original: string, candidate: string): string {
  for (let length = 0; length <= 2 && length < original.length; length += 1) {
    const prefix = original.slice(0, length);
    if (!Array.from(prefix).every((char) => PREFIXES[char])) {
      continue;
    }

    const remainder = original.slice(length);
    if (remainder === candidate || stripKnownSuffix(remainder) === candidate) {
      return prefix;
    }
  }

  return "";
}

function stripKnownSuffix(word: string): string {
  for (const suffix of SUFFIXES) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 2) {
      return word.slice(0, -suffix.length);
    }
  }

  return word;
}
