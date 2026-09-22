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
import { useT, format } from '@/lib/i18n/LocaleProvider';
import type { Messages } from '@/lib/i18n/messages';

/** 挑戦を開始できなかった理由を、参加者向けの文言に変換する。 */
const startFailureMessage = (t: Messages, reason: string): string =>
  ({
    another_active: t.missions.reasonAnotherActive,
    locked: t.missions.reasonLocked,
    already_cleared: t.missions.reasonAlreadyCleared,
    not_challengeable: t.missions.reasonNotChallengeable,
    unknown_company: t.missions.reasonUnknownCompany,
  })[reason] ?? t.missions.startFailed;

const CHALLENGE_STATUS_POLL_INTERVAL_MS = 15000;

const PANEL_WIDTH = 168;
const PANEL_HEIGHT = 140;

export default function ChapterMissionPanels() {
  const t = useT();
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
  const hiddenMissions = sortedMissions.filter((mission) => mission.kind === 'hidden');
  // 順不同で挑戦する対象を中央にまとめ、その前後(ログイン・プロモーション)を両脇に置く。
  const challengeableMissions = mainMissions.filter((mission) => mission.challengeable);
  const sideMissions = mainMissions.filter((mission) => !mission.challengeable);
  const firstMission = sideMissions[0] ?? null;
  const lastMission = sideMissions.length > 1 ? sideMissions[sideMissions.length - 1] : null;
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
      setStartError(startFailureMessage(t, result.reason));
      refresh();
    } catch {
      setStartError(t.missions.startFailedRetry);
    } finally {
      setStarting(false);
    }
  };

  const closeDialog = () => {
    setSelected(null);
    setStartError('');
  };

  /**
   * パネル1枚を描く。sealedLabelは未開封のときに出す文言(「ミッション1に挑戦」など)。
   */
  const renderPanel = (mission: ChapterMission, sealedLabel: string) => {
    const isHidden = mission.kind === 'hidden';
    const isCleared = mission.cleared;
    const isActive = mission.chapter === activeChapter;
    const isLastMain = mission.chapter === lastMission?.chapter;
    // 裏ミッションはクリアするまで伏せたまま。メインは開放済み・クリア済み・最後の1枚が表向き。
    const isVisible = isHidden ? isCleared : isCleared || mission.unlocked || isLastMain;
    const isClickable = !isHidden && isVisible && !isCleared;
    // 未開封のミッションは内容が伏せられている(タイトルはサーバー側でnullになる)。
    const isSealed = !isHidden && !mission.revealed;
    const teams = mission.challengeable ? challengerCount(mission.chapter) : 0;

    return (
      <Box key={mission.chapter} sx={{ width: PANEL_WIDTH, height: PANEL_HEIGHT, perspective: 900 }}>
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
                // 未開封は「ミッションNに挑戦」を中央に、開封後は内容を上詰めにする。
                justifyContent: isSealed ? 'center' : 'space-between',
                alignItems: isSealed ? 'center' : 'stretch',
                textAlign: isSealed ? 'center' : 'left',
                gap: 1,
                p: 1.5,
                '&:last-child': { pb: 1.5 },
              }}
            >
              <Typography
                variant="body2"
                fontWeight="bold"
                color={isSealed ? 'text.secondary' : 'text.primary'}
                sx={{ whiteSpace: 'pre-line' }}
              >
                {mission.title ?? (isSealed ? sealedLabel : '？')}
              </Typography>
              {(isCleared || isActive) && (
                <Chip
                  size="small"
                  label={isCleared ? t.missions.cleared : t.missions.challenging}
                  sx={{
                    alignSelf: 'flex-start',
                    fontWeight: 'bold',
                    ...(isCleared
                      ? { bgcolor: 'success.main', color: 'success.contrastText' }
                      : { bgcolor: 'primary.main', color: 'primary.contrastText' }),
                  }}
                />
              )}
              {!isCleared && mission.challengeable && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <GroupsIcon fontSize="small" color="action" />
                  <Typography variant="caption" color="text.secondary">
                    {format(t.missions.challengers, { n: teams })}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ mt: 5 }}>
      <Typography variant="h6" component="h2" fontWeight="bold" gutterBottom>
        {t.missions.heading}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t.missions.intro}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
        {firstMission && renderPanel(firstMission, t.missions.sealedSide)}
        <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(2, ${PANEL_WIDTH}px)`, gap: 2 }}>
          {challengeableMissions.map((mission, index) =>
            renderPanel(mission, format(t.missions.sealed, { n: index + 1 }))
          )}
        </Box>
        {lastMission && renderPanel(lastMission, t.missions.sealedSide)}
      </Box>

      {hiddenMissions.length > 0 && (
        <>
          <Typography variant="h6" component="h2" fontWeight="bold" sx={{ mt: 5 }} gutterBottom>
            {t.missions.hiddenHeading}
          </Typography>
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
            {hiddenMissions.map((mission) => renderPanel(mission, '？'))}
          </Stack>
        </>
      )}

      <Dialog open={!!selected} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{selected?.title ?? t.missions.dialogTitleSealed}</DialogTitle>
        <DialogContent>
          {selected && !selected.revealed ? (
            <Typography color="text.secondary">{t.missions.dialogSealedBody}</Typography>
          ) : (
            <Typography>{selected?.description}</Typography>
          )}
          {selected?.challengeable && selected.chapter === activeChapter && (
            <Alert severity="info" sx={{ mt: 2 }}>
              {t.missions.challengingNotice}
            </Alert>
          )}
          {selected?.challengeable &&
            activeChapter !== null &&
            selected.chapter !== activeChapter && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                {t.missions.reasonAnotherActive}
              </Alert>
            )}
          {startError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {startError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>{t.common.close}</Button>
          {selected?.challengeable && selected.chapter !== activeChapter && (
            <Button
              variant="contained"
              disabled={starting || activeChapter !== null || !selected.unlocked}
              onClick={() => handleStartChallenge(selected)}
            >
              {t.missions.startButton}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
