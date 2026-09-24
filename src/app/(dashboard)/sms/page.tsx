'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Stack,
  TextField,
  Button,
  Alert,
  Chip,
  Typography,
  Box,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Divider,
} from '@mui/material';
import { MessageSquare, Send } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, type DataTableColumn } from '@/components/data-display/data-table';
import { FreshnessBadge } from '@/components/data-display/freshness-badge';
import { smsApi, type SmsRecipientGroup } from '@/lib/api/sms';
import { tenantsApi } from '@/lib/api/tenants';
import { housesApi } from '@/lib/api/houses';
import { useQuery } from '@tanstack/react-query';
import { dateFormat } from '@/lib/dates/period';
import { ApiError } from '@/lib/api/client';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { useSession } from '@/features/auth/session-context';
import { identityKeyFromUser } from '@/lib/session/local-session-marker';
import { useVisibleEstates } from '@/features/estates/use-visible-estates';
import { useConnectivity } from '@/lib/sync/connectivity';
import { permissions } from '@/lib/permissions/permissions';
import { readListScopeEstate } from '@/lib/navigation/workspace';
import type { SmsMessage } from '@/types/api';

const STATUS_COLOR: Record<SmsMessage['status'], 'success' | 'error' | 'warning' | 'default'> = {
  sent: 'success',
  failed: 'error',
  unknown: 'warning',
  queued: 'default',
  processing: 'default',
};

const GROUP_LABELS: Record<SmsRecipientGroup, string> = {
  ALL_TENANTS: 'All active tenants',
  ESTATE: 'One estate',
  SELECTED_TENANTS: 'Selected tenants (IDs)',
  ARREARS: 'Balance outstanding (ARREARS)',
  OUTSTANDING: 'Balance outstanding (OUTSTANDING)',
};

export default function SmsPage() {
  const [tab, setTab] = useState(0);
  const queryClient = useQueryClient();
  const { user } = useSession();
  const identity = user ? identityKeyFromUser(user) : 'anon';
  const canBroadcast = user ? permissions.canManageTenants(user.role) || permissions.canManageEstates(user.role) : false;

  const { data, isLoading, error, freshness, cachedAt } = useCachedQuery(
    `${identity}:sms:history`,
    ['sms', 'history', identity],
    () => smsApi.history()
  );

  const columns: DataTableColumn<SmsMessage>[] = [
    { key: 'phone', header: 'Recipient', render: (m) => m.phoneNumber },
    {
      key: 'message',
      header: 'Message',
      render: (m) => (m.message.length > 60 ? `${m.message.slice(0, 60)}…` : m.message),
    },
    {
      key: 'status',
      header: 'Status',
      render: (m) => <Chip size="small" label={m.status} color={STATUS_COLOR[m.status]} variant="outlined" />,
    },
    { key: 'sent', header: 'Sent', render: (m) => (m.sentAt ? dateFormat(m.sentAt, 'DD MMM, HH:mm') : '—') },
  ];

  return (
    <>
      <PageHeader title="SMS" description="Send messages, broadcast to tenant groups, preview templates, and review delivery history" />
      {freshness !== 'live' ? (
        <Box sx={{ mb: 1.5 }}>
          <FreshnessBadge freshness={freshness} cachedAt={cachedAt} />
        </Box>
      ) : null}

      <Card sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab label="Single send" />
          <Tab label="Broadcast" disabled={!canBroadcast} />
          <Tab label="Preview" />
          <Tab label="History" />
        </Tabs>
      </Card>

      {tab === 0 && <SingleSendForm onQueued={() => queryClient.invalidateQueries({ queryKey: ['sms', 'history'] })} />}
      {tab === 1 && canBroadcast && <BroadcastForm onQueued={() => queryClient.invalidateQueries({ queryKey: ['sms', 'history'] })} />}
      {tab === 2 && <PreviewForm />}
      {tab === 3 && (
        <Card>
          <DataTable
            columns={columns}
            rows={data}
            rowKey={(m) => m._id}
            isLoading={isLoading}
            error={error}
            emptyIcon={MessageSquare}
            emptyTitle="No SMS history"
            emptyDescription="Queued and sent messages will appear here."
            renderMobileCard={(m) => (
              <Card variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography fontWeight={600}>{m.phoneNumber}</Typography>
                  <Chip size="small" label={m.status} color={STATUS_COLOR[m.status]} variant="outlined" />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {m.message.slice(0, 80)}
                </Typography>
              </Card>
            )}
          />
        </Card>
      )}
    </>
  );
}

