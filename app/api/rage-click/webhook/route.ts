import { NextRequest, NextResponse } from 'next/server';
import { verifyRageClickJwt } from '@/lib/rage-click/jwt';
import { hasRecentRageClick } from '@/lib/rage-click/nerdgraph';
import { rageClickStore } from '@/lib/rage-click/store';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const verification = verifyRageClickJwt(authHeader);

  if (!verification.ok) {
    return NextResponse.json({ received: false, error: verification.reason }, { status: 401 });
  }

  const { email } = verification;
  const matched = await hasRecentRageClick(email);

  if (matched) {
    rageClickStore.markVerified(email);
  }

  return NextResponse.json({ received: true, email, matched });
}
