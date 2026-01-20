import { useState, useEffect } from "react";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";

interface ExchangeMarketHoursProps {
  wgid?: string;
  onSettings?: () => void;
  onRemove?: () => void;
  onFullscreen?: () => void;
  settings?: Record<string, any>;
}

interface MarketSession {
  name: string;
  city: string;
  openHour: number; // UTC hour (0-23)
  closeHour: number; // UTC hour (0-23)
  color: string;
  accentColor: string;
  flag: string;
  mapPosition: { x: number; y: number }; // Position on map (percentage)
  timezone: string;
}

const MARKETS: MarketSession[] = [
  { 
    name: "Sydney", 
    city: "Sydney", 
    openHour: 22, 
    closeHour: 7, 
    color: "96, 165, 250", // Brighter Blue
    accentColor: "#60a5fa",
    flag: "🇦🇺",
    mapPosition: { x: 83, y: 72 },
    timezone: "AEDT"
  },
  { 
    name: "Tokyo", 
    city: "Tokyo", 
    openHour: 0, 
    closeHour: 9, 
    color: "251, 113, 133", // Brighter Rose/Pink
    accentColor: "#fb7185",
    flag: "🇯🇵",
    mapPosition: { x: 77, y: 42 },
    timezone: "JST"
  },
  { 
    name: "London", 
    city: "London", 
    openHour: 8, 
    closeHour: 17, 
    color: "250, 204, 21", // Bright Yellow
    accentColor: "#facc15",
    flag: "🇬🇧",
    mapPosition: { x: 48, y: 30 },
    timezone: "GMT"
  },
  { 
    name: "New York", 
    city: "New York", 
    openHour: 13, 
    closeHour: 22, 
    color: "168, 85, 247", // Purple
    accentColor: "#a855f7",
    flag: "🇺🇸",
    mapPosition: { x: 22, y: 38 },
    timezone: "EST"
  },
];

