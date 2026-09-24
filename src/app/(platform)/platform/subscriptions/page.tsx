'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Chip, Select, MenuItem, Box, Pagination, Typography } from '@mui/material';
import { CreditCard } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, type DataTableColumn } from '@/components/data-display/data-table';
import { platformApi, type PlatformSubscriptionRow } from '@/lib/api/platform';
import { dateFormat } from '@/lib/dates/period';

function clientName(row: PlatformSubscriptionRow): string {
  if (!row.clientId) return '—';
  if (typeof row.clientId === 'string') return row.clientId;
  return row.clientId.name ?? '—';
}

export default function PlatformSubscriptionsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['platform', 'subscriptions', page, status],
    queryFn: () => platformApi.listSubscriptions({ page, limit: 20, status: status || undefined }),
  });

  const columns: DataTableColumn<PlatformSubscriptionRow>[] = [
    { key: 'client', header: 'Client', render: (s) => clientName(s) },
    { key: 'plan', header: 'Plan', render: (s) => s.plan ?? '—' },
    { key: 'status', header: 'Status', render: (s) => <Chip size="small" label={s.status ?? '—'} variant="outlined" /> },
    { key: 'start', header: 'Start', render: (s) => (s.startDate ? dateFormat(s.startDate, 'DD MMM YYYY') : '—') },
  ];

  return (
    <>
      <PageHeader title="Subscriptions" description="Client subscription status from the backend" />
      <Card sx={{ p: 2, mb: 2 }}>
        <Select size="small" displayEmpty value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} sx={{ minWidth: 160 }}>
          <MenuItem value="">All statuses</MenuItem>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="past_due">Past due</MenuItem>
          <MenuItem value="canceled">Canceled</MenuItem>
        </Select>
      </Card>
      <Card>
        <DataTable
          columns={columns}
          rows={data?.items}
          rowKey={(s) => s._id}
          isLoading={isLoading}
          error={error}
          emptyIcon={CreditCard}
          emptyTitle="No subscriptions"
          emptyDescription="Subscriptions are created when clients are provisioned."
          renderMobileCard={(s) => (
            <Card variant="outlined" sx={{ p: 2 }}>
              <Typography fontWeight={600}>{clientName(s)}</Typography>
              <Typography variant="body2" color="text.secondary">
                {s.plan} · {s.status}
              </Typography>
            </Card>
          )}
        />
        {data && Math.ceil(data.total / data.limit) > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <Pagination count={Math.ceil(data.total / data.limit)} page={page} onChange={(_, p) => setPage(p)} size="small" />
          </Box>
        )}
      </Card>
    </>
  );
}
