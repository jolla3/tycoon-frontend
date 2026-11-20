'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, MenuItem, Skeleton,
  Stack, TextField, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import { estatesApi } from '@/lib/api/estates';
import { platformApi, type ClientMpesaProfile } from '@/lib/api/platform';
import { platformKeys } from '@/lib/query/keys';
import { ApiError } from '@/lib/api/client';
import {
  REGISTRATION_LABEL, STAGE_LABEL, isPlausibleKenyanMsisdn, onboardingStage, registrationActions, registrationDisplay,
} from './mpesa-profile-state';

type Confirm = { title: string; body: string; run: () => Promise<unknown> } | null;
const when = (v?: string | null) => (v ? new Date(v).toLocaleString() : '—');

/** One merchant profile: type, mappings, registration evidence and explicit actions. */
export function ClientMpesaProfilePanel({ clientId, profile }: { clientId: string; profile: ClientMpesaProfile }) {
  const qc = useQueryClient();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pullNumber, setPullNumber] = useState('');
  const [addEstateId, setAddEstateId] = useState('');

  const detail = useQuery({
    queryKey: ['platform', 'mpesa-profile', clientId, profile.id],
    queryFn: () => platformApi.clients.getMpesaProfile(clientId, profile.id),
    retry: false,
  });
  const cfg = useQuery({ queryKey: ['platform', 'mpesa-callback-config'], queryFn: () => platformApi.clients.mpesaCallbackConfig(), retry: false });
  const estates = useQuery({ queryKey: ['platform', 'client-estates', clientId], queryFn: () => estatesApi.list(clientId), retry: false });

  const p = detail.data ?? profile;
  const estateName = (id: string) => estates.data?.find((e) => e._id === id)?.name ?? 'Estate';
  const actions = registrationActions(p, Boolean(cfg.data?.configured));
  const stage = onboardingStage(p);

  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['platform', 'mpesa-profile', clientId, profile.id] }),
      qc.invalidateQueries({ queryKey: platformKeys.client(clientId) }),
      qc.invalidateQueries({ queryKey: platformKeys.mpesaIntegrations() }),
    ]);
  };
  const fail = (e: unknown) => setError(e instanceof ApiError ? e.message : 'The action could not be completed.');

  const act = useMutation({
    mutationFn: async (run: () => Promise<unknown>) => run(),
    onSuccess: async () => { setError(null); await refresh(); },
    onError: fail,
  });
  const run = (label: string, fn: () => Promise<unknown>) => { setNotice(null); setError(null); act.mutate(async () => { await fn(); setNotice(label); }); };

  const activeIds = new Set((p.estates ?? []).filter((e) => e.status === 'ACTIVE').map((e) => e.estateId));
  const mappable = (estates.data ?? []).filter((e) => !activeIds.has(e._id));

  return (
    <Box sx={{ minWidth: 0 }}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Typography variant="body2" fontWeight={600}>{p.displayName || p.businessShortCode}</Typography>
        <Chip size="small" label={p.merchantType === 'PAYBILL' ? 'PayBill' : 'Buy Goods Till'} />
        <Chip size="small" variant="outlined" label={`Shortcode ${p.businessShortCode}`} />
        <Chip size="small" color={stage === 'OPERATIONAL' ? 'success' : stage === 'FAILED' || stage === 'UNCERTAIN' ? 'warning' : 'default'} label={STAGE_LABEL[stage]} />
      </Stack>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
        Operational state {p.operationalState} · callback capability {p.callbackCapability} · pull capability {p.pullCapability}. These are reported by the backend; this page cannot change them.
      </Typography>

      {detail.isLoading ? <Skeleton variant="rounded" height={64} sx={{ mt: 1 }} /> : null}
      {detail.error ? <Alert severity="error" sx={{ mt: 1 }}>Could not load profile detail.</Alert> : null}

      <Typography variant="caption" fontWeight={600} display="block" sx={{ mt: 1.5 }}>Estates served</Typography>
      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
        {(p.estates ?? []).filter((e) => e.status === 'ACTIVE').map((e) => (
          <Chip
            key={e.estateId}
            size="small"
            label={estateName(e.estateId)}
            onDelete={() => setConfirm({
              title: 'Remove estate mapping?',
              body: `${estateName(e.estateId)} will no longer be authorized to use this shortcode. Receipts already routed to it stay attributed. Active collection references for this estate must be retired first.`,
              run: () => platformApi.clients.unmapMpesaEstate(clientId, profile.id, e.estateId),
            })}
          />
        ))}
        {activeIds.size === 0 ? <Typography variant="caption" color="warning.main">No active estate mapping — registration is blocked.</Typography> : null}
      </Stack>
      {mappable.length > 0 ? (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }}>
          <TextField select size="small" label="Add estate" value={addEstateId} onChange={(e) => setAddEstateId(e.target.value)} sx={{ minWidth: { sm: 220 } }}>
            {mappable.map((e) => <MenuItem key={e._id} value={e._id}>{e.name}</MenuItem>)}
          </TextField>
          <Button size="small" variant="outlined" disabled={!addEstateId || act.isPending}
            onClick={() => { const id = addEstateId; setAddEstateId(''); run('Estate mapped.', () => platformApi.clients.mapMpesaEstate(clientId, profile.id, id)); }}>
            Map estate
          </Button>
        </Stack>
      ) : null}

      <Typography variant="caption" fontWeight={600} display="block" sx={{ mt: 1.5 }}>Platform callback configuration</Typography>
      {cfg.data?.configured ? (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ overflowWrap: 'anywhere' }}>
          {cfg.data.configId} · version {cfg.data.version} · shared by every merchant; clients host nothing.
        </Typography>
      ) : (
        <Alert severity="warning" sx={{ mt: 0.5 }}>Callback configuration is not available on the platform ({cfg.data?.reason ?? 'unknown'}). Registration is blocked.</Alert>
      )}

      <Typography variant="caption" fontWeight={600} display="block" sx={{ mt: 1.5 }}>C2B URL registration</Typography>
      <Typography variant="body2">{REGISTRATION_LABEL[registrationDisplay(p.c2bRegistrationState)]}</Typography>
      <Typography variant="caption" color="text.secondary" display="block">
        Config version {p.c2bRegistration?.configVersion ?? '—'} · attempted {when(p.c2bRegistration?.attemptedAt)} · succeeded {when(p.c2bRegistration?.succeededAt)}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mt: 0.75 }} flexWrap="wrap" useFlexGap>
        <Button size="small" variant="outlined" disabled={!actions.canRegisterC2b || act.isPending}
          onClick={() => setConfirm({
            title: 'Register C2B URLs with Safaricom?',
            body: 'This sends the platform confirmation and validation URLs for this shortcode to Daraja. It is audited. Registration success does not mean callbacks are verified or that the merchant is operational.',
            run: () => platformApi.clients.registerMpesa(clientId, profile.id, 'c2b'),
          })}>
          Register C2B URLs
        </Button>
        {actions.c2bNeedsReconcile ? (
          <>
            <Button size="small" color="warning" onClick={() => setConfirm({ title: 'Mark C2B as registered?', body: 'Only choose this after confirming in the Daraja portal that the URLs are registered.', run: () => platformApi.clients.reconcileMpesaRegistration(clientId, profile.id, 'c2b', 'REGISTERED') })}>Confirmed registered</Button>
            <Button size="small" color="warning" onClick={() => setConfirm({ title: 'Mark C2B as not registered?', body: 'Only choose this after confirming nothing was registered. A retry becomes possible.', run: () => platformApi.clients.reconcileMpesaRegistration(clientId, profile.id, 'c2b', 'NOT_REGISTERED') })}>Confirmed not registered</Button>
          </>
        ) : null}
      </Stack>

      <Typography variant="caption" fontWeight={600} display="block" sx={{ mt: 1.5 }}>Pull transactions</Typography>
      <Typography variant="body2">{REGISTRATION_LABEL[registrationDisplay(p.pullRegistrationState)]}</Typography>
      <Typography variant="caption" color="text.secondary" display="block">
        Nominated number: {p.pullNominatedNumber?.captured ? p.pullNominatedNumber.masked : 'not captured'} (stored encrypted; never shown) · config version {p.pullRegistration?.configVersion ?? '—'} · attempted {when(p.pullRegistration?.attemptedAt)}
      </Typography>
      {actions.canSetPullNumber ? (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 0.75 }}>
          <TextField
            size="small" label="Nominated Safaricom number" value={pullNumber} type="password" autoComplete="off"
            onChange={(e) => setPullNumber(e.target.value)} placeholder="07XXXXXXXX"
            error={Boolean(pullNumber) && !isPlausibleKenyanMsisdn(pullNumber)}
            helperText="The MSISDN on the shortcode's Safaricom KYC details."
          />
          <Button size="small" variant="outlined" disabled={!isPlausibleKenyanMsisdn(pullNumber) || act.isPending}
            onClick={() => { const n = pullNumber; setPullNumber(''); run('Nominated number saved (masked).', () => platformApi.clients.setMpesaPullNumber(clientId, profile.id, n)); }}>
            Save number
          </Button>
        </Stack>
      ) : null}
      <Stack direction="row" spacing={1} sx={{ mt: 0.75 }} flexWrap="wrap" useFlexGap>
        <Button size="small" variant="outlined" disabled={!actions.canRegisterPull || act.isPending}
          onClick={() => setConfirm({
            title: 'Register Pull transactions?',
            body: 'Pull registration is one-time and is only eligible for live production shortcodes. It sends the nominated number to Safaricom. It is audited.',
            run: () => platformApi.clients.registerMpesa(clientId, profile.id, 'pull'),
          })}>
          Register Pull
        </Button>
        {actions.pullNeedsReconcile ? (
          <>
            <Button size="small" color="warning" onClick={() => setConfirm({ title: 'Mark Pull as registered?', body: 'Only after confirming with Safaricom/Daraja.', run: () => platformApi.clients.reconcileMpesaRegistration(clientId, profile.id, 'pull', 'REGISTERED') })}>Confirmed registered</Button>
            <Button size="small" color="warning" onClick={() => setConfirm({ title: 'Mark Pull as not registered?', body: 'Only after confirming nothing was registered.', run: () => platformApi.clients.reconcileMpesaRegistration(clientId, profile.id, 'pull', 'NOT_REGISTERED') })}>Confirmed not registered</Button>
          </>
        ) : null}
      </Stack>

      {notice ? <Alert severity="success" sx={{ mt: 1 }}>{notice}</Alert> : null}
      {error ? <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert> : null}

      <Dialog open={Boolean(confirm)} onClose={() => setConfirm(null)} fullScreen={fullScreen} fullWidth maxWidth="xs">
        <DialogTitle>{confirm?.title}</DialogTitle>
        <DialogContent><DialogContentText>{confirm?.body}</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)}>Cancel</Button>
          <Button variant="contained" disabled={act.isPending}
            onClick={() => { const c = confirm; setConfirm(null); if (c) run('Done.', c.run); }}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
