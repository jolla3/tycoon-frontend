'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card, Pagination, Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Stack, TextField, Select, MenuItem, Alert, Chip,
} from '@mui/material';
import { Receipt, Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, type DataTableColumn } from '@/components/data-display/data-table';
import { FreshnessBadge } from '@/components/data-display/freshness-badge';
import { paymentsApi } from '@/lib/api/payments';
import { housesApi } from '@/lib/api/houses';
import { formatCents } from '@/lib/formatting/currency';
import { dateFormat } from '@/lib/dates/period';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { useSession } from '@/features/auth/session-context';
import { identityKeyFromUser } from '@/lib/session/local-session-marker';
import { permissions } from '@/lib/permissions/permissions';
import { useConnectivity } from '@/lib/sync/connectivity';
import { ApiError } from '@/lib/api/client';
import { readListScopeEstate, setListScopeEstate } from '@/lib/navigation/workspace';
import type { Payment } from '@/types/api';

export default function PaymentsPage() {
  const { user } = useSession();
  const identity = user ? identityKeyFromUser(user) : 'anon';
  const canManage = user ? permissions.canManageHouses(user.role) : false;
  const [page, setPage] = useState(1);
  const [recordOpen, setRecordOpen] = useState(false);
  const [estateScope, setEstateScope] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    setEstateScope(readListScopeEstate());
  }, []);

  const { data, isLoading, error, freshness, cachedAt } = useCachedQuery(
    `${identity}:payments:list:${page}:${estateScope ?? 'all'}`,
    ['payments', identity, page, estateScope],
    () => paymentsApi.list({ page, limit: 20, estateId: estateScope || undefined })
  );

  const columns: DataTableColumn<Payment>[] = [
    { key: 'date', header: 'Date', render: (p) => dateFormat(p.paymentDate, 'DD MMM YYYY') },
    { key: 'reference', header: 'Reference', render: (p) => p.paymentReference ?? '—' },
    { key: 'period', header: 'Period', render: (p) => p.period },
    { key: 'amount', header: 'Amount', align: 'right', render: (p) => formatCents(p.amountCents) },
  ];

  return (
    <>
      <PageHeader
        title="Payments"
        description="Confirmed payments (bank reconciliation and manual). Allocation is oldest-first on the server."
        actions={
          <Stack direction="row" spacing={1} alignItems="center">
            {estateScope ? (
              <Chip
                size="small"
                label="Estate-scoped"
                onDelete={() => {
                  setListScopeEstate(null);
                  setEstateScope(null);
                  setPage(1);
                }}
              />
            ) : null}
            {canManage ? (
              <Button variant="contained" startIcon={<Plus size={16} />} onClick={() => setRecordOpen(true)}>
                Record payment
              </Button>
            ) : null}
          </Stack>
        }
      />
      {freshness !== 'live' && (
        <Box sx={{ mb: 1.5 }}>
          <FreshnessBadge freshness={freshness} cachedAt={cachedAt} />
        </Box>
      )}
      <Card>
        <DataTable
          columns={columns}
          rows={data?.items}
          rowKey={(p) => p._id}
          isLoading={isLoading}
          error={error}
          emptyIcon={Receipt}
          emptyTitle="No confirmed payments"
          emptyDescription="Record a manual payment or reconcile a bank transaction to a house."
          renderMobileCard={(p) => (
            <Card variant="outlined" sx={{ p: 2 }}>
              <Typography fontWeight={600}>{formatCents(p.amountCents)}</Typography>
              <Typography variant="body2" color="text.secondary">
                {p.paymentReference ?? 'No reference'} · {dateFormat(p.paymentDate, 'DD MMM YYYY')}
              </Typography>
            </Card>
          )}
        />
        {data && data.pagination.totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <Pagination count={data.pagination.totalPages} page={page} onChange={(_, p) => setPage(p)} size="small" />
          </Box>
        )}
      </Card>
      {recordOpen && (
        <RecordPaymentDialog
          open={recordOpen}
          onClose={() => setRecordOpen(false)}
          onSaved={() => {
            setRecordOpen(false);
            queryClient.invalidateQueries({ queryKey: ['payments'] });
          }}
        />
      )}
    </>
  );
}

function RecordPaymentDialog({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const connectivity = useConnectivity();
  const canReach = connectivity.state === 'online' || connectivity.state === 'syncing' || connectivity.state === 'sync-error';
  const { data: housesPage } = useQuery({
    queryKey: ['houses', 'for-payment'],
    queryFn: () => housesApi.list({ limit: 500 }),
  });
  const [houseId, setHouseId] = useState('');
  const [amountKes, setAmountKes] = useState('');
  const [reference, setReference] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const amountCents = Math.round(Number(amountKes) * 100);
      if (!houseId) throw new Error('Select a house');
      if (!Number.isFinite(amountCents) || amountCents <= 0) throw new Error('Enter a positive amount');
      return paymentsApi.create({
        houseId,
        amountCents,
        paymentReference: reference.trim() || undefined,
      });
    },
    onSuccess: (res) => {
      setFormError(null);
      setSuccess(
        res.reused
          ? 'Payment already recorded (idempotent — no double allocation).'
          : `Payment recorded and allocated across ${res.allocations?.length ?? 0} charge(s).`
      );
      onSaved();
    },
    onError: (err) => {
      setSuccess(null);
      setFormError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Unable to record payment');
    },
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Record payment</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {!canReach && <Alert severity="warning">Recording a payment requires connectivity.</Alert>}
          {formError && <Alert severity="error">{formError}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}
          <Select displayEmpty value={houseId} onChange={(e) => setHouseId(e.target.value)} fullWidth>
            <MenuItem value="">Select house</MenuItem>
            {(housesPage?.items ?? []).map((h) => (
              <MenuItem key={h._id} value={h._id}>
                {h.houseNumber}
                {h.tenant?.name ? ` · ${h.tenant.name}` : ''}
              </MenuItem>
            ))}
          </Select>
          <TextField label="Amount (KES)" type="number" value={amountKes} onChange={(e) => setAmountKes(e.target.value)} required />
          <TextField
            label="Reference (optional)"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            helperText="Same house + reference + amount will not double-post"
          />
          <Typography variant="caption" color="text.secondary">
            Server allocates oldest outstanding RentCharge first.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          disabled={!canReach || mutation.isPending || !houseId || !amountKes}
          onClick={() => {
            setFormError(null);
            setSuccess(null);
            mutation.mutate();
          }}
        >
          {mutation.isPending ? 'Saving…' : 'Record'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
