export interface LoginRequest {
  email: string;
  password: string;
  impactedPodName?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'engineer' | 'manager' | 'admin' | 'director' | 'accounting' | 'hr';
  department?: string;
  companyId?: number;
  managerId?: number | null;
}

export interface Application {
  id: string;
  applicationNumber?: string | null;
  type: string;
  title: string;
  description: string;
  amount?: number;
  startDate?: string;
  endDate?: string;
  days?: number;
  status: 'pending' | 'approved' | 'rejected';
  applicantId: string;
  applicantName?: string;
  applicantDepartment?: string;
  currentStep?: number;
  totalSteps?: number;
  nextApproverId?: string;
  nextApproverName?: string;
  nextApproverDepartment?: string;
  latestComment?: string | null;
  receiptImageUrls?: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApplicationRequest {
  type: string;
  title: string;
  description: string;
  amount?: number;
  startDate?: string;
  endDate?: string;
  days?: number;
  applicantId: string;
  dependencyChain?: string[];
}

export interface Approval {
  id: string;
  applicationId: string;
  approverId: string;
  approverName?: string;
  approverDepartment?: string;
  status: 'pending' | 'approved' | 'rejected';
  comment?: string;
  step?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface UpdateApprovalRequest {
  status: 'approved' | 'rejected';
  comment?: string;
  approverId: string;
  applicationId?: string;
}

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

export interface City {
  id: number;
  nameJa: string;
  isUnstable: boolean;
}

export interface EstimateTravelCostRequest {
  departureCityId: number;
  arrivalCityId: number;
  description: string;
  companyId?: number;
}

export interface EstimateTravelCostResponse {
  amount: number;
  currency: string;
}

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

export interface NPlusOneQuizOptions {
  q1: string[];
  q2: string[];
  q3: string[];
}

export interface NPlusOneQuizAnswersInput {
  q1: string[];
  q2: string[];
  q3: string[];
}

export interface NPlusOneQuizResult {
  q1: boolean;
  q2: boolean;
  q3: boolean;
  allCorrect: boolean;
}

