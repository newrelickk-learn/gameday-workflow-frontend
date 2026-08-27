'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import type { Application, Approval } from '@/lib/api/types';
import { getCurrentUserId, getUserRoleFromId, isHr, isManager, isDirector, isAccounting } from '@/lib/utils/auth';
import { setNewRelicUserId } from '@/lib/newrelic-browser';

export default function DashboardPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [companyApprovedCount, setCompanyApprovedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        const userId = getCurrentUserId();
        const isApprover = isManager() || isDirector() || isAccounting();
        const [applicationsData, approvalsData, approvedCount] = await Promise.all([
          apiClient.applications.getApplications(userId ?? undefined),
          apiClient.approvals.getApprovals(),
          isApprover ? apiClient.applications.getApplicationsCount('approved') : Promise.resolve(0),
        ]);

        const userRole = getUserRoleFromId(userId);
        const filteredApplications = applicationsData.filter((application) => {
          if (application.type === 'promotion') {
            return userRole === 'manager';
          }
          return true;
        });

        setApplications(filteredApplications);
        setApprovals(approvalsData);
        setCompanyApprovedCount(approvedCount);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
        console.error('ダッシュボードデータ取得エラー:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const pendingApprovals = approvals.filter((app) => app.status === 'pending');

  const handleLogout = () => {
    setNewRelicUserId(null, true);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    router.push('/login');
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          ダッシュボード
        </Typography>
        <Button
          variant="outlined"
          color="error"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
        >
          ログアウト
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, mt: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h2" gutterBottom>
                申請一覧
              </Typography>
              <Typography variant="h4" component="p" fontWeight="bold" color="primary">
                {applications.length}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                総申請数
              </Typography>
              <Button
                variant="outlined"
                size="small"
                sx={{ mt: 2 }}
                onClick={() => router.push('/dashboard/applications')}
              >
                詳細を見る
              </Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h2" gutterBottom>
                承認待ち
              </Typography>
              <Typography variant="h4" component="p" fontWeight="bold" color="warning.main">
                {pendingApprovals.length}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                承認待ちの申請
              </Typography>
              <Button
                variant="outlined"
                size="small"
                sx={{ mt: 2 }}
                onClick={() => router.push('/dashboard/approvals')}
              >
                詳細を見る
              </Button>
            </CardContent>
          </Card>
        </Grid>
        {(isManager() || isDirector() || isAccounting()) && (
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" component="h2" gutterBottom>
                  承認済み一覧
                </Typography>
                <Typography variant="h4" component="p" fontWeight="bold" color="success.main">
                  {companyApprovedCount}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  自社の承認済みの申請
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  sx={{ mt: 2 }}
                  onClick={() => router.push('/dashboard/company-applications/approved')}
                >
                  詳細を見る
                </Button>
              </CardContent>
            </Card>
          </Grid>
        )}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h2" gutterBottom>
                マニュアル
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                各種申請の書き方や承認フローの説明
              </Typography>
              <Button
                variant="outlined"
                size="small"
                sx={{ mt: 2 }}
                onClick={() => router.push('/dashboard/manual')}
              >
                詳細を見る
              </Button>
            </CardContent>
          </Card>
        </Grid>
        {isHr() && (
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" component="h2" gutterBottom>
                  人事部
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  自社ユーザーの直属の上長を編集
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  sx={{ mt: 2 }}
                  onClick={() => router.push('/dashboard/hr')}
                >
                  詳細を見る
                </Button>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Container>
  );
}

