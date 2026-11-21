'use client';

// AMBIGUOUS state: pick exactly one tenancy among every eligible one (server-paginated, searchable).
// Only eligible tenancies are ever rendered here; the backend revalidates the chosen id on submit.
import { Alert, Box, Button, List, ListItemButton, ListItemText, Stack, TextField, Typography } from '@mui/material';
import type { EligibleSelection, TenancyOption } from '@/lib/api/payments';
import { describeTenancy, pageCount, SEARCH_MAX } from './manual-payment';

export function TenancyChooser(props: {
  eligibleTotal: number;
  selection: EligibleSelection;
  selected: TenancyOption | null;
  search: string;
  loading: boolean;
  period: string;
  fmt: (d: string) => string;
  onSearch: (s: string) => void;
  onPage: (n: number) => void;
  onSelect: (o: TenancyOption) => void;
  onClear: () => void;
}) {
  const { eligibleTotal, selection, selected, search, loading, period, fmt } = props;
  const pages = pageCount(selection.total, selection.limit);
  const onVisiblePage = selected ? selection.items.some((i) => i.tenancyId === selected.tenancyId) : false;
  return (
    <Stack spacing={1.5} data-testid="tenancy-chooser" sx={{ minWidth: 0 }}>
      <Alert severity="info" sx={{ '& .MuiAlert-message': { minWidth: 0 } }}>
        {eligibleTotal} tenancies cover {period}. Choose the one this payment is for.
      </Alert>
      {selected && (
        <Box data-testid="selected-tenancy" sx={{ border: 1, borderColor: 'primary.main', borderRadius: 1, p: 1.5, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary">Selected tenancy</Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{describeTenancy(selected, props.fmt)}</Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
            <Button size="small" onClick={props.onClear}>Clear selection</Button>
            {!onVisiblePage && <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>Not on this page</Typography>}
          </Stack>
        </Box>
      )}
      <TextField
        size="small"
        label="Search tenants by name"
        value={search}
        onChange={(e) => props.onSearch(e.target.value)}
        inputProps={{ maxLength: SEARCH_MAX, 'data-testid': 'tenancy-search' }}
        fullWidth
      />
      <Typography variant="caption" color="text.secondary" data-testid="match-count" aria-live="polite">
        {loading ? 'Loading…' : search.trim() ? `${selection.total} of ${eligibleTotal} match “${search.trim()}”` : `${selection.total} eligible tenancies`}
      </Typography>
      <List dense disablePadding data-testid="tenancy-list" sx={{ border: 1, borderColor: 'divider', borderRadius: 1, opacity: loading ? 0.6 : 1 }}>
        {selection.items.length === 0 && !loading && (
          <ListItemText sx={{ p: 1.5 }} secondary="No eligible tenancy matches this search." />
        )}
        {selection.items.map((o) => (
          <ListItemButton
            key={o.tenancyId}
            selected={selected?.tenancyId === o.tenancyId}
            disabled={loading}
            onClick={() => props.onSelect(o)}
            data-testid="tenancy-option"
            data-tenancy-id={o.tenancyId}
          >
            <ListItemText primary={describeTenancy(o, fmt)} primaryTypographyProps={{ sx: { overflowWrap: 'anywhere' } }} />
          </ListItemButton>
        ))}
      </List>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
        <Button size="small" disabled={loading || selection.page <= 1} onClick={() => props.onPage(selection.page - 1)}>Newer</Button>
        <Typography variant="caption" data-testid="page-indicator">Page {selection.page} of {pages}</Typography>
        <Button size="small" disabled={loading || !selection.hasMore} onClick={() => props.onPage(selection.page + 1)}>Older</Button>
      </Stack>
      {!selected && <Typography variant="caption" color="warning.main">Select a tenancy to enable Record.</Typography>}
    </Stack>
  );
}