function SingleSendForm({ onQueued }: { onQueued: () => void }) {
  const connectivity = useConnectivity();
  const canReach = connectivity.state === 'online' || connectivity.state === 'syncing' || connectivity.state === 'sync-error';
  const { data: tenants } = useQuery({
    queryKey: ['tenants', 'sms-single'],
    queryFn: () => tenantsApi.list(),
  });
  const [tenantId, setTenantId] = useState('');
  const [message, setMessage] = useState('');
  const [forceResend, setForceResend] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const activeTenants = useMemo(
    () => (tenants ?? []).filter((t) => t.status === 'active'),
    [tenants]
  );

  const send = useMutation({
    mutationFn: () => {
      if (!tenantId) throw new Error('Select a tenant');
      return smsApi.send({ tenantId, message, forceResend });
    },
    onSuccess: (data) => {
      setResult(
        `Message ${data.status || 'queued'} (job ${String(data.jobId).slice(-8)}). Not marked sent until the provider confirms delivery.`
      );
      setTenantId('');
      setMessage('');
      onQueued();
    },
    onError: (err) =>
      setFormError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Unable to queue this message.'),
  });

  return (
    <Card sx={{ p: 2 }}>
      <Stack spacing={2} maxWidth={560}>
        {!canReach ? <Alert severity="warning">An internet connection is required to send SMS.</Alert> : null}
        {formError ? <Alert severity="error">{formError}</Alert> : null}
        {result ? <Alert severity="info">{result}</Alert> : null}
        <Select
          displayEmpty
          value={tenantId}
          onChange={(e) => setTenantId(e.target.value)}
          fullWidth
        >
          <MenuItem value="">Select tenant</MenuItem>
          {activeTenants.map((t) => (
            <MenuItem key={t._id} value={t._id}>
              {t.name} · {t.phone}
            </MenuItem>
          ))}
        </Select>
        <TextField
          label="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          multiline
          minRows={3}
        />
        <FormControlLabel
          control={<Checkbox checked={forceResend} onChange={(e) => setForceResend(e.target.checked)} />}
          label="Force resend (bypass backend deduplication if supported)"
        />
        <Button
          variant="contained"
          startIcon={<Send size={16} />}
          disabled={!tenantId || !message || send.isPending || !canReach}
          onClick={() => {
            setFormError(null);
            setResult(null);
            send.mutate();
          }}
        >
          {!canReach ? 'Offline' : send.isPending ? 'Queueing…' : 'Queue message'}
        </Button>
      </Stack>
    </Card>
  );
}

