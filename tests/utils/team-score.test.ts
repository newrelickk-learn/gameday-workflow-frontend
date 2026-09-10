import { cumulativeScoreUpTo, withRanks } from '@/lib/utils/team-score';
import type { TeamChapterScore } from '@/lib/api/types';

const team = (id: string, sortingScore: number) => ({
  id,
  score: sortingScore,
  sortingScore,
  maxScore: 3000,
});

const chapterScore = (chapter: number, score: number): TeamChapterScore => ({
  chapter,
  cleared: score > 0,
  mistakeCount: 0,
  basePoints: score,
  penaltyPoints: 0,
  bonusPoints: 0,
  score,
});

describe('withRanks', () => {
  it('スコアの高い順に並べて順位を付ける', () => {
    const ranked = withRanks([team('2', 1000), team('1', 2500), team('3', 0)], false);

    expect(ranked.map((t) => t.id)).toEqual(['1', '2', '3']);
    expect(ranked.map((t) => t.rank)).toEqual([1, 2, 3]);
  });

  it('同点は同順位にし、次の順位は人数分飛ばす', () => {
    const ranked = withRanks([team('1', 2000), team('2', 2000), team('3', 500)], false);

    expect(ranked.map((t) => t.rank)).toEqual([1, 1, 3]);
  });

  it('1位が単独かつ確定演出中は、2位以降を下にずらして余白を空ける', () => {
    const ranked = withRanks([team('1', 2000), team('2', 1000), team('3', 500)], true);

    expect(ranked.map((t) => t.y)).toEqual([0, 180, 300]);
  });

  it('確定前は1位も通常の間隔のままにする', () => {
    const ranked = withRanks([team('1', 2000), team('2', 1000), team('3', 500)], false);

    expect(ranked.map((t) => t.y)).toEqual([0, 120, 240]);
  });

  it('1位が同点なら確定演出中でも通常の間隔にする', () => {
    const ranked = withRanks([team('1', 2000), team('2', 2000), team('3', 500)], true);

    expect(ranked.map((t) => t.y)).toEqual([0, 120, 240]);
  });
});

describe('cumulativeScoreUpTo', () => {
  const chapters = [chapterScore(0, 1300), chapterScore(1, 950), chapterScore(2, 0)];

  it('指定したチャプターまでの合計を返す', () => {
    expect(cumulativeScoreUpTo(chapters, 1)).toBe(2250);
    expect(cumulativeScoreUpTo(chapters, 2)).toBe(2250);
  });

  it('最初のチャプターより前を指定すると0になる', () => {
    expect(cumulativeScoreUpTo(chapters, -1)).toBe(0);
  });
});
