import type { Progress } from "./progress";

export type PracticePrompt = {
  prompt: string;
  answer: string;
};

export type GrammarLesson = {
  id: string;
  level: number;
  title: string;
  concept: string;
  stage: string;
  objective: string;
  prerequisites: string[];
  explanation: string;
  model: {
    hebrew: string;
    translation: string;
    note: string;
  };
  practice: PracticePrompt[];
  unlock: {
    psalm: number;
    verse: number;
    hebrew: string;
    translation: string;
    note: string;
  };
};

const HALLELU_YAH = "\u05D4\u05B7\u05DC\u05B0\u05DC\u05D5\u05BC\u05BE\u05D9\u05B8\u05D4\u05BC";
const TOV_VACHESED = "\u05D8\u05D5\u05B9\u05D1 \u05D5\u05B8\u05D7\u05B6\u05E1\u05B6\u05D3";
const ACH_TOV_VACHESED = "\u05D0\u05B7\u05DA\u05B0 " + TOV_VACHESED;
const ERETZ = "\u05D0\u05B6\u05E8\u05B6\u05E5";
const HAARETZ = "\u05D4\u05B8\u05D0\u05B8\u05E8\u05B6\u05E5";
const KOL_HAARETZ = "\u05DB\u05BC\u05B8\u05DC\u05BE" + HAARETZ;
const LADONAI = "\u05DC\u05B7\u05D9\u05D4\u05D5\u05B8\u05D4";
const HARIU_LADONAI = "\u05D4\u05B8\u05E8\u05B4\u05D9\u05E2\u05D5\u05BC " + LADONAI;
const KOL_GOYIM = "\u05DB\u05BC\u05B8\u05DC\u05BE\u05D2\u05BC\u05D5\u05B9\u05D9\u05B4\u05DD";
const HALLELU_ET_ADONAI =
  "\u05D4\u05B7\u05DC\u05B0\u05DC\u05D5\u05BC \u05D0\u05B6\u05EA\u05BE\u05D9\u05B0\u05D4\u05D5\u05B8\u05D4";
const KI_TOV = "\u05DB\u05BC\u05B4\u05D9\u05BE\u05D8\u05D5\u05B9\u05D1";
const KI_TOV_ADONAI = KI_TOV + " \u05D9\u05B0\u05D4\u05D5\u05B8\u05D4";
const CHESED = "\u05D7\u05B6\u05E1\u05B6\u05D3";
const CHASDO = "\u05D7\u05B7\u05E1\u05B0\u05D3\u05BC\u05D5\u05B9";
const AL = "\u05E2\u05B7\u05DC";
const ALEINU = "\u05E2\u05B8\u05DC\u05B5\u05D9\u05E0\u05D5\u05BC";
const GAVAR_ALEINU_CHASDO =
  "\u05D2\u05B8\u05D1\u05B7\u05E8 " + ALEINU + " " + CHASDO;

