import { createContext, useContext, useState, type ReactNode } from 'react';
import { getList } from './api';
import type { Role, User } from '../types';

export type SessionUser = Omit<User, 'password'>;
interface AuthCtx { user: SessionUser | null; login: (email: string, password: string) => Promise<SessionUser>; logout: () => void; hasRole: (...r: Role[]) => boolean }

const Ctx = createContext<AuthCtx>(null!);
const KEY = 'lf_session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
  });

  async function login(email: string, password: string) {
    const found = await getList<User>('users', { email: email.trim().toLowerCase(), password });
    const u = found[0];
    if (!u) throw new Error('Email or password is incorrect.');
    if (!u.active) throw new Error('This account is disabled. Contact an administrator.');
    const { password: _pw, ...safe } = u;
    localStorage.setItem(KEY, JSON.stringify(safe));
    setUser(safe);
    return safe;
  }
  function logout() { localStorage.removeItem(KEY); setUser(null); }
  const hasRole = (...r: Role[]) => !!user && r.includes(user.role);

  return <Ctx.Provider value={{ user, login, logout, hasRole }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
