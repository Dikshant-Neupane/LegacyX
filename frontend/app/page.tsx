'use client';

import { HeroSection } from '@/components/vault/HeroSection';
import { HowItWorksSection } from '@/components/vault/HowItWorksSection';
import { TrustSection } from '@/components/vault/TrustSection';
import { Footer } from '@/components/layout/Footer';

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <HowItWorksSection />
      <TrustSection />
      <Footer />
    </>
  );
}
