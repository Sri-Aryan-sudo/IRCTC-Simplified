/**
 * Data access for RailwayStatusDefinition records — the content
 * behind the Status Translator capability.
 * See spec/05-technical-spec.md §8.
 */

import { statusDefinitions } from '../data';
import type { RailwayStatusDefinition, StatusCode } from '../types/domain';

export function getStatusDefinitions(): RailwayStatusDefinition[] {
  return statusDefinitions;
}

export function getStatusDefinition(code: StatusCode): RailwayStatusDefinition | undefined {
  return statusDefinitions.find((d) => d.code === code);
}
