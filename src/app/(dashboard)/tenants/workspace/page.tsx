'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Card, Stack, Typography, Tabs, Tab, Chip, Button, Skeleton, Alert, Table, TableHead, TableRow, TableCell, TableBody, Divider, Box,
} from '@mui/material';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { tenantsApi } from '@/lib/api/tenants';
import { formatCents, formatMaybeCents } from '@/lib/formatting/currency';
import { ApiError } from '@/lib/api/client';
import { openWorkspace, readWorkspaceId } from '@/lib/navigation/workspace';
import { TenantDepositPanel } from '@/features/deposits/deposit-panel';
import { KnownArrearsCard, MetricCard } from '@/features/finance/metric-card';
import { PaymentStatusChip } from '@/components/data-display/status-chip';

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
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <Card sx={{ p: 1.5, minWidth: 140 }}><Typography variant="caption" color="text.secondary">Status</Typography><div><Chip size="small" label={tenant.status} color={tenant.status === 'active' ? 'success' : 'default'} /></div></Card>
        <MetricCard label="Billed (open charges)" value={formatMaybeCents(f?.billedCents)} />
        <MetricCard label="Paid (open charges)" value={formatMaybeCents(f?.paidCents)} />
        <KnownArrearsCard label="Known arrears" knownArrearsCents={f?.outstandingCents} verifiedFullObligation={f?.verifiedFullObligation} />
        <MetricCard label="Overdue open charges" value={formatMaybeCents(f?.overdueCents)} />
      </Stack>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} variant="scrollable">
        <Tab label="Overview" /><Tab label="Monthly" /><Tab label="Billing history" /><Tab label="Payments" /><Tab label="SMS" /><Tab label="Activity" /><Tab label="Deposit" />
      </Tabs>
      {tab === 0 && (
        <Card sx={{ p: 2 }}>
          <Stack spacing={1}>
            <Typography variant="body2">Current period: {f?.currentPeriod ?? 'Not available'}</Typography>
            {f && !f.verifiedFullObligation ? (
              <Alert severity="info">Known arrears are a lower bound. Earlier history for this tenant has not been verified, so the true obligation may be higher.</Alert>
            ) : null}
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
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography fontWeight={600} sx={pay.status === 'REVERSED' ? { textDecoration: 'line-through', color: 'text.secondary' } : undefined}>{formatCents(pay.amountCents)}</Typography>
                    <PaymentStatusChip status={pay.status} />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {pay.paymentDate ? new Date(pay.paymentDate).toLocaleDateString() : '—'}
                    {pay.paymentReference ? ` · ${pay.paymentReference}` : ''}
                    {pay.status === 'REVERSED' ? ' · Reversed: not counted as collected' : ''}
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
      {tab === 6 && <TenantDepositPanel tenantId={tenantId} />}
    </>
  );
}
