# 03 — Agent Spec

Status: source of truth for the agent that powers Agent-Driven
Booking (and the natural-language entry point into Tatkal
preparation and status explanation).

This document defines the agent's responsibilities, architecture,
tool contract, state machine, and flows. It does not define exact
React implementation, a specific LLM provider, API endpoints, or
changes to the data layer — `01-product-spec.md`, `02-ux-spec.md`,
and `04-data-spec.md` are locked, and every entity/field/screen name
used below matches them exactly. Where this spec needs something
those documents don't provide, that's called out explicitly as an
open question rather than silently assumed.

## Core principle

> The agent should make IRCTC work the way the citizen thinks.

The agent is **not a generic chatbot**. It reduces railway
terminology, repetitive navigation, comparison effort,
decision-making effort, and Tatkal booking friction — by
understanding intent, using controlled tools to do the work, and
asking for approval before anything irreversible (within this mock
prototype, "irreversible" means "creates a Booking record").

---

## 1. Agent responsibilities

The agent is responsible for:

1. Understanding natural-language travel requests.
2. Extracting structured travel intent (`AgentIntent`).
3. Identifying missing essential information.
4. Searching available mock train data.
5. Evaluating available options.
6. Recommending suitable options.
7. Explaining why an option is recommended.
8. Presenting alternatives.
9. Explaining railway reservation statuses.
10. Preparing a Tatkal journey.
11. Attempting a mock booking.
12. Handling booking failure.
13. Suggesting backup options.
14. Asking for explicit approval before booking.
15. Confirming successful booking.

The agent must **never**:

- access a real IRCTC account, or any real IRCTC API
- process real payments
- access real Aadhaar data
- claim to make a real railway booking
- invent train availability
- invent booking confirmation
- book anything without explicit user approval

---

## 2. Agent architecture

Conceptual flow (not a React component tree, not an LLM pipeline
diagram):

```
User
 ↓
Natural Language Input
 ↓
Intent Extraction
 ↓
Structured AgentIntent
 ↓
Agent Reasoning / Orchestration
 ↓
Controlled Tools
 ↓
Data
 ↓
Tool Results
 ↓
Recommendation
 ↓
User Approval
 ↓
Booking Tool
 ↓
Booking Result
```

**Agent** — the orchestrator. It holds no data of its own beyond the
current `AgentSession` (or, for Tatkal/status requests, an even
lighter-weight working context — see §9). It decides *which tool to
call, in what order*, based on the current intent and state. It never
reads or writes `src/data` directly.

**Tool** — a named, contract-bound function (§6) that is the *only*
way the agent touches application data or capabilities. Every tool
has fixed inputs/outputs and explicit must-not constraints. Tools are
where "controlled" lives: the agent cannot do anything a tool doesn't
expose.

**Data source** — the mock dataset defined in `04-data-spec.md`
(`Station`, `Train`, `TrainAvailability`, `RailwayStatusDefinition`,
`TatkalPreparation`, `TatkalAttempt`, `Booking`, etc.). Tools are the
only code that reads/writes it; the agent never does so directly, and
neither does whatever eventually renders the UI — everything goes
through the same tool contract.

**Agent state** — the current stage of one user's request (§9),
backed as much as possible by the entities already defined in
`04-data-spec.md` (primarily `AgentSession`, and, for Tatkal,
`TatkalPreparation`/`TatkalAttempt`). Where this spec's state machine
needs a state that isn't directly a persisted field, that's flagged
explicitly rather than treated as equivalent.

**User approval boundary** — the one non-negotiable checkpoint (§8):
`createBooking` may only execute after an explicit, unambiguous user
action. Nothing upstream of that boundary is allowed to cross it on
the agent's own initiative.

---

## 3. Agent input

The agent should understand free-form requests without a rigid
command format. Representative examples:

- "I need to go from Chennai to Hyderabad tomorrow evening."
- "I need to reach Hyderabad tomorrow. Two people. AC. I want
  confirmed seats."
- "Find me the cheapest train."
- "I need to reach Delhi as quickly as possible."
- "I don't care about the train, I just need a confirmed ticket."
- "Explain GNWL 24."
- "I want to prepare for Tatkal."

These fall into three request *kinds* the agent must distinguish
before it can decide which tools to call:

1. **Booking-intent requests** — the user wants to go somewhere
   (most of the examples above). Handled via §10.
2. **Status-explanation requests** — the user is asking what a code
   means ("Explain GNWL 24"), not asking to travel. Handled via §11.
3. **Tatkal-intent requests** — the user explicitly signals Tatkal
   ("I want to prepare for Tatkal", "book this Tatkal"). Handled via
   §12.

This classification is a **request-kind decision the agent makes**,
not a field stored on `AgentIntent` — see the note on Tatkal intent
in §4.

---

## 4. Agent intent

The agent populates the existing `AgentIntent` entity from
`04-data-spec.md`. No fields are added or renamed here.

```ts
interface AgentIntent {
  rawText: string
  sourceStationCode?: StationCode
  destinationStationCode?: StationCode
  dateExpression?: string
  resolvedDate?: ISODate
  timePreference?: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT' | 'ANY'
  passengerCount?: number
  preferredClass?: TravelClass
  confirmationPreference?: 'MUST_BE_CONFIRMED' | 'PREFER_CONFIRMED' | 'ANY'
  pricePreference?: 'CHEAPEST' | 'ANY'
  speedPreference?: 'FASTEST' | 'ANY'
  missingRequiredFields: ('destinationStationCode' | 'resolvedDate' | 'passengerCount')[]
}
```

