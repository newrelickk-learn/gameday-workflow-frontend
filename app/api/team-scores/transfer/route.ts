import { NextResponse } from 'next/server';

const GAME_MASTER_SERVICE_URL =
  process.env.GAME_MASTER_SERVICE_URL || 'http://localhost:8006';
const GAME_MASTER_SERVICE_INTERNAL_API_KEY =
  process.env.GAME_MASTER_SERVICE_INTERNAL_API_KEY || 'InternalServiceApiKeyForGameDayWorkflow2024!';

/**
 * ランキングボードの転記ボタンから呼ばれる。点数の転記そのものはgame-masterが行う。
 *
 * Dojoとの共有秘密鍵で署名する必要があるため、ブラウザからDojoを直接叩かせずに
 * ここを経由させている。
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await fetch(`${GAME_MASTER_SERVICE_URL}/api/v1/admin/team-scores/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': GAME_MASTER_SERVICE_INTERNAL_API_KEY,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const data = await response.json();
    // 失敗の理由(イベントが見つからない等)はそのまま画面に出したいので素通しする。
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`[team-scores transfer BFF] game-masterへの接続に失敗しました: ${errorMessage}`);
    return NextResponse.json(
      { error: 'TRANSFER_FAILED', message: errorMessage },
      { status: 502 }
    );
  }
}
