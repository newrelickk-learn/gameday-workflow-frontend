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
  Chip,
  Alert,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import GroupsIcon from '@mui/icons-material/Groups';
import { apiClient } from '@/lib/api/client';
import type { ChapterMission, ChapterChallengeStatus } from '@/lib/api/types';

/** 挑戦を開始できなかった理由を、参加者向けの文言に変換する。 */
const START_FAILURE_MESSAGES: Record<string, string> = {
  another_active: '挑戦中のクエストをクリアするまで、他のクエストには挑戦できません。',
  locked: 'このクエストはまだ開放されていません。',
  already_cleared: 'このクエストはすでにクリア済みです。',
  not_challengeable: 'このクエストは挑戦の対象外です。',
  unknown_company: 'チームの情報が取得できませんでした。ログインし直してください。',
};

const CHALLENGE_STATUS_POLL_INTERVAL_MS = 15000;

export default function ChapterMissionPanels() {
  const [missions, setMissions] = useState<ChapterMission[]>([]);
  const [status, setStatus] = useState<ChapterChallengeStatus>({ counts: [], activeChapter: null });
  const [selected, setSelected] = useState<ChapterMission | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState('');

  const refresh = useCallback(() => {
    Promise.all([
      apiClient.chapters.getChapterMissions(),
      apiClient.chapters.getChallengeStatus(),
    ])
      .then(([missionsData, statusData]) => {
        setMissions(missionsData);
        setStatus(statusData);
      })
      .catch(() => {
        setMissions([]);
        setStatus({ counts: [], activeChapter: null });
      });
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener('gameday:chapterCleared', refresh);
    // 他チームの挑戦状況は自分の操作では変わらないため、定期的に取り直す。
    const timer = setInterval(refresh, CHALLENGE_STATUS_POLL_INTERVAL_MS);
    return () => {
      window.removeEventListener('gameday:chapterCleared', refresh);
      clearInterval(timer);
    };
  }, [refresh]);

  if (missions.length === 0) {
    return null;
  }

  const sortedMissions = [...missions].sort((a, b) => a.chapter - b.chapter);
  const mainMissions = sortedMissions.filter((mission) => mission.kind !== 'hidden');
  const lastMainChapter = mainMissions.length > 0 ? mainMissions[mainMissions.length - 1].chapter : null;
  const activeChapter = status.activeChapter ?? null;

  const challengerCount = (chapter: number) =>
    status.counts.find((count) => count.chapter === chapter)?.teams ?? 0;

  const handleStartChallenge = async (mission: ChapterMission) => {
    try {
      setStarting(true);
      setStartError('');
      const result = await apiClient.chapters.startChallenge(mission.chapter);
      if (result.started) {
        // 挑戦を開始すると内容が開示されるので、取り直してそのままダイアログに出す。
        const [missionsData, statusData] = await Promise.all([
          apiClient.chapters.getChapterMissions(),
          apiClient.chapters.getChallengeStatus(),
        ]);
        setMissions(missionsData);
        setStatus(statusData);
        setSelected(missionsData.find((m) => m.chapter === mission.chapter) ?? null);
        return;
      }
      setStartError(START_FAILURE_MESSAGES[result.reason] ?? '挑戦を開始できませんでした。');
      refresh();
    } catch {
      setStartError('挑戦を開始できませんでした。時間をおいて試してください。');
    } finally {
      setStarting(false);
    }
  };

  const closeDialog = () => {
    setSelected(null);
    setStartError('');
  };

  return (
    <Box sx={{ mt: 5 }}>
      <Typography variant="h6" component="h2" fontWeight="bold" gutterBottom>
        ミッション
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        パネルをクリックすると、そのクエストに挑戦できます。挑戦できるのは同時に1つだけで、クリアするまで他のクエストには移れません。
      </Typography>
      <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
        {sortedMissions.map((mission) => {
          const isHidden = mission.kind === 'hidden';
          const isCleared = mission.cleared;
          const isLastMain = mission.chapter === lastMainChapter;
          const isActive = mission.chapter === activeChapter;
          // 裏クエストはクリアするまで伏せたまま。メインは開放済み・クリア済み・最後の1枚が表向き。
          const isVisible = isHidden ? isCleared : isCleared || mission.unlocked || isLastMain;
          const isClickable = !isHidden && isVisible && !isCleared;
          // 未開封のクエストは内容が伏せられている(タイトルはサーバー側でnullになる)。
          const isSealed = !isHidden && !mission.revealed;
          const teams = mission.challengeable ? challengerCount(mission.chapter) : 0;

          return (
            <Box
              key={mission.chapter}
              sx={{ width: 168, height: isCleared ? 160 : 140, perspective: 900 }}
            >
              <Box
                onClick={() => {
                  if (isClickable) {
                    setStartError('');
                    setSelected(mission);
                  }
                }}
                sx={{
                  width: '100%',
                  height: '100%',
                  position: 'relative',
                  transformStyle: 'preserve-3d',
                  transition: 'transform 0.7s',
                  transform: isVisible ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  cursor: isClickable ? 'pointer' : 'default',
                }}
              >
                <Card
                  variant="outlined"
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    backfaceVisibility: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                    bgcolor: 'grey.100',
                  }}
                >
                  {isHidden ? (
                    <Typography variant="h4" color="text.disabled" fontWeight="bold">
                      ？
                    </Typography>
                  ) : (
                    <LockIcon color="disabled" />
                  )}
                </Card>
                <Card
                  variant="outlined"
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    opacity: !isCleared && !mission.unlocked ? 0.55 : 1,
                    bgcolor: isCleared ? 'success.light' : 'background.paper',
                    borderColor: isActive ? 'primary.main' : undefined,
                    borderWidth: isActive ? 2 : undefined,
                  }}
                >
                  <CardContent
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: 1,
                      p: 1.5,
                      '&:last-child': { pb: 1.5 },
                    }}
                  >
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      color={isSealed ? 'text.secondary' : 'text.primary'}
                    >
                      {mission.title ?? (isSealed ? 'どのクエストかは挑戦すると分かります' : '？')}
                    </Typography>
                    {(isCleared || isActive) && (
                      <Chip
                        size="small"
                        label={isCleared ? 'Cleared!!' : '挑戦中'}
                        sx={{
                          alignSelf: 'flex-start',
                          fontWeight: 'bold',
                          ...(isCleared
                            ? { bgcolor: 'success.main', color: 'success.contrastText' }
                            : { bgcolor: 'primary.main', color: 'primary.contrastText' }),
                        }}
                      />
                    )}
                    {isCleared && mission.clearKeyword && (
                      <Typography
                        variant="caption"
                        fontWeight="bold"
                        sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
                      >
                        合言葉: {mission.clearKeyword}
                      </Typography>
                    )}
                    {!isCleared && mission.challengeable && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <GroupsIcon fontSize="small" color="action" />
                        <Typography variant="caption" color="text.secondary">
                          {teams}チームが挑戦中
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Box>
            </Box>
          );
        })}
      </Stack>

      <Dialog open={!!selected} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{selected?.title ?? 'このクエストに挑戦しますか？'}</DialogTitle>
        <DialogContent>
          {selected && !selected.revealed ? (
            <Typography color="text.secondary">
              クエストの内容は、挑戦を開始すると表示されます。
              挑戦できるのは同時に1つだけで、クリアするまで他のクエストには移れません。
            </Typography>
          ) : (
            <Typography>{selected?.description}</Typography>
          )}
          {selected?.challengeable && selected.chapter === activeChapter && (
            <Alert severity="info" sx={{ mt: 2 }}>
              このクエストに挑戦中です。クリアすると次のクエストを選べるようになります。
            </Alert>
          )}
          {selected?.challengeable &&
            activeChapter !== null &&
            selected.chapter !== activeChapter && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                {START_FAILURE_MESSAGES.another_active}
              </Alert>
            )}
          {startError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {startError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>閉じる</Button>
          {selected?.challengeable && selected.chapter !== activeChapter && (
            <Button
              variant="contained"
              disabled={starting || activeChapter !== null || !selected.unlocked}
              onClick={() => handleStartChallenge(selected)}
            >
              このクエストに挑戦する
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
