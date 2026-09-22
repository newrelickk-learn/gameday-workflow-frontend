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
  Link,
} from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { apiClient } from '@/lib/api/client';
import { useT, format } from '@/lib/i18n/LocaleProvider';
import { applicationTypeLabel, applicationStatusLabel } from '@/lib/i18n/labels';
import type { Application, Approval } from '@/lib/api/types';
import { getCurrentUser, getCurrentUserId, isManager, isDirector } from '@/lib/utils/auth';
import WorkflowProgress from '@/components/ui/WorkflowProgress';
import ReceiptCarousel from '@/components/ReceiptCarousel';
import RageClickDiagnosisQuiz from '@/components/RageClickDiagnosisQuiz';
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

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ApplicationDetailPage({ params }: PageProps) {
  const t = useT();
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
  const [chapter4Cleared, setChapter4Cleared] = useState(false);

  const fromPage = searchParams.get('from') || 'applications';

  useEffect(() => {
    apiClient.chapters
      .getClearedChapters()
      .then((cleared) => {
        if (cleared.includes(4)) {
          setChapter4Cleared(true);
        }
      })
      .catch(() => {});

    const handleChapterCleared = (event: Event) => {
      const detail = (event as CustomEvent<{ chapter: number }>).detail;
      if (detail?.chapter === 4) {
        setChapter4Cleared(true);
      }
    };
    window.addEventListener('gameday:chapterCleared', handleChapterCleared);
    return () => {
      window.removeEventListener('gameday:chapterCleared', handleChapterCleared);
    };
  }, []);

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
          setError(t.detail.promotionRestricted);
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
      setError(err instanceof Error ? err.message : t.detail.loadFailed);
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
        setError(t.applications.errorNoLogin);
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
      setError(err instanceof Error ? err.message : t.detail.approvalFailed);
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
          {t.common.back}
        </Button>
        <Typography variant="h4" component="h1" fontWeight="bold">
          {t.detail.title}
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
                          {format(t.detail.number, { number: application.applicationNumber ?? '-' })}
                        </Typography>
                      )}
                    </Box>
                    <Chip
                      label={applicationStatusLabel(t, application.status)}
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
                          if (hasReceipts && !chapter4Cleared) {
                            registerRageClickHint();
                            return;
                          }
                          handleOpenDialog(myPendingApproval.id, 'approve');
                        }}
                      >
                        {t.detail.approve}
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<CloseIcon />}
                        onClick={() => handleOpenDialog(myPendingApproval.id, 'reject')}
                      >
                        {t.detail.reject}
                      </Button>
                    </Box>
                    <Box sx={{ mt: 3 }}>
                      {rageClickOk || chapter4Cleared ? (
                        <RageClickDiagnosisQuiz />
                      ) : (
                        <Alert severity="info">
                          {t.detail.rageClickHintPrefix}
                          <Link
                            href="https://docs.newrelic.com/jp/docs/browser/new-relic-browser/browser-pro-features/user-impact/"
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                              fontWeight: 'bold',
                              textDecoration: 'underline',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.3,
                              verticalAlign: 'middle',
                            }}
                          >
                            {t.detail.rageClickTerm}
                            <OpenInNewIcon sx={{ fontSize: '1rem' }} />
                          </Link>
                          {t.detail.rageClickHintSuffix}
                        </Alert>
                      )}
                    </Box>
                  </Grid>
                )}

                <Grid item xs={12}>
                  <Divider />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {t.applications.type}
                  </Typography>
                  <Typography variant="body1">{applicationTypeLabel(t, application.type)}</Typography>
                </Grid>

                {application.type === 'expense' && application.amount != null && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      {t.applications.amount}
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
                        {t.applications.startDate}
                      </Typography>
                      <Typography variant="body1">
                        {new Date(application.startDate).toLocaleDateString('ja-JP')}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        {t.applications.endDate}
                      </Typography>
                      <Typography variant="body1">
                        {new Date(application.endDate).toLocaleDateString('ja-JP')}
                      </Typography>
                    </Grid>
                    {application.days !== undefined && (
                      <Grid item xs={12} md={4}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          {t.applications.days}
                        </Typography>
                        <Typography variant="body1" fontWeight="bold" color="primary">
                          {application.days}{t.applications.daysUnit}
                        </Typography>
                      </Grid>
                    )}
                  </>
                )}

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {t.detail.applicationId}
                  </Typography>
                  <Typography variant="body1">{application.id}</Typography>
                </Grid>

                {}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {t.lists.applicant}
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
                    {t.applications.description}
                  </Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {application.description}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {t.lists.createdAt}
                  </Typography>
                  <Typography variant="body1">{formatDate(application.createdAt)}</Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {t.lists.updatedAt}
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
                        {t.detail.history}
                      </Typography>
                    </Grid>
                    {approvals.map((approval, index) => (
                      <Grid item xs={12} key={approval.id}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {format(t.detail.historyStep, { n: approval.step || index + 1 })}
                              </Typography>
                              <Typography variant="body1" fontWeight="bold">
                                {approval.approverName || format(t.detail.approverId, { id: approval.approverId })}
                              </Typography>
                              {approval.approverDepartment && (
                                <Typography variant="body2" color="text.secondary">
                                  {approval.approverDepartment}
                                </Typography>
                              )}
                            </Box>
                            <Chip
                              label={applicationStatusLabel(t, approval.status)}
                              color={getStatusColor(approval.status) as any}
                              size="small"
                            />
                          </Box>
                          {approval.comment && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                              {format(t.detail.commentWithValue, { comment: approval.comment })}
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
                  {format(t.detail.receipts, { count: application.receiptImageUrls!.length })}
                </Typography>
                <ReceiptCarousel images={application.receiptImageUrls!} />
              </Paper>
            </Grid>
          )}
        </Grid>
      ) : (
        <Paper sx={{ p: 3 }}>
          <Typography variant="body1" color="text.secondary" align="center">
            {t.detail.notFound}
          </Typography>
        </Paper>
      )}

      {}
      <Dialog open={approvalDialog.open} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {format(t.detail.commentDialogTitle, { action: approvalDialog.action === 'approve' ? t.detail.approve : t.detail.reject })}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t.detail.commentDialogBody}
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            label={t.detail.commentLabel}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t.detail.commentPlaceholder}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            {t.common.cancel}
          </Button>
          <Button
            onClick={handleOpenConfirmDialog}
            variant="contained"
            color={approvalDialog.action === 'approve' ? 'success' : 'error'}
          >
            {t.applications.toConfirm}
          </Button>
        </DialogActions>
      </Dialog>

      {}
      <Dialog open={confirmDialog.open} onClose={handleCloseConfirmDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {format(t.detail.confirmDialogTitle, { action: confirmDialog.action === 'approve' ? t.detail.approve : t.detail.reject })}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {confirmDialog.action === 'approve'
              ? t.detail.confirmApprove
              : t.detail.confirmReject}
          </Typography>
          <Divider sx={{ mb: 3 }} />
          {application && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  {t.lists.applicationTitle}
                </Typography>
                <Typography variant="body1">
                  {application.title}
                </Typography>
              </Grid>
              {confirmDialog.comment && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {t.detail.comment}
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
            {t.common.cancel}
          </Button>
          <Button
            onClick={handleSubmitApproval}
            variant="contained"
            color={confirmDialog.action === 'approve' ? 'success' : 'error'}
            disabled={processing}
            startIcon={processing ? <CircularProgress size={20} /> : null}
          >
            {processing
              ? t.detail.processing
              : confirmDialog.action === 'approve'
              ? t.detail.approveButton
              : t.detail.rejectButton}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

