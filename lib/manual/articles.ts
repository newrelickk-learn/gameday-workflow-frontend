/**
 * マニュアル記事の一覧メタデータ
 * 本文は content/manual/{slug}.md に配置されている
 */
export interface ManualArticle {
  slug: string;
  title: string;
  description: string;
}

export const manualArticles: ManualArticle[] = [
  {
    slug: 'expense-application',
    title: '経費申請の書き方',
    description: '日常的な業務に必要な費用を申請するための手続きを説明します。',
  },
  {
    slug: 'business-trip-domestic',
    title: '国内出張申請の書き方',
    description: '国内出張にかかる旅費・宿泊費等の申請手続きと、概算出張費の自動算出について説明します。',
  },
  {
    slug: 'business-trip-overseas',
    title: '海外出張申請の書き方',
    description: '海外出張にかかる旅費・宿泊費等の申請手続きを説明します。',
  },
  {
    slug: 'expense-settlement',
    title: '経費精算の書き方',
    description: '出張・業務で発生した費用の精算手続きと、金額による承認フローの違いを説明します。',
  },
  {
    slug: 'promotion-application',
    title: 'プロモーション申請の書き方',
    description: '上長がメンバーの昇進を申請する際の手続きと、説明欄の書式を説明します。',
  },
  {
    slug: 'approval-flow-overview',
    title: '承認フロー全体の概要',
    description: '各種申請の承認フローの全体像と、ステータスの見方を紹介します。',
  },
  {
    slug: 'company-benefits',
    title: '福利厚生案内',
    description: '社員が利用できる福利厚生制度を紹介します。',
  },
  {
    slug: 'faq',
    title: 'よくある質問',
    description: '申請・承認業務に関するよくある質問をまとめています。',
  },
];

export function getManualArticle(slug: string): ManualArticle | undefined {
  return manualArticles.find((article) => article.slug === slug);
}
