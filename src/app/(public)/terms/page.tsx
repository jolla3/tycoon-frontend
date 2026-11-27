import Link from 'next/link';
import type { Metadata } from 'next';
import { Box, Button } from '@mui/material';
import { LegalDocument } from '@/components/legal/legal-document';
import { termsOfServiceContent } from '@/content/terms-of-service';
import { canonicalAlternates } from '@/lib/seo/site';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for the rental and property management platform published by JOMUGIT CONSULTING LIMITED.',
  ...canonicalAlternates('/terms'),
};

export default function TermsPage() {
  return (
    <>
      <Box sx={{ px: 2, pt: 2 }}>
        <Button component={Link} href="/" size="small" variant="text" sx={{ color: '#023E8A' }}>
          ← Back to home
        </Button>
      </Box>
      <LegalDocument content={termsOfServiceContent} />
    </>
  );
}
