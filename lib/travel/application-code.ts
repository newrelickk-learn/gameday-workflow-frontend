import { generateResolutionCode, isResolutionCodePresent } from './resolution-code';

/**
 * travelサービス呼び出し時に付与するX-Application-Codeヘッダーの値を決定する。
 * 不安定な都市（北九州）が絡み、かつ説明欄に当日・自社の解消コードが
 * 含まれていない場合のみ、Istio側でfault injectionの対象になる"b"始まりの
 * コードを返す。それ以外は安定コード（"s"始まり）を返す。
 */
function randomApplicationNumber(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export interface BuildApplicationCodeParams {
  isUnstableRoute: boolean;
  description: string;
  companyId: number | string;
  now?: Date;
}

export interface ApplicationCodeResult {
  header: string;
  isRisky: boolean;
  resolutionCode: string;
}

export function buildApplicationCode(params: BuildApplicationCodeParams): ApplicationCodeResult {
  const { isUnstableRoute, description, companyId, now = new Date() } = params;
  const resolutionCode = generateResolutionCode(now, companyId);

  if (!isUnstableRoute || isResolutionCodePresent(description, resolutionCode)) {
    return { header: `s${randomApplicationNumber()}`, isRisky: false, resolutionCode };
  }

  return { header: `b${randomApplicationNumber()}`, isRisky: true, resolutionCode };
}
