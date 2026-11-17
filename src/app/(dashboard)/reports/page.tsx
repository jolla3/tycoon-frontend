'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  Grid,
  Typography,
  Box,
  Stack,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Tabs,
  Tab,
} from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { PageHeader } from '@/components/layout/page-header';
import { PeriodSelector } from '@/components/ui/period-selector';
import { CardSkeleton } from '@/components/feedback/card-skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { FreshnessBadge } from '@/components/data-display/freshness-badge';
import { reportsApi, type ManagementReport } from '@/lib/api/reports';
import { usePeriod } from '@/features/dashboard/period-context';
import { formatCents, formatNumber, formatMaybeNumber, formatMaybeCents } from '@/lib/formatting/currency';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { useSession } from '@/features/auth/session-context';
import { identityKeyFromUser } from '@/lib/session/local-session-marker';
import { readListScopeEstate, setListScopeEstate } from '@/lib/navigation/workspace';

const STATUS_COLORS = { paid: '#22C55E', partial: '#F59E0B', unpaid: '#EF4444' };

export default function ReportsPage() {
  const { period } = usePeriod();
  const { user } = useSession();
  const identity = user ? identityKeyFromUser(user) : 'anon';
  const [estateScope, setEstateScope] = useState<string | null>(null);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    setEstateScope(readListScopeEstate());
  }, []);

  const report = useCachedQuery(
    `${identity}:reports:management:${period.period}`,
    ['reports', 'management', identity, period.period],
    () => reportsApi.management(period.period)
  );

  const data = report.data as ManagementReport | undefined;
  const arrearsRows = useMemo(
    () =>
      (data?.arrears ?? []).filter((row) =>
        estateScope ? String(row.estateId) === estateScope : true
      ),
    [data?.arrears, estateScope]
  );

  // Billed-vs-paid figures come from the backend as-is. A missing figure stays missing.
  const bvp = data?.billedVsPaid;
  const total = bvp?.total;
  const billed = total?.billedCents;
  const paid = total?.paidCents;
  const outstanding = total?.balanceCents;
  const prevArrears = bvp?.previousArrearsCents;
  const statusSlices = [
    { name: 'Paid', value: data?.status?.paid, color: STATUS_COLORS.paid },
    { name: 'Partial', value: data?.status?.partial, color: STATUS_COLORS.partial },
    { name: 'Unpaid', value: data?.status?.unpaid, color: STATUS_COLORS.unpaid },
  ].flatMap((x) => (typeof x.value === 'number' ? [{ name: x.name, value: x.value, color: x.color }] : []));
  const collectionRate = typeof data?.rent?.collectionRatePercent === 'number' ? data.rent.collectionRatePercent : null;

  return (
    <>
      <PageHeader
        title="Reports"
        description="Management reporting — portfolio, revenue, arrears, occupancy, banking, SMS"
        actions={
          <Stack direction="row" spacing={1} alignItems="center">
            {estateScope ? (
              <Chip
                size="small"
                label="Arrears list filtered to one estate"
                onDelete={() => {
                  setListScopeEstate(null);
                  setEstateScope(null);
                }}
              />
            ) : null}
            <PeriodSelector />
          </Stack>
        }
      />

      {report.freshness !== 'live' && data ? (
        <Box sx={{ mb: 1.5 }}>
          <FreshnessBadge freshness={report.freshness} cachedAt={report.cachedAt} />
        </Box>
      ) : null}
      {report.error && !data ? <ErrorState error={report.error} /> : null}
      {report.isLoading && !data ? <CardSkeleton lines={8} /> : null}

      {data ? (
        <>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Kpi label="Estates" value={formatMaybeNumber(data.portfolio?.estateCount)} />
            <Kpi label="Houses" value={formatMaybeNumber(data.portfolio?.houseCount)} />
            <Kpi
              label="Occupancy"
              value={
                data.portfolio?.occupancyRatePercent != null
                  ? `${data.portfolio.occupancyRatePercent}%`
                  : '—'
              }
            />
            <Kpi label="Tenants" value={formatMaybeNumber(data.portfolio?.tenantCount)} />
            <Kpi label="Billed (period charges)" value={formatMaybeCents(billed)} />
            <Kpi label="Collected (period charges)" value={formatMaybeCents(paid)} />
            <Kpi label="Open charges (period)" value={formatMaybeCents(outstanding)} />
            <Kpi label="Collection rate" value={collectionRate != null ? `${collectionRate}%` : 'Not available'} />
            <Kpi label="Charges from earlier periods (open)" value={formatMaybeCents(prevArrears)} />
            <Kpi label="Unmatched bank (all time)" value={formatMaybeNumber(data.bank?.unmatchedAllTime)} />
          </Grid>

          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} variant="scrollable">
            <Tab label="Revenue" />
            <Tab label="Arrears" />
            <Tab label="Occupancy" />
            <Tab label="Banking / SMS" />
          </Tabs>

          {tab === 0 && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={5}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>
                      Charge status — {period.label}
                    </Typography>
                    {statusSlices.length === 0 ? <Typography variant="body2" color="text.secondary">Charge status counts are not available.</Typography> : (
                    <Box sx={{ height: 260 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusSlices}
                            dataKey="value"
                            nameKey="name"
                            outerRadius={90}
                            label
                          >
                            {statusSlices.map((slice) => (
                              <Cell key={slice.name} fill={slice.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={7}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>
                      Billed vs collected by estate (KES)
                    </Typography>
                    <Box sx={{ height: 260 }}>
                      {(data.byEstate?.length ?? 0) === 0 ? (
                        <Typography color="text.secondary" variant="body2">
                          No estate data for this period.
                        </Typography>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={(data.byEstate ?? []).map((e) => ({
                              name: e.name.length > 12 ? `${e.name.slice(0, 10)}…` : e.name,
                              Billed: Math.round(e.billedCents / 100),
                              Collected: Math.round(e.collectedCents / 100),
                            }))}
                          >
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
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>
                      House type comparison
                    </Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Type</TableCell>
                          <TableCell align="right">Houses</TableCell>
                          <TableCell align="right">Occupied</TableCell>
                          <TableCell align="right">Billed</TableCell>
                          <TableCell align="right">Collected</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(data.byHouseType ?? []).map((r) => (
                          <TableRow key={r.name}>
                            <TableCell>{r.name}</TableCell>
                            <TableCell align="right">{r.houses}</TableCell>
                            <TableCell align="right">{r.occupied}</TableCell>
                            <TableCell align="right">{formatCents(r.billedCents)}</TableCell>
                            <TableCell align="right">{formatCents(r.collectedCents)}</TableCell>
                          </TableRow>
                        ))}
                        {(data.byHouseType?.length ?? 0) === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5}>
                              <Typography color="text.secondary" variant="body2">
                                No house type metrics.
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {tab === 1 && (
            <Card>
              <CardContent>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  Open charge balances (RentCharge) — {arrearsRows.length} rows
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  Charge-level open balances from rent charge records. They are not ledger-authoritative tenant arrears, do not net tenant credit, and may include charges from earlier tenancies. Open a tenant workspace for the tenant&apos;s own figures.
                </Typography>
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Tenant</TableCell>
                        <TableCell>House</TableCell>
                        <TableCell>Period</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell align="right">Due</TableCell>
                        <TableCell align="right">Paid</TableCell>
                        <TableCell align="right">Balance</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {arrearsRows.slice(0, 100).map((row, i) => (
                        <TableRow key={`${row.houseId}-${row.period}-${row.chargeType}-${i}`}>
                          <TableCell>{row.tenant || '—'}</TableCell>
                          <TableCell>{row.house || '—'}</TableCell>
                          <TableCell>{row.period}</TableCell>
                          <TableCell>{row.chargeType || 'RENT'}</TableCell>
                          <TableCell align="right">{formatMaybeCents(row.dueCents)}</TableCell>
                          <TableCell align="right">{formatMaybeCents(row.paidCents)}</TableCell>
                          <TableCell align="right">{formatMaybeCents(row.balanceCents)}</TableCell>
                          <TableCell>
                            <Chip size="small" label={row.status} variant="outlined" />
                          </TableCell>
                        </TableRow>
                      ))}
                      {arrearsRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8}>
                            <Typography color="text.secondary" variant="body2">
                              No open charge balances.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </Box>
              </CardContent>
            </Card>
          )}

          {tab === 2 && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card sx={{ p: 2 }}>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    Occupancy by estate
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Estate</TableCell>
                        <TableCell align="right">Houses</TableCell>
                        <TableCell align="right">Occupied</TableCell>
                        <TableCell align="right">Vacant</TableCell>
                        <TableCell align="right">Tenants</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(data.byEstate ?? []).map((e) => (
                        <TableRow key={String(e.estateId)}>
                          <TableCell>{e.name}</TableCell>
                          <TableCell align="right">{e.houses}</TableCell>
                          <TableCell align="right">{e.occupied}</TableCell>
                          <TableCell align="right">{e.vacant}</TableCell>
                          <TableCell align="right">{formatMaybeNumber(e.tenants)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card sx={{ p: 2 }}>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    Occupancy by house type
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Type</TableCell>
                        <TableCell align="right">Houses</TableCell>
                        <TableCell align="right">Occupied</TableCell>
                        <TableCell align="right">Vacant</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(data.byHouseType ?? []).map((e) => (
                        <TableRow key={e.name}>
                          <TableCell>{e.name}</TableCell>
                          <TableCell align="right">{e.houses}</TableCell>
                          <TableCell align="right">{e.occupied}</TableCell>
                          <TableCell align="right">{e.vacant}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </Grid>
            </Grid>
          )}

          {tab === 3 && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card sx={{ p: 2 }}>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    Banking — period {period.label}
                  </Typography>
                  <Stack spacing={1}>
                    <Row label="Credits" value={formatMaybeCents(data.bank?.creditsCents)} />
                    <Row label="Debits" value={formatMaybeCents(data.bank?.debitsCents)} />
                    <Row label="Matched (period)" value={formatMaybeNumber(data.bank?.matched)} />
                    <Row label="Unmatched (period)" value={formatMaybeNumber(data.bank?.unmatched)} />
                    <Row label="Unmatched (all time)" value={formatMaybeNumber(data.bank?.unmatchedAllTime)} />
                  </Stack>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card sx={{ p: 2 }}>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    SMS activity
                  </Typography>
                  <Stack spacing={1}>
                    <Row label="Sent" value={formatMaybeNumber(data.sms?.sent)} />
                    <Row label="Failed" value={formatMaybeNumber(data.sms?.failed)} />
                    <Row label="Pending / queued" value={formatMaybeNumber(data.sms?.pending)} />
                    <Row label="Unknown" value={formatMaybeNumber(data.sms?.unknown)} />
                  </Stack>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    Counts reflect stored message records, not fabricated delivery rates.
                  </Typography>
                </Card>
              </Grid>
            </Grid>
          )}
        </>
      ) : null}
    </>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Grid item xs={6} sm={4} md={2.4}>
      <Card>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
          <Typography fontWeight={700} sx={{ fontFamily: '"IBM Plex Mono", monospace' }}>
            {value}
          </Typography>
        </CardContent>
      </Card>
    </Grid>
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
