/**
 * Home — see spec/02-ux-spec.md's Home screen and
 * spec/05-technical-spec.md §4/§27.
 *
 * The hub: five entry points (four capabilities + My Bookings). Each
 * currently routes to a placeholder page — the entry points
 * themselves are foundation/navigation, not the features they lead
 * to (those are later tasks per the Strict Boundaries in this task).
 */

import { Link } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';

const ENTRIES: { to: string; labelKey: 'home.entrySmartSearch' | 'home.entryAgent' | 'home.entryStatus' | 'home.entryTatkal' | 'home.entryMyBookings' }[] = [
  { to: '/search', labelKey: 'home.entrySmartSearch' },
  { to: '/agent', labelKey: 'home.entryAgent' },
  { to: '/status', labelKey: 'home.entryStatus' },
  { to: '/tatkal', labelKey: 'home.entryTatkal' },
  { to: '/bookings', labelKey: 'home.entryMyBookings' },
];

export function Home() {
  const { t } = useLanguage();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">{t('home.title')}</h1>
      <p className="mt-2 text-gray-500">{t('home.subtitle')}</p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ENTRIES.map((entry) => (
          <Link
            key={entry.to}
            to={entry.to}
            className="rounded border border-gray-200 bg-white px-4 py-3 text-gray-900 shadow-sm hover:border-gray-300 hover:shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            {t(entry.labelKey)}
          </Link>
        ))}
      </div>
    </div>
  );
}
