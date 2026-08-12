'use client';

import { useState, useEffect, use } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  TextField,
  MenuItem,
  Button,
  Alert,
  CircularProgress,
  Snackbar,
  Divider,
} from '@mui/material';
import { useRouter } from 'next/navigation';
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

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function HrUserEditPage({ params }: PageProps) {
  const router = useRouter();
  const { id } = use(params);

  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [companyUsers, setCompanyUsers] = useState<User[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isHr()) {
      router.push('/dashboard');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        const [detail, companyUserList] = await Promise.all([
          apiClient.users.getUserDetail(id),
          apiClient.users.getCompanyUsers(),
        ]);
        setTargetUser(detail);
        setCompanyUsers(companyUserList);
        setSelectedManagerId(detail.managerId ? String(detail.managerId) : '');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'ユーザー情報の取得に失敗しました');
        console.error('ユーザー情報取得エラー:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, router]);

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const managerId = selectedManagerId ? parseInt(selectedManagerId, 10) : null;
      const updated = await apiClient.users.updateManager(id, managerId);
      setTargetUser(updated);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '直属の上長の更新に失敗しました');
      console.error('直属の上長更新エラー:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSuccess(false);
  };

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          直属の上長を編集
        </Typography>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/dashboard/hr')}>
          一覧へ戻る
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {targetUser && (
        <Paper sx={{ p: 4 }}>
          <Typography variant="body2" color="text.secondary">
            名前
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {targetUser.name}
          </Typography>

          <Typography variant="body2" color="text.secondary">
            メールアドレス
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {targetUser.email}
          </Typography>

          <Typography variant="body2" color="text.secondary">
            役職
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {getRoleLabel(targetUser.role)}
          </Typography>

          <Typography variant="body2" color="text.secondary">
            部署
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            {targetUser.department || '-'}
          </Typography>

          <Divider sx={{ mb: 3 }} />

          <TextField
            select
            fullWidth
            label="直属の上長"
            value={selectedManagerId}
            onChange={(e) => setSelectedManagerId(e.target.value)}
            disabled={saving}
            sx={{ mb: 3 }}
          >
            <MenuItem value="">未設定</MenuItem>
            {companyUsers
              .filter((u) => u.id !== targetUser.id)
              .map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  {u.name}（{getRoleLabel(u.role)} / ID: {u.id}）
                </MenuItem>
              ))}
          </TextField>

          <Button variant="contained" onClick={handleSave} disabled={saving} fullWidth>
            {saving ? <CircularProgress size={24} /> : '保存する'}
          </Button>
        </Paper>
      )}

      <Snackbar
        open={success}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        message="直属の上長を更新しました"
      />
    </Container>
  );
}
