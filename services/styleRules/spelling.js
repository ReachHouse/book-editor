/**
 * UK Spelling Rules
 * Reach Publishers House Style Guide - UK English spelling conventions
 */

module.exports = [
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
  }
];
