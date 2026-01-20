"use client";

import React, { useState, useEffect, useRef } from 'react';
import { WidgetHeader } from '@/components/bloomberg-ui/WidgetHeader';

interface Props {
  onRemove?: () => void;
  onSettings?: () => void;
  onFullscreen?: () => void;
  settings?: Record<string, unknown>;
}

interface EconomicEvent {
  title: string;
  currency: string;
  eventTime: Date;
  impact: "high" | "medium" | "low";
  forecast?: {
    actual?: string;
    high?: string;
    forecast?: string;
    low?: string;
    previous?: string;
  };
  suffix?: string;
  isPast?: boolean;
}

export function EconomicEventCountdownWidget({
  onRemove,
  onSettings,
  onFullscreen
}: Props) {
  const [selectedEventIndex, setSelectedEventIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [windowWidth, setWindowWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const CURRENCY_LIST = ["USD", "EUR", "GBP", "JPY", "AUD", "NZD", "CAD", "CHF", "CNY"];

  const selectedEvent = events[selectedEventIndex];

  // Track container width and height using ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
        setContainerHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Track window width
  useEffect(() => {
    const updateWindowWidth = () => {
      setWindowWidth(window.innerWidth);
    };

    updateWindowWidth();
    window.addEventListener('resize', updateWindowWidth);

    return () => {
      window.removeEventListener('resize', updateWindowWidth);
    };
  }, []);

  // Determine layout based on height and width
  // If height > width (portrait), always use single-column layout
  // If height is tall enough (>= 600px), always use single-column layout regardless of width
  // If widget width < 30% of window width, always use single-column layout
  // If height is small (< 600px) and width > height (landscape), use two-column layout when width is also constrained (< 1280px)
  // Default to single-column until we have measurements
  const isNarrowWidget = windowWidth > 0 && containerWidth > 0 && containerWidth < (windowWidth * 0.3);
  const useTwoColumnLayout = containerWidth > 0 && containerHeight > 0 && 
    !isNarrowWidget && // Don't use two columns if widget is narrow
    containerHeight < 600 && 
    containerWidth < 1280 &&
    containerWidth > containerHeight; // Only use two columns in landscape orientation

  // Determine if space is tight (for responsive font sizes and padding)
  const isTightSpace = containerWidth > 0 && containerHeight > 0 && 
    (containerWidth < 600 || containerHeight < 400 || (containerWidth < 800 && containerHeight < 500));

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Map API data to next/previous events
  useEffect(() => {
    let cancelled = false;
    async function fetchAllEvents() {
      try {
        setLoading(true);
        setError(null);
        setEvents([]);
        setSelectedEventIndex(0);
        // Fetch in parallel for each supported currency
        const results = await Promise.allSettled(
          CURRENCY_LIST.map(ccy => fetch('/api/pmt/next-previous-event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currencies: [ccy] })
          }).then(r => r.ok ? r.json() : null).catch(() => null))
        );
        let allEvents: EconomicEvent[] = [];
        const now = Date.now();
        results.forEach((result, idx) => {
          if (result.status === 'fulfilled' && result.value && result.value.data && result.value.data.nextEvent) {
            const e = result.value.data.nextEvent;
            const timeStr = e.newsDate || e.time || e.eventTime || e.date;
            const eventTime = timeStr ? new Date(timeStr) : null;
            if (eventTime && eventTime.getTime() > now) {
              const title = e.newsHeader || e.title || e.event || e.name || 'Economic Event';
              const currency = e.currency || CURRENCY_LIST[idx];
              const impactRaw = (e.sentiment || e.impact || e.importance || '').toString().toLowerCase();
              const impact: 'high' | 'medium' | 'low' = impactRaw.includes('3') || impactRaw.includes('high') ? 'high' : impactRaw.includes('2') || impactRaw.includes('med') ? 'medium' : 'low';
              const valOrDash = (v: any) => (v === 0 || v === '0' || (typeof v === 'string' && v.trim() !== '') ? String(v) : '—');
              const forecast = {
                actual: valOrDash(e.actual),
                high: valOrDash(e.high),
                forecast: valOrDash(e.forecast),
                low: valOrDash(e.low),
                previous: valOrDash(e.previous),
              };
              const suffix: string | undefined = typeof e.suffix === 'string' && e.suffix.trim() ? e.suffix.trim() : undefined;
              allEvents.push({ title, currency, eventTime, impact, forecast, suffix });
            }
          }
        });
        // sort by time
        allEvents.sort((a, b) => a.eventTime.getTime() - b.eventTime.getTime());
        if (!cancelled) {
          setEvents(allEvents);
          setSelectedEventIndex(0);
        }
      } catch (error) {
        if (!cancelled) {
          setEvents([]);
          setError('Failed to load upcoming events.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAllEvents();
    return () => { cancelled = true; };
  }, []);

  const getTimeRemaining = () => {
    if (!selectedEvent) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }
    const diff = selectedEvent.eventTime.getTime() - currentTime.getTime();
    
    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds };
  };

  const timeRemaining = getTimeRemaining();

  const formatNumber = (num: number) => {
    return num.toString().padStart(2, '0');
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high":
        return "text-destructive";
      case "medium":
        return "text-warning";
      case "low":
        return "text-muted-foreground";
      default:
        return "text-foreground";
    }
  };

  // Helper to append suffix where available
  const withSuffix = (val?: string, suffix?: string) => {
    if (!val || val === '—') return '—';
    return suffix ? `${val}${suffix}` : val;
  };

  return (
    <div className="flex flex-col h-full bg-widget-body border border-border rounded-none overflow-hidden">
      <WidgetHeader
        title="Economic Event Countdown"
        onRemove={onRemove}
        onFullscreen={onFullscreen}
        helpContent="Live countdown to major economic events and data releases."
      />

      <div ref={containerRef} className="flex-1 overflow-auto custom-scrollbar">
        <div className="p-4 md:p-6 flex flex-col items-center justify-center min-h-full">
          {/* Responsive Layout Container - Uses container width and height */}
          <div className="w-full max-w-5xl">
            {/* Small Container: Two Column Layout */}
            {useTwoColumnLayout ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Left Column: Title, Countdown, Forecast Table */}
              <div className="flex flex-col gap-4 justify-center items-center">
                {/* Event Title */}
                <div className="text-center">
                  <h3 className="text-muted-foreground tracking-wide font-bold" style={{fontSize: '14px'}}>
                    {loading ? 'Loading…' : selectedEvent?.title}{" "}|{" "}
                    <span className="text-primary">{selectedEvent?.currency}</span>
                  </h3>
                  {selectedEvent?.isPast && (<div className="text-destructive text-xs font-medium my-1">Past Event</div>)}
                </div>

                {/* Countdown Display */}
                <div className={`flex items-center justify-center ${isTightSpace ? 'px-4 gap-1.5' : 'gap-2 md:gap-4'}`}>
                  {/* Days */}
                  <div className="flex flex-col items-center">
                    <div className={`tracking-tight text-foreground tabular-nums font-semibold ${isTightSpace ? 'text-2xl' : 'text-4xl md:text-5xl'}`} style={{fontFamily: 'SF Mono, Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace'}}>
                      {formatNumber(timeRemaining.days)}
                    </div>
                    <div className={`text-muted-foreground uppercase tracking-wider mt-1 font-medium ${isTightSpace ? 'text-[7px]' : 'text-[8px] md:text-[10.4px]'}`}>
                      Day(s)
                    </div>
                  </div>

                  {/* Separator */}
                  <div className={`text-muted-foreground/40 font-light mb-5 ${isTightSpace ? 'text-xl' : 'text-3xl md:text-4xl'}`}>:</div>

                  {/* Hours */}
                  <div className="flex flex-col items-center">
                    <div className={`tracking-tight text-foreground tabular-nums font-semibold ${isTightSpace ? 'text-2xl' : 'text-4xl md:text-5xl'}`} style={{fontFamily: 'SF Mono, Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace'}}>
                      {formatNumber(timeRemaining.hours)}
                    </div>
                    <div className={`text-muted-foreground uppercase tracking-wider mt-1 font-medium ${isTightSpace ? 'text-[7px]' : 'text-[8px] md:text-[10.4px]'}`}>
                      Hour(s)
                    </div>
                  </div>

                  {/* Separator */}
                  <div className={`text-muted-foreground/40 font-light mb-5 ${isTightSpace ? 'text-xl' : 'text-3xl md:text-4xl'}`}>:</div>

                  {/* Minutes */}
                  <div className="flex flex-col items-center">
                    <div className={`tracking-tight text-foreground tabular-nums font-semibold ${isTightSpace ? 'text-2xl' : 'text-4xl md:text-5xl'}`} style={{fontFamily: 'SF Mono, Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace'}}>
                      {formatNumber(timeRemaining.minutes)}
                    </div>
                    <div className={`text-muted-foreground uppercase tracking-wider mt-1 font-medium ${isTightSpace ? 'text-[7px]' : 'text-[8px] md:text-[10.4px]'}`}>
                      Minute(s)
                    </div>
                  </div>

                  {/* Separator */}
                  <div className={`text-muted-foreground/40 font-light mb-5 ${isTightSpace ? 'text-xl' : 'text-3xl md:text-4xl'}`}>:</div>

                  {/* Seconds */}
                  <div className="flex flex-col items-center">
                    <div className={`tracking-tight text-foreground tabular-nums font-semibold ${isTightSpace ? 'text-2xl' : 'text-4xl md:text-5xl'}`} style={{fontFamily: 'SF Mono, Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace'}}>
                      {formatNumber(timeRemaining.seconds)}
                    </div>
                    <div className={`text-muted-foreground uppercase tracking-wider mt-1 font-medium ${isTightSpace ? 'text-[7px]' : 'text-[8px] md:text-[10.4px]'}`}>
                      Second(s)
                    </div>
                  </div>
                </div>

                {/* Forecast Table */}
                {selectedEvent?.forecast && (
                  <div className="w-full flex justify-center">
                    <div className="bg-muted/20 border border-border/40 rounded overflow-hidden">
                      <div className="grid grid-cols-5 bg-muted/30">
                        <div className="px-2 md:px-3 py-2 text-foreground uppercase tracking-wider text-center border-r border-border/30 font-semibold flex items-center justify-center text-xs md:text-sm" style={{fontSize: '12px'}}>
                          ACTUAL
                        </div>
                        <div className="px-2 md:px-3 py-2 text-foreground uppercase tracking-wider text-center border-r border-border/30 font-semibold flex items-center justify-center text-xs md:text-sm" style={{fontSize: '12px'}}>
                          HIGH
                        </div>
                        <div className="px-2 md:px-3 py-2 text-foreground uppercase tracking-wider text-center border-r border-border/30 font-semibold flex items-center justify-center text-xs md:text-sm" style={{fontSize: '12px'}}>
                          FORECAST
                        </div>
                        <div className="px-2 md:px-3 py-2 text-foreground uppercase tracking-wider text-center border-r border-border/30 font-semibold flex items-center justify-center text-xs md:text-sm" style={{fontSize: '12px'}}>
                          LOW
                        </div>
                        <div className="px-2 md:px-3 py-2 text-foreground uppercase tracking-wider text-center font-semibold flex items-center justify-center text-xs md:text-sm" style={{fontSize: '12px'}}>
                          PREV
                        </div>
                      </div>
                      <div className="grid grid-cols-5 bg-widget-body">
                        <div className="px-2 md:px-3 py-3 text-foreground text-center border-r border-border/30 tabular-nums font-semibold whitespace-nowrap flex items-center justify-center text-xs md:text-sm" style={{fontFamily: 'SF Mono, Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace'}}>
                          {withSuffix(selectedEvent.forecast.actual, selectedEvent.suffix)}
                        </div>
                        <div className="px-2 md:px-3 py-3 text-foreground text-center border-r border-border/30 tabular-nums font-semibold whitespace-nowrap flex items-center justify-center text-xs md:text-sm" style={{fontFamily: 'SF Mono, Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace'}}>
                          {withSuffix(selectedEvent.forecast.high, selectedEvent.suffix)}
                        </div>
                        <div className="px-2 md:px-3 py-3 text-foreground text-center border-r border-border/30 tabular-nums font-semibold whitespace-nowrap flex items-center justify-center text-xs md:text-sm" style={{fontFamily: 'SF Mono, Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace'}}>
                          {withSuffix(selectedEvent.forecast.forecast, selectedEvent.suffix)}
                        </div>
                        <div className="px-2 md:px-3 py-3 text-foreground text-center border-r border-border/30 tabular-nums font-semibold whitespace-nowrap flex items-center justify-center text-xs md:text-sm" style={{fontFamily: 'SF Mono, Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace'}}>
                          {withSuffix(selectedEvent.forecast.low, selectedEvent.suffix)}
                        </div>
                        <div className="px-2 md:px-3 py-3 text-foreground text-center tabular-nums font-semibold whitespace-nowrap flex items-center justify-center text-xs md:text-sm" style={{fontFamily: 'SF Mono, Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace'}}>
                          {withSuffix(selectedEvent.forecast.previous, selectedEvent.suffix)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Upcoming Events */}
              <div className="flex flex-col justify-center">
                <div className="text-base text-foreground uppercase tracking-wider mb-3 px-1 font-semibold">
                  Upcoming Events
                </div>
                <div className="space-y-1">
                  {events.map((event, index) => {
                    const eventDiff = event.eventTime.getTime() - currentTime.getTime();
                    const eventHours = Math.floor(eventDiff / (1000 * 60 * 60));
                    
                    return (
                      <button
                        key={index}
                        onClick={() => setSelectedEventIndex(index)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded border transition-all duration-200 ${
                          selectedEventIndex === index
                            ? "bg-primary/10 border-primary/30"
                            : "bg-muted/20 border-border/40 hover:bg-muted/30 hover:border-border/60"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${getImpactColor(event.impact)}`}></div>
                          <span className="text-foreground font-semibold" style={{fontSize: '14px'}}>{event.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground" style={{fontSize: '14px'}}>
                            {eventHours > 24 
                              ? `${Math.floor(eventHours / 24)}d ${eventHours % 24}h`
                              : `${eventHours}h`
                            }
                          </span>
                          <span className="text-primary font-semibold" style={{fontSize: '14px'}}>{event.currency}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            ) : (
            /* Large Container: Original Single Column Layout */
            <div className="flex flex-col items-center gap-6">
              {/* Event Title */}
              <div className="text-center mb-8">
                <h3 className="text-muted-foreground tracking-wide font-bold" style={{fontSize: '14px'}}>
                  {loading ? 'Loading…' : selectedEvent?.title}{" "}|{" "}
                  <span className="text-primary">{selectedEvent?.currency}</span>
                </h3>
                {selectedEvent?.isPast && (<div className="text-destructive text-xs font-medium my-1">Past Event</div>)}
              </div>

              {/* Countdown Display */}
              <div className={`flex items-center justify-center mb-6 ${isTightSpace ? 'px-4 gap-2' : 'gap-4'}`}>
                {/* Days */}
                <div className="flex flex-col items-center">
                  <div className="tracking-tight text-foreground tabular-nums font-semibold" style={{fontFamily: 'SF Mono, Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace', fontSize: isTightSpace ? '36px' : '57.6px'}}>
                    {formatNumber(timeRemaining.days)}
                  </div>
                  <div className="text-muted-foreground uppercase tracking-wider mt-1 font-medium" style={{fontSize: isTightSpace ? '8px' : '10.4px'}}>
                    Day(s)
                  </div>
                </div>

                {/* Separator */}
                <div className="text-muted-foreground/40 font-light mb-5" style={{fontSize: isTightSpace ? '28px' : '44.8px'}}>:</div>

                {/* Hours */}
                <div className="flex flex-col items-center">
                  <div className="tracking-tight text-foreground tabular-nums font-semibold" style={{fontFamily: 'SF Mono, Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace', fontSize: isTightSpace ? '36px' : '57.6px'}}>
                    {formatNumber(timeRemaining.hours)}
                  </div>
                  <div className="text-muted-foreground uppercase tracking-wider mt-1 font-medium" style={{fontSize: isTightSpace ? '8px' : '10.4px'}}>
                    Hour(s)
                  </div>
                </div>

                {/* Separator */}
                <div className="text-muted-foreground/40 font-light mb-5" style={{fontSize: isTightSpace ? '28px' : '44.8px'}}>:</div>

                {/* Minutes */}
                <div className="flex flex-col items-center">
                  <div className="tracking-tight text-foreground tabular-nums font-semibold" style={{fontFamily: 'SF Mono, Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace', fontSize: isTightSpace ? '36px' : '57.6px'}}>
                    {formatNumber(timeRemaining.minutes)}
                  </div>
                  <div className="text-muted-foreground uppercase tracking-wider mt-1 font-medium" style={{fontSize: isTightSpace ? '8px' : '10.4px'}}>
                    Minute(s)
                  </div>
                </div>

                {/* Separator */}
                <div className="text-muted-foreground/40 font-light mb-5" style={{fontSize: isTightSpace ? '28px' : '44.8px'}}>:</div>

                {/* Seconds */}
                <div className="flex flex-col items-center">
                  <div className="tracking-tight text-foreground tabular-nums font-semibold" style={{fontFamily: 'SF Mono, Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace', fontSize: isTightSpace ? '36px' : '57.6px'}}>
                    {formatNumber(timeRemaining.seconds)}
                  </div>
                  <div className="text-muted-foreground uppercase tracking-wider mt-1 font-medium" style={{fontSize: isTightSpace ? '8px' : '10.4px'}}>
                    Second(s)
                  </div>
                </div>
              </div>

              {/* Forecast Table */}
              {selectedEvent?.forecast && (
                <div className="w-full max-w-md mt-8 mb-6 mx-auto">
                  <div className="bg-muted/20 border border-border/40 rounded overflow-hidden">
                    <div className="grid grid-cols-5 bg-muted/30">
                      <div className="px-3 py-2 text-foreground uppercase tracking-wider text-center border-r border-border/30 font-semibold flex items-center justify-center" style={{fontSize: '14px'}}>
                        ACTUAL
                      </div>
                      <div className="px-3 py-2 text-foreground uppercase tracking-wider text-center border-r border-border/30 font-semibold flex items-center justify-center" style={{fontSize: '14px'}}>
                        HIGH
                      </div>
                      <div className="px-3 py-2 text-foreground uppercase tracking-wider text-center border-r border-border/30 font-semibold flex items-center justify-center" style={{fontSize: '14px'}}>
                        FORECAST
                      </div>
                      <div className="px-3 py-2 text-foreground uppercase tracking-wider text-center border-r border-border/30 font-semibold flex items-center justify-center" style={{fontSize: '14px'}}>
                        LOW
                      </div>
                      <div className="px-3 py-2 text-foreground uppercase tracking-wider text-center font-semibold flex items-center justify-center" style={{fontSize: '14px'}}>
                        PREVIOUS
                      </div>
                    </div>
                    <div className="grid grid-cols-5 bg-widget-body">
                      <div className="px-3 py-3 text-foreground text-center border-r border-border/30 tabular-nums font-semibold whitespace-nowrap flex items-center justify-center" style={{fontFamily: 'SF Mono, Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace', fontSize: '14px'}}>
                        {withSuffix(selectedEvent.forecast.actual, selectedEvent.suffix)}
                      </div>
                      <div className="px-3 py-3 text-foreground text-center border-r border-border/30 tabular-nums font-semibold whitespace-nowrap flex items-center justify-center" style={{fontFamily: 'SF Mono, Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace', fontSize: '14px'}}>
                        {withSuffix(selectedEvent.forecast.high, selectedEvent.suffix)}
                      </div>
                      <div className="px-3 py-3 text-foreground text-center border-r border-border/30 tabular-nums font-semibold whitespace-nowrap flex items-center justify-center" style={{fontFamily: 'SF Mono, Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace', fontSize: '14px'}}>
                        {withSuffix(selectedEvent.forecast.forecast, selectedEvent.suffix)}
                      </div>
                      <div className="px-3 py-3 text-foreground text-center border-r border-border/30 tabular-nums font-semibold whitespace-nowrap flex items-center justify-center" style={{fontFamily: 'SF Mono, Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace', fontSize: '14px'}}>
                        {withSuffix(selectedEvent.forecast.low, selectedEvent.suffix)}
                      </div>
                      <div className="px-3 py-3 text-foreground text-center tabular-nums font-semibold whitespace-nowrap flex items-center justify-center" style={{fontFamily: 'SF Mono, Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace', fontSize: '14px'}}>
                        {withSuffix(selectedEvent.forecast.previous, selectedEvent.suffix)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Event Selector */}
              <div className="w-full max-w-md">
                <div className="text-base text-foreground uppercase tracking-wider mb-3 px-1 font-semibold">
                  Upcoming Events
                </div>
                <div className="space-y-1">
                  {events.map((event, index) => {
                    const eventDiff = event.eventTime.getTime() - currentTime.getTime();
                    const eventHours = Math.floor(eventDiff / (1000 * 60 * 60));
                    
                    return (
                      <button
                        key={index}
                        onClick={() => setSelectedEventIndex(index)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded border transition-all duration-200 ${
                          selectedEventIndex === index
                            ? "bg-primary/10 border-primary/30"
                            : "bg-muted/20 border-border/40 hover:bg-muted/30 hover:border-border/60"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${getImpactColor(event.impact)}`}></div>
                          <span className="text-foreground font-semibold" style={{fontSize: '14px'}}>{event.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground" style={{fontSize: '14px'}}>
                            {eventHours > 24 
                              ? `${Math.floor(eventHours / 24)}d ${eventHours % 24}h`
                              : `${eventHours}h`
                            }
                          </span>
                          <span className="text-primary font-semibold" style={{fontSize: '14px'}}>{event.currency}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EconomicEventCountdownWidget;

