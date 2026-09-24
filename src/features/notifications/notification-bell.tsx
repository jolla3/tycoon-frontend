'use client';

import { Badge, IconButton, Menu, MenuItem, Typography, Box, Button, Divider } from '@mui/material';
import { Bell } from 'lucide-react';
import { useState } from 'react';
import { useNotifications } from './notification-context';
import { dateFormat } from '@/lib/dates/period';

export function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  return (
    <>
      <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} aria-label="Notifications">
        <Badge badgeContent={unreadCount} color="error">
          <Bell size={20} />
        </Badge>
      </IconButton>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)} PaperProps={{ sx: { width: 340, maxHeight: 420 } }}>
        <Box sx={{ px: 2, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle2">Notifications</Typography>
          {notifications.length > 0 && (
            <Button size="small" onClick={markAllRead}>
              Mark all read
            </Button>
          )}
        </Box>
        <Divider />
        {notifications.length === 0 ? (
          <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No local activity notifications. Server-side notification inbox is not available from the API.
            </Typography>
          </Box>
        ) : (
          notifications.map((n) => (
            <MenuItem key={n.id} onClick={() => markRead(n.id)} sx={{ whiteSpace: 'normal', alignItems: 'flex-start', opacity: n.read ? 0.6 : 1 }}>
              <Box>
                <Typography variant="body2">{n.message}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {dateFormat(n.timestamp, 'DD MMM, HH:mm')}
                </Typography>
              </Box>
            </MenuItem>
          ))
        )}
      </Menu>
    </>
  );
}
