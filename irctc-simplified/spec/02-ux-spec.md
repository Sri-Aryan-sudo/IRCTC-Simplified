# 02 — UX Spec

Status: source of truth for screens, navigation, and interaction
design.

This document defines screens, navigation, layout, and interaction
behavior for the four MVP capabilities defined in
`01-product-spec.md`, plus two supporting UX pieces: **My Bookings**
— a screen that lets the user review bookings those capabilities
already produced — and **Multilingual Experience** — cross-cutting
language selection (English, Hindi, Telugu) that changes how the
interface is presented, not what it does. Neither is a fifth
capability (the product spec is explicit that there are exactly
four); both exist to make the four capabilities more usable, not to
introduce new product behavior of their own. This document does
not define exact React components, folder architecture, exact visual
styling (colors, spacing tokens, fonts), or implementation details —
those belong in `05-technical-spec.md` and the eventual component
work itself.

## Information architecture / route map

```
Login
  ↓
Home
  ├── Smart Search
  │     ↓
  │   Results
  │     ↓
  │   Train Details
  │     ↓
  │   Passenger Review
  │     ↓
  │   Booking Success
  │
  ├── Agent
  │     ↓
  │   Recommendation
  │     ↓
  │   Approval
  │     ↓
  │   Booking Success
  │
  ├── Understand My Status
  │
  ├── My Bookings
  │     ↓
  │   Booking Details
  │
  └── Tatkal Mode
        ↓
      Preparation
        ↓
      Countdown
        ↓
      Booking Attempt
        ↓
      Success / Backup
```

Home is the hub. Every top-level capability (Smart Search, Agent,
Understand My Status, Tatkal Mode) is reachable directly from Home,
and each of the three booking-producing flows (Smart Search, Agent,
Tatkal Mode) is a self-contained forward path that ends in a
booking-confirmed state. **Booking Success is a shared screen**: the
Smart Search flow and the Agent flow both terminate there, rendered
with flow-specific context (what was booked, and — for the agent flow
— a short recap of the approved recommendation). Tatkal Mode has its
own terminal state (`Success / Backup`) because it must additionally
represent a failure-and-recovery path that the other two flows don't
have.

**My Bookings is also reachable directly from Home**, alongside the
four capabilities, as the place to review what's already been booked.
It is not itself one of the four capabilities — it has no behavior of
its own beyond displaying and drilling into bookings that Smart
Search, Agent, or Tatkal Mode already created. Every successful
booking outcome routes forward into it: **Booking Success → My
Bookings** (for both the Smart Search and Agent flows), and Tatkal
Mode's own success state (within `Success / Backup`) does the same.
This is distinct from those screens' own terminal confirmation —
Booking Success and Success/Backup are the one-time "you just booked
this" moment; My Bookings is the durable, return-to-later list.

There is no forced re-authentication or flow restart anywhere in this
map. Going backward from any screen returns to the previous step in
that flow, not to Home, unless the user explicitly navigates Home.

## Shared navigation & layout

