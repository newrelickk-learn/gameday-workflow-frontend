'use client';

import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import type { TeamProgressItem, TeamProgressResponse } from '@/lib/api/types';
import { teamNameFromSlot, getProgressColor, getProgressTextColor } from '@/lib/utils/team-progress';

const POLL_INTERVAL_MS = 5000;

export default function TeamProgressBoard() {
  const [teams, setTeams] = useState<TeamProgressItem[]>([]);
  const [totalChapters, setTotalChapters] = useState(0);

  useEffect(() => {
    let mounted = true;

    const fetchProgress = () => {
      fetch('/api/team-progress')
        .then((res) => res.json())
        .then((data: TeamProgressResponse) => {
          if (!mounted) return;
          setTeams(data.teams || []);
          setTotalChapters(data.totalChapters || 0);
        })
        .catch(() => {
          // ポーリング失敗時は直前の表示を維持する
        });
    };

    fetchProgress();
    const interval = setInterval(fetchProgress, POLL_INTERVAL_MS);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mb: 3 }}>
        <Typography variant="h3" component="h1" fontWeight="bold">
          チーム進捗ボード
        </Typography>
        <Typography variant="h6" color="text.secondary">
          全{totalChapters}チャプター中
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(10, 1fr)',
          gap: 1.5,
        }}
      >
        {teams.map((team) => {
          const ratio = totalChapters > 0 ? team.clearedChapters / totalChapters : 0;
          return (
            <Box
              key={team.companyId}
              sx={{
                aspectRatio: '1 / 1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 1,
                border: '1px solid #d0d0d0',
                bgcolor: getProgressColor(ratio),
                color: getProgressTextColor(ratio),
                transition: 'background-color 0.5s ease, color 0.5s ease',
              }}
            >
              <Typography variant="h6" fontWeight="bold">
                {teamNameFromSlot(Number(team.companyId))}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
