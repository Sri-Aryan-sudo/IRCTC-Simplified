# 01 — Product Spec

Status: source of truth for product behavior.

This document defines PRODUCT behavior only. It does not define exact
React components, folder architecture, API implementation, database
schemas, tool schemas, LLM provider, exact UI styling, or other
implementation details — those belong in later specifications
(`02-ux-spec.md`, `03-agent-spec.md`, `04-data-spec.md`,
`05-technical-spec.md`).

## Working name

IRCTC Simplified

## Core product principle

> Don't make citizens learn how Indian Railways works. Make the app
> work the way citizens think.

## Problem

The existing railway booking experience exposes users to:

- complicated railway terminology
- many reservation statuses
- large numbers of train options
- difficult trade-offs between price, travel time and confirmation
- repetitive booking steps
- a stressful Tatkal booking experience

Users shouldn't need to understand the railway reservation system in
order to make a good travel decision. Our product should translate
railway complexity into simple decisions.

## Target user

Primary user: an ordinary Indian railway passenger who:

- knows where they want to travel
- may not understand railway reservation terminology
- wants to quickly identify the best option
- prefers minimal interaction
- may need Tatkal booking
- may have previously experienced confusion during train booking

Do not design specifically for expert railway users.

## Core product promise

The user should be able to say:

> "I need to get from A to B."

and the product should help answer:

> "Here is the best way for you to get there, and here's why."

## MVP capabilities

The product has exactly **four** major capabilities. No additional
capabilities should be introduced without updating this spec.

### 1. Status Translator

**Purpose:** Make railway reservation terminology understandable.

Supported examples include: GNWL, RAC, PQWL, RLWL, TQWL, WL, CNF, CAN,
REGRET.

The system should not merely expand abbreviations. It should
translate:

```
Railway status → Human explanation → What it means → What the user should consider doing
```

Example — `GNWL 24` should become something like:

> "You're currently #24 on the General Wait List. Your ticket is not
> confirmed yet."

...then provide an actionable alternative when appropriate.

### 2. Smart Search

**Purpose:** Reduce cognitive overload.

Instead of presenting the user with a flat list of trains, the system
should identify useful categories:

- Best Overall
- Fastest
- Cheapest
- Best chance of confirmation

The system must explain *why* an option is recommended.

Example — "Best Overall": "₹1,240 · Confirmed · 12h 50m" —
"Recommended because it balances price, travel time and
confirmation."

The exact scoring algorithm will be defined later in the
technical/agent specifications.

### 3. Agent-Driven Booking

**Purpose:** Allow users to express travel requirements naturally.

Example: "I need to reach Hyderabad tomorrow evening. Two people. AC.
Preferably confirmed."

The agent should:

1. Understand the user's intent.
2. Extract relevant travel requirements.
3. Search available mock train data.
4. Compare options.
5. Recommend the best option.
6. Explain the recommendation.
7. Ask for confirmation before booking.
8. Perform a MOCK booking after user approval.

The agent must never silently book without explicit user
confirmation.

### 4. Tatkal Mode

**Purpose:** Reduce the stress and friction of Tatkal booking.

The experience should allow users to prepare before Tatkal opens.
Preparation includes:

- journey details
- passenger details
- preferred class
- preferred train
- backup trains
- booking readiness

When Tatkal opens, the prototype should simulate:

1. Booking attempt.
2. Preferred train success OR failure.
3. If failure occurs, immediately surface backup options.
4. Allow the user to choose a backup.
5. Complete a mock booking.

The user should NOT be forced to restart the entire booking flow
after a failed preferred option.

## Supporting UX

Beyond the four MVP capabilities, the product includes a small set of
supporting UX that exists to make those four capabilities usable in
practice — not to introduce new product behavior of its own:

- **Login** — see below. Establishes a mocked identity so
  preferences, saved passengers, and bookings can be attached to
  someone.
- **My Bookings** — lets a user review bookings already produced by
  Smart Search, Agent-Driven Booking, or Tatkal Mode, and see the
  details of any one of them. It has no behavior of its own; it
  surfaces outcomes the four capabilities already created. (Full
  screen definitions live in `02-ux-spec.md`.)
- **Multilingual Experience** — see below. Lets the user choose the
  language the interface is presented in.

None of these count as a fifth capability. The product still has
exactly four.

## Login

The product must include a login experience. However:

- authentication is MOCKED
- no real IRCTC credentials
- no real OTP
- no real Aadhaar authentication
- no real personal data

Login exists primarily to support: personalized experience, saved
passengers, preferences, bookings, and Tatkal preparation.

## Multilingual Experience

**Purpose:** Let the user choose the language the interface is
presented in, so language is not itself a barrier to using the
product — consistent with the core principle of making the app work
the way the citizen thinks, not the way a system (or a single
language) dictates.

**Supported languages:** English, Hindi, and Telugu — exactly these
three. This is a deliberately bounded set for the hackathon
prototype, not an attempt at general internationalization.

