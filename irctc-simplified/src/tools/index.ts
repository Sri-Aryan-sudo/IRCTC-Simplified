/**
 * Tool registry. See spec/05-technical-spec.md §9.
 *
 * A single canonical import surface for all eight agent tools — a
 * plain, statically-typed export, not a dynamic dispatcher. Exists
 * for one canonical import path and as a seam for a possible future
 * Layer 2 (LLM function calling), never as validation machinery this
 * deterministic MVP doesn't need.
 */

import { searchTrains } from './searchTrains';
import { getAvailability } from './getAvailability';
import { explainStatus } from './explainStatus';
import { rankOptions } from './rankOptions';
import { getAlternatives } from './getAlternatives';
import { prepareTatkal } from './prepareTatkal';
import { attemptBooking } from './attemptBooking';
import { createBooking } from './createBooking';

export const tools = {
  searchTrains,
  getAvailability,
  explainStatus,
  rankOptions,
  getAlternatives,
  prepareTatkal,
  attemptBooking,
  createBooking,
};
