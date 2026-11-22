'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Button, Stack, TextField, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Chip, Typography, MenuItem,
} from '@mui/material';
import { houseTypesApi, type HouseType, type CreateHouseTypeInput } from '@/lib/api/house-types';
import { formatMaybeNumber } from '@/lib/formatting/currency';
import { ApiError } from '@/lib/api/client';
import { billingLinesEqual, nextBillingPeriod, splitHousesByBillingSource, validateEffectivePeriod } from './plan-edit';

export function HouseTypeDialog({
  open,
  onClose,
  onSaved,
  initial,
  estates,
  defaultEstateId,
}: {
  estates: { _id: string; name: string }[];
  defaultEstateId: string;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial?: HouseType;
}) {
  const [formEstateId, setFormEstateId] = useState(initial?.estateId ?? defaultEstateId);
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [rentKes, setRentKes] = useState(initial && typeof initial.defaultRentCents === 'number' ? String(initial.defaultRentCents / 100) : '');
  const [dueDay, setDueDay] = useState(initial?.defaultDueDay ? String(initial.defaultDueDay) : '30');
  const [waterKes, setWaterKes] = useState(() => {
    const line = initial?.defaultBilling?.find((b) => b.chargeType === 'WATER');
    return line ? String(line.amountCents / 100) : '';
  });
  const [waterOn, setWaterOn] = useState(() =>
    Boolean(initial?.defaultBilling?.find((b) => b.chargeType === 'WATER' && b.amountCents > 0))
  );
  const [elecKes, setElecKes] = useState(() => {
    const line = initial?.defaultBilling?.find((b) => b.chargeType === 'ELECTRICITY');
    return line ? String(line.amountCents / 100) : '';
  });
  const [elecOn, setElecOn] = useState(() =>
    Boolean(initial?.defaultBilling?.find((b) => b.chargeType === 'ELECTRICITY' && b.amountCents > 0))
  );
  const [customLines, setCustomLines] = useState<{ label: string; amountKes: string; enabled: boolean }[]>(() => {
    const others = (initial?.defaultBilling ?? []).filter((b) => b.chargeType === 'OTHER');
    if (others.length === 0) return [{ label: '', amountKes: '', enabled: false }];
    return others.map((o) => ({
      label: o.description || '',
      amountKes: typeof o.amountCents === 'number' ? String(o.amountCents / 100) : '',
      enabled: typeof o.amountCents === 'number' && o.amountCents > 0,
    }));
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [effectiveFrom, setEffectiveFrom] = useState(() => nextBillingPeriod());
  const [changeReason, setChangeReason] = useState('');
  // Affected houses come from the workspace (billingSource per house).
  const impact = useQuery({
    queryKey: ['house-type-workspace', initial?._id ?? 'new'],
    queryFn: () => houseTypesApi.workspace(initial!._id),
    enabled: Boolean(initial),
  });
  const split = impact.data ? splitHousesByBillingSource(impact.data.houses) : null;

  const mutation = useMutation({
    mutationFn: async () => {
      const defaultRentCents = Math.round(Number(rentKes || 0) * 100);
      if (!name.trim()) throw new Error('Name is required');
      const day = dueDay ? Math.min(31, Math.max(1, Number(dueDay))) : 30;
      const defaultBilling: CreateHouseTypeInput['defaultBilling'] = [];
      if (defaultRentCents > 0) {
        defaultBilling!.push({
          chargeType: 'RENT',
          description: 'Rent',
          amountCents: defaultRentCents,
          dueDay: day,
        });
      }
      if (waterOn && Number(waterKes) > 0) {
        defaultBilling!.push({
          chargeType: 'WATER',
          description: 'Water',
          amountCents: Math.round(Number(waterKes) * 100),
          dueDay: day,
        });
      }
      if (elecOn && Number(elecKes) > 0) {
        defaultBilling!.push({
          chargeType: 'ELECTRICITY',
          description: 'Electricity',
          amountCents: Math.round(Number(elecKes) * 100),
          dueDay: day,
        });
      }
      const seen = new Set<string>();
      for (const c of customLines) {
        if (!c.enabled) continue;
        const label = c.label.trim();
        if (!label) throw new Error('Custom billing lines need a label (e.g. Security)');
        if (!(Number(c.amountKes) > 0)) throw new Error(`Enter an amount for ${label}`);
        const key = label.toLowerCase();
        if (seen.has(key)) throw new Error(`Duplicate custom line: ${label}`);
        seen.add(key);
        defaultBilling!.push({
          chargeType: 'OTHER',
          description: label,
          amountCents: Math.round(Number(c.amountKes) * 100),
          dueDay: day,
        });
      }
      const fields = {
        name: name.trim(),
        description: description.trim() || undefined,
        defaultRentCents,
        defaultDueDay: day,
        defaultBilling,
      };
      if (initial) {
        const planChanged =
          defaultRentCents !== (initial.defaultRentCents ?? 0)
          || day !== (initial.defaultDueDay ?? day)
          || !billingLinesEqual(defaultBilling, initial.defaultBilling);
        if (!planChanged) {
          // Name/description only: no plan fields, so no new plan version is created.
          return houseTypesApi.update(initial._id, { name: fields.name, description: fields.description });
        }
        const periodError = validateEffectivePeriod(effectiveFrom);
        if (periodError) throw new Error(periodError);
        if (!changeReason.trim()) throw new Error('Give a short reason for this plan change');
        return houseTypesApi.update(initial._id, {
          ...fields,
          effectiveFromPeriod: effectiveFrom,
          changeReason: changeReason.trim(),
        });
      }
      if (!formEstateId) throw new Error('Choose an estate for this house type');
      const payload: CreateHouseTypeInput = { estateId: formEstateId, ...fields };
      return houseTypesApi.create(payload);
    },
    onSuccess: () => onSaved(),
    onError: (err) =>
      setFormError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Unable to save'),
  });

  const deactivate = useMutation({
    mutationFn: () => houseTypesApi.deactivate(initial!._id),
    onSuccess: () => onSaved(),
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Unable to deactivate'),
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{initial ? 'Edit house type' : 'New house type'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {formError && <Alert severity="error">{formError}</Alert>}
          <TextField
            select
            label="Estate"
            value={formEstateId}
            onChange={(e) => setFormEstateId(e.target.value)}
            disabled={!!initial}
            required
            helperText={initial ? 'A house type belongs to one estate and cannot be moved.' : 'House types are specific to an estate.'}
          >
            {estates.map((e) => (
              <MenuItem key={e._id} value={e._id}>{e.name}</MenuItem>
            ))}
          </TextField>
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            minRows={2}
          />
          <Typography variant="subtitle2">Monthly rent template</Typography>
          <TextField
            label="Default monthly rent (KES)"
            type="number"
            value={rentKes}
            onChange={(e) => setRentKes(e.target.value)}
          />
          <TextField
            label="Due day of month"
            type="number"
            value={dueDay}
            onChange={(e) => setDueDay(e.target.value)}
            inputProps={{ min: 1, max: 31 }}
            helperText="Charges are due on this calendar day each month. If a month does not contain this day, the last calendar day of that month is used."
          />
          <Typography variant="subtitle2">Common charges</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              label={waterOn ? 'Water on' : 'Water off'}
              color={waterOn ? 'primary' : 'default'}
              onClick={() => setWaterOn((v) => !v)}
            />
            <TextField
              size="small"
              label="Water (KES)"
              type="number"
              value={waterKes}
              onChange={(e) => setWaterKes(e.target.value)}
              disabled={!waterOn}
            />
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              label={elecOn ? 'Electricity on' : 'Electricity off'}
              color={elecOn ? 'primary' : 'default'}
              onClick={() => setElecOn((v) => !v)}
            />
            <TextField
              size="small"
              label="Electricity (KES)"
              type="number"
              value={elecKes}
              onChange={(e) => setElecKes(e.target.value)}
              disabled={!elecOn}
            />
          </Stack>
          <Typography variant="subtitle2">Custom recurring lines</Typography>
          <Typography variant="caption" color="text.secondary">
            Add Security, Garbage, Service Charge, or any monthly fee. Label + amount required when enabled.
          </Typography>
          {customLines.map((line, idx) => (
            <Stack key={idx} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
              <Chip
                label={line.enabled ? 'On' : 'Off'}
                color={line.enabled ? 'primary' : 'default'}
                onClick={() =>
                  setCustomLines((rows) => rows.map((r, i) => (i === idx ? { ...r, enabled: !r.enabled } : r)))
                }
              />
              <TextField
                size="small"
                label="Label"
                value={line.label}
                onChange={(e) =>
                  setCustomLines((rows) => rows.map((r, i) => (i === idx ? { ...r, label: e.target.value } : r)))
                }
                disabled={!line.enabled}
                placeholder="e.g. Security"
              />
              <TextField
                size="small"
                label="KES / month"
                type="number"
                value={line.amountKes}
                onChange={(e) =>
                  setCustomLines((rows) => rows.map((r, i) => (i === idx ? { ...r, amountKes: e.target.value } : r)))
                }
                disabled={!line.enabled}
              />
            </Stack>
          ))}
          <Button
            size="small"
            onClick={() => setCustomLines((rows) => [...rows, { label: '', amountKes: '', enabled: true }])}
            sx={{ alignSelf: 'flex-start' }}
          >
            + Add custom line
          </Button>
          <Typography variant="caption" color="text.secondary">
            Frequency: Monthly. A plan change is saved as a new version. It never rewrites past charges and never touches houses that have their own billing settings.
          </Typography>
          {initial && (
            <Stack spacing={1}>
              <Typography variant="subtitle2">If you change the plan</Typography>
              <TextField
                label="New plan starts"
                type="month"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
                error={validateEffectivePeriod(effectiveFrom) !== null}
                helperText={validateEffectivePeriod(effectiveFrom) ?? 'Charges for this month and later use the new plan.'}
              />
              <TextField
                label="Reason for change"
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                inputProps={{ maxLength: 500 }}
                helperText="Kept with the plan history. Required only if rent, due day or charges change."
              />
              {impact.isError ? <Alert severity="warning">Could not load which houses use this plan. Saving is still safe, but check the houses afterwards.</Alert> : null}
              {split ? (
                <Alert severity={split.affected.length ? 'info' : 'success'}>
                  {split.affected.length} house(s) are billed from this type and will follow the new plan from {effectiveFrom || 'the chosen month'}
                  {split.affected.length ? `: ${split.affected.slice(0, 12).map((h) => h.houseNumber).join(', ')}${split.affected.length > 12 ? '…' : ''}` : ''}.
                  {split.preserved.length ? ` ${split.preserved.length} house(s) with their own billing settings are not changed.` : ''}
                </Alert>
              ) : null}
            </Stack>
          )}
          {initial && (
            <Typography variant="caption" color="text.secondary">
              Used by {formatMaybeNumber(initial.houseCount)} house(s).
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        {initial?.isActive && (
          <Button color="warning" onClick={() => deactivate.mutate()} disabled={deactivate.isPending}>
            Deactivate
          </Button>
        )}
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!name.trim() || (!initial && !formEstateId) || mutation.isPending}
          onClick={() => {
            setFormError(null);
            mutation.mutate();
          }}
        >
          {mutation.isPending ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}