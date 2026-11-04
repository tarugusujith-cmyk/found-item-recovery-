export type Role = 'admin' | 'user' | 'staff';

export const LOST_STATUSES = ['Open', 'Matched', 'Resolved', 'Closed'] as const;
export const FOUND_STATUSES = ['In Storage', 'Claim Pending', 'Returned', 'Closed'] as const;
export const CLAIM_STATUSES = ['Submitted', 'Under Review', 'More Information Required', 'Approved', 'Rejected'] as const;
export const HANDOVER_STATUSES = ['Ready for Handover', 'Handed Over', 'Closed'] as const;
export const CONTACT_PREFS = ['Email', 'Phone', 'In-app'] as const;

export type LostStatus = (typeof LOST_STATUSES)[number];
export type FoundStatus = (typeof FOUND_STATUSES)[number];
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];
export type HandoverStatus = (typeof HANDOVER_STATUSES)[number];

export interface User { id: number; name: string; email: string; password?: string; role: Role; active: boolean }
export interface Category { id: number; name: string }

export interface LostReport {
  id: number; userId: number; itemName: string; categoryId: number; description: string;
  lastSeenLocation: string; lastSeenDate: string; identifyingDetails: string;
  contactPreference: string; image: string; status: LostStatus; createdAt: string; updatedAt: string;
}

export interface FoundItem {
  id: number; reportedBy: number; itemName: string; categoryId: number; description: string;
  foundLocation: string; foundDate: string; storageLocation: string; status: FoundStatus;
  image: string; createdAt: string; updatedAt: string;
}

export interface MatchSuggestion {
  id: number; lostId: number; foundId: number; score: number; reasons: string[];
  status: 'Suggested' | 'Confirmed' | 'Dismissed'; confirmedBy: number | null; createdAt: string;
}

export interface Claim {
  id: number; foundId: number; lostId: number | null; userId: number;
  identifyingDetails: string; proofNotes: string; status: ClaimStatus; createdAt: string; updatedAt: string;
  additionalInfo?: { text: string; createdAt: string }[];
}

export interface Verification { id: number; claimId: number; verifierId: number; action: string; note: string; createdAt: string }

export interface Handover {
  id: number; claimId: number; status: HandoverStatus; handoverDate: string | null;
  verifierId: number | null; notes: string; createdAt: string;
}

export interface AppNotification {
  id: number; userId: number; type: 'match' | 'claim' | 'info' | 'handover'; message: string;
  link: string; read: boolean; createdAt: string;
}

export interface ActivityLog {
  id: number; entityType: 'lost' | 'found' | 'claim'; entityId: number; action: string;
  note: string; actorId: number; createdAt: string;
}
