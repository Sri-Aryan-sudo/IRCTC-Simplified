/**
 * Tool 3 — explainStatus. See spec/03-agent-spec.md §6.
 *
 * Translates a railway status code into plain language. Read-only;
 * returns the canonical English RailwayStatusDefinition content with
 * `{position}` interpolated — never editorializes beyond the defined
 * explanation/consideration text, and never invents a status code
 * that has no RailwayStatusDefinition record.
 *
 * Returns English canonical text on purpose (spec/05-technical-spec.md
 * §7): the display layer looks up the current language's
 * `status.<code>.explanation`/`.suggestion` key and falls back to
 * this tool's own string when a translation is missing.
 */

import { getStatusDefinition } from '../services/statusDefinitions';
import type { RailwayStatusDefinition, StatusCode } from '../types/domain';

export interface ExplainStatusResult {
  definition: RailwayStatusDefinition;
  interpolatedExplanation: string;
  interpolatedConsideration?: string;
}

function interpolatePosition(template: string, position?: number): string {
  if (position === undefined) return template;
  return template.split('{position}').join(String(position));
}

export function explainStatus(code: StatusCode, position?: number): ExplainStatusResult | undefined {
  const definition = getStatusDefinition(code);
  if (!definition) return undefined;

  return {
    definition,
    interpolatedExplanation: interpolatePosition(definition.plainExplanation, position),
    interpolatedConsideration: definition.suggestedConsideration
      ? interpolatePosition(definition.suggestedConsideration, position)
      : undefined,
  };
}
