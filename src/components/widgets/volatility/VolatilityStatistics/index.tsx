"use client";

import { useState, useEffect } from "react";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import { widgetDataCache } from '@/lib/widgetDataCache';
import { getSymbolShortFormat } from "@/utils/symbolMapping";

interface VolatilityStatisticsProps {
  onSettings?: () => void;
  onRemove?: () => void;
  onFullscreen?: () => void;
  settings?: {
    symbol?: string;
  };
}

/**
 * DataRow Interface
 * 
 * Expected API Response Structure:
 * Array of objects with the following properties:
 * {
 *   date: string;           // Date in format "MM/DD/YYYY" (e.g., "10/31/2025")
 *   last: string;           // Last/Close price as string (e.g., "1.1568")
 *   open: string;           // Open price as string (e.g., "1.1564")
 *   high: string;           // High price as string (e.g., "1.1577")
 *   low: string;            // Low price as string (e.g., "1.1563")
 *   percent: number;        // Percentage change (e.g., 0.035 or -0.314)
 *   openToOpen: number;     // Open-to-open percentage change (e.g., -0.314 or 0.055)
 *   highToLow: number;      // High-to-low percentage range (e.g., 0.126 or 0.783)
 *   atr: number;           // Average True Range percentage (e.g., 0.453 or 0.767)
 * }
 */
interface DataRow {
  date: string;
  last: string;
  open: string;
  high: string;
  low: string;
  percent: number;
  openToOpen: number;
  highToLow: number;
  atr: number;
}

export function VolatilityStatistics({ onSettings, onRemove, onFullscreen, settings }: VolatilityStatisticsProps) {
  const [data, setData] = useState<DataRow[]>([]);
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
      const cacheKey = widgetDataCache.generateKey('volatility-statistics', { symbol });
      const cachedData = widgetDataCache.get<DataRow[]>(cacheKey);
      
      if (cachedData) {
        setData(cachedData);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/pmt/volatility-statistics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            symbol: symbol,
          }),
        });

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch data');
        }

        setData(result.data || []);
        widgetDataCache.set(cacheKey, result.data || []);
      } catch (err) {
        console.error('Error fetching volatility statistics data:', err);
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
        title="Volatility Statistics"
        subtitle={`[${getSymbolShortFormat(symbol)}]`}
        onSettings={onSettings}
        onRemove={onRemove}
        onFullscreen={onFullscreen}
        helpContent="Historical volatility statistics showing daily price movements, open-to-open changes, high-to-low ranges, and Average True Range (ATR)."
      />

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        ) : error ? (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-sm text-red-400">Error: {error}</span>
          </div>
        ) : data.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-sm text-muted-foreground">No data available</span>
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-widget-header border-b border-border">
              <tr>
                <th className="text-left px-3 py-2 text-xs text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                  Date
                </th>
                <th className="text-right px-3 py-2 text-xs text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                  Last
                </th>
                <th className="text-right px-3 py-2 text-xs text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                  Open
                </th>
                <th className="text-right px-3 py-2 text-xs text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                  High
                </th>
                <th className="text-right px-3 py-2 text-xs text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                  Low
                </th>
                <th className="text-right px-3 py-2 text-xs text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                  %
                </th>
                <th className="text-right px-3 py-2 text-xs text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                  Open to Open
                </th>
                <th className="text-right px-3 py-2 text-xs text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                  High to Low
                </th>
                <th className="text-right px-3 py-2 text-xs text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                  ATR
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
              <tr
                key={index}
                className="border-b border-border/30 hover:bg-primary/5 transition-colors group"
              >
                <td className="px-3 py-2 text-sm text-foreground whitespace-nowrap">
                  {row.date}
                </td>
                <td className="px-3 py-2 text-sm text-foreground tabular-nums text-right whitespace-nowrap">
                  {row.last}
                </td>
                <td className="px-3 py-2 text-sm text-foreground tabular-nums text-right whitespace-nowrap">
                  {row.open}
                </td>
                <td className="px-3 py-2 text-sm text-foreground tabular-nums text-right whitespace-nowrap">
                  {row.high}
                </td>
                <td className="px-3 py-2 text-sm text-foreground tabular-nums text-right whitespace-nowrap">
                  {row.low}
                </td>
                <td className="px-2 py-2 text-right whitespace-nowrap">
                  <span className={`inline-block px-2 py-1 rounded text-sm tabular-nums ${
                    row.percent >= 0 
                      ? "bg-green-500/20 text-green-400" 
                      : "bg-red-500/20 text-red-400"
                  }`}>
                    {row.percent >= 0 ? "+" : ""}{row.percent.toFixed(3)}%
                  </span>
                </td>
                <td className="px-2 py-2 text-right whitespace-nowrap">
                  <span className={`inline-block px-2 py-1 rounded text-sm tabular-nums ${
                    row.openToOpen >= 0 
                      ? "bg-green-500/20 text-green-400" 
                      : "bg-red-500/20 text-red-400"
                  }`}>
                    {row.openToOpen >= 0 ? "+" : ""}{row.openToOpen.toFixed(3)}%
                  </span>
                </td>
                <td className="px-2 py-2 text-right whitespace-nowrap">
                  <span className="inline-block px-2 py-1 rounded bg-green-500/20 text-green-400 text-sm tabular-nums">
                    {row.highToLow.toFixed(3)}%
                  </span>
                </td>
                <td className="px-2 py-2 text-right whitespace-nowrap">
                  <span className="inline-block px-2 py-1 rounded bg-primary/20 text-primary text-sm tabular-nums">
                    {row.atr.toFixed(3)}%
                  </span>
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

export default VolatilityStatistics;

