"use client";

import { useState, useEffect, useMemo } from "react";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import { getSymbolShortFormat } from "@/utils/symbolMapping";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  fetchDMXChart,
  type DMXChartPoint,
  type DMXChartDataType,
} from "./api";

interface DMXChartProps {
  onSettings?: () => void;
  onRemove?: () => void;
  onFullscreen?: () => void;
  settings?: {
    assetClass?: string;
    symbol?: string;
    chartType?: string;
    dataType?: string;
    timeFrame?: string;
  };
}

type ChartType = "bar" | "line" | "stacked";
type DataType = DMXChartDataType;
type TimeFrame = "monthly" | "daily" | "4h" | "1h";
type AssetClass = "forex" | "commodities" | "indices";

const parseTimestamp = (value: string): number => {
  if (!value) return Date.now();
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? Date.now() : parsed;
};

// Asset classes with their symbols
const ASSET_CLASSES: Record<AssetClass, { label: string; symbols: string[] }> = {
  forex: {
    label: "Forex",
    symbols: ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD", "NZD/USD", "AUD/JPY"],
  },
  commodities: {
    label: "Commodities",
    symbols: ["XAUUSD", "XAGUSD", "USOIL", "UKOIL", "XPTUSD", "XPDUSD"],
  },
  indices: {
    label: "Indices",
    symbols: ["SPX500", "NAS100", "DJI", "DAX40", "FTSE100", "NIKKEI225", "HK50"],
  },
};

const CHART_TYPES = [
  { value: "bar", label: "Bar" },
  { value: "line", label: "Line" },
  { value: "stacked", label: "Stacked Bars" },
];
const DATA_TYPES = [
  { value: "positions", label: "Positions" },
  { value: "percentage", label: "Percentage" },
  { value: "open-interest", label: "Open Interest" },
  { value: "open-positions", label: "Open Positions" },
  { value: "position-ratio", label: "Position Ratio" },
];
const TIME_FRAMES = [
  { value: "monthly", label: "Monthly" },
  { value: "daily", label: "Daily" },
  { value: "4h", label: "Every 4 Hours" },
  { value: "1h", label: "Every Hour" },
];

// Colors similar to Currency Strength widget
const COLORS = {
  long: "#22c55e",  // Green
  short: "#ef4444", // Red
};

