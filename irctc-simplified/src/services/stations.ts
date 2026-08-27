/**
 * Data access for Station records.
 * See spec/05-technical-spec.md §8.
 */

import { stations } from '../data';
import type { Station } from '../types/domain';

export function getStations(): Station[] {
  return stations;
}

export function getStation(code: string): Station | undefined {
  return stations.find((s) => s.code === code);
}
