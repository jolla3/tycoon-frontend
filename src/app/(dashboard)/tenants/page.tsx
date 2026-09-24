'use client';

import { useRouter } from 'next/navigation';
import { openWorkspace } from '@/lib/navigation/workspace';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Stack, TextField, Select, MenuItem, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Typography, Chip, Box } from '@mui/material';
import { Users, Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, type DataTableColumn } from '@/components/data-display/data-table';
import { DetailDrawer } from '@/components/ui/detail-drawer';
import { FreshnessBadge } from '@/components/data-display/freshness-badge';
import { tenantsApi } from '@/lib/api/tenants';
import { housesApi } from '@/lib/api/houses';
import { houseTypesApi } from '@/lib/api/house-types';
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
  const { data: houseTypes } = useQuery({ queryKey: ['house-types'], queryFn: () => houseTypesApi.list(true) });
  const { data: housesData } = useQuery({ queryKey: ['houses', 'tenant-filter'], queryFn: () => housesApi.list({}) });
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

  const { data, isLoading, error, freshness, cachedAt } = useCachedQuery(
    `${identity}:tenants:list`,
    ['tenants', identity],
    () => tenantsApi.list()
  );

  const houseById = useMemo(() => {
    const m = new Map<string, { houseTypeId?: string; houseNumber?: string }>();
    for (const h of housesData?.items ?? []) m.set(h._id, h as { houseTypeId?: string; houseNumber?: string });
    return m;
  }, [housesData]);

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (estateId) rows = rows.filter((t) => t.estateId === estateId);
    if (statusFilter) rows = rows.filter((t) => t.status === statusFilter);
    if (houseFilter) rows = rows.filter((t) => String(t.houseId) === houseFilter);
    if (houseTypeFilter) {
      rows = rows.filter((t) => {
        const h = houseById.get(String(t.houseId));
        if (houseTypeFilter === '__none__') return !h?.houseTypeId;
        return h?.houseTypeId && String(h.houseTypeId) === houseTypeFilter;
      });
    }
    return rows;
  }, [data, estateId, statusFilter, houseFilter, houseTypeFilter, houseById]);

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
          <Select size="small" displayEmpty value={estateId} onChange={(e) => setEstateId(e.target.value)} sx={{ minWidth: 160 }}>
            <MenuItem value="">All estates</MenuItem>
            {estates?.map((e) => (
              <MenuItem key={e._id} value={e._id}>
                {e.name}
              </MenuItem>
            ))}
          </Select>
          <Select size="small" displayEmpty value={houseTypeFilter} onChange={(e) => setHouseTypeFilter(e.target.value)} sx={{ minWidth: 160 }}>
            <MenuItem value="">All house types</MenuItem>
            <MenuItem value="__none__">Unclassified house</MenuItem>
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
            {(housesData?.items ?? []).filter((h) => !estateId || h.estateId === estateId).map((h) => (
              <MenuItem key={h._id} value={h._id}>{h.houseNumber}</MenuItem>
            ))}
          </Select>
        </Stack>
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
          onCreated={() => queryClient.invalidateQueries({ queryKey: ['tenants'] })}
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
    queryKey: ['houses', 'for-tenant-move'],
    queryFn: () => housesApi.list({ status: 'vacant', limit: 100 }),
    enabled: open,
  });

  const vacantSameEstate =
    houses?.items.filter((h) => h.estateId === tenant.estateId && h._id !== tenant.houseId) ?? [];

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

function CreateTenantDialog({ open, onClose, estateId, onCreated }: { open: boolean; onClose: () => void; estateId: string; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [houseId, setHouseId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // No estateId sent to the backend either (see lib/api/houses.ts) — fetch
  // all vacant houses and narrow to the selected estate client-side.
  const { data: houses } = useQuery({
    queryKey: ['houses', 'for-tenant-form'],
    queryFn: () => housesApi.list({ status: 'vacant', limit: 100 }),
    enabled: open,
  });

  const vacantForEstate = useMemo(() => {
    const items = houses?.items ?? [];
    return estateId ? items.filter((h) => h.estateId === estateId) : items;
  }, [houses, estateId]);

  const mutation = useMutation({
    mutationFn: () => tenantsApi.create({ name, phone, houseId }),
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
          {formError && <Alert severity="error">{formError}</Alert>}
          <TextField label="Full name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          <TextField label="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <Select displayEmpty value={houseId} onChange={(e) => setHouseId(e.target.value)}>
            <MenuItem value="" disabled>
              Select vacant house
            </MenuItem>
            {vacantForEstate.map((h) => (
              <MenuItem key={h._id} value={h._id}>
                House {h.houseNumber}
              </MenuItem>
            ))}
          </Select>
          {vacantForEstate.length === 0 && (
            <Alert severity="info">No vacant houses found for this filter — select an estate above, or free up a house first.</Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!name || !phone || !houseId || mutation.isPending} onClick={() => { setFormError(null); mutation.mutate(); }}>
          {mutation.isPending ? 'Creating…' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
