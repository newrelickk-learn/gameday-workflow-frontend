'use client';

import { useEffect, useState } from 'react';

interface RageClickStatusResponse {
  ok: boolean;
  verifiedAt: number | null;
}

interface UseRageClickStatusOptions {
  intervalMs?: number;
  enabled?: boolean;
}

export function useRageClickStatus(email: string | null, options: UseRageClickStatusOptions = {}) {
  const { intervalMs = 5000, enabled = true } = options;
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email || !enabled || ok) {
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/rage-click/status?email=${encodeURIComponent(email)}`);
        if (!response.ok) {
          return;
        }
        const data: RageClickStatusResponse = await response.json();
        if (!cancelled && data.ok) {
          setOk(true);
        }
      } catch {
        // 一時的な失敗は無視し、次のポーリングに任せる
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    poll();
    const timer = setInterval(poll, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [email, enabled, intervalMs, ok]);

  return { ok, loading };
}
