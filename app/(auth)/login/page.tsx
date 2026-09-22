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
import { useT } from '@/lib/i18n/LocaleProvider';
import LanguageToggle from '@/components/LanguageToggle';

function LoginForm() {
  const searchParams = useSearchParams();
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [impactedPodName, setImpactedPodName] = useState('');
  const [error, setError] = useState('');
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

      const redirect = searchParams.get('redirect');
      window.location.href = redirect && redirect.startsWith('/') ? redirect : '/dashboard';
    } catch (err) {
      const code = (err as { code?: string })?.code;

      if (code === 'POD_SATURATED') {
        setPodInputRequired(true);
        setError(
          t.login.podSaturated
        );
      } else {
        setError(t.login.failed);
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
          <Box sx={{ alignSelf: 'flex-end', mb: 1 }}>
            <LanguageToggle />
          </Box>
          <Typography component="h1" variant="h4" gutterBottom>
            {t.login.title}
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
              label={t.login.email}
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
              label={t.login.password}
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
                label={t.login.impactedPod}
                id="impactedPodName"
                helperText={t.login.impactedPodHelper}
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
              {loading ? <CircularProgress size={24} /> : t.login.submit}
            </Button>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
              {t.login.stubMode}
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
