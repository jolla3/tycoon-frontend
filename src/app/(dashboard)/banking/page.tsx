'use client';

// Banking: connection lifecycle (create / reauthorize / disconnect) and accounts
// registered under an ACTIVE connection. Requires the BANKING product; a 403
// PRODUCT_NOT_ENTITLED is a distinct state from "not configured".
//
// Credential material is typed into local state, sent once, and cleared on
// success, error-dismiss and close. It is never put in React Query state,
// IndexedDB, URLs, logs or telemetry. Account numbers are never displayed in
// full; the backend only returns a masked hint.
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Card, Grid, Typography, Stack, Button, Chip, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Box, FormControlLabel, Checkbox,
} from '@mui/material';
import { Landmark, Plus, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { CardSkeleton } from '@/components/feedback/card-skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { EmptyState } from '@/components/feedback/empty-state';
import { ProductEntitlementBlocked, isProductNotEntitled } from '@/components/feedback/product-entitlement-blocked';
import { ConnectionStatusChip } from '@/components/data-display/status-chip';
import { bankingApi, type RegisterBankAccountInput } from '@/lib/api/banking';
import { bankConnectionsApi, type BankConnection, type CoopCredentialMaterial } from '@/lib/api/bank-connections';
import { dateFormat } from '@/lib/dates/period';
import { useVisibleEstates } from '@/features/estates/use-visible-estates';
import { useSession } from '@/features/auth/session-context';
import { permissions } from '@/lib/permissions/permissions';
import { ApiError } from '@/lib/api/client';
import { useConnectivity } from '@/lib/sync/connectivity';
import { bankingKeys, estateKeys } from '@/lib/query/keys';
import type { BankAccount } from '@/types/api';

const CONNECTION_STATUS: Record<BankConnection['status'], { label: string; color: 'success' | 'warning' | 'error' | 'default' }> = {
  pending: { label: 'Pending', color: 'warning' },
  active: { label: 'Active', color: 'success' },
  reauth_required: { label: 'Re-authorization required', color: 'warning' },
  disconnected: { label: 'Disconnected', color: 'default' },
  failed: { label: 'Failed', color: 'error' },
};

function useCanReach() {
  const c = useConnectivity();
  return c.state === 'online' || c.state === 'syncing' || c.state === 'sync-error';
}

export default function BankingPage() {
  const { user } = useSession();
  const { estates } = useVisibleEstates();
  const canManage = user ? permissions.canManageBanking(user.role) : false;
  const [connectOpen, setConnectOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);

  // Connections hold no secrets (authMeta is evidence only) but are read live, not cached offline.
  const connections = useQuery({ queryKey: bankingKeys.connections(), queryFn: () => bankConnectionsApi.list(), enabled: !!user });
  const accounts = useQuery({ queryKey: bankingKeys.accounts(), queryFn: () => bankingApi.list(), enabled: !!user });

  const blocked = isProductNotEntitled(connections.error) ? connections.error : isProductNotEntitled(accounts.error) ? accounts.error : null;
  if (blocked) {
    return (
      <>
        <PageHeader title="Banking" description="Bank connections and accounts" />
        <ProductEntitlementBlocked error={blocked} fallbackProduct="BANKING" />
      </>
    );
  }

  const activeConnections = (connections.data ?? []).filter((c) => c.status === 'active');

  return (
    <>
      <PageHeader
        title="Banking"
        description="Bank connections, registered accounts and synchronization"
        actions={
          canManage ? (
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" startIcon={<Plus size={16} />} onClick={() => setConnectOpen(true)}>New connection</Button>
              <Button variant="contained" startIcon={<Plus size={16} />} disabled={activeConnections.length === 0} onClick={() => setRegisterOpen(true)}>
                Register account
              </Button>
            </Stack>
          ) : null
        }
      />

      <Typography variant="h6" sx={{ mb: 1 }}>Connections</Typography>
      {connections.isLoading ? <CardSkeleton lines={2} /> : null}
      {connections.error && !connections.data ? <ErrorState error={connections.error} /> : null}
      {connections.data && connections.data.length === 0 ? (
        <Card sx={{ p: 2, mb: 3 }}>
          <EmptyState icon={Landmark} title="No bank connection yet" description="Create a connection with your Co-operative Bank credentials, then register accounts under it." />
        </Card>
      ) : null}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {connections.data?.map((c) => (
          <Grid item xs={12} md={6} key={c.id}>
            <ConnectionCard connection={c} canManage={canManage} />
          </Grid>
        ))}
      </Grid>

      <Typography variant="h6" sx={{ mb: 1 }}>Accounts</Typography>
      {accounts.isLoading ? <CardSkeleton lines={3} /> : null}
      {accounts.error && !accounts.data ? <ErrorState error={accounts.error} /> : null}
      {accounts.data && accounts.data.length === 0 ? (
        <Card sx={{ p: 2 }}>
          <EmptyState icon={Landmark} title="No bank accounts registered" description="Register an account under an active connection to start receiving and reconciling rent payments." />
        </Card>
      ) : null}
      <Grid container spacing={2}>
        {accounts.data?.map((a) => (
          <Grid item xs={12} md={6} key={a.id}>
            <BankAccountCard account={a} estateName={estates?.find((e) => e._id === a.estateId)?.name} canManage={canManage} />
          </Grid>
        ))}
      </Grid>

      {canManage && connectOpen ? <CreateConnectionDialog onClose={() => setConnectOpen(false)} /> : null}
      {canManage && registerOpen ? <RegisterAccountDialog onClose={() => setRegisterOpen(false)} estates={estates ?? []} connections={activeConnections} /> : null}
    </>
  );
}

/* ---------------------------------- Connections ---------------------------------- */

function ConnectionCard({ connection, canManage }: { connection: BankConnection; canManage: boolean }) {
  const qc = useQueryClient();
  const canReach = useCanReach();
  const [reauthOpen, setReauthOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const meta = CONNECTION_STATUS[connection.status] ?? { label: connection.status, color: 'default' as const };

  const disconnect = useMutation({
    mutationFn: () => bankConnectionsApi.disconnect(connection.id),
    onSuccess: () => { setError(null); qc.invalidateQueries({ queryKey: bankingKeys.connections() }); qc.invalidateQueries({ queryKey: bankingKeys.accounts() }); },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Unable to disconnect.'),
  });

  return (
    <Card sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="overline" color="text.secondary">{connection.provider}</Typography>
          <Typography fontWeight={600}>{connection.displayName || 'Co-operative Bank connection'}</Typography>
        </Box>
        <Chip size="small" label={meta.label} color={meta.color} variant="outlined" />
      </Stack>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
        Last authorized: {connection.authMeta.lastAuthAt ? dateFormat(connection.authMeta.lastAuthAt, 'DD MMM YYYY, HH:mm') : 'Never'}
        {connection.authMeta.tokenExpiresAt ? ` · token expires ${dateFormat(connection.authMeta.tokenExpiresAt, 'DD MMM, HH:mm')}` : ''}
      </Typography>
      {connection.authMeta.lastAuthError ? <Alert severity="warning" sx={{ mt: 1 }}>Last authorization error: {connection.authMeta.lastAuthError}</Alert> : null}
      {connection.status === 'reauth_required' ? (
        <Alert severity="warning" sx={{ mt: 1 }}>The bank rejected the stored credentials. Re-authorize to resume syncing. Sync and statement imports are blocked until then.</Alert>
      ) : null}
      {error ? <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert> : null}
      {canManage && connection.status !== 'disconnected' ? (
        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
          <Button size="small" variant="outlined" disabled={!canReach} onClick={() => setReauthOpen(true)}>Re-authorize</Button>
          <Button
            size="small"
            color="warning"
            disabled={!canReach || disconnect.isPending}
            onClick={() => {
              if (window.confirm('Disconnect this bank connection? Accounts under it stop syncing until a new connection is registered.')) disconnect.mutate();
            }}
          >
            {disconnect.isPending ? 'Disconnecting…' : 'Disconnect'}
          </Button>
        </Stack>
      ) : null}
      {reauthOpen ? <CredentialDialog title="Re-authorize connection" submitLabel="Re-authorize" onClose={() => setReauthOpen(false)} submit={(m) => bankConnectionsApi.reauthorize(connection.id, m)} /> : null}
    </Card>
  );
}

const EMPTY_CREDS: CoopCredentialMaterial = { clientId: '', clientSecret: '', username: '', password: '', scope: '' };

/** Shared credential form. Secrets live only in this component's state and are wiped on every exit path. */
function CredentialDialog({
  title, submitLabel, onClose, submit, withDisplayName = false,
}: {
  title: string;
  submitLabel: string;
  onClose: () => void;
  submit: (material: CoopCredentialMaterial, displayName?: string) => Promise<unknown>;
  withDisplayName?: boolean;
}) {
  const qc = useQueryClient();
  const canReach = useCanReach();
  const [creds, setCreds] = useState<CoopCredentialMaterial>(EMPTY_CREDS);
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const wipe = () => { setCreds(EMPTY_CREDS); setDisplayName(''); };
  const close = () => { wipe(); onClose(); };

  const mutation = useMutation({
    mutationFn: () => submit({ ...creds, scope: creds.scope?.trim() || undefined }, displayName.trim() || undefined),
    onSuccess: () => {
      wipe();
      qc.invalidateQueries({ queryKey: bankingKeys.connections() });
      qc.invalidateQueries({ queryKey: bankingKeys.accounts() });
      onClose();
    },
    onError: (e) => {
      // Keep what the user typed so they can correct it, but never echo it back.
      setError(e instanceof ApiError ? e.message : 'The bank connection could not be verified.');
    },
  });

  const set = (k: keyof CoopCredentialMaterial) => (e: React.ChangeEvent<HTMLInputElement>) => setCreds((c) => ({ ...c, [k]: e.target.value }));
  const valid = creds.clientId && creds.clientSecret && creds.username && creds.password;

  return (
    <Dialog open onClose={close} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }} component="form" autoComplete="off" onSubmit={(e) => e.preventDefault()}>
          {!canReach ? <Alert severity="info">You&apos;re offline. This action requires a server connection.</Alert> : null}
          {error ? <Alert severity="error">{error}</Alert> : null}
          <Alert severity="info">Credentials are sent securely to the server and stored encrypted. They cannot be viewed again.</Alert>
          {withDisplayName ? <TextField label="Display name (optional)" value={displayName} onChange={(e) => setDisplayName(e.target.value)} /> : null}
          <TextField label="Client ID" value={creds.clientId} onChange={set('clientId')} required autoComplete="off" />
          <TextField label="Client secret" type="password" value={creds.clientSecret} onChange={set('clientSecret')} required autoComplete="new-password" />
          <TextField label="Username" value={creds.username} onChange={set('username')} required autoComplete="off" />
          <TextField label="Password" type="password" value={creds.password} onChange={set('password')} required autoComplete="new-password" />
          <TextField label="Scope (optional)" value={creds.scope ?? ''} onChange={set('scope')} autoComplete="off" />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Cancel</Button>
        <Button variant="contained" disabled={!valid || mutation.isPending || !canReach} onClick={() => { setError(null); mutation.mutate(); }}>
          {mutation.isPending ? 'Verifying…' : submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function CreateConnectionDialog({ onClose }: { onClose: () => void }) {
  return (
    <CredentialDialog
      title="New bank connection"
      submitLabel="Create connection"
      withDisplayName
      onClose={onClose}
      submit={(material, displayName) => bankConnectionsApi.create({ provider: 'COOP', displayName, credentialMaterial: material })}
    />
  );
}

/* ----------------------------------- Accounts ----------------------------------- */

function BankAccountCard({ account, estateName, canManage }: { account: BankAccount; estateName?: string; canManage: boolean }) {
  const qc = useQueryClient();
  const canReach = useCanReach();
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [statementOpen, setStatementOpen] = useState(false);
  const canSync = account.entitlements?.poll !== false;
  const canStatement = account.entitlements?.statement !== false;

  const sync = useMutation({
    mutationFn: () => bankingApi.sync(account.id),
    onSuccess: (r) => {
      setSyncError(null);
      setSyncResult(`Synced: ${r.stored} new transaction(s) stored, ${r.reconciled} reconciled. Check Transactions for anything left unmatched.`);
      qc.invalidateQueries({ queryKey: bankingKeys.accounts() });
      qc.invalidateQueries({ queryKey: estateKeys.transactionsFamily() });
    },
    onError: (e) => {
      setSyncResult(null);
      setSyncError(e instanceof ApiError ? e.message : 'Bank synchronization failed. Existing transaction data has not been changed.');
    },
  });

  return (
    <Card sx={{ p: 2.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="overline" color="text.secondary">{account.provider}</Typography>
          <Typography variant="h6" fontWeight={700}>{account.accountName}</Typography>
          <Typography variant="body2" color="text.secondary">{estateName ?? 'Estate'} · {account.accountNumberMasked || 'Number hidden'}</Typography>
        </Box>
        <Stack spacing={0.5} alignItems="flex-end">
          <ConnectionStatusChip status={account.connectionStatus} />
          <Chip size="small" variant="outlined" label={`Validation: ${account.validationStatus}`} />
        </Stack>
      </Stack>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
        Last sync: {account.lastSyncedAt ? dateFormat(account.lastSyncedAt, 'DD MMM, HH:mm') : 'Never synchronized'}
        {account.lastValidatedAt ? ` · validated ${dateFormat(account.lastValidatedAt, 'DD MMM, HH:mm')}` : ''}
      </Typography>
      {canManage ? (
        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
          <Button size="small" startIcon={<RefreshCw size={14} />} disabled={sync.isPending || !canReach || !canSync} onClick={() => { setSyncResult(null); setSyncError(null); sync.mutate(); }}>
            {!canReach ? "You're offline" : sync.isPending ? 'Syncing…' : 'Sync now'}
          </Button>
          <Button size="small" disabled={!canStatement} onClick={() => setStatementOpen(true)}>Import statement</Button>
        </Stack>
      ) : null}
      {syncResult ? <Alert severity="success" sx={{ mt: 1.5 }}>{syncResult}</Alert> : null}
      {syncError ? <Alert severity="error" sx={{ mt: 1.5 }}>{syncError}</Alert> : null}
      {statementOpen ? <StatementDialog accountId={account.id} onClose={() => setStatementOpen(false)} /> : null}
    </Card>
  );
}

function StatementDialog({ accountId, onClose }: { accountId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const canReach = useCanReach();
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [result, setResult] = useState<{ stored: number; reconciled: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The endpoint returns counts only, never rows. Rows appear under Transactions.
  const mutation = useMutation({
    mutationFn: () => bankingApi.statement(accountId, startDate, endDate),
    onSuccess: (r) => { setResult(r); qc.invalidateQueries({ queryKey: estateKeys.transactionsFamily() }); },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Unable to import the statement.'),
  });

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Import bank statement</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {!canReach ? <Alert severity="info">You&apos;re offline. This action requires a server connection.</Alert> : null}
          {error ? <Alert severity="error">{error}</Alert> : null}
          {result ? <Alert severity="success">{result.stored} transaction(s) stored, {result.reconciled} reconciled. The rest appear under Transactions as unmatched or needing review.</Alert> : null}
          <TextField label="Start date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField label="End date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" disabled={!startDate || !endDate || mutation.isPending || !canReach} onClick={() => { setError(null); mutation.mutate(); }}>
          {mutation.isPending ? 'Importing…' : 'Import'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function RegisterAccountDialog({ onClose, estates, connections }: { onClose: () => void; estates: { _id: string; name: string }[]; connections: BankConnection[] }) {
  const qc = useQueryClient();
  const canReach = useCanReach();
  const [estateId, setEstateId] = useState('');
  const [connectionId, setConnectionId] = useState(connections[0]?.id ?? '');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [conflict, setConflict] = useState(false);
  const [reassign, setReassign] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const input: RegisterBankAccountInput = { estateId, connectionId, provider: 'COOP', accountNumber: accountNumber.trim(), accountName: accountName.trim(), ...(reassign ? { allowEstateReassignment: true } : {}) };
      return bankingApi.register(input);
    },
    onSuccess: () => {
      setAccountNumber('');
      qc.invalidateQueries({ queryKey: bankingKeys.accounts() });
      onClose();
    },
    onError: (e) => {
      if (e instanceof ApiError && e.status === 409) {
        // The backend refuses silent moves. Offer an explicit, confirmed reassignment.
        setConflict(true);
        setError(e.message);
      } else {
        setError(e instanceof ApiError ? e.message : 'Unable to register this account.');
      }
    },
  });

  const valid = estateId && connectionId && accountNumber.trim() && accountName.trim() && (!conflict || reassign);

  return (
    <Dialog open onClose={() => { setAccountNumber(''); onClose(); }} fullWidth maxWidth="xs">
      <DialogTitle>Register bank account</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {!canReach ? <Alert severity="info">You&apos;re offline. This action requires a server connection.</Alert> : null}
          {error ? <Alert severity={conflict ? 'warning' : 'error'}>{error}</Alert> : null}
          <TextField select label="Estate" value={estateId} onChange={(e) => setEstateId(e.target.value)} required>
            {estates.map((e) => <MenuItem key={e._id} value={e._id}>{e.name}</MenuItem>)}
          </TextField>
          <TextField select label="Connection" value={connectionId} onChange={(e) => setConnectionId(e.target.value)} required>
            {connections.map((c) => <MenuItem key={c.id} value={c.id}>{c.displayName || `Co-operative Bank (${c.id.slice(-6)})`}</MenuItem>)}
          </TextField>
          <TextField label="Account number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} required autoComplete="off" />
          <TextField label="Account name" value={accountName} onChange={(e) => setAccountName(e.target.value)} required />
          {conflict ? (
            <FormControlLabel
              control={<Checkbox checked={reassign} onChange={(e) => setReassign(e.target.checked)} />}
              label="I confirm moving this already-registered account to the selected estate"
            />
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => { setAccountNumber(''); onClose(); }}>Cancel</Button>
        <Button variant="contained" disabled={!valid || mutation.isPending || !canReach} onClick={() => { setError(null); mutation.mutate(); }}>
          {mutation.isPending ? 'Registering…' : 'Register'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
