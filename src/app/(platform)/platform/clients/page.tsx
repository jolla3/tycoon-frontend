'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, FormGroup, FormHelperText, MenuItem, Select, Stack, TextField, Typography } from '@mui/material';
import { Building2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, type DataTableColumn } from '@/components/data-display/data-table';
import { ActiveChip, ProductChips } from '@/features/platform/product-chips';
import { productsOf, subscriptionState } from '@/features/platform/subscription-state';
import { TablePager } from '@/features/platform/table-pager';
import { platformApi, type BankConnectionStatus, type ClientListFilters, type MpesaOperationalState, type PlatformClientRow, type PlatformPlan, type Product, type ProductFilter, type ProvisionClientInput } from '@/lib/api/platform';
import { platformKeys } from '@/lib/query/keys';
import { dateFormat } from '@/lib/dates/period';

const EMPTY_FORM = { clientName: '', ownerName: '', email: '', phone: '', password: '', plan: 'trial' as PlatformPlan, startDate: '', endDate: '' };

function ProvisionDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  // Entitlement is explicit. Nothing is pre-selected: an empty selection provisions a client with NO products.
  const [products, setProducts] = useState<Product[]>([]);

  const provision = useMutation({
    mutationFn: (input: ProvisionClientInput) => platformApi.clients.provision(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: platformKeys.clientsFamily() });
      qc.invalidateQueries({ queryKey: platformKeys.overview() });
      qc.invalidateQueries({ queryKey: ['platform', 'entitlements'] });
      setForm(EMPTY_FORM);
      setProducts([]);
      onClose();
    },
  });

  const dateOrderInvalid = Boolean(form.startDate && form.endDate && form.endDate < form.startDate);
  const canSubmit = form.clientName.trim() && form.ownerName.trim() && form.email.trim() && form.password.length >= 8 && !dateOrderInvalid && !provision.isPending;

  function toggle(p: Product) {
    setProducts((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  }

  function submit() {
    const input: ProvisionClientInput = {
      clientName: form.clientName.trim(),
      ownerName: form.ownerName.trim(),
      email: form.email.trim(),
      password: form.password,
      plan: form.plan,
      products,
    };
    if (form.phone.trim()) input.phone = form.phone.trim();
    if (form.startDate) input.startDate = form.startDate;
    if (form.endDate) input.endDate = form.endDate;
    provision.mutate(input);
  }

  return (
    <Dialog open={open} onClose={provision.isPending ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Provision client</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {provision.isError ? <Alert severity="error">{(provision.error as Error).message}</Alert> : null}
          <TextField label="Client name" value={form.clientName} onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))} required fullWidth />
          <TextField label="Owner name" value={form.ownerName} onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))} required fullWidth />
          <TextField label="Owner email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required fullWidth />
          <TextField label="Phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} fullWidth />
          <TextField label="Temporary password" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required fullWidth helperText="At least 8 characters. Shared with the owner out of band." />
          <TextField select label="Plan" value={form.plan} onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value as PlatformPlan }))} fullWidth>
            <MenuItem value="trial">Trial</MenuItem>
            <MenuItem value="basic">Basic</MenuItem>
            <MenuItem value="pro">Pro</MenuItem>
          </TextField>
          <div>
            <Typography variant="subtitle2">Products</Typography>
            <FormGroup row>
              <FormControlLabel control={<Checkbox checked={products.includes('BANKING')} onChange={() => toggle('BANKING')} />} label="Banking" />
              <FormControlLabel control={<Checkbox checked={products.includes('MPESA')} onChange={() => toggle('MPESA')} />} label="M-PESA" />
            </FormGroup>
            <FormHelperText>Entitlement only. Connecting a bank or configuring M-PESA is a separate step the client completes.</FormHelperText>
          </div>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label="Start date" type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} InputLabelProps={{ shrink: true }} fullWidth />
            <TextField label="End date" type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} InputLabelProps={{ shrink: true }} fullWidth error={dateOrderInvalid} helperText={dateOrderInvalid ? 'End date is before the start date.' : 'Optional. Leave blank for open-ended.'} />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={provision.isPending}>
          Cancel
        </Button>
        <Button variant="contained" disabled={!canSubmit} onClick={submit}>
          {provision.isPending ? 'Provisioning…' : 'Provision'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function PlatformClientsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isActive, setIsActive] = useState('');
  const [product, setProduct] = useState<ProductFilter | ''>('');
  const [plan, setPlan] = useState<PlatformPlan | ''>('');
  const [subscriptionStatus, setSubscriptionStatus] = useState('');
  const [hasSubscription, setHasSubscription] = useState('');
  const [bankConnectionStatus, setBankConnectionStatus] = useState<BankConnectionStatus | ''>('');
  const [mpesaState, setMpesaState] = useState<MpesaOperationalState | ''>('');

  const filters: ClientListFilters = {
    page,
    limit: 20,
    search: search.trim() || undefined,
    isActive: isActive === '' ? undefined : isActive === 'true',
    product: product || undefined,
    plan: plan || undefined,
    subscriptionStatus: subscriptionStatus || undefined,
    hasSubscription: hasSubscription === '' ? undefined : hasSubscription === 'true',
    bankConnectionStatus: bankConnectionStatus || undefined,
    mpesaState: mpesaState || undefined,
  };

  const { data, isLoading, error } = useQuery({ queryKey: platformKeys.clients(filters), queryFn: () => platformApi.clients.list(filters) });

  const reset = (fn: () => void) => {
    fn();
    setPage(1);
  };

  const columns: DataTableColumn<PlatformClientRow>[] = [
    { key: 'name', header: 'Client', render: (c) => c.name },
    { key: 'owner', header: 'Owner', render: (c) => c.owner?.email || c.owner?.name || '—' },
    { key: 'status', header: 'Status', render: (c) => <ActiveChip active={c.isActive} /> },
    { key: 'subscription', header: 'Subscription', render: (c) => (c.subscription.present ? `${c.subscription.plan} · ${c.subscription.status}` : 'None') },
    { key: 'products', header: 'Products', render: (c) => <ProductChips products={productsOf(c)} hasSubscription={subscriptionState(c) !== 'MISSING'} /> },
    { key: 'estates', header: 'Estates', align: 'right', render: (c) => c.estateCount },
    { key: 'houses', header: 'Houses', align: 'right', render: (c) => c.houseCount },
    { key: 'created', header: 'Created', render: (c) => (c.createdAt ? dateFormat(c.createdAt, 'DD MMM YYYY') : '—') },
  ];

  return (
    <>
      <PageHeader
        title="Clients"
        description="Provision clients, assign products and inspect their state. Select a client for details."
        actions={
          <Button variant="contained" onClick={() => setOpen(true)}>
            Provision client
          </Button>
        }
      />
      <Card sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap>
          <TextField size="small" label="Search clients" value={search} onChange={(e) => reset(() => setSearch(e.target.value))} sx={{ minWidth: 220 }} />
          <Select size="small" displayEmpty value={isActive} onChange={(e) => reset(() => setIsActive(e.target.value))} sx={{ minWidth: 140 }} inputProps={{ 'aria-label': 'Client status' }}>
            <MenuItem value="">Any status</MenuItem>
            <MenuItem value="true">Active</MenuItem>
            <MenuItem value="false">Inactive</MenuItem>
          </Select>
          <Select size="small" displayEmpty value={product} onChange={(e) => reset(() => setProduct(e.target.value as ProductFilter | ''))} sx={{ minWidth: 160 }} inputProps={{ 'aria-label': 'Product' }}>
            <MenuItem value="">Any product</MenuItem>
            <MenuItem value="BANKING">Banking</MenuItem>
            <MenuItem value="MPESA">M-PESA</MenuItem>
            <MenuItem value="BOTH">Both products</MenuItem>
            <MenuItem value="NONE">No products</MenuItem>
          </Select>
          <Select size="small" displayEmpty value={plan} onChange={(e) => reset(() => setPlan(e.target.value as PlatformPlan | ''))} sx={{ minWidth: 130 }} inputProps={{ 'aria-label': 'Plan' }}>
            <MenuItem value="">Any plan</MenuItem>
            <MenuItem value="trial">Trial</MenuItem>
            <MenuItem value="basic">Basic</MenuItem>
            <MenuItem value="pro">Pro</MenuItem>
          </Select>
          <Select size="small" displayEmpty value={subscriptionStatus} onChange={(e) => reset(() => setSubscriptionStatus(e.target.value))} sx={{ minWidth: 170 }} inputProps={{ 'aria-label': 'Subscription status' }}>
            <MenuItem value="">Any subscription status</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="past_due">Past due</MenuItem>
            <MenuItem value="canceled">Canceled</MenuItem>
          </Select>
          <Select size="small" displayEmpty value={hasSubscription} onChange={(e) => reset(() => setHasSubscription(e.target.value))} sx={{ minWidth: 170 }} inputProps={{ 'aria-label': 'Subscription record' }}>
            <MenuItem value="">Subscription record: any</MenuItem>
            <MenuItem value="true">Has subscription</MenuItem>
            <MenuItem value="false">Missing subscription</MenuItem>
          </Select>
          <Select size="small" displayEmpty value={bankConnectionStatus} onChange={(e) => reset(() => setBankConnectionStatus(e.target.value as BankConnectionStatus | ''))} sx={{ minWidth: 170 }} inputProps={{ 'aria-label': 'Bank connection status' }}>
            <MenuItem value="">Bank connection: any</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="reauth_required">Needs reauthorization</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
            <MenuItem value="disconnected">Disconnected</MenuItem>
          </Select>
          <Select size="small" displayEmpty value={mpesaState} onChange={(e) => reset(() => setMpesaState(e.target.value as MpesaOperationalState | ''))} sx={{ minWidth: 170 }} inputProps={{ 'aria-label': 'M-PESA operational state' }}>
            <MenuItem value="">M-PESA state: any</MenuItem>
            <MenuItem value="DRAFT">Draft</MenuItem>
            <MenuItem value="NOT_READY">Not ready</MenuItem>
            <MenuItem value="ACTIVE">Active</MenuItem>
            <MenuItem value="SUSPENDED">Suspended</MenuItem>
          </Select>
        </Stack>
      </Card>
      <Card>
        <DataTable
          columns={columns}
          rows={data?.items}
          rowKey={(c) => c._id}
          isLoading={isLoading}
          error={error}
          emptyIcon={Building2}
          emptyTitle="No clients match"
          emptyDescription="Adjust the filters or provision a client."
          onRowClick={(c) => router.push(`/platform/clients/${c._id}`)}
          renderMobileCard={(c) => (
            <Card variant="outlined" sx={{ p: 2, cursor: 'pointer' }} onClick={() => router.push(`/platform/clients/${c._id}`)}>
              <Typography fontWeight={600}>{c.name}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {c.owner?.email || '—'} · {c.estateCount} estates · {c.houseCount} houses
              </Typography>
              <ProductChips products={productsOf(c)} hasSubscription={subscriptionState(c) !== 'MISSING'} />
            </Card>
          )}
        />
        <TablePager total={data?.total} limit={data?.limit} page={page} onChange={setPage} />
      </Card>
      <ProvisionDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
