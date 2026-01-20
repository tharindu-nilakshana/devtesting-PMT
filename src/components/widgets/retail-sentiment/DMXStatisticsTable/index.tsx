"use client";

import { useState, useEffect } from "react";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import { getSymbolShortFormat } from "@/utils/symbolMapping";
import { fetchDMXStatisticsTable, type StatisticsData } from "./api";
import { usePreferences } from "@/hooks/usePreferences";

interface DMXStatisticsTableProps {
  onSettings?: () => void;
  onRemove?: () => void;
  onFullscreen?: () => void;
  settings?: {
    assetClass?: string;
    symbol?: string;
  };
}

type AssetClass = "forex" | "crypto" | "commodities" | "indices";

// Asset classes with their symbols
const ASSET_CLASSES: Record<AssetClass, { label: string; symbols: string[] }> = {
  forex: {
    label: "Forex",
    symbols: ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD", "NZD/USD", "AUD/JPY"],
  },
  crypto: {
    label: "Crypto",
    symbols: ["BTC/USD", "ETH/USD", "BNB/USD", "SOL/USD", "XRP/USD", "ADA/USD", "DOT/USD"],
  },
  commodities: {
    label: "Commodities",
    symbols: ["Gold", "Silver", "Oil", "Natural Gas", "Copper", "Platinum", "Wheat"],
  },
  indices: {
    label: "Indices",
    symbols: ["S&P 500", "Nasdaq", "Dow Jones", "DAX", "FTSE 100", "Nikkei 225", "Hang Seng"],
  },
};


const COLORS = {
  long: "#22c55e",  // Green
  short: "#ef4444", // Red
  neutral: "#a1a1aa", // Gray
};

