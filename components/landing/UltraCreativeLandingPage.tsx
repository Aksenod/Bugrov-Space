import React from 'react';
import { UltraHeroSection } from './ultra/UltraHeroSection';
import { UltraProblemSection } from './ultra/UltraProblemSection';
import { UltraSolutionSection } from './ultra/UltraSolutionSection';
import { UltraFeaturesSection } from './ultra/UltraFeaturesSection';
import { UltraPricingSection } from './ultra/UltraPricingSection';
import { UltraFAQSection } from './ultra/UltraFAQSection';
import { UltraFooter } from './ultra/UltraFooter';
import { LandingHeader } from './LandingHeader';

interface UltraCreativeLandingPageProps {
    isAuthenticated?: boolean;
    username?: string;
    onOpenPayment?: () => void;
    onOpenCabinet?: () => void;
}

export const UltraCreativeLandingPage: React.FC<UltraCreativeLandingPageProps> = ({
    isAuthenticated = false,
    username,
    onOpenPayment = () => {},
    onOpenCabinet = () => {},
}) => {
    return (
        <div className="fixed inset-0 overflow-y-auto overflow-x-hidden bg-[#000000] text-white selection:bg-purple-500/30">
            <div className="relative min-h-screen">
                {/* Enhanced Ambient Background Effects */}
                <div className="fixed inset-0 pointer-events-none z-0">
                    {/* Animated Gradient Orbs */}
                    <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/15 rounded-full blur-[150px] animate-blob" />
                    <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/15 rounded-full blur-[150px] animate-blob" style={{ animationDelay: '2s' }} />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-pink-600/10 rounded-full blur-[200px] animate-pulse-slow" />
                    
                    {/* Grid Pattern Overlay */}
                    <div 
                        className="absolute inset-0 opacity-[0.02]"
                        style={{
                            backgroundImage: `
                                linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                                linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
                            `,
                            backgroundSize: '50px 50px',
                        }}
                    />
                </div>

                {/* Header */}
                <div className="relative z-50">
                    <LandingHeader 
                        isAuthenticated={isAuthenticated} 
                        username={username} 
                        onOpenCabinet={onOpenCabinet} 
                    />
                </div>

                {/* Hero Section */}
                <UltraHeroSection isAuthenticated={isAuthenticated} onOpenPayment={onOpenPayment} />

                {/* Problem Section */}
                <UltraProblemSection />

                {/* Solution Section */}
                <UltraSolutionSection />

                {/* Features Section */}
                <UltraFeaturesSection />

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

