'use client';

// Five connectivity states + explicit data freshness is NOT implied as live.

import { useState } from 'react';
import { Chip, Popover, Box, Typography, Stack, Button, Divider } from '@mui/material';
import { Wifi, WifiOff, AlertTriangle, RefreshCw, CloudOff } from 'lucide-react';
import { useConnectivity, type ConnectivityState } from '@/lib/sync/connectivity';
import { dateFormat } from '@/lib/dates/period';

const META: Record<ConnectivityState, { label: string; color: 'success' | 'warning' | 'error' | 'info'; icon: typeof Wifi }> = {
  online: { label: 'Online', color: 'success', icon: Wifi },
  offline: { label: 'Offline', color: 'error', icon: WifiOff },
  degraded: { label: 'Degraded', color: 'warning', icon: AlertTriangle },
  syncing: { label: 'Syncing', color: 'info', icon: RefreshCw },
  'sync-error': { label: 'Sync Error', color: 'warning', icon: CloudOff },
};

export function ConnectionStatus() {
  const connectivity = useConnectivity();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const meta = META[connectivity.state];
  const Icon = meta.icon;

  return (
    <>
      <Chip
        size="small"
        icon={<Icon size={14} />}
        label={
          connectivity.pendingSyncCount > 0 && connectivity.state !== 'offline'
            ? `Syncing ${connectivity.pendingSyncCount}`
            : meta.label
        }
        color={meta.color}
        variant="outlined"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{ fontFamily: '"IBM Plex Mono", monospace', cursor: 'pointer' }}
      />
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ p: 2, width: 280 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Connection
          </Typography>
          <Stack spacing={1}>
            <Row label="Status" value={meta.label} />
            <Row label="Pending changes" value={String(connectivity.pendingSyncCount)} />
            {connectivity.permanentlyFailedCount > 0 && (
              <Row label="Failed after retries" value={String(connectivity.permanentlyFailedCount)} />
            )}
            <Row
              label="Last successful sync"
              value={connectivity.lastSyncedAt ? dateFormat(connectivity.lastSyncedAt, 'HH:mm:ss') : '—'}
            />
          </Stack>
          <Divider sx={{ my: 1.5 }} />
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
            Data freshness is shown per screen (Live / Cached / Stale). Connection status does not mean cached data is live.
          </Typography>
          {connectivity.state === 'offline' && (
            <Typography variant="caption" color="text.secondary" display="block">
              Financial actions require an internet connection. Previously synchronized information may still be available.
            </Typography>
          )}
          {connectivity.lastSyncError && (
            <>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="caption" color="warning.main">
                {connectivity.lastSyncError}
              </Typography>
            </>
          )}
          {connectivity.permanentlyFailedCount > 0 ? (
            <Button
              size="small"
              fullWidth
              sx={{ mt: 1.5 }}
              onClick={connectivity.retryFailed}
              disabled={connectivity.state === 'syncing' || connectivity.state === 'offline'}
            >
              {connectivity.state === 'syncing' ? 'Retrying…' : `Retry ${connectivity.permanentlyFailedCount} failed change(s)`}
            </Button>
          ) : (
            connectivity.pendingSyncCount > 0 && (
              <Button
                size="small"
                fullWidth
                sx={{ mt: 1.5 }}
                onClick={connectivity.retrySync}
                disabled={connectivity.state === 'syncing' || connectivity.state === 'offline'}
              >
                {connectivity.state === 'syncing' ? 'Syncing…' : 'Retry now'}
              </Button>
            )
          )}
        </Box>
      </Popover>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between">
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="caption" fontWeight={600}>
        {value}
      </Typography>
    </Stack>
  );
}
