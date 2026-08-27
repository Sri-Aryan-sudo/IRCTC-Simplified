/**
 * A single reusable placeholder for every route whose real feature
 * hasn't been implemented yet (see spec/05-technical-spec.md §4/§27
 * implementation order — this task only builds the foundation).
 *
 * Deliberately generic: it is not a preview of any screen's eventual
 * design, just an honest "not built yet" marker so routing/auth/i18n
 * can be verified end-to-end.
 */

import { useLanguage } from '../hooks/useLanguage';

export function DevPlaceholder({ title }: { title: string }) {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-[60vh] items-center justify-center text-center">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        <p className="mt-2 text-gray-500">{t('common.comingSoon')}</p>
      </div>
    </div>
  );
}
