'use client';

import { Suspense, useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { AppBar, Toolbar, Typography, Box, CircularProgress, Chip, Stack } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { getVirtualToday } from '@/lib/utils/virtual-date';
import { getCurrentUserId } from '@/lib/utils/auth';
import { apiClient } from '@/lib/api/client';

// New Relic調査ドロップダウンによる章クリア判定が実装済みの章のみを表示する
// （第0章・第1章・第3章・第5章は別の仕組み（Pod飽和突破・上長設定・出張申請成功・
// 昇進申請成功）で完結するため、chapter_progressテーブルでの追跡対象外）。
const TRACKED_CHAPTERS = [2, 4];

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
  const [clearedChapters, setClearedChapters] = useState<number[]>([]);

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

    // ChapterDiagnosisDropdownで正解した直後に、ページ遷移なしでヘッダーの
    // 表示を最新化するためのイベントリスナー。
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
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Stack direction="row" spacing={1}>
              {TRACKED_CHAPTERS.map((chapter) => {
                const cleared = clearedChapters.includes(chapter);
                return (
                  <Chip
                    key={chapter}
                    size="small"
                    label={`第${chapter}章`}
                    color={cleared ? 'success' : 'default'}
                    variant={cleared ? 'filled' : 'outlined'}
                    icon={cleared ? <CheckCircleIcon /> : undefined}
                  />
                );
              })}
            </Stack>
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
