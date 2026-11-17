'use client';

import { useQuery } from '@tanstack/react-query';
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
import { subscriptionApi } from '@/lib/api/subscription';
import { ProductChips } from '@/features/platform/product-chips';

export default function SettingsPage() {
  const { user } = useSession();
  const { data, isLoading, error } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => subscriptionApi.get(),
    enabled: !!user && user.role !== 'SUPER_ADMIN',
  });

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
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="body2">Products:</Typography>
                  <ProductChips products={data?.subscription?.products} hasSubscription={!!data?.subscription} />
                </Stack>
                {data?.subscription?.endDate ? (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Ends {new Date(data.subscription.endDate).toLocaleDateString()}
                  </Typography>
                ) : null}
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Plans and product access are assigned by the platform administrator. To change them, contact support.
                </Typography>
                <Stack spacing={1.5}>
                  {(data?.plans || []).map((p) => {
                    const isCurrent = p.plan === data?.subscription?.plan;
                    return (
                      <Box key={p.plan} sx={{ p: 1.5, border: '1px solid', borderColor: isCurrent ? 'primary.main' : 'divider', borderRadius: 1 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography fontWeight={600}>{p.label}</Typography>
                            <Typography variant="caption" color="text.secondary">{p.description}</Typography>
                          </Box>
                          {isCurrent ? <Chip size="small" label="Current" color="primary" /> : null}
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
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
