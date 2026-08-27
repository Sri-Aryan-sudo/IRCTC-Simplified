/**
 * Login — see spec/02-ux-spec.md's Login screen and
 * spec/05-technical-spec.md §5.
 *
 * This is the real (if minimal) login infrastructure, not a
 * placeholder — task explicitly requires a working auth foundation.
 * Visual polish is intentionally out of scope for this task.
 */

import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { LanguageSelector } from '../components/LanguageSelector';
import { getUsers } from '../services/users';

export function Login() {
  const { currentUser, login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const users = getUsers();
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id ?? '');
  const [password, setPassword] = useState('');

  // Per spec/02-ux-spec.md: a returning "signed-in" user skips straight to Home.
  if (currentUser) {
    return <Navigate to="/" replace />;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedUserId) return;
    login(selectedUserId);
    navigate('/', { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-4 flex justify-end">
          <LanguageSelector />
        </div>

        <h1 className="text-xl font-semibold text-gray-900">{t('login.title')}</h1>
        <p className="mt-2 text-sm text-gray-500">{t('login.subtitle')}</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="demo-user" className="block text-sm font-medium text-gray-700">
              {t('login.selectUser')}
            </label>
            <select
              id="demo-user"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.displayName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="mock-password" className="block text-sm font-medium text-gray-700">
              {t('login.passwordLabel')}
            </label>
            <input
              id="mock-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('login.passwordPlaceholder')}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            {t('login.submit')}
          </button>
        </form>

        <p className="mt-4 text-xs text-gray-400">{t('login.mockNotice')}</p>
      </div>
    </div>
  );
}
