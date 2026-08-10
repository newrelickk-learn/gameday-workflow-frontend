import { GraphQLError, GraphQLScalarType } from 'graphql';
import { downstreamClient } from './downstream-client';
import type { Resolvers } from './generated-types';

/**
 * リクエストから認証トークンを取得
 */
function getTokenFromRequest(request?: Request): string | undefined {
  if (!request) return undefined;
  
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return undefined;
}

/**
 * JWTトークンからユーザーIDを取得（簡易実装）
 * JWTトークンのペイロード部分をbase64デコードしてユーザーIDを取得
 */
function getUserIdFromToken(token?: string): string | undefined {
  if (!token) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[GraphQL Resolver] No token provided');
    }
    return undefined;
  }
  
  // スタブトークン形式（mock-jwt-token-${userId}）を処理
  if (token.startsWith('mock-jwt-token-')) {
    const userId = token.replace('mock-jwt-token-', '');
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      console.log('[GraphQL Resolver] Extracted user ID from stub token:', userId);
    }
    return userId;
  }
  
  try {
    // JWTトークンは3つの部分（ヘッダー.ペイロード.署名）に分かれている
    const parts = token.split('.');
    if (parts.length !== 3) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[GraphQL Resolver] Invalid token format, parts:', parts.length);
      }
      return undefined;
    }
    
    // ペイロード部分をbase64デコード
    const payload = parts[1];
    // base64デコード（URLセーフなbase64の場合、'-'と'_'を'+'と'/'に置換）
    // パディングを追加（必要に応じて）
    let base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const decoded = Buffer.from(base64, 'base64').toString('utf-8');
    const payloadObj = JSON.parse(decoded);
    
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      console.log('[GraphQL Resolver] Decoded token payload:', JSON.stringify(payloadObj, null, 2));
    }
    
    // ユーザーIDを取得（様々なクレーム名に対応）
    // .NETのJWTでは http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier が使われる
    const userId = 
      payloadObj.sub || 
      payloadObj.user_id || 
      payloadObj.id || 
      payloadObj.userId ||
      payloadObj['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
    
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      console.log('[GraphQL Resolver] Extracted user ID:', userId);
      console.log('[GraphQL Resolver] Available claims:', Object.keys(payloadObj));
    }
    
    return userId;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[GraphQL Resolver] Failed to decode token:', error);
    }
    return undefined;
  }
}

// DateTimeスカラー型のリゾルバー
const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'DateTime custom scalar type',
  serialize(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'string') {
      return value;
    }
    throw new GraphQLError('Value is not a valid DateTime');
  },
  parseValue(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }
    throw new GraphQLError('Value is not a valid DateTime');
  },
  parseLiteral(ast) {
    if (ast.kind === 'StringValue') {
      return ast.value;
    }
    throw new GraphQLError('Value is not a valid DateTime');
  },
});

