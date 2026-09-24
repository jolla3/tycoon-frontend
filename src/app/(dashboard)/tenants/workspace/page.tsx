'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card, Stack, Typography, Tabs, Tab, Chip, Button, Skeleton, Alert, Table, TableHead, TableRow, TableCell, TableBody, Divider, Box,
  TextField, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { tenantsApi } from '@/lib/api/tenants';
import { formatCents } from '@/lib/formatting/currency';
import { ApiError } from '@/lib/api/client';
import { openWorkspace, readWorkspaceId } from '@/lib/navigation/workspace';
import { depositsApi } from '@/lib/api/deposits';
import { useSession } from '@/features/auth/session-context';
import { permissions } from '@/lib/permissions/permissions';

export default function TenantWorkspacePage() {
  const router = useRouter();
  const [tenantId, setTenantId] = useState('');
  const [tab, setTab] = useState(0);

  useEffect(() => {
    const id = readWorkspaceId('tenant');
    if (id) setTenantId(id);
  }, []);

  const { data: tenant, isLoading, error } = useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: () => tenantsApi.get(tenantId),
    enabled: !!tenantId,
  });

  if (!tenantId) {
    return (
      <Alert severity="info">
        No tenant selected.
        <Button component={Link} href="/tenants" size="small" sx={{ ml: 2 }}>Back to tenants</Button>
      </Alert>
    );
  }
  if (isLoading) return <Stack spacing={2}><Skeleton height={48} /><Skeleton height={160} /></Stack>;
  if (error || !tenant) {
    return (
      <Alert severity="error">
        {error instanceof ApiError ? error.message : 'Tenant not found.'}
        <Button component={Link} href="/tenants" size="small" sx={{ ml: 2 }}>Back</Button>
      </Alert>
    );
  }

  const f = tenant.financials;

  return (
    <>
      <PageHeader
        title={tenant.name}
        description={[tenant.phone, tenant.estate?.name, tenant.house ? `House ${tenant.house.houseNumber}` : null].filter(Boolean).join(' · ')}
        actions={
          <Stack direction="row" spacing={1}>
            {tenant.house && (
              <Button size="small" variant="outlined" onClick={() => openWorkspace('house', tenant.house!._id, router)}>House</Button>
            )}
            {tenant.estate && (
              <Button size="small" variant="outlined" onClick={() => openWorkspace('estate', tenant.estate!._id, router)}>Estate</Button>
            )}
            <Button component={Link} href="/tenants" startIcon={<ArrowLeft size={16} />} variant="outlined" size="small">All tenants</Button>
          </Stack>
        }
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
        <Card sx={{ p: 1.5, minWidth: 140 }}><Typography variant="caption" color="text.secondary">Status</Typography><Chip size="small" label={tenant.status} color={tenant.status === 'active' ? 'success' : 'default'} /></Card>
        <Card sx={{ p: 1.5, minWidth: 150 }}><Typography variant="caption" color="text.secondary">Billed</Typography><Typography fontWeight={600}>{formatCents(f?.billedCents ?? 0)}</Typography></Card>
        <Card sx={{ p: 1.5, minWidth: 150 }}><Typography variant="caption" color="text.secondary">Paid</Typography><Typography fontWeight={600}>{formatCents(f?.paidCents ?? 0)}</Typography></Card>
        <Card sx={{ p: 1.5, minWidth: 150 }}><Typography variant="caption" color="text.secondary">Outstanding</Typography><Typography fontWeight={600}>{formatCents(f?.outstandingCents ?? 0)}</Typography></Card>
        <Card sx={{ p: 1.5, minWidth: 150 }}><Typography variant="caption" color="text.secondary">Overdue</Typography><Typography fontWeight={600}>{formatCents(f?.overdueCents ?? 0)}</Typography></Card>
      </Stack>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} variant="scrollable">
        <Tab label="Overview" /><Tab label="Monthly" /><Tab label="Billing history" /><Tab label="Payments" /><Tab label="SMS" /><Tab label="Activity" /><Tab label="Deposit" />
      </Tabs>
      {tab === 0 && (
        <Card sx={{ p: 2 }}>
          <Stack spacing={1}>
            <Typography variant="body2">Current period: {f?.currentPeriod}</Typography>
            {f?.oldestUnpaidPeriod && (
              <Typography variant="body2">Oldest unpaid period: {f.oldestUnpaidPeriod}</Typography>
            )}
            {f?.balanceSource && (
              <Typography variant="caption" color="text.secondary">
                Account balance source: {f.balanceSource}
              </Typography>
            )}
          </Stack>
        </Card>
      )}
      {tab === 1 && (
        <Card sx={{ p: 2 }}>
          {(tenant.monthly ?? []).length === 0 ? <Typography color="text.secondary">No RentCharge rows yet.</Typography> : (
            <Table size="small">
              <TableHead><TableRow><TableCell>Month</TableCell><TableCell align="right">Billed</TableCell><TableCell align="right">Paid</TableCell><TableCell align="right">Outstanding</TableCell></TableRow></TableHead>
              <TableBody>
                {tenant.monthly!.map((row) => (
                  <TableRow key={row.period}>
                    <TableCell>{row.period}</TableCell>
                    <TableCell align="right">{formatCents(row.billedCents)}</TableCell>
                    <TableCell align="right">{formatCents(row.paidCents)}</TableCell>
                    <TableCell align="right">{formatCents(row.outstandingCents)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}
      {tab === 2 && (
        <Card sx={{ p: 2 }}>
          {(tenant.billingHistory ?? []).length === 0 ? <Typography color="text.secondary">No billing history.</Typography> : (
            <Stack spacing={1} divider={<Divider />}>
              {tenant.billingHistory!.map((c) => (
                <Box key={c._id}>
                  <Typography fontWeight={600}>{c.period} · {c.chargeType} · {c.status}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Due {formatCents(c.amountDueCents)} · Paid {formatCents(c.amountPaidCents)} · Balance {formatCents(c.balanceCents)}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </Card>
      )}
      {tab === 3 && (
        <Card sx={{ p: 2 }}>
          {(tenant.payments ?? []).length === 0 ? <Typography color="text.secondary">No payments.</Typography> : (
            <Stack spacing={1} divider={<Divider />}>
              {tenant.payments!.map((pay) => (
                <Box key={pay._id}>
                  <Typography fontWeight={600}>{formatCents(pay.amountCents)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {pay.paymentDate ? new Date(pay.paymentDate).toLocaleDateString() : '—'}
                    {pay.paymentReference ? ` · ${pay.paymentReference}` : ''}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </Card>
      )}
      {tab === 4 && (
        <Card sx={{ p: 2 }}>
          {(tenant.smsHistory ?? []).length === 0 ? <Typography color="text.secondary">No SMS history.</Typography> : (
            <Stack spacing={1} divider={<Divider />}>
              {tenant.smsHistory!.map((m) => (
                <Box key={m._id}>
                  <Chip size="small" label={m.status} variant="outlined" />
                  <Typography variant="body2">{m.message}</Typography>
                </Box>
              ))}
            </Stack>
          )}
        </Card>
      )}
      {tab === 5 && (
        <Card sx={{ p: 2 }}>
          {(tenant.activity ?? []).length === 0 ? <Typography color="text.secondary">No activity.</Typography> : (
            <Stack spacing={1} divider={<Divider />}>
              {tenant.activity!.map((a, i) => (
                <Box key={i}>
                  <Typography fontWeight={600}>{a.action}</Typography>
                  {a.description && <Typography variant="caption" color="text.secondary">{a.description}</Typography>}
                </Box>
              ))}
            </Stack>
          )}
        </Card>
      )}
      {tab === 6 && <TenantDepositPanel tenantId={tenantId} tenantStatus={tenant.status} />}
    </>
  );
}

function TenantDepositPanel({ tenantId, tenantStatus }: { tenantId: string; tenantStatus: string }) {
  const { user } = useSession();
  const canManage = user ? permissions.canManageTenants(user.role) : false;
  const qc = useQueryClient();
  const [requireKes, setRequireKes] = useState('');
  const [payKes, setPayKes] = useState('');
  const [deductKes, setDeductKes] = useState('');
  const [deductReason, setDeductReason] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['deposit', tenantId],
    queryFn: () => depositsApi.get(tenantId),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['deposit', tenantId] });

  const requireMut = useMutation({
    mutationFn: () => depositsApi.require(tenantId, Math.round(Number(requireKes) * 100)),
    onSuccess: () => { setMsg('Deposit requirement saved'); setRequireKes(''); invalidate(); },
    onError: (e) => setMsg(e instanceof ApiError ? e.message : 'Failed'),
  });
  const payMut = useMutation({
    mutationFn: () => depositsApi.pay(tenantId, Math.round(Number(payKes) * 100)),
    onSuccess: () => { setMsg('Deposit payment recorded (does not affect rent balance)'); setPayKes(''); invalidate(); },
    onError: (e) => setMsg(e instanceof ApiError ? e.message : 'Failed'),
  });
  const deductMut = useMutation({
    mutationFn: () => depositsApi.deduct(tenantId, { amountCents: Math.round(Number(deductKes) * 100), reason: deductReason }),
    onSuccess: () => { setMsg('Deduction recorded'); setDeductKes(''); setDeductReason(''); invalidate(); },
    onError: (e) => setMsg(e instanceof ApiError ? e.message : 'Failed'),
  });
  const settleMut = useMutation({
    mutationFn: () => depositsApi.settle(tenantId),
    onSuccess: (res: unknown) => {
      const r = res as { settlement?: { refundDueCents?: number } };
      setMsg(`Settled. Refund due: ${formatCents(r?.settlement?.refundDueCents ?? 0)}`);
      invalidate();
    },
    onError: (e) => setMsg(e instanceof ApiError ? e.message : 'Failed'),
  });

  const dep = data?.deposit;
  if (isLoading) return <Skeleton height={120} />;
  if (error) return <Alert severity="error">{error instanceof ApiError ? error.message : 'Unable to load deposit'}</Alert>;

  return (
    <Card sx={{ p: 2 }}>
      <Typography variant="subtitle1" gutterBottom>Security deposit</Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
        Separate from rent. Deposit payments do not change the rent Ledger balance.
      </Typography>
      {msg && <Alert severity="info" sx={{ mb: 2 }} onClose={() => setMsg(null)}>{msg}</Alert>}
      {!dep ? (
        <Typography color="text.secondary" sx={{ mb: 2 }}>No deposit configured for this tenant yet.</Typography>
      ) : (
        <Stack spacing={1} sx={{ mb: 2 }}>
          <Typography>Status: <Chip size="small" label={dep.status} /></Typography>
          <Typography>Required: {formatCents(dep.requiredCents)}</Typography>
          <Typography>Paid: {formatCents(dep.paidCents)}</Typography>
          <Typography>Currently held: {formatCents(dep.heldCents)}</Typography>
          <Typography>Refunded: {formatCents(dep.refundedCents)}</Typography>
          {(dep.deductions?.length ?? 0) > 0 && (
            <Box>
              <Typography variant="subtitle2">Deductions</Typography>
              {dep.deductions!.map((d, i) => (
                <Typography key={i} variant="body2">
                  {formatCents(d.amountCents)} — {d.reason}
                  {d.deductedAt ? ` · ${new Date(d.deductedAt).toLocaleDateString()}` : ''}
                </Typography>
              ))}
            </Box>
          )}
        </Stack>
      )}
      {canManage && (
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField size="small" label="Required (KES)" type="number" value={requireKes} onChange={(e) => setRequireKes(e.target.value)} />
            <Button variant="outlined" disabled={!requireKes || requireMut.isPending} onClick={() => requireMut.mutate()}>Set requirement</Button>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField size="small" label="Payment (KES)" type="number" value={payKes} onChange={(e) => setPayKes(e.target.value)} />
            <Button variant="outlined" disabled={!payKes || payMut.isPending} onClick={() => payMut.mutate()}>Record deposit payment</Button>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField size="small" label="Deduction (KES)" type="number" value={deductKes} onChange={(e) => setDeductKes(e.target.value)} />
            <TextField size="small" label="Reason" value={deductReason} onChange={(e) => setDeductReason(e.target.value)} />
            <Button variant="outlined" color="warning" disabled={!deductKes || !deductReason || deductMut.isPending} onClick={() => deductMut.mutate()}>Add deduction</Button>
          </Stack>
          <Button
            variant="contained"
            color="secondary"
            disabled={settleMut.isPending || !dep}
            onClick={() => {
              if (window.confirm('Settle move-out? This refunds remaining held deposit and marks the tenant moved out.')) settleMut.mutate();
            }}
          >
            Settle move-out / refund
          </Button>
        </Stack>
      )}
    </Card>
  );
}
