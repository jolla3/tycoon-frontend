import { Box, Typography, Stack, Link as MuiLink } from '@mui/material';
import Link from 'next/link';
import { appConfig } from '@/config/app';

export function Footer() {
  return (
    <Box component="footer" sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider', mt: 'auto' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1}>
        <Typography variant="caption" color="text.secondary">
          {appConfig.name} &copy; {appConfig.currentYear}
        </Typography>
        <Stack direction="row" spacing={2}>
          <MuiLink component={Link} href="/privacy" variant="caption" color="text.secondary" underline="hover">
            Privacy
          </MuiLink>
          <MuiLink component={Link} href="/terms" variant="caption" color="text.secondary" underline="hover">
            Terms
          </MuiLink>
        </Stack>
      </Stack>
    </Box>
  );
}
