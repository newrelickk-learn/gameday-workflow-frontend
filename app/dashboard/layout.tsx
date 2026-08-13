'use client';

import { Suspense, useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { AppBar, Toolbar, Typography, Box, CircularProgress } from '@mui/material';
import { getVirtualToday } from '@/lib/utils/virtual-date';
import { getCurrentUserId } from '@/lib/utils/auth';

function formatMonthDay(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId) {
      const query = searchParams.toString();
      const currentUrl = query ? `${pathname}?${query}` : pathname;
      // ログイン後に元々アクセスしようとしていたページへ戻れるようにする。
      // SPAのルート変更ではなくフルページロードで/loginへ遷移する。
      window.location.href = `/login?redirect=${encodeURIComponent(currentUrl)}`;
      return;
    }
    setAuthChecked(true);
  }, [pathname, searchParams]);

  if (!authChecked) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return <>{children}</>;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [virtualDateLabel, setVirtualDateLabel] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getVirtualToday()
      .then((date) => {
        if (mounted) setVirtualDateLabel(formatMonthDay(date));
      })
      .catch(() => {
        if (mounted) setVirtualDateLabel(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Typography variant="h6" component="div" fontWeight="bold">
            ワークフローGameday
          </Typography>
          {virtualDateLabel && (
            <Typography variant="body1" color="text.secondary">
              今の日付：{virtualDateLabel}
            </Typography>
          )}
        </Toolbar>
      </AppBar>
      <Suspense fallback={null}>
        <AuthGuard>{children}</AuthGuard>
      </Suspense>
    </>
  );
}
