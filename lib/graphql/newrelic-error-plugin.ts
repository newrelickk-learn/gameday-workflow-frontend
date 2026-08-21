import type { Plugin } from 'graphql-yoga';
import { noticeError } from '../newrelic-helper';

/**
 * リクエストのAuthorizationヘッダーからJWTを取得し、emailクレームを取り出す。
 * resolvers.tsのgetUserIdFromTokenと同じデコード方式（.NETのJWTはClaimTypesの
 * 完全なURIをそのままクレーム名として使うため、その形式もフォールバックで見る）。
 */
function getUserEmailFromRequest(request?: Request): string | undefined {
  const authHeader = request?.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return undefined;
  }
  const token = authHeader.substring(7);
  if (token.startsWith('mock-jwt-token-')) {
    return undefined;
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return undefined;
    }
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));
    return (
      payload.email ||
      payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress']
    );
  } catch {
    return undefined;
  }
}

/**
 * GraphQLのmutation/queryはエラー時もHTTP 200を返すため、New Relicのトランザクション上
 * では自動的にエラーとして検知されない。noticeErrorで明示的に通知し、どのoperationで
 * 発生したか（Errorのメッセージにoperation名を使う）とユーザーのemailを紐づける。
 */
export const newRelicErrorReportingPlugin: Plugin = {
  onExecute({ args }) {
    const operationName = args.operationName || 'UnknownOperation';

    return {
      onExecuteDone({ result }) {
        // @defer/@streamを使うと result が AsyncIterable になるが、このAPIでは未使用のためスキップする
        if (!result || Symbol.asyncIterator in result) {
          return;
        }

        const errors = result.errors;
        if (!errors || errors.length === 0) {
          return;
        }

        const email = getUserEmailFromRequest(
          (args.contextValue as { request?: Request } | undefined)?.request
        );

        for (const error of errors) {
          noticeError(new Error(operationName), {
            'graphql.operationName': operationName,
            'graphql.errorMessage': error.message,
            ...(email ? { 'user.email': email } : {}),
          });
        }
      },
    };
  },
};
