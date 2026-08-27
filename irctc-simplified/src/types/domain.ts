/**
 * Domain types for IRCTC Simplified.
 *
 * These types are the TypeScript expression of the data contract
 * defined in spec/04-data-spec.md. They are hand-written (not
 * generated) and should be kept in sync with that document manually.
 * If a field here and the spec ever disagree, the spec wins — fix
 * this file, not the other way around.
 */

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

/** Calendar date only, e.g. "2026-08-23". No time component. */
export type ISODate = string;

/** Full timestamp, e.g. "2026-08-23T16:05:00+05:30". */
export type ISODateTime = string;

/** e.g. "MAS", "SC" — 2-5 uppercase letters. */
export type StationCode = string;

/** e.g. "12760" — kept as a string since format matters, not arithmetic. */
export type TrainNumber = string;

/**
 * Prototype simplification: real IRCTC has more class codes
 * (2S, EC, FC, etc.). This is the minimum set needed to make
 * "AC vs non-AC" and "preferred class" decisions meaningful.
 */
export type TravelClass = 'SL' | '3A' | '2A' | '1A' | 'CC';

/**
 * Prototype simplification: real IRCTC has many quotas (Ladies,
 * Senior Citizen, Premium Tatkal, etc.). Only the two quotas the
 * product actually distinguishes between are modeled.
 */
export type Quota = 'GENERAL' | 'TATKAL';

// ---------------------------------------------------------------------------
// User / UserPreferences
// ---------------------------------------------------------------------------

export type BerthPreference =
  | 'LOWER'
  | 'MIDDLE'
  | 'UPPER'
  | 'SIDE_LOWER'
  | 'SIDE_UPPER'
  | 'NO_PREFERENCE';

export type TravelPriority = 'PRICE' | 'SPEED' | 'CONFIRMATION' | 'OVERNIGHT' | 'BALANCED';

export interface UserPreferences {
  preferredClass?: TravelClass;
  berthPreference?: BerthPreference;
  travelPriority?: TravelPriority;
}

export interface User {
  id: string;
  displayName: string;
  preferences: UserPreferences;
  savedPassengerIds: string[];
}

// ---------------------------------------------------------------------------
// Station / Train / TrainAvailability
// ---------------------------------------------------------------------------

export interface Station {
  code: StationCode;
  name: string;
  city: string;
  state: string;
}

export type TrainType =
  | 'EXPRESS'
  | 'SUPERFAST'
  | 'RAJDHANI'
  | 'SHATABDI'
  | 'PASSENGER';

export type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

export interface Train {
  number: TrainNumber;
  name: string;
  trainType: TrainType;
  sourceStationCode: StationCode;
  destinationStationCode: StationCode;
  /** Ordered, includes source & destination. No per-stop timing (out of scope). */
  routeStationCodes: StationCode[];
  /** "HH:mm", local departure clock time. */
  departureTime: string;
  /** "HH:mm", local arrival clock time. */
  arrivalTime: string;
  /** 0 = same day arrival, 1 = next day, etc. */
  arrivalDayOffset: number;
  durationMinutes: number;
  supportedClasses: TravelClass[];
  operatingDays: DayOfWeek[] | 'DAILY';
}

/**
 * The live, searchable status set. Distinct from — and a subset of —
 * StatusCode (see RailwayStatusDefinition below), which additionally
 * covers umbrella/outcome codes that never appear on a live
 * TrainAvailability record (WL, CAN, REGRET).
 */
export type AvailabilityStatusCode =
  | 'CNF'
  | 'RAC'
  | 'GNWL'
  | 'PQWL'
  | 'RLWL'
  | 'TQWL'
  | 'SOLD_OUT';

export interface TrainAvailability {
  trainNumber: TrainNumber;
  journeyDate: ISODate;
  travelClass: TravelClass;
  quota: Quota;
  status: AvailabilityStatusCode;
  /** Required iff status is GNWL/PQWL/RLWL/TQWL, else absent. */
  waitlistPosition?: number;
  /** Required iff status is RAC, else absent. */
  racPosition?: number;
  /** Optional, only meaningful if status is CNF. */
  confirmedSeatsRemaining?: number;
  /**
   * 0 to 1. Prototype simplification: precomputed directly on the
   * mock record rather than derived at runtime by a real forecasting
   * model. Must be 0 when status is SOLD_OUT, 1 when status is CNF.
   */
  confirmationLikelihood: number;
  /** INR, whole rupees. */
  fareAmount: number;
}

