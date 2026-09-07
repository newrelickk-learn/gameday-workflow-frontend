import { NextResponse } from 'next/server';

const APPLICATION_SERVICE_URL =
  process.env.APPLICATION_SERVICE_URL || 'http://localhost:8002';
const APPLICATION_SERVICE_INTERNAL_API_KEY =
  process.env.APPLICATION_SERVICE_INTERNAL_API_KEY || 'InternalServiceApiKeyForGameDayWorkflow2024!';

export async function GET() {
  try {
    const response = await fetch(`${APPLICATION_SERVICE_URL}/api/v1/admin/team-progress`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': APPLICATION_SERVICE_INTERNAL_API_KEY,
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
    console.warn(`[team-progress BFF] application-approvalへの接続に失敗しました: ${errorMessage}`);
    return NextResponse.json({ totalChapters: 0, teams: [] });
  }
}
