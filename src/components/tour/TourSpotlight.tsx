// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, ArrowRight, ArrowLeft, Sparkles, SkipForward, MoveDown, MoveUp, MoveLeft, MoveRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TourStep {
  target: string; // CSS selector for the element to highlight
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: () => void; // Optional action to perform before showing this step
}

interface TourSpotlightProps {
  steps: TourStep[];
  currentStep: number;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  onComplete: () => void;
  tourName: string;
}

export const TourSpotlight: React.FC<TourSpotlightProps> = ({
  steps,
  currentStep,
  onNext,
  onPrevious,
  onSkip,
  onComplete,
  tourName,
}) => {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  const step = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  useEffect(() => {
    if (!step) return;

    // Execute optional action
    if (step.action) {
      step.action();
    }

    // Small delay to let DOM update
    setTimeout(() => {
      const element = document.querySelector(step.target) as HTMLElement;
      if (element) {
        // Scroll element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        
        // Update position on scroll and resize
        const updatePosition = () => {
          const rect = element.getBoundingClientRect();
          setTargetRect(rect);

          // Calculate tooltip position based on viewport (fixed positioning)
          // Tooltip is roughly 384px wide (max-w-md) and variable height
          const tooltipWidth = 384;
          const tooltipHeight = 300; // Approximate height
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          const padding = 20;

          let top = 0;
          let left = 0;
          let finalPosition = step.position || 'bottom';

          // Calculate tooltip position accounting for transform
          // Transform will move it, so we calculate the anchor point
          let position = step.position || 'bottom';

          // Determine best position if the preferred one doesn't fit
          const canFitRight = rect.right + padding + tooltipWidth < viewportWidth - padding;
          const canFitLeft = rect.left - padding - tooltipWidth > padding;
          const canFitBottom = rect.bottom + padding + tooltipHeight < viewportHeight - padding;
          const canFitTop = rect.top - padding - tooltipHeight > padding;

          // Override position if it doesn't fit
          if (position === 'right' && !canFitRight && canFitLeft) {
            position = 'left';
          } else if (position === 'left' && !canFitLeft && canFitRight) {
            position = 'right';
          } else if (position === 'right' && !canFitRight && !canFitLeft) {
            position = canFitBottom ? 'bottom' : 'top';
          }

          // Calculate position based on final decision
          switch (position) {
            case 'top':
              top = rect.top - padding - 10;
              left = rect.left + rect.width / 2;
              break;
            case 'bottom':
              top = rect.bottom + padding + 10;
              left = rect.left + rect.width / 2;
              break;
            case 'left':
              top = rect.top + rect.height / 2;
              left = rect.left - padding - 10;
              break;
            case 'right':
              top = rect.top + rect.height / 2;
              left = rect.right + padding + 10;
              break;
          }

          // Clamp to viewport boundaries accounting for transform
          if (position === 'top' || position === 'bottom') {
            // Centered horizontally, so account for half width
            const halfWidth = tooltipWidth / 2;
            left = Math.max(halfWidth + padding, Math.min(viewportWidth - halfWidth - padding, left));
          } else {
            // left/right position, account for full width
            if (position === 'right') {
              left = Math.min(viewportWidth - tooltipWidth - padding, left);
            } else {
              left = Math.max(tooltipWidth + padding, left);
            }
          }

          // Clamp vertically
          if (position === 'left' || position === 'right') {
            const halfHeight = tooltipHeight / 2;
            top = Math.max(halfHeight + padding, Math.min(viewportHeight - halfHeight - padding, top));
          } else {
            if (position === 'bottom') {
              top = Math.min(viewportHeight - tooltipHeight - padding, top);
            } else {
              top = Math.max(tooltipHeight + padding, top);
            }
          }

          finalPosition = position;

          setTooltipPosition({ top, left });
        };

        updatePosition();
        
        // Update position on scroll and resize
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);

        return () => {
          window.removeEventListener('scroll', updatePosition, true);
          window.removeEventListener('resize', updatePosition);
        };
      }
    }, 100);
  }, [step, currentStep]);

  if (!step || !targetRect) return null;

  return (
    <>
      {/* Dark overlay with spotlight cutout - FIXED positioning */}
      <div className="fixed inset-0 z-[9999] pointer-events-none">
        <svg width="100%" height="100%" className="absolute inset-0">
          <defs>
            <mask id="spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={targetRect.left - 8}
                y={targetRect.top - 8}
                width={targetRect.width + 16}
                height={targetRect.height + 16}
                rx="12"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.75)"
            mask="url(#spotlight-mask)"
          />
        </svg>

        {/* Animated highlight ring - FIXED positioning */}
        <div
          className="absolute animate-pulse pointer-events-none"
          style={{
            top: targetRect.top - 12,
            left: targetRect.left - 12,
            width: targetRect.width + 24,
            height: targetRect.height + 24,
            border: '4px solid hsl(var(--accent))',
            borderRadius: '16px',
            boxShadow: '0 0 0 4px hsl(var(--accent) / 0.2), 0 0 40px hsl(var(--accent))',
          }}
        />
      </div>

      {/* Tooltip card - FIXED positioning */}
      <div
        className="fixed z-[10000] pointer-events-auto"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
          transform: step.position === 'left' ? 'translate(-100%, -50%)' :
                     step.position === 'right' ? 'translate(0%, -50%)' :
                     step.position === 'top' ? 'translate(-50%, -100%)' :
                     'translate(-50%, 0%)',
        }}
      >
        {/* Arrow pointing to element */}
        <div 
          className={cn(
            "absolute",
            step.position === 'top' ? 'bottom-0 left-1/2 -translate-x-1/2 translate-y-full' :
            step.position === 'bottom' ? 'top-0 left-1/2 -translate-x-1/2 -translate-y-full' :
            step.position === 'left' ? 'right-0 top-1/2 -translate-y-1/2 translate-x-full' :
            'left-0 top-1/2 -translate-y-1/2 -translate-x-full'
          )}
        >
          {step.position === 'top' ? <MoveDown className="h-8 w-8 animate-bounce text-primary" /> :
           step.position === 'bottom' ? <MoveUp className="h-8 w-8 animate-bounce text-primary" /> :
           step.position === 'left' ? <MoveRight className="h-8 w-8 animate-bounce text-primary" /> :
           <MoveLeft className="h-8 w-8 animate-bounce text-primary" />}
        </div>

        <div className="bg-white border-2 border-primary rounded-2xl shadow-2xl p-4 w-80 max-w-[90vw] max-h-[80vh] overflow-auto animate-in fade-in slide-in-from-bottom-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-gray-900 leading-tight">{step.title}</h3>
                <p className="text-xs text-gray-600">
                  Step {currentStep + 1} of {steps.length}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkip}
              className="h-7 w-7 p-0 flex-shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-700 mb-4 leading-relaxed">{step.description}</p>

          {/* Progress bar */}
          <div className="mb-3">
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1">
              {!isFirstStep && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onPrevious}
                  className="gap-1 h-8 text-xs"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onSkip}
                className="gap-1 text-gray-600 h-8 text-xs"
              >
                <SkipForward className="h-3 w-3" />
                Skip
              </Button>
            </div>
            
            <Button
              onClick={isLastStep ? onComplete : onNext}
              size="sm"
              className="gap-1 bg-primary text-primary-foreground hover:bg-primary/90 h-8 text-xs"
            >
              {isLastStep ? 'Finish' : 'Next'}
              {!isLastStep && <ArrowRight className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

