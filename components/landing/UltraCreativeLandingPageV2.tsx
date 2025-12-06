import React from 'react';
import { UltraHeroSectionV2 } from './ultra/UltraHeroSectionV2';
import { UltraProblemSection } from './ultra/UltraProblemSection';
import { UltraSolutionSection } from './ultra/UltraSolutionSection';
import { UltraPricingSection } from './ultra/UltraPricingSection';
import { UltraFAQSection } from './ultra/UltraFAQSection';
import { UltraFooter } from './ultra/UltraFooter';
import { LandingHeader } from './LandingHeader';

interface UltraCreativeLandingPageV2Props {
    isAuthenticated?: boolean;
    username?: string;
    onOpenPayment?: () => void;
    onOpenCabinet?: () => void;
}

export const UltraCreativeLandingPageV2: React.FC<UltraCreativeLandingPageV2Props> = ({
    isAuthenticated = false,
    username,
    onOpenPayment = () => {},
    onOpenCabinet = () => {},
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
                    />
                </div>

                {/* Hero Section V2 */}
                <UltraHeroSectionV2 isAuthenticated={isAuthenticated} onOpenPayment={onOpenPayment} />

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





