import type { TeamChapterScore } from '@/lib/api/types';

/** ランキング1行分の表示状態 */
export interface DisplayTeam {
  id: string;
  /** カウントアップの目標値。総括中は「そのチャプターまでの累計」を段階的に入れる */
  score: number;
  /** 並び替えに使うスコア。scoreより遅れて更新することで「加点 → 並び替え」を演出する */
  sortingScore: number;
  maxScore: number;
}

export interface RankedTeam extends DisplayTeam {
  rank: number;
  /** ボード内での縦位置(px) */
  y: number;
}

export const ROW_HEIGHT = 120;
export const FIRST_PLACE_ROW_HEIGHT = 180;

/**
 * スコアの高い順に並べ、同点は同順位・次の順位は人数分飛ばす(1,1,3,...)。
 * 併せて、各行をボード内のどの高さに置くかも決める。
 */
export function withRanks(teams: DisplayTeam[], isWinnerDetermined: boolean): RankedTeam[] {
  const sorted = [...teams].sort((a, b) => b.sortingScore - a.sortingScore);

  let currentRank = 1;
  let previousScore: number | null = null;

  const ranked = sorted.map((team, index) => {
    if (previousScore !== null && team.sortingScore < previousScore) {
      currentRank = index + 1;
    }
    previousScore = team.sortingScore;

    return { ...team, rank: currentRank };
  });

  // 1位の行が大きくなるのは「単独1位を確定演出しているとき」だけ。その場合だけ2位以降を
  // その分だけ下にずらす(同点1位なら全行が通常の高さなので通常の間隔でよい)。
  const isSoloFirstPlace = ranked.filter((team) => team.rank === 1).length === 1;
  const firstPlaceHeight = isWinnerDetermined && isSoloFirstPlace ? FIRST_PLACE_ROW_HEIGHT : ROW_HEIGHT;

  return ranked.map((team, index) => ({
    ...team,
    y: index === 0 ? 0 : firstPlaceHeight + (index - 1) * ROW_HEIGHT,
  }));
}

/** 指定したチャプターまでの累計スコア。upToが最初のチャプターより前なら0になる。 */
export function cumulativeScoreUpTo(chapters: TeamChapterScore[], upTo: number): number {
  return chapters
    .filter((chapter) => chapter.chapter <= upTo)
    .reduce((total, chapter) => total + chapter.score, 0);
}
