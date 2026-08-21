import { GraphQLError, GraphQLScalarType } from 'graphql';
import { downstreamClient } from './downstream-client';
import type { Resolvers } from './generated-types';
import { addCustomAttribute, addCustomAttributes } from '../newrelic-helper';

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

    usersByCompany: async (_, __, context) => {
      try {
        const token = getTokenFromRequest(context.request);
        return await downstreamClient.getUsersByCompany(token);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new GraphQLError(`Failed to fetch company users: ${errorMessage}`, {
          extensions: { code: 'USERS_BY_COMPANY_FETCH_ERROR', originalError: errorMessage },
        });
      }
    },

    applications: async (_, { applicantId }, context) => {
      try {
        if (applicantId) {
          await addCustomAttribute('application.applicantId', applicantId);
        }
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
        await addCustomAttribute('application.id', id);
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
        if (recipientId) {
          await addCustomAttribute('user.id', recipientId);
        }
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
        await addCustomAttribute('approval.id', id);
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
        await addCustomAttribute('application.id', applicationId);
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

    cities: async (_, __, context) => {
      try {
        const token = getTokenFromRequest(context.request);
        return await downstreamClient.getCities(token);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new GraphQLError(`Failed to fetch cities: ${errorMessage}`, {
          extensions: { code: 'CITIES_FETCH_ERROR', originalError: errorMessage },
        });
      }
    },

    estimateTravelCost: async (_, { input }, context) => {
      try {
        const token = getTokenFromRequest(context.request);
        return await downstreamClient.estimateTravelCost(
          {
            departureCityId: Number(input.departureCityId),
            arrivalCityId: Number(input.arrivalCityId),
            description: input.description,
            companyId: input.companyId ?? undefined,
          },
          token
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new GraphQLError(`Failed to estimate travel cost: ${errorMessage}`, {
          extensions: { code: 'ESTIMATE_TRAVEL_COST_ERROR', originalError: errorMessage },
        });
      }
    },

    chapterDiagnosisOptions: async (_, { chapter }, context) => {
      try {
        const token = getTokenFromRequest(context.request);
        return await downstreamClient.getChapterDiagnosisOptions(chapter, token);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new GraphQLError(`Failed to fetch chapter diagnosis options: ${errorMessage}`, {
          extensions: { code: 'CHAPTER_DIAGNOSIS_OPTIONS_FETCH_ERROR', originalError: errorMessage },
        });
      }
    },

    clearedChapters: async (_, __, context) => {
      try {
        const token = getTokenFromRequest(context.request);
        return await downstreamClient.getClearedChapters(token);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new GraphQLError(`Failed to fetch cleared chapters: ${errorMessage}`, {
          extensions: { code: 'CLEARED_CHAPTERS_FETCH_ERROR', originalError: errorMessage },
        });
      }
    },
  },

  Mutation: {
    updateUserManager: async (_, { id, input }, context) => {
      try {
        const token = getTokenFromRequest(context.request);
        return await downstreamClient.updateUserManager(id, input.managerId ?? null, token);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new GraphQLError(`Failed to update manager: ${errorMessage}`, {
          extensions: { code: 'UPDATE_USER_MANAGER_ERROR', originalError: errorMessage },
        });
      }
    },

    login: async (_, { input }) => {
      try {
        await addCustomAttribute('user.email', input.email);
        return await downstreamClient.login({
          email: input.email,
          password: input.password,
          impactedPodName: input.impactedPodName ?? undefined,
        });
      } catch (error) {
        // downstreamClient.login()は失敗時、error.codeに"INVALID_CREDENTIALS"/"POD_SATURATED"等の
        // 具体的な種別を付与している（GameDay第0章: 通常のパスワード誤りとPod飽和を区別するため）。
        const code = (error as { code?: string })?.code ?? 'LOGIN_ERROR';
        await addCustomAttribute('login.errorCode', code);
        const message = error instanceof Error ? error.message : 'Login failed';
        throw new GraphQLError(message, {
          extensions: { code },
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
        await addCustomAttributes({
          'application.applicantId': applicantId,
          'application.type': input.type,
          ...(input.amount != null ? { 'application.amount': input.amount } : {}),
          ...(input.days != null ? { 'application.days': input.days } : {}),
        });
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
            dependencyChain: input.dependencyChain ?? undefined,
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
        // downstreamClient.createApplication()は失敗時、error.codeにbackendのerror_code
        // (例: "APPROVER_NOT_FOUND"、"ASSERTION_RULE_VIOLATION")、error.detailMessageに
        // backendのメッセージを保持している。UI側（第1章は隠す、第5章は表示する等）の
        // 判定に使えるよう、GraphQLErrorのextensions.codeとmessageに転記する。
        const code = (error as { code?: string })?.code;
        const detailMessage = (error as { detailMessage?: string })?.detailMessage;
        const field = (error as { field?: string })?.field;
        console.error('[GraphQL Resolver] Failed to create application:', {
          error: errorMessage,
          stack: errorStack,
          input: JSON.stringify(input, null, 2),
        });
        throw new GraphQLError(detailMessage || `Failed to create application: ${errorMessage}`, {
          extensions: {
            code: code ?? 'CREATE_APPLICATION_ERROR',
            field,
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

        await addCustomAttributes({
          'approval.id': id,
          ...(applicationId != null ? { 'approval.applicationId': applicationId } : {}),
          'approval.approverId': input.approverId,
          'approval.status': input.status,
        });

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

    checkChapterAnswer: async (_, { chapter, selectedText }, context) => {
      try {
        const token = getTokenFromRequest(context.request);
        return await downstreamClient.checkChapterAnswer(chapter, selectedText, token);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new GraphQLError(`Failed to check chapter answer: ${errorMessage}`, {
          extensions: { code: 'CHECK_CHAPTER_ANSWER_ERROR', originalError: errorMessage },
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

