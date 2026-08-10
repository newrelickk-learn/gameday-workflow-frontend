import type { LoginRequest, LoginResponse, User } from '../types';

/**
 * ユーザーIDから役割を判定
 */
function getUserRoleFromId(userId: string): 'director' | 'accounting' | 'manager' | 'engineer' | 'unknown' {
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
 * ユーザーIDからCompanyIdを計算
 */
function calculateCompanyId(userId: string): number {
  const id = parseInt(userId, 10);
  if (isNaN(id)) {
    return 1; // デフォルト
  }
  
  // 本部長: ID 1051-1100 -> CompanyId 1-50
  if (id >= 1051 && id <= 1100) {
    return id - 1051 + 1;
  }
  // 経理: ID 16051-16100 -> CompanyId 1-50
  if (id >= 16051 && id <= 16100) {
    return id - 16051 + 1;
  }
  // 上長: ID 21051-21100 -> CompanyId 1-50
  if (id >= 21051 && id <= 21100) {
    return id - 21051 + 1;
  }
  // 開発エンジニア: ID 28151-28200 -> CompanyId 1-50
  if (id >= 28151 && id <= 28200) {
    return id - 28151 + 1;
  }
  
  return 1; // デフォルト
}

/**
 * 役割とCompanyIdからユーザーIDを取得
 */
function getUserIdByRoleAndCompany(role: 'director' | 'accounting' | 'manager' | 'engineer', companyId: number): string {
  // CompanyIdは1-50の範囲
  const companyIdClamped = Math.max(1, Math.min(50, companyId));
  
  switch (role) {
    case 'director':
      return String(1051 + companyIdClamped - 1); // 本部長: 1051-1100
    case 'accounting':
      return String(16051 + companyIdClamped - 1); // 経理: 16051-16100
    case 'manager':
      return String(21051 + companyIdClamped - 1); // 上長: 21051-21100
    case 'engineer':
      return String(28151 + companyIdClamped - 1); // 開発エンジニア: 28151-28200
    default:
      return String(28151 + companyIdClamped - 1); // デフォルトは開発エンジニア
  }
}

/**
 * 役割からユーザーIDの範囲を取得（代表的なIDを返す）
 */
function getUserIdByRole(role: 'director' | 'accounting' | 'manager' | 'engineer'): string {
  return getUserIdByRoleAndCompany(role, 1); // デフォルトはCompanyId=1
}

/**
 * メールアドレスから役割を推測
 */
function getRoleFromEmail(email: string): 'director' | 'accounting' | 'manager' | 'engineer' {
  const emailLower = email.toLowerCase();
  if (emailLower.includes('director') || emailLower.includes('本部長')) {
    return 'director';
  }
  if (emailLower.includes('accounting') || emailLower.includes('経理')) {
    return 'accounting';
  }
  if (emailLower.includes('manager') || emailLower.includes('上長')) {
    return 'manager';
  }
  // デフォルトは開発エンジニア
  return 'engineer';
}

/**
 * 役割からユーザー名を生成
 */
function getUserNameByRole(role: 'director' | 'accounting' | 'manager' | 'engineer'): string {
  switch (role) {
    case 'director':
      return '開発本部長';
    case 'accounting':
      return '経理担当';
    case 'manager':
      return '上長';
    case 'engineer':
      return '開発エンジニア';
    default:
      return '開発エンジニア';
  }
}

/**
 * 役割から部署名を取得
 */
function getDepartmentByRole(role: 'director' | 'accounting' | 'manager' | 'engineer'): string {
  switch (role) {
    case 'director':
      return '開発組織';
    case 'accounting':
      return '管理組織';
    case 'manager':
      return '開発組織';
    case 'engineer':
      return '開発組織';
    default:
      return '開発組織';
  }
}

// ユーザーデータ（既存のデータも保持）
const users: Record<string, User> = {
  '28151': {
    id: '28151',
    name: '開発エンジニア',
    email: 'engineer@example.com',
    role: 'engineer',
    department: '開発組織',
    companyId: 1,
  },
  '21051': {
    id: '21051',
    name: '上長',
    email: 'manager@example.com',
    role: 'manager',
    department: '開発組織',
    companyId: 1,
  },
  '1051': {
    id: '1051',
    name: '本部長',
    email: 'director@example.com',
    role: 'director',
    department: '開発組織',
    companyId: 1,
  },
  '16051': {
    id: '16051',
    name: '経理',
    email: 'accounting@example.com',
    role: 'accounting',
    department: '管理組織',
    companyId: 1,
  },
};

export const stubUserService = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    // まず、既存のユーザーデータからメールアドレスで検索
    const existingUser = Object.values(users).find(u => u.email === credentials.email);
    
    if (existingUser) {
      // 既存のユーザーが見つかった場合、そのユーザーを使用
      return {
        token: `mock-jwt-token-${existingUser.id}`,
        user: existingUser,
      };
    }

    // 既存のユーザーが見つからない場合、メールアドレスから役割を推測
    const role = getRoleFromEmail(credentials.email);
    const userId = getUserIdByRole(role);
    const userName = getUserNameByRole(role);
    const department = getDepartmentByRole(role);

    // 新規ユーザーを作成
    const companyId = calculateCompanyId(userId);
    const user: User = {
      id: userId,
      name: userName,
      email: credentials.email,
      role: role === 'director' ? 'director' : role === 'accounting' ? 'accounting' : role === 'manager' ? 'manager' : 'engineer',
      department,
      companyId,
    };
    users[userId] = user;

    return {
      token: `mock-jwt-token-${userId}`,
      user,
    };
  },
  
  async getUser(id: string): Promise<User> {
    // 既存のユーザーデータがある場合はそれを使用
    if (users[id]) {
      return users[id];
    }

    // ユーザーIDから役割を判定してユーザーを生成
    const role = getUserRoleFromId(id);
    if (role === 'unknown') {
      // 不明なIDの場合はデフォルトの開発エンジニアを返す
      return users['1'] || {
        id: '28151',
        name: '開発エンジニア',
        email: 'engineer@example.com',
        role: 'engineer',
        department: '開発組織',
        companyId: 1,
      };
    }

    const userName = getUserNameByRole(role);
    const department = getDepartmentByRole(role);
    const companyId = calculateCompanyId(id);

    const user: User = {
      id,
      name: userName,
      email: `${role}@example.com`,
      role: role === 'director' ? 'director' : role === 'accounting' ? 'accounting' : role === 'manager' ? 'manager' : 'engineer',
      department,
      companyId,
    };

    // キャッシュに保存
    users[id] = user;
    return user;
  },
};

