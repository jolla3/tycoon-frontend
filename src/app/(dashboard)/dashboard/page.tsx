'use client';

import Link from 'next/link';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  Button,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Alert,
} from '@mui/material';
import { DashboardHeader } from './components/dashboard-header';
import { reportsApi, type PortfolioDashboard } from '@/lib/api/reports';
import { usePeriod } from '@/features/dashboard/period-context';
import { formatCents, formatMaybeNumber, formatMaybeCents } from '@/lib/formatting/currency';
import { CardSkeleton } from '@/components/feedback/card-skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { FreshnessBadge } from '@/components/data-display/freshness-badge';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { useSession } from '@/features/auth/session-context';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function DashboardPage() {
  const { period } = usePeriod();
  const { user } = useSession();
  const identity = user ? `${user.clientId}:${user.email}` : 'anon';
  const { data, freshness, cachedAt, isLoading, error } = useCachedQuery(
    `${identity}:reports:dashboard:${period.period}`,
    ['reports', 'dashboard', identity, period.period],
    () => reportsApi.dashboard(period.period)
  );

  return (
    <>
      <DashboardHeader />
      {freshness !== 'live' && data ? (
        <Box sx={{ mb: 1.5 }}>
          <FreshnessBadge freshness={freshness} cachedAt={cachedAt} />
        </Box>
      ) : null}
      {error && !data ? <ErrorState error={error} /> : null}
      {isLoading && !data ? (
        <Grid container spacing={2}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <CardSkeleton />
            </Grid>
          ))}
        </Grid>
      ) : null}
      {data ? <DashboardBody data={data} /> : null}
    </>
  );
}

function DashboardBody({ data }: { data: PortfolioDashboard }) {
  const p = data.portfolio;
  const rent = data.rent;
  // Backend-provided rate only. A missing rate is "Not available", never recomputed or zero.
  const collectionRate = typeof rent?.collectionRatePercent === 'number' ? `${rent.collectionRatePercent}%` : 'Not available';

  const kpis: { label: string; value: string; note?: string }[] = [
    { label: 'Estates', value: formatMaybeNumber(p?.estateCount) },
    { label: 'Houses', value: formatMaybeNumber(p?.houseCount ?? data.houses?.total) },
    {
      label: 'Occupied / Vacant',
      value: `${formatMaybeNumber(p?.occupiedHouses ?? data.houses?.occupied)} / ${formatMaybeNumber(p?.vacantHouses ?? data.houses?.vacant)}`,
    },
    {
      label: 'Occupancy',
      value: typeof p?.occupancyRatePercent === 'number' ? `${p.occupancyRatePercent}%` : 'Not available',
    },
    { label: 'Tenants', value: formatMaybeNumber(p?.tenantCount) },
    { label: 'Billed (period)', value: formatMaybeCents(rent?.expectedCents), note: 'Rent charges for the period' },
    { label: 'Collected', value: formatMaybeCents(rent?.collectedCents), note: 'Confirmed payments applied to period charges' },
    { label: 'Open charges (period)', value: formatMaybeCents(rent?.outstandingCents), note: 'Unpaid charges, not tenant balances' },
    { label: 'Collection rate', value: collectionRate },
  ];

  // Chart values come straight from the backend; a slice with no figure is omitted rather than plotted as zero.
  const estateChart = (data.byEstate ?? []).flatMap((e) =>
    typeof e.billedCents === 'number' && typeof e.collectedCents === 'number'
      ? [{ name: e.name.length > 14 ? `${e.name.slice(0, 12)}…` : e.name, Billed: Math.round(e.billedCents / 100), Collected: Math.round(e.collectedCents / 100) }]
      : []
  );

  const typeChart = (data.byHouseType ?? []).map((e) => ({
    name: e.name.length > 14 ? `${e.name.slice(0, 12)}…` : e.name,
    Houses: e.houses,
    Occupied: e.occupied,
  }));

  return (
    <Stack spacing={2}>
      <Grid container spacing={2}>
        {kpis.map((c) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={c.label}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  {c.label}
                </Typography>
                <Typography variant="h6" sx={{ fontFamily: '"IBM Plex Mono", monospace', mt: 0.5 }}>
                  {c.value}
                </Typography>
                {c.note ? <Typography variant="caption" color="text.secondary">{c.note}</Typography> : null}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {(data.alerts?.length ?? 0) > 0 ? (
        <Card sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Needs attention
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {data.alerts!.map((a) => (
              <Button
                key={a.kind}
                component={Link}
                href={a.href}
                size="small"
                variant="outlined"
                color={a.kind === 'arrears' || a.kind === 'sms_failed' ? 'warning' : 'primary'}
              >
                {a.label}
              </Button>
            ))}
          </Stack>
        </Card>
      ) : (
        <Alert severity="success">No operational alerts for your current scope.</Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2, height: 320 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Billed vs collected by estate (KES)
            </Typography>
            {estateChart.length === 0 ? (
              <Typography color="text.secondary" variant="body2">
                No estate billing data for this period.
              </Typography>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={estateChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Billed" fill="#64748b" />
                  <Bar dataKey="Collected" fill="#16a34a" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2, height: 320 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Houses by type (occupancy)
            </Typography>
            {typeChart.length === 0 ? (
              <Typography color="text.secondary" variant="body2">
                No house type data yet.
              </Typography>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={typeChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Houses" fill="#94a3b8" />
                  <Bar dataKey="Occupied" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="subtitle2">Recent payments</Typography>
              <Button component={Link} href="/payments" size="small">
                View all
              </Button>
            </Stack>
            {(data.recentPayments?.length ?? 0) === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No confirmed payments yet.
              </Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Reference</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.recentPayments!.map((pay) => (
                    <TableRow key={String(pay._id)}>
                      <TableCell>
                        {pay.paymentDate ? new Date(pay.paymentDate).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell>{pay.paymentReference || pay.period || '—'}</TableCell>
                      <TableCell align="right">{formatCents(pay.amountCents)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Portfolio snapshot
            </Typography>
            <Stack spacing={1}>
              <Row label="House types" value={formatMaybeNumber(p?.houseTypeCount)} />
              <Row label="Unclassified houses" value={formatMaybeNumber(p?.unclassifiedHouses)} />
              <Row
                label="Paid / partial / unpaid charges"
                value={`${formatMaybeNumber(data.status?.paid)} / ${formatMaybeNumber(data.status?.partial)} / ${formatMaybeNumber(data.status?.unpaid)}`}
              />
              <Row label="Unmatched bank txns (period)" value={formatMaybeNumber(data.bank?.unmatched)} />
              <Row label="SMS failed" value={formatMaybeNumber(data.sms?.failed)} />
              <Stack direction="row" spacing={1} sx={{ pt: 1 }}>
                <Chip size="small" component={Link} href="/reports" clickable label="Open reports" />
                <Chip size="small" component={Link} href="/estates" clickable label="Estates" />
                <Chip size="small" component={Link} href="/house-types" clickable label="House types" />
              </Stack>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between">
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600}>
        {value}
      </Typography>
    </Stack>
  );
}
