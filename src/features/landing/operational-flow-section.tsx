'use client';

import { Box, Container, Typography, Stack } from '@mui/material';
import { motion } from 'motion/react';
import { Landmark, ArrowLeftRight, Home, Users, CheckCircle2, ArrowRight } from 'lucide-react';

const STEPS = [
  { label: 'Bank Payment', icon: Landmark },
  { label: 'Transaction', icon: ArrowLeftRight },
  { label: 'House', icon: Home },
  { label: 'Tenant', icon: Users },
  { label: 'Payment Status', icon: CheckCircle2 },
];

export function OperationalFlowSection() {
  return (
    <Box id="operational-flow" sx={{ py: { xs: 8, md: 12 } }}>
      <Container maxWidth="lg">
        <Typography variant="h4" textAlign="center" sx={{ mb: 1 }}>
          From bank payment to payment status
        </Typography>
        <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 6, maxWidth: 560, mx: 'auto' }}>
          Every incoming transaction is automatically matched to a house and reflected in real rent status — no manual
          spreadsheet reconciliation.
        </Typography>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 3, md: 1 }} alignItems="center" justifyContent="center">
          {STEPS.map((step, i) => (
            <Box key={step.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <Stack alignItems="center" spacing={1} sx={{ width: 108 }}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'rgba(0,180,216,0.1)',
                      color: 'primary.dark',
                    }}
                  >
                    <step.icon size={24} />
                  </Box>
                  <Typography variant="caption" textAlign="center" fontWeight={600}>
                    {step.label}
                  </Typography>
                </Stack>
              </motion.div>
              {i < STEPS.length - 1 && (
                <Box sx={{ display: { xs: 'none', md: 'block' }, color: 'divider' }}>
                  <ArrowRight size={20} />
                </Box>
              )}
            </Box>
          ))}
        </Stack>
      </Container>
    </Box>
  );
}
