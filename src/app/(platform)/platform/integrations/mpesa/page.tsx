'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Chip, MenuItem, Select, Stack, Typography } from '@mui/material';
import { Smartphone } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, type DataTableColumn } from '@/components/data-display/data-table';
import { EvidenceView } from '@/features/platform/evidence-view';
import { TablePager } from '@/features/platform/table-pager';
import { platformApi, type MpesaCapability, type MpesaIntegrationFilters, type MpesaIntegrationRow, type MpesaOperationalState } from '@/lib/api/platform';
import { platformKeys } from '@/lib/query/keys';

export default function MpesaIntegrationMonitorPage() {
  const [page, setPage] = useState(1);
  const [operationalState, setOperationalState] = useState<MpesaOperationalState | ''>('');
  const [callbackCapability, setCallbackCapability] = useState<MpesaCapability | ''>('');
  const [pullCapability, setPullCapability] = useState<MpesaCapability | ''>('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const filters: MpesaIntegrationFilters = {
    page,
    limit: 20,
    operationalState: operationalState || undefined,
    callbackCapability: callbackCapability || undefined,
    pullCapability: pullCapability || undefined,
  };

  const { data, isLoading, error } = useQuery({ queryKey: platformKeys.mpesaIntegrations(filters), queryFn: () => platformApi.integrations.mpesa(filters) });
  const reset = (fn: () => void) => { fn(); setPage(1); };
  const rowId = (r: MpesaIntegrationRow) => r.id;

  const columns: DataTableColumn<MpesaIntegrationRow>[] = [
    { key: 'client', header: 'Client', render: (r) => <Link href={`/platform/clients/${r.clientId}`}>{r.clientName ?? 'Client'}</Link> },
    { key: 'merchant', header: 'Merchant', render: (r) => [r.displayName, r.merchantType, r.businessShortCode].filter(Boolean).join(' · ') || '—' },
    { key: 'state', header: 'Operational state', render: (r) => <Chip size="small" variant="outlined" label={r.operationalState} /> },
    { key: 'callback', header: 'Callback', render: (r) => r.callbackCapability },
    { key: 'pull', header: 'Pull', render: (r) => r.pullCapability },
    { key: 'blockers', header: 'Blockers', render: (r) => (r.blockers.length ? r.blockers.join(', ') : 'None') },
    { key: 'detail', header: 'Evidence', render: (r) => <button type="button" onClick={() => setExpanded(expanded === rowId(r) ? null : rowId(r))} style={{ background: 'none', border: 0, color: 'inherit', textDecoration: 'underline', cursor: 'pointer' }}>{expanded === rowId(r) ? 'Hide' : 'View'}</button> },
  ];

  const expandedRow = data?.items.find((r) => rowId(r) === expanded);

  return (
    <>
      <PageHeader title="M-PESA integrations" description="Read-only monitor of merchant profile readiness across clients." />
      <Alert severity="info" sx={{ mb: 2 }}>
        &quot;Operational&quot; is derived from stored registration and ingestion evidence. It is not a live Safaricom check, and a registered callback does not prove payments are arriving. Registration and Pull are managed on the backend and cannot be triggered here.
      </Alert>
      <Card sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Select size="small" displayEmpty value={operationalState} onChange={(e) => reset(() => setOperationalState(e.target.value as MpesaOperationalState | ''))} sx={{ minWidth: 190 }} inputProps={{ 'aria-label': 'Operational state' }}>
            <MenuItem value="">Any operational state</MenuItem>
            <MenuItem value="DRAFT">Draft</MenuItem>
            <MenuItem value="NOT_READY">Not ready</MenuItem>
            <MenuItem value="ACTIVE">Active</MenuItem>
            <MenuItem value="SUSPENDED">Suspended</MenuItem>
          </Select>
          <Select size="small" displayEmpty value={callbackCapability} onChange={(e) => reset(() => setCallbackCapability(e.target.value as MpesaCapability | ''))} sx={{ minWidth: 190 }} inputProps={{ 'aria-label': 'Callback capability' }}>
            <MenuItem value="">Any callback capability</MenuItem>
            <MenuItem value="UNKNOWN">Unknown</MenuItem>
            <MenuItem value="NOT_ENABLED">Not enabled</MenuItem>
            <MenuItem value="VERIFIED">Verified</MenuItem>
          </Select>
          <Select size="small" displayEmpty value={pullCapability} onChange={(e) => reset(() => setPullCapability(e.target.value as MpesaCapability | ''))} sx={{ minWidth: 170 }} inputProps={{ 'aria-label': 'Pull capability' }}>
            <MenuItem value="">Any Pull capability</MenuItem>
            <MenuItem value="UNKNOWN">Unknown</MenuItem>
            <MenuItem value="NOT_ENABLED">Not enabled</MenuItem>
            <MenuItem value="VERIFIED">Verified</MenuItem>
          </Select>
        </Stack>
      </Card>
      <Card>
        <DataTable
          columns={columns}
          rows={data?.items}
          rowKey={rowId}
          isLoading={isLoading}
          error={error}
          emptyIcon={Smartphone}
          emptyTitle="No M-PESA profiles"
          emptyDescription="No client has a merchant profile matching these filters."
          renderMobileCard={(r) => (
            <Card variant="outlined" sx={{ p: 2 }}>
              <Typography fontWeight={600}>{r.clientName ?? 'Client'}</Typography>
              <Typography variant="body2" color="text.secondary">
                {[r.displayName, r.businessShortCode].filter(Boolean).join(' · ') || '—'} · {r.operationalState}
              </Typography>
            </Card>
          )}
        />
        <TablePager total={data?.total} limit={data?.limit} page={page} onChange={setPage} />
      </Card>
      {expandedRow ? (
        <Card sx={{ p: 2.5, mt: 2 }}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
            Stored evidence: {expandedRow.clientName ?? 'Client'}
          </Typography>
          <EvidenceView data={expandedRow} />
        </Card>
      ) : null}
    </>
  );
}
