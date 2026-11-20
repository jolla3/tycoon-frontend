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
import { buildManualPaymentInput, describeTenancy, resolveChoice, tenancyToSubmit } from '@/features/payments/manual-payment';
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
  const connectivity = useConnectivity();
  const canReach = connectivity.state === 'online' || connectivity.state === 'syncing' || connectivity.state === 'sync-error';
  const [house, setHouse] = useState<HouseRow | null>(null);
  const houseId = house?._id ?? '';
  const [amountKes, setAmountKes] = useState('');
  const [reference, setReference] = useState('');
  const [period, setPeriod] = useState(() => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' }).slice(0, 7));
  const [selectedTenancyId, setSelectedTenancyId] = useState('');
  const [optPage, setOptPage] = useState(1);
  const [optSearch, setOptSearch] = useState('');
  const periodValid = /^\d{4}-(0[1-9]|1[0-2])$/.test(period);
  const optionsQuery = useQuery({
    queryKey: ['payments', 'manual-options', houseId, period, optPage, optSearch],
    queryFn: () => paymentsApi.manualOptions({ houseId, period, page: optPage, limit: 10, search: optSearch.trim() || undefined }),
    placeholderData: (prev) => prev,
    enabled: open && Boolean(houseId) && periodValid,
    staleTime: 0,
  });
  const choice = optionsQuery.data ? resolveChoice(optionsQuery.data) : resolveChoice(undefined);
  const tenancyId = tenancyToSubmit(choice, selectedTenancyId);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      return paymentsApi.create(buildManualPaymentInput({ houseId, period, amountKes, reference, tenancyId }));
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
          <HouseSearchSelect value={house} onChange={(h) => { setHouse(h); setSelectedTenancyId(''); setOptPage(1); setOptSearch(''); }} />
          <TextField
            label="Rent month"
            type="month"
            value={period}
            onChange={(e) => { setPeriod(e.target.value); setSelectedTenancyId(''); setOptPage(1); setOptSearch(''); }}
            InputLabelProps={{ shrink: true }}
            error={!periodValid}
            helperText="The month this payment is for. It decides which tenancy is charged."
          />
          {houseId && periodValid ? (
            optionsQuery.isError ? (
              <Alert severity="error">Could not load tenancy details. Nothing was changed.</Alert>
            ) : choice.kind === 'loading' ? (
              <Typography variant="body2" color="text.secondary">Checking who occupied this house in {period}…</Typography>
            ) : choice.kind === 'unique' ? (
              <Alert severity="info">Recorded against: {describeTenancy(choice.option, (d) => dateFormat(d, 'DD MMM YYYY'))}</Alert>
            ) : choice.kind === 'choose' ? (
              <Select displayEmpty value={selectedTenancyId} onChange={(e) => setSelectedTenancyId(e.target.value)} fullWidth>
                <MenuItem value="">Which tenancy is this payment for?</MenuItem>
                {choice.options.map((o) => (
                  <MenuItem key={o.tenancyId} value={o.tenancyId}>{describeTenancy(o, (d) => dateFormat(d, 'DD MMM YYYY'))}</MenuItem>
                ))}
              </Select>
            ) : (
              <Alert severity="warning">
                No single tenancy fully covers {period} for this house, so the payment cannot be attributed to a tenant. Partial-month billing is not supported yet.
                {choice.options.map((o) => (
                  <div key={o.tenancyId}>{describeTenancy(o, (d) => dateFormat(d, 'DD MMM YYYY'))}{o.reason ? ` — ${o.reason}` : ''}</div>
                ))}
                <Stack spacing={1} sx={{ mt: 1 }}>
                  <TextField size="small" label="Search tenancies by tenant name" value={optSearch} onChange={(e) => { setOptSearch(e.target.value); setOptPage(1); }} />
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button size="small" disabled={optPage <= 1} onClick={() => setOptPage((n) => Math.max(1, n - 1))}>Newer</Button>
                    <Typography variant="caption">Page {optPage}{optionsQuery.data?.total != null ? ` · ${optionsQuery.data.total} tenancies` : ''}</Typography>
                    <Button size="small" disabled={!optionsQuery.data?.hasMore} onClick={() => setOptPage((n) => n + 1)}>Older</Button>
                  </Stack>
                </Stack>
              </Alert>
            )
          ) : null}
          <TextField label="Amount (KES)" type="number" value={amountKes} onChange={(e) => setAmountKes(e.target.value)} required />
          <TextField
            label="Reference (optional)"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            helperText="A reference can only be used once per client; repeating the same details returns the original payment"
          />

          <Typography variant="caption" color="text.secondary">
            The server charges the selected tenancy and allocates oldest outstanding charge first.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          disabled={!canReach || mutation.isPending || !houseId || !amountKes || !tenancyId}
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
