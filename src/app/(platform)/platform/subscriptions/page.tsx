'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Chip, MenuItem, Select, Typography } from '@mui/material';
import { CreditCard } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, type DataTableColumn } from '@/components/data-display/data-table';
import { ProductChips } from '@/features/platform/product-chips';
import { TablePager } from '@/features/platform/table-pager';
import { platformApi, type PlatformSubscriptionRow } from '@/lib/api/platform';
import { platformKeys } from '@/lib/query/keys';
import { dateFormat } from '@/lib/dates/period';

function clientName(row: PlatformSubscriptionRow): string {
  if (!row.clientId) return '—';
  if (typeof row.clientId === 'string') return 'Unknown client';
  return row.clientId.name ?? '—';
}

export default function PlatformSubscriptionsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const filters = { page, limit: 20, status: status || undefined };

  const { data, isLoading, error } = useQuery({ queryKey: platformKeys.subscriptions(filters), queryFn: () => platformApi.subscriptions.list(filters) });

  const columns: DataTableColumn<PlatformSubscriptionRow>[] = [
    { key: 'client', header: 'Client', render: (s) => clientName(s) },
    { key: 'plan', header: 'Plan', render: (s) => s.plan ?? '—' },
    { key: 'status', header: 'Status', render: (s) => <Chip size="small" label={s.status ?? '—'} variant="outlined" /> },
    { key: 'products', header: 'Products', render: (s) => <ProductChips products={s.products ?? []} /> },
    { key: 'start', header: 'Start', render: (s) => (s.startDate ? dateFormat(s.startDate, 'DD MMM YYYY') : '—') },
    { key: 'end', header: 'End', render: (s) => (s.endDate ? dateFormat(s.endDate, 'DD MMM YYYY') : 'Open-ended') },
  ];

  return (
    <>
      <PageHeader title="Subscriptions" description="Existing subscription records. Clients without a record are listed under Entitlements." />
      <Card sx={{ p: 2, mb: 2 }}>
        <Select size="small" displayEmpty value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} sx={{ minWidth: 160 }} inputProps={{ 'aria-label': 'Filter by status' }}>
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
              <ProductChips products={s.products ?? []} />
            </Card>
          )}
        />
        <TablePager total={data?.total} limit={data?.limit} page={page} onChange={setPage} />
      </Card>
    </>
  );
}
