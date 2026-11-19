'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Stack, Select, MenuItem, Pagination, Box, Typography, Chip } from '@mui/material';
import { ArrowLeftRight } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, type DataTableColumn } from '@/components/data-display/data-table';
import { MatchStatusChip, ProcessingStateChip } from '@/components/data-display/status-chip';
import { FreshnessBadge } from '@/components/data-display/freshness-badge';
import { transactionsApi } from '@/lib/api/transactions';
import { mpesaTransactionsApi, type MpesaTransactionRow, type MpesaVerificationState, type MpesaPostingState } from '@/lib/api/mpesa-transactions';
import { subscriptionApi } from '@/lib/api/subscription';
import { formatCents } from '@/lib/formatting/currency';
import { dateFormat } from '@/lib/dates/period';
import { useVisibleEstates } from '@/features/estates/use-visible-estates';
import { ProductEntitlementBlocked, isProductNotEntitled } from '@/components/feedback/product-entitlement-blocked';
import { estateKeys, mpesaKeys } from '@/lib/query/keys';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { useSession } from '@/features/auth/session-context';
import { identityKeyFromUser } from '@/lib/session/local-session-marker';
import type { BankTransaction, MatchStatus } from '@/types/api';

type TransactionSource = 'BANKING' | 'MPESA';

function verificationLabel(state: MpesaVerificationState) {
  return state.replace(/_/g, ' ');
}
function postingLabel(state: MpesaPostingState) {
  return state.replaceAll('_', ' ');
}

