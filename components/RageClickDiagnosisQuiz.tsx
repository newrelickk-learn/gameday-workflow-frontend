'use client';

import { useEffect, useState } from 'react';
import { Alert, Autocomplete, Box, Button, Paper, TextField, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { apiClient } from '@/lib/api/client';
import { useT, useLocale } from '@/lib/i18n/LocaleProvider';

const CHAPTER = 4;
const STORAGE_KEY = 'gameday:ragequiz:v1';

interface QuizOptions {
  q1: string[];
  q2: string[];
  q3: string[];
}

interface QuizAnswers {
  q1: string;
  q2: string;
  q3: string;
}

const EMPTY_OPTIONS: QuizOptions = { q1: [], q2: [], q3: [] };
const EMPTY_ANSWERS: QuizAnswers = { q1: '', q2: '', q3: '' };

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
        q1: parsed.answers?.q1 ?? '',
        q2: parsed.answers?.q2 ?? '',
        q3: parsed.answers?.q3 ?? '',
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

export default function RageClickDiagnosisQuiz() {
  const t = useT();
  const { locale } = useLocale();
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

        const data = await apiClient.chapters.getRageClickQuizOptions(locale);
        if (!cancelled) {
          setOptions(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t.diagnosis.optionsFailed);
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
  }, [locale, t.diagnosis.optionsFailed]);

  const canSubmit = answers.q1.trim() !== '' && answers.q2.trim() !== '' && answers.q3.trim() !== '';

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }
    try {
      setChecking(true);
      setError('');
      const result = await apiClient.chapters.checkRageClickQuizAnswers({
        q1: answers.q1.trim(),
        q2: answers.q2.trim(),
        q3: answers.q3.trim(),
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
      setError(err instanceof Error ? err.message : t.diagnosis.checkFailed);
    } finally {
      setChecking(false);
    }
  };

  if (cleared) {
    return (
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.light' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircleIcon color="success" />
          <Typography variant="h6" color="success.dark">
            {t.quiz.rageClick.correct}
          </Typography>
        </Box>
      </Paper>
    );
  }

  const showIncorrectAlert = allCorrect === false;

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        {t.quiz.rageClick.heading}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t.quiz.rageClick.intro}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {showIncorrectAlert && (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setAllCorrect(null)}>
          {t.diagnosis.incorrect}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="subtitle1">{t.quiz.rageClick.q1}</Typography>
          </Box>
          <Autocomplete
            freeSolo
            fullWidth
            loading={optionsLoading}
            options={options.q1}
            value={answers.q1}
            onInputChange={(_, value) => setAnswers((prev) => ({ ...prev, q1: value }))}
            disabled={checking}
            renderInput={(params) => (
              <TextField {...params} label={t.quiz.rageClick.q1Label} placeholder={t.quiz.searchOrType} />
            )}
          />
        </Box>

        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="subtitle1">
              {t.quiz.rageClick.q2}
            </Typography>
          </Box>
          <Autocomplete
            freeSolo
            fullWidth
            loading={optionsLoading}
            options={options.q2}
            value={answers.q2}
            onInputChange={(_, value) => setAnswers((prev) => ({ ...prev, q2: value }))}
            disabled={checking}
            renderInput={(params) => (
              <TextField {...params} label={t.quiz.rageClick.q2Label} placeholder={t.quiz.searchOrType} />
            )}
          />
        </Box>

        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="subtitle1">{t.quiz.rageClick.q3}</Typography>
          </Box>
          <Autocomplete
            freeSolo
            fullWidth
            loading={optionsLoading}
            options={options.q3}
            value={answers.q3}
            onInputChange={(_, value) => setAnswers((prev) => ({ ...prev, q3: value }))}
            disabled={checking}
            renderInput={(params) => (
              <TextField {...params} label={t.quiz.rageClick.q3Label} placeholder={t.quiz.searchOrType} />
            )}
          />
        </Box>

        <Box>
          <Button variant="contained" onClick={handleSubmit} disabled={checking || !canSubmit}>
            {t.quiz.submit}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}
