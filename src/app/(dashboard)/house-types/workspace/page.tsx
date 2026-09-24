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
import { formatCents, formatAmount } from '@/lib/formatting/currency';
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
        <Kpi label="Occupancy" value={m.occupancyRatePercent != null ? `${m.occupancyRatePercent}%` : '—'} />
        <Kpi label="Tenants" value={String(m.tenantCount)} />
        <Kpi label="Billed" value={formatCents(m.billedCents)} />
        <Kpi label="Collected" value={formatCents(m.collectedCents)} />
        <Kpi label="Outstanding" value={formatCents(m.outstandingCents)} />
        <Kpi label="Collection rate" value={m.collectionRatePercent != null ? `${m.collectionRatePercent}%` : '—'} />
      </Stack>

      <Card sx={{ p: 2 }}>
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
                  <TableCell>Tenant</TableCell>
                  <TableCell align="right">Listed rent</TableCell>
                  <TableCell align="right">Billed</TableCell>
                  <TableCell align="right">Paid</TableCell>
                  <TableCell align="right">Outstanding</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.houses.map((h) => (
                  <TableRow key={h._id} hover>
                    <TableCell>
                      <Typography
                        fontWeight={600}
                        sx={{ cursor: 'pointer' }}
                        onClick={() => openWorkspace('house', h._id, router)}
                      >
                        {h.houseNumber}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {h.tenant ? (
                        <Typography
                          sx={{ cursor: 'pointer' }}
                          onClick={() => openWorkspace('tenant', h.tenant!._id, router)}
                        >
                          {h.tenant.name}
                        </Typography>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell align="right">{formatAmount(h.monthlyRent)}</TableCell>
                    <TableCell align="right">{formatCents(h.periodBilledCents)}</TableCell>
                    <TableCell align="right">{formatCents(h.periodPaidCents)}</TableCell>
                    <TableCell align="right">{formatCents(h.periodOutstandingCents)}</TableCell>
                    <TableCell>
                      <Chip size="small" label={h.status} color={h.status === 'occupied' ? 'success' : 'default'} variant="outlined" />
                    </TableCell>
                  </TableRow>
                ))}
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
