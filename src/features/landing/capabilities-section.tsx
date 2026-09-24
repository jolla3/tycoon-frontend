'use client';

import { Box, Container, Typography, Grid, Card } from '@mui/material';
import { motion } from 'motion/react';
import { Building2, Home, Users, Landmark, Wallet, AlertTriangle, MessageSquare, FileBarChart } from 'lucide-react';
import { surfaces } from '@/theme/theme';

const CAPABILITIES = [
  { icon: Building2, title: 'Estate management', description: 'Organize every property you manage under clear estate boundaries.' },
  { icon: Home, title: 'House management', description: 'Track occupancy, rent amounts, and status for every unit.' },
  { icon: Users, title: 'Tenant management', description: 'Keep tenant contact details and payment history in one place.' },
  { icon: Landmark, title: 'Bank synchronization', description: 'Connect a bank account and pull in transactions automatically.' },
  { icon: Wallet, title: 'Payment tracking', description: 'See expected, collected, and outstanding rent at a glance.' },
  { icon: AlertTriangle, title: 'Unmatched transactions', description: 'Review and assign payments the system couldn\'t auto-match.' },
  { icon: MessageSquare, title: 'SMS communication', description: 'Send rent reminders and payment confirmations directly.' },
  { icon: FileBarChart, title: 'Reporting', description: 'Collection, arrears, and reconciliation reports on demand.' },
];

export function CapabilitiesSection() {
  return (
    <Box id="capabilities" sx={{ py: { xs: 8, md: 12 }, background: surfaces.dataSurface }}>
      <Container maxWidth="lg">
        <Typography variant="h4" textAlign="center" sx={{ mb: 1 }}>
          Everything an estate office needs
        </Typography>
        <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 6 }}>
          Built around real operational workflows, not a generic CRUD template.
        </Typography>

        <Grid container spacing={2.5}>
          {CAPABILITIES.map((c, i) => (
            <Grid item xs={12} sm={6} md={3} key={c.title}>
              <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35, delay: (i % 4) * 0.06 }}>
                <Card sx={{ p: 2.5, height: '100%' }}>
                  <Box sx={{ color: 'primary.dark', mb: 1.5 }}>
                    <c.icon size={24} />
                  </Box>
                  <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
                    {c.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {c.description}
                  </Typography>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
