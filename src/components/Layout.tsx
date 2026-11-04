import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { getList } from '../lib/api';
import type { AppNotification, Role } from '../types';
import Icon from './Icon';
import { Avatar } from './ui';

interface NavItem { to: string; label: string; icon: string; roles?: Role[] }
const GROUPS: { title: string; items: NavItem[] }[] = [
  { title: 'Workspace', items: [
    { to: '/dashboard', label: 'Dashboard', icon: 'home' },
    { to: '/lost', label: 'Lost reports', icon: 'pin' },
    { to: '/found', label: 'Found items', icon: 'box' },
    { to: '/search', label: 'Search & matches', icon: 'search' },
    { to: '/claims', label: 'My claims', icon: 'claim' },
  ] },
  { title: 'Review', items: [
    { to: '/verification', label: 'Verification queue', icon: 'shield', roles: ['staff', 'admin'] },
    { to: '/handovers', label: 'Handovers', icon: 'swap', roles: ['staff', 'admin'] },
  ] },
  { title: 'Admin', items: [
    { to: '/admin', label: 'Overview', icon: 'chart', roles: ['admin'] },
    { to: '/admin/reports', label: 'Reports', icon: 'tag', roles: ['admin'] },
    { to: '/admin/users', label: 'Users', icon: 'users', roles: ['admin'] },
    { to: '/admin/categories', label: 'Categories', icon: 'link', roles: ['admin'] },
  ] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const nav = useNavigate();
  const loc = useLocation();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    getList<AppNotification>('notifications', { userId: user.id, read: false }).then((l) => setUnread(l.length)).catch(() => {});
    setOpen(false);
  }, [loc.pathname, user]);

  const roleLabel = user?.role === 'staff' ? 'Staff / verifier' : user?.role === 'admin' ? 'Administrator' : 'Member';

  return (
    <div className="min-h-screen lg:flex">
      {open && <button aria-label="Close menu" className="fixed inset-0 z-30 bg-night/50 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-line bg-surface transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-full flex-col p-5">
          <Link to="/" className="mb-7 flex items-center gap-3">
            <span className="relative flex h-10 w-8 items-start justify-center rounded-md bg-tag pt-1.5 shadow-soft" style={{ clipPath: 'polygon(0 14%, 14% 0, 100% 0, 100% 100%, 0 100%)' }}>
              <span className="h-2 w-2 rounded-full bg-night" />
            </span>
            <span className="text-lg font-bold leading-none tracking-tight">Lost &amp; Found<span className="mt-1 block text-xs font-medium text-muted">Recovery desk</span></span>
          </Link>
          <nav className="flex-1 space-y-5 overflow-y-auto pr-1">
            {GROUPS.map((g) => {
              const items = g.items.filter((n) => !n.roles || (user && n.roles.includes(user.role)));
              if (!items.length) return null;
              return (
                <div key={g.title}>
                  <p className="mb-1.5 px-3 text-xs font-semibold text-muted">{g.title}</p>
                  <div className="space-y-0.5">
                    {items.map((n) => (
                      <NavLink key={n.to} to={n.to} end={n.to === '/admin'}
                        className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-night text-white shadow-soft dark:bg-btn' : 'text-muted hover:bg-paper hover:text-ink'}`}>
                        <Icon name={n.icon} className="h-[18px] w-[18px]" />{n.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-paper p-3">
            <Avatar name={user?.name ?? '?'} />
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{user?.name}</p><p className="truncate text-xs text-muted">{roleLabel}</p></div>
            <button className="rounded-lg p-2 text-muted transition hover:bg-surface hover:text-lost" aria-label="Log out" title="Log out" onClick={() => { logout(); nav('/login'); }}><Icon name="logout" className="h-[18px] w-[18px]" /></button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line bg-paper/80 px-4 py-3 backdrop-blur-xl sm:px-8">
          <button className="btn-ghost px-3 lg:hidden" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}><Icon name="menu" className="h-5 w-5" /></button>
          <div className="hidden text-sm text-muted lg:block">Signed in as <span className="font-semibold text-ink">{roleLabel}</span></div>
          <div className="flex items-center gap-2">
            <Link to="/lost/new" className="btn-primary hidden sm:inline-flex"><Icon name="plus" className="h-4 w-4" />Report lost</Link>
            <button className="btn-ghost px-3" onClick={toggle} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}><Icon name={dark ? 'sun' : 'moon'} className="h-5 w-5" /></button>
            <Link to="/notifications" className="btn-ghost relative px-3" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
              <Icon name="bell" className="h-5 w-5" />
              {unread > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-lost px-1 text-[11px] font-bold text-white">{unread}</span>}
            </Link>
          </div>
        </header>
        <main className="p-4 sm:p-8"><div className="mx-auto max-w-6xl"><Outlet /></div></main>
      </div>
    </div>
  );
}
