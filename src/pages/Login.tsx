import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { errMsg } from '../lib/api';
import { Avatar, Field } from '../components/ui';
import Icon from '../components/Icon';

const DEMO = [
  { label: 'Admin', name: 'AK.SAM', email: 'admin@lostfound.test', password: 'admin123' },
  { label: 'Staff', name: 'Swetha', email: 'staff@lostfound.test', password: 'staff123' },
  { label: 'Member', name: 'Shalu', email: 'meera@lostfound.test', password: 'user123' },
  { label: 'Member', name: 'Keerthu', email: 'arjun@lostfound.test', password: 'user123' },
];

function Stub({ kind, title, place, className, delay, rot }: { kind: 'lost' | 'found' | 'ok'; title: string; place: string; className: string; delay: string; rot: string }) {
  const bar = kind === 'lost' ? 'bg-lost' : kind === 'found' ? 'bg-found' : 'bg-tag';
  return (
    <div className={`absolute flex w-64 animate-drop overflow-hidden rounded-2xl bg-white text-night shadow-2xl ${className}`} style={{ animationDelay: delay, ['--r' as string]: rot }}>
      <span className={`w-2 ${bar}`} />
      <div className="relative flex-1 p-4">
        <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-night/15" />
        <p className="text-xs font-semibold text-slate-500">{kind === 'lost' ? 'Lost' : kind === 'found' ? 'Found' : 'Claim approved'}</p>
        <p className="mt-0.5 font-bold">{title}</p>
        <p className="text-sm text-slate-500">{place}</p>
      </div>
    </div>
  );
}

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const er: typeof errors = {};
    if (!email.trim()) er.email = 'Enter your email.';
    else if (!/^\S+@\S+\.\S+$/.test(email)) er.email = 'Enter a valid email address.';
    if (!password) er.password = 'Enter your password.';
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      await login(email, password);
      nav((loc.state as { from?: string } | null)?.from || '/', { replace: true });
    } catch (x) {
      setErrors({ form: errMsg(x) });
    } finally { setBusy(false); }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="mesh relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-8 items-start justify-center rounded-md bg-tag pt-1.5" style={{ clipPath: 'polygon(0 14%, 14% 0, 100% 0, 100% 100%, 0 100%)' }}><span className="h-2 w-2 rounded-full bg-night" /></span>
          <span className="text-xl font-bold tracking-tight">Lost &amp; Found</span>
        </div>
        <div className="relative h-[340px]" aria-hidden>
          <Stub kind="found" title="Black leather wallet" place="Central Bus Stand" className="left-2 top-0" rot="-5deg" delay=".15s" />
          <Stub kind="lost" title="Keys with blue tag" place="Railway Station" className="left-40 top-28" rot="4deg" delay=".4s" />
          <Stub kind="ok" title="Ready for handover" place="Security desk, shelf A2" className="left-10 top-56" rot="-2deg" delay=".65s" />
        </div>
        <div>
          <h1 className="max-w-md text-5xl font-bold leading-[1.05] tracking-tight">Lost it? Let's get it back.</h1>
          <p className="mt-4 max-w-md text-white/70">Report what's missing, match it with what's been found, and hand it back after a proper check.</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5" noValidate>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
            <p className="mt-1 text-sm text-muted">Log in to manage reports and claims.</p>
          </div>
          {errors.form && <p className="rounded-xl border border-lost/40 bg-lost/10 p-3 text-sm text-lost" role="alert">{errors.form}</p>}
          <Field label="Email" error={errors.email}>
            <input className={`input ${errors.email ? 'input-error' : ''}`} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password" error={errors.password}>
            <input className={`input ${errors.password ? 'input-error' : ''}`} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <button className="btn-primary w-full py-3" disabled={busy}>{busy ? 'Logging in…' : <>Log in <Icon name="arrow" className="h-4 w-4" /></>}</button>
          <div className="border-t border-line pt-5">
            <p className="mb-2 text-xs font-semibold text-muted">Try a demo account</p>
            <div className="grid gap-2">
              {DEMO.map((d) => (
                <button key={d.email} type="button" className="flex items-center gap-3 rounded-xl border border-line bg-surface p-2.5 text-left transition hover:border-found" onClick={() => { setEmail(d.email); setPassword(d.password); setErrors({}); }}>
                  <Avatar name={d.name} className="h-8 w-8 text-xs" />
                  <span className="flex-1 text-sm font-semibold">{d.name}</span>
                  <span className="rounded-full bg-paper px-2 py-0.5 text-xs text-muted">{d.label}</span>
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
