import { describe, expect, it } from 'vitest';
import { allocationLabel, allocationReasonText, isRentPosted } from './allocation-state';

describe('allocation state display', () => {
  it('labels states and never equates allocation with posting', () => {
    expect(allocationLabel('UNALLOCATED')).toBe('Unallocated');
    expect(allocationLabel('ALLOCATED_BY_REFERENCE')).toBe('Allocated by reference');
    expect(isRentPosted({ postingState: 'NOT_POSTED' })).toBe(false);
    expect(isRentPosted({ postingState: 'POSTED' })).toBe(true);
  });
  it('explains reasons and hides unknown internals', () => {
    expect(allocationReasonText('reference_retired')).toMatch(/closed tenancy/);
    expect(allocationReasonText('something_internal')).toBe('Needs review');
    expect(allocationReasonText(null)).toBeNull();
  });
});
