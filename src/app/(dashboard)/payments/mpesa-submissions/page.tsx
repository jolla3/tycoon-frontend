'use client';

// Review queue for tenant-submitted M-PESA messages that could not be matched
// automatically. Operators can only REJECT with a documented reason or ask the
// server to RETRY_MATCH. There is no approve / force-match action: the backend
// does not offer one, and a submission never becomes a payment from this screen.
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Select, Stack, TextField, Typography } from '@mui/material';
import { Inbox } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { CardSkeleton } from '@/components/feedback/card-skeleton';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { ProductEntitlementBlocked, isProductNotEntitled } from '@/components/feedback/product-entitlement-blocked';
import { mpesaCollectionApi, REVIEW_REASON_CODES, type MpesaSubmission, type ReviewAction, type ReviewReasonCode, type SubmissionState } from '@/lib/api/mpesa-collection';
import { tenantsApi } from '@/lib/api/tenants';
import { ApiError } from '@/lib/api/client';
import { formatMaybeCents } from '@/lib/formatting/currency';
import { dateFormat } from '@/lib/dates/period';
import { useVisibleEstates } from '@/features/estates/use-visible-estates';
import { useSession } from '@/features/auth/session-context';
import { permissions } from '@/lib/permissions/permissions';
import { useConnectivity } from '@/lib/sync/connectivity';
import { estateKeys, mpesaKeys } from '@/lib/query/keys';

const REVIEWABLE: SubmissionState[] = ['UNSUPPORTED', 'UNMATCHED', 'CONFLICTING', 'MANUAL_REVIEW'];

const STATE_COPY: Record<SubmissionState, string> = {
  RECEIVED: 'Received',
  UNSUPPORTED: 'Unsupported format',
  PARSED: 'Parsed, awaiting match',
  UNMATCHED: 'No matching payment found',
  MATCHED: 'Matched',
  CONFLICTING: 'Conflicting evidence',
  MANUAL_REVIEW: 'Needs manual review',
  POSTED: 'Posted',
  REJECTED: 'Rejected',
};

const REASON_COPY: Record<ReviewReasonCode, string> = {
  DUPLICATE: 'Duplicate of another message',
  WRONG_TENANT: 'Sent by or for the wrong tenant',
  NOT_A_RENT_PAYMENT: 'Not a rent payment',
  UNREADABLE: 'Unreadable message',
  OTHER_DOCUMENTED: 'Other (documented elsewhere)',
};

export default function MpesaSubmissionsPage() {
  const { user } = useSession();
  const { estates } = useVisibleEstates();
  const canManage = user ? permissions.canManageTenants(user.role) && user.role !== 'SUPER_ADMIN' : false;
  const [estateId, setEstateId] = useState('');
  const [state, setState] = useState<'' | SubmissionState>('');

  const { data, isLoading, error } = useQuery({
    queryKey: mpesaKeys.submissions(undefined, { estateId, state }),
    queryFn: () => mpesaCollectionApi.listSubmissions({ estateId: estateId || undefined, state: state || undefined, limit: 100 }),
    enabled: canManage,
    retry: false,
  });
  const { data: tenants } = useQuery({
    queryKey: estateKeys.tenants(estateId || undefined, { purpose: 'names' }),
    queryFn: () => tenantsApi.list({ estateId: estateId || undefined }),
    enabled: canManage,
  });
  const tenantName = useMemo(() => new Map((tenants ?? []).map((t) => [t._id, t.name])), [tenants]);

  if (!canManage) {
    return (
      <>
        <PageHeader title="M-PESA submissions" description="Tenant-submitted M-PESA messages awaiting review" />
        <Alert severity="info">Only owners and administrators can review M-PESA submissions.</Alert>
      </>
    );
  }
  if (isProductNotEntitled(error)) {
    return (
      <>
        <PageHeader title="M-PESA submissions" description="Tenant-submitted M-PESA messages awaiting review" />
        <ProductEntitlementBlocked error={error} fallbackProduct="MPESA" />
      </>
    );
  }

  const rows = data?.submissions ?? [];

  return (
    <>
      <PageHeader title="M-PESA submissions" description="Messages tenants pasted that need a decision. A submission is evidence, not a payment." />
      <Card sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Select size="small" displayEmpty value={estateId} onChange={(e) => setEstateId(e.target.value)} sx={{ minWidth: 180 }}>
            <MenuItem value="">All estates</MenuItem>
            {estates?.map((e) => <MenuItem key={e._id} value={e._id}>{e.name}</MenuItem>)}
          </Select>
          <Select size="small" displayEmpty value={state} onChange={(e) => setState(e.target.value as '' | SubmissionState)} sx={{ minWidth: 200 }}>
            <MenuItem value="">Needs review</MenuItem>
            {(Object.keys(STATE_COPY) as SubmissionState[]).map((s) => <MenuItem key={s} value={s}>{STATE_COPY[s]}</MenuItem>)}
          </Select>
        </Stack>
      </Card>

      {isLoading ? <CardSkeleton lines={3} /> : null}
      {error && !data ? <ErrorState error={error} /> : null}
      {!isLoading && !error && rows.length === 0 ? (
        <Card sx={{ p: 2 }}><EmptyState icon={Inbox} title="Nothing to review" description="No submissions match this view." /></Card>
      ) : null}
      <Stack spacing={1.5}>
        {rows.map((s) => (
          <SubmissionCard key={s._id} submission={s} tenant={tenantName.get(s.tenantId)} estate={estates?.find((e) => e._id === s.estateId)?.name} reviewable={REVIEWABLE.includes(s.state)} />
        ))}
      </Stack>
    </>
  );
}

