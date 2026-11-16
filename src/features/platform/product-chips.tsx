import { Chip, Stack } from '@mui/material';
import type { Product } from '@/lib/api/platform';

const LABEL: Record<Product, string> = { BANKING: 'Banking', MPESA: 'M-PESA' };

/** Entitlement chips. `[]` on an existing subscription renders as "No products", distinct from "No subscription". */
export function ProductChips({ products, hasSubscription = true }: { products?: Product[] | null; hasSubscription?: boolean }) {
  if (!hasSubscription) return <Chip size="small" color="warning" variant="outlined" label="No subscription" />;
  if (!products || products.length === 0) return <Chip size="small" variant="outlined" label="No products" />;
  return (
    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
      {products.map((p) => (
        <Chip key={p} size="small" color="primary" variant="outlined" label={LABEL[p] ?? p} />
      ))}
    </Stack>
  );
}

export function ActiveChip({ active }: { active: boolean }) {
  return <Chip size="small" label={active ? 'Active' : 'Inactive'} color={active ? 'success' : 'default'} variant="outlined" />;
}
