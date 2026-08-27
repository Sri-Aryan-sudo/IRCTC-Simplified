/**
 * Mock authentication state — see spec/05-technical-spec.md §5.
 *
 * Entirely local and fake: "logging in" means picking one of the
 * existing demo users (src/data/users.ts); nothing is validated
 * against a real credential. Session is stored in sessionStorage
 * (survives a refresh, not a closed tab — an intentionally honest
 * scope for a mock prototype, not a durable multi-day login).
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { getUser } from '../services/users';
import { readJSON, removeKey, writeJSON } from '../utils/storage';
import type { User } from '../types/domain';

const AUTH_STORAGE_KEY = 'irctc-simplified:auth';

interface AuthSession {
  userId: string;
}

interface AuthContextValue {
  currentUser: User | undefined;
  login: (userId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readPersistedSession(): AuthSession | undefined {
  return readJSON<AuthSession>('session', AUTH_STORAGE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | undefined>(readPersistedSession);

  const login = useCallback((userId: string) => {
    const next: AuthSession = { userId };
    setSession(next);
    writeJSON('session', AUTH_STORAGE_KEY, next);
  }, []);

  const logout = useCallback(() => {
    setSession(undefined);
    removeKey('session', AUTH_STORAGE_KEY);
  }, []);

  const currentUser = useMemo(() => (session ? getUser(session.userId) : undefined), [session]);

  const value = useMemo(() => ({ currentUser, login, logout }), [currentUser, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
