'use client';

// Deposit actions for the tenant workspace.
//
// pay and deduct are financial mutations that need an Idempotency-Key. The key
// is created when the user deliberately submits (not inside the mutation, which
// can be retried) and is reused for retries of the SAME action. It is dropped
// on success, and replaced if the user changes what they are submitting. The
// button is disabled while a request is in flight so a double click cannot send
// two actions. Nothing here is queued offline.
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Card, Chip, MenuItem, Skeleton, Stack, TextField, Typography } from '@mui/material';
import { depositsApi, type DepositView } from '@/lib/api/deposits';
import { classifyDepositConflict, resolveActionTenancyId, tenancyLabel, type DepositConflict, type EligibleTenancy } from './deposit-state';
import { ApiError, newIdempotencyKey } from '@/lib/api/client';
import { formatCents } from '@/lib/formatting/currency';
import { KnownArrearsCard, MetricCard } from '@/features/finance/metric-card';
import { useSession } from '@/features/auth/session-context';
import { permissions } from '@/lib/permissions/permissions';
import { useConnectivity } from '@/lib/sync/connectivity';
import { UNAVAILABLE } from '@/lib/formatting/currency';

function kesToCents(value: string): number | null {
  const n = Number(value);
  if (!value.trim() || !Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

/** One idempotency key per deliberate action signature. */
function useActionKey() {
  const ref = useRef<{ signature: string; key: string } | null>(null);
  return {
    get(signature: string): string {
      if (!ref.current || ref.current.signature !== signature) ref.current = { signature, key: newIdempotencyKey() };
      return ref.current.key;
    },
    clear() {
      ref.current = null;
    },
  };
}

export function TenantDepositPanel({ tenantId }: { tenantId: string }) {
  const { user } = useSession();
  const canManage = user ? permissions.canManageTenants(user.role) : false;
  const connectivity = useConnectivity();
  const canReach = connectivity.state === 'online' || connectivity.state === 'syncing' || connectivity.state === 'sync-error';
  const qc = useQueryClient();
  const [requireKes, setRequireKes] = useState('');
  const [payKes, setPayKes] = useState('');
  const [deductKes, setDeductKes] = useState('');
  const [deductReason, setDeductReason] = useState('');
  const [msg, setMsg] = useState<{ severity: 'success' | 'error'; text: string } | null>(null);
  const [conflict, setConflict] = useState<DepositConflict | null>(null);
  const [selectedTenancyId, setSelectedTenancyId] = useState<string | null>(null);
  const [choices, setChoices] = useState<EligibleTenancy[]>([]);
  const payKey = useActionKey();
  const deductKey = useActionKey();

  const { data, isLoading, error } = useQuery<DepositView>({
    queryKey: ['deposit', tenantId, selectedTenancyId ?? 'auto'],
    queryFn: () => depositsApi.get(tenantId, selectedTenancyId),
  });
  // Remember the choices the server listed so the picker survives choosing one.
  useEffect(() => {
    if (data?.ambiguous && data.eligibleTenancies?.length) setChoices(data.eligibleTenancies);
  }, [data]);
  const tenancyId = resolveActionTenancyId({
    ambiguous: Boolean(data?.ambiguous),
    selectedTenancyId,
    activeTenancyId: data?.activeTenancyId ?? null,
    choices,
  });
  const needsChoice = Boolean(data?.ambiguous) && !tenancyId;
  const invalidate = () => qc.invalidateQueries({ queryKey: ['deposit', tenantId] });
  const fail = (e: unknown) => {
    const c = e instanceof ApiError ? classifyDepositConflict(e) : null;
    if (c) {
      // The server's stored values win: show the conflict, refetch, keep nothing local.
      setConflict(c);
      setMsg(null);
      setRequireKes('');
      invalidate();
      return;
    }
    setConflict(null);
    setMsg({ severity: 'error', text: e instanceof ApiError ? e.message : 'The action failed. Nothing was recorded unless the server confirmed it.' });
  };

  const requireMut = useMutation({
    mutationFn: (cents: number) => depositsApi.require(tenantId, cents, tenancyId),
    onSuccess: () => { setConflict(null); setMsg({ severity: 'success', text: 'Deposit requirement saved.' }); setRequireKes(''); invalidate(); },
    onError: fail,
  });
  const payMut = useMutation({
    mutationFn: ({ cents, key }: { cents: number; key: string }) => depositsApi.pay(tenantId, cents, { idempotencyKey: key, tenancyId }),
    onSuccess: () => { setMsg({ severity: 'success', text: 'Deposit payment recorded. It does not change the rent balance.' }); setPayKes(''); payKey.clear(); invalidate(); },
    onError: fail,
  });
  const deductMut = useMutation({
    mutationFn: ({ cents, reason, key }: { cents: number; reason: string; key: string }) => depositsApi.deduct(tenantId, { amountCents: cents, reason }, { idempotencyKey: key, tenancyId }),
    onSuccess: () => { setMsg({ severity: 'success', text: 'Deduction recorded.' }); setDeductKes(''); setDeductReason(''); deductKey.clear(); invalidate(); },
    onError: fail,
  });
  const settleMut = useMutation({
    mutationFn: () => depositsApi.settle(tenantId, tenancyId),
    onSuccess: () => {
      setConflict(null);
      setMsg({ severity: 'success', text: 'Deposit record marked settled. No refund was paid and the tenant was not moved out. Record any refund or deduction separately.' });
      invalidate();
    },
    onError: fail,
  });

  if (isLoading) return <Skeleton height={120} />;
  if (error) return <Alert severity="error">{error instanceof ApiError ? error.message : 'Unable to load the deposit.'}</Alert>;

  const dep = data?.deposit ?? null;
  const bal = data?.balance ?? null;
  const busy = needsChoice || !tenancyId || payMut.isPending || deductMut.isPending || requireMut.isPending || settleMut.isPending;
  const payCents = kesToCents(payKes);
  const deductCents = kesToCents(deductKes);
  const requireCents = kesToCents(requireKes);

  return (
    <Card sx={{ p: 2 }}>
      <Typography variant="subtitle1" gutterBottom>Security deposit</Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
        Tracked separately from rent. Deposit payments do not reduce rent arrears.
      </Typography>
      {msg ? <Alert severity={msg.severity} sx={{ mb: 2 }} onClose={() => setMsg(null)}>{msg.text}</Alert> : null}
      {!canReach ? <Alert severity="warning" sx={{ mb: 2 }}>Deposit actions need a connection. They are never saved for later.</Alert> : null}

      {data?.ambiguous && choices.length > 0 ? (
        <Stack spacing={1} sx={{ mb: 2 }}>
          <Alert severity="info">
            This tenant has {data.eligibleTenancyCount ?? choices.length} active tenancies. Choose which tenancy&apos;s deposit to view or change; nothing is chosen for you.
          </Alert>
          <TextField select size="small" label="Tenancy" value={selectedTenancyId ?? ''} onChange={(e) => { setSelectedTenancyId(e.target.value || null); setConflict(null); setMsg(null); }}>
            {choices.map((c) => <MenuItem key={c.tenancyId} value={c.tenancyId}>{tenancyLabel(c)}</MenuItem>)}
          </TextField>
        </Stack>
      ) : null}
      {conflict?.kind === 'requirement_locked' ? (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setConflict(null)}>
          The required deposit was not changed because money has already been received for it.
          {conflict.details ? ` It stays at ${formatCents(conflict.details.requiredCents)} (you asked for ${formatCents(conflict.details.requestedCents)}; ${formatCents(conflict.details.paidCents)} paid). No adjustment or refund was made.` : ' The server value is unchanged.'}
        </Alert>
      ) : null}
      {conflict?.kind === 'tenancy_ambiguous' ? (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setConflict(null)}>
          This tenant has more than one active tenancy. Choose the tenancy above and try again. Nothing was recorded.
        </Alert>
      ) : null}
      {conflict?.kind === 'tenancy_not_eligible' ? (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setConflict(null)}>
          That tenancy is no longer eligible for this action (for example it has ended). Nothing was recorded.
        </Alert>
      ) : null}

      {!dep ? (
        <Typography color="text.secondary" sx={{ mb: 2 }}>No deposit is configured for this tenant yet.</Typography>
      ) : (
        <Stack spacing={1} sx={{ mb: 2 }}>
          <Typography>Status: <Chip size="small" label={dep.status} /></Typography>
          <Typography>Required: {formatCents(dep.requiredCents)}</Typography>
          <Typography>Paid: {formatCents(dep.paidCents)}</Typography>
          <Typography>Currently held: {formatCents(dep.heldCents)}</Typography>
          <Typography>Refunded: {formatCents(dep.refundedCents)}</Typography>
          {dep.deductions && dep.deductions.length > 0 ? (
            <Box>
              <Typography variant="subtitle2">Deductions</Typography>
              {dep.deductions.map((d, i) => (
                <Typography key={i} variant="body2">
                  {formatCents(d.amountCents)} — {d.reason}
                  {d.deductedAt ? ` · ${new Date(d.deductedAt).toLocaleDateString()}` : ''}
                </Typography>
              ))}
            </Box>
          ) : null}
        </Stack>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        {data?.activeTenancyId && !data.ambiguous ? (
          bal ? (
            <MetricCard label="Deposit ledger balance" value={typeof bal.knownLedgerSumCents === 'number' ? formatCents(bal.knownLedgerSumCents) : UNAVAILABLE} caveat={bal.verifiedFullObligation ? null : 'Known ledger entries only. Earlier history is not verified.'} />
          ) : (
            <MetricCard label="Deposit ledger balance" value={UNAVAILABLE} caveat="The ledger could not provide a figure." />
          )
        ) : (
          <MetricCard label="Deposit ledger balance" value={data?.ambiguous ? 'Choose a tenancy' : 'No active tenancy'} />
        )}
      </Stack>

      {canManage ? (
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField size="small" label="Required (KES)" type="number" value={requireKes} onChange={(e) => setRequireKes(e.target.value)} />
            <Button variant="outlined" disabled={!canReach || busy || requireCents === null} onClick={() => requireCents !== null && requireMut.mutate(requireCents)}>Set requirement</Button>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField size="small" label="Payment (KES)" type="number" value={payKes} onChange={(e) => setPayKes(e.target.value)} />
            <Button
              variant="outlined"
              disabled={!canReach || busy || payCents === null}
              onClick={() => {
                if (payCents === null) return;
                payMut.mutate({ cents: payCents, key: payKey.get(`pay:${tenancyId}:${payCents}`) });
              }}
            >
              {payMut.isPending ? 'Recording…' : 'Record deposit payment'}
            </Button>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField size="small" label="Deduction (KES)" type="number" value={deductKes} onChange={(e) => setDeductKes(e.target.value)} />
            <TextField size="small" label="Reason" value={deductReason} onChange={(e) => setDeductReason(e.target.value)} />
            <Button
              variant="outlined"
              color="warning"
              disabled={!canReach || busy || deductCents === null || !deductReason.trim()}
              onClick={() => {
                if (deductCents === null) return;
                const reason = deductReason.trim();
                deductMut.mutate({ cents: deductCents, reason, key: deductKey.get(`deduct:${tenancyId}:${deductCents}:${reason}`) });
              }}
            >
              {deductMut.isPending ? 'Recording…' : 'Add deduction'}
            </Button>
          </Stack>
          <Button
            variant="contained"
            color="secondary"
            disabled={!canReach || busy || !dep}
            onClick={() => {
              if (window.confirm('Mark this deposit settled? This only updates the deposit record. It does not pay a refund, record a deduction, or move the tenant out.')) settleMut.mutate();
            }}
          >
            Mark deposit settled
          </Button>
        </Stack>
      ) : null}
    </Card>
  );
}