export default function DMXStatisticsTable({ onSettings, onRemove, onFullscreen, settings }: DMXStatisticsTableProps) {
  const { preferences, isLoading: preferencesLoading } = usePreferences();
  const [assetClass, setAssetClass] = useState<AssetClass>((settings?.assetClass as AssetClass) || "forex");
  const [selectedSymbol, setSelectedSymbol] = useState<string>(settings?.symbol || "AUD/JPY");
  const [stats, setStats] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debug logging for mount/unmount
  useEffect(() => {
    console.log('📊 [DMX Statistics Table] Component mounted:', {
      assetClass,
      selectedSymbol,
      hasSettings: !!settings,
      preferencesLoading,
      numFormat: preferences?.numFormat,
      timestamp: new Date().toISOString()
    });
    return () => {
      console.log('🗑️ [DMX Statistics Table] Component unmounting');
    };
  }, []);

  // Update local state when settings change
  useEffect(() => {
    if (settings?.assetClass) setAssetClass(settings.assetClass as AssetClass);
    if (settings?.symbol) setSelectedSymbol(settings.symbol);
  }, [settings]);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    async function load() {
      try {
        setLoading(true);
        setError(null);

        console.log('📊 [DMX Statistics Table] Fetching data:', {
          selectedSymbol,
          assetClass,
          timestamp: new Date().toISOString()
        });

        const response = await fetchDMXStatisticsTable(
          selectedSymbol,
          controller.signal
        );

        if (!mounted) {
          console.log('📊 [DMX Statistics Table] Component unmounted, skipping state update');
          return;
        }

        if (!response.success || !response.data) {
          console.error('📊 [DMX Statistics Table] Fetch failed:', response.error);
          setError(response.error ?? "Unable to load data");
          setStats(null);
          setLoading(false);
          return;
        }

        console.log('📊 [DMX Statistics Table] Data loaded successfully:', {
          hasStats: !!response.data,
          longPositions: response.data?.longPositions,
          shortPositions: response.data?.shortPositions
        });

        setStats(response.data);
        setLoading(false);
      } catch (err) {
        if (!mounted) {
          console.log('📊 [DMX Statistics Table] Component unmounted during error handling');
          return;
        }
        console.error('📊 [DMX Statistics Table] Error loading data:', err);
        setError(err instanceof Error ? err.message : "Unknown error");
        setLoading(false);
      }
    }

    load();

    return () => {
      console.log('📊 [DMX Statistics Table] Cleanup: aborting fetch');
      mounted = false;
      controller.abort();
    };
  }, [selectedSymbol, assetClass]);

  // Format number based on user's number format preference
  // EU Format: periods for thousands, commas for decimals (e.g., 1.234.567,89)
  // US Format: commas for thousands, periods for decimals (e.g., 1,234,567.89)
  const formatNumber = (num: number, decimals: number = 0): string => {
    // Default to EU Format if preferences not loaded yet
    const numFormat = preferences?.numFormat || 'EU Format';
    const isEUFormat = numFormat === 'EU Format';
    
    if (isEUFormat) {
      // EU Format: use 'de-DE' locale (periods for thousands, commas for decimals)
      return num.toLocaleString('de-DE', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    } else {
      // US Format: use 'en-US' locale (commas for thousands, periods for decimals)
      return num.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    }
  };

  // Format volume with decimals following number format
  const formatVolume = (volume: string | number): string => {
    const num = typeof volume === 'string' ? parseFloat(volume) : volume;
    if (isNaN(num)) return volume.toString();
    
    // Default to EU Format if preferences not loaded yet
    const numFormat = preferences?.numFormat || 'EU Format';
    const isEUFormat = numFormat === 'EU Format';
    
    if (isEUFormat) {
      // EU Format: 2 decimals with comma
      return num.toLocaleString('de-DE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } else {
      // US Format: 2 decimals with period
      return num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
  };

  const formatSymbol = (symbol: string): string => {
    // Remove slashes and spaces for display in header
    return symbol.replace(/[\/\s]/g, '');
  };

  const tableRows = stats ? [
    { label: "Long Positions", value: formatNumber(stats.longPositions), color: COLORS.long },
    { label: "Short Positions", value: formatNumber(stats.shortPositions), color: COLORS.short },
    { label: "Total Positions", value: formatNumber(stats.totalPositions), color: COLORS.neutral },
    { label: "Average Long Price", value: stats.avgLongPrice > 0 ? formatNumber(stats.avgLongPrice, 5) : "N/A", color: COLORS.long },
    { label: "Average Short Price", value: stats.avgShortPrice > 0 ? formatNumber(stats.avgShortPrice, 5) : "N/A", color: COLORS.short },
    { label: "Long Position Ratio", value: `${stats.longRatio} Lot`, color: COLORS.long },
    { label: "Short Position Ratio", value: `${stats.shortRatio} Lot`, color: COLORS.short },
    { label: "Long Volume", value: `${formatVolume(stats.longVolume)} Lot`, color: COLORS.long },
    { label: "Short Volume", value: `${formatVolume(stats.shortVolume)} Lot`, color: COLORS.short },
  ] : [];

  return (
    <div className="flex flex-col h-full bg-widget-body border border-border rounded-none overflow-hidden">
      <WidgetHeader
        title={
          <span>
            DMX Table <span className="text-primary">[{getSymbolShortFormat(selectedSymbol.replace(/[\s\/]/g, ''))}]</span>
          </span>
        }
        widgetName="DMX Statistics Table"
        onSettings={onSettings}
        onRemove={onRemove}
        onFullscreen={onFullscreen}
        helpContent="Displays detailed retail trader positioning statistics including long/short positions, average prices, ratios, and volumes. This data helps identify potential contrarian trading opportunities."
      />

      {/* Statistics Table */}
      <div className="flex-1 p-4 overflow-auto">
        {loading && (
          <div className="flex flex-1 items-center justify-center text-base text-muted-foreground">
            Loading statistics data...
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="text-5xl">⚠️</div>
            <p className="text-base font-semibold text-foreground">Unable to load statistics</p>
            <p className="text-sm text-muted-foreground max-w-md">{error}</p>
          </div>
        )}

        {!loading && !error && !stats && (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center text-base text-muted-foreground">
            <div className="text-5xl">📊</div>
            <p>No statistics data available yet.</p>
          </div>
        )}

        {!loading && !error && stats && (
          <div className="space-y-0">
            {tableRows.map((row, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-3 border-b border-border/50 last:border-0"
              >
                <span className="text-sm text-foreground">{row.label}</span>
                <span
                  className="text-sm"
                  style={{ color: row.color }}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Warning */}
      {stats && (
        <div className="px-4 pb-4 pt-2">
          <div className="text-center text-xs text-muted-foreground/70">
            {stats.lossPercentage}% of all traders lose money with this provider
          </div>
        </div>
      )}
    </div>
  );
}

