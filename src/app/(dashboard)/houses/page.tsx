'use client';

import { useRouter } from 'next/navigation';
import { openWorkspace } from '@/lib/navigation/workspace';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Button,
  Stack,
  TextField,
  MenuItem,
  Select,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Chip,
  Box,
} from '@mui/material';
import { Home, Plus, Search } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, type DataTableColumn } from '@/components/data-display/data-table';
import { DetailDrawer } from '@/components/ui/detail-drawer';
import { FreshnessBadge } from '@/components/data-display/freshness-badge';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { houseTypesApi } from '@/lib/api/house-types';
import { estateKeys } from '@/lib/query/keys';
import { housesApi, type ChargeType } from '@/lib/api/houses';
import { formatAmount } from '@/lib/formatting/currency';
import { useVisibleEstates } from '@/features/estates/use-visible-estates';
import { useSession } from '@/features/auth/session-context';
import { permissions } from '@/lib/permissions/permissions';
import { ApiError } from '@/lib/api/client';
import { useConnectivity } from '@/lib/sync/connectivity';
import { ErrorState } from '@/components/feedback/error-state';
import type { House } from '@/types/api';

export default function HousesPage() {
  const router = useRouter();
  const { user } = useSession();
  const { estates } = useVisibleEstates();
  const queryClient = useQueryClient();

  const [estateId, setEstateId] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<House | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [billingOpen, setBillingOpen] = useState(false);
  const [houseTypeFilter, setHouseTypeFilter] = useState<string>('');

  // House types are estate-scoped on the backend, so the filter dropdown only
  // offers types for the selected estate (or all visible estates when none is chosen).
  const { data: houseTypes } = useQuery({
    queryKey: estateKeys.houseTypes(estateId || undefined, true),
    queryFn: () => houseTypesApi.list({ estateId: estateId || undefined, includeInactive: true }),
  });

  // estateId, status, search and house type are all sent to the server and are
  // part of the cache key, so a page never mixes results from another filter.
  const identity = user ? `${user.clientId}:${user.email}` : 'anon';
  const { data, freshness, cachedAt, isLoading, error } = useCachedQuery(
    `${identity}:houses:list:${status}:${search}:${houseTypeFilter}:${estateId}`,
    [...estateKeys.houses(estateId || undefined, { identity, status, search, houseTypeFilter })],
    () => housesApi.list({ status: status || undefined, search: search || undefined, houseTypeId: houseTypeFilter || undefined, estateId: estateId || undefined })
  );

  const filteredItems = data?.items ?? [];

  const canManage = user ? permissions.canManageHouses(user.role) : false;

  const columns: DataTableColumn<House>[] = [
    { key: 'houseNumber', header: 'House', render: (h) => (
        <span style={{ fontWeight: 600, cursor: 'pointer' }} onClick={() => openWorkspace('house', h._id, router)}>{h.houseNumber}</span>
      ) },
    { key: 'estate', header: 'Estate', render: (h) => estates?.find((e) => e._id === h.estateId)?.name ?? '—' },
    { key: 'type', header: 'House type', render: (h) => h.houseType?.name || (h.houseTypeId ? '—' : 'Unclassified') },
    { key: 'rent', header: 'Monthly Rent', align: 'right', render: (h) => formatAmount(h.monthlyRent) },
    {
      key: 'status',
      header: 'Status',
      render: (h) => <Chip size="small" label={h.status} color={h.status === 'occupied' ? 'success' : 'default'} variant="outlined" />,
    },
  ];

  return (
    <>
      <PageHeader
        title="Houses"
        description="Every property unit under your accessible estates"
        actions={
          canManage && (
            <Button variant="contained" startIcon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
              New House
            </Button>
          )
        }
      />

      <Card sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            size="small"
            placeholder="Search house number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <Search size={16} style={{ marginRight: 8, opacity: 0.5 }} /> }}
            fullWidth
          />
          <Select size="small" displayEmpty value={estateId} onChange={(e) => { setEstateId(e.target.value); setHouseTypeFilter(''); }} sx={{ minWidth: 160 }}>
            <MenuItem value="">All estates</MenuItem>
            {estates?.map((e) => (
              <MenuItem key={e._id} value={e._id}>
                {e.name}
              </MenuItem>
            ))}
          </Select>
          <Select size="small" displayEmpty value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 140 }}>
            <MenuItem value="">Any status</MenuItem>
            <MenuItem value="occupied">Occupied</MenuItem>
            <MenuItem value="vacant">Vacant</MenuItem>
          </Select>
          <Select size="small" displayEmpty value={houseTypeFilter} onChange={(e) => setHouseTypeFilter(e.target.value)} sx={{ minWidth: 160 }}>
            <MenuItem value="">All house types</MenuItem>
            {(houseTypes ?? []).map((ht) => (
              <MenuItem key={ht._id} value={ht._id}>{ht.name}</MenuItem>
            ))}
          </Select>
        </Stack>
      </Card>

      <Card>
        {freshness !== 'live' && (
          <Box sx={{ p: 1.5, pb: 0 }}>
            <FreshnessBadge freshness={freshness} cachedAt={cachedAt} />
          </Box>
        )}
        <DataTable
          columns={columns}
          rows={filteredItems}
          rowKey={(h) => h._id}
          isLoading={isLoading}
          error={error}
          emptyIcon={Home}
          emptyTitle="No houses found"
          emptyDescription="Try clearing your filters, or add the first house for this estate."
          onRowClick={(h) => setSelected(h)}
          renderMobileCard={(h) => (
            <Card variant="outlined" sx={{ p: 2 }} onClick={() => setSelected(h)}>
              <Stack direction="row" justifyContent="space-between">
                <Typography fontWeight={600}>House {h.houseNumber}</Typography>
                <Chip size="small" label={h.status} color={h.status === 'occupied' ? 'success' : 'default'} variant="outlined" />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {formatAmount(h.monthlyRent)} / month
              </Typography>
            </Card>
          )}
        />
      </Card>

      <DetailDrawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `House ${selected.houseNumber}` : ''}
        subtitle={estates?.find((e) => e._id === selected?.estateId)?.name}
        actions={
          canManage &&
          selected && (
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" onClick={() => setEditOpen(true)}>
                Edit house
              </Button>
              <Button size="small" variant="outlined" onClick={() => setBillingOpen(true)}>
                Billing config
              </Button>
            </Stack>
          )
        }
      >
        {selected && (
          <Stack spacing={2}>
            <DetailRow label="Monthly Rent" value={formatAmount(selected.monthlyRent)} />
            <DetailRow label="Status" value={selected.status} />
            <DetailRow label="Due day" value={selected.dueDay ? `Day ${selected.dueDay} of month` : '—'} />
            {selected.paymentReferences && selected.paymentReferences.length > 0 && (
              <DetailRow label="Alternate payment references" value={selected.paymentReferences.join(', ')} />
            )}
          </Stack>
        )}
      </DetailDrawer>

      {canManage && selected && (
        <EditHouseDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          house={selected}
          onSaved={(updated) => {
            setSelected(updated);
            queryClient.invalidateQueries({ queryKey: ['houses'] });
          }}
        />
      )}

      {canManage && (
        <CreateHouseDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          estates={estates ?? []}
          onCreated={() => queryClient.invalidateQueries({ queryKey: ['houses'] })}
        />
      )}

      {canManage && selected && (
        <HouseBillingDialog
          open={billingOpen}
          onClose={() => setBillingOpen(false)}
          house={selected}
        />
      )}
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body1">{value}</Typography>
    </Box>
  );
}

