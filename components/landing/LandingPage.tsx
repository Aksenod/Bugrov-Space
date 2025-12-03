import React from 'react';
import { HeroSection } from './HeroSection';
import { PainPointsSection } from './PainPointsSection';
import { AgentChainsSection } from './AgentChainsSection';
import { PricingSection } from './PricingSection';
import { FAQSection } from './FAQSection';
import { LandingFooter } from './LandingFooter';
import { LandingHeader } from './LandingHeader';

interface LandingPageProps {
  isAuthenticated?: boolean;
  username?: string;
  onOpenPayment?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ isAuthenticated = false, username, onOpenPayment = () => { } }) => {
  return (
    <div className="fixed inset-0 overflow-y-auto overflow-x-hidden bg-black">
      <div className="relative min-h-screen text-white">
        {/* Header */}
        <LandingHeader isAuthenticated={isAuthenticated} username={username} />
        {/* Hero Section */}
        <HeroSection isAuthenticated={isAuthenticated} onOpenPayment={onOpenPayment} />

        {/* Pain Points Section */}
        <PainPointsSection />

        {/* Agent Chains Section */}
        <AgentChainsSection />

        {/* Pricing Section */}
        <div id="pricing">
          <PricingSection isAuthenticated={isAuthenticated} onOpenPayment={onOpenPayment} />
        </div>

        {/* FAQ Section */}
        <div id="faq">
          <FAQSection />
        </div>

        {/* Footer */}
        <LandingFooter />
      </div>
    </div>
  );
};
