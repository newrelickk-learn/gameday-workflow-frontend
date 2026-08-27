import crypto from 'crypto';

const CODE_LENGTH = 6;
const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const PREFIX = 'FIXROUTE';

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
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
