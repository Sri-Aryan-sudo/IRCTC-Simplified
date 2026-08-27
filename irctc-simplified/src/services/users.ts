/**
 * Data access for User records.
 *
 * Pure, synchronous, deterministic reads over the locked mock
 * dataset (src/data). No UI logic, no agent logic, never mutates
 * the source arrays. See spec/05-technical-spec.md §8.
 */

import { users } from '../data';
import type { User } from '../types/domain';

export function getUsers(): User[] {
  return users;
}

export function getUser(userId: string): User | undefined {
  return users.find((u) => u.id === userId);
}
