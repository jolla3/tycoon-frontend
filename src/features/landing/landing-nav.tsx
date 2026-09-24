'use client';

import { useState } from 'react';
import { AppBar, Toolbar, Typography, Button, Stack, IconButton, Drawer, Box } from '@mui/material';
import { Menu as MenuIcon, X } from 'lucide-react';
import Link from 'next/link';
import { appConfig } from '@/config/app';

const LINKS = [
  { label: 'Platform', href: '#operational-flow' },
  { label: 'Features', href: '#capabilities' },
  { label: 'Security', href: '#security' },
];

export function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)' }}>
      <Toolbar sx={{ maxWidth: 1200, width: '100%', mx: 'auto' }}>
        <Typography variant="h6" component={Link} href="/" sx={{ textDecoration: 'none', color: 'inherit', fontSize: 16, flexGrow: 1 }}>
          {appConfig.name}
        </Typography>

        <Stack direction="row" spacing={3} sx={{ display: { xs: 'none', md: 'flex' } }} alignItems="center">
          {LINKS.map((l) => (
            <Typography key={l.href} component="a" href={l.href} variant="body2" color="text.secondary" sx={{ textDecoration: 'none', '&:hover': { color: 'primary.dark' } }}>
              {l.label}
            </Typography>
          ))}
          <Button component={Link} href="/login" variant="contained" size="small">
            Sign In
          </Button>
        </Stack>

        <IconButton sx={{ display: { md: 'none' } }} onClick={() => setOpen(true)} aria-label="Open menu">
          <MenuIcon size={20} />
        </IconButton>
      </Toolbar>

      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: 260, p: 2 }}>
          <IconButton onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={18} />
          </IconButton>
          <Stack spacing={2} sx={{ mt: 2, px: 1 }}>
            {LINKS.map((l) => (
              <Typography key={l.href} component="a" href={l.href} onClick={() => setOpen(false)} sx={{ textDecoration: 'none', color: 'text.primary' }}>
                {l.label}
              </Typography>
            ))}
            <Button component={Link} href="/login" variant="contained" fullWidth>
              Sign In
            </Button>
          </Stack>
        </Box>
      </Drawer>
    </AppBar>
  );
}
