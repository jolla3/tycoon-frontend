'use client';

// SUPER_ADMIN-only client workspace. The client id in this URL is a routing
// parameter, never authorization: every request below is re-checked by the
// backend against the caller's SUPER_ADMIN role.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Card, Checkbox, Chip, FormControlLabel, FormGroup, MenuItem, Skeleton, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ErrorState } from '@/components/feedback/error-state';
import { EvidenceView } from '@/features/platform/evidence-view';
import { ActiveChip, ProductChips } from '@/features/platform/product-chips';
import { platformApi, type PlatformClientDetail, type PlatformPlan, type Product, type UpdateClientSubscriptionInput } from '@/lib/api/platform';
import { platformKeys } from '@/lib/query/keys';
import { dateFormat } from '@/lib/dates/period';

const TABS = ['Overview', 'Products & Subscription', 'Integrations', 'Diagnostics', 'Activity'] as const;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Box>{children}</Box>
    </Box>
  );
}

function OverviewTab({ client }: { client: PlatformClientDetail }) {
  const qc = useQueryClient();
  const toggle = useMutation({
    mutationFn: () => (client.isActive ? platformApi.clients.deactivate(client._id) : platformApi.clients.activate(client._id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: platformKeys.client(client._id) });
      qc.invalidateQueries({ queryKey: platformKeys.clientsFamily() });
      qc.invalidateQueries({ queryKey: platformKeys.overview() });
      qc.invalidateQueries({ queryKey: platformKeys.diagnostics(client._id) });
    },
  });
  return (
    <Card sx={{ p: 2.5 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
        <Field label="Status"><ActiveChip active={client.isActive} /></Field>
        <Field label="Owner"><Typography variant="body2">{client.owner?.name ?? '—'}<br />{client.owner?.email ?? ''}</Typography></Field>
        <Field label="Created"><Typography variant="body2">{client.createdAt ? dateFormat(client.createdAt, 'DD MMM YYYY') : '—'}</Typography></Field>
        <Field label="Estates"><Typography variant="body2">{client.estateCount}</Typography></Field>
        <Field label="Houses"><Typography variant="body2">{client.houseCount}</Typography></Field>
        <Field label="Staff"><Typography variant="body2">{client.staffCount ?? '—'}</Typography></Field>
      </Box>
      <Stack spacing={1} sx={{ mt: 3 }}>
        {toggle.isError ? <Alert severity="error">{(toggle.error as Error).message}</Alert> : null}
        <Box>
          <Button variant="outlined" color={client.isActive ? 'error' : 'primary'} disabled={toggle.isPending} onClick={() => toggle.mutate()}>
            {toggle.isPending ? 'Saving…' : client.isActive ? 'Deactivate client' : 'Activate client'}
          </Button>
        </Box>
        {client.isActive ? (
          <Typography variant="caption" color="text.secondary">
            Deactivating blocks ordinary operations for this client and its staff. Nothing is deleted.
          </Typography>
        ) : null}
      </Stack>
    </Card>
  );
}

function SubscriptionTab({ client }: { client: PlatformClientDetail }) {
  const qc = useQueryClient();
  const sub = client.subscription;
  const [plan, setPlan] = useState<PlatformPlan>('trial');
  const [products, setProducts] = useState<Product[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (!sub) return;
    setPlan((sub.plan as PlatformPlan) ?? 'trial');
    setProducts(sub.products ?? []);
    setStartDate(sub.startDate ? sub.startDate.slice(0, 10) : '');
    setEndDate(sub.endDate ? sub.endDate.slice(0, 10) : '');
  }, [sub]);

  const save = useMutation({
    mutationFn: (updates: UpdateClientSubscriptionInput) => platformApi.clients.updateSubscription(client._id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: platformKeys.client(client._id) });
      qc.invalidateQueries({ queryKey: platformKeys.clientsFamily() });
      qc.invalidateQueries({ queryKey: ['platform', 'entitlements'] });
      qc.invalidateQueries({ queryKey: platformKeys.overview() });
      qc.invalidateQueries({ queryKey: platformKeys.diagnostics(client._id) });
      qc.invalidateQueries({ queryKey: ['platform', 'subscriptions'] });
    },
  });

  if (!sub) {
    return (
      <Alert severity="warning">
        This client has no subscription record, so no products can be assigned. The backend can only update an existing subscription; it cannot create one from here. This needs a backend-side fix or data repair.
      </Alert>
    );
  }

  const dateOrderInvalid = Boolean(startDate && endDate && endDate < startDate);
  const toggle = (p: Product) => setProducts((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  function submit() {
    // Send only what changed; status is immutable and never sent.
    const updates: UpdateClientSubscriptionInput = {};
    if (!sub) return;
    if (plan !== sub.plan) updates.plan = plan;
    const before = [...(sub.products ?? [])].sort().join(',');
    if ([...products].sort().join(',') !== before) updates.products = products;
    if (startDate && startDate !== (sub.startDate ?? '').slice(0, 10)) updates.startDate = startDate;
    const prevEnd = (sub.endDate ?? '').slice(0, 10);
    if (endDate !== prevEnd) updates.endDate = endDate || null;
    if (Object.keys(updates).length === 0) return;
    save.mutate(updates);
  }

  return (
    <Card sx={{ p: 2.5 }}>
      <Stack spacing={2.5} sx={{ maxWidth: 520 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="subtitle1" fontWeight={600}>Subscription</Typography>
          <Chip size="small" variant="outlined" label={sub.status} />
        </Stack>
        {save.isError ? <Alert severity="error">{(save.error as Error).message}</Alert> : null}
        {save.isSuccess ? <Alert severity="success">Subscription updated.</Alert> : null}
        <TextField select label="Plan" value={plan} onChange={(e) => setPlan(e.target.value as PlatformPlan)}>
          <MenuItem value="trial">Trial</MenuItem>
          <MenuItem value="basic">Basic</MenuItem>
          <MenuItem value="pro">Pro</MenuItem>
        </TextField>
        <Box>
          <Typography variant="subtitle2">Products</Typography>
          <FormGroup row>
            <FormControlLabel control={<Checkbox checked={products.includes('BANKING')} onChange={() => toggle('BANKING')} />} label="Banking" />
            <FormControlLabel control={<Checkbox checked={products.includes('MPESA')} onChange={() => toggle('MPESA')} />} label="M-PESA" />
          </FormGroup>
          <Typography variant="caption" color="text.secondary">
            Entitlement only. Removing a product does not delete the client&apos;s bank connections or M-PESA setup; the client simply loses access until it is assigned again.
          </Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="Start date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
          <TextField label="End date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth error={dateOrderInvalid} helperText={dateOrderInvalid ? 'End date is before the start date.' : 'Clear to make open-ended.'} />
        </Stack>
        <Box>
          <Button variant="contained" onClick={submit} disabled={save.isPending || dateOrderInvalid}>
            {save.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </Box>
        <Typography variant="caption" color="text.secondary">
          Subscription status cannot be changed here, and expiry is not applied automatically by the backend.
        </Typography>
      </Stack>
    </Card>
  );
}

function IntegrationsTab({ client }: { client: PlatformClientDetail }) {
  return (
    <Stack spacing={2}>
      <Alert severity="info">Stored evidence only. These records are read-only here and are separate from product entitlement.</Alert>
      <Card sx={{ p: 2.5 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>Banking</Typography>
        <EvidenceView data={client.banking ?? client.bankingSummary ?? null} />
      </Card>
      <Card sx={{ p: 2.5 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>M-PESA</Typography>
        <EvidenceView data={client.mpesa ?? null} />
        {client.mpesaProfiles && client.mpesaProfiles.length > 0 ? (
          <Box sx={{ mt: 2 }}>
            <EvidenceView data={client.mpesaProfiles} />
          </Box>
        ) : null}
      </Card>
    </Stack>
  );
}

function DiagnosticsTab({ clientId }: { clientId: string }) {
  const { data, isLoading, error } = useQuery({ queryKey: platformKeys.diagnostics(clientId), queryFn: () => platformApi.diagnostics.get(clientId) });
  if (isLoading) return <Skeleton variant="rounded" height={200} />;
  if (error) return <ErrorState error={error} />;
  if (!data) return null;
  return (
    <Stack spacing={2}>
      <Alert severity="info">Read-only diagnostics. This is not impersonation: you cannot act as this client or its users.</Alert>
      <Card sx={{ p: 2.5 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>Operational access</Typography>
        <EvidenceView data={data.operationalAccess} />
      </Card>
      <Card sx={{ p: 2.5 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>Background job outcomes</Typography>
        <EvidenceView data={data.jobOutcomes} />
      </Card>
    </Stack>
  );
}

function ActivityTab({ clientId }: { clientId: string }) {
  const { data, isLoading, error } = useQuery({ queryKey: platformKeys.diagnostics(clientId), queryFn: () => platformApi.diagnostics.get(clientId) });
  if (isLoading) return <Skeleton variant="rounded" height={200} />;
  if (error) return <ErrorState error={error} />;
  const rows = data?.recentAudit ?? [];
  return (
    <Card sx={{ p: 2.5 }}>
      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>Recent audit activity</Typography>
      {rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No recent activity recorded for this client.</Typography>
      ) : (
        <Stack divider={<Box sx={{ borderTop: 1, borderColor: 'divider' }} />} spacing={1.5}>
          {rows.map((r, i) => (
            <Box key={r._id ?? i}>
              <Typography variant="body2" fontWeight={600}>{r.action}</Typography>
              <Typography variant="caption" color="text.secondary">
                {r.createdAt ? dateFormat(r.createdAt, 'DD MMM YYYY HH:mm') : ''}
                {typeof r.userId === 'object' && r.userId ? ` · ${r.userId.email ?? r.userId.name ?? ''}` : ''}
              </Typography>
              {r.description ? <Typography variant="body2">{r.description}</Typography> : null}
            </Box>
          ))}
        </Stack>
      )}
    </Card>
  );
}

export default function PlatformClientDetailPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;
  const [tab, setTab] = useState(0);
  const { data, isLoading, error } = useQuery({ queryKey: platformKeys.client(clientId), queryFn: () => platformApi.clients.get(clientId), enabled: Boolean(clientId) });

  return (
    <>
      <Button component={Link} href="/platform/clients" startIcon={<ArrowLeft size={16} />} sx={{ mb: 1 }}>
        Clients
      </Button>
      {error ? <ErrorState error={error} /> : null}
      {isLoading ? <Skeleton variant="rounded" height={160} /> : null}
      {data ? (
        <>
          <PageHeader
            title={data.name}
            description={data.owner?.email}
            actions={<ProductChips products={data.subscription?.products ?? data.products} hasSubscription={data.hasSubscription !== false && Boolean(data.subscription ?? data.products)} />}
          />
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2 }}>
            {TABS.map((t) => (
              <Tab key={t} label={t} />
            ))}
          </Tabs>
          {tab === 0 ? <OverviewTab client={data} /> : null}
          {tab === 1 ? <SubscriptionTab client={data} /> : null}
          {tab === 2 ? <IntegrationsTab client={data} /> : null}
          {tab === 3 ? <DiagnosticsTab clientId={clientId} /> : null}
          {tab === 4 ? <ActivityTab clientId={clientId} /> : null}
        </>
      ) : null}
    </>
  );
}
