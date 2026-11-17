import { Chip } from '@mui/material';
import { rentStatusMeta, matchStatusMeta, processingStateMeta, paymentStatusMeta, paymentOriginMeta } from '@/lib/formatting/status';
import type { MatchStatus, PaymentOrigin, PaymentStatus, RentStatus, TransactionProcessingState } from '@/types/api';

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

export function ProcessingStateChip({ state }: { state: TransactionProcessingState }) {
  const meta = processingStateMeta[state];
  return <Chip size="small" label={meta.label} color={meta.color} variant="outlined" />;
}

/** REVERSED is rendered as a filled error chip so it can never read as collected money. */
export function PaymentStatusChip({ status }: { status: PaymentStatus }) {
  const meta = paymentStatusMeta[status];
  return <Chip size="small" label={meta.label} color={meta.color} variant={status === 'REVERSED' ? 'filled' : 'outlined'} />;
}

export function PaymentOriginChip({ origin }: { origin: PaymentOrigin }) {
  return <Chip size="small" label={paymentOriginMeta[origin]} variant="outlined" />;
}
