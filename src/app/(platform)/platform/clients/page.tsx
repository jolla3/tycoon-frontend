'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  Chip,
  Select,
  MenuItem,
  Box,
  Pagination,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Alert,
} from '@mui/material';
import { Building2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, type DataTableColumn } from '@/components/data-display/data-table';
import { platformApi, type PlatformClientRow, type ProvisionClientInput } from '@/lib/api/platform';
import { dateFormat } from '@/lib/dates/period';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function PlatformClientsPage() {
  const [page, setPage] = useState(1);
  const [isActive, setIsActive] = useState<string>('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ProvisionClientInput>({
    clientName: '',
    ownerName: '',
    email: '',
    phone: '',
    password: '',
    plan: 'trial',
  });
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['platform', 'clients', page, isActive],
    queryFn: () =>
      platformApi.listClients({
        page,
        limit: 20,
        isActive: isActive === '' ? undefined : isActive === 'true',
      }),
  });

  const provision = useMutation({
    mutationFn: () => platformApi.provisionClient(form),
    onSuccess: () => {
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['platform', 'clients'] });
    },
  });

  const columns: DataTableColumn<PlatformClientRow>[] = [
    { key: 'name', header: 'Client', render: (c) => c.name },
    {
      key: 'owner',
      header: 'Owner',
      render: (c) => c.owner?.email || c.owner?.name || '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => (
        <Chip
          size="small"
          label={c.isActive ? 'Active' : 'Inactive'}
          color={c.isActive ? 'success' : 'default'}
          variant="outlined"
        />
      ),
    },
    { key: 'estates', header: 'Estates', render: (c) => c.estateCount },
    { key: 'houses', header: 'Houses', render: (c) => c.houseCount },
    {
      key: 'created',
      header: 'Created',
      render: (c) => (c.createdAt ? dateFormat(c.createdAt, 'DD MMM YYYY') : '—'),
    },
  ];

  return (
    <>
      <PageHeader
        title="Clients"
        description="Provision and manage client accounts"
        actions={
          <Button variant="contained" onClick={() => setOpen(true)}>
            Provision client
          </Button>
        }
      />
      <Card sx={{ p: 2, mb: 2 }}>
        <Select
          size="small"
          displayEmpty
          value={isActive}
          onChange={(e) => {
            setIsActive(e.target.value);
            setPage(1);
          }}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="true">Active</MenuItem>
          <MenuItem value="false">Inactive</MenuItem>
        </Select>
      </Card>
      <Card>
        <DataTable
          columns={columns}
          rows={data?.items}
          rowKey={(c) => c._id}
          isLoading={isLoading}
          error={error}
          emptyIcon={Building2}
          emptyTitle="No clients"
          emptyDescription="Provision a client to get started."
          renderMobileCard={(c) => (
            <Card variant="outlined" sx={{ p: 2 }}>
              <Typography fontWeight={600}>{c.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {c.owner?.email || '—'} · {c.estateCount} estates · {c.houseCount} houses
              </Typography>
            </Card>
          )}
        />
        {data && Math.ceil(data.total / data.limit) > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <Pagination
              count={Math.ceil(data.total / data.limit)}
              page={page}
              onChange={(_, p) => setPage(p)}
            />
          </Box>
        )}
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Provision client</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {provision.isError ? (
              <Alert severity="error">{(provision.error as Error).message}</Alert>
            ) : null}
            <TextField
              label="Client name"
              value={form.clientName}
              onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="Owner name"
              value={form.ownerName}
              onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="Owner email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="Phone"
              value={form.phone || ''}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Temporary password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
              fullWidth
              helperText="Min 8 characters"
            />
            <Select
              size="small"
              value={form.plan || 'trial'}
              onChange={(e) =>
                setForm((f) => ({ ...f, plan: e.target.value as ProvisionClientInput['plan'] }))
              }
            >
              <MenuItem value="trial">Trial</MenuItem>
              <MenuItem value="basic">Basic</MenuItem>
              <MenuItem value="pro">Pro</MenuItem>
            </Select>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={provision.isPending}
            onClick={() => provision.mutate()}
          >
            Provision
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
