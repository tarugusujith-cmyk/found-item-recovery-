import { useState, type FormEvent } from 'react';
import { useLoad } from '../lib/hooks';
import { createOne, deleteOne, errMsg, getList, patchOne } from '../lib/api';
import { useToast } from '../lib/toast';
import type { Category, FoundItem, LostReport } from '../types';
import { EmptyState, ErrorState, Loading, PageHeader } from '../components/ui';

export default function CategoriesAdmin() {
  const toast = useToast();
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const { data, loading, error, reload } = useLoad(async () => {
    const [categories, lost, found] = await Promise.all([getList<Category>('categories'), getList<LostReport>('lostReports'), getList<FoundItem>('foundItems')]);
    return { categories, lost, found };
  });
  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={error} onRetry={reload} />;

  const uses = (id: number) => data.lost.filter((l) => l.categoryId === id).length + data.found.filter((f) => f.categoryId === id).length;
  const taken = (n: string, except?: number) => data.categories.some((c) => c.id !== except && c.name.toLowerCase() === n.trim().toLowerCase());

  async function add(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setErr('Enter a category name.');
    if (taken(name)) return setErr('That category already exists.');
    try { await createOne('categories', { name: name.trim() }); setName(''); setErr(''); toast('Category added.'); reload(); } catch (x) { setErr(errMsg(x)); }
  }
  async function save(c: Category) {
    if (editName.trim().length < 2 || taken(editName, c.id)) return toast('Use a unique name of at least 2 characters.', 'error');
    try { await patchOne('categories', c.id, { name: editName.trim() }); setEditId(null); toast('Category renamed.'); reload(); } catch (x) { toast(errMsg(x), 'error'); }
  }
  async function remove(c: Category) {
    if (uses(c.id) > 0) return toast(`"${c.name}" is used by ${uses(c.id)} records. Reassign them first.`, 'error');
    if (!confirm(`Delete "${c.name}"?`)) return;
    try { await deleteOne('categories', c.id); toast('Category deleted.'); reload(); } catch (x) { toast(errMsg(x), 'error'); }
  }

  return (
    <>
      <PageHeader title="Categories" subtitle="Categories drive matching and reports. Rename them freely; delete only unused ones." />
      <form onSubmit={add} className="panel mb-6 flex max-w-xl flex-wrap items-start gap-3 p-5" noValidate>
        <div className="min-w-[200px] flex-1">
          <input className={`input ${err ? 'input-error' : ''}`} placeholder="New category name" aria-label="New category name" value={name} onChange={(e) => setName(e.target.value)} />
          {err && <p className="mt-1 text-xs font-medium text-lost" role="alert">{err}</p>}
        </div>
        <button className="btn-primary">Add category</button>
      </form>
      {data.categories.length === 0 ? <EmptyState title="No categories yet" hint="Add one so users can classify items." /> : (
        <ul className="panel max-w-xl divide-y divide-line">
          {data.categories.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              {editId === c.id ? <input className="input" autoFocus aria-label="Category name" value={editName} onChange={(e) => setEditName(e.target.value)} /> : <span><span className="font-semibold">{c.name}</span> <span className="text-muted">· {uses(c.id)} records</span></span>}
              <span className="flex shrink-0 gap-2">
                {editId === c.id ? (<><button className="btn-primary" onClick={() => save(c)}>Save</button><button className="btn-ghost" onClick={() => setEditId(null)}>Cancel</button></>) : (<><button className="btn-ghost" onClick={() => { setEditId(c.id); setEditName(c.name); }}>Rename</button><button className="btn-danger" onClick={() => remove(c)}>Delete</button></>)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
