import { Box, Typography, Button, Stack } from '@mui/material';
import { WifiOff, ServerCrash, RefreshCw } from 'lucide-react';
import { appConfig } from '@/config/app';

interface ServerUnavailableProps {
  variant?: 'network' | 'server';
  onRetry?: () => void;
}

// Section 15/39 of the redesign mandate: a network/server failure must
// become exactly this — never a raw ApiError message, never a Next.js
// error overlay, never a blank white screen.
export function ServerUnavailable({ variant = 'network', onRetry }: ServerUnavailableProps) {
  const Icon = variant === 'network' ? WifiOff : ServerCrash;
  const title = variant === 'network' ? "Can't reach the server" : 'The server ran into a problem';
  const description =
    variant === 'network'
      ? 'Check your internet connection. Any information already loaded is still available to view.'
      : `${appConfig.name} is temporarily unavailable. Your data has not been changed — please try again shortly.`;

  return (
    <Box
      sx={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        px: 3,
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'rgba(0,180,216,0.1)',
          color: 'primary.dark',
          mb: 2,
        }}
      >
        <Icon size={28} />
      </Box>
      <Typography variant="h6">{title}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 380, mt: 0.5, mb: 3 }}>
        {description}
      </Typography>
      {onRetry && (
        <Stack direction="row" spacing={1}>
          <Button variant="contained" startIcon={<RefreshCw size={16} />} onClick={onRetry}>
            Try again
          </Button>
        </Stack>
      )}
    </Box>
  );
}
