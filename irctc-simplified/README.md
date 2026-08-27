# IRCTC Simplified

A hackathon prototype that reimagines the Indian Railways (IRCTC)
train-booking experience.

> Don't make citizens learn how Indian Railways works. Make the app
> work the way citizens think.

## What this is

A frontend-first prototype exploring four ideas:

1. **Railway Status Translator** — plain-language explanations of
   GNWL, RAC, PQWL, RLWL, TQWL, and other confirmation statuses.
2. **Smart Train Search** — a small set of clear recommendations
   (Best Overall, Fastest, Cheapest, Best Chance of Confirmation)
   instead of a wall of raw results.
3. **Agent-Driven Booking** — describe your trip in plain language and
   let the app search, compare, and recommend options.
4. **Tatkal Mode** — prepare a journey ahead of time, simulate the
   Tatkal window opening, and get automatic fallback options.

**This is a hackathon prototype.** There is no real IRCTC API
integration, no real payment processing, no real Aadhaar
authentication, and no real train booking. All railway data is
mocked.

## Tech stack

- React + TypeScript
- Vite
- Tailwind CSS
- React Router

## Getting started

```bash
npm install
npm run dev
```

The app will be available at the local URL Vite prints (typically
`http://localhost:5173`). Log in by picking any of the three demo
users — no real credentials are checked.

To build for production:

```bash
npm run build
```

To validate the mock dataset:

```bash
npm run validate:data
```

To regenerate the mock dataset (deterministic — running it twice
produces identical output):

```bash
npm run generate:data
```

## Project structure

```
/
├── CLAUDE.md          # Guidance for AI assistants / contributors
├── spec/              # Product, UX, agent, data, and technical specs
├── scripts/           # Mock-data generation/validation scripts
├── src/
│   ├── components/    # Reusable UI components
│   ├── pages/         # Route-level screens
│   ├── layouts/       # Shared page shells (auth gate, app shell)
│   ├── hooks/         # Auth and language state (Context + hooks)
│   ├── i18n/          # English/Hindi/Telugu translation dictionaries
│   ├── services/      # Data access — pure reads over src/data
│   ├── tools/         # Booking/search domain logic (agent-spec tools)
│   ├── domain/        # Orchestration (Smart Search, approval)
│   ├── agent/         # Deterministic intent parsing and booking state machine
│   ├── data/          # Deterministic mock railway data
│   ├── types/         # Shared TypeScript domain types
│   └── utils/         # Small pure helper functions
└── public/
```

## Status

**Currently implemented:**
- Login (mocked, pick any demo user) and session handling
- Language selector — English, Hindi, Telugu, switchable at any time
  without losing your place
- Home
- Smart Search → Results (Best Overall / Fastest / Cheapest / Best
  Chance of Confirmation / Overnight) → Train Details
- Passenger Review → explicit approval → mock Booking → Booking Success
- Agent-driven booking: deterministic intent extraction → recommendation → approval → mock booking
- Status Translator for CNF, RAC, GNWL, PQWL, RLWL, TQWL, WL, CAN, and REGRET
- Tatkal preparation → countdown → deterministic attempt → backup recovery
- My Bookings → Booking Details

All four core MVP capabilities are implemented with deterministic mock data.

See `/spec` for what's planned and `CLAUDE.md` for development rules.
