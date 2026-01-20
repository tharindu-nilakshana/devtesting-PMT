/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useRef, useState } from "react";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import { WidgetSettingsSlideIn, WidgetSettings } from "@/components/bloomberg-ui/WidgetSettingsSlideIn";
import { datafeed } from "./datafeed";
import { getSymbolShortFormat } from "@/utils/symbolMapping";
import { useTheme } from "@/hooks/useTheme";
import { useDateFormat } from "@/hooks/useDateFormat";

// Types for timeframe and chart style
type Timeframe =
  | "1m"
  | "5m"
  | "15m"
  | "30m"
  | "1h"
  | "4h"
  | "1d"
  | "1w"
  | "1M";

type ChartStyle = "candlestick" | "area" | "line";
type AssetModule = "Forex" | "Commodities" | "Indices";

interface Props {
  symbol?: string;
  timeframe?: Timeframe;
  onRemove?: () => void;
  onSettings?: () => void;
  onFullscreen?: () => void;
  additionalSettings?: string;
  wgid?: string;
  settings?: WidgetSettings;
  onSaveSettings?: (settings: WidgetSettings) => void;
}

// Helper: convert ChartStyle to TradingView SeriesStyle enum
function chartStyleToSeriesStyle(style: ChartStyle): number {
  // TradingView SeriesStyle enum values:
  // Bars = 0, Candles = 1, Line = 2, Area = 3
  const map: Record<ChartStyle, number> = {
    "candlestick": 1, // SeriesStyle.Candles
    "area": 3,        // SeriesStyle.Area
    "line": 2,        // SeriesStyle.Line
  };
  return map[style] || 1; // Default to Candles
}

// Helper: convert show volume number to boolean
function showVolumeNumberToBoolean(num: string): boolean {
  return num === "1";
}

// Helper: map our timeframe to TradingView resolution string (API format)
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
    // Legacy support for old format
    D: "1d",
    W: "1w",
    M: "1M",
  };
  return map[resolution] ?? "1h";
}

// Add this helper function near the top with other helpers
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

