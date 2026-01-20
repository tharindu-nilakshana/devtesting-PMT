"use client";

import { useEffect, useState } from "react";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import { getSymbolShortFormat } from "@/utils/symbolMapping";
import { widgetDataCache } from '@/lib/widgetDataCache';

interface AverageRangeHistogramProps {
  onSettings?: () => void;
  onRemove?: () => void;
  onFullscreen?: () => void;
  onSaveSettings?: (settings: Record<string, any>) => void;
  settings?: {
    symbol?: string;
    rangeType?: string; // "D" | "W" | "M" or "daily" | "weekly" | "monthly"
  };
}

interface BarData {
  label: string;
  highToLow: number;
  atr: number;
}

export function AverageRangeHistogram({ onSettings, onRemove, onFullscreen, onSaveSettings, settings }: AverageRangeHistogramProps) {
  // Initialize rangeType from settings or default to "daily"
  const getInitialRangeType = (): "daily" | "weekly" | "monthly" => {
    const saved = settings?.rangeType as string;
    if (saved === "D" || saved === "daily") return "daily";
    if (saved === "W" || saved === "weekly") return "weekly";
    if (saved === "M" || saved === "monthly") return "monthly";
    return "daily";
  };
  
  const [rangeType, setRangeType] = useState<"daily" | "weekly" | "monthly">(getInitialRangeType());
  const [histogramData, setHistogramData] = useState<Record<"daily" | "weekly" | "monthly", BarData[]>>({
    daily: [],
    weekly: [],
    monthly: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [symbol, setSymbol] = useState<string>(settings?.symbol || "EURUSD");

  // Sync with settings changes
  useEffect(() => {
    if (settings?.symbol && settings.symbol !== symbol) {
      setSymbol(settings.symbol);
    }
  }, [settings?.symbol, symbol]);
  const currentData = histogramData[rangeType] || [];
  const maxValue = currentData.length > 0 ? Math.max(...currentData.map((d) => d.highToLow)) : 0;
  const currentMaxValue = currentData.length > 0 ? Math.max(...currentData.map((d) => d.highToLow)) : 0;

  useEffect(() => {
    const fetchHistogram = async () => {
      const cacheKey = widgetDataCache.generateKey('average-range-histogram', { symbol, period: rangeType });
      const cachedData = widgetDataCache.get<any[]>(cacheKey);
      
      if (cachedData) {
        setHistogramData((prev) => ({
          ...prev,
          [rangeType]: cachedData,
        }));
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/pmt/average-range-histogram", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ symbol, period: rangeType }),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch histogram data: ${response.statusText}`);
        }

        const result = await response.json();
        if (!result.success || !result.data) {
          throw new Error("Invalid response from histogram API");
        }

        setHistogramData((prev) => ({
          ...prev,
          [rangeType]: result.data.histogramData || [],
        }));
        widgetDataCache.set(cacheKey, result.data.histogramData || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load histogram data");
      } finally {
        setLoading(false);
      }
    };

    // Fetch data when symbol or rangeType changes
    fetchHistogram();
  }, [rangeType, symbol]);

  // Generate Y-axis labels
  const yAxisSteps = 5;
  const yAxisLabels = Array.from({ length: yAxisSteps + 1 }, (_, i) => {
    return (maxValue * i / yAxisSteps).toFixed(2);
  }).reverse();

  return (
    <div className="h-full w-full flex flex-col bg-widget border border-border rounded-sm overflow-hidden">
      <WidgetHeader
        title={<span>{rangeType === "daily" ? "Daily" : rangeType === "weekly" ? "Weekly" : "Monthly"} Histogram <span className="text-muted-foreground"> | </span> <span className="text-primary">[{getSymbolShortFormat(symbol)}]</span></span>}
        widgetName={`${rangeType === "daily" ? "Daily" : rangeType === "weekly" ? "Weekly" : "Monthly"} Histogram`}
        onSettings={onSettings}
        onRemove={onRemove}
        onFullscreen={onFullscreen}
        helpContent="Histogram showing average price ranges by time period (day of week, week of month, or month)."
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setRangeType("daily");
                if (onSaveSettings) {
                  onSaveSettings({ rangeType: "daily" });
                }
              }}
              className={`text-xs tracking-wide transition-all ${
                rangeType === "daily"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              D
            </button>
            <span className="text-xs text-border">|</span>
            <button
              onClick={() => {
                setRangeType("weekly");
                if (onSaveSettings) {
                  onSaveSettings({ rangeType: "weekly" });
                }
              }}
              className={`text-xs tracking-wide transition-all ${
                rangeType === "weekly"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              W
            </button>
            <span className="text-xs text-border">|</span>
            <button
              onClick={() => {
                setRangeType("monthly");
                if (onSaveSettings) {
                  onSaveSettings({ rangeType: "monthly" });
                }
              }}
              className={`text-xs tracking-wide transition-all ${
                rangeType === "monthly"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              M
            </button>
          </div>
        </div>
      </WidgetHeader>

      {/* Chart Area */}
      <div className="flex-1 flex p-4 gap-2 min-h-0">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-sm text-muted-foreground">Loading histogram...</span>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-sm text-destructive">{error}</span>
          </div>
        ) : (
          <>
        {/* Y-Axis */}
        <div className="flex flex-col pr-2 border-r border-border/30 min-w-[32px]" style={{ paddingTop: '40px', paddingBottom: '60px' }}>
          <div className="flex-1 flex flex-col justify-between">
            {yAxisLabels.map((label, index) => (
              <div key={index} className="text-xs text-muted-foreground tabular-nums">
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Chart container with fixed structure */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Histogram area */}
          <div className="flex-1 relative" style={{ paddingTop: '40px' }}>
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none" style={{ bottom: '60px', top: '40px' }}>
              {yAxisLabels.map((_, index) => (
                <div key={index} className="border-t border-border/20" />
              ))}
            </div>

            {/* Bars container */}
            <div className="absolute inset-0 flex items-end gap-1" style={{ bottom: '60px', top: '40px' }}>
              {currentData.map((item, index) => {
                const heightPercentage = maxValue > 0 ? (item.highToLow / maxValue) * 100 : 0;
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center justify-end relative group" style={{ height: '100%' }}>
                    {/* Bar - always render, even if 0 */}
                    <div 
                      className="w-full bg-primary hover:bg-primary/80 transition-all cursor-pointer rounded-t relative"
                      style={{ 
                        height: `${heightPercentage}%`,
                        minHeight: heightPercentage === 0 ? '1px' : '2px',
                        opacity: heightPercentage === 0 ? 0.3 : 1
                      }}
                      title={`High-Low: ${item.highToLow.toFixed(3)}% | ATR: ${item.atr.toFixed(3)}`}
                    />
                  </div>
                );
              })}
            </div>

            {currentData.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ bottom: '60px' }}>
                <span className="text-sm text-muted-foreground">No data available</span>
              </div>
            )}
          </div>

          {/* Percentage labels and X-axis labels */}
          <div className="flex gap-1 mt-auto pt-2">
            {currentData.map((item, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-1">
                {/* Percentage label - always show, even if 0 */}
                <div className="bg-background/90 border border-border/50 rounded px-1.5 py-0.5">
                  <span className={`text-xs tabular-nums font-medium ${item.highToLow > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                    {item.highToLow.toFixed(3)}%
                  </span>
                </div>
                {/* Day label */}
                <span className="text-xs text-muted-foreground">
                  {rangeType === "monthly" ? item.label : rangeType === "weekly" ? item.label : item.label.slice(0, 3)}
                </span>
              </div>
            ))}
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AverageRangeHistogram;

