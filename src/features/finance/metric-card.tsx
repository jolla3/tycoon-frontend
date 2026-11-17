import { Card, Skeleton, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { describeKnownArrears } from '@/lib/formatting/balance';
import { UNAVAILABLE } from '@/lib/formatting/currency';

/** A labelled figure with an optional qualifier. Never coerces missing values to zero. */
export function MetricCard({ label, value, caveat, loading = false, minWidth = 160 }: { label: string; value: ReactNode; caveat?: string | null; loading?: boolean; minWidth?: number }) {
  return (
    <Card sx={{ p: 1.5, minWidth }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      {loading ? (
        <Skeleton width={90} />
      ) : (
        <Typography fontWeight={600} component="div">
          {value}
        </Typography>
      )}
      {caveat && !loading ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 220 }}>
          {caveat}
        </Typography>
      ) : null}
    </Card>
  );
}

/**
 * Ledger-derived arrears. Distinguishes unavailable (null/absent), verified, and
 * known-but-unverified (a lower bound). `loadFailed` is shown as unavailable, never as zero.
 */
export function KnownArrearsCard({
  label,
  knownArrearsCents,
  verifiedFullObligation,
  loading = false,
  loadFailed = false,
  minWidth,
}: {
  label: string;
  knownArrearsCents: number | null | undefined;
  verifiedFullObligation: boolean | undefined;
  loading?: boolean;
  loadFailed?: boolean;
  minWidth?: number;
}) {
  if (loadFailed) return <MetricCard label={label} value={UNAVAILABLE} caveat="Could not be loaded." minWidth={minWidth} />;
  const d = describeKnownArrears({ knownArrearsCents, verifiedFullObligation });
  return <MetricCard label={label} value={d.value} caveat={d.caveat} loading={loading} minWidth={minWidth} />;
}
