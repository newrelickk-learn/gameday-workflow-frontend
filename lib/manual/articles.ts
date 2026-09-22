export interface ManualArticle {
  slug: string;
  title: string;
  description: string;
  /** 英語表示のときに使う文言。未設定なら日本語のまま表示する。 */
  titleEn: string;
  descriptionEn: string;
}

export const manualArticles: ManualArticle[] = [
  {
    slug: 'expense-application',
    title: '経費申請の書き方',
    description: '日常的な業務に必要な費用を申請するための手続きを説明します。',
    titleEn: 'How to submit an expense application',
    descriptionEn: "How to claim the costs you need for day-to-day work.",
  },
  {
    slug: 'business-trip-domestic',
    title: '国内出張申請の書き方',
    description: '国内出張にかかる旅費・宿泊費等の申請手続きと、概算出張費の自動算出について説明します。',
    titleEn: 'How to submit a domestic business trip application',
    descriptionEn: "How to claim travel and accommodation costs for domestic trips, and how the travel cost estimate works.",
  },
  {
    slug: 'business-trip-overseas',
    title: '海外出張申請の書き方',
    description: '海外出張にかかる旅費・宿泊費等の申請手続きを説明します。',
    titleEn: 'How to submit an overseas business trip application',
    descriptionEn: "How to claim travel and accommodation costs for overseas trips.",
  },
  {
    slug: 'expense-settlement',
    title: '経費精算の書き方',
    description: '出張・業務で発生した費用の精算手続きと、金額による承認フローの違いを説明します。',
    titleEn: 'How to submit an expense settlement',
    descriptionEn: "How to settle costs from trips and work, and how the approval flow changes with the amount.",
  },
  {
    slug: 'promotion-application',
    title: 'プロモーション申請の書き方',
    description: '上長がメンバーの昇進を申請する際の手続きと、説明欄の書式を説明します。',
    titleEn: 'How to submit a promotion application',
    descriptionEn: "How a manager applies for a member's promotion, and the required format of the description.",
  },
  {
    slug: 'approval-flow-overview',
    title: '承認フロー全体の概要',
    description: '各種申請の承認フローの全体像と、ステータスの見方を紹介します。',
    titleEn: 'Overview of the approval flow',
    descriptionEn: "The overall picture of the approval flows and how to read the status.",
  },
  {
    slug: 'company-benefits',
    title: '福利厚生案内',
    description: '社員が利用できる福利厚生制度を紹介します。',
    titleEn: 'Employee benefits',
    descriptionEn: "The benefits available to employees.",
  },
  {
    slug: 'faq',
    title: 'よくある質問',
    description: '申請・承認業務に関するよくある質問をまとめています。',
    titleEn: 'Frequently asked questions',
    descriptionEn: "Common questions about applications and approvals.",
  },
];

export function getManualArticle(slug: string): ManualArticle | undefined {
  return manualArticles.find((article) => article.slug === slug);
}

/** 表示言語に応じた記事のタイトル・説明。 */
export function localizedArticle(article: ManualArticle, locale: string) {
  return locale === 'en'
    ? { title: article.titleEn, description: article.descriptionEn }
    : { title: article.title, description: article.description };
}
