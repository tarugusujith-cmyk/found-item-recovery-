import { createOne, getList } from './api';
import type { ActivityLog, AppNotification, Role, User } from '../types';

export const nowIso = () => new Date().toISOString();

export function logActivity(entityType: ActivityLog['entityType'], entityId: number, action: string, actorId: number, note = '') {
  return createOne<ActivityLog>('activityLogs', { entityType, entityId, action, note, actorId, createdAt: nowIso() });
}

export function notify(userId: number, type: AppNotification['type'], message: string, link: string) {
  return createOne<AppNotification>('notifications', { userId, type, message, link, read: false, createdAt: nowIso() });
}

export async function notifyRoles(roles: Role[], type: AppNotification['type'], message: string, link: string, exceptUserId?: number) {
  const users = await getList<User>('users', { active: true });
  await Promise.all(
    users.filter((u) => roles.includes(u.role) && u.id !== exceptUserId).map((u) => notify(u.id, type, message, link)),
  );
}
