/**
 * =============================================================================
 * STYLE RULES MODULE
 * =============================================================================
 *
 * Defines detection functions for Reach Publishers House Style Guide rules.
 * Used by documentService.js to categorize changes and provide educational
 * comments explaining WHY a change was made.
 *
 * Each rule has:
 * - id: Unique identifier
 * - name: Human-readable name
 * - category: Category for grouping (Spelling, Grammar, Punctuation, Style)
 * - detect(original, edited): Returns true if this rule was applied
 * - explanation: Educational text explaining the change
 * - rule: The actual style guide rule text
 *
 * =============================================================================
 */

const STYLE_RULES = [
  // ===========================================================================
  // UK SPELLING RULES
  // ===========================================================================
  {
    id: 'uk-spelling-ise',
    name: 'UK Spelling (-ise)',
    category: 'Spelling',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      const izePattern = /\b\w+ize[sd]?\b/i;
      const isePattern = /\b\w+ise[sd]?\b/i;
      return izePattern.test(original) && isePattern.test(edited);
    },
    explanation: 'Changed to UK spelling (-ise not -ize) per Reach Publishers style.',
    rule: 'UK spelling: -ise not -ize (realise, organise)'
  },
  {
    id: 'uk-spelling-our',
    name: 'UK Spelling (-our)',
    category: 'Spelling',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      const orPattern = /\b(honor|color|favor|labor|neighbor|humor|flavor|behavior|harbor|rumor)\b/i;
      const ourPattern = /\b(honour|colour|favour|labour|neighbour|humour|flavour|behaviour|harbour|rumour)\b/i;
      return orPattern.test(original) && ourPattern.test(edited);
    },
    explanation: 'Changed to UK spelling (-our not -or) per Reach Publishers style.',
    rule: 'UK spelling: honour not honor, colour not color'
  },
  {
    id: 'uk-spelling-double-l',
    name: 'UK Spelling (doubled L)',
    category: 'Spelling',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      const singleL = /\b(traveled|traveling|traveler|canceled|canceling|labeled|labeling|modeled|modeling)\b/i;
      const doubleL = /\b(travelled|travelling|traveller|cancelled|cancelling|labelled|labelling|modelled|modelling)\b/i;
      return singleL.test(original) && doubleL.test(edited);
    },
    explanation: 'Changed to UK spelling (doubled L) per Reach Publishers style.',
    rule: 'UK spelling: travelled not traveled, cancelled not canceled'
  },
  {
    id: 'uk-spelling-re',
    name: 'UK Spelling (-re)',
    category: 'Spelling',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      const erPattern = /\b(center|theater|meter|liter|fiber|somber)\b/i;
      const rePattern = /\b(centre|theatre|metre|litre|fibre|sombre)\b/i;
      return erPattern.test(original) && rePattern.test(edited);
    },
    explanation: 'Changed to UK spelling (-re not -er) per Reach Publishers style.',
    rule: 'UK spelling: centre not center, theatre not theater'
  },

  // ===========================================================================
  // METRIC SYSTEM
  // ===========================================================================
  {
    id: 'metric-system',
    name: 'Metric System',
    category: 'Units',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      const imperial = /\b(feet|foot|inches|inch|miles|yards|pounds|ounces|gallons|pints)\b/i;
      const metric = /\b(metres|meters|centimetres|centimeters|kilometres|kilometers|kilograms|grams|litres|liters)\b/i;
      return imperial.test(original) && metric.test(edited);
    },
    explanation: 'Changed to metric system per UK style requirements.',
    rule: 'Metric system: metres, centimetres, kilometres'
  },

  // ===========================================================================
  // APOSTROPHE RULES
  // ===========================================================================
  {
    id: 'apostrophe-plural',
    name: 'Apostrophe in Plural',
    category: 'Punctuation',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Detect removal of apostrophe from plurals
      const wrongApostrophe = /\b(\d+)'s\b|\b(CD|DVD|TV|PC|MP3|CEO|ATM)'s\b/i;
      const correctPlural = /\b\d+s\b|\b(CDs|DVDs|TVs|PCs|MP3s|CEOs|ATMs)\b/i;
      return wrongApostrophe.test(original) && correctPlural.test(edited);
    },
    explanation: 'Removed apostrophe from plural. Apostrophes are never used for plurals.',
    rule: 'Apostrophes: CDs not CD\'s, 1960s not 1960\'s'
  },
  {
    id: 'its-vs-its',
    name: 'Its vs It\'s',
    category: 'Grammar',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Detect correction from it's to its or vice versa
      const origIts = (original.match(/\bits\b/gi) || []).length;
      const origIts2 = (original.match(/\bit's\b/gi) || []).length;
      const editIts = (edited.match(/\bits\b/gi) || []).length;
      const editIts2 = (edited.match(/\bit's\b/gi) || []).length;
      return (origIts !== editIts && origIts2 !== editIts2);
    },
    explanation: 'Corrected its/it\'s usage. it\'s = it is; its = possessive.',
    rule: 'Special care: its (possessive) vs it\'s (it is)'
  },
  {
    id: 'your-vs-youre',
    name: 'Your vs You\'re',
    category: 'Grammar',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      const origYour = (original.match(/\byour\b/gi) || []).length;
      const origYoure = (original.match(/\byou're\b/gi) || []).length;
      const editYour = (edited.match(/\byour\b/gi) || []).length;
      const editYoure = (edited.match(/\byou're\b/gi) || []).length;
      return (origYour !== editYour && origYoure !== editYoure);
    },
    explanation: 'Corrected your/you\'re usage. you\'re = you are; your = possessive.',
    rule: 'Special care: your (possessive) vs you\'re (you are)'
  },

  // ===========================================================================
  // RACE TERMS
  // ===========================================================================
  {
    id: 'race-term-capitalization',
    name: 'Race Term Capitalization',
    category: 'Capitalization',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Check that original has lowercase race term (without i flag) and edited has uppercase
      const lowercase = /\b(black|white|coloured)\s+(people|community|man|woman|men|women|person|child|children)\b/;
      const uppercase = /\b(Black|White|Coloured)\s+(people|community|man|woman|men|women|person|child|children)\b/;
      return lowercase.test(original) && uppercase.test(edited);
    },
    explanation: 'Capitalized race term per South African context guidelines.',
    rule: 'Race terms: Black, White, Coloured (capitalized in South African context)'
  },

  // ===========================================================================
  // WHO/THAT/WHICH
  // ===========================================================================
  {
    id: 'who-for-people',
    name: 'Who for People',
    category: 'Grammar',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Detect that/which changed to who when likely referring to people
      const thatForPeople = /\b(person|man|woman|child|people|someone|anyone|everyone)\s+(that|which)\b/i;
      const whoForPeople = /\b(person|man|woman|child|people|someone|anyone|everyone)\s+who\b/i;
      return thatForPeople.test(original) && whoForPeople.test(edited);
    },
    explanation: 'Changed to "who" for referring to people. Use that/which for things.',
    rule: 'Who for people, that/which for things'
  },

  // ===========================================================================
  // NUMBER FORMATTING
  // ===========================================================================
  {
    id: 'number-spelling',
    name: 'Number Spelling',
    category: 'Style',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      const numerals1to9 = /\b[1-9]\b/;
      const words1to9 = /\b(one|two|three|four|five|six|seven|eight|nine)\b/i;
      return numerals1to9.test(original) && words1to9.test(edited);
    },
    explanation: 'Spelled out single-digit number per style guide.',
    rule: 'Numbers 1-9 spelled out, 10+ numerical'
  },

  // ===========================================================================
  // HYPHEN RULES
  // ===========================================================================
  {
    id: 'compound-adjective-hyphen',
    name: 'Compound Adjective Hyphen',
    category: 'Punctuation',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Detect addition of hyphens in compound adjectives before nouns
      const noHyphen = /\b(two|three|four|five|six|seven|eight|nine|ten)\s+(year|month|day|week|hour|minute|foot|mile)\s+(old|long|high|wide|deep|tall)\b/i;
      const withHyphen = /\b(two|three|four|five|six|seven|eight|nine|ten)-(year|month|day|week|hour|minute|foot|mile)-(old|long|high|wide|deep|tall)\b/i;
      return noHyphen.test(original) && withHyphen.test(edited);
    },
    explanation: 'Added hyphens to compound adjective before noun.',
    rule: 'Hyphens: "two years old" vs "a two-year-old boy"'
  },

  // ===========================================================================
  // TIME FORMATTING
  // ===========================================================================
  {
    id: 'time-format',
    name: 'Time Formatting',
    category: 'Style',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      const militaryTime = /\b\d{1,2}h\d{2}\b/;
      const standardTime = /\b\d{1,2}(am|pm)\b|\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+o'clock\b/i;
      return militaryTime.test(original) && standardTime.test(edited);
    },
    explanation: 'Changed to preferred time format per style guide.',
    rule: 'Times: 4am, four o\'clock (not 16h00)'
  },

  // ===========================================================================
  // DIALOGUE FORMATTING
  // ===========================================================================
  {
    id: 'dialogue-double-quotes',
    name: 'Dialogue Double Quotes',
    category: 'Punctuation',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Detect change from single to double quotes for dialogue
      // Use context-aware pattern to avoid matching apostrophes in contractions
      const singleQuotes = /(?:^|[\s(])'[^']+'(?:[\s,.!?;:)]|$)/;
      const doubleQuotes = /"[^"]+"/;
      const origHasSingle = singleQuotes.test(original);
      const editHasDouble = doubleQuotes.test(edited);
      return origHasSingle && editHasDouble && !doubleQuotes.test(original);
    },
    explanation: 'Changed to double quotes for dialogue per style guide.',
    rule: 'Dialogue: double quotes for spoken words'
  },
  {
    id: 'dialogue-comma',
    name: 'Dialogue Tag Comma',
    category: 'Punctuation',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Detect missing comma before dialogue tag
      // noComma pattern: text ending with non-comma, non-quote char before closing quote
      const noComma = /"[^"]+[^,"]"\s+(he|she|they|I|we|it)\s+said/i;
      const withComma = /"[^"]+,"\s+(he|she|they|I|we|it)\s+said/i;
      return noComma.test(original) && withComma.test(edited);
    },
    explanation: 'Added comma before dialogue tag per style guide.',
    rule: 'Comma before dialogue tag: "No," she said.'
  },

  // ===========================================================================
  // PRACTICE/PRACTISE (British English)
  // ===========================================================================
  {
    id: 'practice-practise',
    name: 'Practice/Practise',
    category: 'Spelling',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // In British English: practice = noun, practise = verb
      // Detect correction in either direction
      const practiceAsVerb = /\b(to|will|must|should|can|could|would|might|shall)\s+practice\b/i;
      const practiseAsNoun = /\b(the|a|my|your|his|her|their|its|our|in|during|for)\s+practise\b/i;
      // Check if original had wrong usage and edited has correct
      const origWrongVerb = practiceAsVerb.test(original);
      const editCorrectVerb = /\b(to|will|must|should|can|could|would|might|shall)\s+practise\b/i.test(edited);
      const origWrongNoun = practiseAsNoun.test(original);
      const editCorrectNoun = /\b(the|a|my|your|his|her|their|its|our|in|during|for)\s+practice\b/i.test(edited);
      return (origWrongVerb && editCorrectVerb) || (origWrongNoun && editCorrectNoun);
    },
    explanation: 'British English: practice = noun, practise = verb.',
    rule: 'Practice (noun) vs practise (verb) - British English spelling'
  },

  // ===========================================================================
  // HOMOPHONES
  // ===========================================================================
  {
    id: 'there-their-theyre',
    name: 'There/Their/They\'re',
    category: 'Grammar',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Detect any change between there/their/they're
      const thereCount = (str) => (str.match(/\bthere\b/gi) || []).length;
      const theirCount = (str) => (str.match(/\btheir\b/gi) || []).length;
      const theyreCount = (str) => (str.match(/\bthey're\b/gi) || []).length;
      // If counts changed, a correction was made
      const origThere = thereCount(original);
      const origTheir = theirCount(original);
      const origTheyre = theyreCount(original);
      const editThere = thereCount(edited);
      const editTheir = theirCount(edited);
      const editTheyre = theyreCount(edited);
      // Check if any correction was made (distribution changed)
      // Removed total equality requirement to detect corrections that also add/remove words
      return (origThere !== editThere || origTheir !== editTheir || origTheyre !== editTheyre);
    },
    explanation: 'Corrected there/their/they\'re. there = location, their = possessive, they\'re = they are.',
    rule: 'there (location) vs their (possessive) vs they\'re (they are)'
  },
  {
    id: 'then-than',
    name: 'Then/Than',
    category: 'Grammar',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Detect then/than corrections
      const thenCount = (str) => (str.match(/\bthen\b/gi) || []).length;
      const thanCount = (str) => (str.match(/\bthan\b/gi) || []).length;
      const origThen = thenCount(original);
      const origThan = thanCount(original);
      const editThen = thenCount(edited);
      const editThan = thanCount(edited);
      // Check if any correction was made (distribution changed)
      // Removed total equality requirement to detect corrections that also add/remove words
      return (origThen !== editThen || origThan !== editThan);
    },
    explanation: 'Corrected then/than. then = time/sequence, than = comparison.',
    rule: 'then (time/sequence) vs than (comparison)'
  },
  {
    id: 'too-to',
    name: 'Too/To',
    category: 'Grammar',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Detect too/to corrections
      const tooCount = (str) => (str.match(/\btoo\b/gi) || []).length;
      const toCount = (str) => (str.match(/\bto\b/gi) || []).length;
      const origToo = tooCount(original);
      const origTo = toCount(original);
      const editToo = tooCount(edited);
      const editTo = toCount(edited);
      // Check if any correction was made (distribution changed)
      // Removed total equality requirement to detect corrections that also add/remove words
      return (origToo !== editToo || origTo !== editTo);
    },
    explanation: 'Corrected too/to. too = also or excessive, to = direction or infinitive.',
    rule: 'too (also/excessive) vs to (direction/infinitive)'
  },

  // ===========================================================================
  // PROPER NOUN CAPITALIZATION
  // ===========================================================================
  {
    id: 'proper-noun-family',
    name: 'Proper Noun (Family Terms)',
    category: 'Capitalization',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Rule: "Can Dad come?" (used as name) vs "my dad is here" (generic)
      // Detect when lowercase family term used as name is capitalized
      // or when capitalized generic usage is lowercased

      // Pattern 1: Lowercase used as proper noun → should be capitalized
      // e.g., "said dad" → "said Dad", "asked mom" → "asked Mom"
      const lowercaseAsName = /\b(said|asked|called|told|answered|replied|cried|shouted|whispered)\s+(dad|mom|mum|mother|father|grandma|grandpa|gran|granny|nana|papa)\b/i;
      const capitalizedAsName = /\b(said|asked|called|told|answered|replied|cried|shouted|whispered)\s+(Dad|Mom|Mum|Mother|Father|Grandma|Grandpa|Gran|Granny|Nana|Papa)\b/;

      // Pattern 2: Direct address - "Yes, dad" → "Yes, Dad"
      const lowercaseDirectAddress = /,\s+(dad|mom|mum|mother|father|grandma|grandpa|gran|granny|nana|papa)\b/i;
      const capitalizedDirectAddress = /,\s+(Dad|Mom|Mum|Mother|Father|Grandma|Grandpa|Gran|Granny|Nana|Papa)\b/;

      // Pattern 3: Subject of sentence without possessive
      const lowercaseSubject = /\b(dad|mom|mum|mother|father|grandma|grandpa)\s+(is|was|will|would|can|could|has|had|said|went|came)\b/i;
      const capitalizedSubject = /\b(Dad|Mom|Mum|Mother|Father|Grandma|Grandpa)\s+(is|was|will|would|can|could|has|had|said|went|came)\b/;

      // Check if original has lowercase and edited has capitalized (or vice versa for corrections)
      const origLowerName = lowercaseAsName.test(original) && !capitalizedAsName.test(original);
      const editCapName = capitalizedAsName.test(edited);

      const origLowerDirect = lowercaseDirectAddress.test(original) && !capitalizedDirectAddress.test(original);
      const editCapDirect = capitalizedDirectAddress.test(edited);

      const origLowerSubject = lowercaseSubject.test(original) && !capitalizedSubject.test(original);
      const editCapSubject = capitalizedSubject.test(edited);

      return (origLowerName && editCapName) ||
             (origLowerDirect && editCapDirect) ||
             (origLowerSubject && editCapSubject);
    },
    explanation: 'Family terms capitalized when used as names/proper nouns, lowercase when generic.',
    rule: 'Proper nouns: "Can Dad come?" vs "my dad is here"'
  },

  // ===========================================================================
  // WORD SIMPLIFICATION
  // ===========================================================================
  {
    id: 'word-simplification',
    name: 'Word Simplification',
    category: 'Style',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Detect replacement of difficult/uncommon words with simpler alternatives
      const complexWords = {
        'utilize': 'use',
        'utilise': 'use',
        'commence': 'begin|start',
        'terminate': 'end|stop',
        'endeavour': 'try',
        'endeavor': 'try',
        'ascertain': 'find out|learn',
        'subsequently': 'later|then',
        'approximately': 'about|around',
        'sufficient': 'enough',
        'insufficient': 'not enough',
        'facilitate': 'help|make easier',
        'implement': 'do|carry out',
        'demonstrate': 'show',
        'regarding': 'about',
        'concerning': 'about',
        'prior to': 'before',
        'subsequent to': 'after',
        'in order to': 'to',
        'due to the fact that': 'because',
        'at this point in time': 'now',
        'in the event that': 'if',
        'notwithstanding': 'despite',
        'aforementioned': 'this|that|these',
        'heretofore': 'until now',
        'hitherto': 'until now',
        'whilst': 'while',
        'amongst': 'among',
        'amidst': 'amid'
      };

      for (const [complex, simple] of Object.entries(complexWords)) {
        const complexRegex = new RegExp(`\\b${complex}\\b`, 'i');
        const simpleRegex = new RegExp(`\\b(${simple})\\b`, 'i');
        if (complexRegex.test(original) && simpleRegex.test(edited) && !complexRegex.test(edited)) {
          return true;
        }
      }
      return false;
    },
    explanation: 'Replaced complex/uncommon word with simpler alternative for clarity.',
    rule: 'Replace difficult/uncommon words with simpler alternatives'
  },

  // ===========================================================================
  // ITALICS FORMATTING
  // ===========================================================================
  {
    id: 'italics-foreign-words',
    name: 'Italics for Foreign Words',
    category: 'Formatting',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Common foreign words/phrases that should be italicized
      // We use *text* markdown syntax to represent italics in plain text
      const foreignPhrases = [
        'ad hoc', 'ad infinitum', 'ad nauseam', 'bona fide', 'carpe diem',
        'caveat emptor', 'de facto', 'de jure', 'et cetera', 'etc',
        'in situ', 'in vitro', 'in vivo', 'mea culpa', 'modus operandi',
        'per se', 'prima facie', 'pro bono', 'quid pro quo', 'status quo',
        'vice versa', 'vis-à-vis', 'vis-a-vis', 'raison d\'être', 'raison d\'etre',
        'fait accompli', 'je ne sais quoi', 'laissez-faire', 'laissez faire',
        'faux pas', 'coup de grâce', 'coup de grace', 'c\'est la vie',
        'déjà vu', 'deja vu', 'en route', 'bon voyage', 'chef-d\'oeuvre',
        'cul-de-sac', 'avant-garde', 'à la carte', 'a la carte',
        'ubuntu', 'apartheid', 'braai', 'lekker', 'ubuntu', 'veld', 'veldt',
        'kopje', 'koppie', 'kraal', 'rand', 'rooibos', 'sangoma', 'tokoloshe',
        'amandla', 'indaba', 'lobola', 'madiba', 'shebeen', 'tsotsi'
      ];

      for (const phrase of foreignPhrases) {
        // Check if original has plain foreign word and edited has it in *italics*
        const plainRegex = new RegExp(`(?<!\\*)\\b${phrase}\\b(?!\\*)`, 'i');
        const italicRegex = new RegExp(`\\*${phrase}\\*`, 'i');
        if (plainRegex.test(original) && italicRegex.test(edited)) {
          return true;
        }
      }
      return false;
    },
    explanation: 'Added italics for foreign word/phrase per style guide.',
    rule: 'Italics for: foreign words, slang, emphasis'
  },
  {
    id: 'italics-book-titles',
    name: 'Italics for Book/Film Titles',
    category: 'Formatting',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Detect when a title has been italicized (wrapped in **)
      // Look for capitalized multi-word phrases that become italicized
      // Pattern: "The Something Something" → "*The Something Something*"
      const titlePattern = /\b(The|A|An)\s+[A-Z][a-z]+(\s+[A-Za-z]+){1,6}\b/;

      // Check if original has a potential title and edited has it italicized
      const origMatch = original.match(titlePattern);
      if (origMatch) {
        const title = origMatch[0];
        const italicVersion = `*${title}*`;
        if (edited.includes(italicVersion) && !original.includes(italicVersion)) {
          return true;
        }
      }

      // Also check for specific title markers
      const titleMarkers = [
        'titled', 'called', 'named', 'book', 'novel', 'film', 'movie',
        'magazine', 'newspaper', 'journal', 'article', 'play', 'opera'
      ];

      for (const marker of titleMarkers) {
        // Pattern: "book called Something" → "book called *Something*"
        const beforeTitleRegex = new RegExp(`${marker}\\s+(\\w[\\w\\s]{2,30})(?!\\*)`, 'i');
        const afterTitleRegex = new RegExp(`${marker}\\s+\\*\\w[\\w\\s]{2,30}\\*`, 'i');
        if (beforeTitleRegex.test(original) && afterTitleRegex.test(edited)) {
          return true;
        }
      }
      return false;
    },
    explanation: 'Added italics for book/film/magazine title per style guide.',
    rule: 'Book/movie titles in italics: *The Great Gatsby*'
  },
  {
    id: 'italics-internal-thought',
    name: 'Italics for Internal Thought',
    category: 'Formatting',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Detect internal thoughts (often introduced by specific markers)
      // Pattern: "she thought, Something" → "she thought, *Something*"
      const thoughtMarkers = [
        'thought', 'wondered', 'pondered', 'mused', 'reflected',
        'considered', 'realized', 'realised', 'decided', 'wished'
      ];

      for (const marker of thoughtMarkers) {
        // Check for thought introduced by marker becoming italicized
        const beforeRegex = new RegExp(`${marker},?\\s+([A-Z][^.!?*]+[.!?])`, 'i');
        const afterRegex = new RegExp(`${marker},?\\s+\\*[A-Z][^*]+\\*`, 'i');
        if (beforeRegex.test(original) && afterRegex.test(edited)) {
          return true;
        }
      }
      return false;
    },
    explanation: 'Added italics for internal thought per style guide.',
    rule: 'Italics for: internal thoughts'
  },

  // ===========================================================================
  // CONCORD (SUBJECT-VERB AGREEMENT)
  // ===========================================================================
  {
    id: 'concord-pronoun-shift',
    name: 'Concord: Pronoun Consistency',
    category: 'Grammar',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Detect pronoun shift corrections like "one... we" → "one... one"
      // or "a person... they" → "a person... he or she"

      // Pattern 1: "one" followed by "we/our/us" in same sentence
      const oneWePattern = /\bone\b[^.!?]*\b(we|our|us)\b/i;
      const oneOnePattern = /\bone\b[^.!?]*\bone('s|self)?\b/i;
      if (oneWePattern.test(original) && oneOnePattern.test(edited) && !oneWePattern.test(edited)) {
        return true;
      }

      // Pattern 2: "a person" with "they" → "he or she" or "they" (consistent)
      const personTheyInconsistent = /\b(a|the)\s+person\b[^.!?]*\bthey\b[^.!?]*\b(he|she|his|her)\b/i;
      if (personTheyInconsistent.test(original) && !personTheyInconsistent.test(edited)) {
        return true;
      }

      return false;
    },
    explanation: 'Corrected pronoun shift for consistency throughout the sentence.',
    rule: 'Watch for concord errors: pronoun consistency'
  },
  {
    id: 'concord-subject-verb',
    name: 'Concord: Subject-Verb Agreement',
    category: 'Grammar',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Common subject-verb agreement errors

      const errorPatterns = [
        // Plural subject with singular verb
        { wrong: /\b(they|we|the children|the people|the men|the women)\s+(was|is|has|does)\b/i,
          right: /\b(they|we|the children|the people|the men|the women)\s+(were|are|have|do)\b/i },
        // Singular subject with plural verb
        { wrong: /\b(he|she|it|the child|the person|the man|the woman|everyone|someone|anyone|nobody|each)\s+(were|are|have|do)\b/i,
          right: /\b(he|she|it|the child|the person|the man|the woman|everyone|someone|anyone|nobody|each)\s+(was|is|has|does)\b/i },
        // "there is" with plural noun
        { wrong: /\bthere\s+is\s+\w+\s+(and|,)/i,
          right: /\bthere\s+are\s+\w+\s+(and|,)/i },
        // Common errors: "don't" with singular third person
        { wrong: /\b(he|she|it)\s+don't\b/i,
          right: /\b(he|she|it)\s+doesn't\b/i },
        // "was" with "you"
        { wrong: /\byou\s+was\b/i,
          right: /\byou\s+were\b/i },
        // Collective nouns (can be singular or plural, but should be consistent)
        { wrong: /\b(the team|the group|the family|the committee)\s+(are|were|have)\b[^.!?]*\b(it|its)\b/i,
          right: /\b(the team|the group|the family|the committee)\s+(is|was|has)\b[^.!?]*\b(it|its)\b/i }
      ];

      for (const pattern of errorPatterns) {
        if (pattern.wrong.test(original) && pattern.right.test(edited) && !pattern.wrong.test(edited)) {
          return true;
        }
      }

      return false;
    },
    explanation: 'Corrected subject-verb agreement error.',
    rule: 'Watch for concord errors: subject-verb agreement'
  },
  {
    id: 'concord-neither-nor',
    name: 'Concord: Neither/Nor Agreement',
    category: 'Grammar',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Neither/nor and either/or - verb agrees with nearest subject

      // "Neither X nor Y are" when Y is singular → "Neither X nor Y is"
      const wrongNeither = /\bneither\s+\w+\s+nor\s+(he|she|it|the\s+\w+)\s+(are|were|have)\b/i;
      const rightNeither = /\bneither\s+\w+\s+nor\s+(he|she|it|the\s+\w+)\s+(is|was|has)\b/i;

      if (wrongNeither.test(original) && rightNeither.test(edited)) {
        return true;
      }

      // "Either X or Y is" when Y is plural → "Either X or Y are"
      const wrongEither = /\beither\s+\w+\s+or\s+(they|we|the\s+\w+s)\s+(is|was|has)\b/i;
      const rightEither = /\beither\s+\w+\s+or\s+(they|we|the\s+\w+s)\s+(are|were|have)\b/i;

      if (wrongEither.test(original) && rightEither.test(edited)) {
        return true;
      }

      return false;
    },
    explanation: 'Corrected neither/nor or either/or verb agreement (verb agrees with nearest subject).',
    rule: 'Watch for concord errors: neither/nor agreement'
  },

  // ===========================================================================
  // NEW SPEAKER = NEW LINE (DIALOGUE STRUCTURE)
  // ===========================================================================
  {
    id: 'dialogue-new-speaker-line',
    name: 'New Speaker New Line',
    category: 'Formatting',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Detect when dialogue from different speakers was on same line and is now separated

      // Pattern 1: Two dialogue segments with different attributions on same line
      // "Hello," said John. "Hi," said Mary. → separated onto different lines
      const twoSpeakersOneLine = /"[^"]+"\s*,?\s*(said|asked|replied|answered|shouted|whispered|cried|exclaimed)\s+(\w+)\.\s*"[^"]+"\s*,?\s*(said|asked|replied|answered|shouted|whispered|cried|exclaimed)\s+(\w+)/i;

      if (twoSpeakersOneLine.test(original)) {
        // Check if edited has paragraph breaks (we use \n to detect in plain text)
        const origSpeakers = original.match(twoSpeakersOneLine);
        if (origSpeakers) {
          const speaker1 = origSpeakers[2].toLowerCase();
          const speaker2 = origSpeakers[4].toLowerCase();
          if (speaker1 !== speaker2) {
            // Different speakers - should be on different lines
            // Check if edited has them separated - verify NEW newlines were added
            const origNewlineCount = (original.match(/\n/g) || []).length;
            const editNewlineCount = (edited.match(/\n/g) || []).length;
            if (!twoSpeakersOneLine.test(edited) || editNewlineCount > origNewlineCount) {
              return true;
            }
          }
        }
      }

      // Pattern 2: Response dialogue immediately after without break
      // "Question?" "Answer." → should have line break
      const immediateResponse = /"[^"]+[?!]"\s*"[^"]+"[^"]*said/i;
      if (immediateResponse.test(original) && !immediateResponse.test(edited)) {
        return true;
      }

      // Pattern 3: Detect if newlines were added between dialogue segments
      const origDialogueCount = (original.match(/"\s*,?\s*(said|asked|replied)/gi) || []).length;
      const editDialogueCount = (edited.match(/"\s*,?\s*(said|asked|replied)/gi) || []).length;
      const origNewlines = (original.match(/\n/g) || []).length;
      const editNewlines = (edited.match(/\n/g) || []).length;

      // If same dialogue count but more newlines, line breaks were added
      if (origDialogueCount === editDialogueCount && origDialogueCount > 1 && editNewlines > origNewlines) {
        return true;
      }

      return false;
    },
    explanation: 'Added line break between different speakers per dialogue formatting rules.',
    rule: 'Direct dialogue: new speaker = new line'
  },
  {
    id: 'dialogue-speaker-continuation',
    name: 'Speaker Continuation Format',
    category: 'Formatting',
    detect: (original, edited) => {
      if (!original || !edited) return false;
      // Detect when same speaker's continued dialogue is properly formatted
      // Same speaker can continue on same line or new paragraph

      // Pattern: Dialogue interrupted by action, then continues
      // Wrong: "Hello," said John, "how are you?" (if John does action between)
      // Right: "Hello." John walked over. "How are you?"

      // Check for action between dialogue of same speaker being reformatted
      const interruptedDialogue = /"[^"]+"\s*(said|asked)\s+(\w+)[^"]+\.\s+"[^"]+"\s*(said|asked)\s+\2/i;

      if (interruptedDialogue.test(original) && !interruptedDialogue.test(edited)) {
        return true;
      }

      return false;
    },
    explanation: 'Reformatted speaker continuation for clarity.',
    rule: 'Direct dialogue: speaker continuation formatting'
  }
];

/**
 * Detect all style rule violations/corrections in a text change.
 * Returns array of all matching rules for comprehensive reporting.
 *
 * @param {string} original - Original text
 * @param {string} edited - Edited text
 * @returns {Array} Array of matching rule objects
 */
function detectStyleViolations(original, edited) {
  const violations = [];

  for (const rule of STYLE_RULES) {
    try {
      if (rule.detect(original, edited)) {
        violations.push({
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          explanation: rule.explanation,
          styleGuideRef: rule.rule
        });
      }
    } catch (error) {
      // Skip rule if detection fails
      console.error(`Style rule detection error for ${rule.id}:`, error.message);
    }
  }

  return violations;
}

/**
 * Get a style rule by ID.
 *
 * @param {string} ruleId - The rule ID to look up
 * @returns {Object|null} The rule object or null if not found
 */
function getStyleRuleById(ruleId) {
  return STYLE_RULES.find(r => r.id === ruleId) || null;
}

module.exports = {
  STYLE_RULES,
  detectStyleViolations,
  getStyleRuleById
};
