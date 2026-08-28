const DEFAULT_GRAPHQL_ENDPOINT = 'https://api.jp.newrelic.com/graphql';

function escapeNrqlString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export async function hasRecentRageClick(email: string): Promise<boolean> {
  const accountId = process.env.NEW_RELIC_ACCOUNT_ID;
  const apiKey = process.env.NEW_RELIC_USER_API_KEY;
  const endpoint = process.env.NEW_RELIC_GRAPHQL_ENDPOINT || DEFAULT_GRAPHQL_ENDPOINT;

  if (!accountId || !apiKey) {
    console.error('[rage-click] NEW_RELIC_ACCOUNT_ID または NEW_RELIC_USER_API_KEY が設定されていません');
    return false;
  }

  const nrql = `SELECT count(*) FROM \`UserAction\` WHERE rageClick AND enduser.id = '${escapeNrqlString(email)}' SINCE 10 minutes ago`;
  console.log('[rage-click][nerdgraph] 実行NRQL:', nrql, 'accountId=', accountId);

  const query = `
    query($accountId: Int!, $nrql: Nrql!) {
      actor {
        account(id: $accountId) {
          nrql(query: $nrql) {
            results
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'API-Key': apiKey,
      },
      body: JSON.stringify({ query, variables: { accountId: Number(accountId), nrql } }),
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      console.error('[rage-click][nerdgraph] リクエストが失敗しました status=', response.status, 'body=', bodyText);
      return false;
    }

    const json = (await response.json()) as {
      data?: { actor?: { account?: { nrql?: { results?: Array<{ count?: number }> } } } };
      errors?: unknown;
    };
    console.log('[rage-click][nerdgraph] レスポンス:', JSON.stringify(json));

    if (json.errors) {
      console.error('[rage-click][nerdgraph] NerdGraphがエラーを返しました:', JSON.stringify(json.errors));
      return false;
    }

    const count = json.data?.actor?.account?.nrql?.results?.[0]?.count ?? 0;
    console.log('[rage-click][nerdgraph] count=', count, 'matched=', count > 0);
    return count > 0;
  } catch (error) {
    console.error('[rage-click] NerdGraph呼び出し中に例外が発生しました:', error);
    return false;
  }
}
