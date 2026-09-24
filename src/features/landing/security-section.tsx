import { Box, Container, Typography, Grid, Stack } from '@mui/material';
import { ShieldCheck, KeyRound, Building, ScrollText } from 'lucide-react';
import { surfaces } from '@/theme/theme';

// Only claims actually backed by the real backend (section 9): cookie
// session auth, role/client isolation, audited actions. No unsupported
// "bank-grade encryption" marketing language.
const POINTS = [
  { icon: KeyRound, title: 'Secure sessions', description: 'Authentication uses HttpOnly, secure cookies — never tokens stored in browser storage.' },
  { icon: Building, title: 'Client isolation', description: 'Every request is scoped to your organization. Staff only see estates they\'re assigned to.' },
  { icon: ShieldCheck, title: 'Role-based access', description: 'What a user can view or change depends on their assigned role, enforced by the backend.' },
  { icon: ScrollText, title: 'Auditability', description: 'Sensitive actions — payment assignment, staff changes, bank connections — are logged.' },
];

export function SecuritySection() {
  return (
    <Box id="security" sx={{ py: { xs: 8, md: 12 }, background: surfaces.dataSurface }}>
      <Container maxWidth="lg">
        <Typography variant="h4" textAlign="center" sx={{ mb: 1 }}>
          Built with tenant isolation in mind
        </Typography>
        <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 6 }}>
          Financial and tenant data stay authoritative on the backend — the interface visualizes it, it never invents it.
        </Typography>

        <Grid container spacing={3}>
          {POINTS.map((p) => (
            <Grid item xs={12} sm={6} key={p.title}>
              <Stack direction="row" spacing={2}>
                <Box sx={{ color: 'primary.dark', flexShrink: 0 }}>
                  <p.icon size={22} />
                </Box>
                <Box>
                  <Typography variant="subtitle1">{p.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {p.description}
                  </Typography>
                </Box>
              </Stack>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