// ---------------------------------------------------------------------------
// Passenger
// ---------------------------------------------------------------------------

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface Passenger {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  /** True if this passenger came from User.savedPassengerIds. */
  isSaved: boolean;
}

// ---------------------------------------------------------------------------
// SearchRequest / SearchResult / RecommendationOption
// ---------------------------------------------------------------------------

export interface SearchRequest {
  sourceStationCode: StationCode;
  destinationStationCode: StationCode;
  journeyDate: ISODate;
  passengerCount: number;
  preferredClass?: TravelClass;
  travelPriority?: TravelPriority;
}

export type RecommendationCategory =
  | 'BEST_OVERALL'
  | 'FASTEST'
  | 'CHEAPEST'
  | 'BEST_CONFIRMATION_CHANCE';

export interface RecommendationOption {
  category: RecommendationCategory;
  trainNumber: TrainNumber;
  journeyDate: ISODate;
  travelClass: TravelClass;
  /** Plain-language "recommended because…" text (Product Principle 3). */
  reasonSummary: string;
  /** Used when a requirement was only partially met. */
  tradeOffNote?: string;
}

export interface SearchResult {
  request: SearchRequest;
  /** Up to 4, one per category present. */
  recommendations: RecommendationOption[];
  /** Secondary/opt-in list beyond the categorized recommendations. */
  moreOptions: TrainAvailability[];
}

// ---------------------------------------------------------------------------
// RailwayStatusDefinition
// ---------------------------------------------------------------------------

/**
 * Superset of AvailabilityStatusCode: everything the Status
 * Translator must be able to explain, including codes that never
 * appear on a live TrainAvailability record.
 */
export type StatusCode =
  | 'CNF'
  | 'RAC'
  | 'GNWL'
  | 'PQWL'
  | 'RLWL'
  | 'TQWL'
  | 'WL'
  | 'SOLD_OUT'
  | 'CAN'
  | 'REGRET';

export type StatusCategory =
  | 'CONFIRMED'
  | 'PARTIALLY_CONFIRMED'
  | 'WAITLISTED'
  | 'UNAVAILABLE'
  | 'CANCELLED'
  | 'FAILED';

export interface RailwayStatusDefinition {
  code: StatusCode;
  displayLabel: string;
  category: StatusCategory;
  canBoard: boolean;
  isFullyConfirmed: boolean;
  isWaitlisted: boolean;
  positionApplicable: boolean;
  /** Principle 1's "human explanation." May contain a "{position}" placeholder. */
  plainExplanation: string;
  /** "What the user should consider doing," when applicable. */
  suggestedConsideration?: string;
  /** True if this code can appear on a TrainAvailability record. */
  isLiveAvailabilityStatus: boolean;
}

// ---------------------------------------------------------------------------
// Agent: AgentIntent / AgentSession
// ---------------------------------------------------------------------------

export type TimePreference = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT' | 'ANY';
export type ConfirmationPreference = 'MUST_BE_CONFIRMED' | 'PREFER_CONFIRMED' | 'ANY';
export type PricePreference = 'CHEAPEST' | 'ANY';
export type SpeedPreference = 'FASTEST' | 'ANY';

export type RequiredAgentField =
  | 'destinationStationCode'
  | 'resolvedDate'
  | 'passengerCount';

export interface AgentIntent {
  /** The user's original input, preserved verbatim. */
  rawText: string;
  sourceStationCode?: StationCode;
  destinationStationCode?: StationCode;
  /** The raw phrase, e.g. "tomorrow". */
  dateExpression?: string;
  /** dateExpression resolved to a concrete date. */
  resolvedDate?: ISODate;
  timePreference?: TimePreference;
  passengerCount?: number;
  preferredClass?: TravelClass;
  confirmationPreference?: ConfirmationPreference;
  pricePreference?: PricePreference;
  speedPreference?: SpeedPreference;
  missingRequiredFields: RequiredAgentField[];
}

export type AgentSessionStatus =
  | 'COLLECTING'
  | 'NEEDS_CLARIFICATION'
  | 'SEARCHING'
  | 'RECOMMENDED'
  | 'AWAITING_APPROVAL'
  | 'DECLINED'
  | 'BOOKED';

