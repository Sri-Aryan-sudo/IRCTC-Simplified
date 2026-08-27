/**
 * Converts between a SearchRequest and URL query params, and back.
 * Per spec/05-technical-spec.md §6: a search is URL state — shareable
 * and refresh-safe. Results reconstructs its SearchRequest entirely
 * from the URL; there is no separate search store.
 */

import type { RecommendationCategory, SearchRequest, TravelClass, TravelPriority } from '../types/domain';

const VALID_CLASSES: TravelClass[] = ['SL', '3A', '2A', '1A', 'CC'];
const VALID_PRIORITIES: TravelPriority[] = ['PRICE', 'SPEED', 'CONFIRMATION', 'OVERNIGHT', 'BALANCED'];

export function searchRequestToParams(request: SearchRequest): URLSearchParams {
  const params = new URLSearchParams();
  params.set('from', request.sourceStationCode);
  params.set('to', request.destinationStationCode);
  params.set('date', request.journeyDate);
  params.set('passengers', String(request.passengerCount));
  if (request.preferredClass) params.set('class', request.preferredClass);
  if (request.travelPriority) params.set('priority', request.travelPriority);
  return params;
}

/**
 * Parses a SearchRequest from URL query params. Returns undefined if
 * the required fields (from, to, date, passengers) aren't all
 * present and minimally well-formed — callers should treat that as
 * an invalid/incomplete search, not silently substitute defaults.
 */
export function paramsToSearchRequest(params: URLSearchParams): SearchRequest | undefined {
  const sourceStationCode = params.get('from');
  const destinationStationCode = params.get('to');
  const journeyDate = params.get('date');
  const passengerCountRaw = params.get('passengers');

  if (!sourceStationCode || !destinationStationCode || !journeyDate || !passengerCountRaw) {
    return undefined;
  }

  const passengerCount = Number(passengerCountRaw);
  if (!Number.isInteger(passengerCount) || passengerCount < 1) {
    return undefined;
  }

  const classParam = params.get('class');
  const preferredClass =
    classParam && VALID_CLASSES.includes(classParam as TravelClass) ? (classParam as TravelClass) : undefined;

  const priorityParam = params.get('priority');
  const travelPriority =
    priorityParam && VALID_PRIORITIES.includes(priorityParam as TravelPriority)
      ? (priorityParam as TravelPriority)
      : undefined;

  return {
    sourceStationCode,
    destinationStationCode,
    journeyDate,
    passengerCount,
    preferredClass,
    travelPriority,
  };
}

/**
 * Train Details reuses the same search query params (so "back to
 * results" is a simple link), plus pins `class` to the specific
 * option being viewed — which may differ from the search's own
 * (optional) preferredClass filter. When arriving from a categorized
 * recommendation card, `category` is carried too, so Train Details
 * can restate why this option was recommended (spec/02-ux-spec.md's
 * Train Details key element) — entirely via URL state, so it
 * survives a refresh.
 */
export function buildTrainDetailsSearch(
  searchParams: URLSearchParams,
  travelClass: TravelClass,
  category?: RecommendationCategory,
): string {
  const params = new URLSearchParams(searchParams);
  params.set('class', travelClass);
  if (category) {
    params.set('category', category);
  } else {
    params.delete('category');
  }
  return `?${params.toString()}`;
}

/**
 * Passenger Review reuses the exact same query params as Train
 * Details (so both "back" and a raw refresh work), plus adds `train`
 * — the one piece of identifying information Train Details carries
 * via its path segment instead of a query param. Deliberately not
 * carried via `location.state`: a hard refresh on Passenger Review
 * must still resolve the same train/date/class, per this task's
 * explicit requirement.
 */
export function buildPassengerReviewSearch(searchParams: URLSearchParams, trainNumber: string): string {
  const params = new URLSearchParams(searchParams);
  params.set('train', trainNumber);
  return `?${params.toString()}`;
}

export interface PassengerReviewParams {
  trainNumber: string;
  journeyDate: string;
  travelClass: TravelClass;
}

/** Parses the train/date/class identifying a specific booking-in-progress from Passenger Review's URL. */
export function paramsToPassengerReview(params: URLSearchParams): PassengerReviewParams | undefined {
  const trainNumber = params.get('train');
  const journeyDate = params.get('date');
  const classParam = params.get('class');
  if (!trainNumber || !journeyDate || !classParam || !VALID_CLASSES.includes(classParam as TravelClass)) {
    return undefined;
  }
  return { trainNumber, journeyDate, travelClass: classParam as TravelClass };
}