**Field classification:**

| Field | Classification | Notes |
|---|---|---|
| `destinationStationCode` | **Required** (in `missingRequiredFields` if unset) | The one thing a travel request can't proceed without. |
| `resolvedDate` | **Required** | See date resolution below. |
| `passengerCount` | **Required** | Defaults are not assumed for this one — see §5. |
| `sourceStationCode` | **Optional / inferred** | Not in `missingRequiredFields` per the data spec's own note. See default-resolution below. |
| `preferredClass` | **Optional / inferred** | "AC" → `3A` (§ below); unset if never mentioned. |
| `timePreference` | **Optional** | Free-text hints ("evening", "morning train") map to the enum; defaults to `'ANY'` if never mentioned. |
| `confirmationPreference` | **Optional** | Defaults to `'ANY'` if unstated. |
| `pricePreference` | **Optional** | Defaults to `'ANY'`. |
| `speedPreference` | **Optional** | Defaults to `'ANY'`. |
| `dateExpression` | **Optional but recommended** | The raw phrase is preserved even after resolution, for the clarification/restatement UI pattern in `02-ux-spec.md`'s Agent screen. |

**Inference rules (deterministic, Layer 1 — see §18):**

- **Date resolution**: relative phrases ("today", "tomorrow", "day
  after tomorrow") resolve against `DEMO_DATES.TODAY` (the fixed
  demo-date anchor already defined in `src/data/demoConfig.ts`), not
  the real system clock — this is required for the deterministic-data
  guarantee already established in `04-data-spec.md`. A literal date
  is used as-is if the user gives one.
- **Class inference**: "AC" without a specific class maps to `3A`
  (the most common AC class) unless a more specific hint is present
  ("first class" → `1A`, "AC 2-tier" / "2AC" → `2A`). This is a
  deterministic lookup table, not a judgment call made per-request.
- **Passenger count**: number words ("two people", "2 of us") map to
  an integer. A request that never mentions passengers leaves this
  required field genuinely missing — see §5, no default is assumed.
- **Source station default**: if `sourceStationCode` is never
  mentioned, the agent does **not** guess. It resolves to the user's
  saved/home context if one is unambiguously derivable from
  `UserPreferences`/prior sessions (a personalization concern, §16) —
  otherwise it's asked for, using the same minimal-follow-up pattern
  as §5. This is a UX/behavioral default, not a required field, so it
  never appears in `missingRequiredFields`.

**On "Tatkal intent":** `AgentIntent` (as locked in `04-data-spec.md`)
has no dedicated Tatkal field. Tatkal-ness is not a property of the
extracted travel intent — it's the *request-kind classification* from
§3, decided from the raw request before or alongside intent
extraction. The same `AgentIntent` shape (source, destination, date,
passengers, class) is populated identically regardless of request
kind; what differs is which tool the agent calls next (`rankOptions`
for a normal request, `prepareTatkal` for a Tatkal one). **This is a
deliberate design resolution, not a gap**: adding a field to
`AgentIntent` would mean touching the locked data spec, which this
task doesn't authorize. If a future task needs Tatkal-classification
to be persisted (e.g., for analytics or session resumption), that's
an explicit data-spec amendment to propose then — not something this
document invents around it.

**Worked example** (illustrative — not to be hard-coded):

> "I need to reach Hyderabad tomorrow evening. Two people. AC.
> Preferably confirmed."

```
destinationStationCode: SC
dateExpression: "tomorrow"
resolvedDate: DEMO_DATES.TOMORROW
timePreference: EVENING
passengerCount: 2
preferredClass: 3A
confirmationPreference: PREFER_CONFIRMED
pricePreference: ANY
speedPreference: ANY
missingRequiredFields: []
```

(`sourceStationCode` is absent — resolved separately per the default
rule above, not treated as missing.)

---

## 5. Missing information

The agent asks for the **minimum** additional information needed to
proceed — never a multi-question form.

**Essential missing fields** (drive `NEEDS_CLARIFICATION`, per
`AgentIntent.missingRequiredFields`): `destinationStationCode`,
`resolvedDate`, `passengerCount`. If more than one is missing, the
agent asks for exactly one at a time, prioritized in that order
(destination first — nothing else is answerable without it).

**Optional fields**: `sourceStationCode` (has a default-resolution
path, §4), `preferredClass`, `timePreference`,
`confirmationPreference`, `pricePreference`, `speedPreference` — all
default to their "unstated" value (`ANY`, or simply absent) rather
than being asked for. A user who says "I need to reach Hyderabad
tomorrow" gets a recommendation across all classes/preferences, not a
follow-up interrogation about class and price priority.

**Example:**

> User: "I want to go to Hyderabad."
> Agent: "Sure. Where are you travelling from?"

(Here, source happens to be the thing being asked — this only occurs
when the source default-resolution in §4 also fails, e.g. no saved
home station exists yet. Ordinarily source is inferred silently and
the first real question is about the date, if that's what's missing.)

**Ambiguity handling:** if a mentioned place name maps to more than
one station in the mock dataset in a way that isn't obviously
resolvable (e.g., a city with multiple stations), and there is a
clear, single most-common interpretation (as there is for
"Hyderabad" → `SC` in the demo dataset), the agent uses it without
asking — asking here would violate the "minimize follow-up" rule for
no real benefit. If no single interpretation is clearly dominant, the
agent asks a single targeted clarifying question rather than
guessing, consistent with the product's hard requirement never to
silently assume critical details.

---

## 6. Agent tools

