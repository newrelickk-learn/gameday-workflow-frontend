'use client';

import { useState, useEffect, use } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { apiClient } from '@/lib/api/client';
import type { Application, Approval } from '@/lib/api/types';
import { getCurrentUser, getCurrentUserId, isManager, isDirector } from '@/lib/utils/auth';
import WorkflowProgress from '@/components/ui/WorkflowProgress';
import ReceiptCarousel from '@/components/ReceiptCarousel';
import ChapterDiagnosisDropdown from '@/components/ChapterDiagnosisDropdown';
import { useRageClickHint } from '@/lib/hooks/useRageClickHint';
import { useRageClickStatus } from '@/lib/hooks/useRageClickStatus';

const getStatusColor = (status: 'pending' | 'approved' | 'rejected') => {
  switch (status) {
    case 'approved':
      return 'success';
    case 'rejected':
      return 'error';
    case 'pending':
      return 'warning';
    default:
      return 'default';
  }
};

const getStatusLabel = (status: 'pending' | 'approved' | 'rejected') => {
  switch (status) {
    case 'approved':
      return '承認済み';
    case 'rejected':
      return '却下';
    case 'pending':
      return '承認待ち';
    default:
      return status;
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'business-trip':
      return '出張申請';
    case 'expense':
      return '経費申請';
    case 'promotion':
      return 'プロモーション申請';
    default:
      return type;
  }
};

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ApplicationDetailPage({ params }: PageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { id } = use(params);
  const [application, setApplication] = useState<Application | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [approvalDialog, setApprovalDialog] = useState<{
    open: boolean;
    approvalId: string | null;
    action: 'approve' | 'reject' | null;
  }>({ open: false, approvalId: null, action: null });
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    approvalId: string | null;
    action: 'approve' | 'reject' | null;
    comment: string;
  }>({ open: false, approvalId: null, action: null, comment: '' });
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);
  const { hasClickedOnce: rageClickHintVisible, registerClick: registerRageClickHint } = useRageClickHint();

  const fromPage = searchParams.get('from') || 'applications';

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [applicationData, approvalsByAppData] = await Promise.all([
        apiClient.applications.getApplication(id),
        apiClient.approvals.getApprovalsByApplication(id).catch(() => []),
      ]);

      if (applicationData.type === 'promotion') {
        if (!isManager() && !isDirector()) {
          setError('プロモーション申請は上長・本部長のみ閲覧可能です');
          setLoading(false);
          return;
        }
      }

      let approvalsData = approvalsByAppData;
      if (approvalsData.length === 0) {
        // workflow-notification側にapplications/{id}/approvalsが未実装のため、
        // 自分が承認者であるapprovalの一覧から該当申請分を補完する
        const myApprovals = await apiClient.approvals.getApprovals().catch(() => []);
        approvalsData = myApprovals.filter((a) => a.applicationId === id);
      }

      setApplication(applicationData);
      setApprovals(approvalsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '申請詳細の取得に失敗しました');
      console.error('申請詳細取得エラー:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleOpenDialog = (approvalId: string, action: 'approve' | 'reject') => {
    setApprovalDialog({ open: true, approvalId, action });
    setComment('');
  };

  const handleCloseDialog = () => {
    setApprovalDialog({ open: false, approvalId: null, action: null });
    setComment('');
  };

  const handleOpenConfirmDialog = () => {
    if (!approvalDialog.approvalId || !approvalDialog.action) return;
    setConfirmDialog({
      open: true,
      approvalId: approvalDialog.approvalId,
      action: approvalDialog.action,
      comment: comment,
    });
    handleCloseDialog();
  };

  const handleCloseConfirmDialog = () => {
    setConfirmDialog({ open: false, approvalId: null, action: null, comment: '' });
    setComment('');
  };

  const handleSubmitApproval = async () => {
    if (!confirmDialog.approvalId || !confirmDialog.action) return;

    try {
      const approverId = getCurrentUserId();
      if (!approverId) {
        setError('ログイン情報が見つかりません。再度ログインしてください。');
        return;
      }

      setProcessing(true);
      await apiClient.approvals.updateApproval(confirmDialog.approvalId, {
        status: confirmDialog.action === 'approve' ? 'approved' : 'rejected',
        comment: confirmDialog.comment || undefined,
        approverId,
        applicationId: id,
      });

      await fetchData();
      handleCloseConfirmDialog();
    } catch (err) {
      setError(err instanceof Error ? err.message : '承認処理に失敗しました');
      console.error('承認処理エラー:', err);
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP');
  };

  const hasReceipts =
    application?.type === 'expense' &&
    !!application.receiptImageUrls &&
    application.receiptImageUrls.length > 0;

  const currentUserEmail = getCurrentUser()?.email ?? null;
  const { ok: rageClickOk } = useRageClickStatus(currentUserEmail, { enabled: hasReceipts });

  const currentUserId = getCurrentUserId();
  const myPendingApproval = approvals.find(
    (a) => a.status === 'pending' && currentUserId && String(a.approverId) === String(currentUserId)
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => {
            if (fromPage === 'approvals') {
              router.push('/dashboard/approvals');
            } else {
              router.push('/dashboard/applications');
            }
          }}
        >
          戻る
        </Button>
        <Typography variant="h4" component="h1" fontWeight="bold">
          申請詳細
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : application ? (
        <Grid container spacing={3}>
          <Grid item xs={12} md={hasReceipts ? 8 : 12}>
            <Paper sx={{ p: 4 }}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="h5" component="h2" fontWeight="bold">
                        {application.title}
                      </Typography>
                      {application.applicationNumber && (
                        <Typography variant="body2" color="text.secondary">
                          申請書番号: {application.applicationNumber}
                        </Typography>
                      )}
                    </Box>
                    <Chip
                      label={getStatusLabel(application.status)}
                      color={getStatusColor(application.status) as any}
                      size="medium"
                    />
                  </Box>
                </Grid>

                {myPendingApproval && (
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<CheckIcon />}
                        onClick={() => {
                          if (hasReceipts) {
                            registerRageClickHint();
                            return;
                          }
                          handleOpenDialog(myPendingApproval.id, 'approve');
                        }}
                      >
                        承認
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<CloseIcon />}
                        onClick={() => handleOpenDialog(myPendingApproval.id, 'reject')}
                      >
                        却下
                      </Button>
                    </Box>
                  </Grid>
                )}

                <Grid item xs={12}>
                  <Divider />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    申請タイプ
                  </Typography>
                  <Typography variant="body1">{getTypeLabel(application.type)}</Typography>
                </Grid>

                {application.type === 'expense' && application.amount != null && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      金額
                    </Typography>
                    <Typography variant="body1" fontWeight="bold" color="primary">
                      ¥{application.amount.toLocaleString()}
                    </Typography>
                  </Grid>
                )}

                {application.type === 'business-trip' && application.startDate && application.endDate && (
                  <>
                    <Grid item xs={12} md={4}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        開始日
                      </Typography>
                      <Typography variant="body1">
                        {new Date(application.startDate).toLocaleDateString('ja-JP')}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        終了日
                      </Typography>
                      <Typography variant="body1">
                        {new Date(application.endDate).toLocaleDateString('ja-JP')}
                      </Typography>
                    </Grid>
                    {application.days !== undefined && (
                      <Grid item xs={12} md={4}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          日数
                        </Typography>
                        <Typography variant="body1" fontWeight="bold" color="primary">
                          {application.days}日
                        </Typography>
                      </Grid>
                    )}
                  </>
                )}

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    申請ID
                  </Typography>
                  <Typography variant="body1">{application.id}</Typography>
                </Grid>

                {}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    申請者
                  </Typography>
                  <Box>
                    <Typography variant="body1" fontWeight="bold">
                      {application.applicantName || `ID: ${application.applicantId}`}
                    </Typography>
                    {application.applicantDepartment && (
                      <Typography variant="body2" color="text.secondary">
                        {application.applicantDepartment}
                      </Typography>
                    )}
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    説明
                  </Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {application.description}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    作成日時
                  </Typography>
                  <Typography variant="body1">{formatDate(application.createdAt)}</Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    更新日時
                  </Typography>
                  <Typography variant="body1">{formatDate(application.updatedAt)}</Typography>
                </Grid>

                {}
                {(application.status === 'pending' || application.status === 'approved' || application.status === 'rejected') && (
                  <Grid item xs={12}>
                    <WorkflowProgress application={application} approvals={approvals} />
                  </Grid>
                )}

                {}
                {approvals.length > 0 && (
                  <>
                    <Grid item xs={12}>
                      <Divider sx={{ mt: 2, mb: 2 }} />
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom>
                        承認履歴
                      </Typography>
                    </Grid>
                    {approvals.map((approval, index) => (
                      <Grid item xs={12} key={approval.id}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                ステップ {approval.step || index + 1}
                              </Typography>
                              <Typography variant="body1" fontWeight="bold">
                                {approval.approverName || `承認者ID: ${approval.approverId}`}
                              </Typography>
                              {approval.approverDepartment && (
                                <Typography variant="body2" color="text.secondary">
                                  {approval.approverDepartment}
                                </Typography>
                              )}
                            </Box>
                            <Chip
                              label={getStatusLabel(approval.status)}
                              color={getStatusColor(approval.status) as any}
                              size="small"
                            />
                          </Box>
                          {approval.comment && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                              コメント: {approval.comment}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            {formatDate(approval.createdAt)}
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </>
                )}
              </Grid>
            </Paper>
          </Grid>

          {hasReceipts && (
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, position: 'sticky', top: 16 }}>
                <Typography variant="h6" gutterBottom>
                  レシート画像（{application.receiptImageUrls!.length}枚）
                </Typography>
                <ReceiptCarousel images={application.receiptImageUrls!} />
              </Paper>
              <Box sx={{ mt: 3 }}>
                {rageClickOk ? (
                  <ChapterDiagnosisDropdown
                    chapter={4}
                    title="このRage ClickがOKになった仕組みはどれでしょうか？"
                  />
                ) : rageClickHintVisible ? (
                  <Alert severity="info">
                    このボタンは反応しません。もう少し連続してクリックしてみてください（Rage Clickを発生させよう）
                  </Alert>
                ) : (
                  <Alert severity="info">
                    このボタンでRage Clickを発生させてください。
                  </Alert>
                )}
              </Box>
            </Grid>
          )}
        </Grid>
      ) : (
        <Paper sx={{ p: 3 }}>
          <Typography variant="body1" color="text.secondary" align="center">
            申請が見つかりませんでした
          </Typography>
        </Paper>
      )}

      {}
      <Dialog open={approvalDialog.open} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {approvalDialog.action === 'approve' ? '承認' : '却下'} - コメント入力
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            コメントを入力してください（任意）。確認画面に進みます。
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="コメント（任意）"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="承認または却下の理由を入力してください"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            キャンセル
          </Button>
          <Button
            onClick={handleOpenConfirmDialog}
            variant="contained"
            color={approvalDialog.action === 'approve' ? 'success' : 'error'}
          >
            確認画面へ
          </Button>
        </DialogActions>
      </Dialog>

      {}
      <Dialog open={confirmDialog.open} onClose={handleCloseConfirmDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {confirmDialog.action === 'approve' ? '承認' : '却下'} - 確認
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {confirmDialog.action === 'approve'
              ? 'この申請を承認しますか？'
              : 'この申請を却下しますか？'}
          </Typography>
          <Divider sx={{ mb: 3 }} />
          {application && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  申請タイトル
                </Typography>
                <Typography variant="body1">
                  {application.title}
                </Typography>
              </Grid>
              {confirmDialog.comment && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    コメント
                  </Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {confirmDialog.comment}
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmDialog} disabled={processing}>
            キャンセル
          </Button>
          <Button
            onClick={handleSubmitApproval}
            variant="contained"
            color={confirmDialog.action === 'approve' ? 'success' : 'error'}
            disabled={processing}
            startIcon={processing ? <CircularProgress size={20} /> : null}
          >
            {processing
              ? '処理中...'
              : confirmDialog.action === 'approve'
              ? '承認する'
              : '却下する'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

