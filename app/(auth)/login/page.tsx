'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Container,
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { apiClient } from '@/lib/api/client';

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [impactedPodName, setImpactedPodName] = useState('');
  const [error, setError] = useState('');
  // GameDay第0章: サーバーがリソース飽和のため、New Relicで特定したPod名の入力が必要な状態
  const [podInputRequired, setPodInputRequired] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiClient.auth.login({
        email,
        password,
        impactedPodName: impactedPodName.trim() || undefined,
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
      }

      // 元々アクセスしようとしていたページがあればそこへ、なければダッシュボードへ。
      // SPAのルート変更ではなくフルページロードにする（New RelicのCore Web Vitals計測が
      // ページ遷移直後から正しく発火するようにするため）。
      const redirect = searchParams.get('redirect');
      window.location.href = redirect && redirect.startsWith('/') ? redirect : '/dashboard';
    } catch (err) {
      const code = (err as { code?: string })?.code;

      if (code === 'POD_SATURATED') {
        setPodInputRequired(true);
        setError(
          '現在サーバーが高負荷のためログインできません。New Relicで問題のPodを確認し、Pod名を入力してください'
        );
      } else {
        setError('ログインに失敗しました');
      }

      console.error(err);
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Typography component="h1" variant="h4" gutterBottom>
            ログイン
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ width: '100%', mt: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="メールアドレス"
              name="email"
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              disabled={loading}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="パスワード"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              disabled={loading}
            />
            {podInputRequired && (
              <TextField
                margin="normal"
                required
                fullWidth
                name="impactedPodName"
                label="問題のあるPod名"
                id="impactedPodName"
                helperText="New RelicのKubernetes Cluster ExplorerでCPU使用率がサチっているPodの名前を確認してください"
                value={impactedPodName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setImpactedPodName(e.target.value)}
                disabled={loading}
              />
            )}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'ログイン'}
            </Button>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
              スタブモード: 任意のメールアドレスとパスワードでログインできます
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
