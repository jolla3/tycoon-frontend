import { Card, CardContent, Skeleton, Stack } from '@mui/material';

export function CardSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <Card>
      <CardContent>
        <Skeleton variant="text" width="50%" height={20} />
        <Stack spacing={1} sx={{ mt: 1 }}>
          {Array.from({ length: lines }).map((_, i) => (
            <Skeleton key={i} variant="text" width={i === 0 ? '70%' : '40%'} height={i === 0 ? 36 : 20} />
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
