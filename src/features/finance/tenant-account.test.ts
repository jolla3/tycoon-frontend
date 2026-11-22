import { describe, expect, it } from 'vitest';
import { tenantAccountMetrics } from './tenant-account';
import { UNAVAILABLE } from '@/lib/formatting/currency';

describe('tenant workspace account figures', () => {
  it('keeps received, applied, available credit and outstanding rent distinct', () => {
    const metrics = tenantAccountMetrics({
      receivedCents: 10999400, billedCents: 15000000, appliedToRentCents: 9000000,
      appliedFromCreditCents: 2000000, creditCents: 3000000, outstandingCents: 6000000, netCents: -3000000,
    });
    expect(metrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Total received', value: expect.stringContaining('109,994') }),
      expect.objectContaining({ label: 'Applied to rent', value: expect.stringContaining('90,000') }),
      expect.objectContaining({ label: 'Available credit', value: expect.stringContaining('30,000') }),
      expect.objectContaining({ label: 'Outstanding rent', value: expect.stringContaining('60,000') }),
    ]));
  });
  it('renders null account amounts as unavailable', () => {
    expect(tenantAccountMetrics(null).every((metric) => metric.value === UNAVAILABLE)).toBe(true);
  });
});
