import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useLoad } from '../lib/hooks';
import { createOne, errMsg, getList, getOne, patchOne } from '../lib/api';
import { logActivity, notifyRoles, nowIso } from '../lib/services';
import { useToast } from '../lib/toast';
import type { Claim, FoundItem, LostReport } from '../types';
import { ErrorState, Field, Loading, PageHeader, StatusBadge } from '../components/ui';
import { fmtDate } from '../lib/utils';

export default function ClaimForm() {
  const [params] = useSearchParams();
  const foundId = params.get('foundId');
  const { user } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [lostId, setLostId] = useState(params.get('lostId') ?? '');
  const [details, setDetails] = useState('');
  const [proof, setProof] = useState('');
  const [errs, setErrs] = useState<{ details?: string; proof?: string }>({});
  const [formErr, setFormErr] = useState('');
  const [busy, setBusy] = useState(false);

  const { data, loading, error, reload } = useLoad(async () => {
    if (!foundId) throw new Error('Choose a found item to claim first.');
    const [item, mine, claims] = await Promise.all([
      getOne<FoundItem>('foundItems', foundId),
      getList<LostReport>('lostReports', { userId: user!.id }),
      getList<Claim>('claims', { foundId, userId: user!.id }),
    ]);
    return { item, mine: mine.filter((l) => ['Open', 'Matched'].includes(l.status)), claims };
  }, [foundId, user?.id]);

  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={error || 'Could not load the item.'} onRetry={foundId ? reload : undefined} />;
  const { item } = data;
  const existing = data.claims.find((c) => c.status !== 'Rejected');
  const claimable = ['In Storage', 'Claim Pending'].includes(item.status);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormErr('');
    const er: typeof errs = {};
    if (details.trim().length < 10) er.details = 'Describe what only the owner would know (at least 10 characters).';
    if (proof.trim().length < 10) er.proof = 'Explain what proof you can show (at least 10 characters).';
    setErrs(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const fresh = await getList<Claim>('claims', { foundId: item.id, userId: user!.id });
      if (fresh.some((c) => c.status !== 'Rejected')) { setFormErr('You already have an active claim on this item.'); return; }
      const claim = await createOne<Claim>('claims', { foundId: item.id, lostId: lostId ? Number(lostId) : null, userId: user!.id, identifyingDetails: details.trim(), proofNotes: proof.trim(), status: 'Submitted', additionalInfo: [], createdAt: nowIso(), updatedAt: nowIso() });
      if (item.status === 'In Storage') await patchOne('foundItems', item.id, { status: 'Claim Pending', updatedAt: nowIso() });
      await logActivity('claim', claim.id, 'Claim submitted', user!.id);
      await logActivity('found', item.id, 'Claim submitted', user!.id, `Claim #${claim.id}`);
      await notifyRoles(['staff', 'admin'], 'claim', `New claim submitted for ${item.itemName}.`, `/claims/${claim.id}`);
      toast('Claim submitted. Staff will review it.');
      nav(`/claims/${claim.id}`);
    } catch (x) { setFormErr(errMsg(x)); } finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader title="Claim this item" subtitle="Tell us what proves it is yours. Staff compare your answers with the item before approving." />
      <div className="panel mb-5 max-w-3xl p-4 text-sm">
        <div className="flex items-center justify-between"><Link className="font-bold hover:underline" to={`/items/found/${item.id}`}>{item.itemName}</Link><StatusBadge status={item.status} /></div>
        <p className="mt-1 text-muted">{item.description}</p>
        <p className="mt-1 text-muted">Found at {item.foundLocation} on {fmtDate(item.foundDate)}</p>
      </div>
      {!claimable ? <ErrorState message="This item is no longer available to claim." /> : existing ? (
        <div className="panel max-w-3xl p-5 text-sm">You already claimed this item. <Link className="font-semibold underline" to={`/claims/${existing.id}`}>Open your claim</Link>.</div>
      ) : (
        <form onSubmit={submit} noValidate className="panel max-w-3xl space-y-5 p-6">
          {formErr && <p className="rounded-xl border border-lost/40 bg-lost/10 p-3 text-sm text-lost" role="alert">{formErr}</p>}
          <Field label="Linked lost report (optional)">
            <select className="input" value={lostId} onChange={(e) => setLostId(e.target.value)}>
              <option value="">None</option>
              {data.mine.map((l) => <option key={l.id} value={l.id}>{l.itemName} · {fmtDate(l.lastSeenDate)}</option>)}
            </select>
          </Field>
          <Field label="Identifying details" error={errs.details} hint="Marks, contents, serial numbers, passwords or anything not visible in the listing.">
            <textarea rows={3} className={`input ${errs.details ? 'input-error' : ''}`} value={details} onChange={(e) => setDetails(e.target.value)} />
          </Field>
          <Field label="Proof notes" error={errs.proof} hint="Receipts, photos, ID or other proof you can show at handover.">
            <textarea rows={3} className={`input ${errs.proof ? 'input-error' : ''}`} value={proof} onChange={(e) => setProof(e.target.value)} />
          </Field>
          <div className="flex gap-3">
            <button className="btn-primary" disabled={busy}>{busy ? 'Submitting…' : 'Submit claim'}</button>
            <button type="button" className="btn-ghost" onClick={() => nav(-1)}>Cancel</button>
          </div>
        </form>
      )}
    </>
  );
}
