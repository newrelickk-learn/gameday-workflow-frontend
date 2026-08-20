import type {
  LoginRequest,
  LoginResponse,
  User,
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
  EstimateTravelCostRequest,
  EstimateTravelCostResponse,
} from '../api/types';
import { stubUserService } from '../api/stubs/user-service';
import { stubApplicationService } from '../api/stubs/application-service';
import { stubWorkflowService } from '../api/stubs/workflow-service';
import { stubAiService } from '../api/stubs/ai-service';
import { stubTravelService } from '../api/stubs/travel-service';
import { buildApplicationCode } from '../travel/application-code';
import { addCustomAttribute } from '../newrelic-helper';

// travelサービス呼び出しのHTTPタイムアウト。Istio側のfault injection（delay 5秒）が
// これを超えるため、不安定な都市が絡む場合は60%の確率でここでタイムアウト失敗する。
const TRAVEL_REQUEST_TIMEOUT_MS = 3000;

/**
 * ダウンストリームサービスへの接続クライアント
 * 現在はスタブ実装を使用（ダウンストリームサービスは別サービス）
 */
export class DownstreamClient {
  private userServiceUrl: string;
  private applicationServiceUrl: string;
  private workflowServiceUrl: string;
  private aiServiceUrl: string;
  private travelServiceUrl: string;
  private useStubs: boolean;

  constructor() {
    // 環境変数からスタブモードを判定（デフォルトはtrue）
    this.useStubs = process.env.USE_DOWNSTREAM_STUBS !== 'false';

    this.userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:8001';
    this.applicationServiceUrl = process.env.APPLICATION_SERVICE_URL || 'http://localhost:8002';
    this.workflowServiceUrl = process.env.WORKFLOW_SERVICE_URL || 'http://localhost:8003';
    this.aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8004';
    this.travelServiceUrl = process.env.TRAVEL_SERVICE_URL || 'http://localhost:8005';
  }

  // downstreamサービスへの接続がハングした場合、ページ全体のローディングが永久に
  // 終わらなくなる不具合を防ぐためのデフォルトタイムアウト（ミリ秒）。
  private static readonly DEFAULT_TIMEOUT_MS = 10000;

