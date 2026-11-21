'use client';

// M-PESA receipt summary for the selected month. Meanings are defined by the
// backend; see features/mpesa/summary-view.ts. Figures are receipts, and only the
// "posted" row has become rent payments.
import { useQuery } from '@tanstack/react-query';
import { Alert, Box, Card, Skeleton, Stack, Typography } from '@mui/material';
import { mpesaTransactionsApi } from '@/lib/api/mpesa-transactions';
import { ApiError } from '@/lib/api/client';
import { formatCents } from '@/lib/formatting/currency';
import { periodWindow, summaryReconciles, summaryRows } from './summary-view';

export function MpesaSummaryCard({ period, periodLabel, estateId, identity }: { period: string; periodLabel: string; estateId?: string; identity: string }) {
  const win = periodWindow(period);
  const q = useQuery({
    queryKey: ['mpesa', 'summary', identity, period, estateId ?? 'all'],
    queryFn: () => mpesaTransactionsApi.summary({ ...win!, estateId: estateId || undefined }),
    enabled: Boolean(win),
    retry: false,
  });

  return (
    <Card sx={{ p: 2, mb: 2 }}>
      <Typography variant="subtitle1" gutterBottom>M-PESA receipts — {periodLabel}</Typography>
      {q.isLoading ? <Skeleton height={96} /> : null}
      {q.isError ? (
        <Alert severity="warning">{q.error instanceof ApiError ? q.error.message : 'The summary could not be loaded.'} Figures are not shown rather than guessed.</Alert>
      ) : null}
      {q.data && !summaryReconciles(q.data) ? <Alert severity="error">The summary did not add up, so it is hidden. Please report this.</Alert> : null}
      {q.data && summaryReconciles(q.data) ? (
        <Stack spacing={1.5}>
          <Box>
            <Typography variant="caption" color="text.secondary">Received from M-PESA (all receipts)</Typography>
            <Typography fontWeight={700} sx={{ fontFamily: '"IBM Plex Mono", monospace' }}>
              {formatCents(q.data.providerObserved.amountCents)} · {q.data.providerObserved.count} receipt(s)
            </Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap>
            {summaryRows(q.data).map((r) => (
              <Box key={r.key} sx={{ flex: '1 1 200px', minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary">{r.label}</Typography>
                <Typography fontWeight={600} sx={{ fontFamily: '"IBM Plex Mono", monospace' }}>{formatCents(r.amountCents)} · {r.count}</Typography>
                <Typography variant="caption" color="text.secondary" display="block">{r.help}</Typography>
              </Box>
            ))}
          </Stack>
          <Typography variant="caption" color="text.secondary">
            Each receipt appears in one row only, so the rows add up to the total. {q.data.posted.paymentCount} rent payment(s) were created from {q.data.posted.receiptCount} posted receipt(s).
            {q.data.scope === 'ESTATE_RESTRICTED' ? ' Showing only receipts tied to your estates.' : ''}
          </Typography>
        </Stack>
      ) : null}
    </Card>
  );
}
