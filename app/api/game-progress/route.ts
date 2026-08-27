import { NextRequest, NextResponse } from 'next/server';


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

export async function PATCH(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const body = await request.json();

  try {
    const response = await fetch(`${APPLICATION_SERVICE_URL}/api/v1/admin/game-progress`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { Authorization: authHeader }),
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`[game-progress BFF] application-approvalへの接続に失敗しました: ${errorMessage}`);
    return NextResponse.json(
      { error: 'DOWNSTREAM_CONNECTION_ERROR', message: errorMessage },
      { status: 502 }
    );
  }
}
