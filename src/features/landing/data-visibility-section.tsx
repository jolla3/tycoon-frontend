'use client';

import { Box, Container, Typography, Grid, Card, Chip, Stack } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

// Section 9 of the redesign mandate: illustrative marketing data only —
// explicitly labeled as such, never rendered anywhere near real account
// data, and never fetched from the API.
const ILLUSTRATIVE_TREND = [
  { day: '1', collected: 12 },
  { day: '5', collected: 34 },
  { day: '10', collected: 58 },
  { day: '15', collected: 71 },
  { day: '20', collected: 84 },
  { day: '25', collected: 93 },
  { day: '30', collected: 97 },
];

export function DataVisibilitySection() {
  return (
    <Box sx={{ py: { xs: 8, md: 12 } }}>
      <Container maxWidth="md">
        <Typography variant="h4" textAlign="center" sx={{ mb: 1 }}>
          See exactly where collection stands
        </Typography>
        <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 4 }}>
          Expected rent, what&apos;s been collected, and what remains outstanding — always for a clearly stated period.
        </Typography>

        <Card sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="subtitle2">Collection progress this month</Typography>
            <Chip size="small" label="Illustrative example" variant="outlined" color="default" />
          </Stack>
          <Box sx={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ILLUSTRATIVE_TREND}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} label={{ value: 'Day of month', position: 'insideBottom', offset: -4, fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} unit="%" />
                <Tooltip formatter={(v: number) => `${v}% of expected rent`} />
                <Line type="monotone" dataKey="collected" stroke="#00B4D8" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={4}>
              <Typography variant="caption" color="text.secondary">
                Paid
              </Typography>
              <Typography variant="h6" color="success.main" sx={{ fontFamily: '"IBM Plex Mono", monospace' }}>
                52
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="caption" color="text.secondary">
                Partial
              </Typography>
              <Typography variant="h6" color="warning.main" sx={{ fontFamily: '"IBM Plex Mono", monospace' }}>
                8
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="caption" color="text.secondary">
                Unpaid
              </Typography>
              <Typography variant="h6" color="error.main" sx={{ fontFamily: '"IBM Plex Mono", monospace' }}>
                15
              </Typography>
            </Grid>
          </Grid>
        </Card>
      </Container>
    </Box>
  );
}
