import { NextRequest, NextResponse } from 'next/server';

/**
 * game-progress BFFエンドポイント
 *
 * lib/utils/virtual-date.ts の getVirtualToday() から呼ばれる。
 * ブラウザから application-approval サービスへ直接アクセスすることはできない
 * （クラスタ内部専用のServiceのため）。そのため、サーバーサイド（Next.jsのAPI Route）
 * を経由し、既存の APPLICATION_SERVICE_URL（サーバーサイド用、他のダウンストリーム
 * サービス呼び出しと同じ環境変数）で application-approval の
 * GET /api/v1/game-progress を呼び出す。
 */

const APPLICATION_SERVICE_URL =
  process.env.APPLICATION_SERVICE_URL || 'http://localhost:8002';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  try {
    const response = await fetch(`${APPLICATION_SERVICE_URL}/api/v1/game-progress`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { Authorization: authHeader }),
      },
    });

    if (!response.ok) {
      // ダウンストリームが失敗しても、フロントの表示は「実際の今日」にフォールバックできるようにする
      return NextResponse.json({ virtualDateOffsetDays: 0 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`[game-progress BFF] application-approvalへの接続に失敗しました: ${errorMessage}`);
    return NextResponse.json({ virtualDateOffsetDays: 0 });
  }
}
