'use client';

import { Card, CardContent, Typography, Stack, Box } from '@mui/material';
import { paymentsApi } from '@/lib/api/payments';
import { formatCents } from '@/lib/formatting/currency';
import { dateFormat } from '@/lib/dates/period';
import { CardSkeleton } from '@/components/feedback/card-skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { FreshnessBadge } from '@/components/data-display/freshness-badge';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { useSession } from '@/features/auth/session-context';
import { identityKeyFromUser } from '@/lib/session/local-session-marker';

export function RecentPaymentsCard() {
  const { user } = useSession();
  const identity = user ? identityKeyFromUser(user) : 'anon';
  const { data, isLoading, error, freshness, cachedAt } = useCachedQuery(
    `${identity}:payments:recent`,
    ['payments', 'recent', identity],
    () => paymentsApi.list({ page: 1, limit: 5 })
  );

  if (error && !data) return <ErrorState error={error} />;
  if (isLoading && !data) return <CardSkeleton lines={4} />;

  const items = data?.items ?? [];

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Typography variant="subtitle1">Recent Payments</Typography>
          {freshness !== 'live' ? <FreshnessBadge freshness={freshness} cachedAt={cachedAt} /> : null}
        </Stack>
        {items.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No confirmed payments yet.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {items.map((p) => (
              <Stack key={p._id} direction="row" justifyContent="space-between" sx={{ py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box>
                  <Typography variant="body2">{p.paymentReference ?? 'Payment'}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {dateFormat(p.paymentDate, 'DD MMM YYYY')} · {p.period}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ fontFamily: '"IBM Plex Mono", monospace' }}>
                  {formatCents(p.amountCents)}
                </Typography>
              </Stack>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
