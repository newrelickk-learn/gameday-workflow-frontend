'use client';

import { useState, useMemo } from 'react';
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
import { getCurrentUserId, isManager } from '@/lib/utils/auth';

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'business-trip':
      return '出張申請';
    case 'expense':
      return '経費申請';
    case 'vacation':
      return '有給休暇申請';
    case 'promotion':
      return 'プロモーション申請';
    default:
      return type;
  }
};

export default function NewApplicationPage() {
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
  const [success, setSuccess] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const isExpenseType = type === 'expense';
  const isBusinessTripType = type === 'business-trip';
  const isVacationType = type === 'vacation';
  const isDateRequiredType = isBusinessTripType || isVacationType;

  // 出張申請の「2週間前ルール」の事前チェック用の定数
  const TWO_WEEK_RULE_DAYS = 14;

  // 出発日（開始日）までの残り日数と、2週間前ルールを満たしているかをチェックする
  // TODO: 日付基準の実装は要検討
  const businessTripDepartureCheck = useMemo(() => {
    if (!isBusinessTripType || !startDate) {
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const departureDate = new Date(startDate);
    departureDate.setHours(0, 0, 0, 0);

    const diffTime = departureDate.getTime() - today.getTime();
    const daysUntilDeparture = Math.round(diffTime / (1000 * 60 * 60 * 24));

    return {
      daysUntilDeparture,
      meetsTwoWeekRule: daysUntilDeparture >= TWO_WEEK_RULE_DAYS,
    };
  }, [isBusinessTripType, startDate]);

  // 開始日と終了日から日数を自動計算
  const calculateDays = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const startDateObj = new Date(start);
    const endDateObj = new Date(end);
    const diffTime = Math.abs(endDateObj.getTime() - startDateObj.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // 開始日と終了日を含む
    return diffDays;
  };

  // 開始日または終了日が変更されたときに日数を自動計算
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
    (!isDateRequiredType || (startDate && endDate && days && parseInt(days) > 0));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    
    // 経費精算の場合、金額のバリデーション
    if (isExpenseType) {
      const amountNum = parseFloat(amount);
      if (!amount || isNaN(amountNum) || amountNum <= 0) {
        setError('金額を正しく入力してください');
        return;
      }
    }
    
    // 出張申請・休暇申請の場合、日付と日数のバリデーション
    if (isDateRequiredType) {
      if (!startDate || !endDate) {
        setError('開始日と終了日を入力してください');
        return;
      }
      if (new Date(startDate) > new Date(endDate)) {
        setError('開始日は終了日より前である必要があります');
        return;
      }
      if (!days || parseInt(days) <= 0) {
        setError('日数を入力してください');
        return;
      }
    }
    
    setError('');
    setConfirmDialogOpen(true);
  };

  const handleConfirm = async () => {
    setConfirmDialogOpen(false);
    setError('');
    setLoading(true);

    try {
      const applicantId = getCurrentUserId();
      if (!applicantId) {
        setError('ログイン情報が見つかりません。再度ログインしてください。');
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

      // 経費精算の場合のみ金額を追加
      if (isExpenseType && amount) {
        requestData.amount = parseFloat(amount);
      }

      // 出張申請・休暇申請の場合のみ開始日・終了日・日数を追加
      if (isDateRequiredType && startDate && endDate && days) {
        requestData.startDate = startDate;
        requestData.endDate = endDate;
        requestData.days = parseInt(days);
      }

      await apiClient.applications.createApplication(requestData);
      
      setSuccess(true);
      // 成功後、申請一覧ページにリダイレクト
      setTimeout(() => {
        router.push('/dashboard/applications');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : '申請の作成に失敗しました');
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
        新規申請
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
            label="申請タイプ"
            value={type}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setType(e.target.value)}
            required
            disabled={loading}
            sx={{ mb: 3 }}
          >
            <MenuItem value="">選択してください</MenuItem>
            <MenuItem value="business-trip">出張申請</MenuItem>
            <MenuItem value="vacation">有給休暇申請</MenuItem>
            <MenuItem value="expense">経費申請</MenuItem>
            {isManager() && <MenuItem value="promotion">プロモーション申請</MenuItem>}
          </TextField>
          <TextField
            fullWidth
            label="タイトル"
            value={title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
            required
            disabled={loading}
            sx={{ mb: 3 }}
            placeholder="申請のタイトルを入力してください"
          />
          {isExpenseType && (
            <TextField
              fullWidth
              label="金額"
              type="number"
              value={amount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
              required={isExpenseType}
              disabled={loading}
              sx={{ mb: 3 }}
              placeholder="金額を入力してください"
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
          {isDateRequiredType && (
            <>
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <TextField
                  fullWidth
                  label="開始日"
                  type="date"
                  value={startDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleStartDateChange(e.target.value)}
                  required={isDateRequiredType}
                  disabled={loading}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
                <TextField
                  fullWidth
                  label="終了日"
                  type="date"
                  value={endDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleEndDateChange(e.target.value)}
                  required={isDateRequiredType}
                  disabled={loading}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Box>
              <TextField
                fullWidth
                label="日数"
                type="number"
                value={days}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDays(e.target.value)}
                required={isDateRequiredType}
                disabled={loading}
                sx={{ mb: 3 }}
                placeholder="日数を入力してください"
                inputProps={{ min: 1, step: 1 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Typography>日</Typography>
                    </InputAdornment>
                  ),
                }}
                helperText={startDate && endDate ? `自動計算: ${calculateDays(startDate, endDate)}日` : '開始日と終了日を入力すると自動計算されます'}
              />
              {isBusinessTripType && businessTripDepartureCheck && (
                <Alert
                  severity={businessTripDepartureCheck.meetsTwoWeekRule ? 'info' : 'warning'}
                  sx={{ mb: 3 }}
                >
                  {businessTripDepartureCheck.daysUntilDeparture >= 0
                    ? `出発日まであと${businessTripDepartureCheck.daysUntilDeparture}日です。`
                    : '出発日が既に過去の日付になっています。'}
                  {!businessTripDepartureCheck.meetsTwoWeekRule &&
                    ` 社内規定の「2週間前ルール」（出発日の${TWO_WEEK_RULE_DAYS}日前までの申請）を満たしていない可能性があります。ご注意ください。`}
                </Alert>
              )}
            </>
          )}
          <TextField
            fullWidth
            label="説明"
            multiline
            rows={6}
            value={description}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
            required
            disabled={loading}
            sx={{ mb: 3 }}
            placeholder="申請の詳細を入力してください"
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => router.push('/dashboard/applications')}
              disabled={loading}
            >
              キャンセル
            </Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={loading || !isFormValid}
            >
              確認画面へ
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* 確認ダイアログ */}
      <Dialog open={confirmDialogOpen} onClose={handleCancelConfirm} maxWidth="md" fullWidth>
        <DialogTitle>申請内容の確認</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            以下の内容で申請します。内容をご確認の上、申請ボタンを押してください。
          </Typography>
          <Divider sx={{ mb: 3 }} />
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                申請タイプ
              </Typography>
              <Typography variant="body1">{getTypeLabel(type)}</Typography>
            </Grid>
            {isExpenseType && amount && (
              <Grid item xs={12} sm={4}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  金額
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
                    開始日
                  </Typography>
                  <Typography variant="body1">
                    {new Date(startDate).toLocaleDateString('ja-JP')}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    終了日
                  </Typography>
                  <Typography variant="body1">
                    {new Date(endDate).toLocaleDateString('ja-JP')}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    日数
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {days}日
                  </Typography>
                </Grid>
              </>
            )}
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                タイトル
              </Typography>
              <Typography variant="body1">{title}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                説明
              </Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {description}
              </Typography>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelConfirm} disabled={loading}>
            キャンセル
          </Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? '申請中...' : '申請する'}
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
          申請が正常に作成されました
        </Alert>
      </Snackbar>
    </Container>
  );
}

