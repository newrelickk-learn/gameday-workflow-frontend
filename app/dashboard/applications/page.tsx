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
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { apiClient } from '@/lib/api/client';
import { useT, format } from '@/lib/i18n/LocaleProvider';
import { applicationTypeLabel, applicationStatusLabel } from '@/lib/i18n/labels';
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

export default function ApplicationsPage() {
  const t = useT();
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
          setError(t.applications.errorNoLogin);
          setLoading(false);
          return;
        }
        
        const data = await apiClient.applications.getApplications(userId);
        
        const userRole = getUserRoleFromId(userId);
        const filteredData = data.filter((application) => {
          if (application.type === 'promotion') {
            return userRole === 'manager';
          }
          return true;
        });
        
        setApplications(filteredData);
      } catch (err) {
        setError(err instanceof Error ? err.message : t.lists.loadFailed);
        console.error('申請一覧取得エラー:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [t.applications.errorNoLogin, t.lists.loadFailed]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP');
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          {t.lists.applicationsTitle}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/dashboard')}
          >
            {t.lists.toDashboard}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => router.push('/dashboard/applications/new')}
          >
            {t.lists.newApplication}
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
            {t.lists.empty}
          </Typography>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t.lists.number}</TableCell>
                  <TableCell>{t.lists.title}</TableCell>
                  <TableCell>{t.lists.type}</TableCell>
                  <TableCell>{t.lists.applicant}</TableCell>
                  <TableCell>{t.lists.amount}</TableCell>
                  <TableCell>{t.lists.period}</TableCell>
                  <TableCell>{t.lists.status}</TableCell>
                  <TableCell>{t.lists.step}</TableCell>
                  <TableCell>{t.lists.nextApprover}</TableCell>
                  <TableCell>{t.lists.createdAt}</TableCell>
                  <TableCell>{t.lists.updatedAt}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {applications.map((application) => (
                  <TableRow
                    key={application.id}
                    hover
                    onClick={() =>
                      window.open(`/dashboard/applications/${application.id}?from=applications`, '_blank')
                    }
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>{application.applicationNumber ?? '-'}</TableCell>
                    <TableCell>{application.title}</TableCell>
                    <TableCell>{applicationTypeLabel(t, application.type)}</TableCell>
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
                      {application.type === 'expense' && application.amount != null
                        ? `¥${application.amount.toLocaleString()}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {application.type === 'business-trip' && application.startDate && application.endDate
                        ? `${new Date(application.startDate).toLocaleDateString()} - ${new Date(application.endDate).toLocaleDateString()}${application.days !== undefined ? ` (${application.days}${t.lists.daysSuffix})` : ''}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={applicationStatusLabel(t, application.status)}
                        color={getStatusColor(application.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {application.currentStep && application.totalSteps ? (
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {format(t.lists.stepValue, { current: application.currentStep ?? '-', total: application.totalSteps ?? '-' })}
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
                          {t.lists.approvedDone}
                        </Typography>
                      ) : application.status === 'rejected' ? (
                        <Typography variant="body2" color="text.secondary">
                          {t.status.rejected}
                        </Typography>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{formatDate(application.createdAt)}</TableCell>
                    <TableCell>{formatDate(application.updatedAt)}</TableCell>
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

