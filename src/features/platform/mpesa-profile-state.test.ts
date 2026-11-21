import { describe, expect, it } from 'vitest';
import type { ClientMpesaProfile } from '@/lib/api/platform';
import { isPlausibleKenyanMsisdn, onboardingStage, registrationActions, registrationDisplay } from './mpesa-profile-state';

const base = (over: Partial<ClientMpesaProfile> = {}): ClientMpesaProfile => ({
  id: 'p', clientId: 'c', estateId: null, displayName: null, merchantType: 'PAYBILL', businessShortCode: '600123',
  operationalState: 'DRAFT', callbackCapability: 'UNKNOWN', pullCapability: 'UNKNOWN',
  c2bRegistrationState: 'NONE', pullRegistrationState: 'NONE', lastPullRegisteredAt: null,
  estates: [{ estateId: 'e1', status: 'ACTIVE' }], pullNominatedNumber: { captured: false, masked: null }, ...over,
});

describe('onboardingStage', () => {
  it('distinguishes every state without upgrading evidence', () => {
    expect(onboardingStage(null)).toBe('NO_PROFILE');
    expect(onboardingStage(base())).toBe('CREATED');
    expect(onboardingStage(base({ c2bRegistrationState: 'REQUESTED' }))).toBe('PENDING');
    expect(onboardingStage(base({ c2bRegistrationState: 'REJECTED' }))).toBe('FAILED');
    expect(onboardingStage(base({ c2bRegistrationState: 'UNCERTAIN' }))).toBe('UNCERTAIN');
    expect(onboardingStage(base({ c2bRegistrationState: 'ACCEPTED' }))).toBe('CONFIRMED');
    expect(onboardingStage(base({ c2bRegistrationState: 'ACCEPTED', callbackCapability: 'VERIFIED' }))).toBe('CAPABILITY_VERIFIED');
    expect(onboardingStage(base({ operationalState: 'ACTIVE' }))).toBe('OPERATIONAL');
  });
  it('registration accepted is never reported as verified or operational', () => {
    const s = onboardingStage(base({ c2bRegistrationState: 'ALREADY_REGISTERED', pullRegistrationState: 'ACCEPTED' }));
    expect(s).toBe('CONFIRMED');
  });
  it('an uncertain registration outranks a confirmed one', () => {
    expect(onboardingStage(base({ c2bRegistrationState: 'ACCEPTED', pullRegistrationState: 'UNCERTAIN' }))).toBe('UNCERTAIN');
  });
  it('maps provider registration states to display states', () => {
    expect(registrationDisplay('ALREADY_REGISTERED')).toBe('CONFIRMED');
    expect(registrationDisplay('NONE')).toBe('NOT_REGISTERED');
  });
});

describe('registrationActions', () => {
  it('blocks registration without callback config or an active estate mapping', () => {
    expect(registrationActions(base(), false).canRegisterC2b).toBe(false);
    expect(registrationActions(base({ estates: [{ estateId: 'e1', status: 'INACTIVE' }] }), true).canRegisterC2b).toBe(false);
    expect(registrationActions(base(), true).canRegisterC2b).toBe(true);
  });
  it('Pull needs the protected number and is one-time', () => {
    expect(registrationActions(base(), true).canRegisterPull).toBe(false);
    const withNumber = base({ pullNominatedNumber: { captured: true, masked: '2547*****678' }, pullRegistrationEligible: true });
    expect(registrationActions(withNumber, true).canRegisterPull).toBe(true);
    // Fail closed: number captured but merchant-type eligibility unverified => never offered.
    expect(registrationActions({ ...withNumber, pullRegistrationEligible: false }, true).canRegisterPull).toBe(false);
    expect(registrationActions({ ...withNumber, pullRegistrationEligible: undefined }, true).canRegisterPull).toBe(false);
    expect(registrationActions({ ...withNumber, pullRegistrationState: 'ACCEPTED' }, true).canRegisterPull).toBe(false);
    expect(registrationActions({ ...withNumber, pullRegistrationState: 'ACCEPTED' }, true).canSetPullNumber).toBe(false);
  });
  it('uncertain/pending registrations require reconciliation, not retry', () => {
    const a = registrationActions(base({ c2bRegistrationState: 'UNCERTAIN' }), true);
    expect(a.c2bNeedsReconcile).toBe(true);
    expect(a.canRegisterC2b).toBe(false);
  });
});

describe('isPlausibleKenyanMsisdn', () => {
  it('accepts common Safaricom formats only', () => {
    expect(isPlausibleKenyanMsisdn('0712 345 678')).toBe(true);
    expect(isPlausibleKenyanMsisdn('+254112345678')).toBe(true);
    expect(isPlausibleKenyanMsisdn('12345')).toBe(false);
    expect(isPlausibleKenyanMsisdn('254212345678')).toBe(false);
  });
});
