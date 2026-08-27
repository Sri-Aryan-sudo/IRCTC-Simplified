/**
 * Ad-hoc verification that Smart Search's real ranking logic
 * (domain/smartSearch.ts) reproduces the outcomes the existing demo
 * scenarios (src/data/scenarios.ts) expect. Not registered as an
 * npm script — run directly via `npx tsx scripts/validateSmartSearch.ts`
 * for manual verification during this implementation task.
 */
import { demoScenarios } from '../src/data/scenarios.ts';
import { runSmartSearch } from '../src/domain/smartSearch.ts';

let failures = 0;

for (const scenario of demoScenarios) {
  if (!scenario.searchInput) continue;
  const { result, candidates } = runSmartSearch(scenario.searchInput);

  console.log(`\n=== ${scenario.id} ===`);
  console.log(`candidates: ${candidates.length}`);
  for (const r of result.recommendations) {
    console.log(`  ${r.category}: train ${r.trainNumber} (${r.travelClass}) — ${r.reasonSummary}${r.tradeOffNote ? ' | ' + r.tradeOffNote : ''}`);
  }

  if (scenario.expectedRecommendations) {
    for (const expected of scenario.expectedRecommendations) {
      const actual = result.recommendations.find((r) => r.category === expected.category);
      const ok = actual?.trainNumber === expected.trainNumber;
      console.log(`  check ${expected.category} === ${expected.trainNumber}: ${ok ? 'PASS' : 'FAIL (got ' + actual?.trainNumber + ')'}`);
      if (!ok) failures++;
    }
  }

  if (scenario.expectedStatuses) {
    for (const expected of scenario.expectedStatuses) {
      const match = candidates.find(
        (c) => c.trainNumber === expected.trainNumber && c.travelClass === expected.travelClass,
      );
      const ok = match?.status === expected.status;
      console.log(`  check status ${expected.trainNumber}/${expected.travelClass} === ${expected.status}: ${ok ? 'PASS' : 'FAIL (got ' + match?.status + ')'}`);
      if (!ok) failures++;
    }
  }
}

console.log(`\n${failures === 0 ? '✓ All checks passed' : `✗ ${failures} check(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
