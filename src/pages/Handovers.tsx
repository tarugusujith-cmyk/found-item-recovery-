import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useLoad } from '../lib/hooks';
import { errMsg, getList, patchOne } from '../lib/api';
import { logActivity, notify, nowIso } from '../lib/services';
import { useToast } from '../lib/toast';
import { HANDOVER_STATUSES, type Claim, type FoundItem, type Handover, type User } from '../types';
import { EmptyState, ErrorState, Field, Loading, PageHeader, StatusBadge } from '../components/ui';
import { fmtDate, isFuture, todayStr } from '../lib/utils';

export default function Handovers() {
  const { user } = useAuth();
  const toast = useToast();
  const [statusFilter, setStatusFilter] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);
  const [date, setDate] = useState(todayStr());
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const { data, loading, error, reload } = useLoad(async () => {
    const [handovers, claims, found, users] = await Promise.all([
      getList<Handover>('handovers'), getList<Claim>('claims'), getList<FoundItem>('foundItems'), getList<User>('users'),
    ]);
    return { handovers, claims, found, users };
  });
  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={error} onRetry={reload} />;

  const claimOf = (h: Handover) => data.claims.find((c) => c.id === h.claimId);
  const foundOf = (h: Handover) => data.found.find((x) => x.id === claimOf(h)?.foundId);
  const name = (id?: number | null) => data.users.find((u) => u.id === id)?.name ?? '—';
  const rows = data.handovers.filter((h) => !statusFilter || h.status === statusFilter).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  async function record(h: Handover) {
    setErr('');
    if (!date) return setErr('Choose the handover date.');
    if (isFuture(date)) return setErr('The handover date cannot be in the future.');
    setBusy(true);
    try {
      const c = claimOf(h)!;
      const f = foundOf(h)!;
      await patchOne('handovers', h.id, { status: 'Handed Over', handoverDate: date, verifierId: user!.id, notes: notes.trim() });
      await patchOne('foundItems', f.id, { status: 'Returned', updatedAt: nowIso() });
      await logActivity('claim', c.id, 'Handover recorded', user!.id, `Handed over on ${date}${notes.trim() ? `. ${notes.trim()}` : ''}`);
      await logActivity('found', f.id, 'Status changed to Returned', user!.id, `Claim #${c.id}`);
      if (c.lostId) {
        await patchOne('lostReports', c.lostId, { status: 'Resolved', updatedAt: nowIso() });
        await logActivity('lost', c.lostId, 'Status changed to Resolved', user!.id, 'Item returned to owner');
      }
      await notify(c.userId, 'handover', `${f.itemName} was handed over to you on ${fmtDate(date)}.`, `/claims/${c.id}`);
      toast('Handover recorded.');
      setOpenId(null); setNotes('');
      reload();
    } catch (e) { setErr(errMsg(e)); } finally { setBusy(false); }
  }

  async function close(h: Handover) {
    setBusy(true);
    try {
      const c = claimOf(h)!;
      const f = foundOf(h)!;
      await patchOne('handovers', h.id, { status: 'Closed' });
      await patchOne('foundItems', f.id, { status: 'Closed', updatedAt: nowIso() });
      await logActivity('claim', c.id, 'Handover closed', user!.id);
      await logActivity('found', f.id, 'Status changed to Closed', user!.id);
      toast('Case closed.');
      reload();
    } catch (e) { toast(errMsg(e), 'error'); } finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader title="Handover management" subtitle="Approved claims move from Ready for Handover to Handed Over, then Closed."
        actions={<select className="input" aria-label="Filter by handover status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">All statuses</option>{HANDOVER_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>} />
      {rows.length === 0 ? <EmptyState title="No handovers yet" hint="Approve a claim and it will appear here as Ready for Handover." /> : (
        <div className="space-y-4">
          {rows.map((h) => (
            <div key={h.id} className="panel p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold">{foundOf(h)?.itemName ?? 'Item'} <span className="font-normal text-muted">→ {name(claimOf(h)?.userId)}</span></p>
                  <p className="text-sm text-muted">
                    <Link className="underline" to={`/claims/${h.claimId}`}>Claim #{h.claimId}</Link>
                    {h.handoverDate && ` · Handed over ${fmtDate(h.handoverDate)} · Verified by ${name(h.verifierId)}`}
                    {foundOf(h) && h.status === 'Ready for Handover' && ` · Stored at ${foundOf(h)!.storageLocation}`}
                  </p>
                  {h.notes && <p className="mt-1 text-sm text-muted">{h.notes}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={h.status} />
                  {h.status === 'Ready for Handover' && <button className="btn-primary" onClick={() => { setOpenId(openId === h.id ? null : h.id); setErr(''); }}>Record handover</button>}
                  {h.status === 'Handed Over' && <button className="btn-ghost" disabled={busy} onClick={() => close(h)}>Close case</button>}
                </div>
              </div>
              {openId === h.id && (
                <div className="mt-4 grid gap-4 border-t border-line pt-4 sm:grid-cols-3">
                  <Field label="Handover date"><input type="date" className="input" max={todayStr()} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
                  <Field label="Verified by"><input className="input bg-paper" value={user!.name} readOnly /></Field>
                  <Field label="Notes (ID checked, who collected)"><input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
                  <div className="sm:col-span-3">
                    {err && <p className="mb-2 text-xs font-medium text-lost" role="alert">{err}</p>}
                    <button className="btn-tag" disabled={busy} onClick={() => record(h)}>{busy ? 'Saving…' : 'Confirm handover'}</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
