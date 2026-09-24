'use client';

import { useRouter } from 'next/navigation';
import { openWorkspace } from '@/lib/navigation/workspace';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Stack, Alert, Box, Typography, Grid, Chip,
} from '@mui/material';
import { Building2, Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { FreshnessBadge } from '@/components/data-display/freshness-badge';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { estatesApi, visibleTo, type EstateWithMetrics } from '@/lib/api/estates';
import { useSession } from '@/features/auth/session-context';
import { permissions } from '@/lib/permissions/permissions';
import { ApiError } from '@/lib/api/client';
import { formatCents } from '@/lib/formatting/currency';

export default function EstatesPage() {
  const router = useRouter();
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const identity = user ? `${user.clientId}:${user.email}` : 'anon';
  const { data, freshness, cachedAt, isLoading, error } = useCachedQuery(
    `${identity}:estates:list`,
    ['estates', identity],
    () => estatesApi.list()
  );
  const estates = data ? visibleTo(data, user?.estateIds) : undefined;
  const canManage = user ? permissions.canManageEstates(user.role) : false;

  return (
    <>
      <PageHeader
        title="Estates"
        description="Portfolio estates with occupancy and collection summary from live data"
        actions={
          canManage ? (
            <Button variant="contained" startIcon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
              New Estate
            </Button>
          ) : null
        }
      />

      {user && !permissions.canManageEstates(user.role) && (user.estateIds?.length ?? 0) > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Showing estates assigned to you. API estate isolation still applies.
        </Alert>
      )}

      {freshness !== 'live' && (
        <Box sx={{ mb: 1.5 }}>
          <FreshnessBadge freshness={freshness} cachedAt={cachedAt} />
        </Box>
      )}

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error instanceof Error ? error.message : 'Failed to load estates'}</Alert> : null}
      {isLoading ? <Typography color="text.secondary">Loading estates…</Typography> : null}

      {!isLoading && (estates?.length ?? 0) === 0 ? (
        <Card sx={{ p: 3 }}>
          <Stack spacing={1} alignItems="flex-start">
            <Building2 size={28} />
            <Typography fontWeight={600}>No estates yet</Typography>
            <Typography variant="body2" color="text.secondary">
              Estates you manage will appear here with real occupancy and billing metrics.
            </Typography>
          </Stack>
        </Card>
      ) : null}

      <Grid container spacing={2}>
        {(estates ?? []).map((e) => (
          <Grid item xs={12} md={6} key={e._id}>
            <EstateCard estate={e} onOpen={() => openWorkspace('estate', e._id, router)} />
          </Grid>
        ))}
      </Grid>

      {canManage ? (
        <CreateEstateDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={() => queryClient.invalidateQueries({ queryKey: ['estates'] })}
        />
      ) : null}
    </>
  );
}

function EstateCard({ estate, onOpen }: { estate: EstateWithMetrics; onOpen: () => void }) {
  const m = estate.metrics;
  const occ =
    m && m.houseCount > 0 ? Math.round((m.occupiedHouses / m.houseCount) * 1000) / 10 : null;

  return (
    <Card sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
        <Box>
          <Typography variant="h6" fontWeight={700} sx={{ cursor: 'pointer' }} onClick={onOpen}>
            {estate.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {estate.address || 'No address'} · {estate.currency || 'KES'}
          </Typography>
        </Box>
        <Button size="small" variant="contained" onClick={onOpen}>
          Open workspace
        </Button>
      </Stack>

      {m ? (
        <Stack spacing={1.5} sx={{ mt: 2 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip size="small" label={`${m.houseCount} houses`} />
            <Chip size="small" color="success" variant="outlined" label={`${m.occupiedHouses} occupied`} />
            <Chip size="small" variant="outlined" label={`${m.vacantHouses} vacant`} />
            {occ != null ? <Chip size="small" label={`${occ}% occupancy`} /> : null}
            <Chip size="small" label={`${m.tenantCount} tenants`} />
            {m.houseTypeCount != null ? <Chip size="small" label={`${m.houseTypeCount} types`} /> : null}
            {(m.unclassifiedHouses ?? 0) > 0 ? (
              <Chip size="small" color="warning" label={`${m.unclassifiedHouses} unclassified`} />
            ) : null}
          </Stack>
          <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
            <Metric label={`Billed (${m.period || 'period'})`} value={formatCents(m.billedCents)} />
            <Metric label="Collected" value={formatCents(m.collectedCents)} />
            <Metric label="Outstanding" value={formatCents(m.outstandingCents)} />
            <Metric
              label="Collection rate"
              value={m.collectionRatePercent != null ? `${m.collectionRatePercent}%` : '—'}
            />
          </Stack>
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Metrics unavailable for this estate.
        </Typography>
      )}
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography fontWeight={600}>{value}</Typography>
    </Box>
  );
}

function CreateEstateDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => estatesApi.create({ name, address: address || undefined }),
    onSuccess: () => {
      onCreated();
      setName('');
      setAddress('');
      onClose();
    },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Unable to create estate.'),
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>New Estate</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {formError && <Alert severity="error">{formError}</Alert>}
          <TextField label="Estate name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          <TextField label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!name || mutation.isPending}
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
