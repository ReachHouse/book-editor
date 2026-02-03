/**
 * Unit Tests for styleRules.js
 *
 * Tests the style rule detection functions used to identify
 * Reach Publishers House Style Guide violations.
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
// STYLE_RULES Array
// =============================================================================

describe('STYLE_RULES', () => {
  test('contains expected number of rules', () => {
    expect(STYLE_RULES.length).toBeGreaterThanOrEqual(15);
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
