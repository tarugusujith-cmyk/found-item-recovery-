import { getOne, patchOne } from './api';
import { logActivity, notify, notifyRoles, nowIso } from './services';
import type { FoundItem, LostReport, MatchSuggestion } from '../types';

export async function confirmMatch(m: MatchSuggestion, actorId: number) {
  const [lost, found] = await Promise.all([getOne<LostReport>('lostReports', m.lostId), getOne<FoundItem>('foundItems', m.foundId)]);
  await patchOne('matchSuggestions', m.id, { status: 'Confirmed', confirmedBy: actorId });
  if (lost.status === 'Open') await patchOne('lostReports', lost.id, { status: 'Matched', updatedAt: nowIso() });
  await logActivity('lost', lost.id, 'Match confirmed', actorId, `Found item #${found.id}: ${found.itemName}`);
  await logActivity('found', found.id, 'Match confirmed', actorId, `Lost report #${lost.id}: ${lost.itemName}`);
  if (actorId !== lost.userId) await notify(lost.userId, 'match', `Staff confirmed a match for "${lost.itemName}". You can now submit a claim.`, `/items/found/${found.id}`);
  else await notifyRoles(['staff'], 'match', `Owner confirmed a match: "${lost.itemName}" with found item #${found.id}.`, `/items/found/${found.id}`);
}

export async function dismissMatch(m: MatchSuggestion, actorId: number) {
  await patchOne('matchSuggestions', m.id, { status: 'Dismissed', confirmedBy: actorId });
  await logActivity('lost', m.lostId, 'Match dismissed', actorId, `Found item #${m.foundId}`);
}
