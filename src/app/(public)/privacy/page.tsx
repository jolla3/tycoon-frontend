import Link from 'next/link';
import type { Metadata } from 'next';
import { Box, Button } from '@mui/material';
import { LegalDocument } from '@/components/legal/legal-document';
import { privacyPolicyContent } from '@/content/privacy-policy';
import { canonicalAlternates } from '@/lib/seo/site';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for the rental and property management platform published by JOMUGIT CONSULTING LIMITED.',
  ...canonicalAlternates('/privacy'),
};

export default function PrivacyPage() {
  return (
    <>
      <Box sx={{ px: 2, pt: 2 }}>
        <Button component={Link} href="/" size="small" variant="text" sx={{ color: '#023E8A' }}>
          ← Back to home
        </Button>
      </Box>
      <LegalDocument content={privacyPolicyContent} />
    </>
  );
}
