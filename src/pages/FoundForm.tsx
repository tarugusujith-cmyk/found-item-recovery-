import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useLoad } from '../lib/hooks';
import { createOne, errMsg, getList, getOne, patchOne } from '../lib/api';
import { logActivity, nowIso } from '../lib/services';
import { runMatching } from '../lib/matching';
import { useToast } from '../lib/toast';
import { FOUND_STATUSES, type Category, type FoundItem } from '../types';
import { ErrorState, Field, ImagePicker, Loading, PageHeader } from '../components/ui';
import { isFuture, todayStr } from '../lib/utils';

const blank = { itemName: '', categoryId: '', description: '', foundLocation: '', foundDate: '', storageLocation: '', status: 'In Storage', image: '' };
type Errs = Partial<Record<keyof typeof blank, string>>;

export default function FoundForm() {
  const { id } = useParams();
  const editing = !!id;
  const { user, hasRole } = useAuth();
  const staff = hasRole('staff', 'admin');
  const nav = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(blank);
  const [errs, setErrs] = useState<Errs>({});
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState('');

  const { data, loading, error, reload } = useLoad(async () => {
    const categories = await getList<Category>('categories');
    const item = editing ? await getOne<FoundItem>('foundItems', id!) : null;
    return { categories, item };
  }, [id]);

  useEffect(() => {
    const i = data?.item;
    if (i) setForm({ itemName: i.itemName, categoryId: String(i.categoryId), description: i.description, foundLocation: i.foundLocation, foundDate: i.foundDate, storageLocation: i.storageLocation, status: i.status, image: i.image });
  }, [data]);

  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={error} onRetry={reload} />;
  if (editing && !staff) return <ErrorState message="Only staff can edit found items." />;

  const set = (k: keyof typeof blank, v: string) => setForm((s) => ({ ...s, [k]: v }));

  function validate(): Errs {
    const e: Errs = {};
    if (form.itemName.trim().length < 3) e.itemName = 'Enter the item name (at least 3 characters).';
    if (!form.categoryId) e.categoryId = 'Choose a category.';
    if (form.description.trim().length < 10) e.description = 'Describe the item in at least 10 characters. Leave out details only the owner would know.';
    if (!form.foundLocation.trim()) e.foundLocation = 'Enter where you found it.';
    if (!form.foundDate) e.foundDate = 'Choose the date you found it.';
    else if (isFuture(form.foundDate)) e.foundDate = 'The date cannot be in the future.';
    if (!form.storageLocation.trim()) e.storageLocation = 'Enter where the item is being kept.';
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
      const body = { ...form, itemName: form.itemName.trim(), description: form.description.trim(), foundLocation: form.foundLocation.trim(), storageLocation: form.storageLocation.trim(), categoryId: Number(form.categoryId) };
      if (editing) {
        const changed = data!.item!.status !== body.status;
        await patchOne('foundItems', id!, { ...body, updatedAt: nowIso() });
        await logActivity('found', Number(id), changed ? `Status changed to ${body.status}` : 'Item details edited', user!.id);
        toast('Found item updated.');
        nav(`/items/found/${id}`);
      } else {
        const all = await getList<FoundItem>('foundItems');
        const dupe = all.find((i) => i.itemName.toLowerCase() === body.itemName.toLowerCase() && i.foundDate === body.foundDate && i.foundLocation.toLowerCase() === body.foundLocation.toLowerCase());
        if (dupe) { setFormErr(`"${dupe.itemName}" found at ${dupe.foundLocation} on ${dupe.foundDate} is already registered (item #${dupe.id}).`); return; }
        const created = await createOne<FoundItem>('foundItems', { ...body, status: staff ? body.status : 'In Storage', reportedBy: user!.id, createdAt: nowIso(), updatedAt: nowIso() });
        await logActivity('found', created.id, 'Item registered', user!.id);
        const n = await runMatching();
        toast(n ? `Item registered. ${n} owner${n > 1 ? 's' : ''} notified of a possible match.` : 'Item registered.');
        nav(`/items/found/${created.id}`);
      }
    } catch (x) { setFormErr(errMsg(x)); } finally { setBusy(false); }
  }

  const cls = (k: keyof Errs) => `input ${errs[k] ? 'input-error' : ''}`;
  return (
    <>
      <PageHeader title={editing ? 'Edit found item' : 'Register a found item'} subtitle="Describe what it is, not what proves it is theirs. Owners prove that when they claim it." />
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
          <Field label="Found location" error={errs.foundLocation}><input className={cls('foundLocation')} value={form.foundLocation} onChange={(e) => set('foundLocation', e.target.value)} /></Field>
          <Field label="Found date" error={errs.foundDate}><input type="date" max={todayStr()} className={cls('foundDate')} value={form.foundDate} onChange={(e) => set('foundDate', e.target.value)} /></Field>
          <Field label="Storage location" error={errs.storageLocation} hint="For example: security desk, shelf A2."><input className={cls('storageLocation')} value={form.storageLocation} onChange={(e) => set('storageLocation', e.target.value)} /></Field>
          {staff && (
            <Field label="Current status">
              <select className="input" value={form.status} onChange={(e) => set('status', e.target.value)}>{FOUND_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
            </Field>
          )}
        </div>
        <ImagePicker value={form.image} onChange={(v) => set('image', v)} />
        <div className="flex gap-3">
          <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Register item'}</button>
          <button type="button" className="btn-ghost" onClick={() => nav(-1)}>Cancel</button>
        </div>
      </form>
    </>
  );
}
