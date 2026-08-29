'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import { apiClient } from '@/lib/api/client';
import type { ChapterMission } from '@/lib/api/types';

export default function ChapterMissionPanels() {
  const [missions, setMissions] = useState<ChapterMission[]>([]);
  const [clearedChapters, setClearedChapters] = useState<number[]>([]);
  const [selected, setSelected] = useState<ChapterMission | null>(null);

  const refresh = useCallback(() => {
    Promise.all([
      apiClient.chapters.getChapterMissions(),
      apiClient.chapters.getClearedChapters(),
    ])
      .then(([missionsData, clearedData]) => {
        setMissions(missionsData);
        setClearedChapters(clearedData);
      })
      .catch(() => {
        setMissions([]);
        setClearedChapters([]);
      });
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener('gameday:chapterCleared', refresh);
    return () => window.removeEventListener('gameday:chapterCleared', refresh);
  }, [refresh]);

  if (missions.length === 0) {
    return null;
  }

  const sortedMissions = [...missions].sort((a, b) => a.chapter - b.chapter);
  const lastChapter = sortedMissions[sortedMissions.length - 1].chapter;
  const otherChapters = sortedMissions
    .filter((mission) => mission.chapter !== lastChapter)
    .map((mission) => mission.chapter);
  const allOthersCleared = otherChapters.every((chapter) => clearedChapters.includes(chapter));

  return (
    <Box sx={{ mt: 5 }}>
      <Typography variant="h6" component="h2" fontWeight="bold" gutterBottom>
        ミッション
      </Typography>
      <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
        {sortedMissions.map((mission) => {
          const isLast = mission.chapter === lastChapter;
          const isCleared = clearedChapters.includes(mission.chapter);
          const isVisible = isCleared || isLast;
          const isDisabled = isLast ? !allOthersCleared : !isCleared;

          return (
            <Box key={mission.chapter} sx={{ width: 168, height: 120, perspective: 900 }}>
              <Box
                onClick={() => {
                  if (!isDisabled) setSelected(mission);
                }}
                sx={{
                  width: '100%',
                  height: '100%',
                  position: 'relative',
                  transformStyle: 'preserve-3d',
                  transition: 'transform 0.7s',
                  transform: isVisible ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  cursor: isDisabled ? 'default' : 'pointer',
                }}
              >
                <Card
                  variant="outlined"
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    backfaceVisibility: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'grey.100',
                  }}
                >
                  <LockIcon color="disabled" />
                </Card>
                <Card
                  variant="outlined"
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    opacity: isDisabled ? 0.55 : 1,
                    bgcolor: isCleared ? 'success.light' : 'background.paper',
                  }}
                >
                  <CardContent sx={{ height: '100%', display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body2" fontWeight="bold">
                      {mission.title}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            </Box>
          );
        })}
      </Stack>

      <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{selected?.title}</DialogTitle>
        <DialogContent>
          <Typography>{selected?.description}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelected(null)}>閉じる</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
