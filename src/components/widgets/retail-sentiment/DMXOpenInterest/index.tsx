"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { 
  fetchOpenInterestData, 
  mapTimeframeToInterval, 
  mapFilterModeToDataType,
  getSeriesNames,
  OpenInterestDataPoint 
} from "./api";
import { getSymbolShortFormat } from "@/utils/symbolMapping";

interface DMXOpenInterestProps {
  onSettings?: () => void;
  onRemove?: () => void;
  onFullscreen?: () => void;
  settings?: {
    assetClass?: string;
    baseCurrency?: string;
    quoteCurrency?: string;
    timeFrame?: string;
    filterMode?: string;
  };
}

type AssetClass = "forex" | "crypto" | "commodities" | "indices";
type TimeFrame = "monthly" | "daily" | "4h" | "1h";
type FilterMode = "all" | "top5-short" | "top5-long" | "top10-short" | "top10-long" | string;

// Asset classes with their pairs
const ASSET_CLASSES: Record<AssetClass, { label: string; pairs: string[] }> = {
  forex: {
    label: "Forex",
    pairs: [
      "AUDCAD", "AUDCHF", "AUDJPY", "AUDNZD", "AUDUSD", "CADCHF", "CADJPY",
      "CHFJPY", "EURAUD", "EURCAD", "EURCHF", "EURGBP", "EURJPY", "EURNZD",
      "EURUSD", "GBPAUD", "GBPCAD", "GBPCHF", "GBPJPY", "GBPNZD", "GBPUSD",
      "NZDCAD", "NZDCHF", "NZDJPY", "NZDUSD", "USDCAD", "USDCHF", "USDJPY",
    ],
  },
  crypto: {
    label: "Crypto",
    pairs: [
      "BTCUSD", "ETHUSD", "BNBUSD", "SOLUSD", "XRPUSD", "ADAUSD", "DOTUSD", "AVAXUSD",
    ],
  },
  commodities: {
    label: "Commodities",
    pairs: [
      "XAUUSD", "XAGUSD", "WTIUSD", "NATUSD", "COPUSD", "PLATUSD", "WHTUSD", "CORNUSD",
    ],
  },
  indices: {
    label: "Indices",
    pairs: [
      "SPX500", "NAS100", "DJI30", "DAX40", "UK100", "JPN225", "HK50", "CAC40",
    ],
  },
};

// Color palette for pairs (using diverse colors)
const PAIR_COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f97316", "#8b5cf6", "#06b6d4", 
  "#f59e0b", "#ec4899", "#10b981", "#6366f1", "#14b8a6", "#f43f5e",
  "#84cc16", "#a855f7", "#0ea5e9", "#f97316", "#d946ef", "#06b6d4",
  "#eab308", "#ec4899", "#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6",
  "#ef4444", "#10b981", "#6366f1", "#f43f5e", "#14b8a6", "#84cc16",
];

const TIME_FRAMES = [
  { value: "monthly", label: "Monthly" },
  { value: "daily", label: "Daily" },
  { value: "4h", label: "4 Hours" },
  { value: "1h", label: "Hour" },
];

