'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Stack, TextField, Select, MenuItem, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Chip, Typography } from '@mui/material';
import { UserCog, Plus, UserX } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, type DataTableColumn } from '@/components/data-display/data-table';
import { staffApi, type CreateStaffInput, type UpdateStaffInput } from '@/lib/api/staff';
import { useVisibleEstates } from '@/features/estates/use-visible-estates';
import { ApiError } from '@/lib/api/client';
import { useConnectivity } from '@/lib/sync/connectivity';
import type { StaffUser } from '@/types/api';

export default function StaffPage() {
  const queryClient = useQueryClient();
  const { estates } = useVisibleEstates();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<StaffUser | null>(null);
  const { data, isLoading, error } = useQuery({ queryKey: ['staff'], queryFn: () => staffApi.list() });

  const connectivity = useConnectivity();
  const canReach = connectivity.state === 'online' || connectivity.state === 'syncing' || connectivity.state === 'sync-error';
  const [lifecycle, setLifecycle] = useState<{ staff: StaffUser; action: 'activate' | 'deactivate' } | null>(null);
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);
  const [lifecycleSuccess, setLifecycleSuccess] = useState<string | null>(null);

  const lifecycleMutation = useMutation({
    mutationFn: async () => {
      if (!lifecycle) throw new Error('No staff');
      const staffId = lifecycle.staff._id || (lifecycle.staff as { id?: string }).id;
      if (!staffId) throw new Error('Missing staff id');
      if (lifecycle.action === 'activate') return staffApi.activate(staffId);
      return staffApi.deactivate(staffId);
    },
    onSuccess: (staff) => {
      setLifecycleSuccess(
        lifecycle?.action === 'activate'
          ? `${staff.name} is now Active (confirmed by server).`
          : `${staff.name} is now Inactive (confirmed by server).`
      );
      setLifecycle(null);
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
    onError: (err) => setLifecycleError(err instanceof ApiError ? err.message : 'Unable to update staff status.'),
  });

  const columns: DataTableColumn<StaffUser>[] = [
    { key: 'name', header: 'Name', render: (s) => s.name },
    { key: 'email', header: 'Email', render: (s) => s.email },
    { key: 'role', header: 'Role', render: (s) => <Chip size="small" label={s.role} variant="outlined" /> },
    { key: 'status', header: 'Status', render: (s) => <Chip size="small" label={s.isActive ? 'Active' : 'Deactivated'} color={s.isActive ? 'success' : 'default'} variant="outlined" /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (s) => (
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button size="small" onClick={() => setEditing(s)}>
            Edit
          </Button>
          {s.isActive ? (
            <Button
              size="small"
              color="warning"
              startIcon={<UserX size={14} />}
              disabled={!canReach || lifecycleMutation.isPending}
              onClick={() => {
                setLifecycleError(null);
                setLifecycleSuccess(null);
                setLifecycle({ staff: s, action: 'deactivate' });
              }}
            >
              Deactivate
            </Button>
          ) : (
            <Button
              size="small"
              color="success"
              variant="outlined"
              disabled={!canReach || lifecycleMutation.isPending}
              onClick={() => {
                setLifecycleError(null);
                setLifecycleSuccess(null);
                setLifecycle({ staff: s, action: 'activate' });
              }}
            >
              Activate
            </Button>
          )}
        </Stack>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Staff"
        description="People with access to your client's data"
        actions={
          <Button variant="contained" startIcon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>
            New Staff Member
          </Button>
        }
      />

      <Card>
        <DataTable
          columns={columns}
          rows={data}
          rowKey={(s) => s._id}
          isLoading={isLoading}
          error={error}
          emptyIcon={UserCog}
          emptyTitle="No staff members yet"
          emptyDescription="Staff you add will appear here."
          renderMobileCard={(s) => (
            <Card variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography fontWeight={600}>{s.name}</Typography>
                <Chip size="small" label={s.role} variant="outlined" />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {s.email}
              </Typography>
            </Card>
          )}
        />
      </Card>

      {!canReach ? <Alert severity="warning" sx={{ mb: 2 }}>Staff activation and deactivation require an internet connection.</Alert> : null}
      {lifecycleError ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setLifecycleError(null)}>
          {lifecycleError}
        </Alert>
      ) : null}
      {lifecycleSuccess ? (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setLifecycleSuccess(null)}>
          {lifecycleSuccess}
        </Alert>
      ) : null}

      <Dialog
        open={Boolean(lifecycle)}
        onClose={() => {
          if (!lifecycleMutation.isPending) setLifecycle(null);
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>{lifecycle?.action === 'activate' ? 'Activate staff' : 'Deactivate staff'}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {lifecycle?.action === 'activate'
              ? `Reactivate "${lifecycle?.staff.name}"? They will be able to sign in after the server confirms activation.`
              : `Deactivate "${lifecycle?.staff.name}"? Their access will be blocked after the server confirms deactivation.`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button disabled={lifecycleMutation.isPending} onClick={() => setLifecycle(null)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={lifecycle?.action === 'deactivate' ? 'warning' : 'success'}
            disabled={lifecycleMutation.isPending || !canReach}
            onClick={() => {
              setLifecycleError(null);
              lifecycleMutation.mutate();
            }}
          >
            {lifecycleMutation.isPending
              ? 'Confirming…'
              : lifecycle?.action === 'activate'
                ? 'Confirm activate'
                : 'Confirm deactivate'}
          </Button>
        </DialogActions>
      </Dialog>

      <CreateStaffDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => queryClient.invalidateQueries({ queryKey: ['staff'] })} />

      {editing && (
        <EditStaffDialog
          open={Boolean(editing)}
          onClose={() => setEditing(null)}
          staff={editing}
          estates={estates ?? []}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['staff'] })}
        />
      )}
    </>
  );
}

