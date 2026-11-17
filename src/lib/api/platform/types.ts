// src/lib/api/platform/types.ts
//
// DTOs for /api/v1/platform/* (SUPER_ADMIN only). Field names come from
// docs/FRONTEND_ENDPOINT_SCREEN_MATRIX.md §17 (backend branch
// feat/superadmin-subscription-entitlements @ cc98900). Where the matrix names a
// block but not its inner field names (marked UNVERIFIED), the type is
// deliberately loose (`Record<string, unknown>`) and the UI renders it through
// the generic evidence renderer instead of guessing field names.
//
// Browser DTOs never model credentials, credential references, ciphertext,
// access tokens or raw provider payloads.

export type Product = 'BANKING' | 'MPESA';
export type ProductFilter = Product | 'BOTH' | 'NONE';
export type PlatformPlan = 'trial' | 'basic' | 'pro';

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

/** Public subscription DTO (platform + GET /subscription). */
export interface PlatformSubscription {
  id?: string;
  _id?: string;
  clientId?: string;
  plan: PlatformPlan | string;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  /** An existing subscription with `[]` is NOT the same as having no subscription. */
  products: Product[];
  assignedByUserId?: string | null;
  lastChangedByUserId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlatformOwner {
  name?: string;
  email?: string;
  phone?: string;
  isActive?: boolean;
}

export interface PlatformClientRow {
  _id: string;
  name: string;
  isActive: boolean;
  createdAt?: string;
  owner?: PlatformOwner | null;
  estateCount: number;
  houseCount: number;
  /** Subscription presence is explicit: false = no Subscription document. */
  hasSubscription?: boolean;
  subscription?: PlatformSubscription | null;
  products?: Product[];
  /** UNVERIFIED inner shape — rendered generically. */
  banking?: Record<string, unknown> | null;
  mpesa?: Record<string, unknown> | null;
}

export interface PlatformClientDetail extends PlatformClientRow {
  activeTenantCount?: number;
  staffCount?: number;
  tenantCount?: number;
  /** UNVERIFIED inner shape — safe M-PESA profiles/evidence summary. */
  mpesaProfiles?: Array<Record<string, unknown>>;
  bankingSummary?: Record<string, unknown> | null;
}

export interface ClientListFilters {
  page?: number;
  limit?: number;
  search?: string;
  product?: ProductFilter;
  plan?: PlatformPlan;
  subscriptionStatus?: string;
  hasSubscription?: boolean;
  bankProvider?: string;
  bankConnectionStatus?: BankConnectionStatus;
  bankAccountConnectionStatus?: BankAccountConnectionStatus;
  bankValidationStatus?: BankValidationStatus;
  mpesaState?: MpesaOperationalState;
  callbackCapability?: MpesaCapability;
  pullCapability?: MpesaCapability;
  c2bRegistrationState?: MpesaRegistrationState;
  pullRegistrationState?: MpesaRegistrationState;
  isActive?: boolean;
}

export interface ProvisionClientInput {
  clientName: string;
  ownerName: string;
  email: string;
  phone?: string;
  password: string;
  plan?: PlatformPlan;
  /** Explicit entitlement. Empty array = neither product. Defaults to [] server-side. */
  products?: Product[];
  startDate?: string;
  endDate?: string;
}

export interface ProvisionClientResult {
  client: { id: string; name: string; isActive: boolean };
  owner: { id: string; name: string; email: string; phone?: string; role: string };
}

/** Strict partial body; status is immutable and unknown keys are rejected server-side. */
export interface UpdateClientSubscriptionInput {
  plan?: PlatformPlan;
  products?: Product[];
  startDate?: string;
  /** `null` clears the end date. */
  endDate?: string | null;
}

export interface PlatformOverview {
  totalClients: number;
  activeClients: number;
  inactiveClients: number;
  totalEstates: number;
  totalHouses: number;
  occupiedHouses: number;
  vacantHouses: number;
  totalTenants: number;
  activeTenants: number;
  totalStaff: number;
  activeStaff: number;
  inactiveStaff: number;
  activeSubscriptions: number;
  pastDueSubscriptions: number;
  canceledSubscriptions: number;
  /** Subscription.products assignment distribution (entitlement). UNVERIFIED inner shape. */
  productAssignments?: Record<string, unknown>;
  /** Integration records distribution (evidence, NOT entitlement). UNVERIFIED inner shape. */
  bankingIntegration?: Record<string, unknown>;
  mpesaIntegration?: Record<string, unknown>;
}

export interface EntitlementInventoryRow {
  clientId: string;
  name: string;
  isActive: boolean;
  hasSubscription: boolean;
  plan?: string | null;
  status?: string | null;
  products: Product[];
  assignedByUserId?: string | null;
  lastChangedByUserId?: string | null;
  updatedAt?: string | null;
}

export interface EntitlementInventoryFilters {
  page?: number;
  limit?: number;
  product?: ProductFilter;
  isActive?: boolean;
}

export interface ProductAccess {
  entitled: boolean;
  reason?: string | null;
}

export interface ClientDiagnostics {
  client: PlatformClientDetail | Record<string, unknown>;
  operationalAccess: {
    clientActive: boolean;
    ordinaryOperationsBlocked: boolean;
    /** Per-product entitled/reason; container key naming is not documented, so it is read defensively. */
    [key: string]: unknown;
  };
  recentAudit: Array<{
    _id?: string;
    action: string;
    resource?: string;
    description?: string;
    createdAt?: string;
    userId?: { name?: string; email?: string; role?: string } | string | null;
  }>;
  jobOutcomes: Array<{
    name?: string;
    jobName?: string;
    lastRunAt?: string | null;
    outcome?: string | null;
    finishedAt?: string | null;
    counts?: Record<string, number> | null;
  }>;
}

export type BankConnectionStatus = 'pending' | 'active' | 'reauth_required' | 'disconnected' | 'failed';
export type BankValidationStatus = 'pending' | 'validated' | 'failed' | 'unavailable';
export type BankAccountConnectionStatus = 'pending' | 'connected' | 'failed';

export interface BankingIntegrationFilters {
  page?: number;
  limit?: number;
  clientId?: string;
  clientIsActive?: boolean;
  provider?: string;
  status?: BankConnectionStatus;
  validationStatus?: BankValidationStatus;
  accountConnectionStatus?: BankAccountConnectionStatus;
}

export interface BankingAccountRollup {
  accountCount: number;
  validationStatuses: Record<string, number>;
  accountConnectionStatuses: Record<string, number>;
  /** Number of accounts that have each capability, not booleans. */
  capabilities: { poll: number; statement: number; balance: number; webhookIngest: number };
  lastSyncAttemptAt: string | null;
  lastSyncSuccessAt: string | null;
  lastSyncErrorCategory: string | null;
}

export interface BankingIntegrationRow {
  connectionId: string;
  clientId: string;
  clientName?: string;
  clientIsActive?: boolean;
  provider: string;
  displayName: string | null;
  status: BankConnectionStatus;
  needsReauthorization: boolean;
  authEvidence: { lastAuthAt: string | null; tokenExpiresAt: string | null; lastAuthError: string | null };
  accounts: BankingAccountRollup;
  createdAt?: string;
  updatedAt?: string;
}

export type MpesaOperationalState = 'DRAFT' | 'NOT_READY' | 'ACTIVE' | 'SUSPENDED';
export type MpesaCapability = 'UNKNOWN' | 'NOT_ENABLED' | 'VERIFIED';
export type MpesaRegistrationState = 'NONE' | 'REQUESTED' | 'ACCEPTED' | 'ALREADY_REGISTERED' | 'REJECTED' | 'UNCERTAIN';

export interface MpesaIntegrationFilters {
  page?: number;
  limit?: number;
  clientId?: string;
  clientIsActive?: boolean;
  operationalState?: MpesaOperationalState;
  callbackCapability?: MpesaCapability;
  pullCapability?: MpesaCapability;
  c2bRegistrationState?: MpesaRegistrationState;
  pullRegistrationState?: MpesaRegistrationState;
}

export interface MpesaIntegrationRow {
  id: string;
  clientId: string;
  clientName?: string;
  clientIsActive?: boolean;
  estateId: string | null;
  displayName: string | null;
  merchantType: string;
  businessShortCode: string;
  operationalState: MpesaOperationalState;
  callbackCapability: MpesaCapability;
  pullCapability: MpesaCapability;
  c2bRegistrationState: MpesaRegistrationState;
  pullRegistrationState: MpesaRegistrationState;
  lastPullRegisteredAt: string | null;
  /** Per source channel: last received time, last state, total. Timestamps/state only. */
  ingestionEvidence?: Record<string, { lastReceivedAt: string; lastState: string; total: number }>;
  /** Derived by the backend from stored states only. */
  blockers: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PlatformUserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  phone?: string;
  lastLoginAt?: string;
  createdAt?: string;
  client?: { id: string; name: string; isActive?: boolean } | null;
}

export interface PlatformAuditRow {
  _id: string;
  action: string;
  resource?: string;
  resourceId?: string;
  clientId?: string;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  userId?: { name?: string; email?: string; role?: string } | null;
}

export interface PlatformSubscriptionRow {
  _id: string;
  plan?: string;
  status?: string;
  startDate?: string;
  endDate?: string | null;
  products?: Product[];
  clientId?: { _id?: string; name?: string; isActive?: boolean } | string | null;
  createdAt?: string;
}

/**
 * GET /platform/health — nested evidence objects. The endpoint makes NO live
 * provider calls: "configured", "implemented", "providerVerified" and
 * "operational" are separate claims. Inner fields are UNVERIFIED, so each
 * section is a loose record rendered by the generic evidence renderer.
 */
export interface PlatformHealth {
  generatedAt?: string;
  application?: Record<string, unknown>;
  mongo?: Record<string, unknown>;
  redis?: Record<string, unknown>;
  scheduler?: Record<string, unknown>;
  banking?: Record<string, unknown>;
  mpesa?: Record<string, unknown>;
  sms?: Record<string, unknown>;
}
