import type { LoginRequest, LoginResponse, User } from '../types';

function getUserRoleFromId(userId: string): 'director' | 'accounting' | 'manager' | 'engineer' | 'hr' | 'unknown' {
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

function calculateCompanyId(userId: string): number {
  const id = parseInt(userId, 10);
  if (isNaN(id)) {
    return 1;
  }
  
  if (id >= 1051 && id <= 1100) {
    return id - 1051 + 1;
  }
  if (id >= 16051 && id <= 16100) {
    return id - 16051 + 1;
  }
  if (id >= 21051 && id <= 21100) {
    return id - 21051 + 1;
  }
  if (id >= 28151 && id <= 28200) {
    return id - 28151 + 1;
  }
  if (id >= 31051 && id <= 31100) {
    return id - 31051 + 1;
  }

  return 1;
}

function getUserIdByRoleAndCompany(role: 'director' | 'accounting' | 'manager' | 'engineer', companyId: number): string {
  const companyIdClamped = Math.max(1, Math.min(50, companyId));
  
  switch (role) {
    case 'director':
      return String(1051 + companyIdClamped - 1);
    case 'accounting':
      return String(16051 + companyIdClamped - 1);
    case 'manager':
      return String(21051 + companyIdClamped - 1);
    case 'engineer':
      return String(28151 + companyIdClamped - 1);
    default:
      return String(28151 + companyIdClamped - 1);
  }
}

function getUserIdByRole(role: 'director' | 'accounting' | 'manager' | 'engineer'): string {
  return getUserIdByRoleAndCompany(role, 1);
}

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
  return 'engineer';
}

function getUserNameByRole(role: 'director' | 'accounting' | 'manager' | 'engineer' | 'hr'): string {
  switch (role) {
    case 'director':
      return '開発本部長';
    case 'accounting':
      return '経理担当';
    case 'manager':
      return '上長';
    case 'engineer':
      return '開発エンジニア';
    case 'hr':
      return '人事';
    default:
      return '開発エンジニア';
  }
}

function getDepartmentByRole(role: 'director' | 'accounting' | 'manager' | 'engineer' | 'hr'): string {
  switch (role) {
    case 'director':
      return '開発組織';
    case 'accounting':
      return '管理組織';
    case 'manager':
      return '開発組織';
    case 'engineer':
      return '開発組織';
    case 'hr':
      return '人事部';
    default:
      return '開発組織';
  }
}

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
  '31051': {
    id: '31051',
    name: '人事',
    email: 'hr@example.com',
    role: 'hr',
    department: '人事部',
    companyId: 1,
  },
};

export const stubUserService = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const existingUser = Object.values(users).find(u => u.email === credentials.email);
    
    if (existingUser) {
      return {
        token: `mock-jwt-token-${existingUser.id}`,
        user: existingUser,
      };
    }

    const role = getRoleFromEmail(credentials.email);
    const userId = getUserIdByRole(role);
    const userName = getUserNameByRole(role);
    const department = getDepartmentByRole(role);

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
    if (users[id]) {
      return users[id];
    }

    const role = getUserRoleFromId(id);
    if (role === 'unknown') {
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
      role,
      department,
      companyId,
    };

    users[id] = user;
    return user;
  },

  async getUsersByCompany(): Promise<User[]> {
    return Object.values(users).filter((u) => u.companyId === 1);
  },

  async updateUserManager(id: string, managerId: number | null): Promise<User> {
    const existing = users[id] ?? (await this.getUser(id));
    const updated: User = { ...existing, managerId };
    users[id] = updated;
    return updated;
  },
};

