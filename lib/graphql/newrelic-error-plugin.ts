import type { Plugin } from 'graphql-yoga';
import { print, OperationDefinitionNode, DocumentNode } from 'graphql';
import { noticeError, addCustomAttribute, setTransactionName } from '../newrelic-helper';

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

interface OperationInfo {
  name: string;
  type: string;
}

/**
 * operation名・typeを解決する。
 *
 * リクエストボディが `operationName` フィールドを送ってこない場合（このフロントエンドの
 * graphql-client.tsは常に { query, variables } のみを送っており、operationNameは
 * 送っていない）、args.operationName は常にundefinedになる。クエリ文字列自体には
 * `mutation CreateApplication(...)` のように名前が書かれているので、それを
 * args.document のASTから読み取ることで正しいoperation名を得る。
 * ドキュメント中に複数operationがある場合は、args.operationNameで指定されたものを
 * 優先し、なければ最初のoperationを使う。
 */
function getOperationInfo(document: DocumentNode, requestedOperationName?: string | null): OperationInfo {
  const operationDefs = document.definitions.filter(
    (def): def is OperationDefinitionNode => def.kind === 'OperationDefinition'
  );

  const operation =
    (requestedOperationName && operationDefs.find((def) => def.name?.value === requestedOperationName)) ||
    operationDefs[0];

  return {
    name: operation?.name?.value || requestedOperationName || 'UnknownOperation',
    type: operation?.operation || 'query',
  };
}

/**
 * GraphQLのmutation/queryはエラー時もHTTP 200を返すため、New Relicのトランザクション上
 * では自動的にエラーとして検知されない。noticeErrorで明示的に通知し、どのoperationで
 * 発生したか（Errorのメッセージにoperation名を使う）とユーザーのemailを紐づける。
 * また、/api/graphqlは全operationが同じルートに来るため、トランザクション名を
 * operation名に設定し、OpenTelemetryのGraphQL semantic conventionsに準拠した
 * 属性（graphql.document / graphql.operation.name / graphql.operation.type）を付与する。
 */
export const newRelicErrorReportingPlugin: Plugin = {
  onExecute({ args }) {
    const { name: operationName, type: operationType } = getOperationInfo(
      args.document,
      args.operationName
    );
    const document = print(args.document);

    setTransactionName(operationName);
    addCustomAttribute('graphql.operation.name', operationName);
    addCustomAttribute('graphql.operation.type', operationType);
    addCustomAttribute('graphql.document', document);

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
            'graphql.operation.name': operationName,
            'graphql.operation.type': operationType,
            'graphql.document': document,
            'graphql.errorMessage': error.message,
            ...(email ? { 'user.email': email } : {}),
          });
        }
      },
    };
  },
};
