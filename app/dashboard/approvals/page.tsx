'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Divider,
  Grid,
  Collapse,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { apiClient } from '@/lib/api/client';
import type { Approval, Application } from '@/lib/api/types';
import { useRouter } from 'next/navigation';
import { getCurrentUser, getCurrentUserId, getUserRoleFromId } from '@/lib/utils/auth';
import WorkflowProgress from '@/components/ui/WorkflowProgress';
import { useRageClickHint } from '@/lib/hooks/useRageClickHint';
import { useRageClickStatus } from '@/lib/hooks/useRageClickStatus';

const RAGE_CLICK_TARGET_TITLE = 'Awesome AI Coding Agent ライセンス費用申請';

const getStatusColor = (status: Approval['status']) => {
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

const getStatusLabel = (status: Approval['status'] | Application['status']) => {
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

const getApplicationStatusColor = (status: Application['status']) => {
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

export default function ApprovalsPage() {
  const router = useRouter();
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [applications, setApplications] = useState<Record<string, Application>>({});
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
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const { hasClickedOnce: rageClickHintVisible, registerClick: registerRageClickHint } = useRageClickHint();
  const currentUserEmail = getCurrentUser()?.email ?? null;
  const { ok: rageClickOk } = useRageClickStatus(currentUserEmail, { enabled: rageClickHintVisible });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        const approvalsData = await apiClient.approvals.getApprovals();
        
        console.log('[ApprovalsPage] Fetched approvals:', approvalsData);
        console.log('[ApprovalsPage] Approvals count:', approvalsData.length);

        const applicationPromises = approvalsData.map((approval) => {
          console.log('[ApprovalsPage] Fetching application for approval:', {
            approvalId: approval.id,
            applicationId: approval.applicationId,
          });
          return apiClient.applications.getApplication(approval.applicationId).catch((err) => {
            console.error('[ApprovalsPage] Failed to fetch application:', {
              approvalId: approval.id,
              applicationId: approval.applicationId,
              error: err,
            });
            return null;
          });
        });
        const applicationsData = await Promise.all(applicationPromises);
        console.log('[ApprovalsPage] Fetched applications:', applicationsData);
        
        const applicationsMap: Record<string, Application> = {};
        
        const userId = getCurrentUserId();
        const userRole = getUserRoleFromId(userId);
        
        approvalsData.forEach((approval, index) => {
          if (applicationsData[index]) {
            const application = applicationsData[index]!;
            if (application.type === 'promotion' && userRole !== 'director') {
              return;
            }
            applicationsMap[approval.applicationId] = application;
          } else {
            console.warn('[ApprovalsPage] Application not found for approval:', {
              approvalId: approval.id,
              applicationId: approval.applicationId,
            });
          }
        });
        console.log('[ApprovalsPage] Applications map:', applicationsMap);
        setApplications(applicationsMap);
        
        const filteredApprovals = approvalsData.filter((approval) => {
          const application = applicationsMap[approval.applicationId];
          const included = application !== undefined;
          if (!included) {
            console.warn('[ApprovalsPage] Filtering out approval (no application):', {
              approvalId: approval.id,
              applicationId: approval.applicationId,
            });
          }
          return included;
        });
        console.log('[ApprovalsPage] Filtered approvals:', filteredApprovals);
        console.log('[ApprovalsPage] Filtered approvals count:', filteredApprovals.length);
        setApprovals(filteredApprovals);
      } catch (err) {
        setError(err instanceof Error ? err.message : '承認一覧の取得に失敗しました');
        console.error('承認一覧取得エラー:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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

      const approval = approvals.find(a => a.id === confirmDialog.approvalId);
      if (!approval) {
        setError('承認データが見つかりません。');
        return;
      }

      setProcessing(true);
      await apiClient.approvals.updateApproval(confirmDialog.approvalId, {
        status: confirmDialog.action === 'approve' ? 'approved' : 'rejected',
        comment: confirmDialog.comment || undefined,
        approverId,
        applicationId: approval.applicationId,
      });

      const approvalsData = await apiClient.approvals.getApprovals();
      setApprovals(approvalsData);

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

  const handleToggleExpand = (applicationId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(applicationId)) {
      newExpanded.delete(applicationId);
    } else {
      newExpanded.add(applicationId);
    }
    setExpandedRows(newExpanded);
  };

  const currentUserId = getCurrentUserId();
  
  const getNextApproverInfo = (
    approval: Approval,
    application: Application | null
  ): {
    label: string;
    color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  } => {
    if (!application) {
      return { label: '-', color: 'default' };
    }
    
    if (application.status === 'rejected') {
      return { label: '却下', color: 'error' };
    }
    
    if (application.status === 'approved') {
      if (!application.nextApproverId && !application.nextApproverName) {
        return { label: '最終承認済み', color: 'success' };
      }
      return {
        label: application.nextApproverName || `ID: ${application.nextApproverId}` || '最終承認済み',
        color: 'success',
      };
    }
    
    if (application.status === 'pending') {
      if (application.nextApproverName) {
        return {
          label: application.nextApproverName,
          color: 'warning',
        };
      } else if (application.nextApproverId) {
        return {
          label: `ID: ${application.nextApproverId}`,
          color: 'warning',
        };
      } else {
        return { label: '承認待ち', color: 'warning' };
      }
    }
    
    return { label: '-', color: 'default' };
  };
  
  const pendingApprovals = approvals.filter((a) => {
    if (a.status !== 'pending') return false;
    return currentUserId && a.approverId === currentUserId;
  });

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          承認一覧
        </Typography>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/dashboard')}
        >
          ダッシュボード
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, mt: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3, mt: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : pendingApprovals.length === 0 ? (
          <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
            承認待ちの申請がありません
          </Typography>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                  <TableRow>
                    <TableCell>申請タイトル</TableCell>
                    <TableCell>申請ID</TableCell>
                    <TableCell>申請者</TableCell>
                    <TableCell>次の承認者</TableCell>
                    <TableCell>作成日時</TableCell>
                    <TableCell align="right">操作</TableCell>
                  </TableRow>
              </TableHead>
              <TableBody>
                {pendingApprovals.map((approval) => {
                  const application = applications[approval.applicationId];
                  const isExpanded = expandedRows.has(approval.applicationId);
                  const applicationApprovals: Approval[] = [];
                  const isRageClickTarget = application?.title === RAGE_CLICK_TARGET_TITLE;
                  
                  return (
                    <>
                      <TableRow
                        key={approval.id}
                        hover
                        onClick={() =>
                          window.open(`/dashboard/applications/${approval.applicationId}?from=approvals`, '_blank')
                        }
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleExpand(approval.applicationId);
                              }}
                              sx={{ p: 0.5 }}
                            >
                              {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            </IconButton>
                            {application ? application.title : '読み込み中...'}
                          </Box>
                        </TableCell>
                        <TableCell>{approval.applicationId}</TableCell>
                        <TableCell>
                          {application ? (
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {application.applicantName || `ID: ${application.applicantId}`}
                              </Typography>
                              {application.applicantDepartment && (
                                <Typography variant="caption" color="text.secondary">
                                  {application.applicantDepartment}
                                </Typography>
                              )}
                            </Box>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const nextApproverInfo = getNextApproverInfo(approval, application);
                            return (
                              <Chip
                                label={nextApproverInfo.label}
                                color={nextApproverInfo.color as any}
                                size="small"
                              />
                            );
                          })()}
                        </TableCell>
                        <TableCell>{formatDate(approval.createdAt)}</TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                            {}
                            {currentUserId && String(approval.approverId) === String(currentUserId) && application?.status === 'pending' && (
                              <>
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isRageClickTarget) {
                                      registerRageClickHint();
                                      return;
                                    }
                                    handleOpenDialog(approval.id, 'approve');
                                  }}
                                  aria-label="承認"
                                >
                                  <CheckIcon />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenDialog(approval.id, 'reject');
                                  }}
                                  aria-label="却下"
                                >
                                  <CloseIcon />
                                </IconButton>
                              </>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                      {isRageClickTarget && rageClickHintVisible && (
                        <TableRow>
                          <TableCell colSpan={8} sx={{ py: 1 }}>
                            {rageClickOk ? (
                              <Chip
                                icon={<CheckCircleIcon />}
                                color="success"
                                label="Rage Click操作OK"
                              />
                            ) : (
                              <Alert severity="info" sx={{ py: 0 }}>
                                このボタンは反応しません。もう少し連続してクリックしてみてください（Rage Clickを発生させよう）
                              </Alert>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                      {application && (
                        <TableRow>
                          <TableCell colSpan={8} sx={{ py: 0, borderBottom: isExpanded ? '1px solid rgba(224, 224, 224, 1)' : 'none' }}>
                            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                              <Box sx={{ py: 2 }}>
                                <WorkflowProgress application={application} approvals={applicationApprovals} />
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

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
          {confirmDialog.approvalId && (() => {
            const approval = approvals.find(a => a.id === confirmDialog.approvalId);
            const application = approval ? applications[approval.applicationId] : null;
            return (
              <Grid container spacing={2}>
                {application && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      申請タイトル
                    </Typography>
                    <Typography variant="body1">
                      {application.title}
                    </Typography>
                  </Grid>
                )}
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
            );
          })()}
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

