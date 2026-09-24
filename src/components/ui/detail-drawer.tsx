import { Drawer, Box, Typography, IconButton, Divider } from '@mui/material';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface DetailDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}

// Section 19/34: this is how we show detail without ever putting a Mongo
// _id in the URL — the drawer is driven entirely by client-side selection
// state, closed by the caller when the underlying list item is deselected.
export function DetailDrawer({ open, onClose, title, subtitle, children, actions }: DetailDrawerProps) {
  return (
    <Drawer anchor="right" open={open} onClose={onClose} ModalProps={{ keepMounted: true }} sx={{ [`& .MuiDrawer-paper`]: { width: { xs: '100%', sm: 420 } } }}>
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box>
            <Typography variant="h6">{title}</Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <IconButton onClick={onClose} aria-label="Close" size="small">
            <X size={18} />
          </IconButton>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>{children}</Box>
        {actions && (
          <>
            <Divider sx={{ mt: 2, mb: 2 }} />
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>{actions}</Box>
          </>
        )}
      </Box>
    </Drawer>
  );
}
