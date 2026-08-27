# 05 — Technical Spec

Status: source of truth for technical architecture.

This document defines how `01-product-spec.md`, `02-ux-spec.md`,
`03-agent-spec.md`, and `04-data-spec.md` (all locked) get built.
Nothing here contradicts them; where a technical decision was
explicitly deferred to this document by an earlier spec (e.g. the
ranking formula), that decision is made here — everything else just
implements what's already locked.

No application code, `package.json`, or mock data was touched to
produce this document.

---

## 1. Current stack (inspected, not assumed)

Read directly from `package.json` and the repository:

- **React 19**, **TypeScript** (`~6.0.2`), **Vite 8** — scaffolded, builds clean.
- **Tailwind CSS v4** (`@tailwindcss/vite` — CSS-first, no `tailwind.config.js`).
- **React Router 7** (`react-router-dom`) — installed, not yet wired into `App.tsx` beyond a placeholder route.
- **tsx** (devDependency) — runs the existing `scripts/generateMockData.ts` / `scripts/validateMockData.ts`.
- No state management library, no i18n library, no test framework, no HTTP client — nothing beyond the above.

This spec does not replace any of this. Every architectural decision
below builds on exactly this stack.

---

## 2. Architecture

```
User
 ↓
React UI               (components/, pages/, layouts/)
 ↓
Application Services    (thin per-page glue: hooks/ + page-level calls into domain/agent)
 ↓
Agent Engine / Domain Services   (agent/ for the conversational flow; domain/ for
 ↓                                 non-conversational orchestration — Smart Search, Tatkal)
Tools                    (tools/ — the 8 tools from 03-agent-spec.md §6)
 ↓
Data Access Layer         (services/ — pure reads over the mock dataset)
 ↓
Deterministic Mock Data    (data/ — locked, untouched by this document)
```

```
Optional, later:

Optional LLM
 ↓
Intent Enhancement
 ↓
Agent Engine
```

**The MVP does not require an LLM.** Every layer above the dotted
line between "Tools" and "Deterministic Mock Data" is pure,
synchronous, and fully deterministic TypeScript. The optional LLM
diagram is a possible future input *into* the Agent Engine's intent
step — it is never on the path between the Agent Engine and Tools,
Data Access, or Mock Data, so nothing downstream of intent extraction
could depend on it even if it were added.

**Why "Agent Engine / Domain Services" is one layer, not two
separate diagram boxes:** `02-ux-spec.md` is explicit that Smart
Search (the structured form) and Agent (the natural-language sibling)
are separate, parallel paths — Smart Search never routes through the
conversational Agent Engine. Both, along with Tatkal Mode's own
attempt-sequencing, are peers at this layer: orchestrators that call
Tools to get something done. The Agent Engine is the one orchestrator
with a real state machine (`03-agent-spec.md` §9); Smart Search's and
Tatkal's orchestration are simpler, effectively stateless functions.
This maps to two folders, `agent/` and `domain/`, both living at this
one conceptual layer.

---

## 3. Folder structure

```
src/
  components/   existing — reusable presentational UI (StatusBadge, RecommendationCard, ...)
  pages/        existing — one file per route (§4)
  layouts/      existing — shared shells (AuthenticatedLayout: header, nav, language selector)
  services/     existing — Data Access Layer (§9)
  types/        existing — domain.ts (locked, unchanged)
  utils/        existing — small pure helpers (date parsing, formatting, simulated-delay)
  data/         existing — locked mock dataset, untouched by this spec

  tools/        NEW — the 8 tools from 03-agent-spec.md §6 (§11)
  domain/       NEW — non-conversational orchestration: Smart Search, Tatkal attempt sequencing (§12, §16)
  agent/        NEW — the conversational Agent Engine specifically (§10)
  i18n/         NEW — translation dictionaries + language state (§8)
  hooks/        NEW — a small number of React hooks bridging state to components (§7)
```

**Responsibility of each new directory, and why it's justified rather
than folded into something existing:**

- **`tools/`** — kept separate from `services/` because the agent
  spec draws a hard line: "the agent MUST NOT directly access the
  underlying data structures. It must use tools." `services/` stays
  intentionally dumb (pure reads/writes over the mock dataset);
  `tools/` is where the actual business logic the agent spec
  describes lives (ranking math, status-text interpolation, PNR
  generation, attempt-outcome resolution). Merging them would blur a
  boundary the locked agent spec explicitly cares about.
- **`domain/`** — Smart Search's flow (`searchTrains` → `rankOptions`
  → categorized results) and Tatkal's attempt-sequencing (preferred,
  then backups in order) both call multiple `tools/` in a fixed
  sequence, but neither has a conversational state machine — putting
  them in `agent/` would misrepresent them as agent behavior, which
  `02-ux-spec.md` explicitly says they are not.
- **`agent/`** — the one orchestrator with real state
  (`AgentSession`), matching `03-agent-spec.md` §9 exactly. See §10.
- **`i18n/`** — requested directly by the multilingual requirement;
  centralizes all UI strings instead of scattering them through
  components (§8).
- **`hooks/`** — a small, deliberately short list (`useAuth`,
  `useLanguage`, `useAgentSession`, `useTatkalPreparation`,
  `useBookings`) that bridge cross-cutting state (auth, language) or
  a specific flow's state to components, avoiding prop-drilling and
  duplicated storage-read/write boilerplate across otherwise-unrelated
  pages. Nothing beyond what's actually needed by more than one page
  gets a hook.

**Deliberately not introduced:** a `store/` or Redux/Zustand-style
state directory (§7 — Context + `useState`/`useReducer` is enough), a
`context/` directory separate from `hooks/` (providers are colocated
with their hook in the same file — one extra folder wasn't
justified), an `api/` directory (there is no real API), a `constants/`
catch-all (constants live next to what uses them — `DEMO_DATES` is
already in `data/demoConfig.ts`, lexicons live in `agent/lexicon/`).

---

## 4. Routing

`02-ux-spec.md` defines 17 screens. Mapped to React Router routes:

| Route | Screen(s) | Notes |
|---|---|---|
| `/login` | Login | Public. Root of the app when unauthenticated. |
| `/` | Home | Protected. |
| `/search` | Smart Search | Protected. Form only. |
| `/results` | Results | Protected. `SearchRequest` encoded as URL query params (`?source=MAS&destination=SC&date=...&passengers=...&class=...`). |
| `/train/:trainNumber` | Train Details | Protected. `date`/`class`/`quota` as query params — together with the path param, fully identifies one `TrainAvailability`. |
| `/checkout/passengers` | Passenger Review | Protected. Reads the in-progress booking draft (§7). |
| `/booking/success/:bookingId` | Booking Success | Protected. Reads one `Booking` by id — real, refresh-safe, terminal. |
| `/agent` | **Agent + Recommendation + Approval** | Protected. One route, three `AgentSessionStatus`-driven views — see rationale below. |
| `/status` | Understand My Status | Protected. Standalone form + result; optional `?code=&position=` for contextual deep-links. |
| `/tatkal` | Tatkal Mode | Protected. Entry/overview; resumes an existing `TatkalPreparation` if one exists (§7, §16). |
| `/tatkal/prepare` | Preparation | Protected. |
| `/tatkal/countdown` | Countdown | Protected. |
| `/tatkal/attempt` | Booking Attempt → Success/Backup | Protected. |
| `/bookings` | My Bookings | Protected. |
| `/bookings/:bookingId` | Booking Details | Protected. |

**14 routes cover 17 screens.** The only merge: Agent, Recommendation,
and Approval collapse into one `/agent` route, rendering a different
sub-view based on `AgentSession.status`, rather than three separate
routes. Reasoning:

1. `AgentSession` (`04-data-spec.md`) is already one entity with one
   `status` field moving through `COLLECTING` →
   `NEEDS_CLARIFICATION` → `SEARCHING` → `RECOMMENDED` →
   `AWAITING_APPROVAL` → `BOOKED`/`DECLINED`. Three separate routes
   would mean passing that whole session through router state or
   re-fetching it on every route change, for no benefit — it's one
   continuous interaction, not three destinations.
2. `02-ux-spec.md`'s own Principle 5 ("AI should disappear into the
   experience... not feel like separate chat screens") argues against
   fragmenting one conversation into multiple navigations.

Everything else gets a real route because it's independently
resumable/refresh-safe/bookmarkable in a way that matters here:
Tatkal's screens specifically because `TatkalPreparation` must survive
a refresh or a return visit (`02-ux-spec.md`'s Home/Tatkal Mode resume
behavior requires this), and My Bookings/Booking Details/Booking
Success because they're natural "share or return to this specific
thing" destinations.

**Protected routes:** every route except `/login` redirects to
`/login` if no session exists (§5). A single `<ProtectedRoute>`
wrapper in `layouts/` handles this, rather than repeating the check
per page.

---

## 5. Authentication

Fully mocked, entirely local, matching `01-product-spec.md`'s Login
section exactly (mocked, no real credentials/OTP/Aadhaar).

- **Login UI:** presents the existing 3 demo users (`src/data/users.ts`
  — Aravind, Suresh, Karthik) as selectable options, plus a
  cosmetic password-style field for visual realism per
  `02-ux-spec.md`'s "minimal credential-style input (mocked)" —
  never actually validated against anything. Selecting a user and
  submitting is the entire "authentication."
- **Session:** `{ userId }` stored in `sessionStorage` under a fixed
  key. Chosen over `localStorage` because the product spec don't
  require surviving a closed tab/new day — only "refresh persistence
  if practical," which `sessionStorage` satisfies while staying
  honestly scoped to "this demo session," consistent with how
  language persistence is already reasoned about in `04-data-spec.md`.
- **`useAuth()` hook + `AuthContext`** (colocated in `hooks/useAuth.tsx`):
  hydrates from `sessionStorage` on mount, exposes `login(userId)`,
  `logout()`, and `currentUser`. `logout()` clears the session and
  redirects to `/login`.
- **Protected routes:** `<ProtectedRoute>` in `layouts/` checks
  `useAuth().currentUser` and redirects to `/login` if absent.
- **Logout:** a control in the persistent header (part of the Global
  shell, per `02-ux-spec.md`).

No OAuth, no Firebase/Supabase Auth, no real credential validation —
by construction, there is no code path that could reach a real
identity provider.

---

## 6. State management

**No Redux/Zustand/Jotai.** The app's total state is small and mostly
scoped to one flow at a time; React state, Context, URL params, and
Web Storage cover every case in the table below without introducing a
new state-management concept.

**General policy** (applied consistently, not ad hoc per row):

- **URL state** — anything that defines *what page you're looking at*
  and would reasonably be shareable, bookmarkable, or refresh-safe
  (a search, a specific train, a specific booking).
- **Local/context React state** — short-lived, in-progress interaction
  within one flow (a form being filled, an agent conversation in
  progress).
- **`sessionStorage`** — small, app-wide state that should survive a
  refresh but is honestly scoped to "this session" (auth, language).
- **`localStorage`** — anything that represents a durable-within-the-
  prototype *outcome* that other, later screens need to find again,
  possibly after navigating away entirely (bookings, Tatkal
  preparation/attempts).

