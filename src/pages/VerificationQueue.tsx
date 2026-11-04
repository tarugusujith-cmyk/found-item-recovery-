import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLoad } from '../lib/hooks';
import { getList } from '../lib/api';
import { CLAIM_STATUSES, type Category, type Claim, type FoundItem, type User } from '../types';
import { EmptyState, ErrorState, FilterBar, Loading, PageHeader, StatusBadge } from '../components/ui';
import { emptyFilters, filterSort, fmtDateTime } from '../lib/utils';

const ACTIVE = ['Submitted', 'Under Review', 'More Information Required'];

export default function VerificationQueue() {
  const [f, setF] = useState(emptyFilters);
  const [onlyActive, setOnlyActive] = useState(true);
  const { data, loading, error, reload } = useLoad(async () => {
    const [claims, found, users, categories] = await Promise.all([
      getList<Claim>('claims'), getList<FoundItem>('foundItems'), getList<User>('users'), getList<Category>('categories'),
    ]);
    return { claims, found, users, categories };
  });
  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={error} onRetry={reload} />;

  const foundOf = (c: Claim) => data.found.find((x) => x.id === c.foundId);
  const base = onlyActive && !f.status ? data.claims.filter((c) => ACTIVE.includes(c.status)) : data.claims;
  const rows = filterSort(base, f, (c) => ({
    categoryId: foundOf(c)?.categoryId ?? 0, location: foundOf(c)?.foundLocation ?? '', date: c.createdAt.slice(0, 10), status: c.status, createdAt: c.createdAt,
    text: `${foundOf(c)?.itemName ?? ''} ${data.users.find((u) => u.id === c.userId)?.name ?? ''}`,
  }));

  return (
    <>
      <PageHeader title="Claim verification queue" subtitle="Review claims, ask for proof and approve or reject."
        actions={<label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} />Only claims that need action</label>} />
      <FilterBar value={f} onChange={setF} categories={data.categories} statuses={CLAIM_STATUSES} showDates={false} />
      {rows.length === 0 ? (
        <EmptyState title={onlyActive ? 'No claims need review' : 'No claims match these filters'} hint="New claims will show up here as users submit them." />
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line bg-paper text-xs font-semibold text-muted">
              <tr><th className="p-3">Claim</th><th className="p-3">Item</th><th className="p-3">Claimant</th><th className="p-3">Submitted</th><th className="p-3">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-paper">
                  <td className="p-3 font-semibold"><Link className="underline" to={`/claims/${c.id}`}>#{c.id}</Link></td>
                  <td className="p-3">{foundOf(c)?.itemName ?? 'Removed'}</td>
                  <td className="p-3">{data.users.find((u) => u.id === c.userId)?.name}</td>
                  <td className="p-3 text-muted">{fmtDateTime(c.createdAt)}</td>
                  <td className="p-3"><StatusBadge status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
