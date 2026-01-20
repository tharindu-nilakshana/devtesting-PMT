"use client";

import { useState, useEffect, useMemo } from "react";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, ChevronDown } from "lucide-react";
import { fetchDMXOverview, type PairData } from "./api";

interface DMXOverviewProps {
  onSettings?: () => void;
  onRemove?: () => void;
  onFullscreen?: () => void;
  onSaveSettings?: (settings: Record<string, any>) => void;
  settings?: {
    assetClass?: string;
    timeFrame?: string;
    sortBy?: string;
  };
}

type TimeFrame = "monthly" | "daily" | "4h" | "1h";
type SortOption = "default" | "pair-az" | "pair-za" | "long-lh" | "long-hl" | "short-lh" | "short-hl";
type AssetClass = "forex" | "crypto" | "commodities" | "indices";

const TIME_FRAMES = [
  { value: "monthly", label: "Every Month" },
  { value: "daily", label: "Every Day" },
  { value: "4h", label: "Every 4 Hours" },
  { value: "1h", label: "Every Hour" },
];

const SORT_OPTIONS = [
  { value: "default", label: "Default Order" },
  { value: "pair-az", label: "Pair (A-Z)" },
  { value: "pair-za", label: "Pair (Z-A)" },
  { value: "long-lh", label: "Long % (Low to High)" },
  { value: "long-hl", label: "Long % (High to Low)" },
  { value: "short-lh", label: "Short % (Low to High)" },
  { value: "short-hl", label: "Short % (High to Low)" },
];

// Asset classes with their symbols
// Note: Symbols match the TickerTapeHeatmap widget format for consistency
// API currently only supports forex pairs. Other asset classes are kept for future support.
const ASSET_CLASSES: Record<AssetClass, { label: string; symbols: string[]; available: boolean }> = {
  forex: {
    label: "Forex",
    available: true,
    symbols: [
      "AUD/CAD", "AUD/CHF", "AUD/JPY", "AUD/NZD", "AUD/USD",
      "CAD/CHF", "CAD/JPY",
      "CHF/JPY",
      "EUR/AUD", "EUR/CAD", "EUR/CHF", "EUR/GBP", "EUR/JPY", "EUR/NZD", "EUR/USD",
      "GBP/AUD", "GBP/CAD", "GBP/CHF", "GBP/JPY", "GBP/NZD", "GBP/USD",
      "NZD/CAD", "NZD/CHF", "NZD/JPY", "NZD/USD",
      "USD/CAD", "USD/CHF", "USD/JPY",
    ],
  },
  crypto: {
    label: "Crypto",
    available: true,
    symbols: ["BTC/USD", "ETH/USD", "BNB/USD", "SOL/USD", "XRP/USD", "ADA/USD", "DOT/USD", "AVAX/USD"],
  },
  commodities: {
    label: "Commodities",
    available: true,
    // Using TickerTapeHeatmap format: XAUUSD, XAGUSD, USOIL, UKOIL, XPTUSD, XPDUSD
    symbols: ["XAUUSD", "XAGUSD", "USOIL", "UKOIL", "XPTUSD", "XPDUSD"],
  },
  indices: {
    label: "Indices",
    available: true,
    // Using TickerTapeHeatmap format: SPX500, NAS100, DJI, FTSE100, DAX40, CAC40, NIKKEI225
    symbols: ["SPX500", "NAS100", "DJI", "FTSE100", "DAX40", "CAC40", "NIKKEI225"],
  },
};

const COLORS = {
  long: "#22c55e",  // Green
  short: "#ef4444", // Red
};

