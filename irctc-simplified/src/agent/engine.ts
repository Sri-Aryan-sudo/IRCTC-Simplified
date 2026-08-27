/**
 * Agent Engine — see spec/03-agent-spec.md §2/§9/§10 and
 * spec/05-technical-spec.md §9.
 *
 * A set of pure functions, each taking an `AgentSession` and
 * returning a new one (immutable update) — suitable for a single
 * `useReducer` in the `/agent` page. Tool calls happen directly
 * inside these functions since everything is synchronous and local;
 * no effects/saga layer. Never reads/writes `src/data` directly —
 * everything goes through `tools/`.
 */

import { tools } from '../tools';
import { issueApprovalToken } from '../domain/approval';
import { translate, type SupportedLanguage } from '../i18n';
import { getPassengers } from '../services/passengers';
import { getTrain } from '../services/trains';
import { parseIntent, resolveDefaultSource } from './intentParser';
import type {
  AgentIntent,
  AgentSession,
  Booking,
  BookingPassenger,
  RecommendationOption,
  RequiredAgentField,
  TravelPriority,
} from '../types/domain';

const REQUIRED_FIELD_ORDER: RequiredAgentField[] = ['destinationStationCode', 'resolvedDate', 'passengerCount'];

function computeMissingFields(intent: AgentIntent): RequiredAgentField[] {
  const missing = new Set<RequiredAgentField>();
  if (!intent.destinationStationCode) missing.add('destinationStationCode');
  if (!intent.resolvedDate) missing.add('resolvedDate');
  if (!intent.passengerCount) missing.add('passengerCount');
  return REQUIRED_FIELD_ORDER.filter((f) => missing.has(f));
}

const CLARIFICATION_KEY: Record<RequiredAgentField, 'agent.askDestination' | 'agent.askDate' | 'agent.askPassengerCount'> = {
  destinationStationCode: 'agent.askDestination',
  resolvedDate: 'agent.askDate',
  passengerCount: 'agent.askPassengerCount',
};

function priorityFromIntent(intent: AgentIntent): TravelPriority {
  if (intent.confirmationPreference === 'MUST_BE_CONFIRMED' || intent.confirmationPreference === 'PREFER_CONFIRMED') {
    return 'CONFIRMATION';
  }
  if (intent.pricePreference === 'CHEAPEST') return 'PRICE';
  if (intent.speedPreference === 'FASTEST') return 'SPEED';
  return 'BALANCED';
}

export function createSession(userId: string): AgentSession {
  return {
    id: `agent_session_${userId}_${Date.now()}`,
    userId,
    intent: { rawText: '', missingRequiredFields: [] },
    status: 'COLLECTING',
  };
}

/**
 * Runs one user message through intent extraction and — once every
 * required field is resolved — search + ranking, landing on
 * `NEEDS_CLARIFICATION` or `RECOMMENDED`. Never calls
 * `attemptBooking`/`createBooking` (see `approve` below): nothing in
 * this function can cross the approval boundary (spec §8).
 */
export function submitMessage(session: AgentSession, text: string, lang: SupportedLanguage): AgentSession {
  const expectedField = session.status === 'NEEDS_CLARIFICATION' ? session.intent.missingRequiredFields[0] : undefined;
  const extracted = parseIntent(text, lang, expectedField);

  const merged: AgentIntent = {
    ...session.intent,
    ...extracted,
    rawText: session.intent.rawText ? `${session.intent.rawText} ${text}` : text,
    missingRequiredFields: [],
  };
  merged.missingRequiredFields = computeMissingFields(merged);

  if (merged.missingRequiredFields.length > 0) {
    const field = merged.missingRequiredFields[0];
    return {
      ...session,
      intent: merged,
      status: 'NEEDS_CLARIFICATION',
      clarificationPrompt: translate(CLARIFICATION_KEY[field], lang),
    };
  }

  const sourceStationCode = merged.sourceStationCode ?? resolveDefaultSource(merged.destinationStationCode!);
  const resolvedIntent: AgentIntent = { ...merged, sourceStationCode };

  if (!sourceStationCode) {
    return {
      ...session,
      intent: resolvedIntent,
      status: 'NEEDS_CLARIFICATION',
      clarificationPrompt: translate('agent.askSource', lang),
    };
  }

  const candidates = tools.searchTrains({
    sourceStationCode,
    destinationStationCode: resolvedIntent.destinationStationCode!,
    journeyDate: resolvedIntent.resolvedDate!,
    passengerCount: resolvedIntent.passengerCount!,
    preferredClass: resolvedIntent.preferredClass,
  });

  if (candidates.length === 0) {
    return { ...session, intent: resolvedIntent, status: 'RECOMMENDED', recommendation: undefined };
  }

  const recommendations = tools.rankOptions(candidates, { travelPriority: priorityFromIntent(resolvedIntent) });
  const primary = recommendations.find((r) => r.category === 'BEST_OVERALL') ?? recommendations[0];

  return { ...session, intent: resolvedIntent, status: 'RECOMMENDED', recommendation: primary };
}

