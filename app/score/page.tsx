import TeamScoreBoard from '@/components/TeamScoreBoard';

/**
 * ランキングボード。?from=51&to=100 のように表示するチームのレンジを指定できる。
 * 同じ日に2回開催するとき、前の回のチームを混ぜないために使う。
 *
 * ?eventId=xxxx を付けるとDojoへの点数転記ボタンが出る(Dojoの
 * /admin/gameday-events/{eventId} のIDを指定する)。誤操作を避けるため、
 * eventIdが無いときはボタンを出さない。
 */
export default async function ScorePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; eventId?: string }>;
}) {
  const { from, to, eventId } = await searchParams;

  return <TeamScoreBoard from={from} to={to} eventId={eventId} />;
}
