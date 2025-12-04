import React from 'react';
import { CreativeHeroSection } from './creative/CreativeHeroSection';
import { CreativePainPointsSection } from './creative/CreativePainPointsSection';
import { CreativeAgentChainsSection } from './creative/CreativeAgentChainsSection';
import { CreativePricingSection } from './creative/CreativePricingSection';
import { CreativeFAQSection } from './creative/CreativeFAQSection';
import { CreativeLandingFooter } from './creative/CreativeLandingFooter';
import { LandingHeader } from './LandingHeader'; // Reuse existing header for now, or create a creative one if needed

interface CreativeLandingPageProps {
    isAuthenticated?: boolean;
    username?: string;
    onOpenPayment?: () => void;
    onOpenCabinet?: () => void;
    onLogout?: () => void;
}

export const CreativeLandingPage: React.FC<CreativeLandingPageProps> = ({ isAuthenticated = false, username, onOpenPayment = () => { }, onOpenCabinet = () => { }, onLogout = () => { } }) => {
    return (
        <div className="fixed inset-0 overflow-y-auto overflow-x-hidden bg-[#0a0a0a] text-white selection:bg-purple-500/30">
            <div className="relative min-h-screen">
                {/* Ambient Background Effects */}
                <div className="fixed inset-0 pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse-slow" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse-slow delay-1000" />
                </div>

                {/* Header */}
                <div className="relative z-50">
                    <LandingHeader isAuthenticated={isAuthenticated} username={username} onOpenCabinet={onOpenCabinet} onLogout={onLogout} />
                </div>

                {/* Hero Section */}
                <CreativeHeroSection isAuthenticated={isAuthenticated} onOpenPayment={onOpenPayment} />

                {/* Pain Points Section */}
                <CreativePainPointsSection />

                {/* Agent Chains Section */}
                <CreativeAgentChainsSection />

                {/* Pricing Section */}
                <div id="pricing">
                    <CreativePricingSection isAuthenticated={isAuthenticated} onOpenPayment={onOpenPayment} />
                </div>

                {/* FAQ Section */}
                <div id="faq">
                    <CreativeFAQSection />
                </div>

                {/* Footer */}
                <CreativeLandingFooter />
            </div>
        </div>
    );
};
