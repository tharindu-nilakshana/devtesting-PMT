import { Settings2, X, HelpCircle, Trash2, PlayCircle } from "lucide-react";
import { Button } from "../ui/button";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface WidgetHeaderProps {
  title: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  onClose?: () => void;
  onRemove?: () => void;
  onSettings?: () => void;
  onFullscreen?: () => void;
  helpContent?: string;
  widgetName?: string; // Plain text name for help panel when title is a ReactNode
  children?: React.ReactNode;
}

export function WidgetHeader({ title, subtitle, onClose, onRemove, onSettings, onFullscreen, helpContent, widgetName, children }: WidgetHeaderProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Get display name for help panel - use widgetName if provided, else title if string
  const helpPanelName = widgetName || (typeof title === 'string' ? title : 'Widget Information');

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  
  return (
    <>
      <div className="shrink-0 px-3 py-[3px] bg-widget-header border-b border-border group relative overflow-hidden">
        {/* Delete Confirmation - absolute overlay that inherits parent height */}
        {isDeleting && (
          <div className="absolute inset-0 bg-destructive/90 px-3 flex items-center justify-between animate-slide-in-left z-10">
            <div className="flex items-center gap-1.5">
              <Trash2 className="w-3 h-3 text-white" />
              <span className="text-xs text-white">Really want to remove this widget?</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onRemove) onRemove();
                  setIsDeleting(false);
                }}
                className="px-2 py-0.5 bg-white text-destructive text-xs rounded hover:bg-white/90 transition-colors"
              >
                Yes
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDeleting(false);
                }}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
        {/* Normal Header View - always rendered to maintain height */}
        <div className={`flex items-center justify-between ${isDeleting ? 'invisible' : ''}`}>
          <div 
            className={`flex items-center gap-1.5 flex-1 ${onFullscreen ? 'cursor-pointer hover:bg-popover/50 rounded px-1.5 py-0.5 -mx-1.5 -my-0.5 transition-colors' : ''}`}
            onClick={onFullscreen}
          >
            <h3 className="text-xl text-foreground font-semibold">
              {title}
              {subtitle && <span className="text-muted-foreground"> | </span>}
              {subtitle && <span className="text-primary text-lg">{subtitle}</span>}
            </h3>
            {onFullscreen && (
              <div className="text-muted-foreground text-xs ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                Click to expand
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {children}
            
            {/* Help Button */}
            {helpContent && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:!text-primary hover:!bg-primary/20"
                onClick={() => setIsHelpOpen(true)}
              >
                <HelpCircle className="w-4 h-4" />
              </Button>
            )}
          
          {/* Settings Button */}
            {onSettings && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:!text-primary hover:!bg-primary/20"
                onClick={onSettings}
              >
                <Settings2 className="w-4 h-4" />
              </Button>
            )}
            
            {/* Remove Widget Button */}
            {onRemove && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:!text-destructive hover:!bg-destructive/20"
                onClick={() => setIsDeleting(true)}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
            
            {/* Close Panel Button */}
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:!text-primary hover:!bg-primary/20"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Help Slider Panel - Rendered via Portal to escape stacking context */}
      {helpContent && mounted && createPortal(
        <>
          {/* Full terminal overlay with blur */}
          <div
            className={`fixed inset-0 bg-black/30 backdrop-blur-sm z-[9998] transition-opacity duration-300 ${
              isHelpOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            onClick={() => setIsHelpOpen(false)}
          />

          {/* Slide-in panel from right */}
          <div
            className={`
              fixed top-0 right-0 h-full w-[480px] bg-[#0a0a0a] border-l border-[#2a2a2a] z-[9999]
              transform transition-transform duration-300 ease-out flex flex-col
              ${isHelpOpen ? 'translate-x-0' : 'translate-x-full'}
            `}
          >
            {/* Header */}
            <div className="bg-[#1a1a1a] border-b border-[#2a2a2a] px-5 py-4 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-foreground">{helpPanelName}</h2>
                <p className="text-xs text-muted-foreground mt-1">{helpPanelName}</p>
              </div>
              <button
                onClick={() => setIsHelpOpen(false)}
                className="w-8 h-8 flex items-center justify-center hover:bg-[#2a2a2a] rounded transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-5 space-y-4">
                {/* Understanding Section */}
                <div className="bg-[#1a1a1a] rounded border border-[#2a2a2a] p-4 space-y-3">
                  <h3 className="text-foreground text-sm font-medium border-l-2 border-primary pl-3">
                    Understanding {helpPanelName}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {helpContent}
                  </p>

                  {/* Image Placeholder */}
                  <div className="rounded overflow-hidden border border-[#2a2a2a] bg-[#0a0a0a] aspect-video flex items-center justify-center mt-3">
                    <p className="text-xs text-muted-foreground">Screenshot: Reading the Chart</p>
                  </div>
                </div>

                {/* Interactive Features Section */}
                <div className="bg-[#1a1a1a] rounded border border-[#2a2a2a] p-4 space-y-3">
                  <h3 className="text-foreground text-sm font-medium border-l-2 border-primary pl-3">
                    Interactive Features
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Use the settings menu to customize this widget&apos;s appearance and behavior. You can resize, reposition, or remove widgets from your layout.
                  </p>

                  {/* Video Placeholder */}
                  <div className="rounded overflow-hidden border border-[#2a2a2a] bg-[#0a0a0a] aspect-video flex items-center justify-center group cursor-pointer hover:border-primary/50 transition-colors mt-3">
                    <div className="text-center">
                      <PlayCircle className="w-12 h-12 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                      <p className="text-xs text-muted-foreground">Video Tutorial</p>
                      <p className="text-xs text-muted-foreground/60 mt-0.5">Click to play</p>
                    </div>
                  </div>
                </div>

                {/* Trading Applications Section */}
                <div className="bg-[#1a1a1a] rounded border border-[#2a2a2a] p-4 space-y-3">
                  <h3 className="text-foreground text-sm font-medium border-l-2 border-primary pl-3">
                    Trading Applications
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Right-click the widget header to access additional options. Link widgets together to synchronize instrument selection across your dashboard.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer - Need More Help Section */}
            <div className="bg-[#1a1a1a] border-t border-[#2a2a2a] px-5 py-3 shrink-0">
              <p className="text-xs text-muted-foreground">
                Need more help? Visit our{" "}
                <span className="text-primary hover:underline cursor-pointer">documentation</span>
                {" "}or{" "}
                <span className="text-primary hover:underline cursor-pointer">contact support</span>
              </p>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}

