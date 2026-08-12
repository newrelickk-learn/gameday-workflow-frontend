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
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { apiClient } from '@/lib/api/client';
import type { User } from '@/lib/api/types';
import { isHr } from '@/lib/utils/auth';

const getRoleLabel = (role: User['role']) => {
  switch (role) {
    case 'director':
      return '本部長';
    case 'accounting':
      return '経理';
    case 'manager':
      return '上長';
    case 'engineer':
      return 'エンジニア';
    case 'hr':
      return '人事部';
    default:
      return role;
  }
};

export default function HrUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isHr()) {
      router.push('/dashboard');
      return;
    }

    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await apiClient.users.getCompanyUsers();
        setUsers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '自社ユーザー一覧の取得に失敗しました');
        console.error('自社ユーザー一覧取得エラー:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [router]);

  const getUserName = (id: number | null | undefined) => {
    if (!id) return '未設定';
    const user = users.find((u) => u.id === String(id));
    return user ? `${user.name}（ID: ${id}）` : `ID: ${id}`;
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          人事部: ユーザー一覧
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
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : users.length === 0 ? (
          <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
            ユーザーがいません
          </Typography>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>名前</TableCell>
                  <TableCell>メールアドレス</TableCell>
                  <TableCell>役職</TableCell>
                  <TableCell>部署</TableCell>
                  <TableCell>直属の上長</TableCell>
                  <TableCell align="right">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip label={getRoleLabel(user.role)} size="small" />
                    </TableCell>
                    <TableCell>{user.department || '-'}</TableCell>
                    <TableCell>{getUserName(user.managerId)}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => router.push(`/dashboard/hr/${user.id}`)}
                        aria-label="上長を編集"
                      >
                        <EditIcon />
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