function EditStaffDialog({
  open,
  onClose,
  staff,
  estates,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  staff: StaffUser;
  estates: { _id: string; name: string }[];
  onSaved: () => void;
}) {
  // Section 8 of this pass: inspected the backend first — user.controller.js#update
  // only accepts name/phone/estateIds (see the comment on updateStaff in
  // auth.service.js). Role is NOT editable here on purpose: a staff member
  // (even a CLIENT_ADMIN acting on a peer) must never be able to change
  // authorization privileges through this form, and the backend would
  // silently strip it anyway.
  const [name, setName] = useState(staff.name);
  const [phone, setPhone] = useState(staff.phone ?? '');
  const [estateIds, setEstateIds] = useState<string[]>(staff.estateIds ?? []);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: () => staffApi.update(staff._id, { name, phone, estateIds } satisfies UpdateStaffInput),
    onSuccess: () => {
      setSaved(true);
      onSaved();
    },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Unable to update staff member.'),
  });

  return (
    <Dialog open={open} onClose={() => { setSaved(false); onClose(); }} fullWidth maxWidth="xs">
      <DialogTitle>Edit {staff.name}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {formError && <Alert severity="error">{formError}</Alert>}
          {saved && (
            <Alert severity="success" onClose={() => setSaved(false)}>
              Staff member updated.
            </Alert>
          )}
          <TextField label="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
          <TextField label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Select
            multiple
            displayEmpty
            value={estateIds}
            onChange={(e) => setEstateIds(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
            renderValue={(selected) => (selected.length === 0 ? 'No specific estates selected' : `${selected.length} estate(s) assigned`)}
          >
            {estates.map((e) => (
              <MenuItem key={e._id} value={e._id}>
                {e.name}
              </MenuItem>
            ))}
          </Select>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => { setSaved(false); onClose(); }}>Close</Button>
        <Button variant="contained" disabled={!name || mutation.isPending} onClick={() => { setFormError(null); mutation.mutate(); }}>
          {mutation.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function CreateStaffDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<Partial<CreateStaffInput>>({ role: 'STAFF' });
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => staffApi.create(form as CreateStaffInput),
    onSuccess: () => {
      onCreated();
      setForm({ role: 'STAFF' });
      onClose();
    },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Unable to create staff member.'),
  });

  const valid = form.name && form.email && form.password && form.password.length >= 8;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>New Staff Member</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {formError && <Alert severity="error">{formError}</Alert>}
          <TextField label="Full name" value={form.name ?? ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required autoFocus />
          <TextField label="Email" type="email" value={form.email ?? ''} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
          <TextField label="Temporary password" type="password" helperText="At least 8 characters" value={form.password ?? ''} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required />
          <Select value={form.role ?? 'STAFF'} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as CreateStaffInput['role'] }))}>
            <MenuItem value="STAFF">Staff</MenuItem>
            <MenuItem value="CLIENT_ADMIN">Client Admin</MenuItem>
          </Select>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!valid || mutation.isPending} onClick={() => { setFormError(null); mutation.mutate(); }}>
          {mutation.isPending ? 'Creating…' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
