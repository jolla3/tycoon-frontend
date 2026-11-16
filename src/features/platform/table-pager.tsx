import { Box, Pagination } from '@mui/material';

export function TablePager({ total, limit, page, onChange }: { total?: number; limit?: number; page: number; onChange: (page: number) => void }) {
  if (!total || !limit) return null;
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return null;
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
      <Pagination count={pages} page={page} onChange={(_, p) => onChange(p)} size="small" />
    </Box>
  );
}
