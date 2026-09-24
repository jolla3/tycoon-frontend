'use client';

// src/components/layout/sidebar.tsx
//
// Nav items are filtered by the authenticated user's role (section 14/19).
// This is UX only — the backend's authorize() middleware is what actually
// stops a STAFF user from e.g. connecting a bank account.

import { Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography, Collapse } from '@mui/material';
import {
  LayoutDashboard,
  Building2,
  Home,
  Users,
  Wallet,
  ArrowLeftRight,
  Landmark,
  MessageSquare,
  FileBarChart,
  UserCog,
  Settings,
  Layers,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useSession } from '@/features/auth/session-context';
import { permissions } from '@/lib/permissions/permissions';

const SIDEBAR_WIDTH = 260;

interface NavLeaf {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  icon: LucideIcon;
  items: NavLeaf[];
}

type NavEntry = NavLeaf | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return 'items' in entry;
}

export function Sidebar({ open, onClose, variant }: { open: boolean; onClose: () => void; variant: 'permanent' | 'temporary' }) {
  const pathname = usePathname();
  const { user } = useSession();
  const role = user?.role ?? 'STAFF';

  const nav: NavEntry[] = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    {
      label: 'Properties',
      icon: Building2,
      items: [
        { label: 'Estates', href: '/estates', icon: Building2 },
        { label: 'House Types', href: '/house-types', icon: Layers },
        { label: 'Houses', href: '/houses', icon: Home },
        { label: 'Tenants', href: '/tenants', icon: Users },
      ],
    },
    {
      label: 'Payments',
      icon: Wallet,
      items: [
        { label: 'Overview', href: '/payments', icon: Wallet },
        { label: 'Transactions', href: '/transactions', icon: ArrowLeftRight },
        { label: 'Unmatched', href: '/transactions/unmatched', icon: ArrowLeftRight },
      ],
    },
    ...(permissions.canManageBanking(role) ? [{ label: 'Banking', href: '/banking', icon: Landmark } satisfies NavLeaf] : []),
    { label: 'SMS', href: '/sms', icon: MessageSquare },
    { label: 'Reports', href: '/reports', icon: FileBarChart },
    ...(permissions.canManageStaff(role) ? [{ label: 'Staff', href: '/staff', icon: UserCog } satisfies NavLeaf] : []),
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  const content = (
    <Box sx={{ width: SIDEBAR_WIDTH }}>
      <Toolbar />
      <List sx={{ px: 1 }}>
        {nav.map((entry) =>
          isGroup(entry) ? <NavGroupItem key={entry.label} group={entry} pathname={pathname} /> : <NavLeafItem key={entry.href} item={entry} pathname={pathname} />
        )}
      </List>
    </Box>
  );

  if (variant === 'permanent') {
    return (
      <Drawer variant="permanent" sx={{ width: SIDEBAR_WIDTH, flexShrink: 0, [`& .MuiDrawer-paper`]: { width: SIDEBAR_WIDTH } }}>
        {content}
      </Drawer>
    );
  }

  return (
    <Drawer variant="temporary" open={open} onClose={onClose} ModalProps={{ keepMounted: true }} sx={{ [`& .MuiDrawer-paper`]: { width: SIDEBAR_WIDTH } }}>
      {content}
    </Drawer>
  );
}

function NavLeafItem({ item, pathname }: { item: NavLeaf; pathname: string }) {
  const Icon = item.icon;
  const active = pathname === item.href;
  return (
    <ListItemButton component={Link} href={item.href} selected={active} sx={{ borderRadius: 1.5, mb: 0.5 }}>
      <ListItemIcon sx={{ minWidth: 36, color: active ? 'primary.main' : 'text.secondary' }}>
        <Icon size={18} />
      </ListItemIcon>
      <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14, fontWeight: active ? 600 : 400 }} />
    </ListItemButton>
  );
}

function NavGroupItem({ group, pathname }: { group: NavGroup; pathname: string }) {
  const containsActive = group.items.some((i) => pathname.startsWith(i.href));
  const [expanded, setExpanded] = useState(containsActive);
  const Icon = group.icon;

  return (
    <>
      <ListItemButton onClick={() => setExpanded((e) => !e)} sx={{ borderRadius: 1.5, mb: 0.5 }}>
        <ListItemIcon sx={{ minWidth: 36, color: containsActive ? 'primary.main' : 'text.secondary' }}>
          <Icon size={18} />
        </ListItemIcon>
        <ListItemText primary={group.label} primaryTypographyProps={{ fontSize: 14, fontWeight: containsActive ? 600 : 400 }} />
      </ListItemButton>
      <Collapse in={expanded} unmountOnExit>
        <Box sx={{ pl: 2 }}>
          {group.items.map((item) => (
            <NavLeafItem key={item.href} item={item} pathname={pathname} />
          ))}
        </Box>
      </Collapse>
    </>
  );
}

export { SIDEBAR_WIDTH };
