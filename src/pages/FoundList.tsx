import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useLoad } from '../lib/hooks';
import { getList } from '../lib/api';
import { FOUND_STATUSES, type Category, type FoundItem } from '../types';
import { EmptyState, ErrorState, FilterBar, ItemCard, Loading, PageHeader } from '../components/ui';
import { emptyFilters, filterSort, fmtDate } from '../lib/utils';

export default function FoundList() {
  const { hasRole } = useAuth();
  const staff = hasRole('staff', 'admin');
  const [f, setF] = useState(emptyFilters);
  const { data, loading, error, reload } = useLoad(async () => {
    const [items, categories] = await Promise.all([getList<FoundItem>('foundItems'), getList<Category>('categories')]);
    return { items, categories };
  });
  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={error} onRetry={reload} />;

  const cat = (id: number) => data.categories.find((c) => c.id === id)?.name ?? 'Uncategorised';
  const rows = filterSort(data.items, f, (i) => ({
    categoryId: i.categoryId, location: i.foundLocation, date: i.foundDate, status: i.status, createdAt: i.createdAt, text: `${i.itemName} ${i.description}`,
  }));

  return (
    <>
      <PageHeader title="Found items" subtitle="Items handed in or found around the premises. Claim the one that is yours."
        actions={<Link to="/found/new" className="btn-tag">Register found item</Link>} />
      <FilterBar value={f} onChange={setF} categories={data.categories} statuses={FOUND_STATUSES} />
      {data.items.length === 0 ? (
        <EmptyState title="No found items registered yet" hint="Register anything you find so its owner can claim it." action={<Link to="/found/new" className="btn-tag">Register found item</Link>} />
      ) : rows.length === 0 ? (
        <EmptyState title="No found items match these filters" hint="Clear a filter or widen the date range." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((i) => (
            <ItemCard key={i.id} kind="found" to={`/items/found/${i.id}`} title={i.itemName} category={cat(i.categoryId)} status={i.status} image={i.image}
              meta={[`Found: ${i.foundLocation}, ${fmtDate(i.foundDate)}`, ...(staff ? [`Stored at ${i.storageLocation}`] : [])]}
              extra={i.status === 'In Storage' || i.status === 'Claim Pending' ? <Link to={`/claims/new?foundId=${i.id}`} className="text-xs font-semibold underline">Claim this item</Link> : null} />
          ))}
        </div>
      )}
    </>
  );
}
