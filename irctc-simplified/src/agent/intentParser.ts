/**
 * Layer 1 deterministic intent parser. See spec/03-agent-spec.md §4,
 * §18, §22 and spec/05-technical-spec.md §9. Pattern/keyword matching
 * only — no LLM. Populates `AgentIntent` exactly as locked in
 * spec/04-data-spec.md; adds no fields.
 *
 * Also exports `classifyRequestKind` (spec/03-agent-spec.md §3): the
 * request-kind decision the agent makes *before* intent extraction,
 * not a field stored on `AgentIntent`.
 */

import { stations } from '../data';
import { trains } from '../data';
import { DEMO_TODAY, addDays } from '../data';
import { getLexicon } from './lexicon';
import type { SupportedLanguage } from '../i18n';
import type {
  AgentIntent,
  ConfirmationPreference,
  PricePreference,
  RequiredAgentField,
  SpeedPreference,
  Station,
  StatusCode,
  TimePreference,
  TravelClass,
} from '../types/domain';

export type RequestKind = 'STATUS' | 'TATKAL' | 'BOOKING';

const STATUS_CODES: StatusCode[] = ['CNF', 'RAC', 'GNWL', 'PQWL', 'RLWL', 'TQWL', 'WL', 'SOLD_OUT', 'CAN', 'REGRET'];

/**
 * Decides which of the three request kinds (§3) applies, from the
 * raw text alone. Status-explanation is checked first (an explicit
 * "explain X" question is unambiguous); Tatkal-intent next (an
 * explicit keyword); everything else is a booking-intent request.
 */
export function classifyRequestKind(text: string, lang: SupportedLanguage): RequestKind {
  const lower = text.toLowerCase();
  const lexicon = getLexicon(lang);

  const mentionsStatusCode = STATUS_CODES.some((code) => new RegExp(`\\b${code.toLowerCase()}\\b`).test(lower));
  const mentionsExplainWord = lexicon.explainIntent.some((w) => lower.includes(w));
  if (mentionsStatusCode && mentionsExplainWord) return 'STATUS';

  if (lexicon.tatkalIntent.some((w) => lower.includes(w))) return 'TATKAL';

  return 'BOOKING';
}

/** Extracts a StatusCode + optional position from a status-explanation request, e.g. "Explain GNWL 24". */
export function parseStatusQuery(text: string): { code: StatusCode; position?: number } | undefined {
  const lower = text.toLowerCase();
  const code = STATUS_CODES.find((c) => new RegExp(`\\b${c.toLowerCase()}\\b`).test(lower));
  if (!code) return undefined;
  const positionMatch = lower.match(new RegExp(`${code.toLowerCase()}\\D{0,5}(\\d+)`));
  const position = positionMatch ? Number(positionMatch[1]) : undefined;
  return { code, position };
}

/** Dominant station for a shared city name — ranked by how often it appears in the mock train dataset. */
function rankedStations(): Station[] {
  const referenceCount = new Map<string, number>();
  for (const train of trains) {
    referenceCount.set(train.sourceStationCode, (referenceCount.get(train.sourceStationCode) ?? 0) + 1);
    referenceCount.set(
      train.destinationStationCode,
      (referenceCount.get(train.destinationStationCode) ?? 0) + 1,
    );
  }
  return [...stations].sort((a, b) => (referenceCount.get(b.code) ?? 0) - (referenceCount.get(a.code) ?? 0));
}

function findStationWithPrefix(lower: string, prefixes: string[], ranked: Station[]): Station | undefined {
  for (const station of ranked) {
    const candidates = [station.code.toLowerCase(), station.name.toLowerCase(), station.city.toLowerCase()];
    for (const prefix of prefixes) {
      for (const candidate of candidates) {
        if (lower.includes(prefix + candidate)) return station;
      }
    }
  }
  return undefined;
}

function findAnyStationMention(lower: string, ranked: Station[], exclude?: Station): Station | undefined {
  for (const station of ranked) {
    if (exclude && station.code === exclude.code) continue;
    const codeMatch = new RegExp(`\\b${station.code.toLowerCase()}\\b`).test(lower);
    if (codeMatch || lower.includes(station.name.toLowerCase()) || lower.includes(station.city.toLowerCase())) {
      return station;
    }
  }
  return undefined;
}

const CLASS_PRIORITY: TravelClass[] = ['1A', '2A', 'CC', 'SL', '3A'];

function extractClass(lower: string, classHints: Record<string, string[]>): TravelClass | undefined {
  for (const cls of CLASS_PRIORITY) {
    if ((classHints[cls] ?? []).some((w) => lower.includes(w))) return cls;
  }
  return undefined;
}

const GROUP_WORDS = ['people', 'passengers', 'of us', 'travellers', 'travelers', 'adults', 'persons'];

function extractPassengerCount(
  lower: string,
  numberWords: Record<string, number>,
  expectedField?: RequiredAgentField,
): number | undefined {
  const digitMatch = lower.match(/(\d+)\s*(?:people|passengers|of us|travellers|travelers|adults|persons)/);
  if (digitMatch) return Number(digitMatch[1]);

  for (const [word, value] of Object.entries(numberWords)) {
    if (GROUP_WORDS.some((g) => new RegExp(`\\b${word}\\b\\s*${g}`).test(lower))) return value;
  }

  if (expectedField === 'passengerCount') {
    const trimmed = lower.trim();
    if (/^\d+$/.test(trimmed)) return Number(trimmed);
    if (numberWords[trimmed] !== undefined) return numberWords[trimmed];
  }

  return undefined;
}

