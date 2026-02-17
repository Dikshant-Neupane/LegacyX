'use client';

import { HeroSection } from '@/components/vault/HeroSection';
import { ProblemSection } from '@/components/vault/ProblemSection';
import { WhatIsSection } from '@/components/vault/WhatIsSection';
import { HowItWorksSection } from '@/components/vault/HowItWorksSection';
import { TrustSection } from '@/components/vault/TrustSection';
import { Footer } from '@/components/layout/Footer';

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <ProblemSection />
      <WhatIsSection />
      <HowItWorksSection />
      <TrustSection />
      <Footer />
    </>
  );
}
