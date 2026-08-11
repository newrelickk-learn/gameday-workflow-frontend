/**
 * GameDay演習用の「仮想今日」ユーティリティ
 *
 * GameDayの演習では、application-approvalサービスが管理する
 * game_progress（virtualDateOffsetDays）に応じて、フロントエンド上の「今日」が
 * 実際の今日からズレて進行する。
 *
 * フロントエンドで「今日」を扱う箇所は、素の `new Date()` の直接呼び出しではなく、
 * 必ずこの `getVirtualToday()` を経由させること。
 *
 * バックエンドの実際の検証には virtualDateOffsetDays は一切使われない
 * （バックエンドは常に本当の現在時刻で検証する）。あくまでフロントエンドの
 * 表示・事前チェック専用の概念である。
 */

interface GameProgressResponse {
  virtualDateOffsetDays: number;
}

// フロントエンド自身のBFF（app/api/game-progress/route.ts）経由で取得する。
// application-approvalはクラスタ内部専用のServiceでブラウザから直接到達できないため、
// 相対パスでフロントエンド自身のオリジンに問い合わせ、サーバーサイドで中継してもらう。
const GAME_PROGRESS_PATH = '/api/game-progress';

/**
 * localStorageから認証トークンを取得する
 * lib/graphql/downstream-client.ts のトークンの扱い方（Authorization: Bearer <token>）を参考にしている
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem('token');
}

/**
 * BFF（app/api/game-progress/route.ts）経由で game_progress を取得し、
 * virtualDateOffsetDays を取得する。
 * 取得に失敗した場合は 0（＝実際の今日をそのまま使う）を返す。
 */
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
    // API未実装・ネットワークエラーなどの場合は、実際の今日にフォールバックする
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`[virtual-date] game-progress取得中にエラーが発生しました: ${errorMessage}。実際の今日にフォールバックします。`);
    return 0;
  }
}

/**
 * 「仮想今日」を取得する。
 *
 * 実際の今日 + virtualDateOffsetDays を返す。
 * game_progress取得APIが存在しない、またはエラーになった場合は
 * virtualDateOffsetDays = 0（＝実際の今日）にフォールバックする。
 */
export async function getVirtualToday(): Promise<Date> {
  const offsetDays = await fetchVirtualDateOffsetDays();

  const actualToday = new Date();
  const virtualToday = new Date(actualToday);
  virtualToday.setDate(virtualToday.getDate() + offsetDays);

  return virtualToday;
}
