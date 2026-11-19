'use client';

import { useRouter } from 'next/navigation';
import { openWorkspace } from '@/lib/navigation/workspace';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Stack, TextField, Select, MenuItem, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Typography, Chip, Box, Pagination } from '@mui/material';
import { Users, Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, type DataTableColumn } from '@/components/data-display/data-table';
import { DetailDrawer } from '@/components/ui/detail-drawer';
import { FreshnessBadge } from '@/components/data-display/freshness-badge';
import { tenantsApi } from '@/lib/api/tenants';
import { housesApi } from '@/lib/api/houses';
import { houseTypesApi } from '@/lib/api/house-types';
import { estateKeys } from '@/lib/query/keys';
import { useVisibleEstates } from '@/features/estates/use-visible-estates';
import { useSession } from '@/features/auth/session-context';
import { permissions } from '@/lib/permissions/permissions';
import { ApiError } from '@/lib/api/client';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { identityKeyFromUser } from '@/lib/session/local-session-marker';
import { useConnectivity } from '@/lib/sync/connectivity';
import type { Tenant } from '@/types/api';

export default function TenantsPage() {
  const router = useRouter();
  const { user } = useSession();
  const { estates } = useVisibleEstates();
  const queryClient = useQueryClient();
  const identity = user ? identityKeyFromUser(user) : 'anon';
  const [estateId, setEstateId] = useState('');
  const [houseTypeFilter, setHouseTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [houseFilter, setHouseFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Tenant | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);

  // House types and houses are estate-scoped server-side and keyed by estate, so the
  // filter options always belong to the selected estate.
  const { data: houseTypes } = useQuery({
    queryKey: estateKeys.houseTypes(estateId || undefined, true),
    queryFn: () => houseTypesApi.list({ estateId: estateId || undefined, includeInactive: true }),
  });
  // Houses for the house-type narrowing and the house dropdown. The API caps pages at 100;
  // when the estate has more houses the lookup is incomplete and the UI says so instead of
  // silently filtering a partial set.
  const houseLookupFilters = { houseTypeId: houseTypeFilter || undefined };
  const { data: housesData } = useQuery({
    queryKey: estateKeys.houses(estateId || undefined, { purpose: 'tenant-filter', ...houseLookupFilters }),
    queryFn: () => housesApi.list({ estateId: estateId || undefined, houseTypeId: houseTypeFilter || undefined, limit: 100 }),
    enabled: Boolean(estateId) || Boolean(houseTypeFilter),
  });
  const houseLookupTruncated = Boolean(housesData && housesData.pagination.total > housesData.items.length);

  // estateId is sent to the server and is part of both cache keys.
  const { data, isLoading, error, freshness, cachedAt } = useCachedQuery(
    `${identity}:tenants:list:${estateId || 'all'}`,
    [...estateKeys.tenants(estateId || undefined, { identity })],
    () => tenantsApi.list({ estateId: estateId || undefined })
  );

  // Status and house are narrowings of the COMPLETE server result (the tenants endpoint is
  // not paginated), so they cannot hide rows that live on another page.
  const houseTypeHouseIds = useMemo(
    () => (houseTypeFilter ? new Set((housesData?.items ?? []).map((h) => h._id)) : null),
    [houseTypeFilter, housesData]
  );
  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (statusFilter) rows = rows.filter((t) => t.status === statusFilter);
    if (houseFilter) rows = rows.filter((t) => String(t.houseId) === houseFilter);
    if (houseTypeHouseIds) rows = rows.filter((t) => houseTypeHouseIds.has(String(t.houseId)));
    return rows;
  }, [data, statusFilter, houseFilter, houseTypeHouseIds]);

  const canManage = user ? permissions.canManageTenants(user.role) : false;

  const columns: DataTableColumn<Tenant>[] = [
    { key: 'name', header: 'Tenant', render: (t) => (
        <span style={{ fontWeight: 600, cursor: 'pointer' }} onClick={() => openWorkspace('tenant', t._id, router)}>{t.name}</span>
      ) },
    { key: 'phone', header: 'Phone', render: (t) => t.phone },
    { key: 'estate', header: 'Estate', render: (t) => estates?.find((e) => e._id === t.estateId)?.name ?? '—' },
    { key: 'status', header: 'Status', render: (t) => <Chip size="small" label={t.status} color={t.status === 'active' ? 'success' : 'default'} variant="outlined" /> },
  ];

  return (
    <>
      <PageHeader
        title="Tenants"
        description="People currently or previously housed under your estates"
        actions={
          canManage && (
            <Button variant="contained" startIcon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
              New Tenant
            </Button>
          )
        }
      />

      {freshness !== 'live' && (
        <Box sx={{ mb: 1.5 }}>
          <FreshnessBadge freshness={freshness} cachedAt={cachedAt} />
        </Box>
      )}

      <Card sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap>
          <Select size="small" displayEmpty value={estateId} onChange={(e) => { setEstateId(e.target.value); setHouseTypeFilter(''); setHouseFilter(''); }} sx={{ minWidth: 160 }}>
            <MenuItem value="">All estates</MenuItem>
            {estates?.map((e) => (
              <MenuItem key={e._id} value={e._id}>
                {e.name}
              </MenuItem>
            ))}
          </Select>
          <Select size="small" displayEmpty value={houseTypeFilter} onChange={(e) => { setHouseTypeFilter(e.target.value); setHouseFilter(''); }} sx={{ minWidth: 160 }}>
            <MenuItem value="">All house types</MenuItem>
            {(houseTypes ?? []).map((ht) => (
              <MenuItem key={ht._id} value={ht._id}>{ht.name}</MenuItem>
            ))}
          </Select>
          <Select size="small" displayEmpty value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ minWidth: 140 }}>
            <MenuItem value="">Any status</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="moved_out">Moved out</MenuItem>
          </Select>
          <Select size="small" displayEmpty value={houseFilter} onChange={(e) => setHouseFilter(e.target.value)} sx={{ minWidth: 140 }}>
            <MenuItem value="">Any house</MenuItem>
            {(housesData?.items ?? []).map((h) => (
              <MenuItem key={h._id} value={h._id}>{h.houseNumber}</MenuItem>
            ))}
          </Select>
        </Stack>
        {houseLookupTruncated ? (
          <Alert severity="warning" sx={{ mt: 1.5 }}>
            This estate has more than {housesData?.items.length} houses, so the house and house-type filters cover only part of it. Narrow by estate and status to see everyone.
          </Alert>
        ) : null}
      </Card>

      <Card>
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(t) => t._id}
          isLoading={isLoading}
          error={error}
          emptyIcon={Users}
          emptyTitle="No tenants found"
          emptyDescription="Tenants appear here once they're added to a house."
          onRowClick={(t) => openWorkspace('tenant', t._id, router)}
          renderMobileCard={(t) => (
            <Card variant="outlined" sx={{ p: 2 }} onClick={() => openWorkspace('tenant', t._id, router)}>
              <Stack direction="row" justifyContent="space-between">
                <Typography fontWeight={600}>{t.name}</Typography>
                <Chip size="small" label={t.status} color={t.status === 'active' ? 'success' : 'default'} variant="outlined" />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {t.phone}
              </Typography>
            </Card>
          )}
        />
      </Card>

      <DetailDrawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ''}
        subtitle={estates?.find((e) => e._id === selected?.estateId)?.name}
        actions={
          canManage &&
          selected && (
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" onClick={() => setEditOpen(true)}>
                Edit tenant
              </Button>
              {selected.status === 'active' && (
                <Button size="small" variant="outlined" onClick={() => setMoveOpen(true)}>
                  Move house
                </Button>
              )}
            </Stack>
          )
        }
      >
        {selected && (
          <Stack spacing={2}>
            <DetailRow label="Phone" value={selected.phone} />
            <DetailRow label="Status" value={selected.status} />
            {selected.moveInDate && <DetailRow label="Move-in date" value={selected.moveInDate} />}
          </Stack>
        )}
      </DetailDrawer>

      {canManage && selected && (
        <EditTenantDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          tenant={selected}
          onSaved={(updated) => {
            setSelected(updated);
            queryClient.invalidateQueries({ queryKey: ['tenants'] });
          }}
        />
      )}

      {canManage && selected && (
        <MoveTenantDialog
          open={moveOpen}
          onClose={() => setMoveOpen(false)}
          tenant={selected}
          onMoved={(updated) => {
            setSelected(updated);
            setMoveOpen(false);
            queryClient.invalidateQueries({ queryKey: ['tenants'] });
            queryClient.invalidateQueries({ queryKey: ['houses'] });
          }}
        />
      )}

      {canManage && (
        <CreateTenantDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          estateId={estateId}
          estates={estates ?? []}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: ['tenants'] });
            queryClient.invalidateQueries({ queryKey: estateKeys.housesFamily() });
          }}
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