The agent **must not** access `TrainAvailability`, `Train`,
`RailwayStatusDefinition`, `TatkalPreparation`, `Booking`, or any
other data entity directly. Every capability is mediated by one of
these eight tools.

### Tool 1 — `searchTrains`

**Purpose:** Search available trains for a travel intent.
**Inputs:** `sourceStationCode`, `destinationStationCode`,
`journeyDate`, `passengerCount` — the minimum fields a `SearchRequest`
requires (`04-data-spec.md`).
**Outputs:** A set of candidate `TrainAvailability` records (with
their associated `Train`) matching the route and date.
**Must not:** invent results not present in the mock dataset; modify
any data; book anything.

### Tool 2 — `getAvailability`

**Purpose:** Retrieve availability for one specific train/date/class.
**Inputs:** `trainNumber`, `journeyDate`, `travelClass` (and,
implicitly, `quota` — `GENERAL` unless the caller is on the Tatkal
path).
**Outputs:** The matching `TrainAvailability` record: `status`,
`waitlistPosition`/`racPosition` if applicable, `fareAmount`,
`confirmationLikelihood`.
**Must not:** invent an availability record that doesn't exist in the
mock dataset; modify it.

### Tool 3 — `explainStatus`

**Purpose:** Translate a railway status into plain language.
**Inputs:** a `StatusCode` (`04-data-spec.md`'s full explainable set:
`CNF`, `RAC`, `GNWL`, `PQWL`, `RLWL`, `TQWL`, `WL`, `SOLD_OUT`, `CAN`,
`REGRET`), plus `waitlistPosition`/`racPosition` if applicable.
**Outputs:** the matching `RailwayStatusDefinition`'s
`plainExplanation` (with position interpolated) and
`suggestedConsideration`, if any.
**Must not:** editorialize beyond the defined explanation content, or
invent a status code that has no `RailwayStatusDefinition` record.

### Tool 4 — `rankOptions`

**Purpose:** Evaluate a set of candidate options and categorize them.
**Inputs:** candidate `TrainAvailability` records (from
`searchTrains`), plus the user's stated preferences
(`confirmationPreference`, `pricePreference`, `speedPreference`, or
`UserPreferences.travelPriority` when personalization applies, §16).
**Outputs:** up to four `RecommendationOption` records, one per
`RecommendationCategory` (`BEST_OVERALL`, `FASTEST`, `CHEAPEST`,
`BEST_CONFIRMATION_CHANCE`) — matching exactly what Smart Search's
Results screen produces, since the Agent and Smart Search share the
same underlying recommendation shape.
**Must not:** fabricate a category's option when no candidate exists
for it (per `02-ux-spec.md`'s Results "Partial" state, an honest
worst-available option is shown, or the category is omitted — never a
fake one). **The ranking formula itself is out of scope for this
document** — it belongs in `05-technical-spec.md`. This spec only
defines the tool's contract: real inputs in, real categorized options
out.

### Tool 5 — `getAlternatives`

**Purpose:** Find alternative trains when the preferred/recommended
option is unavailable or unsuitable.
**Inputs:** the original `AgentIntent` (or `TatkalPreparation`, for
the Tatkal path), and the option that failed or was declined.
**Outputs:** a small set of alternative `TrainAvailability`-backed
options, each with the same plain-language treatment as any other
recommendation.
**Must not:** invent alternatives; return options that don't actually
satisfy the original intent's hard constraints (route, date).

### Tool 6 — `prepareTatkal`

**Purpose:** Create a deterministic `TatkalPreparation`.
**Inputs:** journey intent (source, destination, date, class),
preferred train, backup train(s), passenger references.
**Outputs:** a `TatkalPreparation` record (per `04-data-spec.md`:
requires at least one backup before it can be marked `isReady`).
**Must not:** book anything. This tool only ever produces a
preparation record — never a `Booking` or a `TatkalAttempt`.

### Tool 7 — `attemptBooking`

**Purpose:** Attempt a **mock** booking against one specific
train/date/class (and, for Tatkal, one attempt in the prepared
order).
**Inputs:** `trainNumber`, `journeyDate`, `travelClass`, `quota`,
passenger references.
**Outputs:** success or failure, expressed via the availability the
tool reads (`CNF`/`RAC` → success; `SOLD_OUT`/`GNWL`/`PQWL`/`RLWL`/
`TQWL` at the moment of attempt → failure, i.e. `REGRET`).
**Must be explicitly described to the user as a mock/simulated
operation** — never phrased in a way that implies a real railway
system was contacted.
**Must not:** guess an outcome; the outcome is always read from the
underlying `TrainAvailability`/`TatkalPreparation` data, never
invented by the agent.

### Tool 8 — `createBooking`

