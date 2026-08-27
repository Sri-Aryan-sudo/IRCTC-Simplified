/** Read-only access to deterministic judge-facing demo scenarios. */
import { demoScenarios } from '../data/scenarios';
import type { DemoScenario } from '../types/domain';

export function getDemoScenario(id: string): DemoScenario | undefined {
  return demoScenarios.find((scenario) => scenario.id === id);
}
