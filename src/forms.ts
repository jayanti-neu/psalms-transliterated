export type VerbStem = "qal" | "niphal" | "piel" | "pual" | "hiphil" | "hophal" | "hithpael";
export type VerbAspect =
  | "perfect"
  | "imperfect"
  | "wayyiqtol"
  | "imperative"
  | "infinitive-construct"
  | "infinitive-absolute"
  | "active-participle"
  | "passive-participle";

export type ParsedForm =
  | {
      kind: "verb";
      stem: VerbStem;
      aspect: VerbAspect;
      person?: 1 | 2 | 3;
      gender?: "m" | "f" | "c";
      number?: "s" | "p" | "d";
    }
  | {
      kind: "noun";
      proper: boolean;
      gender?: "m" | "f" | "c";
      number?: "s" | "p" | "d";
      state?: "absolute" | "construct" | "determined";
    }
  | { kind: "article" }
  | { kind: "pronoun"; person?: 1 | 2 | 3; gender?: "m" | "f" | "c"; number?: "s" | "p" }
  | { kind: "adjective"; gender?: "m" | "f" | "c"; number?: "s" | "p"; state?: "absolute" | "construct" }
  | { kind: "object-marker" }
  | { kind: "other"; pos: string };

const STEMS: Record<string, VerbStem> = {
  q: "qal",
  n: "niphal",
  p: "piel",
  P: "pual",
  h: "hiphil",
  H: "hophal",
  t: "hithpael",
};

const ASPECTS: Record<string, VerbAspect> = {
  p: "perfect",
  q: "imperfect",
  w: "wayyiqtol",
  v: "imperative",
  i: "infinitive-construct",
  a: "infinitive-absolute",
  r: "active-participle",
  s: "passive-participle",
};

export function parseMorph(pos: string, morph: string): ParsedForm | null {
  if (!morph) return null;

  if (pos === "verb" && morph.startsWith("V") && morph.length >= 3) {
    const stem = STEMS[morph[1]];
    const aspect = ASPECTS[morph[2]];
    if (!stem || !aspect) return null;

    const result: ParsedForm = { kind: "verb", stem, aspect };
    const tail = morph.slice(3);

    if (aspect === "perfect" || aspect === "imperfect" || aspect === "wayyiqtol" || aspect === "imperative") {
      if (tail.length >= 3) {
        result.person = Number(tail[0]) as 1 | 2 | 3;
        result.gender = tail[1] as "m" | "f" | "c";
        result.number = tail[2] as "s" | "p" | "d";
      }
    } else if (aspect === "active-participle" || aspect === "passive-participle") {
      if (tail.length >= 2) {
        result.gender = tail[0] as "m" | "f" | "c";
        result.number = tail[1] as "s" | "p" | "d";
      }
    }
    return result;
  }

  if (pos === "noun" && morph.startsWith("N")) {
    if (morph === "Np" || morph.startsWith("Np")) {
      return { kind: "noun", proper: true };
    }
    if (morph[1] === "c" && morph.length >= 5) {
      return {
        kind: "noun",
        proper: false,
        gender: morph[2] as "m" | "f" | "c",
        number: morph[3] as "s" | "p" | "d",
        state: morph[4] === "a" ? "absolute" : morph[4] === "c" ? "construct" : "determined",
      };
    }
    return { kind: "noun", proper: false };
  }

  if (pos === "particle") {
    if (morph === "Td") return { kind: "article" };
    if (morph === "To") return { kind: "object-marker" };
    return { kind: "other", pos };
  }

  if (pos === "adjective" && morph.length >= 4) {
    return {
      kind: "adjective",
      gender: morph[1] as "m" | "f" | "c",
      number: morph[2] as "s" | "p",
      state: morph[3] === "c" ? "construct" : "absolute",
    };
  }

  if (pos === "pronoun" && morph.length >= 4) {
    return {
      kind: "pronoun",
      person: Number(morph[1]) as 1 | 2 | 3,
      gender: morph[2] as "m" | "f" | "c",
      number: morph[3] as "s" | "p",
    };
  }

  return { kind: "other", pos };
}

