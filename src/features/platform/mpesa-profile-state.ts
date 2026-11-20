// Pure derivation of the distinct M-PESA onboarding states a Superadmin sees.
// The browser NEVER sets capability or operational state; it only displays what the backend
// reports. "Registration accepted" is not "capability verified" is not "operational".
import type { ClientMpesaProfile, MpesaRegistrationState } from '@/lib/api/platform';

export type RegistrationDisplay =
  | 'NOT_REGISTERED' | 'PENDING' | 'FAILED' | 'UNCERTAIN' | 'CONFIRMED';

export function registrationDisplay(state: MpesaRegistrationState): RegistrationDisplay {
  switch (state) {
    case 'NONE': return 'NOT_REGISTERED';
    case 'REQUESTED': return 'PENDING';
    case 'REJECTED': return 'FAILED';
    case 'UNCERTAIN': return 'UNCERTAIN';
    case 'ACCEPTED':
    case 'ALREADY_REGISTERED': return 'CONFIRMED';
    default: return 'NOT_REGISTERED';
  }
}

export const REGISTRATION_LABEL: Record<RegistrationDisplay, string> = {
  NOT_REGISTERED: 'Not registered',
  PENDING: 'Pending',
  FAILED: 'Failed',
  UNCERTAIN: 'Uncertain — reconcile before retrying',
  CONFIRMED: 'Registered (confirmed by provider)',
};

export type OnboardingStage =
  | 'NO_PROFILE' | 'CREATED' | 'NOT_REGISTERED' | 'PENDING' | 'FAILED' | 'UNCERTAIN'
  | 'CONFIRMED' | 'CAPABILITY_VERIFIED' | 'OPERATIONAL';

/** Single headline stage for a profile (null profile = "no profile"). Strictly evidence-driven. */
export function onboardingStage(p: ClientMpesaProfile | null | undefined): OnboardingStage {
  if (!p) return 'NO_PROFILE';
  if (p.operationalState === 'ACTIVE') return 'OPERATIONAL';
  const regs = [registrationDisplay(p.c2bRegistrationState), registrationDisplay(p.pullRegistrationState)];
  if (regs.includes('UNCERTAIN')) return 'UNCERTAIN';
  if (regs.includes('PENDING')) return 'PENDING';
  if (regs.includes('FAILED')) return 'FAILED';
  const verified = p.callbackCapability === 'VERIFIED' || p.pullCapability === 'VERIFIED';
  if (verified) return 'CAPABILITY_VERIFIED';
  if (regs.includes('CONFIRMED')) return 'CONFIRMED';
  const touched = p.c2bRegistrationState !== 'NONE' || p.pullRegistrationState !== 'NONE';
  return touched ? 'NOT_REGISTERED' : 'CREATED';
}

export const STAGE_LABEL: Record<OnboardingStage, string> = {
  NO_PROFILE: 'No profile',
  CREATED: 'Created (draft)',
  NOT_REGISTERED: 'Not registered',
  PENDING: 'Registration pending',
  FAILED: 'Registration failed',
  UNCERTAIN: 'Registration uncertain',
  CONFIRMED: 'Registration confirmed',
  CAPABILITY_VERIFIED: 'Capability verified',
  OPERATIONAL: 'Operational',
};

/** What the registration buttons may do right now. Mirrors backend rules; backend still enforces. */
export function registrationActions(p: ClientMpesaProfile, callbackConfigured: boolean) {
  const c2b = registrationDisplay(p.c2bRegistrationState);
  const pull = registrationDisplay(p.pullRegistrationState);
  const mapped = (p.estates ?? []).some((e) => e.status === 'ACTIVE');
  return {
    canRegisterC2b: callbackConfigured && mapped && (c2b === 'NOT_REGISTERED' || c2b === 'FAILED' || c2b === 'CONFIRMED'),
    // Pull registration is one-time and needs the protected nominated number.
    canRegisterPull: callbackConfigured && mapped && p.pullRegistrationEligible === true && Boolean(p.pullNominatedNumber?.captured) && (pull === 'NOT_REGISTERED' || pull === 'FAILED'),
    pullEligible: p.pullRegistrationEligible === true,
    canSetPullNumber: pull === 'NOT_REGISTERED' || pull === 'FAILED',
    c2bNeedsReconcile: c2b === 'UNCERTAIN' || c2b === 'PENDING',
    pullNeedsReconcile: pull === 'UNCERTAIN' || pull === 'PENDING',
  };
}

/** Client-side Kenyan MSISDN format check (backend normalizes and validates authoritatively). */
export function isPlausibleKenyanMsisdn(raw: string): boolean {
  const n = raw.replace(/[\s()-]/g, '').replace(/^\+/, '');
  return /^(254|0)[17]\d{8}$/.test(n);
}
