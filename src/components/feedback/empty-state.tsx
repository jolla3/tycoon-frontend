import { Box, Typography } from '@mui/material';
import type { LucideIcon } from 'lucide-react';

export function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <Box sx={{ textAlign: 'center', py: 6, px: 2, color: 'text.secondary' }}>
      <Icon size={32} strokeWidth={1.5} />
      <Typography variant="subtitle1" sx={{ mt: 1.5, color: 'text.primary' }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.5, maxWidth: 360, mx: 'auto' }}>
        {description}
      </Typography>
    </Box>
  );
}
