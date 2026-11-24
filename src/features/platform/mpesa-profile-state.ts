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
  | 'CONFIRMED' | 'CAPABILITY_VERIFIED' | 'NOT_READY' | 'SUSPENDED' | 'OPERATIONAL';

/**
 * Single headline stage for the C2B collection path (null profile = "no profile"). Strictly
 * evidence-driven and C2B-only: Pull registration/capability can neither fail nor advance it.
 */
export function onboardingStage(p: ClientMpesaProfile | null | undefined): OnboardingStage {
  if (!p) return 'NO_PROFILE';
  if (p.operationalState === 'ACTIVE') return 'OPERATIONAL';
  if (p.operationalState === 'SUSPENDED') return 'SUSPENDED';
  const c2b = registrationDisplay(p.c2bRegistrationState);
  if (c2b === 'UNCERTAIN') return 'UNCERTAIN';
  if (c2b === 'PENDING') return 'PENDING';
  if (c2b === 'FAILED') return 'FAILED';
  if (p.operationalState === 'NOT_READY') return 'NOT_READY';
  if (p.callbackCapability === 'VERIFIED') return 'CAPABILITY_VERIFIED';
  if (c2b === 'CONFIRMED') return 'CONFIRMED';
  return p.c2bRegistrationState !== 'NONE' ? 'NOT_REGISTERED' : 'CREATED';
}

export const STAGE_LABEL: Record<OnboardingStage, string> = {
  NO_PROFILE: 'No profile',
  CREATED: 'Created (draft)',
  NOT_REGISTERED: 'C2B not registered',
  PENDING: 'C2B registration pending',
  FAILED: 'C2B registration failed',
  UNCERTAIN: 'C2B registration uncertain',
  CONFIRMED: 'C2B registration accepted (callbacks not verified)',
  CAPABILITY_VERIFIED: 'Callbacks verified (not active)',
  NOT_READY: 'Setup incomplete',
  SUSPENDED: 'Suspended',
  OPERATIONAL: 'Active',
};

export type OperationalState = ClientMpesaProfile['operationalState'];

export const OPERATIONAL_LABEL: Record<OperationalState, string> = {
  DRAFT: 'Draft',
  NOT_READY: 'Not ready',
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
};

export const OPERATIONAL_MEANING: Record<OperationalState, string> = {
  DRAFT: 'The profile exists, but onboarding and readiness have not been established.',
  NOT_READY: 'Setup was attempted, but required C2B conditions are still incomplete.',
  ACTIVE: 'The C2B collection path passed its readiness checks. This does not by itself authorize automatic rent posting, which is gated separately.',
  SUSPENDED: 'An operator deliberately suspended this merchant profile.',
};

export function operationalTone(s: OperationalState): 'default' | 'warning' | 'success' | 'error' {
  return s === 'ACTIVE' ? 'success' : s === 'SUSPENDED' ? 'error' : s === 'NOT_READY' ? 'warning' : 'default';
}

export const CALLBACK_LABEL: Record<string, string> = {
  UNKNOWN: 'Unknown — no verified callback delivery and trust evidence yet',
  NOT_ENABLED: 'Not enabled',
  VERIFIED: 'Verified',
};

export const PULL_CAPABILITY_LABEL: Record<string, string> = {
  UNKNOWN: 'Unknown (optional)',
  NOT_ENABLED: 'Not enabled (optional)',
  VERIFIED: 'Verified (optional)',
};

