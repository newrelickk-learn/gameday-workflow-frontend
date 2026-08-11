'use client';

import { useEffect, useState } from 'react';
import { AppBar, Toolbar, Typography } from '@mui/material';
import { getVirtualToday } from '@/lib/utils/virtual-date';

function formatMonthDay(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
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
      {children}
    </>
  );
}
