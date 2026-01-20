/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useEffect, useRef, useState } from "react";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Clock } from "lucide-react";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import { WidgetSettingsSlideIn, WidgetSettings } from "@/components/bloomberg-ui/WidgetSettingsSlideIn";
import { datafeed } from "../TradingViewWidget/datafeed";
import { getSymbolShortFormat } from "@/utils/symbolMapping";
import tradingViewWebSocket from "@/utils/tradingViewWebSocket";
import { useTheme } from "@/hooks/useTheme";
import { useDateFormat } from "@/hooks/useDateFormat";

type Timeframe = "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d" | "1w" | "1M";
type ChartStyle = "candlestick" | "area" | "line";
type AssetModule = "Forex" | "Commodities" | "Indices";

// Available resolutions
const ALL_RESOLUTIONS = ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"];

// Convert resolution string to timeframe
function resToTimeframe(res: string): Timeframe {
  const map: Record<string, Timeframe> = {
    "1": "1m",
    "5": "5m",
    "15": "15m",
    "30": "30m",
    "60": "1h",
    "240": "4h",
    "1D": "1d",
    "1W": "1w",
    "1M": "1M",
    "D": "1d",
    "W": "1w",
    "M": "1M",
  };
  return map[res] || "1d";
}

// Helper: convert ChartStyle to TradingView SeriesStyle enum
function chartStyleToSeriesStyle(style: ChartStyle): number {
  const map: Record<ChartStyle, number> = {
    "candlestick": 1, // SeriesStyle.Candles
    "area": 3,        // SeriesStyle.Area
    "line": 2,        // SeriesStyle.Line
  };
  return map[style] || 1;
}

// Helper: map our timeframe to TradingView resolution string
function convertTimeframeToResolution(timeframe: string): string {
  const map: Record<string, string> = {
    "1m": "1",
    "5m": "5",
    "15m": "15",
    "30m": "30",
    "1h": "60",
    "4h": "240",
    "1d": "1D",
    "1w": "1W",
    "1M": "1M",
  };
  return map[timeframe] ?? "60";
}

// Helper: map TradingView resolution back to our timeframe
function convertResolutionToTimeframe(resolution: string): Timeframe {
  const map: Record<string, Timeframe> = {
    "1": "1m",
    "5": "5m",
    "15": "15m",
    "30": "30m",
    "60": "1h",
    "240": "4h",
    "1D": "1d",
    "1W": "1w",
    "1M": "1M",
    D: "1d",
    W: "1w",
    M: "1M",
  };
  return map[resolution] ?? "1h";
}

// Format symbol for display (e.g., "EURUSD" -> "EUR/USD")
function formatSymbolForDisplay(symbol: string): string {
  if (symbol && symbol.length === 6 && !symbol.includes('/') && !symbol.includes(':')) {
    return `${symbol.substring(0, 3)}/${symbol.substring(3)}`;
  }
  return symbol;
}

function isValidTimeframe(value: any): value is Timeframe {
  const validTimeframes: Timeframe[] = ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"];
  return validTimeframes.includes(value);
}

function toTimeframe(value: string | undefined, fallback: Timeframe): Timeframe {
  if (value && isValidTimeframe(value)) {
    return value;
  }
  return fallback;
}

interface Props {
  symbol?: string;
  module?: string;
  additionalSettings?: string;
  wgid?: string;
  onRemove?: () => void;
  onSettings?: () => void;
  onFullscreen?: () => void;
  settings?: WidgetSettings;
  onSaveSettings?: (settings: WidgetSettings) => void;
}

