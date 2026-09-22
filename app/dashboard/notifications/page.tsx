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
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { useT } from '@/lib/i18n/LocaleProvider';
import { notificationTypeLabel } from '@/lib/i18n/labels';
import type { Notification } from '@/lib/api/types';
import { getCurrentUserId } from '@/lib/utils/auth';

const getNotificationTypeColor = (
  type: Notification['notificationType']
): 'warning' | 'success' | 'error' | 'default' => {
  switch (type) {
    case 'ApprovalRequest':
      return 'warning';
    case 'ApprovalCompleted':
    case 'WorkflowCompleted':
      return 'success';
    case 'ApprovalRejected':
      return 'error';
    default:
      return 'default';
  }
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('ja-JP');
};

export default function NotificationsPage() {
  const t = useT();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        const userId = getCurrentUserId();
        if (!userId) {
          setNotifications([]);
          return;
        }
        const data = await apiClient.notifications.getNotificationHistory(userId);
        const sorted = [...data].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setNotifications(sorted);
      } catch (err) {
        setError(err instanceof Error ? err.message : t.lists.loadNotificationsFailed);
        console.error('通知取得エラー:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [t.lists.loadNotificationsFailed]);

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
          {t.lists.notificationsTitle}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/dashboard')}
        >
          {t.lists.backToDashboard}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {notifications.length === 0 && !error ? (
        <Alert severity="info">{t.lists.emptyNotifications}</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t.lists.receivedAt}</TableCell>
                <TableCell>{t.lists.kind}</TableCell>
                <TableCell>{t.lists.subject}</TableCell>
                <TableCell>{t.lists.body}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {notifications.map((notification) => (
                <TableRow key={notification.id}>
                  <TableCell>{formatDateTime(notification.createdAt)}</TableCell>
                  <TableCell>
                    <Chip
                      label={notificationTypeLabel(t, notification.notificationType)}
                      color={getNotificationTypeColor(notification.notificationType)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{notification.subject}</TableCell>
                  <TableCell>{notification.body}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
}
