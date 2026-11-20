'use client';

// Operator view of a tenant's PayBill account numbers, one block per EXACT tenancy.
// There is no "current"/"latest" default: every reference is shown under the tenancy it belongs
// to, retired references are visibly separated and never offered for copying as instructions.
// Eligibility to issue comes from the server (`canIssue`); the browser never infers it.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Card, Chip, Skeleton, Stack, Typography } from '@mui/material';
import { mpesaCollectionApi, type TenantReferenceMerchant, type TenantReferenceTenancy } from '@/lib/api/mpesa-collection';
import { ApiError } from '@/lib/api/client';
import { ProductEntitlementBlocked, isProductNotEntitled } from '@/components/feedback/product-entitlement-blocked';
import { dateFormat } from '@/lib/dates/period';
import { mpesaKeys } from '@/lib/query/keys';
import { useSession } from '@/features/auth/session-context';
import { permissions } from '@/lib/permissions/permissions';
import { useConnectivity } from '@/lib/sync/connectivity';
import { paymentInstruction, referenceState, STATE_NOTE } from './reference-view';

function MerchantBlock({ tenantId, tenancy, m, canManage, canReach }: {
  tenantId: string; tenancy: TenantReferenceTenancy; m: TenantReferenceMerchant; canManage: boolean; canReach: boolean;
}) {
  const qc = useQueryClient();
  const [copied, setCopied] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const state = referenceState(m, tenancy);
  const issue = useMutation({
    mutationFn: () => mpesaCollectionApi.issueReference(tenantId, { tenancyId: tenancy.tenancyId, merchantProfileId: m.merchantProfileId }),
    onSuccess: () => { setErr(null); qc.invalidateQueries({ queryKey: mpesaKeys.referencesFamily() }); },
    onError: (e) => setErr(e instanceof ApiError ? e.message : 'Could not issue the reference. Nothing changed unless the server confirmed it.'),
  });

  async function copy(key: string, text: string) {
    try { await navigator.clipboard.writeText(text); setCopied(key); } catch { setCopied(null); setErr('Copy failed. Select the text and copy it manually.'); }
  }
  const instruction = paymentInstruction(m);

  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
      <Typography variant="body2" fontWeight={600}>
        PayBill {m.businessShortCode}{m.displayName ? ` · ${m.displayName}` : ''}
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>{STATE_NOTE[state]}</Typography>
      {err ? <Alert severity="error" sx={{ mb: 1 }} onClose={() => setErr(null)}>{err}</Alert> : null}

      {m.active ? (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
          <Typography component="code" sx={{ fontFamily: 'monospace', fontSize: 20, letterSpacing: 1, wordBreak: 'break-all' }} aria-label={`Account number ${m.active.reference}`}>
            {m.active.display}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="contained" onClick={() => copy('ref', m.active!.reference)}>{copied === 'ref' ? 'Copied' : 'Copy account number'}</Button>
            {instruction ? <Button size="small" onClick={() => copy('ins', instruction)}>{copied === 'ins' ? 'Copied' : 'Copy instructions'}</Button> : null}
          </Stack>
        </Stack>
      ) : null}

      {m.canIssue && canManage ? (
        <Button size="small" variant="outlined" disabled={!canReach || issue.isPending} onClick={() => issue.mutate()}>
          {issue.isPending ? 'Issuing…' : 'Issue account number'}
        </Button>
      ) : null}

      {m.retiredCount > 0 ? (
        <Box sx={{ mt: 1.5 }}>
          <Chip size="small" label={`Retired (${m.retiredCount})`} sx={{ mb: 0.5 }} />
          <Stack spacing={0.25}>
            {m.retired.map((r) => (
              <Typography key={r.id} variant="caption" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
                {r.display}{r.retiredAt ? ` · retired ${dateFormat(r.retiredAt, 'DD MMM YYYY')}` : ''}{r.retiredReason ? ` · ${r.retiredReason.toLowerCase().replace(/_/g, ' ')}` : ''}
              </Typography>
            ))}
            {m.retiredCount > m.retired.length ? <Typography variant="caption" color="text.secondary">…and {m.retiredCount - m.retired.length} older</Typography> : null}
          </Stack>
          <Typography variant="caption" color="text.secondary" display="block">Payments sent to a retired number are held for review, never posted automatically.</Typography>
        </Box>
      ) : null}
    </Box>
  );
}

export function TenantReferencePanel({ tenantId }: { tenantId: string }) {
  const { user } = useSession();
  const canManage = user ? permissions.canManageTenants(user.role) : false;
  const c = useConnectivity();
  const canReach = c.state === 'online' || c.state === 'syncing' || c.state === 'sync-error';
  const [page, setPage] = useState(1);
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: mpesaKeys.references(tenantId, page),
    queryFn: () => mpesaCollectionApi.references(tenantId, { page, limit: 5 }),
    placeholderData: (prev) => prev,
    staleTime: 0,
    gcTime: 0, // account numbers are not kept in the client cache after leaving the screen
    retry: false,
  });

  if (isLoading) return <Skeleton height={120} />;
  if (isProductNotEntitled(error)) return <ProductEntitlementBlocked error={error} fallbackProduct="MPESA" />;
  if (error) return <Alert severity="error">{error instanceof ApiError ? error.message : 'Unable to load PayBill account numbers.'}</Alert>;
  const tenancies = data?.tenancies ?? [];
  const withMerchants = tenancies.filter((t) => t.merchants.length > 0);

  return (
    <Card sx={{ p: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 0.5 }}>PayBill account numbers</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Each tenancy has its own account number. A tenant pays the PayBill business number with the account number of the tenancy they are paying for. Routing a payment to a tenancy is not posting it; posting stays disabled until the provider receipt identity is proven.
      </Typography>
      {tenancies.length === 0 ? <Alert severity="info">This tenant has no tenancies.</Alert> : null}
      {tenancies.length > 0 && withMerchants.length === 0 ? (
        <Alert severity="info">No PayBill is mapped to the estates of this tenant&apos;s tenancies. Ask the platform administrator to map one.</Alert>
      ) : null}
      <Stack spacing={2}>
        {tenancies.map((t) => (
          <Box key={t.tenancyId}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }} flexWrap="wrap">
              <Typography variant="body2" fontWeight={600}>House {t.houseNumber ?? '—'}</Typography>
              <Chip size="small" label={t.status === 'ACTIVE' ? 'Active tenancy' : 'Closed tenancy'} color={t.status === 'ACTIVE' ? 'success' : 'default'} />
              <Typography variant="caption" color="text.secondary">
                {t.startAt ? dateFormat(t.startAt, 'DD MMM YYYY') : '—'} → {t.endAt ? dateFormat(t.endAt, 'DD MMM YYYY') : 'present'}
              </Typography>
            </Stack>
            <Stack spacing={1}>
              {t.merchants.map((m) => (
                <MerchantBlock key={m.merchantProfileId} tenantId={tenantId} tenancy={t} m={m} canManage={canManage} canReach={canReach} />
              ))}
            </Stack>
          </Box>
        ))}
      </Stack>
      {data && data.total > data.limit ? (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
          <Button size="small" disabled={page <= 1 || isFetching} onClick={() => setPage((p) => p - 1)}>Newer</Button>
          <Typography variant="caption" color="text.secondary">Page {data.page} · {data.total} tenancies</Typography>
          <Button size="small" disabled={!data.hasMore || isFetching} onClick={() => setPage((p) => p + 1)}>Older</Button>
        </Stack>
      ) : null}
    </Card>
  );
}
