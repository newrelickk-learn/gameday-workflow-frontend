import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TeamScoreBoard from '@/components/TeamScoreBoard';

const scoresResponse = {
  totalChapters: 9,
  maxScore: 9300,
  from: 51,
  to: 100,
  chapters: [{ chapter: 0, title: 'ログイン', clearPoints: 1000, mistakePenaltyPoints: 50, bonusPoints: [300, 200, 150, 120, 100] }],
  teams: [
    { companyId: '51', totalScore: 1300, clearedChapters: 1, chapters: [] },
    { companyId: '52', totalScore: 1000, clearedChapters: 1, chapters: [] },
  ],
};

const mockFetch = (transfer: { status: number; body: unknown }) =>
  jest.fn((url: string, init?: RequestInit) => {
    if (typeof url === 'string' && url.startsWith('/api/team-scores/transfer')) {
      return Promise.resolve({
        ok: transfer.status < 400,
        status: transfer.status,
        json: () => Promise.resolve(transfer.body),
        // 送った中身を検証できるように残す
        requestInit: init,
      } as unknown as Response);
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(scoresResponse),
    } as unknown as Response);
  });

describe('TeamScoreBoard の点数転記', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('eventIdが無ければ転記ボタンを出さない', async () => {
    global.fetch = mockFetch({ status: 200, body: {} }) as unknown as typeof fetch;

    render(<TeamScoreBoard from="51" to="100" />);

    await waitFor(() => expect(screen.getByText('AY')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: '点数を転記' })).not.toBeInTheDocument();
  });

  it('確認してからレンジとeventIdを付けて転記する', async () => {
    const fetchMock = mockFetch({
      status: 200,
      body: { saved: [{ teamId: 't1', teamSlot: 51, name: 'AY', score: 1300 }], unmatched: [{ teamSlot: 52 }] },
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<TeamScoreBoard from="51" to="100" eventId="event-1" />);

    // スコアが届くまでボタンは押せない(転記するものが無いため)
    await screen.findByText('AY');
    fireEvent.click(screen.getByRole('button', { name: '点数を転記' }));
    // 確認するまでは送らない
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/transfer'))).toBe(false);
    expect(screen.getByText(/Dojo側の点数は上書きされます/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '転記する' }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([url]) => String(url).includes('/transfer'));
      expect(call).toBeDefined();
      expect(JSON.parse(String(call?.[1]?.body))).toEqual({ eventId: 'event-1', from: '51', to: '100' });
    });

    // 保存できた件数と、開催に対応しなかった件数の両方を出す
    expect(await screen.findByText(/1チーム分を転記しました。/)).toBeInTheDocument();
    expect(screen.getByText(/1チームはこの開催に対応しなかった/)).toBeInTheDocument();
  });

  it('失敗したら理由を表示する', async () => {
    global.fetch = mockFetch({
      status: 400,
      body: { error: 'TRANSFER_FAILED', message: 'Dojoが転記を受け付けませんでした: イベントが見つかりません' },
    }) as unknown as typeof fetch;

    render(<TeamScoreBoard from="51" to="100" eventId="event-unknown" />);

    await screen.findByText('AY');
    fireEvent.click(screen.getByRole('button', { name: '点数を転記' }));
    fireEvent.click(screen.getByRole('button', { name: '転記する' }));

    expect(await screen.findByText(/イベントが見つかりません/)).toBeInTheDocument();
  });
});
