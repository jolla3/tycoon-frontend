'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Paper, TextField, Button, Typography, Alert, Stack, Link as MuiLink } from '@mui/material';
import Link from 'next/link';
import { authApi } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';
import { useInvalidateSession } from '@/features/auth/session-context';
import { appConfig } from '@/config/app';

export default function LoginPage() {
  const router = useRouter();
  const invalidateSession = useInvalidateSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await authApi.login(email, password);
      invalidateSession();
      router.push(result.role === 'SUPER_ADMIN' ? '/platform' : '/dashboard');
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? 'Incorrect email or password.'
          : 'Unable to sign in right now. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        px: 2,
      }}
    >
      <Paper sx={{ p: 4, width: '100%', maxWidth: 400 }} component="form" onSubmit={handleSubmit}>
        <Button component={Link} href="/" variant="text" size="small" sx={{ mb: 2, color: '#023E8A', alignSelf: 'flex-start' }}>
          ← Back to home
        </Button>
        <Typography variant="h5" gutterBottom>
          {appConfig.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Sign in to your account
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Stack spacing={2}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
            autoFocus
            autoComplete="email"
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
            autoComplete="current-password"
          />
          <Button type="submit" variant="contained" size="large" disabled={submitting} fullWidth>
            {submitting ? 'Signing in…' : 'Sign In'}
          </Button>
        </Stack>

        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
          <MuiLink component={Link} href="/privacy" variant="body2" color="text.secondary">
            Privacy
          </MuiLink>
        </Stack>
      </Paper>
    </Box>
  );
}
