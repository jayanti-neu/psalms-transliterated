export type GrammarCard = {
  title: string;
  body: string;
  pattern?: string;
  takeaway?: string;
};

// Hand-written explainer text per form-id.
// Add new entries as new forms appear in upcoming psalms.
// Missing ids fall back to an auto-generated minimal card.

export const GRAMMAR_CARDS: Record<string, GrammarCard> = {
  "verb:qal:perfect:3ms": {
    title: "A completed action: 'he did'",
    body:
      "This verb form usually points to a whole action: something done or completed. " +
      "Qal is the basic stem, so start with the simple meaning of the root. " +
      "When you see this form, try reading it as \"he did\" or \"it happened.\"",
    pattern: "Root with a simple past/completed-action shape",
    takeaway: "Read it first as a simple completed action.",
  },

  "verb:piel:imperative:2mp": {
    title: "A command to a group",
    body:
      "This is a command addressed to more than one person: \"all of you, do this.\" " +
      "Psalms use this form often because they call whole communities to praise, bless, sing, or listen. " +
      "The ending often sounds like -u.",
    pattern: "Command + plural -u ending",
    takeaway: "Someone is being told to do the action.",
  },

  "noun:proper": {
    title: "A name",
    body:
      "A proper noun is a name: a person, place, or name for God. " +
      "Names usually do not need the word \"the.\" " +
      "The divine name יהוה is traditionally read aloud as \"Adonai.\"",
    takeaway: "Treat it like a name, not a normal vocabulary word.",
  },

  "noun:ms:absolute": {
    title: "A noun standing on its own",
    body:
      "This is a regular singular noun. It is not attached to another noun after it. " +
      "For reading, you can usually translate it directly: \"a king,\" \"a psalm,\" \"a day,\" and so on.",
    takeaway: "Read it as a normal standalone thing.",
  },

  "noun:fs:absolute": {
    title: "A feminine noun standing on its own",
    body:
      "This is a regular singular noun whose grammatical gender is feminine. " +
      "Many feminine nouns end with -ah or -t, but not all of them. " +
      "In a verse, read it as a normal standalone noun first.",
    takeaway: "The gender matters for agreement, but the basic reading is still a noun.",
  },

  "noun:mp:absolute": {
    title: "A plural noun",
    body:
      "This is a plural noun. The common masculine plural ending sounds like -im. " +
      "When the article is attached, read it as \"the\" plural: \"the nations,\" \"the days,\" \"the waters.\"",
    pattern: "Often ends with -im",
    takeaway: "Look for a group or more than one.",
  },

  "noun:fp:absolute": {
    title: "A feminine plural noun",
    body:
      "This is a plural noun whose grammatical gender is feminine. " +
      "The common feminine plural ending sounds like -ot, though Hebrew has exceptions. " +
      "For reading, first notice that the word is plural.",
    pattern: "Often ends with -ot",
    takeaway: "Read it as more than one.",
  },

  "noun:ms:construct": {
    title: "The 'of' form",
    body:
      "A construct noun leans on the next word. Read the two words together as \"X of Y.\" " +
      "For example, כָּל often means \"all of\" and expects another word after it. " +
      "This is one of the most useful patterns in biblical Hebrew.",
    pattern: "X of Y",
    takeaway: "Do not stop after this word; connect it to the next noun.",
  },

  "noun:fs:construct": {
    title: "A feminine 'of' form",
    body:
      "This is another \"X of Y\" form. Feminine nouns often change their ending when they bind to the next noun. " +
      "Read the phrase as one unit, not as two disconnected words.",
    pattern: "X of Y",
    takeaway: "Connect this noun to the word after it.",
  },

  "article": {
    title: "The word 'the' is attached",
    body:
      "Hebrew does not use a separate word for \"the.\" Instead, it attaches ה at the front of the word. " +
      "So a word like הָאָרֶץ means \"the earth.\"",
    pattern: "ha- + noun",
    takeaway: "When ה is attached at the front, try adding \"the.\"",
  },

  "object-marker": {
    title: "A signpost before the object",
    body:
      "The word אֵת usually does not translate into English. It points to the direct object, the thing receiving the action. " +
      "In a phrase like \"praise אֵת Adonai,\" it tells you that Adonai is the one being praised.",
    takeaway: "Use it as a reading signpost, not as an English word.",
  },

  "verb:qal:imperative:2mp": {
    title: "A simple command to a group",
    body:
      "This is a command addressed to more than one person. Qal is the basic stem, so read the verb with its simple meaning. " +
      "Psalms often stack commands like this: serve, come, know, give thanks.",
    pattern: "Basic command + plural -u ending",
    takeaway: "Read it as \"all of you, do this.\"",
  },

  "verb:hiphil:imperative:2mp": {
    title: "A command that causes action",
    body:
      "Hiphil often means causing something to happen or bringing something about. " +
      "As a command, it tells a group to make the action happen. " +
      "For example, a praise psalm may command people to make a joyful sound.",
    takeaway: "Read Hiphil as \"cause/make/do actively\" when that fits.",
  },

  "verb:qal:imperfect:1cs": {
    title: "An action from the speaker",
    body:
      "This verb has an א at the front because the speaker is doing the action: \"I...\" " +
      "The imperfect form can describe future action, ongoing action, or what the speaker is about to do. " +
      "In poetry, start with a simple reading like \"I will.\"",
    pattern: "א- at the front can mean \"I\"",
    takeaway: "Try reading it as \"I will...\"",
  },

  "verb:qal:active-participle:ms": {
    title: "A noun-like action word",
    body:
      "A participle describes someone by what they do. " +
      "Instead of only saying \"he shepherded,\" it can mean \"one who shepherds\" or simply \"shepherd.\" " +
      "Hebrew often uses participles where English uses a noun or an -ing word.",
    takeaway: "Read it as a role or ongoing action.",
  },

  "verb:qal:active-participle:mp": {
    title: "People described by an action",
    body:
      "A plural participle describes people by what they are doing. " +
      "It can become a noun in translation, like \"enemies\" from \"ones who trouble.\"",
    takeaway: "Ask: who are these people, and what are they doing?",
  },

  "pronoun:1cp": {
    title: "The pronoun 'we'",
    body:
      "This is an independent pronoun. It names the subject directly: \"we.\" " +
      "Hebrew verbs can already include the subject, so an extra pronoun often adds emphasis.",
    takeaway: "When the pronoun appears, the verse is making the subject clear.",
  },

  "pronoun:2ms": {
    title: "The pronoun 'you'",
    body:
      "This is \"you\" when speaking to one masculine person. In many psalms, the speaker is addressing God directly. " +
      "When you see it, notice the shift into direct address.",
    takeaway: "The verse is speaking directly to someone.",
  },

  "pronoun:3ms": {
    title: "The pronoun 'he'",
    body:
      "This pronoun points to a masculine singular subject: \"he.\" " +
      "Hebrew may include it to make the sentence emphatic: \"he is the one.\"",
    takeaway: "Look for emphasis on who the subject is.",
  },

  "pronoun:3mp": {
    title: "The pronoun 'they'",
    body:
      "This pronoun points to a masculine plural subject: \"they.\" " +
      "In poetry, it often gathers earlier nouns back into one subject.",
    takeaway: "Ask what earlier plural thing \"they\" points back to.",
  },

  "adjective:ms:absolute": {
    title: "A describing word",
    body:
      "An adjective describes a noun: good, evil, righteous, strong. " +
      "Hebrew adjectives usually match the noun they describe in gender and number.",
    takeaway: "Look nearby for the noun being described.",
  },
};

export function getGrammarCard(id: string): GrammarCard | null {
  return GRAMMAR_CARDS[id] ?? null;
}
