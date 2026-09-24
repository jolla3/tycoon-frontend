'use client';

// src/components/data-display/data-table.tsx
//
// The ONE list-rendering primitive (section 26/33). Every feature list page
// (houses, tenants, transactions, staff...) uses this instead of writing
// its own table + loading/empty/error branching. Mobile renders each row
// via `renderMobileCard` (stacked, per section 35) instead of squeezing
// the desktop table into a phone width.

import { useMediaQuery, useTheme, Table, TableHead, TableRow, TableCell, TableBody, Box, Stack, Skeleton } from '@mui/material';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import type { LucideIcon } from 'lucide-react';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  isLoading: boolean;
  error: unknown;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
  renderMobileCard: (row: T) => ReactNode;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({ columns, rows, rowKey, isLoading, error, emptyIcon, emptyTitle, emptyDescription, renderMobileCard, onRowClick }: DataTableProps<T>) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('sm'));

  if (error) return <ErrorState error={error} />;

  if (isLoading) {
    return isDesktop ? (
      <Table>
        <TableHead>
          <TableRow>
            {columns.map((c) => (
              <TableCell key={c.key}>{c.header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              {columns.map((c) => (
                <TableCell key={c.key}>
                  <Skeleton variant="text" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    ) : (
      <Stack spacing={1.5}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={88} />
        ))}
      </Stack>
    );
  }

  if (!rows || rows.length === 0) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />;
  }

  if (!isDesktop) {
    return <Stack spacing={1.5}>{rows.map((row) => <Box key={rowKey(row)}>{renderMobileCard(row)}</Box>)}</Stack>;
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          {columns.map((c) => (
            <TableCell key={c.key} align={c.align ?? 'left'}>
              {c.header}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={rowKey(row)} hover={Boolean(onRowClick)} onClick={() => onRowClick?.(row)} sx={{ cursor: onRowClick ? 'pointer' : 'default' }}>
            {columns.map((c) => (
              <TableCell key={c.key} align={c.align ?? 'left'}>
                {c.render(row)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
