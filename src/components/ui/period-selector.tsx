'use client';

// src/components/ui/period-selector.tsx
//
// The ONE PeriodSelector (section 29). Always shows the resolved date
// range next to the preset name — never just "This Month" on its own.

import { Box, MenuItem, Select, Typography, type SelectChangeEvent } from '@mui/material';
import { usePeriod } from '@/features/dashboard/period-context';
import type { PeriodPreset } from '@/lib/dates/period';

const PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This Week' },
  { value: 'last_week', label: 'Last Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'this_year', label: 'This Year' },
];

export function PeriodSelector() {
  const { period, setPreset } = usePeriod();

  function handleChange(e: SelectChangeEvent) {
    setPreset(e.target.value as PeriodPreset);
  }

  return (
    <Box>
      <Select size="small" value={period.preset === 'custom' ? '' : period.preset} onChange={handleChange} displayEmpty sx={{ minWidth: 160, bgcolor: 'background.paper' }}>
        {period.preset === 'custom' && <MenuItem value="">Custom Range</MenuItem>}
        {PRESETS.map((p) => (
          <MenuItem key={p.value} value={p.value}>
            {p.label}
          </MenuItem>
        ))}
      </Select>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
        {period.label}
      </Typography>
    </Box>
  );
}
