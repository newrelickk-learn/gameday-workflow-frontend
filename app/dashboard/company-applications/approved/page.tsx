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
} from '@mui/material';
import { useRouter } from 'next/navigation';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { apiClient } from '@/lib/api/client';
import type { Application } from '@/lib/api/types';
import { isManager, isDirector, isAccounting } from '@/lib/utils/auth';

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

export default function ApprovedCompanyApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!(isManager() || isDirector() || isAccounting())) {
      router.push('/dashboard');
      return;
    }

    const fetchApplications = async () => {
      try {
        setLoading(true);
        setError('');
        // applicantIdを指定せず全件取得し、承認済み(approved)だけに絞り込んで表示する
        const data = await apiClient.applications.getApplications();
        setApplications(data.filter((application) => application.status === 'approved'));
      } catch (err) {
        setError(err instanceof Error ? err.message : '承認済み一覧の取得に失敗しました');
        console.error('承認済み一覧取得エラー:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [router]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          承認済み一覧
        </Typography>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/dashboard')}>
          ダッシュボード
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              読み込み中...
            </Typography>
          </Box>
        ) : applications.length === 0 ? (
          <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
            承認済みの申請がありません
          </Typography>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>申請者</TableCell>
                  <TableCell>申請タイプ</TableCell>
                  <TableCell>タイトル</TableCell>
                  <TableCell>ステータス</TableCell>
                  <TableCell>最新コメント</TableCell>
                  <TableCell>作成日時</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {applications.map((application) => (
                  <TableRow key={application.id} hover>
                    <TableCell>{application.applicantName || application.applicantId}</TableCell>
                    <TableCell>{getTypeLabel(application.type)}</TableCell>
                    <TableCell>{application.title}</TableCell>
                    <TableCell>
                      <Chip label="承認済み" color="success" size="small" />
                    </TableCell>
                    <TableCell>{application.latestComment || '-'}</TableCell>
                    <TableCell>{new Date(application.createdAt).toLocaleString('ja-JP')}</TableCell>
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
