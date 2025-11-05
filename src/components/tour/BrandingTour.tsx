// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { TourSpotlight, TourStep } from './TourSpotlight';
import { useTour } from '@/contexts/TourContext';
import { toast } from 'sonner';

const TOUR_NAME = 'branding-settings';

interface BrandingTourProps {
  onComplete?: () => void;
}

export const BrandingTour: React.FC<BrandingTourProps> = ({ onComplete }) => {
  const { isTourCompleted, isTourSkipped, completeTour, skipTour } = useTour();
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const tourSteps: TourStep[] = [
    {
      target: '[data-tour="branding-title"]',
      title: 'Welcome to Branding Settings! 🎨',
      description: 'Customize your audit portal to match your company\'s brand identity. This tour will guide you through choosing the perfect color palette and adding your logo.',
      position: 'bottom',
    },
    {
      target: '[data-tour="tabs"]',
      title: 'Two Main Sections',
      description: 'Start with "Colors" to build your color palette, then switch to "Logo & Branding" to upload your logo and set organization details.',
      position: 'bottom',
      action: () => {
        // Make sure we're on the right tab
        const colorsTab = document.querySelector('[value="colors"]') as HTMLElement;
        colorsTab?.click();
      }
    },
    {
      target: '[data-tour="sidebar-colors"]',
      title: 'Sidebar Color Theme 🎨',
      description: 'The sidebar is your navigation menu on the left. Choose a dark color for Background (like navy or charcoal) and light color for Text (white or light gray). This creates professional contrast for easy navigation.',
      position: 'right',
    },
    {
      target: '[data-tour="body-colors"]',
      title: 'Main Content Area Colors 📄',
      description: 'Body Background sets the color of your main workspace. Choose a light, comfortable color (like cream, light blue, or white). Body Text should be dark for readability. Pro tip: Light backgrounds with dark text are easiest to read!',
      position: 'right',
    },
    {
      target: '[data-tour="brand-colors"]',
      title: 'Your Brand Color Palette 🎨',
      description: 'Primary Color: Used for buttons, links, and key actions (choose your main brand color). Primary Text: Automatically adjusts for contrast. Accent Color: For badges and highlights (choose a complementary color). Create a cohesive look by using 2-3 colors max!',
      position: 'right',
    },
    {
      target: '[data-tour="logo-tab"]',
      title: 'Switch to Logo & Branding Tab',
      description: 'Now that colors are set, let\'s add your organization details and logo. Click this tab to continue.',
      position: 'bottom',
      action: () => {
        const logoTab = document.querySelector('[value="logo"]') as HTMLElement;
        logoTab?.click();
      }
    },
    {
      target: '[data-tour="org-name"]',
      title: 'Your Organization Name 🏢',
      description: 'Enter your company or firm name (e.g., "Acme Accounting", "Smith & Partners"). This appears in the sidebar, login page, and throughout the portal.',
      position: 'right',
    },
    {
      target: '[data-tour="org-subname"]',
      title: 'Organization Tagline/Subtitle 📝',
      description: 'Add a professional subtitle that describes your services (e.g., "AUDIT & COMPLIANCE", "CERTIFIED PUBLIC ACCOUNTANTS", "PROFESSIONAL SERVICES"). This appears beneath your organization name.',
      position: 'right',
    },
    {
      target: '[data-tour="logo-upload"]',
      title: 'Upload Your Company Logo 🖼️',
      description: 'Upload your logo (PNG, JPG, or SVG). Recommended size: 200x200px or 400x400px for best quality. AI will analyze your logo and can suggest matching color themes automatically!',
      position: 'right',
    },
    {
      target: '[data-tour="save-button"]',
      title: 'Save & Apply Changes ✅',
      description: 'Click here to save your branding settings. Changes apply instantly across the entire portal - sidebar, dashboards, login pages, and all authentication screens!',
      position: 'top',
    },
    {
      target: '[data-tour="reset-button"]',
      title: 'Reset to Default Theme 🔄',
      description: 'Made a mistake or want to start fresh? Click Reset to Defaults to restore the original professional theme. Your logo will be removed and colors will reset.',
      position: 'top',
    },
  ];

  useEffect(() => {
    // Check if tour should be shown
    const shouldShowTour = !isTourCompleted(TOUR_NAME) && !isTourSkipped(TOUR_NAME);
    
    if (shouldShowTour) {
      // Longer delay to ensure page is fully rendered
      setTimeout(() => setIsActive(true), 1000);
    }
  }, [isTourCompleted, isTourSkipped]);

  // Reset to first step when tour becomes active
  useEffect(() => {
    if (isActive) {
      setCurrentStep(0);
    }
  }, [isActive]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = async () => {
    await skipTour(TOUR_NAME);
    setIsActive(false);
    toast.info('Tour skipped. You can restart it anytime from the help menu.');
  };

  const handleComplete = async () => {
    await completeTour(TOUR_NAME);
    setIsActive(false);
    toast.success('🎉 Tour completed! You\'re ready to customize your portal.');
    onComplete?.();
  };

  if (!isActive) return null;

  return (
    <TourSpotlight
      steps={tourSteps}
      currentStep={currentStep}
      onNext={handleNext}
      onPrevious={handlePrevious}
      onSkip={handleSkip}
      onComplete={handleComplete}
      tourName={TOUR_NAME}
    />
  );
};

// Export function to manually trigger the tour
export const restartBrandingTour = () => {
  // This will be called from a help button
  return TOUR_NAME;
};

