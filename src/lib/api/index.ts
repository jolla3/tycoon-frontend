// src/lib/api/index.ts — single import surface for pages/features.
export * from './client';
export { authApi } from './auth';
export { profileApi } from './profile';
export { estatesApi, visibleTo } from './estates';
export { housesApi } from './houses';
export { tenantsApi } from './tenants';
export { paymentsApi } from './payments';
export { bankingApi } from './banking';
export { transactionsApi } from './transactions';
export { smsApi } from './sms';
export { reportsApi } from './reports';
export { staffApi } from './staff';
export { platformApi } from './platform';
