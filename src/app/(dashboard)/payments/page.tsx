'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card, Pagination, Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Stack, TextField, Select, MenuItem, Alert, useMediaQuery, useTheme,
} from '@mui/material';
import { Receipt, Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, type DataTableColumn } from '@/components/data-display/data-table';
import { FreshnessBadge } from '@/components/data-display/freshness-badge';
import { paymentsApi, type TenderMethod } from '@/lib/api/payments';
import {
  buildManualPaymentInput, formatTenantBalance, nairobiToday, TENDER_METHODS,
} from '@/features/payments/manual-payment';
import { HouseSearchSelect } from '@/features/payments/house-search-select';
import type { House as HouseRow } from '@/types/api';
import { formatCents } from '@/lib/formatting/currency';
import { PaymentStatusChip, PaymentOriginChip } from '@/components/data-display/status-chip';
import { useVisibleEstates } from '@/features/estates/use-visible-estates';
import { estateKeys } from '@/lib/query/keys';
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
  const { estates } = useVisibleEstates();
  const queryClient = useQueryClient();

  useEffect(() => {
    setEstateScope(readListScopeEstate());
  }, []);

  const { data, isLoading, error, freshness, cachedAt } = useCachedQuery(
    `${identity}:payments:list:${page}:${estateScope ?? 'all'}`,
    [...estateKeys.payments(estateScope || undefined, { identity, page })],
    () => paymentsApi.list({ page, limit: 20, estateId: estateScope || undefined })
  );

  const columns: DataTableColumn<Payment>[] = [
    { key: 'date', header: 'Date', render: (p) => dateFormat(p.paymentDate, 'DD MMM YYYY') },
    { key: 'reference', header: 'Reference', render: (p) => p.paymentReference ?? '—' },
    { key: 'period', header: 'Period', render: (p) => p.period },
    { key: 'origin', header: 'Source', render: (p) => <PaymentOriginChip origin={p.origin} /> },
    { key: 'status', header: 'Status', render: (p) => <PaymentStatusChip status={p.status} /> },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (p) => (
        <span style={p.status === 'REVERSED' ? { textDecoration: 'line-through', opacity: 0.6 } : undefined}>{formatCents(p.amountCents)}</span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Payments"
        description="Payments recorded for your estates, including reversed ones. Only confirmed payments count as collected. Allocation is oldest-first on the server."
        actions={
          <Stack direction="row" spacing={1} alignItems="center">
            <Select
              size="small"
              displayEmpty
              value={estateScope ?? ''}
              onChange={(e) => {
                const v = e.target.value || null;
                setListScopeEstate(v);
                setEstateScope(v);
                setPage(1);
              }}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="">All estates</MenuItem>
              {estates?.map((e) => (
                <MenuItem key={e._id} value={e._id}>{e.name}</MenuItem>
              ))}
            </Select>
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
          emptyTitle="No payments"
          emptyDescription="Record a manual payment or reconcile a bank transaction to a house."
          renderMobileCard={(p) => (
            <Card variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography fontWeight={600} sx={p.status === 'REVERSED' ? { textDecoration: 'line-through', color: 'text.secondary' } : undefined}>{formatCents(p.amountCents)}</Typography>
                <PaymentStatusChip status={p.status} />
              </Stack>
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
            queryClient.invalidateQueries({ queryKey: estateKeys.paymentsFamily() });
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
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const connectivity = useConnectivity();
  const canReach = connectivity.state === 'online' || connectivity.state === 'syncing' || connectivity.state === 'sync-error';
  const [house, setHouse] = useState<HouseRow | null>(null);
  const houseId = house?._id ?? '';
  const [amountKes, setAmountKes] = useState('');
  const [reference, setReference] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => nairobiToday());
  const [tenderMethod, setTenderMethod] = useState<TenderMethod | ''>('MPESA');
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [balanceAfter, setBalanceAfter] = useState<number | null>(null);

  const contextQuery = useQuery({
    queryKey: ['payments', 'manual-context', houseId, paymentDate],
    queryFn: () => paymentsApi.manualContext({ houseId, paymentDate }),
    enabled: open && Boolean(houseId) && Boolean(paymentDate),
    staleTime: 0,
  });

  const ctx = contextQuery.data;
  const occupancyOk = ctx?.occupancy?.ok === true;
  const tenantName = ctx?.tenant?.name ?? null;
  const balanceLabel = formatTenantBalance(ctx?.tenantBalanceCents ?? null);

  const mutation = useMutation({
    mutationFn: () => {
      return paymentsApi.create(buildManualPaymentInput({
        houseId,
        amountKes,
        paymentDate,
        tenderMethod,
        reference,
      }));
    },
    onSuccess: (res) => {
      setFormError(null);
      setBalanceAfter(res.balanceAfterCents ?? res.remainingBalanceCents ?? null);
      const afterLabel = formatTenantBalance(res.balanceAfterCents ?? res.remainingBalanceCents ?? null);
      setSuccess(
        res.reused
          ? 'Payment already recorded (idempotent — no double allocation).'
          : `Payment recorded${afterLabel ? `. Tenant balance now: ${afterLabel}` : ''}.`
      );
      onSaved();
    },
    onError: (err) => {
      setSuccess(null);
      setBalanceAfter(null);
      setFormError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Unable to record payment');
    },
  });

  const canSubmit = Boolean(
    canReach
    && houseId
    && amountKes
    && paymentDate
    && tenderMethod
    && occupancyOk
    && !mutation.isPending
    && !contextQuery.isFetching
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" fullScreen={fullScreen}>
      <DialogTitle>Record payment</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {!canReach && <Alert severity="warning">Recording a payment requires connectivity.</Alert>}
          {formError && <Alert severity="error">{formError}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}

          <HouseSearchSelect
            value={house}
            onChange={(h) => {
              setHouse(h);
              setFormError(null);
              setSuccess(null);
              setBalanceAfter(null);
            }}
          />

          {houseId && (
            contextQuery.isError ? (
              <Alert severity="error">Could not load occupancy for this house. Nothing was changed.</Alert>
            ) : contextQuery.isFetching && !ctx ? (
              <Typography variant="body2" color="text.secondary">Checking occupancy…</Typography>
            ) : ctx && !occupancyOk ? (
              <Alert severity="warning">{ctx.occupancy?.reason || 'This house cannot receive a payment right now.'}</Alert>
            ) : occupancyOk ? (
              <Alert severity="info">
                Tenant: <strong>{tenantName || 'Resolved tenant'}</strong>
                {balanceLabel != null && (
                  <Typography variant="body2" component="div" sx={{ mt: 0.5 }}>
                    Account balance: {balanceLabel}
                  </Typography>
                )}
                {balanceLabel == null && (
                  <Typography variant="body2" component="div" sx={{ mt: 0.5 }} color="text.secondary">
                    Account balance unavailable
                  </Typography>
                )}
              </Alert>
            ) : null
          )}

          <TextField
            label="Amount (KES)"
            type="number"
            value={amountKes}
            onChange={(e) => setAmountKes(e.target.value)}
            required
          />

          <TextField
            label="Payment date"
            type="date"
            value={paymentDate}
            onChange={(e) => {
              setPaymentDate(e.target.value);
              setBalanceAfter(null);
            }}
            InputLabelProps={{ shrink: true }}
            helperText="Defaults to today (Africa/Nairobi). Backdated payments attribute to whoever occupied the house on that date."
          />

          <TextField
            label="Payment method"
            select
            value={tenderMethod}
            onChange={(e) => setTenderMethod(e.target.value as TenderMethod)}
            required
          >
            {TENDER_METHODS.map((m) => (
              <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
            ))}
          </TextField>

          <TextField
            label="Reference (optional)"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            helperText="A reference can only be used once per client; repeating the same details returns the original payment"
          />

          {balanceAfter != null && (
            <Typography variant="caption" color="text.secondary">
              Updated balance: {formatTenantBalance(balanceAfter) ?? '—'}
            </Typography>
          )}

          <Typography variant="caption" color="text.secondary">
            The server attributes this receipt to the tenant who occupied the house on the payment date and allocates oldest outstanding charge first. Excess becomes tenant credit.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          disabled={!canSubmit}
          onClick={() => {
            setFormError(null);
            setSuccess(null);
            setBalanceAfter(null);
            mutation.mutate();
          }}
        >
          {mutation.isPending ? 'Saving…' : 'Record'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
