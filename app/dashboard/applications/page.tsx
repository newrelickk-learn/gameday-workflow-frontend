'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
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
  IconButton,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { apiClient } from '@/lib/api/client';
import type { Application } from '@/lib/api/types';
import { getCurrentUserId, getUserRoleFromId, isManager } from '@/lib/utils/auth';

const getStatusColor = (status: Application['status']) => {
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

const getStatusLabel = (status: Application['status']) => {
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

export default function ApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setLoading(true);
        setError('');
        const userId = getCurrentUserId();
        if (!userId) {
          setError('ログイン情報が見つかりません。再度ログインしてください。');
          setLoading(false);
          return;
        }
        
        // 自分の申請のみを取得（applicantIdでフィルタリング）
        const data = await apiClient.applications.getApplications(userId);
        
        // プロモーション申請は上長だけに表示（追加フィルタリング）
        const userRole = getUserRoleFromId(userId);
        const filteredData = data.filter((application) => {
          // プロモーション申請は上長だけに表示
          if (application.type === 'promotion') {
            return userRole === 'manager';
          }
          return true;
        });
        
        setApplications(filteredData);
      } catch (err) {
        setError(err instanceof Error ? err.message : '申請一覧の取得に失敗しました');
        console.error('申請一覧取得エラー:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP');
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          申請一覧
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/dashboard')}
          >
            ダッシュボード
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => router.push('/dashboard/applications/new')}
          >
            新規申請
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : applications.length === 0 ? (
          <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
            申請がありません
          </Typography>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>タイトル</TableCell>
                  <TableCell>タイプ</TableCell>
                  <TableCell>申請者</TableCell>
                  <TableCell>金額</TableCell>
                  <TableCell>期間</TableCell>
                  <TableCell>ステータス</TableCell>
                  <TableCell>承認ステップ</TableCell>
                  <TableCell>次の承認者</TableCell>
                  <TableCell>作成日時</TableCell>
                  <TableCell>更新日時</TableCell>
                  <TableCell align="right">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {applications.map((application) => (
                  <TableRow key={application.id} hover>
                    <TableCell>{application.title}</TableCell>
                    <TableCell>{getTypeLabel(application.type)}</TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
                      {application.type === 'expense' && application.amount !== undefined
                        ? `¥${application.amount.toLocaleString()}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {application.type === 'business-trip' && application.startDate && application.endDate
                        ? `${new Date(application.startDate).toLocaleDateString('ja-JP')} 〜 ${new Date(application.endDate).toLocaleDateString('ja-JP')}${application.days !== undefined ? ` (${application.days}日)` : ''}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(application.status)}
                        color={getStatusColor(application.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {application.currentStep && application.totalSteps ? (
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            ステップ {application.currentStep} / {application.totalSteps}
                          </Typography>
                        </Box>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {application.nextApproverId ? (
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {application.nextApproverName || `ID: ${application.nextApproverId}`}
                          </Typography>
                          {application.nextApproverDepartment && (
                            <Typography variant="caption" color="text.secondary">
                              {application.nextApproverDepartment}
                            </Typography>
                          )}
                        </Box>
                      ) : application.status === 'approved' ? (
                        <Typography variant="body2" color="text.secondary">
                          承認完了
                        </Typography>
                      ) : application.status === 'rejected' ? (
                        <Typography variant="body2" color="text.secondary">
                          却下
                        </Typography>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{formatDate(application.createdAt)}</TableCell>
                    <TableCell>{formatDate(application.updatedAt)}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => router.push(`/dashboard/applications/${application.id}?from=applications`)}
                        aria-label="詳細を見る"
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Container>
  );
}

