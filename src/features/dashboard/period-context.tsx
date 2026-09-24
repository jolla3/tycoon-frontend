'use client';

// src/features/dashboard/period-context.tsx
//
// The ONE global period state (section 30). Dashboard, Reports, Payments,
// Transactions, SMS all read from here instead of inventing their own
// date logic. A page CAN intentionally opt out (e.g. a tenant's lifetime
// payment history) by simply not reading this context.

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { resolvePeriod, type PeriodPreset, type ResolvedPeriod } from '@/lib/dates/period';

interface PeriodContextValue {
  period: ResolvedPeriod;
  setPreset: (preset: PeriodPreset) => void;
  setCustomRange: (start: string, end: string) => void;
}

const PeriodContext = createContext<PeriodContextValue | null>(null);

export function PeriodProvider({ children }: { children: ReactNode }) {
  const [preset, setPresetState] = useState<PeriodPreset>('this_month');
  const [customRange, setCustomRangeState] = useState<{ start: string; end: string } | null>(null);

  const period = useMemo(() => resolvePeriod(preset, customRange ?? undefined), [preset, customRange]);

  const value: PeriodContextValue = {
    period,
    setPreset: (next) => {
      setCustomRangeState(null);
      setPresetState(next);
    },
    setCustomRange: (start, end) => {
      setCustomRangeState({ start, end });
      setPresetState('custom');
    },
  };

  return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>;
}

export function usePeriod(): PeriodContextValue {
  const ctx = useContext(PeriodContext);
  if (!ctx) throw new Error('usePeriod must be used within a PeriodProvider');
  return ctx;
}
