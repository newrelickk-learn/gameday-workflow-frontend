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
  IconButton,
  Collapse,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { apiClient } from '@/lib/api/client';
import type { Approval, Application } from '@/lib/api/types';
import { useRouter } from 'next/navigation';
import { getCurrentUserId, getUserRoleFromId } from '@/lib/utils/auth';
import WorkflowProgress from '@/components/ui/WorkflowProgress';

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
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

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
                  </TableRow>
              </TableHead>
              <TableBody>
                {pendingApprovals.map((approval) => {
                  const application = applications[approval.applicationId];
                  const isExpanded = expandedRows.has(approval.applicationId);
                  const applicationApprovals: Approval[] = [];

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
                      </TableRow>
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
    </Container>
  );
}

