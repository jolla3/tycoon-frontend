'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, FormGroup,
  MenuItem, Stack, TextField, useMediaQuery, useTheme,
} from '@mui/material';
import { Plus } from 'lucide-react';
import { estatesApi } from '@/lib/api/estates';
import { platformApi, type MpesaMerchantType } from '@/lib/api/platform';
import { platformKeys } from '@/lib/query/keys';
import { ApiError } from '@/lib/api/client';

export function ClientMpesaProfileCreate({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [open, setOpen] = useState(false);
  const [merchantType, setMerchantType] = useState<MpesaMerchantType>('PAYBILL');
  const [displayName, setDisplayName] = useState('');
  const [businessShortCode, setBusinessShortCode] = useState('');
  const [estateIds, setEstateIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const estates = useQuery({
    queryKey: ['platform', 'client-estates', clientId],
    queryFn: () => estatesApi.list(clientId),
    enabled: open,
    retry: false,
  });

  const create = useMutation({
    mutationFn: () => platformApi.clients.createMpesaProfile(clientId, {
      merchantType,
      displayName: displayName.trim() || undefined,
      businessShortCode: businessShortCode.trim(),
      estateIds,
    }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: platformKeys.client(clientId) }),
        qc.invalidateQueries({ queryKey: platformKeys.mpesaIntegrations() }),
        qc.invalidateQueries({ queryKey: platformKeys.clientsFamily() }),
        qc.invalidateQueries({ queryKey: platformKeys.overview() }),
      ]);
      setDisplayName('');
      setBusinessShortCode('');
      setEstateIds([]);
      setError(null);
      setOpen(false);
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Unable to create this M-PESA profile.'),
  });

  const validShortCode = /^\d{1,20}$/.test(businessShortCode.trim());
  const toggle = (id: string) => setEstateIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  return (
    <>
      <Button size="small" variant="outlined" startIcon={<Plus size={15} />} onClick={() => { setError(null); setOpen(true); }}>
        Add M-PESA profile
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" fullScreen={fullScreen}>
        <DialogTitle>Add client M-PESA merchant</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info">
              One profile is one real shortcode. Creating it does not register anything with Safaricom: it stays DRAFT, not registered, until you run the explicit registration actions on the profile. Tycoon&apos;s Daraja Consumer Key and Secret are platform configuration and are never entered here.
            </Alert>
            <TextField select label="Merchant type" value={merchantType} onChange={(e) => setMerchantType(e.target.value as MpesaMerchantType)}>
              <MenuItem value="PAYBILL">PayBill (tenants pay with a Tycoon reference)</MenuItem>
              <MenuItem value="BUY_GOODS_TILL">Buy Goods Till (tenant SMS evidence)</MenuItem>
            </TextField>
            <TextField label="Display name (optional)" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            <TextField
              label={merchantType === 'PAYBILL' ? 'PayBill business number' : 'Till number'}
              value={businessShortCode}
              onChange={(e) => setBusinessShortCode(e.target.value)}
              inputProps={{ inputMode: 'numeric', maxLength: 20 }}
              required
              error={Boolean(businessShortCode) && !validShortCode}
              helperText="Digits only. A shortcode can be owned by one client on the whole platform."
            />
            {estates.isLoading ? <Alert severity="info">Loading this client&apos;s estates…</Alert> : null}
            {estates.error ? <Alert severity="error">{estates.error instanceof ApiError ? estates.error.message : 'Could not load client estates.'}</Alert> : null}
            {estates.data && estates.data.length === 0 ? <Alert severity="warning">This client has no estates to map yet.</Alert> : null}
            {estates.data && estates.data.length > 0 ? (
              <FormGroup aria-label="Estates served by this shortcode">
                {estates.data.map((estate) => (
                  <FormControlLabel
                    key={estate._id}
                    control={<Checkbox checked={estateIds.includes(estate._id)} onChange={() => toggle(estate._id)} />}
                    label={estate.name}
                  />
                ))}
              </FormGroup>
            ) : null}
            <Alert severity="warning">
              Mapping an estate authorizes it to use this shortcode. It does not give the estate every receipt: receipts are attributed only by exact reference or verified evidence.
            </Alert>
            {error ? <Alert severity="error">{error}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!validShortCode || estateIds.length === 0 || estates.isLoading || Boolean(estates.error) || create.isPending}
            onClick={() => { setError(null); create.mutate(); }}
          >
            {create.isPending ? 'Creating…' : 'Create draft profile'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