**User-selectable, not detected.** The user explicitly chooses a
language; the product does not attempt to infer it from browser
locale, IP geography, or any other signal.

**Scope: presentation only.** Multilingual Experience changes how the
interface is *presented* — labels, instructions, explanations,
messages. It does not change what data the product uses or how it
behaves. Canonical railway identifiers and factual data — status
codes (GNWL, RAC, PQWL, RLWL, TQWL, CNF, etc.), PNRs, train numbers,
train names, station names, fares, and dates — are never translated;
only the plain-language explanation *around* them is. For example,
"GNWL 24" stays "GNWL 24" in every language; "You're currently #24 on
the General Wait List" becomes the equivalent sentence in Hindi or
Telugu.

**Applies across the whole experience.** The selected language
affects navigation, headings, buttons, labels, form instructions, the
Status Translator's explanations, Smart Search's results and
recommendation reasoning, the Agent's messages and approval prompts,
Tatkal's preparation/countdown/attempt messaging, My Bookings, and
Booking Details — everywhere the user reads interface text. A user
should be able to complete every major flow (search, agent booking,
Tatkal, status lookup, reviewing bookings) entirely in their chosen
language.

**Not a fifth capability.** Multilingual Experience is supporting UX,
like Login and My Bookings — it exists so the four capabilities are
usable in more than one language, not to introduce new product
behavior. The product still has exactly four core capabilities.

**Agent implication.** The Agent-Driven Booking capability's
natural-language understanding does not need to become a
general-purpose multilingual AI for this prototype. User-facing agent
responses are shown in the selected language; a bounded set of demo
phrases is supported for intent recognition in each language (see
`03-agent-spec.md`), rather than unrestricted free-form input across
three languages — this keeps the feature honest about what it
actually does, instead of implying capability the prototype doesn't
have.

## Personalization

A logged-in user can have:

- preferred class
- berth preference
- saved passengers
- travel priority

The product should use these preferences to reduce repetitive input.

## Booking

All booking is simulated. The prototype should be capable of
producing:

- booking confirmation
- fictional PNR
- journey details
- passenger details
- fare
- booking status

No real booking should ever occur.

## Product experience principles

**Principle 1 — Explain, don't expose complexity**
Bad: "GNWL 24." Better: "You're #24 on the waitlist. Your seat isn't
confirmed yet."

**Principle 2 — Recommend, don't overwhelm**
Bad: "Here are 48 trains." Better: "Here are the 3 options I'd
consider."

**Principle 3 — Explain recommendations**
Never simply say "Best train." Say why.

**Principle 4 — Failure should not restart the journey**
Especially for Tatkal. If the preferred train fails → show
alternatives. NOT → restart search.

**Principle 5 — AI should disappear into the experience**
Do not make the product feel like a generic chatbot. The user should
feel "The app understood what I wanted," not "I am talking to an AI."

**Principle 6 — Minimize cognitive load**
Every screen should answer: "What does the user need to know RIGHT
NOW?"

## Success criteria

A judge unfamiliar with the product should be able to understand the
value within 30 seconds.

A user should be able to:

1. Log in.
2. Search for a journey.
3. Understand availability/status.
4. Identify the recommended option.
5. Understand why it was recommended.
6. Complete a mock booking.

The agent flow should allow: natural language request →
recommendation → approval → booking.

The Tatkal flow should demonstrate: preparation → countdown →
booking attempt → failure/success → fallback → booking.

## Non-goals

Explicitly DO NOT build:

- real IRCTC integration
- real booking
- real payment gateway
- real Aadhaar verification
- real OTP
- complete IRCTC feature parity
- food ordering
- cancellation/refund system
- PNR tracking system
- railway complaint system
- loyalty/rewards
- railway timetable management
- production-grade authentication
- production database infrastructure
- support for languages beyond English, Hindi, and Telugu
- automatic language detection
- unrestricted free-form multilingual natural-language understanding
- any paid translation API or LLM-based translation service

## Hackathon positioning

The project is not: "An AI chatbot for IRCTC."

It is: "An intelligent redesign of the railway booking experience
that converts railway complexity into simple decisions."

Core transformation:

**Current:**
Information → User interprets → User compares → User decides → User
navigates → User books

**Our product:**
User intent → Understand → Compare → Recommend → User approves → Book

## Demo story

The product should support a compelling demo sequence:

1. Login
2. Enter Chennai → Hyderabad
3. Show multiple options
4. Demonstrate GNWL/RAC/Confirmed differences
5. Explain a confusing status
6. Show Best Overall recommendation
7. Explain why it is recommended
8. Use the agent to express a natural-language requirement
9. Agent recommends an option
10. User approves
11. Mock booking succeeds
12. Demonstrate Tatkal Mode
13. Preferred train fails
14. Backup train appears
15. User books backup successfully
