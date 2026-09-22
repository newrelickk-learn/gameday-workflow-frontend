'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  TextField,
  MenuItem,
  Button,
  Alert,
  CircularProgress,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Grid,
  InputAdornment,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { getCurrentUserId, getCurrentUser, isManager } from '@/lib/utils/auth';
import { getVirtualToday } from '@/lib/utils/virtual-date';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import type { City } from '@/lib/api/types';
import ChapterDiagnosisDropdown from '@/components/ChapterDiagnosisDropdown';
import { useT, useLocale, format } from '@/lib/i18n/LocaleProvider';
import { applicationTypeLabel, cityName } from '@/lib/i18n/labels';
import Transaction360DiagnosisQuiz from '@/components/Transaction360DiagnosisQuiz';

export default function NewApplicationPage() {
  const t = useT();
  const { locale } = useLocale();
  const router = useRouter();
  const [type, setType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [days, setDays] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // AIレビュアーからの差し戻し理由。説明欄の下に出す。
  const [descriptionError, setDescriptionError] = useState('');
  const [success, setSuccess] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [virtualToday, setVirtualToday] = useState<Date | null>(null);

  const [cities, setCities] = useState<City[]>([]);
  const [departureCityId, setDepartureCityId] = useState<string>('');
  const [arrivalCityId, setArrivalCityId] = useState<string>('');
  const [travelCostLoading, setTravelCostLoading] = useState(false);
  const [travelCostError, setTravelCostError] = useState('');
  const [travelCostRetryToken, setTravelCostRetryToken] = useState(0);
  // 正解すると概算取得が成功するようになり、エラー表示ごと診断パネルが消えてしまうため、
  // クリア済みかどうかを別に持っておき、正解表示は出したままにする。
  const [chapter3Cleared, setChapter3Cleared] = useState(false);

  useEffect(() => {
    const handleChapterCleared = (event: Event) => {
      const detail = (event as CustomEvent<{ chapter?: number }>).detail;
      if (detail?.chapter === 3) {
        setChapter3Cleared(true);
        setTravelCostRetryToken((prev) => prev + 1);
      }
    };
    window.addEventListener('gameday:chapterCleared', handleChapterCleared);
    return () => {
      window.removeEventListener('gameday:chapterCleared', handleChapterCleared);
    };
  }, []);

  useEffect(() => {
    getVirtualToday().then(setVirtualToday);
  }, []);

  const isExpenseType = type === 'expense';
  const isBusinessTripType = type === 'business-trip';
  const isVacationType = type === 'vacation';
  const isDateRequiredType = isBusinessTripType || isVacationType;

  useEffect(() => {
    if (!isBusinessTripType) return;
    apiClient.travel.getCities().then(setCities).catch(() => setCities([]));
  }, [isBusinessTripType]);

  useEffect(() => {
    if (!isBusinessTripType) return;
    let cancelled = false;
    apiClient.chapters
      .getClearedChapters()
      .then((chapters) => {
        if (!cancelled) {
          setChapter3Cleared(chapters.includes(3));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isBusinessTripType]);

  const debouncedDepartureCityId = useDebouncedValue(departureCityId, 800);
  const debouncedArrivalCityId = useDebouncedValue(arrivalCityId, 800);

  useEffect(() => {
    if (!isBusinessTripType || !debouncedDepartureCityId || !debouncedArrivalCityId) {
      return;
    }
    let cancelled = false;
    setTravelCostLoading(true);
    setTravelCostError('');
    const currentUser = getCurrentUser();

    apiClient.travel
      .estimateCost({
        departureCityId: debouncedDepartureCityId,
        arrivalCityId: debouncedArrivalCityId,
        description,
        companyId: currentUser?.companyId,
      })
      .then((result) => {
        if (cancelled) return;
        setAmount(String(result.amount));
        setTravelCostLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setAmount('');
        setTravelCostError(t.applications.estimateFailed);
        setTravelCostLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // descriptionは依存に含めない。debounceしているのは都市IDだけなので、含めると
    // 説明欄の1文字ごとに旅費サービスへの概算取得が飛んでしまう。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBusinessTripType, debouncedDepartureCityId, debouncedArrivalCityId, travelCostRetryToken]);

  const TWO_WEEK_RULE_DAYS = 14;

  const businessTripDepartureCheck = useMemo(() => {
    if (!isBusinessTripType || !startDate || !virtualToday) {
      return null;
    }

    const today = new Date(virtualToday);
    today.setHours(0, 0, 0, 0);

    const departureDate = new Date(startDate);
    departureDate.setHours(0, 0, 0, 0);

    const diffTime = departureDate.getTime() - today.getTime();
    const daysUntilDeparture = Math.round(diffTime / (1000 * 60 * 60 * 24));

    return {
      daysUntilDeparture,
      meetsTwoWeekRule: daysUntilDeparture >= TWO_WEEK_RULE_DAYS,
    };
  }, [isBusinessTripType, startDate, virtualToday]);

  const calculateDays = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const startDateObj = new Date(start);
    const endDateObj = new Date(end);
    const diffTime = Math.abs(endDateObj.getTime() - startDateObj.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    if (value && endDate) {
      const calculatedDays = calculateDays(value, endDate);
      setDays(calculatedDays.toString());
    }
  };

  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    if (startDate && value) {
      const calculatedDays = calculateDays(startDate, value);
      setDays(calculatedDays.toString());
    }
  };

  const isFormValid =
    type &&
    title &&
    description &&
    (!isExpenseType || (amount && parseFloat(amount) > 0)) &&
    (!isDateRequiredType || (startDate && endDate && days && parseInt(days) > 0)) &&
    (!isBusinessTripType ||
      (departureCityId &&
        arrivalCityId &&
        amount &&
        parseFloat(amount) > 0 &&
        !travelCostLoading &&
        !travelCostError));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    
    if (isExpenseType) {
      const amountNum = parseFloat(amount);
      if (!amount || isNaN(amountNum) || amountNum <= 0) {
        setError(t.applications.errorAmount);
        return;
      }
    }
    
    if (isDateRequiredType) {
      if (!startDate || !endDate) {
        setError(t.applications.errorDates);
        return;
      }
      if (new Date(startDate) > new Date(endDate)) {
        setError(t.applications.errorDateOrder);
        return;
      }
      if (!days || parseInt(days) <= 0) {
        setError(t.applications.errorDays);
        return;
      }
    }
    
    setError('');
    setConfirmDialogOpen(true);
  };

  const handleConfirm = async () => {
    setConfirmDialogOpen(false);
    setError('');
    setDescriptionError('');
    setLoading(true);

    try {
      const applicantId = getCurrentUserId();
      if (!applicantId) {
        setError(t.applications.errorNoLogin);
        setLoading(false);
        return;
      }

      const requestData: {
        type: string;
        title: string;
        description: string;
        amount?: number;
        startDate?: string;
        endDate?: string;
        days?: number;
        applicantId: string;
      } = {
        type,
        title,
        description,
        applicantId,
      };

      if ((isExpenseType || isBusinessTripType) && amount) {
        requestData.amount = parseFloat(amount);
      }

      if (isDateRequiredType && startDate && endDate && days) {
        requestData.startDate = startDate;
        requestData.endDate = endDate;
        requestData.days = parseInt(days);
      }

      const created = await apiClient.applications.createApplication(requestData);

      // 裏クエストのクリアは、申請サービスが発行した引換券をブラウザから渡して記録する
      // (申請そのもののトレースにgame-masterを混ぜないため)。失敗しても申請は成立しているので握りつぶす。
      const hiddenQuestTokens = created?.hiddenQuestTokens ?? [];
      if (hiddenQuestTokens.length > 0) {
        await Promise.all(
          hiddenQuestTokens.map((questToken) =>
            apiClient.chapters.clearHiddenQuest(questToken).catch(() => false)
          )
        );
        window.dispatchEvent(new CustomEvent('gameday:chapterCleared'));
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard/applications');
      }, 1500);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      const SHOWABLE_ERROR_CODES = [
        'ASSERTION_RULE_VIOLATION',
        'PREREQUISITE_CHAPTERS_NOT_CLEARED',
        'AI_REVIEW_REJECTED',
      ];
      if (code && SHOWABLE_ERROR_CODES.includes(code) && err instanceof Error && err.message) {
        setError(err.message);
        if (code === 'AI_REVIEW_REJECTED') {
          setDescriptionError(err.message);
        }
      } else {
        setError(t.applications.errorCreate);
      }
      console.error('申請作成エラー:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelConfirm = () => {
    setConfirmDialogOpen(false);
  };

  const handleCloseSnackbar = () => {
    setSuccess(false);
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
        {t.applications.newTitle}
      </Typography>
      <Paper sx={{ p: 4, mt: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            select
            fullWidth
            label={t.applications.type}
            value={type}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setType(e.target.value)}
            required
            disabled={loading}
            sx={{ mb: 3 }}
          >
            <MenuItem value="">{t.applications.selectPlaceholder}</MenuItem>
            <MenuItem value="business-trip">{t.applications.typeBusinessTrip}</MenuItem>
            <MenuItem value="vacation">{t.applications.typeVacation}</MenuItem>
            <MenuItem value="expense">{t.applications.typeExpense}</MenuItem>
            {isManager() && <MenuItem value="promotion">{t.applications.typePromotion}</MenuItem>}
          </TextField>
          <TextField
            fullWidth
            label={t.applications.title}
            value={title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
            required
            disabled={loading}
            sx={{ mb: 3 }}
            placeholder={t.applications.titlePlaceholder}
          />
          {isExpenseType && (
            <TextField
              fullWidth
              label={t.applications.amount}
              type="number"
              value={amount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
              required={isExpenseType}
              disabled={loading}
              sx={{ mb: 3 }}
              placeholder={t.applications.amountPlaceholder}
              inputProps={{ min: 0, step: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Typography>¥</Typography>
                  </InputAdornment>
                ),
              }}
            />
          )}
          {isBusinessTripType && (
            <>
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <TextField
                  select
                  fullWidth
                  label={t.applications.departure}
                  value={departureCityId}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDepartureCityId(e.target.value)}
                  required
                  disabled={loading}
                >
                  <MenuItem value="">{t.applications.selectPlaceholder}</MenuItem>
                  {cities.map((city) => (
                    <MenuItem key={city.id} value={String(city.id)}>
                      {cityName(city, locale)}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  fullWidth
                  label={t.applications.arrival}
                  value={arrivalCityId}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setArrivalCityId(e.target.value)}
                  required
                  disabled={loading}
                >
                  <MenuItem value="">{t.applications.selectPlaceholder}</MenuItem>
                  {cities.map((city) => (
                    <MenuItem key={city.id} value={String(city.id)}>
                      {cityName(city, locale)}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  {t.applications.estimatedCost}
                </Typography>
                {travelCostLoading && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={18} />
                    <Typography variant="body2" color="text.secondary">
                      {t.applications.estimating}
                    </Typography>
                  </Box>
                )}
                {!travelCostLoading && travelCostError && (
                  <Alert severity="error">{travelCostError}</Alert>
                )}
                {!travelCostLoading && (travelCostError || chapter3Cleared) && (
                  <ChapterDiagnosisDropdown chapter={3} title={t.applications.estimateDiagnosisTitle} />
                )}
                {!travelCostLoading && !travelCostError && amount && (
                  <Typography variant="body1" fontWeight="bold">
                    ¥{parseFloat(amount).toLocaleString()}
                  </Typography>
                )}
                {!travelCostLoading && !travelCostError && !amount && (
                  <Typography variant="body2" color="text.secondary">
                    {t.applications.estimateHint}
                  </Typography>
                )}
              </Box>
            </>
          )}
          {isDateRequiredType && (
            <>
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <TextField
                  fullWidth
                  label={t.applications.startDate}
                  type="date"
                  value={startDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleStartDateChange(e.target.value)}
                  required={isDateRequiredType}
                  disabled={loading}
                  // 入力欄の中の「年/月/日」はブラウザが描いており、ページ側からは言語を変えられない。
                  // 何を入れる欄なのかが英語話者にも伝わるよう、形式だけ補助テキストで示す。
                  helperText={t.applications.dateFormatHint}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
                <TextField
                  fullWidth
                  label={t.applications.endDate}
                  type="date"
                  value={endDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleEndDateChange(e.target.value)}
                  required={isDateRequiredType}
                  disabled={loading}
                  helperText={t.applications.dateFormatHint}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Box>
              <TextField
                fullWidth
                label={t.applications.days}
                type="number"
                value={days}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDays(e.target.value)}
                required={isDateRequiredType}
                disabled={loading}
                sx={{ mb: 3 }}
                placeholder={t.applications.daysPlaceholder}
                inputProps={{ min: 1, step: 1 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Typography>{t.applications.daysUnit}</Typography>
                    </InputAdornment>
                  ),
                }}
                helperText={startDate && endDate ? format(t.applications.daysAuto, { days: calculateDays(startDate, endDate) }) : t.applications.daysAutoHint}
              />
              {isBusinessTripType && businessTripDepartureCheck && (
                <Alert
                  severity={businessTripDepartureCheck.meetsTwoWeekRule ? 'info' : 'warning'}
                  sx={{ mb: 3 }}
                >
                  {businessTripDepartureCheck.daysUntilDeparture >= 0
                    ? format(t.applications.departureIn, { days: businessTripDepartureCheck.daysUntilDeparture })
                    : t.applications.departurePast}
                  {!businessTripDepartureCheck.meetsTwoWeekRule &&
                    format(t.applications.twoWeekRule, { days: TWO_WEEK_RULE_DAYS })}
                </Alert>
              )}
            </>
          )}
          <TextField
            fullWidth
            label={t.applications.description}
            multiline
            rows={6}
            value={description}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setDescription(e.target.value);
              setDescriptionError('');
            }}
            required
            disabled={loading}
            error={!!descriptionError}
            helperText={
              descriptionError ||
              (isBusinessTripType
                ? t.applications.descriptionAiHint
                : undefined)
            }
            sx={{ mb: 3 }}
            placeholder={t.applications.descriptionPlaceholder}
          />
          {isExpenseType && (
            <Box sx={{ mb: 3 }}>
              <Transaction360DiagnosisQuiz />
            </Box>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => router.push('/dashboard/applications')}
              disabled={loading}
            >
              {t.common.cancel}
            </Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={loading || !isFormValid}
            >
              {t.applications.toConfirm}
            </Button>
          </Box>
        </Box>
      </Paper>

      {}
      <Dialog open={confirmDialogOpen} onClose={handleCancelConfirm} maxWidth="md" fullWidth>
        <DialogTitle>{t.applications.confirmTitle}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {t.applications.confirmBody}
          </Typography>
          <Divider sx={{ mb: 3 }} />
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                {t.applications.type}
              </Typography>
              <Typography variant="body1">{applicationTypeLabel(t, type)}</Typography>
            </Grid>
            {isExpenseType && amount && (
              <Grid item xs={12} sm={4}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  {t.applications.amount}
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  ¥{parseFloat(amount).toLocaleString()}
                </Typography>
              </Grid>
            )}
            {isBusinessTripType && amount && (
              <Grid item xs={12} sm={4}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  {t.applications.estimatedCost}
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  ¥{parseFloat(amount).toLocaleString()}
                </Typography>
              </Grid>
            )}
            {isDateRequiredType && startDate && endDate && (
              <>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {t.applications.startDate}
                  </Typography>
                  <Typography variant="body1">
                    {new Date(startDate).toLocaleDateString('ja-JP')}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {t.applications.endDate}
                  </Typography>
                  <Typography variant="body1">
                    {new Date(endDate).toLocaleDateString('ja-JP')}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {t.applications.days}
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {days}{t.applications.daysUnit}
                  </Typography>
                </Grid>
              </>
            )}
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                {t.applications.title}
              </Typography>
              <Typography variant="body1">{title}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                {t.applications.description}
              </Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {description}
              </Typography>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelConfirm} disabled={loading}>
            {t.common.cancel}
          </Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? t.applications.submitting : t.common.submit}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={success}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          {t.applications.created}
        </Alert>
      </Snackbar>
    </Container>
  );
}

