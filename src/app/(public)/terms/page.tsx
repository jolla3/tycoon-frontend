import Link from 'next/link';
import type { Metadata } from 'next';
import { Box, Button } from '@mui/material';
import { LegalDocument } from '@/components/legal/legal-document';
import { termsOfServiceContent } from '@/content/terms-of-service';
import { appConfig } from '@/config/app';

export const metadata: Metadata = {
  title: `Terms of Service · ${appConfig.name}`,
  description: 'Terms of Service for the property management platform operated by JOMUGIT CONSULTING LIMITED.',
};

export default function TermsPage() {
  return (
    <>
      <Box sx={{ px: 2, pt: 2 }}>
        <Button component={Link} href="/" size="small" variant="text" sx={{ color: '#023E8A' }}>
          ← Back to Tycoon Estates
        </Button>
      </Box>
      <LegalDocument content={termsOfServiceContent} />
    </>
  );
}