export default function DMXOverview({ onSettings, onRemove, onFullscreen, onSaveSettings, settings }: DMXOverviewProps) {
  // Ensure assetClass is always a valid value
  const getValidAssetClass = (value: string | undefined): AssetClass => {
    if (value && value in ASSET_CLASSES) {
      return value as AssetClass;
    }
    return "forex"; // Default to forex
  };

  const [assetClass, setAssetClass] = useState<AssetClass>(getValidAssetClass(settings?.assetClass));
  const [timeFrame, setTimeFrame] = useState<TimeFrame>((settings?.timeFrame as TimeFrame) || "1h");
  const [sortBy, setSortBy] = useState<SortOption>((settings?.sortBy as SortOption) || "default");
  const [pairData, setPairData] = useState<PairData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dynamicSymbols, setDynamicSymbols] = useState<Record<AssetClass, string[]>>({
    forex: ASSET_CLASSES.forex.symbols,
    crypto: ASSET_CLASSES.crypto.symbols,
    commodities: [],
    indices: [],
  });
  const [symbolsLoading, setSymbolsLoading] = useState(false);

  // Map asset classes to API module names
  const ASSET_CLASS_TO_MODULE: Record<AssetClass, string> = {
    forex: "Forex",
    crypto: "Crypto",
    commodities: "Commodities",
    indices: "Indices",
  };

  // Format symbol for display (e.g., "EURUSD" -> "EUR/USD" for forex)
  const formatSymbolForDisplay = (symbol: string, assetClass: AssetClass): string => {
    if (assetClass === 'forex' && symbol && symbol.length === 6 && !symbol.includes('/') && !symbol.includes(':')) {
      // Forex pairs: EURUSD -> EUR/USD
      return `${symbol.substring(0, 3)}/${symbol.substring(3)}`;
    }
    // For other asset classes, return as-is
    return symbol;
  };

  // Fetch symbols from API for commodities and indices
  useEffect(() => {
    // For forex and crypto, use hardcoded symbols (already set in initial state)
    if (assetClass === 'forex' || assetClass === 'crypto') {
      return;
    }

    const module = ASSET_CLASS_TO_MODULE[assetClass];
    if (!module) return;

    // If we already have symbols for this asset class, don't fetch again
    if (dynamicSymbols[assetClass] && dynamicSymbols[assetClass].length > 0) {
      return;
    }

    const fetchSymbols = async () => {
      setSymbolsLoading(true);
      try {
        const response = await fetch('/api/pmt/get-symbols', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ Module: module }),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch symbols: ${response.statusText}`);
        }

        const result = await response.json();
        if (result.status !== 'success' || !Array.isArray(result.data)) {
          throw new Error('Invalid response from symbols API');
        }

        const fetchedSymbols = result.data.map((item: { Symbol: string }) => item.Symbol) || [];
        // Format symbols for display and deduplicate
        const formattedSymbols = fetchedSymbols
          .map((s: string) => formatSymbolForDisplay(s, assetClass))
          .filter((symbol: string) => symbol && symbol.length > 0) // Remove empty strings
          .filter((symbol: string, index: number, self: string[]) => self.indexOf(symbol) === index); // Remove duplicates

        setDynamicSymbols(prev => ({
          ...prev,
          [assetClass]: formattedSymbols,
        }));
      } catch (err) {
        console.error('Error fetching symbols for DMX Overview:', err);
        // On error, fall back to hardcoded symbols if available
        if (ASSET_CLASSES[assetClass]?.symbols) {
          setDynamicSymbols(prev => ({
            ...prev,
            [assetClass]: ASSET_CLASSES[assetClass].symbols,
          }));
        }
      } finally {
        setSymbolsLoading(false);
      }
    };

    fetchSymbols();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetClass]);

  // Update local state when settings change
  useEffect(() => {
    if (settings?.assetClass) {
      const validAssetClass = getValidAssetClass(settings.assetClass);
      setAssetClass(validAssetClass);
    }
    if (settings?.timeFrame) setTimeFrame(settings.timeFrame as TimeFrame);
    if (settings?.sortBy) setSortBy(settings.sortBy as SortOption);
  }, [settings]);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);

      // Get symbols for the selected asset class (use dynamic symbols if available, otherwise fall back to hardcoded)
      const symbols = dynamicSymbols[assetClass] && dynamicSymbols[assetClass].length > 0
        ? dynamicSymbols[assetClass]
        : (ASSET_CLASSES[assetClass]?.symbols || []);

      if (!symbols || symbols.length === 0) {
        // If still loading symbols, wait a bit
        if (symbolsLoading) {
          setLoading(false);
          return;
        }
        setError(`No symbols available for ${assetClass}`);
        setPairData([]);
        setLoading(false);
        return;
      }

      const response = await fetchDMXOverview(
        symbols,
        timeFrame,
        'Percentage',
        controller.signal
      );

      if (!mounted) return;

      if (!response.success || !response.data) {
        setError(response.error ?? "Unable to load data");
        setPairData([]);
        setLoading(false);
        return;
      }

      setPairData(response.data);
      setLoading(false);
    }

    load().catch((err) => {
      if (!mounted) return;
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false);
    });

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [assetClass, timeFrame, dynamicSymbols, symbolsLoading]);

  // Sort data based on selected option
  const sortedData = useMemo(() => {
    return [...pairData].sort((a, b) => {
    switch (sortBy) {
      case "pair-az":
        return a.pair.localeCompare(b.pair);
      case "pair-za":
        return b.pair.localeCompare(a.pair);
      case "long-lh":
        return a.long - b.long;
      case "long-hl":
        return b.long - a.long;
      case "short-lh":
        return a.short - b.short;
      case "short-hl":
        return b.short - a.short;
      default:
        return 0; // Default order
    }
  });
  }, [pairData, sortBy]);

  const currentTimeframeLabel = TIME_FRAMES.find((tf) => tf.value === timeFrame)?.label || "Every Hour";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <WidgetHeader
        title={
          <span>
            DMX Overview <span className="text-primary">[{currentTimeframeLabel}]</span>
          </span>
        }
        widgetName="DMX Overview"
        onSettings={onSettings}
        onRemove={onRemove}
        onFullscreen={onFullscreen}
        helpContent="Displays an overview of retail trader positioning across multiple currency pairs. Shows the percentage split between long and short positions."
      >
        {/* Sort By Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 mr-2 text-sm text-muted-foreground hover:text-foreground gap-1"
            >
              Sort by
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[180px] bg-widget-header border-border">
            {SORT_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => {
                  setSortBy(option.value as SortOption);
                  if (onSaveSettings) {
                    onSaveSettings({ sortBy: option.value });
                  }
                }}
                className={`text-sm cursor-pointer ${
                  sortBy === option.value
                    ? "bg-primary/20 text-primary"
                    : "text-foreground"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span>{option.label}</span>
                  {sortBy === option.value && (
                    <Check className="w-3 h-3 ml-2 text-primary" />
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </WidgetHeader>

      {/* Legend */}
      <div className="shrink-0 border-b border-border bg-widget-header px-3 py-2 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.long }}></div>
          <span className="text-sm text-foreground">Long</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.short }}></div>
          <span className="text-sm text-foreground">Short</span>
        </div>
      </div>

      {/* Bar Chart */}
      <ScrollArea className="flex-1">
        {loading && (
          <div className="flex flex-1 items-center justify-center text-base text-muted-foreground p-4">
            Loading DMX overview data...
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center p-4">
            <div className="text-5xl">⚠️</div>
            <p className="text-base font-semibold text-foreground">Unable to load DMX overview</p>
            <p className="text-sm text-muted-foreground max-w-md">{error}</p>
          </div>
        )}

        {!loading && !error && sortedData.length === 0 && (() => {
          // Use dynamic symbols if available, otherwise fall back to hardcoded
          const symbols = dynamicSymbols[assetClass] && dynamicSymbols[assetClass].length > 0
            ? dynamicSymbols[assetClass]
            : (ASSET_CLASSES[assetClass]?.symbols || []);
          
          return (
            <div className="p-4 space-y-2">
              {symbols.map((symbol, index) => (
                <div key={index} className="flex items-center gap-3">
                  {/* Pair label */}
                  <div className="w-20 text-sm text-foreground flex-shrink-0 font-medium">
                    {symbol}
                  </div>

                  {/* No data bar */}
                  <div className="flex-1 flex h-6 rounded overflow-hidden">
                    <div
                      className="relative flex items-center justify-center transition-all"
                      style={{
                        backgroundColor: "#404040",
                        width: "100%",
                      }}
                    >
                      <span className="text-sm text-muted-foreground font-medium">
                        No data is available
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {!loading && !error && sortedData.length > 0 && (
          <div className="p-4 space-y-2">
            {sortedData.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                {/* Pair label */}
                <div className="w-20 text-sm text-foreground flex-shrink-0 font-medium">
                  {item.pair}
                </div>

                {/* Stacked bar */}
                <div className="flex-1 flex h-6 rounded overflow-hidden">
                  {/* Long bar */}
                  <div
                    className="relative flex items-center justify-center transition-all"
                    style={{
                      backgroundColor: COLORS.long,
                      width: `${item.long}%`,
                    }}
                  >
                    {item.long > 10 && (
                      <span className="text-sm text-white font-semibold">
                        {item.long}%
                      </span>
                    )}
                  </div>

                  {/* Short bar */}
                  <div
                    className="relative flex items-center justify-center transition-all"
                    style={{
                      backgroundColor: COLORS.short,
                      width: `${item.short}%`,
                    }}
                  >
                    {item.short > 10 && (
                      <span className="text-sm text-white font-semibold">
                        {item.short}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* X-axis labels */}
      <div className="shrink-0 border-t border-border bg-widget-header px-3 py-1">
        <div className="flex justify-between text-sm text-muted-foreground ml-[92px]">
          <span>0%</span>
          <span>20%</span>
          <span>40%</span>
          <span>60%</span>
          <span>80%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
}

