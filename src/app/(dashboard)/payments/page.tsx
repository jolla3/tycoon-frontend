'use client';

import { useEffect, useReducer, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card, Pagination, Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Stack, TextField, Select, MenuItem, Alert, Autocomplete, useMediaQuery, useTheme, Divider,
} from '@mui/material';
import { Receipt, Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, type DataTableColumn } from '@/components/data-display/data-table';
import { FreshnessBadge } from '@/components/data-display/freshness-badge';
import { paymentsApi, type TenderMethod } from '@/lib/api/payments';
import {
  buildManualPaymentInput, formatTenantBalance, initialRecordPaymentSelection, nairobiToday,
  newManualPaymentIdempotencyKey, recordPaymentSelectionReducer, tenantListQueryForEstate, TENDER_METHODS,
} from '@/features/payments/manual-payment';
import { tenantsApi } from '@/lib/api/tenants';
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
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [pageNotice, setPageNotice] = useState<string | null>(null);
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

  const gone = <span style={{ opacity: 0.6 }}>Unknown</span>;
  const columns: DataTableColumn<Payment>[] = [
    { key: 'date', header: 'Date', render: (p) => dateFormat(p.paymentDate, 'DD MMM YYYY') },
    { key: 'tenant', header: 'Tenant', render: (p) => p.tenantName ?? (p.tenantId ? gone : '—') },
    { key: 'house', header: 'House', render: (p) => p.houseNumber ?? (p.houseId ? gone : '—') },
    { key: 'reference', header: 'Receipt / reference', render: (p) => p.paymentReference ?? '—' },
    { key: 'origin', header: 'Source', render: (p) => <PaymentOriginChip origin={p.origin} /> },
    { key: 'status', header: 'Status', render: (p) => <PaymentStatusChip status={p.status} /> },
    {
      key: 'amount',
      header: 'Gross received',
      align: 'right',
      render: (p) => (
        <span style={p.status === 'REVERSED' ? { textDecoration: 'line-through', opacity: 0.6 } : undefined}>
          {formatCents(p.grossReceivedCents ?? p.amountCents)}
          {p.isMoneyReceived === false ? ' (credit applied)' : ''}
        </span>
      ),
    },
    {
      key: 'applied',
      header: 'Applied to rent',
      align: 'right',
      render: (p) => p.receiptAppliedCents == null ? '—' : formatCents(p.receiptAppliedCents),
    },
    {
      key: 'credit',
      header: 'New credit',
      align: 'right',
      render: (p) => p.newCreditCents == null ? '—' : formatCents(p.newCreditCents),
    },
    {
      key: 'details',
      header: 'Details',
      render: (p) => <Button size="small" variant="text" onClick={() => setSelectedPayment(p)}>View</Button>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Payments"
        description="Money received for your estates, shown at the gross amount received (a receipt appears once). Only confirmed payments count as collected. Rows marked 'credit applied' use existing tenant credit and are not new money."
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
      {pageNotice && (
        <Alert severity="success" sx={{ mb: 1.5 }} onClose={() => setPageNotice(null)}>
          {pageNotice}
        </Alert>
      )}
      <Card>
        <DataTable
          columns={columns}
          rows={data?.items}
          rowKey={(p) => `${p.listKind ?? 'payment'}:${p._id}`}
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
                {p.tenantName ?? 'Unknown tenant'} · House {p.houseNumber ?? '—'}
                <br />
                {p.paymentReference ?? 'No reference'} · {dateFormat(p.paymentDate, 'DD MMM YYYY')}
              </Typography>
              <Typography variant="caption" color="text.secondary" component="div">
                Applied to rent: {p.receiptAppliedCents == null ? 'Not available' : formatCents(p.receiptAppliedCents)}
                {' · '}New credit: {p.newCreditCents == null ? 'Not available' : formatCents(p.newCreditCents)}
              </Typography>
              <Button size="small" sx={{ mt: 1 }} onClick={() => setSelectedPayment(p)}>View payment details</Button>
            </Card>
          )}
        />
        {data && data.pagination.totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <Pagination count={data.pagination.totalPages} page={page} onChange={(_, p) => setPage(p)} size="small" />
          </Box>
        )}
      </Card>
      <Dialog open={Boolean(selectedPayment)} onClose={() => setSelectedPayment(null)} fullWidth maxWidth="md">
        <DialogTitle>Payment details</DialogTitle>
        <DialogContent dividers>
          {selectedPayment ? (
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6">{formatCents(selectedPayment.grossReceivedCents ?? selectedPayment.amountCents)} received</Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedPayment.tenantName ?? 'Unknown tenant'} · House {selectedPayment.houseNumber ?? '—'} · {dateFormat(selectedPayment.paymentDate, 'DD MMM YYYY')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedPayment.origin} · {selectedPayment.tenderMethod ?? 'Tender not recorded'} · {selectedPayment.paymentReference || 'No receipt reference'}
                </Typography>
              </Box>
              <Divider />
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
                <Box><Typography variant="caption" color="text.secondary">Gross received</Typography><Typography fontWeight={600}>{formatCents(selectedPayment.grossReceivedCents ?? selectedPayment.amountCents)}</Typography></Box>
                <Box><Typography variant="caption" color="text.secondary">This receipt applied to rent</Typography><Typography fontWeight={600}>{selectedPayment.receiptAppliedCents == null ? '—' : formatCents(selectedPayment.receiptAppliedCents)}</Typography></Box>
                <Box><Typography variant="caption" color="text.secondary">Existing credit applied</Typography><Typography fontWeight={600}>{selectedPayment.creditAppliedCents == null ? '—' : formatCents(selectedPayment.creditAppliedCents)}</Typography></Box>
                <Box><Typography variant="caption" color="text.secondary">New credit carried forward</Typography><Typography fontWeight={600}>{selectedPayment.newCreditCents == null ? '—' : formatCents(selectedPayment.newCreditCents)}</Typography></Box>
                <Box><Typography variant="caption" color="text.secondary">Credit before receipt</Typography><Typography fontWeight={600}>{selectedPayment.creditBeforeCents == null ? '—' : formatCents(selectedPayment.creditBeforeCents)}</Typography></Box>
                <Box><Typography variant="caption" color="text.secondary">Credit remaining after settlement</Typography><Typography fontWeight={600}>{selectedPayment.creditRemainingCents == null ? '—' : formatCents(selectedPayment.creditRemainingCents)}</Typography></Box>
                <Box><Typography variant="caption" color="text.secondary">Credit after receipt</Typography><Typography fontWeight={600}>{selectedPayment.creditAfterCents == null ? '—' : formatCents(selectedPayment.creditAfterCents)}</Typography></Box>
              </Box>
              <Divider />
              <Box>
                <Typography fontWeight={600} sx={{ mb: 1 }}>Rent charges settled</Typography>
                {(selectedPayment.allocationBreakdown ?? []).length ? (
                  <Stack spacing={1}>
                    {selectedPayment.allocationBreakdown!.map((allocation, index) => (
                      <Box key={`${allocation.rentChargeId ?? allocation.paymentId ?? index}:${allocation.period}:${allocation.chargeType}`} sx={{ p: 1.25, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                        <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="flex-start">
                          <Box sx={{ minWidth: 0 }}>
                            <Typography fontWeight={600}>{allocation.chargeType} · {allocation.period}</Typography>
                            <Typography variant="body2" color="text.secondary">House {allocation.houseNumber ?? '—'} · {allocation.fundingSource === 'EXISTING_CREDIT' ? 'Existing tenant credit' : 'This receipt'}</Typography>
                            <Typography variant="caption" color="text.secondary">{allocation.destinationVerified ? 'Allocation destination verified' : 'Allocation destination not verified'}</Typography>
                          </Box>
                          <Typography fontWeight={600} sx={{ whiteSpace: 'nowrap' }}>{formatCents(allocation.amountCents)}</Typography>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">No rent-charge allocations were recorded for this receipt. Any unallocated amount is shown as new tenant credit above.</Typography>
                )}
              </Box>
              {selectedPayment.currentAccountPosition ? (
                <Alert severity="info">
                  Current tenant account position (as of {dateFormat(selectedPayment.currentAccountPosition.asOf, 'DD MMM YYYY, HH:mm')}): credit {formatCents(selectedPayment.currentAccountPosition.creditCents)}, outstanding {formatCents(selectedPayment.currentAccountPosition.outstandingCents)}, net {formatCents(selectedPayment.currentAccountPosition.netCents)}. This is the current position, not a historical balance snapshot at the time of receipt.
                </Alert>
              ) : null}
              <Typography variant="caption" color="text.secondary">
                Receipt reconciliation: {selectedPayment.receiptReconciliation ?? 'not available'} · Credit reconciliation: {selectedPayment.creditReconciliation ?? 'not available'} · Settlement identity: {selectedPayment.settlementIdentity ?? 'not available'}
              </Typography>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions><Button onClick={() => setSelectedPayment(null)}>Close</Button></DialogActions>
      </Dialog>
      {recordOpen && (
        <RecordPaymentDialog
          open={recordOpen}
          initialEstateId={estateScope}
          onClose={() => setRecordOpen(false)}
          onSaved={(notice) => {
            setRecordOpen(false);
            setPageNotice(notice);
            queryClient.invalidateQueries({ queryKey: estateKeys.paymentsFamily() });
          }}
        />
      )}
    </>
  );
}

function RecordPaymentDialog({
  open,
  initialEstateId,
  onClose,
  onSaved,
}: {
  open: boolean;
  initialEstateId: string | null;
  onClose: () => void;
  onSaved: (notice: string) => void;
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const connectivity = useConnectivity();
  const canReach = connectivity.state === 'online' || connectivity.state === 'syncing' || connectivity.state === 'sync-error';
  const { estates } = useVisibleEstates();
  const [selection, dispatchSelection] = useReducer(recordPaymentSelectionReducer, initialEstateId, initialRecordPaymentSelection);
  const { estateId, tenantId, tenancyId } = selection;
  const [amountKes, setAmountKes] = useState('');
  const [reference, setReference] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => nairobiToday());
  // Operator must choose the method explicitly (do not default to MPESA).
  const [tenderMethod, setTenderMethod] = useState<TenderMethod | ''>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [balanceAfter, setBalanceAfter] = useState<number | null>(null);
  // Stable for one intended submission; regenerated only for a fresh form attempt.
  const [idempotencyKey, setIdempotencyKey] = useState(() => newManualPaymentIdempotencyKey());

  // Single-estate users: the estate is unambiguous, so preselect it.
  useEffect(() => {
    if (!estateId && estates && estates.length === 1) dispatchSelection({ type: 'estate', estateId: estates[0]!._id });
  }, [estates, estateId]);

  const resetAttempt = () => {
    setFormError(null); setSuccess(null); setBalanceAfter(null);
    setIdempotencyKey(newManualPaymentIdempotencyKey());
  };

  // Tenants of the selected estate only (server scopes by estate and by the user's access).
  const tenantsQuery = useQuery({
    queryKey: ['payments', 'record', 'tenants', estateId],
    queryFn: () => tenantsApi.list(tenantListQueryForEstate(estateId)),
    enabled: open && Boolean(estateId),
    staleTime: 30_000,
  });
  const tenantOptions = tenantsQuery.data ?? [];
  const selectedTenant = tenantOptions.find((t) => t._id === tenantId) ?? null;

  const contextQuery = useQuery({
    queryKey: ['payments', 'tenant-context', tenantId, paymentDate],
    queryFn: () => paymentsApi.tenantContext({ tenantId, paymentDate }),
    enabled: open && Boolean(tenantId) && Boolean(paymentDate),
    staleTime: 0,
  });
  const ctx = contextQuery.data;
  const chosen = ctx?.tenancies.find((t) => t.tenancyId === tenancyId) ?? null;
  // The chosen tenancy must cover the CURRENT payment date; otherwise force a re-pick.
  const tenancyValid = Boolean(chosen && chosen.coversPaymentDate === true);
  useEffect(() => {
    if (ctx && tenancyId && !tenancyValid) dispatchSelection({ type: 'tenancy', tenancyId: '' });
  }, [ctx, tenancyId, tenancyValid]);
  const balanceLabel = formatTenantBalance(ctx?.account?.netCents ?? null);

  const mutation = useMutation({
    mutationFn: () => {
      return paymentsApi.create(buildManualPaymentInput({
        tenantId,
        tenancyId,
        houseId: chosen?.houseId ?? '',
        amountKes,
        paymentDate,
        tenderMethod,
        reference,
        idempotencyKey,
      }));
    },
    onSuccess: (res) => {
      setFormError(null);
      const afterCents = res.balanceAfterCents ?? res.remainingBalanceCents ?? null;
      setBalanceAfter(afterCents);
      const afterLabel = formatTenantBalance(afterCents);
      const notice = res.reused
        ? (afterLabel
          ? `Payment already recorded (idempotent). Tenant account: ${afterLabel}.`
          : 'Payment already recorded (idempotent — no double allocation).')
        : (afterLabel
          ? `Payment recorded. Tenant account now: ${afterLabel}.`
          : 'Payment recorded.');
      setSuccess(notice);
      // New key for any subsequent distinct submission from a reopened form.
      setIdempotencyKey(newManualPaymentIdempotencyKey());
      onSaved(notice);
    },
    onError: (err) => {
      setSuccess(null);
      setBalanceAfter(null);
      // Keep the same idempotencyKey so a retry of this submission is safe.
      setFormError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Unable to record payment');
    },
  });

  const canSubmit = Boolean(
    canReach
    && tenantId
    && tenancyId
    && tenancyValid
    && amountKes
    && paymentDate
    && tenderMethod
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

          <TextField
            label="Estate"
            select
            value={estateId}
            onChange={(e) => {
              dispatchSelection({ type: 'estate', estateId: e.target.value });
              resetAttempt();
            }}
            required
          >
            {(estates ?? []).map((e) => <MenuItem key={e._id} value={e._id}>{e.name}</MenuItem>)}
          </TextField>

          <Autocomplete
            options={tenantOptions}
            value={selectedTenant}
            loading={tenantsQuery.isFetching}
            disabled={!estateId}
            getOptionLabel={(t) => (t.phone ? `${t.name} · ${t.phone}` : t.name)}
            isOptionEqualToValue={(a, b) => a._id === b._id}
            noOptionsText="No tenants in this estate"
            onChange={(_, t) => {
              dispatchSelection({ type: 'tenant', tenantId: t?._id ?? '' });
              resetAttempt();
            }}
            renderInput={(params) => (
              <TextField {...params} label="Tenant who paid" required helperText="Choose the tenant explicitly" />
            )}
          />

          {tenantsQuery.isError && <Alert severity="error">Could not load tenants. Nothing was changed.</Alert>}

          {tenantId && (
            contextQuery.isError ? (
              <Alert severity="error">Could not load this tenant’s houses. Nothing was changed.</Alert>
            ) : ctx ? (
              <>
                <TextField
                  label="House / tenancy"
                  select
                  value={tenancyId}
                  onChange={(e) => { dispatchSelection({ type: 'tenancy', tenancyId: e.target.value }); resetAttempt(); }}
                  required
                  SelectProps={{ displayEmpty: true }}
                  helperText="Only tenancies that covered the payment date can be chosen"
                >
                  <MenuItem value="" disabled>Select house</MenuItem>
                  {ctx.tenancies.map((t) => (
                    <MenuItem key={t.tenancyId} value={t.tenancyId} disabled={t.coversPaymentDate !== true}>
                      {`House ${t.houseNumber ?? 'unknown'} · ${dateFormat(t.startAt, 'DD MMM YYYY')} – ${t.endAt ? dateFormat(t.endAt, 'DD MMM YYYY') : 'present'}${t.status === 'ACTIVE' ? ' (current)' : ''}${t.coversPaymentDate === true ? '' : ' — not covering this date'}`}
                    </MenuItem>
                  ))}
                </TextField>
                {ctx.tenancies.length === 0 && (
                  <Alert severity="warning">This tenant has no tenancy to record a payment against.</Alert>
                )}
                <Alert severity="info">
                  Tenant account: {balanceLabel ?? 'unavailable'}
                </Alert>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">Loading houses…</Typography>
            )
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
              resetAttempt();
            }}
            InputLabelProps={{ shrink: true }}
            helperText="Defaults to today (Africa/Nairobi). The chosen tenancy must have covered this date."
          />

          <TextField
            label="Payment method"
            select
            value={tenderMethod}
            onChange={(e) => setTenderMethod(e.target.value as TenderMethod)}
            required
            SelectProps={{ displayEmpty: true }}
            helperText="Choose how this payment was received"
          >
            <MenuItem value="" disabled>
              Select method
            </MenuItem>
            {TENDER_METHODS.map((m) => (
              <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
            ))}
          </TextField>

          <TextField
            label="Reference (optional)"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            helperText="Optional external reference. Unique per client. Retries of this submission reuse the same internal identity."
          />

          {balanceAfter != null && (
            <Typography variant="caption" color="text.secondary">
              Updated tenant account: {formatTenantBalance(balanceAfter) ?? '—'}
            </Typography>
          )}

          <Typography variant="caption" color="text.secondary">
            The chosen house records where the money was received. Existing tenant credit is applied first, then this receipt, against the tenant’s oldest obligations across all their tenancies in this estate; any excess becomes credit. Recording does not generate rent charges.
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
            // Do not regenerate idempotencyKey here — retries of the same attempt must reuse it.
            mutation.mutate();
          }}
        >
          {mutation.isPending ? 'Saving…' : 'Record'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