export default function DMXChart({ onSettings, onRemove, onFullscreen, settings }: DMXChartProps) {
  const [chartData, setChartData] = useState<DMXChartPoint[]>([]);
  const [chartUnit, setChartUnit] = useState<string>("");
  const [supportsDualSeries, setSupportsDualSeries] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasData = chartData.length > 0;

  const getValidAssetClass = (value?: string): AssetClass => {
    if (value && value in ASSET_CLASSES) {
      return value as AssetClass;
    }
    return "forex";
  };

  const getValidChartType = (value?: string): ChartType => {
    return CHART_TYPES.some((item) => item.value === value) ? (value as ChartType) : "stacked";
  };

  const getValidDataType = (value?: string): DataType => {
    return DATA_TYPES.some((item) => item.value === value) ? (value as DataType) : "percentage";
  };

  const getValidTimeFrame = (value?: string): TimeFrame => {
    return TIME_FRAMES.some((item) => item.value === value) ? (value as TimeFrame) : "daily";
  };

  const assetClass = getValidAssetClass(settings?.assetClass as string | undefined);
  const availableSymbols = ASSET_CLASSES[assetClass]?.symbols || ASSET_CLASSES.forex.symbols;
  const selectedSymbol = settings?.symbol && availableSymbols.includes(settings.symbol)
    ? settings.symbol
    : availableSymbols[0] || "EUR/USD";
  const chartType = getValidChartType(settings?.chartType as string | undefined);
  const dataType = getValidDataType(settings?.dataType as string | undefined);
  const timeFrame = getValidTimeFrame(settings?.timeFrame as string | undefined);

  useEffect(() => {
    if (!selectedSymbol) return;

    let mounted = true;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);

      const response = await fetchDMXChart({
        symbol: selectedSymbol,
        dataType,
        timeFrame,
        signal: controller.signal,
      });

      if (!mounted) {
        return;
      }

      if (!response.success || !response.data) {
        console.warn("[DMX Chart] No data", response.error);
        setError(response.error ?? "Unable to load data");
        setChartData([]);
        setChartUnit("");
        setSupportsDualSeries(true);
        setLoading(false);
        return;
      }

      console.log("[DMX Chart] Resolved data points", response.data.length, {
        dataType,
        timeFrame,
        symbol: selectedSymbol,
      });

      setChartData(response.data);
      setChartUnit(response.unit ?? "");
      setSupportsDualSeries(response.supportsDualSeries);
      setLoading(false);
    }

    load().catch((err) => {
      if (!mounted) return;
      console.error("[DMX Chart] Fetch error", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false);
    });

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [selectedSymbol, dataType, timeFrame]);

  const preparedChartData = useMemo(() => {
    const mapped = chartData.map((point) => ({
      date: point.date,
      long: point.long ?? 0,
      short: point.short ?? 0,
      timestamp: parseTimestamp(point.date),
    }));
    // Sort by timestamp to ensure chronological order and prevent gaps
    return mapped.sort((a, b) => a.timestamp - b.timestamp);
  }, [chartData]);

  const chartDomain = useMemo(() => {
    if (!hasData) return [0, 0];
    const values = preparedChartData.flatMap((point) => {
      const data: number[] = [];
      if (typeof point.long === "number") data.push(Math.abs(point.long));
      if (supportsDualSeries && typeof point.short === "number")
        data.push(Math.abs(point.short));
      return data;
    });
    const maxValue = Math.max(...values, 0);
    if (!Number.isFinite(maxValue) || maxValue === 0) {
      return [0, 1];
    }
    return [0, maxValue * 1.15];
  }, [hasData, preparedChartData, supportsDualSeries]);

  // Calculate 50% reference line value based on chart domain for all data types and chart types
  const referenceLineValue = useMemo(() => {
    if (dataType === "percentage") {
      // For percentage data type, use 50 directly
      return 50;
    }
    
    // For line charts, always use 50% of the chart domain (lines are not stacked)
    if (chartType === "line") {
      const [min, max] = chartDomain;
      if (max === 0 || !Number.isFinite(max)) return 0;
      return (max - min) * 0.5 + min;
    }
    
    // For bar and stacked bar charts, calculate based on whether data is stacked
    if (!hasData) return 0;
    
    // For stacked bar charts, use the sum of long + short
    if (chartType === "stacked" && supportsDualSeries) {
      const values: number[] = [];
      preparedChartData.forEach((point) => {
        if (typeof point.long === "number" && typeof point.short === "number") {
          // For stacked data, use the sum of long + short
          values.push(Math.abs(point.long) + Math.abs(point.short));
        }
      });
      
      const maxValue = Math.max(...values, 0);
      if (!Number.isFinite(maxValue) || maxValue === 0) {
        // Fallback to chart domain
        const [min, max] = chartDomain;
        if (max === 0 || !Number.isFinite(max)) return 0;
        return (max - min) * 0.5 + min;
      }
      
      // Calculate 50% of the maximum stacked value with 1.15 padding
      return (maxValue * 1.15) * 0.5;
    }
    
    // For regular bar charts (non-stacked) or single series, use chart domain
    const [min, max] = chartDomain;
    if (max === 0 || !Number.isFinite(max)) return 0;
    return (max - min) * 0.5 + min;
  }, [chartDomain, dataType, hasData, preparedChartData, supportsDualSeries, chartType]);

  const formatValue = (value: number): string => {
    if (dataType === "percentage") {
      return `${Math.abs(value).toFixed(0)}%`;
    } else if (dataType === "position-ratio") {
      return Math.abs(value).toFixed(2);
    } else if (Math.abs(value) >= 10000) {
      return `${(Math.abs(value) / 1000).toFixed(0)}K`;
    }
    const base = Math.abs(value).toFixed(0);
    return chartUnit ? `${base} ${chartUnit}` : base;
  };

  const CustomTooltip = ({ active, payload, label, formatLabel }: { active?: boolean; payload?: any[]; label?: number | string; formatLabel?: (value: number | string) => string }) => {
    if (active && payload && payload.length) {
      const labelText =
        typeof formatLabel === "function" ? formatLabel(label as number | string) : label;

      return (
        <div className="bg-widget-header border border-border rounded px-3 py-2 shadow-lg">
          <p className="text-xs text-muted-foreground mb-1">{labelText}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs">
                {entry.name}: {formatValue(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Calculate XAxis domain with padding to prevent gaps between bars
  const xAxisDomain = useMemo(() => {
    if (preparedChartData.length === 0) return ["dataMin", "dataMax"] as [string, string];
    const timestamps = preparedChartData.map(d => d.timestamp).sort((a, b) => a - b);
    if (timestamps.length < 2) return ["dataMin", "dataMax"] as [string, string];
    
    // Calculate average interval between timestamps
    const intervals: number[] = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }
    const avgInterval = intervals.length > 0 
      ? intervals.reduce((a, b) => a + b, 0) / intervals.length 
      : 0;
    
    // Add padding equal to half the average interval on each side to prevent edge gaps
    const padding = avgInterval / 2;
    return [timestamps[0] - padding, timestamps[timestamps.length - 1] + padding] as [number, number];
  }, [preparedChartData]);

  const renderChart = () => {
    const containerHeight = 600;
    const chartProps = {
      margin: { top: 10, right: 30, left: 0, bottom: 0 },
      className: "recharts-chart",
    } as const;

    const formatLabel = (value: number | string) => {
      if (typeof value === "number") {
        const date = new Date(value);
        const options: Intl.DateTimeFormatOptions = {
          month: "short",
          day: "numeric",
        };
        if (timeFrame === "1h" || timeFrame === "4h") {
          options.hour = "2-digit";
          options.minute = "2-digit";
        }
        return date.toLocaleDateString(undefined, options);
      }
      return value;
    };

    const tooltipContent = (props: any) => (
      <CustomTooltip {...props} formatLabel={formatLabel} />
    );

    if (chartType === "line") {
      return (
        <ResponsiveContainer width="100%" height={containerHeight}>
          <LineChart data={preparedChartData} {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#6b7280" opacity={0.45} />
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={xAxisDomain}
              scale="time"
              stroke="var(--muted-foreground)"
              style={{ fontSize: "10px" }}
              tick={{ fill: "var(--muted-foreground)" }}
              tickFormatter={formatLabel}
            />
            <YAxis
              stroke="var(--muted-foreground)"
              style={{ fontSize: "10px" }}
              tick={{ fill: "var(--muted-foreground)" }}
              tickFormatter={formatValue}
              domain={chartDomain as [number, number]}
              width={70}
              tickMargin={20}
              ticks={(() => {
                const [min, max] = chartDomain;
                if (dataType === "percentage") {
                  const ticks = [0, 25, 50, 75];
                  // Add 100 if it's within or close to the domain, otherwise add the max
                  if (max >= 100) {
                    ticks.push(100);
                  } else if (max > 75) {
                    ticks.push(Math.ceil(max));
                  }
                  return ticks;
                } else if (dataType === "open-interest" || dataType === "open-positions") {
                  // Generate ticks at nice intervals for open interest/open positions (Lots)
                  const ticks: number[] = [0];
                  // Determine interval based on max value
                  let interval: number;
                  if (max <= 10000) {
                    interval = 2500; // 0, 2.5K, 5K, 7.5K, 10K
                  } else if (max <= 50000) {
                    interval = 5000; // 0, 5K, 10K, 15K, 20K, etc.
                  } else if (max <= 100000) {
                    interval = 10000; // 0, 10K, 20K, 30K, etc.
                  } else {
                    interval = 25000; // 0, 25K, 50K, 75K, etc.
                  }
                  // Generate ticks up to max
                  for (let tick = interval; tick <= max; tick += interval) {
                    ticks.push(tick);
                  }
                  // Always include max if it's not already in the list
                  if (ticks[ticks.length - 1] < max) {
                    ticks.push(Math.ceil(max));
                  }
                  return ticks;
                }
                return undefined;
              })()}
            />
            <Tooltip
              content={tooltipContent}
              cursor={{ fill: "rgba(255,255,255,0.05)" }}
            />
            <Line
              type="monotone"
              dataKey="long"
              stroke={COLORS.long}
              strokeWidth={2}
              dot={false}
              name="Long"
            />
            {supportsDualSeries && (
            <Line
              type="monotone"
              dataKey="short"
              stroke={COLORS.short}
              strokeWidth={2}
              dot={false}
              name="Short"
            />
            )}
            <ReferenceLine 
              y={referenceLineValue} 
              stroke="#FFD700" 
              strokeWidth={1.5}
              strokeDasharray="0"
            />
          </LineChart>
        </ResponsiveContainer>
      );
    } else if (chartType === "bar") {
      return (
        <ResponsiveContainer width="100%" height={containerHeight}>
          <BarChart data={preparedChartData} {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={xAxisDomain}
              scale="time"
              stroke="var(--muted-foreground)"
              style={{ fontSize: "10px" }}
              tick={{ fill: "var(--muted-foreground)" }}
              tickFormatter={formatLabel}
            />
            <YAxis
              stroke="var(--muted-foreground)"
              style={{ fontSize: "10px" }}
              tick={{ fill: "var(--muted-foreground)" }}
              tickFormatter={formatValue}
              domain={chartDomain as [number, number]}
              width={70}
              tickMargin={20}
              ticks={(() => {
                const [min, max] = chartDomain;
                if (dataType === "percentage") {
                  const ticks = [0, 25, 50, 75];
                  // Add 100 if it's within or close to the domain, otherwise add the max
                  if (max >= 100) {
                    ticks.push(100);
                  } else if (max > 75) {
                    ticks.push(Math.ceil(max));
                  }
                  return ticks;
                } else if (dataType === "open-interest" || dataType === "open-positions") {
                  // Generate ticks at nice intervals for open interest/open positions (Lots)
                  const ticks: number[] = [0];
                  // Determine interval based on max value
                  let interval: number;
                  if (max <= 10000) {
                    interval = 2500; // 0, 2.5K, 5K, 7.5K, 10K
                  } else if (max <= 50000) {
                    interval = 5000; // 0, 5K, 10K, 15K, 20K, etc.
                  } else if (max <= 100000) {
                    interval = 10000; // 0, 10K, 20K, 30K, etc.
                  } else {
                    interval = 25000; // 0, 25K, 50K, 75K, etc.
                  }
                  // Generate ticks up to max
                  for (let tick = interval; tick <= max; tick += interval) {
                    ticks.push(tick);
                  }
                  // Always include max if it's not already in the list
                  if (ticks[ticks.length - 1] < max) {
                    ticks.push(Math.ceil(max));
                  }
                  return ticks;
                }
                return undefined;
              })()}
            />
            <Tooltip
              content={tooltipContent}
              cursor={{ fill: "rgba(255,255,255,0.05)" }}
            />
            <Bar dataKey="long" fill={COLORS.long} name="Long" />
            {supportsDualSeries && (
            <Bar dataKey="short" fill={COLORS.short} name="Short" />
            )}
            <ReferenceLine 
              y={referenceLineValue} 
              stroke="#FFD700" 
              strokeWidth={1.5}
              strokeDasharray="0"
            />
          </BarChart>
        </ResponsiveContainer>
      );
    } else {
      // Stacked bars
      return (
        <ResponsiveContainer width="100%" height={containerHeight}>
          <BarChart data={preparedChartData} {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={xAxisDomain}
              scale="time"
              stroke="var(--muted-foreground)"
              style={{ fontSize: "10px" }}
              tick={{ fill: "var(--muted-foreground)" }}
              tickFormatter={formatLabel}
            />
            <YAxis
              stroke="var(--muted-foreground)"
              style={{ fontSize: "10px" }}
              tick={{ fill: "var(--muted-foreground)" }}
              tickFormatter={formatValue}
              domain={chartDomain as [number, number]}
              width={70}
              tickMargin={20}
              ticks={(() => {
                const [min, max] = chartDomain;
                if (dataType === "percentage") {
                  const ticks = [0, 25, 50, 75];
                  // Add 100 if it's within or close to the domain, otherwise add the max
                  if (max >= 100) {
                    ticks.push(100);
                  } else if (max > 75) {
                    ticks.push(Math.ceil(max));
                  }
                  return ticks;
                } else if (dataType === "open-interest" || dataType === "open-positions") {
                  // Generate ticks at nice intervals for open interest/open positions (Lots)
                  const ticks: number[] = [0];
                  // Determine interval based on max value
                  let interval: number;
                  if (max <= 10000) {
                    interval = 2500; // 0, 2.5K, 5K, 7.5K, 10K
                  } else if (max <= 50000) {
                    interval = 5000; // 0, 5K, 10K, 15K, 20K, etc.
                  } else if (max <= 100000) {
                    interval = 10000; // 0, 10K, 20K, 30K, etc.
                  } else {
                    interval = 25000; // 0, 25K, 50K, 75K, etc.
                  }
                  // Generate ticks up to max
                  for (let tick = interval; tick <= max; tick += interval) {
                    ticks.push(tick);
                  }
                  // Always include max if it's not already in the list
                  if (ticks[ticks.length - 1] < max) {
                    ticks.push(Math.ceil(max));
                  }
                  return ticks;
                }
                return undefined;
              })()}
            />
            <Tooltip
              content={tooltipContent}
              cursor={{ fill: "rgba(255,255,255,0.05)" }}
            />
            <Bar dataKey="long" stackId="a" fill={COLORS.long} name="Long" />
            {supportsDualSeries && (
            <Bar dataKey="short" stackId="a" fill={COLORS.short} name="Short" />
            )}
            <ReferenceLine 
              y={referenceLineValue} 
              stroke="#FFD700" 
              strokeWidth={1.5}
              strokeDasharray="0"
            />
          </BarChart>
        </ResponsiveContainer>
      );
    }
  };

  return (
    <div className="flex flex-col h-full bg-widget-body border border-border rounded-none overflow-hidden relative">
      <div className="h-full w-full">
        <WidgetHeader
          title={
            <span>
              DMX Chart <span className="text-primary">[{getSymbolShortFormat(selectedSymbol)}]</span>
            </span>
          }
          widgetName="DMX Chart"
          onSettings={onSettings}
          onRemove={onRemove}
          onFullscreen={onFullscreen}
          helpContent="Displays retail trader positioning data over time from major FX brokers. The chart shows the distribution of long vs short positions, helping identify potential contrarian trading opportunities."
        />

        {/* Legend - Currency Strength style */}
        <div className="border-b border-border bg-widget-header px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-0.5 rounded"
              style={{ backgroundColor: COLORS.long }}
            />
            <span className="text-xs text-foreground">Long</span>
          </div>
          {supportsDualSeries && (
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-0.5 rounded"
              style={{ backgroundColor: COLORS.short }}
            />
            <span className="text-xs text-foreground">Short</span>
          </div>
          )}
        </div>

        {/* Chart */}
        <div className="flex-1 p-4 min-h-[520px] flex flex-col">
          {loading && (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              Loading DMX data...
            </div>
          )}
          {!loading && error && (
            <div className="flex-1 flex items-center justify-center text-center text-sm text-muted-foreground px-4">
              {error}
            </div>
          )}
          {!loading && !error && !hasData && (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              No DMX data available for the selected configuration.
            </div>
          )}
          {!loading && !error && hasData && (
            <div className="flex-1 flex items-end" style={{ paddingLeft: '10px' }}>
              {renderChart()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

