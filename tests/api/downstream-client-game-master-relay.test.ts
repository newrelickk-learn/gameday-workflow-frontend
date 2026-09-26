/**
 * @jest-environment node
 */
import { DownstreamClient } from '@/lib/graphql/downstream-client';

/**
 * game-masterを呼ぶのはBFFだけにする(issue #3)。userやapplication-approvalが返した引換券を
 * BFFがgame-masterへ届けることと、game-masterのスナップショットをapplication-approvalへ
 * 添えることを確認する。
 */

const GAME_MASTER = 'http://game-master.test';
const USER = 'http://user.test';
const APPLICATION = 'http://application.test';

type Call = { url: string; init: RequestInit };

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
    headers: new Headers(),
  } as unknown as Response;
}

function setup(routes: Record<string, unknown>): { client: DownstreamClient; calls: Call[] } {
  const calls: Call[] = [];
  global.fetch = jest.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    calls.push({ url, init });
    const route = Object.keys(routes).find((path) => url.startsWith(path));
    if (!route) {
      throw new Error(`unexpected request: ${url}`);
    }
    return jsonResponse(routes[route]);
  }) as typeof fetch;
  return { client: new DownstreamClient(), calls };
}

const headerOf = (call: Call, name: string) => (call.init.headers as Record<string, string>)[name];

describe('DownstreamClient: game-masterへの中継', () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.USE_DOWNSTREAM_STUBS = 'false';
    process.env.GAME_MASTER_SERVICE_URL = GAME_MASTER;
    process.env.USER_SERVICE_URL = USER;
    process.env.APPLICATION_SERVICE_URL = APPLICATION;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
  });

  it('ログインで返った章0の引換券を、ログイン直後のトークンでgame-masterへ届ける', async () => {
    const { client, calls } = setup({
      [`${USER}/auth/login`]: { token: 'jwt-after-login', user: { id: '7' }, chapterClearTokens: ['clear-0'] },
      [`${GAME_MASTER}/api/v1/chapters/hidden-clear`]: { cleared: true },
    });

    await client.login({ email: 'a@example.com', password: 'p' });

    const relay = calls.find((c) => c.url === `${GAME_MASTER}/api/v1/chapters/hidden-clear`);
    expect(relay).toBeDefined();
    expect(JSON.parse(String(relay!.init.body))).toEqual({ token: 'clear-0' });
    expect(headerOf(relay!, 'Authorization')).toBe('Bearer jwt-after-login');
  });

  it('プロモーション申請にはスナップショットを添え、返った章5の引換券をgame-masterへ届ける', async () => {
    const { client, calls } = setup({
      [`${GAME_MASTER}/api/v1/game-progress/snapshot`]: { token: 'snapshot' },
      [`${APPLICATION}/api/v1/applications`]: { id: '1', type: 'promotion', chapterClearTokens: ['clear-5'] },
      [`${GAME_MASTER}/api/v1/chapters/hidden-clear`]: { cleared: true },
    });

    await client.createApplication(
      { type: 'promotion', title: 't', description: 'd', applicantId: '7' },
      'jwt'
    );

    const create = calls.find((c) => c.url === `${APPLICATION}/api/v1/applications`);
    expect(headerOf(create!, 'X-Game-State')).toBe('snapshot');
    const relay = calls.find((c) => c.url === `${GAME_MASTER}/api/v1/chapters/hidden-clear`);
    expect(JSON.parse(String(relay!.init.body))).toEqual({ token: 'clear-5' });
  });

  it('game-masterの状態を参照しない申請ではスナップショットを取得しない', async () => {
    const { client, calls } = setup({
      [`${APPLICATION}/api/v1/applications`]: { id: '1', type: 'expense' },
    });

    await client.createApplication(
      { type: 'expense', title: 't', description: 'd', amount: 100, applicantId: '7' },
      'jwt'
    );

    expect(calls.map((c) => c.url)).toEqual([`${APPLICATION}/api/v1/applications`]);
  });

  it('承認完了で返った引換券をgame-masterへ届けて仮想時間を進める', async () => {
    const { client, calls } = setup({
      [`${APPLICATION}/api/v1/approvals/update`]: {
        success: true,
        message: 'ok',
        applicationStatus: 'approved',
        gameProgressToken: 'progress',
      },
      [`${GAME_MASTER}/api/v1/game-progress/apply-approved-application`]: { applied: true },
    });

    await client.updateApproval('a1', { status: 'approved', approverId: '8', applicationId: 'app1' }, 'jwt');

    const relay = calls.find((c) => c.url === `${GAME_MASTER}/api/v1/game-progress/apply-approved-application`);
    expect(JSON.parse(String(relay!.init.body))).toEqual({ token: 'progress' });
  });

  it('ランブックの暫定対応にもスナップショットを添える', async () => {
    const { client, calls } = setup({
      [`${GAME_MASTER}/api/v1/game-progress/snapshot`]: { token: 'snapshot' },
      [`${APPLICATION}/api/v1/remediations/approved-list-slow`]: { applied: true, alreadyApplied: false },
    });

    await client.applyApprovedListRemediation('jwt');

    const apply = calls.find((c) => c.url === `${APPLICATION}/api/v1/remediations/approved-list-slow`);
    expect(headerOf(apply!, 'X-Game-State')).toBe('snapshot');
  });
});
