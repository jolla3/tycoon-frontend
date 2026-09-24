import { Box, Container, Typography, Button, Stack } from '@mui/material';
import Link from 'next/link';

export function CtaSection() {
  return (
    <Box sx={{ py: { xs: 8, md: 10 }, textAlign: 'center' }}>
      <Container maxWidth="sm">
        <Typography variant="h4" sx={{ mb: 1.5 }}>
          Ready to see your rent, clearly.
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Sign in with the account your administrator set up for you.
        </Typography>
        <Stack direction="row" justifyContent="center">
          <Button component={Link} href="/login" variant="contained" size="large">
            Sign In
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
