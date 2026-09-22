/**
 * 画面文言の辞書。
 *
 * 英語で演習を受けられるようにするため、画面の文言はここに集約する。
 * URLは言語で分けず(既存リンクやランブックのURLを壊さないため)、ヘッダーのトグルで
 * 即時に切り替える方式にしている。選択はlocalStorageに保存する。
 */

export type Locale = 'ja' | 'en';

export const LOCALES: Locale[] = ['ja', 'en'];

const ja = {
  common: {
    appTitle: 'ワークフローGameday',
    today: '今の日付',
    logout: 'ログアウト',
    back: '戻る',
    close: '閉じる',
    cancel: 'キャンセル',
    submit: '申請する',
    detail: '詳細を見る',
    loading: '読み込み中...',
    language: '言語',
    japanese: '日本語',
    english: 'English',
  },
  login: {
    title: 'ログイン',
    email: 'メールアドレス',
    password: 'パスワード',
    submit: 'ログイン',
    impactedPod: '問題のあるPod名',
    impactedPodHelper:
      'ログインはgameday-workflow-userサービスで行っています。APMのSummary画面の下の方にInfrastructureの情報があるので確認してください。\'pod: \'の後の文字列をコピペしましょう',
    failed: 'ログインに失敗しました',
    podSaturated:
      '現在サーバーが高負荷のためログインできません。New Relicで継続的にCPU % が50以上となっているPodを確認し、Pod名を入力してください',
    stubMode: 'スタブモード: 任意のメールアドレスとパスワードでログインできます',
    welcome: 'ワークフロー管理システムへようこそ',
  },
  dashboard: {
    applications: '申請一覧',
    applicationsDescription: '自分が提出した申請の一覧を確認できます',
    approvals: '承認待ち',
    approvalsDescription: '自分の承認が必要な申請を確認できます',
    companyApplications: '申請書一覧',
    companyApplicationsDescription: '会社全体の申請を確認できます',
    approved: '承認済み一覧',
    approvedDescription: '承認が完了した申請を確認できます',
    statistics: '統計',
    statisticsDescription: '申請の統計情報を確認できます',
    manual: 'マニュアル',
    manualDescription: '申請の書き方を確認できます',
    notifications: '通知一覧',
    notificationsDescription: '自分宛の通知を確認できます',
    hr: '人事部',
    hrDescription: '自社ユーザーの直属の上長を編集',
    heading: 'ダッシュボード',
    totalApplications: '総申請数',
    pendingApprovals: '承認待ちの申請',
    companyApproved: '自社の承認済みの申請',
    manualDetail: '各種申請の書き方や承認フローの説明',
    loadFailed: 'データの取得に失敗しました',
  },
  missions: {
    heading: 'ミッション',
    hiddenHeading: '裏ミッション',
    intro:
      'パネルをクリックすると、そのミッションに挑戦できます。挑戦できるのは同時に1つだけで、クリアするまで他のミッションには移れません。',
    sealed: 'ミッション{n}\nに挑戦',
    sealedSide: 'ミッションに挑戦',
    cleared: 'Cleared!!',
    challenging: '挑戦中',
    challengers: '{n}チームが挑戦中',
    dialogTitleSealed: 'このミッションに挑戦しますか？',
    dialogSealedBody:
      'ミッションの内容は、挑戦を開始すると表示されます。挑戦できるのは同時に1つだけで、クリアするまで他のミッションには移れません。',
    challengingNotice: 'このミッションに挑戦中です。クリアすると次のミッションを選べるようになります。',
    startButton: 'このミッションに挑戦する',
    startFailed: '挑戦を開始できませんでした。',
    startFailedRetry: '挑戦を開始できませんでした。時間をおいて試してください。',
    reasonAnotherActive: '挑戦中のミッションをクリアするまで、他のミッションには挑戦できません。',
    reasonLocked: 'このミッションはまだ開放されていません。',
    reasonAlreadyCleared: 'このミッションはすでにクリア済みです。',
    reasonNotChallengeable: 'このミッションは挑戦の対象外です。',
    reasonUnknownCompany: 'チームの情報が取得できませんでした。ログインし直してください。',
  },
  diagnosis: {
    title: '原因を診断する',
    description: 'New Relicで調査した内容を元に、原因だと思う選択肢を選ぶか、直接入力してください。',
    placeholder: '原因を選択、または入力',
    check: '判定する',
    correct: '正解です！原因を特定できました。',
    incorrect: '不正解でした。もう一度New Relicで調査し、選び直してください。',
    notChallenging:
      'このミッションにはまだ挑戦していないため、クリアとして記録されていません。ダッシュボードでこのミッションのパネルを開いてから、もう一度回答してください。',
    optionsFailed: '選択肢の取得に失敗しました',
    checkFailed: '判定に失敗しました',
  },
  runbook: {
    title: '暫定対応: 承認済み一覧の表示遅延',
    description:
      '一覧取得の読み込み方法を切り替えます。適用はアクセスした方が所属する会社にのみ行われ、他社には影響しません。適用状態は当日限りで、日次のメンテナンスでリセットされます。',
    applying: '適用しています…',
    applied:
      '暫定対応を適用しました。次回以降の承認済み一覧の取得からデータベース呼び出し回数が減ります。New Relicで適用前後の値を比較して、効果を確認してください。',
    already: 'この会社にはすでに暫定対応が適用されています。',
    blocked:
      '原因の切り分けが完了していないため、暫定対応は適用できません。先にランブックの「原因の切り分け」を完了してから、もう一度このページにアクセスしてください。',
    unauthenticated:
      '適用先の会社を特定できないため、ログインが必要です。ログインしてからもう一度アクセスしてください。',
    error: '暫定対応を適用できませんでした。時間をおいて、もう一度お試しください。',
    toLogin: 'ログイン画面へ',
    toDashboard: 'ダッシュボードへ',
    retry: 'もう一度試す',
  },
};

