// 認証関連の型
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'engineer' | 'manager' | 'admin' | 'director' | 'accounting';
  department?: string; // 所属
  companyId?: number; // 会社ID
}

// 申請関連の型
export interface Application {
  id: string;
  type: string;
  title: string;
  description: string;
  amount?: number; // 経費精算の場合の金額
  startDate?: string; // 有給休暇の場合の開始日
  endDate?: string; // 有給休暇の場合の終了日
  days?: number; // 有給休暇の場合の日数
  status: 'pending' | 'approved' | 'rejected';
  applicantId: string;
  applicantName?: string; // 申請者名（表示用）
  applicantDepartment?: string; // 申請者所属（表示用）
  currentStep?: number; // 現在の承認ステップ
  totalSteps?: number; // 総承認ステップ数
  nextApproverId?: string; // 次の承認者ID
  nextApproverName?: string; // 次の承認者名（表示用）
  nextApproverDepartment?: string; // 次の承認者所属（表示用）
  createdAt: string;
  updatedAt: string;
}

export interface CreateApplicationRequest {
  type: string;
  title: string;
  description: string;
  amount?: number; // 経費精算の場合の金額
  startDate?: string; // 有給休暇の場合の開始日
  endDate?: string; // 有給休暇の場合の終了日
  days?: number; // 有給休暇の場合の日数
  applicantId: string; // 申請者ID
}

// 承認関連の型
export interface Approval {
  id: string;
  applicationId: string;
  approverId: string;
  approverName?: string; // 承認者名（表示用）
  approverDepartment?: string; // 承認者所属（表示用）
  status: 'pending' | 'approved' | 'rejected';
  comment?: string;
  step?: number; // 承認ステップ
  createdAt: string;
  updatedAt?: string;
}

export interface UpdateApprovalRequest {
  status: 'approved' | 'rejected';
  comment?: string;
  approverId: string; // 承認者ID
  applicationId?: string; // 申請ID（オプション、ワークフローサービスで必要）
}

// ワークフロー関連の型
export interface StartWorkflowRequest {
  applicationId: string;
  applicationType: 'BusinessTrip' | 'Expense' | 'Vacation' | 'Promotion';
  companyId?: number;
}

export interface StartWorkflowResponse {
  workflowInstanceId: string;
  applicationId: string;
  currentStep: number;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
}

export interface ValidateApprovalRequest {
  approvalId: string;
  applicationId: string;
  approverId: string;
  status: 'approved' | 'rejected';
}

export interface ValidateApprovalResponse {
  valid: boolean;
  currentStep: number;
  isFinalStep: boolean;
  nextStep?: number | null;
  message?: string | null;
}

export interface ApproveWorkflowRequest {
  approvalId: string;
  applicationId: string;
  approverId: string;
  status: 'approved' | 'rejected';
}

export interface ApproveWorkflowResponse {
  applicationId: string;
  currentStep: number;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  message?: string | null;
}

// 通知関連の型
export interface Notification {
  id: string;
  notificationType: 'ApprovalRequest' | 'ApprovalCompleted' | 'ApprovalRejected' | 'WorkflowCompleted';
  channel: 'Email' | 'Slack';
  recipientId: string;
  recipientEmail?: string | null;
  subject: string;
  body: string;
  sentAt?: string | null;
  createdAt: string;
}

export interface SendNotificationRequest {
  notificationType: 'ApprovalRequest' | 'ApprovalCompleted' | 'ApprovalRejected' | 'WorkflowCompleted';
  recipientId: string;
  subject: string;
  body: string;
}

export interface SendNotificationResponse {
  success: boolean;
  message: string;
}

