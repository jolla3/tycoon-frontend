'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card, Stack, Typography, Tabs, Tab, Chip, Button, Box, Skeleton, Alert,
} from '@mui/material';
import { Home, Users, ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { estatesApi } from '@/lib/api/estates';
import { housesApi } from '@/lib/api/houses';
import { tenantsApi } from '@/lib/api/tenants';
import { houseTypesApi } from '@/lib/api/house-types';
import { billingApi } from '@/lib/api/billing';
import { formatCents } from '@/lib/formatting/currency';
import { ApiError } from '@/lib/api/client';
import { useSession } from '@/features/auth/session-context';
import { permissions } from '@/lib/permissions/permissions';
import { useConnectivity } from '@/lib/sync/connectivity';
import { openWorkspace, openScopedList, readWorkspaceId } from '@/lib/navigation/workspace';

export default function EstateWorkspacePage() {
  const router = useRouter();
  const [estateId, setEstateId] = useState('');
  const [tab, setTab] = useState(0);
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    const id = readWorkspaceId('estate');
    if (id) setEstateId(id);
  }, []);

  const { data: workspace, isLoading, error } = useQuery({
    queryKey: ['estate-workspace', estateId],
    queryFn: () => estatesApi.workspace(estateId),
    enabled: !!estateId,
  });
  const { data: housesPage } = useQuery({
    queryKey: ['houses', 'estate', estateId],
    queryFn: () => housesApi.list({ estateId, limit: 500 }),
    enabled: !!estateId,
  });
  const { data: tenants } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => tenantsApi.list(),
    enabled: !!estateId,
  });
  const { data: houseTypes } = useQuery({
    queryKey: ['house-types'],
    queryFn: () => houseTypesApi.list(true),
    enabled: !!estateId,
  });

  const estateTenants = useMemo(
    () => (tenants ?? []).filter((t) => String(t.estateId) === estateId),
    [tenants, estateId]
  );
  const houses = housesPage?.items ?? [];
  const filteredHouses =
    typeFilter === 'all'
      ? houses
      : typeFilter === 'none'
        ? houses.filter((h) => !h.houseTypeId)
        : houses.filter((h) => String(h.houseTypeId) === typeFilter);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof houses>();
    for (const h of filteredHouses) {
      const key = h.houseType?.name || 'Unassigned type';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(h);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredHouses]);

  if (!estateId) {
    return (
      <Alert severity="info">
        No estate selected.
        <Button component={Link} href="/estates" size="small" sx={{ ml: 2 }}>Back to estates</Button>
      </Alert>
    );
  }
  if (isLoading) return <Stack spacing={2}><Skeleton height={48} /><Skeleton height={120} /></Stack>;
  if (error || !workspace) {
    return (
      <Alert severity="error">
        {error instanceof ApiError ? error.message : 'Unable to load estate workspace.'}
        <Button component={Link} href="/estates" size="small" sx={{ ml: 2 }}>Back</Button>
      </Alert>
    );
  }

  const m = workspace.metrics;

  return (
    <>
      <PageHeader
        title={workspace.estate.name}
        description={workspace.estate.address || 'Estate workspace'}
        actions={
          <Button component={Link} href="/estates" startIcon={<ArrowLeft size={16} />} variant="outlined">
            All estates
          </Button>
        }
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
        <Metric label="Houses" value={String(m.houseCount)} icon={<Home size={18} />} />
        <Metric label="Occupied" value={String(m.occupiedHouses)} />
        <Metric label="Vacant" value={String(m.vacantHouses)} />
        <Metric label="Tenants" value={String(m.tenantCount)} icon={<Users size={18} />} />
        <Metric label={`Billed (${workspace.period})`} value={formatCents(m.currentPeriodBilledCents)} />
        <Metric label="Collected" value={formatCents(m.currentPeriodCollectedCents)} />
        <Metric label="Period outstanding" value={formatCents(m.currentPeriodOutstandingCents)} />
        <Metric label="Open balances" value={formatCents(m.openOutstandingCents)} />
      </Stack>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} variant="scrollable">
        <Tab label="Overview" /><Tab label="Houses" /><Tab label="Tenants" /><Tab label="Payments" />
        <Tab label="Arrears" /><Tab label="Billing" /><Tab label="SMS" /><Tab label="Activity" />
      </Tabs>
      {tab === 0 && (
        <Card sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary">Period {workspace.period}. Figures from RentCharge records.</Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
            <Button component={Link} href="/houses" variant="outlined" size="small">Houses</Button>
            <Button component={Link} href="/tenants" variant="outlined" size="small">Tenants</Button>
            <Button component={Link} href="/payments" variant="outlined" size="small">Payments</Button>
            <Button component={Link} href="/sms" variant="outlined" size="small">SMS</Button>
          </Stack>
        </Card>
      )}
      
      {tab === 0 && workspace.byHouseType && workspace.byHouseType.length > 0 && (
        <Card sx={{ p: 2, mt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Houses by type</Typography>
          <Stack spacing={1}>
            {workspace.byHouseType.map((row) => (
              <Stack key={row.name + String(row.houseTypeId)} direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1}
                sx={{ py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box>
                  <Typography fontWeight={600}
                    sx={row.houseTypeId ? { cursor: 'pointer' } : undefined}
                    onClick={() => row.houseTypeId && openWorkspace('houseType', row.houseTypeId, router)}>
                    {row.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {row.houseCount} houses · {row.occupied} occupied · {row.vacant} vacant
                  </Typography>
                </Box>
                <Typography variant="body2">
                  Billed {formatCents(row.billedCents)} · Collected {formatCents(row.collectedCents)} · Out {formatCents(row.outstandingCents)}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Card>
      )}

{tab === 1 && (
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label="All" color={typeFilter === 'all' ? 'primary' : 'default'} onClick={() => setTypeFilter('all')} clickable />
            {(houseTypes ?? []).filter((t) => t.isActive).map((t) => (
              <Chip key={t._id} label={t.name} color={typeFilter === t._id ? 'primary' : 'default'} onClick={() => setTypeFilter(t._id)} clickable />
            ))}
            <Chip label="Unassigned" color={typeFilter === 'none' ? 'primary' : 'default'} onClick={() => setTypeFilter('none')} clickable />
          </Stack>
          {grouped.map(([typeName, list]) => (
            <Card key={typeName} sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>{typeName} ({list.length})</Typography>
              <Stack spacing={1}>
                {list.map((h) => (
                  <Stack key={h._id} direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1}
                    sx={{ py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box>
                      <Typography fontWeight={600} sx={{ cursor: 'pointer' }} onClick={() => openWorkspace('house', h._id, router)}>
                        {h.houseNumber}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {h.tenant?.name ? `Tenant: ${h.tenant.name}` : 'No tenant'} · {formatCents(h.balance?.outstandingCents ?? 0)} outstanding
                      </Typography>
                    </Box>
                    <Chip size="small" label={h.status} color={h.status === 'occupied' ? 'success' : 'default'} variant="outlined" />
                  </Stack>
                ))}
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
      {tab === 2 && (
        <Card sx={{ p: 2 }}>
          {estateTenants.length === 0 ? <Typography color="text.secondary">No tenants.</Typography> : (
            <Stack spacing={1}>
              {estateTenants.map((t) => (
                <Stack key={t._id} direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography fontWeight={600} sx={{ cursor: 'pointer' }} onClick={() => openWorkspace('tenant', t._id, router)}>{t.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{t.phone} · {t.status}</Typography>
                  </Box>
                  <Button size="small" onClick={() => openWorkspace('tenant', t._id, router)}>Open</Button>
                </Stack>
              ))}
            </Stack>
          )}
        </Card>
      )}
      {(tab === 3 || tab === 4 || tab === 6 || tab === 7) && (
        <Card sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Opens the global page scoped to this estate via session (no ids in the URL). The API still enforces
            estate isolation for restricted STAFF.
          </Typography>
          <Button
            variant="contained"
            size="small"
            onClick={() =>
              openScopedList(
                tab === 3 ? '/payments' : tab === 6 ? '/sms' : '/reports',
                estateId,
                router
              )
            }
          >
            {tab === 3
              ? 'Payments for this estate'
              : tab === 4
                ? 'Arrears / reports for this estate'
                : tab === 6
                  ? 'SMS for this estate'
                  : 'Activity / reports for this estate'}
          </Button>
        </Card>
      )}
      {tab === 5 && (
        <Card sx={{ p: 2 }}>
          <EstateBillingGenerate estateId={estateId} />
          <Button component={Link} href="/houses" variant="outlined" size="small" sx={{ mt: 2 }}>Configure house billing</Button>
        </Card>
      )}
    </>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <Card sx={{ p: 1.5, minWidth: 140, flex: '1 1 140px' }}>
      <Stack direction="row" spacing={0.5} alignItems="center" color="text.secondary">{icon}<Typography variant="caption">{label}</Typography></Stack>
      <Typography variant="h6" fontWeight={600}>{value}</Typography>
    </Card>
  );
}

function EstateBillingGenerate({ estateId }: { estateId: string }) {
  const { user } = useSession();
  const canManage = user ? permissions.canManageHouses(user.role) : false;
  const connectivity = useConnectivity();
  const canReach = connectivity.state === 'online' || connectivity.state === 'syncing' || connectivity.state === 'sync-error';
  const queryClient = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const run = useMutation({
    mutationFn: () => billingApi.generate({ estateId }),
    onSuccess: (data) => {
      setErr(null);
      setMsg(`Period ${data.period}: created ${data.created} new charge(s). Re-runs create zero duplicates.`);
      queryClient.invalidateQueries({ queryKey: ['estate-workspace', estateId] });
    },
    onError: (e) => { setMsg(null); setErr(e instanceof ApiError ? e.message : 'Unable to generate billing'); },
  });
  if (!canManage) return <Typography variant="body2" color="text.secondary">Only owners and admins can generate period charges.</Typography>;
  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Generate this period&apos;s charges for occupied houses. Safe to run more than once.</Typography>
      {msg && <Alert severity="success" sx={{ mb: 1 }}>{msg}</Alert>}
      {err && <Alert severity="error" sx={{ mb: 1 }}>{err}</Alert>}
      <Button variant="contained" size="small" disabled={!canReach || run.isPending} onClick={() => { setMsg(null); setErr(null); run.mutate(); }}>
        {!canReach ? 'Offline' : run.isPending ? 'Generating…' : 'Generate period charges'}
      </Button>
    </Box>
  );
}
