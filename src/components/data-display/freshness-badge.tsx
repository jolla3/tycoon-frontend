import { Chip } from '@mui/material';
import { dateFormat } from '@/lib/dates/period';
import type { DataFreshness } from '@/hooks/use-cached-query';

// Section 13: financial/report data shown from cache must never look
// visually identical to live data. This is the one shared way that
// distinction is rendered — do not invent a second status system per page.
export function FreshnessBadge({ freshness, cachedAt }: { freshness: DataFreshness; cachedAt: string | null }) {
  if (freshness === 'live') return null; // the normal case — no badge needed when data is simply current
  if (freshness === 'refreshing') return <Chip size="small" label="Refreshing…" color="info" variant="outlined" />;
  if (freshness === 'cached') return <Chip size="small" label={`Cached${cachedAt ? ` · ${dateFormat(cachedAt, 'HH:mm')}` : ''}`} color="default" variant="outlined" />;
  if (freshness === 'stale') return <Chip size="small" label={`Stale${cachedAt ? ` · since ${dateFormat(cachedAt, 'DD MMM, HH:mm')}` : ''}`} color="warning" variant="outlined" />;
  return null;
}
