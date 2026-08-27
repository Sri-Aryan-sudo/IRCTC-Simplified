# 04 — Data Spec

Status: source of truth for the data contract.

This document defines the **data contract** for the prototype: every
entity, field, relationship, and validation rule needed to support
`01-product-spec.md` and `02-ux-spec.md`. It does **not** define
actual mock records/datasets (that's a later data-generation task),
database tables, API endpoints, LLM provider, agent tools, React
state, component props, or backend architecture — those belong to
`03-agent-spec.md`, `05-technical-spec.md`, or later implementation
work.

Every entity and field below exists because a specific screen or
product requirement needs it. Where an entity from the requested list
is folded into another for simplicity, that's called out explicitly
rather than left implicit.

## Data principle

This is a frontend-first hackathon prototype with no real IRCTC
backend. All data is **deterministic mock data** — the same inputs
must produce the same outputs every time, so a judge sees identical
demo behavior on every run. The model should still be realistic
enough (plausible train numbers, station codes, fares, statuses) to
feel convincing, without modeling real IRCTC's full complexity (see
"Prototype simplification" notes throughout).

## Data traced to UX (overview)

Before the detailed schemas, here is which screens in
`02-ux-spec.md` need which data, at a glance. The full,
screen-by-screen version is in **Data Required by Screen** at the end
of this document.

```
Login              → User
Home               → User, UserPreferences, TatkalPreparation (resume)
Smart Search       → SearchRequest, Station, UserPreferences, Passenger
Results            → SearchResult, RecommendationOption, TrainAvailability,
                      RailwayStatusDefinition
Train Details      → Train, TrainAvailability, RailwayStatusDefinition,
                      RecommendationOption (carried context)
Passenger Review    → Passenger, UserPreferences, Train, TrainAvailability
Booking Success    → Booking, BookingPassenger
Agent              → AgentSession, AgentIntent
Recommendation     → AgentSession, RecommendationOption, TrainAvailability,
                      RailwayStatusDefinition
Approval           → AgentSession, RecommendationOption
Understand My      → RailwayStatusDefinition
  Status
My Bookings        → Booking, Train, User
Booking Details    → Booking, BookingPassenger, Train, RailwayStatusDefinition
Tatkal Mode        → TatkalPreparation
Preparation        → TatkalPreparation, Passenger, UserPreferences, Train
Countdown          → TatkalPreparation
Booking Attempt →  → TatkalPreparation, TatkalAttempt, TrainAvailability,
  Success/Backup      RailwayStatusDefinition, Booking
```

## Entity list

The product/UX specs imply the following entities. Several of the 19
entities requested for evaluation are intentionally **combined** into
a related entity rather than kept standalone — each combination is
noted where it happens, per the instruction that separate entities
should only exist when clearly required.