export const resolvers: Resolvers & {
  DateTime: GraphQLScalarType;
} = {
  DateTime: DateTimeScalar,
  Query: {
    user: async (_, { id }, context) => {
      try {
        const token = getTokenFromRequest(context.request);
        return await downstreamClient.getUser(id, token);
      } catch (error) {
        throw new GraphQLError('Failed to fetch user', {
          extensions: { code: 'USER_FETCH_ERROR' },
        });
      }
    },

    applications: async (_, { applicantId }, context) => {
      try {
        const token = getTokenFromRequest(context.request);
        return await downstreamClient.getApplications(token, applicantId);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[GraphQL Resolver] Failed to fetch applications:', error);
        throw new GraphQLError(`Failed to fetch applications: ${errorMessage}`, {
          extensions: { 
            code: 'APPLICATIONS_FETCH_ERROR',
            originalError: errorMessage,
          },
        });
      }
    },

    application: async (_, { id }, context) => {
      try {
        const token = getTokenFromRequest(context.request);
        return await downstreamClient.getApplication(id, token);
      } catch (error) {
        throw new GraphQLError('Failed to fetch application', {
          extensions: { code: 'APPLICATION_FETCH_ERROR' },
        });
      }
    },

    approvals: async (_, __, context) => {
      try {
        const token = getTokenFromRequest(context.request);
        const recipientId = getUserIdFromToken(token);
        if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
          console.log('[GraphQL Resolver] Fetching approvals...');
          console.log('[GraphQL Resolver] USE_DOWNSTREAM_STUBS:', process.env.USE_DOWNSTREAM_STUBS);
          console.log('[GraphQL Resolver] recipient_id:', recipientId);
          console.log('[GraphQL Resolver] token present:', !!token);
        }
        const result = await downstreamClient.getApprovals(token, recipientId);
        if (process.env.NODE_ENV === 'development') {
          console.log('[GraphQL Resolver] Successfully fetched approvals:', result?.length || 0, 'items');
        }
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        console.error('[GraphQL Resolver] Failed to fetch approvals:', {
          error: errorMessage,
          stack: errorStack,
          useStubs: process.env.USE_DOWNSTREAM_STUBS,
        });
        throw new GraphQLError(`Failed to fetch approvals: ${errorMessage}`, {
          extensions: { 
            code: 'APPROVALS_FETCH_ERROR',
            originalError: errorMessage,
            stack: errorStack,
          },
        });
      }
    },

    approval: async (_, { id }, context) => {
      try {
        const token = getTokenFromRequest(context.request);
        return await downstreamClient.getApproval(id, token);
      } catch (error) {
        throw new GraphQLError('Failed to fetch approval', {
          extensions: { code: 'APPROVAL_FETCH_ERROR' },
        });
      }
    },

    approvalsByApplication: async (_, { applicationId }, context) => {
      try {
        const token = getTokenFromRequest(context.request);
        return await downstreamClient.getApprovalsByApplication(applicationId, token);
      } catch (error) {
        throw new GraphQLError('Failed to fetch approvals by application', {
          extensions: { code: 'APPROVALS_BY_APPLICATION_FETCH_ERROR' },
        });
      }
    },

    notificationHistory: async (_, { recipientId }, context) => {
      try {
        const token = getTokenFromRequest(context.request);
        return await downstreamClient.getNotificationHistory(recipientId, token);
      } catch (error) {
        throw new GraphQLError('Failed to fetch notification history', {
          extensions: { code: 'NOTIFICATION_HISTORY_FETCH_ERROR' },
        });
      }
    },

    analyzeApplication: async (_, { applicationId }, context) => {
      try {
        const token = getTokenFromRequest(context.request);
        return await downstreamClient.analyzeApplication(applicationId, token);
      } catch (error) {
        throw new GraphQLError('Failed to analyze application', {
          extensions: { code: 'ANALYSIS_ERROR' },
        });
      }
    },
  },

  Mutation: {
    login: async (_, { input }) => {
      try {
        return await downstreamClient.login({
          email: input.email,
          password: input.password,
        });
      } catch (error) {
        throw new GraphQLError('Login failed', {
          extensions: { code: 'LOGIN_ERROR' },
        });
      }
    },

    createApplication: async (_, { input }, context) => {
      try {
        const token = getTokenFromRequest(context.request);
        const userIdFromToken = getUserIdFromToken(token);
        // クライアントで applicantId が明示されていればそれを使い、未指定時のみトークンのユーザーにフォールバック
        const applicantId = (input.applicantId && String(input.applicantId).trim() !== '')
          ? input.applicantId
          : userIdFromToken;
        if (!applicantId) {
          throw new GraphQLError('申請者を特定できません。ログインするか applicantId を指定してください。', {
            extensions: { code: 'APPLICANT_REQUIRED' },
          });
        }
        if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
          console.log('[GraphQL Resolver] createApplication called with input:', JSON.stringify(input, null, 2));
          console.log('[GraphQL Resolver] token:', token ? 'present' : 'missing');
          console.log('[GraphQL Resolver] userIdFromToken:', userIdFromToken);
          console.log('[GraphQL Resolver] applicantId (used):', applicantId);
        }
        const result = await downstreamClient.createApplication(
          {
            type: input.type,
            title: input.title,
            description: input.description,
            amount: input.amount ?? undefined,
            startDate: input.startDate ?? undefined,
            endDate: input.endDate ?? undefined,
            days: input.days ?? undefined,
            applicantId,
          },
          token
        );
        if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
          console.log('[GraphQL Resolver] createApplication result:', JSON.stringify(result, null, 2));
        }
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        console.error('[GraphQL Resolver] Failed to create application:', {
          error: errorMessage,
          stack: errorStack,
          input: JSON.stringify(input, null, 2),
        });
        throw new GraphQLError(`Failed to create application: ${errorMessage}`, {
          extensions: { 
            code: 'CREATE_APPLICATION_ERROR',
            originalError: errorMessage,
            stack: errorStack,
          },
        });
      }
    },

    updateApproval: async (_, { id, input }, context) => {
      try {
        const token = getTokenFromRequest(context.request);
        // inputからapplicationIdを取得（フロントエンドから渡される）
        const applicationId = input.applicationId ?? undefined;
        
        if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
          console.log('[GraphQL Resolver] updateApproval called with:', {
            id,
            input: JSON.stringify(input, null, 2),
            applicationId,
          });
        }
        
        const result = await downstreamClient.updateApproval(
          id,
          {
            status: input.status,
            comment: input.comment ?? undefined,
            approverId: input.approverId,
            applicationId: applicationId,
          },
          token,
          applicationId
        );
        
        if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
          console.log('[GraphQL Resolver] updateApproval result:', JSON.stringify(result, null, 2));
        }
        
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        console.error('[GraphQL Resolver] Failed to update approval:', {
          error: errorMessage,
          stack: errorStack,
          id,
          input: JSON.stringify(input, null, 2),
        });
        throw new GraphQLError(`Failed to update approval: ${errorMessage}`, {
          extensions: { 
            code: 'UPDATE_APPROVAL_ERROR',
            originalError: errorMessage,
            stack: errorStack,
          },
        });
      }
    },

    generateApplicationSuggestion: async (_, { prompt }, context) => {
      try {
        const token = getTokenFromRequest(context.request);
        return await downstreamClient.generateApplicationSuggestion(prompt, token);
      } catch (error) {
        throw new GraphQLError('Failed to generate suggestion', {
          extensions: { code: 'SUGGESTION_ERROR' },
        });
      }
    },

    askChat: async (_, { question }, context) => {
      try {
        const token = getTokenFromRequest(context.request);
        return await downstreamClient.askChat(question, token);
      } catch (error) {
        throw new GraphQLError('Failed to get chat response', {
          extensions: { code: 'CHAT_ERROR' },
        });
      }
    },

    startWorkflow: async (_, { input }, context) => {
      try {
        const token = getTokenFromRequest(context.request);
        // GraphQLの入力型をAPIのリクエスト型に変換（nullをundefinedに変換）
        return await downstreamClient.startWorkflow({
          applicationId: input.applicationId,
          applicationType: input.applicationType,
          companyId: input.companyId ?? undefined,
        }, token);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new GraphQLError(`Failed to start workflow: ${errorMessage}`, {
          extensions: { code: 'START_WORKFLOW_ERROR', originalError: errorMessage },
        });
      }
    },

    validateApproval: async (_, { input }, context) => {
      try {
        const token = getTokenFromRequest(context.request);
        return await downstreamClient.validateApproval(input, token);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new GraphQLError(`Failed to validate approval: ${errorMessage}`, {
          extensions: { code: 'VALIDATE_APPROVAL_ERROR', originalError: errorMessage },
        });
      }
    },

    approveWorkflow: async (_, { input }, context) => {
      try {
        const token = getTokenFromRequest(context.request);
        return await downstreamClient.approveWorkflow(input, token);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new GraphQLError(`Failed to approve workflow: ${errorMessage}`, {
          extensions: { code: 'APPROVE_WORKFLOW_ERROR', originalError: errorMessage },
        });
      }
    },

    sendNotification: async (_, { input }, context) => {
      try {
        const token = getTokenFromRequest(context.request);
        return await downstreamClient.sendNotification(input, token);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new GraphQLError(`Failed to send notification: ${errorMessage}`, {
          extensions: { code: 'SEND_NOTIFICATION_ERROR', originalError: errorMessage },
        });
      }
    },
  },
};

