'use client';

// Operator panel for a tenant's personal M-PESA submission link.
//
// The link token is returned exactly once by the issue call. It is kept only in
// this component's state, shown with a copy button, and discarded when the
// operator dismisses it or leaves the page. It is never written to storage, the
// query cache or the URL. Inspecting a link returns metadata only; a lost token
// cannot be recovered, only rotated.
//
// "Operational" comes from the backend (ACTIVE link and exactly one ACTIVE Till
// on the estate). A link that is not operational is never presented as ready.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Card, Chip, Skeleton, Stack, TextField, Typography } from '@mui/material';
import { mpesaCollectionApi, buildPayLink, type MpesaLink } from '@/lib/api/mpesa-collection';
import { ApiError } from '@/lib/api/client';
import { ProductEntitlementBlocked, isProductNotEntitled } from '@/components/feedback/product-entitlement-blocked';
import { dateFormat } from '@/lib/dates/period';
import { mpesaKeys } from '@/lib/query/keys';
import { useSession } from '@/features/auth/session-context';
import { permissions } from '@/lib/permissions/permissions';
import { useConnectivity } from '@/lib/sync/connectivity';

function statusChip(link: MpesaLink | null) {
  if (!link) return <Chip size="small" label="No link" variant="outlined" />;
  if (link.status === 'REVOKED') return <Chip size="small" label="Revoked" color="default" />;
  if (!link.operational) return <Chip size="small" label="Active, not usable yet" color="warning" />;
  return <Chip size="small" label="Active" color="success" />;
}

export function TenantMpesaLinkPanel({ tenantId }: { tenantId: string }) {
  const { user } = useSession();
  const canManage = user ? permissions.canManageTenants(user.role) : false;
  const c = useConnectivity();
  const canReach = c.state === 'online' || c.state === 'syncing' || c.state === 'sync-error';
  const qc = useQueryClient();
  const [issued, setIssued] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: mpesaKeys.link(tenantId),
    queryFn: () => mpesaCollectionApi.inspectLink(tenantId),
    enabled: canManage,
    retry: false,
  });

  const fail = (e: unknown) => setErr(e instanceof ApiError ? e.message : 'The action failed. Nothing was changed unless the server confirmed it.');

  const issue = useMutation({
    mutationFn: () => mpesaCollectionApi.issueLink(tenantId),
    onSuccess: (res) => {
      setErr(null);
      setMsg(null);
      setCopied(false);
      setIssued(res.token);
      qc.invalidateQueries({ queryKey: mpesaKeys.link(tenantId) });
    },
    onError: fail,
  });
  const revoke = useMutation({
    mutationFn: () => mpesaCollectionApi.revokeLink(tenantId),
    onSuccess: () => {
      setErr(null);
      setIssued(null);
      setMsg('Link revoked. The tenant can no longer use it.');
      qc.invalidateQueries({ queryKey: mpesaKeys.link(tenantId) });
    },
    onError: fail,
  });

  if (!canManage) return <Alert severity="info">Only owners and administrators can manage M-PESA links.</Alert>;
  if (isLoading) return <Skeleton height={120} />;
  if (isProductNotEntitled(error)) return <ProductEntitlementBlocked error={error} fallbackProduct="MPESA" />;
  if (error) return <Alert severity="error">{error instanceof ApiError ? error.message : 'Unable to load the link status.'}</Alert>;

  const link = data?.link ?? null;
  const busy = issue.isPending || revoke.isPending;
  const hasActive = link?.status === 'ACTIVE';
  const fullLink = issued && typeof window !== 'undefined' ? buildPayLink(window.location.origin, issued) : null;

  async function copy() {
    if (!fullLink) return;
    try {
      await navigator.clipboard.writeText(fullLink);
      setCopied(true);
    } catch {
      setCopied(false);
      setErr('Copy failed. Select the link and copy it manually.');
    }
  }

  return (
    <Card sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="subtitle1">M-PESA submission link</Typography>
        {statusChip(link)}
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Give this tenant a personal link where they paste their M-PESA confirmation message. A submitted message is evidence for review; it is not a payment until the server verifies it.
      </Typography>

      {link ? (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
          Version {link.version}
          {link.rotatedAt ? ` · rotated ${dateFormat(link.rotatedAt, 'DD MMM YYYY, HH:mm')}` : ''}
          {link.revokedAt ? ` · revoked ${dateFormat(link.revokedAt, 'DD MMM YYYY, HH:mm')}` : ''}
        </Typography>
      ) : null}

      {hasActive && !link?.operational ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          The link exists but the tenant cannot use it yet. The estate needs exactly one active M-PESA Till. Ask the platform administrator to complete the setup.
        </Alert>
      ) : null}
      {msg ? <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg(null)}>{msg}</Alert> : null}
      {err ? <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr(null)}>{err}</Alert> : null}
      {!canReach ? <Alert severity="info" sx={{ mb: 2 }}>These actions need a connection and are never saved for later.</Alert> : null}

      {fullLink ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Copy this link now. It is shown once and cannot be retrieved again. Anyone with it can send messages for this tenant.
          </Typography>
          <TextField size="small" fullWidth value={fullLink} InputProps={{ readOnly: true }} onFocus={(e) => e.target.select()} />
          <Box sx={{ mt: 1 }}>
            <Button size="small" variant="contained" onClick={copy}>{copied ? 'Copied' : 'Copy link'}</Button>
            <Button size="small" sx={{ ml: 1 }} onClick={() => { setIssued(null); setCopied(false); }}>I have copied it</Button>
          </Box>
        </Alert>
      ) : null}

      <Stack direction="row" spacing={1}>
        <Button
          variant="outlined"
          disabled={!canReach || busy}
          onClick={() => {
            if (hasActive && !window.confirm('Rotate this link? The current link stops working immediately and the tenant needs the new one.')) return;
            issue.mutate();
          }}
        >
          {issue.isPending ? 'Working…' : hasActive ? 'Rotate link' : link ? 'Issue new link' : 'Create link'}
        </Button>
        {hasActive ? (
          <Button
            color="warning"
            disabled={!canReach || busy}
            onClick={() => { if (window.confirm('Revoke this link? The tenant will no longer be able to submit messages with it.')) revoke.mutate(); }}
          >
            {revoke.isPending ? 'Revoking…' : 'Revoke'}
          </Button>
        ) : null}
      </Stack>
    </Card>
  );
}