1. [User](#user)
2. [UserPreferences](#userpreferences)
3. [Station](#station)
4. [Train](#train) *(TrainRoute folded in — see below)*
5. [TrainAvailability](#trainavailability) *(Fare folded in — see below)*
6. [Passenger](#passenger)
7. [SearchRequest](#searchrequest)
8. [SearchResult](#searchresult)
9. [RecommendationOption](#recommendationoption) *(the "Recommendation" entity)*
10. [RailwayStatusDefinition](#railwaystatusdefinition)
11. [AgentIntent](#agentintent)
12. [AgentSession](#agentsession)
13. [Booking](#booking)
14. [BookingPassenger](#bookingpassenger) *(embedded within Booking)*
15. [TatkalPreparation](#tatkalpreparation)
16. [TatkalAttempt](#tatkalattempt)
17. [DemoScenario](#demoscenario)

---

## Shared primitive types

Used across multiple entities below.

```ts
type ISODate = string        // "2026-08-23" — calendar date, no time
type ISODateTime = string    // "2026-08-23T16:05:00+05:30"
type StationCode = string    // e.g. "MAS", "SC" — 2-5 uppercase letters
type TrainNumber = string    // e.g. "12760" — 5-digit string (kept as
                              // string, not number, since leading
                              // digits/format matter more than math)

type TravelClass = 'SL' | '3A' | '2A' | '1A' | 'CC'
// Sleeper, AC 3-tier, AC 2-tier, AC First, Chair Car.
// Prototype simplification: real IRCTC has more class codes
// (2S, EC, FC, etc.); this is the minimum set needed to make
// "AC vs non-AC" and "preferred class" decisions meaningful in the
// demo.

type Quota = 'GENERAL' | 'TATKAL'
// Prototype simplification: real IRCTC has many quotas (Ladies,
// Senior Citizen, Premium Tatkal, etc.). Only the two quotas the
// product actually distinguishes between (Smart Search/Agent use
// GENERAL; Tatkal Mode uses TATKAL) are modeled.
```

---

## User

**Purpose:** Represents a signed-in (mock) identity so the app can
attach preferences, saved passengers, and bookings to someone. Backs
the Login screen and every personalization touchpoint downstream.

**Fields:**

```ts
interface User {
  id: string              // required
  displayName: string     // required — shown in the signed-in indicator
  preferences: UserPreferences // required, see below
  savedPassengerIds: string[]  // required, may be empty — refs to Passenger
}
```

No email, phone, password, or any real-identity field exists, per the
product spec ("no real personal data"). The mocked Login screen does
not need to validate a credential against a User record for the MVP —
it only needs to establish *which* mock User is "signed in" for the
session.

**Relationships:** `savedPassengerIds` reference existing
`Passenger` records (see below). `preferences` is a required embedded
`UserPreferences` object, not a separate lookup — a user without
customized preferences still has a `UserPreferences` object with
defaults, so downstream screens never need to null-check it.

**Validation rules:**
- `savedPassengerIds` must only contain IDs that exist in the
  `Passenger` dataset.

**Example shape:**

```json
{
  "id": "user_1",
  "displayName": "Aravind",
  "preferences": { "preferredClass": "3A", "berthPreference": "LOWER", "travelPriority": "BALANCED" },
  "savedPassengerIds": ["passenger_1", "passenger_2"]
}
```

---

## UserPreferences

**Purpose:** The personalization data the product spec calls out
explicitly (preferred class, berth preference, saved passengers,
travel priority), used to pre-fill Smart Search, Passenger Review,
and Tatkal Preparation so a returning user types less.

**Fields:**

```ts
interface UserPreferences {
  preferredClass?: TravelClass         // optional
  berthPreference?: 'LOWER' | 'MIDDLE' | 'UPPER' | 'SIDE_LOWER' | 'SIDE_UPPER' | 'NO_PREFERENCE' // optional
  travelPriority?: 'PRICE' | 'SPEED' | 'CONFIRMATION' | 'BALANCED'   // optional
  // savedPassengerIds lives on User, not here, since "saved
  // passengers" is closer to identity/roster than to a preference
  // toggle — kept off this type to avoid duplicating the same list
  // in two places.
}
```

All fields are optional: a user with no preferences set should not
break pre-fill logic, it should simply mean "nothing to pre-fill."

**On Multilingual Experience and this entity:** `UserPreferences` is
the natural place a persisted language preference *would* go if one
were needed — but it isn't added here. The UX requirement (per
`02-ux-spec.md`'s Cross-cutting Language Selection) is that language
selection works on the Login screen itself, before any signed-in
`User` exists, and persists only "throughout the current session."
Both of those are satisfied by treating the selected language as
client-side presentation state — the same category of thing as which
screen the user is currently on — rather than as domain data that
belongs in this data contract. This keeps the architectural
separation the product needs anyway: domain data (`TrainAvailability.
status`, etc.) is never language-specific, and by the same logic,
*which* language the user reads it in isn't domain data either. If a
future task needs the selection to survive across logins/devices
(true durable persistence, not just session persistence), that's a
deliberate amendment to make then, not something this document
should add speculatively now.

**Relationships:** Embedded 1:1 within `User`.

**Validation rules:** None beyond enum membership for set fields.

**Example shape:**

```json
{ "preferredClass": "3A", "berthPreference": "LOWER", "travelPriority": "CONFIRMATION" }
```

---

## Station

**Purpose:** Identifies journey endpoints (and, minimally, route
stops) for Smart Search, Agent intent, and Train records. Needed
anywhere a source/destination is entered or displayed.

**Fields:**

```ts
interface Station {
  code: StationCode  // required — e.g. "MAS"
  name: string        // required — e.g. "Chennai Central"
  city: string         // required — e.g. "Chennai"
  state: string         // required — e.g. "Tamil Nadu"
}
```

**Relationships:** Referenced by `Train.sourceStationCode`,
`Train.destinationStationCode`, `Train.routeStationCodes`,
`SearchRequest.sourceStationCode` / `destinationStationCode`, and
`Booking`/`TatkalPreparation` journey fields.

**Validation rules:**
- `code` must be unique across the dataset.

**Example shape:**

```json
{ "code": "MAS", "name": "Chennai Central", "city": "Chennai", "state": "Tamil Nadu" }
```

---

## Train

**Purpose:** The static, date-independent definition of a train:
what it's called, where it runs, what classes it offers, and its
typical timing. Backs Results, Train Details, Passenger Review,
Tatkal Preparation, and the Agent's search/recommend steps.

*Combines the requested "TrainRoute / route information" entity*: a
full stop-by-stop timetable (arrival/departure per intermediate
station) is unnecessary timetable-level detail for this prototype.
Route information is represented as an ordered list of station codes
on the `Train` record itself; per-stop timing is not modeled, since
no screen in `02-ux-spec.md` needs it.

**Fields:**

```ts
interface Train {
  number: TrainNumber            // required — unique, e.g. "12760"
  name: string                    // required — e.g. "Charminar Express"
  trainType: 'EXPRESS' | 'SUPERFAST' | 'RAJDHANI' | 'SHATABDI' | 'PASSENGER' // required
  sourceStationCode: StationCode  // required
  destinationStationCode: StationCode // required
  routeStationCodes: StationCode[]    // required — ordered, includes source & destination
  departureTime: string            // required — "HH:mm", train's local departure clock time
  arrivalTime: string               // required — "HH:mm", arrival clock time
  arrivalDayOffset: number           // required — 0 = same day, 1 = next day, etc.
  durationMinutes: number             // required — stored directly for
                                        // consistent display rather than
                                        // recomputed from clock times
  supportedClasses: TravelClass[]     // required — non-empty
  operatingDays: ('MON'|'TUE'|'WED'|'THU'|'FRI'|'SAT'|'SUN')[] | 'DAILY' // required
}
```

**Relationships:**
- `sourceStationCode`, `destinationStationCode`, and every entry in
  `routeStationCodes` must reference an existing `Station.code`.
- `routeStationCodes` must start with `sourceStationCode` and end
  with `destinationStationCode`.
- `TrainAvailability` records reference `Train.number`, and their
  `class` must be one of `Train.supportedClasses`.

**Validation rules:**
- `number` unique across the dataset.
- `supportedClasses` non-empty.
- `durationMinutes` must be consistent with `departureTime`,
  `arrivalTime`, and `arrivalDayOffset` (not independently
  contradictory) — this is a data-generation-time check, not a
  runtime one, since the data is static mock data.

**Example shape:**

```json
{
  "number": "12760",
  "name": "Charminar Express",
  "trainType": "EXPRESS",
  "sourceStationCode": "MAS",
  "destinationStationCode": "SC",
  "routeStationCodes": ["MAS", "BZA", "SC"],
  "departureTime": "18:00",
  "arrivalTime": "06:50",
  "arrivalDayOffset": 1,
  "durationMinutes": 770,
  "supportedClasses": ["SL", "3A", "2A"],
  "operatingDays": "DAILY"
}
```

---

## TrainAvailability

**Purpose:** The date-and-class-specific record that says "for this
train, on this date, in this class, under this quota — here's the
current status, fare, and position." This is the single most
important entity in the dataset: almost everything Results, Train
Details, Passenger Review, and Tatkal Mode display comes from here.

*Combines the requested "Fare" entity*: fare doesn't vary
independently of train/date/class/quota in this model, so rather than
a separate `Fare` lookup, `fareAmount` lives directly on
`TrainAvailability`. This avoids a join that would only ever resolve
to one record anyway.

**Fields:**

```ts
interface TrainAvailability {
  trainNumber: TrainNumber       // required
  journeyDate: ISODate            // required
  travelClass: TravelClass         // required
  quota: Quota                      // required — GENERAL or TATKAL
  status: AvailabilityStatusCode     // required, see Availability Model below
  waitlistPosition?: number           // required IF status is GNWL/PQWL/RLWL/TQWL, else absent
  racPosition?: number                 // required IF status is RAC, else absent
  confirmedSeatsRemaining?: number      // optional, only meaningful if status is CNF
  confirmationLikelihood: number         // required — 0 to 1, see note below
  fareAmount: number                      // required — INR, whole rupees
}
```

`confirmationLikelihood` is a **prototype simplification**: rather
than have the recommendation engine compute a real forecasting model
from waitlist position/quota/history at runtime, the mock dataset
carries a precomputed likelihood value directly. This is what powers
"Best Chance of Confirmation" in Results — see Recommendation Data
below. The actual selection/ranking algorithm that *uses* this field
is defined later, in `03-agent-spec.md`/`05-technical-spec.md`; this
spec only guarantees the input exists.

**Relationships:**
- `trainNumber` must reference an existing `Train.number`.
- `travelClass` must be one of that train's `supportedClasses`.
- Referenced by `RecommendationOption`, `Booking`, `TatkalAttempt`.

**Validation rules:**
- Composite key (`trainNumber`, `journeyDate`, `travelClass`,
  `quota`) must be unique.
- `waitlistPosition` present only when `status` is one of
  `GNWL`/`PQWL`/`RLWL`/`TQWL`; absent otherwise.
- `racPosition` present only when `status` is `RAC`; absent
  otherwise.
- `confirmationLikelihood` must be `0` when `status` is `SOLD_OUT`,
  and `1` when `status` is `CNF`.

**Example shape:**

```json
{
  "trainNumber": "12760",
  "journeyDate": "2026-08-24",
  "travelClass": "3A",
  "quota": "GENERAL",
  "status": "GNWL",
  "waitlistPosition": 24,
  "confirmationLikelihood": 0.35,
  "fareAmount": 1240
}
```

---

## Passenger

**Purpose:** A person being booked — either a saved passenger tied to
a `User` (for pre-fill) or a one-off passenger entered during
Passenger Review or Tatkal Preparation.

**Fields:**

```ts
interface Passenger {
  id: string           // required
  name: string           // required
  age: number              // required
  gender: 'MALE' | 'FEMALE' | 'OTHER' // required
  isSaved: boolean          // required — true if this came from User.savedPassengerIds
}
```

**Relationships:** Referenced by `User.savedPassengerIds`,
`Booking.passengers` (as a snapshot, see `BookingPassenger`), and
`TatkalPreparation.passengerIds`.

**Validation rules:**
- `age` must be a positive integer.

**Example shape:**

```json
{ "id": "passenger_1", "name": "Aravind Kumar", "age": 29, "gender": "MALE", "isSaved": true }
```

---

## SearchRequest

**Purpose:** Captures what the user asked for on the Smart Search
screen — the input to the search/recommendation process, and the
thing Results and its "back to Smart Search" behavior needs to
preserve.

**Fields:**

```ts
interface SearchRequest {
  sourceStationCode: StationCode        // required
  destinationStationCode: StationCode    // required
  journeyDate: ISODate                    // required
  passengerCount: number                   // required, >= 1
  preferredClass?: TravelClass              // optional — pre-filled from UserPreferences if set
  travelPriority?: 'PRICE' | 'SPEED' | 'CONFIRMATION' | 'BALANCED' // optional
}
```

**Relationships:** `sourceStationCode`/`destinationStationCode`
reference `Station.code`. Feeds `SearchResult`.

**Validation rules:**
- `sourceStationCode` must not equal `destinationStationCode` (Smart
  Search screen's explicit edge case).
- `passengerCount >= 1`.

**Example shape:**

```json
{ "sourceStationCode": "MAS", "destinationStationCode": "SC", "journeyDate": "2026-08-24", "passengerCount": 2, "preferredClass": "3A", "travelPriority": "CONFIRMATION" }
```

---

## SearchResult

**Purpose:** The response to a `SearchRequest` shown on the Results
screen: the categorized recommendations Principle 2 requires, plus a
small, secondary "more options" list for users who explicitly want
to see beyond the four categories.

**Fields:**

```ts
interface SearchResult {
  request: SearchRequest                // required — echoes the input that produced this result
  recommendations: RecommendationOption[] // required — up to 4, one per category present
  moreOptions: TrainAvailability[]        // required, may be empty — secondary/opt-in list
}
```

**Relationships:** `recommendations` are `RecommendationOption`
records whose underlying `TrainAvailability` must also match
`request.sourceStationCode`/`destinationStationCode`/`journeyDate`
(via the referenced `Train`). `moreOptions` entries must not
duplicate the availability already surfaced in `recommendations`
(per the UX rule that the four categories may legitimately collapse
onto the same option when data is sparse — in that case
`moreOptions` should not re-list it).

**Validation rules:**
- `recommendations.length <= 4`.
- Every category present in `recommendations` must be unique (no two
  `BEST_OVERALL` entries, etc.).

**Example shape:** *(abbreviated — see RecommendationOption below for the nested shape)*

```json
{
  "request": { "sourceStationCode": "MAS", "destinationStationCode": "SC", "journeyDate": "2026-08-24", "passengerCount": 2 },
  "recommendations": [ /* RecommendationOption[] */ ],
  "moreOptions": [ /* TrainAvailability[] */ ]
}
```

---

## RecommendationOption

**Purpose:** This is the "Recommendation" entity from the requested
list, renamed to avoid ambiguity with the verb "recommend." It's the
one thing that makes Results *and* the Agent flow's Recommendation
screen work: a specific option, tagged with why it was chosen, in
plain language.

Per the explicit instruction, this document defines the **raw inputs
required** for a recommendation engine to derive these categories —
it does not define the ranking algorithm itself (that belongs to
`03-agent-spec.md`/`05-technical-spec.md`). The inputs an engine needs
per `TrainAvailability` record are already present on that entity:
`fareAmount` (for Cheapest), the referenced `Train.durationMinutes`
(for Fastest), and `confirmationLikelihood` (for Best Chance of
Confirmation). "Best Overall" is expected to be a function of some
combination of those three — the combination logic is out of scope
here.

**Fields:**

```ts
type RecommendationCategory = 'BEST_OVERALL' | 'FASTEST' | 'CHEAPEST' | 'BEST_CONFIRMATION_CHANCE'

interface RecommendationOption {
  category: RecommendationCategory      // required
  trainNumber: TrainNumber                // required
  journeyDate: ISODate                     // required
  travelClass: TravelClass                  // required
  reasonSummary: string                      // required — the plain-language "recommended because…" text (Principle 3)
  tradeOffNote?: string                       // optional — used when a requirement was only partially met (see Agent's Recommendation screen edge case)
}
```

**Relationships:** (`trainNumber`, `journeyDate`, `travelClass`) must
resolve to an existing `TrainAvailability` record (quota is assumed
`GENERAL` for Smart Search/Agent flows — Tatkal's own recommendation
context is handled via `TatkalPreparation`/`TatkalAttempt`, not this
entity). Referenced by `SearchResult.recommendations` and
`AgentSession.recommendation`.

**Validation rules:**
- The referenced `TrainAvailability` must exist and must not have
  `status: 'SOLD_OUT'` unless every option for that search is
  `SOLD_OUT` (mirrors the Results "Partial" state rule: an honest
  worst-available option beats hiding the category).
- `reasonSummary` must be non-empty (a recommendation without a
  reason violates Principle 3 and should be treated as invalid data).

**Example shape:**

```json
{
  "category": "BEST_OVERALL",
  "trainNumber": "12760",
  "journeyDate": "2026-08-24",
  "travelClass": "3A",
  "reasonSummary": "Recommended because it balances price, travel time and confirmation."
}
```

---

## RailwayStatusDefinition

**Purpose:** The content that powers the Status Translator capability
end-to-end — both the standalone "Understand My Status" screen and
every inline status shown in Results/Train Details/Booking Attempt.
One record per explainable status code.

**Fields:**

```ts
type StatusCode = 'CNF' | 'RAC' | 'GNWL' | 'PQWL' | 'RLWL' | 'TQWL' | 'WL' | 'SOLD_OUT' | 'CAN' | 'REGRET'

type StatusCategory = 'CONFIRMED' | 'PARTIALLY_CONFIRMED' | 'WAITLISTED' | 'UNAVAILABLE' | 'CANCELLED' | 'FAILED'

interface RailwayStatusDefinition {
  code: StatusCode              // required, unique
  displayLabel: string            // required — e.g. "General Waitlist"
  category: StatusCategory         // required
  canBoard: boolean                 // required
  isFullyConfirmed: boolean          // required
  isWaitlisted: boolean                // required
  positionApplicable: boolean           // required — whether a position/number is meaningful for this code
  plainExplanation: string               // required — Principle 1's "human explanation"
  suggestedConsideration?: string         // optional — "what the user should consider doing," when applicable
  isLiveAvailabilityStatus: boolean        // required — true if this code can appear on a TrainAvailability record; false for umbrella/outcome-only codes (WL, CAN, REGRET)
}
```

Note the deliberate split between two related but distinct sets:

- **`AvailabilityStatusCode`** (used by `TrainAvailability` — a live,
  searchable state): `CNF | RAC | GNWL | PQWL | RLWL | TQWL |
  SOLD_OUT`.
- **`StatusCode`** (used by `RailwayStatusDefinition` — everything
  the Status Translator must be able to explain, a superset):
  additionally includes `WL` (the generic/umbrella term a confused
  user might ask about even though no live availability record ever
  uses the bare code) and `CAN`/`REGRET` (outcome states that describe
  what *happened* to a booking or attempt, not a live search-time
  status).

`REGRET` is the one outcome code this app can actually *produce*
(as a `TatkalAttempt.outcome`); `CAN` exists in the dataset purely so
a user can look up a code they saw elsewhere (e.g. on a real ticket)
— cancellation is an explicit product non-goal, so the app itself
never generates a `CAN` outcome.

**Per-status definitions (design intent, not yet the generated data):**

| code | category | canBoard | isFullyConfirmed | isWaitlisted | positionApplicable | isLiveAvailabilityStatus |
|---|---|---|---|---|---|---|
| CNF | CONFIRMED | true | true | false | false | true |
| RAC | PARTIALLY_CONFIRMED | true | false | false | true | true |
| GNWL | WAITLISTED | false | false | true | true | true |
| PQWL | WAITLISTED | false | false | true | true | true |
| RLWL | WAITLISTED | false | false | true | true | true |
| TQWL | WAITLISTED | false | false | true | true | true |
| WL | WAITLISTED | false | false | true | true (varies) | false |
| SOLD_OUT | UNAVAILABLE | false | false | false | false | true |
| CAN | CANCELLED | false | false | false | false | false |
| REGRET | FAILED | false | false | false | false | false |

**Prototype simplifications called out explicitly:**
- PQWL/RLWL/RLWL's real-world quota nuance (pooled quota, remote
  location quota) is represented only in `plainExplanation` text, not
  as separate structural fields — the boolean/position shape is
  identical to GNWL.
- TQWL's real-world lower confirmation likelihood is represented
  through `TrainAvailability.confirmationLikelihood` on the specific
  record, not as a fixed property of the status definition itself.
- `SOLD_OUT` is a prototype simplification: real IRCTC almost always
  offers *some* waitlist position; this app uses `SOLD_OUT` to
  represent a deliberately-exhausted mock option so Results/Tatkal
  can demonstrate a true dead-end state in the demo.

**Relationships:** Referenced conceptually by `TrainAvailability.status`
(via the `AvailabilityStatusCode` subset) and `TatkalAttempt.outcome`.
Not foreign-keyed in a strict sense since it's reference/lookup
content rather than transactional data.

**Validation rules:**
- `code` unique.
- Every value used by `TrainAvailability.status` across the whole
  mock dataset must have a corresponding `RailwayStatusDefinition`
  with `isLiveAvailabilityStatus: true`.

**Example shape:**

```json
{
  "code": "GNWL",
  "displayLabel": "General Waitlist",
  "category": "WAITLISTED",
  "canBoard": false,
  "isFullyConfirmed": false,
  "isWaitlisted": true,
  "positionApplicable": true,
  "plainExplanation": "You're currently #{position} on the General Wait List. Your ticket is not confirmed yet.",
  "suggestedConsideration": "Consider a backup train or a different class with better availability.",
  "isLiveAvailabilityStatus": true
}
```

(`{position}` denotes where the specific `TrainAvailability.waitlistPosition` is interpolated at render time — that interpolation behavior is a UI concern, not a data-shape concern, but is noted here so the field's purpose is unambiguous.)

---

## AgentIntent

**Purpose:** The structured result of interpreting a natural-language
request like *"I need to reach Hyderabad tomorrow evening. Two
people. AC. Preferably confirmed."* This is what the Agent screen's
"needs clarification" state checks against, and what ultimately
drives the search behind the Recommendation screen.

**Fields:**

```ts
interface AgentIntent {
  rawText: string                             // required — the user's original input, preserved verbatim
  sourceStationCode?: StationCode                // optional (often only destination is stated)
  destinationStationCode?: StationCode              // optional until extracted
  dateExpression?: string                              // optional — the raw phrase, e.g. "tomorrow"
  resolvedDate?: ISODate                                // optional — dateExpression resolved to a concrete date
  timePreference?: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT' | 'ANY' // optional
  passengerCount?: number                                 // optional
  preferredClass?: TravelClass                              // optional
  confirmationPreference?: 'MUST_BE_CONFIRMED' | 'PREFER_CONFIRMED' | 'ANY' // optional
  pricePreference?: 'CHEAPEST' | 'ANY'                        // optional
  speedPreference?: 'FASTEST' | 'ANY'                          // optional
  missingRequiredFields: ('destinationStationCode' | 'resolvedDate' | 'passengerCount')[] // required, may be empty
}
```

`missingRequiredFields` is what drives the Agent screen's
"needs clarification" state: if non-empty, the UI must ask a targeted
follow-up rather than guessing (per the product spec's hard
requirement that the agent must never silently assume critical
missing details). `sourceStationCode` is deliberately **not** in the
required-fields list — a user very often only states a destination
("reach Hyderabad") and a reasonable default (e.g. a saved home
station) may apply; that default-resolution behavior itself belongs
in `03-agent-spec.md`, not here.

**Relationships:** Embedded within `AgentSession`. Once
`missingRequiredFields` is empty, an equivalent `SearchRequest` can be
derived from this intent to run the same search process Smart Search
uses.

**Validation rules:**
- `missingRequiredFields` must accurately reflect which of
  `destinationStationCode`/`resolvedDate`/`passengerCount` are unset —
  this is a consistency rule the agent logic must uphold, not
  something enforced by the data shape itself.

**Example shape:**

```json
{
  "rawText": "I need to reach Hyderabad tomorrow evening. Two people. AC. Preferably confirmed.",
  "destinationStationCode": "SC",
  "dateExpression": "tomorrow",
  "resolvedDate": "2026-08-23",
  "timePreference": "EVENING",
  "passengerCount": 2,
  "preferredClass": "3A",
  "confirmationPreference": "PREFER_CONFIRMED",
  "missingRequiredFields": []
}
```

---

## AgentSession

**Purpose:** Tracks one user's agent-driven booking attempt from raw
text through to (mock) booking — the state the Agent, Recommendation,
and Approval screens all read from and write to.

*This is intentionally lightweight* — the product spec explicitly
warns against the product "feeling like a generic chatbot"
(Principle 5), so this is not a full multi-turn conversation
transcript/message log. It's a single evolving intent plus a status,
enough to support one clarifying round-trip if needed, not an
open-ended chat history.

**Fields:**

```ts
type AgentSessionStatus =
  | 'COLLECTING'           // user is typing / hasn't submitted yet
  | 'NEEDS_CLARIFICATION'  // intent incomplete, follow-up needed
  | 'SEARCHING'             // resolving intent into a recommendation
  | 'RECOMMENDED'            // a RecommendationOption is ready
  | 'AWAITING_APPROVAL'       // on the Approval screen
  | 'DECLINED'                  // user declined, returned to Recommendation/Agent
  | 'BOOKED'                      // Approval confirmed, Booking created

interface AgentSession {
  id: string                             // required
  userId: string                          // required
  intent: AgentIntent                      // required
  status: AgentSessionStatus                 // required
  clarificationPrompt?: string                 // required IF status is NEEDS_CLARIFICATION
  recommendation?: RecommendationOption          // required IF status is RECOMMENDED/AWAITING_APPROVAL/DECLINED/BOOKED
  bookingId?: string                              // required IF status is BOOKED
}
```

**Relationships:** `userId` references `User.id`. `recommendation`
must be a `RecommendationOption` derived from `intent` (i.e. its
underlying `TrainAvailability` must satisfy `intent`'s resolved
constraints — destination, date, passenger count at minimum).
`bookingId` references `Booking.id` once created.

**Validation rules:**
- `recommendation` must be absent while status is `COLLECTING` or
  `NEEDS_CLARIFICATION` (there is nothing to recommend yet).
- `bookingId` must be absent unless status is `BOOKED` — this is the
  data-level guarantee behind "the agent must never silently book
  without explicit user confirmation": a `Booking` should never exist
  off an `AgentSession` that isn't in the `BOOKED` state.

**Example shape:**

```json
{
  "id": "agent_session_1",
  "userId": "user_1",
  "intent": { "...": "AgentIntent, see above" },
  "status": "AWAITING_APPROVAL",
  "recommendation": { "...": "RecommendationOption, see above" }
}
```

---

## Booking

**Purpose:** The record behind the Booking Success screen (shared by
Smart Search and Agent flows) and behind a successful Tatkal
attempt — everything needed to show "BOOKING CONFIRMED" convincingly.
The same record also backs My Bookings and Booking Details: no
additional fields are needed for those screens — every value their
cards and detail views require (train, route, journey date, class,
passenger count, status, PNR, fare, passenger details) is already
present here.

**Fields:**

```ts
type BookingSource = 'SMART_SEARCH' | 'AGENT' | 'TATKAL'
type BookingStatus = 'CNF' | 'RAC'
// Prototype simplification: a Booking record is only ever created on
// a successful outcome. A failed Tatkal attempt does not produce a
// Booking (see TatkalAttempt) — REGRET/CAN are explainable statuses
// via RailwayStatusDefinition, but this app's own flows never
// generate a Booking in either of those states, consistent with
// cancellation being an explicit non-goal.

interface Booking {
  id: string                    // required
  pnr: string                     // required — mock 10-digit numeric string, unique
  source: BookingSource             // required — which flow produced this booking
  userId: string                      // required
  trainNumber: TrainNumber              // required
  journeyDate: ISODate                    // required
  sourceStationCode: StationCode            // required
  destinationStationCode: StationCode         // required
  travelClass: TravelClass                       // required
  quota: Quota                                      // required
  status: BookingStatus                               // required
  fareAmount: number                                    // required — snapshot of TrainAvailability.fareAmount at booking time
  passengers: BookingPassenger[]                          // required, non-empty
  bookedAt: ISODateTime                                     // required
}
```

**Relationships:** `trainNumber`/`journeyDate`/`travelClass`/`quota`
must have matched an existing `TrainAvailability` record at the
moment of booking (fare/status are snapshotted onto the `Booking`
itself so a later change to the source `TrainAvailability` record —
which shouldn't happen in static mock data, but conceptually — can't
retroactively alter a past booking's displayed details).
`sourceStationCode`/`destinationStationCode` must reference
`Station.code` and should match the associated `Train`'s endpoints
for `SMART_SEARCH`/`AGENT` sources (Tatkal bookings likewise derive
from the `TatkalPreparation` journey).

**Validation rules:**
- `pnr` unique across the dataset, 10 numeric digits (mock format —
  not a claim of a real PNR algorithm).
- `passengers.length` must match the passenger count implied by the
  originating `SearchRequest`/`AgentIntent`/`TatkalPreparation`.

**Example shape:**

```json
{
  "id": "booking_1",
  "pnr": "4821093567",
  "source": "SMART_SEARCH",
  "userId": "user_1",
  "trainNumber": "12760",
  "journeyDate": "2026-08-24",
  "sourceStationCode": "MAS",
  "destinationStationCode": "SC",
  "travelClass": "3A",
  "quota": "GENERAL",
  "status": "CNF",
  "fareAmount": 1240,
  "passengers": [ { "...": "BookingPassenger, see below" } ],
  "bookedAt": "2026-08-22T10:15:00+05:30"
}
```

---

## BookingPassenger

**Purpose:** A snapshot of who was actually booked, embedded within
`Booking` — deliberately separate from the mutable `Passenger` record
so a booking's displayed passenger details don't retroactively change
if the underlying `Passenger` is edited later.

*This is the requested standalone entity, modeled as an embedded type
within `Booking` rather than a separately stored/looked-up record,
since it only ever needs to be read alongside its parent booking — no
screen looks up a `BookingPassenger` independent of a `Booking`.*

**Fields:**

```ts
interface BookingPassenger {
  passengerId?: string    // optional — reference to the source Passenger, if it came from a saved passenger
  name: string               // required — snapshotted at booking time
  age: number                  // required — snapshotted
  gender: 'MALE' | 'FEMALE' | 'OTHER' // required — snapshotted
  seatNumber?: string             // optional — only meaningful when the booking's status is CNF
  coach?: string                    // optional — only meaningful when the booking's status is CNF
}
```

**Relationships:** `passengerId`, when present, references
`Passenger.id`. Embedded array within `Booking.passengers`.

**Validation rules:**
- `seatNumber`/`coach` should only be populated when the parent
  `Booking.status` is `'CNF'` (an `RAC` booking shares a berth rather
  than holding an assigned seat/coach in the same way — represented
  here simply by leaving these fields absent for RAC).

**Example shape:**

```json
{ "passengerId": "passenger_1", "name": "Aravind Kumar", "age": 29, "gender": "MALE", "seatNumber": "34", "coach": "B2" }
```

---

## TatkalPreparation

**Purpose:** Everything the user set up in advance on the Preparation
screen — the data that makes Tatkal Mode's "prepare now, act later"
promise concrete, and what Countdown/Booking Attempt read from.

**Fields:**

```ts
interface TatkalPreparation {
  id: string                          // required
  userId: string                        // required
  sourceStationCode: StationCode          // required
  destinationStationCode: StationCode       // required
  journeyDate: ISODate                        // required
  passengerIds: string[]                        // required, non-empty
  preferredClass: TravelClass                     // required
  preferredTrainNumber: TrainNumber                 // required
  backupTrainNumbers: TrainNumber[]                   // required, non-empty (Preparation screen's edge case: at least one backup required before "ready")
  isReady: boolean                                      // required
  tatkalOpensAt: ISODateTime                              // required — the simulated opening time Countdown counts down to
}
```

**Relationships:** `passengerIds` reference `Passenger.id`.
`preferredTrainNumber` and every entry in `backupTrainNumbers`
reference `Train.number`, and each must have a corresponding
`TrainAvailability` record for `journeyDate`/`preferredClass` under
`quota: 'TATKAL'` (so an attempt against it is meaningful).

**Validation rules:**
- `isReady` may only be `true` once `backupTrainNumbers` is
  non-empty and all required fields (journey, passengers, preferred
  class/train) are set — mirrors the Preparation screen's "Ready"
  state requirement.
- `preferredTrainNumber` must not also appear in
  `backupTrainNumbers` (no duplicate entries as both preferred and
  backup).

**Example shape:**

```json
{
  "id": "tatkal_prep_1",
  "userId": "user_1",
  "sourceStationCode": "MAS",
  "destinationStationCode": "SC",
  "journeyDate": "2026-08-23",
  "passengerIds": ["passenger_1", "passenger_2"],
  "preferredClass": "3A",
  "preferredTrainNumber": "12760",
  "backupTrainNumbers": ["12604", "12602"],
  "isReady": true,
  "tatkalOpensAt": "2026-08-22T10:00:00+05:30"
}
```

---

## TatkalAttempt

**Purpose:** Records one booking attempt within a Tatkal session —
against the preferred train, or against a backup — so the Booking
Attempt screen can represent "attempting → success" or
"attempting → failed → next backup" without losing history, and so
"all backups exhausted" can be detected.

**Fields:**

```ts
type TatkalAttemptOutcome = 'CNF' | 'RAC' | 'REGRET'
// REGRET here specifically means "this attempt did not result in a
// booking" — the live-producible use of the REGRET status code
// described in RailwayStatusDefinition.

interface TatkalAttempt {
  id: string                       // required
  preparationId: string              // required
  trainNumber: TrainNumber             // required — the preferred train, or one of the backups
  attemptOrder: number                   // required — 0 for preferred, 1..n for backups in the order they were prepared
  attemptedAt: ISODateTime                 // required
  outcome: TatkalAttemptOutcome              // required
  resultingBookingId?: string                  // required IF outcome is CNF or RAC
}
```

**Relationships:** `preparationId` references
`TatkalPreparation.id`. `trainNumber` must equal that preparation's
`preferredTrainNumber` (when `attemptOrder` is `0`) or one of its
`backupTrainNumbers` (in order, for `attemptOrder >= 1`).
`resultingBookingId`, when present, references a `Booking` with
`source: 'TATKAL'`.

**Validation rules:**
- `resultingBookingId` present if and only if `outcome` is `'CNF'`
  or `'RAC'`.
- Attempts for a given `preparationId` must occur in non-decreasing
  `attemptOrder` (the flow always tries preferred, then backups in
  the prepared order — it never skips ahead).
- "All backups exhausted" (the Booking Attempt screen's terminal
  failure state) is derived, not stored: it's true when every attempt
  for a `preparationId`, covering `attemptOrder` 0 through
  `backupTrainNumbers.length`, has `outcome: 'REGRET'`.

**Example shape:**

```json
{
  "id": "tatkal_attempt_1",
  "preparationId": "tatkal_prep_1",
  "trainNumber": "12760",
  "attemptOrder": 0,
  "attemptedAt": "2026-08-22T10:00:04+05:30",
  "outcome": "REGRET"
}
```

---

## DemoScenario

**Purpose:** A deterministic, named script the demo can replay
reliably — this is what guarantees "a judge should see the same demo
behavior every time." Not user-facing data; a fixture the mock
dataset is organized around.

**Fields:**

```ts
interface DemoScenario {
  id: string                                    // required
  purpose: string                                 // required — human-readable, e.g. "Show GNWL vs RAC vs Confirmed on the same route"
  searchInput?: SearchRequest                       // optional — for Smart Search-driven scenarios
  expectedTrainNumbers?: TrainNumber[]                // optional — trains expected to appear in results
  expectedRecommendations?: { category: RecommendationCategory, trainNumber: TrainNumber }[] // optional
  expectedStatuses?: { trainNumber: TrainNumber, travelClass: TravelClass, status: AvailabilityStatusCode }[] // optional
  agentInputText?: string                               // optional — for Agent-driven scenarios
  expectedAgentIntent?: Partial<AgentIntent>               // optional
  tatkalScenario?: {                                         // optional — for Tatkal-driven scenarios
    preparationId: string
    expectedPreferredOutcome: TatkalAttemptOutcome
    expectedBackupOutcomes: TatkalAttemptOutcome[]           // in backup order
  }
  expectedOutcome: string                                      // required — plain description of what the demo should show at the end
}
```

**Relationships:** Every ID referenced (`expectedTrainNumbers`,
`tatkalScenario.preparationId`, etc.) must resolve to an existing
record once the actual mock dataset is generated. `DemoScenario`
records are the mechanism by which "the demo story" in
`01-product-spec.md` maps onto concrete data — e.g. one scenario
should directly encode "Chennai → Hyderabad, showing GNWL/RAC/CNF
side by side," matching step 3–4 of the product spec's Demo Story.

**Validation rules:**
- At least one of `searchInput`, `agentInputText`, or
  `tatkalScenario` must be present (a scenario has to drive at least
  one of the three flows).
- `expectedOutcome` non-empty.

**Example shape:**

```json
{
  "id": "demo_scenario_1",
  "purpose": "Show GNWL vs RAC vs Confirmed on the same route for the core Chennai → Hyderabad demo beat",
  "searchInput": { "sourceStationCode": "MAS", "destinationStationCode": "SC", "journeyDate": "2026-08-24", "passengerCount": 1 },
  "expectedStatuses": [
    { "trainNumber": "12760", "travelClass": "3A", "status": "GNWL" },
    { "trainNumber": "12604", "travelClass": "3A", "status": "RAC" },
    { "trainNumber": "12602", "travelClass": "2A", "status": "CNF" }
  ],
  "expectedOutcome": "Results screen shows three visibly different, plainly-explained statuses for the same route."
}
```

---

## Availability model (detail)

Required per the task: how each status represents seat availability,
waitlist position, RAC position, fare, quota, and date, and how the
UI derives useful information from it.

| status | seats | waitlist position | RAC position | fare present | quota-sensitive | what UI shows |
|---|---|---|---|---|---|---|
| CNF | `confirmedSeatsRemaining` optional, informational only | absent | absent | yes | yes | "Confirmed" + fare + (optionally) remaining seats for urgency framing |
| RAC | n/a (shared berth, not a discrete seat count) | absent | `racPosition` present | yes | yes | "RAC #{racPosition} — you can board, sharing a berth" |
| GNWL / PQWL / RLWL / TQWL | n/a | `waitlistPosition` present | absent | yes | yes (TQWL implies `quota: 'TATKAL'`) | "#{waitlistPosition} on {display label} — not confirmed yet" + `suggestedConsideration` |
| SOLD_OUT | none | absent | absent | yes (last known fare, shown for context even though unbookable) | yes | "No seats or waitlist left for this option" |

`fareAmount` is always present regardless of status — even a
`SOLD_OUT` record carries the fare that *would* have applied, so
Results can still show price context (e.g. for comparison against
other options) without implying the option is bookable.

`quota` matters structurally in one place: any `TrainAvailability`
with `quota: 'TATKAL'` is the only kind `TatkalAttempt` should ever
reference; `GENERAL`-quota records back Smart Search and the Agent.

## Data consistency (relationships, consolidated)

- A `Train`'s `sourceStationCode`, `destinationStationCode`, and every
  entry in `routeStationCodes` must reference an existing `Station`.
- Every `TrainAvailability` must reference an existing `Train`, and
  its `travelClass` must be one of that train's `supportedClasses`.
- A `Passenger` referenced anywhere (`User.savedPassengerIds`,
  `TatkalPreparation.passengerIds`, `BookingPassenger.passengerId`)
  must exist in the `Passenger` dataset.
- A `Booking` must reference passengers consistent with its
  originating flow's passenger count, and a valid
  train/date/class/quota that had a matching `TrainAvailability` at
  booking time.
- A `TatkalPreparation` must reference a valid preferred train and at
  least one valid backup train, each with `TATKAL`-quota
  `TrainAvailability` for the prepared date/class.
- A `TatkalAttempt` must reference a valid `TatkalPreparation` and a
  `trainNumber` that is either that preparation's preferred train or
  one of its backups, attempted in order.
- A `RecommendationOption` must reference a `TrainAvailability` that
  actually matches the search/intent that produced it (same
  destination, date, and — where stated — class/passenger
  constraints).
- An `AgentSession.recommendation`, if present, must be one of the
  options that a search over that session's `intent` would return —
  the agent cannot recommend something outside what its own search
  found.
- Every `DemoScenario` reference must resolve once the dataset exists.

## Data generation requirements

Targets for the eventual mock dataset — sized to convincingly support
the demo story without over-building a full national timetable. These
are targets, not mandates; only generate enough to make the demo
convincing.

| entity | target volume |
|---|---|
| Users | 3–5 |
| Stations | 40–50 |
| Trains | 50–100 |
| TrainAvailability records | 300–500 |
| Passengers | 5–10 |
| RailwayStatusDefinition records | the fixed set of 10 defined above (CNF, RAC, GNWL, PQWL, RLWL, TQWL, WL, SOLD_OUT, CAN, REGRET) |
| Bookings | 2–4 pre-existing, deterministic (see note below) |
| DemoScenario records | 10–15 |

**On Bookings specifically:** now that My Bookings is part of the
MVP (see `02-ux-spec.md`), the prototype should start with a **small
number of deterministic pre-existing mock bookings** — just enough
for My Bookings to have something real to show in its populated
state during a demo, without a corresponding live booking flow
having run first. This is a handful of records, not dozens: 2–4 is
plenty, spread across the three `BookingSource` values
(`SMART_SEARCH`, `AGENT`, `TATKAL`) so the list looks like it came
from real use of the product rather than a single flow. Beyond that
seed set, **bookings created at runtime** — once the Smart Search,
Agent, and Tatkal booking flows are actually implemented and a user
completes one successfully — are expected to appear in My Bookings
the same way, using the same `Booking` shape; no separate "seed" vs.
"live" distinction exists in the data model itself.

`TrainAvailability` volume should be concentrated on the routes and
dates the demo actually uses (e.g. Chennai ↔ Hyderabad, plus a couple
of secondary routes for the Agent/Tatkal beats) rather than spread
thin across all station pairs — breadth doesn't help a 30-second
judge demo; depth on the demoed routes does.

## Deterministic data

Mock data must not use runtime randomness. Every `TrainAvailability`,
`Booking` outcome, and `TatkalAttempt` outcome that the demo relies on
must be a fixed, pre-authored record, not generated by a random
number at app start — the same demo script must produce the same
result on every run. Where the product needs to *feel* like Tatkal
attempts are racing against real uncertainty, that feeling comes from
UI pacing/animation, not from actual nondeterminism in the underlying
data.

One open question this implies (see Open Questions below): relative
date expressions like "tomorrow" need a deterministic resolution
strategy, since "tomorrow" changes depending on when the demo is run.

## Data generation rules

When the actual mock dataset is generated later:

- No real personal information (names should read as plausible but
  invented; no real individuals).
- No real payment information (not applicable — no payment data
  modeled at all).
- No real Aadhaar numbers or any real government ID format.
- No real authentication credentials.
- No claims, in any record or label, that mock train records are
  official IRCTC data.
- All references must be internally consistent (see Data consistency
  above) — no dangling IDs.
- Scenarios must be predictable and reproducible for demo purposes.

## Data required by screen

The full mapping, screen by screen, per `02-ux-spec.md`:

**Cross-cutting Language Selection** — no entity from this document.
The selected language is client-side presentation state, not domain
data (see the note under `UserPreferences`); it has nothing to read
or write here regardless of which screen it's used from.

**Login**
- `User` (to establish which mock identity becomes "signed in")

**Home**
- `User`, `UserPreferences`
- `TatkalPreparation` (to detect and surface an in-progress/resumable preparation)

**Smart Search**
- `Station` (source/destination selection)
- `UserPreferences` (pre-fill preferred class)
- `Passenger` (pre-fill passenger count from saved passengers, optionally)
- Produces: `SearchRequest`

**Results**
- `SearchResult`
- `RecommendationOption` (×≤4, categorized)
- `TrainAvailability` (underlying each option, and for `moreOptions`)
- `RailwayStatusDefinition` (inline status translation)

**Train Details**
- `Train`
- `TrainAvailability` (current status/fare — re-checked, may differ from what Results showed)
- `RailwayStatusDefinition`
- `RecommendationOption` (carried "why recommended" context)

**Passenger Review**
- `Passenger` (pre-filled saved passengers + manual entries)
- `UserPreferences` (class/berth pre-fill)
- `Train`, `TrainAvailability` (fare summary consistency with Train Details)
- Produces: input toward `Booking`

**Booking Success**
- `Booking`
- `BookingPassenger` (embedded)
- (Agent flow only) `AgentSession` (for the request recap)

**Agent**
- `AgentSession`
- `AgentIntent` (embedded — drives the "needs clarification" state)

**Recommendation**
- `AgentSession`
- `RecommendationOption`
- `TrainAvailability`
- `RailwayStatusDefinition`

**Approval**
- `AgentSession`
- `RecommendationOption` (restated summary)

**Understand My Status**
- `RailwayStatusDefinition` (standalone lookup, or pre-populated when arriving from a contextual link elsewhere)

**My Bookings**
- `Booking` (the list itself — the required card fields all come
  directly off this entity: `trainNumber`, `sourceStationCode` /
  `destinationStationCode`, `journeyDate`, `travelClass`,
  `passengers.length`, `status`, `pnr`)
- `Train` (to resolve `trainNumber` to a display name, since
  `Booking` stores the number, not the name)
- `User` (to scope the list to the signed-in user — `Booking.userId`)

**Booking Details**
- `Booking` (full record — fare, passengers, quota, `bookedAt`, in
  addition to everything shown on the My Bookings card)
- `BookingPassenger` (embedded — full passenger details)
- `Train` (display name, same as My Bookings)
- `RailwayStatusDefinition` (plain-language status, consistent with
  every other status display in the app)

**Tatkal Mode**
- `TatkalPreparation` (existing or new)

**Preparation**
- `TatkalPreparation`
- `Passenger` (pre-filled saved passengers)
- `UserPreferences` (class pre-fill)
- `Train` (preferred/backup selection), `TrainAvailability` under `quota: 'TATKAL'`

**Countdown**
- `TatkalPreparation` (readiness summary, opens-at time)

**Booking Attempt → Success / Backup**
- `TatkalPreparation`
- `TatkalAttempt` (×1 per train tried, in order)
- `TrainAvailability` (`TATKAL` quota, for each attempted train)
- `RailwayStatusDefinition` (explaining the outcome, especially REGRET)
- `Booking` (on success)

## Open questions / unresolved decisions

- **Relative date determinism.** The Agent capability's example input
  ("tomorrow evening") and the product's deterministic-data
  requirement are in tension: "tomorrow" is only stable if the demo
  defines a fixed anchor date (a simulated "today") rather than
  resolving against the real current date. This spec assumes
  `AgentIntent.resolvedDate` and all `TrainAvailability.journeyDate`
  values will be generated relative to a fixed demo anchor date, but
  the exact mechanism (env-configured "demo today," or literal fixed
  calendar dates in the copy/scenarios) is left to
  `05-technical-spec.md`.
- **Tatkal attempt pacing.** How long "Attempting…" is shown before
  resolving to an outcome is a UX/technical timing decision, not a
  data-shape one — this spec only guarantees the underlying
  attempt/outcome data exists deterministically.
- **Sign-out behavior** is explicitly de-scoped in the UX spec as "not
  a demo priority"; no data field (e.g. session expiry) is modeled for
  it here.
- **Multilingual Experience presentation strings** (the actual Hindi/
  Telugu translated copy for labels, explanations, messages, etc.)
  are not modeled as data here, deliberately — see the note under
  `UserPreferences` for why the *selected language* isn't a data
  field either. Where the translated string content itself should
  live (a static dictionary keyed by canonical codes/keys, most
  likely) is a `05-technical-spec.md` decision, not a data-contract
  one — this document's entities (`RailwayStatusDefinition`, etc.)
  remain the single English-language canonical content; translation
  is a presentation-layer lookup keyed off those same canonical
  values, never a language-specific duplicate of the entity itself.

## Non-goals (data layer)

Consistent with the product spec, this data contract does not include
and should never grow to include: database tables, API endpoint
definitions, an LLM provider integration, agent tool schemas, React
component state/props, backend service architecture, or any real
IRCTC integration surface.
