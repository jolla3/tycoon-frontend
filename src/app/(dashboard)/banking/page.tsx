'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Grid,
  Typography,
  Stack,
  Button,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  Box,
} from '@mui/material';
import { Landmark, Plus, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { CardSkeleton } from '@/components/feedback/card-skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { EmptyState } from '@/components/feedback/empty-state';
import { ConnectionStatusChip } from '@/components/data-display/status-chip';
import { bankingApi, type ConnectBankAccountInput } from '@/lib/api/banking';
import { dateFormat } from '@/lib/dates/period';
import { useVisibleEstates } from '@/features/estates/use-visible-estates';
import { useSession } from '@/features/auth/session-context';
import { permissions } from '@/lib/permissions/permissions';
import { ApiError } from '@/lib/api/client';
import { useConnectivity } from '@/lib/sync/connectivity';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { identityKeyFromUser } from '@/lib/session/local-session-marker';
import { FreshnessBadge } from '@/components/data-display/freshness-badge';
import type { BankAccount } from '@/types/api';

// Sensitive account fields are never rendered — accountName + masked placeholder only.

export default function BankingPage() {
  const { user } = useSession();
  const identity = user ? identityKeyFromUser(user) : 'anon';
  const { estates } = useVisibleEstates();
  const [connectOpen, setConnectOpen] = useState(false);
  const canManage = user ? permissions.canManageBanking(user.role) : false;

  const { data, isLoading, error, freshness, cachedAt } = useCachedQuery(
    `${identity}:bank-accounts`,
    ['bank-accounts', identity],
    () => bankingApi.list()
  );

  return (
    <>
      <PageHeader
        title="Banking"
        description="Connected bank accounts and synchronization status"
        actions={
          canManage && (
            <Button variant="contained" startIcon={<Plus size={16} />} onClick={() => setConnectOpen(true)}>
              Connect Account
            </Button>
          )
        }
      />

      {freshness !== 'live' && (
        <Box sx={{ mb: 1.5 }}>
          <FreshnessBadge freshness={freshness} cachedAt={cachedAt} />
        </Box>
      )}

      {error && !data && <ErrorState error={error} />}
      {isLoading && (
        <Grid container spacing={2}>
          {Array.from({ length: 2 }).map((_, i) => (
            <Grid item xs={12} md={6} key={i}>
              <CardSkeleton lines={3} />
            </Grid>
          ))}
        </Grid>
      )}

      {!isLoading && !error && (!data || data.length === 0) && (
        <Card sx={{ p: 2 }}>
          <EmptyState icon={Landmark} title="No bank accounts connected" description="Connect a bank account to start receiving and reconciling rent payments automatically." />
        </Card>
      )}

      <Grid container spacing={2}>
        {data?.map((account) => (
          <Grid item xs={12} md={6} key={account.id ?? account._id}>
            <BankAccountCard account={account} estateName={estates?.find((e) => e._id === account.estateId)?.name} canManage={canManage} />
          </Grid>
        ))}
      </Grid>

      {canManage && (
        <ConnectAccountDialog open={connectOpen} onClose={() => setConnectOpen(false)} estates={estates ?? []} />
      )}
    </>
  );
}

function BankAccountCard({ account, estateName, canManage }: { account: BankAccount; estateName?: string; canManage: boolean }) {
  const queryClient = useQueryClient();
  const connectivity = useConnectivity();
  const canReachServer = connectivity.state === 'online' || connectivity.state === 'syncing' || connectivity.state === 'sync-error';
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [statementOpen, setStatementOpen] = useState(false);

  const sync = useMutation({
    mutationFn: () => bankingApi.sync(account.id ?? account._id!),
    onSuccess: (result) => {
      setSyncError(null);
      setSyncResult(`Synced — ${result.stored} new transaction(s), ${result.reconciled} reconciled.`);
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (err) => {
      setSyncResult(null);
      setSyncError(err instanceof ApiError ? err.message : 'Bank synchronization failed. Your existing transaction data has not been changed.');
    },
  });

  return (
    <Card
      sx={{
        p: 2.5,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 3,
        border: '1px solid rgba(0, 180, 216, 0.35)',
        background: 'linear-gradient(135deg, rgba(2, 62, 138, 0.92) 0%, rgba(0, 150, 199, 0.88) 48%, rgba(0, 180, 216, 0.85) 100%)',
        color: '#fff',
        boxShadow: '0 12px 40px rgba(2, 62, 138, 0.18)',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="overline" sx={{ opacity: 0.85 }}>{account.provider}</Typography>
          <Typography variant="h6" fontWeight={700}>{account.accountName}</Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {estateName ?? 'Estate'} · {account.accountNumberMasked || '•••• ••••'}
          </Typography>
        </Box>
        <ConnectionStatusChip status={account.connectionStatus} />
      </Stack>

      <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Account
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: '"IBM Plex Mono", monospace' }}>
            •••• •••• ••••
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Last Sync
          </Typography>
          <Typography variant="body2">{account.lastSyncedAt ? dateFormat(account.lastSyncedAt, 'DD MMM, HH:mm') : 'Never synchronized'}</Typography>
        </Box>
      </Stack>

      {canManage && (
        <Button
          size="small"
          startIcon={<RefreshCw size={14} />}
          sx={{ mt: 2, mr: 1 }}
          disabled={sync.isPending || !canReachServer}
          onClick={() => {
            setSyncResult(null);
            setSyncError(null);
            sync.mutate();
          }}
        >
          {!canReachServer ? "You're offline" : sync.isPending ? 'Syncing…' : 'Sync now'}
        </Button>
      )}
      {canManage && (
        <Button size="small" variant="text" sx={{ mt: 2 }} onClick={() => setStatementOpen(true)}>
          View statement
        </Button>
      )}

      {statementOpen && (
        <StatementDialog
          open={statementOpen}
          onClose={() => setStatementOpen(false)}
          accountId={account.id ?? account._id!}
          canReachServer={canReachServer}
        />
      )}

      {!canReachServer && canManage && (
        <Alert severity="info" sx={{ mt: 1.5 }}>
          You&apos;re offline. Bank synchronization requires a server connection.
        </Alert>
      )}
      {syncResult && (
        <Alert severity="success" sx={{ mt: 1.5 }}>
          {syncResult}
        </Alert>
      )}
      {syncError && (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {syncError}
        </Alert>
      )}
    </Card>
  );
}

function StatementDialog({ open, onClose, accountId, canReachServer }: { open: boolean; onClose: () => void; accountId: string; canReachServer: boolean }) {
  // Section 5 of this pass: bank.controller.js#statement (GET
  // /bank/accounts/:id/statement?startDate&endDate) only returns
  // { stored, reconciled } counts — it does NOT return the actual list of
  // transactions. We show exactly that, honestly, and point the user to
  // the Transactions screen to see the resulting records, rather than
  // fabricating a transaction list this endpoint doesn't provide.
  const queryClient = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [result, setResult] = useState<{ stored: number; reconciled: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => bankingApi.statement(accountId, startDate, endDate),
    onSuccess: (res) => {
      setResult(res);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Unable to retrieve the statement.'),
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Retrieve Bank Statement</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {!canReachServer && <Alert severity="info">You&apos;re offline. This action requires a server connection.</Alert>}
          {error && <Alert severity="error">{error}</Alert>}
          {result && (
            <Alert severity="success">
              Imported {result.stored} transaction(s), {result.reconciled} automatically reconciled. Unreconciled ones will
              appear under Transactions &gt; Unmatched.
            </Alert>
          )}
          <TextField label="Start date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField label="End date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          disabled={!startDate || !endDate || mutation.isPending || !canReachServer}
          onClick={() => {
            setError(null);
            mutation.mutate();
          }}
        >
          {!canReachServer ? 'Offline' : mutation.isPending ? 'Retrieving…' : 'Retrieve'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ConnectAccountDialog({ open, onClose, estates }: { open: boolean; onClose: () => void; estates: { _id: string; name: string }[] }) {
  const queryClient = useQueryClient();
  const connectivity = useConnectivity();
  const canReachServer = connectivity.state === 'online' || connectivity.state === 'syncing' || connectivity.state === 'sync-error';
  const [form, setForm] = useState<Partial<ConnectBankAccountInput>>({ provider: 'COOP' });
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => bankingApi.connect(form as ConnectBankAccountInput),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      setForm({ provider: 'COOP' });
      onClose();
    },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Unable to connect this account.'),
  });

  const valid = form.estateId && form.accountNumber && form.accountName;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Connect Bank Account</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {!canReachServer && <Alert severity="info">You&apos;re offline. This action requires a server connection.</Alert>}
          {formError && <Alert severity="error">{formError}</Alert>}
          <Select displayEmpty value={form.estateId ?? ''} onChange={(e) => setForm((f) => ({ ...f, estateId: e.target.value }))}>
            <MenuItem value="" disabled>
              Select estate
            </MenuItem>
            {estates.map((e) => (
              <MenuItem key={e._id} value={e._id}>
                {e.name}
              </MenuItem>
            ))}
          </Select>
          {/* Only COOP is implemented server-side. Other enum values are placeholders. */}
          <Select value={form.provider ?? 'COOP'} onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value as ConnectBankAccountInput['provider'] }))}>
            <MenuItem value="COOP">Co-operative Bank</MenuItem>
          </Select>
          <Typography variant="caption" color="text.secondary">
            KCB, Equity, and NCBA are reserved in the API but not implemented yet.
          </Typography>
          <TextField label="Account number" value={form.accountNumber ?? ''} onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))} required />
          <TextField label="Account name" value={form.accountName ?? ''} onChange={(e) => setForm((f) => ({ ...f, accountName: e.target.value }))} required />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!valid || mutation.isPending || !canReachServer} onClick={() => { setFormError(null); mutation.mutate(); }}>
          {!canReachServer ? "Offline" : mutation.isPending ? 'Connecting…' : 'Connect'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
