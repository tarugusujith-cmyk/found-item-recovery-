import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useLoad } from '../lib/hooks';
import { createOne, errMsg, getList, getOne, patchOne } from '../lib/api';
import { logActivity, notify, notifyRoles, nowIso } from '../lib/services';
import { useToast } from '../lib/toast';
import type { ActivityLog, Claim, ClaimStatus, FoundItem, Handover, LostReport, User, Verification } from '../types';
import { Detail, ErrorState, Loading, PageHeader, StatusBadge, Timeline } from '../components/ui';
import { fmtDate, fmtDateTime } from '../lib/utils';

export default function ClaimDetail() {
  const { id } = useParams();
  const { user, hasRole } = useAuth();
  const staff = hasRole('staff', 'admin');
  const toast = useToast();
  const [note, setNote] = useState('');
  const [reply, setReply] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const { data, loading, error, reload } = useLoad(async () => {
    const claim = await getOne<Claim>('claims', id!);
    const [found, lost, claimant, users, verifications, handovers, logs, siblings] = await Promise.all([
      getOne<FoundItem>('foundItems', claim.foundId),
      claim.lostId ? getOne<LostReport>('lostReports', claim.lostId).catch(() => null) : Promise.resolve(null),
      getOne<User>('users', claim.userId), getList<User>('users'),
      getList<Verification>('verifications', { claimId: id }),
      getList<Handover>('handovers', { claimId: id }),
      getList<ActivityLog>('activityLogs', { entityType: 'claim', entityId: id }),
      getList<Claim>('claims', { foundId: claim.foundId }),
    ]);
    return { claim, found, lost, claimant, users, verifications, handovers, logs, siblings };
  }, [id]);

  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={error} onRetry={reload} />;
  const { claim, found, lost, claimant } = data;
  const handover = data.handovers[0];
  if (!staff && claim.userId !== user!.id) return <ErrorState message="You can only view your own claims." />;

  async function changeStatus(status: ClaimStatus) {
    setErr('');
    if (['More Information Required', 'Rejected'].includes(status) && note.trim().length < 5) {
      setErr(status === 'Rejected' ? 'Give a reason for rejecting this claim.' : 'Say what proof or detail you need.');
      return;
    }
    if (status === 'Approved' && data!.siblings.some((c) => c.id !== claim.id && c.status === 'Approved')) {
      setErr('Another claim on this item is already approved.');
      return;
    }
    setBusy(true);
    try {
      const text = note.trim();
      await patchOne('claims', claim.id, { status, updatedAt: nowIso() });
      await createOne('verifications', { claimId: claim.id, verifierId: user!.id, action: status, note: text, createdAt: nowIso() });
      await logActivity('claim', claim.id, `Status changed to ${status}`, user!.id, text);

      if (status === 'Approved') {
        await createOne('handovers', { claimId: claim.id, status: 'Ready for Handover', handoverDate: null, verifierId: null, notes: '', createdAt: nowIso() });
        await notify(claim.userId, 'handover', `Your claim for ${found.itemName} was approved. It is ready for handover.`, `/claims/${claim.id}`);
      } else if (status === 'More Information Required') {
        await notify(claim.userId, 'info', `More information is needed for your claim on ${found.itemName}.`, `/claims/${claim.id}`);
      } else if (status === 'Rejected') {
        const others = data!.siblings.some((c) => c.id !== claim.id && ['Submitted', 'Under Review', 'More Information Required', 'Approved'].includes(c.status));
        if (!others) { await patchOne('foundItems', found.id, { status: 'In Storage', updatedAt: nowIso() }); await logActivity('found', found.id, 'Status changed to In Storage', user!.id, `Claim #${claim.id} rejected`); }
        await notify(claim.userId, 'claim', `Your claim for ${found.itemName} was rejected.`, `/claims/${claim.id}`);
      } else {
        await notify(claim.userId, 'claim', `Your claim for ${found.itemName} is now ${status.toLowerCase()}.`, `/claims/${claim.id}`);
      }
      setNote('');
      toast(`Claim marked ${status}.`);
      reload();
    } catch (e) { setErr(errMsg(e)); } finally { setBusy(false); }
  }

  async function respond() {
    setErr('');
    if (reply.trim().length < 5) { setErr('Write your answer to the staff request (at least 5 characters).'); return; }
    setBusy(true);
    try {
      const info = [...(claim.additionalInfo ?? []), { text: reply.trim(), createdAt: nowIso() }];
      await patchOne('claims', claim.id, { additionalInfo: info, status: 'Under Review', updatedAt: nowIso() });
      await logActivity('claim', claim.id, 'Additional information provided', user!.id, reply.trim());
      await notifyRoles(['staff', 'admin'], 'info', `${claimant.name} replied on the claim for ${found.itemName}.`, `/claims/${claim.id}`);
      setReply('');
      toast('Reply sent. Your claim is back under review.');
      reload();
    } catch (e) { setErr(errMsg(e)); } finally { setBusy(false); }
  }

  const person = (uid: number | null) => data!.users.find((u) => u.id === uid)?.name ?? '—';
  const finalState = ['Approved', 'Rejected'].includes(claim.status);

  return (
    <>
      <PageHeader title={`Claim #${claim.id}`} subtitle={`For ${found.itemName}`} actions={<Link to={`/items/found/${found.id}`} className="btn-ghost">View found item</Link>} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="panel p-5">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Detail label="Claim status"><StatusBadge status={claim.status} /></Detail>
              <Detail label="Claimant">{claimant.name}</Detail>
              <Detail label="Submitted">{fmtDateTime(claim.createdAt)}</Detail>
              <Detail label="Linked lost report">{lost ? <Link className="underline" to={`/items/lost/${lost.id}`}>{lost.itemName}</Link> : 'None'}</Detail>
              <div className="sm:col-span-2"><Detail label="Identifying details">{claim.identifyingDetails}</Detail></div>
              <div className="sm:col-span-2"><Detail label="Proof notes">{claim.proofNotes}</Detail></div>
              {(claim.additionalInfo ?? []).map((a, i) => (
                <div key={i} className="sm:col-span-2"><Detail label={`Additional information · ${fmtDateTime(a.createdAt)}`}>{a.text}</Detail></div>
              ))}
              {staff && <div className="sm:col-span-2"><Detail label="Item storage location">{found.storageLocation}</Detail></div>}
            </dl>
          </section>

          {handover && (
            <section className="panel p-5">
              <h2 className="mb-3 font-bold">Handover</h2>
              <dl className="grid gap-4 sm:grid-cols-3">
                <Detail label="Status"><StatusBadge status={handover.status} /></Detail>
                <Detail label="Handover date">{fmtDate(handover.handoverDate)}</Detail>
                <Detail label="Verified by">{person(handover.verifierId)}</Detail>
              </dl>
              {handover.status === 'Ready for Handover' && (
                <p className="mt-3 text-sm text-muted">{staff ? <Link className="font-semibold underline" to="/handovers">Record the handover</Link> : `Collect it from staff with the proof you listed. Bring photo ID.`}</p>
              )}
            </section>
          )}

          {!staff && claim.status === 'More Information Required' && (
            <section className="panel border-orange-300 p-5">
              <h2 className="font-bold">Staff need more information</h2>
              <p className="mt-1 text-sm text-ink/80">{[...data.verifications].reverse().find((v) => v.action === 'More Information Required')?.note}</p>
              <textarea rows={3} className="input mt-3" placeholder="Your answer" value={reply} onChange={(e) => setReply(e.target.value)} aria-label="Your reply" />
              {err && <p className="mt-2 text-xs font-medium text-lost" role="alert">{err}</p>}
              <button className="btn-primary mt-3" disabled={busy} onClick={respond}>{busy ? 'Sending…' : 'Send reply'}</button>
            </section>
          )}

          {staff && !finalState && (
            <section className="panel p-5">
              <h2 className="font-bold">Verification</h2>
              <p className="mt-1 text-sm text-muted">Compare the claim with the item, then update the status. A note is required to request information or reject.</p>
              <textarea rows={3} className="input mt-3" placeholder="Note to claimant (visible to them)" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Verification note" />
              {err && <p className="mt-2 text-xs font-medium text-lost" role="alert">{err}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {claim.status === 'Submitted' && <button className="btn-ghost" disabled={busy} onClick={() => changeStatus('Under Review')}>Start review</button>}
                <button className="btn-ghost" disabled={busy || claim.status === 'More Information Required'} onClick={() => changeStatus('More Information Required')}>Request proof</button>
                <button className="btn-primary" disabled={busy} onClick={() => changeStatus('Approved')}>Approve</button>
                <button className="btn-danger" disabled={busy} onClick={() => changeStatus('Rejected')}>Reject</button>
              </div>
            </section>
          )}

          <section className="panel p-5">
            <h2 className="mb-3 font-bold">Verification history</h2>
            {data.verifications.length === 0 ? <p className="text-sm text-muted">No verification steps yet.</p> : (
              <ul className="divide-y divide-line text-sm">
                {data.verifications.map((v) => (
                  <li key={v.id} className="py-2.5"><div className="flex items-center justify-between gap-3"><StatusBadge status={v.action} /><span className="text-xs text-muted">{person(v.verifierId)} · {fmtDateTime(v.createdAt)}</span></div>{v.note && <p className="mt-1 text-muted">{v.note}</p>}</li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <aside className="panel h-fit p-5">
          <h2 className="mb-3 font-bold">Activity history</h2>
          <Timeline logs={data.logs} users={data.users} />
        </aside>
      </div>
    </>
  );
}
