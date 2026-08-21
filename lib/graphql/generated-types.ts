/**
 * GraphQLリゾルバーの型定義
 * このファイルは手動で管理します（codegenを使用する場合は自動生成に置き換え可能）
 */

import type { GraphQLResolveInfo } from 'graphql';
import type {
  User,
  LoginResponse,
  Application,
  CreateApplicationRequest,
  Approval,
  UpdateApprovalRequest,
  StartWorkflowRequest,
  StartWorkflowResponse,
  ValidateApprovalRequest,
  ValidateApprovalResponse,
  ApproveWorkflowRequest,
  ApproveWorkflowResponse,
  Notification,
  SendNotificationRequest,
  SendNotificationResponse,
  City,
  EstimateTravelCostResponse,
} from '../api/types';

export interface GraphQLContext {
  request?: Request;
}

export interface Resolvers {
  Query: {
    user: (
      parent: unknown,
      args: { id: string },
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => Promise<User>;
    usersByCompany: (
      parent: unknown,
      args: {},
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => Promise<User[]>;
    applications: (
      parent: unknown,
      args: { applicantId?: string },
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => Promise<Application[]>;
    application: (
      parent: unknown,
      args: { id: string },
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => Promise<Application>;
    approvals: (
      parent: unknown,
      args: {},
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => Promise<Approval[]>;
    approval: (
      parent: unknown,
      args: { id: string },
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => Promise<Approval>;
    approvalsByApplication: (
      parent: unknown,
      args: { applicationId: string },
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => Promise<Approval[]>;
    analyzeApplication: (
      parent: unknown,
      args: { applicationId: string },
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => Promise<{ risk: 'low' | 'medium' | 'high'; summary: string }>;
    notificationHistory: (
      parent: unknown,
      args: { recipientId: string },
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => Promise<Notification[]>;
    cities: (
      parent: unknown,
      args: {},
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => Promise<City[]>;
    estimateTravelCost: (
      parent: unknown,
      args: { input: EstimateTravelCostInput },
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => Promise<EstimateTravelCostResponse>;
    chapterDiagnosisOptions: (
      parent: unknown,
      args: { chapter: number },
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => Promise<string[]>;
    clearedChapters: (
      parent: unknown,
      args: {},
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => Promise<number[]>;
  };
  Mutation: {
    login: (
      parent: unknown,
      args: { input: { email: string; password: string; impactedPodName?: string | null } },
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => Promise<LoginResponse>;
    updateUserManager: (
      parent: unknown,
      args: { id: string; input: UpdateUserManagerInput },
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => Promise<User>;
    createApplication: (
      parent: unknown,
      args: { input: CreateApplicationInput },
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => Promise<Application>;
    updateApproval: (
      parent: unknown,
      args: { id: string; input: UpdateApprovalInput },
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => Promise<Approval>;
    generateApplicationSuggestion: (
      parent: unknown,
      args: { prompt: string },
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => Promise<string>;
    askChat: (
      parent: unknown,
      args: { question: string },
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => Promise<string>;
    startWorkflow: (
      parent: unknown,
      args: { input: StartWorkflowInput },
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => Promise<StartWorkflowResponse>;
    validateApproval: (
      parent: unknown,
      args: { input: ValidateApprovalInput },
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => Promise<ValidateApprovalResponse>;
    approveWorkflow: (
      parent: unknown,
      args: { input: ApproveWorkflowInput },
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => Promise<ApproveWorkflowResponse>;
    sendNotification: (
      parent: unknown,
      args: { input: SendNotificationInput },
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => Promise<SendNotificationResponse>;
    checkChapterAnswer: (
      parent: unknown,
      args: { chapter: number; selectedText: string },
      context: GraphQLContext,
      info: GraphQLResolveInfo
    ) => Promise<boolean>;
  };
}

export interface UpdateUserManagerInput {
  managerId?: number | null;
}

export interface CreateApplicationInput {
  type: string;
  title: string;
  description: string;
  amount?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  days?: number | null;
  applicantId: string;
  dependencyChain?: string[] | null;
}

export interface UpdateApprovalInput {
  status: 'approved' | 'rejected'; // pendingは更新時に使用しない
  comment?: string | null;
  approverId: string;
  applicationId?: string | null; // 申請ID（オプション、ワークフローサービスで必要）
}

export interface StartWorkflowInput {
  applicationId: string;
  applicationType: 'BusinessTrip' | 'Expense' | 'Vacation' | 'Promotion';
  companyId?: number | null;
}

export interface ValidateApprovalInput {
  approvalId: string;
  applicationId: string;
  approverId: string;
  status: 'approved' | 'rejected';
}

export interface ApproveWorkflowInput {
  approvalId: string;
  applicationId: string;
  approverId: string;
  status: 'approved' | 'rejected';
}

export interface SendNotificationInput {
  notificationType: 'ApprovalRequest' | 'ApprovalCompleted' | 'ApprovalRejected' | 'WorkflowCompleted';
  recipientId: string;
  subject: string;
  body: string;
}

export interface EstimateTravelCostInput {
  departureCityId: string;
  arrivalCityId: string;
  description: string;
  companyId?: number | null;
}

