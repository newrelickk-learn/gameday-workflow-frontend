import type { Messages } from './messages';

/**
 * 申請タイプ・ステータス・ロールの表示名。
 *
 * 各画面で同じswitch文が重複していたため、言語対応にあわせてここへ集約した。
 */

export function applicationTypeLabel(t: Messages, type: string): string {
  switch (type) {
    case 'business-trip':
      return t.applications.typeBusinessTrip;
    case 'expense':
      return t.applications.typeExpense;
    case 'vacation':
      return t.applications.typeVacation;
    case 'promotion':
      return t.applications.typePromotion;
    default:
      return type;
  }
}

export function applicationStatusLabel(t: Messages, status: string): string {
  switch (status) {
    case 'approved':
      return t.status.approved;
    case 'rejected':
      return t.status.rejected;
    case 'pending':
      return t.status.pending;
    default:
      return status;
  }
}

export function userRoleLabel(t: Messages, role: string): string {
  switch (role) {
    case 'director':
      return t.roles.director;
    case 'accounting':
      return t.roles.accounting;
    case 'manager':
      return t.roles.manager;
    case 'engineer':
      return t.roles.engineer;
    case 'hr':
      return t.roles.hr;
    default:
      return role;
  }
}

export function notificationTypeLabel(t: Messages, type: string): string {
  switch (type) {
    case 'ApprovalRequest':
      return t.lists.notificationApprovalRequest;
    case 'ApprovalCompleted':
    case 'WorkflowCompleted':
      return t.lists.notificationApproved;
    case 'ApprovalRejected':
      return t.lists.notificationRejected;
    case 'ApplicationSubmitted':
      return t.lists.notificationSubmitted;
    default:
      return type;
  }
}

/** 表示言語に応じた都市名。英語名が未設定なら日本語名を返す。 */
export function cityName(city: { nameJa: string; nameEn?: string | null }, locale: string): string {
  return locale === 'en' && city.nameEn ? city.nameEn : city.nameJa;
}
