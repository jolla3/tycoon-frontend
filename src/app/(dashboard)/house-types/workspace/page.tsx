'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Card, Stack, Typography, Button, Skeleton, Alert, Table, TableHead, TableRow, TableCell, TableBody, Chip, Box,
} from '@mui/material';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { houseTypesApi } from '@/lib/api/house-types';
import { formatCents, formatMaybeNumber } from '@/lib/formatting/currency';
import { MetricCard } from '@/features/finance/metric-card';
import type { ChargeSlice } from '@/types/financial';
import { ApiError } from '@/lib/api/client';
import { openWorkspace, readWorkspaceId } from '@/lib/navigation/workspace';

export default function HouseTypeWorkspacePage() {
  const router = useRouter();
  const [typeId, setTypeId] = useState('');

  useEffect(() => {
    const id = readWorkspaceId('houseType');
    if (id) setTypeId(id);
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ['house-type-workspace', typeId],
    queryFn: () => houseTypesApi.workspace(typeId),
    enabled: !!typeId,
  });

  if (!typeId) {
    return (
      <Alert severity="info">
        No house type selected.
        <Button component={Link} href="/house-types" size="small" sx={{ ml: 2 }}>
          Back to house types
        </Button>
      </Alert>
    );
  }
  if (isLoading) return <Stack spacing={2}><Skeleton height={48} /><Skeleton height={160} /></Stack>;
  if (error || !data) {
    return (
      <Alert severity="error">
        {error instanceof ApiError ? error.message : 'Unable to load house type workspace.'}
        <Button component={Link} href="/house-types" size="small" sx={{ ml: 2 }}>
          Back
        </Button>
      </Alert>
    );
  }

  const m = data.metrics;
  const ht = data.houseType;

  return (
    <>
      <PageHeader
        title={ht.name}
        description={[ht.description, `Period ${data.period}`, ht.isActive ? 'Active' : 'Inactive'].filter(Boolean).join(' · ')}
        actions={
          <Button component={Link} href="/house-types" startIcon={<ArrowLeft size={16} />} variant="outlined" size="small">
            All house types
          </Button>
        }
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <Kpi label="Houses" value={String(m.houseCount)} />
        <Kpi label="Occupied" value={String(m.occupiedHouses)} />
        <Kpi label="Vacant" value={String(m.vacantHouses)} />
        <Kpi label="Houses with one active tenancy" value={String(m.tenantCount)} />
      </Stack>

      {m.ambiguousCurrentOccupancyHouses > 0 ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {m.ambiguousCurrentOccupancyHouses} house(s) have more than one active tenancy. Their current-tenancy figures are withheld until the occupancy is corrected.
        </Alert>
      ) : null}

      <Typography variant="subtitle2" sx={{ mb: 1 }}>Current tenancies (period {data.period})</Typography>
      <SliceCards slice={m.currentTenancy} rate={m.currentTenancyCollectionRatePercent} />

      <Typography variant="subtitle2" sx={{ mb: 1, mt: 2 }}>Earlier tenancies</Typography>
      <SliceCards slice={m.historicalTenancies} />

      <Typography variant="subtitle2" sx={{ mb: 1, mt: 2 }}>Unattributed legacy charges</Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
        Charges created before tenancies existed. They cannot be assigned to a tenant and are not any current tenant&apos;s debt.
      </Typography>
      <SliceCards slice={m.unattributedLegacy} />

      <Typography variant="subtitle2" sx={{ mb: 1, mt: 2 }}>Orphaned tenancy charges</Typography>
      <SliceCards slice={m.orphanedTenancy} />

      <Typography variant="subtitle2" sx={{ mb: 1, mt: 2 }}>All house history (open charges)</Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
        House-wide history across every tenancy. Not the current occupants&apos; obligation.
      </Typography>
      <SliceCards slice={m.allHouseHistory} rate={m.collectionRatePercent} />

      <Card sx={{ p: 2, mt: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Houses of this type
        </Typography>
        {data.houses.length === 0 ? (
          <Typography color="text.secondary" variant="body2">
            No houses assigned to this type yet.
          </Typography>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>House</TableCell>
                  <TableCell>Current tenant</TableCell>
                  <TableCell align="right">Current billed</TableCell>
                  <TableCell align="right">Current collected</TableCell>
                  <TableCell align="right">Current open</TableCell>
                  <TableCell align="right">Earlier tenancies open</TableCell>
                  <TableCell align="right">Unattributed open</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.houses.map((h) => {
                  const cur = h.currentTenancy;
                  const withheld = h.currentOccupancyConflict;
                  return (
                    <TableRow key={h._id} hover>
                      <TableCell>
                        <Typography fontWeight={600} sx={{ cursor: 'pointer' }} onClick={() => openWorkspace('house', h._id, router)}>
                          {h.houseNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {withheld ? (
                          <Chip size="small" color="warning" label="Multiple active tenancies" />
                        ) : cur?.tenant ? (
                          <Typography sx={{ cursor: 'pointer' }} onClick={() => openWorkspace('tenant', cur.tenant!._id, router)}>
                            {cur.tenant.name}
                          </Typography>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell align="right">{cur && !withheld ? formatCents(cur.financials.billedCents) : '—'}</TableCell>
                      <TableCell align="right">{cur && !withheld ? formatCents(cur.financials.collectedCents) : '—'}</TableCell>
                      <TableCell align="right">{cur && !withheld ? formatCents(cur.financials.outstandingCents) : '—'}</TableCell>
                      <TableCell align="right">{formatCents(h.historicalTenancyFinancials.outstandingCents)}</TableCell>
                      <TableCell align="right">{formatCents(h.unattributedLegacyFinancials.outstandingCents)}</TableCell>
                      <TableCell>
                        <Chip size="small" label={h.status} color={h.status === 'occupied' ? 'success' : 'default'} variant="outlined" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </Card>
    </>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card sx={{ p: 1.5, minWidth: 120, flex: '1 1 120px' }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h6" fontWeight={600}>
        {value}
      </Typography>
    </Card>
  );
}

function SliceCards({ slice, rate }: { slice: ChargeSlice; rate?: number | null }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap" useFlexGap>
      <MetricCard label="Billed" value={formatCents(slice.billedCents)} />
      <MetricCard label="Collected" value={formatCents(slice.collectedCents)} />
      <MetricCard label="Open (unpaid charges)" value={formatCents(slice.outstandingCents)} />
      <MetricCard label="Tenant credit (overpaid)" value={formatCents(slice.overpaidCreditCents)} caveat="Shown separately; not netted against open charges." />
      {rate !== undefined ? <MetricCard label="Collection rate" value={rate === null ? 'Not available' : `${formatMaybeNumber(rate)}%`} /> : null}
    </Stack>
  );
}
