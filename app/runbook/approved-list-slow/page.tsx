'use client';

/**
 * ランブック記載の暫定対応の適用ページ。
 *
 * New RelicのAIエージェントがアラートを調査すると、ナレッジに取り込んだランブック
 * (gameday-workflow-docs/troubleshoot/approved-list-slow-troubleshoot.md)からこのURLが提示される。
 * アクセスした人が所属する会社にだけ暫定対応が適用される。
 *
 * 原因の切り分けが終わる前に適用すると調査対象の事象が消えてしまうため、
 * サーバー側で原因診断の完了を条件にしている。ここではその結果を表示するだけ。
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Typography,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { useT } from '@/lib/i18n/LocaleProvider';

type State = 'loading' | 'unauthenticated' | 'applied' | 'already' | 'blocked' | 'error';

export default function ApprovedListSlowRunbookPage() {
  const t = useT();
  const router = useRouter();
  const [state, setState] = useState<State>('loading');

  // 結果だけを返し、setStateは呼び出し側で行う（effect内での同期setStateを避けるため）
  const runApply = useCallback(async (): Promise<State> => {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      return 'unauthenticated';
    }

    try {
      const result = await apiClient.chapters.applyApprovedListRemediation();

      if (!result.applied) {
        return result.reason === 'investigation_incomplete' ? 'blocked' : 'error';
      }

      // 適用できたら裏クエストのクリアを記録する（失敗しても暫定対応自体は適用済み）
      const questTokens = result.hiddenQuestTokens ?? [];
      if (questTokens.length > 0) {
        await Promise.all(
          questTokens.map((questToken) =>
            apiClient.chapters.clearHiddenQuest(questToken).catch(() => false)
          )
        );
        window.dispatchEvent(new CustomEvent('gameday:chapterCleared'));
      }

      return result.alreadyApplied ? 'already' : 'applied';
    } catch {
      return 'error';
    }
  }, []);

  const retry = useCallback(() => {
    runApply().then(setState);
  }, [runApply]);

  useEffect(() => {
    let cancelled = false;
    runApply().then((next) => {
      if (!cancelled) {
        setState(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [runApply]);

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" component="h1" fontWeight="bold" gutterBottom>
          {t.runbook.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t.runbook.description}
        </Typography>

        {state === 'loading' && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={20} />
            <Typography>{t.runbook.applying}</Typography>
          </Box>
        )}

        {state === 'applied' && (
          <Alert severity="success">
            {t.runbook.applied}
          </Alert>
        )}

        {state === 'already' && (
          <Alert severity="info">
            {t.runbook.already}
          </Alert>
        )}

        {state === 'blocked' && (
          <Alert severity="warning">
            {t.runbook.blocked}
          </Alert>
        )}

        {state === 'unauthenticated' && (
          <Alert severity="warning">
            {t.runbook.unauthenticated}
          </Alert>
        )}

        {state === 'error' && (
          <Alert severity="error">
            {t.runbook.error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          {state === 'unauthenticated' ? (
            <Button variant="contained" onClick={() => router.push('/')}>
              {t.runbook.toLogin}
            </Button>
          ) : (
            <Button variant="contained" onClick={() => router.push('/dashboard')}>
              {t.runbook.toDashboard}
            </Button>
          )}
          {(state === 'blocked' || state === 'error') && (
            <Button variant="outlined" onClick={retry}>
              {t.runbook.retry}
            </Button>
          )}
        </Box>
      </Paper>
    </Container>
  );
}
