import { Box, Chip, Stack, Typography } from '@mui/material';
import { dateFormat } from '@/lib/dates/period';

// Renders loosely documented backend evidence objects (integration summaries,
// health sections, distributions) WITHOUT guessing their field names. Anything
// that looks like secret material is never rendered, even if a future backend
// change were to include it.
const HIDDEN_KEY = /(secret|password|ciphertext|credential|accessToken|refreshToken|apiKey|rawPayload|claimToken)/i;
const ISO = /^\d{4}-\d{2}-\d{2}T/;

function label(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

function Scalar({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === '') return <Typography variant="body2" color="text.secondary">Not reported</Typography>;
  if (typeof value === 'boolean') return <Chip size="small" variant="outlined" color={value ? 'success' : 'default'} label={value ? 'Yes' : 'No'} />;
  if (typeof value === 'number') return <Typography variant="body2">{value.toLocaleString('en-KE')}</Typography>;
  const s = String(value);
  if (ISO.test(s)) return <Typography variant="body2">{dateFormat(s, 'DD MMM YYYY HH:mm')}</Typography>;
  return <Typography variant="body2">{s}</Typography>;
}

export function EvidenceView({ data, depth = 0 }: { data: unknown; depth?: number }) {
  if (data === null || data === undefined) return <Typography variant="body2" color="text.secondary">Not reported</Typography>;
  if (Array.isArray(data)) {
    if (data.length === 0) return <Typography variant="body2" color="text.secondary">None</Typography>;
    if (data.every((d) => d === null || typeof d !== 'object')) {
      return (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {data.map((d, i) => (
            <Chip key={i} size="small" variant="outlined" label={String(d)} />
          ))}
        </Stack>
      );
    }
    return (
      <Stack spacing={1}>
        {data.map((d, i) => (
          <Box key={i} sx={{ pl: 1.5, borderLeft: 2, borderColor: 'divider' }}>
            <EvidenceView data={d} depth={depth + 1} />
          </Box>
        ))}
      </Stack>
    );
  }
  if (typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>).filter(([k]) => !HIDDEN_KEY.test(k));
    if (entries.length === 0) return <Typography variant="body2" color="text.secondary">No data reported</Typography>;
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'minmax(140px, 220px) 1fr' }, columnGap: 2, rowGap: depth === 0 ? 1 : 0.75 }}>
        {entries.map(([k, v]) => (
          <Box key={k} sx={{ display: 'contents' }}>
            <Typography variant="body2" color="text.secondary" sx={{ pt: 0.25 }}>
              {label(k)}
            </Typography>
            <Box sx={{ minWidth: 0, mb: { xs: 1, sm: 0 } }}>
              <EvidenceView data={v} depth={depth + 1} />
            </Box>
          </Box>
        ))}
      </Box>
    );
  }
  return <Scalar value={data} />;
}