- **Global shell:** Present on Home and all screens *except* Login,
  Countdown, and Booking Attempt (see per-screen notes for why those
  three are exceptions). Contains: app identity/logo, a way back to
  Home, a language selector (see **Cross-cutting Language Selection**
  below), and — once implemented — a signed-in indicator for the
  personalization data described in the product spec (preferred
  class, saved passengers, etc.). No global search bar or generic
  chatbot affordance — per Principle 5 ("AI should disappear into the
  experience"), the Agent is a distinct entry point from Home, not a
  persistent chat widget bolted onto every screen.
- **Back behavior:** Every screen inside a flow (Results → Booking
  Success, Recommendation → Approval, Preparation → Countdown, etc.)
  supports going one step backward without losing previously entered
  data (search criteria, passenger details, agent request text). This
  directly supports Principle 4 (failure/backtracking should not
  restart the journey).
- **Progress indication:** Multi-step flows (Smart Search's
  Results→Train Details→Passenger Review→Booking Success, and Tatkal
  Mode's Preparation→Countdown→Booking Attempt→Result) should
  communicate "where the user is" in the flow, since these are the
  longest paths a user will take.
- **Status translation is a cross-cutting pattern, not just a
  screen.** Anywhere a railway status appears (Results, Train Details,
  Booking Attempt/Result), it must be shown in plain language inline
  (Principle 1), with an optional path to the full "Understand My
  Status" screen for a deeper explanation. The standalone screen and
  the inline treatment share the same underlying explanations — see
  `04-data-spec.md` for where that content lives.

### Cross-cutting Language Selection

**Purpose:** Let the user choose the interface language — English,
Hindi, or Telugu — from anywhere it's offered, without losing any
in-progress work. This is presentation-layer behavior only: it
changes how the interface reads, never what the interface is showing
or doing.

**Key elements:**
- A selector control (e.g. "🌐 English ▾") showing the current
  language and offering the other two, using each language's native
  display name (English, हिन्दी, తెలుగు) rather than an English gloss
  for the non-English options.
- Present in three places, per the product spec: on the Login screen
  itself (before any signed-in session exists — a screen-level
  element there, since the global shell doesn't apply pre-login), on
  Home, and as part of the persistent application header on every
  screen reachable after login.
- **Exception carve-out:** Countdown and Booking Attempt otherwise
  omit the standard shell chrome entirely for focus (see Global
  shell above). The language selector is the one piece of that chrome
  that still remains, in minimized form — mirroring how those same
  screens already keep a minimized way back despite hiding the rest
  of the shell. Language is presentation, not a distraction from the
  Tatkal-specific urgency those screens protect, so hiding it
  entirely isn't warranted the way hiding full navigation chrome is.

**States:**
- Closed (showing only the current language).
- Open (showing all three options, current one indicated).
- Applied (interface text updates immediately, in place — no reload,
  no navigation, no loss of scroll position or focus).

**Edge cases:**
1. **Switching during an active flow** (e.g. on Results, mid-way
   through Passenger Review): only presentation text changes. Search
   criteria, the selected train, entered passenger details, and any
   other in-progress state are untouched — the user stays on the
   exact same screen and step, now reading it in the new language.
2. **Switching during Agent interaction:** the existing `AgentSession`
   continues unchanged — `AgentIntent`, `status`, and any
   `recommendation` already computed persist exactly as they were.
   Only the agent's rendered messages and prompts re-render in the
   new language; the agent does not restart or re-ask anything it
   already has an answer for.
3. **Switching during Tatkal (Countdown / Booking Attempt):** the
   countdown itself, `TatkalPreparation`, and any in-progress or
   completed `TatkalAttempt` are untouched. Only the surrounding UI
   text changes — the countdown does not pause, reset, or restart.
4. **Missing translation for a given string:** falls back to English
   for that string only. The interface must never show a raw
   translation key, "undefined," or blank text — an English fallback
   is always preferable to a broken-looking string, even mid-way
   through an otherwise-Hindi or Telugu screen.
5. **Railway/domain data is never affected.** Status codes (GNWL,
   RAC, PQWL, RLWL, TQWL, CNF, etc.), PNRs, train numbers, train
   names, station names, fares, and dates read identically regardless
   of language — only the plain-language explanation around them
   changes. Switching language never mutates or re-fetches the
   underlying mock data.

**Navigation/behavior:** Selecting a language is not a navigation
event. It never changes route, screen, or step — it's a same-screen,
same-state re-render of presentation text only.

## Screen-by-screen breakdown

### Login

**Purpose:** Establish a (mocked) signed-in session so the app can
personalize search, remember passengers, and support Tatkal
preparation. Per the product spec, this is not real authentication.

**Key elements:**
- Minimal credential-style input (mocked — no real OTP/Aadhaar/IRCTC
  account).
- A visible, honest signal that this is a prototype/mock login (so
  judges and users aren't misled about real authentication — supports
  hackathon positioning, not a product feature to hide).
- A language selector (English, हिन्दी, తెలుగు) — see **Cross-cutting
  Language Selection** in Shared navigation & layout. Available here
  specifically because a user shouldn't have to read English to even
  get past Login.
- Continue/submit action.

**States:**
- Default (empty form).
- Submitting (brief, since login is mocked and should not be a source
  of friction).
- Error (e.g., empty required field) — should be rare and never block
  the demo.

**Edge cases:**
- No account-recovery, password-reset, or real validation flows exist
  or are needed — these are explicit non-goals.
- A user who is already "logged in" (e.g., returning in the same
  session) should skip directly to Home rather than re-prompting.

**Navigation:** Entry point of the app. On success → Home. No back
destination (this is the root).

---

### Home

**Purpose:** Orient the user and offer the four capabilities plus My
Bookings as clear, distinct entry points — nothing else competes for
attention here.

**Key elements:**
- Five clear entry points: Smart Search, Agent, Understand My Status,
  Tatkal Mode, and My Bookings. My Bookings is visually distinct from
  the other four (it's a review/history destination, not a
  capability) so the four core capabilities still read as the
  product's primary offering — exact visual treatment is left to
  implementation, but the distinction in *kind* should be legible.
- Lightweight personalization surface if relevant (e.g., a shortcut
  using saved preferences), but not required for MVP.
- The language selector, as part of the persistent shell (see
  Cross-cutting Language Selection) — Home is one of the two places
  the product spec calls out by name, alongside Login.
- No flat list of trains, no generic dashboard clutter — Home's job is
  routing the user to the right mental model, not showing data.

**States:**
- Default (only meaningful state — Home has no server data of its own
  to load).

**Edge cases:**
- If a user has an in-progress Tatkal preparation from a prior visit,
  Home should surface a way back into it rather than losing that
  state (supports Principle 4 at the Home level, not just within a
  flow) — exact treatment (banner vs. entry-point badge) is a UX
  detail to decide during implementation, not a new capability.

**Navigation:** Hub. Routes to Smart Search, Agent, Understand My
Status, Tatkal Mode, or My Bookings. Nothing routes back to Login without an
explicit sign-out (sign-out is not a demo priority and can be
minimal).

---

### Smart Search

**Purpose:** Capture journey intent (source, destination, date,
passengers, preferences) with minimal friction, using saved
preferences/passengers where available to reduce input.

**Key elements:**
- Source, destination, date, passenger count inputs.
- Optional preference input (e.g., priority between price / speed /
  confirmation chance) — informs the Results categorization.
- Pre-filled values from personalization where applicable (preferred
  class, saved passenger count) per the product spec's Personalization
  section.
- Submit action → Results.

**States:**
- Default/empty.
- Partially filled (in-progress).
- Validation error (e.g., missing destination) — must be immediate
  and plain-language, not a railway-style error code.

**Edge cases:**
- Same source and destination entered — block with a plain message,
  don't silently proceed.
- No date entered — should not be allowed to submit (date is required
  for meaningful mock results).

**Navigation:** Entry from Home. Submit → Results. Back → Home
(nothing to preserve backward from here since it's the first step).

---

### Results

**Purpose:** This is the heart of Principle 2 ("recommend, don't
overwhelm"). Present a small set of categorized options — Best
Overall, Fastest, Cheapest, Best Chance of Confirmation — instead of
a raw list, each with a one-line reason.

**Key elements:**
- Up to four categorized recommendation cards (categories defined in
  the product spec's Smart Search section).
- Each card shows: price, plain-language status (via the status
  translation pattern), duration, and a short "recommended because…"
  explanation (Principle 3).
- A way to see more options beyond the four categories, for users who
  want it — but this must stay secondary/opt-in, never the default
  view, so it doesn't undermine Principle 2.
- Entry point to "Understand My Status" for any status shown here.

**States:**
- Loading (searching mock data).
- Populated (normal case — at least one category has a viable
  option).
- Partial (e.g., no confirmed option exists at all — "Best Chance of
  Confirmation" still shows the best available waitlisted option with
  an honest plain-language caveat, rather than hiding the category).
- Empty (no trains at all for the given route/date in mock data) —
  must give the user a clear next step (e.g., adjust date), not a
  dead end.

**Edge cases:**
- Only one train exists in mock data for the route — categories may
  collapse to the same option; the UI should say so plainly rather
  than presenting four identical cards as if they were meaningfully
  different choices.

**Navigation:** Entry from Smart Search. Selecting a card → Train
Details. Back → Smart Search (with prior input preserved, per the
shared back-behavior rule).

---

### Train Details

**Purpose:** Let the user confirm the specifics of one chosen option
before committing to passenger entry — the "why should I trust this"
checkpoint.

**Key elements:**
- Full plain-language breakdown: departure/arrival, duration, class,
  fare, and current status translated per the Status Translator
  pattern (not raw codes).
- Restated "why recommended" context carried over from Results, so
  the user doesn't lose the reasoning that got them here.
- Proceed action → Passenger Review.

**States:**
- Populated (normal).
- Status changed since Results was shown (mock data can simulate this
  — e.g., waitlist position shifted) — must be surfaced honestly,
  not silently.

**Edge cases:**
- If the selected option's status has degraded significantly (e.g.,
  now REGRET/CAN) between Results and Train Details, the user should
  be told plainly before proceeding, with an easy path back to
  Results rather than a hidden failure later at Booking Success.

**Navigation:** Entry from Results. Proceed → Passenger Review. Back
→ Results (selection state preserved).

---

### Passenger Review

**Purpose:** Collect/confirm passenger details with minimal typing,
leaning on saved passengers from personalization.

**Key elements:**
- Passenger list, pre-filled from saved passengers where available;
  editable/addable for this booking.
- Class/berth preference confirmation (pre-filled from personalization
  where set).
- Fare summary (mocked, consistent with what was shown in Train
  Details).
- Confirm/Book action → Booking Success.

**States:**
- Pre-filled (returning user with saved passengers).
- Empty/manual entry (no saved passengers yet).
- Validation error (e.g., passenger count doesn't match what was
  searched) — plain-language, immediate.

**Edge cases:**
- Passenger count mismatch between what was searched (Smart Search)
  and what's entered here should be caught before booking, not after.

**Navigation:** Entry from Train Details. Confirm → Booking Success.
Back → Train Details (entered passenger data preserved if the user
goes back and returns).

---

### Booking Success *(shared: Smart Search flow & Agent flow)*

**Purpose:** Deliver a clear, satisfying confirmation that closes the
loop — this is the payoff screen and must feel conclusive and
trustworthy despite being fully mocked.

**Key elements:**
- Mock PNR, journey details, passenger details, fare, and booking
  status, per the product spec's Booking section.
- Explicit, visible acknowledgment that this is a simulated/mock
  booking (consistent with the hackathon positioning — never let the
  user think a real ticket was purchased).
- For the Agent flow specifically: a short recap tying the result
  back to the original natural-language request (e.g., "Booked for
  your trip to Hyderabad tomorrow evening"), so the AI-driven path
  feels coherent end-to-end rather than dropping the user into a
  generic confirmation.
- A way to continue to My Bookings (to see this booking in context
  alongside any others) and a way back to Home. This is still a
  terminal state for the *flow* — there is no further booking step —
  but it is no longer a dead end for the *app*: My Bookings is where
  this confirmation remains reachable after the moment has passed.

**States:**
- Success (only state — by the time the user reaches this screen in
  either flow, the booking is presumed to succeed, since failure
  handling with fallback is Tatkal Mode's specific job per the product
  spec).

**Edge cases:** None expected — this screen intentionally has no
failure path in the Smart Search/Agent flows; that behavior is scoped
to Tatkal Mode only, per the product spec.

**Navigation:** Entry from Passenger Review (Smart Search flow) or
Approval (Agent flow). Terminal for the flow — routes to My Bookings
or Home.

---

### Agent

**Purpose:** Let the user describe their travel need in their own
words instead of filling a structured form.

**Key elements:**
- A single natural-language input (e.g., "I need to reach Hyderabad
  tomorrow evening. Two people. AC. Preferably confirmed.").
- Lightweight acknowledgment that the system understood the input
  (e.g., a plain-language restatement of extracted intent) before
  moving on — this supports Principle 5 by making the interaction feel
  like understanding, not like a chat log.
- Submit action → Recommendation.

**States:**
- Default/empty.
- Processing (interpreting the request).
- Needs clarification — if intent extraction can't confidently
  determine required fields (e.g., no destination at all), the agent
  must ask a targeted follow-up rather than guessing silently or
  failing outright. (Exact extraction behavior is defined in
  `03-agent-spec.md`; this screen must be able to represent that
  clarification state.)

**Edge cases:**
- Ambiguous or incomplete input must lead to a clarifying question
  in-place, not a dead end or a silent wrong guess — this is a product
  requirement (the agent must never silently book, and by extension
  must never silently assume critical missing details).

**Navigation:** Entry from Home. Submit (once intent is resolved) →
Recommendation. Back → Home.

---

### Recommendation

**Purpose:** Present the agent's single best recommendation (not a
list) with a clear explanation — the agent-flow equivalent of Results,
but converging on one answer rather than categories, since the user
already stated specific requirements.

**Key elements:**
- One recommended option, shown with the same plain-language
  status/fare/duration treatment used elsewhere in the app.
- Explicit "why this option" explanation tied to what the user asked
  for (Principle 3).
- A path to see alternatives if the user isn't satisfied, without
  restarting the natural-language input from scratch.

**States:**
- Populated (a viable recommendation exists).
- No good match — the agent should say so plainly and suggest
  adjusting requirements, rather than forcing a poor match into a
  confident-sounding recommendation.

**Edge cases:**
- If the user's stated requirements can only be partially met (e.g.,
  "AC" and "confirmed" can't both be satisfied), the recommendation
  must say which trade-off it made and why, not hide the compromise.

**Navigation:** Entry from Agent. Proceed → Approval. Back → Agent
(original request text preserved, editable).

---

### Approval

**Purpose:** Get explicit user confirmation before any mock booking
occurs — a hard product requirement ("the agent must never silently
book without explicit user confirmation").

**Key elements:**
- Restated summary of what will be booked (journey, passengers, class,
  fare) so approval is informed, not a blind "yes."
- Explicit confirm action, and an explicit decline/edit action.

**States:**
- Awaiting confirmation (default).
- Declined → returns to Recommendation (or Agent, if the user wants
  to change their request) rather than dead-ending.

**Edge cases:** None beyond decline-and-return, which must not lose
the user's original request context.

**Navigation:** Entry from Recommendation. Confirm → Booking Success
(shared screen, see above). Decline → Recommendation or Agent.

---

### Understand My Status

**Purpose:** The standalone, dedicated version of the Status
Translator capability — for a user who encounters a status code
somewhere (on a physical ticket, on the real IRCTC site, in
conversation) and just wants it explained, independent of any search
or booking flow.

**Key elements:**
- Input for a status (e.g., selecting from common codes or entering
  one directly — exact input mechanism is a later UX/technical
  decision, not specified here).
- Plain-language explanation following the pattern in the product
  spec: what the status means, and what the user might consider doing
  about it.

**States:**
- Default/empty.
- Explained (populated result).
- Unrecognized input — must degrade gracefully with a plain message,
  not a raw error.

**Edge cases:**
- A status shown elsewhere in the app (Results, Train Details) that
  links here should arrive pre-populated with that status already
  explained, not force re-entry.

**Navigation:** Entry from Home, or contextually from any screen that
displays a status. Back → wherever the user came from (Home, or the
contextual screen).

---

### My Bookings

**Purpose:** Let the user see bookings they've actually made through
the prototype — from Smart Search, Agent, or Tatkal Mode — and
quickly understand each journey and its status, without re-entering
any booking flow. This is a supporting/review screen, not one of the
product's four core capabilities; its job is to surface the outcomes
those capabilities already produced.

**Key elements:**
- A list of booking cards, most recent first. Each card shows exactly
  what's needed to recognize a booking at a glance: train, route,
  journey date, class, passenger count, booking status, and PNR —
  nothing more (Principle 6, minimal info per screen).
- One primary interaction: selecting a card opens Booking Details for
  that booking. No secondary actions on the card itself.
- No cancellation, refund, modification, rescheduling, or payment
  management anywhere on this screen — these are explicit product
  non-goals (per `01-product-spec.md`), not omissions to revisit
  later.
- Bookings from all three producing flows appear in the same
  undifferentiated list, sorted the same way (most recent first) —
  this screen doesn't distinguish *how* a booking was made, only
  *what* was booked; which flow produced it isn't part of the
  required information and would add detail the user doesn't need to
  recognize their trip.

**States:**
- Loading (fetching the user's bookings).
- One or more bookings (populated) — cards as described above.
- No bookings (empty) — must say so plainly and point toward a clear
  next action (e.g. Smart Search or Agent), not a dead end.
- Error (bookings couldn't be loaded) — plain-language message, not a
  raw error, with a way to retry.

**Edge cases:**
- A booking made moments ago — arriving here via Booking Success →
  My Bookings, or Tatkal's own success state → My Bookings — must
  already appear in the list without requiring a manual refresh; the
  entire point of routing success screens here is continuity, not a
  separate re-fetch the user has to trigger.

**Navigation:** Entry from Home, and from Booking Success (Smart
Search and Agent flows) and from Tatkal's success state within
Booking Attempt → Success/Backup. Selecting a card → Booking Details.
Back → Home.

---

### Booking Details

**Purpose:** Show everything about one specific booking — the full
detail behind a card the user selected on My Bookings.

**Key elements:**
- Full booking information: train, route, journey date, class,
  passenger details, fare, and booking status — status shown in
  plain language via the same Status Translator pattern used
  everywhere else in the app, not a raw code — plus the PNR.
- No actions beyond viewing, consistent with the same non-goals as My
  Bookings (no cancellation, refund, modification, rescheduling, or
  payment management).

**States:**
- Populated (only state — this screen is only reachable by selecting
  an existing booking from My Bookings, so it has no empty state of
  its own).

**Edge cases:** None beyond what My Bookings' own loading/error
states already cover before this screen is reached.

**Navigation:** Entry from My Bookings only. Back → My Bookings.

---

### Tatkal Mode

**Purpose:** Entry point that frames the Tatkal experience as
preparation-first, directly countering the real-world stress of
Tatkal booking.

**Key elements:**
- Overview of what Tatkal Mode does (prepare now, let the app handle
  the rush) — sets expectations before the user commits time to
  preparation.
- Entry into Preparation.

**States:**
- Default (no prior preparation).
- Resuming (an in-progress or completed preparation exists from a
  prior visit) — see Home's edge case above; this screen is where that
  resumed state actually surfaces.

**Edge cases:** None beyond the resume case.

**Navigation:** Entry from Home. Proceed → Preparation (or directly to
Countdown if preparation is already complete from a prior session).
Back → Home.

---

### Preparation

**Purpose:** Let the user do everything possible before Tatkal opens,
so nothing is decided under time pressure.

**Key elements:**
- Journey details, passenger details, preferred class, preferred
  train, and backup train selection — all per the product spec's
  Preparation list.
- Explicit "readiness" indicator so the user knows they're actually
  prepared, not just mid-form.
- Heavy reuse of personalization (saved passengers, preferred class)
  to minimize input, consistent with the product's broader
  personalization goal.

**States:**
- In progress (incomplete).
- Ready (all required preparation complete) — required before
  Countdown can begin.

**Edge cases:**
- User selects a preferred train but no backup — should be prompted
  to pick at least one backup, since backups are what make the
  failure path (Principle 4) work; without one, Tatkal Mode reduces to
  a single-shot gamble, which defeats the point of this capability.

**Navigation:** Entry from Tatkal Mode. Proceed (once ready) →
Countdown. Back → Tatkal Mode (preparation data preserved — a user
should be able to leave and resume without redoing this work, per the
Home/Tatkal Mode resume behavior above).

---

### Countdown

**Purpose:** Simulate the real anticipation/tension of waiting for
Tatkal to open, translated into a calm, prepared feeling rather than
stress — this is where the product's value (preparation reduces
panic) becomes visible.

**Key elements:**
- Countdown to the simulated Tatkal opening time.
- Quick-glance summary of what's about to be attempted (preferred
  train + backups), reassuring the user that everything is already in
  place.

**States:**
- Counting down (default).
- Reached zero → auto-transitions into Booking Attempt without
  requiring user action, since real Tatkal urgency means the app, not
  the user, should be the one racing the clock.

**Edge cases:**
- User navigates away mid-countdown — preparation state must persist
  so they can return without loss (consistent with Principle 4 applied
  even before the booking attempt itself).

**Navigation:** Entry from Preparation. Auto-advances → Booking
Attempt. This screen intentionally omits the standard global shell
navigation chrome (see Shared navigation note) so the countdown reads
as focused and uninterruptible, matching real Tatkal urgency — but a
way to abandon back to Tatkal Mode should still exist, even if
visually minimized.

---

### Booking Attempt → Success / Backup

**Purpose:** Simulate the actual Tatkal booking race, and — critically
— handle failure without ever sending the user back to the start.
This screen embodies Principle 4 more than any other in the app.

**Key elements:**
- Attempt-in-progress indication for the preferred train (brief, since
  real Tatkal is fast-moving, and the simulation should mirror that
  pace rather than dragging it out).
- On success: transitions directly into the shared booking-confirmed
  treatment (same content as Booking Success — PNR, journey,
  passengers, fare, status), scoped to this screen so the Tatkal flow
  doesn't need to hop to a different route for its own terminal state.
- On failure: immediately (not after any delay or dead-end) surfaces
  the backup options prepared in the Preparation step, each with the
  same plain-language status/fare treatment used throughout the app.
- User selects a backup → same booking-attempt treatment for that
  backup → success state.

**States:**
- Attempting (preferred train).
- Success (preferred train confirmed).
- Failed → Backup options shown (preferred train did not confirm).
- Attempting (selected backup).
- Success (backup confirmed).
- All backups exhausted without success — must give the user a clear,
  honest outcome (not a false success, and not a dead end) with a
  reasonable next step (e.g., return to Smart Search).

**Edge cases:**
- Multiple backups fail in sequence — the user should not have to
  restart Preparation to try a backup that wasn't originally selected;
  at minimum, they should be told plainly that all prepared backups
  were exhausted, per the "all backups exhausted" state above.
- User backs out after a failure but before choosing a backup —
  preparation and backup list must remain intact for a return visit.

**Navigation:** Entry from Countdown (auto). Success (preferred or any
backup) → terminal state for the flow, routing to My Bookings or Home
(matching Booking Success's updated behavior above — this success
state renders the same booking-confirmed treatment, so it gets the
same forward path). Failure with backups remaining → stays
on this screen, presenting backups. All backups exhausted → clear
outcome with a path to Smart Search or Home, not back to Preparation
(the Tatkal-specific opportunity has passed; starting over means a
new, non-Tatkal search).

## Accessibility & responsiveness expectations

- All plain-language status explanations, recommendation reasons, and
  agent clarifications must be readable as text (not conveyed by color
  or icon alone) — this matters especially here because the entire
  product's value proposition is *explaining* things clearly, which
  fails if that explanation isn't accessible.
- The app should be usable on a mobile viewport as the primary target
  — Indian railway passengers overwhelmingly book and check status
  from phones — with desktop as a secondary, not primary, layout
  concern.
- Countdown and Booking Attempt states should not rely on time-based
  content disappearing before a user has a chance to read it (no
  auto-dismissing confirmations of booking outcomes).
- Interactive elements (cards, buttons) need sufficient size/spacing
  for touch use, given the mobile-first expectation above.

## Visual/design direction

- **Tone:** Calm and trustworthy over flashy — the product's job is
  to reduce anxiety (railway confusion, Tatkal stress), so the visual
  language should reinforce clarity and confidence rather than
  urgency or gamification, even in Tatkal Mode where the underlying
  situation is inherently time-pressured.
- **Density:** Low-to-moderate information density per screen,
  consistent with Principle 6 ("what does the user need to know RIGHT
  NOW"). Prefer a small number of clearly-labeled, well-explained
  elements over dense tables of raw data — this is a direct
  consequence of Principle 2 as well.
- **Color/type:** Not specified here — exact palette, type scale, and
  design tokens are implementation decisions for `05-technical-spec.md`
  and the component work itself, not product/UX decisions. The one
  constraint carried from this spec is that status/urgency signaling
  must never rely on color alone (see Accessibility above).

## Explicitly not covered here

Per the product spec's boundaries, this document does not define
exact components, folder architecture, the agent's intent-extraction
mechanics (see `03-agent-spec.md`), the shape of mock data (see
`04-data-spec.md`), or technical architecture decisions (see
`05-technical-spec.md`).
