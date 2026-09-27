import { DownstreamClient } from '@/lib/graphql/downstream-client';
import { generateResolutionCode } from '@/lib/travel/resolution-code';

/**
 * estimateTravelCost()はchapter3(旅費概算のタイムアウト障害)のクリア状況を
 * 呼び出し元(ブラウザ)から受け取るようになっており、この関数自身はgame-masterに
 * 問い合わせない(申請作成の一連の流れにgame-masterへのサーバー間呼び出しを
 * 混ぜないため)。その前提を壊さないことを確認する。
 */
describe('DownstreamClient.estimateTravelCost', () => {
  const CITIES = [
    { id: 1, nameJa: '東京', nameEn: 'Tokyo', isUnstable: false },
    { id: 11, nameJa: '北九州', nameEn: 'Kitakyushu', isUnstable: true },
  ];

  const originalEnv = process.env;
  let fetchMock: jest.Mock;

  const buildClient = () => {
    process.env = {
      ...originalEnv,
      USE_DOWNSTREAM_STUBS: 'false',
      TRAVEL_SERVICE_URL: 'http://travel',
      GAME_MASTER_SERVICE_URL: 'http://game-master',
    };
    return new DownstreamClient();
  };

  beforeEach(() => {
    fetchMock = jest.fn((url: string) => {
      if (String(url).includes('/cities')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(CITIES),
        } as unknown as Response);
      }
      if (String(url).includes('/estimate')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ amount: 12000, currency: 'JPY' }),
        } as unknown as Response);
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('game-masterには一切問い合わせない(chapters/progressを叩かない)', async () => {
    const client = buildClient();

    await client.estimateTravelCost({
      departureCityId: 1,
      arrivalCityId: 11,
      description: '出張のため',
      companyId: 1,
      isChapter3Cleared: true,
    });

    const calledUrls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(calledUrls.some((url) => url.includes('game-master'))).toBe(false);
  });

  it('isChapter3Cleared=trueなら、不安定な都市間でもバイパスする(X-Application-Codeが"s"始まり)', async () => {
    const client = buildClient();

    await client.estimateTravelCost({
      departureCityId: 1,
      arrivalCityId: 11,
      description: '出張のため',
      companyId: 1,
      isChapter3Cleared: true,
    });

    const [, options] = fetchMock.mock.calls.find(([url]) => String(url).includes('/estimate'))!;
    expect((options.headers as Record<string, string>)['X-Application-Code']).toMatch(/^s/);
  });

  it('isChapter3Cleared未指定かつ解決コードも書いていなければ、不安定な都市間ではバイパスしない', async () => {
    const client = buildClient();

    await client.estimateTravelCost({
      departureCityId: 1,
      arrivalCityId: 11,
      description: '出張のため',
      companyId: 1,
    });

    const [, options] = fetchMock.mock.calls.find(([url]) => String(url).includes('/estimate'))!;
    expect((options.headers as Record<string, string>)['X-Application-Code']).toMatch(/^b/);
  });

  it('isChapter3Cleared=falseでも、説明欄に解決コードを書けばバイパスする(既存の代替経路)', async () => {
    const client = buildClient();
    const code = generateResolutionCode(new Date(), 1);

    await client.estimateTravelCost({
      departureCityId: 1,
      arrivalCityId: 11,
      description: `出張のため。${code}`,
      companyId: 1,
      isChapter3Cleared: false,
    });

    const [, options] = fetchMock.mock.calls.find(([url]) => String(url).includes('/estimate'))!;
    expect((options.headers as Record<string, string>)['X-Application-Code']).toMatch(/^s/);
  });

  it('安定した都市間(北九州を含まない)なら、クリア状況によらずバイパスする', async () => {
    const client = buildClient();

    await client.estimateTravelCost({
      departureCityId: 1,
      arrivalCityId: 1,
      description: '出張のため',
      companyId: 1,
      isChapter3Cleared: false,
    });

    const [, options] = fetchMock.mock.calls.find(([url]) => String(url).includes('/estimate'))!;
    expect((options.headers as Record<string, string>)['X-Application-Code']).toMatch(/^s/);
  });
});
