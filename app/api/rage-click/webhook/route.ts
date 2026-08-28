import { NextRequest, NextResponse } from 'next/server';
import { verifyRageClickJwt } from '@/lib/rage-click/jwt';
import { hasRecentRageClick } from '@/lib/rage-click/nerdgraph';
import { rageClickStore } from '@/lib/rage-click/store';

export async function POST(request: NextRequest) {
  console.log('[rage-click][webhook] リクエスト受信');

  const authHeader = request.headers.get('authorization');
  const verification = verifyRageClickJwt(authHeader);

  if (!verification.ok) {
    console.warn('[rage-click][webhook] JWT検証NG:', verification.reason);
    return NextResponse.json({ received: false, error: verification.reason }, { status: 401 });
  }

  const { email } = verification;
  console.log('[rage-click][webhook] JWT検証OK email=', email);

  const matched = await hasRecentRageClick(email);
  console.log('[rage-click][webhook] NRQL照会結果 email=', email, 'matched=', matched);

  if (matched) {
    rageClickStore.markVerified(email);
    console.log('[rage-click][webhook] storeにverified状態を記録 email=', email);
  }

  return NextResponse.json({ received: true, email, matched });
}