export default function TradingViewWidget({
  symbol = "EURUSD",
  timeframe = "1h",
  onRemove,
  onSettings,
  onFullscreen,
  additionalSettings,
  wgid = "technical-charts-1",
  settings: externalSettings,
  onSaveSettings,
}: Props) {
  const { isDark } = useTheme();
  const { dateFormat, getFormatStringFor } = useDateFormat();
  // Refs
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetRef = useRef<any>(null);
  const dateFormatRef = useRef(dateFormat);
  
  // Update dateFormatRef whenever preferences change
  useEffect(() => {
    dateFormatRef.current = dateFormat;
  }, [dateFormat]);
  
  // Generate unique container ID based on wgid to ensure each widget instance has its own container
  const containerId = `tradingview_${wgid.replace(/[^a-zA-Z0-9]/g, '_')}`;
  
  // Get the symbol to use - prioritize externalSettings, then prop
  // This ensures we use the correct symbol from the database
  const effectiveSymbol = externalSettings?.symbol || symbol;
  const effectiveModule = externalSettings?.module || "Forex";
  
  console.log('📊 [TradingViewWidget] Initializing widget with:', { 
    wgid, 
    containerId, 
    symbol, 
    timeframe, 
    'externalSettings?.symbol': externalSettings?.symbol,
    effectiveSymbol,
    externalSettings 
  });

  // Parse additionalSettings to get chart style, show volume, and timeframe
  // Format: "chartStyle|showVolume|timeframe" (e.g., "1|1|1h" = candlestick with volume, 1 hour)
  const parseAdditionalSettings = (): { chartStyle: ChartStyle; showVolume: boolean; timeframe: Timeframe } => {
    if (additionalSettings) {
      const parts = additionalSettings.split("|");
      const chartStyleNum = parts[0] || "1";
      const showVolumeNum = parts[1] || "1";
      const timeframeValue = parts[2] || "1h";
      // Validate timeframe is one of the available ones
      const validTimeframes: Timeframe[] = ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"];
      const parsedTimeframe = validTimeframes.includes(timeframeValue as Timeframe) ? (timeframeValue as Timeframe) : "1h";
      return {
        chartStyle: "candlestick",
        showVolume: showVolumeNumberToBoolean(showVolumeNum),
        timeframe: parsedTimeframe,
      };
    }
    // Default: candlestick with volume, 1 hour timeframe
    return {
      chartStyle: "candlestick",
      showVolume: true,
      timeframe: "1h",
    };
  };

  const initialSettings = parseAdditionalSettings();

  // UI state - use effectiveSymbol from externalSettings or prop
  const [selectedSymbol, setSelectedSymbol] = useState<string>(effectiveSymbol);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>(
    toTimeframe(
      externalSettings?.timeframe || initialSettings.timeframe || timeframe,
      "1h"
    )
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Settings panel state
  const [showSettings, setShowSettings] = useState(false);

  // Internal settings state (synced with external settings)
  const [widgetSettings, setWidgetSettings] = useState<WidgetSettings>(() => ({
    module: effectiveModule,
    symbol: effectiveSymbol,
    showVolume: externalSettings?.showVolume ?? initialSettings.showVolume,
    timeframe: externalSettings?.timeframe || initialSettings.timeframe || "1h",
    ...externalSettings,
    chartType: "candlestick",
  }));

  // Derived state from settings
  const selectedModule = (widgetSettings.module as AssetModule) || effectiveModule;
  // Force chart style to always be candlestick as per requirement
  const chartStyle = (widgetSettings.chartType as ChartStyle) || "candlestick";
  const showVolume = widgetSettings.showVolume ?? false;

  // Sync with external settings prop
  useEffect(() => {
    if (externalSettings) {
      console.log(`📊 [TradingViewWidget ${wgid}] External settings changed:`, externalSettings);
      setWidgetSettings(prev => {
        const newSettings = { 
          ...prev, 
          ...externalSettings,
          // Ensure symbol is always set from externalSettings if available
          symbol: externalSettings.symbol || prev.symbol,
          module: externalSettings.module || prev.module,
        };
        return newSettings;
      });
      // Also update selectedSymbol state directly if it changed
      if (externalSettings.symbol) {
        console.log(`📊 [TradingViewWidget ${wgid}] Updating selectedSymbol to: ${externalSettings.symbol}`);
        setSelectedSymbol(externalSettings.symbol);
      }
      if (externalSettings.timeframe) {
        setSelectedTimeframe(externalSettings.timeframe as Timeframe);
      }
      // chartStyle and showVolume will be derived from widgetSettings
      // which will trigger widget re-initialization via the useEffect dependency
    }
  }, [externalSettings, wgid]);

  const handleOpenSettings = () => setShowSettings(true);
  const handleCloseSettings = () => setShowSettings(false);

  const handleSaveSettings = (newSettings: WidgetSettings) => {
    setWidgetSettings(newSettings);
    // Update chart immediately when settings are applied
    if (newSettings.symbol && newSettings.symbol !== selectedSymbol) {
      setSelectedSymbol(newSettings.symbol);
      // Update chart symbol immediately
      if (widgetRef.current) {
        try {
          widgetRef.current.activeChart().setSymbol(newSettings.symbol);
        } catch (_) { }
      }
    }
    // Update timeframe if changed
    if (newSettings.timeframe && newSettings.timeframe !== selectedTimeframe) {
      setSelectedTimeframe(newSettings.timeframe as Timeframe);
      // Update chart timeframe immediately
      if (widgetRef.current) {
        try {
          const res = convertTimeframeToResolution(newSettings.timeframe);
          widgetRef.current.activeChart().setResolution(res);
        } catch (_) { }
      }
    }
    // Update chart style immediately if widget is already initialized
    if (widgetRef.current) {
      try {
        const chart = widgetRef.current.activeChart();
        const seriesStyle = chartStyleToSeriesStyle(newSettings.chartType as ChartStyle || "candlestick");
        chart.setChartType(seriesStyle);
      } catch (_) {
        // Chart might not be ready yet, will be set on next initialization
      }
    }

    // Notify parent component to save settings to database
    // This MUST be called to trigger the /updateWidgetFieldsWeb network call
    if (onSaveSettings) {
      console.log('📤 [TechnicalCharts] Calling onSaveSettings callback with settings:', newSettings);
      onSaveSettings(newSettings);
    } else {
      console.warn('⚠️ [TechnicalCharts] onSaveSettings callback is not provided! Network call will not be made.');
    }
  };

  // Update selected symbol when widgetSettings changes (excluding from dependencies to avoid loop)
  useEffect(() => {
    if (widgetSettings.symbol && widgetSettings.symbol !== selectedSymbol) {
      setSelectedSymbol(widgetSettings.symbol);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgetSettings.symbol]);

  // Parse additionalSettings for chart style, show volume, and timeframe when it changes
  // This ensures the widget updates when additionalSettings prop changes
  useEffect(() => {
    if (additionalSettings) {
      const parsed = parseAdditionalSettings();
      setWidgetSettings(prev => {
        // Only update if values have actually changed to avoid unnecessary re-renders
        const chartTypeChanged = prev.chartType !== parsed.chartStyle;
        const showVolumeChanged = prev.showVolume !== parsed.showVolume;
        const timeframeChanged = prev.timeframe !== parsed.timeframe;

        if (chartTypeChanged || showVolumeChanged || timeframeChanged) {
          return {
            ...prev,
            chartType: parsed.chartStyle,
            showVolume: parsed.showVolume,
            timeframe: parsed.timeframe,
          };
        }
        return prev;
      });
      // Update selected timeframe if parsed from additionalSettings
      if (parsed.timeframe && parsed.timeframe !== selectedTimeframe) {
        setSelectedTimeframe(parsed.timeframe);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [additionalSettings]);

  // Initialise / re‑initialise the TradingView widget when dependencies change
  useEffect(() => {
    if (!containerRef.current) return;

    const initWidget = () => {
      if (typeof window === "undefined") return;

      // Ensure the library is loaded
      if (!(window as any).TradingView || !(window as any).TradingView.widget) {
        // Retry immediately without delay for faster loading
        requestAnimationFrame(initWidget);
        return;
      }

      try {
        console.log(`📊 [TradingViewWidget ${wgid}] Initializing chart with symbol: ${selectedSymbol}, timeframe: ${selectedTimeframe}`);
        const resolution = convertTimeframeToResolution(selectedTimeframe);
        const disabledFeatures = [
          "use_localstorage_for_settings",
          "header_symbol_search",
          "header_compare",
          "header_widget",
          "timeframes_toolbar",
        ];
        if (!showVolume) disabledFeatures.push("create_volume_indicator_by_default");

        const widgetOptions = {
          symbol: selectedSymbol,
          datafeed: datafeed,
          interval: resolution,
          container: containerRef.current,
          library_path: "/charting_library/",
          locale: "en",
          // Apply user's date format preference
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
                const dateFormat = dateFormatRef.current;
                switch (dateFormat) {
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
                const dateFormat = dateFormatRef.current;
                switch (dateFormat) {
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
          // Use unique client_id and user_id per widget instance to prevent state conflicts
          client_id: `pmt-platform-${containerId}`,
          user_id: `user-${containerId}`,
          enabled_features: [
            "study_templates",
            "header_chart_type",
            "chart_style_hilo",
            "left_toolbar",
            "items_favoriting", // Allow favoriting drawing tools
          ],
          charts_storage_url: undefined,
          charts_storage_api_version: "1.1",
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
            // Note: chart_type is not set in overrides - it's set via setChartType() after chart is ready
          },
          loading_screen: {
            backgroundColor: isDark ? "#0A0A0A" : "#f9fafb",
            foregroundColor: "#FFB02E",
          },
          time_frames: [
            { text: "1h", resolution: "1" as any, description: "1 Hour" },
            { text: "1d", resolution: "60" as any, description: "1 Day" },
            { text: "1w", resolution: "D" as any, description: "1 Week" },
            { text: "1m", resolution: "W" as any, description: "1 Month" },
          ],
        };

        console.log(`📊 [TradingViewWidget ${wgid}] Creating TradingView widget with options:`, { symbol: selectedSymbol, interval: resolution, client_id: widgetOptions.client_id });
        widgetRef.current = new (window as any).TradingView.widget(widgetOptions);
        widgetRef.current.onChartReady(() => {
          console.log(`📊 [TradingViewWidget ${wgid}] Chart ready, loaded symbol: ${selectedSymbol}`);
          setLoading(false);
          setError(null);
          const chart = widgetRef.current.activeChart();

          // Set the chart type after chart is ready
          const seriesStyle = chartStyleToSeriesStyle(chartStyle);
          try {
            chart.setChartType(seriesStyle);
          } catch (e) {
            console.warn('Failed to set chart type:', e);
          }

          chart.onIntervalChanged().subscribe(null, (interval: string) => {
            console.log(`📊 [TradingViewWidget ${wgid}] Interval changed to: ${interval}`);
            const newTf = convertResolutionToTimeframe(interval);
            setSelectedTimeframe(newTf);
          });
          chart.onSymbolChanged().subscribe(null, (sym: any) => {
            console.log(`📊 [TradingViewWidget ${wgid}] Symbol changed to: ${sym.name}`);
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
      // Add cache headers hint
      script.crossOrigin = "anonymous";
      script.onload = initWidget;
      script.onerror = () => {
        console.error('❌ [TradingView] Failed to load charting library');
        setError("Failed to load charting library. Please refresh the page.");
        setLoading(false);
      };
      document.head.appendChild(script);
    } else {
      initWidget();
    }

    // Cleanup on unmount / when dependencies change
    return () => {
      console.log(`📊 [TradingViewWidget ${wgid}] Cleaning up widget`);
      if (widgetRef.current) {
        try {
          widgetRef.current.remove();
        } catch (_) { }
        widgetRef.current = null;
      }
    };
  }, [selectedSymbol, selectedTimeframe, chartStyle, showVolume, wgid, isDark, containerId, dateFormat]);

  // Handlers for UI controls
  const handleSymbolChange = (sym: string) => {
    setSelectedSymbol(sym);
    if (widgetRef.current) {
      try {
        widgetRef.current.activeChart().setSymbol(sym);
      } catch (_) { }
    }
  };

  const handleTimeframeChange = (tf: Timeframe) => {
    setSelectedTimeframe(tf);
    if (widgetRef.current) {
      try {
        const res = convertTimeframeToResolution(tf);
        widgetRef.current.activeChart().setResolution(res);
      } catch (_) { }
    }
  };

  // Log onSaveSettings availability on mount and when it changes
  useEffect(() => {
    console.log('🔧 [TechnicalCharts] onSaveSettings prop:', {
      hasCallback: !!onSaveSettings,
      wgid,
      typeof: typeof onSaveSettings
    });
  }, [onSaveSettings, wgid]);

  const fullSymbolName = getSymbolShortFormat(selectedSymbol);

  return (
    <div className="relative flex flex-col h-full bg-widget-body overflow-hidden border border-border">
      <WidgetHeader
        title="Technical Charts"
        subtitle={<span style={{ color: '#f97316' }}>[{fullSymbolName}]</span>}
        onRemove={onRemove}
        onSettings={handleOpenSettings}
        onFullscreen={onFullscreen}
      >
        {/* Timeframe Selector - Bloomberg style buttons */}
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
              onClick={() => handleTimeframeChange(timeframeOption.value as Timeframe)}
              className={`h-7 px-2 rounded text-xs transition-colors ${selectedTimeframe === timeframeOption.value
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
            >
              {timeframeOption.label}
            </button>
          ))}
        </div>

        {/* Separator */}
        <div className="w-px h-4 bg-[#2a2e39] mx-1" />

        {/* Chart Type Button */}
        <button
          onClick={() => {
            if (widgetRef.current) {
              try {
                widgetRef.current.activeChart().executeActionById('chartProperties');
              } catch (e) {
                console.error('Failed to open chart properties:', e);
              }
            }
          }}
          className="flex items-center gap-1 h-7 px-2 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          title="Chart Type"
        >
          <svg width="16" height="16" viewBox="0 0 28 28" fill="currentColor">
            <path d="M17 11v11h-2V11h2zm-6 5v6H9v-6h2zm12-3v9h-2v-9h2z" />
          </svg>
        </button>

        {/* Separator */}
        <div className="w-px h-4 bg-[#2a2e39] mx-1" />

        {/* Indicators Button */}
        <button
          onClick={() => {
            if (widgetRef.current) {
              try {
                widgetRef.current.activeChart().executeActionById('insertIndicator');
              } catch (e) {
                console.error('Failed to open indicators:', e);
              }
            }
          }}
          className="flex items-center gap-1.5 h-7 px-2 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          title="Indicators"
        >
          <svg width="16" height="16" viewBox="0 0 28 28" fill="currentColor">
            <path d="M8 5a1 1 0 011 1v16a1 1 0 11-2 0V6a1 1 0 011-1zm6 3a1 1 0 011 1v13a1 1 0 11-2 0V9a1 1 0 011-1zm6-2a1 1 0 011 1v15a1 1 0 11-2 0V7a1 1 0 011-1z" />
          </svg>
          <span>Indicators</span>
        </button>
      </WidgetHeader>

      {/* Settings Slide-in Panel */}
      <WidgetSettingsSlideIn
        isOpen={showSettings}
        onClose={handleCloseSettings}
        widgetType="technical-charts"
        widgetPosition={wgid || "technical-charts-1"}
        widgetInstanceId={wgid}
        currentSettings={widgetSettings}
        onSave={handleSaveSettings}
      />

      {/* Chart container */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10" style={{ backgroundColor: isDark ? "#0A0A0A" : "#f9fafb" }}>
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="w-6 h-6 border-2 border-[#FFB02E]/20 rounded-full"></div>
                <div className="absolute inset-0 w-6 h-6 border-2 border-[#FFB02E] border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <p className="text-xs font-medium" style={{ color: isDark ? '#9ca3af' : '#6b7260' }}>Loading Chart</p>
              </div>              
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center z-10" style={{ backgroundColor: isDark ? "#0A0A0A" : "#fef2f2" }}>
            <div className="flex flex-col items-center gap-2 text-center px-4">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-400">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 px-4 py-2 text-xs bg-[#FFB02E] text-black rounded hover:bg-[#ffa500] transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        )}
        <div ref={containerRef} id={containerId} className="w-full h-full" />
      </div>
    </div>
  );
}

