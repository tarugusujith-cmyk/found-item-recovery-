import { Link } from 'react-router-dom';
import { useLoad } from '../lib/hooks';
import { getList } from '../lib/api';
import { CLAIM_STATUSES, type ActivityLog, type Claim, type FoundItem, type Handover, type LostReport, type User } from '../types';
import { ErrorState, Loading, PageHeader, StatCard, Timeline } from '../components/ui';
import Icon from '../components/Icon';

const SEG: Record<string, string> = {
  Submitted: 'bg-slate-400', 'Under Review': 'bg-sky-500', 'More Information Required': 'bg-orange-500/100', Approved: 'bg-emerald-500', Rejected: 'bg-lost',
};

export default function AdminDashboard() {
  const { data, loading, error, reload } = useLoad(async () => {
    const [lost, found, claims, handovers, logs, users] = await Promise.all([
      getList<LostReport>('lostReports'), getList<FoundItem>('foundItems'), getList<Claim>('claims'), getList<Handover>('handovers'),
      getList<ActivityLog>('activityLogs', { _sort: 'createdAt', _order: 'desc', _limit: 8 }), getList<User>('users'),
    ]);
    return { lost, found, claims, handovers, logs, users };
  });
  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={error} onRetry={reload} />;

  const { claims } = data;
  const cards = [
    { label: 'Total lost reports', value: data.lost.length, to: '/lost', icon: 'pin', tone: 'coral' as const },
    { label: 'Found items', value: data.found.length, to: '/found', icon: 'box', tone: 'teal' as const },
    { label: 'Open claims', value: claims.filter((c) => ['Submitted', 'Under Review', 'More Information Required'].includes(c.status)).length, to: '/verification', icon: 'claim', tone: 'sun' as const },
    { label: 'Pending verification', value: claims.filter((c) => ['Submitted', 'Under Review'].includes(c.status)).length, to: '/verification', icon: 'clock', tone: 'navy' as const },
    { label: 'Approved claims', value: claims.filter((c) => c.status === 'Approved').length, to: '/handovers', icon: 'check', tone: 'teal' as const },
    { label: 'Completed handovers', value: data.handovers.filter((h) => ['Handed Over', 'Closed'].includes(h.status)).length, to: '/handovers', icon: 'swap', tone: 'navy' as const },
  ];
  const total = Math.max(1, claims.length);

  return (
    <>
      <PageHeader title="Overview" subtitle="Where reports, claims and handovers stand right now."
        actions={<Link to="/admin/reports" className="btn-primary"><Icon name="chart" className="h-4 w-4" />Open reports</Link>} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{cards.map((c) => <StatCard key={c.label} {...c} />)}</div>

      <section className="panel mt-6 p-6">
        <h2 className="text-lg font-bold">Claim pipeline</h2>
        <div className="mt-4 flex h-4 overflow-hidden rounded-full bg-paper" role="img" aria-label="Claims by status">
          {CLAIM_STATUSES.map((s) => { const n = claims.filter((c) => c.status === s).length; return n ? <span key={s} className={SEG[s]} style={{ width: `${(n / total) * 100}%` }} title={`${s}: ${n}`} /> : null; })}
        </div>
        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {CLAIM_STATUSES.map((s) => (
            <li key={s} className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${SEG[s]}`} />{s}<span className="font-bold">{claims.filter((c) => c.status === s).length}</span></li>
          ))}
        </ul>
      </section>

      <section className="panel mt-6 p-6">
        <h2 className="mb-5 text-lg font-bold">Latest activity</h2>
        <Timeline logs={data.logs} users={data.users} />
      </section>
    </>
  );
}