export default function DMXOpenInterest({ onSettings, onRemove, onFullscreen, settings }: DMXOpenInterestProps) {
  // Read values from settings prop (managed by WidgetSettingsSlideIn)
  const assetClass = (settings?.assetClass as AssetClass) || "forex";
  const baseCurrency = settings?.baseCurrency || "XXX";
  const quoteCurrency = settings?.quoteCurrency || "USD";
  const timeFrame = (settings?.timeFrame as TimeFrame) || "daily";
  
  // Read filterMode from settings, not local state
  const filterMode = (settings?.filterMode as FilterMode) || "all";
  const [visiblePairs, setVisiblePairs] = useState<Set<string>>(new Set());
  const [data, setData] = useState<OpenInterestDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLoadingRef = useRef(false);
  const allPairs = ASSET_CLASSES[assetClass].pairs;
  const [availablePairs, setAvailablePairs] = useState<string[]>([]);

  // Fetch data from API
  const fetchData = useCallback(async (
    mode: FilterMode, 
    tf: TimeFrame,
    base: string,
    quote: string
  ) => {
    if (isLoadingRef.current) return;
    
    isLoadingRef.current = true;
    setLoading(true);
    setError(null);
    
    const interval = mapTimeframeToInterval(tf);
    const dataType = mapFilterModeToDataType(mode, base, quote);
    
        console.log('📊 [DMX Open Interest] Fetching data...', { 
          mode, 
          dataType, 
          interval, 
          base, 
          quote 
        });
        
        try {
          const result = await fetchOpenInterestData({
            dataType,
            interval,
          });
          
          if (result.length > 0) {
            setData(result);
            
            // Extract available pairs from the data
            const pairs = getSeriesNames(result);
            setAvailablePairs(pairs);

            // Determine which pairs to show based on filter mode and currency selection
            let newVisiblePairs: Set<string>;
            
            // Check if a specific currency pair is selected (both base and quote are not XXX)
            const isSpecificPair = base !== 'XXX' && quote !== 'XXX';
            
            if (isSpecificPair) {
              // Specific pair selected (e.g., AUD/USD) - show only that pair
              // Try multiple formats that might come from API
              const pairName = `${base}${quote}`;
              const pairNameWithSlash = `${base}/${quote}`;
              const pairNameLower = pairName.toLowerCase();
              
              // Find matching pair in API response (case-insensitive, with/without slash)
              const matchingPair = pairs.find(p => 
                p.toUpperCase() === pairName || 
                p.toUpperCase() === pairNameWithSlash ||
                p.replace('/', '').toUpperCase() === pairName ||
                p.toUpperCase().replace('/', '') === pairName
              );
              
              if (matchingPair) {
                newVisiblePairs = new Set([matchingPair]);
                console.log('📊 [DMX Open Interest] Found matching pair:', matchingPair, 'for', `${base}/${quote}`);
              } else {
                // Pair not found in API response, show first 5 as fallback
                console.warn('📊 [DMX Open Interest] Pair not found in API response:', `${base}/${quote}`, 'Available pairs:', pairs);
                newVisiblePairs = new Set(pairs.slice(0, 5));
              }
            } else if (mode.startsWith('XXX') || mode.endsWith('XXX')) {
              // Currency filter (e.g., USDXXX or XXXUSD) - show all pairs from API (up to first 10)
              newVisiblePairs = new Set(pairs.slice(0, 10));
            } else if (mode === 'all' || mode.startsWith('top')) {
              // All or top N filters - show all pairs from API (up to first 10)
              newVisiblePairs = new Set(pairs.slice(0, 10));
            } else if (pairs.includes(mode)) {
              // Single pair filter - show only that pair
              newVisiblePairs = new Set([mode]);
            } else {
              // Default - show first 5
              newVisiblePairs = new Set(pairs.slice(0, 5));
            }
            
            setVisiblePairs(newVisiblePairs);
            
            console.log('📊 [DMX Open Interest] Data loaded:', {
              dataPoints: result.length,
              pairs: pairs,
              visiblePairs: Array.from(newVisiblePairs),
              filterMode: mode,
              dataType,
              firstDataPoint: result[0],
            });
      } else {
        console.warn('📊 [DMX Open Interest] No data returned from API');
        setError('No data available');
        setAvailablePairs([]);
      }
    } catch (err) {
      console.error('📊 [DMX Open Interest] Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, []); // No dependencies - function doesn't need to recreate

  // Fetch data when timeframe, filter mode, or currency changes
  useEffect(() => {
    // Clear visible pairs when currency selection changes to force update
    setVisiblePairs(new Set());
    fetchData(filterMode, timeFrame, baseCurrency, quoteCurrency);
  }, [timeFrame, filterMode, baseCurrency, quoteCurrency, fetchData]);

  // Update visible pairs when availablePairs changes
  useEffect(() => {
    if (availablePairs.length > 0 && visiblePairs.size === 0) {
      console.log('📊 [DMX Open Interest] Setting visible pairs from availablePairs:', availablePairs.slice(0, 5));
      setVisiblePairs(new Set(availablePairs.slice(0, 5)));
    }
  }, [availablePairs, visiblePairs.size]);

  // Get filtered pairs from API data
  // The API already filters based on dataType, so we use availablePairs from the response
  const filteredPairs = availablePairs.length > 0 ? availablePairs : allPairs;
  
  // Debug logging
  console.log('📊 [DMX Open Interest] Render state:', {
    dataLength: data.length,
    filteredPairs,
    visiblePairs: Array.from(visiblePairs),
    loading,
    error,
    pairsToRender: filteredPairs.filter((pair) => visiblePairs.has(pair)),
  });

  const togglePair = (pair: string) => {
    const newVisible = new Set(visiblePairs);
    if (newVisible.has(pair)) {
      newVisible.delete(pair);
    } else {
      newVisible.add(pair);
    }
    setVisiblePairs(newVisible);
  };

  // When asset class changes from settings, reset visible pairs
  const prevAssetClassRef = useRef(assetClass);
  useEffect(() => {
    if (prevAssetClassRef.current !== assetClass) {
      setVisiblePairs(new Set(ASSET_CLASSES[assetClass].pairs.slice(0, 5)));
      prevAssetClassRef.current = assetClass;
    }
  }, [assetClass]);

  const getPairColor = (pair: string): string => {
    // Try to find in available pairs first, then fall back to allPairs
    let index = availablePairs.indexOf(pair);
    if (index === -1) {
      index = allPairs.indexOf(pair);
    }
    if (index === -1) {
      // Hash the pair name to get a consistent color
      index = pair.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    }
    return PAIR_COLORS[index % PAIR_COLORS.length];
  };

  const getFilterLabel = (): string => {
    switch (filterMode) {
      case "all": return "All";
      case "top5-short": return "TOP 5 Short";
      case "top5-long": return "TOP 5 Long";
      case "top10-short": return "TOP 10 Short";
      case "top10-long": return "TOP 10 Long";
      default: return filterMode;
    }
  };

  // Format date from "DD.MM.YY" to "Mon DD" format
  const formatDateLabel = (dateStr: string): string => {
    if (!dateStr) return '';
    
    // Parse "DD.MM.YY" format (e.g., "13.11.25")
    const parts = dateStr.split('.');
    if (parts.length !== 3) return dateStr;
    
    const [day, month, year] = parts;
    const fullYear = parseInt(year) < 50 ? `20${year}` : `19${year}`;
    
    try {
      const date = new Date(parseInt(fullYear), parseInt(month) - 1, parseInt(day));
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Custom axis tick components for readable font sizes
  const CustomXAxisTick = ({ x, y, payload }: any) => (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor="middle"
        className="fill-muted-foreground text-xs"
      >
        {formatDateLabel(payload.value)}
      </text>
    </g>
  );

  const CustomYAxisTick = ({ x, y, payload }: any) => (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dx={-8}
        textAnchor="end"
        className="fill-muted-foreground text-xs"
      >
        {typeof payload.value === 'number' ? payload.value.toLocaleString() : payload.value}
      </text>
    </g>
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-widget-header border border-border px-3 py-2 rounded shadow-lg">
          <p className="text-sm text-muted-foreground mb-1">{label}</p>
          {payload.map((entry: any) => (
            <div key={entry.dataKey} className="flex items-center justify-between gap-3 text-sm">
              <span style={{ color: entry.color }}>{entry.dataKey}:</span>
              <span className="text-foreground">{entry.value.toFixed(0)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const displayTitle = getSymbolShortFormat(`${baseCurrency}${quoteCurrency}`);
  const displayTimeFrame = TIME_FRAMES.find(tf => tf.value === timeFrame)?.label || "Daily";

  return (
    <div className="flex flex-col h-full bg-widget-body border border-border rounded-none overflow-hidden relative">
      <div className="flex flex-col flex-1 h-full w-full">
        <WidgetHeader
          title={
            <span className="text-lg">
              DMX Open Interest <span className="text-primary">[{displayTitle} | {displayTimeFrame}]</span>
            </span>
          }
          widgetName="DMX Open Interest"
          onSettings={onSettings}
          onRemove={onRemove}
          onFullscreen={onFullscreen}
          helpContent="Displays the open interest for various currency pairs over time. Open interest represents the total number of outstanding positions and can indicate market sentiment and liquidity."
        />

        {/* Pair toggles */}
        <div className="border-b border-border bg-widget-header px-3 py-3">
          <ScrollArea className="w-full">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {filteredPairs.map((pair) => (
                <button
                  key={pair}
                  onClick={() => togglePair(pair)}
                  className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <div
                    className="w-5 h-1 rounded transition-opacity"
                    style={{
                      backgroundColor: getPairColor(pair),
                      opacity: visiblePairs.has(pair) ? 1 : 0.3,
                    }}
                  ></div>
                  <span
                    className="text-sm transition-opacity whitespace-nowrap"
                    style={{ opacity: visiblePairs.has(pair) ? 1 : 0.5 }}
                  >
                    {pair}
                  </span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Chart */}
        <div className="flex-1 p-3 min-h-[300px] h-full">
          {loading && (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Loading data...</span>
            </div>
          )}
          
          {error && !loading && (
            <div className="h-full flex items-center justify-center">
              <span className="text-sm text-destructive">{error}</span>
            </div>
          )}
          
          {!loading && !error && data.length > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 30, left: 60, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  stroke="var(--muted-foreground)"
                  tick={<CustomXAxisTick />}
                  tickLine={{ stroke: "var(--border)" }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  tick={<CustomYAxisTick />}
                  tickLine={{ stroke: "var(--border)" }}
                  domain={["auto", "auto"]}
                  width={55}
                />
                <Tooltip content={CustomTooltip} />

                {filteredPairs
                  .filter((pair) => visiblePairs.has(pair))
                  .map((pair) => (
                    <Line
                      key={pair}
                      type="monotone"
                      dataKey={pair}
                      stroke={getPairColor(pair)}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          )}
          
          {!loading && !error && data.length === 0 && (
            <div className="h-full flex items-center justify-center">
              <span className="text-sm text-muted-foreground">No data available</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

