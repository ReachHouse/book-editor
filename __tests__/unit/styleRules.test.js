/**
 * Unit Tests for styleRules.js
 *
 * Tests the style rule detection functions used to identify
 * Reach House House Style Guide violations.
 */

const { STYLE_RULES, detectStyleViolations, getStyleRuleById } = require('../../services/styleRules');

// =============================================================================
// UK SPELLING RULES
// =============================================================================

describe('UK Spelling Rules', () => {
  describe('uk-spelling-ise', () => {
    const rule = getStyleRuleById('uk-spelling-ise');

    test('detects -ize to -ise change', () => {
      expect(rule.detect('realize', 'realise')).toBe(true);
      expect(rule.detect('organized', 'organised')).toBe(true);
      expect(rule.detect('recognized', 'recognised')).toBe(true);
    });

    test('returns false when no change', () => {
      expect(rule.detect('realise', 'realise')).toBe(false);
      expect(rule.detect('hello', 'hello')).toBe(false);
    });

    test('handles null/undefined gracefully', () => {
      expect(rule.detect(null, 'realise')).toBe(false);
      expect(rule.detect('realize', null)).toBe(false);
    });
  });

  describe('uk-spelling-our', () => {
    const rule = getStyleRuleById('uk-spelling-our');

    test('detects -or to -our change', () => {
      expect(rule.detect('color', 'colour')).toBe(true);
      expect(rule.detect('honor', 'honour')).toBe(true);
      expect(rule.detect('favorite flavor', 'favourite flavour')).toBe(true);
    });

    test('returns false when no change', () => {
      expect(rule.detect('colour', 'colour')).toBe(false);
      expect(rule.detect('the color is red', 'the color is red')).toBe(false);
    });
  });

  describe('uk-spelling-double-l', () => {
    const rule = getStyleRuleById('uk-spelling-double-l');

    test('detects single L to double L change', () => {
      expect(rule.detect('traveled', 'travelled')).toBe(true);
      expect(rule.detect('canceled', 'cancelled')).toBe(true);
      expect(rule.detect('traveling', 'travelling')).toBe(true);
    });

    test('returns false when no change', () => {
      expect(rule.detect('travelled', 'travelled')).toBe(false);
    });
  });

  describe('uk-spelling-re', () => {
    const rule = getStyleRuleById('uk-spelling-re');

    test('detects -er to -re change', () => {
      expect(rule.detect('center', 'centre')).toBe(true);
      expect(rule.detect('theater', 'theatre')).toBe(true);
      expect(rule.detect('meter', 'metre')).toBe(true);
    });

    test('returns false when no change', () => {
      expect(rule.detect('centre', 'centre')).toBe(false);
    });
  });
});

// =============================================================================
// METRIC SYSTEM
// =============================================================================

describe('Metric System Rule', () => {
  const rule = getStyleRuleById('metric-system');

  test('detects imperial to metric conversion', () => {
    expect(rule.detect('5 feet tall', '1.5 metres tall')).toBe(true);
    expect(rule.detect('10 miles away', '16 kilometres away')).toBe(true);
    expect(rule.detect('weighs 100 pounds', 'weighs 45 kilograms')).toBe(true);
  });

  test('returns false when no conversion', () => {
    expect(rule.detect('5 metres', '5 metres')).toBe(false);
    expect(rule.detect('hello world', 'hello world')).toBe(false);
  });
});

// =============================================================================
// APOSTROPHE RULES
// =============================================================================