export interface AgentSession {
  id: string;
  userId: string;
  intent: AgentIntent;
  status: AgentSessionStatus;
  /** Required iff status is NEEDS_CLARIFICATION. */
  clarificationPrompt?: string;
  /** Required iff status is RECOMMENDED/AWAITING_APPROVAL/DECLINED/BOOKED. */
  recommendation?: RecommendationOption;
  /** Required iff status is BOOKED. */
  bookingId?: string;
}

// ---------------------------------------------------------------------------
// Booking / BookingPassenger
// ---------------------------------------------------------------------------

export type BookingSource = 'SMART_SEARCH' | 'AGENT' | 'TATKAL';

/**
 * Prototype simplification: a Booking is only ever created on a
 * successful outcome. A failed Tatkal attempt produces a
 * TatkalAttempt with outcome REGRET, never a Booking — cancellation
 * is an explicit product non-goal, so CAN never appears here either.
 */
export type BookingStatus = 'CNF' | 'RAC';

export interface BookingPassenger {
  /** Reference to the source Passenger, if this came from a saved passenger. */
  passengerId?: string;
  name: string;
  age: number;
  gender: Gender;
  /** Only meaningful when the parent booking's status is CNF. */
  seatNumber?: string;
  /** Only meaningful when the parent booking's status is CNF. */
  coach?: string;
}

export interface Booking {
  id: string;
  /** Mock 10-digit numeric string, unique. Not a real PNR algorithm. */
  pnr: string;
  source: BookingSource;
  userId: string;
  trainNumber: TrainNumber;
  journeyDate: ISODate;
  sourceStationCode: StationCode;
  destinationStationCode: StationCode;
  travelClass: TravelClass;
  quota: Quota;
  status: BookingStatus;
  /** Snapshot of TrainAvailability.fareAmount at booking time. */
  fareAmount: number;
  passengers: BookingPassenger[];
  bookedAt: ISODateTime;
}

// ---------------------------------------------------------------------------
// Tatkal: TatkalPreparation / TatkalAttempt
// ---------------------------------------------------------------------------

export interface TatkalPreparation {
  id: string;
  userId: string;
  sourceStationCode: StationCode;
  destinationStationCode: StationCode;
  journeyDate: ISODate;
  passengerIds: string[];
  preferredClass: TravelClass;
  preferredTrainNumber: TrainNumber;
  /** Non-empty — Preparation screen requires at least one backup before "ready". */
  backupTrainNumbers: TrainNumber[];
  isReady: boolean;
  /** The simulated Tatkal opening time Countdown counts down to. */
  tatkalOpensAt: ISODateTime;
}

/**
 * REGRET here specifically means "this attempt did not result in a
 * booking" — the live-producible use of the REGRET status code.
 */
export type TatkalAttemptOutcome = 'CNF' | 'RAC' | 'REGRET';

export interface TatkalAttempt {
  id: string;
  preparationId: string;
  /** The preferred train, or one of the backups. */
  trainNumber: TrainNumber;
  /** 0 for preferred, 1..n for backups in prepared order. */
  attemptOrder: number;
  attemptedAt: ISODateTime;
  outcome: TatkalAttemptOutcome;
  /** Required iff outcome is CNF or RAC. */
  resultingBookingId?: string;
}

// ---------------------------------------------------------------------------
// DemoScenario
// ---------------------------------------------------------------------------

export interface DemoScenarioExpectedStatus {
  trainNumber: TrainNumber;
  travelClass: TravelClass;
  status: AvailabilityStatusCode;
}

export interface DemoScenarioExpectedRecommendation {
  category: RecommendationCategory;
  trainNumber: TrainNumber;
}

export interface DemoScenarioTatkal {
  preparationId: string;
  expectedPreferredOutcome: TatkalAttemptOutcome;
  /** In backup order. */
  expectedBackupOutcomes: TatkalAttemptOutcome[];
}

export interface DemoScenario {
  id: string;
  purpose: string;
  searchInput?: SearchRequest;
  expectedTrainNumbers?: TrainNumber[];
  expectedRecommendations?: DemoScenarioExpectedRecommendation[];
  expectedStatuses?: DemoScenarioExpectedStatus[];
  agentInputText?: string;
  expectedAgentIntent?: Partial<AgentIntent>;
  tatkalScenario?: DemoScenarioTatkal;
  expectedOutcome: string;
}