function extractDate(
  lower: string,
  lexicon: ReturnType<typeof getLexicon>,
): { dateExpression?: string; resolvedDate?: string } {
  if (lexicon.dayAfterTomorrow.some((w) => lower.includes(w))) {
    return { dateExpression: 'day after tomorrow', resolvedDate: addDays(DEMO_TODAY, 2) };
  }
  if (lexicon.tomorrow.some((w) => lower.includes(w))) {
    return { dateExpression: 'tomorrow', resolvedDate: addDays(DEMO_TODAY, 1) };
  }
  if (lexicon.today.some((w) => lower.includes(w))) {
    return { dateExpression: 'today', resolvedDate: DEMO_TODAY };
  }
  const isoMatch = lower.match(/\d{4}-\d{2}-\d{2}/);
  if (isoMatch) return { dateExpression: isoMatch[0], resolvedDate: isoMatch[0] };
  return {};
}

function extractTimePreference(
  lower: string,
  timePreferences: Record<Exclude<TimePreference, 'ANY'>, string[]>,
): TimePreference {
  for (const [pref, words] of Object.entries(timePreferences) as [Exclude<TimePreference, 'ANY'>, string[]][]) {
    if (words.some((w) => lower.includes(w))) return pref;
  }
  return 'ANY';
}

function extractConfirmationPreference(lower: string, lexicon: ReturnType<typeof getLexicon>): ConfirmationPreference {
  if (lexicon.confirmationMust.some((w) => lower.includes(w))) return 'MUST_BE_CONFIRMED';
  if (lexicon.confirmationPrefer.some((w) => lower.includes(w))) return 'PREFER_CONFIRMED';
  return 'ANY';
}

function extractPricePreference(lower: string, lexicon: ReturnType<typeof getLexicon>): PricePreference {
  return lexicon.priceCheapest.some((w) => lower.includes(w)) ? 'CHEAPEST' : 'ANY';
}

function extractSpeedPreference(lower: string, lexicon: ReturnType<typeof getLexicon>): SpeedPreference {
  return lexicon.speedFastest.some((w) => lower.includes(w)) ? 'FASTEST' : 'ANY';
}

/**
 * Extracts whatever this one message reveals. Does not compute
 * `missingRequiredFields` (the engine merges this against
 * accumulated intent across turns before deciding that) — a bare
 * partial per-turn extraction, not a complete `AgentIntent`.
 *
 * `expectedField` is the single field the agent most recently asked
 * about (§5) — used to interpret a short, bare answer like "2" or
 * "tomorrow" that wouldn't otherwise match a keyword pattern.
 */
export function parseIntent(
  text: string,
  lang: SupportedLanguage,
  expectedField?: RequiredAgentField,
): Partial<AgentIntent> {
  const lower = text.toLowerCase();
  const lexicon = getLexicon(lang);
  const ranked = rankedStations();

  const source = findStationWithPrefix(lower, lexicon.fromPrefixes, ranked);
  let destination = findStationWithPrefix(lower, lexicon.toPrefixes, ranked);
  if (!destination) {
    destination = findAnyStationMention(lower, ranked, source);
  }
  if (expectedField === 'destinationStationCode' && !destination) {
    destination = findAnyStationMention(lower, ranked);
  }

  const { dateExpression, resolvedDate } = extractDate(lower, lexicon);
  const passengerCount = extractPassengerCount(lower, lexicon.numberWords, expectedField);

  const result: Partial<AgentIntent> = {
    sourceStationCode: source?.code,
    destinationStationCode: destination?.code,
    dateExpression,
    resolvedDate,
    timePreference: extractTimePreference(lower, lexicon.timePreferences),
    passengerCount,
    preferredClass: extractClass(lower, lexicon.classHints),
    confirmationPreference: extractConfirmationPreference(lower, lexicon),
    pricePreference: extractPricePreference(lower, lexicon),
    speedPreference: extractSpeedPreference(lower, lexicon),
  };

  // Strip undefined so merging into accumulated intent never clobbers
  // a previously-known value with `undefined`.
  return Object.fromEntries(Object.entries(result).filter(([, v]) => v !== undefined));
}

/**
 * Deterministic default for `sourceStationCode` when never mentioned
 * (spec/03-agent-spec.md §4): since this prototype has no persisted
 * "home station" on `UserPreferences`, the default is derived from
 * the mock dataset itself — the most common origin among trains that
 * actually terminate at the known destination. This is a documented,
 * data-driven implementation decision (not a guess): for every
 * destination in the demo dataset there is one dominant origin.
 */
export function resolveDefaultSource(destinationStationCode: string): string | undefined {
  const counts = new Map<string, number>();
  for (const train of trains) {
    if (train.destinationStationCode === destinationStationCode) {
      counts.set(train.sourceStationCode, (counts.get(train.sourceStationCode) ?? 0) + 1);
    }
  }
  let best: string | undefined;
  let bestCount = 0;
  for (const [code, count] of counts) {
    if (count > bestCount) {
      best = code;
      bestCount = count;
    }
  }
  return best;
}
