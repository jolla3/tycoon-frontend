'use client';

// Public tenant page. Reached from a personal link of the form /pay#t=<token>.
//
// - The token is read from the URL fragment once, held in a ref (memory only)
//   and the fragment is removed from the address bar immediately. It is never
//   written to storage, cookies, query strings, logs or analytics.
// - Responses are deliberately neutral. A received message is evidence waiting
//   to be checked; it is not a payment and says nothing about rent balances.
// - No sign-in, no tenant or house details, no balances are shown here.
import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Container, Stack, TextField, Typography } from '@mui/material';
import { appConfig } from '@/config/app';
import { MPESA_SUBMISSION_MAX_BYTES, submitMpesaSms, utf8Bytes, type PublicSubmissionOutcome } from '@/lib/api/mpesa-public';

type View = 'checking' | 'ready' | 'no_link';

function extractToken(hash: string): string | null {
  const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
  const t = params.get('t');
  return t && t.trim() ? t.trim() : null;
}

const OUTCOME_COPY: Record<Exclude<PublicSubmissionOutcome, 'received'>, string> = {
  unavailable_link: 'This link is not available. Please ask your property manager for a new link.',
  rejected_input: 'We could not accept that message. Please paste the full M-PESA confirmation text and try again.',
  too_large: 'That message is too long. Please paste only the M-PESA confirmation message.',
  try_later: 'We could not send your message right now. Please try again in a moment.',
};

export default function PayPage() {
  const tokenRef = useRef<string | null>(null);
  const [view, setView] = useState<View>('checking');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<PublicSubmissionOutcome | null>(null);

  useEffect(() => {
    const token = extractToken(window.location.hash);
    // Remove the fragment from the address bar and history entry either way.
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname);
    tokenRef.current = token;
    setView(token ? 'ready' : 'no_link');
    return () => {
      tokenRef.current = null;
    };
  }, []);

  const bytes = utf8Bytes(text);
  // The request envelope adds a little overhead beyond the text itself.
  const overLimit = bytes > MPESA_SUBMISSION_MAX_BYTES - 200;

  async function send() {
    const token = tokenRef.current;
    if (!token || busy || !text.trim() || overLimit) return;
    setBusy(true);
    setOutcome(null);
    const result = await submitMpesaSms(token, text.trim());
    setBusy(false);
    setOutcome(result);
    if (result === 'received') setText('');
    if (result === 'unavailable_link') tokenRef.current = null;
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Typography variant="overline" color="text.secondary">{appConfig.name}</Typography>
      <Typography variant="h5" fontWeight={700} gutterBottom>Send your M-PESA message</Typography>

      {view === 'no_link' || outcome === 'unavailable_link' ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          {OUTCOME_COPY.unavailable_link} Open the full link you were given; opening this page directly will not work.
        </Alert>
      ) : null}

      {view === 'ready' && outcome !== 'unavailable_link' ? (
        <Stack spacing={2} sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            After paying, copy the M-PESA confirmation message you received on your phone and paste it below. Your property manager will check it.
          </Typography>
          {outcome === 'received' ? (
            <Alert severity="success">
              Your message was received and will be checked. This does not yet confirm that your payment has been recorded.
            </Alert>
          ) : null}
          {outcome && outcome !== 'received' ? <Alert severity="warning">{OUTCOME_COPY[outcome]}</Alert> : null}
          <TextField
            label="M-PESA confirmation message"
            multiline
            minRows={5}
            value={text}
            onChange={(e) => { setText(e.target.value); if (outcome) setOutcome(null); }}
            disabled={busy}
            autoComplete="off"
            inputProps={{ maxLength: 2000, spellCheck: false }}
            error={overLimit}
            helperText={overLimit ? 'This message is too long.' : `${bytes} of about ${MPESA_SUBMISSION_MAX_BYTES - 200} characters`}
          />
          <Box>
            <Button variant="contained" disabled={busy || !text.trim() || overLimit} onClick={send}>
              {busy ? 'Sending…' : 'Send message'}
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary">
            Only paste the M-PESA message. Do not include your PIN or any other private information.
          </Typography>
        </Stack>
      ) : null}
    </Container>
  );
}
