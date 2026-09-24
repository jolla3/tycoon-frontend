'use client';

import { Box, useMediaQuery, useTheme } from '@mui/material';
import { useState, type ReactNode } from 'react';
import { Topbar } from './topbar';
import { Sidebar } from './sidebar';
import { Footer } from './footer';
import { surfaces } from '@/theme/theme';

export function AppShell({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Topbar onMenuClick={() => setMobileNavOpen(true)} />
      <Sidebar variant={isDesktop ? 'permanent' : 'temporary'} open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', background: surfaces.pageCanvas }}>
        <Box sx={{ height: 64 }} /> {/* Toolbar offset */}
        <Box sx={{ flexGrow: 1, p: { xs: 2, md: 3 } }}>{children}</Box>
        <Footer />
      </Box>
    </Box>
  );
}
