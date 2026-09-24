'use client';

import { AppBar, Toolbar, Typography, IconButton, Box, Menu, MenuItem, Avatar, Divider } from '@mui/material';
import { Menu as MenuIcon, LogOut, UserRound } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { appConfig } from '@/config/app';
import { authApi } from '@/lib/api/auth';
import { useInvalidateSession, useSession } from '@/features/auth/session-context';
import { ConnectionStatus } from '@/features/notifications/connection-status';
import { NotificationBell } from '@/features/notifications/notification-bell';

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user } = useSession();
  const invalidateSession = useInvalidateSession();
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  async function handleLogout() {
    setAnchorEl(null);
    // Section 9 of this pass: logout must be resilient to a failed API
    // call. Whatever happens server-side, we always drop local session
    // state and navigate away — a user must never get stuck "logged in"
    // on-screen just because the logout request itself failed.
    try {
      await authApi.logout();
    } catch {
      // Best-effort — the session cookie may already be gone/expired, or
      // the server is briefly unreachable. Either way we still log the
      // user out locally below.
    } finally {
      invalidateSession();
      router.push('/login');
    }
  }

  return (
    <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
      <Toolbar sx={{ gap: 1 }}>
        <IconButton edge="start" onClick={onMenuClick} sx={{ display: { md: 'none' } }} aria-label="Open navigation">
          <MenuIcon size={20} />
        </IconButton>
        <Typography variant="h6" component={Link} href="/dashboard" sx={{ textDecoration: 'none', color: 'inherit', fontSize: 16, mr: 2 }}>
          {appConfig.name}
        </Typography>

        <Box sx={{ flexGrow: 1 }} />

        <ConnectionStatus />
        <NotificationBell />

        <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} aria-label="Profile menu">
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}>{user?.name?.charAt(0).toUpperCase() ?? <UserRound size={16} />}</Avatar>
        </IconButton>
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="body2" fontWeight={600}>
              {user?.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.role}
            </Typography>
          </Box>
          <Divider />
          <MenuItem component={Link} href="/profile" onClick={() => setAnchorEl(null)}>
            Profile
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            <LogOut size={16} style={{ marginRight: 8 }} />
            Log out
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
