/**
 * The authenticated app shell — see spec/02-ux-spec.md's Global
 * shell and spec/05-technical-spec.md §8. Infrastructure only: app
 * identity, nav to the (currently placeholder) feature entry points,
 * language selector, and logout. No feature-specific screen content.
 *
 * Responsive: the header wraps rather than overflows on narrow
 * viewports, per spec/05-technical-spec.md §20's mobile-first
 * priority.
 */

import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { LanguageSelector } from '../components/LanguageSelector';

const NAV_LINKS: { to: string; labelKey: 'nav.home' | 'nav.smartSearch' | 'nav.agent' | 'nav.status' | 'nav.tatkal' | 'nav.myBookings' }[] = [
  { to: '/', labelKey: 'nav.home' },
  { to: '/search', labelKey: 'nav.smartSearch' },
  { to: '/agent', labelKey: 'nav.agent' },
  { to: '/status', labelKey: 'nav.status' },
  { to: '/tatkal', labelKey: 'nav.tatkal' },
  { to: '/bookings', labelKey: 'nav.myBookings' },
];

export function AuthenticatedLayout() {
  const { currentUser, logout } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="text-lg font-semibold text-gray-900">
            {t('common.appName')}
          </Link>

          <nav className="flex flex-wrap items-center gap-4 text-sm text-gray-600" aria-label={t('nav.home')}>
            {NAV_LINKS.map((link) => (
              <Link key={link.to} to={link.to} className="hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500">
                {t(link.labelKey)}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <LanguageSelector />
            {currentUser && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>{currentUser.displayName}</span>
                <button
                  type="button"
                  onClick={logout}
                  className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                >
                  {t('common.logout')}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
