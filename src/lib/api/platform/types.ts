// src/lib/api/platform/types.ts
//
// DTOs for /api/v1/platform/* (SUPER_ADMIN only), verified against backend main
// @ db7af3d (platform.service.js, platformIntegrations.service.js). Where the matrix names a
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

/**
 * Subscription as returned by GET /platform/clients (list rows and detail).
 * The backend NEVER returns null/undefined: a client without a Subscription
 * document gets `{ present: false }`, which is truthy. Always branch on `present`
 * (see features/platform/subscription-state.ts), never on the object itself.
 * List rows omit `products` here and carry them at the row's top level.
 */
export type PlatformClientSubscription =
  | { present: false }
  | {
      present: true;
      id?: string;
      plan: PlatformPlan | string;
      status: string;
      startDate?: string | null;
      endDate?: string | null;
      products?: Product[];
      assignedByUserId?: string | null;
      lastChangedByUserId?: string | null;
      createdAt?: string;
      updatedAt?: string;
    };

/** Per-client Banking rollup (counts and timestamps only). */
export interface ClientBankingSummary {
  connectionCount: number;
  providers: string[];
  connectionStatuses: Record<string, number>;
  accountCount: number;
  accountConnectionStatuses: Record<string, number>;
  validationStatuses: Record<string, number>;
  capabilities: { poll: number; statement: number; balance: number; webhookIngest: number };
  lastSyncAttemptAt: string | null;
  lastSyncSuccessAt: string | null;
}

export type MpesaMerchantType = 'PAYBILL' | 'BUY_GOODS_TILL';

/** Create body. `estateIds` are same-client estates; the backend verifies ownership. */
export interface CreateMpesaProfileInput {
  merchantType: MpesaMerchantType;
  displayName?: string;
  /** Client's PayBill / Till shortcode, not Tycoon's platform Daraja credentials. */
  businessShortCode: string;
  estateIds: string[];
}

export interface MpesaRegistrationEvidence {
  environment: string | null;
  configId: string | null;
  configVersion: string | null;
  attemptedAt: string | null;
  succeededAt: string | null;
}

/** Safe M-PESA merchant profile (no credentials, no tokens, never the nominated number). */
export interface ClientMpesaProfile {
  id: string;
  clientId: string;
  /** DEPRECATED legacy single-estate field; mappings in `estates` are authoritative. */
  estateId: string | null;
  displayName: string | null;
  merchantType: MpesaMerchantType | string;
  businessShortCode: string;
  operationalState: MpesaOperationalState;
  callbackCapability: MpesaCapability;
  pullCapability: MpesaCapability;
  c2bRegistrationState: MpesaRegistrationState;
  pullRegistrationState: MpesaRegistrationState;
  c2bRegistration?: MpesaRegistrationEvidence | null;
  pullRegistration?: MpesaRegistrationEvidence | null;
  pullNominatedNumber?: { captured: boolean; masked: string | null };
  lastPullRegisteredAt: string | null;
  createdAt?: string;
  updatedAt?: string;
  /** Present on the single-profile GET and on mutation results; absent on list summaries. */
  estates?: Array<{ estateId: string; status: 'ACTIVE' | 'INACTIVE' }>;
  ingestionEvidence?: Record<string, { lastReceivedAt: string; lastState: string; total: number }>;
}

export interface MpesaCallbackConfig {
  configured: boolean;
  reason?: string;
  environment: string;
  configId?: string;
  version?: string;
  confirmationUrl?: string;
  validationUrl?: string;
  pullResultsUrl?: string;
}

export interface MpesaCollectionReferenceRow {
  id: string;
  merchantProfileId: string;
  estateId: string;
  tenantId: string;
  tenancyId: string;
  reference: string;
  status: 'ACTIVE' | 'RETIRED';
  retiredAt: string | null;
  retiredReason: string | null;
  createdAt?: string;
}

export interface ClientMpesaSummary {
  profileCount: number;
  operationalStates: Record<string, number>;
  callbackCapabilities: Record<string, number>;
  pullCapabilities: Record<string, number>;
  /** Present on the detail response only. */
  profiles?: ClientMpesaProfile[];
}

export interface PlatformClientRow {
  _id: string;
  name: string;
  isActive: boolean;
  createdAt?: string;
  owner?: PlatformOwner | null;
  estateCount: number;
  houseCount: number;
  subscription: PlatformClientSubscription;
  /** `Subscription.products`, `[]` when there is none. Use subscriptionState() to tell the cases apart. */
  products: Product[];
  banking: ClientBankingSummary;
  mpesa: ClientMpesaSummary;
}

export interface PlatformClientDetail extends PlatformClientRow {
  activeTenantCount?: number;
  staffCount?: number;
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

export type EntitlementReason =
  | 'SUBSCRIPTION_MISSING'
  | 'PRODUCT_NOT_ASSIGNED'
  | 'CLIENT_INACTIVE'
  | 'CLIENT_NOT_FOUND'
  | 'PRODUCT_UNKNOWN';

/** Safe audit row (backend toSafeAudit). The actor is `actor`, not `userId`. */
export interface PlatformAuditEntry {
  id: string;
  createdAt: string;
  action: string;
  resource: string | null;
  resourceId: string | null;
  description: string | null;
  actor: { id: string | null; name?: string; email?: string; role?: string };
  targetClient: { id: string | null; name?: string; isActive?: boolean };
  metadata?: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface ClientDiagnostics {
  client: PlatformClientDetail;
  operationalAccess: {
    clientActive: boolean;
    ordinaryOperationsBlocked: boolean;
    entitlement: Record<Product, { entitled: boolean; reason: EntitlementReason | null }>;
  };
  recentAudit: PlatformAuditEntry[];
  jobOutcomes: Array<{
    name: string;
    lastRunAt: string | null;
    /** Nested; null when the job has not reported an outcome. */
    lastOutcome: {
      outcome: string;
      finishedAt: string | null;
      /** Per-client counts where the job reports them; inner shape is job-specific. */
      forThisClient: Record<string, unknown> | null;
    } | null;
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

export type PlatformAuditRow = PlatformAuditEntry;

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
