'use client';

import React, { useState, useEffect } from 'react';
import { WidgetHeader } from '@/components/bloomberg-ui/WidgetHeader';
import { ChevronLeft, ChevronRight, Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchWeekAheadData, type WeekEvent } from './api';
import { widgetDataCache } from '@/lib/widgetDataCache';

interface WeekAheadProps {
  id: string;
  onRemove: () => void;
  onSettings: () => void;
  onFullscreen?: () => void;
}

export function WeekAhead({ id, onRemove, onSettings, onFullscreen }: WeekAheadProps) {
  const [currentWeek, setCurrentWeek] = useState(0);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [weeks, setWeeks] = useState<WeekEvent[][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentWeekData = weeks[currentWeek] || [];

  // Fetch week ahead data on component mount
  useEffect(() => {
    const loadWeekAheadData = async () => {
      const cacheKey = widgetDataCache.generateKey('week-ahead', { type: 'graphic' });
      const cachedData = widgetDataCache.get<WeekEvent[][]>(cacheKey);
      
      if (cachedData) {
        setWeeks(cachedData);
        setCurrentWeek(0);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        const weekEvents = await fetchWeekAheadData('graphic');
        
        if (weekEvents && weekEvents.length > 0) {
          setWeeks(weekEvents);
          widgetDataCache.set(cacheKey, weekEvents);
          setCurrentWeek(0); // Start with the first week
        } else {
          setError('No week ahead data available');
        }
      } catch (err) {
        console.error('Error loading week ahead data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load week ahead data');
      } finally {
        setLoading(false);
      }
    };

    loadWeekAheadData();
  }, []);

  const goToPreviousWeek = () => {
    setCurrentWeek((prev) => Math.max(0, prev - 1));
  };

  const goToNextWeek = () => {
    setCurrentWeek((prev) => Math.min(weeks.length - 1, prev + 1));
  };

  const toggleEventExpansion = (eventId: string) => {
    setExpandedEvents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  const shouldTruncate = (text: string) => text.length > 200;
  
  const getTruncatedText = (text: string) => {
    if (text.length <= 200) return text;
    return text.substring(0, 200) + '...';
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-destructive';
      case 'medium':
        return 'border-l-warning';
      case 'low':
        return 'border-l-accent';
      default:
        return 'border-l-border';
    }
  };

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'high':
        return (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/20 text-destructive border border-destructive/30">
            <AlertCircle className="w-3 h-3" />
            <span className="text-xs font-medium uppercase tracking-wider">High Impact</span>
          </div>
        );
      case 'medium':
        return (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning/20 text-warning border border-warning/30">
            <TrendingUp className="w-3 h-3" />
            <span className="text-xs font-medium uppercase tracking-wider">Med Impact</span>
          </div>
        );
      case 'low':
        return (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/20 text-accent border border-accent/30">
            <Calendar className="w-3 h-3" />
            <span className="text-xs font-medium uppercase tracking-wider">Low Impact</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-card text-card-foreground rounded-lg border border-border overflow-hidden">
      <WidgetHeader title="Week Ahead" onRemove={onRemove} onFullscreen={onFullscreen}>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={goToPreviousWeek}
            disabled={currentWeek === 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={goToNextWeek}
            disabled={weeks.length === 0 || currentWeek === weeks.length - 1}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </WidgetHeader>

      {/* Timeline Content */}
      <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-background/50 to-background/30">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-muted-foreground text-sm">Loading week ahead data...</div>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-destructive text-sm mb-2">Error loading data</div>
              <div className="text-muted-foreground text-xs">{error}</div>
            </div>
          </div>
        ) : weeks.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-muted-foreground text-sm">No week ahead data available</div>
            </div>
          </div>
        ) : (
        <div className="relative">
          {/* Vertical Timeline Line */}
          <div className="absolute left-[42px] top-0 bottom-0 w-px bg-gradient-to-b from-border via-primary/30 to-border" />

          {/* Timeline Items */}
          <div className="space-y-6">
            {currentWeekData.map((dayData, dayIndex) => (
              <div key={`${dayData.day}-${dayData.month}`} className="relative">
                {/* Date Circle */}
                <div className="flex items-start gap-4">
                  <div
                    className={`relative z-10 flex flex-col items-center justify-center w-[85px] h-[85px] rounded-full border-2 transition-all ${
                      dayData.isToday
                        ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30'
                        : 'bg-card/80 backdrop-blur-sm text-foreground border-border hover:border-primary/50'
                    }`}
                  >
                    <div className={`text-xs font-medium uppercase tracking-wider ${
                      dayData.isToday ? 'text-white/80' : 'text-muted-foreground'
                    }`}>
                      {dayData.dayName}
                    </div>
                    <div className="text-2xl font-bold tabular-nums mt-0.5">{dayData.day}</div>
                    <div className={`text-xs font-medium uppercase tracking-wider ${
                      dayData.isToday ? 'text-white/80' : 'text-muted-foreground'
                    }`}>
                      {dayData.month}
                    </div>
                    {dayData.isToday && (
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                        <div className="px-2 py-0.5 rounded-full bg-white text-primary text-xs font-bold uppercase tracking-wider">
                          Today
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Events for this day */}
                  <div className="flex-1 space-y-3 pb-2">
                    {dayData.events.length > 0 ? (
                      dayData.events.map((event, eventIndex) => {
                        const eventId = `${dayData.day}-${dayData.month}-${eventIndex}`;
                        const isExpanded = expandedEvents.has(eventId);
                        const needsTruncation = shouldTruncate(event.description);
                        
                        return (
                          <div
                            key={eventIndex}
                            className={`group bg-card/50 backdrop-blur-sm rounded-lg border-l-4 ${getPriorityColor(
                              event.priority
                            )} border-r border-t border-b border-border/50 p-4 hover:bg-card/80 hover:border-primary/30 transition-all`}
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <h4 className="text-base font-medium text-foreground leading-tight">
                                {event.title}
                              </h4>
                              {getPriorityBadge(event.priority)}
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {isExpanded || !needsTruncation
                                ? event.description
                                : getTruncatedText(event.description)}
                            </p>
                            {needsTruncation && (
                              <button
                                onClick={() => toggleEventExpansion(eventId)}
                                className="mt-2 px-0 pb-2 text-base text-primary hover:text-primary/80 font-medium uppercase tracking-wider transition-colors flex items-center gap-2 justify-start"
                              >
                                {isExpanded ? (
                                  <>
                                    <span>Show Less</span>
                                    <ChevronLeft className="w-5 h-5 rotate-90" />
                                  </>
                                ) : (
                                  <>
                                    <span>Read More</span>
                                    <ChevronRight className="w-5 h-5 rotate-90" />
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="bg-muted/30 rounded-lg border border-border/30 p-4">
                        <p className="text-xs text-muted-foreground italic">
                          No major events scheduled
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Connector line to next day */}
                {dayIndex < currentWeekData.length - 1 && (
                  <div className="absolute left-[42px] top-[85px] w-px h-6 bg-border" />
                )}
              </div>
            ))}
          </div>
        </div>
        )}
      </div>

      {/* Footer with summary */}
      <div className="border-t border-border/50 bg-background/80 backdrop-blur-sm px-4 py-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-destructive" />
              <span className="text-base text-muted-foreground">
                {currentWeekData.reduce(
                  (acc, day) => acc + day.events.filter((e) => e.priority === 'high').length,
                  0
                )}{' '}
                High Impact
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-warning" />
              <span className="text-base text-muted-foreground">
                {currentWeekData.reduce(
                  (acc, day) => acc + day.events.filter((e) => e.priority === 'medium').length,
                  0
                )}{' '}
                Medium Impact
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-accent" />
              <span className="text-base text-muted-foreground">
                {currentWeekData.reduce(
                  (acc, day) => acc + day.events.filter((e) => e.priority === 'low').length,
                  0
                )}{' '}
                Low Impact
              </span>
            </div>
          </div>
          <div className="text-muted-foreground">
            Total Events: {currentWeekData.reduce((acc, day) => acc + day.events.length, 0)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default WeekAhead;
