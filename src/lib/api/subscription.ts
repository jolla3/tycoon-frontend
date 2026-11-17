import { apiClient } from './client';

export type SubscriptionPlan = 'trial' | 'basic' | 'pro';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled';

export type SubscriptionProduct = 'BANKING' | 'MPESA';

export interface ClientSubscription {
  id: string;
  clientId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  /** Product entitlement assigned by the platform. `[]` is a real subscription with no products. */
  products: SubscriptionProduct[];
  startDate?: string;
  endDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlanCatalogItem {
  plan: SubscriptionPlan;
  label: string;
  description: string;
}

export interface SubscriptionView {
  subscription: ClientSubscription | null;
  plans: PlanCatalogItem[];
}

export const subscriptionApi = {
  get: () => apiClient.get<SubscriptionView>('/subscription'),
  // No upgrade call: the backend refuses customer self-service upgrades (always 403).
};
