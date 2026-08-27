
interface GameProgressResponse {
  virtualDateOffsetDays: number;
}

const GAME_PROGRESS_PATH = '/api/game-progress';

function getAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem('token');
}

async function fetchVirtualDateOffsetDays(): Promise<number> {
  const token = getAuthToken();

  try {
    const response = await fetch(GAME_PROGRESS_PATH, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      console.warn(
        `[virtual-date] game-progress取得に失敗しました（status: ${response.status}）。実際の今日にフォールバックします。`
      );
      return 0;
    }

    const data = (await response.json()) as GameProgressResponse;

    if (typeof data.virtualDateOffsetDays !== 'number' || Number.isNaN(data.virtualDateOffsetDays)) {
      console.warn('[virtual-date] game-progressのレスポンス形式が不正です。実際の今日にフォールバックします。');
      return 0;
    }

    return data.virtualDateOffsetDays;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`[virtual-date] game-progress取得中にエラーが発生しました: ${errorMessage}。実際の今日にフォールバックします。`);
    return 0;
  }
}

export async function getVirtualToday(): Promise<Date> {
  const offsetDays = await fetchVirtualDateOffsetDays();

  const actualToday = new Date();
  const virtualToday = new Date(actualToday);
  virtualToday.setDate(virtualToday.getDate() + offsetDays);

  return virtualToday;
}
