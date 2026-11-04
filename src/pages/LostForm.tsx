import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useLoad } from '../lib/hooks';
import { createOne, errMsg, getList, getOne, patchOne } from '../lib/api';
import { logActivity, nowIso } from '../lib/services';
import { runMatching } from '../lib/matching';
import { useToast } from '../lib/toast';
import { CONTACT_PREFS, type Category, type LostReport } from '../types';
import { ErrorState, Field, ImagePicker, Loading, PageHeader } from '../components/ui';
import { isFuture, todayStr } from '../lib/utils';

const blank = { itemName: '', categoryId: '', description: '', lastSeenLocation: '', lastSeenDate: '', identifyingDetails: '', contactPreference: 'Email', image: '' };
type Errs = Partial<Record<keyof typeof blank, string>>;

export default function LostForm() {
  const { id } = useParams();
  const editing = !!id;
  const { user, hasRole } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(blank);
  const [errs, setErrs] = useState<Errs>({});
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState('');

  const { data, loading, error, reload } = useLoad(async () => {
    const categories = await getList<Category>('categories');
    const report = editing ? await getOne<LostReport>('lostReports', id!) : null;
    return { categories, report };
  }, [id]);

  useEffect(() => {
    const r = data?.report;
    if (r) setForm({ itemName: r.itemName, categoryId: String(r.categoryId), description: r.description, lastSeenLocation: r.lastSeenLocation, lastSeenDate: r.lastSeenDate, identifyingDetails: r.identifyingDetails, contactPreference: r.contactPreference, image: r.image });
  }, [data]);

  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={error} onRetry={reload} />;
  if (data.report && data.report.userId !== user!.id && !hasRole('staff', 'admin')) return <ErrorState message="You can only edit your own reports." />;

  const set = (k: keyof typeof blank, v: string) => setForm((s) => ({ ...s, [k]: v }));

  function validate(): Errs {
    const e: Errs = {};
    if (form.itemName.trim().length < 3) e.itemName = 'Enter the item name (at least 3 characters).';
    if (!form.categoryId) e.categoryId = 'Choose a category.';
    if (form.description.trim().length < 10) e.description = 'Describe the item in at least 10 characters.';
    if (!form.lastSeenLocation.trim()) e.lastSeenLocation = 'Enter where you last saw it.';
    if (!form.lastSeenDate) e.lastSeenDate = 'Choose the date you last saw it.';
    else if (isFuture(form.lastSeenDate)) e.lastSeenDate = 'The date cannot be in the future.';
    if (form.identifyingDetails.trim().length < 5) e.identifyingDetails = 'Add a mark, serial number or detail only the owner would know.';
    if (!form.contactPreference) e.contactPreference = 'Choose how staff should contact you.';
    return e;
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    setFormErr('');
    const e = validate();
    setErrs(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const body = { ...form, itemName: form.itemName.trim(), description: form.description.trim(), lastSeenLocation: form.lastSeenLocation.trim(), identifyingDetails: form.identifyingDetails.trim(), categoryId: Number(form.categoryId) };
      if (editing) {
        await patchOne('lostReports', id!, { ...body, updatedAt: nowIso() });
        await logActivity('lost', Number(id), 'Report edited', user!.id);
        toast('Report updated.');
        nav(`/items/lost/${id}`);
      } else {
        const mine = await getList<LostReport>('lostReports', { userId: user!.id });
        const dupe = mine.find((r) => r.itemName.toLowerCase() === body.itemName.toLowerCase() && r.lastSeenDate === body.lastSeenDate && r.status !== 'Closed');
        if (dupe) { setFormErr(`You already reported "${dupe.itemName}" for ${dupe.lastSeenDate}. Edit that report instead.`); return; }
        const created = await createOne<LostReport>('lostReports', { ...body, userId: user!.id, status: 'Open', createdAt: nowIso(), updatedAt: nowIso() });
        await logActivity('lost', created.id, 'Report created', user!.id);
        const n = await runMatching();
        toast(n ? `Report submitted. ${n} possible match${n > 1 ? 'es' : ''} found.` : 'Report submitted.');
        nav(`/items/lost/${created.id}`);
      }
    } catch (x) { setFormErr(errMsg(x)); } finally { setBusy(false); }
  }

  const cls = (k: keyof Errs) => `input ${errs[k] ? 'input-error' : ''}`;
  return (
    <>
      <PageHeader title={editing ? 'Edit lost report' : 'Report a lost item'} subtitle="The more specific you are, the easier it is to match and verify." />
      <form onSubmit={submit} noValidate className="panel max-w-3xl space-y-5 p-6">
        {formErr && <p className="rounded-xl border border-lost/40 bg-lost/10 p-3 text-sm text-lost" role="alert">{formErr}</p>}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Item name" error={errs.itemName}><input className={cls('itemName')} value={form.itemName} onChange={(e) => set('itemName', e.target.value)} /></Field>
          <Field label="Category" error={errs.categoryId}>
            <select className={cls('categoryId')} value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
              <option value="">Choose a category</option>
              {data.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Description" error={errs.description}><textarea rows={3} className={cls('description')} value={form.description} onChange={(e) => set('description', e.target.value)} /></Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Last seen location" error={errs.lastSeenLocation}><input className={cls('lastSeenLocation')} value={form.lastSeenLocation} onChange={(e) => set('lastSeenLocation', e.target.value)} /></Field>
          <Field label="Last seen date" error={errs.lastSeenDate}><input type="date" max={todayStr()} className={cls('lastSeenDate')} value={form.lastSeenDate} onChange={(e) => set('lastSeenDate', e.target.value)} /></Field>
        </div>
        <Field label="Identifying details" hint="Only you and staff can see this. It is used to verify ownership." error={errs.identifyingDetails}>
          <textarea rows={2} className={cls('identifyingDetails')} value={form.identifyingDetails} onChange={(e) => set('identifyingDetails', e.target.value)} />
        </Field>
        <Field label="Contact preference" error={errs.contactPreference}>
          <select className={cls('contactPreference')} value={form.contactPreference} onChange={(e) => set('contactPreference', e.target.value)}>
            {CONTACT_PREFS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <ImagePicker value={form.image} onChange={(v) => set('image', v)} />
        <div className="flex gap-3">
          <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Submit report'}</button>
          <button type="button" className="btn-ghost" onClick={() => nav(-1)}>Cancel</button>
        </div>
      </form>
    </>
  );
}
