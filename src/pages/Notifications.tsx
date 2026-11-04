import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useLoad } from '../lib/hooks';
import { errMsg, getList, patchOne } from '../lib/api';
import { useToast } from '../lib/toast';
import type { AppNotification } from '../types';
import { EmptyState, ErrorState, Loading, PageHeader } from '../components/ui';
import { fmtDateTime } from '../lib/utils';

const LABEL: Record<AppNotification['type'], string> = { match: 'Match', claim: 'Claim', info: 'Info request', handover: 'Handover' };

export default function Notifications() {
  const { user } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useLoad(
    () => getList<AppNotification>('notifications', { userId: user!.id, _sort: 'createdAt', _order: 'desc' }), [user?.id]);
  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={error} onRetry={reload} />;

  async function markRead(ns: AppNotification[]) {
    try { await Promise.all(ns.map((n) => patchOne('notifications', n.id, { read: true }))); reload(); } catch (e) { toast(errMsg(e), 'error'); }
  }
  const unread = data.filter((n) => !n.read);

  return (
    <>
      <PageHeader title="Notifications" subtitle="Match suggestions, claim updates, information requests and handovers."
        actions={unread.length > 0 ? <button className="btn-ghost" onClick={() => markRead(unread)}>Mark all as read</button> : undefined} />
      {data.length === 0 ? <EmptyState title="You're all caught up" hint="Updates about your reports and claims will appear here." /> : (
        <ul className="panel divide-y divide-line">
          {data.map((n) => (
            <li key={n.id} className={`flex flex-wrap items-center justify-between gap-3 p-4 ${n.read ? '' : 'bg-tag/15'}`}>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted">{LABEL[n.type]} · {fmtDateTime(n.createdAt)}</p>
                <Link to={n.link} onClick={() => !n.read && markRead([n])} className={`text-sm hover:underline ${n.read ? '' : 'font-semibold'}`}>{n.message}</Link>
              </div>
              {!n.read && <button className="btn-ghost text-xs" onClick={() => markRead([n])}>Mark as read</button>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
