import { Alert, AlertTitle } from '@mui/material';
import { ApiError } from '@/lib/api/client';

// Section 41: never render error.message from a raw network/HTTP failure
// to the user. ApiError messages ARE already user-safe (apiResponse.js on
// the backend controls that string), so those pass through; anything else
// gets a generic fallback.
export function ErrorState({ error }: { error: unknown }) {
  const message = error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
  const isNetwork = error instanceof ApiError && error.status === 0;

  return (
    <Alert severity="error">
      <AlertTitle>{isNetwork ? 'Unable to connect' : 'Something went wrong'}</AlertTitle>
      {isNetwork ? 'Your saved information is still available offline.' : message}
    </Alert>
  );
}
