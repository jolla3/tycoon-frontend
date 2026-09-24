'use client';

import { Card, CardContent, Typography, Stack, Chip, Box, Button } from '@mui/material';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { transactionsApi } from '@/lib/api/transactions';
import { formatCents } from '@/lib/formatting/currency';
import { CardSkeleton } from '@/components/feedback/card-skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { FreshnessBadge } from '@/components/data-display/freshness-badge';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { useSession } from '@/features/auth/session-context';
import { identityKeyFromUser } from '@/lib/session/local-session-marker';

export function UnmatchedTransactionsCard() {
  const { user } = useSession();
  const identity = user ? identityKeyFromUser(user) : 'anon';
  const { data, isLoading, error, freshness, cachedAt } = useCachedQuery(
    `${identity}:transactions:unmatched`,
    ['transactions', 'unmatched', identity],
    () => transactionsApi.unmatched()
  );

  if (error && !data) return <ErrorState error={error} />;
  if (isLoading && !data) return <CardSkeleton lines={3} />;

  const items = data ?? [];

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Typography variant="subtitle1">Unmatched Transactions</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            {freshness !== 'live' ? <FreshnessBadge freshness={freshness} cachedAt={cachedAt} /> : null}
            {items.length > 0 ? <Chip size="small" color="warning" label={items.length} /> : null}
          </Stack>
        </Stack>

        {items.length === 0 ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', py: 1 }}>
            <CheckCircle2 size={18} />
            <Typography variant="body2">All bank transactions for this period have been reconciled.</Typography>
          </Box>
        ) : (
          <>
            <Stack spacing={1}>
              {items.slice(0, 4).map((t) => (
                <Stack key={t._id} direction="row" justifyContent="space-between" sx={{ py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AlertTriangle size={14} color="#F59E0B" />
                    <Typography variant="body2">{t.paymentReference || t.narration || 'No reference'}</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontFamily: '"IBM Plex Mono", monospace' }}>
                    {formatCents(t.amountCents, t.currency)}
                  </Typography>
                </Stack>
              ))}
            </Stack>
            <Button component={Link} href="/transactions/unmatched" size="small" sx={{ mt: 1.5 }}>
              Review all
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
