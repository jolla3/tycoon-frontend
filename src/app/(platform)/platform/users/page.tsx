'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Chip, MenuItem, Select, Typography } from '@mui/material';
import { Users } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, type DataTableColumn } from '@/components/data-display/data-table';
import { ActiveChip } from '@/features/platform/product-chips';
import { TablePager } from '@/features/platform/table-pager';
import { platformApi, type PlatformUserRow } from '@/lib/api/platform';
import { platformKeys } from '@/lib/query/keys';
import { dateFormat } from '@/lib/dates/period';

export default function PlatformUsersPage() {
  const [page, setPage] = useState(1);
  const [role, setRole] = useState('');
  const filters = { page, limit: 20, role: role || undefined };

  const { data, isLoading, error } = useQuery({ queryKey: platformKeys.users(filters), queryFn: () => platformApi.users.list(filters) });

  const columns: DataTableColumn<PlatformUserRow>[] = [
    { key: 'name', header: 'Name', render: (u) => u.name },
    { key: 'email', header: 'Email', render: (u) => u.email },
    { key: 'client', header: 'Client', render: (u) => u.client?.name ?? '—' },
    { key: 'role', header: 'Role', render: (u) => <Chip size="small" label={u.role} variant="outlined" /> },
    { key: 'status', header: 'Status', render: (u) => <ActiveChip active={u.isActive} /> },
    { key: 'lastLogin', header: 'Last login', render: (u) => (u.lastLoginAt ? dateFormat(u.lastLoginAt, 'DD MMM YYYY HH:mm') : '—') },
  ];

  return (
    <>
      <PageHeader title="Users" description="Platform and client users. Credentials are never shown." />
      <Card sx={{ p: 2, mb: 2 }}>
        <Select size="small" displayEmpty value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} sx={{ minWidth: 180 }} inputProps={{ 'aria-label': 'Filter by role' }}>
          <MenuItem value="">All roles</MenuItem>
          <MenuItem value="SUPER_ADMIN">SUPER_ADMIN</MenuItem>
          <MenuItem value="CLIENT_OWNER">CLIENT_OWNER</MenuItem>
          <MenuItem value="CLIENT_ADMIN">CLIENT_ADMIN</MenuItem>
          <MenuItem value="STAFF">STAFF</MenuItem>
        </Select>
      </Card>
      <Card>
        <DataTable
          columns={columns}
          rows={data?.items}
          rowKey={(u) => u.id}
          isLoading={isLoading}
          error={error}
          emptyIcon={Users}
          emptyTitle="No users"
          emptyDescription="Users appear as clients are provisioned."
          renderMobileCard={(u) => (
            <Card variant="outlined" sx={{ p: 2 }}>
              <Typography fontWeight={600}>{u.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {u.email} · {u.role}
              </Typography>
            </Card>
          )}
        />
        <TablePager total={data?.total} limit={data?.limit} page={page} onChange={setPage} />
      </Card>
    </>
  );
}