export default function TransactionsPage() {
  const { user } = useSession();
  const identity = user ? identityKeyFromUser(user) : 'anon';
  const { estates } = useVisibleEstates();
  const [estateId, setEstateId] = useState('');
  const [preferredSource, setPreferredSource] = useState<TransactionSource>('BANKING');
  const [matchStatus, setMatchStatus] = useState<'' | MatchStatus>('');
  const [verificationState, setVerificationState] = useState<'' | MpesaVerificationState>('');
  const [postingState, setPostingState] = useState<'' | MpesaPostingState>('');
  const [page, setPage] = useState(1);

  const subscription = useQuery({
    queryKey: ['subscription', identity],
    queryFn: () => subscriptionApi.get(),
    retry: false,
  });
  const products = subscription.data?.subscription?.products ?? [];
  const hasBanking = products.includes('BANKING');
  const hasMpesa = products.includes('MPESA');
  const source: TransactionSource | null = products.includes(preferredSource)
    ? preferredSource
    : hasBanking ? 'BANKING' : hasMpesa ? 'MPESA' : null;

  const bankQuery = useCachedQuery(
    `${identity}:transactions:${estateId || 'all'}:${matchStatus || 'all'}:${page}`,
    [...estateKeys.transactions(estateId || undefined, { identity, matchStatus, page })],
    () => transactionsApi.list({ estateId: estateId || undefined, matchStatus: matchStatus || undefined, page, limit: 20 }),
    { enabled: source === 'BANKING' && hasBanking }
  );

  const mpesaQuery = useCachedQuery(
    `${identity}:mpesa-transactions:${estateId || 'all'}:${verificationState || 'all'}:${postingState || 'all'}:${page}`,
    [...mpesaKeys.transactions(estateId || undefined, { identity, verificationState, postingState, page })],
    () => mpesaTransactionsApi.list({
      estateId: estateId || undefined,
      verificationState: verificationState || undefined,
      postingState: postingState || undefined,
      page,
      limit: 20,
    }),
    { enabled: source === 'MPESA' && hasMpesa }
  );

  const activeQuery = source === 'BANKING' ? bankQuery : mpesaQuery;
  const activeError = activeQuery.error;

  if (subscription.isLoading) {
    return <><PageHeader title="Transactions" description="Bank and M-PESA transaction history" /><Card sx={{ p: 2 }}>Loading your transaction access…</Card></>;
  }
  if (subscription.error) {
    return <><PageHeader title="Transactions" description="Bank and M-PESA transaction history" /><Alert severity="error">Could not load your transaction entitlements.</Alert></>;
  }
  if (!source) {
    return <><PageHeader title="Transactions" description="Bank and M-PESA transaction history" /><Alert severity="info">Banking or M-PESA access must be assigned to this client before transaction history is available.</Alert></>;
  }
  if (isProductNotEntitled(activeError)) {
    return (
      <>
        <PageHeader title="Transactions" description="Bank and M-PESA transaction history" />
        <ProductEntitlementBlocked error={activeError} fallbackProduct={source} />
      </>
    );
  }

  const bankData = source === 'BANKING' ? bankQuery.data : undefined;
  const mpesaData = source === 'MPESA' ? mpesaQuery.data : undefined;
  const pagination = source === 'BANKING' ? bankData?.pagination : mpesaData?.pagination;
  const freshness = source === 'BANKING' ? bankQuery.freshness : mpesaQuery.freshness;
  const cachedAt = source === 'BANKING' ? bankQuery.cachedAt : mpesaQuery.cachedAt;
  const isLoading = activeQuery.isLoading;
  const error = activeError;

  const bankColumns: DataTableColumn<BankTransaction>[] = [
    { key: 'date', header: 'Date', render: (t) => dateFormat(t.transactionDate, 'DD MMM YYYY') },
    { key: 'reference', header: 'Reference', render: (t) => t.paymentReference || t.narration || '—' },
    { key: 'type', header: 'Type', render: (t) => <Chip size="small" label={t.eventType} variant="outlined" /> },
    { key: 'amount', header: 'Amount', align: 'right', render: (t) => formatCents(t.amountCents, t.currency) },
    { key: 'status', header: 'Match', render: (t) => <MatchStatusChip status={t.matchStatus} /> },
    { key: 'processing', header: 'Posting', render: (t) => (t.processingState ? <ProcessingStateChip state={t.processingState} /> : '—') },
  ];

  const mpesaColumns: DataTableColumn<MpesaTransactionRow>[] = [
    { key: 'date', header: 'Date', render: (t) => dateFormat(t.transactionAt, 'DD MMM YYYY HH:mm') },
    { key: 'receipt', header: 'Receipt', render: (t) => t.receiptNumber },
    { key: 'till', header: 'Till', render: (t) => t.businessShortCode },
    { key: 'reference', header: 'Bill reference', render: (t) => t.billRefNumber || '—' },
    { key: 'amount', header: 'Amount', align: 'right', render: (t) => formatCents(t.amountCents, t.currency) },
    { key: 'verification', header: 'Verification', render: (t) => <Chip size="small" variant="outlined" label={verificationLabel(t.verificationState)} color={t.verificationState === 'MATCHED' ? 'success' : t.verificationState === 'CONFLICT' ? 'error' : 'warning'} /> },
    { key: 'posting', header: 'Rent posting', render: (t) => <Chip size="small" variant="outlined" label={postingLabel(t.postingState)} color={t.postingState === 'POSTED' ? 'success' : t.postingState === 'FAILED_TERMINAL' ? 'error' : 'default'} /> },
  ];

  return (
    <>
      <PageHeader
        title="Transactions"
        description={source === 'BANKING' ? 'Imported bank transactions across connected accounts' : 'Canonical M-PESA Till receipts and their verification / rent-posting states'}
        actions={source === 'BANKING' ? <Chip component={Link} href="/transactions/unmatched" clickable label="Review unmatched" color="warning" variant="outlined" /> : undefined}
      />

      {freshness !== 'live' ? (
        <Box sx={{ mb: 1.5 }}>
          <FreshnessBadge freshness={freshness} cachedAt={cachedAt} />
        </Box>
      ) : null}

      <Card sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap">
          {hasBanking && hasMpesa ? (
            <Select size="small" value={source} onChange={(e) => { setPreferredSource(e.target.value as TransactionSource); setPage(1); }} sx={{ minWidth: 160 }} aria-label="Transaction source">
              <MenuItem value="BANKING">Banking</MenuItem>
              <MenuItem value="MPESA">M-PESA</MenuItem>
            </Select>
          ) : null}
          <Select size="small" displayEmpty value={estateId} onChange={(e) => { setEstateId(e.target.value); setPage(1); }} sx={{ minWidth: 180 }}>
            <MenuItem value="">All estates</MenuItem>
            {estates?.map((e) => <MenuItem key={e._id} value={e._id}>{e.name}</MenuItem>)}
          </Select>
          {source === 'BANKING' ? (
            <Select size="small" displayEmpty value={matchStatus} onChange={(e) => { setMatchStatus(e.target.value as typeof matchStatus); setPage(1); }} sx={{ minWidth: 160 }}>
              <MenuItem value="">Any match status</MenuItem>
              <MenuItem value="MATCHED">Reconciled</MenuItem>
              <MenuItem value="UNMATCHED">Unmatched</MenuItem>
              <MenuItem value="PARTIAL">Partially matched</MenuItem>
              <MenuItem value="MANUAL_REVIEW">Needs manual review</MenuItem>
            </Select>
          ) : (
            <>
              <Select size="small" displayEmpty value={verificationState} onChange={(e) => { setVerificationState(e.target.value as typeof verificationState); setPage(1); }} sx={{ minWidth: 170 }}>
                <MenuItem value="">Any verification state</MenuItem>
                <MenuItem value="UNVERIFIED">Unverified</MenuItem>
                <MenuItem value="MATCHED">Matched</MenuItem>
                <MenuItem value="CONFLICT">Conflict</MenuItem>
                <MenuItem value="MANUAL_REVIEW">Manual review</MenuItem>
              </Select>
              <Select size="small" displayEmpty value={postingState} onChange={(e) => { setPostingState(e.target.value as typeof postingState); setPage(1); }} sx={{ minWidth: 170 }}>
                <MenuItem value="">Any rent posting state</MenuItem>
                <MenuItem value="NOT_POSTED">Not posted</MenuItem>
                <MenuItem value="PROCESSING">Processing</MenuItem>
                <MenuItem value="POSTED">Posted</MenuItem>
                <MenuItem value="FAILED_RETRYABLE">Retryable failure</MenuItem>
                <MenuItem value="FAILED_TERMINAL">Terminal failure</MenuItem>
              </Select>
            </>
          )}
        </Stack>
      </Card>

      <Card>
        {source === 'BANKING' ? (
          <DataTable
            columns={bankColumns}
            rows={bankData?.items}
            rowKey={(t) => t._id}
            isLoading={isLoading}
            error={error}
            emptyIcon={ArrowLeftRight}
            emptyTitle="No bank transactions found"
            emptyDescription="Try clearing your filters, or sync a bank account to pull in recent activity."
            renderMobileCard={(t) => (
              <Card variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography fontWeight={600}>{formatCents(t.amountCents, t.currency)}</Typography>
                  <MatchStatusChip status={t.matchStatus} />
                </Stack>
                <Typography variant="body2" color="text.secondary">{t.paymentReference || t.narration || 'No reference'} · {dateFormat(t.transactionDate, 'DD MMM YYYY')}</Typography>
              </Card>
            )}
          />
        ) : (
          <DataTable
            columns={mpesaColumns}
            rows={mpesaData?.items}
            rowKey={(t) => t.id}
            isLoading={isLoading}
            error={error}
            emptyIcon={ArrowLeftRight}
            emptyTitle="No M-PESA receipts found"
            emptyDescription="No canonical Till receipts match this estate and status filter. Tenant SMS submissions are shown separately in the M-PESA submissions review queue."
            renderMobileCard={(t) => (
              <Card variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography fontWeight={600}>{formatCents(t.amountCents, t.currency)}</Typography>
                  <Chip size="small" variant="outlined" label={verificationLabel(t.verificationState)} color={t.verificationState === 'MATCHED' ? 'success' : 'warning'} />
                </Stack>
                <Typography variant="body2" color="text.secondary">{t.receiptNumber} · Till {t.businessShortCode}</Typography>
                <Typography variant="caption" color="text.secondary">{dateFormat(t.transactionAt, 'DD MMM YYYY HH:mm')} · {postingLabel(t.postingState)}</Typography>
              </Card>
            )}
          />
        )}
        {pagination && pagination.totalPages > 1 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <Pagination count={pagination.totalPages} page={page} onChange={(_, p) => setPage(p)} size="small" />
          </Box>
        ) : null}
      </Card>
    </>
  );
}
