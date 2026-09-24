'use client';

import { Grid, Card, CardContent, Typography, Box, Stack } from '@mui/material';
import { reportsApi } from '@/lib/api/reports';
import { usePeriod } from '@/features/dashboard/period-context';
import { formatCents, formatNumber } from '@/lib/formatting/currency';
import { CardSkeleton } from '@/components/feedback/card-skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { FreshnessBadge } from '@/components/data-display/freshness-badge';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { useSession } from '@/features/auth/session-context';

// Section 2/13 of the remediation pass: this is the dashboard's headline
// financial data, so it's the clearest place to prove the cache-honesty
// rule end-to-end. If the live /reports/dashboard call fails, we fall back
// to the last cached snapshot for this exact period — but the KPI row
// carries a visible "Cached"/"Stale" badge the entire time, never silently
// presenting old numbers as current.
export function RentStatusSummary() {
  const { period } = usePeriod();
  const { user } = useSession();
  const identity = user ? `${user.clientId}:${user.email}` : 'anon';
  const { data, freshness, cachedAt, isLoading, error } = useCachedQuery(
    `${identity}:reports:dashboard:${period.period}`,
    ['reports', 'dashboard', identity, period.period],
    () => reportsApi.dashboard(period.period)
  );

  if (error) return <ErrorState error={error} />;

  if (isLoading || !data) {
    return (
      <Grid container spacing={2}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <CardSkeleton />
          </Grid>
        ))}
      </Grid>
    );
  }

  const cards = [
    { label: 'Expected', value: formatCents(data.rent.expectedCents), tone: 'text.primary' },
    { label: 'Collected', value: formatCents(data.rent.collectedCents), tone: 'success.main' },
    { label: 'Outstanding', value: formatCents(data.rent.outstandingCents), tone: 'error.main' },
    { label: 'Households', value: `${formatNumber(data.status.paid)} / ${formatNumber(data.houses.total)} paid`, tone: 'text.primary' },
  ];

  return (
    <Stack spacing={1}>
      {freshness !== 'live' && (
        <Box>
          <FreshnessBadge freshness={freshness} cachedAt={cachedAt} />
        </Box>
      )}
      <Grid container spacing={2}>
        {cards.map((c) => (
          <Grid item xs={12} sm={6} md={3} key={c.label}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  {c.label}
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Typography variant="h5" sx={{ fontFamily: '"IBM Plex Mono", monospace', color: c.tone }}>
                    {c.value}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}