export const GRAMMAR_CURRICULUM: GrammarLesson[] = [
  {
    id: "word-units-maqaf",
    level: 1,
    title: "Hebrew words can join together",
    concept: "Word units and maqaf",
    stage: "Orientation",
    objective: "Read Hebrew as right-to-left word units before analyzing grammar.",
    prerequisites: [],
    explanation:
      "Hebrew reads from right to left. Sometimes two words are tied together by a short line called a maqaf. Read them as one small phrase.",
    model: {
      hebrew: HALLELU_YAH,
      translation: "Praise Yah",
      note: "The line joins the command to the Divine name.",
    },
    practice: [
      {
        prompt: "What does the short line between words tell you?",
        answer: "Read the words as one phrase.",
      },
      { prompt: "Which direction do you start reading Hebrew?", answer: "From the right." },
    ],
    unlock: {
      psalm: 117,
      verse: 2,
      hebrew: HALLELU_YAH,
      translation: "Praise Yah",
      note: "This closing phrase of Psalm 117 is also the word Hallelujah.",
    },
  },
  {
    id: "prefix-vav",
    level: 1,
    title: "The attached \u05D5 means 'and'",
    concept: "Conjunction prefix",
    stage: "Attached prefixes",
    objective: "Recognize that a small meaning can attach to the front of a word.",
    prerequisites: ["word-units-maqaf"],
    explanation:
      "Hebrew often attaches small words to the front. The letter \u05D5 at the front usually means 'and.' It belongs with the word after it.",
    model: {
      hebrew: TOV_VACHESED,
      translation: "goodness and kindness",
      note: "The attached \u05D5 adds 'and.'",
    },
    practice: [
      { prompt: "In the second word, what does the first letter add?", answer: "and" },
      { prompt: "Does \u05D5 stand alone here?", answer: "No, it is attached to the next word." },
    ],
    unlock: {
      psalm: 23,
      verse: 6,
      hebrew: ACH_TOV_VACHESED,
      translation: "Surely goodness and kindness",
      note: "This phrase begins the final verse of Psalm 23.",
    },
  },
  {
    id: "prefix-article",
    level: 1,
    title: "The attached \u05D4 means 'the'",
    concept: "Definite article",
    stage: "Attached prefixes",
    objective: "Recognize the attached definite article before nouns.",
    prerequisites: ["word-units-maqaf"],
    explanation:
      "Hebrew does not usually use a separate word for 'the.' It attaches \u05D4 to the front of the noun.",
    model: {
      hebrew: ERETZ + " \u2192 " + HAARETZ,
      translation: "earth \u2192 the earth",
      note: "The \u05D4 at the front makes the noun definite.",
    },
    practice: [
      { prompt: "What changed between the two Hebrew words?", answer: "\u05D4 was added at the front." },
      { prompt: "What English word does that usually add?", answer: "the" },
    ],
    unlock: {
      psalm: 100,
      verse: 1,
      hebrew: KOL_HAARETZ,
      translation: "all the earth",
      note: "The \u05D4 in the second word gives the phrase its 'the.'",
    },
  },
  {
    id: "prefix-lamed",
    level: 1,
    title: "The attached \u05DC points toward",
    concept: "Preposition prefix",
    stage: "Attached prefixes",
    objective: "Recognize that Hebrew prepositions can attach to the front of words.",
    prerequisites: ["word-units-maqaf"],
    explanation:
      "The letter \u05DC can attach to the front of a word. It often means 'to,' 'for,' or 'belonging to,' depending on the phrase.",
    model: {
      hebrew: LADONAI,
      translation: "to Adonai",
      note: "The \u05DC is attached to the Divine name.",
    },
    practice: [
      { prompt: "What small letter is attached at the front?", answer: "\u05DC" },
      { prompt: "What is a first simple reading of \u05DC here?", answer: "to" },
    ],
    unlock: {
      psalm: 100,
      verse: 1,
      hebrew: HARIU_LADONAI,
      translation: "Shout to Adonai",
      note: "The \u05DC shows who the shout is directed toward.",
    },
  },
  {
    id: "kol-of",
    level: 2,
    title: "\u05DB\u05BC\u05B8\u05DC means 'all of'",
    concept: "Bound noun phrase",
    stage: "Noun phrases",
    objective: "Read a word that leans forward into the noun after it.",
    prerequisites: ["word-units-maqaf", "prefix-article"],
    explanation:
      "\u05DB\u05BC\u05B8\u05DC often leans on the word after it. Instead of stopping at 'all,' read forward: 'all of the...' or simply 'all...'",
    model: {
      hebrew: KOL_GOYIM,
      translation: "all nations",
      note: "The maqaf shows that the two words belong together.",
    },
    practice: [
      { prompt: "After \u05DB\u05BC\u05B8\u05DC, should you stop or read forward?", answer: "Read forward." },
      { prompt: "What does the model phrase mean?", answer: "All nations." },
    ],
    unlock: {
      psalm: 117,
      verse: 1,
      hebrew: KOL_GOYIM,
      translation: "all nations",
      note: "This is who Psalm 117 calls to praise.",
    },
  },
  {
    id: "object-marker-et",
    level: 2,
    title: "\u05D0\u05B6\u05EA marks the object",
    concept: "Direct object marker",
    stage: "Sentence glue",
    objective: "Identify the object receiving an action.",
    prerequisites: ["word-units-maqaf"],
    explanation:
      "\u05D0\u05B6\u05EA usually has no English translation. It points to the thing or person receiving the action.",
    model: {
      hebrew: HALLELU_ET_ADONAI,
      translation: "Praise Adonai",
      note: "\u05D0\u05B6\u05EA tells you that Adonai is the one being praised.",
    },
    practice: [
      { prompt: "Do you usually translate \u05D0\u05B6\u05EA as an English word?", answer: "No." },
      { prompt: "What does \u05D0\u05B6\u05EA help you find?", answer: "The object of the action." },
    ],
    unlock: {
      psalm: 117,
      verse: 1,
      hebrew: HALLELU_ET_ADONAI,
      translation: "Praise Adonai",
      note: "This is the opening call of Psalm 117.",
    },
  },
  {
    id: "ki-because",
    level: 2,
    title: "\u05DB\u05BC\u05B4\u05D9 gives the reason",
    concept: "Reason clause",
    stage: "Sentence glue",
    objective: "Recognize a reason clause after a call to praise.",
    prerequisites: ["word-units-maqaf"],
    explanation:
      "\u05DB\u05BC\u05B4\u05D9 can mean 'because,' 'for,' or 'that.' In praise lines, it often introduces the reason for praise.",
    model: {
      hebrew: KI_TOV,
      translation: "for He is good",
      note: "The phrase gives the reason for giving thanks.",
    },
    practice: [
      { prompt: "In praise language, what does \u05DB\u05BC\u05B4\u05D9 often introduce?", answer: "The reason." },
      { prompt: "What simple English word can you try first?", answer: "because or for" },
    ],
    unlock: {
      psalm: 100,
      verse: 5,
      hebrew: KI_TOV_ADONAI,
      translation: "For Adonai is good",
      note: "This phrase explains why the Psalm calls for praise.",
    },
  },
  {
    id: "suffix-his",
    level: 3,
    title: "A suffix can mean 'his'",
    concept: "Possessive suffix",
    stage: "Suffixes",
    objective: "Recognize ownership attached to the end of a noun.",
    prerequisites: ["word-units-maqaf"],
    explanation:
      "Hebrew can attach ownership to the end of a noun. The ending \u05D5\u05B9 often means 'his.'",
    model: {
      hebrew: CHESED + " \u2192 " + CHASDO,
      translation: "kindness \u2192 his kindness",
      note: "The \u05D5\u05B9 ending adds 'his.'",
    },
    practice: [
      { prompt: "Where does Hebrew place this 'his' marker?", answer: "At the end of the word." },
      { prompt: "What does the model's second word mean?", answer: "His kindness." },
    ],
    unlock: {
      psalm: 117,
      verse: 2,
      hebrew: CHASDO,
      translation: "His kindness",
      note: "Psalm 117 praises the strength of God's kindness.",
    },
  },
  {
    id: "preposition-suffix-us",
    level: 3,
    title: "Prepositions can take suffixes",
    concept: "Preposition plus pronoun suffix",
    stage: "Suffixes",
    objective: "Read a preposition and pronoun combined into one word.",
    prerequisites: ["prefix-lamed", "suffix-his"],
    explanation:
      "A Hebrew preposition can combine with a suffix. The first model word means 'upon.' The second means 'upon us.'",
    model: {
      hebrew: AL + " \u2192 " + ALEINU,
      translation: "upon \u2192 upon us",
      note: "The ending points to 'us.'",
    },
    practice: [
      { prompt: "What does the first model word mean by itself?", answer: "upon or on" },
      { prompt: "What does the ending add?", answer: "us" },
    ],
    unlock: {
      psalm: 117,
      verse: 2,
      hebrew: GAVAR_ALEINU_CHASDO,
      translation: "His kindness has grown mighty over us",
      note: "This is the heart of Psalm 117's reason for praise.",
    },
  },
  {
    id: "full-psalm-117",
    level: 4,
    title: "Read your first full Psalm",
    concept: "Putting the pieces together",
    stage: "Guided reading",
    objective: "Combine the grammar pieces into a full short Psalm.",
    prerequisites: [
      "word-units-maqaf",
      "prefix-vav",
      "prefix-article",
      "prefix-lamed",
      "kol-of",
      "object-marker-et",
      "ki-because",
      "suffix-his",
      "preposition-suffix-us",
    ],
    explanation:
      "You have seen the main grammar pieces of Psalm 117: joined words, attached prefixes, the object marker, 'all,' reason clauses, and suffixes. Now read the Psalm as a whole.",
    model: {
      hebrew: HALLELU_ET_ADONAI + " " + KOL_GOYIM,
      translation: "Praise Adonai, all nations",
      note: "Start with the call, then read the reason.",
    },
    practice: [
      { prompt: "What does the object marker help mark?", answer: "The object." },
      { prompt: "What does the kindness phrase mean?", answer: "His kindness." },
    ],
    unlock: {
      psalm: 117,
      verse: 1,
      hebrew: "Psalm 117",
      translation: "A full short Psalm",
      note: "This is the first complete Psalm milestone.",
    },
  },
];

export function getNextGrammarLesson(progress: Progress): GrammarLesson | null {
  const completed = new Set(progress.completedGrammarLessons);
  return (
    GRAMMAR_CURRICULUM.find(
      (lesson) =>
        !completed.has(lesson.id) &&
        lesson.prerequisites.every((prerequisite) => completed.has(prerequisite)),
    ) ?? GRAMMAR_CURRICULUM.find((lesson) => !completed.has(lesson.id)) ?? null
  );
}

export function getGrammarLessonNumber(lessonId: string): number {
  const index = GRAMMAR_CURRICULUM.findIndex((lesson) => lesson.id === lessonId);
  return index >= 0 ? index + 1 : 1;
}

export function getCompletedGrammarLessonCount(progress: Progress): number {
  const completed = new Set(progress.completedGrammarLessons);
  return GRAMMAR_CURRICULUM.filter((lesson) => completed.has(lesson.id)).length;
}
