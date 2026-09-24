'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Stack,
  Typography,
  Button,
  Divider,
  Box,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Settings, User, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { useSession } from '@/features/auth/session-context';
import { subscriptionApi, type SubscriptionPlan } from '@/lib/api/subscription';

const PLAN_ORDER: SubscriptionPlan[] = ['trial', 'basic', 'pro'];

export default function SettingsPage() {
  const { user } = useSession();
  const qc = useQueryClient();
  const [upgradeError, setUpgradeError] = useState<string | null>(null);

  const canManage =
    user?.role === 'CLIENT_OWNER' || user?.role === 'CLIENT_ADMIN';

  const { data, isLoading, error } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => subscriptionApi.get(),
    enabled: !!user && user.role !== 'SUPER_ADMIN',
  });

  const upgrade = useMutation({
    mutationFn: (plan: Extract<SubscriptionPlan, 'basic' | 'pro'>) =>
      subscriptionApi.upgrade(plan),
    onSuccess: () => {
      setUpgradeError(null);
      qc.invalidateQueries({ queryKey: ['subscription'] });
    },
    onError: (err: Error) => {
      setUpgradeError(err.message || 'Upgrade failed');
    },
  });

  const currentPlan = data?.subscription?.plan;
  const currentRank = currentPlan ? PLAN_ORDER.indexOf(currentPlan) : -1;

  return (
    <>
      <PageHeader title="Settings" description="Account and subscription" />
      <Stack spacing={2} maxWidth={640}>
        <Card sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Profile & security
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Name, phone, and password are managed on your profile page against live backend endpoints.
          </Typography>
          {user ? (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Signed in as {user.name} ({user.email}) · role {user.role}
            </Typography>
          ) : null}
          <Button component={Link} href="/profile" variant="outlined" startIcon={<User size={16} />}>
            Open profile
          </Button>
        </Card>

        {user?.role !== 'SUPER_ADMIN' ? (
          <Card sx={{ p: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <CreditCard size={18} />
              <Typography variant="subtitle1">Subscription</Typography>
            </Stack>
            {isLoading ? (
              <CircularProgress size={24} />
            ) : error ? (
              <Alert severity="error">{(error as Error).message || 'Failed to load subscription'}</Alert>
            ) : (
              <>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="body2">Current plan:</Typography>
                  <Chip
                    size="small"
                    label={data?.subscription?.plan ?? 'none'}
                    color={data?.subscription?.status === 'active' ? 'success' : 'default'}
                  />
                  {data?.subscription?.status ? (
                    <Chip size="small" label={data.subscription.status} variant="outlined" />
                  ) : null}
                </Stack>
                {upgradeError ? (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {upgradeError}
                  </Alert>
                ) : null}
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Available plans from backend:
                </Typography>
                <Stack spacing={1.5}>
                  {(data?.plans || []).map((p) => {
                    const rank = PLAN_ORDER.indexOf(p.plan);
                    const isCurrent = p.plan === currentPlan;
                    const canUpgrade =
                      canManage &&
                      !isCurrent &&
                      (p.plan === 'basic' || p.plan === 'pro') &&
                      rank > currentRank;
                    return (
                      <Box
                        key={p.plan}
                        sx={{
                          p: 1.5,
                          border: '1px solid',
                          borderColor: isCurrent ? 'primary.main' : 'divider',
                          borderRadius: 1,
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography fontWeight={600}>{p.label}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {p.description}
                            </Typography>
                          </Box>
                          {isCurrent ? (
                            <Chip size="small" label="Current" color="primary" />
                          ) : canUpgrade ? (
                            <Button
                              size="small"
                              variant="contained"
                              disabled={upgrade.isPending}
                              onClick={() => upgrade.mutate(p.plan as 'basic' | 'pro')}
                            >
                              Upgrade
                            </Button>
                          ) : (
                            <Chip size="small" label="—" variant="outlined" />
                          )}
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
                {!canManage ? (
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    Only CLIENT_OWNER / CLIENT_ADMIN can upgrade plans.
                  </Typography>
                ) : null}
              </>
            )}
          </Card>
        ) : null}

        <Card sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Related configuration
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Only links to capabilities the product already exposes. No fake toggles.
          </Typography>
          <Stack spacing={1}>
            <Button component={Link} href="/banking" variant="outlined" size="small" sx={{ justifyContent: 'flex-start' }}>
              Banking — accounts & integration status
            </Button>
            <Button component={Link} href="/sms" variant="outlined" size="small" sx={{ justifyContent: 'flex-start' }}>
              SMS — provider queue, broadcast, history
            </Button>
            <Button component={Link} href="/profile" variant="outlined" size="small" sx={{ justifyContent: 'flex-start' }}>
              Security — password & contact on profile
            </Button>
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Stack direction="row" spacing={1} alignItems="center" color="text.secondary">
            <Settings size={16} />
            <Typography variant="caption">
              Property defaults (due day, currency) are managed per estate and house billing configuration.
            </Typography>
          </Stack>
        </Card>
      </Stack>
    </>
  );
}
