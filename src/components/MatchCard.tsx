import { Link } from 'react-router-dom';
import type { FoundItem, LostReport, MatchSuggestion } from '../types';
import { StatusBadge } from './ui';
import { fmtDate } from '../lib/utils';

export default function MatchCard({ m, lost, found, canAct, busy, onConfirm, onDismiss }: {
  m: MatchSuggestion; lost?: LostReport; found?: FoundItem; canAct: boolean; busy?: boolean; onConfirm: () => void; onDismiss: () => void;
}) {
  if (!lost || !found) return null;
  return (
    <div className="panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold">{m.score}% match <span className="ml-2 font-normal text-muted">{m.reasons.join(' · ')}</span></p>
        <StatusBadge status={m.status} />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border-l-4 border-lost bg-paper p-3 text-sm">
          <p className="text-xs font-semibold text-lost">Lost</p>
          <Link className="font-bold hover:underline" to={`/items/lost/${lost.id}`}>{lost.itemName}</Link>
          <p className="text-muted">{lost.lastSeenLocation}, {fmtDate(lost.lastSeenDate)}</p>
        </div>
        <div className="rounded-xl border-l-4 border-found bg-paper p-3 text-sm">
          <p className="text-xs font-semibold text-found">Found</p>
          <Link className="font-bold hover:underline" to={`/items/found/${found.id}`}>{found.itemName}</Link>
          <p className="text-muted">{found.foundLocation}, {fmtDate(found.foundDate)}</p>
        </div>
      </div>
      {canAct && m.status === 'Suggested' && (
        <div className="mt-3 flex gap-2">
          <button className="btn-primary" disabled={busy} onClick={onConfirm}>Confirm match</button>
          <button className="btn-ghost" disabled={busy} onClick={onDismiss}>Not a match</button>
        </div>
      )}
      {m.status === 'Confirmed' && found.status === 'In Storage' && (
        <Link to={`/claims/new?foundId=${found.id}&lostId=${lost.id}`} className="btn-tag mt-3">Claim this item</Link>
      )}
    </div>
  );
}
