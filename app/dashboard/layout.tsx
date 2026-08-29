'use client';

import { Suspense, useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { AppBar, Toolbar, Typography, Box, CircularProgress } from '@mui/material';
import { getVirtualToday } from '@/lib/utils/virtual-date';
import { getCurrentUserId, getCurrentUser } from '@/lib/utils/auth';
import type { User } from '@/lib/api/types';

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
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

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
        <Toolbar sx={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h6" component="div" fontWeight="bold">
            ワークフローGameday
            {currentUser && (
              <Typography
                component="span"
                variant="body2"
                color="text.secondary"
                fontWeight="normal"
                sx={{ ml: 1.5 }}
              >
                (ID: {currentUser.id}) {currentUser.name}
              </Typography>
            )}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {virtualDateLabel && (
              <Typography variant="body1" color="text.secondary">
                今の日付：{virtualDateLabel}
              </Typography>
            )}
          </Box>
        </Toolbar>
      </AppBar>
      <Suspense fallback={null}>
        <AuthGuard>{children}</AuthGuard>
      </Suspense>
    </>
  );
}
