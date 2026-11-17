// src/lib/api/platform/index.ts — aggregate kept so `platformApi.*` call sites stay stable.
import { overviewApi } from './overview';
import { clientsApi } from './clients';
import { entitlementsApi } from './entitlements';
import { diagnosticsApi } from './diagnostics';
import { integrationsApi } from './integrations';
import { platformUsersApi } from './users';
import { platformAuditApi } from './audit';
import { platformSubscriptionsApi } from './subscriptions';
import { healthApi } from './health';

export * from './types';
export const platformApi = {
  overview: overviewApi.get,
  health: healthApi.get,
  clients: clientsApi,
  entitlements: entitlementsApi,
  diagnostics: diagnosticsApi,
  integrations: integrationsApi,
  users: platformUsersApi,
  audit: platformAuditApi,
  subscriptions: platformSubscriptionsApi,
};
