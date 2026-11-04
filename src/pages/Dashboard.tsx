import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useLoad } from '../lib/hooks';
import { getList } from '../lib/api';
import type { AppNotification, Claim, LostReport, MatchSuggestion } from '../types';
import { ErrorState, Loading, StatCard, StatusBadge } from '../components/ui';
import Icon from '../components/Icon';
import { fmtDateTime } from '../lib/utils';

export default function Dashboard() {
  const { user, hasRole } = useAuth();
  const staff = hasRole('staff', 'admin');
  const { data, loading, error, reload } = useLoad(async () => {
    const [lost, claims, notes, matches, queue] = await Promise.all([
      getList<LostReport>('lostReports', { userId: user!.id }),
      getList<Claim>('claims', { userId: user!.id }),
      getList<AppNotification>('notifications', { userId: user!.id, _sort: 'createdAt', _order: 'desc', _limit: 5 }),
      getList<MatchSuggestion>('matchSuggestions', { status: 'Suggested' }),
      staff ? getList<Claim>('claims') : Promise.resolve([] as Claim[]),
    ]);
    const myLostIds = new Set(lost.map((l) => l.id));
    return {
      lost, claims, notes,
      myMatches: matches.filter((m) => myLostIds.has(m.lostId)).length,
      queue: queue.filter((c) => ['Submitted', 'Under Review'].includes(c.status)).length,
    };
  }, [user?.id]);

  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={error} onRetry={reload} />;

  const stats = [
    { label: 'Open lost reports', value: data.lost.filter((l) => ['Open', 'Matched'].includes(l.status)).length, to: '/lost', icon: 'pin', tone: 'coral' as const },
    { label: 'Matches to confirm', value: data.myMatches, to: '/search?tab=matches', icon: 'link', tone: 'teal' as const },
    { label: 'Active claims', value: data.claims.filter((c) => c.status !== 'Rejected').length, to: '/claims', icon: 'claim', tone: 'sun' as const },
    ...(staff ? [{ label: 'Claims waiting for review', value: data.queue, to: '/verification', icon: 'shield', tone: 'navy' as const }] : []),
  ];
  const needsInfo = data.claims.filter((c) => c.status === 'More Information Required');
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <section className="mesh relative mb-7 overflow-hidden rounded-3xl p-8 text-white shadow-lift sm:p-10">
        <p className="text-sm font-medium text-white/70">{greeting}</p>
        <h1 className="mt-1 text-4xl font-bold tracking-tight sm:text-5xl">{user!.name.split(' ')[0]}, what are we looking for?</h1>
        <p className="mt-3 max-w-lg text-white/70">Report something you lost, or register something you found. We'll suggest matches as soon as they exist.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/lost/new" className="btn bg-surface text-night hover:bg-white/90"><Icon name="pin" className="h-4 w-4" />Report lost item</Link>
          <Link to="/found/new" className="btn-tag"><Icon name="box" className="h-4 w-4" />Register found item</Link>
        </div>
      </section>

      <div className={`grid gap-4 sm:grid-cols-2 ${staff ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {needsInfo.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-orange-400/40 bg-orange-500/100/10 p-4 text-sm">
          <p className="font-semibold">Staff need more information on {needsInfo.length === 1 ? 'one of your claims' : `${needsInfo.length} of your claims`}.</p>
          <div className="flex gap-2">{needsInfo.map((c) => <Link key={c.id} className="btn-ghost py-1.5" to={`/claims/${c.id}`}>Open claim #{c.id}</Link>)}</div>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="panel p-6">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">Recent updates</h2><Link className="text-sm font-semibold text-found hover:underline" to="/notifications">See all</Link></div>
          {data.notes.length === 0 ? <p className="text-sm text-muted">Nothing yet. Updates on your reports and claims show up here.</p> : (
            <ul className="space-y-1">
              {data.notes.map((n) => (
                <li key={n.id}>
                  <Link to={n.link} className="flex items-start gap-3 rounded-xl p-2.5 transition hover:bg-paper">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-line' : 'bg-lost'}`} />
                    <span className="flex-1"><span className={`block text-sm ${n.read ? 'text-muted' : 'font-semibold'}`}>{n.message}</span><span className="text-xs text-muted/80">{fmtDateTime(n.createdAt)}</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="panel p-6">
          <h2 className="mb-4 text-lg font-bold">My lost reports</h2>
          {data.lost.length === 0 ? <p className="text-sm text-muted">No reports yet. <Link className="font-semibold text-found hover:underline" to="/lost/new">Report a lost item</Link>.</p> : (
            <ul className="space-y-1">
              {data.lost.slice(0, 5).map((l) => (
                <li key={l.id}>
                  <Link to={`/items/lost/${l.id}`} className="flex items-center justify-between gap-3 rounded-xl p-2.5 transition hover:bg-paper">
                    <span className="flex items-center gap-3 text-sm font-semibold"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-lost/10 text-lost"><Icon name="pin" className="h-4 w-4" /></span>{l.itemName}</span>
                    <StatusBadge status={l.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
