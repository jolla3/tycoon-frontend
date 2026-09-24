'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, Grid, Typography, Stack, Skeleton, Alert } from '@mui/material';
import { Building2, Home, Users, CreditCard, UserRound } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { platformApi } from '@/lib/api/platform';

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
}: {
  label: string;
  value: string | number;
  icon: typeof Building2;
  sub?: string;
}) {
  return (
    <Card sx={{ p: 2, height: '100%' }}>
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Icon size={20} />
        <Box>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="h5" fontWeight={700}>
            {value}
          </Typography>
          {sub ? (
            <Typography variant="caption" color="text.secondary">
              {sub}
            </Typography>
          ) : null}
        </Box>
      </Stack>
    </Card>
  );
}

// local Box import avoided — use Stack only; fix Icon typing via lucide
import { Box } from '@mui/material';

export default function PlatformOverviewPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['platform', 'overview'],
    queryFn: () => platformApi.overview(),
  });

  return (
    <>
      <PageHeader title="Platform overview" description="Cross-client control plane (SUPER_ADMIN)" />
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(error as Error).message || 'Failed to load platform overview'}
        </Alert>
      ) : null}
      {isLoading || !data ? (
        <Grid container spacing={2}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rounded" height={96} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              label="Clients"
              value={data.totalClients}
              icon={Building2}
              sub={`${data.activeClients} active · ${data.inactiveClients} inactive`}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              label="Houses"
              value={data.totalHouses}
              icon={Home}
              sub={`${data.occupiedHouses} occupied · ${data.vacantHouses} vacant`}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              label="Tenants"
              value={data.totalTenants}
              icon={UserRound}
              sub={`${data.activeTenants} active`}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              label="Staff users"
              value={data.totalStaff}
              icon={Users}
              sub={`${data.activeStaff} active`}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              label="Subscriptions"
              value={data.activeSubscriptions}
              icon={CreditCard}
              sub={`${data.pastDueSubscriptions} past due · ${data.canceledSubscriptions} canceled`}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard label="Estates" value={data.totalEstates} icon={Building2} />
          </Grid>
        </Grid>
      )}
    </>
  );
}
