import { useState, type FormEvent } from 'react';
import { useAuth } from '../lib/auth';
import { useLoad } from '../lib/hooks';
import { createOne, errMsg, getList, patchOne } from '../lib/api';
import { useToast } from '../lib/toast';
import type { Role, User } from '../types';
import { ErrorState, Field, Loading, PageHeader } from '../components/ui';

const ROLES: Role[] = ['user', 'staff', 'admin'];

export default function UsersAdmin() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' as Role });
  const [errs, setErrs] = useState<Partial<Record<'name' | 'email' | 'password', string>>>({});
  const [busy, setBusy] = useState(false);
  const { data, loading, error, reload } = useLoad(() => getList<User>('users'));
  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={error} onRetry={reload} />;

  async function add(e: FormEvent) {
    e.preventDefault();
    const er: typeof errs = {};
    if (form.name.trim().length < 2) er.name = 'Enter the full name.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) er.email = 'Enter a valid email address.';
    else if (data!.some((u) => u.email.toLowerCase() === form.email.trim().toLowerCase())) er.email = 'A user with this email already exists.';
    if (form.password.length < 6) er.password = 'Use at least 6 characters.';
    setErrs(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      await createOne('users', { ...form, name: form.name.trim(), email: form.email.trim().toLowerCase(), active: true });
      toast('User added.');
      setForm({ name: '', email: '', password: '', role: 'user' });
      reload();
    } catch (x) { toast(errMsg(x), 'error'); } finally { setBusy(false); }
  }
  async function update(u: User, patch: Partial<User>, ok: string) {
    try { await patchOne('users', u.id, patch); toast(ok); reload(); } catch (x) { toast(errMsg(x), 'error'); }
  }

  return (
    <>
      <PageHeader title="Users" subtitle="Add people, change roles and disable accounts." />
      <form onSubmit={add} noValidate className="panel mb-6 grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5 lg:items-start">
        <Field label="Name" error={errs.name}><input className={`input ${errs.name ? 'input-error' : ''}`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Email" error={errs.email}><input className={`input ${errs.email ? 'input-error' : ''}`} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Password" error={errs.password}><input type="password" className={`input ${errs.password ? 'input-error' : ''}`} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
        <Field label="Role"><select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></Field>
        <div className="lg:pt-6"><button className="btn-primary w-full" disabled={busy}>Add user</button></div>
      </form>
      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-line bg-paper text-xs font-semibold text-muted"><tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Account</th></tr></thead>
          <tbody className="divide-y divide-line">
            {data.map((u) => (
              <tr key={u.id}>
                <td className="p-3 font-semibold">{u.name}</td>
                <td className="p-3 text-muted">{u.email}</td>
                <td className="p-3">
                  <select className="input max-w-[130px]" aria-label={`Role for ${u.name}`} value={u.role} disabled={u.id === me!.id} onChange={(e) => update(u, { role: e.target.value as Role }, 'Role updated.')}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
                </td>
                <td className="p-3">
                  <button className={u.active ? 'btn-ghost' : 'btn-tag'} disabled={u.id === me!.id} onClick={() => update(u, { active: !u.active }, u.active ? 'Account disabled.' : 'Account enabled.')}>{u.active ? 'Disable' : 'Enable'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
