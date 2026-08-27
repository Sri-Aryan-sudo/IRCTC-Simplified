/**
 * Data access for Train records.
 * See spec/05-technical-spec.md §8.
 */

import { trains } from '../data';
import type { Train, TrainNumber } from '../types/domain';

export function getTrains(): Train[] {
  return trains;
}

export function getTrain(trainNumber: TrainNumber): Train | undefined {
  return trains.find((t) => t.number === trainNumber);
}