function EditHouseDialog({ open, onClose, house, onSaved }: { open: boolean; onClose: () => void; house: House; onSaved: (updated: House) => void }) {
  // Section 6 of this pass: house update via the existing detail-drawer
  // architecture. Only fields house.controller.js#update actually accepts
  // are ever sent — no clientId/estateId ownership fields, since the
  // backend derives those from the authenticated session/existing record,
  // not from client input.
  const { data: houseTypes } = useQuery({
    queryKey: estateKeys.houseTypes(house.estateId, false),
    queryFn: () => houseTypesApi.list({ estateId: house.estateId }),
  });
  const [monthlyRent, setMonthlyRent] = useState(String(house.monthlyRent));
  const [dueDay, setDueDay] = useState(house.dueDay ? String(house.dueDay) : '');
  const [status, setStatus] = useState<'occupied' | 'vacant'>(house.status === 'vacant' ? 'vacant' : 'occupied');
  const [houseTypeId, setHouseTypeId] = useState(house.houseTypeId ? String(house.houseTypeId) : '');
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      housesApi.update(house._id, {
        monthlyRent: Number(monthlyRent),
        dueDay: dueDay ? Number(dueDay) : undefined,
        status,
houseTypeId: houseTypeId ? houseTypeId : undefined,      }),
    onSuccess: (updated) => {
      setSaved(true);
      onSaved(updated);
    },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Unable to update house.'),
  });

  const valid = Number(monthlyRent) > 0;

  return (
    <Dialog
      open={open}
      onClose={() => {
        setSaved(false);
        onClose();
      }}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle>Edit House {house.houseNumber}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {formError && <Alert severity="error">{formError}</Alert>}
          {saved && (
            <Alert severity="success" onClose={() => setSaved(false)}>
              House updated.
            </Alert>
          )}
          <Select displayEmpty value={houseTypeId} onChange={(e) => setHouseTypeId(e.target.value)} fullWidth>
            <MenuItem value="">Unclassified</MenuItem>
            {(houseTypes ?? []).map((t) => (
              <MenuItem key={t._id} value={t._id}>{t.name}</MenuItem>
            ))}
          </Select>
          <TextField label="Monthly rent (KES)" type="number" value={monthlyRent} onChange={(e) => setMonthlyRent(e.target.value)} required />
          <TextField label="Due day of month" type="number" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
          <Select value={status} onChange={(e) => setStatus(e.target.value as 'occupied' | 'vacant')}>
            <MenuItem value="vacant">Vacant</MenuItem>
            <MenuItem value="occupied">Occupied</MenuItem>
          </Select>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            setSaved(false);
            onClose();
          }}
        >
          Close
        </Button>
        <Button
          variant="contained"
          disabled={!valid || mutation.isPending}
          onClick={() => {
            setFormError(null);
            mutation.mutate();
          }}
        >
          {mutation.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function CreateHouseDialog({
  open,
  onClose,
  estates,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  estates: { _id: string; name: string }[];
  onCreated: () => void;
}) {
  const [estateId, setEstateId] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [houseTypeId, setHouseTypeId] = useState('');
  const [overrideRent, setOverrideRent] = useState(false);
  const [monthlyRent, setMonthlyRent] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const { data: houseTypes } = useQuery({
    queryKey: estateKeys.houseTypes(estateId || undefined, true),
    queryFn: () => houseTypesApi.list({ estateId, includeInactive: true }),
    enabled: Boolean(estateId),
  });

  const selectedType = useMemo(
    () => (houseTypes ?? []).find((t) => t._id === houseTypeId) ?? null,
    [houseTypes, houseTypeId]
  );

  const inheritedRentKes = selectedType ? selectedType.defaultRentCents / 100 : 0;
  const inheritedLines = selectedType?.defaultBilling ?? [];

  const valid = Boolean(estateId && houseNumber.trim() && houseTypeId);

  const mutation = useMutation({
    mutationFn: () =>
      housesApi.create({
        estateId,
        houseNumber: houseNumber.trim(),
        houseTypeId: houseTypeId || undefined,
        ...(overrideRent && Number(monthlyRent) > 0 ? { monthlyRent: Number(monthlyRent) } : {}),
      }),
    onSuccess: () => {
      onCreated();
      setEstateId('');
      setHouseNumber('');
      setHouseTypeId('');
      setMonthlyRent('');
      setOverrideRent(false);
      onClose();
    },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Unable to create house.'),
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>New House</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {formError && <Alert severity="error">{formError}</Alert>}
          <Select displayEmpty value={estateId} onChange={(e) => { setEstateId(e.target.value); setHouseTypeId(''); }} fullWidth>
            <MenuItem value="" disabled>
              Select estate
            </MenuItem>
            {estates.map((e) => (
              <MenuItem key={e._id} value={e._id}>
                {e.name}
              </MenuItem>
            ))}
          </Select>
          <TextField label="House number" value={houseNumber} onChange={(e) => setHouseNumber(e.target.value)} required fullWidth />
          <Select displayEmpty value={houseTypeId} onChange={(e) => setHouseTypeId(e.target.value)} fullWidth>
            <MenuItem value="" disabled>
              Select house type
            </MenuItem>
            {(houseTypes ?? []).map((t) => (
              <MenuItem key={t._id} value={t._id}>
                {t.name}
                {t.defaultRentCents > 0 ? ` · KES ${(t.defaultRentCents / 100).toLocaleString()}` : ''}
              </MenuItem>
            ))}
          </Select>
          {selectedType && (
            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(0,180,216,0.06)', border: '1px solid rgba(0,180,216,0.2)' }}>
              <Typography variant="subtitle2" gutterBottom>
                Inherited billing from {selectedType.name}
              </Typography>
              <Typography variant="body2">Rent: KES {inheritedRentKes.toLocaleString()}/month</Typography>
              {inheritedLines
                .filter((l) => l.chargeType !== 'RENT')
                .map((l, i) => (
                  <Typography key={i} variant="body2">
                    {l.description || l.chargeType}: KES {((l.amountCents ?? 0) / 100).toLocaleString()}/month
                  </Typography>
                ))}
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                Due day: {selectedType.defaultDueDay ?? 30} · Frequency: Monthly · History is never rewritten when the type changes.
              </Typography>
            </Box>
          )}
          <Button size="small" onClick={() => setOverrideRent((v) => !v)} sx={{ alignSelf: 'flex-start' }}>
            {overrideRent ? 'Hide rent override' : 'Override rent for this house'}
          </Button>
          {overrideRent && (
            <TextField
              label="House-specific monthly rent (KES)"
              type="number"
              value={monthlyRent}
              onChange={(e) => setMonthlyRent(e.target.value)}
              helperText="Optional. Leave off to use the house type default."
              fullWidth
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!valid || mutation.isPending}
          onClick={() => {
            setFormError(null);
            mutation.mutate();
          }}
        >
          {mutation.isPending ? 'Creating…' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function HouseBillingDialog({ open, onClose, house }: { open: boolean; onClose: () => void; house: House }) {
  const queryClient = useQueryClient();
  const connectivity = useConnectivity();
  const canReach = connectivity.state === 'online' || connectivity.state === 'syncing' || connectivity.state === 'sync-error';
  const [chargeType, setChargeType] = useState<ChargeType>('RENT');
  const [amountKes, setAmountKes] = useState('');
  const [dueDay, setDueDay] = useState(house.dueDay ? String(house.dueDay) : '5');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const { data: configs, isLoading, error, refetch } = useQuery({
    queryKey: ['houses', house._id, 'billing-config'],
    queryFn: () => housesApi.listBillingConfig(house._id),
    enabled: open,
  });

  const save = useMutation({
    mutationFn: () => {
      const amountCents = Math.round(Number(amountKes) * 100);
      if (!Number.isFinite(amountCents) || amountCents < 0) throw new Error('Enter a valid amount');
      return housesApi.upsertBillingConfig(house._id, {
        chargeType,
        amountCents,
        dueDay: dueDay ? Number(dueDay) : undefined,
        description: description || undefined,
        isActive: true,
      });
    },
    onSuccess: () => {
      setSavedMsg('Billing configuration saved (confirmed by server).');
      setFormError(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['houses'] });
    },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Unable to save billing configuration.'),
  });

  const deactivate = useMutation({
    mutationFn: (configId: string) => housesApi.deactivateBillingConfig(house._id, configId),
    onSuccess: () => {
      setSavedMsg('Charge deactivated (confirmed by server).');
      refetch();
    },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Unable to deactivate charge.'),
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Billing — {house.houseNumber}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            House-level charges (RENT, WATER, ELECTRICITY, OTHER). Amounts are stored in cents on the server. The backend is the source of financial truth.
          </Typography>
          {!canReach ? <Alert severity="warning">Saving billing configuration requires connectivity.</Alert> : null}
          {formError ? <Alert severity="error">{formError}</Alert> : null}
          {savedMsg ? <Alert severity="success">{savedMsg}</Alert> : null}
          {error ? <ErrorState error={error} /> : null}
          {isLoading ? <Typography variant="body2">Loading configuration…</Typography> : null}
          {configs && configs.length > 0 ? (
            <Stack spacing={1}>
              {configs.map((c) => (
                <Stack key={c._id} direction="row" justifyContent="space-between" alignItems="center" sx={{ borderBottom: '1px solid', borderColor: 'divider', py: 0.5 }}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {c.chargeType}
                      {c.isActive === false ? ' (inactive)' : ''}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatAmount(c.amountCents / 100)} · due day {c.dueDay ?? '—'}
                      {c.frequency ? ` · ${c.frequency}` : ''}
                      {c.effectiveFrom ? ` · from ${c.effectiveFrom.slice(0, 10)}` : ''}
                      {c.effectiveTo ? ` to ${c.effectiveTo.slice(0, 10)}` : ''}
                      {c.description ? ` · ${c.description}` : ''}
                    </Typography>
                  </Box>
                  {c.isActive !== false ? (
                    <Button
                      size="small"
                      color="warning"
                      disabled={!canReach || deactivate.isPending}
                      onClick={() => {
                        setFormError(null);
                        setSavedMsg(null);
                        deactivate.mutate(c._id);
                      }}
                    >
                      Deactivate
                    </Button>
                  ) : null}
                </Stack>
              ))}
            </Stack>
          ) : (
            !isLoading && <Typography variant="body2" color="text.secondary">No house-specific charges configured yet.</Typography>
          )}
          <Typography variant="subtitle2">Add / update charge</Typography>
          <Select value={chargeType} onChange={(e) => setChargeType(e.target.value as ChargeType)} fullWidth>
            <MenuItem value="RENT">RENT</MenuItem>
            <MenuItem value="WATER">WATER</MenuItem>
            <MenuItem value="ELECTRICITY">ELECTRICITY</MenuItem>
            <MenuItem value="OTHER">OTHER</MenuItem>
          </Select>
          <TextField label="Amount (KES)" value={amountKes} onChange={(e) => setAmountKes(e.target.value)} type="number" inputProps={{ min: 0, step: '0.01' }} fullWidth required />
          <TextField label="Due day of month (1–31)" value={dueDay} onChange={(e) => setDueDay(e.target.value)} type="number" inputProps={{ min: 1, max: 31 }} fullWidth />
          <TextField label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          disabled={!canReach || save.isPending || !amountKes}
          onClick={() => {
            setFormError(null);
            setSavedMsg(null);
            save.mutate();
          }}
        >
          {!canReach ? 'Offline' : save.isPending ? 'Saving…' : 'Save charge'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
