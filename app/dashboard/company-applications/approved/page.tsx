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
import { useT } from '@/lib/i18n/LocaleProvider';
import { applicationTypeLabel, applicationStatusLabel } from '@/lib/i18n/labels';
import type { Application } from '@/lib/api/types';
import { isManager, isDirector, isAccounting } from '@/lib/utils/auth';
import SlowApprovedListDiagnosisQuiz from '@/components/SlowApprovedListDiagnosisQuiz';

export default function ApprovedCompanyApplicationsPage() {
  const t = useT();
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
        const data = await apiClient.applications.getApplications();
        setApplications(data.filter((application) => application.status === 'approved'));
      } catch (err) {
        setError(err instanceof Error ? err.message : t.lists.loadApprovedFailed);
        console.error('承認済み一覧取得エラー:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [router, t.lists.loadApprovedFailed]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          {t.lists.approvedTitle}
        </Typography>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/dashboard')}>
          {t.lists.toDashboard}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <SlowApprovedListDiagnosisQuiz />

      <Paper sx={{ p: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              {t.lists.loading}
            </Typography>
          </Box>
        ) : applications.length === 0 ? (
          <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
            {t.lists.emptyApproved}
          </Typography>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t.lists.applicant}</TableCell>
                  <TableCell>{t.lists.applicationType}</TableCell>
                  <TableCell>{t.lists.title}</TableCell>
                  <TableCell>{t.lists.status}</TableCell>
                  <TableCell>{t.lists.latestComment}</TableCell>
                  <TableCell>{t.lists.createdAt}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {applications.map((application) => (
                  <TableRow key={application.id} hover>
                    <TableCell>{application.applicantName || application.applicantId}</TableCell>
                    <TableCell>{applicationTypeLabel(t, application.type)}</TableCell>
                    <TableCell>{application.title}</TableCell>
                    <TableCell>
                      <Chip label={t.status.approved} color="success" size="small" />
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
