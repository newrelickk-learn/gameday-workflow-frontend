import crypto from 'crypto';

/**
 * 出張申請のtravelサービス不安定時に使う「問題解消コード」。
 * 実際の当日日付＋companyIdをシードにした半固定ランダム文字列で、
 * 日ごと・企業ごとに変わる（他社に聞いても翌日には使えない）。
 * 参加者はNew Relicのトレースに付与されたカスタムアトリビュート
 * （travel.resolutionCode）からこの値を見つけ、説明欄に含めて再送信する。
 */
const CODE_LENGTH = 6;
const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const PREFIX = 'FIXROUTE';

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

export function generateResolutionCode(date: Date, companyId: number | string): string {
  const seed = `${dateKey(date)}:${companyId}`;
  const hash = crypto.createHash('sha256').update(seed).digest();

  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[hash[i] % ALPHABET.length];
  }
  return `${PREFIX}-${code}`;
}

export function isResolutionCodePresent(description: string, code: string): boolean {
  return description.includes(code);
}
