'use client';

import { useEffect, useState } from 'react';
import { Alert, Autocomplete, Box, Button, Paper, TextField, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { apiClient } from '@/lib/api/client';

interface ChapterDiagnosisDropdownProps {
  chapter: number;
  title?: string;
}

/**
 * GameDay演習: New Relicで調査した内容を元に、遅延・不具合の原因を選ばせる診断UI。
 * 選択肢・正解はすべてサーバー側で暗号化されており、このコンポーネントは
 * 選択肢一覧の取得と、選んだテキストが正解かどうかの判定結果しか受け取らない。
 */
export default function ChapterDiagnosisDropdown({ chapter, title }: ChapterDiagnosisDropdownProps) {
  const [options, setOptions] = useState<string[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [selectedText, setSelectedText] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        setOptionsLoading(true);
        setError('');

        // 今日すでにクリア済みなら（DBに記録済み、日付が変わるとリセットされる）、
        // 選択肢は取得せずそのまま正解状態を表示する。
        const clearedChapters: number[] = await apiClient.chapters.getClearedChapters().catch(() => [] as number[]);
        if (cancelled) {
          return;
        }
        if (clearedChapters.includes(chapter)) {
          setResult('correct');
          return;
        }

        const data = await apiClient.chapters.getDiagnosisOptions(chapter);
        if (!cancelled) {
          setOptions(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '選択肢の取得に失敗しました');
        }
      } finally {
        if (!cancelled) {
          setOptionsLoading(false);
        }
      }
    };
    init();
    return () => {
      cancelled = true;
    };
  }, [chapter]);

  const handleSubmit = async () => {
    if (!selectedText.trim()) {
      return;
    }
    try {
      setChecking(true);
      setError('');
      const correct = await apiClient.chapters.checkAnswer(chapter, selectedText.trim());
      setResult(correct ? 'correct' : 'incorrect');
    } catch (err) {
      setError(err instanceof Error ? err.message : '判定に失敗しました');
    } finally {
      setChecking(false);
    }
  };

  if (result === 'correct') {
    return (
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.light' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircleIcon color="success" />
          <Typography variant="h6" color="success.dark">
            正解です！原因を特定できました。
          </Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        {title ?? '原因を診断する'}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        New Relicで調査した内容を元に、原因だと思う選択肢を選ぶか、直接入力してください。
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {result === 'incorrect' && (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setResult(null)}>
          不正解でした。もう一度New Relicで調査し、選び直してください。
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <Autocomplete
          freeSolo
          fullWidth
          loading={optionsLoading}
          options={options}
          value={selectedText}
          onInputChange={(_, value) => setSelectedText(value)}
          disabled={checking}
          sx={{ flex: 1, minWidth: 280 }}
          renderInput={(params) => (
            <TextField {...params} label="原因（選択または直接入力）" placeholder="選択肢を検索、または直接入力" />
          )}
        />
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={checking || !selectedText.trim()}
        >
          回答する
        </Button>
      </Box>
    </Paper>
  );
}
