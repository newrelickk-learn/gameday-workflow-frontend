import { NextRequest, NextResponse } from 'next/server';
import { rageClickStore } from '@/lib/rage-click/store';

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');
  if (!email) {
    return NextResponse.json({ ok: false, error: 'missing_email' }, { status: 400 });
  }

  const entry = rageClickStore.get(email);
  return NextResponse.json({ ok: !!entry, verifiedAt: entry?.verifiedAt ?? null });
}
