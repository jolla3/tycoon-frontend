'use client';

import { useQuery } from '@tanstack/react-query';
import { Box, Card, Grid, Skeleton, Stack, Typography } from '@mui/material';
import { Building2, CreditCard, Home, UserRound, Users, type LucideIcon } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ErrorState } from '@/components/feedback/error-state';
import { EvidenceView } from '@/features/platform/evidence-view';
import { platformApi } from '@/lib/api/platform';
import { platformKeys } from '@/lib/query/keys';

function StatCard({ label, value, icon: Icon, sub }: { label: string; value: string | number; icon: LucideIcon; sub?: string }) {
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

function Section({ title, caption, data }: { title: string; caption: string; data: unknown }) {
  return (
    <Card sx={{ p: 2.5, height: '100%' }}>
      <Typography variant="subtitle1" fontWeight={600}>
        {title}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        {caption}
      </Typography>
      <EvidenceView data={data} />
    </Card>
  );
}

export default function PlatformOverviewPage() {
  const { data, isLoading, error } = useQuery({ queryKey: platformKeys.overview(), queryFn: () => platformApi.overview() });

  return (
    <>
      <PageHeader title="Platform overview" description="Cross-client control plane. Product assignments and integration evidence are shown separately." />
      {error ? <ErrorState error={error} /> : null}
      {isLoading || !data ? (
        error ? null : (
          <Grid container spacing={2}>
            {[1, 2, 3, 4].map((i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <Skeleton variant="rounded" height={96} />
              </Grid>
            ))}
          </Grid>
        )
      ) : (
        <Stack spacing={3}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard label="Clients" value={data.totalClients} icon={Building2} sub={`${data.activeClients} active · ${data.inactiveClients} inactive`} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard label="Estates" value={data.totalEstates} icon={Building2} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard label="Houses" value={data.totalHouses} icon={Home} sub={`${data.occupiedHouses} occupied · ${data.vacantHouses} vacant`} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard label="Tenants" value={data.totalTenants} icon={UserRound} sub={`${data.activeTenants} active`} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard label="Staff users" value={data.totalStaff} icon={Users} sub={`${data.activeStaff} active · ${data.inactiveStaff} inactive`} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard label="Active subscriptions" value={data.activeSubscriptions} icon={CreditCard} sub={`${data.pastDueSubscriptions} past due · ${data.canceledSubscriptions} canceled`} />
            </Grid>
          </Grid>
          <Grid container spacing={2}>
            {data.productAssignments ? (
              <Grid item xs={12} md={4}>
                <Section title="Product assignments" caption="Entitlement: what clients are allowed to use." data={data.productAssignments} />
              </Grid>
            ) : null}
            {data.bankingIntegration ? (
              <Grid item xs={12} md={4}>
                <Section title="Banking integration" caption="Evidence from stored records. Not an entitlement and not a live provider check." data={data.bankingIntegration} />
              </Grid>
            ) : null}
            {data.mpesaIntegration ? (
              <Grid item xs={12} md={4}>
                <Section title="M-PESA integration" caption="Evidence from stored records. Not an entitlement and not a live provider check." data={data.mpesaIntegration} />
              </Grid>
            ) : null}
          </Grid>
        </Stack>
      )}
    </>
  );
}
