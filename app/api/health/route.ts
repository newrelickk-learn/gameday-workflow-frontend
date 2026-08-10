import { NextResponse } from 'next/server';

/**
 * ヘルスチェックエンドポイント
 * Dockerのヘルスチェックやサービス間の接続確認に使用
 */
export async function GET() {
  try {
    // 基本的なヘルスチェック
    // 必要に応じて、データベース接続やダウンストリームサービスの接続状態を確認
    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'gameday-workflow-frontend',
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'gameday-workflow-frontend',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}

