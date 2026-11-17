'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card, Stack, Typography, Tabs, Tab, Chip, Button, Skeleton, Alert, Divider, Box } from '@mui/material';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { housesApi } from '@/lib/api/houses';
import { billingApi } from '@/lib/api/billing';
import { formatCents, formatAmount, formatMaybeCents, UNAVAILABLE } from '@/lib/formatting/currency';
import { PaymentStatusChip, PaymentOriginChip } from '@/components/data-display/status-chip';
import { KnownArrearsCard, MetricCard } from '@/features/finance/metric-card';
import { ApiError } from '@/lib/api/client';
import { openWorkspace, readWorkspaceId } from '@/lib/navigation/workspace';

export default function HouseWorkspacePage() {
  const router = useRouter();
  const [houseId, setHouseId] = useState('');
  const [tab, setTab] = useState(0);

  useEffect(() => {
    const id = readWorkspaceId('house');
    if (id) setHouseId(id);
  }, []);

  const { data: house, isLoading, error } = useQuery({
    queryKey: ['house', houseId],
    queryFn: () => housesApi.get(houseId),
    enabled: !!houseId,
  });
  const { data: account, isLoading: accountLoading, error: accountError } = useQuery({
    queryKey: ['house-billing-account', houseId],
    queryFn: () => billingApi.houseAccount(houseId),
    enabled: !!houseId,
  });

  if (!houseId) {
    return (
      <Alert severity="info">
        No house selected.
        <Button component={Link} href="/houses" size="small" sx={{ ml: 2 }}>Back to houses</Button>
      </Alert>
    );
  }
  if (isLoading) return <Stack spacing={2}><Skeleton height={48} /><Skeleton height={160} /></Stack>;
  if (error || !house) {
    return (
      <Alert severity="error">
        {error instanceof ApiError ? error.message : 'House not found.'}
        <Button component={Link} href="/houses" size="small" sx={{ ml: 2 }}>Back</Button>
      </Alert>
    );
  }

  return (
    <>
      <PageHeader
        title={`House ${house.houseNumber}`}
        description={[house.estate?.name, house.houseType?.name || 'Unassigned type', house.status].filter(Boolean).join(' · ')}
        actions={
          <Stack direction="row" spacing={1}>
            {house.estate && (
              <Button size="small" variant="outlined" onClick={() => openWorkspace('estate', house.estate!._id, router)}>Estate</Button>
            )}
            <Button component={Link} href="/houses" startIcon={<ArrowLeft size={16} />} variant="outlined" size="small">All houses</Button>
          </Stack>
        }
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <Card sx={{ p: 1.5, minWidth: 140 }}><Typography variant="caption" color="text.secondary">Occupancy</Typography><div><Chip size="small" label={house.status} color={house.status === 'occupied' ? 'success' : 'default'} /></div></Card>
        <MetricCard label="Listed rent" value={formatAmount(house.monthlyRent)} />
        {account && !account.currentTenancyId ? (
          <MetricCard label="Current tenancy balance" value="No active tenancy" caveat="Nothing is attributed to an occupant while the house is vacant." />
        ) : (
          <KnownArrearsCard label="Current tenancy balance" knownArrearsCents={account?.totals.currentTenancyBalanceCents} verifiedFullObligation={account?.totals.currentTenancyBalanceVerified} loading={accountLoading} loadFailed={Boolean(accountError)} />
        )}
        <KnownArrearsCard label="House-wide known arrears" knownArrearsCents={account?.totals.knownArrearsCents} verifiedFullObligation={account?.totals.verifiedFullObligation} loading={accountLoading} loadFailed={Boolean(accountError)} />
        <MetricCard label="Unattributed legacy" value={formatMaybeCents(account?.totals.historicalUnattributedCents)} caveat={account ? 'Open charges with no tenancy. Not assigned to any occupant.' : accountError ? 'Could not be loaded.' : null} loading={accountLoading} />
        <Card sx={{ p: 1.5, minWidth: 160 }}>
          <Typography variant="caption" color="text.secondary">Tenant</Typography>
          <Typography fontWeight={600} sx={house.tenant ? { cursor: 'pointer' } : undefined} onClick={() => house.tenant && openWorkspace('tenant', house.tenant._id, router)}>
            {house.tenant?.name || '—'}
          </Typography>
        </Card>
      </Stack>
      {accountError ? <Alert severity="warning" sx={{ mb: 2 }}>Financial figures could not be loaded, so they are shown as unavailable rather than zero.</Alert> : null}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} variant="scrollable">
        <Tab label="Overview" /><Tab label="Billing" /><Tab label="Payments" /><Tab label="Arrears" /><Tab label="Activity" /><Tab label="Tenant" />
      </Tabs>
      {tab === 0 && (
        <Card sx={{ p: 2 }}>
          <Stack spacing={1}>
            <Typography variant="body2">Type: <strong>{house.houseType?.name || 'Unassigned'}</strong></Typography>
            <Typography variant="body2">House-wide, all tenancies: billed {formatMaybeCents(account?.totals.billedCents)} · paid {formatMaybeCents(account?.totals.paidCents)}</Typography>
          </Stack>
        </Card>
      )}
      {tab === 1 && (
        <Stack spacing={2}>
          <Card sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Configuration</Typography>
            {(account?.billingConfigs ?? []).length === 0 ? (
              <Typography color="text.secondary" variant="body2">No billing lines configured.</Typography>
            ) : (
              <Stack spacing={1}>
                {(account?.billingConfigs ?? []).map((c) => (
                  <Box key={c._id}>
                    <Typography fontWeight={600}>{c.chargeType} · {formatCents(c.amountCents)}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Due day {c.dueDay ?? '—'} · {c.isActive === false ? 'Inactive' : 'Active'}
                      {c.frequency ? ` · ${c.frequency}` : ''}
                      {c.effectiveFrom ? ` · from ${c.effectiveFrom.slice(0, 10)}` : ''}
                      {c.effectiveTo ? ` to ${c.effectiveTo.slice(0, 10)}` : ''}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Card>
          <Card sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Current period ({account?.period ?? '—'})</Typography>
            {(account?.currentCharges ?? []).length === 0 ? (
              <Typography color="text.secondary" variant="body2">No charges yet. Generate from estate workspace.</Typography>
            ) : (
              <Stack spacing={1}>
                {account!.currentCharges.map((c) => (
                  <Typography key={c._id} fontWeight={600}>
                    {c.chargeType} · {c.status} · due {formatCents(c.amountDueCents)} · paid {formatCents(c.amountPaidCents)} · bal {formatCents(c.balanceCents)}
                    <Typography component="span" variant="caption" color="text.secondary"> · {!c.tenancyId ? 'Unattributed legacy' : c.tenancyId === account!.currentTenancyId ? 'Current tenancy' : 'Previous tenancy'}</Typography>
                  </Typography>
                ))}
              </Stack>
            )}
            {account?.totals && account.totals.overdueCents > 0 ? (
              <Typography variant="body2" sx={{ mt: 1 }}>Overdue open charges: {formatCents(account.totals.overdueCents)}</Typography>
            ) : null}
          </Card>
          <Card sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>History by period</Typography>
            {(account?.monthly ?? []).length === 0 ? (
              <Typography color="text.secondary" variant="body2">No history.</Typography>
            ) : (
              <Stack spacing={1}>
                {account!.monthly.map((m) => (
                  <Box key={m.period}>
                    <Typography fontWeight={600}>{m.period} · {m.status}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Billed {formatCents(m.billedCents)} · Paid {formatCents(m.paidCents)} · Open {formatCents(m.outstandingCents)}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Card>
        </Stack>
      )}
      {tab === 2 && (
        <Card sx={{ p: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>Confirmed payments only (most recent 100). Reversed payments are not included.</Typography>
          {accountError ? (
            <Typography color="text.secondary">Payments could not be loaded.</Typography>
          ) : (account?.payments ?? []).length === 0 ? (
            <Typography color="text.secondary">{accountLoading ? 'Loading…' : 'No confirmed payments recorded.'}</Typography>
          ) : (
            <Stack spacing={1}>
              {account!.payments.map((pay) => (
                <Stack key={pay._id} direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography variant="body2">
                    {formatCents(pay.amountCents)} · {pay.paymentDate ? new Date(pay.paymentDate).toLocaleDateString() : '—'}
                    {pay.paymentReference ? ` · ${pay.paymentReference}` : ''}
                  </Typography>
                  <PaymentOriginChip origin={pay.origin} />
                  <PaymentStatusChip status={pay.status} />
                </Stack>
              ))}
            </Stack>
          )}
          <Button component={Link} href="/payments" variant="outlined" size="small" sx={{ mt: 2 }}>All payments</Button>
        </Card>
      )}
      {tab === 3 && (
        <Card sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            <Typography variant="body2" color="text.secondary">{account?.totals.note ?? 'Arrears are reported separately for the current occupant, the whole house, and legacy charges with no tenancy.'}</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap" useFlexGap>
              <KnownArrearsCard label="Current tenancy" knownArrearsCents={account?.totals.currentTenancyBalanceCents} verifiedFullObligation={account?.totals.currentTenancyBalanceVerified} loading={accountLoading} loadFailed={Boolean(accountError)} />
              <KnownArrearsCard label="House-wide, all tenancies" knownArrearsCents={account?.totals.knownArrearsCents} verifiedFullObligation={account?.totals.verifiedFullObligation} loading={accountLoading} loadFailed={Boolean(accountError)} />
              <MetricCard label="Unattributed legacy" value={formatMaybeCents(account?.totals.historicalUnattributedCents)} loading={accountLoading} caveat="Not assigned to any occupant." />
              <MetricCard label="Overdue open charges" value={formatMaybeCents(account?.totals.overdueCents)} loading={accountLoading} />
            </Stack>
            <Typography variant="caption" color="text.secondary">Source: {account?.totals.balanceSource ?? UNAVAILABLE}</Typography>
          </Stack>
          <Button component={Link} href="/reports" variant="outlined" size="small" sx={{ mt: 2 }}>Reports</Button>
        </Card>
      )}
      {tab === 4 && (
        <Card sx={{ p: 2 }}>
          {(house.activity ?? []).length === 0 ? (
            <Typography color="text.secondary">No recent activity.</Typography>
          ) : (
            <Stack spacing={1} divider={<Divider />}>
              {house.activity!.map((a, i) => (
                <Box key={i}>
                  <Typography variant="body2" fontWeight={600}>{a.action}</Typography>
                  {a.description && <Typography variant="caption" color="text.secondary">{a.description}</Typography>}
                </Box>
              ))}
            </Stack>
          )}
        </Card>
      )}
      {tab === 5 && (
        <Card sx={{ p: 2 }}>
          {house.tenant ? (
            <Stack spacing={1}>
              <Typography fontWeight={600}>{house.tenant.name}</Typography>
              <Typography variant="body2">{house.tenant.phone}</Typography>
              <Button variant="contained" size="small" onClick={() => openWorkspace('tenant', house.tenant!._id, router)}>Open tenant workspace</Button>
            </Stack>
          ) : (
            <Typography color="text.secondary">Vacant — House Type: {house.houseType?.name || 'Unassigned'}.</Typography>
          )}
        </Card>
      )}
    </>
  );
}
