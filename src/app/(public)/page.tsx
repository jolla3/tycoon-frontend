import { Box } from '@mui/material';
import { LandingNav } from '@/features/landing/landing-nav';
import { HeroSection } from '@/features/landing/hero-section';
import { OperationalFlowSection } from '@/features/landing/operational-flow-section';
import { CapabilitiesSection } from '@/features/landing/capabilities-section';
import { DataVisibilitySection } from '@/features/landing/data-visibility-section';
import { SecuritySection } from '@/features/landing/security-section';
import { CtaSection } from '@/features/landing/cta-section';
import { Footer } from '@/components/layout/footer';
import { appConfig } from '@/config/app';

const publisherStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: appConfig.companyBrandName,
  legalName: appConfig.legalCompanyName,
  description: 'Publisher of rental and property management software.',
};

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(publisherStructuredData).replace(/</g, '\\u003c'),
        }}
      />
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <LandingNav />
      <HeroSection />
      <OperationalFlowSection />
      <CapabilitiesSection />
      <DataVisibilitySection />
      <SecuritySection />
      <CtaSection />
      <Footer />
      </Box>
    </>
  );
}
