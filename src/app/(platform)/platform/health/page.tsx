'use client';

import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Grid, Skeleton, Stack, Typography } from '@mui/material';
import { PageHeader } from '@/components/layout/page-header';
import { ErrorState } from '@/components/feedback/error-state';
import { EvidenceView } from '@/features/platform/evidence-view';
import { platformApi, type PlatformHealth } from '@/lib/api/platform';
import { platformKeys } from '@/lib/query/keys';
import { dateFormat } from '@/lib/dates/period';

const SECTIONS: Array<{ key: keyof PlatformHealth; title: string; caption?: string }> = [
  { key: 'application', title: 'Application' },
  { key: 'mongo', title: 'MongoDB' },
  { key: 'redis', title: 'Redis' },
  { key: 'scheduler', title: 'Scheduler and jobs' },
  { key: 'banking', title: 'Banking', caption: 'Configured, implemented, provider-verified and operational are separate claims.' },
  { key: 'mpesa', title: 'M-PESA', caption: 'Configured, implemented, provider-verified and operational are separate claims.' },
  { key: 'sms', title: 'SMS', caption: 'Reports provider configuration. It does not prove messages were delivered.' },
];

export default function PlatformHealthPage() {
  const { data, isLoading, error, dataUpdatedAt } = useQuery({ queryKey: platformKeys.health(), queryFn: () => platformApi.health(), refetchInterval: 60_000 });

  return (
    <>
      <PageHeader title="System health" description="Evidence reported by the backend. This page makes no live calls to banks, M-PESA or the SMS provider." />
      {error ? <ErrorState error={error} /> : null}
      {isLoading ? (
        <Grid container spacing={2}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} lg={6} key={i}>
              <Skeleton variant="rounded" height={140} />
            </Grid>
          ))}
        </Grid>
      ) : data ? (
        <Stack spacing={2}>
          <Alert severity="info">
            Last reported {data.generatedAt ? dateFormat(data.generatedAt, 'DD MMM YYYY HH:mm') : dateFormat(new Date(dataUpdatedAt).toISOString(), 'DD MMM YYYY HH:mm')}. A &quot;configured&quot; state means settings exist, not that the provider is reachable.
          </Alert>
          <Grid container spacing={2}>
            {SECTIONS.map(({ key, title, caption }) => {
              const section = data[key];
              if (section === undefined) return null;
              return (
                <Grid item xs={12} lg={6} key={key}>
                  <Card sx={{ p: 2.5, height: '100%' }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {title}
                    </Typography>
                    {caption ? (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                        {caption}
                      </Typography>
                    ) : (
                      <div style={{ height: 12 }} />
                    )}
                    <EvidenceView data={section} />
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Stack>
      ) : null}
    </>
  );
}
