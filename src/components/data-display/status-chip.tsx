import { Chip } from '@mui/material';
import { rentStatusMeta, matchStatusMeta } from '@/lib/formatting/status';
import type { MatchStatus, RentStatus } from '@/types/api';

export function RentStatusChip({ status }: { status: RentStatus }) {
  const meta = rentStatusMeta[status];
  return <Chip size="small" label={meta.label} color={meta.color} variant={meta.color === 'error' ? 'filled' : 'outlined'} />;
}

export function MatchStatusChip({ status }: { status: MatchStatus }) {
  const meta = matchStatusMeta[status];
  return <Chip size="small" label={meta.label} color={meta.color} variant="outlined" />;
}

export type ConnectionStatus = 'pending' | 'connected' | 'failed';

export function ConnectionStatusChip({ status }: { status: ConnectionStatus | string }) {
  const map: Record<ConnectionStatus, { label: string; color: 'warning' | 'success' | 'error' }> = {
    pending: { label: 'Pending', color: 'warning' },
    connected: { label: 'Connected', color: 'success' },
    failed: { label: 'Failed', color: 'error' },
  };
  const meta = map[status as ConnectionStatus] ?? { label: String(status || 'Unknown'), color: 'warning' as const };
  return <Chip size="small" label={meta.label} color={meta.color} variant="outlined" />;
}
