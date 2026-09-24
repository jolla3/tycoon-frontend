// src/lib/api/sms.ts — routes/sms.routes.js
import { apiClient } from './client';
import type { SmsMessage } from '@/types/api';

export type SmsRecipientGroup = 'ALL_TENANTS' | 'ESTATE' | 'SELECTED_TENANTS' | 'ARREARS' | 'OUTSTANDING';

export interface SendSmsInput {
  message: string;
  /** Required by backend: resolve recipient from tenant or house under client scope */
  tenantId?: string;
  houseId?: string;
  forceResend?: boolean;
}

export interface BroadcastSmsInput {
  recipientGroup: SmsRecipientGroup;
  estateId?: string;
  tenantIds?: string[];
  message: string;
  type?: 'broadcast' | 'billing_notification' | 'arrears_notice' | 'rent_reminder';
  period?: string;
  forceResend?: boolean;
}

export interface BroadcastResult {
  broadcastId: string;
  recipientsResolved?: number;
  messagesQueued?: number;
  status?: string;
  [key: string]: unknown;
}

export interface PreviewSmsInput {
  template?: 'billing_notification' | 'rent_reminder' | 'arrears_notice' | 'payment_confirmation';
  tenantId?: string;
  houseId?: string;
  period?: string;
  tenantName?: string;
  houseNumber?: string;
  phone?: string;
  rentCents?: number;
  waterCents?: number;
  electricityCents?: number;
  otherCents?: number;
  previousArrearsCents?: number;
  paidCents?: number;
  totalOutstandingCents?: number;
  dueDate?: string;
}

export interface PreviewSmsResult {
  message: string;
  template?: string;
  [key: string]: unknown;
}

export const smsApi = {
  send: (input: SendSmsInput) => apiClient.post<{ jobId: string; status: string }>('/sms/send', input),
  broadcast: (input: BroadcastSmsInput) => apiClient.post<BroadcastResult>('/sms/broadcast', input),
  preview: (input: PreviewSmsInput) => apiClient.post<PreviewSmsResult>('/sms/preview', input),
  history: () => apiClient.get<SmsMessage[]>('/sms/history'),
};
