'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Stack, TextField, Typography } from '@mui/material';
import { Shield } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, type DataTableColumn } from '@/components/data-display/data-table';
import { TablePager } from '@/features/platform/table-pager';
import { platformApi, type PlatformAuditRow } from '@/lib/api/platform';
import { platformKeys } from '@/lib/query/keys';
import { dateFormat } from '@/lib/dates/period';

export default function PlatformAuditPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const filters = { page, limit: 30, action: action || undefined };

  const { data, isLoading, error } = useQuery({ queryKey: platformKeys.audit(filters), queryFn: () => platformApi.audit.list(filters) });

  const columns: DataTableColumn<PlatformAuditRow>[] = [
    { key: 'when', header: 'When', render: (r) => (r.createdAt ? dateFormat(r.createdAt, 'DD MMM YYYY HH:mm') : '—') },
    { key: 'action', header: 'Action', render: (r) => r.action },
    { key: 'resource', header: 'Resource', render: (r) => r.resource ?? '—' },
    { key: 'user', header: 'User', render: (r) => r.actor?.email || r.actor?.name || '—' },
    { key: 'desc', header: 'Description', render: (r) => r.description || '—' },
  ];

  return (
    <>
      <PageHeader title="Audit log" description="Platform-wide audit trail." />
      <Card sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2}>
          <TextField size="small" label="Filter action" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} placeholder="e.g. CLIENT_SUBSCRIPTION_UPDATED" />
        </Stack>
      </Card>
      <Card>
        <DataTable
          columns={columns}
          rows={data?.items}
          rowKey={(r) => r.id}
          isLoading={isLoading}
          error={error}
          emptyIcon={Shield}
          emptyTitle="No audit entries"
          emptyDescription="Actions across clients appear here."
          renderMobileCard={(r) => (
            <Card variant="outlined" sx={{ p: 2 }}>
              <Typography fontWeight={600}>{r.action}</Typography>
              <Typography variant="body2" color="text.secondary">
                {r.description || r.resource || '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {r.createdAt ? dateFormat(r.createdAt, 'DD MMM YYYY HH:mm') : ''}
              </Typography>
            </Card>
          )}
        />
        <TablePager total={data?.total} limit={data?.limit} page={page} onChange={setPage} />
      </Card>
    </>
  );
}
