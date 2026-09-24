import { Box } from '@mui/material';
import { LandingNav } from '@/features/landing/landing-nav';
import { HeroSection } from '@/features/landing/hero-section';
import { OperationalFlowSection } from '@/features/landing/operational-flow-section';
import { CapabilitiesSection } from '@/features/landing/capabilities-section';
import { DataVisibilitySection } from '@/features/landing/data-visibility-section';
import { SecuritySection } from '@/features/landing/security-section';
import { CtaSection } from '@/features/landing/cta-section';
import { Footer } from '@/components/layout/footer';

export default function LandingPage() {
  return (
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
  );
}
