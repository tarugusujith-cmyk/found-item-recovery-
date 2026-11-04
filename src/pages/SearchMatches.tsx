import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useLoad } from '../lib/hooks';
import { errMsg, getList } from '../lib/api';
import { runMatching } from '../lib/matching';
import { confirmMatch, dismissMatch } from '../lib/matchActions';
import { useToast } from '../lib/toast';
import { FOUND_STATUSES, LOST_STATUSES, type Category, type FoundItem, type LostReport, type MatchSuggestion } from '../types';
import { EmptyState, ErrorState, FilterBar, ItemCard, Loading, PageHeader } from '../components/ui';
import MatchCard from '../components/MatchCard';
import { emptyFilters, filterSort, fmtDate } from '../lib/utils';

type Kind = 'all' | 'lost' | 'found';
const ALL_STATUSES = [...new Set([...LOST_STATUSES, ...FOUND_STATUSES])];

export default function SearchMatches() {
  const { user, hasRole } = useAuth();
  const staff = hasRole('staff', 'admin');
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'matches' ? 'matches' : 'search';
  const [f, setF] = useState(emptyFilters);
  const [kind, setKind] = useState<Kind>('all');
  const [busy, setBusy] = useState(false);

  const { data, loading, error, reload } = useLoad(async () => {
    const [lost, found, categories, matches] = await Promise.all([
      getList<LostReport>('lostReports'), getList<FoundItem>('foundItems'), getList<Category>('categories'), getList<MatchSuggestion>('matchSuggestions'),
    ]);
    return { lost, found, categories, matches };
  });

  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={error} onRetry={reload} />;

  const cat = (id: number) => data.categories.find((c) => c.id === id)?.name ?? 'Uncategorised';
  const lostRows = kind === 'found' ? [] : filterSort(data.lost, f, (r) => ({ categoryId: r.categoryId, location: r.lastSeenLocation, date: r.lastSeenDate, status: r.status, createdAt: r.createdAt, text: `${r.itemName} ${r.description}` }));
  const foundRows = kind === 'lost' ? [] : filterSort(data.found, f, (r) => ({ categoryId: r.categoryId, location: r.foundLocation, date: r.foundDate, status: r.status, createdAt: r.createdAt, text: `${r.itemName} ${r.description}` }));

  const myLostIds = new Set(data.lost.filter((l) => l.userId === user!.id).map((l) => l.id));
  const visibleMatches = data.matches
    .filter((m) => staff || myLostIds.has(m.lostId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  async function act(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try { await fn(); toast(ok); reload(); } catch (e) { toast(errMsg(e), 'error'); } finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader title="Search & possible matches" subtitle="Search every lost report and found item, or review matches we suggested from category, keywords, place and date."
        actions={staff ? <button className="btn-ghost" disabled={busy} onClick={() => act(async () => { const n = await runMatching(); toast(n ? `${n} new suggestion${n > 1 ? 's' : ''} created.` : 'No new matches found.'); }, 'Matching finished.')}>Run matching</button> : undefined} />

      <div className="mb-5 flex gap-1 border-b border-line" role="tablist">
        {(['search', 'matches'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setParams(t === 'search' ? {} : { tab: t })}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${tab === t ? 'border-ink' : 'border-transparent text-muted hover:text-ink'}`}>
            {t === 'search' ? 'Search listings' : `Possible matches (${visibleMatches.filter((m) => m.status === 'Suggested').length})`}
          </button>
        ))}
      </div>

      {tab === 'search' ? (
        <>
          <div className="mb-3 flex gap-2">
            {(['all', 'lost', 'found'] as Kind[]).map((k) => (
              <button key={k} onClick={() => setKind(k)} className={kind === k ? 'btn-primary' : 'btn-ghost'}>{k === 'all' ? 'All' : k === 'lost' ? 'Lost' : 'Found'}</button>
            ))}
          </div>
          <FilterBar value={f} onChange={setF} categories={data.categories} statuses={ALL_STATUSES} />
          {lostRows.length + foundRows.length === 0 ? (
            <EmptyState title="Nothing matches your search" hint="Try fewer words, another category, or a wider date range." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {foundRows.map((i) => <ItemCard key={`f${i.id}`} kind="found" to={`/items/found/${i.id}`} title={i.itemName} category={cat(i.categoryId)} status={i.status} image={i.image} meta={[`${i.foundLocation}, ${fmtDate(i.foundDate)}`]} />)}
              {lostRows.map((i) => <ItemCard key={`l${i.id}`} kind="lost" to={`/items/lost/${i.id}`} title={i.itemName} category={cat(i.categoryId)} status={i.status} image={i.image} meta={[`${i.lastSeenLocation}, ${fmtDate(i.lastSeenDate)}`]} />)}
            </div>
          )}
        </>
      ) : visibleMatches.length === 0 ? (
        <EmptyState title="No suggested matches yet" hint="When a found item looks like one of your lost reports, it appears here for you to confirm." />
      ) : (
        <div className="space-y-4">
          {visibleMatches.map((m) => (
            <MatchCard key={m.id} m={m} busy={busy}
              lost={data.lost.find((l) => l.id === m.lostId)} found={data.found.find((x) => x.id === m.foundId)}
              canAct={staff || myLostIds.has(m.lostId)}
              onConfirm={() => act(() => confirmMatch(m, user!.id), 'Match confirmed.')}
              onDismiss={() => act(() => dismissMatch(m, user!.id), 'Suggestion dismissed.')} />
          ))}
        </div>
      )}
    </>
  );
}