/** Alternatives to the current recommendation — read-only, allowed while `RECOMMENDED` (spec §9). */
export function requestAlternatives(session: AgentSession): RecommendationOption[] {
  if (!session.recommendation) return [];
  return tools.getAlternatives(session.intent, session.recommendation.trainNumber);
}

/** Switches the working recommendation to an alternative the user picked — still `RECOMMENDED`, not yet approved. */
export function selectRecommendation(session: AgentSession, option: RecommendationOption): AgentSession {
  return { ...session, status: 'RECOMMENDED', recommendation: option };
}

/** Moves to the restate-then-confirm Approval screen (spec §8) — no booking has happened yet. */
export function requestApproval(session: AgentSession): AgentSession {
  if (!session.recommendation) return session;
  return { ...session, status: 'AWAITING_APPROVAL' };
}

export function decline(session: AgentSession): AgentSession {
  return { ...session, status: 'DECLINED' };
}

/** From DECLINED (or after viewing alternatives), returns to reviewing the current recommendation. */
export function backToRecommendation(session: AgentSession): AgentSession {
  return { ...session, status: 'RECOMMENDED' };
}

export interface ApproveResult {
  session: AgentSession;
  booking?: Booking;
  error?: 'NOT_ENOUGH_PASSENGERS' | 'BOOKING_FAILED';
}

/**
 * The ONLY function permitted to obtain an ApprovalToken and call
 * `attemptBooking` + `createBooking` (spec §8/§14). Must only ever be
 * invoked in direct response to the user's explicit "Confirm
 * Booking" action — never speculatively, never from `submitMessage`.
 */
export function approve(session: AgentSession): ApproveResult {
  const option = session.recommendation;
  if (!option) return { session };

  const requiredCount = session.intent.passengerCount ?? 1;
  const savedPassengers = getPassengers(session.userId);
  if (savedPassengers.length < requiredCount) {
    return { session, error: 'NOT_ENOUGH_PASSENGERS' };
  }

  const attempt = tools.attemptBooking(option.trainNumber, option.journeyDate, option.travelClass, 'GENERAL');
  if (attempt.outcome === 'REGRET' || !attempt.availability) {
    return { session, error: 'BOOKING_FAILED' };
  }

  const train = getTrain(option.trainNumber);
  const passengers: BookingPassenger[] = savedPassengers.slice(0, requiredCount).map((p) => ({
    passengerId: p.id,
    name: p.name,
    age: p.age,
    gender: p.gender,
    ...(attempt.outcome === 'CNF' ? { seatNumber: '—', coach: '—' } : {}),
  }));

  const token = issueApprovalToken(`${option.trainNumber}|${option.journeyDate}|${option.travelClass}`);
  const booking = tools.createBooking(
    {
      source: 'AGENT',
      userId: session.userId,
      trainNumber: option.trainNumber,
      journeyDate: option.journeyDate,
      sourceStationCode: train?.sourceStationCode ?? session.intent.sourceStationCode ?? '',
      destinationStationCode: train?.destinationStationCode ?? session.intent.destinationStationCode ?? '',
      travelClass: option.travelClass,
      quota: 'GENERAL',
      status: attempt.outcome,
      fareAmount: attempt.availability.fareAmount * requiredCount,
      passengers,
    },
    token,
  );

  return { session: { ...session, status: 'BOOKED', bookingId: booking.id }, booking };
}