const BLOCKER_TEXT: Record<string, string> = {
  CALLBACK_UNKNOWN: 'Callback delivery and trust have not been verified. Registration alone does not establish this, and it cannot be set from this page.',
  CALLBACK_NOT_ENABLED: 'Callbacks are not enabled for this merchant.',
  NO_ACTIVE_ESTATE_MAPPING: 'No active estate of this client is mapped to this shortcode.',
  CLIENT_INACTIVE: 'This client is inactive. Activate the client before activating or resuming its M-PESA merchant profile.',
  CALLBACK_CONFIG_UNAVAILABLE: 'The platform callback configuration is unavailable, so registration cannot be checked.',
  C2B_REGISTRATION_EVIDENCE_MISSING: 'The C2B registration has no recorded configuration evidence. Register the C2B URLs again.',
  C2B_REGISTRATION_IDENTITY_EVIDENCE_MISSING: 'The C2B registration has no recorded shortcode or merchant type proof, so it cannot be matched to this merchant. It was not back-filled; register the C2B URLs again.',
  C2B_REGISTRATION_ENVIRONMENT_MISMATCH: 'The C2B registration was made for a different Daraja environment than the current one.',
  C2B_REGISTRATION_STALE_CONFIG: 'The C2B registration was made against an older callback configuration. Register the C2B URLs again.',
  C2B_REGISTRATION_MERCHANT_MISMATCH: 'The C2B registration evidence does not match this merchant\'s shortcode or type.',
  ALREADY_ACTIVE: 'The profile is already active.',
  SUSPENDED_USE_RESUME: 'The profile is suspended. Use Resume instead.',
};

const STATE_TEXT: Record<string, string> = {
  DRAFT: 'draft', NOT_READY: 'not ready', ACTIVE: 'active', SUSPENDED: 'suspended',
};

/** Human text for a backend blocker/advisory code. Unknown codes are shown verbatim, never hidden. */
export function blockerText(code: string): string {
  if (BLOCKER_TEXT[code]) return BLOCKER_TEXT[code];
  let m = /^C2B_REGISTRATION_(\w+)$/.exec(code);
  if (m) return `C2B URL registration is ${registrationWord(m[1]!)}.`;
  m = /^PULL_REGISTRATION_(\w+)$/.exec(code);
  if (m) return `Pull registration is ${registrationWord(m[1]!)}. Pull is optional.`;
  m = /^PULL_(\w+)$/.exec(code);
  if (m) return `Pull capability is ${m[1]!.toLowerCase().replace('_', ' ')}. Pull is optional and does not affect C2B.`;
  m = /^OPERATIONAL_STATE_(\w+)$/.exec(code);
  if (m) return `The profile is ${STATE_TEXT[m[1]!] ?? m[1]!.toLowerCase()}, which does not allow this action.`;
  m = /^CALLBACK_(\w+)$/.exec(code);
  if (m) return `Callback capability is ${m[1]!.toLowerCase().replace('_', ' ')}.`;
  return code;
}

function registrationWord(state: string): string {
  switch (state) {
    case 'NONE': return 'not registered';
    case 'REQUESTED': return 'pending';
    case 'REJECTED': return 'rejected';
    case 'UNCERTAIN': return 'uncertain (reconcile first)';
    default: return state.toLowerCase().replace('_', ' ');
  }
}

export type LifecycleAction = 'activate' | 'suspend' | 'resume';

/**
 * Which lifecycle control applies to the current operational state, and whether the BACKEND says it
 * is available. Nothing here decides eligibility: `enabled` and `blockers` come from
 * `lifecycleAvailability`. If the backend did not report availability, the control stays disabled.
 */
export function lifecycleControl(p: ClientMpesaProfile): {
  action: LifecycleAction | null;
  enabled: boolean;
  blockers: string[];
  revision: number | null;
  reported: boolean;
} {
  const a = p.lifecycleAvailability;
  const action: LifecycleAction | null =
    p.operationalState === 'ACTIVE' ? 'suspend'
      : p.operationalState === 'SUSPENDED' ? 'resume'
        : p.operationalState === 'DRAFT' || p.operationalState === 'NOT_READY' ? 'activate' : null;
  if (!a || !action) return { action, enabled: false, blockers: [], revision: null, reported: false };
  const enabled = action === 'activate' ? a.canActivate : action === 'suspend' ? a.canSuspend : a.canResume;
  const blockers = action === 'activate' ? a.activationBlockers : action === 'resume' ? a.resumeBlockers : [];
  return { action, enabled, blockers, revision: a.revision, reported: true };
}

/** What the registration buttons may do right now. Mirrors backend rules; backend still enforces. */
export function registrationActions(p: ClientMpesaProfile, callbackConfigured: boolean) {
  const c2b = registrationDisplay(p.c2bRegistrationState);
  const pull = registrationDisplay(p.pullRegistrationState);
  const mapped = (p.estates ?? []).some((e) => e.status === 'ACTIVE' && e.eligible === true);
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
