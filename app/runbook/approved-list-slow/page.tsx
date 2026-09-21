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

type State = 'loading' | 'unauthenticated' | 'applied' | 'already' | 'blocked' | 'error';

export default function ApprovedListSlowRunbookPage() {
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
          暫定対応: 承認済み一覧の表示遅延
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          一覧取得の読み込み方法を切り替えます。適用はアクセスした方が所属する会社にのみ行われ、
          他社には影響しません。適用状態は当日限りで、日次のメンテナンスでリセットされます。
        </Typography>

        {state === 'loading' && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={20} />
            <Typography>適用しています…</Typography>
          </Box>
        )}

        {state === 'applied' && (
          <Alert severity="success">
            暫定対応を適用しました。次回以降の承認済み一覧の取得からデータベース呼び出し回数が減ります。
            New Relicで適用前後の値を比較して、効果を確認してください。
          </Alert>
        )}

        {state === 'already' && (
          <Alert severity="info">
            この会社にはすでに暫定対応が適用されています。
          </Alert>
        )}

        {state === 'blocked' && (
          <Alert severity="warning">
            原因の切り分けが完了していないため、暫定対応は適用できません。
            先にランブックの「原因の切り分け」を完了してから、もう一度このページにアクセスしてください。
          </Alert>
        )}

        {state === 'unauthenticated' && (
          <Alert severity="warning">
            適用先の会社を特定できないため、ログインが必要です。ログインしてからもう一度アクセスしてください。
          </Alert>
        )}

        {state === 'error' && (
          <Alert severity="error">
            暫定対応を適用できませんでした。時間をおいて、もう一度お試しください。
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          {state === 'unauthenticated' ? (
            <Button variant="contained" onClick={() => router.push('/')}>
              ログイン画面へ
            </Button>
          ) : (
            <Button variant="contained" onClick={() => router.push('/dashboard')}>
              ダッシュボードへ
            </Button>
          )}
          {(state === 'blocked' || state === 'error') && (
            <Button variant="outlined" onClick={retry}>
              もう一度試す
            </Button>
          )}
        </Box>
      </Paper>
    </Container>
  );
}