describe('Apostrophe Rules', () => {
  describe('apostrophe-plural', () => {
    const rule = getStyleRuleById('apostrophe-plural');

    test('detects removal of apostrophe from plurals', () => {
      expect(rule.detect("the 1960's", 'the 1960s')).toBe(true);
      expect(rule.detect("buy CD's here", 'buy CDs here')).toBe(true);
      expect(rule.detect("multiple TV's", 'multiple TVs')).toBe(true);
    });

    test('returns false when no apostrophe issue', () => {
      expect(rule.detect('the 1960s', 'the 1960s')).toBe(false);
    });
  });

  describe('its-vs-its', () => {
    const rule = getStyleRuleById('its-vs-its');

    test('detects its/it\'s correction', () => {
      expect(rule.detect("it's tail", 'its tail')).toBe(true);
      expect(rule.detect('its raining', "it's raining")).toBe(true);
    });

    test('returns false when no correction needed', () => {
      expect(rule.detect('its tail', 'its tail')).toBe(false);
    });
  });

  describe('your-vs-youre', () => {
    const rule = getStyleRuleById('your-vs-youre');

    test('detects your/you\'re correction', () => {
      expect(rule.detect("your welcome", "you're welcome")).toBe(true);
      expect(rule.detect("you're book", 'your book')).toBe(true);
    });

    test('returns false when no correction needed', () => {
      expect(rule.detect('your book', 'your book')).toBe(false);
    });
  });
});

// =============================================================================
// RACE TERM CAPITALIZATION
// =============================================================================

describe('Race Term Capitalization', () => {
  const rule = getStyleRuleById('race-term-capitalization');

  test('detects capitalization of race terms', () => {
    expect(rule.detect('black people', 'Black people')).toBe(true);
    expect(rule.detect('white community', 'White community')).toBe(true);
    expect(rule.detect('coloured people', 'Coloured people')).toBe(true);
  });

  test('returns false when already capitalized', () => {
    expect(rule.detect('Black people', 'Black people')).toBe(false);
  });
});

// =============================================================================
// WHO/THAT/WHICH
// =============================================================================

describe('Who for People Rule', () => {
  const rule = getStyleRuleById('who-for-people');

  test('detects that/which to who for people', () => {
    expect(rule.detect('the person that', 'the person who')).toBe(true);
    expect(rule.detect('someone that knows', 'someone who knows')).toBe(true);
    expect(rule.detect('the man which', 'the man who')).toBe(true);
  });

  test('returns false when who already used', () => {
    expect(rule.detect('the person who', 'the person who')).toBe(false);
  });
});

// =============================================================================
// NUMBER FORMATTING
// =============================================================================

describe('Number Spelling Rule', () => {
  const rule = getStyleRuleById('number-spelling');

  test('detects numeral to word conversion for 1-9', () => {
    expect(rule.detect('3 cats', 'three cats')).toBe(true);
    expect(rule.detect('I have 5 apples', 'I have five apples')).toBe(true);
  });

  test('returns false when already spelled out', () => {
    expect(rule.detect('three cats', 'three cats')).toBe(false);
  });

  test('returns false for numbers 10+', () => {
    expect(rule.detect('15 cats', '15 cats')).toBe(false);
  });
});

// =============================================================================
// HYPHEN RULES
// =============================================================================

describe('Compound Adjective Hyphen Rule', () => {
  const rule = getStyleRuleById('compound-adjective-hyphen');

  test('detects addition of hyphens to compound adjectives', () => {
    expect(rule.detect('a two year old child', 'a two-year-old child')).toBe(true);
    expect(rule.detect('five foot tall', 'five-foot-tall')).toBe(true);
  });

  test('returns false when already hyphenated', () => {
    expect(rule.detect('a two-year-old child', 'a two-year-old child')).toBe(false);
  });
});

// =============================================================================
// TIME FORMATTING
// =============================================================================

describe('Time Format Rule', () => {
  const rule = getStyleRuleById('time-format');

  test('detects military to standard time conversion', () => {
    expect(rule.detect('meet at 16h00', 'meet at 4pm')).toBe(true);
    expect(rule.detect('arrives 14h30', 'arrives 2pm')).toBe(true);
  });

  test('returns false when already standard format', () => {
    expect(rule.detect('meet at 4pm', 'meet at 4pm')).toBe(false);
  });
});

// =============================================================================
// DIALOGUE FORMATTING
// =============================================================================

