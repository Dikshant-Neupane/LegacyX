'use client';

import { HeroSection } from '@/components/vault/HeroSection';
import { ProblemSection } from '@/components/vault/ProblemSection';
import { HowItWorksSection } from '@/components/vault/HowItWorksSection';
import { TrustSection } from '@/components/vault/TrustSection';
import { BusinessCaseSection } from '@/components/vault/BusinessCaseSection';
import { Footer } from '@/components/layout/Footer';

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <ProblemSection />
      <HowItWorksSection />
      <TrustSection />
      <BusinessCaseSection />
      <Footer />
    </>
  );
}
