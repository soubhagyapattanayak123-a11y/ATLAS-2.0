/**
 * User-Scoped Storage Utility
 * Guarantees strict per-user data isolation in browser localStorage.
 * Ensures new users start with completely fresh, empty data and cannot see old user metrics.
 */

export interface UserIdentifiable {
  id?: number | string | null;
  username?: string | null;
}

const ACTIVE_USER_ID_KEY = 'atlas_active_user_id';

export function setActiveUserStorageId(id: number | string | null | undefined): void {
  if (typeof window === 'undefined') return;
  if (id != null) {
    localStorage.setItem(ACTIVE_USER_ID_KEY, String(id));
  } else {
    localStorage.removeItem(ACTIVE_USER_ID_KEY);
  }
}

export function getActiveUserStorageId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_USER_ID_KEY);
}

export function clearActiveUserStorageId(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACTIVE_USER_ID_KEY);
}

export function getUserPrefix(user?: UserIdentifiable | null): string {
  if (user && user.id != null) {
    return `atlas_u${user.id}_`;
  }
  // Check if an active authenticated user ID was recorded in session
  if (typeof window !== 'undefined') {
    const activeId = localStorage.getItem(ACTIVE_USER_ID_KEY);
    if (activeId) {
      return `atlas_u${activeId}_`;
    }
  }
  return 'atlas_guest_';
}

export function getUserStorageKey(key: string, user?: UserIdentifiable | null): string {
  return `${getUserPrefix(user)}${key}`;
}

export function getUserItem<T>(key: string, user?: UserIdentifiable | null, defaultValue: T = null as unknown as T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const scopedKey = getUserStorageKey(key, user);
    const item = localStorage.getItem(scopedKey);
    if (item === null) return defaultValue;

    if (typeof defaultValue === 'number') {
      const parsed = parseFloat(item);
      return (isNaN(parsed) ? defaultValue : parsed) as unknown as T;
    }
    if (typeof defaultValue === 'boolean') {
      return (item === 'true') as unknown as T;
    }
    try {
      return JSON.parse(item) as T;
    } catch {
      return item as unknown as T;
    }
  } catch (err) {
    console.warn(`[UserStorage] Error reading key ${key}:`, err);
    return defaultValue;
  }
}

export function setUserItem<T>(key: string, value: T, user?: UserIdentifiable | null): void {
  if (typeof window === 'undefined') return;
  try {
    const scopedKey = getUserStorageKey(key, user);
    if (value === null || value === undefined) {
      localStorage.removeItem(scopedKey);
      return;
    }
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(scopedKey, serialized);
  } catch (err) {
    console.warn(`[UserStorage] Error writing key ${key}:`, err);
  }
}

export function removeUserItem(key: string, user?: UserIdentifiable | null): void {
  if (typeof window === 'undefined') return;
  try {
    const scopedKey = getUserStorageKey(key, user);
    localStorage.removeItem(scopedKey);
  } catch (err) {
    console.warn(`[UserStorage] Error removing key ${key}:`, err);
  }
}

/**
 * Remove legacy un-scoped keys so that previous user's local caches
 * do not leak into newly logged-in accounts.
 */
export function purgeLegacyGlobalStorage(): void {
  if (typeof window === 'undefined') return;
  const legacyKeys = [
    'atlas_learning_activities',
    'atlas_academic_solved',
    'atlas_academic_streak',
    'atlas_academic_due',
    'atlas_academic_saved',
    'atlas_battle_xp',
    'atlas_battle_used_q',
    'atlas_last_active_date',
    'atlas_flashcard_deck_English',
    'atlas_flashcard_deck_Hindi',
    'atlas_flashcard_deck_Odia',
    'atlas_custom_daily_voice_topics_English',
    'atlas_custom_daily_voice_topics_Hindi',
    'atlas_custom_daily_voice_topics_Odia',
  ];
  for (const k of legacyKeys) {
    try {
      localStorage.removeItem(k);
    } catch {}
  }
}

