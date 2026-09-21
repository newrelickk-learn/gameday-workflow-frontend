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
  /** 裏クエストのクリア引換券。申請が成立したときだけ返る（ブラウザからgame-masterへ渡す） */
  hiddenQuestTokens?: string[] | null;
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
  cleared?: boolean;
  clearBlockedReason?: string | null;
}

export interface RageClickQuizOptions {
  q1: string[];
  q2: string[];
  q3: string[];
}

export interface RageClickQuizAnswersInput {
  q1: string;
  q2: string;
  q3: string;
}

export interface RageClickQuizResult {
  q1: boolean;
  q2: boolean;
  q3: boolean;
  allCorrect: boolean;
  cleared?: boolean;
  clearBlockedReason?: string | null;
}

export interface Transaction360QuizOptions {
  q1: string[];
  q2: string[];
  q3: string[];
  q4: string[];
}

export interface Transaction360QuizAnswersInput {
  q1: string[];
  q2: string[];
  q3: string[];
  q4: string[];
}

export interface Transaction360QuizResult {
  q1: boolean;
  q2: boolean;
  q3: boolean;
  q4: boolean;
  allCorrect: boolean;
  cleared?: boolean;
  clearBlockedReason?: string | null;
}

export interface ChapterMission {
  chapter: number;
  /** 'main'（メインストリーム）または 'hidden'（裏クエスト） */
  kind: string;
  /** 裏クエストはクリアするまでタイトルも伏せられるためnullになる */
  title?: string | null;
  description?: string | null;
  clearKeyword?: string | null;
  cleared: boolean;
  /** パネルを開いて挑戦する対象か（ログイン・プロモーション・裏クエストはfalse） */
  challengeable: boolean;
  unlocked: boolean;
  /** 内容（タイトル・説明）が開示されているか。未開封のクエストはfalseでtitleもnullになる */
  revealed: boolean;
}

export interface ChapterChallengerCount {
  chapter: number;
  teams: number;
}

export interface ChapterChallengeStatus {
  counts: ChapterChallengerCount[];
  /** 自分のチームが今挑戦しているクエスト。挑戦していなければnull */
  activeChapter?: number | null;
}

export interface StartChapterChallengeResult {
  started: boolean;
  /** started=falseのときの理由（another_active / locked / already_cleared など） */
  reason: string;
  activeChapter?: number | null;
}

export interface RemediationResult {
  applied: boolean;
  alreadyApplied: boolean;
  /** applied=falseのときの理由。原因の切り分けが未完了ならinvestigation_incomplete */
  reason?: string | null;
  hiddenQuestTokens?: string[] | null;
}

export interface ChapterAnswerResult {
  correct: boolean;
  cleared: boolean;
  /** クリアを記録できなかった理由。パネル未オープンならnot_challenging */
  clearBlockedReason?: string | null;
}

export interface TeamProgressItem {
  companyId: string;
  clearedChapters: number;
}

export interface TeamProgressResponse {
  totalChapters: number;
  teams: TeamProgressItem[];
}

export interface ChapterScoreRule {
  chapter: number;
  title: string;
  clearPoints: number;
  mistakePenaltyPoints: number;
  /** 早解き1位/2位/3位のボーナス点 */
  bonusPoints: number[];
}

export interface TeamChapterScore {
  chapter: number;
  cleared: boolean;
  clearedAt?: string | null;
  mistakeCount: number;
  basePoints: number;
  penaltyPoints: number;
  /** 早解きボーナスの順位(1〜3)。ボーナス圏外はnull */
  bonusRank?: number | null;
  bonusPoints: number;
  score: number;
}

export interface TeamScoreItem {
  companyId: string;
  totalScore: number;
  clearedChapters: number;
  chapters: TeamChapterScore[];
}

export interface TeamScoreResponse {
  totalChapters: number;
  /** 1チームが取り得る最大得点(全クエストを1位クリア) */
  maxScore: number;
  chapters: ChapterScoreRule[];
  teams: TeamScoreItem[];
}

