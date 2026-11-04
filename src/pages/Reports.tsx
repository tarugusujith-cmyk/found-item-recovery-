import { useLoad } from '../lib/hooks';
import { getList } from '../lib/api';
import { CLAIM_STATUSES, FOUND_STATUSES, LOST_STATUSES, type Category, type Claim, type FoundItem, type Handover, type LostReport, type User } from '../types';
import { EmptyState, ErrorState, Loading, PageHeader, StatusBadge } from '../components/ui';
import { fmtDate } from '../lib/utils';

function Bars({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[150px_1fr_28px] items-center gap-3 text-sm">
          <span className="truncate">{r.label}</span>
          <span className="h-2.5 rounded-full bg-paper"><span className="block h-full rounded-full bg-gradient-to-r from-found to-tag" style={{ width: `${(r.value / max) * 100}%` }} /></span>
          <span className="text-right font-semibold">{r.value}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Reports() {
  const { data, loading, error, reload } = useLoad(async () => {
    const [lost, found, claims, handovers, categories, users] = await Promise.all([
      getList<LostReport>('lostReports'), getList<FoundItem>('foundItems'), getList<Claim>('claims'), getList<Handover>('handovers'), getList<Category>('categories'), getList<User>('users'),
    ]);
    return { lost, found, claims, handovers, categories, users };
  });
  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={error} onRetry={reload} />;

  const name = (id?: number | null) => data.users.find((u) => u.id === id)?.name ?? '—';
  const history = data.handovers.filter((h) => h.status !== 'Ready for Handover').sort((a, b) => (b.handoverDate ?? '').localeCompare(a.handoverDate ?? ''));
  const itemOf = (h: Handover) => { const c = data.claims.find((x) => x.id === h.claimId); return { c, f: data.found.find((x) => x.id === c?.foundId) }; };

  return (
    <>
      <PageHeader title="Reports" subtitle="Summaries by status and category, plus the handover history." />
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="panel p-5"><h2 className="mb-4 font-bold">Lost reports by status</h2><Bars rows={LOST_STATUSES.map((s) => ({ label: s, value: data.lost.filter((l) => l.status === s).length }))} /></section>
        <section className="panel p-5"><h2 className="mb-4 font-bold">Found items by status</h2><Bars rows={FOUND_STATUSES.map((s) => ({ label: s, value: data.found.filter((l) => l.status === s).length }))} /></section>
        <section className="panel p-5"><h2 className="mb-4 font-bold">Claims by status</h2><Bars rows={CLAIM_STATUSES.map((s) => ({ label: s, value: data.claims.filter((l) => l.status === s).length }))} /></section>
      </div>

      <section className="panel mt-6 overflow-x-auto">
        <h2 className="p-5 pb-3 font-bold">Category-wise report</h2>
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="border-y border-line bg-paper text-xs font-semibold text-muted"><tr><th className="p-3 pl-5">Category</th><th className="p-3">Lost</th><th className="p-3">Found</th><th className="p-3">Claims</th></tr></thead>
          <tbody className="divide-y divide-line">
            {data.categories.map((c) => (
              <tr key={c.id}>
                <td className="p-3 pl-5 font-semibold">{c.name}</td>
                <td className="p-3">{data.lost.filter((l) => l.categoryId === c.id).length}</td>
                <td className="p-3">{data.found.filter((l) => l.categoryId === c.id).length}</td>
                <td className="p-3">{data.claims.filter((cl) => data.found.find((f) => f.id === cl.foundId)?.categoryId === c.id).length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel mt-6 overflow-x-auto">
        <h2 className="p-5 pb-3 font-bold">Handover history</h2>
        {history.length === 0 ? <div className="p-5 pt-0"><EmptyState title="No completed handovers yet" /></div> : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-y border-line bg-paper text-xs font-semibold text-muted"><tr><th className="p-3 pl-5">Item</th><th className="p-3">Returned to</th><th className="p-3">Date</th><th className="p-3">Verifier</th><th className="p-3">Status</th></tr></thead>
            <tbody className="divide-y divide-line">
              {history.map((h) => { const { c, f } = itemOf(h); return (
                <tr key={h.id}><td className="p-3 pl-5 font-semibold">{f?.itemName ?? '—'}</td><td className="p-3">{name(c?.userId)}</td><td className="p-3">{fmtDate(h.handoverDate)}</td><td className="p-3">{name(h.verifierId)}</td><td className="p-3"><StatusBadge status={h.status} /></td></tr>
              ); })}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
