import TeamScoreBoard from '@/components/TeamScoreBoard';

/**
 * ランキングボード。?from=51&to=100 のように表示するチームのレンジを指定できる。
 * 同じ日に2回開催するとき、前の回のチームを混ぜないために使う。
 */
export default async function ScorePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;

  return <TeamScoreBoard from={from} to={to} />;
}
