import React from 'react';
import { HeroSection } from './HeroSection';
import { PainPointsSection } from './PainPointsSection';
import { AgentChainsSection } from './AgentChainsSection';
import { PricingSection } from './PricingSection';
import { FAQSection } from './FAQSection';
import { LandingFooter } from './LandingFooter';

export const LandingPage: React.FC = () => {
  return (
    <div className="relative min-h-screen bg-black text-white overflow-x-hidden">
      {/* Hero Section */}
      <HeroSection />

      {/* Pain Points Section */}
      <PainPointsSection />

      {/* Agent Chains Section */}
      <AgentChainsSection />

      {/* Pricing Section */}
      <div id="pricing">
        <PricingSection />
      </div>

      {/* FAQ Section */}
      <div id="faq">
        <FAQSection />
      </div>

      {/* Footer */}
      <LandingFooter />
    </div>
  );
};
