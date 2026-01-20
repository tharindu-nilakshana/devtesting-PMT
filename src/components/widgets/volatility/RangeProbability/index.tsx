"use client";

import { useState, useEffect } from "react";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import { widgetDataCache } from '@/lib/widgetDataCache';
import { getSymbolShortFormat } from "@/utils/symbolMapping";

interface RangeProbabilityProps {
  onSettings?: () => void;
  onRemove?: () => void;
  onFullscreen?: () => void;
  settings?: {
    symbol?: string;
  };
}

interface HistogramRow {
  startValue: number;
  endValue: number;
  count: number;
  probability: number;
  cumulativeProbability: number;
}

export function RangeProbability({ onSettings, onRemove, onFullscreen, settings }: RangeProbabilityProps) {
  const [histogramData, setHistogramData] = useState<HistogramRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [symbol, setSymbol] = useState<string>(settings?.symbol || "EURUSD");

  // Sync with settings changes
  useEffect(() => {
    if (settings?.symbol && settings.symbol !== symbol) {
      setSymbol(settings.symbol);
    }
  }, [settings?.symbol, symbol]);

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      const cacheKey = widgetDataCache.generateKey('range-probability', { symbol });
      const cachedData = widgetDataCache.get<any[]>(cacheKey);
      
      if (cachedData) {
        setHistogramData(cachedData);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/pmt/range-probability', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ symbol }),
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch range probability data: ${response.statusText}`);
        }
        const result = await response.json();
        if (!result.success || !result.data) {
          throw new Error('Invalid response from API');
        }
        setHistogramData(result.data.histogramData || []);
        widgetDataCache.set(cacheKey, result.data.histogramData || []);
      } catch (err) {
        console.error('Error fetching range probability data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [symbol]);

  return (
    <div className="h-full w-full flex flex-col bg-widget border border-border rounded-sm overflow-hidden">
      <WidgetHeader
        title="Range Probability"
        subtitle={`[${getSymbolShortFormat(symbol)}]`}
        onSettings={onSettings}
        onRemove={onRemove}
        onFullscreen={onFullscreen}
        helpContent="Range probability data showing price range probabilities and cumulative probabilities for different value ranges."
      />

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-sm text-muted-foreground">Loading range probability data...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-sm text-destructive">Error: {error}</span>
          </div>
        ) : histogramData.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-sm text-muted-foreground">No data available</span>
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-widget-header border-b border-border">
              <tr>
                <th className="text-left px-3 py-2 text-xs text-muted-foreground uppercase tracking-wide">
                  Start Value
                </th>
                <th className="text-left px-3 py-2 text-xs text-muted-foreground uppercase tracking-wide">
                  End Value
                </th>
                <th className="text-right px-3 py-2 text-xs text-muted-foreground uppercase tracking-wide">
                  Count
                </th>
                <th className="text-right px-3 py-2 text-xs text-muted-foreground uppercase tracking-wide">
                  Probability
                </th>
                <th className="text-right px-3 py-2 text-xs text-muted-foreground uppercase tracking-wide">
                  Cumulative Probability
                </th>
              </tr>
            </thead>
            <tbody>
              {histogramData.map((row, index) => (
                <tr
                  key={index}
                  className="border-b border-border/50 hover:bg-muted/5 transition-colors"
                >
                  <td className="px-3 py-2 text-sm text-foreground tabular-nums">
                    {row.startValue.toFixed(3)}
                  </td>
                  <td className="px-3 py-2 text-sm text-foreground tabular-nums">
                    {row.endValue.toFixed(3)}
                  </td>
                  <td className="px-3 py-2 text-sm text-foreground tabular-nums text-right">
                    {row.count}
                  </td>
                  <td className="px-3 py-2 text-sm text-foreground tabular-nums text-right">
                    {row.probability.toFixed(3)}%
                  </td>
                  <td className="px-3 py-2 text-sm text-foreground tabular-nums text-right">
                    {row.cumulativeProbability.toFixed(3)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default RangeProbability;

