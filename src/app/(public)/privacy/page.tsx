import Link from 'next/link';
import type { Metadata } from 'next';
import { Box, Button } from '@mui/material';
import { LegalDocument } from '@/components/legal/legal-document';
import { privacyPolicyContent } from '@/content/privacy-policy';
import { appConfig } from '@/config/app';

export const metadata: Metadata = {
  title: `Privacy Policy · ${appConfig.name}`,
  description: 'Privacy Policy for the property management platform operated by JOMUGIT CONSULTING LIMITED.',
};

export default function PrivacyPage() {
  return (
    <>
      <Box sx={{ px: 2, pt: 2 }}>
        <Button component={Link} href="/" size="small" variant="text" sx={{ color: '#023E8A' }}>
          ← Back to Tycoon Estates
        </Button>
      </Box>
      <LegalDocument content={privacyPolicyContent} />
    </>
  );
}
