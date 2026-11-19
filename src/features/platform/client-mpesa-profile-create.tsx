'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from '@mui/material';
import { Plus } from 'lucide-react';
import { estatesApi } from '@/lib/api/estates';
import { platformApi } from '@/lib/api/platform';
import { platformKeys } from '@/lib/query/keys';
import { ApiError } from '@/lib/api/client';

export function ClientMpesaProfileCreate({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [businessShortCode, setBusinessShortCode] = useState('');
  const [estateId, setEstateId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const estates = useQuery({
    queryKey: ['platform', 'client-estates', clientId],
    queryFn: () => estatesApi.list(clientId),
    enabled: open,
    retry: false,
  });

  const create = useMutation({
    mutationFn: () => platformApi.clients.createMpesaProfile(clientId, {
      displayName: displayName.trim() || undefined,
      businessShortCode: businessShortCode.trim(),
      estateId,
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
      setEstateId('');
      setError(null);
      setOpen(false);
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Unable to create this M-PESA Till profile.'),
  });

  const validShortCode = /^\d{1,20}$/.test(businessShortCode.trim());

  return (
    <>
      <Button size="small" variant="outlined" startIcon={<Plus size={15} />} onClick={() => { setError(null); setOpen(true); }}>
        Add Till profile
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Add client M-PESA Till</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info">
              Enter the client's Buy Goods Till number. Tycoon's Daraja Consumer Key and Secret are platform configuration and must not be entered here. The new profile remains DRAFT until provider registration and operational evidence are completed.
            </Alert>
            <TextField label="Display name (optional)" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            <TextField
              label="Till number / business shortcode"
              value={businessShortCode}
              onChange={(e) => setBusinessShortCode(e.target.value)}
              inputProps={{ inputMode: 'numeric', maxLength: 20 }}
              required
              error={Boolean(businessShortCode) && !validShortCode}
              helperText="Digits only. The same shortcode can only be registered once for this client."
            />
            {estates.isLoading ? <Alert severity="info">Loading this client's estates…</Alert> : null}
            {estates.error ? <Alert severity="error">{estates.error instanceof ApiError ? estates.error.message : 'Could not load client estates.'}</Alert> : null}
            {estates.data && estates.data.length === 0 ? <Alert severity="warning">This client has no estates to map the Till to yet.</Alert> : null}
            {estates.data && estates.data.length > 0 ? (
              <TextField select label="Estate served by this Till" value={estateId} onChange={(e) => setEstateId(e.target.value)} required>
                <MenuItem value="">Select estate</MenuItem>
                {estates.data.map((estate) => <MenuItem key={estate._id} value={estate._id}>{estate.name}</MenuItem>)}
              </TextField>
            ) : null}
            <Alert severity="warning">
              Current backend model supports one estate per Till profile. A single Till shared across several estates needs a separate data-model decision and is not supported by this form.
            </Alert>
            {error ? <Alert severity="error">{error}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!validShortCode || !estateId || estates.isLoading || Boolean(estates.error) || create.isPending}
            onClick={() => { setError(null); create.mutate(); }}
          >
            {create.isPending ? 'Creating…' : 'Create draft profile'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
