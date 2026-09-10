'use client';

import { useEffect, useState } from 'react';
import { Alert, Autocomplete, Box, Button, Paper, TextField, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { apiClient } from '@/lib/api/client';

const CHAPTER = 1;
const STORAGE_KEY = 'gameday:transaction360-quiz:v1';

interface QuizOptions {
  q1: string[];
  q2: string[];
  q3: string[];
  q4: string[];
}

interface QuizAnswers {
  q1: string[];
  q2: string[];
  q3: string[];
  q4: string[];
}

const EMPTY_OPTIONS: QuizOptions = { q1: [], q2: [], q3: [], q4: [] };
const EMPTY_ANSWERS: QuizAnswers = { q1: [], q2: [], q3: [], q4: [] };

function loadPersisted(): { answers: QuizAnswers; allCorrect: boolean | null } {
  if (typeof window === 'undefined') {
    return { answers: EMPTY_ANSWERS, allCorrect: null };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { answers: EMPTY_ANSWERS, allCorrect: null };
    }
    const parsed = JSON.parse(raw);
    return {
      answers: {
        q1: Array.isArray(parsed.answers?.q1) ? parsed.answers.q1 : [],
        q2: Array.isArray(parsed.answers?.q2) ? parsed.answers.q2 : [],
        q3: Array.isArray(parsed.answers?.q3) ? parsed.answers.q3 : [],
        q4: Array.isArray(parsed.answers?.q4) ? parsed.answers.q4 : [],
      },
      allCorrect: parsed.allCorrect ?? null,
    };
  } catch {
    return { answers: EMPTY_ANSWERS, allCorrect: null };
  }
}

function persist(answers: QuizAnswers, allCorrect: boolean | null) {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, allCorrect }));
}

export default function Transaction360DiagnosisQuiz() {
  const [options, setOptions] = useState<QuizOptions>(EMPTY_OPTIONS);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [answers, setAnswers] = useState<QuizAnswers>(EMPTY_ANSWERS);
  const [allCorrect, setAllCorrect] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        setOptionsLoading(true);
        setError('');

        const clearedChapters: number[] = await apiClient.chapters.getClearedChapters().catch(() => [] as number[]);
        if (cancelled) {
          return;
        }
        if (clearedChapters.includes(CHAPTER)) {
          setCleared(true);
          return;
        }

        const persisted = loadPersisted();
        setAnswers(persisted.answers);
        setAllCorrect(persisted.allCorrect);

        const data = await apiClient.chapters.getTransaction360QuizOptions();
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
  }, []);

  const canSubmit =
    answers.q1.length > 0 && answers.q2.length > 0 && answers.q3.length > 0 && answers.q4.length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }
    try {
      setChecking(true);
      setError('');
      const result = await apiClient.chapters.checkTransaction360QuizAnswers({
        q1: answers.q1.map((v) => v.trim()),
        q2: answers.q2.map((v) => v.trim()),
        q3: answers.q3.map((v) => v.trim()),
        q4: answers.q4.map((v) => v.trim()),
      });
      setAllCorrect(result.allCorrect);
      persist(answers, result.allCorrect);

      if (result.allCorrect) {
        setCleared(true);
        window.dispatchEvent(new CustomEvent('gameday:chapterCleared', { detail: { chapter: CHAPTER } }));
      } else {
        // 不正解はスコアの減点対象として記録する(記録に失敗しても回答結果の表示は続ける)。
        apiClient.chapters.recordMistake(CHAPTER).catch(() => {});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '判定に失敗しました');
    } finally {
      setChecking(false);
    }
  };

  if (cleared) {
    return (
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.light' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <CheckCircleIcon color="success" />
          <Typography variant="h6" color="success.dark">
            正解です！CreateApplicationトランザクションの理解を深めることができました。
          </Typography>
        </Box>
        <Typography variant="body2" color="success.dark">
          申請エラーが発生している場合はエラーの内容も確認して解決しましょう
        </Typography>
      </Paper>
    );
  }

  const showIncorrectAlert = allCorrect === false;

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        gameday-workflow-frontendのCreateApplicationトランザクションを理解する
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        実際に申請して確認してみましょう。ヒント：CreateApplication /{' '}
        <a href="https://dojo.learn.nrkk.technology/course/contents/277" target="_blank" rel="noreferrer">
          Transaction 360
        </a>
        を確認し、以下の4つの質問に回答してください（当てはまるものをすべて選んでください）。
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {showIncorrectAlert && (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setAllCorrect(null)}>
          不正解でした。もう一度New Relicで調査し、選び直してください。
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="subtitle1">
              Q1. CreateApplicationというリクエストに関連しているアプリケーションを全て選びましょう
            </Typography>
          </Box>
          <Autocomplete
            freeSolo
            multiple
            fullWidth
            loading={optionsLoading}
            options={options.q1}
            value={answers.q1}
            onChange={(_, newValue) => setAnswers((prev) => ({ ...prev, q1: newValue }))}
            disabled={checking}
            renderInput={(params) => (
              <TextField {...params} label="関連アプリケーション（複数選択可）" placeholder="選択肢を検索、または直接入力してEnter" />
            )}
          />
        </Box>

        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="subtitle1">
              Q2. Transaction-initiating sessionsのリストに表示されているのは、Browserエージェントで収集した操作履歴です。
              この操作の中には、必ずCreateApplication(申請)を行う操作が含まれていますか？（3つほど確認してみましょう）
            </Typography>
          </Box>
          <Autocomplete
            freeSolo
            multiple
            fullWidth
            loading={optionsLoading}
            options={options.q2}
            value={answers.q2}
            onChange={(_, newValue) => setAnswers((prev) => ({ ...prev, q2: newValue }))}
            disabled={checking}
            renderInput={(params) => (
              <TextField {...params} label="Yes / No（当てはまるものを選択）" placeholder="選択肢を検索、または直接入力してEnter" />
            )}
          />
        </Box>

        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="subtitle1">
              Q3. Supporting infrastructure entitiesのパネルで確認できる、正しい選択肢を全て選びましょう
            </Typography>
          </Box>
          <Autocomplete
            freeSolo
            multiple
            fullWidth
            loading={optionsLoading}
            options={options.q3}
            value={answers.q3}
            onChange={(_, newValue) => setAnswers((prev) => ({ ...prev, q3: newValue }))}
            disabled={checking}
            renderInput={(params) => (
              <TextField {...params} label="インフラに関する正しい記述（複数選択可）" placeholder="選択肢を検索、または直接入力してEnter" />
            )}
          />
        </Box>

        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="subtitle1">
              Q4. gameday-workflow-frontendから直接呼び出しているサービスを全て選んでください
            </Typography>
          </Box>
          <Autocomplete
            freeSolo
            multiple
            fullWidth
            loading={optionsLoading}
            options={options.q4}
            value={answers.q4}
            onChange={(_, newValue) => setAnswers((prev) => ({ ...prev, q4: newValue }))}
            disabled={checking}
            renderInput={(params) => (
              <TextField {...params} label="直接呼び出しているサービス（複数選択可）" placeholder="選択肢を検索、または直接入力してEnter" />
            )}
          />
        </Box>

        <Box>
          <Button variant="contained" onClick={handleSubmit} disabled={checking || !canSubmit}>
            送信する
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}
