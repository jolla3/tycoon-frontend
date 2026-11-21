'use client';

import { Box, AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItemButton, ListItemIcon, ListItemText, useMediaQuery, useTheme, Avatar, Menu, MenuItem, Divider } from '@mui/material';
import { LayoutDashboard, Building2, Users, CreditCard, Shield, Activity, LogOut, Menu as MenuIcon, UserRound, KeyRound, Landmark, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { appConfig } from '@/config/app';
import { authApi } from '@/lib/api/auth';
import { useInvalidateSession, useSession } from '@/features/auth/session-context';
import { ConnectionStatus } from '@/features/notifications/connection-status';

const WIDTH = 240;

const NAV = [
  { label: 'Overview', href: '/platform', icon: LayoutDashboard },
  { label: 'Clients', href: '/platform/clients', icon: Building2 },
  { label: 'Users', href: '/platform/users', icon: Users },
  { label: 'Subscriptions', href: '/platform/subscriptions', icon: CreditCard },
  { label: 'Entitlements', href: '/platform/entitlements', icon: KeyRound },
  { label: 'Banking monitor', href: '/platform/integrations/banking', icon: Landmark },
  { label: 'M-PESA monitor', href: '/platform/integrations/mpesa', icon: Smartphone },
  { label: 'System Health', href: '/platform/health', icon: Activity },
  { label: 'Audit', href: '/platform/audit', icon: Shield },
];

export function PlatformShell({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useSession();
  const invalidateSession = useInvalidateSession();
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  async function handleLogout() {
    setAnchorEl(null);
    try {
      await authApi.logout();
    } catch {
      // best-effort
    } finally {
      invalidateSession();
      router.push('/login');
    }
  }

  const nav = (
    <Box sx={{ width: WIDTH }}>
      <Toolbar />
      <List sx={{ px: 1 }}>
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== '/platform' && pathname.startsWith(item.href));
          return (
            <ListItemButton key={item.href} component={Link} href={item.href} selected={active} sx={{ borderRadius: 1.5, mb: 0.5 }} onClick={() => setOpen(false)}>
              <ListItemIcon sx={{ minWidth: 36, color: active ? 'primary.main' : 'text.secondary' }}>
                <Icon size={18} />
              </ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14, fontWeight: active ? 600 : 400 }} />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar sx={{ gap: 1 }}>
          {!isDesktop && (
            <IconButton edge="start" onClick={() => setOpen(true)} aria-label="Open platform navigation">
              <MenuIcon size={20} />
            </IconButton>
          )}
          <Typography variant="h6" sx={{ fontSize: 16, mr: 2 }}>
            {appConfig.shortName} · Platform
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <ConnectionStatus />
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} aria-label="Profile menu">
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}>{user?.name?.charAt(0).toUpperCase() ?? <UserRound size={16} />}</Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="body2" fontWeight={600}>
                {user?.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                SUPER_ADMIN
              </Typography>
            </Box>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <LogOut size={16} style={{ marginRight: 8 }} />
              Log out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      {isDesktop ? (
        <Drawer variant="permanent" sx={{ width: WIDTH, flexShrink: 0, [`& .MuiDrawer-paper`]: { width: WIDTH } }}>
          {nav}
        </Drawer>
      ) : (
        <Drawer variant="temporary" open={open} onClose={() => setOpen(false)} ModalProps={{ keepMounted: true }} sx={{ [`& .MuiDrawer-paper`]: { width: `min(${WIDTH}px, calc(100vw - 24px))`, boxSizing: 'border-box' } }}>
          {nav}
        </Drawer>
      )}
      <Box component="main" sx={{ flex: '1 1 0', minWidth: 0, maxWidth: '100%', p: { xs: 1.5, sm: 2, md: 3 }, mt: 8 }}>
        {children}
      </Box>
    </Box>
  );
}