export type Messages = typeof ja;

const en: Messages = {
  common: {
    appTitle: 'Workflow GameDay',
    today: 'Current date',
    logout: 'Log out',
    back: 'Back',
    close: 'Close',
    cancel: 'Cancel',
    submit: 'Submit',
    detail: 'View details',
    loading: 'Loading...',
    language: 'Language',
    japanese: '日本語',
    english: 'English',
  },
  login: {
    title: 'Log in',
    email: 'Email address',
    password: 'Password',
    submit: 'Log in',
    impactedPod: 'Name of the affected pod',
    impactedPodHelper:
      'Logins are handled by the gameday-workflow-user service. Open its APM Summary page and scroll down to the Infrastructure section, then copy the string after \'pod: \'.',
    failed: 'Login failed',
    podSaturated:
      'The server is under heavy load and cannot sign you in. In New Relic, find the pod whose CPU % stays above 50, then enter that pod name.',
    stubMode: 'Stub mode: you can log in with any email address and password',
    welcome: 'Welcome to the workflow management system',
  },
  dashboard: {
    applications: 'My applications',
    applicationsDescription: 'Review the applications you have submitted',
    approvals: 'Pending approvals',
    approvalsDescription: 'Review the applications waiting for your approval',
    companyApplications: 'All applications',
    companyApplicationsDescription: 'Review applications across the company',
    approved: 'Approved applications',
    approvedDescription: 'Review applications that have been approved',
    statistics: 'Statistics',
    statisticsDescription: 'Review statistics about applications',
    manual: 'Manual',
    manualDescription: 'Read how to fill in each application',
    notifications: 'Notifications',
    notificationsDescription: 'Review notifications addressed to you',
    hr: 'HR',
    hrDescription: 'Edit the direct manager of users in your company',
    heading: 'Dashboard',
    totalApplications: 'Total applications',
    pendingApprovals: 'Applications awaiting approval',
    companyApproved: 'Approved applications in your company',
    manualDetail: 'How to fill in each application and how approvals flow',
    loadFailed: 'Failed to load the data',
  },
  missions: {
    heading: 'Missions',
    hiddenHeading: 'Hidden missions',
    intro:
      'Click a panel to take on that mission. You can work on only one mission at a time, and you cannot switch until you clear it.',
    sealed: 'Take on\nmission {n}',
    sealedSide: 'Take on mission',
    cleared: 'Cleared!!',
    challenging: 'In progress',
    challengers: '{n} team(s) working on it',
    dialogTitleSealed: 'Take on this mission?',
    dialogSealedBody:
      'The mission details are revealed once you start. You can work on only one mission at a time, and you cannot switch until you clear it.',
    challengingNotice:
      'You are working on this mission. Once you clear it, you can pick the next one.',
    startButton: 'Take on this mission',
    startFailed: 'Could not start the mission.',
    startFailedRetry: 'Could not start the mission. Please try again in a moment.',
    reasonAnotherActive: 'Clear the mission you are working on before taking on another one.',
    reasonLocked: 'This mission is not unlocked yet.',
    reasonAlreadyCleared: 'You have already cleared this mission.',
    reasonNotChallengeable: 'This mission cannot be taken on directly.',
    reasonUnknownCompany: 'Could not identify your team. Please log in again.',
  },
  diagnosis: {
    title: 'Diagnose the cause',
    description:
      'Based on what you found in New Relic, pick the cause from the list or type it in directly.',
    placeholder: 'Select or type the cause',
    check: 'Check',
    correct: 'Correct! You identified the cause.',
    incorrect: 'Not quite. Investigate in New Relic once more and pick again.',
    notChallenging:
      'You have not taken on this mission yet, so the clear was not recorded. Open this mission from the dashboard and answer again.',
    optionsFailed: 'Failed to load the options',
    checkFailed: 'Failed to check the answer',
  },
  runbook: {
    title: 'Workaround: slow approved application list',
    description:
      'This switches how the list loads related data. It applies only to the company you belong to and does not affect other companies. It lasts for the day and is reset by the daily maintenance.',
    applying: 'Applying...',
    applied:
      'The workaround has been applied. From the next request onward, the approved list makes far fewer database calls. Compare the numbers before and after in New Relic to confirm the effect.',
    already: 'The workaround has already been applied for this company.',
    blocked:
      'The workaround cannot be applied because the investigation is not complete. Finish the "Isolating the cause" section of the runbook first, then open this page again.',
    unauthenticated:
      'You need to log in so we can identify your company. Please log in and open this page again.',
    error: 'Could not apply the workaround. Please try again in a moment.',
    toLogin: 'Go to the login page',
    toDashboard: 'Go to the dashboard',
    retry: 'Try again',
  },
};

export const messages: Record<Locale, Messages> = { ja, en };
