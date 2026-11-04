import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useLoad } from '../lib/hooks';
import { errMsg, getList, getOne, patchOne } from '../lib/api';
import { logActivity, nowIso } from '../lib/services';
import { confirmMatch, dismissMatch } from '../lib/matchActions';
import { useToast } from '../lib/toast';
import { FOUND_STATUSES, LOST_STATUSES, type ActivityLog, type Category, type Claim, type FoundItem, type LostReport, type MatchSuggestion, type User } from '../types';
import { Detail, ErrorState, Loading, PageHeader, StatusBadge, Timeline } from '../components/ui';
import MatchCard from '../components/MatchCard';
import { fmtDate } from '../lib/utils';

export default function ItemDetails() {
  const { kind, id } = useParams();
  const isLost = kind === 'lost';
  const { user, hasRole } = useAuth();
  const staff = hasRole('staff', 'admin');
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const { data, loading, error, reload } = useLoad(async () => {
    const [item, categories, users, logs, matches, lostAll, foundAll, claims] = await Promise.all([
      getOne<LostReport & FoundItem>(isLost ? 'lostReports' : 'foundItems', id!),
      getList<Category>('categories'), getList<User>('users'),
      getList<ActivityLog>('activityLogs', { entityType: isLost ? 'lost' : 'found', entityId: id }),
      getList<MatchSuggestion>('matchSuggestions', isLost ? { lostId: id } : { foundId: id }),
      getList<LostReport>('lostReports'), getList<FoundItem>('foundItems'),
      isLost ? Promise.resolve([] as Claim[]) : getList<Claim>('claims', { foundId: id }),
    ]);
    return { item, categories, users, logs, matches, lostAll, foundAll, claims };
  }, [kind, id]);

  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={error} onRetry={reload} />;
  const { item } = data;
  const owner = isLost && item.userId === user!.id;
  const canManage = staff || owner;
  const category = data.categories.find((c) => c.id === item.categoryId)?.name ?? '—';
  const person = (uid: number) => data.users.find((u) => u.id === uid)?.name ?? 'Unknown';
  const myClaim = data.claims.find((c) => c.userId === user!.id && c.status !== 'Rejected');

  async function setStatus(status: string) {
    setBusy(true);
    try {
      await patchOne(isLost ? 'lostReports' : 'foundItems', item.id, { status, updatedAt: nowIso() });
      await logActivity(isLost ? 'lost' : 'found', item.id, `Status changed to ${status}`, user!.id);
      toast('Status updated.');
      reload();
    } catch (e) { toast(errMsg(e), 'error'); } finally { setBusy(false); }
  }
  async function act(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try { await fn(); toast(ok); reload(); } catch (e) { toast(errMsg(e), 'error'); } finally { setBusy(false); }
  }

  const actions = (
    <>
      {canManage && <Link to={isLost ? `/lost/${item.id}/edit` : `/found/${item.id}/edit`} className={`btn-ghost ${!isLost && !staff ? 'hidden' : ''}`}>Edit</Link>}
      {!isLost && ['In Storage', 'Claim Pending'].includes(item.status) && !myClaim && (
        <Link to={`/claims/new?foundId=${item.id}`} className="btn-tag">Claim this item</Link>
      )}
      {myClaim && <Link to={`/claims/${myClaim.id}`} className="btn-tag">View my claim</Link>}
    </>
  );

  return (
    <>
      <PageHeader title={item.itemName} subtitle={`${isLost ? 'Lost report' : 'Found item'} #${item.id} · ${category}`} actions={actions} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="panel p-5">
            <div className="flex flex-col gap-5 sm:flex-row">
              {item.image && <img src={item.image} alt={item.itemName} className="h-48 w-full rounded object-cover sm:w-48" />}
              <dl className="grid flex-1 gap-4 sm:grid-cols-2">
                <Detail label="Status"><StatusBadge status={item.status} /></Detail>
                <Detail label="Category">{category}</Detail>
                <div className="sm:col-span-2"><Detail label="Description">{item.description}</Detail></div>
                {isLost ? (
                  <>
                    <Detail label="Last seen at">{item.lastSeenLocation}</Detail>
                    <Detail label="Last seen on">{fmtDate(item.lastSeenDate)}</Detail>
                    {canManage ? <div className="sm:col-span-2"><Detail label="Identifying details (private)">{item.identifyingDetails}</Detail></div> : null}
                    {canManage ? <Detail label="Contact preference">{item.contactPreference}</Detail> : null}
                    <Detail label="Reported by">{person(item.userId)}</Detail>
                  </>
                ) : (
                  <>
                    <Detail label="Found at">{item.foundLocation}</Detail>
                    <Detail label="Found on">{fmtDate(item.foundDate)}</Detail>
                    {staff ? <Detail label="Storage location">{item.storageLocation}</Detail> : null}
                    <Detail label="Registered by">{person(item.reportedBy)}</Detail>
                  </>
                )}
              </dl>
            </div>
            {canManage && (
              <div className="mt-5 flex items-center gap-3 border-t border-line pt-4">
                <label className="text-sm font-semibold" htmlFor="st">Update status</label>
                <select id="st" className="input max-w-[200px]" value={item.status} disabled={busy || (!isLost && !staff)} onChange={(e) => setStatus(e.target.value)}>
                  {(isLost ? LOST_STATUSES : FOUND_STATUSES).map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            )}
          </section>

          {data.matches.length > 0 && (
            <section>
              <h2 className="mb-3 font-bold">Possible matches</h2>
              <div className="space-y-3">
                {data.matches.filter((m) => staff || data.lostAll.find((l) => l.id === m.lostId)?.userId === user!.id).map((m) => (
                  <MatchCard key={m.id} m={m} busy={busy}
                    lost={data.lostAll.find((l) => l.id === m.lostId)} found={data.foundAll.find((x) => x.id === m.foundId)}
                    canAct={staff || data.lostAll.find((l) => l.id === m.lostId)?.userId === user!.id}
                    onConfirm={() => act(() => confirmMatch(m, user!.id), 'Match confirmed.')}
                    onDismiss={() => act(() => dismissMatch(m, user!.id), 'Suggestion dismissed.')} />
                ))}
              </div>
            </section>
          )}

          {staff && !isLost && data.claims.length > 0 && (
            <section className="panel p-5">
              <h2 className="mb-3 font-bold">Claims on this item</h2>
              <ul className="divide-y divide-line text-sm">
                {data.claims.map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-2"><Link className="font-semibold hover:underline" to={`/claims/${c.id}`}>Claim #{c.id} by {person(c.userId)}</Link><StatusBadge status={c.status} /></li>
                ))}
              </ul>
            </section>
          )}
        </div>
        <aside className="panel h-fit p-5">
          <h2 className="mb-3 font-bold">Activity history</h2>
          <Timeline logs={data.logs} users={data.users} />
        </aside>
      </div>
    </>
  );
}