**Purpose:** Create a mock `Booking` record after a successful
`attemptBooking` call.
**Inputs:** the successful attempt's train/journey/passenger/class
details.
**Outputs:** a `Booking` record (with a mock PNR, per
`04-data-spec.md`'s format).
**Critical constraint:** this tool **can only execute after explicit
user approval** (§8). It is never called as a side effect of
`attemptBooking` succeeding — approval must have already happened
*before* `attemptBooking` is even called, for the Smart
Search/Agent flow (§10), or must be implicit in an already-approved
Tatkal preparation for the Tatkal flow (§8's Tatkal note).

---

## 7. Tool safety

1. **Search tools are read-only.** `searchTrains` and `getAvailability`
   never write anything.
2. **Recommendation tools are read-only.** `rankOptions` and
   `getAlternatives` never write anything.
3. **Status explanation is read-only.** `explainStatus` never writes
   anything.
4. **Tatkal preparation does not book anything.** `prepareTatkal`
   only ever produces a `TatkalPreparation`.
5. **Booking tools require explicit approval.** `createBooking` (and,
   for the flows in §10/§12, the approval gate before `attemptBooking`
   is called at all) cannot execute without it.
6. **The agent cannot bypass approval.** No tool, no combination of
   tools, and no phrasing of a recommendation is a substitute for the
   explicit confirmation defined in §8.
7. **The agent cannot fabricate tool results.** Every number, status,
   fare, or outcome shown to the user must have come from a tool
   call backed by real mock data — never generated/guessed by the
   agent itself.
8. **The agent cannot modify raw train availability.** No tool
   exposes a write path to `TrainAvailability`.
9. **A failed booking attempt does not create a `Booking`.** Matches
   `04-data-spec.md`'s `Booking` entity design exactly: a `Booking`
   is only ever created on a successful outcome.
10. **Only a successful, approved booking creates a `Booking`.** Both
    conditions — success *and* prior approval — are required, not
    either alone.

---

## 8. Explicit approval boundary

This is the product's single most important safety property (product
spec: "the agent must never silently book without explicit user
confirmation").

**The exact transition:**

```
Agent recommends:
  "Train 12760 — ₹1,240 — Confirmed."

User says or taps:
  "Book it."          (natural language)
  [ Book this ]        (button)

→ ONLY THEN may createBooking (preceded by attemptBooking) execute.
```

**Safe confirmation language** — the agent restates what's about to
happen before treating anything as approval, matching the Approval
screen defined in `02-ux-spec.md`:

> "You're booking Train 12760 for 2 passengers for ₹2,480. Confirm
> booking?"
>
> **[ Confirm Booking ]**   **[ Go Back ]**

**What does *not* count as approval:** vague affirmations like "that
looks good," "sure," or "okay" in response to a recommendation are
**never** interpreted as booking authorization unless the product has
explicitly defined that exact phrase/button as the confirmation
action. The agent must always pass through the restate-then-confirm
pattern above — there is no shortcut path from "recommendation shown"
to "booked."

**Tatkal's consent model is structurally different, and worth being
explicit about:** the natural-language Approval screen pattern above
belongs to the Smart Search/Agent flow, where the agent is proposing
a *specific* option the user hasn't pre-committed to. Tatkal Mode
works the other way — the user gives **advance approval of a known,
bounded option set** (the preferred train plus its numbered backups)
during the Preparation screen, by marking the preparation `isReady`.
That marking *is* the explicit approval for attempting the preferred
train and, on failure, automatically proceeding to the backups **in
the order the user themselves chose** — re-asking "confirm booking?"
for every backup in sequence during a live Tatkal window would
reintroduce exactly the friction/stress Tatkal Mode exists to remove,
and would risk the window closing while waiting on a tap. This is a
deliberate, product-aligned interpretation of "explicit approval,"
not a bypass of §7 Rule 6: consent was still explicit, just given
once, in advance, over a bounded and user-selected set of options —
never over an open-ended "whatever the agent finds."

---

## 9. Agent state machine

`04-data-spec.md` already defines `AgentSessionStatus` (`COLLECTING`,
`NEEDS_CLARIFICATION`, `SEARCHING`, `RECOMMENDED`,
`AWAITING_APPROVAL`, `DECLINED`, `BOOKED`) — a narrower, persisted
set scoped specifically to the booking-producing Agent flow. This
spec's state machine is broader, since the agent also handles status
explanation and Tatkal preparation, neither of which is backed by
`AgentSession`. Each state below is annotated with what actually
backs it.

### Booking-flow states (backed by `AgentSession.status`)

| State | Purpose | Allowed transitions | User-visible behavior | Tools allowed |
|---|---|---|---|---|
| `COLLECTING` | User is composing/hasn't submitted a request. | → `NEEDS_CLARIFICATION`, `SEARCHING` | Agent screen, empty/typing. | none |
| `NEEDS_CLARIFICATION` | `AgentIntent.missingRequiredFields` non-empty. | → `NEEDS_CLARIFICATION` (further answers), `SEARCHING` | One targeted follow-up question (§5). | none |
| `SEARCHING` | Resolving a complete intent into candidates. | → `RECOMMENDED` | Brief loading state. | `searchTrains`, `getAvailability`, `rankOptions` |
| `RECOMMENDED` | A `RecommendationOption` is ready; alternatives may also be shown here. | → `AWAITING_APPROVAL`, `RECOMMENDED` (viewing alternatives) | Recommendation screen, with reason (§14); "show alternatives" is a sub-interaction within this same status, not a separate persisted status — see note below. | `getAlternatives` (on request) |
| `AWAITING_APPROVAL` | Restated summary shown, waiting for the explicit action from §8. | → `BOOKED`, `DECLINED` | Approval screen. | none (waiting on the user) |
| `DECLINED` | User declined. | → `RECOMMENDED` (or back to `COLLECTING` if they want to change the request) | Returns to Recommendation or Agent, original intent preserved. | none |
| `BOOKED` | Approval confirmed, `attemptBooking` succeeded, `createBooking` ran. | *(terminal for this session)* | Booking Success screen, then My Bookings. | *(none further — session complete)* |

**Note on "alternatives" and "booking":** the task framing suggests
`SHOWING_ALTERNATIVES` and `BOOKING` as distinct states.
`AgentSessionStatus` has no such values, and this spec treats that as
intentional simplification rather than a gap to route around:
alternatives are additional `RecommendationOption`-shaped results
held alongside the primary one, still under `RECOMMENDED` — the user
is still in "reviewing options" mode, which is what that status
represents. Likewise, `attemptBooking` → `createBooking` execute as
one short, atomic step immediately after `AWAITING_APPROVAL`
transitions on confirmation; there is no meaningfully long
intermediate "BOOKING" state to persist, since (per the scoping
decision below) this path doesn't have a failure branch to wait out.

**Scoping decision — booking failure in this flow:** `02-ux-spec.md`
is explicit that Booking Success "intentionally has no failure path
in the Smart Search/Agent flows; that behavior is scoped to Tatkal
Mode only." Accordingly, `attemptBooking` in the booking-flow state
machine is treated as succeeding once a `RecommendationOption` has
been approved (its underlying availability was already confirmed
live moments earlier) — there is no `BOOKING_FAILED` state in this
part of the machine. Real, expected failure only happens in the
Tatkal path below, which is the one place the product spec asks for
failure/fallback behavior.

### Tatkal-flow states (backed by `TatkalPreparation` / `TatkalAttempt` / the Booking Attempt screen's own UX states — **not** `AgentSession`)

| State | Purpose | Allowed transitions | User-visible behavior | Tools allowed |
|---|---|---|---|---|
| `TATKAL_PREPARING` | Building a `TatkalPreparation` (journey, passengers, class, preferred + backup trains). | → `TATKAL_READY` | Preparation screen. | `searchTrains`, `getAvailability`, `prepareTatkal` |
| `TATKAL_READY` | `TatkalPreparation.isReady === true`. | → `TATKAL_COUNTDOWN` | Preparation screen's "ready" state, or Tatkal Mode's resume state. | none |
| `TATKAL_COUNTDOWN` | Waiting for the simulated Tatkal opening. | → `TATKAL_ATTEMPTING` (auto, at `tatkalOpensAt`) | Countdown screen. | none |
| `TATKAL_ATTEMPTING` | Attempting the preferred train, then backups in order on failure. | → `BOOKED` (Tatkal), `TATKAL_FALLBACK`, or (all backups exhausted) a terminal failure display | Booking Attempt screen. | `attemptBooking`, `explainStatus` (to explain a `REGRET`/waitlisted outcome inline) |
| `TATKAL_FALLBACK` | A backup is being shown/selected after a failed attempt. | → `TATKAL_ATTEMPTING` (next attempt), `TATKAL_PREPARING` is **not** reachable from here (no restart) | Backup options appear in place, per Product Principle 4. | `getAlternatives` (only if prepared backups are exhausted and the product allows suggesting beyond them — otherwise the prepared list is used as-is) |

A Tatkal-flow "`BOOKED`" outcome produces a `Booking` with
`source: 'TATKAL'`, exactly like the booking-flow `BOOKED` state
produces one with `source: 'AGENT'` or `'SMART_SEARCH'` — they share
the same entity, just reached via a different path, per
`04-data-spec.md`'s `BookingSource` field.

**How the Agent enters this track:** when the agent classifies a
request as Tatkal-intent (§3/§4), it calls `prepareTatkal` and then
**hands off** to the same Preparation/Countdown/Booking Attempt
screens Tatkal Mode already owns (`02-ux-spec.md`) — it does not
reimplement countdown or attempt logic itself. `TatkalPreparation` is
the single shared entity both the Agent's natural-language entry
point and Tatkal Mode's own direct entry point produce and read, so
there's exactly one implementation of "what happens after
preparation," regardless of how preparation was created.

### Status-explanation (ephemeral — no persisted entity)

| State | Purpose | Allowed transitions | User-visible behavior | Tools allowed |
|---|---|---|---|---|
| `EXPLAINING_STATUS` | Answering a direct "what does X mean" request. | → itself (another question) or exits back to wherever the user came from | Inline plain-language explanation, per §11/§15. | `explainStatus`, and `searchTrains`/`rankOptions` only if a better alternative is genuinely worth surfacing (see §11) |

This is intentionally the lightest-weight path: it doesn't need
`AgentSession`'s recommendation/approval machinery at all, since
there's nothing to book. This mirrors the "Understand My Status"
screen in `02-ux-spec.md`, which the Agent's status-explanation
handling is the natural-language equivalent of.

### Cross-cutting: `ERROR`

Not a committed state transition in any of the three tracks above. On
a tool failure (data inconsistency, an unresolvable request, etc.),
the agent surfaces a plain-language error **without** advancing
`AgentSession.status` (or the Tatkal-side state) to something that
implies progress that didn't happen — the user stays where they were,
sees an honest message, and can retry. This follows directly from
Rule 7 (never fabricate results): if a tool can't produce a real
result, the agent doesn't invent a state transition to paper over
that.

---

## 10. Agent flow — normal booking

```
User request
  ↓
Intent extraction                    → AgentIntent populated
  ↓
Missing information (if required)    → §5, loops until resolved
  ↓
Search                               → searchTrains
  ↓
Availability                         → getAvailability (as needed per candidate)
  ↓
Ranking                              → rankOptions
  ↓
Recommendation                       → RecommendationOption(s), with reasons (§14)
  ↓
Alternatives (if requested)          → getAlternatives
  ↓
Explicit approval                    → §8 (Approval screen)
  ↓
Booking attempt                      → attemptBooking (treated as succeeding, §9 scoping decision)
  ↓
Booking success                      → createBooking
  ↓
Booking record                       → Booking (source: 'AGENT')
  ↓
Booking Success screen               → 02-ux-spec.md
  ↓
My Bookings                          → 02-ux-spec.md
```

---

## 11. Agent flow — status explanation

```
User: "What is GNWL 24?"
  ↓
explainStatus(code: 'GNWL', waitlistPosition: 24)
  ↓
Plain-language response (§15)
```

The agent does **not** search trains as a matter of course for a pure
status question — only if a genuinely useful alternative is worth
mentioning (e.g., the user is already mid-conversation about a
specific journey and a confirmed option is known to exist on the same
route/date). Unprompted searching in response to "what does GNWL
mean?" would be noise, not help.

---

## 12. Agent flow — Tatkal

```
User requests Tatkal (via natural language, or by using Tatkal Mode directly)
  ↓
Intent                                → AgentIntent (journey, class)
  ↓
prepareTatkal                         → TatkalPreparation created
  ↓
Preferred train + backup trains       → selected during preparation
  ↓
Ready                                 → TatkalPreparation.isReady = true (this IS the advance approval, §8)
  ↓
Countdown                             → to TatkalPreparation.tatkalOpensAt
  ↓
Tatkal opens
  ↓
attemptBooking (preferred)
  ↓
Success ────────────────────────────→ createBooking → Booking (source: 'TATKAL')
  │
  ↓ Failure
getAlternatives / the prepared backup list (in order)
  ↓
User's already-approved next backup is attempted automatically —
no fresh per-backup confirmation prompt (§8's Tatkal note)
  ↓
attemptBooking (backup)
  ↓
Success ────────────────────────────→ createBooking → Booking (source: 'TATKAL')
```

**Tatkal failure must never reset the journey.** Preparation data
(passengers, class, route, remaining backups) persists across
attempts — the user is never sent back to Preparation or Smart Search
after a failed attempt while backups remain, per Product Principle 4.

---

## 13. Booking failure

Per §9's scoping decision, real booking failure is a **Tatkal-path
concept** in this prototype (the Smart Search/Agent flow's
`attemptBooking` is treated as succeeding once approved, matching
`02-ux-spec.md`).

**Example:**

> Preferred train: `SOLD_OUT`
>
> Agent: "I couldn't secure that train."
>
> → `getAlternatives` (or the prepared backup list)
>
> Backup 1
> Backup 2
> Backup 3

Throughout, the agent preserves: source, destination, date,
passengers, class, and any stated preferences. **The user never has
to restart.** This is enforced structurally, not just conversationally:
`TatkalPreparation` already holds all of this, and nothing in the
failure path clears or replaces it — only `TatkalAttempt` records
accumulate as attempts are made.

---

## 14. Recommendation explanation

Every recommendation must include a reason (Product Principle 3). A
recommendation's structure:

- **Selected option** — the specific train/date/class
  (`RecommendationOption.trainNumber`/`journeyDate`/`travelClass`).
- **Category** — which of `BEST_OVERALL`, `FASTEST`, `CHEAPEST`,
  `BEST_CONFIRMATION_CHANCE` this is.
- **Key trade-offs** — what the user gives up by choosing this
  (`RecommendationOption.tradeOffNote`, when a requirement was only
  partially met).
- **Reasons** — the plain-language justification
  (`RecommendationOption.reasonSummary`).
- **Important warning, if applicable** — e.g., a waitlisted status
  that still needs an honest caveat even when it's the best available
  option (per `02-ux-spec.md`'s Results "Partial" state).

**Bad:** "Train 12760 is the best."
**Good:** "I recommend Train 12760 because it is confirmed, fits your
evening preference, and is significantly cheaper than the fastest
option."

---

## 15. Human-friendly language

The agent translates railway complexity into ordinary language. Raw
status codes (`GNWL`, `PQWL`, `RLWL`, `TQWL`, `RAC`) are never shown
unexplained — every appearance is accompanied by (or replaced with)
the corresponding `RailwayStatusDefinition.plainExplanation`.

**Instead of:** "GNWL 24"
**Say:** "You're #24 on the General Wait List. The seat isn't
confirmed yet."
**Then, if relevant:** "There's a confirmed option available on
another train."

This is the same `explainStatus` tool and the same
`RailwayStatusDefinition` content used by the standalone Understand
My Status screen — one source of explanation text, reused everywhere
a status appears (Results, Train Details, the Agent's own responses,
Booking Attempt). The status code itself (`GNWL`) is never translated
between languages either — only the explanation sentence around it
is; see §22 for how this interacts with Multilingual Experience.

---

## 16. Agent personalization

`UserPreferences.travelPriority` (`'PRICE' | 'SPEED' | 'CONFIRMATION'
| 'BALANCED'`) conceptually influences how `rankOptions` weighs
candidates for a given user, and how the agent phrases its
recommendation.

- A user with `travelPriority: 'CONFIRMATION'` → the agent favors
  confirmed options more heavily, and is more willing to surface a
  pricier or slower confirmed option as the top pick.
- A user with `travelPriority: 'PRICE'` → the agent favors cheaper
  options, and is more explicit about waitlist trade-offs (since a
  price-focused user is more likely to accept some risk for savings).
- A user with `travelPriority: 'SPEED'` → the agent favors shorter
  duration, even at a fare premium.

**The exact scoring formula is out of scope here** — this spec only
establishes that `UserPreferences` is a real input `rankOptions`
should consider, and that different users can and should see
different top recommendations for the identical search, per the
product's demo requirement to show that different priorities lead to
different sensible answers.

---

## 17. Demo mode

The agent must reliably reproduce the deterministic demo scenarios
already defined in `04-data-spec.md`'s `DemoScenario` records
(generated in `src/data/scenarios.ts`), with no uncontrolled
randomness anywhere in intent extraction, ranking, or Tatkal outcomes
— all of it is Layer 1 deterministic logic (§18) operating on already
-deterministic mock data.

The scenarios the agent must be able to reliably drive:

1. **Status explanation** — `demo_status_translator_gnwl24`,
   `demo_status_translator_rac14`
2. **Best Overall recommendation** — `demo_best_overall`
3. **Cheapest trade-off** — `demo_cheapest_tradeoff`
4. **Fastest option** — `demo_fastest_not_cheapest`
5. **Agent booking** — `demo_agent_hyderabad` (the
   `agentInputText`/`expectedAgentIntent`/`expectedRecommendations`
   fields on this record are exactly the contract this spec's intent
   extraction and `rankOptions` tool must satisfy)
6. **Tatkal success** — `demo_tatkal_success`
7. **Tatkal failure + backup** — `demo_tatkal_failure_backup` (the
   hero scenario)

The same input text must produce the same `AgentIntent`, the same
recommendation, and the same Tatkal outcome on every run — this is a
direct requirement of `04-data-spec.md`'s "Deterministic data"
section, and this spec's Layer 1 strategy (§18) is what makes that
possible without depending on an LLM's non-deterministic output.

---

## 18. LLM strategy

The product must not depend on a paid LLM API for core functionality.

### Layer 1 — Deterministic core

Intent extraction and decision logic have a fully deterministic
fallback: pattern/keyword matching for station names, a small
relative-date resolver (anchored to `DEMO_DATES.TODAY`, not the real
clock), simple number-word parsing for passenger counts, a fixed
lookup table for class synonyms ("AC" → `3A`, etc.), and keyword
detection for confirmation/price/speed/Tatkal intent. Ranking
(`rankOptions`) and status explanation (`explainStatus`) are
similarly deterministic, operating on static mock data with no model
call required. This layer alone is sufficient to run every demo
scenario in §17. Since it's pattern/keyword-based rather than a model
call, it extends cleanly to a bounded per-language lexicon for
Multilingual Experience — see §22 — without needing an LLM or
translation API for any of the three supported languages.

### Layer 2 — Optional LLM enhancement

An LLM may later be used to improve natural-language intent
extraction (handling phrasing Layer 1's patterns don't anticipate),
conversational phrasing of recommendations/explanations, and
explanation generation. **The application must remain fully
functional without it** — Layer 2 can only make understanding richer
or phrasing more natural; it can never become a dependency for a core
capability to work at all.

This document does **not** select a provider, does not specify an
SDK, and does not define provider-specific implementation — those
are `05-technical-spec.md` decisions, made later.

---

## 19. Agent error handling

The agent is always honest — it never fabricates availability or
booking success, per Rule 7.

| Situation | Behavior |
|---|---|
| Invalid destination (no matching station) | Say so plainly; ask for clarification rather than guessing a station. |
| Invalid date (unparseable, or in the past relative to `DEMO_DATES.TODAY`) | Say so plainly; ask for a valid date. |
| No trains at all for the route/date | Say so plainly (mirrors Results' "Empty" state); suggest adjusting the date. |
| No *suitable* trains (constraints too narrow, e.g. AC + confirmed + cheapest all at once) | Explain the conflict and which constraint would need to relax, rather than silently dropping one. |
| All options waitlisted | Surface the best-available option honestly with its waitlist caveat (mirrors Results' "Partial" state) — never present a waitlisted option as confirmed. |
| Tool failure (data lookup error) | Surface a plain-language error; do not advance state (§9's `ERROR` note); allow retry. |
| Malformed `AgentIntent` (internal inconsistency, e.g. `missingRequiredFields` out of sync with actual field state) | Treated as a tool/internal failure, not a user-facing one — re-derive `missingRequiredFields` from the actual intent fields rather than trusting a stale value. |
| Booking failure (Tatkal only, §13) | Explain honestly, then move to backups — never restart the journey. |
| Tatkal failure with all backups exhausted | Say so plainly; the Tatkal-specific opportunity has passed — offer a path to a new (non-Tatkal) search, not a retry loop. |
| Ambiguous request | Ask exactly one targeted clarifying question (§5) — never guess silently on something that matters, never ask more than necessary. |

---

## 20. Agent → data traceability

| Tool | Entities used (from `04-data-spec.md`) |
|---|---|
| `searchTrains` | `Station`, `Train`, `TrainAvailability`, `SearchRequest` |
| `getAvailability` | `Train`, `TrainAvailability` |
| `explainStatus` | `RailwayStatusDefinition` |
| `rankOptions` | `TrainAvailability`, `RecommendationOption`, `UserPreferences` |
| `getAlternatives` | `Train`, `TrainAvailability`, `AgentIntent` (or `TatkalPreparation`) |
| `prepareTatkal` | `TatkalPreparation`, `Train`, `TrainAvailability`, `Passenger` |
| `attemptBooking` | `TrainAvailability`, `TatkalPreparation` / `TatkalAttempt` (Tatkal path) |
| `createBooking` | `Booking`, `BookingPassenger` |

Every tool maps only to entities that already exist in the locked
data spec — nothing here requires a new entity or field.

---

## 21. Agent → UX traceability

| Screen (`02-ux-spec.md`) | Agent involvement |
|---|---|
| Home | Entry point to the Agent capability (and, indirectly, to Tatkal Mode when the agent hands off per §9/§12). No agent logic runs here. |
| Smart Search | No agent involvement — this is the structured-form path; the Agent screen is its natural-language sibling, not layered on top of it. |
| Results | No direct agent involvement, but shares `rankOptions`' output shape (`RecommendationOption`) with the Agent's own Recommendation screen. |
| Train Details | No agent involvement. |
| Passenger Review | No agent involvement (Smart Search flow only). |
| Booking Success | Exit point for both the Agent's normal booking flow (§10) and — when reached via the Tatkal success state — the Tatkal flow (§12). |
| **Agent** | Entry point. Intent extraction (§4), missing-information handling (§5), and request-kind classification (§3) all happen here. |
| **Recommendation** | `rankOptions`/`getAlternatives` output is rendered here (§10, §14). |
| **Approval** | The explicit approval boundary (§8) lives here. |
| Understand My Status | The screen-level equivalent of the agent's status-explanation flow (§11) — same `explainStatus` tool and `RailwayStatusDefinition` content, different entry point (form vs. natural language). |
| Tatkal Mode | Entry point the agent can hand off into (§9/§12) after `prepareTatkal`, or that a user reaches directly without the agent at all — both paths converge on the same `TatkalPreparation`. |
| Preparation | Where `prepareTatkal`'s inputs are gathered, whether initiated by the agent or directly. |
| Countdown | No agent involvement beyond having created the `TatkalPreparation` that this screen reads (§9). |
| Booking Attempt | `attemptBooking`, and `getAlternatives`/the prepared backup list on failure (§12, §13). `explainStatus` may be used inline to explain a `REGRET`/waitlisted outcome. |
| My Bookings | Exit point after any agent- or Tatkal-produced `Booking` — no agent logic runs here, it's a plain read of `Booking` records regardless of how they were created. |
| Booking Details | Same as My Bookings — a plain read, no agent involvement. |

(Login has no agent involvement and is intentionally omitted above.)

---

## 22. Multilingual presentation

Multilingual Experience (`01-product-spec.md`, `02-ux-spec.md`) is a
presentation-layer concern. It changes nothing else defined in this
document — no tool signature, no `AgentIntent` field, no
`AgentSession` state, and no domain entity becomes language-specific.

```
User language
      ↓
Agent UI
      ↓
Language-independent AgentIntent
      ↓
Tools
      ↓
Language-independent domain data
      ↓
Localized response presentation
```

**What stays language-independent:** `AgentIntent`, `AgentSession`,
every tool's inputs and outputs (§6), and every domain entity they
touch (`TrainAvailability.status`, `RailwayStatusDefinition.code`,
etc.). A tool never returns translated data — `getAvailability`
returns `status: 'GNWL'` regardless of the user's selected language,
exactly as it does in every other section of this document.

**What varies by language:** only the final presentation step — the
text the user actually reads. The agent's restated recommendation
(§14), its clarifying questions (§5), its approval prompt (§8), and
`explainStatus`'s plain-language explanation (§15) are all rendered
in the user's selected language, using the same canonical values
(status codes, category names, train numbers, fares) this document
already assumes throughout — only the surrounding sentence changes.

**Switching language mid-session:** per `02-ux-spec.md`'s
Cross-cutting Language Selection, changing language never restarts an
`AgentSession` or clears its `intent`/`status`/`recommendation`. Only
the presentation of whatever state the session is already in
re-renders. No tool is called as a result of a language change, and no
state-machine transition (§9) occurs.

**Bounded multilingual intent recognition (a Layer 1 extension, §18):**
Layer 1 is pattern/keyword-based, not a model call — this makes a
bounded multilingual extension straightforward without introducing
any LLM or translation API. Each supported language (English, Hindi,
Telugu) has its own small, fixed lexicon covering the same finite
vocabulary Layer 1 already needs: relative-date words ("tomorrow" /
"कल" / "రేపు"), class synonyms ("AC" / "एसी" / "ఏసీ"),
confirmation/price/speed preference words, and Tatkal intent
keywords. Station names are not translated (per `01-product-spec.md`,
they're factual data, not presentation text), so they're recognized
the same way regardless of input language. **This is explicitly a
bounded MVP phrase set, not unrestricted multilingual natural
language understanding** — the demo scenarios in §17 are what each
language's lexicon needs to reliably support; nothing here promises
free-form input in Hindi or Telugu beyond that. If genuinely
open-ended multilingual understanding is ever wanted, that's a Layer
2 (optional LLM) concern to take up later — Layer 1's per-language
lexicons are not a stepping-stone toward that, just enough to keep
the deterministic core honest across three languages instead of one.

**No translation API, no LLM required.** Rendering agent output in
the selected language is a lookup against static, bounded translation
content — the same kind of content `02-ux-spec.md` implies for every
other screen — not a live translation call. This keeps the agent
consistent with §18's requirement that the application remain fully
functional, offline, without any paid service.

---

## 23. Non-goals

The agent will **not**:

- perform real IRCTC booking
- access real railway APIs
- process real payments
- access Aadhaar
- manage real user accounts
- cancel tickets
- modify tickets
- guarantee confirmation
- predict railway outcomes with real-world certainty

---

## 24. Agent design principles

1. Agent is an orchestrator, not a database.
2. Tools are the only way the agent interacts with application
   capabilities.
3. Recommendations must be explainable.
4. Booking always requires explicit approval.
5. Failure preserves user intent.
6. Never fabricate availability.
7. Never fabricate booking success.
8. AI should reduce complexity, not add a chatbot layer.
9. Deterministic fallback must exist.
10. The user remains in control.
