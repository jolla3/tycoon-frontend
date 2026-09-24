// src/lib/dates/period.ts
//
// The ONE period system (section 29/30). All business date math happens in
// Africa/Nairobi, matching src/utils/date.js on the backend exactly —
// this must never drift from the backend's own BUSINESS_TZ.
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(quarterOfYear); // real plugin — 'quarter' is not a native dayjs unit without this

export const BUSINESS_TZ = 'Africa/Nairobi';

export type PeriodPreset =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'this_year'
  | 'custom';

export interface ResolvedPeriod {
  preset: PeriodPreset;
  startDate: string; // YYYY-MM-DD, Nairobi calendar date
  endDate: string;
  /** Matches the backend's RentCharge.period format (YYYY-MM) for endpoints that key off month, e.g. /reports/dashboard */
  period: string;
  label: string;
}

function nairobi(d?: dayjs.Dayjs | Date | string) {
  return dayjs(d).tz(BUSINESS_TZ);
}

const PRESET_LABELS: Record<PeriodPreset, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  this_week: 'This Week',
  last_week: 'Last Week',
  this_month: 'This Month',
  last_month: 'Last Month',
  this_quarter: 'This Quarter',
  this_year: 'This Year',
  custom: 'Custom Range',
};

export function resolvePeriod(preset: PeriodPreset, customRange?: { start: string; end: string }): ResolvedPeriod {
  const now = nairobi();
  let start = now.startOf('day');
  let end = now.endOf('day');

  switch (preset) {
    case 'today':
      break;
    case 'yesterday':
      start = now.subtract(1, 'day').startOf('day');
      end = now.subtract(1, 'day').endOf('day');
      break;
    case 'this_week':
      start = now.startOf('week');
      end = now.endOf('week');
      break;
    case 'last_week':
      start = now.subtract(1, 'week').startOf('week');
      end = now.subtract(1, 'week').endOf('week');
      break;
    case 'this_month':
      start = now.startOf('month');
      end = now.endOf('month');
      break;
    case 'last_month':
      start = now.subtract(1, 'month').startOf('month');
      end = now.subtract(1, 'month').endOf('month');
      break;
    case 'this_quarter':
      start = now.startOf('quarter');
      end = now.endOf('quarter');
      break;
    case 'this_year':
      start = now.startOf('year');
      end = now.endOf('year');
      break;
    case 'custom':
      if (!customRange) throw new Error('customRange is required for the "custom" preset');
      start = nairobi(customRange.start).startOf('day');
      end = nairobi(customRange.end).endOf('day');
      break;
  }

  const sameDay = start.isSame(end, 'day');
  const label =
    preset === 'custom'
      ? sameDay
        ? start.format('MMMM D, YYYY')
        : `${start.format('MMMM D, YYYY')} – ${end.format('MMMM D, YYYY')}`
      : `${PRESET_LABELS[preset]} (${start.format('MMM D')} – ${end.format('MMM D, YYYY')})`;

  return {
    preset,
    startDate: start.format('YYYY-MM-DD'),
    endDate: end.format('YYYY-MM-DD'),
    period: start.format('YYYY-MM'),
    label,
  };
}

export const dateFormat = (date: string | Date, fmt = 'DD MMM YYYY, HH:mm') => nairobi(date).format(fmt);
