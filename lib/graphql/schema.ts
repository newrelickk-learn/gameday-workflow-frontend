export const typeDefs = `#graphql
  scalar DateTime

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
    # 章0(ログイン)クリアの引換券。ブラウザがgame-masterへ届けてクリアを記録する
    # (ログインのリクエストにgame-masterへのサーバー間呼び出しを混ぜないため)。
    chapterClearTokens: [String!]
  }

  input LoginInput {
    email: String!
    password: String!
    impactedPodName: String
  }

  type Application {
    id: ID!
    applicationNumber: String
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
    hiddenQuestTokens: [String!]
    # メインストリームの章クリア(プロモーション=章5)の引換券。ブラウザがgame-masterへ
    # 届けてクリアを記録する(申請作成のリクエストにgame-masterへのサーバー間呼び出しを
    # 混ぜないため)。
    chapterClearTokens: [String!]
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
    # game-masterの状態(仮想日付・クリア済みの章)の署名付きスナップショット。ブラウザが
    # gameStateSnapshotクエリで事前に取得して添える(申請作成のリクエストにgame-masterへの
    # サーバー間呼び出しを混ぜないため)。
    gameStateToken: String
  }

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
    # 承認完了で仮想時間を進めるための引換券。ブラウザがgame-masterへ届ける
    # (承認のリクエストにgame-masterへのサーバー間呼び出しを混ぜないため)。
    gameProgressToken: String
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

  type City {
    id: ID!
    nameJa: String!
    nameEn: String
    isUnstable: Boolean!
  }

  input EstimateTravelCostInput {
    departureCityId: ID!
    arrivalCityId: ID!
    description: String!
    companyId: Int
    # ブラウザが既に把握しているchapter3のクリア状況。BFFがgame-masterに問い合わせ直さずに
    # 済むよう、ここで渡してもらう(サーバー間呼び出しを増やさないため)。
    isChapter3Cleared: Boolean
  }

  type EstimateTravelCostResponse {
    amount: Float!
    currency: String!
  }

  type NPlusOneQuizOptions {
    q1: [String!]!
    q2: [String!]!
    q3: [String!]!
  }

  input NPlusOneQuizAnswersInput {
    q1: [String!]!
    q2: [String!]!
    q3: [String!]!
  }

  type NPlusOneQuizResult {
    q1: Boolean!
    q2: Boolean!
    q3: Boolean!
    allCorrect: Boolean!
    cleared: Boolean
    clearBlockedReason: String
  }

  type RageClickQuizOptions {
    q1: [String!]!
    q2: [String!]!
    q3: [String!]!
  }

  input RageClickQuizAnswersInput {
    q1: String!
    q2: String!
    q3: String!
  }

  type RageClickQuizResult {
    q1: Boolean!
    q2: Boolean!
    q3: Boolean!
    allCorrect: Boolean!
    cleared: Boolean
    clearBlockedReason: String
  }

  type Transaction360QuizOptions {
    q1: [String!]!
    q2: [String!]!
    q3: [String!]!
    q4: [String!]!
  }

  input Transaction360QuizAnswersInput {
    q1: [String!]!
    q2: [String!]!
    q3: [String!]!
    q4: [String!]!
  }

  type Transaction360QuizResult {
    q1: Boolean!
    q2: Boolean!
    q3: Boolean!
    q4: Boolean!
    allCorrect: Boolean!
    cleared: Boolean
    clearBlockedReason: String
  }

  type ChapterMission {
    chapter: Int!
    kind: String!
    title: String
    description: String
    clearKeyword: String
    cleared: Boolean!
    challengeable: Boolean!
    unlocked: Boolean!
    revealed: Boolean!
  }

  type ChapterChallengerCount {
    chapter: Int!
    teams: Int!
  }

  type ChapterChallengeStatus {
    counts: [ChapterChallengerCount!]!
    activeChapter: Int
  }

  type StartChapterChallengeResult {
    started: Boolean!
    reason: String!
    activeChapter: Int
  }

  type RemediationResult {
    applied: Boolean!
    alreadyApplied: Boolean!
    reason: String
    hiddenQuestTokens: [String!]
  }

  type ChapterAnswerResult {
    correct: Boolean!
    cleared: Boolean!
    clearBlockedReason: String
  }

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

  type AnalysisResult {
    risk: RiskLevel!
    summary: String!
  }

  enum RiskLevel {
    low
    medium
    high
  }

  type Query {
    user(id: ID!): User

    usersByCompany: [User!]!

    applications(applicantId: ID): [Application!]!
    application(id: ID!): Application
    applicationsCount(status: ApplicationStatus): Int!
    
    approvals: [Approval!]!
    approval(id: ID!): Approval
    approvalsByApplication(applicationId: ID!): [Approval!]!
    
    notificationHistory(recipientId: String!): [Notification!]!
    
    analyzeApplication(applicationId: ID!): AnalysisResult!

    cities: [City!]!
    estimateTravelCost(input: EstimateTravelCostInput!): EstimateTravelCostResponse!

    chapterDiagnosisOptions(chapter: Int!, locale: String): [String!]!

    clearedChapters: [Int!]!

    # game-masterの状態(仮想日付・クリア済みの章)の署名付きスナップショット。business-trip/
    # promotionの申請作成やランブックの暫定対応の前に、ブラウザが取得して添えるためのもの。
    gameStateSnapshot: String

    chapterMissions(locale: String): [ChapterMission!]!

    chapterChallengeStatus: ChapterChallengeStatus!

    nPlusOneQuizOptions(locale: String): NPlusOneQuizOptions!

    rageClickQuizOptions(locale: String): RageClickQuizOptions!

    transaction360QuizOptions(locale: String): Transaction360QuizOptions!
  }

  type Mutation {
    login(input: LoginInput!): LoginResponse!

    updateUserManager(id: ID!, input: UpdateUserManagerInput!): User!

    createApplication(input: CreateApplicationInput!): Application!
    
    updateApproval(id: ID!, input: UpdateApprovalInput!): Approval!
    
    startWorkflow(input: StartWorkflowInput!): StartWorkflowResponse!
    validateApproval(input: ValidateApprovalInput!): ValidateApprovalResponse!
    approveWorkflow(input: ApproveWorkflowInput!): ApproveWorkflowResponse!
    
    sendNotification(input: SendNotificationInput!): SendNotificationResponse!
    
    generateApplicationSuggestion(prompt: String!): String!
    askChat(question: String!): String!

    checkChapterAnswer(chapter: Int!, selectedText: String!): ChapterAnswerResult!

    startChapterChallenge(chapter: Int!): StartChapterChallengeResult!

    clearHiddenQuest(token: String!): Boolean!

    # 承認完了で仮想時間を進める。ブラウザがupdateApprovalの結果から受け取った
    # gameProgressTokenをここで届ける(承認のリクエストとは別にする)。
    applyGameProgress(token: String!): Boolean!

    applyApprovedListRemediation(gameStateToken: String): RemediationResult!

    checkNPlusOneQuizAnswers(input: NPlusOneQuizAnswersInput!): NPlusOneQuizResult!

    checkRageClickQuizAnswers(input: RageClickQuizAnswersInput!): RageClickQuizResult!

    checkTransaction360QuizAnswers(input: Transaction360QuizAnswersInput!): Transaction360QuizResult!

    recordChapterMistake(chapter: Int!): Boolean!
  }
`;


