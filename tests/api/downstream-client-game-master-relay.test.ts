/**
 * @jest-environment node
 */
import { DownstreamClient } from '@/lib/graphql/downstream-client';

/**
 * BFF(downstream-client)自身も、他のリクエストの処理中にgame-masterを呼んではいけない
 * (userやapplication-approvalから直接呼ばないようにしたのと同じ理由: ログイン・申請作成・
 * 承認・暫定対応適用のトレースにgame-masterが混ざってしまう)。
 *
 * 章クリアの引換券やgame-masterの状態スナップショットは、BFFがその場で中継/取得するのでは
 * なく、レスポンスにそのまま載せて返す(またはリクエストの引数として渡してもらう)だけにする。
 * 実際にgame-masterへ届ける/取得するのはブラウザが別リクエストとして行う
 * (getGameStateSnapshot・applyGameProgress・clearHiddenQuestを個別に呼ぶ)。
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

describe('DownstreamClient: game-masterへの呼び出しを他のリクエストの処理に混ぜない', () => {
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

  it('ログインは章0の引換券をそのまま返すだけで、game-masterへは問い合わせない', async () => {
    const { client, calls } = setup({
      [`${USER}/auth/login`]: { token: 'jwt-after-login', user: { id: '7' }, chapterClearTokens: ['clear-0'] },
    });

    const result = await client.login({ email: 'a@example.com', password: 'p' });

    expect(result.chapterClearTokens).toEqual(['clear-0']);
    expect(calls.map((c) => c.url)).toEqual([`${USER}/auth/login`]);
  });

  it('申請作成は渡されたgameStateTokenをヘッダに添えるだけで、game-masterへは問い合わせない', async () => {
    const { client, calls } = setup({
      [`${APPLICATION}/api/v1/applications`]: { id: '1', type: 'promotion', chapterClearTokens: ['clear-5'] },
    });

    const result = await client.createApplication(
      { type: 'promotion', title: 't', description: 'd', applicantId: '7', gameStateToken: 'snapshot' },
      'jwt'
    );

    expect(calls.map((c) => c.url)).toEqual([`${APPLICATION}/api/v1/applications`]);
    expect(headerOf(calls[0], 'X-Game-State')).toBe('snapshot');
    // 章5の引換券もそのまま返すだけ(game-masterへは届けない)
    expect(result.chapterClearTokens).toEqual(['clear-5']);
  });

  it('gameStateTokenが渡されなければヘッダを付けない(game-masterの状態を参照しない申請と同じ扱い)', async () => {
    const { client, calls } = setup({
      [`${APPLICATION}/api/v1/applications`]: { id: '1', type: 'promotion' },
    });

    await client.createApplication(
      { type: 'promotion', title: 't', description: 'd', applicantId: '7' },
      'jwt'
    );

    expect(headerOf(calls[0], 'X-Game-State')).toBeUndefined();
  });

  it('game-masterの状態を参照しない申請(expense)ではgameStateTokenを渡されても無視する', async () => {
    const { client, calls } = setup({
      [`${APPLICATION}/api/v1/applications`]: { id: '1', type: 'expense' },
    });

    await client.createApplication(
      { type: 'expense', title: 't', description: 'd', amount: 100, applicantId: '7', gameStateToken: 'snapshot' },
      'jwt'
    );

    expect(calls.map((c) => c.url)).toEqual([`${APPLICATION}/api/v1/applications`]);
    expect(headerOf(calls[0], 'X-Game-State')).toBeUndefined();
  });

  it('承認完了はgameProgressTokenをそのまま返すだけで、game-masterへは問い合わせない', async () => {
    const { client, calls } = setup({
      [`${APPLICATION}/api/v1/approvals/update`]: {
        success: true,
        message: 'ok',
        applicationStatus: 'approved',
        gameProgressToken: 'progress',
      },
    });

    const approval = await client.updateApproval(
      'a1',
      { status: 'approved', approverId: '8', applicationId: 'app1' },
      'jwt'
    );

    expect(approval.gameProgressToken).toBe('progress');
    expect(calls.map((c) => c.url)).toEqual([`${APPLICATION}/api/v1/approvals/update`]);
  });

  it('ランブックの暫定対応は渡されたgameStateTokenをヘッダに添えるだけで、game-masterへは問い合わせない', async () => {
    const { client, calls } = setup({
      [`${APPLICATION}/api/v1/remediations/approved-list-slow`]: { applied: true, alreadyApplied: false },
    });

    await client.applyApprovedListRemediation('snapshot', 'jwt');

    expect(calls.map((c) => c.url)).toEqual([`${APPLICATION}/api/v1/remediations/approved-list-slow`]);
    expect(headerOf(calls[0], 'X-Game-State')).toBe('snapshot');
  });
});

describe('DownstreamClient: ブラウザが個別に呼ぶgame-master向けの公開メソッド', () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.USE_DOWNSTREAM_STUBS = 'false';
    process.env.GAME_MASTER_SERVICE_URL = GAME_MASTER;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
  });

  it('getGameStateSnapshotはgame-masterのスナップショットを取得する', async () => {
    const { client, calls } = setup({
      [`${GAME_MASTER}/api/v1/game-progress/snapshot`]: { token: 'snapshot' },
    });

    const token = await client.getGameStateSnapshot('jwt');

    expect(token).toBe('snapshot');
    expect(calls.map((c) => c.url)).toEqual([`${GAME_MASTER}/api/v1/game-progress/snapshot`]);
  });

  it('applyGameProgressは引換券をgame-masterへ届けて仮想時間を進める', async () => {
    const { client, calls } = setup({
      [`${GAME_MASTER}/api/v1/game-progress/apply-approved-application`]: { applied: true },
    });

    const applied = await client.applyGameProgress('progress', 'jwt');

    expect(applied).toBe(true);
    const call = calls.find((c) => c.url === `${GAME_MASTER}/api/v1/game-progress/apply-approved-application`);
    expect(JSON.parse(String(call!.init.body))).toEqual({ token: 'progress' });
  });
});