function SubmissionCard({ submission: s, tenant, estate, reviewable }: { submission: MpesaSubmission; tenant?: string; estate?: string; reviewable: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Card sx={{ p: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
        <div>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography fontWeight={600}>{tenant ?? 'Unknown tenant'}</Typography>
            <Chip size="small" variant="outlined" label={STATE_COPY[s.state]} color={s.state === 'POSTED' || s.state === 'MATCHED' ? 'success' : s.state === 'REJECTED' ? 'default' : 'warning'} />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {estate ?? 'Estate'} · {dateFormat(s.createdAt, 'DD MMM YYYY, HH:mm')}
          </Typography>
          <Typography variant="body2">
            Claimed amount (unverified): {formatMaybeCents(s.amountCents)} · Receipt: {s.receiptNumber ?? 'not found in message'}
          </Typography>
          {s.stateReason ? <Typography variant="caption" color="text.secondary">Reason: {s.stateReason}</Typography> : null}
        </div>
        {reviewable ? <Button variant="outlined" size="small" onClick={() => setOpen(true)}>Review</Button> : null}
      </Stack>
      {open ? <ResolveDialog submission={s} onClose={() => setOpen(false)} /> : null}
    </Card>
  );
}

function ResolveDialog({ submission, onClose }: { submission: MpesaSubmission; onClose: () => void }) {
  const qc = useQueryClient();
  const c = useConnectivity();
  const canReach = c.state === 'online' || c.state === 'syncing' || c.state === 'sync-error';
  const [action, setAction] = useState<ReviewAction>('REJECT');
  const [reasonCode, setReasonCode] = useState<ReviewReasonCode>('UNREADABLE');
  const [error, setError] = useState<string | null>(null);
  const canRetry = !!submission.receiptNumber;

  const mutation = useMutation({
    mutationFn: () => mpesaCollectionApi.resolveSubmission(submission._id, { action, reasonCode }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: mpesaKeys.submissionsFamily() });
      qc.invalidateQueries({ queryKey: estateKeys.paymentsFamily() });
      onClose();
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Unable to record this decision.'),
  });

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Review submission</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          {!canReach ? <Alert severity="info">This action needs a connection.</Alert> : null}
          <TextField select label="Decision" value={action} onChange={(e) => setAction(e.target.value as ReviewAction)}>
            <MenuItem value="REJECT">Reject this submission</MenuItem>
            <MenuItem value="RETRY_MATCH" disabled={!canRetry}>Ask the server to match it again</MenuItem>
          </TextField>
          {!canRetry ? <Typography variant="caption" color="text.secondary">Matching again needs a receipt number, and none was found in this message.</Typography> : null}
          <TextField select label="Reason" value={reasonCode} onChange={(e) => setReasonCode(e.target.value as ReviewReasonCode)}>
            {REVIEW_REASON_CODES.map((r) => <MenuItem key={r} value={r}>{REASON_COPY[r]}</MenuItem>)}
          </TextField>
          <Typography variant="caption" color="text.secondary">Matching again can only post a payment if the server finds independent matching evidence. Nothing is approved manually.</Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!canReach || mutation.isPending} onClick={() => { setError(null); mutation.mutate(); }}>
          {mutation.isPending ? 'Saving…' : 'Record decision'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
