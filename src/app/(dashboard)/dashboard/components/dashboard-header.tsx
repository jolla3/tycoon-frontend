import { Box, Typography, Stack } from '@mui/material';
import { PeriodSelector } from '@/components/ui/period-selector';

export function DashboardHeader() {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'flex-end' }} spacing={2} sx={{ mb: 3 }}>
      <Box>
        <Typography variant="h5">Dashboard</Typography>
        <Typography variant="body2" color="text.secondary">
          What needs attention right now
        </Typography>
      </Box>
      <PeriodSelector />
    </Stack>
  );
}
