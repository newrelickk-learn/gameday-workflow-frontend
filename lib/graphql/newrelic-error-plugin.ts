import type { Plugin } from 'graphql-yoga';
import { print, OperationDefinitionNode, DocumentNode } from 'graphql';
import { noticeError, addCustomAttribute, setTransactionName } from '../newrelic-helper';

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
