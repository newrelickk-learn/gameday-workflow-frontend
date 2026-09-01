import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChapterMissionPanels from '@/components/ChapterMissionPanels';

const getChapterMissions = jest.fn();
const getClearedChapters = jest.fn();

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    chapters: {
      getChapterMissions: () => getChapterMissions(),
      getClearedChapters: () => getClearedChapters(),
    },
  },
}));

const MISSIONS = [
  { chapter: 1, title: '第1章 経費申請', description: '経費を申請する', clearKeyword: 'AAA-BBB-CCC' },
  { chapter: 2, title: '第2章 国内出張', description: '国内出張を申請する', clearKeyword: null },
  { chapter: 3, title: '第3章 プロモーション', description: 'プロモーションを申請する', clearKeyword: null },
];

describe('ChapterMissionPanels', () => {
  beforeEach(() => {
    getChapterMissions.mockResolvedValue(MISSIONS);
  });

  it('クリア済みにCleared!!、次の章にNextのラベルをパネル内に表示する', async () => {
    getClearedChapters.mockResolvedValue([1]);
    render(<ChapterMissionPanels />);

    await waitFor(() => expect(screen.getAllByText('Cleared!!')).toHaveLength(1));
    expect(screen.getAllByText('Next')).toHaveLength(1);

    // Next は第2章のパネル内に描かれる
    const nextPanel = screen.getByText('第2章 国内出張').closest('.MuiCardContent-root');
    expect(nextPanel).not.toBeNull();
    expect(nextPanel).toHaveTextContent('Next');
  });

  it('次の章のミッションは開ける', async () => {
    getClearedChapters.mockResolvedValue([1]);
    render(<ChapterMissionPanels />);

    await waitFor(() => expect(screen.getByText('Next')).toBeInTheDocument());
    fireEvent.click(screen.getByText('第2章 国内出張'));

    await waitFor(() => expect(screen.getByText('国内出張を申請する')).toBeInTheDocument());
  });

  it('まだ順番が来ていない章は開けない', async () => {
    getClearedChapters.mockResolvedValue([1]);
    render(<ChapterMissionPanels />);

    await waitFor(() => expect(screen.getByText('Next')).toBeInTheDocument());
    fireEvent.click(screen.getByText('第3章 プロモーション'));

    expect(screen.queryByText('プロモーションを申請する')).not.toBeInTheDocument();
  });

  it('全章クリア済みならNextラベルは表示されない', async () => {
    getClearedChapters.mockResolvedValue([1, 2, 3]);
    render(<ChapterMissionPanels />);

    await waitFor(() => expect(screen.getAllByText('Cleared!!')).toHaveLength(3));
    expect(screen.queryByText('Next')).not.toBeInTheDocument();
  });

  it('クリア済みミッションのカードには合言葉が表示される', async () => {
    getClearedChapters.mockResolvedValue([1]);
    render(<ChapterMissionPanels />);

    await waitFor(() => expect(screen.getByText('合言葉: AAA-BBB-CCC')).toBeInTheDocument());
  });

  it('未クリアミッションのカードには合言葉が表示されない', async () => {
    getClearedChapters.mockResolvedValue([1]);
    render(<ChapterMissionPanels />);

    await waitFor(() => expect(screen.getByText('Next')).toBeInTheDocument());
    expect(screen.getAllByText(/合言葉:/)).toHaveLength(1);
  });
});
