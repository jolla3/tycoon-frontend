'use client';

// Server-side house search for ordinary manual payment.
// Only active, currently occupied houses are offered as payment destinations.
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Autocomplete, TextField } from '@mui/material';
import { housesApi } from '@/lib/api/houses';
import type { House } from '@/types/api';

export function houseOptionLabel(h: Pick<House, 'houseNumber' | 'status' | 'tenant'>): string {
  const who = h.tenant?.name ? ` · ${h.tenant.name}` : '';
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
    queryKey: ['payments', 'house-search', 'occupied', term],
    queryFn: () => housesApi.list({ search: term || undefined, status: 'occupied', limit: 20 }),
    staleTime: 15_000,
  });
  const items = data?.items ?? [];
  const options = value && !items.some((h) => h._id === value._id) ? [value, ...items] : items;
  const total = data?.pagination?.total ?? 0;
  return (
    <Autocomplete
      fullWidth
      options={options}
      value={value}
      loading={isFetching}
      filterOptions={(o) => o}
      getOptionLabel={houseOptionLabel}
      isOptionEqualToValue={(a, b) => a._id === b._id}
      onChange={(_, v) => onChange(v)}
      onInputChange={(_, v, reason) => { if (reason === 'input') setInput(v); }}
      noOptionsText={term ? 'No occupied house matches that search' : 'Type a house number'}
      renderInput={(params) => (
        <TextField {...params} label="House" placeholder="Search occupied house"
          helperText={total > items.length ? `Showing ${items.length} of ${total}. Keep typing to narrow.` : 'Only currently occupied houses can receive ordinary payments.'} />
      )}
    />
  );
}