describe('Dialogue Formatting Rules', () => {
  describe('dialogue-double-quotes', () => {
    const rule = getStyleRuleById('dialogue-double-quotes');

    test('detects single to double quote change', () => {
      expect(rule.detect("'Hello,' he said", '"Hello," he said')).toBe(true);
    });

    test('returns false when already double quotes', () => {
      expect(rule.detect('"Hello," he said', '"Hello," he said')).toBe(false);
    });
  });

  describe('dialogue-comma', () => {
    const rule = getStyleRuleById('dialogue-comma');

    test('detects addition of comma before dialogue tag', () => {
      expect(rule.detect('"Hello" she said', '"Hello," she said')).toBe(true);
    });

    test('returns false when comma already present', () => {
      expect(rule.detect('"Hello," she said', '"Hello," she said')).toBe(false);
    });
  });
});

// =============================================================================
// detectStyleViolations Function
// =============================================================================

describe('detectStyleViolations', () => {
  test('returns empty array when no violations', () => {
    const result = detectStyleViolations('hello world', 'hello world');
    expect(result).toEqual([]);
  });

  test('returns single violation for UK spelling change', () => {
    const result = detectStyleViolations('color', 'colour');
    expect(result.length).toBe(1);
    expect(result[0].ruleId).toBe('uk-spelling-our');
    expect(result[0].category).toBe('Spelling');
  });

  test('returns multiple violations when applicable', () => {
    const original = 'The color that realize';
    const edited = 'The colour who realise';
    const result = detectStyleViolations(original, edited);
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  test('handles null/undefined inputs gracefully', () => {
    expect(detectStyleViolations(null, null)).toEqual([]);
    expect(detectStyleViolations(undefined, 'hello')).toEqual([]);
  });
});

// =============================================================================
// getStyleRuleById Function
// =============================================================================

describe('getStyleRuleById', () => {
  test('returns rule for valid ID', () => {
    const rule = getStyleRuleById('uk-spelling-ise');
    expect(rule).not.toBeNull();
    expect(rule.id).toBe('uk-spelling-ise');
    expect(rule.name).toBe('UK Spelling (-ise)');
  });

  test('returns null for invalid ID', () => {
    expect(getStyleRuleById('non-existent-rule')).toBeNull();
    expect(getStyleRuleById('')).toBeNull();
  });
});

// =============================================================================
// PRACTICE/PRACTISE (British English)
// =============================================================================

describe('Practice/Practise Rule', () => {
  const rule = getStyleRuleById('practice-practise');

  test('detects practice (verb) to practise correction', () => {
    expect(rule.detect('I need to practice more', 'I need to practise more')).toBe(true);
    expect(rule.detect('You should practice daily', 'You should practise daily')).toBe(true);
    expect(rule.detect('They will practice tomorrow', 'They will practise tomorrow')).toBe(true);
  });

  test('detects practise (noun) to practice correction', () => {
    expect(rule.detect('the practise of medicine', 'the practice of medicine')).toBe(true);
    expect(rule.detect('my practise session', 'my practice session')).toBe(true);
    expect(rule.detect('in practise', 'in practice')).toBe(true);
  });

  test('returns false when already correct', () => {
    expect(rule.detect('to practise', 'to practise')).toBe(false);
    expect(rule.detect('the practice', 'the practice')).toBe(false);
  });

  test('handles null/undefined gracefully', () => {
    expect(rule.detect(null, 'practise')).toBe(false);
    expect(rule.detect('practice', null)).toBe(false);
  });
});

// =============================================================================
// HOMOPHONES
// =============================================================================

describe('There/Their/They\'re Rule', () => {
  const rule = getStyleRuleById('there-their-theyre');

  test('detects there to their correction', () => {
    expect(rule.detect('there house is big', 'their house is big')).toBe(true);
  });

  test('detects their to there correction', () => {
    expect(rule.detect('go over their', 'go over there')).toBe(true);
  });

  test('detects there to they\'re correction', () => {
    expect(rule.detect('there coming today', 'they\'re coming today')).toBe(true);
  });

  test('returns false when no change', () => {
    expect(rule.detect('their house', 'their house')).toBe(false);
    expect(rule.detect('they\'re coming', 'they\'re coming')).toBe(false);
  });

  test('handles null/undefined gracefully', () => {
    expect(rule.detect(null, 'their')).toBe(false);
    expect(rule.detect('there', null)).toBe(false);
  });
});

describe('Then/Than Rule', () => {
  const rule = getStyleRuleById('then-than');

  test('detects then to than correction (comparison)', () => {
    expect(rule.detect('bigger then me', 'bigger than me')).toBe(true);
    expect(rule.detect('more then enough', 'more than enough')).toBe(true);
  });

  test('detects than to then correction (sequence)', () => {
    expect(rule.detect('first this, than that', 'first this, then that')).toBe(true);
  });

  test('returns false when no change', () => {
    expect(rule.detect('bigger than me', 'bigger than me')).toBe(false);
    expect(rule.detect('then we went', 'then we went')).toBe(false);
  });

  test('handles null/undefined gracefully', () => {
    expect(rule.detect(null, 'than')).toBe(false);
    expect(rule.detect('then', null)).toBe(false);
  });
});

describe('Too/To Rule', () => {
  const rule = getStyleRuleById('too-to');

  test('detects to to too correction (also)', () => {
    expect(rule.detect('me to', 'me too')).toBe(true);
    expect(rule.detect('I want to go to', 'I want to go too')).toBe(true);
  });

  test('detects too to to correction (direction)', () => {
    expect(rule.detect('going too the store', 'going to the store')).toBe(true);
  });

  test('returns false when no change', () => {
    expect(rule.detect('me too', 'me too')).toBe(false);
    expect(rule.detect('going to the store', 'going to the store')).toBe(false);
  });

  test('handles null/undefined gracefully', () => {
    expect(rule.detect(null, 'too')).toBe(false);
    expect(rule.detect('to', null)).toBe(false);
  });
});

// =============================================================================
// PROPER NOUN CAPITALIZATION
// =============================================================================

describe('Proper Noun (Family Terms) Rule', () => {
  const rule = getStyleRuleById('proper-noun-family');

  test('detects lowercase family term as name → capitalized', () => {
    expect(rule.detect('said dad', 'said Dad')).toBe(true);
    expect(rule.detect('asked mom', 'asked Mom')).toBe(true);
    expect(rule.detect('told father', 'told Father')).toBe(true);
  });

  test('detects direct address capitalization', () => {
    expect(rule.detect('Yes, dad', 'Yes, Dad')).toBe(true);
    expect(rule.detect('No, mom', 'No, Mom')).toBe(true);
  });

  test('detects subject capitalization', () => {
    expect(rule.detect('dad is coming', 'Dad is coming')).toBe(true);
    expect(rule.detect('mom said yes', 'Mom said yes')).toBe(true);
  });

  test('returns false when already correct', () => {
    expect(rule.detect('said Dad', 'said Dad')).toBe(false);
    expect(rule.detect('my dad is here', 'my dad is here')).toBe(false);
  });

  test('handles null/undefined gracefully', () => {
    expect(rule.detect(null, 'Dad')).toBe(false);
    expect(rule.detect('dad', null)).toBe(false);
  });
});

// =============================================================================
// WORD SIMPLIFICATION
// =============================================================================

describe('Word Simplification Rule', () => {
  const rule = getStyleRuleById('word-simplification');

  test('detects utilize → use', () => {
    expect(rule.detect('We utilize this tool', 'We use this tool')).toBe(true);
  });

  test('detects commence → begin/start', () => {
    expect(rule.detect('Let us commence', 'Let us begin')).toBe(true);
    expect(rule.detect('The meeting will commence', 'The meeting will start')).toBe(true);
  });

  test('detects subsequently → later/then', () => {
    expect(rule.detect('Subsequently, he left', 'Later, he left')).toBe(true);
  });

  test('detects whilst → while', () => {
    expect(rule.detect('whilst walking', 'while walking')).toBe(true);
  });

  test('detects amongst → among', () => {
    expect(rule.detect('amongst friends', 'among friends')).toBe(true);
  });

  test('returns false when no simplification', () => {
    expect(rule.detect('use this', 'use this')).toBe(false);
    expect(rule.detect('hello world', 'hello world')).toBe(false);
  });

  test('handles null/undefined gracefully', () => {
    expect(rule.detect(null, 'use')).toBe(false);
    expect(rule.detect('utilize', null)).toBe(false);
  });
});

// =============================================================================
// ITALICS FORMATTING
// =============================================================================

describe('Italics for Foreign Words Rule', () => {
  const rule = getStyleRuleById('italics-foreign-words');

  test('detects foreign phrase italicization', () => {
    expect(rule.detect('This is a bona fide offer', 'This is a *bona fide* offer')).toBe(true);
    expect(rule.detect('The status quo must change', 'The *status quo* must change')).toBe(true);
    expect(rule.detect('It happened de facto', 'It happened *de facto*')).toBe(true);
  });

  test('detects South African terms italicization', () => {
    expect(rule.detect('The ubuntu philosophy', 'The *ubuntu* philosophy')).toBe(true);
    expect(rule.detect('We had a braai', 'We had a *braai*')).toBe(true);
  });

  test('returns false when already italicized', () => {
    expect(rule.detect('*status quo*', '*status quo*')).toBe(false);
  });

  test('handles null/undefined gracefully', () => {
    expect(rule.detect(null, '*bona fide*')).toBe(false);
    expect(rule.detect('bona fide', null)).toBe(false);
  });
});

describe('Italics for Book Titles Rule', () => {
  const rule = getStyleRuleById('italics-book-titles');

  test('detects book title italicization', () => {
    expect(rule.detect('I read The Great Gatsby', 'I read *The Great Gatsby*')).toBe(true);
    expect(rule.detect('the book called Pride and Prejudice', 'the book called *Pride and Prejudice*')).toBe(true);
  });

  test('returns false when already italicized', () => {
    expect(rule.detect('*The Great Gatsby*', '*The Great Gatsby*')).toBe(false);
  });

  test('handles null/undefined gracefully', () => {
    expect(rule.detect(null, '*Title*')).toBe(false);
  });
});

describe('Italics for Internal Thought Rule', () => {
  const rule = getStyleRuleById('italics-internal-thought');

  test('detects thought italicization', () => {
    expect(rule.detect('She thought, This is strange.', 'She thought, *This is strange.*')).toBe(true);
    expect(rule.detect('He wondered, What should I do?', 'He wondered, *What should I do?*')).toBe(true);
  });

  test('returns false when no thought marker', () => {
    expect(rule.detect('This is text', 'This is text')).toBe(false);
  });

  test('handles null/undefined gracefully', () => {
    expect(rule.detect(null, 'thought')).toBe(false);
  });
});

// =============================================================================
// CONCORD (SUBJECT-VERB AGREEMENT)
// =============================================================================

describe('Concord: Pronoun Consistency Rule', () => {
  const rule = getStyleRuleById('concord-pronoun-shift');

  test('detects one/we correction', () => {
    expect(rule.detect('When one is challenged, we tend to react', 'When one is challenged, one tends to react')).toBe(true);
  });

  test('returns false when already consistent', () => {
    expect(rule.detect('When one is challenged, one reacts', 'When one is challenged, one reacts')).toBe(false);
  });

  test('handles null/undefined gracefully', () => {
    expect(rule.detect(null, 'one')).toBe(false);
  });
});

describe('Concord: Subject-Verb Agreement Rule', () => {
  const rule = getStyleRuleById('concord-subject-verb');

  test('detects they was → they were correction', () => {
    expect(rule.detect('They was happy', 'They were happy')).toBe(true);
  });

  test('detects he don\'t → he doesn\'t correction', () => {
    expect(rule.detect('He don\'t know', 'He doesn\'t know')).toBe(true);
  });

  test('detects you was → you were correction', () => {
    expect(rule.detect('You was there', 'You were there')).toBe(true);
  });

  test('detects everyone are → everyone is correction', () => {
    expect(rule.detect('Everyone are invited', 'Everyone is invited')).toBe(true);
  });

  test('returns false when already correct', () => {
    expect(rule.detect('They were happy', 'They were happy')).toBe(false);
  });

  test('handles null/undefined gracefully', () => {
    expect(rule.detect(null, 'were')).toBe(false);
  });
});

describe('Concord: Neither/Nor Agreement Rule', () => {
  const rule = getStyleRuleById('concord-neither-nor');

  test('detects neither/nor verb agreement', () => {
    expect(rule.detect('Neither John nor she are coming', 'Neither John nor she is coming')).toBe(true);
  });

  test('returns false when already correct', () => {
    expect(rule.detect('Neither John nor she is coming', 'Neither John nor she is coming')).toBe(false);
  });

  test('handles null/undefined gracefully', () => {
    expect(rule.detect(null, 'neither')).toBe(false);
  });
});

// =============================================================================
// DIALOGUE STRUCTURE
// =============================================================================

describe('New Speaker New Line Rule', () => {
  const rule = getStyleRuleById('dialogue-new-speaker-line');

  test('detects two speakers on same line', () => {
    const original = '"Hello," said John. "Hi there," said Mary.';
    const edited = '"Hello," said John.\n"Hi there," said Mary.';
    expect(rule.detect(original, edited)).toBe(true);
  });

  test('returns false when same speaker', () => {
    const text = '"Hello," said John. "How are you?" said John.';
    expect(rule.detect(text, text)).toBe(false);
  });

  test('handles null/undefined gracefully', () => {
    expect(rule.detect(null, 'dialogue')).toBe(false);
  });
});

describe('Speaker Continuation Format Rule', () => {
  const rule = getStyleRuleById('dialogue-speaker-continuation');

  test('handles null/undefined gracefully', () => {
    expect(rule.detect(null, 'dialogue')).toBe(false);
    expect(rule.detect('text', null)).toBe(false);
  });
});

// =============================================================================
// OXFORD COMMA
// =============================================================================

describe('Oxford Comma Rule', () => {
  const rule = getStyleRuleById('oxford-comma');

  test('detects Oxford comma addition', () => {
    expect(rule.detect('apples, oranges and bananas', 'apples, oranges, and bananas')).toBe(true);
    expect(rule.detect('red, white and blue', 'red, white, and blue')).toBe(true);
  });

  test('detects Oxford comma with "or"', () => {
    expect(rule.detect('cats, dogs or birds', 'cats, dogs, or birds')).toBe(true);
  });

  test('returns false when no change', () => {
    expect(rule.detect('apples, oranges, and bananas', 'apples, oranges, and bananas')).toBe(false);
  });

  test('handles null/undefined gracefully', () => {
    expect(rule.detect(null, 'text')).toBe(false);
    expect(rule.detect('text', null)).toBe(false);
  });
});

// =============================================================================
// EM-DASH / EN-DASH
// =============================================================================

describe('Em-dash/En-dash Rule', () => {
  const rule = getStyleRuleById('em-dash-en-dash');

  test('detects double hyphen to em-dash conversion', () => {
    expect(rule.detect('Hello -- world', 'Hello — world')).toBe(true);
  });

  test('detects spaced hyphen to em-dash conversion', () => {
    expect(rule.detect('Hello - world', 'Hello — world')).toBe(true);
  });

  test('detects en-dash addition for ranges', () => {
    expect(rule.detect('pages 1-10', 'pages 1–10')).toBe(true);
    expect(rule.detect('2020-2025', '2020–2025')).toBe(true);
  });

  test('returns false when no change', () => {
    expect(rule.detect('Hello — world', 'Hello — world')).toBe(false);
  });

  test('handles null/undefined gracefully', () => {
    expect(rule.detect(null, 'text')).toBe(false);
    expect(rule.detect('text', null)).toBe(false);
  });
});

// =============================================================================
// STYLE_RULES Array
// =============================================================================

describe('STYLE_RULES', () => {
  test('contains expected number of rules', () => {
    expect(STYLE_RULES.length).toBeGreaterThanOrEqual(31);
  });

  test('all rules have required properties', () => {
    for (const rule of STYLE_RULES) {
      expect(rule).toHaveProperty('id');
      expect(rule).toHaveProperty('name');
      expect(rule).toHaveProperty('category');
      expect(rule).toHaveProperty('detect');
      expect(rule).toHaveProperty('explanation');
      expect(rule).toHaveProperty('rule');
      expect(typeof rule.detect).toBe('function');
    }
  });

  test('all rule IDs are unique', () => {
    const ids = STYLE_RULES.map(r => r.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});
