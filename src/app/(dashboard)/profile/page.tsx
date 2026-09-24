'use client';

import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, Grid, Stack, TextField, Button, Alert, Typography, Chip } from '@mui/material';
import { PageHeader } from '@/components/layout/page-header';
import { profileApi } from '@/lib/api/profile';
import { useInvalidateSession, useSession } from '@/features/auth/session-context';
import { useUpdateProfile } from '@/features/profile/use-update-profile';
import { ApiError } from '@/lib/api/client';

export default function ProfilePage() {
  const { user } = useSession();
  const invalidateSession = useInvalidateSession();

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const { save, state: saveState, message: saveMessage } = useUpdateProfile();

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone ?? '');
    }
  }, [user]);

  useEffect(() => {
    if (saveState === 'confirmed') invalidateSession();
  }, [saveState, invalidateSession]);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const changePassword = useMutation({
    mutationFn: () => profileApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setPasswordMessage({ type: 'success', text: 'Password changed.' });
      setCurrentPassword('');
      setNewPassword('');
    },
    onError: (err) => setPasswordMessage({ type: 'error', text: err instanceof ApiError ? err.message : 'Unable to change password.' }),
  });

  return (
    <>
      <PageHeader title="Profile" description="Your account information" />

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2.5 }}>
            <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
              Account
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Chip size="small" label={user?.role} variant="outlined" />
              <Chip size="small" label={user?.email} variant="outlined" />
            </Stack>
            {saveMessage && (
              <Alert severity={saveState === 'error' ? 'error' : saveState === 'queued' ? 'warning' : 'success'} sx={{ mb: 1.5 }}>
                {saveMessage}
              </Alert>
            )}
            <Stack spacing={1.5}>
              <TextField label="Full name" value={name} onChange={(e) => setName(e.target.value)} size="small" />
              <TextField label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} size="small" />
              <Button
                variant="contained"
                disabled={saveState === 'saving'}
                onClick={() => save({ name, phone })}
                sx={{ alignSelf: 'flex-start' }}
              >
                {saveState === 'saving' ? 'Saving…' : 'Save changes'}
              </Button>
            </Stack>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2.5 }}>
            <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
              Change password
            </Typography>
            {passwordMessage && (
              <Alert severity={passwordMessage.type} sx={{ mb: 1.5 }} onClose={() => setPasswordMessage(null)}>
                {passwordMessage.text}
              </Alert>
            )}
            <Stack spacing={1.5}>
              <TextField label="Current password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} size="small" />
              <TextField label="New password" type="password" helperText="At least 8 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} size="small" />
              <Button
                variant="outlined"
                disabled={!currentPassword || newPassword.length < 8 || changePassword.isPending}
                onClick={() => {
                  setPasswordMessage(null);
                  changePassword.mutate();
                }}
                sx={{ alignSelf: 'flex-start' }}
              >
                {changePassword.isPending ? 'Changing…' : 'Change password'}
              </Button>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </>
  );
}
