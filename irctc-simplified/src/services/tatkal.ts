/**
 * Data access for TatkalPreparation and TatkalAttempt records.
 * See spec/05-technical-spec.md §8, §15.
 *
 * Preparations and attempts are persisted to localStorage so they
 * survive a refresh or a return visit — required for the "never
 * restart the journey" guarantee (Product Principle 4) to be a real
 * technical property, not just a UI convention. This module only
 * persists what it's given; deciding which train to attempt next,
 * or when an attempt counts as approved, is domain/agent-layer logic
 * (not part of this foundation task).
 */

import { tatkalPreparations as seedPreparations, tatkalAttempts as seedAttempts } from '../data';
import { readJSON, writeJSON } from '../utils/storage';
import type { TatkalAttempt, TatkalPreparation } from '../types/domain';

const RUNTIME_PREPARATIONS_KEY = 'irctc-simplified:tatkal-preparations';
const RUNTIME_ATTEMPTS_KEY = 'irctc-simplified:tatkal-attempts';

function getRuntimePreparations(): TatkalPreparation[] {
  return readJSON<TatkalPreparation[]>('local', RUNTIME_PREPARATIONS_KEY) ?? [];
}

function setRuntimePreparations(preparations: TatkalPreparation[]): void {
  writeJSON('local', RUNTIME_PREPARATIONS_KEY, preparations);
}

function getRuntimeAttempts(): TatkalAttempt[] {
  return readJSON<TatkalAttempt[]>('local', RUNTIME_ATTEMPTS_KEY) ?? [];
}

function setRuntimeAttempts(attempts: TatkalAttempt[]): void {
  writeJSON('local', RUNTIME_ATTEMPTS_KEY, attempts);
}

/**
 * The active TatkalPreparation for a user, if one exists. Per
 * spec/05-technical-spec.md §31, this prototype supports one active
 * preparation per user at a time — a newer saved preparation
 * replaces an older one for that same user.
 */
export function getTatkalPreparation(userId: string): TatkalPreparation | undefined {
  const all = [...seedPreparations, ...getRuntimePreparations()];
  // Most-recently-saved wins if more than one exists for the user.
  return [...all].reverse().find((p) => p.userId === userId);
}

export function saveTatkalPreparation(preparation: TatkalPreparation): TatkalPreparation {
  const current = getRuntimePreparations().filter((p) => p.userId !== preparation.userId);
  setRuntimePreparations([...current, preparation]);
  return preparation;
}

export function getTatkalAttempts(preparationId: string): TatkalAttempt[] {
  return [...seedAttempts, ...getRuntimeAttempts()]
    .filter((a) => a.preparationId === preparationId)
    .sort((a, b) => a.attemptOrder - b.attemptOrder);
}

export function appendTatkalAttempt(attempt: TatkalAttempt): TatkalAttempt {
  const current = getRuntimeAttempts();
  setRuntimeAttempts([...current, attempt]);
  return attempt;
}
