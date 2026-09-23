import { NextResponse } from 'next/server';
import { teamRangeQuery } from '@/lib/utils/team-progress';

const GAME_MASTER_SERVICE_URL =
  process.env.GAME_MASTER_SERVICE_URL || 'http://localhost:8006';
const GAME_MASTER_SERVICE_INTERNAL_API_KEY =
  process.env.GAME_MASTER_SERVICE_INTERNAL_API_KEY || 'InternalServiceApiKeyForGameDayWorkflow2024!';

export async function GET(request: Request) {
  // 表示するチームのレンジ(from/to)はボードのURLで指定される。game-masterへそのまま渡す。
  const searchParams = new URL(request.url).searchParams;
  const query = teamRangeQuery(searchParams.get('from'), searchParams.get('to'));

  try {
    const response = await fetch(`${GAME_MASTER_SERVICE_URL}/api/v1/admin/team-progress${query}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': GAME_MASTER_SERVICE_INTERNAL_API_KEY,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json({ totalChapters: 0, teams: [] });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`[team-progress BFF] game-masterへの接続に失敗しました: ${errorMessage}`);
    return NextResponse.json({ totalChapters: 0, teams: [] });
  }
}
