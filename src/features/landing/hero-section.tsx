'use client';

import dynamic from 'next/dynamic';
import { Box, Typography, Button, Stack, Container } from '@mui/material';
import { motion } from 'motion/react';
import Link from 'next/link';
import { appConfig } from '@/config/app';
import { surfaces } from '@/theme/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { EstateSceneStatic } from './estate-scene-static';

// Section 37: the 3D chunk must never block first render. Dynamically
// imported, client-only, and only requested at all when motion isn't reduced.
const EstateSceneCanvas = dynamic(() => import('./estate-scene-canvas'), {
  ssr: false,
  loading: () => <EstateSceneStatic />,
});

export function HeroSection() {
  const reducedMotion = useReducedMotion();

  return (
    <Box sx={{ background: surfaces.heroCanvas, pt: { xs: 10, md: 14 }, pb: { xs: 6, md: 10 } }}>
      <Container maxWidth="lg">
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={6} alignItems="center">
          <Box sx={{ flex: 1 }}>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <Typography
                variant="h2"
                sx={{ fontSize: { xs: '2.1rem', md: '2.9rem' }, lineHeight: 1.15, mb: 2 }}
              >
                Property management,{' '}
                <Box component="span" sx={{ color: 'primary.dark' }}>
                  simplified.
                </Box>
              </Typography>
              <Typography variant="h6" color="text.secondary" fontWeight={400} sx={{ mb: 4, maxWidth: 480 }}>
                {appConfig.description}. Connect your bank account, watch rent payments reconcile automatically, and know
                exactly what&apos;s outstanding.
              </Typography>
              <Stack direction="row" spacing={2}>
                <Button component={Link} href="/login" variant="contained" size="large">
                  Sign In
                </Button>
                <Button component="a" href="#operational-flow" variant="text" size="large">
                  See how it works
                </Button>
              </Stack>
            </motion.div>
          </Box>

          <Box sx={{ flex: 1, width: '100%' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              style={{ width: '100%', aspectRatio: '16 / 10', borderRadius: 16, overflow: 'hidden', border: '1px solid #E2E8F0' }}
            >
              {reducedMotion ? <EstateSceneStatic /> : <EstateSceneCanvas />}
            </motion.div>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
