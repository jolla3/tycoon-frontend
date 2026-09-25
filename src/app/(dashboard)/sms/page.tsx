'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { dateFormat } from '@/lib/dates/period';
import { ApiError } from '@/lib/api/client';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { useSession } from '@/features/auth/session-context';
import { identityKeyFromUser } from '@/lib/session/local-session-marker';
import { useVisibleEstates } from '@/features/estates/use-visible-estates';
import { useConnectivity } from '@/lib/sync/connectivity';
import { permissions } from '@/lib/permissions/permissions';
import type { SmsMessage } from '@/types/api';

type SmsCampaignType = 'broadcast' | 'billing_notification' | 'arrears_notice' | 'rent_reminder';

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
  SELECTED_TENANTS: 'Selected tenants',
  ARREARS: 'Rent arrears (outstanding balance)',
  OUTSTANDING: 'Outstanding balance',
};

const CAMPAIGN_LABELS: Record<SmsCampaignType, string> = {
  arrears_notice: 'Rent arrears',
  rent_reminder: 'Rent reminder',
  billing_notification: 'Outstanding / billing notice',
  broadcast: 'General announcement / custom message',
};

export default function SmsPage() {
  const [tab, setTab] = useState(0);
  const queryClient = useQueryClient();
  const { user } = useSession();
  const identity = user ? identityKeyFromUser(user) : 'anon';
  const canBroadcast =
    user ? permissions.canManageTenants(user.role) || permissions.canManageEstates(user.role) : false;

  const { data, isLoading, error, freshness, cachedAt } = useCachedQuery(
    `${identity}:sms:history`,
    ['sms', 'history', identity],
    () => smsApi.history()
  );

  const columns: DataTableColumn<SmsMessage>[] = [
    { key: 'phone', header: 'Recipient', render: (m) => m.phoneNumber || '—' },
    {
      key: 'status',
      header: 'Status',
      render: (m) => (
        <Chip size="small" label={m.status} color={STATUS_COLOR[m.status] ?? 'default'} variant="outlined" />
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (m) => m.type || '—',
    },
    {
      key: 'message',
      header: 'Message',
      render: (m) => (
        <Typography variant="body2" sx={{ maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {m.message}
        </Typography>
      ),
    },
    {
      key: 'date',
      header: 'Queued / sent',
      render: (m) => (m.createdAt || m.sentAt ? dateFormat(m.createdAt || m.sentAt!, 'DD MMM, HH:mm') : '—'),
    },
  ];

  return (
    <>
      <PageHeader
        title="SMS"
        description="Send messages, run template campaigns, preview templates, and review delivery history"
      />

      {freshness !== 'live' && (
        <Box sx={{ mb: 1.5 }}>
          <FreshnessBadge freshness={freshness} cachedAt={cachedAt} />
        </Box>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="History" />
        <Tab label="Send one" />
        {canBroadcast ? <Tab label="Campaign" /> : null}
        <Tab label="Preview" />
      </Tabs>

      {tab === 0 && (
        <Card>
          <DataTable
            columns={columns}
            rows={data}
            rowKey={(m) => m._id}
            isLoading={isLoading}
            error={error}
            emptyIcon={MessageSquare}
            emptyTitle="No SMS history"
            emptyDescription="Queued and sent messages appear here."
            renderMobileCard={(m) => (
              <Card variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography fontWeight={600}>{m.phoneNumber || '—'}</Typography>
                  <Chip size="small" label={m.status} color={STATUS_COLOR[m.status] ?? 'default'} variant="outlined" />
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {m.message}
                </Typography>
              </Card>
            )}
          />
        </Card>
      )}

      {tab === 1 && <SendOneForm onQueued={() => queryClient.invalidateQueries({ queryKey: ['sms', 'history'] })} />}

      {tab === 2 && canBroadcast && (
        <BroadcastForm onQueued={() => queryClient.invalidateQueries({ queryKey: ['sms', 'history'] })} />
      )}

      {tab === (canBroadcast ? 3 : 2) && <PreviewForm />}
    </>
  );
}

function SendOneForm({ onQueued }: { onQueued: () => void }) {
  const connectivity = useConnectivity();
  const canReach = connectivity.state === 'online' || connectivity.state === 'syncing' || connectivity.state === 'sync-error';
  const [tenantId, setTenantId] = useState('');
  const [message, setMessage] = useState('');
  const [forceResend, setForceResend] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const { data: tenants } = useQuery({
    queryKey: ['tenants', 'for-sms-one'],
    queryFn: () => tenantsApi.list(),
  });
  const activeTenants = (tenants ?? []).filter((t) => t.status === 'active');

  const send = useMutation({
    mutationFn: () => smsApi.send({ tenantId, message, forceResend }),
    onSuccess: () => {
      setResult('Message queued.');
      setMessage('');
      onQueued();
    },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Unable to queue message.'),
  });

  return (
    <Card sx={{ p: 2 }}>
      <Stack spacing={2} maxWidth={640}>
        {!canReach ? <Alert severity="warning">An internet connection is required to queue SMS.</Alert> : null}
        {formError ? <Alert severity="error">{formError}</Alert> : null}
        {result ? <Alert severity="info">{result}</Alert> : null}
        <Select displayEmpty value={tenantId} onChange={(e) => setTenantId(e.target.value)} fullWidth>
          <MenuItem value="" disabled>
            Select tenant
          </MenuItem>
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
          fullWidth
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
  const [message, setMessage] = useState('');
  const [forceResend, setForceResend] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<SmsCampaignType>('broadcast');
  const [previewText, setPreviewText] = useState<string | null>(null);

  const isTemplateCampaign =
    msgType === 'billing_notification' || msgType === 'arrears_notice' || msgType === 'rent_reminder';

  const tenantIds = useMemo(
    () =>
      tenantIdsRaw
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    [tenantIdsRaw]
  );

  const broadcast = useMutation({
    mutationFn: () =>
      smsApi.broadcast({
        recipientGroup: group,
        estateId:
          group === 'ESTATE' || group === 'ARREARS' || group === 'OUTSTANDING'
            ? estateId || undefined
            : undefined,
        tenantIds: group === 'SELECTED_TENANTS' ? tenantIds : undefined,
        message: isTemplateCampaign ? message || undefined : message,
        type: msgType,
        forceResend,
      }),
    onSuccess: (data) => {
      const resolved = data.recipientsResolved ?? data.messagesQueued ?? '—';
      setResult(
        `Campaign queued (ref ${String(data.broadcastId || '').slice(-10) || '—'}). Recipients resolved / messages queued: ${resolved}. Status remains queued until delivery is confirmed.`
      );
      setMessage('');
      setPreviewText(null);
      onQueued();
    },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Unable to queue campaign.'),
  });

  const previewRun = useMutation({
    mutationFn: () =>
      smsApi.preview({
        template:
          msgType === 'broadcast'
            ? 'billing_notification'
            : (msgType as 'rent_reminder' | 'billing_notification' | 'arrears_notice'),
      }),
    onSuccess: (data) => {
      setPreviewText(
        `Campaign: ${CAMPAIGN_LABELS[msgType]}\nRecipient group: ${GROUP_LABELS[group]}\n---\n${data.message || JSON.stringify(data)}\n---\nPreview does not send SMS.`
      );
    },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Unable to generate preview.'),
  });

  const canQueue =
    (isTemplateCampaign || Boolean(message.trim())) &&
    !broadcast.isPending &&
    canReach &&
    !(group === 'ESTATE' && !estateId) &&
    !(group === 'SELECTED_TENANTS' && tenantIds.length === 0);

  return (
    <Card sx={{ p: 2 }}>
      <Stack spacing={2} maxWidth={640}>
        {!canReach ? (
          <Alert severity="warning">An internet connection is required for SMS campaigns.</Alert>
        ) : null}
        <Alert severity="info">
          Automated campaigns (arrears, reminder, billing) use server templates and do not require a manual message.
          Custom / general announcements require message text. Preview never sends.
        </Alert>
        {formError ? <Alert severity="error">{formError}</Alert> : null}
        {result ? <Alert severity="info">{result}</Alert> : null}

        <Typography variant="subtitle2">Campaign type</Typography>
        <Select
          value={msgType}
          onChange={(e) => setMsgType(e.target.value as SmsCampaignType)}
          fullWidth
          displayEmpty
        >
          {(Object.keys(CAMPAIGN_LABELS) as SmsCampaignType[]).map((key) => (
            <MenuItem key={key} value={key}>
              {CAMPAIGN_LABELS[key]}
            </MenuItem>
          ))}
        </Select>

        <Typography variant="subtitle2">Recipients</Typography>
        <Select
          value={group}
          onChange={(e) => setGroup(e.target.value as SmsRecipientGroup)}
          fullWidth
        >
          {(Object.keys(GROUP_LABELS) as SmsRecipientGroup[]).map((g) => (
            <MenuItem key={g} value={g}>
              {GROUP_LABELS[g]}
            </MenuItem>
          ))}
        </Select>

        {(group === 'ESTATE' || group === 'ARREARS' || group === 'OUTSTANDING') && (
          <Select displayEmpty value={estateId} onChange={(e) => setEstateId(e.target.value)} fullWidth>
            <MenuItem value="">
              {group === 'ESTATE' ? 'Select estate (required)' : 'All estates (optional filter)'}
            </MenuItem>
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

        <TextField
          label={isTemplateCampaign ? 'Message (optional — server renders template)' : 'Message'}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required={!isTemplateCampaign}
          multiline
          minRows={4}
          fullWidth
          helperText={
            isTemplateCampaign
              ? 'Leave blank for automated campaigns; the backend renders the template per tenant.'
              : 'Required for general / custom announcements.'
          }
        />

        <FormControlLabel
          control={<Checkbox checked={forceResend} onChange={(e) => setForceResend(e.target.checked)} />}
          label="Force resend (explicit backend override of notification deduplication)"
        />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button
            variant="outlined"
            disabled={previewRun.isPending || !canReach}
            onClick={() => {
              setFormError(null);
              setPreviewText(null);
              previewRun.mutate();
            }}
          >
            {previewRun.isPending ? 'Previewing…' : 'Preview (does not send)'}
          </Button>
          <Button
            variant="contained"
            startIcon={<Send size={16} />}
            disabled={!canQueue}
            onClick={() => {
              setFormError(null);
              setResult(null);
              broadcast.mutate();
            }}
          >
            {!canReach ? 'Offline' : broadcast.isPending ? 'Queueing…' : 'Confirm & Queue'}
          </Button>
        </Stack>

        {previewText ? (
          <Box
            sx={{
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 1,
              whiteSpace: 'pre-wrap',
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 13,
            }}
          >
            {previewText}
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
  const [template, setTemplate] = useState<'billing_notification' | 'rent_reminder' | 'arrears_notice'>(
    'billing_notification'
  );
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
        <Select
          value={template}
          onChange={(e) =>
            setTemplate(e.target.value as 'billing_notification' | 'rent_reminder' | 'arrears_notice')
          }
          fullWidth
        >
          <MenuItem value="billing_notification">Billing notification</MenuItem>
          <MenuItem value="rent_reminder">Rent reminder</MenuItem>
          <MenuItem value="arrears_notice">Arrears notice</MenuItem>
        </Select>
        <TextField label="Period (YYYY-MM)" value={period} onChange={(e) => setPeriod(e.target.value)} fullWidth />
        <TextField
          label="Tenant name (optional override)"
          value={tenantName}
          onChange={(e) => setTenantName(e.target.value)}
          fullWidth
        />
        <TextField
          label="House number (optional override)"
          value={houseNumber}
          onChange={(e) => setHouseNumber(e.target.value)}
          fullWidth
        />
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
            <Box
              sx={{
                p: 2,
                bgcolor: 'grey.50',
                borderRadius: 1,
                whiteSpace: 'pre-wrap',
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 13,
              }}
            >
              {preview}
            </Box>
          </>
        ) : null}
      </Stack>
    </Card>
  );
}

function TenantMultiSelect({
  selectedIds,
  onChange,
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
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
  if (!active.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        No active tenants available.
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        maxHeight: 240,
        overflow: 'auto',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        p: 1,
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Select tenants by name / house. Internal IDs are sent to the API only.
      </Typography>
      <Stack spacing={0.5}>
        {active.map((t) => (
          <FormControlLabel
            key={t._id}
            control={
              <Checkbox size="small" checked={selectedIds.includes(t._id)} onChange={() => toggle(t._id)} />
            }
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
