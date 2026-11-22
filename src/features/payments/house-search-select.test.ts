import { describe, expect, it } from 'vitest';
import { houseOptionLabel } from './house-search-select';

describe('houseOptionLabel', () => {
  it('shows the tenant when present; the label is only the house number otherwise (occupied-only selector)', () => {
    expect(houseOptionLabel({ houseNumber: 'A1', status: 'occupied', tenant: { _id: 't', name: 'Amina' } })).toBe('A1 · Amina');
    expect(houseOptionLabel({ houseNumber: 'B2', status: 'vacant', tenant: null })).toBe('B2');
    expect(houseOptionLabel({ houseNumber: 'C3', status: 'occupied', tenant: null })).toBe('C3');
  });
});
