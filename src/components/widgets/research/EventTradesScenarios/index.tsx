'use client';

import React, { useState, useEffect } from "react";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown } from "lucide-react";
import {
  fetchEventTrades,
  transformApiEventTradesResponse,
  type EventScenario
} from './api';
import { widgetDataCache } from '@/lib/widgetDataCache';

type WidgetSettings = Record<string, unknown>;

interface EventTradesScenariosProps {
  onSettings?: () => void;
  onRemove?: () => void;
  onFullscreen?: () => void;
  settings?: WidgetSettings;
}

// Mock data removed - will be replaced with API data

export function EventTradesScenarios({ onSettings, onRemove, onFullscreen, settings = {} }: EventTradesScenariosProps) {
  const [events, setEvents] = useState<EventScenario[]>([]);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [selectedImpact] = useState<"all" | "high" | "medium" | "low">("high");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch event trades on mount
  useEffect(() => {
    const loadEventTrades = async () => {
      const cacheKey = widgetDataCache.generateKey('event-trades', {});
      const cachedData = widgetDataCache.get<EventScenario[]>(cacheKey);
      
      if (cachedData) {
        console.log('✅ [Event Trades Component] Using cached event trades:', cachedData.length);
        setEvents(cachedData);
        setIsLoading(false);
        return;
      }

      console.log('🔄 [Event Trades Component] Starting to load event trades...');
      setIsLoading(true);
      setError(null);
      
      try {
        const apiResponse = await fetchEventTrades();
        console.log('🔄 [Event Trades Component] API response received:', apiResponse);
        
        if (!apiResponse) {
          console.error('❌ [Event Trades Component] API response is null');
          setError('Failed to load event trades: No response');
          setIsLoading(false);
          return;
        }
        
        if (!apiResponse.success) {
          console.error('❌ [Event Trades Component] API response not successful');
          setError('Failed to load event trades: API returned error');
          setIsLoading(false);
          return;
        }
        
        if (!apiResponse.data || apiResponse.data.length === 0) {
          console.warn('⚠️ [Event Trades Component] No events in response');
          setEvents([]);
          setIsLoading(false);
          return;
        }
        
        console.log('✅ [Event Trades Component] Transforming', apiResponse.data.length, 'events');
        const transformed = transformApiEventTradesResponse(apiResponse.data);
        console.log('✅ [Event Trades Component] Transformed events:', transformed);
        setEvents(transformed);
        widgetDataCache.set(cacheKey, transformed);
        setIsLoading(false);
      } catch (err) {
        console.error('❌ [Event Trades Component] Error loading event trades:', err);
        setError(err instanceof Error ? err.message : 'Failed to load event trades');
        setIsLoading(false);
      }
    };
    
    loadEventTrades();
  }, []);

  const filteredEvents = events.filter(event => {
    const impactMatch = selectedImpact === "all" || event.impact === selectedImpact;
    return impactMatch;
  });

  // Group events by date
  const groupedEvents = filteredEvents.reduce((acc, event) => {
    if (!acc[event.date]) {
      acc[event.date] = [];
    }
    acc[event.date].push(event);
    return acc;
  }, {} as Record<string, EventScenario[]>);

  const getImpactIndicator = (impact: "high" | "medium" | "low") => {
    const circles = impact === "high" ? 3 : impact === "medium" ? 2 : 1;
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 ${
              i < circles ? "bg-foreground" : "bg-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    );
  };

  const formatValue = (value?: string, actual?: string, forecast?: string) => {
    if (!value || value === "–") {
      return <span className="text-muted-foreground">–</span>;
    }
    
    // Determine color based on value and comparison
    let colorClass = "text-foreground";
    if (value.includes("-")) {
      colorClass = "text-destructive";
    } else if (actual && forecast && value === actual) {
      const actualNum = parseFloat(actual.replace(/[^0-9.-]/g, ""));
      const forecastNum = parseFloat(forecast.replace(/[^0-9.-]/g, ""));
      if (!isNaN(actualNum) && !isNaN(forecastNum)) {
        if (actualNum > forecastNum) {
          colorClass = "text-success";
        } else if (actualNum < forecastNum) {
          colorClass = "text-destructive";
        }
      }
    }
    
    return <span className={colorClass}>{value}</span>;
  };

  return (
    <div className="w-full h-full bg-widget-body border border-border flex flex-col overflow-hidden">
      {/* Header */}
      <WidgetHeader
        title="Event Trades Scenarios"
        onRemove={onRemove}
        onFullscreen={onFullscreen}
        helpContent="Detailed trading scenarios for major economic events. Each event provides strengthening and weakening scenarios with specific metrics and suggested currency pairs. Expand events to see full analysis and trading strategies."
      />

      {/* Events List */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-widget-header border-b-2 border-border z-10">
            <tr>
              <th className="text-left px-3 py-2 text-muted-foreground uppercase tracking-wider text-xs">
                <div className="flex items-center gap-1">
                  Time
                </div>
              </th>
              <th className="text-center px-3 py-2 text-muted-foreground uppercase tracking-wider text-xs">Currency</th>
              <th className="text-center px-3 py-2 text-muted-foreground uppercase tracking-wider text-xs">Impact</th>
              <th className="text-left px-3 py-2 text-muted-foreground uppercase tracking-wider text-xs">Event Scenario</th>
              <th className="text-right px-3 py-2 text-muted-foreground uppercase tracking-wider text-xs">Actual</th>
              <th className="text-right px-3 py-2 text-muted-foreground uppercase tracking-wider text-xs">High</th>
              <th className="text-right px-3 py-2 text-muted-foreground uppercase tracking-wider text-xs">Forecast</th>
              <th className="text-right px-3 py-2 text-muted-foreground uppercase tracking-wider text-xs">Low</th>
              <th className="text-right px-3 py-2 text-muted-foreground uppercase tracking-wider text-xs">Previous</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-muted-foreground">
                  Loading event trades...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-destructive">
                  {error}
                </td>
              </tr>
            ) : Object.keys(groupedEvents).length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-muted-foreground">
                  No event trades available
                </td>
              </tr>
            ) : (
              Object.entries(groupedEvents).map(([date, dateEvents]) => (
              <React.Fragment key={date}>
                {/* Date Separator */}
                <tr>
                  <td colSpan={9} className="bg-muted/50 px-3 py-2 border-y-2 border-border">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-3 bg-primary"></div>
                      <span className="text-base text-foreground tracking-wide">{date}</span>
                    </div>
                  </td>
                </tr>
                {/* Events */}
                {dateEvents.map((event, idx) => (
                  <React.Fragment key={event.id}>
                    <tr
                      onClick={() => setExpandedEventId(expandedEventId === event.id ? null : event.id)}
                      className={`border-b border-border/50 hover:bg-primary/5 transition-all cursor-pointer group ${
                        idx % 2 === 0 ? "bg-widget-body" : "bg-card/20"
                      } ${expandedEventId === event.id ? "bg-primary/10 border-l-4 border-l-primary" : "border-l-4 border-l-transparent"}`}
                    >
                      <td className="px-3 py-3 text-foreground">
                        <div className="flex items-center gap-2">
                          {expandedEventId === event.id ? (
                            <ChevronUp className="w-3.5 h-3.5 text-primary shrink-0" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                          )}
                          <span className="text-base">{event.time}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="inline-flex items-center justify-center px-2 py-1 bg-primary/20 text-primary text-sm border border-primary/30">
                          {event.currency}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-center items-center gap-1">
                          {getImpactIndicator(event.impact)}
                          <span className="text-xs text-muted-foreground ml-1 uppercase">
                            {event.impact}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-foreground">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-base leading-relaxed">{event.event}</span>
                          <div className="flex items-center gap-1 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                            <TrendingUp className="w-3 h-3 text-success" />
                            <TrendingDown className="w-3 h-3 text-destructive" />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="text-base">{formatValue(event.actual, event.actual, event.forecast)}</span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="text-base">{formatValue(event.high)}</span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="text-base">{formatValue(event.forecast)}</span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="text-base">{formatValue(event.low)}</span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="text-base">{formatValue(event.previous)}</span>
                      </td>
                    </tr>
                    {/* Expanded Detail View */}
                    {expandedEventId === event.id && (
                      <tr key={`detail-${event.id}`}>
                        <td colSpan={9} className="p-0 bg-gradient-to-b from-card/80 to-card/50 border-b-2 border-primary/30">
                          <div className="p-5 space-y-5">
                            {/* Main Description */}
                            <div className="space-y-3 bg-widget-body/50 p-4 border-l-2 border-muted-foreground/30">
                              {event.description.split('\n\n').map((paragraph, i) => (
                                <p key={i} className="text-base text-foreground/90 leading-relaxed">
                                  {paragraph}
                                </p>
                              ))}
                            </div>

                            {/* Scenarios Grid */}
                            <div className="grid grid-cols-2 gap-4">
                              {/* Strengthening Scenario */}
                              <div className="space-y-3 bg-success/5 p-4 border-2 border-success/20">
                                <div className="flex items-center gap-2 pb-2 border-b border-success/30">
                                  <TrendingUp className="w-4 h-4 text-success" />
                                  <h4 className="text-lg text-success uppercase tracking-wide">Strengthening Scenario</h4>
                                </div>
                                <p className="text-base text-foreground/90 leading-relaxed">
                                  {event.strengtheningScenario.description}
                                </p>
                                <div className="space-y-2">
                                  <div className="text-sm text-muted-foreground uppercase tracking-wide">Key Metrics:</div>
                                  <ul className="space-y-1.5">
                                    {event.strengtheningScenario.metrics.map((metric, i) => (
                                      <li key={i} className="text-base text-foreground/90 flex items-start gap-2">
                                        <span className="text-success mt-0.5">▸</span>
                                        <span>{metric}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                <div className="pt-2 border-t border-success/20">
                                  <p className="text-base text-foreground/80">
                                    <span className="text-muted-foreground">💡</span> {event.strengtheningScenario.tradePairs}
                                  </p>
                                </div>
                              </div>

                              {/* Weakening Scenario */}
                              <div className="space-y-3 bg-destructive/5 p-4 border-2 border-destructive/20">
                                <div className="flex items-center gap-2 pb-2 border-b border-destructive/30">
                                  <TrendingDown className="w-4 h-4 text-destructive" />
                                  <h4 className="text-lg text-destructive uppercase tracking-wide">Weakening Scenario</h4>
                                </div>
                                <p className="text-base text-foreground/90 leading-relaxed">
                                  {event.weakeningScenario.description}
                                </p>
                                <div className="space-y-2">
                                  <div className="text-sm text-muted-foreground uppercase tracking-wide">Key Metrics:</div>
                                  <ul className="space-y-1.5">
                                    {event.weakeningScenario.metrics.map((metric, i) => (
                                      <li key={i} className="text-base text-foreground/90 flex items-start gap-2">
                                        <span className="text-destructive mt-0.5">▸</span>
                                        <span>{metric}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                <div className="pt-2 border-t border-destructive/20">
                                  <p className="text-base text-foreground/80">
                                    <span className="text-muted-foreground">💡</span> {event.weakeningScenario.tradePairs}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Additional Notes */}
                            {event.additionalNotes && (
                              <div className="bg-primary/5 border-l-4 border-primary p-4">
                                <p className="text-base text-foreground/90 italic">
                                  <span className="text-primary not-italic">ℹ️ Note:</span> {event.additionalNotes}
                                </p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default EventTradesScenarios;
