'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Chip, MenuItem, Select, Stack, Typography } from '@mui/material';
import { Landmark } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, type DataTableColumn } from '@/components/data-display/data-table';
import { EvidenceView } from '@/features/platform/evidence-view';
import { TablePager } from '@/features/platform/table-pager';
import { platformApi, type BankingIntegrationRow } from '@/lib/api/platform';
import { platformKeys } from '@/lib/query/keys';
import { dateFormat } from '@/lib/dates/period';

export default function BankingIntegrationMonitorPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [provider, setProvider] = useState('');
  const [validationStatus, setValidationStatus] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const filters = { page, limit: 20, status: status || undefined, provider: provider || undefined, validationStatus: validationStatus || undefined };

  const { data, isLoading, error } = useQuery({ queryKey: platformKeys.bankingIntegrations(filters), queryFn: () => platformApi.integrations.banking(filters) });
  const reset = (fn: () => void) => { fn(); setPage(1); };

  const columns: DataTableColumn<BankingIntegrationRow>[] = [
    { key: 'client', header: 'Client', render: (r) => <Link href={`/platform/clients/${r.clientId}`}>{r.clientName ?? 'Client'}</Link> },
    { key: 'provider', header: 'Provider', render: (r) => r.displayName ? `${r.provider} · ${r.displayName}` : r.provider },
    { key: 'status', header: 'Connection', render: (r) => <Chip size="small" variant="outlined" color={r.needsReauthorization ? 'warning' : r.status === 'ACTIVE' ? 'success' : 'default'} label={r.needsReauthorization ? 'Needs reauthorization' : r.status} /> },
    { key: 'accounts', header: 'Accounts', align: 'right', render: (r) => r.accounts?.accountCount ?? 0 },
    { key: 'lastSync', header: 'Last successful sync', render: (r) => (r.accounts?.lastSyncSuccessAt ? dateFormat(r.accounts.lastSyncSuccessAt, 'DD MMM YYYY HH:mm') : 'Never reported') },
    { key: 'detail', header: 'Evidence', render: (r) => <button type="button" onClick={() => setExpanded(expanded === r.connectionId ? null : r.connectionId)} style={{ background: 'none', border: 0, color: 'inherit', textDecoration: 'underline', cursor: 'pointer' }}>{expanded === r.connectionId ? 'Hide' : 'View'}</button> },
  ];

  const expandedRow = data?.items.find((r) => r.connectionId === expanded);

  return (
    <>
      <PageHeader title="Banking integrations" description="Read-only monitor of stored connection records across clients." />
      <Alert severity="info" sx={{ mb: 2 }}>
        This shows stored evidence only. It does not call the bank, prove an account can currently be reached, or let you change a connection. Product entitlement is shown separately under Entitlements.
      </Alert>
      <Card sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Select size="small" displayEmpty value={provider} onChange={(e) => reset(() => setProvider(e.target.value))} sx={{ minWidth: 150 }} inputProps={{ 'aria-label': 'Provider' }}>
            <MenuItem value="">Any provider</MenuItem>
            <MenuItem value="COOP">Co-operative Bank</MenuItem>
          </Select>
          <Select size="small" displayEmpty value={status} onChange={(e) => reset(() => setStatus(e.target.value))} sx={{ minWidth: 190 }} inputProps={{ 'aria-label': 'Connection status' }}>
            <MenuItem value="">Any connection status</MenuItem>
            <MenuItem value="ACTIVE">Active</MenuItem>
            <MenuItem value="NEEDS_REAUTHORIZATION">Needs reauthorization</MenuItem>
            <MenuItem value="DISCONNECTED">Disconnected</MenuItem>
          </Select>
          <Select size="small" displayEmpty value={validationStatus} onChange={(e) => reset(() => setValidationStatus(e.target.value))} sx={{ minWidth: 190 }} inputProps={{ 'aria-label': 'Account validation status' }}>
            <MenuItem value="">Any validation status</MenuItem>
            <MenuItem value="VALIDATED">Validated</MenuItem>
            <MenuItem value="PENDING">Pending</MenuItem>
            <MenuItem value="FAILED">Failed</MenuItem>
          </Select>
        </Stack>
      </Card>
      <Card>
        <DataTable
          columns={columns}
          rows={data?.items}
          rowKey={(r) => r.connectionId}
          isLoading={isLoading}
          error={error}
          emptyIcon={Landmark}
          emptyTitle="No bank connections"
          emptyDescription="No client has stored a bank connection matching these filters."
          renderMobileCard={(r) => (
            <Card variant="outlined" sx={{ p: 2 }}>
              <Typography fontWeight={600}>{r.clientName ?? 'Client'}</Typography>
              <Typography variant="body2" color="text.secondary">
                {r.provider} · {r.needsReauthorization ? 'Needs reauthorization' : r.status} · {r.accounts?.accountCount ?? 0} accounts
              </Typography>
            </Card>
          )}
        />
        <TablePager total={data?.total} limit={data?.limit} page={page} onChange={setPage} />
      </Card>
      {expandedRow ? (
        <Card sx={{ p: 2.5, mt: 2 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
            Stored evidence: {expandedRow.clientName ?? 'Client'} · {expandedRow.provider}
          </Typography>
          <EvidenceView data={{ authEvidence: expandedRow.authEvidence, accounts: expandedRow.accounts }} />
        </Card>
      ) : null}
    </>
  );
}
