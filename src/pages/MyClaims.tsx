import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useLoad } from '../lib/hooks';
import { getList } from '../lib/api';
import { CLAIM_STATUSES, type Category, type Claim, type FoundItem, type Handover } from '../types';
import { EmptyState, ErrorState, FilterBar, Loading, PageHeader, StatusBadge } from '../components/ui';
import { emptyFilters, filterSort, fmtDate } from '../lib/utils';

export default function MyClaims() {
  const { user } = useAuth();
  const [f, setF] = useState(emptyFilters);
  const { data, loading, error, reload } = useLoad(async () => {
    const [claims, found, categories, handovers] = await Promise.all([
      getList<Claim>('claims', { userId: user!.id }), getList<FoundItem>('foundItems'), getList<Category>('categories'), getList<Handover>('handovers'),
    ]);
    return { claims, found, categories, handovers };
  }, [user?.id]);

  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={error} onRetry={reload} />;

  const foundOf = (c: Claim) => data.found.find((x) => x.id === c.foundId);
  const rows = filterSort(data.claims, f, (c) => ({
    categoryId: foundOf(c)?.categoryId ?? 0, location: foundOf(c)?.foundLocation ?? '', date: c.createdAt.slice(0, 10), status: c.status, createdAt: c.createdAt, text: foundOf(c)?.itemName ?? '',
  }));

  return (
    <>
      <PageHeader title="My claims" subtitle="Track each ownership claim from submission to handover."
        actions={<Link to="/found" className="btn-tag">Browse found items</Link>} />
      <FilterBar value={f} onChange={setF} categories={data.categories} statuses={CLAIM_STATUSES} showLocation={false} />
      {data.claims.length === 0 ? (
        <EmptyState title="You haven't submitted any claims" hint="Find your item in the found list and choose Claim this item." action={<Link to="/found" className="btn-primary">Browse found items</Link>} />
      ) : rows.length === 0 ? (
        <EmptyState title="No claims match these filters" />
      ) : (
        <div className="panel divide-y divide-line">
          {rows.map((c) => {
            const h = data.handovers.find((x) => x.claimId === c.id);
            return (
              <Link key={c.id} to={`/claims/${c.id}`} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-paper">
                <div>
                  <p className="font-bold">{foundOf(c)?.itemName ?? 'Item removed'}</p>
                  <p className="text-sm text-muted">Claim #{c.id} · Submitted {fmtDate(c.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2"><StatusBadge status={c.status} />{h && <StatusBadge status={h.status} />}</div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
