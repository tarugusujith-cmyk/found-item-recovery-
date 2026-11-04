import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { ActivityLog, Category, User } from '../types';
import { emptyFilters, fmtDate, fmtDateTime, readImage, type FilterState } from '../lib/utils';
import Icon from './Icon';

const TONE = {
  amber: 'bg-tag/150/15 text-amber-700 dark:text-amber-300',
  sky: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  green: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  slate: 'bg-slate-500/15 text-muted dark:text-slate-300',
  orange: 'bg-orange-500/100/15 text-orange-700 dark:text-orange-300',
  red: 'bg-lost/100/15 text-red-700 dark:text-red-300',
  teal: 'bg-teal-500/15 text-teal-700 dark:text-teal-300',
} as const;
const BADGE: Record<string, keyof typeof TONE> = {
  Open: 'amber', Matched: 'sky', Resolved: 'green', Closed: 'slate',
  'In Storage': 'teal', 'Claim Pending': 'amber', Returned: 'green',
  Submitted: 'slate', 'Under Review': 'sky', 'More Information Required': 'orange', Approved: 'green', Rejected: 'red',
  'Ready for Handover': 'amber', 'Handed Over': 'green', Suggested: 'amber', Confirmed: 'green', Dismissed: 'slate',
};
export const StatusBadge = ({ status }: { status: string }) => (
  <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${TONE[BADGE[status] ?? 'slate']}`}>
    <span className="h-1.5 w-1.5 rounded-full bg-current" />{status}
  </span>
);

export const Loading = ({ label = 'Loading…' }: { label?: string }) => (
  <div className="flex items-center gap-3 p-8 text-sm text-muted" role="status">
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-found" />{label}
  </div>
);

export const ErrorState = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div className="panel border-lost/40 p-6" role="alert">
    <p className="font-semibold text-lost">Something went wrong</p>
    <p className="mt-1 text-sm text-ink/80">{message}</p>
    {onRetry && <button className="btn-ghost mt-3" onClick={onRetry}>Try again</button>}
  </div>
);

export const EmptyState = ({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) => (
  <div className="panel border-dashed p-10 text-center">
    <p className="font-semibold">{title}</p>
    {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const PageHeader = ({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) => (
  <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
    <div>
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1.5 max-w-prose text-sm text-muted">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>
);

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-medium text-lost" role="alert">{error}</span>}
    </label>
  );
}

export function ImagePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [err, setErr] = useState('');
  return (
    <div>
      <span className="mb-1 block text-sm font-semibold">Photo (optional)</span>
      <div className="flex items-start gap-4">
        <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-line bg-paper text-xs text-muted">
          {value ? <img src={value} alt="Item preview" className="h-full w-full object-cover" /> : 'No photo'}
        </div>
        <div className="space-y-2">
          <input type="file" accept="image/*" className="block text-sm" aria-label="Upload item photo"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try { setErr(''); onChange(await readImage(f)); } catch (x) { setErr((x as Error).message); }
            }} />
          {value && <button type="button" className="btn-ghost" onClick={() => onChange('')}>Remove photo</button>}
          {err && <p className="text-xs font-medium text-lost" role="alert">{err}</p>}
        </div>
      </div>
    </div>
  );
}

export function FilterBar({ value, onChange, categories, statuses, showDates = true, showLocation = true }: {
  value: FilterState; onChange: (f: FilterState) => void; categories: Category[]; statuses: readonly string[]; showDates?: boolean; showLocation?: boolean;
}) {
  const set = (k: keyof FilterState, v: string) => onChange({ ...value, [k]: v } as FilterState);
  return (
    <div className="panel mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="relative"><Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input className="input pl-9" placeholder="Search item name or description" aria-label="Search" value={value.q} onChange={(e) => set('q', e.target.value)} /></div>
      <select className="input" aria-label="Category" value={value.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
        <option value="">All categories</option>
        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      {showLocation && <input className="input" placeholder="Location" aria-label="Location" value={value.location} onChange={(e) => set('location', e.target.value)} />}
      <select className="input" aria-label="Status" value={value.status} onChange={(e) => set('status', e.target.value)}>
        <option value="">All statuses</option>
        {statuses.map((s) => <option key={s}>{s}</option>)}
      </select>
      {showDates && (
        <>
          <label className="flex items-center gap-2 text-xs text-muted">From
            <input type="date" className="input" value={value.dateFrom} max={value.dateTo || undefined} onChange={(e) => set('dateFrom', e.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-xs text-muted">To
            <input type="date" className="input" value={value.dateTo} min={value.dateFrom || undefined} onChange={(e) => set('dateTo', e.target.value)} />
          </label>
        </>
      )}
      <select className="input" aria-label="Sort" value={value.sort} onChange={(e) => set('sort', e.target.value)}>
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
      </select>
      <button className="btn-ghost" onClick={() => onChange(emptyFilters)}>Clear filters</button>
    </div>
  );
}

/** Ticket-style card: media header with a punched hole, perforated divider, details below. */
export function ItemCard({ to, kind, title, category, meta, status, image, extra }: {
  to: string; kind: 'lost' | 'found'; title: string; category: string; meta: string[]; status: string; image?: string; extra?: ReactNode;
}) {
  const lost = kind === 'lost';
  return (
    <div className="group relative flex animate-rise flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-lift">
      <Link to={to} aria-label={title} className={`relative block h-36 overflow-hidden ${image ? '' : lost ? 'bg-gradient-to-br from-lost to-orange-400' : 'bg-gradient-to-br from-found to-emerald-400'}`}>
        {image ? <img src={image} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
          : <Icon name={lost ? 'pin' : 'box'} className="absolute -bottom-3 right-3 h-28 w-28 text-white/25" />}
        <span className="absolute left-3 top-3 rounded-full bg-black/40 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">{lost ? 'Lost' : 'Found'} · {category}</span>
        <span className="absolute right-3 top-3 h-3 w-3 rounded-full bg-paper shadow-inner" aria-hidden />
      </Link>
      <div className="relative border-t-2 border-dashed border-line" aria-hidden>
        <span className="absolute -left-2.5 -top-[11px] h-5 w-5 rounded-full border border-line bg-paper" />
        <span className="absolute -right-2.5 -top-[11px] h-5 w-5 rounded-full border border-line bg-paper" />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <Link to={to} className="truncate text-base font-bold hover:underline">{title}</Link>
        <ul className="mt-1.5 flex-1 space-y-0.5 text-sm text-muted">{meta.map((m) => <li key={m} className="truncate">{m}</li>)}</ul>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2"><StatusBadge status={status} />{extra}</div>
      </div>
    </div>
  );
}

export const StatCard = ({ label, value, to, icon, tone = 'navy' }: { label: string; value: number | string; to?: string; icon: string; tone?: 'navy' | 'teal' | 'coral' | 'sun' }) => {
  const chip = { navy: 'bg-night text-white', teal: 'bg-found/15 text-found', coral: 'bg-lost/15 text-lost', sun: 'bg-tag/25 text-amber-700 dark:text-tag' }[tone];
  const body = (
    <>
      <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${chip}`}><Icon name={icon} /></span>
      <p className="mt-4 text-4xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-sm text-muted">{label}</p>
    </>
  );
  const cls = 'panel block animate-rise p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-lift';
  return to ? <Link to={to} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
};

export const Avatar = ({ name, className = 'h-9 w-9 text-sm' }: { name: string; className?: string }) => (
  <span className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-tag to-orange-400 font-bold text-night ${className}`}>
    {name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
  </span>
);

export function Timeline({ logs, users }: { logs: ActivityLog[]; users: User[] }) {
  if (!logs.length) return <p className="text-sm text-muted">No activity yet.</p>;
  const name = (id: number) => users.find((u) => u.id === id)?.name ?? 'Unknown';
  return (
    <ol className="space-y-4 border-l-2 border-line pl-5">
      {[...logs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((l) => (
        <li key={l.id} className="relative">
          <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-surface bg-tag ring-2 ring-tag/30" />
          <p className="text-sm font-semibold">{l.action}</p>
          {l.note && <p className="text-sm text-muted">{l.note}</p>}
          <p className="text-xs text-muted/80">{name(l.actorId)} · {fmtDateTime(l.createdAt)}</p>
        </li>
      ))}
    </ol>
  );
}

export const Detail = ({ label, children }: { label: string; children: ReactNode }) => (
  <div><dt className="text-xs font-semibold text-muted">{label}</dt><dd className="mt-0.5 text-sm">{children || '—'}</dd></div>
);

export const dateOrDash = fmtDate;
