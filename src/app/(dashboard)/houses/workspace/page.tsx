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
import { formatCents, formatAmount } from '@/lib/formatting/currency';
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
  const { data: account } = useQuery({
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
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
        <Card sx={{ p: 1.5, minWidth: 140 }}><Typography variant="caption" color="text.secondary">Occupancy</Typography><Chip size="small" label={house.status} color={house.status === 'occupied' ? 'success' : 'default'} /></Card>
        <Card sx={{ p: 1.5, minWidth: 160 }}><Typography variant="caption" color="text.secondary">Listed rent</Typography><Typography fontWeight={600}>{formatAmount(house.monthlyRent ?? 0)}</Typography></Card>
        <Card sx={{ p: 1.5, minWidth: 160 }}><Typography variant="caption" color="text.secondary">Outstanding</Typography><Typography fontWeight={600}>{formatCents(account?.totals?.outstandingCents ?? house.balance?.outstandingCents ?? 0)}</Typography></Card>
        <Card sx={{ p: 1.5, minWidth: 160 }}>
          <Typography variant="caption" color="text.secondary">Tenant</Typography>
          <Typography fontWeight={600} sx={house.tenant ? { cursor: 'pointer' } : undefined} onClick={() => house.tenant && openWorkspace('tenant', house.tenant._id, router)}>
            {house.tenant?.name || '—'}
          </Typography>
        </Card>
      </Stack>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} variant="scrollable">
        <Tab label="Overview" /><Tab label="Billing" /><Tab label="Payments" /><Tab label="Arrears" /><Tab label="Activity" /><Tab label="Tenant" />
      </Tabs>
      {tab === 0 && (
        <Card sx={{ p: 2 }}>
          <Stack spacing={1}>
            <Typography variant="body2">Type: <strong>{house.houseType?.name || 'Unassigned'}</strong></Typography>
            <Typography variant="body2">All-time billed {formatCents(account?.totals?.billedCents ?? 0)} · paid {formatCents(account?.totals?.paidCents ?? 0)}</Typography>
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
                  <Box key={c.chargeType + String(c._id)}>
                    <Typography fontWeight={600}>{c.chargeType} · {formatCents(c.amountCents)}</Typography>
                    <Typography variant="caption" color="text.secondary">Due day {c.dueDay ?? '—'} · {c.isActive === false ? 'Inactive' : 'Active'}</Typography>
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
                  </Typography>
                ))}
              </Stack>
            )}
            {account?.totals && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Outstanding {formatCents(account.totals.outstandingCents)}
                {account.totals.overdueCents > 0 ? ` · Overdue ${formatCents(account.totals.overdueCents)}` : ''}
                {account.totals.balanceSource ? ` · source ${account.totals.balanceSource}` : ''}
              </Typography>
            )}
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
                      Billed {formatCents(m.billedCents)} · Paid {formatCents(m.paidCents)} · Out {formatCents(m.outstandingCents)}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Card>
        </Stack>
      )}
      {(tab === 2 || tab === 3) && (
        <Card sx={{ p: 2 }}>
          {(account?.payments ?? []).length === 0 ? (
            <Typography color="text.secondary">No payments recorded.</Typography>
          ) : (
            <Stack spacing={1}>
              {account!.payments.map((pay) => (
                <Typography key={pay._id} variant="body2">
                  {formatCents(pay.amountCents)} · {pay.paymentDate ? new Date(pay.paymentDate).toLocaleDateString() : '—'}
                  {pay.paymentReference ? ` · ${pay.paymentReference}` : ''}
                </Typography>
              ))}
            </Stack>
          )}
          <Button component={Link} href={tab === 2 ? '/payments' : '/reports'} variant="outlined" size="small" sx={{ mt: 2 }}>
            {tab === 2 ? 'All payments' : 'Reports'}
          </Button>
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
