import 'server-only';
import { updateTag } from 'next/cache';
import { userDataTag, type UserDataTable } from './cache-tags';

/** Expire just the changed user's datasets and rerender the active action UI. */
export function invalidateUserData(userId: string, ...tables: UserDataTable[]) {
  for (const table of new Set(tables)) updateTag(userDataTag(userId, table));
}

export function invalidateAllUserData(userId: string) {
  updateTag(userDataTag(userId));
}
