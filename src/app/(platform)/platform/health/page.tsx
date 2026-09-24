'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, Typography, Stack, Chip, Alert, Skeleton, Divider, Box } from '@mui/material';
import { Activity } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { platformApi } from '@/lib/api/platform';
import { dateFormat } from '@/lib/dates/period';

function statusColor(s: string): 'success' | 'error' | 'warning' | 'default' {
  const v = (s || '').toLowerCase();
  if (v === 'ok' || v === 'up' || v === 'healthy' || v === 'connected') return 'success';
  if (v === 'down' || v === 'error' || v === 'failed') return 'error';
  if (v === 'degraded' || v === 'unknown') return 'warning';
  return 'default';
}

export default function PlatformHealthPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['platform', 'health'],
    queryFn: () => platformApi.health(),
    refetchInterval: 30_000,
  });

  return (
    <>
      <PageHeader title="System health" description="Live dependency and job status from the backend" />
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {(error as Error).message || 'Failed to load health'}
        </Alert>
      ) : null}
      {isLoading || !data ? (
        <Skeleton variant="rounded" height={240} />
      ) : (
        <Stack spacing={2}>
          <Card sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Application
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip label={`App: ${data.application}`} color={statusColor(data.application)} size="small" />
              <Chip label={`Mongo: ${data.mongo}`} color={statusColor(data.mongo)} size="small" />
              <Chip
                label={`Redis: ${data.redis}${data.redisLatencyMs != null ? ` (${data.redisLatencyMs}ms)` : ''}`}
                color={statusColor(data.redis)}
                size="small"
              />
            </Stack>
          </Card>

          <Card sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Bank provider
            </Typography>
            <Typography variant="body2">
              {data.bankProvider?.name || '—'} · configured={String(data.bankProvider?.configured)} ·
              implemented={String(data.bankProvider?.implemented)} · liveVerified=
              {String(data.bankProvider?.liveVerified)}
            </Typography>
            {data.otherBankProviders?.length ? (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                Other: {data.otherBankProviders.map((p) => `${p.name}(${p.implemented ? 'yes' : 'no'})`).join(', ')}
              </Typography>
            ) : null}
          </Card>

          <Card sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              SMS provider
            </Typography>
            <Typography variant="body2">
              {data.smsProvider?.name || '—'} · configured={String(data.smsProvider?.configured)} ·
              implemented={String(data.smsProvider?.implemented)} · liveVerified=
              {String(data.smsProvider?.liveVerified)}
            </Typography>
          </Card>

          <Card sx={{ p: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <Activity size={16} />
              <Typography variant="subtitle1">Background jobs</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Multi-instance safe: {String(data.backgroundJobs?.multiInstanceSafe)}
              {data.backgroundJobs?.schedulerStartedAt
                ? ` · started ${dateFormat(data.backgroundJobs.schedulerStartedAt, 'DD MMM YYYY HH:mm')}`
                : ''}
            </Typography>
            <Divider sx={{ my: 1 }} />
            {Array.isArray(data.backgroundJobs?.jobs) &&
            data.backgroundJobs.jobs.length &&
            typeof data.backgroundJobs.jobs[0] !== 'string' ? (
              (data.backgroundJobs.jobs as Array<{
                name: string;
                status?: string;
                lastRunAt?: string | null;
                lastSuccessAt?: string | null;
                lastError?: string | null;
              }>).map((j) => (
                <Box key={j.name} sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography fontWeight={600}>{j.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    status={j.status || '—'} · lastRun=
                    {j.lastRunAt ? dateFormat(j.lastRunAt, 'DD MMM HH:mm') : '—'}
                    {j.lastError ? ` · error: ${j.lastError}` : ''}
                  </Typography>
                </Box>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                No job detail available
              </Typography>
            )}
          </Card>
        </Stack>
      )}
    </>
  );
}
