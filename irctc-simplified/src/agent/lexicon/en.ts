/**
 * English lexicon for the Layer 1 deterministic intent parser.
 * See spec/03-agent-spec.md §4/§18/§22 and spec/05-technical-spec.md §9.
 *
 * Station names/codes are NOT listed here — they're matched directly
 * against src/data/stations.ts, since station names are never
 * translated (spec/03-agent-spec.md §22).
 */

export const lexicon = {
  today: ['today'],
  dayAfterTomorrow: ['day after tomorrow'],
  tomorrow: ['tomorrow'],
  timePreferences: {
    MORNING: ['morning'],
    AFTERNOON: ['afternoon'],
    EVENING: ['evening'],
    NIGHT: ['night'],
  } as Record<'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT', string[]>,
  classHints: {
    '1A': ['first class', 'ac first', '1a'],
    '2A': ['ac 2-tier', '2-tier', '2ac', 'second ac', '2a'],
    '3A': ['ac 3-tier', '3-tier', '3ac', 'third ac', 'ac', '3a'],
    SL: ['sleeper', 'sl'],
    CC: ['chair car', 'cc'],
  } as Record<string, string[]>,
  confirmationMust: [
    'must be confirmed',
    'only confirmed',
    'need confirmed',
    'must have a confirmed',
    'just need a confirmed',
    'must confirm',
  ],
  confirmationPrefer: ['prefer confirmed', 'preferably confirmed', 'want confirmed', 'confirmed seats', 'confirmed'],
  priceCheapest: ['cheapest', 'lowest price', 'cheap'],
  speedFastest: ['fastest', 'quickest', 'as quickly as possible', 'quickly'],
  tatkalIntent: ['tatkal'],
  explainIntent: ['explain', 'what does', 'what is', 'meaning of', 'means'],
  fromPrefixes: ['from '],
  toPrefixes: ['to ', 'reach ', 'reaching ', 'going to ', 'travel to ', 'for '],
  numberWords: {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
  } as Record<string, number>,
};
