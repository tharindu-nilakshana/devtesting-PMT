"use client";

import { Radio, Volume2, VolumeX, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "../ui/button";

interface SquawkUpdate {
  id: string;
  time: string;
  content: string;
}

export function LiveSquawk() {
  const [isLive, setIsLive] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [updates] = useState<SquawkUpdate[]>([
    {
      id: "1",
      time: "14:32",
      content: "Fed Governor speaking now - mentions continued vigilance on inflation",
    },
    {
      id: "2",
      time: "14:28",
      content: "Heavy bid interest seen in EUR/USD around 1.0850 level",
    },
    {
      id: "3",
      time: "14:25",
      content: "S&P 500 futures testing resistance at 4,500 - watching for breakout",
    },
    {
      id: "4",
      time: "14:20",
      content: "Oil inventories data coming in 10 minutes - expecting drawdown",
    },
    {
      id: "5",
      time: "14:15",
      content: "Treasury yields pulling back from session highs - 10Y now at 4.32%",
    },
    {
      id: "6",
      time: "14:10",
      content: "Large block trade executed in AAPL - 500K shares at $182.50",
    },
    {
      id: "7",
      time: "14:05",
      content: "FX desk reports decent two-way flow in USD/JPY, range-bound for now",
    },
    {
      id: "8",
      time: "14:00",
      content: "ISM Manufacturing PMI beats expectations - dollar strengthening",
    },
  ]);

  // Lock body scroll when panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Notify other panels to close
      window.dispatchEvent(new CustomEvent('panel-opening', { detail: { panel: 'live-squawk' } }));
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Listen for other panels opening
  useEffect(() => {
    const handlePanelOpening = (event: Event) => {
      const customEvent = event as CustomEvent<{ panel: string }>;
      if (customEvent.detail.panel !== 'live-squawk' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('panel-opening', handlePanelOpening);
    return () => window.removeEventListener('panel-opening', handlePanelOpening);
  }, [isOpen]);

  return (
    <>
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 transition-all relative ${
            isOpen
              ? "bg-primary/20 text-primary border border-primary/30"
              : isLive
              ? "text-destructive hover:!text-destructive hover:!bg-destructive/20"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
          onClick={() => setIsOpen(!isOpen)}
          title="Live Squawk"
        >
          <Radio className={`w-4 h-4 ${isLive ? "animate-pulse" : ""}`} strokeWidth={2.5} />
          {isLive && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-destructive rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
          )}
        </Button>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 top-[42px] bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Squawk Side Panel - Slides from Right */}
      <div 
        ref={dropdownRef}
        className={`fixed top-[42px] right-0 bottom-0 w-[460px] bg-popover border-l border-border shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
          {/* Header */}
          <div className="px-4 py-3 border-b border-border bg-widget-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isLive ? "bg-destructive/20" : "bg-muted"
                }`}
              >
                <Radio className={`w-4 h-4 ${isLive ? "text-destructive" : "text-muted-foreground"}`} strokeWidth={2.5} />
              </div>
              <div>
                <div className="text-sm text-foreground">Live Market Squawk</div>
                <div className={`text-xs flex items-center gap-1 ${isLive ? "text-destructive" : "text-muted-foreground"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isLive ? "bg-destructive animate-pulse" : "bg-muted-foreground"}`}></span>
                  {isLive ? "Live - Broadcasting" : "Offline"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="px-4 py-2 border-b border-border bg-widget-body flex items-center justify-between">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              Real-time Market Commentary
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setIsLive(!isLive)}
            >
              {isLive ? "Pause" : "Resume"}
            </Button>
          </div>

          {/* Updates Feed */}
          <div className="flex-1 overflow-y-auto bg-widget-body">
            {updates.map((update, index) => (
              <div
                key={update.id}
                className={`px-4 py-3 border-b border-border hover:bg-muted transition-colors ${
                  index === 0 && isLive ? "bg-destructive/5" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-xs text-muted-foreground font-mono min-w-[35px] pt-0.5">
                    {update.time}
                  </div>
                  {index === 0 && isLive && (
                    <div className="flex-shrink-0 pt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-destructive inline-block animate-pulse"></span>
                    </div>
                  )}
                  <div className="flex-1 text-sm text-foreground leading-relaxed">
                    {update.content}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-border bg-widget-header">
            <div className="text-xs text-muted-foreground text-center">
              Commentary provided by our professional market analysts
            </div>
          </div>
        </div>
    </>
  );
}