| State | Lives in | Why |
|---|---|---|
| auth | `sessionStorage` + `AuthContext`/`useAuth` | App-wide, rarely changes, needs to survive a refresh. |
| language | `sessionStorage` + `LanguageContext`/`useLanguage` | Same category as auth; matches `04-data-spec.md`'s explicit "session persistence, not domain data" reasoning. |
| search request | URL query params on `/results` | Shareable, refresh-safe, and it's the thing that defines the page. |
| selected train | URL path/query params on `/train/:trainNumber` | Same reasoning; carried forward into the booking draft when the user proceeds. |
| passengers (being entered) | Local/context state scoped to the checkout sub-flow, mirrored to a `sessionStorage` "booking draft" key | Short-lived, but resilient to an accidental refresh mid-entry — a small robustness win at near-zero cost. |
| agent session | Local/`useReducer` state within `/agent`, **not** persisted to storage | Deliberately simple: a conversation is meant to feel lightweight (Principle 5); an interrupted conversation restarting is an acceptable trade-off for a hackathon demo focused on the happy path. Flagged as an explicit, revisitable simplification, not an oversight — see §22. |
| recommendation (Smart Search) | **Not persisted at all** — recomputed synchronously from the URL-encoded `SearchRequest` on every render of `/results` via `domain/smartSearch.ts` | It's a pure function of `SearchRequest` + static mock data; persisting it separately would just be a cache with a staleness problem to manage for no benefit. |
| recommendation (Agent) | Embedded in the in-memory `AgentSession`, per `04-data-spec.md`'s own shape | No separate state needed — the entity already carries it. |
| approval | A local boolean/gate on the Approval sub-view, **plus** the `ApprovalToken` mechanism (§14) which is the real enforcement point | The UI gate alone is not the safety mechanism — see §14. |
| booking (once created) | `localStorage`, merged with the static seed bookings in `services/bookings.ts` | Needs to be found again later by My Bookings, potentially after full navigation away. Task explicitly permits `localStorage` here. |
| Tatkal preparation | `localStorage`, merged with any static seed preparation, keyed per user | Must be resumable across visits (`02-ux-spec.md`'s Home/Tatkal Mode resume requirement) — this is the one piece of "in-progress, not yet booked" state that genuinely needs to survive leaving the app entirely. |
| Tatkal attempt(s) | `localStorage`, appended as attempts happen, read on mount of `/tatkal/attempt` | Reconstructing "which attempts already happened" on return is what makes the "never restart the journey" guarantee (Product Principle 4) a real technical property, not just a UI promise. |

---

## 7. Internationalization

```
src/i18n/
  en.ts
  hi.ts
  te.ts
  index.ts
```

- **`en.ts`** is the canonical key set. `SupportedLanguage = 'en' |
  'hi' | 'te'`. `hi.ts`/`te.ts` are typed as `Partial<typeof en>` —
  allowed to be incomplete, since incompleteness is handled by design
  (below), not prevented at compile time (a hard requirement to have
  every key translated before the app can build would be a poor
  trade for a hackathon timeline).
- **`index.ts`** exports `translations: Record<SupportedLanguage,
  Partial<Translations>>` and `t(key, lang, vars?)`:
  - looks up `key` in `translations[lang]`;
  - **falls back to `translations.en[key]` if missing** — never
    throws, never renders `undefined`, a raw key, or blank text (the
    task's explicit requirement);
  - supports simple `{varName}` interpolation, needed for
    `RailwayStatusDefinition.plainExplanation`'s `{position}`
    placeholder (`04-data-spec.md`).
- **`LanguageContext`/`useLanguage()`** (colocated in
  `hooks/useLanguage.tsx`): holds the current `SupportedLanguage`
  (`sessionStorage`-backed, §6), exposes `setLanguage()` and a `t()`
  bound to the current language. This is the language selector's
  entire implementation surface — no routing, no reload, matching
  `02-ux-spec.md`'s Cross-cutting Language Selection exactly.
- **Key naming convention:** namespaced by screen/feature
  (`login.title`, `home.searchCta`, `agent.approvalPrompt`,
  `results.emptyState`, ...) so the dictionary stays navigable as it
  grows. Exact keys are an implementation detail, not enumerated here.
- **What never goes through `t()`:** per `01-product-spec.md`'s
  Multilingual Experience section — status codes, PNRs, train
  numbers, train names, station names, fares, dates. These render as
  raw domain values, always, in every language.

**Status explanations specifically** (`RailwayStatusDefinition`'s
`plainExplanation`/`suggestedConsideration`) need a parallel
translation, keyed by `StatusCode` rather than a generic UI key
(`status.GNWL.explanation`, `status.GNWL.suggestion`, ...) in each
language file. This resolves a subtlety cleanly: `tools/explainStatus.ts`
(§11) returns the **English** canonical text — matching
`03-agent-spec.md`'s Tool 3 contract exactly, and matching
`04-data-spec.md`'s statement that `RailwayStatusDefinition` "remain[s]
the single English-language canonical content." The *display* layer
(a small `useStatusExplanation(code, position)` helper, or inline in
`components/StatusBadge`) then looks up `t('status.' + code +
'.explanation', lang, { position })` for the *current* language —
and if that key doesn't exist in `hi`/`te`, the fallback rule above
already resolves to the tool's own English string. **The tool's output
literally doubles as the English fallback value** — no special-casing
needed, and the tool itself never returns translated data, matching
`03-agent-spec.md` §22's hard rule.

---

## 8. Data access layer

`src/services/` — pure, synchronous, deterministic functions over
`src/data/*.ts`. No network calls; no dependency on anything outside
the mock dataset.

| File | Exports (representative) |
|---|---|
| `services/users.ts` | `getUser(userId)`, `getUsers()` |
| `services/passengers.ts` | `getPassengers(userId)`, `getPassenger(id)` |
| `services/stations.ts` | `getStations()`, `getStation(code)` |
| `services/trains.ts` | `getTrain(trainNumber)`, `getTrains()` |
| `services/availability.ts` | `getAvailability(trainNumber, date, class, quota)`, `findAvailability(criteria)` |
| `services/statusDefinitions.ts` | `getStatusDefinition(code)` |
| `services/bookings.ts` | `getBookings(userId)` (merges seed + `localStorage`), `getBooking(id)`, `createBookingRecord(booking)` (the actual `localStorage` write) |
| `services/tatkal.ts` | `getTatkalPreparation(userId)`, `saveTatkalPreparation(prep)`, `getTatkalAttempts(preparationId)`, `appendTatkalAttempt(attempt)` |

**Naming note:** `services/availability.ts` exports `findAvailability`,
not `searchTrains` — the latter name is reserved for the *agent tool*
(`tools/searchTrains.ts`, §11), which calls `findAvailability`
underneath plus does additional shaping. Two same-named functions at
different layers would be a real source of confusion; this avoids it.

**Synchronous by default; simulated latency is opt-in.** Every
function above is synchronous — there's no real I/O to await. Where a
loading state is *wanted* for pacing (§19), a small
`utils/withSimulatedDelay(fn, ms)` wrapper turns a synchronous call
into a `Promise` that resolves after a short delay — used only at the
call site that wants a loading state, not baked into `services/`
itself.

**PNR generation is deterministic, not random.** `tools/createBooking.ts`
(§11) generates PNRs from an incrementing counter derived from the
current booking count, zero-padded to 10 digits with a fixed prefix
pattern — never `Math.random()` or `crypto.getRandomValues()`. Given
the same sequence of user actions, the same PNRs come out every time.

---

## 9. Agent architecture

Directly implements `03-agent-spec.md`'s architecture (§2, §9).

```
src/agent/
  engine.ts       pure functions operating on AgentSession
  intentParser.ts parseIntent(text, lang) → AgentIntent  (Layer 1, deterministic)
  lexicon/
    en.ts
    hi.ts
    te.ts
```

**Agent Engine** (`agent/engine.ts`) — a set of pure functions, each
taking an `AgentSession` and returning a **new** `AgentSession`
(immutable update), suitable for a single `useReducer` in the `/agent`
page:

- `createSession(userId): AgentSession`
- `submitMessage(session, text): AgentSession` — runs
  `intentParser.parseIntent`, updates `intent`/`missingRequiredFields`,
  and — once required fields are present — synchronously calls
  `domain/smartSearch`-equivalent logic via `tools.searchTrains` +
  `tools.rankOptions` to move to `RECOMMENDED`.
- `requestAlternatives(session): AgentSession` — calls `tools.getAlternatives`.
- `approve(session): AgentSession` — the **only** function permitted
  to obtain an `ApprovalToken` and call `tools.attemptBooking` +
  `tools.createBooking` (§14).
- `decline(session): AgentSession`.

No "effects" indirection layer, no saga/middleware pattern — tool
calls happen directly inside these functions, since everything is
synchronous and local. This is a deliberate rejection of
over-engineering: a dispatcher/queue would solve a remote-call
ordering problem this prototype doesn't have.

**Intent Parser** (`agent/intentParser.ts`) — pattern/keyword matching
against `agent/lexicon/{en,hi,te}.ts`, per `03-agent-spec.md` §18/§22's
Layer 1 design. Station names are recognized identically regardless
of `lang` (they're never translated); date words, class synonyms,
confirmation/price/speed preference words, and Tatkal-intent keywords
are looked up per-language. See §17 for the date-resolution mechanics
specifically.

**Tool Registry** — `tools/index.ts` exports one object,
`{ searchTrains, getAvailability, explainStatus, rankOptions,
getAlternatives, prepareTatkal, attemptBooking, createBooking }`.
This is a plain, statically-typed export, not a dynamic
dispatcher/JSON-schema-validated registry — that machinery solves an
LLM-function-calling problem (validating untrusted, dynamically-typed
tool-call arguments from a model) this deterministic MVP doesn't have.
The registry object exists for two real reasons: a single canonical
import surface, and a natural seam if Layer 2 (optional LLM function
calling) is ever added later.

**Agent Response** — no separate "AgentResponse" type is introduced.
`AgentSession` already carries everything needed
(`intent`/`status`/`clarificationPrompt`/`recommendation`) per
`04-data-spec.md`; the `/agent` page renders a different view per
`status` (mirroring `03-agent-spec.md` §9's table) and runs any needed
`t()` lookups at render time.

**Tatkal via the Agent:** when `intentParser` classifies a request as
Tatkal-intent (`03-agent-spec.md` §3/§4), `agent/engine.ts` calls
`tools.prepareTatkal` and the resulting `TatkalPreparation` is then
handled by the same `domain/tatkalFlow.ts` (§12) that Tatkal Mode's
direct entry point uses — no separate Tatkal implementation inside
`agent/`.

---

## 10. Tools (technical contracts)

`src/tools/` — one file per tool, matching `03-agent-spec.md` §6
exactly. Signatures reference `src/types/domain.ts` types directly.

| Tool | Signature (conceptual) | Calls | Notes |
|---|---|---|---|
| `searchTrains` | `(request: SearchRequest) => TrainAvailability[]` | `services/availability.findAvailability` | Read-only. |
| `getAvailability` | `(trainNumber, journeyDate, travelClass, quota) => TrainAvailability \| undefined` | `services/availability.getAvailability` | Read-only, thin passthrough. |
| `explainStatus` | `(code: StatusCode, position?: number) => { definition: RailwayStatusDefinition; interpolatedExplanation: string }` | `services/statusDefinitions.getStatusDefinition` | Interpolates `{position}`; returns English canonical text (§7). |
| `rankOptions` | `(candidates: TrainAvailability[], preferences) => RecommendationOption[]` | `services/trains.getTrain` (for duration) | Uses only existing `fareAmount`/`durationMinutes`/`confirmationLikelihood` — see §11 for the default formula. |
| `getAlternatives` | `(intent: AgentIntent \| TatkalPreparation, excludeTrainNumber: string) => RecommendationOption[]` | `searchTrains` + `rankOptions` internally | Read-only. |
| `prepareTatkal` | `(input) => TatkalPreparation` | `services/tatkal.saveTatkalPreparation` | Validates non-empty backups (mirrors `04-data-spec.md`'s rule). |
| `attemptBooking` | `(trainNumber, journeyDate, travelClass, quota, passengerIds) => { outcome: 'CNF' \| 'RAC' \| 'REGRET'; availability: TrainAvailability }` | `services/availability.getAvailability` | Outcome is read straight off `.status` — never invented, per `03-agent-spec.md` Tool 7. |
| `createBooking` | `(input, token: ApprovalToken) => Booking` | `services/bookings.createBookingRecord` | Requires a valid `ApprovalToken` — see §14. The **only** function that writes a `Booking`. |

All eight are synchronous, pure aside from `prepareTatkal`/
`attemptBooking`(none)/`createBooking`'s calls into `services/`
(which are the only places any write happens). No tool imports
anything from `pages/`, `components/`, or `agent/` — the dependency
arrow only ever points downward, matching §2's layering.

---

## 11. Smart Search

```
src/domain/smartSearch.ts

runSearch(request: SearchRequest): SearchResult
  = tools.searchTrains(request)
      → tools.rankOptions(candidates, request-derived preferences)
      → { request, recommendations, moreOptions }
```

Pure and deterministic — called directly by the `/results` page on
every render (no persisted "recommendation" state, per §6).

**Default ranking formula (recommended, not locked):** both
`01-product-spec.md` and `03-agent-spec.md` explicitly defer the
ranking algorithm to this document. Proposed default:

- Normalize `fareAmount`, `Train.durationMinutes`, and
  `confirmationLikelihood` to comparable 0–1 scales across the
  candidate set (min–max normalization within the current search's
  results only — never across the whole dataset).
- `BEST_OVERALL` score = weighted sum, default weights `0.4 ×
  confirmation + 0.3 × price + 0.3 × speed` (all normalized so higher
  is better), skewed by `UserPreferences.travelPriority` per
  `03-agent-spec.md` §16 (e.g. `CONFIRMATION` priority raises the
  confirmation weight and lowers the other two proportionally).
- `FASTEST` = minimum `durationMinutes` among CNF/RAC candidates
  (falls back to the overall minimum if none are confirmed, per the
  "Partial" state rule below).
- `CHEAPEST` = minimum `fareAmount`, same fallback rule.
- `BEST_CONFIRMATION_CHANCE` = maximum `confirmationLikelihood`.
- If **no** candidate has `status: 'CNF'`, every category still
  returns its best honest option rather than omitting itself — this
  directly implements `02-ux-spec.md`'s Results "Partial" state and
  `04-data-spec.md`'s validation rule ("an honest worst-available
  option beats hiding the category").

**Weight values are the explicitly open part** (§22) — the formula's
existence and shape is the decision made here; exact tuning happens
during implementation/demo rehearsal against the real generated data.

Uses **only** the existing mock `confirmationLikelihood` values —
never claimed as real railway probabilities, per the task's explicit
instruction and `04-data-spec.md`'s own "prototype simplification"
framing of that field.

---

## 12. Status Translator

```
status code + position
  → tools.explainStatus(code, position)
  → RailwayStatusDefinition (English canonical, per §7/§10)
  → t('status.' + code + '.explanation', lang, { position })  [display layer]
  → localized explanation + suggested action
```

Works with zero LLM involvement — a lookup, an interpolation, and a
translation-dictionary lookup with English fallback. The status code
itself is never translated (`GNWL` stays `GNWL` in every language).

Shared by two call sites: the standalone `/status` route, and a small
`components/StatusBadge.tsx` used inline anywhere a status appears
(Results, Train Details, Booking Attempt) — one implementation, two
places it's rendered, matching `02-ux-spec.md`'s explicit "status
translation is a cross-cutting pattern, not just a screen."

---

## 13. Booking architecture

All three producing flows converge on the same `tools.createBooking`
call and the same `Booking` entity (`04-data-spec.md`), differing only
in `source`:

```
Smart Search:
  Train Details → Passenger Review → Approval (gate)
    → tools.attemptBooking → tools.createBooking(input, token)
    → Booking (source: 'SMART_SEARCH') → Booking Success

Agent:
  Agent (intent) → Recommendation → Approval (gate)
    → tools.attemptBooking → tools.createBooking(input, token)
    → Booking (source: 'AGENT') → Booking Success

Tatkal:
  Preparation (isReady = advance approval, §14) → Countdown
    → domain/tatkalFlow.attemptNext (§16)
        → tools.attemptBooking → tools.createBooking(input, token) on success
    → Booking (source: 'TATKAL') → Booking Success (Tatkal's own success state)
```

Every `Booking` produced this way: has a deterministic mock PNR
(§8), contains the correct passengers (`BookingPassenger[]`, snapshot
per `04-data-spec.md`), is written via `services/bookings.createBookingRecord`
(`localStorage`, §6), and is immediately visible in My Bookings — the
same `getBookings()` call that renders My Bookings is what Booking
Success's "go to My Bookings" link leads into, so there's no separate
refresh/sync step required for the booking to "show up."

No real payment anywhere — there is no payment entity, no payment
screen, and no code path that could process one.

---

## 14. Approval safety

The product's hardest requirement: "the agent must never silently
book without explicit user confirmation" — and per this task, that
requirement "must exist in the service/domain layer, not only as a UI
button."

**Mechanism: an opaque, branded `ApprovalToken`.**

```ts
// agent/approval.ts (or domain/approval.ts — one small module)
interface ApprovalToken {
  readonly __brand: 'ApprovalToken'
  readonly scopeId: string        // a Booking-flow session id, or a TatkalPreparation id
  readonly issuedAt: ISODateTime
}

function issueApprovalToken(scopeId: string): ApprovalToken { ... }
```

`ApprovalToken` is only constructible by `issueApprovalToken`, which
lives in this one module and is called **only** from the exact places
that represent genuine, already-defined user confirmation:

- `agent/engine.ts`'s `approve()` function — called only in response
  to the UI's explicit "Confirm Booking" action (`03-agent-spec.md`
  §8) on the Approval screen.
- The moment `TatkalPreparation.isReady` is set to `true` on the
  Preparation screen — this **is** the advance approval
  `03-agent-spec.md` §8 explicitly defines for Tatkal (a bounded,
  user-chosen option set, approved once, not re-prompted per backup).

`tools.createBooking(input, token: ApprovalToken)` **requires** a
token as a parameter — TypeScript cannot construct one from outside
`agent/approval.ts` without `as any` (the branded field can't be
faked accidentally). This is enforcement at the type level, above the
UI, exactly matching the task's ask — not a runtime `if (!approved)`
check that a future code change could accidentally skip, but a
function signature that makes calling `createBooking` without going
through an approval path a compile error.

**Scoping matches the two consent models exactly** (§8 of the agent
spec): for Smart Search/Agent, one token is issued per approved
booking, scoped to that one option. For Tatkal, one token is issued
per `TatkalPreparation` at the moment it's marked ready, and
`domain/tatkalFlow.ts` (§16) reuses that **same** token for every
attempt within that preparation's preferred-then-backups sequence —
never a fresh per-backup prompt, never a token that lets attempts
outside the user's own prepared set through.

---

## 15. Tatkal architecture

```
src/domain/tatkalFlow.ts

attemptNext(preparation, priorAttempts, token: ApprovalToken)
  → determines next train to try (preferred if priorAttempts is
    empty, else the next backup in `backupTrainNumbers` order)
  → tools.attemptBooking(...)
  → on success: tools.createBooking(..., token) → { attempt, booking }
  → on failure: { attempt }  (outcome: 'REGRET', no booking)
  → services/tatkal.appendTatkalAttempt(attempt)  [persists to localStorage]
```

`/tatkal/attempt` calls this once per attempt trigger: automatically
once, when the countdown reaches zero (preferred train), and again
each time the user selects the next backup after a failure. On
mount, it first reads `services/tatkal.getTatkalAttempts(preparationId)`
— if attempts already exist (the user navigated away and came back),
it resumes exactly where it left off rather than restarting, which is
what makes Product Principle 4 an enforced technical property rather
than only a UI convention.

**Countdown, and why "don't wait for real time" doesn't mean
"disappear":** `TatkalPreparation.tatkalOpensAt` (an `ISODateTime`
anchored to `DEMO_DATES.TODAY`) is *narrative* data — it represents
"when Tatkal opens" for realism within the mock dataset, not a
literal wall-clock deadline the UI waits on. The Countdown screen
itself runs a short **simulated** on-screen timer (a fixed few
seconds, via `setInterval`) independent of the real gap between "now"
and `tatkalOpensAt` — satisfying the task's explicit requirement that
a judge never waits for a real opening time, while still visibly
counting down (the UX point of the screen). The countdown's *duration*
is a pacing/presentation detail (§19); the *outcome* once it reaches
zero is fully deterministic regardless of how many seconds the
animation took.

Nothing about Tatkal depends on `Date.now()` at any point — every
date-bearing value traces back to `DEMO_DATES.TODAY` /
`src/data/demoConfig.ts`'s `addDays`, which is already locked and
unmodified by this document.

---

## 16. My Bookings

```
services/bookings.ts

getBookings(userId): Booking[]
  = [...seed bookings from data/bookings.ts, ...runtime bookings from localStorage]
      .filter(b => b.userId === userId)
      .sort(by bookedAt, most recent first)

getBooking(bookingId): Booking | undefined
  = checks both sources
```

No pagination, no complexity beyond this — booking counts stay tiny
by design (`04-data-spec.md`'s 2–4 seed target, plus whatever a demo
run creates). My Bookings and Booking Details are both thin
presentational reads over this one function; neither has any
write-path of its own (consistent with `02-ux-spec.md`'s explicit
non-goals: no cancel/refund/modify/reschedule anywhere in this app).

---

## 17. Date handling

```
utils/dateParsing.ts

parseRelativeDate(text: string, lang: SupportedLanguage,
                   referenceDate: ISODate = DEMO_DATES.TODAY): ISODate | undefined
```

Reuses the **existing, locked** `addDays()` from
`src/data/demoConfig.ts` — this document does not reinvent date math.
Keyword-matches against `agent/lexicon/{lang}.ts`'s date-word table:

- "today" / "आज" / "ఈరోజు" → `referenceDate`
- "tomorrow" / "कल" / "రేపు" → `addDays(referenceDate, 1)`
- "tonight" → `referenceDate`, with `timePreference: 'NIGHT'` (part of
  the bounded MVP phrase set — a deliberately narrow, not
  general-purpose, mapping)
- A weekday name ("Friday") → the next occurrence of that weekday
  counting forward from `referenceDate`. Since `referenceDate`
  defaults to the fixed `DEMO_DATES.TODAY`, its day-of-week is itself
  a fixed, computed-once constant — the offset added is deterministic,
  never derived from the real clock.

Never calls `new Date()` for "now" or `Date.now()` anywhere in this
path — every reference point traces back to `DEMO_DATES.TODAY`.

---

## 18. Errors

Every situation below surfaces a plain-language message (through
`t()`, with the English-fallback guarantee from §7) and never a raw
technical error, stack trace, or console-only failure shown to the
user.

| Situation | Handling |
|---|---|
| Invalid login | N/A — login is mocked and cannot fail in a way that needs handling (picking a demo user always succeeds). |
| Invalid search (same source/destination, missing date) | Inline validation on Smart Search, per `02-ux-spec.md`'s existing edge cases — caught before submission. |
| No results | Results' existing "Empty" state (`02-ux-spec.md`). |
| Invalid station | Agent: a clarifying question (§10, matches `03-agent-spec.md` §19). Smart Search: caught by the station picker only ever offering real stations. |
| Missing passengers | Passenger Review validation, per its existing edge case. |
| Tool errors | Surfaced as a generic honest message; the calling page/agent state does **not** advance (mirrors `03-agent-spec.md` §9's `ERROR` note — no fabricated progress). |
| Booking errors (Tatkal only, per §13's scoping) | The existing `REGRET`/backup flow **is** the handling — not a separate error path. |
| Tatkal failure, all backups exhausted | The Booking Attempt screen's existing terminal state (`02-ux-spec.md`). |
| Unsupported agent request | A clarifying question if fixable; an honest "I can't help with that" if genuinely out of scope (e.g. cancellation) — never a fabricated attempt. |
| Missing translation | English fallback (§7) — never a raw key or blank text. |

---

## 19. Loading states

Lightweight, cosmetic-only, via `utils/withSimulatedDelay` (§8) —
150–400ms, only at the specific points `02-ux-spec.md` already defines
a loading state for: Results (searching), Agent's `SEARCHING` status
("Understanding your request..." / "Comparing trains..."), My
Bookings (fetching), and Booking Attempt ("Attempting to secure your
ticket..."). The outcome is never affected by the delay — purely
pacing, so the app doesn't feel instant-to-the-point-of-unbelievable
on a screen meant to communicate "we're doing work."

---

## 20. Responsive design

Mobile-first, per `02-ux-spec.md`'s explicit priority: Tailwind's
unprefixed utility classes target mobile by default, `sm:`/`md:`
prefixes progressively enhance for wider viewports. Structural
patterns (not exact visual design, which stays out of scope per both
locked specs):

- Stacked, single-column cards on mobile (Results, My Bookings); may
  grid on wider viewports.
- Primary actions bottom-anchored/thumb-reachable on mobile forms
  (Smart Search, Passenger Review, Approval).
- The persistent header (global shell + language selector) collapses
  to compact form on narrow viewports — icon + current language label
  (`🌐 EN ▾`), full names in the open state.
- Exact breakpoints, spacing, and typography are implementation
  decisions, not fixed here.

---

## 21. Accessibility

Minimum requirements, all achievable with native HTML/Tailwind — no
accessibility library needed:

- Semantic elements (`<nav>`, `<main>`, real `<button>` — never a
  `<div onClick>`).
- Every interactive element keyboard-reachable, with visible focus
  states (Tailwind's `focus-visible:` utilities).
- Every form input paired with a real `<label>`.
- Status information never conveyed by color alone (already a
  `02-ux-spec.md` requirement — restated here as the concrete
  mechanism: icon/text alongside color, always).
- The language selector is a real `<button>`/`<select>`, with an
  `aria-label` describing its purpose and the document's `lang`
  attribute updated on switch.
- `aria-live="polite"` regions around async status text ("Attempting
  to secure your ticket...") so screen readers announce outcome
  changes as they happen.

---

## 22. Dependencies

**Zero new dependencies proposed for the MVP.** Each candidate
considered, and why it's rejected:

| Candidate | Verdict | Why native/existing is sufficient |
|---|---|---|
| i18n library (`i18next`, `react-i18next`) | Rejected | A static dictionary + one `t()` function covers 3 fixed languages with a bounded, known key set. Pluralization/ICU-message/lazy-loading — the features a full framework adds — solve problems this prototype doesn't have. |
| State management (`redux`, `zustand`, `jotai`) | Rejected | Total state is small and scoped (§6); Context + `useState`/`useReducer` covers every row in that table without a new concept. |
| Form library (`react-hook-form`) | Rejected, revisitable | Forms here (search, passenger entry, login) have few fields; native controlled inputs + small validators in `utils/` suffice at this scale. Worth reconsidering only if passenger forms grow materially more complex (§23). |
| Date library (`date-fns`, `dayjs`) | Rejected | The only date math needed — add/subtract whole days from a fixed anchor, format `YYYY-MM-DD`/`HH:mm` — is already implemented in the locked `demoConfig.ts` in ~10 lines of native, UTC-anchored `Date` usage. |
| UUID library | Rejected | `crypto.randomUUID()` — a native browser API, not a package — covers unique ids for `localStorage` entries (bookings, attempts) where needed. |

`tsx` (already installed, dev-only) needs no change — it only runs
the data-generation/validation scripts, not application code.

---

## 23. Testing / validation

No test framework (`vitest`, `jest`) added as a new dependency — the
task is explicit about not building an enormous suite, and the
existing `scripts/validateMockData.ts` pattern already demonstrates a
lightweight, dependency-free validation approach that fits this
project's style.

**Planned validation, for the implementation phase** (this document
specifies the strategy; it does not add these scripts or npm entries
now, per the instruction not to modify `package.json`):

- `tsc -b` and `vite build` — already wired, already passing.
- `npm run validate:data` — already wired, already passing.
- A new `scripts/validateDomainLogic.ts`, run the same way as
  `validateMockData.ts` (via `tsx`), exercising the pure functions in
  `tools/`, `domain/`, and `agent/` directly — no browser, no React
  needed, since they're deliberately pure and UI-independent (§9–§16).
  It should assert, using the **existing** `DemoScenario` fixtures
  already in `src/data/scenarios.ts` (no new fixtures needed):
  - `domain/smartSearch.runSearch` on `demo_best_overall`'s
    `searchInput` produces the expected `expectedRecommendations`.
  - `domain/smartSearch.runSearch` on `demo_cheapest_tradeoff`
    surfaces the honest trade-off.
  - `agent/intentParser.parseIntent` on `demo_agent_hyderabad`'s
    `agentInputText` produces `expectedAgentIntent`.
  - `tools.explainStatus` on the GNWL/RAC demo trains produces text
    matching the expected position/status.
  - `tools.createBooking` cannot be called without a valid
    `ApprovalToken` (a compile-time check, effectively self-validating
    — but a runtime assertion that the type constraint exists is
    still worth having).
  - `domain/tatkalFlow.attemptNext` on `demo_tatkal_failure_backup`
    produces the expected `REGRET` → `CNF` sequence.
- This becomes `npm run validate:domain` once actually added during
  implementation.

---

## 24. Offline / demo reliability

A direct consequence of everything above, not a separate mechanism:
no network calls exist anywhere in the architecture (mock data is
static and bundled; `localStorage`/`sessionStorage` are local; no LLM
is required). **After one `npm install`, the entire demo runs with
network fully disabled.** This is testable literally, not just
claimed — a good thing to verify in airplane mode before demo day.

One forward-looking constraint for implementation: any font/icon
asset should be bundled, not loaded from a CDN `<link>` tag (e.g.
Google Fonts) — a CDN dependency would silently violate this guarantee
even though nothing in this spec currently introduces one.

---

## 25. Deployment

Static deployment — `vite build` produces a plain SPA bundle in
`dist/`. Any static host works (Netlify, Vercel, GitHub Pages,
Cloudflare Pages, or simply `npx serve dist` locally for a live demo
without depending on external hosting at all). **Zero environment
variables required for the MVP** — there is no backend, no API key,
nothing to configure. The only thing that would ever need one is an
optional Layer 2 LLM addition, which by design (`03-agent-spec.md`
§18) the app must remain fully functional without.

One implementation-time reminder, not a decision made here: whichever
static host is chosen needs an SPA fallback rule (serve `index.html`
for unmatched paths) so React Router's client-side routes work on a
direct URL load/refresh.

---

## 26. Security boundary

Documented explicitly, as required: this prototype uses **fake**
login, **fake** booking, **fake** PNRs, **mock** passenger data, and
**mock** railway availability throughout. There is **no** real
Aadhaar, **no** real payment processing, **no** real railway
credentials, **no** real IRCTC API, and **no** real personally
sensitive information anywhere in the system — not because it's
disabled, but because no code path in this architecture connects to
any external system capable of those things.

---

## 27. Implementation order

The task's suggested 19-step sequence is sound given the architecture
above and is adopted with each step annotated to the modules it
produces:

1. **Types/contracts** — `types/domain.ts` (already exists, locked).
2. **Data access layer** — `services/*.ts` (§8).
3. **Authentication** — `hooks/useAuth.tsx`, `layouts/ProtectedRoute` (§5).
4. **Language/i18n** — `i18n/*`, `hooks/useLanguage.tsx` (§7). *Before* layout, since the shell needs `t()`.
5. **Layout/navigation** — `layouts/AuthenticatedLayout`, route table (§4), global shell incl. language selector.
6. **Smart Search** — `pages/SmartSearch`, the Smart Search form.
7. **Results/ranking** — `tools/searchTrains.ts`, `tools/rankOptions.ts`, `domain/smartSearch.ts` (§11).
8. **Status Translator** — `tools/explainStatus.ts`, `components/StatusBadge`, `pages/UnderstandMyStatus` (§12).
9. **Train Details** — `pages/TrainDetails`.
10. **Passenger Review** — booking-draft state (§6).
11. **Booking service** — `tools/attemptBooking.ts`, `tools/createBooking.ts`, `agent/approval.ts` (`ApprovalToken`, §14), `services/bookings.ts` write path.
12. **My Bookings** — `pages/MyBookings`, `pages/BookingDetails` (§16).
13. **Agent engine** — `agent/engine.ts`, `agent/intentParser.ts`, `agent/lexicon/*` (§9).
14. **Agent UI** — `pages/Agent` (three `AgentSessionStatus`-driven views, §4).
15. **Tatkal** — `tools/prepareTatkal.ts`, `domain/tatkalFlow.ts`, `services/tatkal.ts`, `pages/Tatkal*` (§15).
16. **Error/loading states** — `utils/withSimulatedDelay`, the error table (§18–19) wired into each page built above.
17. **Responsive/accessibility polish** — pass over everything built (§20–21).
18. **Full demo validation** — `scripts/validateDomainLogic.ts` (§23) against `src/data/scenarios.ts`.
19. **Deployment** — static build + host (§25).

No reordering was needed — the given sequence already respects every
dependency this architecture introduces (data access before anything
reads it; i18n before the shell that displays translated text; the
booking service, including the `ApprovalToken` mechanism, before both
Agent and Tatkal, since both depend on it).

---

## 28. Traceability

| Capability | UX screens | Data entities | Agent tools | Technical modules |
|---|---|---|---|---|
| **Status Translator** | Understand My Status; inline on Results, Train Details, Booking Attempt | `RailwayStatusDefinition` | `explainStatus` | `tools/explainStatus.ts`, `components/StatusBadge.tsx`, `i18n/*` (status keys) |
| **Smart Search** | Smart Search, Results, Train Details, Passenger Review, Booking Success | `SearchRequest`, `SearchResult`, `RecommendationOption`, `TrainAvailability`, `Train`, `Station` | `searchTrains`, `getAvailability`, `rankOptions` | `domain/smartSearch.ts`, `tools/searchTrains.ts`, `tools/rankOptions.ts`, `services/availability.ts`, `services/trains.ts` |
| **Agent-Driven Booking** | Agent, Recommendation, Approval, Booking Success | `AgentIntent`, `AgentSession`, `RecommendationOption`, `Booking` | all 8 (via `rankOptions`/`getAlternatives`/`attemptBooking`/`createBooking`) | `agent/engine.ts`, `agent/intentParser.ts`, `agent/lexicon/*`, `agent/approval.ts` |
| **Tatkal Mode** | Tatkal Mode, Preparation, Countdown, Booking Attempt → Success/Backup, Booking Success | `TatkalPreparation`, `TatkalAttempt`, `Booking` | `prepareTatkal`, `attemptBooking`, `createBooking`, `getAlternatives` | `domain/tatkalFlow.ts`, `services/tatkal.ts`, `tools/prepareTatkal.ts`, `tools/attemptBooking.ts` |
| **Login** | Login | `User` | — | `hooks/useAuth.tsx`, `layouts/ProtectedRoute`, `services/users.ts` |
| **My Bookings** | My Bookings, Booking Details | `Booking`, `BookingPassenger`, `Train`, `User` | — | `services/bookings.ts`, `pages/MyBookings`, `pages/BookingDetails` |
| **Multilingual Experience** | Cross-cutting (Login, Home, persistent header, every screen) | — (deliberately no entity, §7/`04-data-spec.md`) | — (presentation-only, `03-agent-spec.md` §22) | `i18n/*`, `hooks/useLanguage.tsx` |

Every major requirement across all four locked specs has a concrete
technical home above — no gaps found.

---

## 29. Contradiction check

Read all five specifications together after writing this document.
Checked specifically for each required category:

- **Contradictory requirements:** none found.
- **Duplicated responsibilities:** one near-miss, resolved by naming
  convention, not by design flaw — `services/availability.ts`'s
  `findAvailability` vs. the agent tool `searchTrains` (§8) do
  related but distinct jobs at different layers; kept intentionally
  distinct rather than merged, and given different names to prevent
  confusion.
- **Missing technical mappings:** none — §28's traceability table
  covers every capability with no blank cells.
- **Unnecessary complexity:** actively avoided — §22 rejects five
  dependency candidates, §9 rejects a tool-dispatcher/effects
  pattern, §16 avoids inventing state for a value that's already a
  pure function of existing state.
- **State ownership conflicts:** none — §6's table assigns exactly
  one owner per piece of state, with a consistent general policy
  rather than ad hoc per-row decisions.
- **Agent/data contract mismatches:** none — every tool signature in
  §10 reads/writes only entities and fields that already exist in
  the locked `04-data-spec.md`; `03-agent-spec.md`'s explicit scoping
  decisions (booking failure is Tatkal-only; `AgentSessionStatus` has
  no Tatkal states) are implemented as-is, not re-litigated.
- **Multilingual inconsistencies:** none — §7's resolution of "tools
  return English, display layer localizes" directly satisfies
  `03-agent-spec.md` §22's "tools never return translated data" rule
  while still correctly implementing the fallback requirement.
- **Tatkal inconsistencies:** none — the "simulated countdown vs.
  narrative `tatkalOpensAt`" resolution in §15 satisfies both "must be
  completely deterministic" and "the judge must not wait for the real
  opening time" without touching the locked `TatkalPreparation` shape.
- **Booking approval inconsistencies:** none — §14's `ApprovalToken`
  design implements `03-agent-spec.md` §8's two distinct consent
  models (per-option approval for Smart Search/Agent; one advance
  approval reused across a Tatkal preparation's whole attempt
  sequence) as one consistent mechanism, not two different systems.

**No contradiction was found that requires a redesign or touching a
locked spec.** Every close call above was resolved by making an
explicit technical decision within this document — exactly what
`05-technical-spec.md` was for.

---

## 30. Final architecture diagram

```
User
 ↓
React UI                         (components/, pages/, layouts/)
 ↓
Application Services              (hooks/ — useAuth, useLanguage, useAgentSession, ...)
 ↓
Agent Engine / Domain Services      (agent/ — conversational; domain/ — Smart Search, Tatkal)
 ↓
Tools                                (tools/ — the 8 tools, §10)
 ↓
Data Access                           (services/ — pure reads, §8)
 ↓
Deterministic Mock Data                (data/ — locked, unmodified)
```

```
Optional, later, never required:

Optional LLM
 ↓
Intent Enhancement
 ↓
Agent Engine   (only as an input to intent parsing — never touches
                Tools, Data Access, or Mock Data directly)
```

**THE MVP DOES NOT REQUIRE AN LLM.** Every layer that produces the
actual demo — search, ranking, status explanation, agent intent
parsing (in English, Hindi, or Telugu), Tatkal attempt/fallback,
booking, and approval — is deterministic TypeScript with zero calls
to any external service.

---

## 31. Open decisions

Only decisions genuinely left open by this document — nothing already
locked by an earlier spec is re-opened here.

1. **AgentIntent/Tatkal representation edge case:** what happens if a
   user starts a new Tatkal preparation while an older, incomplete one
   still exists in `localStorage`? Recommended default: one active
   preparation per user at a time (starting a new one replaces the
   old), but the exact UX (silent replace vs. a confirmation) is left
   for implementation.
2. **Ranking weights:** the formula's shape is decided (§11); the
   exact default weight values need tuning against the real generated
   data during implementation/demo rehearsal.
3. **Deterministic multilingual intent patterns:** the mechanism
   (per-language lexicons, §9/§17) is decided; the actual Hindi/Telugu
   word lists need native-speaker authoring/review during
   implementation — not attempted in this document.
4. **Runtime booking/Tatkal persistence details:** `localStorage` is
   the chosen mechanism (§6); exact key naming/versioning, and
   graceful degradation if `localStorage` is unavailable/full (fall
   back to in-memory only, with a console warning, rather than
   crashing) are implementation-time details.
5. **Optional LLM enhancement:** deliberately and explicitly
   undecided — no provider, no SDK, no timeline. Only ever a Layer 2
   addition per `03-agent-spec.md` §18/§22.
6. **`react-hook-form` reconsideration:** currently rejected (§22);
   worth revisiting only if passenger-entry forms grow materially more
   complex than currently specified.
