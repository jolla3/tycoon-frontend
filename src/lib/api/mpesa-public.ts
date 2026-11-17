// src/lib/api/mpesa-public.ts — the ONLY unauthenticated API module.
//
// POST /public/mpesa/submissions accepts exactly { token, text } (4 KB limit).
// 202 means the evidence was received for processing. It is NOT a posted
// payment. The token comes from the page fragment, lives in memory only, and
// must never be persisted, logged, tracked or cached.
import { publicRequest } from './client';

export const MPESA_SUBMISSION_MAX_BYTES = 4096;

export interface PublicSubmissionResult {
  received: true;
}

export type PublicSubmissionOutcome = 'received' | 'unavailable_link' | 'rejected_input' | 'too_large' | 'try_later';

export function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).length;
}

export async function submitMpesaSms(token: string, text: string, signal?: AbortSignal): Promise<PublicSubmissionOutcome> {
  // Enforce the limit before sending. The envelope adds overhead, so measure the real body.
  const body = { token, text };
  if (utf8Bytes(JSON.stringify(body)) > MPESA_SUBMISSION_MAX_BYTES) return 'too_large';
  try {
    const { status } = await publicRequest<PublicSubmissionResult>('/public/mpesa/submissions', body, signal);
    return status === 202 ? 'received' : 'try_later';
  } catch (err) {
    const status = (err as { status?: number }).status ?? 0;
    if (status === 404) return 'unavailable_link';
    if (status === 413) return 'too_large';
    if (status === 400) return 'rejected_input';
    return 'try_later';
  }
}