  private async request<T>(
    url: string,
    options: RequestInit = {},
    token?: string
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    if (process.env.NODE_ENV === 'development') {
      console.log('[Downstream Client] Request:', {
        url,
        method: options.method || 'GET',
        hasToken: !!token,
      });
    }

    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), DownstreamClient.DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: options.signal ?? timeoutController.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        const errorMessage = `Downstream service error: ${response.status} - ${errorText}`;
        // エラーレスポンスの詳細をログ出力
        console.error('[Downstream Client] Request failed:', {
          url,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          error: errorText,
          errorLength: errorText.length,
        });
        const error = new Error(errorMessage) as Error & {
          code?: string;
          detailMessage?: string;
          field?: string;
        };
        // downstream(FastAPI)のHTTPExceptionは { detail: { error, message, field } } 形式。
        // code/detailMessage/fieldをError側に持たせ、呼び出し元(resolvers.ts)がGraphQLの
        // extensionsに転記できるようにする（例: 第5章のASSERTION_RULE_VIOLATION）。
        try {
          const body = JSON.parse(errorText);
          const detail = body?.detail ?? body;
          error.code = detail?.error;
          error.detailMessage = detail?.message;
          error.field = detail?.field;
        } catch {
          // errorTextがJSONでない場合は無視
        }
        throw error;
      }

      const data = await response.json();
      // エラーの場合のみレスポンス内容を詳細にログ出力
      if (!response.ok) {
        console.error('[Downstream Client] Response (Error):', {
          url,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          data: data,
          dataLength: JSON.stringify(data).length,
          dataString: JSON.stringify(data, null, 2),
        });
      }
      return data;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Downstream service error')) {
        throw error;
      }
      if (error instanceof Error && error.name === 'AbortError' && !options.signal) {
        // downstream接続がハングして応答が返らないケース（呼び出し元でPromise.allを使っていると、
        // これがページ全体のローディングを永久に終わらせなくなる原因になる）。
        console.error('[Downstream Client] Request timed out:', { url, timeoutMs: DownstreamClient.DEFAULT_TIMEOUT_MS });
        throw new Error(`Downstream service timed out after ${DownstreamClient.DEFAULT_TIMEOUT_MS}ms: ${url}`);
      }
      // ネットワークエラーなどの場合
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Downstream Client] Network error:', {
        url,
        error: errorMessage,
      });
      throw new Error(`Failed to connect to downstream service: ${errorMessage}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ユーザーサービス
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    if (this.useStubs) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Downstream Client] Using stub for login');
      }
      return stubUserService.login(credentials);
    }

    const url = `${this.userServiceUrl}/auth/login`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      // user-serviceは失敗時に { error: "INVALID_CREDENTIALS" | "POD_SATURATED" | ..., message: "..." }
      // を返す。GraphQL側（resolvers.ts）でこのcodeを見て、UIに正しいエラー種別を伝える
      // （GameDay第0章: 通常のパスワード誤りと、Pod飽和による失敗を区別するため）。
      let code = 'LOGIN_ERROR';
      let message = 'Login failed';
      try {
        const body = await response.json();
        if (body?.error) code = body.error;
        if (body?.message) message = body.message;
      } catch {
        // レスポンスがJSONでない場合はデフォルトのまま
      }

      console.error('[Downstream Client] Login failed:', { url, status: response.status, code });

      const error = new Error(message) as Error & { code?: string };
      error.code = code;
      throw error;
    }

    return response.json();
  }

  async getUser(id: string, token?: string): Promise<User> {
    if (this.useStubs) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Downstream Client] Using stub for getUser');
      }
      return stubUserService.getUser(id);
    }
    return this.request<User>(
      `${this.userServiceUrl}/users/${id}`,
      { method: 'GET' },
      token
    );
  }

  // 人事部専用: 自社ユーザー一覧
  async getUsersByCompany(token?: string): Promise<User[]> {
    if (this.useStubs) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Downstream Client] Using stub for getUsersByCompany');
      }
      return stubUserService.getUsersByCompany();
    }
    return this.request<User[]>(
      `${this.userServiceUrl}/users/company`,
      { method: 'GET' },
      token
    );
  }

  // 人事部専用: 自社ユーザーの直属の上長を更新
  async updateUserManager(id: string, managerId: number | null, token?: string): Promise<User> {
    if (this.useStubs) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Downstream Client] Using stub for updateUserManager');
      }
      return stubUserService.updateUserManager(id, managerId);
    }
    return this.request<User>(
      `${this.userServiceUrl}/users/${id}/manager`,
      {
        method: 'PATCH',
        body: JSON.stringify({ managerId }),
      },
      token
    );
  }

  // 申請サービス
  async getApplications(token?: string, applicantId?: string): Promise<Application[]> {
    if (this.useStubs) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Downstream Client] Using stub for getApplications');
      }
      const allApplications = await stubApplicationService.getApplications();
      // スタブモードでもapplicantIdでフィルタリング
      if (applicantId) {
        return allApplications.filter(app => app.applicantId === applicantId);
      }
      return allApplications;
    }
    // applicantIdが指定されている場合、クエリパラメータに追加
    const url = new URL(`${this.applicationServiceUrl}/api/v1/applications`);
    if (applicantId) {
      url.searchParams.append('applicantId', applicantId);
    }
    return this.request<Application[]>(
      url.toString(),
      { method: 'GET' },
      token
    );
  }

  async getApplication(id: string, token?: string): Promise<Application> {
    if (this.useStubs) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Downstream Client] Using stub for getApplication');
      }
      return stubApplicationService.getApplication(id);
    }
    return this.request<Application>(
      `${this.applicationServiceUrl}/api/v1/applications/${id}`,
      { method: 'GET' },
      token
    );
  }

  // GameDay演習: 章ごとの原因診断ドロップダウンの選択肢を取得する。
  // 正解・選択肢はサーバー側で暗号化された状態のみ保持しており、レスポンスには
  // 正解フラグを含めない（New Relicでの調査結果を元に選ばせる仕組みのため）。
  async getChapterDiagnosisOptions(chapter: number, token?: string): Promise<string[]> {
    if (this.useStubs) {
      return [];
    }
    const data = await this.request<{ options: string[] }>(
      `${this.applicationServiceUrl}/api/v1/chapters/${chapter}/diagnosis-options`,
      { method: 'GET' },
      token
    );
    return data.options;
  }

  // GameDay演習: 章ごとの原因診断ドロップダウンで選ばれた選択肢が正解かどうかを判定する。
  async checkChapterAnswer(chapter: number, selectedText: string, token?: string): Promise<boolean> {
    if (this.useStubs) {
      return false;
    }
    const data = await this.request<{ correct: boolean }>(
      `${this.applicationServiceUrl}/api/v1/chapters/${chapter}/check-answer`,
      {
        method: 'POST',
        body: JSON.stringify({ selectedText }),
      },
      token
    );
    return data.correct;
  }

  // GameDay演習: 今日クリア済みの章番号一覧を取得する（日付が変わるとリセットされる）。
  async getClearedChapters(token?: string): Promise<number[]> {
    if (this.useStubs) {
      return [];
    }
    const data = await this.request<{ clearedChapters: number[] }>(
      `${this.applicationServiceUrl}/api/v1/chapters/progress`,
      { method: 'GET' },
      token
    );
    return data.clearedChapters;
  }

  async createApplication(
    data: CreateApplicationRequest,
    token?: string
  ): Promise<Application> {
    if (this.useStubs) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Downstream Client] Using stub for createApplication');
      }
      return stubApplicationService.createApplication(data);
    }
    return this.request<Application>(
      `${this.applicationServiceUrl}/api/v1/applications`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      token
    );
  }

  // ワークフローサービス
  async getApprovals(token?: string, recipientId?: string): Promise<Approval[]> {
    if (this.useStubs) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Downstream Client] Using stub for getApprovals');
        console.log('[Downstream Client] recipientId:', recipientId);
      }
      try {
        const result = await stubWorkflowService.getApprovals(recipientId);
        if (process.env.NODE_ENV === 'development') {
          console.log('[Downstream Client] Stub returned', result?.length || 0, 'approvals');
        }
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Downstream Client] Stub service error:', errorMessage);
        throw new Error(`Stub service failed: ${errorMessage}`);
      }
    }
    // エンドポイントパスを環境変数で設定可能にする（デフォルトは /api/v1/notifications/history）
    const approvalsPath = process.env.WORKFLOW_APPROVALS_PATH || '/api/v1/notifications/history';
    // recipient_idクエリパラメータを追加
    const url = new URL(`${this.workflowServiceUrl}${approvalsPath}`);
    if (recipientId) {
      url.searchParams.append('recipient_id', recipientId);
    }
    if (process.env.NODE_ENV === 'development') {
      console.log('[Downstream Client] Fetching approvals from:', url.toString());
      console.log('[Downstream Client] recipient_id:', recipientId);
    }
    
    // ワークフローサービスから通知データを取得
    interface NotificationResponse {
      id: string;
      notification_type: string;
      channel: string;
      recipient_id: string;
      recipient_email: string | null;
      subject: string;
      body: string;
      sent_at: string;
      created_at: string;
      approval_id?: string; // 承認ID（オプション、通知データに含まれている可能性）
      workflow_id?: string; // ワークフローID（オプション）
      [key: string]: any; // その他のフィールドに対応
    }
    
    const notifications = await this.request<NotificationResponse[]>(
      url.toString(),
      { method: 'GET' },
      token
    );
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[Downstream Client] Raw notifications:', JSON.stringify(notifications, null, 2));
    }
    
    // 申請一覧を取得して、通知に含まれる情報と照合して正しい申請IDを特定
    let applications: Application[] = [];
    try {
      applications = await this.getApplications(token);
      if (process.env.NODE_ENV === 'development') {
        console.log('[Downstream Client] Fetched applications for mapping:', applications.length);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Downstream Client] Failed to fetch applications for mapping:', error);
      }
    }
    
    // 通知データをApproval型にマッピング
    const approvals: Approval[] = notifications
      .filter((notification) => notification.notification_type === 'ApprovalRequest')
      .map((notification) => {
        // subjectから申請IDを抽出（例: "承認依頼: 申請ID 1" → "1"）
        // UUID形式の申請IDも抽出できるように改善
        const applicationIdMatch = 
          notification.subject.match(/申請ID\s+([a-f0-9-]{36}|[0-9]+)/i) || 
          notification.body.match(/申請ID\s+([a-f0-9-]{36}|[0-9]+)/i) ||
          notification.subject.match(/申請ID[：:]\s*([a-f0-9-]{36}|[0-9]+)/i) ||
          notification.body.match(/申請ID[：:]\s*([a-f0-9-]{36}|[0-9]+)/i);
        
        let applicationId = applicationIdMatch ? applicationIdMatch[1] : '';
        
        // もし申請IDが数値のみの場合、申請一覧から実際のUUIDを探す
        // 通知のbodyに含まれる情報（申請タイトルなど）と照合
        if (applicationId && /^\d+$/.test(applicationId)) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[Downstream Client] Extracted numeric application ID:', applicationId);
            console.log('[Downstream Client] Full notification data:', notification);
          }
          
          // 申請一覧から、通知のbodyに含まれる情報と一致する申請を探す
          // ただし、数値IDとUUIDの対応関係が不明なため、
          // 通知のcreated_atと申請のcreatedAtを比較して、最も近い申請を探す
          const notificationDate = new Date(notification.created_at);
          let matchedApplication: Application | undefined;
          
          // まず、通知の日時に最も近い申請を探す
          let closestApplication: Application | undefined;
          let closestTimeDiff = Infinity;
          
          applications.forEach((app) => {
            const appDate = new Date(app.createdAt);
            const timeDiff = Math.abs(notificationDate.getTime() - appDate.getTime());
            if (timeDiff < closestTimeDiff) {
              closestTimeDiff = timeDiff;
              closestApplication = app;
            }
          });
          
          // 通知の日時から24時間以内の申請を優先的に選択
          if (closestApplication && closestTimeDiff < 24 * 60 * 60 * 1000) {
            matchedApplication = closestApplication;
            if (process.env.NODE_ENV === 'development') {
              console.log('[Downstream Client] Matched application by date:', {
                notificationDate: notification.created_at,
                applicationDate: closestApplication.createdAt,
                timeDiff: closestTimeDiff,
                applicationId: closestApplication.id,
              });
            }
          }
          
          if (matchedApplication) {
            applicationId = matchedApplication.id;
          } else {
            // マッチする申請が見つからない場合、最初の申請を使用（暫定対応）
            if (applications.length > 0) {
              applicationId = applications[0].id;
              if (process.env.NODE_ENV === 'development') {
                console.warn('[Downstream Client] Using first application as fallback:', applicationId);
              }
            }
          }
        }
        
        // bodyからステップ番号を抽出（例: "ステップ 1" → 1）
        const stepMatch = notification.body.match(/ステップ\s+(\d+)/);
        const step = stepMatch ? parseInt(stepMatch[1], 10) : undefined;
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[Downstream Client] Mapping notification:', {
            notificationId: notification.id,
            extractedApplicationId: applicationId,
            subject: notification.subject,
            body: notification.body,
          });
        }
        
        // 通知データに承認IDが含まれている場合はそれを使用
        // 通知IDを承認IDとして保存（後で実際の承認IDを取得する際に使用）
        const approvalIdFromNotification = notification.approval_id || notification.workflow_id || notification.id;
        
        return {
          id: notification.id, // 通知IDをそのまま使用（フロントエンドで使用）
          applicationId: applicationId,
          approverId: notification.recipient_id,
          approverName: undefined,
          approverDepartment: undefined,
          status: 'pending' as const,
          comment: undefined,
          step: step,
          createdAt: notification.created_at,
          updatedAt: notification.sent_at || notification.created_at,
          // 実際の承認IDを保存するためのメタデータ（型定義には含まれないが、後で使用）
          _actualApprovalId: approvalIdFromNotification,
        } as Approval & { _actualApprovalId?: string };
      });
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[Downstream Client] Mapped notifications to approvals:', approvals.length);
    }
    
    return approvals;
  }

  async getApproval(id: string, token?: string): Promise<Approval> {
    if (this.useStubs) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Downstream Client] Using stub for getApproval');
      }
      return stubWorkflowService.getApproval(id);
    }
    const approvalsPath = process.env.WORKFLOW_APPROVALS_PATH || '/api/approvals';
    return this.request<Approval>(
      `${this.workflowServiceUrl}${approvalsPath}/${id}`,
      { method: 'GET' },
      token
    );
  }

  async getApprovalsByApplication(
    applicationId: string,
    token?: string
  ): Promise<Approval[]> {
    if (this.useStubs) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Downstream Client] Using stub for getApprovalsByApplication');
      }
      return stubWorkflowService.getApprovalsByApplication(applicationId);
    }
    // エンドポイントパスを環境変数で設定可能にする（デフォルトは /api/v1/applications/{applicationId}/approvals）
    const approvalsByAppPath = process.env.WORKFLOW_APPROVALS_BY_APP_PATH || '/api/v1/applications/{applicationId}/approvals';
    const url = approvalsByAppPath.replace('{applicationId}', applicationId);
    const fullUrl = `${this.workflowServiceUrl}${url}`;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[Downstream Client] Fetching approvals by application:', {
        applicationId,
        url: fullUrl,
      });
    }
    
    return this.request<Approval[]>(
      fullUrl,
      { method: 'GET' },
      token
    );
  }

  async updateApproval(
    id: string,
    data: UpdateApprovalRequest,
    token?: string,
    applicationId?: string
  ): Promise<Approval> {
    if (this.useStubs) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Downstream Client] Using stub for updateApproval');
      }
      return stubWorkflowService.updateApproval(id, data);
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[Downstream Client] updateApproval called (NOT using stubs):', {
        id,
        data,
        applicationId,
        applicationServiceUrl: this.applicationServiceUrl,
        useStubs: this.useStubs,
      });
    }
    // 申請IDを取得
    const actualApplicationId = data.applicationId || applicationId;
    if (!actualApplicationId) {
      throw new Error('applicationId is required for approval update');
    }
    
    // 通知IDを承認IDとして使用（application-approval-serviceで処理される）
    const actualApprovalId = id;
    
    // 申請承認サービスで承認を更新し、申請ステータスを更新
    const updateApprovalUrl = `${this.applicationServiceUrl}/api/v1/approvals/update`;
    
    interface UpdateApprovalResponse {
      success: boolean;
      message: string;
      applicationStatus?: string;
    }
    
    try {
      const updateResult = await this.request<UpdateApprovalResponse>(
        updateApprovalUrl,
        {
          method: 'POST',
          body: JSON.stringify({
            approvalId: actualApprovalId,
            applicationId: actualApplicationId,
            approverId: data.approverId,
            status: data.status,
            comment: data.comment,
          }),
        },
        token
      );
      
      // Approval型を構築して返す
      const approval: Approval = {
        id: actualApprovalId,
        applicationId: actualApplicationId,
        approverId: data.approverId,
        approverName: undefined,
        approverDepartment: undefined,
        status: data.status,
        comment: data.comment,
        step: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      return approval;
    } catch (error) {
      // 申請承認サービスの更新が失敗した場合
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Downstream Client] Approval update failed:', {
        url: updateApprovalUrl,
        applicationServiceUrl: this.applicationServiceUrl,
        error: errorMessage,
        approvalId: actualApprovalId,
        applicationId: actualApplicationId,
      });
      throw error;
    }
  }

  // ワークフローサービス（新しいAPI）
  async startWorkflow(
    data: StartWorkflowRequest,
    token?: string
  ): Promise<StartWorkflowResponse> {
    if (this.useStubs) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Downstream Client] Using stub for startWorkflow');
      }
      return stubWorkflowService.startWorkflow(data);
    }
    return this.request<StartWorkflowResponse>(
      `${this.workflowServiceUrl}/api/v1/workflows/start`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      token
    );
  }

  async validateApproval(
    data: ValidateApprovalRequest,
    token?: string
  ): Promise<ValidateApprovalResponse> {
    if (this.useStubs) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Downstream Client] Using stub for validateApproval');
      }
      return stubWorkflowService.validateApproval(data);
    }
    return this.request<ValidateApprovalResponse>(
      `${this.workflowServiceUrl}/api/v1/workflows/validate-approval`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      token
    );
  }

  async approveWorkflow(
    data: ApproveWorkflowRequest,
    token?: string
  ): Promise<ApproveWorkflowResponse> {
    if (this.useStubs) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Downstream Client] Using stub for approveWorkflow');
      }
      return stubWorkflowService.approveWorkflow(data);
    }
    return this.request<ApproveWorkflowResponse>(
      `${this.workflowServiceUrl}/api/v1/workflows/approve`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      token
    );
  }

  async getNotificationHistory(
    recipientId: string,
    token?: string
  ): Promise<Notification[]> {
    if (this.useStubs) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Downstream Client] Using stub for getNotificationHistory');
      }
      return stubWorkflowService.getNotificationHistory(recipientId);
    }
    const url = new URL(`${this.workflowServiceUrl}/api/v1/notifications/history`);
    url.searchParams.append('recipient_id', recipientId);

    // ワークフローサービス（Rust）はスネークケースでレスポンスを返すため、
    // GraphQLスキーマ（camelCase）に合わせて変換する
    interface NotificationHistoryResponse {
      id: string;
      notification_type: Notification['notificationType'];
      channel: Notification['channel'];
      recipient_id: string;
      recipient_email: string | null;
      subject: string;
      body: string;
      sent_at: string | null;
      created_at: string;
    }

    const notifications = await this.request<NotificationHistoryResponse[]>(
      url.toString(),
      { method: 'GET' },
      token
    );

    return notifications.map((n) => ({
      id: n.id,
      notificationType: n.notification_type,
      channel: n.channel,
      recipientId: n.recipient_id,
      recipientEmail: n.recipient_email,
      subject: n.subject,
      body: n.body,
      sentAt: n.sent_at,
      createdAt: n.created_at,
    }));
  }

  async sendNotification(
    data: SendNotificationRequest,
    token?: string
  ): Promise<SendNotificationResponse> {
    if (this.useStubs) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Downstream Client] Using stub for sendNotification');
      }
      return stubWorkflowService.sendNotification(data);
    }
    return this.request<SendNotificationResponse>(
      `${this.workflowServiceUrl}/api/v1/notifications/send`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      token
    );
  }

  // AIサービス
  async generateApplicationSuggestion(
    prompt: string,
    token?: string
  ): Promise<string> {
    if (this.useStubs) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Downstream Client] Using stub for generateApplicationSuggestion');
      }
      return stubAiService.generateApplicationSuggestion(prompt);
    }
    const response = await this.request<{ suggestion: string }>(
      `${this.aiServiceUrl}/suggest`,
      {
        method: 'POST',
        body: JSON.stringify({ prompt }),
      },
      token
    );
    return response.suggestion;
  }

  async analyzeApplication(
    applicationId: string,
    token?: string
  ): Promise<{ risk: 'low' | 'medium' | 'high'; summary: string }> {
    if (this.useStubs) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Downstream Client] Using stub for analyzeApplication');
      }
      return stubAiService.analyzeApplication(applicationId);
    }
    return this.request<{ risk: 'low' | 'medium' | 'high'; summary: string }>(
      `${this.aiServiceUrl}/analyze/${applicationId}`,
      { method: 'GET' },
      token
    );
  }

  async askChat(question: string, token?: string): Promise<string> {
    if (this.useStubs) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Downstream Client] Using stub for askChat');
      }
      return stubAiService.askChat(question);
    }
    const response = await this.request<{ answer: string }>(
      `${this.aiServiceUrl}/chat`,
      {
        method: 'POST',
        body: JSON.stringify({ question }),
      },
      token
    );
    return response.answer;
  }

  // travelサービス（出張申請の概算費用）
  async getCities(token?: string): Promise<City[]> {
    if (this.useStubs) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Downstream Client] Using stub for getCities');
      }
      return stubTravelService.getCities();
    }
    return this.request<City[]>(
      `${this.travelServiceUrl}/cities`,
      { method: 'GET' },
      token
    );
  }

  async estimateTravelCost(
    data: EstimateTravelCostRequest,
    token?: string
  ): Promise<EstimateTravelCostResponse> {
    if (this.useStubs) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Downstream Client] Using stub for estimateTravelCost');
      }
      return stubTravelService.estimateTravelCost(data);
    }

    const cities = await this.getCities(token);
    const departureCity = cities.find((c) => c.id === data.departureCityId);
    const arrivalCity = cities.find((c) => c.id === data.arrivalCityId);
    const isUnstableRoute = Boolean(departureCity?.isUnstable || arrivalCity?.isUnstable);

    const { header: applicationCode, isRisky, resolutionCode } = buildApplicationCode({
      isUnstableRoute,
      description: data.description,
      companyId: data.companyId ?? 'unknown',
    });

    // 不安定な都市が絡み、かつ解消コード未検出のリスキーな呼び出しの時だけ、
    // その日・その企業の正解コードをNew Relicのカスタムアトリビュートとして記録する。
    // 安定した呼び出しには付与しない（失敗トレースを開いたときだけ答えが見える）。
    if (isRisky) {
      await addCustomAttribute('travel.resolutionCode', resolutionCode);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TRAVEL_REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`${this.travelServiceUrl}/estimate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Application-Code': applicationCode,
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          departureCityId: data.departureCityId,
          arrivalCityId: data.arrivalCityId,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Travel service error: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Travel service request timed out');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const downstreamClient = new DownstreamClient();

