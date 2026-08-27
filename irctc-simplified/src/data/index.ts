/**
 * Barrel re-export for the mock dataset. This file is hand-written
 * and stable across regenerations — it's the single import path the
 * rest of the app should use (`import { stations, trains } from
 * '../data'`) rather than reaching into individual generated files
 * directly.
 */

export { DEMO_TODAY, DEMO_DATES, addDays } from './demoConfig';

export { stations } from './stations';
export { trains } from './trains';
export { trainAvailability } from './availability';
export { statusDefinitions } from './statusDefinitions';
export { users } from './users';
export { passengers } from './passengers';
export { bookings } from './bookings';
export { tatkalPreparations, tatkalAttempts } from './tatkal';
export { demoScenarios } from './scenarios';
