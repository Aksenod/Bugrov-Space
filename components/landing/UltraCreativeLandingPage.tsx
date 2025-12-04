import React from 'react';
import { UltraHeroSection } from './ultra/UltraHeroSection';
import { UltraProblemSection } from './ultra/UltraProblemSection';
import { UltraSolutionSection } from './ultra/UltraSolutionSection';
import { UltraPricingSection } from './ultra/UltraPricingSection';
import { UltraFAQSection } from './ultra/UltraFAQSection';
import { UltraFooter } from './ultra/UltraFooter';
import { LandingHeader } from './LandingHeader';

interface UltraCreativeLandingPageProps {
    isAuthenticated?: boolean;
    username?: string;
    onOpenPayment?: () => void;
    onOpenCabinet?: () => void;
    onLogout?: () => void;
}

export const UltraCreativeLandingPage: React.FC<UltraCreativeLandingPageProps> = ({
    isAuthenticated = false,
    username,
    onOpenPayment = () => {},
    onOpenCabinet = () => {},
    onLogout = () => {},
}) => {
    return (
        <div className="fixed inset-0 overflow-y-auto overflow-x-hidden bg-[#000000] text-white selection:bg-purple-500/30">
            <div className="relative min-h-screen">
                {/* Enhanced Ambient Background Effects - упрощено */}
                <div className="fixed inset-0 pointer-events-none z-0">
                    {/* Animated Gradient Orbs - уменьшено количество */}
                    <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/12 rounded-full blur-[120px] animate-blob will-change-transform" />
                    <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/12 rounded-full blur-[120px] animate-blob will-change-transform" style={{ animationDelay: '2s' }} />
                </div>

                {/* Header */}
                <div className="relative z-50">
                    <LandingHeader 
                        isAuthenticated={isAuthenticated} 
                        username={username} 
                        onOpenCabinet={onOpenCabinet} 
                        onLogout={onLogout}
                    />
                </div>

                {/* Hero Section */}
                <UltraHeroSection isAuthenticated={isAuthenticated} onOpenPayment={onOpenPayment} />

                {/* Problem Section */}
                <UltraProblemSection />

                {/* Solution Section */}
                <UltraSolutionSection />

                {/* Pricing Section */}
                <div id="pricing">
                    <UltraPricingSection isAuthenticated={isAuthenticated} onOpenPayment={onOpenPayment} />
                </div>

                {/* FAQ Section */}
                <div id="faq">
                    <UltraFAQSection />
                </div>

                {/* Footer */}
                <UltraFooter />
            </div>
        </div>
    );
};

