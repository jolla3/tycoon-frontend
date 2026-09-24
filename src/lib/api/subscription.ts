import { apiClient } from './client';

export type SubscriptionPlan = 'trial' | 'basic' | 'pro';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled';

export interface ClientSubscription {
  id: string;
  clientId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
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
  upgrade: (plan: Extract<SubscriptionPlan, 'basic' | 'pro'>) =>
    apiClient.post<ClientSubscription>('/subscription/upgrade', { plan }),
};
