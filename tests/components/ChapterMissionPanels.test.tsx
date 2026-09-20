import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChapterMissionPanels from '@/components/ChapterMissionPanels';

const getChapterMissions = jest.fn();
const getChallengeStatus = jest.fn();
const startChallenge = jest.fn();

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    chapters: {
      getChapterMissions: () => getChapterMissions(),
      getChallengeStatus: () => getChallengeStatus(),
      startChallenge: (chapter: number) => startChallenge(chapter),
    },
  },
}));

const mainMission = (chapter: number, overrides = {}) => ({
  chapter,
  kind: 'main',
  title: `第${chapter}章`,
  description: `第${chapter}章の説明`,
  clearKeyword: null,
  cleared: false,
  challengeable: true,
  unlocked: true,
  revealed: true,
  ...overrides,
});

// 章0(ログイン)と章5(プロモーション)は挑戦の対象外、章1〜4が順不同
const MISSIONS = [
  mainMission(0, { title: '第0章 ログイン', cleared: true, challengeable: false, clearKeyword: 'AAA-BBB-CCC' }),
  mainMission(1, { title: '第1章 経費申請' }),
  mainMission(2, { title: '第2章 承認済み一覧' }),
  mainMission(5, { title: '第5章 プロモーション', challengeable: false, unlocked: false }),
  {
    chapter: 101,
    kind: 'hidden',
    title: null,
    description: null,
    clearKeyword: null,
    cleared: false,
    challengeable: false,
    unlocked: false,
    revealed: false,
  },
];

describe('ChapterMissionPanels', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getChapterMissions.mockResolvedValue(MISSIONS);
    getChallengeStatus.mockResolvedValue({
      counts: [
        { chapter: 1, teams: 3 },
        { chapter: 2, teams: 1 },
      ],
      activeChapter: null,
    });
    startChallenge.mockResolvedValue({ started: true, reason: 'started', activeChapter: 1 });
  });

  it('クリア済みのクエストにはCleared!!と合言葉が表示される', async () => {
    render(<ChapterMissionPanels />);

    await waitFor(() => expect(screen.getByText('Cleared!!')).toBeInTheDocument());
    expect(screen.getByText('合言葉: AAA-BBB-CCC')).toBeInTheDocument();
  });

  it('挑戦中のチーム数がパネルに表示される', async () => {
    render(<ChapterMissionPanels />);

    await waitFor(() => expect(screen.getByText('3チームが挑戦中')).toBeInTheDocument());
    expect(screen.getByText('1チームが挑戦中')).toBeInTheDocument();
  });

  it('どれにも挑戦していなければ、どの順番のクエストからでも挑戦できる', async () => {
    render(<ChapterMissionPanels />);

    await waitFor(() => expect(screen.getByText('第2章 承認済み一覧')).toBeInTheDocument());
    fireEvent.click(screen.getByText('第2章 承認済み一覧'));

    await waitFor(() => expect(screen.getByText('第2章の説明')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'このクエストに挑戦する' }));

    await waitFor(() => expect(startChallenge).toHaveBeenCalledWith(2));
  });

  it('すでに別のクエストに挑戦中なら、他のクエストには挑戦できない', async () => {
    getChallengeStatus.mockResolvedValue({
      counts: [{ chapter: 1, teams: 3 }],
      activeChapter: 1,
    });
    render(<ChapterMissionPanels />);

    await waitFor(() => expect(screen.getByText('挑戦中')).toBeInTheDocument());
    fireEvent.click(screen.getByText('第2章 承認済み一覧'));

    await waitFor(() =>
      expect(
        screen.getByText('挑戦中のクエストをクリアするまで、他のクエストには挑戦できません。')
      ).toBeInTheDocument()
    );
    expect(screen.getByRole('button', { name: 'このクエストに挑戦する' })).toBeDisabled();
    expect(startChallenge).not.toHaveBeenCalled();
  });

  it('挑戦中のクエストには挑戦中ラベルが付く', async () => {
    getChallengeStatus.mockResolvedValue({ counts: [], activeChapter: 1 });
    render(<ChapterMissionPanels />);

    await waitFor(() => expect(screen.getByText('挑戦中')).toBeInTheDocument());
    const panel = screen.getByText('第1章 経費申請').closest('.MuiCardContent-root');
    expect(panel).toHaveTextContent('挑戦中');
  });

  it('未クリアの裏クエストはタイトルも説明も見えず、開くこともできない', async () => {
    render(<ChapterMissionPanels />);

    await waitFor(() => expect(screen.getByText('第1章 経費申請')).toBeInTheDocument());
    // 表裏の2面とも「？」なので2つ
    expect(screen.getAllByText('？')).toHaveLength(2);

    fireEvent.click(screen.getAllByText('？')[0]);
    expect(screen.queryByRole('button', { name: 'このクエストに挑戦する' })).not.toBeInTheDocument();
  });

  it('クリア済みの裏クエストはタイトルが見える', async () => {
    getChapterMissions.mockResolvedValue([
      ...MISSIONS.slice(0, 4),
      {
        chapter: 101,
        kind: 'hidden',
        title: '裏クエスト1',
        description: null,
        clearKeyword: null,
        cleared: true,
        challengeable: false,
        unlocked: false,
        revealed: true,
      },
    ]);
    render(<ChapterMissionPanels />);

    await waitFor(() => expect(screen.getByText('裏クエスト1')).toBeInTheDocument());
  });

  it('未開封のクエストは問題文もタイトルも表示しない', async () => {
    getChapterMissions.mockResolvedValue([
      MISSIONS[0],
      mainMission(1, { title: null, description: null, revealed: false }),
      mainMission(2, { title: null, description: null, revealed: false }),
    ]);
    render(<ChapterMissionPanels />);

    await waitFor(() =>
      expect(screen.getAllByText('どのクエストかは挑戦すると分かります')).toHaveLength(2)
    );
    expect(screen.queryByText('第1章')).not.toBeInTheDocument();
    expect(screen.queryByText('第1章の説明')).not.toBeInTheDocument();
    // チーム数は伏せずに出す
    expect(screen.getByText('3チームが挑戦中')).toBeInTheDocument();
  });

  it('挑戦を開始すると、その場で内容が表示される', async () => {
    const sealed = mainMission(1, { title: null, description: null, revealed: false });
    const revealed = mainMission(1, { revealed: true });
    getChapterMissions.mockResolvedValueOnce([MISSIONS[0], sealed]);
    render(<ChapterMissionPanels />);

    await waitFor(() =>
      expect(screen.getByText('どのクエストかは挑戦すると分かります')).toBeInTheDocument()
    );
    fireEvent.click(screen.getByText('どのクエストかは挑戦すると分かります'));

    await waitFor(() =>
      expect(screen.getByText(/クエストの内容は、挑戦を開始すると表示されます/)).toBeInTheDocument()
    );

    getChapterMissions.mockResolvedValue([MISSIONS[0], revealed]);
    getChallengeStatus.mockResolvedValue({ counts: [{ chapter: 1, teams: 1 }], activeChapter: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'このクエストに挑戦する' }));

    await waitFor(() => expect(screen.getByText('第1章の説明')).toBeInTheDocument());
  });

  it('挑戦できないクエストにはチーム数を表示しない', async () => {
    render(<ChapterMissionPanels />);

    await waitFor(() => expect(screen.getByText('第5章 プロモーション')).toBeInTheDocument());
    const panel = screen.getByText('第5章 プロモーション').closest('.MuiCardContent-root');
    expect(panel).not.toHaveTextContent('チームが挑戦中');
  });
});