export function formId(parsed: ParsedForm): string {
  switch (parsed.kind) {
    case "verb":
      return `verb:${parsed.stem}:${parsed.aspect}:${verbFormKey(parsed)}`;
    case "noun":
      if (parsed.proper) return "noun:proper";
      return `noun:${parsed.gender ?? "?"}${parsed.number ?? "?"}:${parsed.state ?? "?"}`;
    case "article":
      return "article";
    case "object-marker":
      return "object-marker";
    case "adjective":
      return `adjective:${parsed.gender ?? "?"}${parsed.number ?? "?"}:${parsed.state ?? "?"}`;
    case "pronoun":
      return `pronoun:${pgn(parsed.person, parsed.gender, parsed.number)}`;
    case "other":
      return `other:${parsed.pos}`;
  }
}

function pgn(person?: number, gender?: string, num?: string): string {
  if (!person && !gender && !num) return "—";
  return `${person ?? "?"}${gender ?? "?"}${num ?? "?"}`;
}

function verbFormKey(parsed: Extract<ParsedForm, { kind: "verb" }>): string {
  if (parsed.aspect === "active-participle" || parsed.aspect === "passive-participle") {
    return `${parsed.gender ?? "?"}${parsed.number ?? "?"}`;
  }
  if (parsed.aspect === "infinitive-construct" || parsed.aspect === "infinitive-absolute") {
    return "infinitive";
  }
  return pgn(parsed.person, parsed.gender, parsed.number);
}

export function formatFormName(parsed: ParsedForm): string {
  switch (parsed.kind) {
    case "verb": {
      const head = `${capitalize(parsed.stem)} ${parsed.aspect.replace("-", " ")}`;
      const pgnStr = pgnLabel(parsed.person, parsed.gender, parsed.number);
      return pgnStr ? `${head}, ${pgnStr}` : head;
    }
    case "noun":
      if (parsed.proper) return "Proper noun";
      return `Noun · ${gnLabel(parsed.gender, parsed.number)} · ${stateLabel(parsed.state)}`;
    case "article":
      return "Definite article";
    case "object-marker":
      return "Direct-object marker";
    case "adjective":
      return `Adjective · ${gnLabel(parsed.gender, parsed.number)} · ${stateLabel(parsed.state)}`;
    case "pronoun":
      return `Pronoun · ${pgnLabel(parsed.person, parsed.gender, parsed.number)}`;
    case "other":
      return capitalize(parsed.pos);
  }
}

export function shouldIntroduceForm(parsed: ParsedForm): boolean {
  if (parsed.kind === "verb") return true;
  if (parsed.kind === "noun") return true;
  if (parsed.kind === "article") return true;
  if (parsed.kind === "adjective") return true;
  if (parsed.kind === "pronoun") return true;
  return false;
}

function pgnLabel(person?: number, gender?: string, num?: string): string {
  const parts: string[] = [];
  if (person) parts.push(`${person}${ordinal(person)}`);
  parts.push(genderLabel(gender));
  parts.push(numberLabel(num));
  return parts.filter(Boolean).join(" ");
}

function gnLabel(gender?: string, num?: string): string {
  return [genderLabel(gender), numberLabel(num)].filter(Boolean).join(" ");
}

function genderLabel(g?: string): string {
  if (g === "m") return "masc.";
  if (g === "f") return "fem.";
  if (g === "c") return "common";
  return "";
}

function numberLabel(n?: string): string {
  if (n === "s") return "sing.";
  if (n === "p") return "pl.";
  if (n === "d") return "dual";
  return "";
}

function stateLabel(s?: string): string {
  if (s === "absolute") return "absolute";
  if (s === "construct") return "construct";
  if (s === "determined") return "determined";
  return "";
}

function ordinal(n: number): string {
  return n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th";
}

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}