function EditTenantDialog({ open, onClose, tenant, onSaved }: { open: boolean; onClose: () => void; tenant: Tenant; onSaved: (updated: Tenant) => void }) {
  // Only fields schemas.updateTenant accepts. Move uses POST /tenants/:id/move.
  const [name, setName] = useState(tenant.name);
  const [phone, setPhone] = useState(tenant.phone);
  const [status, setStatus] = useState(tenant.status);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: () => tenantsApi.update(tenant._id, { name, phone, status }),
    onSuccess: (updated) => {
      setSaved(true);
      onSaved(updated);
    },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Unable to update tenant.'),
  });

  return (
    <Dialog open={open} onClose={() => { setSaved(false); onClose(); }} fullWidth maxWidth="xs">
      <DialogTitle>Edit {tenant.name}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {formError ? <Alert severity="error">{formError}</Alert> : null}
          {saved ? (
            <Alert severity="success" onClose={() => setSaved(false)}>
              Tenant updated.
            </Alert>
          ) : null}
          <TextField label="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
          <TextField label="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="moved_out">Moved out</MenuItem>
          </Select>
          <Typography variant="caption" color="text.secondary">
            Setting status to &quot;Moved out&quot; records move-out. To change house while active, use Move house.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => { setSaved(false); onClose(); }}>Close</Button>
        <Button variant="contained" disabled={!name || !phone || mutation.isPending} onClick={() => { setFormError(null); mutation.mutate(); }}>
          {mutation.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Uses dedicated POST /tenants/:id/move — never PATCH houseId. */
function MoveTenantDialog({
  open,
  onClose,
  tenant,
  onMoved,
}: {
  open: boolean;
  onClose: () => void;
  tenant: Tenant;
  onMoved: (updated: Tenant) => void;
}) {
  const [houseId, setHouseId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const connectivity = useConnectivity();
  const canReachServer = connectivity.state === 'online' || connectivity.state === 'syncing' || connectivity.state === 'sync-error';

  const { data: houses } = useQuery({
    queryKey: estateKeys.houses(tenant.estateId, { purpose: 'tenant-move', status: 'vacant' }),
    queryFn: () => housesApi.list({ estateId: tenant.estateId, status: 'vacant', limit: 100 }),
    enabled: open,
  });

  const vacantSameEstate = houses?.items.filter((h) => h._id !== tenant.houseId) ?? [];

  const mutation = useMutation({
    mutationFn: () => tenantsApi.move(tenant._id, houseId),
    onSuccess: (updated) => onMoved(updated),
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Unable to move tenant.'),
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Move {tenant.name}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {!canReachServer ? (
            <Alert severity="warning">An internet connection is required for this financial action.</Alert>
          ) : null}
          {formError ? <Alert severity="error">{formError}</Alert> : null}
          <Typography variant="body2" color="text.secondary">
            Select a vacant house in the same estate. The backend validates ownership and vacates the old house atomically.
          </Typography>
          <Select displayEmpty value={houseId} onChange={(e) => setHouseId(e.target.value)} fullWidth>
            <MenuItem value="" disabled>
              Select vacant house
            </MenuItem>
            {vacantSameEstate.map((h) => (
              <MenuItem key={h._id} value={h._id}>
                {h.houseNumber}
              </MenuItem>
            ))}
          </Select>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!houseId || mutation.isPending || !canReachServer}
          onClick={() => {
            setFormError(null);
            mutation.mutate();
          }}
        >
          {!canReachServer ? 'Offline' : mutation.isPending ? 'Moving…' : 'Confirm move'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function CreateTenantDialog({
  open, onClose, estateId, estates, onCreated,
}: {
  open: boolean;
  onClose: () => void;
  estateId: string;
  estates: { _id: string; name: string }[];
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [houseId, setHouseId] = useState('');
  const [selectedEstateId, setSelectedEstateId] = useState(estateId);
  const [housePage, setHousePage] = useState(1);
  const [formError, setFormError] = useState<string | null>(null);

  // The dialog owns estate selection. The page-level filter only provides a default.
  useEffect(() => {
    if (open) {
      setSelectedEstateId(estateId || '');
      setHousePage(1);
      setHouseId('');
      setFormError(null);
    }
  }, [open, estateId]);

  const housesQuery = useQuery({
    queryKey: estateKeys.houses(selectedEstateId || undefined, {
      purpose: 'tenant-create', status: 'vacant', page: housePage,
    }),
    queryFn: () => housesApi.list({
      estateId: selectedEstateId, status: 'vacant', page: housePage, limit: 100,
    }),
    enabled: open && Boolean(selectedEstateId),
    staleTime: 0,
  });
  const houses = housesQuery.data;
  const vacantForEstate = houses?.items ?? [];

  const mutation = useMutation({
    mutationFn: () => tenantsApi.create({ name: name.trim(), phone: phone.trim(), houseId }),
    onSuccess: () => {
      onCreated();
      setName('');
      setPhone('');
      setHouseId('');
      onClose();
    },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Unable to create tenant.'),
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>New Tenant</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {formError ? <Alert severity="error">{formError}</Alert> : null}
          <TextField label="Full name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          <TextField label="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <TextField
            select
            label="Estate"
            value={selectedEstateId}
            onChange={(e) => {
              setSelectedEstateId(e.target.value);
              setHouseId('');
              setHousePage(1);
            }}
            required
          >
            <MenuItem value="">Select estate</MenuItem>
            {estates.map((estate) => (
              <MenuItem key={estate._id} value={estate._id}>{estate.name}</MenuItem>
            ))}
          </TextField>

          {!selectedEstateId ? (
            <Alert severity="info">Select an estate to load its available houses.</Alert>
          ) : housesQuery.isLoading ? (
            <Alert severity="info">Loading vacant houses for this estate…</Alert>
          ) : housesQuery.error ? (
            <Alert severity="error">
              {housesQuery.error instanceof ApiError ? housesQuery.error.message : 'Could not load houses for this estate.'}
              <Button size="small" onClick={() => void housesQuery.refetch()}>Retry</Button>
            </Alert>
          ) : houses && houses.pagination.total === 0 ? (
            <Alert severity="info">No active vacant houses are available in this estate.</Alert>
          ) : houses ? (
            <>
              <TextField select label="Vacant house" value={houseId} onChange={(e) => setHouseId(e.target.value)} required>
                <MenuItem value="">Select vacant house</MenuItem>
                {vacantForEstate.map((house) => (
                  <MenuItem key={house._id} value={house._id}>House {house.houseNumber}</MenuItem>
                ))}
              </TextField>
              {houses.pagination.totalPages > 1 ? (
                <Stack spacing={0.5}>
                  <Typography variant="caption" color="text.secondary">
                    Showing {vacantForEstate.length} of {houses.pagination.total} available houses on this page
                  </Typography>
                  <Pagination
                    size="small"
                    count={houses.pagination.totalPages}
                    page={housePage}
                    onChange={(_, next) => {
                      setHousePage(next);
                      setHouseId('');
                    }}
                  />
                </Stack>
              ) : null}
            </>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!name.trim() || !phone.trim() || !selectedEstateId || !houseId || mutation.isPending || housesQuery.isLoading || Boolean(housesQuery.error)}
          onClick={() => { setFormError(null); mutation.mutate(); }}
        >
          {mutation.isPending ? 'Creating…' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
