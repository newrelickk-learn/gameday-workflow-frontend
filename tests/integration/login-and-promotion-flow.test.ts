
const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:3000/api/graphql';

const MANAGER = {
  id: '21051',
  email: 'nishiyama.takashi@learn.nrkk.technology',
  password: 'password',
};

async function graphqlRequest<T>(query: string, variables?: Record<string, unknown>, token?: string): Promise<T> {
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ query, variables }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  const json = JSON.parse(text);
  if (json.errors && json.errors.length > 0) {
    throw new Error(json.errors[0]?.message || JSON.stringify(json.errors));
  }
  return json.data as T;
}

const useRealApi = process.env.NEXT_PUBLIC_USE_STUBS !== 'true';

describe('ログイン〜プロモーション申請フロー（統合）', () => {
  beforeAll(() => {
    if (!useRealApi) {
      console.warn(
        '[integration] NEXT_PUBLIC_USE_STUBS が true のためスキップします。' +
          '実際の戻り値を確認するには: NEXT_PUBLIC_USE_STUBS=false npm test -- tests/integration/login-and-promotion-flow.test.ts'
      );
    }
  });

  it('上長でログインしたときの戻り値（token / user.id / user.role）を検証する', async () => {
    if (!useRealApi) {
      console.log('[integration] スキップ（スタブモード）');
      return;
    }
    const loginMutation = `
      mutation Login($input: LoginInput!) {
        login(input: $input) {
          token
          user { id name email role department companyId }
        }
      }
    `;
    const data = await graphqlRequest<{ login: { token: string; user: { id: string; role: string; [k: string]: unknown } } }>(
      loginMutation,
      { input: { email: MANAGER.email, password: MANAGER.password } }
    ).catch((e) => {
      if (process.env.NEXT_PUBLIC_USE_STUBS === 'true') throw e;
      console.log('[integration] ログイン応答の取得に失敗（サーバー未起動の可能性）:', e.message);
      throw e;
    });

    expect(data).toBeDefined();
    expect(data.login).toBeDefined();
    expect(data.login.token).toBeDefined();
    expect(typeof data.login.token).toBe('string');
    expect(data.login.user).toBeDefined();
    expect(data.login.user.id).toBeDefined();
    expect(data.login.user.role).toBeDefined();

    const { token, user } = data.login;
    const userId = user.id === undefined ? '(なし)' : String(user.id);
    const userRole = user.role === undefined ? '(なし)' : String(user.role);
    console.log('[integration] ログイン応答:', {
      tokenLength: token?.length ?? 0,
      tokenPreview: token ? `${token.slice(0, 30)}...` : '(なし)',
      'user.id': userId,
      'user.role': userRole,
      'user (full)': user,
    });

    expect(userId).toBe(MANAGER.id);
    expect(userRole.toLowerCase()).toBe('manager');
  }, 15000);

  it('上長ログイン後にプロモーション申請したときの戻り値（成功 or エラー内容）を検証する', async () => {
    if (!useRealApi) {
      console.log('[integration] スキップ（スタブモード）');
      return;
    }
    const loginMutation = `
      mutation Login($input: LoginInput!) {
        login(input: $input) { token user { id role } }
      }
    `;
    const loginData = await graphqlRequest<{ login: { token: string; user: { id: string; role: string } } }>(
      loginMutation,
      { input: { email: MANAGER.email, password: MANAGER.password } }
    ).catch((e) => {
      console.log('[integration] ログイン失敗:', e.message);
      throw e;
    });

    const token = loginData.login.token;
    expect(token).toBeTruthy();
    console.log('[integration] 取得したトークンでプロモーション申請を実行');

    const createMutation = `
      mutation CreateApplication($input: CreateApplicationInput!) {
        createApplication(input: $input) {
          id type title status applicantId createdAt
        }
      }
    `;
    const input = {
      type: 'promotion',
      title: '開発エンジニアAの昇格申請',
      description: '優秀なパフォーマンスにより、シニアエンジニアへの昇格を申請',
      applicantId: MANAGER.id,
    };

    let createData: unknown = null;
    let createError: string | null = null;
    try {
      createData = await graphqlRequest<{ createApplication: unknown }>(createMutation, { input }, token);
      console.log('[integration] プロモーション申請 成功:', JSON.stringify(createData, null, 2));
    } catch (e) {
      createError = e instanceof Error ? e.message : String(e);
      console.log('[integration] プロモーション申請 エラー:', createError);
    }

    if (createError) {
      expect(createError).toBeDefined();
      expect(createError).toContain('PERMISSION_DENIED');
      expect(createError).toContain('上長');
      return;
    }

    expect(createData).toBeDefined();
    expect((createData as { createApplication?: { id: string } }).createApplication).toBeDefined();
    expect((createData as { createApplication: { applicantId: string } }).createApplication.applicantId).toBe(MANAGER.id);
  }, 15000);
});