export default function InformationChart({
  symbol: propSymbol,
  module: propModule,
  additionalSettings = "",
  wgid = "information-chart-1",
  onRemove,
  onFullscreen,
  settings: externalSettings,
  onSaveSettings,
}: Props) {
  const { isDark } = useTheme();
  const { dateFormat } = useDateFormat();
  const dateFormatRef = useRef(dateFormat);
  
  // Update dateFormatRef whenever preferences change
  useEffect(() => {
    dateFormatRef.current = dateFormat;
  }, [dateFormat]);
  
  // Refs for TradingView widget
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetRef = useRef<any>(null);
  
  // Generate unique container ID
  const containerId = `tradingview_info_${wgid.replace(/[^a-zA-Z0-9]/g, '_')}`;

  // Parse AdditionalSettings to get interval
  const parseInterval = (): Timeframe => {
    if (additionalSettings) {
      const parts = additionalSettings.split("|");
      const intervalStr = parts[0] || "";
      if (ALL_RESOLUTIONS.includes(intervalStr)) {
        return intervalStr as Timeframe;
      }
      const converted = resToTimeframe(intervalStr);
      if (ALL_RESOLUTIONS.includes(converted)) {
        return converted;
      }
    }
    return "1d";
  };

  // Get effective values from settings or props
  const effectiveSymbol = externalSettings?.symbol || propSymbol || "EURUSD";
  const effectiveModule = externalSettings?.module || propModule || "Forex";
  const effectiveTimeframe = toTimeframe(externalSettings?.timeframe || parseInterval(), "1d");
  const effectiveChartType = (externalSettings?.chartType as ChartStyle) || "candlestick";

  // State
  const [selectedSymbol, setSelectedSymbol] = useState<string>(effectiveSymbol);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>(effectiveTimeframe);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [priceChangePercent, setPriceChangePercent] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Internal settings state
  const [widgetSettings, setWidgetSettings] = useState<WidgetSettings>(() => ({
    module: effectiveModule,
    symbol: effectiveSymbol,
    chartType: effectiveChartType,
    showVolume: externalSettings?.showVolume ?? false,
    timeframe: effectiveTimeframe,
    ...externalSettings,
  }));

  // Derived values
  const selectedModule = (widgetSettings.module as AssetModule) || effectiveModule;
  const chartStyle = (widgetSettings.chartType as ChartStyle) || "candlestick";
  const showVolume = widgetSettings.showVolume ?? false;

  // Sync with external settings
  useEffect(() => {
    if (externalSettings) {
      setWidgetSettings(prev => {
        const hasChanges =
          externalSettings.symbol !== prev.symbol ||
          externalSettings.module !== prev.module ||
          externalSettings.timeframe !== prev.timeframe ||
          externalSettings.chartType !== prev.chartType ||
          externalSettings.showVolume !== prev.showVolume;

        if (hasChanges) {
          return { ...prev, ...externalSettings };
        }
        return prev;
      });
      if (externalSettings.symbol) {
        setSelectedSymbol(externalSettings.symbol);
      }
      if (externalSettings.timeframe) {
        setSelectedTimeframe(externalSettings.timeframe as Timeframe);
      }
    }
  }, [externalSettings]);

  const handleOpenSettings = () => setShowSettings(true);
  const handleCloseSettings = () => setShowSettings(false);

  const handleSaveSettings = (newSettings: WidgetSettings) => {
    setWidgetSettings(newSettings);
    
    // Update symbol
    if (newSettings.symbol && newSettings.symbol !== selectedSymbol) {
      setSelectedSymbol(newSettings.symbol);
      if (widgetRef.current) {
        try {
          widgetRef.current.activeChart().setSymbol(newSettings.symbol);
        } catch (_) { }
      }
    }
    
    // Update timeframe
    if (newSettings.timeframe && newSettings.timeframe !== selectedTimeframe) {
      setSelectedTimeframe(newSettings.timeframe as Timeframe);
      if (widgetRef.current) {
        try {
          const res = convertTimeframeToResolution(newSettings.timeframe);
          widgetRef.current.activeChart().setResolution(res);
        } catch (_) { }
      }
    }
    
    // Update chart style
    if (widgetRef.current && newSettings.chartType) {
      try {
        const chart = widgetRef.current.activeChart();
        const seriesStyle = chartStyleToSeriesStyle(newSettings.chartType as ChartStyle);
        chart.setChartType(seriesStyle);
      } catch (_) { }
    }

    if (onSaveSettings) {
      console.log('📤 [InformationChart] Calling onSaveSettings callback with settings:', newSettings);
      onSaveSettings(newSettings);
    }
  };

  // Initialize TradingView Advanced Chart
  useEffect(() => {
    if (!containerRef.current) return;

    const initWidget = () => {
      if (typeof window === "undefined") return;

      if (!(window as any).TradingView || !(window as any).TradingView.widget) {
        requestAnimationFrame(initWidget);
        return;
      }

      try {
        console.log(`📊 [InformationChart ${wgid}] Initializing chart with symbol: ${selectedSymbol}, timeframe: ${selectedTimeframe}`);
        const resolution = convertTimeframeToResolution(selectedTimeframe);
        
        const disabledFeatures = [
          "use_localstorage_for_settings",
          "header_symbol_search",
          "header_compare",
          "header_widget",
          "timeframes_toolbar",
          "header_chart_type",
          "left_toolbar",
          "header_settings",
          "header_indicators",
          "header_undo_redo",
          "header_screenshot",
          "header_fullscreen_button",
          "control_bar",
          "border_around_the_chart",
        ];
        if (!showVolume) disabledFeatures.push("create_volume_indicator_by_default");

        const widgetOptions = {
          symbol: selectedSymbol,
          datafeed: datafeed,
          interval: resolution,
          container: containerRef.current,
          library_path: "/charting_library/",
          locale: "en",
          custom_formatters: {
            timeFormatter: {
              format: (date: Date) => {
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                return `${hours}:${minutes}`;
              },
              formatLocal: (date: Date) => {
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                return `${hours}:${minutes}`;
              },
            },
            dateFormatter: {
              format: (date: Date) => {
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                const df = dateFormatRef.current;
                switch (df) {
                  case 'DD/MM/YYYY':
                    return `${day}/${month}/${year}`;
                  case 'MM/DD/YYYY':
                    return `${month}/${day}/${year}`;
                  case 'YYYY-MM-DD':
                    return `${year}-${month}-${day}`;
                  default:
                    return `${day}/${month}/${year}`;
                }
              },
              formatLocal: (date: Date) => {
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                const df = dateFormatRef.current;
                switch (df) {
                  case 'DD/MM/YYYY':
                    return `${day}/${month}/${year}`;
                  case 'MM/DD/YYYY':
                    return `${month}/${day}/${year}`;
                  case 'YYYY-MM-DD':
                    return `${year}-${month}-${day}`;
                  default:
                    return `${day}/${month}/${year}`;
                }
              },
            },
          },
          disabled_features: disabledFeatures,
          client_id: `pmt-platform-${containerId}`,
          user_id: `user-${containerId}`,
          enabled_features: [],
          fullscreen: false,
          autosize: true,
          theme: isDark ? "dark" : "light",
          custom_css_url: isDark ? "/tradingview-custom.css" : undefined,
          overrides: {
            "mainSeriesProperties.candleStyle.upColor": "#26a69a",
            "mainSeriesProperties.candleStyle.downColor": "#ef5350",
            "mainSeriesProperties.candleStyle.borderUpColor": "#26a69a",
            "mainSeriesProperties.candleStyle.borderDownColor": "#ef5350",
            "mainSeriesProperties.candleStyle.wickUpColor": "#26a69a",
            "mainSeriesProperties.candleStyle.wickDownColor": "#ef5350",
            "paneProperties.background": isDark ? "#0A0A0A" : "#ffffff",
            "paneProperties.backgroundType": "solid",
            "paneProperties.vertGridProperties.color": isDark ? "#1C2227" : "#e5e7eb",
            "paneProperties.horzGridProperties.color": isDark ? "#1C2227" : "#e5e7eb",
            "scalesProperties.textColor": isDark ? "#9ca3af" : "#4b5563",
            "scalesProperties.lineColor": isDark ? "#374151" : "#d1d5db",
          },
          loading_screen: {
            backgroundColor: isDark ? "#0A0A0A" : "#f9fafb",
            foregroundColor: "#FFB02E",
          },
        };

        console.log(`📊 [InformationChart ${wgid}] Creating TradingView widget`);
        widgetRef.current = new (window as any).TradingView.widget(widgetOptions);
        
        widgetRef.current.onChartReady(() => {
          console.log(`📊 [InformationChart ${wgid}] Chart ready`);
          setLoading(false);
          setError(null);
          
          const chart = widgetRef.current.activeChart();

          // Set the chart type
          const seriesStyle = chartStyleToSeriesStyle(chartStyle);
          try {
            chart.setChartType(seriesStyle);
          } catch (e) {
            console.warn('Failed to set chart type:', e);
          }

          // Listen for interval changes
          chart.onIntervalChanged().subscribe(null, (interval: string) => {
            const newTf = convertResolutionToTimeframe(interval);
            setSelectedTimeframe(newTf);
          });
          
          // Listen for symbol changes
          chart.onSymbolChanged().subscribe(null, (sym: any) => {
            setSelectedSymbol(sym.name);
          });
        });
      } catch (e) {
        console.error(e);
        setError("Failed to initialize chart");
        setLoading(false);
      }
    };

    // Load script if needed
    if (!(window as any).TradingView) {
      const script = document.createElement("script");
      script.src = "/charting_library/charting_library.js";
      script.async = true;
      script.defer = true;
      script.crossOrigin = "anonymous";
      script.onload = initWidget;
      script.onerror = () => {
        setError("Failed to load charting library");
        setLoading(false);
      };
      document.head.appendChild(script);
    } else {
      initWidget();
    }

    return () => {
      console.log(`📊 [InformationChart ${wgid}] Cleaning up widget`);
      if (widgetRef.current) {
        try {
          widgetRef.current.remove();
        } catch (_) { }
        widgetRef.current = null;
      }
    };
  }, [selectedSymbol, selectedTimeframe, chartStyle, showVolume, wgid, isDark, containerId, dateFormat]);

  // WebSocket integration for real-time price updates (for the header display)
  useEffect(() => {
    if (!selectedSymbol) return;

    const handlePriceUpdate = (data: Record<string, unknown>) => {
      try {
        const symbol = String(data.symbol || data.Symbol || data.S || data.s || '').toUpperCase();
        const price = Number(data.price ?? data.Price ?? data.last ?? data.Last ?? data.close ?? data.Close ?? data.c);

        if (symbol !== selectedSymbol.toUpperCase() || isNaN(price)) {
          return;
        }

        setCurrentPrice(prevPrice => {
          if (prevPrice > 0) {
            const change = price - prevPrice;
            setPriceChange(change);
            setPriceChangePercent(prevPrice !== 0 ? (change / prevPrice) * 100 : 0);
          }
          return price;
        });

        console.log('📊 [InformationChart] Real-time price update:', { symbol, price: price.toFixed(5) });
      } catch (error) {
        console.error('📊 [InformationChart] Error handling price update:', error);
      }
    };

    const handleConnectionStatus = (status: 'connecting' | 'connected' | 'disconnected' | 'error') => {
      setWsConnected(status === 'connected');
      console.log('📊 [InformationChart] WebSocket status:', status);
    };

    tradingViewWebSocket.connect().then(() => {
      tradingViewWebSocket.subscribe([selectedSymbol]);
      console.log('📊 [InformationChart] Subscribed to WebSocket for:', selectedSymbol);
    }).catch(error => {
      console.error('📊 [InformationChart] WebSocket connection error:', error);
    });

    tradingViewWebSocket.onPriceUpdate(handlePriceUpdate);
    tradingViewWebSocket.onConnectionStatus(handleConnectionStatus);

    return () => {
      tradingViewWebSocket.removePriceUpdateCallback(handlePriceUpdate);
      tradingViewWebSocket.removeConnectionStatusCallback(handleConnectionStatus);
      tradingViewWebSocket.unsubscribe([selectedSymbol]);
      tradingViewWebSocket.disconnect();
    };
  }, [selectedSymbol]);

  const displaySymbol = formatSymbolForDisplay(selectedSymbol);
  const fullSymbolName = getSymbolShortFormat(selectedSymbol);
  const isPositive = priceChange >= 0;

  return (
    <div className="relative flex flex-col h-full bg-widget-body overflow-hidden border border-border">
      <WidgetHeader
        title="Information Chart"
        subtitle={<span style={{ color: '#f97316' }}>[{fullSymbolName}]</span>}
        onRemove={onRemove}
        onSettings={handleOpenSettings}
        onFullscreen={onFullscreen}
      >
        {/* Timeframe Selector */}
        <div className="flex gap-1 mr-2">
          {[
            { value: '5m', label: '5m' },
            { value: '15m', label: '15m' },
            { value: '30m', label: '30m' },
            { value: '1h', label: '1H' },
            { value: '4h', label: '4H' },
            { value: '1d', label: '1D' },
            { value: '1w', label: '1W' },
            { value: '1M', label: '1M' }
          ].map((timeframeOption) => (
            <button
              key={timeframeOption.value}
              onClick={() => {
                const newTimeframe = timeframeOption.value as Timeframe;
                setSelectedTimeframe(newTimeframe);
                const newSettings = { ...widgetSettings, timeframe: newTimeframe };
                handleSaveSettings(newSettings);
              }}
              className={`h-7 px-2 rounded text-xs transition-colors ${selectedTimeframe === timeframeOption.value
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
            >
              {timeframeOption.label}
            </button>
          ))}
        </div>
      </WidgetHeader>

      {/* Settings Slide-in Panel */}
      <WidgetSettingsSlideIn
        isOpen={showSettings}
        onClose={handleCloseSettings}
        widgetType="information-chart"
        widgetPosition={wgid || "information-chart-1"}
        widgetInstanceId={wgid}
        currentSettings={widgetSettings}
        onSave={handleSaveSettings}
      />

      {/* Info Section Above Chart */}
      <div className="flex items-stretch border-b border-border" style={{ backgroundColor: isDark ? "#1A1A1A" : "#f9fafb" }}>
        {/* Left: Price Info & Smart Bias */}
        <div className="flex flex-col justify-center px-3 py-2 border-r border-[#2a2a2a] min-w-[200px]">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs text-[#8a8a8a]">Price:</span>
            <span className="text-gray-200">{currentPrice > 0 ? currentPrice.toFixed(5) : "—"}</span>
            <span className={`flex items-center gap-1 text-xs ${isPositive ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#8a8a8a]">Smart Bias:</span>
            <span className="text-[#26a69a] flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Bullish
            </span>
          </div>
        </div>

        {/* Right: Pie Chart & Headline */}
        <div className="flex-1 flex items-center gap-3 px-3 py-2">
          {/* Market Sentiment Pie Chart */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-20 h-20 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Bullish", value: 65, color: "#22c55e" },
                      { name: "Neutral", value: 20, color: "#8a8a8a" },
                      { name: "Bearish", value: 15, color: "#ef4444" },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={18}
                    outerRadius={32}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    <Cell fill="#22c55e" />
                    <Cell fill="#8a8a8a" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#0A0A0A',
                      border: '1px solid #2a2a2a',
                      borderRadius: '6px',
                      fontSize: '11px'
                    }}
                    formatter={(value: number) => [`${value}%`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-[10px] text-[#8a8a8a] mb-0.5">Sentiment</div>
              <div className="flex items-center gap-1 text-[10px]">
                <div className="w-1.5 h-1.5 bg-[#22c55e] rounded-sm"></div>
                <span className="text-[#8a8a8a]">65%</span>
              </div>
              <div className="flex items-center gap-1 text-[10px]">
                <div className="w-1.5 h-1.5 bg-[#8a8a8a] rounded-sm"></div>
                <span className="text-[#8a8a8a]">20%</span>
              </div>
              <div className="flex items-center gap-1 text-[10px]">
                <div className="w-1.5 h-1.5 bg-[#ef4444] rounded-sm"></div>
                <span className="text-[#8a8a8a]">15%</span>
              </div>
            </div>
          </div>

          {/* Latest Headline */}
          <div className="flex-1 min-w-0 pl-3 border-l border-[#2a2a2a]">
            <div className="flex items-start gap-2">
              <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0 bg-[#ef4444]"></div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-200 mb-1 leading-tight line-clamp-2">
                  ECB holds rates steady, {displaySymbol} rallies on dovish signals
                </div>
                <div className="flex items-center gap-2 text-[10px] text-[#8a8a8a]">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>2h ago</span>
                  </div>
                  <div className="px-1.5 py-0.5 rounded bg-[#ef4444]/10 text-[#ef4444]">
                    HIGH
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart container */}
      <div className="WidgetChart flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10" style={{ backgroundColor: isDark ? "#0A0A0A" : "#f9fafb" }}>
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-[#26a69a] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-gray-400">Loading chart...</p>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center z-10" style={{ backgroundColor: isDark ? "#0A0A0A" : "#fef2f2" }}>
            <div className="flex flex-col items-center gap-2 text-center px-4">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />

        {/* Current Price Label */}
        {!loading && !error && currentPrice > 0 && (
          <div
            className="absolute right-1 bg-[#f97316] text-white px-2 py-0.5 rounded text-xs font-medium"
            style={{ top: '50%', transform: 'translateY(-50%)' }}
          >
            {currentPrice.toFixed(5)}
          </div>
        )}
      </div>
    </div>
  );
}

