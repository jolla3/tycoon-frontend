import { Alert, AlertTitle } from '@mui/material';
import { ApiError } from '@/lib/api/client';

const PRODUCT_LABEL: Record<string, string> = { BANKING: 'Banking', MPESA: 'M-PESA' };

// Reasons come from the backend's 403 PRODUCT_NOT_ENTITLED details. Copy is
// deliberately neutral: it states what is blocked and who can change it, and
// never offers a self-service upgrade (the backend always refuses one).
const REASON_COPY: Record<string, string> = {
  SUBSCRIPTION_MISSING: 'This organisation has no subscription record yet.',
  PRODUCT_NOT_ASSIGNED: 'This product has not been assigned to your subscription.',
  CLIENT_INACTIVE: 'This organisation is currently inactive.',
  CLIENT_NOT_FOUND: 'This organisation could not be found.',
  PRODUCT_UNKNOWN: 'This product is not recognised.',
};

export function isProductNotEntitled(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 403 && error.code === 'PRODUCT_NOT_ENTITLED';
}

export function ProductEntitlementBlocked({ error, fallbackProduct }: { error: unknown; fallbackProduct?: string }) {
  const details = (error instanceof ApiError && typeof error.details === 'object' && error.details ? (error.details as Record<string, unknown>) : {}) as { product?: string; reason?: string };
  const product = PRODUCT_LABEL[details.product ?? fallbackProduct ?? ''] ?? 'This product';
  const reason = REASON_COPY[details.reason ?? ''];
  return (
    <Alert severity="info">
      <AlertTitle>{product} is not enabled for your organisation</AlertTitle>
      {reason ? `${reason} ` : ''}
      Access is managed by the platform administrator. Contact them to enable it.
    </Alert>
  );
}