function BroadcastForm({ onQueued }: { onQueued: () => void }) {
  const connectivity = useConnectivity();
  const canReach = connectivity.state === 'online' || connectivity.state === 'syncing' || connectivity.state === 'sync-error';
  const { estates } = useVisibleEstates();
  const [group, setGroup] = useState<SmsRecipientGroup>('ALL_TENANTS');
  const [estateId, setEstateId] = useState('');
  const [tenantIdsRaw, setTenantIdsRaw] = useState('');

  useEffect(() => {
    const scoped = readListScopeEstate();
    if (scoped) {
      setEstateId(scoped);
      setGroup('ESTATE');
    }
  }, []);
  const [message, setMessage] = useState('');
  const [forceResend, setForceResend] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<'broadcast' | 'rent_reminder' | 'billing_notification' | 'arrears_notice'>('broadcast');
  const [broadcastPreview, setBroadcastPreview] = useState<string | null>(null);

  const tenantIds = useMemo(
    () =>
      tenantIdsRaw
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    [tenantIdsRaw]
  );

  const previewRun = useMutation({
    mutationFn: () =>
      smsApi.preview({
        template:
          msgType === 'broadcast'
            ? 'billing_notification'
            : (msgType as 'rent_reminder' | 'billing_notification' | 'arrears_notice'),
        period: undefined,
        tenantName: 'Sample Tenant',
        houseNumber: 'A01',
      }),
    onSuccess: (data) =>
      setBroadcastPreview(
        `Message type: ${msgType}\nRecipient group: ${group}\n---\n${data.message || JSON.stringify(data)}\n---\nYour free-text message:\n${message}`
      ),
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Preview failed'),
  });

  const broadcast = useMutation({
    mutationFn: () =>
      smsApi.broadcast({
        recipientGroup: group,
        estateId: group === 'ESTATE' || group === 'ARREARS' || group === 'OUTSTANDING' ? estateId || undefined : undefined,
        tenantIds: group === 'SELECTED_TENANTS' ? tenantIds : undefined,
        message,
        type: msgType,
        forceResend,
      }),
    onSuccess: (data) => {
      const resolved = data.recipientsResolved ?? data.messagesQueued ?? '—';
      setResult(
        `Broadcast queued (ref ${String(data.broadcastId || '').slice(-10) || '—'}). Recipients resolved / messages queued: ${resolved}. Status remains queued until delivery is confirmed.`
      );
      setMessage('');
      onQueued();
    },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Unable to queue broadcast.'),
  });

  return (
    <Card sx={{ p: 2 }}>
      <Stack spacing={2} maxWidth={640}>
        {!canReach ? <Alert severity="warning">An internet connection is required for SMS broadcast.</Alert> : null}
        <Alert severity="info">
          ARREARS and OUTSTANDING currently resolve to the same balance-based population on the backend (houses with unpaid/partial RentCharge balance). The UI does not invent a business distinction.
        </Alert>
        {formError ? <Alert severity="error">{formError}</Alert> : null}
        {result ? <Alert severity="info">{result}</Alert> : null}
        <Select value={group} onChange={(e) => setGroup(e.target.value as SmsRecipientGroup)} fullWidth>
          {(Object.keys(GROUP_LABELS) as SmsRecipientGroup[]).map((g) => (
            <MenuItem key={g} value={g}>
              {GROUP_LABELS[g]}
            </MenuItem>
          ))}
        </Select>
        {(group === 'ESTATE' || group === 'ARREARS' || group === 'OUTSTANDING') && (
          <Select displayEmpty value={estateId} onChange={(e) => setEstateId(e.target.value)} fullWidth>
            <MenuItem value="">{group === 'ESTATE' ? 'Select estate (required)' : 'All estates (optional filter)'}</MenuItem>
            {estates?.map((e) => (
              <MenuItem key={e._id} value={e._id}>
                {e.name}
              </MenuItem>
            ))}
          </Select>
        )}
        {group === 'SELECTED_TENANTS' && (
          <TenantMultiSelect selectedIds={tenantIds} onChange={(ids) => setTenantIdsRaw(ids.join(','))} />
        )}
        <Select
          value={msgType}
          onChange={(e) => setMsgType(e.target.value)}
          fullWidth
          displayEmpty
        >
          <MenuItem value="broadcast">General announcement</MenuItem>
          <MenuItem value="rent_reminder">Rent reminder</MenuItem>
          <MenuItem value="billing_notification">Billing / outstanding</MenuItem>
          <MenuItem value="arrears_notice">Arrears warning</MenuItem>
        </Select>
        <TextField label="Message" value={message} onChange={(e) => setMessage(e.target.value)} required multiline minRows={4} fullWidth helperText="Required for general/custom only. Automated campaigns render per-tenant on the server — leave blank." />
        <Typography variant="caption" color="text.secondary">
          Estimated SMS segments (160 chars GSM): {message ? Math.max(1, Math.ceil(message.length / 160)) : 0}
          {group === 'SELECTED_TENANTS' ? ` · selected recipients: ${tenantIds.length}` : ''}
        </Typography>
        <FormControlLabel
          control={<Checkbox checked={forceResend} onChange={(e) => setForceResend(e.target.checked)} />}
          label="Force resend (explicit backend override of notification deduplication)"
        />
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            disabled={!message || previewRun.isPending || !canReach}
            onClick={() => {
              setFormError(null);
              setBroadcastPreview(null);
              previewRun.mutate();
            }}
          >
            {previewRun.isPending ? 'Previewing…' : 'Preview (does not send)'}
          </Button>
          <Button
            variant="contained"
            startIcon={<Send size={16} />}
            disabled={
              !message ||
              broadcast.isPending ||
              !canReach ||
              (group === 'ESTATE' && !estateId) ||
              (group === 'SELECTED_TENANTS' && tenantIds.length === 0)
            }
            onClick={() => {
              setFormError(null);
              setResult(null);
              broadcast.mutate();
            }}
          >
            {!canReach ? 'Offline' : broadcast.isPending ? 'Queueing broadcast…' : 'Confirm & Queue'}
          </Button>
        </Stack>
        {broadcastPreview ? (
          <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, whiteSpace: 'pre-wrap', fontFamily: '"IBM Plex Mono", monospace', fontSize: 13 }}>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Preview only — no SMS was sent
            </Typography>
            {broadcastPreview}
          </Box>
        ) : null}
      </Stack>
    </Card>
  );
}

