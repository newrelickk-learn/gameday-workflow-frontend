export const typeDefs = `#graphql
  # スカラー型
  scalar DateTime

  # ユーザー関連
  type User {
    id: ID!
    name: String!
    email: String!
    role: UserRole!
    department: String
    companyId: Int
    managerId: Int
  }

  enum UserRole {
    engineer
    manager
    admin
    director
    accounting
    hr
  }

  input UpdateUserManagerInput {
    managerId: Int
  }

  type LoginResponse {
    token: String!
    user: User!
  }

  input LoginInput {
    email: String!
    password: String!
    # GameDay第0章: リソースが飽和しているPodを突き止めた際に、そのPod名を入力する欄。通常は不要。
    impactedPodName: String
  }

  # 申請関連
  type Application {
    id: ID!
    type: String!
    title: String!
    description: String!
    amount: Float
    startDate: String
    endDate: String
    days: Int
    status: ApplicationStatus!
    applicantId: String!
    applicantName: String
    applicantDepartment: String
    currentStep: Int
    totalSteps: Int
    nextApproverId: String
    nextApproverName: String
    nextApproverDepartment: String
    latestComment: String
    receiptImageUrls: [String!]
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  enum ApplicationStatus {
    pending
    approved
    rejected
  }

  input CreateApplicationInput {
    type: String!
    title: String!
    description: String!
    amount: Float
    startDate: String
    endDate: String
    days: Int
    applicantId: String!
    dependencyChain: [String!]
  }

  # 承認関連
  type Approval {
    id: ID!
    applicationId: String!
    approverId: String!
    approverName: String
    approverDepartment: String
    status: ApprovalStatus!
    comment: String
    step: Int
    createdAt: DateTime!
    updatedAt: DateTime
  }

  enum ApprovalStatus {
    pending
    approved
    rejected
  }

  enum WorkflowStatus {
    pending
    in_progress
    completed
    rejected
  }

  enum ApplicationType {
    BusinessTrip
    Expense
    Vacation
    Promotion
  }

  enum NotificationType {
    ApprovalRequest
    ApprovalCompleted
    ApprovalRejected
    WorkflowCompleted
  }

  enum NotificationChannel {
    Email
    Slack
  }

  input UpdateApprovalInput {
    status: ApprovalStatus!
    comment: String
    approverId: String!
    applicationId: String
  }

  # ワークフロー関連
  input StartWorkflowInput {
    applicationId: String!
    applicationType: ApplicationType!
    companyId: Int
  }

  type StartWorkflowResponse {
    workflowInstanceId: String!
    applicationId: String!
    currentStep: Int!
    status: WorkflowStatus!
  }

  input ValidateApprovalInput {
    approvalId: String!
    applicationId: String!
    approverId: String!
    status: ApprovalStatus!
  }

  type ValidateApprovalResponse {
    valid: Boolean!
    currentStep: Int!
    isFinalStep: Boolean!
    nextStep: Int
    message: String
  }

  input ApproveWorkflowInput {
    approvalId: String!
    applicationId: String!
    approverId: String!
    status: ApprovalStatus!
  }

  type ApproveWorkflowResponse {
    applicationId: String!
    currentStep: Int!
    status: WorkflowStatus!
    message: String
  }

  # 出張申請の概算費用（travelサービス）
  type City {
    id: ID!
    nameJa: String!
    isUnstable: Boolean!
  }

  input EstimateTravelCostInput {
    departureCityId: ID!
    arrivalCityId: ID!
    description: String!
    companyId: Int
  }

  type EstimateTravelCostResponse {
    amount: Float!
    currency: String!
  }

  # 通知関連
  type Notification {
    id: ID!
    notificationType: NotificationType!
    channel: NotificationChannel!
    recipientId: String!
    recipientEmail: String
    subject: String!
    body: String!
    sentAt: DateTime
    createdAt: DateTime!
  }

  input SendNotificationInput {
    notificationType: NotificationType!
    recipientId: String!
    subject: String!
    body: String!
  }

  type SendNotificationResponse {
    success: Boolean!
    message: String!
  }

  # AI分析結果
  type AnalysisResult {
    risk: RiskLevel!
    summary: String!
  }

  enum RiskLevel {
    low
    medium
    high
  }

  # Query
  type Query {
    # ユーザー
    user(id: ID!): User

    # 人事部専用: 自社ユーザー一覧
    usersByCompany: [User!]!

    # 申請
    applications(applicantId: ID): [Application!]!
    application(id: ID!): Application
    
    # 承認
    approvals: [Approval!]!
    approval(id: ID!): Approval
    approvalsByApplication(applicationId: ID!): [Approval!]!
    
    # 通知
    notificationHistory(recipientId: String!): [Notification!]!
    
    # AI分析
    analyzeApplication(applicationId: ID!): AnalysisResult!

    # 出張申請の概算費用（travelサービス）
    cities: [City!]!
    estimateTravelCost(input: EstimateTravelCostInput!): EstimateTravelCostResponse!

    # GameDay演習: 章ごとの原因診断ドロップダウンの選択肢（New Relicで調査した内容から選ぶ）
    chapterDiagnosisOptions(chapter: Int!): [String!]!

    # GameDay演習: 今日クリア済みの章番号一覧（日付が変わるとリセットされる）
    clearedChapters: [Int!]!
  }

  # Mutation
  type Mutation {
    # 認証
    login(input: LoginInput!): LoginResponse!

    # 人事部専用: 自社ユーザーの直属の上長を更新
    updateUserManager(id: ID!, input: UpdateUserManagerInput!): User!

    # 申請
    createApplication(input: CreateApplicationInput!): Application!
    
    # 承認
    updateApproval(id: ID!, input: UpdateApprovalInput!): Approval!
    
    # ワークフロー
    startWorkflow(input: StartWorkflowInput!): StartWorkflowResponse!
    validateApproval(input: ValidateApprovalInput!): ValidateApprovalResponse!
    approveWorkflow(input: ApproveWorkflowInput!): ApproveWorkflowResponse!
    
    # 通知
    sendNotification(input: SendNotificationInput!): SendNotificationResponse!
    
    # AI
    generateApplicationSuggestion(prompt: String!): String!
    askChat(question: String!): String!

    # GameDay演習: 章ごとの原因診断の正解判定
    checkChapterAnswer(chapter: Int!, selectedText: String!): Boolean!
  }
`;

// スキーマは後でリゾルバーと結合されます
// リゾルバーは別ファイルで定義し、API Routeで結合します

