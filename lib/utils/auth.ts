import type { User } from '@/lib/api/types';

/**
 * localStorageから現在のログインユーザー情報を取得
 */
export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const userStr = localStorage.getItem('user');
  if (!userStr) {
    return null;
  }

  try {
    return JSON.parse(userStr) as User;
  } catch {
    return null;
  }
}

/**
 * 現在のログインユーザーIDを取得
 */
export function getCurrentUserId(): string | null {
  const user = getCurrentUser();
  return user?.id || null;
}

/**
 * ユーザーIDから役割を判定
 */
export type UserRole = 'director' | 'accounting' | 'manager' | 'engineer' | 'unknown';

export function getUserRoleFromId(userId: string | null): UserRole {
  if (!userId) {
    return 'unknown';
  }

  const id = parseInt(userId, 10);
  if (isNaN(id)) {
    return 'unknown';
  }

  // ユーザーID: 1051-1261: 本部長
  if (id >= 1051 && id <= 1261) {
    return 'director';
  }
  // ユーザーID: 16051-20261: 経理
  if (id >= 16051 && id <= 20261) {
    return 'accounting';
  }
  // ユーザーID: 21051-25261: 上長
  if (id >= 21051 && id <= 25261) {
    return 'manager';
  }
  // ユーザーID: 28151-28961: 開発エンジニア
  if (id >= 28151 && id <= 28961) {
    return 'engineer';
  }

  return 'unknown';
}

/**
 * 現在のユーザーが上長かどうかを判定
 */
export function isManager(): boolean {
  const userId = getCurrentUserId();
  return getUserRoleFromId(userId) === 'manager';
}

