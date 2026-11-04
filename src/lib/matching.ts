import { createOne, getList } from './api';
import { logActivity, notify, nowIso } from './services';
import type { FoundItem, LostReport, MatchSuggestion } from '../types';

const STOP = new Set(['the', 'and', 'with', 'for', 'has', 'have', 'from', 'that', 'this', 'near', 'item', 'small', 'one', 'its', 'was', 'are', 'found', 'lost']);
const words = (s: string) => new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w)));

export const MATCH_THRESHOLD = 50;

/** Score a lost report against a found item: category, keywords, location and date range. */
export function scoreMatch(lost: LostReport, found: FoundItem): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  if (lost.categoryId === found.categoryId) { score += 35; reasons.push('Same category'); }

  const a = words(`${lost.itemName} ${lost.description} ${lost.identifyingDetails}`);
  const b = words(`${found.itemName} ${found.description}`);
  const shared = [...a].filter((w) => b.has(w));
  if (shared.length) {
    score += Math.min(35, shared.length * 10);
    reasons.push(`Shared words: ${shared.slice(0, 4).join(', ')}`);
  }

  const la = words(lost.lastSeenLocation);
  const lb = words(found.foundLocation);
  if ([...la].some((w) => lb.has(w))) { score += 15; reasons.push('Same place'); }

  const diff = (new Date(found.foundDate).getTime() - new Date(lost.lastSeenDate).getTime()) / 86400000;
  if (diff >= -1 && diff <= 14) { score += 15; reasons.push('Found within 14 days'); }

  return { score: Math.min(score, 100), reasons };
}

/** Create suggestions for every open lost report / stored found item pair that scores high enough. */
export async function runMatching(): Promise<number> {
  const [lost, found, existing] = await Promise.all([
    getList<LostReport>('lostReports', { status: 'Open' }),
    getList<FoundItem>('foundItems', { status: 'In Storage' }),
    getList<MatchSuggestion>('matchSuggestions'),
  ]);
  const seen = new Set(existing.map((m) => `${m.lostId}-${m.foundId}`));
  let created = 0;
  for (const l of lost) {
    for (const f of found) {
      if (seen.has(`${l.id}-${f.id}`)) continue;
      const { score, reasons } = scoreMatch(l, f);
      if (score < MATCH_THRESHOLD) continue;
      await createOne<MatchSuggestion>('matchSuggestions', { lostId: l.id, foundId: f.id, score, reasons, status: 'Suggested', confirmedBy: null, createdAt: nowIso() });
      await notify(l.userId, 'match', `Possible match for your lost report: ${l.itemName}.`, '/search?tab=matches');
      await logActivity('lost', l.id, 'Match suggested', f.reportedBy, `Found item #${f.id} scored ${score}`);
      seen.add(`${l.id}-${f.id}`);
      created++;
    }
  }
  return created;
}
