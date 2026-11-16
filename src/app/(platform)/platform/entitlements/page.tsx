'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Alert, Card, MenuItem, Select, Stack, Typography } from '@mui/material';
import { KeyRound } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, type DataTableColumn } from '@/components/data-display/data-table';
import { ActiveChip, ProductChips } from '@/features/platform/product-chips';
import { TablePager } from '@/features/platform/table-pager';
import { platformApi, type EntitlementInventoryRow, type ProductFilter } from '@/lib/api/platform';
import { platformKeys } from '@/lib/query/keys';
import { dateFormat } from '@/lib/dates/period';

export default function PlatformEntitlementsPage() {
  const [page, setPage] = useState(1);
  const [product, setProduct] = useState<ProductFilter | ''>('');
  const [isActive, setIsActive] = useState('');
  const filters = { page, limit: 25, product: product || undefined, isActive: isActive === '' ? undefined : isActive === 'true' };

  const { data, isLoading, error } = useQuery({ queryKey: platformKeys.entitlements(filters), queryFn: () => platformApi.entitlements.inventory(filters) });

  const columns: DataTableColumn<EntitlementInventoryRow>[] = [
    { key: 'client', header: 'Client', render: (r) => <Link href={`/platform/clients/${r.clientId}`}>{r.name}</Link> },
    { key: 'active', header: 'Client status', render: (r) => <ActiveChip active={r.isActive} /> },
    { key: 'sub', header: 'Subscription', render: (r) => (r.hasSubscription ? `${r.plan ?? '—'} · ${r.status ?? '—'}` : 'Missing') },
    { key: 'products', header: 'Products', render: (r) => <ProductChips products={r.products} hasSubscription={r.hasSubscription} /> },
    { key: 'updated', header: 'Last changed', render: (r) => (r.updatedAt ? dateFormat(r.updatedAt, 'DD MMM YYYY HH:mm') : '—') },
  ];

  return (
    <>
      <PageHeader title="Entitlements" description="Which clients are allowed to use Banking and M-PESA. This is permission only, not integration state." />
      <Alert severity="info" sx={{ mb: 2 }}>
        Clients marked &quot;No subscription&quot; cannot be given products here: the backend updates existing subscriptions only and cannot create a missing one.
      </Alert>
      <Card sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Select size="small" displayEmpty value={product} onChange={(e) => { setProduct(e.target.value as ProductFilter | ''); setPage(1); }} sx={{ minWidth: 170 }} inputProps={{ 'aria-label': 'Product' }}>
            <MenuItem value="">Any product</MenuItem>
            <MenuItem value="BANKING">Banking</MenuItem>
            <MenuItem value="MPESA">M-PESA</MenuItem>
            <MenuItem value="BOTH">Both products</MenuItem>
            <MenuItem value="NONE">No products</MenuItem>
          </Select>
          <Select size="small" displayEmpty value={isActive} onChange={(e) => { setIsActive(e.target.value); setPage(1); }} sx={{ minWidth: 150 }} inputProps={{ 'aria-label': 'Client status' }}>
            <MenuItem value="">Any client status</MenuItem>
            <MenuItem value="true">Active</MenuItem>
            <MenuItem value="false">Inactive</MenuItem>
          </Select>
        </Stack>
      </Card>
      <Card>
        <DataTable
          columns={columns}
          rows={data?.items}
          rowKey={(r) => r.clientId}
          isLoading={isLoading}
          error={error}
          emptyIcon={KeyRound}
          emptyTitle="No clients match"
          emptyDescription="Adjust the filters."
          renderMobileCard={(r) => (
            <Card variant="outlined" sx={{ p: 2 }}>
              <Typography fontWeight={600}>
                <Link href={`/platform/clients/${r.clientId}`}>{r.name}</Link>
              </Typography>
              <ProductChips products={r.products} hasSubscription={r.hasSubscription} />
            </Card>
          )}
        />
        <TablePager total={data?.total} limit={data?.limit} page={page} onChange={setPage} />
      </Card>
    </>
  );
}
