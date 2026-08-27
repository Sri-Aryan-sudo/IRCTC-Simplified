# CLAUDE.md

Guidance for any AI assistant (or human) working on this repository.

## Product purpose

This project radically simplifies the Indian Railways (IRCTC) train-
booking experience for a hackathon prototype.

## Core product principle

> Don't make citizens learn how Indian Railways works. Make the app
> work the way citizens think.

Every feature decision should be checked against this principle. If a
feature requires the user to understand railway jargon, quota codes,
or booking mechanics to use the app, it's working against the
product.

## The four MVP capabilities

1. **Railway Status Translator** — Explain confusing statuses (GNWL,
   RAC, PQWL, RLWL, TQWL, etc.) in plain language, and tell the user
   what it means for them and what they might want to do about it.
2. **Smart Train Search** — Instead of a long list of raw results,
   surface a small set of clearly-labeled recommendations (Best
   Overall, Fastest, Cheapest, Best Chance of Confirmation) with a
   plain-language reason for each.
3. **Agent-Driven Booking** — Let the user describe what they need in
   natural language. The agent extracts intent, searches and ranks
   mock train data, recommends an option, confirms with the user, and
   performs a mock booking.
4. **Tatkal Mode** — Let the user prepare a journey in advance, see
   Tatkal readiness/countdown, simulate the Tatkal window opening,
   attempt the preferred train, and automatically fall back to backup
   options without restarting the whole flow.

## Technology stack

- React 19
- Vite
- TypeScript
- Tailwind CSS (v4, CSS-first config via `@tailwindcss/vite`)
- React Router

Dependencies are kept minimal. No state-management library unless a
real need is demonstrated. No backend yet — mock data and services
live entirely in the frontend (`src/data`, `src/services`).

## Architecture principles

- Frontend-first prototype. No real IRCTC API, no real payments, no
  real Aadhaar auth, no real railway booking, no production database.
  Everything is mocked.
- `src/data` holds mock data (trains, stations, statuses, fares,
  etc.). `src/services` holds the functions that read/query/shape
  that data for the UI (and, later, for the agent layer) — treat
  these as the boundary that would be swapped for real APIs later.
- `src/pages` are route-level screens; `src/components` are reusable
  UI pieces; `src/layouts` are shared page shells; `src/types` holds
  shared TypeScript types; `src/utils` holds small pure helpers.
- Keep the mock "backend" logic (data + services) decoupled from
  presentation so it could later be swapped for real endpoints
  without rewriting the UI.

## Development rules

- **Read `/spec` first.** Before implementing any feature, read the
  relevant file(s) under `/spec`. Specs are developed collaboratively
  before implementation — don't build ahead of them.
- **Do not invent features.** If something isn't in a spec and isn't
  explicitly requested, ask or flag it rather than assuming it.
- **Use mock data.** No real IRCTC integration, payments, or auth.
  All railway data is mocked in `src/data` and served through
  `src/services`.
- **Keep implementations minimal.** Build what's asked for. Avoid
  speculative abstraction, premature generalization, or extra
  dependencies "just in case."
- **Prioritize UX.** This product's entire value proposition is
  clarity and simplicity for a confused citizen. When in doubt,
  optimize for that over technical elegance.
- **Never modify unrelated code.** Changes should be scoped to the
  feature being worked on. Don't refactor or "clean up" unrelated
  files as a side effect of a task.

## Spec-driven development

This project follows spec-driven development. The `/spec` directory
currently contains placeholders (`01-product-spec.md` through
`05-technical-spec.md`). These will be filled in collaboratively
before each feature is implemented. Do not skip ahead to
implementation without a corresponding spec.
