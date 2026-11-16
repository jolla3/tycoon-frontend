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
  bankConnectionStatus?: string;
  bankAccountConnectionStatus?: string;
  bankValidationStatus?: string;
  mpesaState?: string;
  callbackCapability?: string;
  pullCapability?: string;
  c2bRegistrationState?: string;
  pullRegistrationState?: string;
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

export interface BankingIntegrationFilters {
  page?: number;
  limit?: number;
  clientId?: string;
  clientIsActive?: boolean;
  provider?: string;
  status?: string;
  validationStatus?: string;
  accountConnectionStatus?: string;
}

export interface BankingIntegrationRow {
  connectionId: string;
  clientId: string;
  clientName?: string;
  clientIsActive?: boolean;
  provider: string;
  displayName?: string | null;
  status: string;
  needsReauthorization?: boolean;
  authEvidence?: {
    lastAuthAt?: string | null;
    tokenExpiresAt?: string | null;
    lastAuthError?: string | null;
  } | null;
  accounts?: {
    accountCount?: number;
    validationStatuses?: unknown;
    accountConnectionStatuses?: unknown;
    capabilities?: unknown;
    lastSyncAttemptAt?: string | null;
    lastSyncSuccessAt?: string | null;
    lastSyncErrorCategory?: string | null;
  } | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface MpesaIntegrationFilters {
  page?: number;
  limit?: number;
  clientId?: string;
  clientIsActive?: boolean;
  operationalState?: string;
  callbackCapability?: string;
  pullCapability?: string;
  c2bRegistrationState?: string;
  pullRegistrationState?: string;
}

export interface MpesaIntegrationRow {
  clientId: string;
  clientName?: string;
  clientIsActive?: boolean;
  /** UNVERIFIED naming of the merchant-profile identity block. */
  merchantProfileId?: string;
  displayName?: string | null;
  merchantType?: string | null;
  shortcode?: string | null;
  operationalState?: string;
  callbackCapability?: string;
  pullCapability?: string;
  c2bRegistrationState?: string;
  pullRegistrationState?: string;
  lastPullRegisteredAt?: string | null;
  ingestionEvidence?: Record<string, unknown> | null;
  blockers?: string[];
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
