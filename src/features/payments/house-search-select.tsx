'use client';

// Server-side house search for the manual-payment dialog. Replaces the first-100 list.
// No status filter: a payment may be for a historic tenancy on a house that is vacant today.
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Autocomplete, TextField } from '@mui/material';
import { housesApi } from '@/lib/api/houses';
import type { House } from '@/types/api';

export function houseOptionLabel(h: Pick<House, 'houseNumber' | 'status' | 'tenant'>): string {
  const who = h.tenant?.name ? ` · ${h.tenant.name}` : h.status === 'vacant' ? ' · vacant' : '';
  return `${h.houseNumber}${who}`;
}

export function HouseSearchSelect({ value, onChange }: { value: House | null; onChange: (h: House | null) => void }) {
  const [input, setInput] = useState('');
  const [term, setTerm] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setTerm(input.trim()), 300);
    return () => clearTimeout(t);
  }, [input]);
  const { data, isFetching } = useQuery({
    queryKey: ['payments', 'house-search', term],
    queryFn: () => housesApi.list({ search: term || undefined, limit: 20 }),
    staleTime: 15_000,
  });
  const items = data?.items ?? [];
  // Keep the chosen house selectable even when it is not in the current result page.
  const options = value && !items.some((h) => h._id === value._id) ? [value, ...items] : items;
  const total = data?.pagination?.total ?? 0;
  return (
    <Autocomplete
      fullWidth
      options={options}
      value={value}
      loading={isFetching}
      filterOptions={(o) => o} // filtering is done by the server
      getOptionLabel={houseOptionLabel}
      isOptionEqualToValue={(a, b) => a._id === b._id}
      onChange={(_, v) => onChange(v)}
      onInputChange={(_, v, reason) => { if (reason === 'input') setInput(v); }}
      noOptionsText={term ? 'No house matches that search' : 'Type a house number'}
      renderInput={(params) => (
        <TextField {...params} label="House" placeholder="Search house number"
          helperText={total > items.length ? `Showing ${items.length} of ${total}. Keep typing to narrow.` : undefined} />
      )}
    />
  );
}
