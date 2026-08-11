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
import type { Notification } from '@/lib/api/types';
import { getCurrentUserId } from '@/lib/utils/auth';

const getNotificationTypeLabel = (type: Notification['notificationType']) => {
  switch (type) {
    case 'ApprovalRequest':
      return '承認依頼';
    case 'ApprovalCompleted':
      return '承認完了';
    case 'ApprovalRejected':
      return '却下';
    case 'WorkflowCompleted':
      return '申請完了';
    default:
      return type;
  }
};

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
        // 新しい通知が上に来るように並べる
        const sorted = [...data].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setNotifications(sorted);
      } catch (err) {
        setError(err instanceof Error ? err.message : '通知の取得に失敗しました');
        console.error('通知取得エラー:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
          通知一覧
        </Typography>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/dashboard')}
        >
          ダッシュボードへ戻る
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {notifications.length === 0 && !error ? (
        <Alert severity="info">通知はまだありません</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>受信日時</TableCell>
                <TableCell>種類</TableCell>
                <TableCell>件名</TableCell>
                <TableCell>内容</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {notifications.map((notification) => (
                <TableRow key={notification.id}>
                  <TableCell>{formatDateTime(notification.createdAt)}</TableCell>
                  <TableCell>
                    <Chip
                      label={getNotificationTypeLabel(notification.notificationType)}
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
