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
  CALLBACK_LABEL, OPERATIONAL_LABEL, OPERATIONAL_MEANING, PULL_CAPABILITY_LABEL, REGISTRATION_LABEL, STAGE_LABEL,
  blockerText, isPlausibleKenyanMsisdn, lifecycleControl, onboardingStage, operationalTone, registrationActions,
  registrationDisplay,
} from './mpesa-profile-state';

// `reason` asks the operator for a mandatory reason (suspension). Lifecycle dialogs also freeze the
// revision the operator reviewed so a concurrent change is detected by the backend (409).
type Confirm = { title: string; body: string; run: (reason?: string) => Promise<unknown>; reasonRequired?: boolean } | null;
const STALE_MESSAGE = 'This profile changed since you loaded it. It has been refreshed from the server. Review the new state and blockers before trying again.';
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
  const [reason, setReason] = useState('');

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
  const lifecycle = lifecycleControl(p);

  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['platform', 'mpesa-profile', clientId, profile.id] }),
      qc.invalidateQueries({ queryKey: platformKeys.client(clientId) }),
      qc.invalidateQueries({ queryKey: platformKeys.mpesaIntegrations() }),
    ]);
  };
  // Lifecycle calls: on a 409 (stale revision, or a blocker that appeared) refresh from the server and
  // ask the operator to review. Never assume the action happened; state only ever comes from the server.
  const lifecycleCall = async (fn: () => Promise<unknown>) => {
    try { return await fn(); } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        await refresh();
        if (e.code === 'MPESA_LIFECYCLE_BLOCKED') throw e;
        throw new ApiError(STALE_MESSAGE, e.code, e.status, e.details);
      }
      throw e;
    }
  };
  const openLifecycle = (action: 'activate' | 'suspend' | 'resume') => {
    const revision = lifecycle.revision;
    if (revision === null) return;
    setReason('');
    const base = { clientId, profileId: profile.id };
    if (action === 'activate') setConfirm({
      title: 'Activate this merchant profile?',
      body: 'Activation marks the C2B collection path operational after the backend re-checks registration evidence against the current callback configuration, callback verification and estate mappings. It does not enable automatic rent posting, which is gated separately. It is audited.',
      run: (r) => lifecycleCall(() => platformApi.clients.activateMpesaProfile(base.clientId, base.profileId, { expectedRevision: revision, ...(r ? { reason: r } : {}) })),
    });
    if (action === 'suspend') setConfirm({
      title: 'Suspend this merchant profile?',
      body: 'The merchant stops being operational until it is resumed. Enter the reason; it is recorded in the audit log.',
      reasonRequired: true,
      run: (r) => lifecycleCall(() => platformApi.clients.suspendMpesaProfile(base.clientId, base.profileId, { expectedRevision: revision, reason: String(r) })),
    });
    if (action === 'resume') setConfirm({
      title: 'Resume this merchant profile?',
      body: 'The backend re-checks every readiness condition before resuming. It is audited.',
      run: (r) => lifecycleCall(() => platformApi.clients.resumeMpesaProfile(base.clientId, base.profileId, { expectedRevision: revision, ...(r ? { reason: r } : {}) })),
    });
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
        <Typography variant="body2" fontWeight={600} sx={{ overflowWrap: 'anywhere', minWidth: 0 }}>{p.displayName || p.businessShortCode}</Typography>
        <Chip size="small" label={p.merchantType === 'PAYBILL' ? 'PayBill' : 'Buy Goods Till'} />
        <Chip size="small" variant="outlined" label={`Shortcode ${p.businessShortCode}`} sx={{ maxWidth: '100%' }} />
        <Chip size="small" color={operationalTone(p.operationalState)} label={`State: ${OPERATIONAL_LABEL[p.operationalState] ?? p.operationalState}`} />
      </Stack>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
        {OPERATIONAL_MEANING[p.operationalState] ?? ''} Status is reported by the backend; this page cannot set operational state or capability.
      </Typography>

      {detail.isLoading ? <Skeleton variant="rounded" height={64} sx={{ mt: 1 }} /> : null}
      {detail.error ? <Alert severity="error" sx={{ mt: 1 }}>Could not load profile detail.</Alert> : null}

      <Typography variant="caption" fontWeight={600} display="block" sx={{ mt: 1.5 }}>Estates served</Typography>
      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
        {(p.estates ?? []).filter((e) => e.status === 'ACTIVE').map((e) => (
          <Chip
            key={e.estateId}
            size="small"
            label={e.eligible === false ? `${estateName(e.estateId)} — estate inactive or not this client's` : estateName(e.estateId)}
            color={e.eligible === false ? 'warning' : 'default'}
            sx={{ maxWidth: '100%' }}
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

      <Box sx={{ mt: 2, p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1, minWidth: 0 }}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Typography variant="subtitle2">C2B collection (primary path)</Typography>
        <Chip size="small" variant="outlined" label={STAGE_LABEL[stage]} sx={{ maxWidth: '100%' }} />
      </Stack>

      <Typography variant="caption" fontWeight={600} display="block" sx={{ mt: 1 }}>URL registration</Typography>
      <Typography variant="body2">{REGISTRATION_LABEL[registrationDisplay(p.c2bRegistrationState)]}</Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ overflowWrap: 'anywhere' }}>
        Registered against {p.c2bRegistration?.configId ?? '—'} version {p.c2bRegistration?.configVersion ?? '—'}
        {cfg.data?.configured ? ` (current: version ${cfg.data.version})` : ''} · attempted {when(p.c2bRegistration?.attemptedAt)} · succeeded {when(p.c2bRegistration?.succeededAt)}
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block">
        Registration accepted means the provider accepted the URLs. It does not prove callbacks are delivered or trusted.
      </Typography>

      <Typography variant="caption" fontWeight={600} display="block" sx={{ mt: 1 }}>Callback capability</Typography>
      <Typography variant="body2">{CALLBACK_LABEL[p.callbackCapability] ?? p.callbackCapability}</Typography>

      <Typography variant="caption" fontWeight={600} display="block" sx={{ mt: 1 }}>What is blocking C2B readiness</Typography>
      {p.readinessBlockers === undefined ? (
        <Typography variant="caption" color="text.secondary">Not reported by the backend.</Typography>
      ) : p.readinessBlockers.length === 0 ? (
        <Typography variant="body2">No C2B readiness blockers reported.</Typography>
      ) : (
        <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
          {p.readinessBlockers.map((b) => <Typography component="li" variant="body2" key={b} sx={{ overflowWrap: 'anywhere' }}>{blockerText(b)}</Typography>)}
        </Box>
      )}

      <Typography variant="caption" fontWeight={600} display="block" sx={{ mt: 1.5 }}>Merchant lifecycle</Typography>
      {lifecycle.action === null ? null : !lifecycle.reported ? (
        <Alert severity="info" sx={{ mt: 0.5 }}>The backend did not report lifecycle availability for this profile, so lifecycle actions are unavailable. Refresh to retry.</Alert>
      ) : (
        <Stack spacing={1} sx={{ mt: 0.5 }}>
          <Button
            size="small" variant="contained" color={lifecycle.action === 'suspend' ? 'warning' : 'primary'}
            disabled={!lifecycle.enabled || act.isPending || detail.isFetching}
            onClick={() => openLifecycle(lifecycle.action!)}
            sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
          >
            {lifecycle.action === 'activate' ? 'Activate merchant' : lifecycle.action === 'suspend' ? 'Suspend merchant' : 'Resume merchant'}
          </Button>
          {!lifecycle.enabled && lifecycle.blockers.length > 0 ? (
            <Alert severity="warning">
              Not available yet:
              <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                {lifecycle.blockers.map((b) => <Typography component="li" variant="body2" key={b} sx={{ overflowWrap: 'anywhere' }}>{blockerText(b)}</Typography>)}
              </Box>
            </Alert>
          ) : null}
        </Stack>
      )}

      <Typography variant="caption" fontWeight={600} display="block" sx={{ mt: 1.5 }}>Registration actions</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 0.75 }} flexWrap="wrap" useFlexGap>
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
      </Box>

      <Box sx={{ mt: 2, p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1, minWidth: 0 }}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Typography variant="subtitle2">Pull transactions</Typography>
        <Chip size="small" variant="outlined" label="Optional recovery — not required for C2B" sx={{ maxWidth: '100%' }} />
      </Stack>
      <Typography variant="caption" fontWeight={600} display="block" sx={{ mt: 1 }}>Registration</Typography>
      <Typography variant="body2">{REGISTRATION_LABEL[registrationDisplay(p.pullRegistrationState)]}</Typography>
      <Typography variant="caption" fontWeight={600} display="block" sx={{ mt: 1 }}>Capability</Typography>
      <Typography variant="body2">{PULL_CAPABILITY_LABEL[p.pullCapability] ?? p.pullCapability}</Typography>
      {p.pullAdvisories && p.pullAdvisories.length > 0 ? (
        <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
          {p.pullAdvisories.map((b) => <Typography component="li" variant="caption" color="text.secondary" key={b} sx={{ overflowWrap: 'anywhere' }}>{blockerText(b)}</Typography>)}
        </Box>
      ) : null}
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5, overflowWrap: 'anywhere' }}>
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
      {!actions.pullEligible ? (
        <Alert severity="info" sx={{ mt: 0.75 }}>
          Pull registration is disabled for this merchant type: no official provider evidence or controlled sandbox observation confirms eligibility yet. The number can be saved, but nothing is sent to Safaricom.
        </Alert>
      ) : null}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 0.75 }} flexWrap="wrap" useFlexGap>
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
      </Box>

      {notice ? <Alert severity="success" sx={{ mt: 1 }}>{notice}</Alert> : null}
      {error ? <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert> : null}

      <Dialog open={Boolean(confirm)} onClose={() => setConfirm(null)} fullScreen={fullScreen} fullWidth maxWidth="xs">
        <DialogTitle>{confirm?.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{confirm?.body}</DialogContentText>
          {confirm?.reasonRequired ? (
            <TextField
              autoFocus fullWidth multiline minRows={2} size="small" margin="dense" label="Reason (required)"
              value={reason} onChange={(e) => setReason(e.target.value)}
              inputProps={{ maxLength: 500 }} helperText="At least 3 characters. Recorded in the audit log."
            />
          ) : null}
        </DialogContent>
        <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Button onClick={() => setConfirm(null)}>Cancel</Button>
          <Button variant="contained" disabled={act.isPending || (Boolean(confirm?.reasonRequired) && reason.trim().length < 3)}
            onClick={() => { const c = confirm; const r = reason.trim(); setConfirm(null); if (c) run('Done.', () => c.run(r || undefined)); }}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
