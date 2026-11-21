import { describe, expect, it } from 'vitest';
import { classifyDepositConflict, resolveActionTenancyId, tenancyLabel, type EligibleTenancy } from './deposit-state';

const t = (id: string): EligibleTenancy => ({ tenancyId: id, estateId: 'e', estateName: 'Palm', houseId: 'h', houseNumber: 'A1', startAt: null, status: 'ACTIVE' });

describe('classifyDepositConflict', () => {
  it('maps the locked requirement with server values', () => {
    const c = classifyDepositConflict({ status: 409, code: 'DEPOSIT_REQUIREMENT_LOCKED', details: { requiredCents: 1000, requestedCents: 2000, paidCents: 500 } });
    expect(c).toEqual({ kind: 'requirement_locked', details: { requiredCents: 1000, requestedCents: 2000, paidCents: 500 } });
  });
  it('tolerates missing details', () => {
    expect(classifyDepositConflict({ status: 409, code: 'DEPOSIT_REQUIREMENT_LOCKED' })).toEqual({ kind: 'requirement_locked', details: null });
  });
  it('maps ambiguity and ineligibility; ignores other statuses/codes', () => {
    expect(classifyDepositConflict({ status: 409, code: 'DEPOSIT_TENANCY_AMBIGUOUS' })?.kind).toBe('tenancy_ambiguous');
    expect(classifyDepositConflict({ status: 409, code: 'TENANCY_NOT_ELIGIBLE' })?.kind).toBe('tenancy_not_eligible');
    expect(classifyDepositConflict({ status: 409, code: 'CONFLICT' })).toBeNull();
    expect(classifyDepositConflict({ status: 422, code: 'DEPOSIT_REQUIREMENT_LOCKED' })).toBeNull();
    expect(classifyDepositConflict(null)).toBeNull();
  });
});

describe('resolveActionTenancyId', () => {
  const choices = [t('a'), t('b')];
  it('never guesses when ambiguous and nothing chosen', () => {
    expect(resolveActionTenancyId({ ambiguous: true, selectedTenancyId: null, activeTenancyId: null, choices })).toBeNull();
  });
  it('uses the explicit choice', () => {
    expect(resolveActionTenancyId({ ambiguous: true, selectedTenancyId: 'b', activeTenancyId: null, choices })).toBe('b');
  });
  it('ignores a stale choice that is no longer eligible', () => {
    expect(resolveActionTenancyId({ ambiguous: true, selectedTenancyId: 'zzz', activeTenancyId: null, choices })).toBeNull();
  });
  it('single tenancy uses the server-resolved id', () => {
    expect(resolveActionTenancyId({ ambiguous: false, selectedTenancyId: null, activeTenancyId: 'only', choices: [] })).toBe('only');
  });
});

describe('tenancyLabel', () => {
  it('names estate and house', () => expect(tenancyLabel(t('a'))).toBe('Palm · House A1'));
});
