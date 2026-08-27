'use client';

import { Suspense, useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { AppBar, Toolbar, Typography, Box, CircularProgress, Stack, Zoom } from '@mui/material';
import { getVirtualToday } from '@/lib/utils/virtual-date';
import { getCurrentUserId, getCurrentUser } from '@/lib/utils/auth';
import { apiClient } from '@/lib/api/client';
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
  const [clearedChapters, setClearedChapters] = useState<number[]>([]);
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
    const refreshClearedChapters = () => {
      apiClient.chapters
        .getClearedChapters()
        .then((cleared) => {
          if (mounted) setClearedChapters(cleared);
        })
        .catch(() => {
          if (mounted) setClearedChapters([]);
        });
    };
    refreshClearedChapters();

    window.addEventListener('gameday:chapterCleared', refreshClearedChapters);
    return () => {
      mounted = false;
      window.removeEventListener('gameday:chapterCleared', refreshClearedChapters);
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
            {clearedChapters.length > 0 && (
              <Stack direction="row" spacing={0.75}>
                {clearedChapters.map((chapter) => (
                  <Zoom key={chapter} in appear timeout={{ enter: 400 }} style={{ transitionDelay: '0ms' }}>
                    <Box
                      sx={{
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        bgcolor: 'success.main',
                      }}
                    />
                  </Zoom>
                ))}
              </Stack>
            )}
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
