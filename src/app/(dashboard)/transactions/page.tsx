'use client';

import { useState } from 'react';
import { Card, Stack, Select, MenuItem, Pagination, Box, Typography, Chip } from '@mui/material';
import { ArrowLeftRight } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, type DataTableColumn } from '@/components/data-display/data-table';
import { MatchStatusChip } from '@/components/data-display/status-chip';
import { FreshnessBadge } from '@/components/data-display/freshness-badge';
import { transactionsApi } from '@/lib/api/transactions';
import { formatCents } from '@/lib/formatting/currency';
import { dateFormat } from '@/lib/dates/period';
import { useVisibleEstates } from '@/features/estates/use-visible-estates';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { useSession } from '@/features/auth/session-context';
import { identityKeyFromUser } from '@/lib/session/local-session-marker';
import type { BankTransaction } from '@/types/api';

export default function TransactionsPage() {
  const { user } = useSession();
  const identity = user ? identityKeyFromUser(user) : 'anon';
  const { estates } = useVisibleEstates();
  const [estateId, setEstateId] = useState('');
  const [matchStatus, setMatchStatus] = useState<'' | 'MATCHED' | 'UNMATCHED'>('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error, freshness, cachedAt } = useCachedQuery(
    `${identity}:transactions:${matchStatus || 'all'}:${page}`,
    ['transactions', identity, matchStatus, page],
    () => transactionsApi.list({ matchStatus: matchStatus || undefined, page, limit: 20 })
  );

  const filteredItems = estateId ? data?.items.filter((t) => t.estateId === estateId) : data?.items;

  const columns: DataTableColumn<BankTransaction>[] = [
    { key: 'date', header: 'Date', render: (t) => dateFormat(t.transactionDate, 'DD MMM YYYY') },
    { key: 'reference', header: 'Reference', render: (t) => t.paymentReference || t.narration || '—' },
    { key: 'type', header: 'Type', render: (t) => <Chip size="small" label={t.eventType} variant="outlined" /> },
    { key: 'amount', header: 'Amount', align: 'right', render: (t) => formatCents(t.amountCents, t.currency) },
    { key: 'status', header: 'Status', render: (t) => <MatchStatusChip status={t.matchStatus} /> },
  ];

  return (
    <>
      <PageHeader
        title="Transactions"
        description="Normalized bank transactions across all connected accounts"
        actions={
          <Chip component={Link} href="/transactions/unmatched" clickable label="Review unmatched" color="warning" variant="outlined" />
        }
      />

      {freshness !== 'live' && (
        <Box sx={{ mb: 1.5 }}>
          <FreshnessBadge freshness={freshness} cachedAt={cachedAt} />
        </Box>
      )}

      <Card sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Select size="small" displayEmpty value={estateId} onChange={(e) => setEstateId(e.target.value)} sx={{ minWidth: 180 }}>
            <MenuItem value="">All estates</MenuItem>
            {estates?.map((e) => (
              <MenuItem key={e._id} value={e._id}>
                {e.name}
              </MenuItem>
            ))}
          </Select>
          <Select size="small" displayEmpty value={matchStatus} onChange={(e) => setMatchStatus(e.target.value as typeof matchStatus)} sx={{ minWidth: 160 }}>
            <MenuItem value="">Any status</MenuItem>
            <MenuItem value="MATCHED">Reconciled</MenuItem>
            <MenuItem value="UNMATCHED">Unmatched</MenuItem>
          </Select>
        </Stack>
      </Card>

      <Card>
        <DataTable
          columns={columns}
          rows={filteredItems}
          rowKey={(t) => t._id}
          isLoading={isLoading}
          error={error}
          emptyIcon={ArrowLeftRight}
          emptyTitle="No transactions found"
          emptyDescription="Try clearing your filters, or sync a bank account to pull in recent activity."
          renderMobileCard={(t) => (
            <Card variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography fontWeight={600}>{formatCents(t.amountCents, t.currency)}</Typography>
                <MatchStatusChip status={t.matchStatus} />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {t.paymentReference || t.narration || 'No reference'} · {dateFormat(t.transactionDate, 'DD MMM YYYY')}
              </Typography>
            </Card>
          )}
        />
        {data && data.pagination.totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <Pagination count={data.pagination.totalPages} page={page} onChange={(_, p) => setPage(p)} size="small" />
          </Box>
        )}
      </Card>
    </>
  );
}
