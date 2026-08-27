/**
 * Data access for Passenger records.
 * See spec/05-technical-spec.md §8.
 */

import { passengers, users } from '../data';
import type { Passenger } from '../types/domain';

/** All saved passengers belonging to a given user. */
export function getPassengers(userId: string): Passenger[] {
  const user = users.find((u) => u.id === userId);
  if (!user) return [];
  const ids = new Set(user.savedPassengerIds);
  return passengers.filter((p) => ids.has(p.id));
}

export function getPassenger(passengerId: string): Passenger | undefined {
  return passengers.find((p) => p.id === passengerId);
}
