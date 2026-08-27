import type { User } from '@/lib/api/types';

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

export function getCurrentUserId(): string | null {
  const user = getCurrentUser();
  return user?.id || null;
}

export type UserRole = 'director' | 'accounting' | 'manager' | 'engineer' | 'hr' | 'unknown';

export function getUserRoleFromId(userId: string | null): UserRole {
  if (!userId) {
    return 'unknown';
  }

  const id = parseInt(userId, 10);
  if (isNaN(id)) {
    return 'unknown';
  }

  if (id >= 1051 && id <= 1261) {
    return 'director';
  }
  if (id >= 16051 && id <= 20261) {
    return 'accounting';
  }
  if (id >= 21051 && id <= 25261) {
    return 'manager';
  }
  if (id >= 28151 && id <= 28961) {
    return 'engineer';
  }
  if (id >= 31051 && id <= 31261) {
    return 'hr';
  }

  return 'unknown';
}

export function isManager(): boolean {
  const userId = getCurrentUserId();
  return getUserRoleFromId(userId) === 'manager';
}

export function isHr(): boolean {
  const userId = getCurrentUserId();
  return getUserRoleFromId(userId) === 'hr';
}

export function isDirector(): boolean {
  const userId = getCurrentUserId();
  return getUserRoleFromId(userId) === 'director';
}

export function isAccounting(): boolean {
  const userId = getCurrentUserId();
  return getUserRoleFromId(userId) === 'accounting';
}

