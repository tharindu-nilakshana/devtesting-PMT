"use client";

import { useState, useEffect } from "react";
import { X, ChevronRight, ChevronLeft, Play } from "lucide-react";
import { Button } from "./button";

interface TourStep {
  id: string;
  title: string;
  description: string;
  target: string; // CSS selector for the element to highlight
  position: "top" | "bottom" | "left" | "right" | "center";
  template?: string; // Optional: switch to this template for this step
  action?: () => void; // Optional: perform action before showing step
}

interface OnboardingTourProps {
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
  steps: TourStep[];
  onTemplateSwitch?: (templateName: string) => void;
}

export function OnboardingTour({ 
  isActive, 
  onComplete, 
  onSkip, 
  steps,
  onTemplateSwitch 
}: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [isPositioned, setIsPositioned] = useState(false);

  const step = steps[currentStep];

  // Reset to step 0 when tour becomes active
  useEffect(() => {
    if (isActive) {
      setCurrentStep(0);
    }
  }, [isActive]);

  useEffect(() => {
    if (!isActive || !step) return;

    // Reset positioning state
    setIsPositioned(false);

    // Switch template if needed
    if (step.template && onTemplateSwitch) {
      onTemplateSwitch(step.template);
    }

    // Execute step action if any
    if (step.action) {
      step.action();
    }

    // Find and highlight the target element
    const updateHighlight = () => {
      const targetElement = document.querySelector(step.target);
      
      // Tooltip dimensions (increased height for better fit)
      const tooltipWidth = 400;
      const tooltipHeight = 220;
      const padding = 20;
      
      if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        setHighlightRect(rect);
        
        // Scroll element into view if needed
        targetElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'center'
        });
        
        // Wait for scroll to complete before positioning tooltip
        setTimeout(() => {
          const updatedRect = targetElement.getBoundingClientRect();
          setHighlightRect(updatedRect);
          
          // Calculate tooltip position based on step position preference
          let top = 0;
          let left = 0;
          
          switch (step.position) {
            case "top":
              top = updatedRect.top - tooltipHeight - 20;
              left = updatedRect.left + updatedRect.width / 2 - tooltipWidth / 2;
              break;
            case "bottom":
              top = updatedRect.bottom + 20;
              left = updatedRect.left + updatedRect.width / 2 - tooltipWidth / 2;
              break;
            case "left":
              top = updatedRect.top + updatedRect.height / 2 - tooltipHeight / 2;
              left = updatedRect.left - tooltipWidth - 20;
              break;
            case "right":
              top = updatedRect.top + updatedRect.height / 2 - tooltipHeight / 2;
              left = updatedRect.right + 20;
              break;
            case "center":
              top = window.innerHeight / 2 - tooltipHeight / 2;
              left = window.innerWidth / 2 - tooltipWidth / 2;
              break;
          }
          
          // Ensure tooltip stays within viewport bounds
          const maxLeft = window.innerWidth - tooltipWidth - padding;
          const maxTop = window.innerHeight - tooltipHeight - padding;
          
          // Constrain to viewport
          left = Math.max(padding, Math.min(left, maxLeft));
          top = Math.max(padding, Math.min(top, maxTop));
          
          setTooltipPosition({ top, left });
          setIsPositioned(true);
        }, 300);
      } else {
        // Target not found - fallback to center position
        setHighlightRect(null);
        const top = window.innerHeight / 2 - tooltipHeight / 2;
        const left = window.innerWidth / 2 - tooltipWidth / 2;
        setTooltipPosition({ top, left });
        setIsPositioned(true);
      }
    };

    // Delay initial highlight to allow template switch to complete
    const initialDelay = step.template ? 500 : 0;
    const timeoutId = setTimeout(() => {
      updateHighlight();
    }, initialDelay);
    
    // Retry finding the element a few times if template is switching
    let retryCount = 0;
    const maxRetries = 3;
    const retryInterval = setInterval(() => {
      if (retryCount >= maxRetries) {
        clearInterval(retryInterval);
        return;
      }
      const targetElement = document.querySelector(step.target);
      if (targetElement) {
        updateHighlight();
        clearInterval(retryInterval);
      }
      retryCount++;
    }, 500);
    
    // Update on window resize
    window.addEventListener("resize", updateHighlight);
    window.addEventListener("scroll", updateHighlight);
    
    return () => {
      clearTimeout(timeoutId);
      clearInterval(retryInterval);
      window.removeEventListener("resize", updateHighlight);
      window.removeEventListener("scroll", updateHighlight);
    };
  }, [currentStep, step, isActive, onTemplateSwitch]);

  if (!isActive || !step) return null;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Blur Overlay with Spotlight */}
      <div className="absolute inset-0 pointer-events-auto">
        <svg width="100%" height="100%" className="absolute inset-0">
          <defs>
            <mask id="spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {highlightRect && (
                <rect
                  x={highlightRect.left - 8}
                  y={highlightRect.top - 8}
                  width={highlightRect.width + 16}
                  height={highlightRect.height + 16}
                  rx="8"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.7)"
            mask="url(#spotlight-mask)"
            style={{ backdropFilter: "blur(4px)" }}
          />
        </svg>
        
        {/* Highlighted border around target */}
        {highlightRect && (
          <div
            className="absolute border-4 border-primary rounded-lg pointer-events-none animate-pulse"
            style={{
              top: highlightRect.top - 8,
              left: highlightRect.left - 8,
              width: highlightRect.width + 16,
              height: highlightRect.height + 16,
              boxShadow: "0 0 0 4px rgba(255, 107, 53, 0.2), 0 0 40px rgba(255, 107, 53, 0.4)",
            }}
          />
        )}
      </div>

      {/* Tooltip Card */}
      <div
        className={`absolute pointer-events-auto bg-widget-header border-2 border-primary rounded-lg shadow-2xl w-[400px] z-[10000] transition-opacity duration-200 ${
          isPositioned ? "opacity-100" : "opacity-0"
        }`}
        style={{
          top: `${tooltipPosition.top}px`,
          left: `${tooltipPosition.left}px`,
        }}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-widget-body">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Play className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">
                Step {currentStep + 1} of {steps.length}
              </div>
              <div className="text-sm text-foreground font-medium">{step.title}</div>
            </div>
          </div>
          <button
            onClick={onSkip}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Skip tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {step.description}
          </p>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border flex items-center justify-between bg-widget-body/50">
          <div className="flex gap-1">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep
                    ? "bg-primary"
                    : index < currentStep
                    ? "bg-primary/50"
                    : "bg-border"
                }`}
              />
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                className="gap-1"
              >
                <ChevronLeft className="w-3 h-3" />
                Previous
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleNext}
              className="gap-1 bg-primary hover:bg-primary/90"
            >
              {currentStep < steps.length - 1 ? "Next" : "Finish"}
              {currentStep < steps.length - 1 && <ChevronRight className="w-3 h-3" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
