import jwt from 'jsonwebtoken';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type VerifyResult =
  | { ok: true; email: string }
  | { ok: false; reason: 'missing_public_key' | 'missing_token' | 'invalid_token' | 'missing_email_claim' };

function getPublicKey(): string | undefined {
  return process.env.RAGE_CLICK_JWT_PUBLIC_KEY;
}

export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

export function verifyRageClickJwt(authHeader: string | null): VerifyResult {
  const publicKey = getPublicKey();
  if (!publicKey) {
    console.error('[rage-click] RAGE_CLICK_JWT_PUBLIC_KEY が設定されていません');
    return { ok: false, reason: 'missing_public_key' };
  }

  const token = extractBearerToken(authHeader);
  if (!token) {
    return { ok: false, reason: 'missing_token' };
  }

  let decoded: unknown;
  try {
    decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
  } catch (error) {
    console.warn('[rage-click] JWT検証に失敗しました:', error instanceof Error ? error.message : error);
    return { ok: false, reason: 'invalid_token' };
  }

  const email = (decoded as Record<string, unknown> | null)?.email;
  if (typeof email !== 'string' || !EMAIL_PATTERN.test(email)) {
    return { ok: false, reason: 'missing_email_claim' };
  }

  return { ok: true, email };
}
