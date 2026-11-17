'use client';

// Deposit actions for the tenant workspace.
//
// pay and deduct are financial mutations that need an Idempotency-Key. The key
// is created when the user deliberately submits (not inside the mutation, which
// can be retried) and is reused for retries of the SAME action. It is dropped
// on success, and replaced if the user changes what they are submitting. The
// button is disabled while a request is in flight so a double click cannot send
// two actions. Nothing here is queued offline.
import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Card, Chip, Skeleton, Stack, TextField, Typography } from '@mui/material';
import { depositsApi, type DepositView } from '@/lib/api/deposits';
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
  const payKey = useActionKey();
  const deductKey = useActionKey();

  const { data, isLoading, error } = useQuery<DepositView>({ queryKey: ['deposit', tenantId], queryFn: () => depositsApi.get(tenantId) });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['deposit', tenantId] });
  const fail = (e: unknown) => setMsg({ severity: 'error', text: e instanceof ApiError ? e.message : 'The action failed. Nothing was recorded unless the server confirmed it.' });

  const requireMut = useMutation({
    mutationFn: (cents: number) => depositsApi.require(tenantId, cents),
    onSuccess: () => { setMsg({ severity: 'success', text: 'Deposit requirement saved.' }); setRequireKes(''); invalidate(); },
    onError: fail,
  });
  const payMut = useMutation({
    mutationFn: ({ cents, key }: { cents: number; key: string }) => depositsApi.pay(tenantId, cents, { idempotencyKey: key }),
    onSuccess: () => { setMsg({ severity: 'success', text: 'Deposit payment recorded. It does not change the rent balance.' }); setPayKes(''); payKey.clear(); invalidate(); },
    onError: fail,
  });
  const deductMut = useMutation({
    mutationFn: ({ cents, reason, key }: { cents: number; reason: string; key: string }) => depositsApi.deduct(tenantId, { amountCents: cents, reason }, { idempotencyKey: key }),
    onSuccess: () => { setMsg({ severity: 'success', text: 'Deduction recorded.' }); setDeductKes(''); setDeductReason(''); deductKey.clear(); invalidate(); },
    onError: fail,
  });
  const settleMut = useMutation({
    mutationFn: () => depositsApi.settle(tenantId),
    onSuccess: (res) => {
      const refund = (res as { settlement?: { refundDueCents?: number } } | undefined)?.settlement?.refundDueCents;
      setMsg({ severity: 'success', text: typeof refund === 'number' ? `Settled. Refund due: ${formatCents(refund)}.` : 'Settled. The refund amount was not reported; check the deposit record.' });
      invalidate();
    },
    onError: fail,
  });

  if (isLoading) return <Skeleton height={120} />;
  if (error) return <Alert severity="error">{error instanceof ApiError ? error.message : 'Unable to load the deposit.'}</Alert>;

  const dep = data?.deposit ?? null;
  const bal = data?.balance ?? null;
  const busy = payMut.isPending || deductMut.isPending || requireMut.isPending || settleMut.isPending;
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
        {data?.activeTenancyId ? (
          bal ? (
            <MetricCard label="Deposit ledger balance" value={typeof bal.knownLedgerSumCents === 'number' ? formatCents(bal.knownLedgerSumCents) : UNAVAILABLE} caveat={bal.verifiedFullObligation ? null : 'Known ledger entries only. Earlier history is not verified.'} />
          ) : (
            <MetricCard label="Deposit ledger balance" value={UNAVAILABLE} caveat="The ledger could not provide a figure." />
          )
        ) : (
          <MetricCard label="Deposit ledger balance" value="No active tenancy" />
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
                payMut.mutate({ cents: payCents, key: payKey.get(`pay:${payCents}`) });
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
                deductMut.mutate({ cents: deductCents, reason, key: deductKey.get(`deduct:${deductCents}:${reason}`) });
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
              if (window.confirm('Settle move-out? This refunds the remaining held deposit and marks the tenant moved out.')) settleMut.mutate();
            }}
          >
            Settle move-out / refund
          </Button>
        </Stack>
      ) : null}
    </Card>
  );
}
