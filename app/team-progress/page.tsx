import TeamProgressBoard from '@/components/TeamProgressBoard';

/**
 * 進捗ボード。?from=51&to=100 のように表示するチームのレンジを指定できる。
 * 同じ日に2回開催するとき、前の回のチームを混ぜないために使う。
 */
export default async function TeamProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;

  return <TeamProgressBoard from={from} to={to} />;
}
