"use client";

import { useState, useEffect } from "react";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import { widgetDataCache } from '@/lib/widgetDataCache';
import { getSymbolShortFormat } from "@/utils/symbolMapping";

interface DistributionStatsProps {
  onSettings?: () => void;
  onRemove?: () => void;
  onFullscreen?: () => void;
  settings?: {
    symbol?: string;
  };
}

interface StatRow {
  label: string;
  value: string;
}

export function DistributionStats({ onSettings, onRemove, onFullscreen, settings }: DistributionStatsProps) {
  const [stats, setStats] = useState<StatRow[]>([]);
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
      const cacheKey = widgetDataCache.generateKey('distribution-stats', { symbol });
      const cachedData = widgetDataCache.get<any[]>(cacheKey);
      
      if (cachedData) {
        setStats(cachedData);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/pmt/distribution-statistics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ symbol }),
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch distribution statistics: ${response.statusText}`);
        }
        const result = await response.json();
        if (!result.success || !result.data) {
          throw new Error('Invalid response from API');
        }
        setStats(result.data.stats || []);
        widgetDataCache.set(cacheKey, result.data.stats || []);
      } catch (err) {
        console.error('Error fetching distribution statistics:', err);
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
        title="Distribution Statistics"
        subtitle={`[${getSymbolShortFormat(symbol)}]`}
        onSettings={onSettings}
        onRemove={onRemove}
        onFullscreen={onFullscreen}
        helpContent="Statistical measures of price distribution including mean, median, standard deviation, skewness, and kurtosis."
      />

      {/* Stats Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-sm text-muted-foreground">Loading distribution statistics...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-sm text-destructive">Error: {error}</span>
          </div>
        ) : stats.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-sm text-muted-foreground">No data available</span>
          </div>
        ) : (
          <table className="w-full">
            <tbody>
              {stats.map((stat, index) => (
                <tr
                  key={index}
                  className="border-b border-border/30 hover:bg-muted/5 transition-colors"
                >
                  <td className="px-3 py-2.5 text-sm text-foreground">
                    {stat.label}
                  </td>
                  <td className="px-3 py-2.5 text-sm text-foreground tabular-nums text-right">
                    {stat.value}
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

export default DistributionStats;

