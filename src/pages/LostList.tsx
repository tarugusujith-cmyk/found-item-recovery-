import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useLoad } from '../lib/hooks';
import { getList, patchOne, errMsg } from '../lib/api';
import { logActivity, nowIso } from '../lib/services';
import { useToast } from '../lib/toast';
import { LOST_STATUSES, type Category, type LostReport, type User } from '../types';
import { EmptyState, ErrorState, FilterBar, ItemCard, Loading, PageHeader } from '../components/ui';
import { emptyFilters, filterSort, fmtDate } from '../lib/utils';

export default function LostList() {
  const { user, hasRole } = useAuth();
  const staff = hasRole('staff', 'admin');
  const toast = useToast();
  const [f, setF] = useState(emptyFilters);
  const { data, loading, error, reload } = useLoad(async () => {
    const [reports, categories, users] = await Promise.all([
      getList<LostReport>('lostReports', staff ? {} : { userId: user!.id }),
      getList<Category>('categories'),
      getList<User>('users'),
    ]);
    return { reports, categories, users };
  }, [user?.id]);

  async function close(r: LostReport) {
    if (!confirm(`Close the report for "${r.itemName}"?`)) return;
    try {
      await patchOne('lostReports', r.id, { status: 'Closed', updatedAt: nowIso() });
      await logActivity('lost', r.id, 'Status changed to Closed', user!.id);
      toast('Report closed.');
      reload();
    } catch (e) { toast(errMsg(e), 'error'); }
  }

  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={error} onRetry={reload} />;

  const cat = (id: number) => data.categories.find((c) => c.id === id)?.name ?? 'Uncategorised';
  const owner = (id: number) => data.users.find((u) => u.id === id)?.name ?? 'Unknown';
  const rows = filterSort(data.reports, f, (r) => ({
    categoryId: r.categoryId, location: r.lastSeenLocation, date: r.lastSeenDate, status: r.status, createdAt: r.createdAt,
    text: `${r.itemName} ${r.description}`,
  }));

  return (
    <>
      <PageHeader title={staff ? 'All lost reports' : 'My lost reports'} subtitle="Track each report and what has happened to it."
        actions={<Link to="/lost/new" className="btn-primary">Report lost item</Link>} />
      <FilterBar value={f} onChange={setF} categories={data.categories} statuses={LOST_STATUSES} />
      {data.reports.length === 0 ? (
        <EmptyState title="You haven't reported anything lost" hint="Add what it looks like and where you last saw it. We will suggest matches from found items." action={<Link to="/lost/new" className="btn-primary">Report lost item</Link>} />
      ) : rows.length === 0 ? (
        <EmptyState title="No reports match these filters" hint="Clear a filter or widen the date range." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <ItemCard key={r.id} kind="lost" to={`/items/lost/${r.id}`} title={r.itemName} category={cat(r.categoryId)} status={r.status} image={r.image}
              meta={[`Last seen: ${r.lastSeenLocation}, ${fmtDate(r.lastSeenDate)}`, ...(staff ? [`Reported by ${owner(r.userId)}`] : [])]}
              extra={(r.userId === user!.id || staff) && !['Closed', 'Resolved'].includes(r.status) ? (
                <>
                  <Link to={`/lost/${r.id}/edit`} className="text-xs font-semibold underline">Edit</Link>
                  <button className="text-xs font-semibold text-lost underline" onClick={() => close(r)}>Close</button>
                </>
              ) : null} />
          ))}
        </div>
      )}
    </>
  );
}
