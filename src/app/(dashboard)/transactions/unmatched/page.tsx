'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// useQuery still used for houses assignment dropdown (online-only financial action)
import { Card, Stack, Typography, Button, Select, MenuItem, Alert, Box } from '@mui/material';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { CardSkeleton } from '@/components/feedback/card-skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { EmptyState } from '@/components/feedback/empty-state';
import { transactionsApi } from '@/lib/api/transactions';
import { housesApi } from '@/lib/api/houses';
import { formatCents } from '@/lib/formatting/currency';
import { dateFormat } from '@/lib/dates/period';
import { useVisibleEstates } from '@/features/estates/use-visible-estates';
import { useSession } from '@/features/auth/session-context';
import { permissions } from '@/lib/permissions/permissions';
import { ApiError } from '@/lib/api/client';
import { useConnectivity } from '@/lib/sync/connectivity';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { identityKeyFromUser } from '@/lib/session/local-session-marker';
import { FreshnessBadge } from '@/components/data-display/freshness-badge';
import type { BankTransaction } from '@/types/api';

export default function UnmatchedTransactionsPage() {
  const { user } = useSession();
  const identity = user ? identityKeyFromUser(user) : 'anon';
  const { data, isLoading, error, freshness, cachedAt } = useCachedQuery(
    `${identity}:transactions:unmatched`,
    ['transactions', 'unmatched', identity],
    () => transactionsApi.unmatched()
  );

  return (
    <>
      <PageHeader
        title="Unmatched Transactions"
        description="Bank credits that couldn't be automatically linked to a house — assign them manually below"
      />

      {freshness !== 'live' && (
        <Box sx={{ mb: 1.5 }}>
          <FreshnessBadge freshness={freshness} cachedAt={cachedAt} />
        </Box>
      )}

      {error && !data && <ErrorState error={error} />}

      {isLoading && (
        <Stack spacing={2}>
          <CardSkeleton lines={2} />
          <CardSkeleton lines={2} />
        </Stack>
      )}

      {!isLoading && !error && (!data || data.length === 0) && (
        <Card sx={{ p: 2 }}>
          <EmptyState icon={CheckCircle2} title="No unmatched transactions" description="All bank transactions for the currently connected accounts have been reconciled." />
        </Card>
      )}

      <Stack spacing={2}>
        {data?.map((txn) => (
          <UnmatchedTransactionCard key={txn._id} transaction={txn} />
        ))}
      </Stack>
    </>
  );
}

function UnmatchedTransactionCard({ transaction }: { transaction: BankTransaction }) {
  const { user } = useSession();
  const { estates } = useVisibleEstates();
  const queryClient = useQueryClient();
  const connectivity = useConnectivity();
  const [houseId, setHouseId] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);

  const canAssign = user ? permissions.canAssignTransactions(user.role) : false;
  // Section 4 of this pass: financial mutations stay online-only, full stop
  // — never queued, never optimistically shown as successful.
  const canReachServer = connectivity.state === 'online' || connectivity.state === 'syncing' || connectivity.state === 'sync-error';

  // No estateId sent to the backend (see lib/api/houses.ts) — fetch a
  // reasonably-sized page of houses and narrow to this transaction's
  // estate client-side before offering them in the assignment dropdown.
  const { data: houses } = useQuery({
    queryKey: ['houses', 'for-assignment'],
    queryFn: () => housesApi.list({ limit: 200 }),
    enabled: canAssign,
  });
  const housesForEstate = houses?.items.filter((h) => h.estateId === transaction.estateId) ?? [];

  // Financial mutation: no retry, no optimistic "Success" before the
  // backend actually confirms it (section 20/35 of the redesign mandate —
  // never pretend a financial write succeeded).
  const assign = useMutation({
    mutationFn: () => transactionsApi.assign(transaction._id, houseId),
    onSuccess: () => {
      setSucceeded(true);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: (err) => setErrorMessage(err instanceof ApiError ? err.message : 'Unable to assign this transaction. Nothing was changed.'),
  });

  if (succeeded) {
    return (
      <Card sx={{ p: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" color="success.main">
          <CheckCircle2 size={18} />
          <Typography variant="body2">Assigned and confirmed by the server.</Typography>
        </Stack>
      </Card>
    );
  }

  return (
    <Card sx={{ p: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <AlertTriangle size={16} color="#F59E0B" />
            <Typography fontWeight={600}>{formatCents(transaction.amountCents, transaction.currency)}</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {dateFormat(transaction.transactionDate, 'DD MMM YYYY')} · Reference: {transaction.paymentReference || transaction.narration || 'none'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Unable to identify the house from this payment reference.
          </Typography>
        </Box>

        {canAssign && (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
            <Select size="small" displayEmpty value={houseId} onChange={(e) => setHouseId(e.target.value)} sx={{ minWidth: 160 }}>
              <MenuItem value="" disabled>
                {estates?.find((e) => e._id === transaction.estateId)?.name ?? 'Select house'}
              </MenuItem>
              {housesForEstate.map((h) => (
                <MenuItem key={h._id} value={h._id}>
                  House {h.houseNumber}
                </MenuItem>
              ))}
            </Select>
            <Button
              variant="contained"
              size="small"
              disabled={!houseId || assign.isPending || !canReachServer}
              onClick={() => {
                setErrorMessage(null);
                assign.mutate();
              }}
            >
              {!canReachServer ? "You're offline" : assign.isPending ? 'Assigning…' : 'Assign to house'}
            </Button>
          </Stack>
        )}
      </Stack>
      {!canReachServer && (
        <Alert severity="info" sx={{ mt: 1.5 }}>
          You&apos;re offline. This action requires a server connection.
        </Alert>
      )}
      {errorMessage && (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {errorMessage}
        </Alert>
      )}
    </Card>
  );
}
