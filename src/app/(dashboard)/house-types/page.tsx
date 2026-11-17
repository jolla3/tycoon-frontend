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
        description="Classify units. Defaults apply to new houses only — history is never rewritten."
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

function HouseTypeDialog({
  open,
  onClose,
  onSaved,
  initial,
  estates,
  defaultEstateId,
}: {
  estates: { _id: string; name: string }[];
  defaultEstateId: string;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial?: HouseType;
}) {
  const [formEstateId, setFormEstateId] = useState(initial?.estateId ?? defaultEstateId);
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [rentKes, setRentKes] = useState(initial && typeof initial.defaultRentCents === 'number' ? String(initial.defaultRentCents / 100) : '');
  const [dueDay, setDueDay] = useState(initial?.defaultDueDay ? String(initial.defaultDueDay) : '30');
  const [waterKes, setWaterKes] = useState(() => {
    const line = initial?.defaultBilling?.find((b) => b.chargeType === 'WATER');
    return line ? String(line.amountCents / 100) : '';
  });
  const [waterOn, setWaterOn] = useState(() =>
    Boolean(initial?.defaultBilling?.find((b) => b.chargeType === 'WATER' && b.amountCents > 0))
  );
  const [elecKes, setElecKes] = useState(() => {
    const line = initial?.defaultBilling?.find((b) => b.chargeType === 'ELECTRICITY');
    return line ? String(line.amountCents / 100) : '';
  });
  const [elecOn, setElecOn] = useState(() =>
    Boolean(initial?.defaultBilling?.find((b) => b.chargeType === 'ELECTRICITY' && b.amountCents > 0))
  );
  const [customLines, setCustomLines] = useState<{ label: string; amountKes: string; enabled: boolean }[]>(() => {
    const others = (initial?.defaultBilling ?? []).filter((b) => b.chargeType === 'OTHER');
    if (others.length === 0) return [{ label: '', amountKes: '', enabled: false }];
    return others.map((o) => ({
      label: o.description || '',
      amountKes: String((o.amountCents ?? 0) / 100),
      enabled: (o.amountCents ?? 0) > 0,
    }));
  });
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const defaultRentCents = Math.round(Number(rentKes || 0) * 100);
      if (!name.trim()) throw new Error('Name is required');
      const day = dueDay ? Math.min(31, Math.max(1, Number(dueDay))) : 30;
      const defaultBilling: CreateHouseTypeInput['defaultBilling'] = [];
      if (defaultRentCents > 0) {
        defaultBilling!.push({
          chargeType: 'RENT',
          description: 'Rent',
          amountCents: defaultRentCents,
          dueDay: day,
        });
      }
      if (waterOn && Number(waterKes) > 0) {
        defaultBilling!.push({
          chargeType: 'WATER',
          description: 'Water',
          amountCents: Math.round(Number(waterKes) * 100),
          dueDay: day,
        });
      }
      if (elecOn && Number(elecKes) > 0) {
        defaultBilling!.push({
          chargeType: 'ELECTRICITY',
          description: 'Electricity',
          amountCents: Math.round(Number(elecKes) * 100),
          dueDay: day,
        });
      }
      const seen = new Set<string>();
      for (const c of customLines) {
        if (!c.enabled) continue;
        const label = c.label.trim();
        if (!label) throw new Error('Custom billing lines need a label (e.g. Security)');
        if (!(Number(c.amountKes) > 0)) throw new Error(`Enter an amount for ${label}`);
        const key = label.toLowerCase();
        if (seen.has(key)) throw new Error(`Duplicate custom line: ${label}`);
        seen.add(key);
        defaultBilling!.push({
          chargeType: 'OTHER',
          description: label,
          amountCents: Math.round(Number(c.amountKes) * 100),
          dueDay: day,
        });
      }
      const fields = {
        name: name.trim(),
        description: description.trim() || undefined,
        defaultRentCents,
        defaultDueDay: day,
        defaultBilling,
      };
      if (initial) return houseTypesApi.update(initial._id, fields);
      if (!formEstateId) throw new Error('Choose an estate for this house type');
      const payload: CreateHouseTypeInput = { estateId: formEstateId, ...fields };
      return houseTypesApi.create(payload);
    },
    onSuccess: () => onSaved(),
    onError: (err) =>
      setFormError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Unable to save'),
  });

  const deactivate = useMutation({
    mutationFn: () => houseTypesApi.deactivate(initial!._id),
    onSuccess: () => onSaved(),
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Unable to deactivate'),
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{initial ? 'Edit house type' : 'New house type'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {formError && <Alert severity="error">{formError}</Alert>}
          <TextField
            select
            label="Estate"
            value={formEstateId}
            onChange={(e) => setFormEstateId(e.target.value)}
            disabled={!!initial}
            required
            helperText={initial ? 'A house type belongs to one estate and cannot be moved.' : 'House types are specific to an estate.'}
          >
            {estates.map((e) => (
              <MenuItem key={e._id} value={e._id}>{e.name}</MenuItem>
            ))}
          </TextField>
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            minRows={2}
          />
          <Typography variant="subtitle2">Monthly rent template</Typography>
          <TextField
            label="Default monthly rent (KES)"
            type="number"
            value={rentKes}
            onChange={(e) => setRentKes(e.target.value)}
          />
          <TextField
            label="Due day of month"
            type="number"
            value={dueDay}
            onChange={(e) => setDueDay(e.target.value)}
            inputProps={{ min: 1, max: 31 }}
            helperText="Charges are due on this calendar day each month. If a month does not contain this day, the last calendar day of that month is used."
          />
          <Typography variant="subtitle2">Common charges</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              label={waterOn ? 'Water on' : 'Water off'}
              color={waterOn ? 'primary' : 'default'}
              onClick={() => setWaterOn((v) => !v)}
            />
            <TextField
              size="small"
              label="Water (KES)"
              type="number"
              value={waterKes}
              onChange={(e) => setWaterKes(e.target.value)}
              disabled={!waterOn}
            />
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              label={elecOn ? 'Electricity on' : 'Electricity off'}
              color={elecOn ? 'primary' : 'default'}
              onClick={() => setElecOn((v) => !v)}
            />
            <TextField
              size="small"
              label="Electricity (KES)"
              type="number"
              value={elecKes}
              onChange={(e) => setElecKes(e.target.value)}
              disabled={!elecOn}
            />
          </Stack>
          <Typography variant="subtitle2">Custom recurring lines</Typography>
          <Typography variant="caption" color="text.secondary">
            Add Security, Garbage, Service Charge, or any monthly fee. Label + amount required when enabled.
          </Typography>
          {customLines.map((line, idx) => (
            <Stack key={idx} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
              <Chip
                label={line.enabled ? 'On' : 'Off'}
                color={line.enabled ? 'primary' : 'default'}
                onClick={() =>
                  setCustomLines((rows) => rows.map((r, i) => (i === idx ? { ...r, enabled: !r.enabled } : r)))
                }
              />
              <TextField
                size="small"
                label="Label"
                value={line.label}
                onChange={(e) =>
                  setCustomLines((rows) => rows.map((r, i) => (i === idx ? { ...r, label: e.target.value } : r)))
                }
                disabled={!line.enabled}
                placeholder="e.g. Security"
              />
              <TextField
                size="small"
                label="KES / month"
                type="number"
                value={line.amountKes}
                onChange={(e) =>
                  setCustomLines((rows) => rows.map((r, i) => (i === idx ? { ...r, amountKes: e.target.value } : r)))
                }
                disabled={!line.enabled}
              />
            </Stack>
          ))}
          <Button
            size="small"
            onClick={() => setCustomLines((rows) => [...rows, { label: '', amountKes: '', enabled: true }])}
            sx={{ alignSelf: 'flex-start' }}
          >
            + Add custom line
          </Button>
          <Typography variant="caption" color="text.secondary">
            Frequency: Monthly. Editing this type does not rewrite historical charges or existing house configs.
          </Typography>
          {initial && (
            <Typography variant="caption" color="text.secondary">
              Used by {formatMaybeNumber(initial.houseCount)} house(s).
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        {initial?.isActive && (
          <Button color="warning" onClick={() => deactivate.mutate()} disabled={deactivate.isPending}>
            Deactivate
          </Button>
        )}
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!name.trim() || (!initial && !formEstateId) || mutation.isPending}
          onClick={() => {
            setFormError(null);
            mutation.mutate();
          }}
        >
          {mutation.isPending ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}