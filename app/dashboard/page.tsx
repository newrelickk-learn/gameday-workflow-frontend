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
import { useT } from '@/lib/i18n/LocaleProvider';
import ChapterMissionPanels from '@/components/ChapterMissionPanels';

export default function DashboardPage() {
  const t = useT();
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
        setError(err instanceof Error ? err.message : t.dashboard.loadFailed);
        console.error('ダッシュボードデータ取得エラー:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [t.dashboard.loadFailed]);

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
          {t.dashboard.heading}
        </Typography>
        <Button
          variant="outlined"
          color="error"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
        >
          {t.common.logout}
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
                {t.dashboard.applications}
              </Typography>
              <Typography variant="h4" component="p" fontWeight="bold" color="primary">
                {applications.length}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {t.dashboard.totalApplications}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                sx={{ mt: 2 }}
                onClick={() => router.push('/dashboard/applications')}
              >
                {t.common.detail}
              </Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h2" gutterBottom>
                {t.dashboard.approvals}
              </Typography>
              <Typography variant="h4" component="p" fontWeight="bold" color="warning.main">
                {pendingApprovals.length}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {t.dashboard.pendingApprovals}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                sx={{ mt: 2 }}
                onClick={() => router.push('/dashboard/approvals')}
              >
                {t.common.detail}
              </Button>
            </CardContent>
          </Card>
        </Grid>
        {(isManager() || isDirector() || isAccounting()) && (
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" component="h2" gutterBottom>
                  {t.dashboard.approved}
                </Typography>
                <Typography variant="h4" component="p" fontWeight="bold" color="success.main">
                  {companyApprovedCount}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {t.dashboard.companyApproved}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  sx={{ mt: 2 }}
                  onClick={() => router.push('/dashboard/company-applications/approved')}
                >
                  {t.common.detail}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        )}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h2" gutterBottom>
                {t.dashboard.manual}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {t.dashboard.manualDetail}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                sx={{ mt: 2 }}
                onClick={() => router.push('/dashboard/manual')}
              >
                {t.common.detail}
              </Button>
            </CardContent>
          </Card>
        </Grid>
        {isHr() && (
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" component="h2" gutterBottom>
                  {t.dashboard.hr}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {t.dashboard.hrDescription}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  sx={{ mt: 2 }}
                  onClick={() => router.push('/dashboard/hr')}
                >
                  {t.common.detail}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      <ChapterMissionPanels />
    </Container>
  );
}

