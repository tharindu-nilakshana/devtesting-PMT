"use client";

import React, { useState, useEffect } from "react";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Loader2 } from "lucide-react";
import { fetchDMXPositioning } from "./api";
import { getSymbolShortFormat } from "@/utils/symbolMapping";

interface DMXPositioningProps {
  onSettings?: () => void;
  onRemove?: () => void;
  onFullscreen?: () => void;
  settings?: {
    assetClass?: string;
    symbol?: string;
  };
}

type AssetClass = "forex" | "crypto" | "commodities" | "indices";

interface DMXData {
  name: string;
  value: number;
  color: string;
}

// Colors for the chart (design constants)
const COLORS = {
  short: "#ff4d6d", // Pink/Red
  long: "#06d6a0", // Teal/Cyan
};

export default function DMXPositioning({ onSettings, onRemove, onFullscreen, settings }: DMXPositioningProps) {
  // Asset class to module mapping
  const getModuleFromAssetClass = (assetClass?: string): string => {
    const mapping: Record<string, string> = {
      forex: "Forex",
      crypto: "Crypto",
      commodities: "Commodities",
      indices: "Indices",
    };
    return assetClass && assetClass in mapping ? mapping[assetClass] : "Forex";
  };

  // Get asset class and symbol from settings
  // Note: Symbols are now loaded dynamically via WidgetSettingsSlideIn using the shared dmxSymbolsByAssetClass state
  const assetClass = (settings?.assetClass as AssetClass) || "forex";
  const selectedSymbol = settings?.symbol || "EUR/USD";
  const selectedModule = getModuleFromAssetClass(assetClass);
  
  const [positioningData, setPositioningData] = useState<{ short: number; long: number } | null>(null);
  const [positioningLoading, setPositioningLoading] = useState(false);
  const [positioningError, setPositioningError] = useState<string | null>(null);

  // Format symbol for display based on asset class
  const formatSymbolForDisplay = (symbol: string): string => {
    // If symbol already has a slash, return as-is
    if (symbol.includes('/')) return symbol;
    
    // For forex: format 6-character symbols (e.g., "EURUSD" -> "EUR/USD")
    if (assetClass === 'forex' && symbol.length === 6 && !symbol.includes(':')) {
      return `${symbol.substring(0, 3)}/${symbol.substring(3)}`;
    }
    
    // For commodities: format some symbols (e.g., "XAUUSD" -> "XAU/USD")
    if (assetClass === 'commodities' && symbol.length === 6 && symbol.startsWith('X')) {
      // Handle XAUUSD, XAGUSD, etc.
      if (symbol.substring(3) === 'USD') {
        return `${symbol.substring(0, 3)}/${symbol.substring(3)}`;
      }
    }
    
    // For other cases, return as-is
    return symbol;
  };

  // Fetch positioning data when symbol or module changes
  useEffect(() => {
    if (!selectedSymbol) {
      setPositioningData(null);
      return;
    }

    let mounted = true;
    const controller = new AbortController();

    async function load() {
      setPositioningLoading(true);
      setPositioningError(null);

      console.log('📊 [DMX Positioning] Fetching positioning data for:', selectedSymbol, 'module:', selectedModule);

      const response = await fetchDMXPositioning(
        selectedSymbol,
        selectedModule,
        controller.signal
      );

      console.log('📊 [DMX Positioning] API Response:', response);

      if (!mounted) return;

      if (!response.success || !response.data) {
        console.error('❌ [DMX Positioning] Error:', response.error);
        setPositioningError(response.error ?? "Unable to load data");
        setPositioningData(null);
        setPositioningLoading(false);
        return;
      }

      console.log('✅ [DMX Positioning] Real API data received:', response.data);
      setPositioningData(response.data);
      setPositioningLoading(false);
    }

    load().catch((err) => {
      if (!mounted) return;
      setPositioningError(err instanceof Error ? err.message : "Unknown error");
      setPositioningLoading(false);
    });

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [selectedSymbol, selectedModule, assetClass]);

  // Only show chart when we have real API data
  const hasData = positioningData !== null && (positioningData.short > 0 || positioningData.long > 0);
  
  const chartData: DMXData[] = hasData ? [
    { name: "Short", value: positioningData.short, color: COLORS.short },
    { name: "Long", value: positioningData.long, color: COLORS.long },
  ] : [];

  const total = hasData ? positioningData.short + positioningData.long : 0;
  const shortPercent = total > 0 ? ((positioningData!.short / total) * 100).toFixed(1) : "0";
  const longPercent = total > 0 ? ((positioningData!.long / total) * 100).toFixed(1) : "0";

  const formatValue = (value: number): string => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };

  const CustomLegend = () => {
    return (
      <div className="absolute top-3 left-3 z-10 flex items-center gap-4 px-3 py-2 rounded bg-widget-header/90 backdrop-blur-sm border border-border shadow-lg">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: COLORS.short }}
          ></div>
          <span className="text-xs text-foreground">Short</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: COLORS.long }}
          ></div>
          <span className="text-xs text-foreground">Long</span>
        </div>
      </div>
    );
  };

  const CustomLabel = ({ cx, cy, midAngle, outerRadius, percent, name, value }: any) => {
    const RADIAN = Math.PI / 180;
    // Position labels outside the chart
    const radius = outerRadius + 25;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Only show label if percentage is significant enough
    if (percent < 0.05) return null;

    return (
      <text
        x={x}
        y={y}
        fill="currentColor"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-sm fill-foreground"
      >
        {`${name}, ${formatValue(value)}`}
      </text>
    );
  };

  // Display symbol with formatting
  const displaySymbol = selectedSymbol ? getSymbolShortFormat(selectedSymbol) : "No symbol selected";

  return (
    <div className="flex flex-col h-full bg-widget-body border border-border rounded-none overflow-hidden">
      <WidgetHeader
        title={
          <span>
            DMX Positioning <span className="text-primary">[{displaySymbol}]</span>
          </span>
        }
        widgetName="DMX Positioning"
        onSettings={onSettings}
        onRemove={onRemove}
        onFullscreen={onFullscreen}
        helpContent="Displays DMX positioning data showing the percentage of traders holding long vs short positions. Often used as a contrarian indicator."
      />

      {/* Chart */}
      <div className="flex-1 p-6 flex flex-col items-center justify-center relative">
        {/* Loading State */}
        {positioningLoading && (
          <div className="w-full h-full flex items-center justify-center">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading positioning data...</span>
              </div>
          </div>
        )}

        {/* Error State */}
        {!positioningLoading && positioningError && (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-destructive">{positioningError}</p>
            </div>
          </div>
        )}

        {/* No Data Available */}
        {!positioningLoading && !positioningError && selectedSymbol && !hasData && (
          <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
              <p className="text-sm text-muted-foreground">No positioning data available for {displaySymbol}</p>
            </div>
          </div>
        )}

        {/* Chart with Real Data */}
        {!positioningLoading && !positioningError && hasData && (
          <>
            {/* Legend Overlay */}
            <CustomLegend />
            
            <div className="w-full h-full max-w-md max-h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius="60%"
                    outerRadius="85%"
                    paddingAngle={2}
                    dataKey="value"
                    label={CustomLabel}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Summary Stats - Only shown with real data */}
        <div className="mt-6 grid grid-cols-3 gap-6 w-full max-w-lg">
          <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Short Positions</div>
                <div className="text-lg" style={{ color: COLORS.short }}>
                  {formatValue(positioningData!.short)}
                </div>
                <div className="text-xs text-muted-foreground">{shortPercent}%</div>
          </div>
          <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Long Positions</div>
                <div className="text-lg" style={{ color: COLORS.long }}>
                  {formatValue(positioningData!.long)}
                </div>
                <div className="text-xs text-muted-foreground">{longPercent}%</div>
          </div>
          <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Net Sentiment</div>
                <div
                  className="text-lg"
                  style={{
                    color: positioningData!.short > positioningData!.long ? COLORS.short : COLORS.long,
                  }}
                >
                  {positioningData!.short > positioningData!.long ? "Bearish" : "Bullish"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatValue(Math.abs(positioningData!.short - positioningData!.long))}
                </div>
              </div>
            </div>
              </>
            )}
      </div>
    </div>
  );
}

