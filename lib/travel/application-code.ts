import { generateResolutionCode, isResolutionCodePresent } from './resolution-code';

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