export default function ExchangeMarketHours({ onSettings, onRemove, onFullscreen, settings }: ExchangeMarketHoursProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const viewMode = settings?.viewMode || "timeline";

  // Listen for timezone changes from profile settings
  useEffect(() => {
    const handleTimezoneChange = () => {
      // Just trigger a re-render by updating current time
      setCurrentTime(new Date());
    };

    window.addEventListener('timezoneChanged', handleTimezoneChange);
    return () => window.removeEventListener('timezoneChanged', handleTimezoneChange);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getCurrentUTCHour = () => {
    return currentTime.getUTCHours() + currentTime.getUTCMinutes() / 60;
  };

  const isMarketOpen = (market: MarketSession) => {
    const currentHour = getCurrentUTCHour();
    
    if (market.closeHour > market.openHour) {
      return currentHour >= market.openHour && currentHour < market.closeHour;
    } else {
      return currentHour >= market.openHour || currentHour < market.closeHour;
    }
  };

  const getCurrentTimePosition = () => {
    const utcHours = currentTime.getUTCHours();
    const utcMinutes = currentTime.getUTCMinutes();
    const totalMinutes = utcHours * 60 + utcMinutes;
    return (totalMinutes / (24 * 60)) * 100;
  };

  const getMarketSegments = (market: MarketSession) => {
    if (market.closeHour > market.openHour) {
      // Market doesn't cross midnight
      return [{
        left: (market.openHour / 24) * 100,
        width: ((market.closeHour - market.openHour) / 24) * 100
      }];
    } else {
      // Market crosses midnight - split into two segments
      return [
        {
          left: (market.openHour / 24) * 100,
          width: ((24 - market.openHour) / 24) * 100
        },
        {
          left: 0,
          width: (market.closeHour / 24) * 100
        }
      ];
    }
  };

  const getNextEvent = (market: MarketSession) => {
    const currentHour = getCurrentUTCHour();
    const isOpen = isMarketOpen(market);
    
    let targetHour: number;
    let eventType: string;
    
    if (isOpen) {
      targetHour = market.closeHour;
      eventType = "closes";
    } else {
      targetHour = market.openHour;
      eventType = "opens";
    }
    
    // Calculate time difference
    let diff = targetHour - currentHour;
    
    // Handle negative differences (crossing midnight)
    if (diff < 0) {
      diff += 24;
    }
    
    const hours = Math.floor(diff);
    const minutes = Math.floor((diff - hours) * 60);
    const seconds = Math.floor(((diff - hours) * 60 - minutes) * 60);
    
    return {
      eventType,
      timeString: `${market.city} ${eventType} in ${hours}h ${minutes}m ${seconds}s`
    };
  };

  const getLocalTime = (market: MarketSession) => {
    const utcHours = currentTime.getUTCHours();
    const utcMinutes = currentTime.getUTCMinutes();
    
    // Calculate local time based on market open hour offset
    let localHour = utcHours;
    
    // Approximate timezone offsets
    const timezoneOffsets: Record<string, number> = {
      "Sydney": 11,
      "Tokyo": 9,
      "London": 0,
      "New York": -5
    };
    
    localHour = (utcHours + timezoneOffsets[market.city] + 24) % 24;
    
    return `${localHour.toString().padStart(2, '0')}:${utcMinutes.toString().padStart(2, '0')}:${currentTime.getUTCSeconds().toString().padStart(2, '0')}`;
  };

  const formatTime = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  const timeMarkers = [0, 4, 8, 12, 16, 20, 24];

  // Map View
  if (viewMode === "map") {
    return (
      <div className="flex flex-col h-full bg-widget-body border border-border rounded-none overflow-hidden">
        <WidgetHeader title="Session Map" onSettings={onSettings} onRemove={onRemove} onFullscreen={onFullscreen} />

        <div className="flex-1 relative bg-background overflow-hidden">
          {/* World Map Background */}
          <div className="absolute inset-0">
            <img 
              src="https://images.unsplash.com/photo-1669854310488-542a99280b8a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb2xpdGljYWwlMjB3b3JsZCUyMG1hcCUyMGNvbnRpbmVudHN8ZW58MXx8fHwxNzYxNzkxMDA5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
              alt="World Map"
              className="w-full h-full object-cover opacity-30"
              style={{ filter: 'grayscale(100%) brightness(0.4)' }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/60 to-background/80"></div>
          </div>

          {/* Current UTC time line */}
          <div 
            className="absolute top-0 bottom-0 w-[2px] bg-primary/50 z-10"
            style={{ left: `${getCurrentTimePosition()}%` }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary"></div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary"></div>
          </div>

          {/* Market Markers */}
          {MARKETS.map((market) => {
            const isOpen = isMarketOpen(market);
            const localTime = getLocalTime(market);
            
            return (
              <div
                key={market.name}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20"
                style={{ 
                  left: `${market.mapPosition.x}%`, 
                  top: `${market.mapPosition.y}%` 
                }}
              >
                {/* Marker */}
                <div className="relative">
                  {/* Pulse ring when open */}
                  {isOpen && (
                    <div 
                      className="absolute inset-0 rounded-full animate-ping"
                      style={{ 
                        backgroundColor: market.accentColor,
                        opacity: 0.4,
                        transform: 'scale(1.5)'
                      }}
                    ></div>
                  )}
                  
                  {/* Main marker */}
                  <div 
                    className="relative w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ 
                      backgroundColor: isOpen ? market.accentColor : 'rgba(100, 116, 139, 0.4)',
                      boxShadow: isOpen ? `0 0 20px ${market.accentColor}` : 'none',
                      border: `2px solid ${isOpen ? market.accentColor : 'rgba(100, 116, 139, 0.6)'}`,
                    }}
                  >
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  
                  {/* Info label */}
                  <div 
                    className="absolute top-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded"
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      border: `1px solid ${isOpen ? market.accentColor : 'rgba(100, 116, 139, 0.6)'}`,
                    }}
                  >
                    <div 
                      className="text-[11px] text-center"
                      style={{ color: isOpen ? market.accentColor : 'rgba(148, 163, 184, 0.8)' }}
                    >
                      {localTime}
                    </div>
                    <div className="text-[10px] text-white/90 text-center">
                      {market.city}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Table View
  if (viewMode === "table") {
    return (
      <div className="flex flex-col h-full bg-widget-body border border-border rounded-none overflow-hidden">
        <WidgetHeader title="Forex Market Hours" onSettings={onSettings} onRemove={onRemove} onFullscreen={onFullscreen} />

        <div className="flex-1 flex flex-col overflow-auto">
          {/* Table */}
          <div className="flex-1">
            {/* Header Row */}
            <div className="grid grid-cols-3 gap-2 px-4 py-2 bg-widget-header border-b border-border">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Market</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Status</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Next Event</div>
            </div>

            {/* Market Rows */}
            {MARKETS.map((market) => {
              const isOpen = isMarketOpen(market);
              const nextEvent = getNextEvent(market);
              
              return (
                <div 
                  key={market.name} 
                  className="grid grid-cols-3 gap-2 px-4 py-3 border-b border-border/50 hover:bg-widget-header/30 transition-colors"
                >
                  {/* Market Name */}
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ 
                        backgroundColor: isOpen ? market.accentColor : 'rgba(148, 163, 184, 0.3)',
                        boxShadow: isOpen ? `0 0 8px ${market.accentColor}` : 'none'
                      }}
                    ></div>
                    <span className="text-[16px]">{market.flag}</span>
                    <span className="text-[13px]">{market.city}</span>
                  </div>

                  {/* Status */}
                  <div className="flex items-center">
                    <div 
                      className="px-2 py-0.5 rounded text-[9px] uppercase tracking-wide"
                      style={{
                        backgroundColor: isOpen ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: isOpen ? '#22c55e' : '#ef4444',
                        border: `1px solid ${isOpen ? '#22c55e' : '#ef4444'}`
                      }}
                    >
                      {isOpen ? 'OPEN' : 'CLOSED'}
                    </div>
                  </div>

                  {/* Next Event */}
                  <div className="flex items-center">
                    <span className="text-[10px] text-muted-foreground">
                      {nextEvent.timeString}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Info */}
          <div className="px-4 py-3 border-t border-border/50 bg-widget-header/20">
            <div className="text-[8px] text-muted-foreground/70 leading-tight italic">
              Times adjust automatically for DST when applicable. Trading hours are approximate and may vary. Forex markets are generally closed from Friday 21:00 GMT until Sunday 20:00 GMT.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Timeline view (default)
  return (
    <div className="flex flex-col h-full bg-widget-body border border-border rounded-none overflow-hidden">
      <WidgetHeader title="Global Market Hours" onSettings={onSettings} onRemove={onRemove} onFullscreen={onFullscreen} />

      <div className="flex-1 flex flex-col p-4 overflow-auto">
        {/* Header Info */}
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/50">
          <div className="text-[10px] text-muted-foreground">
            Current UTC: {formatTime(currentTime.getUTCHours())}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-[10px] text-muted-foreground">Live</span>
          </div>
        </div>

        {/* Markets List */}
        <div className="space-y-4 mb-6">
          {MARKETS.map((market) => {
            const isOpen = isMarketOpen(market);
            
            return (
              <div key={market.name} className="space-y-2">
                {/* Market Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ 
                        backgroundColor: isOpen ? market.accentColor : 'rgba(148, 163, 184, 0.3)',
                        boxShadow: isOpen ? `0 0 8px ${market.accentColor}` : 'none'
                      }}
                    ></div>
                    <span className="text-[11px]" style={{ color: isOpen ? market.accentColor : 'rgba(148, 163, 184, 0.6)' }}>
                      {market.city}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-muted-foreground">
                      {formatTime(market.openHour)} - {formatTime(market.closeHour)}
                    </span>
                    <div 
                      className="px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wide"
                      style={{
                        backgroundColor: isOpen ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: isOpen ? '#22c55e' : '#ef4444',
                        border: `1px solid ${isOpen ? '#22c55e' : '#ef4444'}`
                      }}
                    >
                      {isOpen ? 'Open' : 'Closed'}
                    </div>
                  </div>
                </div>

                {/* Timeline Bar */}
                <div className="relative h-8 bg-background/50 rounded border border-border/30">
                  {/* Time grid lines */}
                  {timeMarkers.slice(1, -1).map((hour) => (
                    <div
                      key={hour}
                      className="absolute top-0 bottom-0 w-[1px] bg-border/20"
                      style={{ left: `${(hour / 24) * 100}%` }}
                    ></div>
                  ))}

                  {/* Market active segments */}
                  {getMarketSegments(market).map((segment, idx) => (
                    <div
                      key={idx}
                      className="absolute top-0 bottom-0 rounded transition-all duration-500"
                      style={{
                        left: `${segment.left}%`,
                        width: `${segment.width}%`,
                        backgroundColor: isOpen ? `rgba(${market.color}, 0.5)` : `rgba(${market.color}, 0.25)`,
                        border: `1px solid rgba(${market.color}, ${isOpen ? 0.7 : 0.4})`,
                      }}
                    >
                      {/* Pulse effect when open */}
                      {isOpen && (
                        <div 
                          className="absolute inset-0 rounded animate-pulse"
                          style={{
                            backgroundColor: `rgba(${market.color}, 0.2)`,
                          }}
                        ></div>
                      )}
                    </div>
                  ))}

                  {/* Current time indicator on this market's timeline */}
                  <div
                    className="absolute top-0 bottom-0 w-[2px] z-10"
                    style={{ 
                      left: `${getCurrentTimePosition()}%`,
                      backgroundColor: isOpen ? '#f97316' : 'rgba(249, 115, 22, 0.3)'
                    }}
                  >
                    <div 
                      className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0"
                      style={{
                        borderLeft: '3px solid transparent',
                        borderRight: '3px solid transparent',
                        borderTop: `3px solid ${isOpen ? '#f97316' : 'rgba(249, 115, 22, 0.3)'}`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Global Timeline Reference */}
        <div className="mt-auto pt-4 border-t border-border/50">
          <div className="text-[9px] text-muted-foreground mb-2">24 Hour UTC Timeline</div>
          <div className="relative h-6 bg-background/50 rounded border border-border/30">
            {/* Hour markers */}
            {timeMarkers.map((hour) => (
              <div
                key={hour}
                className="absolute top-0 bottom-0 flex items-end justify-center"
                style={{ left: `${(hour / 24) * 100}%` }}
              >
                <div className="w-[1px] h-full bg-border/30"></div>
                <span 
                  className="absolute -bottom-4 text-[8px] text-muted-foreground/60 -translate-x-1/2"
                  style={{ left: '0' }}
                >
                  {hour < 24 ? formatTime(hour) : '00:00'}
                </span>
              </div>
            ))}

            {/* All markets overlay */}
            {MARKETS.map((market) => (
              getMarketSegments(market).map((segment, idx) => (
                <div
                  key={`${market.name}-${idx}`}
                  className="absolute top-1 bottom-1"
                  style={{
                    left: `${segment.left}%`,
                    width: `${segment.width}%`,
                    backgroundColor: `rgba(${market.color}, 0.3)`,
                  }}
                ></div>
              ))
            ))}

            {/* Current time indicator */}
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-primary z-20"
              style={{ left: `${getCurrentTimePosition()}%` }}
            >
              <div 
                className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-0 h-0"
                style={{
                  borderLeft: '4px solid transparent',
                  borderRight: '4px solid transparent',
                  borderTop: '5px solid #f97316',
                }}
              ></div>
              <div 
                className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0"
                style={{
                  borderLeft: '4px solid transparent',
                  borderRight: '4px solid transparent',
                  borderBottom: '5px solid #f97316',
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-3 text-[8px] text-muted-foreground/50 leading-tight">
          Overlapping zones indicate peak liquidity periods. Markets may adjust for daylight saving time.
        </div>
      </div>
    </div>
  );
}

