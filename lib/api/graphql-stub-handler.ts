/**
 * GraphQLスタブハンドラー
 * GraphQLクエリ/ミューテーションを解析して、適切なスタブデータを返す
 */

import { stubUserService } from './stubs/user-service';
import { stubApplicationService } from './stubs/application-service';
import { stubWorkflowService } from './stubs/workflow-service';
import { stubAiService } from './stubs/ai-service';
import { stubTravelService } from './stubs/travel-service';
import type {
  LoginRequest,
  LoginResponse,
  User,
  Application,
  CreateApplicationRequest,
  Approval,
  UpdateApprovalRequest,
  StartWorkflowRequest,
  ValidateApprovalRequest,
  ApproveWorkflowRequest,
  SendNotificationRequest,
  EstimateTravelCostRequest,
} from './types';

/**
 * GraphQLクエリを解析してスタブデータを返す
 */
export async function handleGraphQLStub(
  query: string,
  variables?: Record<string, any>
): Promise<any> {
  // クエリを正規化（改行や空白を削除）
  const normalizedQuery = query.replace(/\s+/g, ' ').trim();

  // Login mutation
  if (normalizedQuery.includes('mutation Login') || normalizedQuery.includes('login(input:')) {
    const input = variables?.input as LoginRequest;
    const result = await stubUserService.login(input);
    return { login: result };
  }

  // GetUser query
  if (normalizedQuery.includes('query GetUser') || normalizedQuery.includes('user(id:')) {
    const id = variables?.id as string;
    const result = await stubUserService.getUser(id);
    return { user: result };
  }

  // UsersByCompany query (人事部専用)
  if (normalizedQuery.includes('query UsersByCompany') || normalizedQuery.includes('usersByCompany')) {
    const result = await stubUserService.getUsersByCompany();
    return { usersByCompany: result };
  }

  // UpdateUserManager mutation (人事部専用)
  if (normalizedQuery.includes('mutation UpdateUserManager') || normalizedQuery.includes('updateUserManager(id:')) {
    const id = variables?.id as string;
    const managerId = (variables?.input as { managerId: number | null } | undefined)?.managerId ?? null;
    const result = await stubUserService.updateUserManager(id, managerId);
    return { updateUserManager: result };
  }

  // GetApplications query
  if (normalizedQuery.includes('query GetApplications') || normalizedQuery.includes('applications {')) {
    const result = await stubApplicationService.getApplications();
    return { applications: result };
  }

  // GetApplication query
  if (normalizedQuery.includes('query GetApplication') || normalizedQuery.includes('application(id:')) {
    const id = variables?.id as string;
    const result = await stubApplicationService.getApplication(id);
    return { application: result };
  }

  // CreateApplication mutation
  if (normalizedQuery.includes('mutation CreateApplication') || normalizedQuery.includes('createApplication(input:')) {
    const input = variables?.input as CreateApplicationRequest;
    const result = await stubApplicationService.createApplication(input);
    return { createApplication: result };
  }

  // GetApprovals query
  if (normalizedQuery.includes('query GetApprovals') || normalizedQuery.includes('approvals {')) {
    const result = await stubWorkflowService.getApprovals();
    return { approvals: result };
  }

  // GetApproval query
  if (normalizedQuery.includes('query GetApproval') || normalizedQuery.includes('approval(id:')) {
    const id = variables?.id as string;
    const result = await stubWorkflowService.getApproval(id);
    return { approval: result };
  }

  // GetApprovalsByApplication query
  if (normalizedQuery.includes('query GetApprovalsByApplication') || normalizedQuery.includes('approvalsByApplication(applicationId:')) {
    const applicationId = variables?.applicationId as string;
    const result = await stubWorkflowService.getApprovalsByApplication(applicationId);
    return { approvalsByApplication: result };
  }

  // UpdateApproval mutation
  if (normalizedQuery.includes('mutation UpdateApproval') || normalizedQuery.includes('updateApproval(id:')) {
    const id = variables?.id as string;
    const input = variables?.input as UpdateApprovalRequest;
    const result = await stubWorkflowService.updateApproval(id, input);
    return { updateApproval: result };
  }

  // GenerateApplicationSuggestion mutation
  if (normalizedQuery.includes('mutation GenerateApplicationSuggestion') || normalizedQuery.includes('generateApplicationSuggestion(prompt:')) {
    const prompt = variables?.prompt as string;
    const result = await stubAiService.generateApplicationSuggestion(prompt);
    return { generateApplicationSuggestion: result };
  }

  // AnalyzeApplication query
  if (normalizedQuery.includes('query AnalyzeApplication') || normalizedQuery.includes('analyzeApplication(applicationId:')) {
    const applicationId = variables?.applicationId as string;
    const result = await stubAiService.analyzeApplication(applicationId);
    return { analyzeApplication: result };
  }

  // AskChat mutation
  if (normalizedQuery.includes('mutation AskChat') || normalizedQuery.includes('askChat(question:')) {
    const question = variables?.question as string;
    const result = await stubAiService.askChat(question);
    return { askChat: result };
  }

  // StartWorkflow mutation
  if (normalizedQuery.includes('mutation StartWorkflow') || normalizedQuery.includes('startWorkflow(input:')) {
    const input = variables?.input as StartWorkflowRequest;
    const result = await stubWorkflowService.startWorkflow(input);
    return { startWorkflow: result };
  }

  // ValidateApproval mutation
  if (normalizedQuery.includes('mutation ValidateApproval') || normalizedQuery.includes('validateApproval(input:')) {
    const input = variables?.input as ValidateApprovalRequest;
    const result = await stubWorkflowService.validateApproval(input);
    return { validateApproval: result };
  }

  // ApproveWorkflow mutation
  if (normalizedQuery.includes('mutation ApproveWorkflow') || normalizedQuery.includes('approveWorkflow(input:')) {
    const input = variables?.input as ApproveWorkflowRequest;
    const result = await stubWorkflowService.approveWorkflow(input);
    return { approveWorkflow: result };
  }

  // NotificationHistory query
  if (normalizedQuery.includes('query NotificationHistory') || normalizedQuery.includes('notificationHistory(recipientId:')) {
    const recipientId = variables?.recipientId as string;
    const result = await stubWorkflowService.getNotificationHistory(recipientId);
    return { notificationHistory: result };
  }

  // SendNotification mutation
  if (normalizedQuery.includes('mutation SendNotification') || normalizedQuery.includes('sendNotification(input:')) {
    const input = variables?.input as SendNotificationRequest;
    const result = await stubWorkflowService.sendNotification(input);
    return { sendNotification: result };
  }

  // Cities query（出張申請の都市一覧）
  if (normalizedQuery.includes('query Cities') || normalizedQuery.includes('cities {')) {
    const result = await stubTravelService.getCities();
    return { cities: result };
  }

  // EstimateTravelCost query（出張申請の概算費用）
  if (normalizedQuery.includes('query EstimateTravelCost') || normalizedQuery.includes('estimateTravelCost(input:')) {
    const input = variables?.input as {
      departureCityId: string;
      arrivalCityId: string;
      description: string;
      companyId?: number | null;
    };
    const request: EstimateTravelCostRequest = {
      departureCityId: Number(input.departureCityId),
      arrivalCityId: Number(input.arrivalCityId),
      description: input.description,
      companyId: input.companyId ?? undefined,
    };
    const result = await stubTravelService.estimateTravelCost(request);
    return { estimateTravelCost: result };
  }

  // ChapterDiagnosisOptions query（GameDay演習: 章ごとの原因診断ドロップダウンの選択肢）
  if (normalizedQuery.includes('query ChapterDiagnosisOptions') || normalizedQuery.includes('chapterDiagnosisOptions(chapter:')) {
    return { chapterDiagnosisOptions: ['(スタブ) ダミーの選択肢A', '(スタブ) ダミーの選択肢B'] };
  }

  // CheckChapterAnswer mutation（GameDay演習: 章ごとの原因診断の正解判定）
  if (normalizedQuery.includes('mutation CheckChapterAnswer') || normalizedQuery.includes('checkChapterAnswer(chapter:')) {
    return { checkChapterAnswer: false };
  }

  // ClearedChapters query（GameDay演習: 今日クリア済みの章番号一覧）
  if (normalizedQuery.includes('query ClearedChapters') || normalizedQuery.includes('clearedChapters')) {
    return { clearedChapters: [] };
  }

  // NPlusOneQuizOptions query（第2章: N+1診断クイズの選択肢）
  if (normalizedQuery.includes('query NPlusOneQuizOptions') || normalizedQuery.includes('nPlusOneQuizOptions')) {
    return { nPlusOneQuizOptions: { q1: [], q2: [], q3: [] } };
  }

  // CheckNPlusOneQuizAnswers mutation（第2章: N+1診断クイズの回答判定）
  if (normalizedQuery.includes('mutation CheckNPlusOneQuizAnswers') || normalizedQuery.includes('checkNPlusOneQuizAnswers(')) {
    return { checkNPlusOneQuizAnswers: { q1: false, q2: false, q3: false, allCorrect: false } };
  }

  // マッチしない場合はエラー
  throw new Error(`Unknown GraphQL query/mutation: ${normalizedQuery.substring(0, 100)}`);
}

