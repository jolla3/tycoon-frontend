'use client';

import { useRouter } from 'next/navigation';
import { openWorkspace } from '@/lib/navigation/workspace';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Button,
  Stack,
  TextField,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Typography,
  Select,
  MenuItem,
} from '@mui/material';
import { Layers, Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, type DataTableColumn } from '@/components/data-display/data-table';
import { houseTypesApi, type HouseType, type CreateHouseTypeInput } from '@/lib/api/house-types';
import { formatMaybeCents, formatMaybeNumber } from '@/lib/formatting/currency';
import { ApiError } from '@/lib/api/client';
import { useSession } from '@/features/auth/session-context';
import { permissions } from '@/lib/permissions/permissions';
import { useConnectivity } from '@/lib/sync/connectivity';
import { useVisibleEstates } from '@/features/estates/use-visible-estates';
import { estateKeys } from '@/lib/query/keys';
import { HouseTypeDialog } from '@/features/house-types/house-type-dialog';

export default function HouseTypesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const canManage = user ? permissions.canManageHouses(user.role) : false;
  const connectivity = useConnectivity();
  const canReach = connectivity.state === 'online' || connectivity.state === 'syncing' || connectivity.state === 'sync-error';
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<HouseType | null>(null);

  const { estates } = useVisibleEstates();
  const [estateId, setEstateId] = useState('');

  // The estate filter is sent to the server and is part of the cache key.
  const { data, isLoading, error } = useQuery({
    queryKey: estateKeys.houseTypes(estateId || undefined, true),
    queryFn: () => houseTypesApi.list({ estateId: estateId || undefined, includeInactive: true }),
  });
  const estateName = (id: string) => estates?.find((e) => e._id === id)?.name ?? '—';

  const columns: DataTableColumn<HouseType>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (t) => (
        <span
          style={{ fontWeight: 600, cursor: 'pointer' }}
          onClick={() => openWorkspace('houseType', t._id, router)}
        >
          {t.name}
        </span>
      ),
    },
    { key: 'estate', header: 'Estate', render: (t) => estateName(t.estateId) },
    { key: 'rent', header: 'Default rent', render: (t) => formatMaybeCents(t.defaultRentCents) },
    { key: 'houses', header: 'Houses', render: (t) => formatMaybeNumber(t.houseCount) },
    {
      key: 'status',
      header: 'Status',
      render: (t) => (
        <Chip
          size="small"
          label={t.isActive ? 'Active' : 'Inactive'}
          color={t.isActive ? 'success' : 'default'}
          variant="outlined"
        />
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (t) => (canManage ? <Button size="small" onClick={() => setEditing(t)}>Edit</Button> : null),
    },
  ];

  return (
    <>
      <PageHeader
        title="House Types"
        description="Classify units and set their billing plan. Plan changes are versioned: they apply from the month you choose to houses billed from the type, houses with their own settings keep them, and past charges are never rewritten."
        actions={
          canManage ? (
            <Button
              variant="contained"
              startIcon={<Plus size={16} />}
              onClick={() => setCreateOpen(true)}
              disabled={!canReach}
            >
              New type
            </Button>
          ) : null
        }
      />
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Select size="small" displayEmpty value={estateId} onChange={(e) => setEstateId(e.target.value)} sx={{ minWidth: 200 }}>
          <MenuItem value="">All estates</MenuItem>
          {estates?.map((e) => (
            <MenuItem key={e._id} value={e._id}>{e.name}</MenuItem>
          ))}
        </Select>
      </Stack>
      <Card>
        <DataTable
          columns={columns}
          rows={data}
          rowKey={(t) => t._id}
          isLoading={isLoading}
          error={error}
          emptyIcon={Layers}
          emptyTitle="No house types yet"
          emptyDescription="Create types so new houses can inherit default rent and billing."
          onRowClick={(t) => openWorkspace('houseType', t._id, router)}
          renderMobileCard={(t) => (
            <Card
              variant="outlined"
              sx={{ p: 2 }}
              onClick={() => openWorkspace('houseType', t._id, router)}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography fontWeight={600}>{t.name}</Typography>
                <Chip
                  size="small"
                  label={t.isActive ? 'Active' : 'Inactive'}
                  color={t.isActive ? 'success' : 'default'}
                  variant="outlined"
                />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {estateName(t.estateId)} · Default rent {formatMaybeCents(t.defaultRentCents)} · {formatMaybeNumber(t.houseCount)} house(s)
              </Typography>
              {canManage ? (
                <Button
                  size="small"
                  sx={{ mt: 1 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditing(t);
                  }}
                >
                  Edit
                </Button>
              ) : null}
            </Card>
          )}
        />
      </Card>
      {createOpen && (
        <HouseTypeDialog
          estates={estates ?? []}
          defaultEstateId={estateId}
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false);
            queryClient.invalidateQueries({ queryKey: estateKeys.houseTypesFamily() });
          }}
        />
      )}
      {editing && (
        <HouseTypeDialog
          estates={estates ?? []}
          defaultEstateId={editing.estateId}
          open={!!editing}
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            queryClient.invalidateQueries({ queryKey: estateKeys.houseTypesFamily() });
          }}
        />
      )}
    </>
  );
}
