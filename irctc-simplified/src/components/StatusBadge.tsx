/**
 * A compact, plain-language status badge — used inline on Results
 * and Train Details, per spec/02-ux-spec.md's "status translation is
 * a cross-cutting pattern, not just a screen."
 *
 * This is deliberately lightweight: it shows the canonical code plus
 * a short plain-language label, using services/statusDefinitions
 * (already-implemented data access) directly. It does NOT implement
 * the full explainStatus tool or the standalone Understand My Status
 * screen — that's Status Translator, out of scope for this task. The
 * canonical code is always shown alongside the label, never replaced
 * by it, per spec/01-product-spec.md's Multilingual Experience
 * section (codes are never translated).
 */

import { getStatusDefinition } from '../services/statusDefinitions';
import { useLanguage } from '../hooks/useLanguage';
import type { TrainAvailability } from '../types/domain';

export function StatusBadge({ availability }: { availability: TrainAvailability }) {
  const { t } = useLanguage();
  const definition = getStatusDefinition(availability.status);

  let label: string;
  switch (availability.status) {
    case 'CNF':
      label = t('status.confirmed');
      break;
    case 'RAC':
      label = t('status.racPosition', { position: availability.racPosition ?? '' });
      break;
    case 'GNWL':
    case 'PQWL':
    case 'RLWL':
    case 'TQWL':
      label = t('status.waitlistPosition', { position: availability.waitlistPosition ?? '' });
      break;
    case 'SOLD_OUT':
      label = t('status.soldOut');
      break;
    default:
      label = definition?.displayLabel ?? availability.status;
  }

  const tone =
    availability.status === 'CNF'
      ? 'bg-green-50 text-green-800 border-green-200'
      : availability.status === 'RAC'
        ? 'bg-blue-50 text-blue-800 border-blue-200'
        : availability.status === 'SOLD_OUT'
          ? 'bg-gray-100 text-gray-600 border-gray-200'
          : 'bg-amber-50 text-amber-800 border-amber-200';

  return (
    <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium ${tone}`}>
      <span className="font-mono">{availability.status}</span>
      <span aria-hidden="true">·</span>
      <span>{label}</span>
    </span>
  );
}