function PreviewForm() {
  const connectivity = useConnectivity();
  const canReach = connectivity.state === 'online' || connectivity.state === 'syncing' || connectivity.state === 'sync-error';
  const [period, setPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [tenantName, setTenantName] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [template, setTemplate] = useState<'billing_notification' | 'rent_reminder' | 'arrears_notice' | 'payment_confirmation'>('billing_notification');
  const [preview, setPreview] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const run = useMutation({
    mutationFn: () =>
      smsApi.preview({
        template,
        period,
        tenantName: tenantName || undefined,
        houseNumber: houseNumber || undefined,
      }),
    onSuccess: (data) => setPreview(data.message || JSON.stringify(data)),
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Unable to generate preview.'),
  });

  return (
    <Card sx={{ p: 2 }}>
      <Stack spacing={2} maxWidth={640}>
        <Typography variant="body2" color="text.secondary">
          Preview uses backend templates only. It never sends a message.
        </Typography>
        {!canReach ? <Alert severity="warning">Preview requires connectivity to the server.</Alert> : null}
        {formError ? <Alert severity="error">{formError}</Alert> : null}
        <Select value={template} onChange={(e) => setTemplate(e.target.value as typeof template)} fullWidth>
          <MenuItem value="billing_notification">Billing notification</MenuItem>
          <MenuItem value="rent_reminder">Rent reminder</MenuItem>
          <MenuItem value="arrears_notice">Arrears warning</MenuItem>
          <MenuItem value="payment_confirmation">Payment confirmation</MenuItem>
        </Select>
        <TextField label="Period (YYYY-MM)" value={period} onChange={(e) => setPeriod(e.target.value)} />
        <TextField label="Tenant name (optional override)" value={tenantName} onChange={(e) => setTenantName(e.target.value)} />
        <TextField label="House number (optional override)" value={houseNumber} onChange={(e) => setHouseNumber(e.target.value)} />
        <Button
          variant="outlined"
          disabled={run.isPending || !canReach}
          onClick={() => {
            setFormError(null);
            setPreview(null);
            run.mutate();
          }}
        >
          {run.isPending ? 'Generating…' : 'Generate preview'}
        </Button>
        {preview ? (
          <>
            <Divider />
            <Typography variant="subtitle2">Generated message</Typography>
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, whiteSpace: 'pre-wrap', fontFamily: '"IBM Plex Mono", monospace', fontSize: 13 }}>
              {preview}
            </Box>
          </>
        ) : null}
      </Stack>
    </Card>
  );
}


function TenantMultiSelect({ selectedIds, onChange }: { selectedIds: string[]; onChange: (ids: string[]) => void }) {
  const { data: tenants, isLoading } = useQuery({
    queryKey: ['tenants', 'for-sms-select'],
    queryFn: () => tenantsApi.list(),
  });
  const { data: houses } = useQuery({
    queryKey: ['houses', 'for-sms-select'],
    queryFn: () => housesApi.list({ limit: 200 }),
  });
  const houseMap = new Map((houses?.items ?? []).map((h) => [h._id, h.houseNumber]));
  const active = (tenants ?? []).filter((t) => t.status === 'active');

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) onChange(selectedIds.filter((x) => x !== id));
    else onChange([...selectedIds, id]);
  };

  if (isLoading) return <Typography variant="body2">Loading tenants…</Typography>;
  if (!active.length) return <Typography variant="body2" color="text.secondary">No active tenants available.</Typography>;

  return (
    <Box sx={{ maxHeight: 240, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Select tenants by name / house. Internal IDs are sent to the API only.
      </Typography>
      <Stack spacing={0.5}>
        {active.map((t) => (
          <FormControlLabel
            key={t._id}
            control={<Checkbox size="small" checked={selectedIds.includes(t._id)} onChange={() => toggle(t._id)} />}
            label={`${t.name} · ${houseMap.get(t.houseId) ?? 'House'} · ${t.phone}`}
          />
        ))}
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {selectedIds.length} selected
      </Typography>
    </Box>
  );
}
