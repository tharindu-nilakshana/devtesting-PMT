/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useRef, useState } from "react";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import { WidgetSettingsSlideIn, type WidgetSettings } from "@/components/bloomberg-ui/WidgetSettingsSlideIn";
import { datafeed } from "@/components/widgets/price-charts/TradingViewWidget/datafeed";
import { useTheme } from "@/hooks/useTheme";
import { useTemplates } from "@/hooks/useTemplates";
import tradingViewWebSocket from "@/utils/tradingViewWebSocket";

type Timeframe = "4h" | "1d" | "1w";
type AssetModule = "Forex" | "Commodities" | "Indices";
type DataType = "Retail" | "Institutional";

const timeframeToResolution: Record<Timeframe, string> = {
  "4h": "240",
  "1d": "1D",
  "1w": "1W",
};

interface Props {
  wgid?: string;
  onRemove?: () => void;
  onSettings?: () => void;
  onFullscreen?: () => void;
  symbol?: string;
  module?: string;
  settings?: WidgetSettings;
}

export default function ExponentialMovingAverageWidget({
  wgid = "exponential-moving-average",
  onRemove,
  onFullscreen,
  symbol: propSymbol = "EURUSD",
  module: propModule = "Forex",
  settings: externalSettings,
}: Props) {
  const { isDark } = useTheme();
  const { activeTemplateId, updateWidgetFields } = useTemplates();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetRef = useRef<any>(null);
  const chartReadyRef = useRef<boolean>(false);
  const lastSymbolRef = useRef<string>('');
  const lastTimeframeRef = useRef<string>('');

  const [showSettings, setShowSettings] = useState(false);

  const [widgetSettings, setWidgetSettings] = useState<WidgetSettings>(() => ({
    ...externalSettings,
    module: externalSettings?.module || propModule,
    symbol: externalSettings?.symbol || propSymbol,
    timeframe: externalSettings?.timeframe || "4h",
    dataType: externalSettings?.dataType || "Institutional",
  }));

  const selectedModule = (widgetSettings.module as AssetModule) || "Forex";
  const selectedSymbol = widgetSettings.symbol || propSymbol;
  const selectedTimeframe = (widgetSettings.timeframe as Timeframe) || "1d";
  const selectedDataType = (widgetSettings.dataType as DataType) || "Retail";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (externalSettings) {
      setWidgetSettings((prev) => ({ ...prev, ...externalSettings }));
    }
  }, [externalSettings]);

  const applyEmaStudy = (tvWidget: any, dataType: DataType) => {
    if (!tvWidget) return;
    const chart = tvWidget.activeChart();

    try {
      const existing = (chart.getAllStudies?.() || []) as any[];
      existing
        .filter((s) => (s?.name || "").toLowerCase().includes("moving average exponential"))
        .forEach((s) => {
          try {
            chart.removeEntity(s.id);
          } catch (_) {
            // Ignore
          }
        });
    } catch (_) {
      // Ignore if API not available
    }

    if (dataType === "Institutional") {
      chart.createStudy("Moving Average Exponential", true, false, null, {
        length: 288,
        "plot.linewidth": 3,
      });
      chart.createStudy("Moving Average Exponential", true, false, null, {
        length: 72,
        "plot.linewidth": 3,
      });
      chart.createStudy("Moving Average Exponential", true, false, null, {
        length: 24,
        "plot.linewidth": 3,
      });
      chart.createStudy("Moving Average Exponential", true, false, null, {
        length: 6,
        "plot.linewidth": 3,
      });
    } else {
      chart.createStudy("Moving Average Exponential", true, false, null, {
        length: 365,
        "plot.linewidth": 3,
      });
      chart.createStudy("Moving Average Exponential", true, false, null, {
        length: 200,
        "plot.linewidth": 3,
      });
      chart.createStudy("Moving Average Exponential", true, false, null, {
        length: 100,
        "plot.linewidth": 3,
      });
      chart.createStudy("Moving Average Exponential", true, false, null, {
        length: 50,
        "plot.linewidth": 3,
      });
    }
  };

  const removeVolumeStudy = (tvWidget: any) => {
    if (!tvWidget) return;
    const chart = tvWidget.activeChart();
    try {
      const existing = (chart.getAllStudies?.() || []) as any[];
      existing
        .filter((s) => (s?.name || "").toLowerCase().includes("volume"))
        .forEach((s) => {
          try {
            chart.removeEntity(s.id);
          } catch (_) {
            // Ignore
          }
        });
    } catch (_) {
      // Ignore
    }
  };

  const handleSaveSettings = async (newSettings: WidgetSettings) => {
    const prevSettings = widgetSettings;
    setWidgetSettings(newSettings);

    if (widgetRef.current) {
      try {
        if (newSettings.symbol && newSettings.symbol !== prevSettings.symbol) {
          widgetRef.current.activeChart().setSymbol(newSettings.symbol);
        }

        if (newSettings.timeframe && newSettings.timeframe !== prevSettings.timeframe) {
          const res = timeframeToResolution[(newSettings.timeframe as Timeframe) || "1d"] || "D";
          widgetRef.current.activeChart().setResolution(res);
        }

        if (newSettings.dataType && newSettings.dataType !== prevSettings.dataType) {
          applyEmaStudy(widgetRef.current, (newSettings.dataType as DataType) || "Retail");
        }
      } catch (e) {
        console.error('Error applying settings:', e);
      }
    }

    // Save settings to database
    if (wgid && activeTemplateId) {
      try {
        const additionalSettings = JSON.stringify({
          dataType: newSettings.dataType || "Institutional",
          timeframe: newSettings.timeframe || "4h"
        });

        const updateFields: any = {
          additionalSettings,
          module: newSettings.module || "Forex",
          symbols: newSettings.symbol || "EURUSD"
        };

        console.log('📡 [ExponentialMovingAverage] Calling updateWidgetFields API:', {
          widgetId: wgid,
          templateId: activeTemplateId,
          updateFields
        });

        const result = await updateWidgetFields(wgid, activeTemplateId, updateFields);

        if (result.success) {
          console.log('✅ [ExponentialMovingAverage] Settings saved to database');
        } else {
          console.warn('⚠️ [ExponentialMovingAverage] Failed to save settings:', result.message);
        }
      } catch (error) {
        console.error('❌ [ExponentialMovingAverage] Error saving settings to database:', error);
      }
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const initWidget = () => {
      if (typeof window === "undefined") return;

      if (!(window as any).TradingView || !(window as any).TradingView.widget) {
        setTimeout(initWidget, 100);
        return;
      }

      try {
        const resolution = timeframeToResolution[selectedTimeframe] || "D";

        const widgetOptions = {
          symbol: selectedSymbol,
          datafeed: datafeed,
          interval: resolution,
          container: containerRef.current,
          library_path: "/charting_library/",
          locale: "en",
          disabled_features: [
            "use_localstorage_for_settings",
            "header_symbol_search",
            "header_compare",
            "header_widget",
            "timeframes_toolbar",
            "left_toolbar",
          ],
          enabled_features: ["study_templates"],
          charts_storage_url: undefined,
          charts_storage_api_version: "1.1",
          client_id: "pmt-platform",
          user_id: "public_user",
          fullscreen: false,
          autosize: true,
          theme: isDark ? "dark" : "light",
          overrides: {
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

        widgetRef.current = new (window as any).TradingView.widget(widgetOptions);

        widgetRef.current.onChartReady(() => {
          chartReadyRef.current = true;
          lastSymbolRef.current = selectedSymbol;
          lastTimeframeRef.current = selectedTimeframe;
          setLoading(false);
          setError(null);
          try {
            removeVolumeStudy(widgetRef.current);
            applyEmaStudy(widgetRef.current, selectedDataType);
          } catch (e) {
            console.error(e);
          }
        });
      } catch (e) {
        console.error(e);
        setError("Failed to initialize chart");
        setLoading(false);
      }
    };

    if (!(window as any).TradingView) {
      const script = document.createElement("script");
      script.src = "/charting_library/charting_library.js";
      script.async = true;
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
      if (widgetRef.current) {
        try {
          widgetRef.current.remove();
        } catch (_) {
          // Ignore
        }
        widgetRef.current = null;
        chartReadyRef.current = false;
      }
    };
  }, [isDark]);

  // Update chart when symbol or timeframe changes without re-initializing
  useEffect(() => {
    if (!chartReadyRef.current || !widgetRef.current) return;
    
    // Only update if values have actually changed
    if (lastSymbolRef.current !== selectedSymbol) {
      try {
        widgetRef.current.activeChart().setSymbol(selectedSymbol);
        lastSymbolRef.current = selectedSymbol;
      } catch (e) {
        console.error('Error updating symbol:', e);
      }
    }
    
    if (lastTimeframeRef.current !== selectedTimeframe) {
      try {
        const res = timeframeToResolution[selectedTimeframe] || "D";
        widgetRef.current.activeChart().setResolution(res);
        lastTimeframeRef.current = selectedTimeframe;
      } catch (e) {
        console.error('Error updating timeframe:', e);
      }
    }
  }, [selectedSymbol, selectedTimeframe]);

  // Listen for TradingView WebSocket price updates
  useEffect(() => {
    const handlePriceUpdate = (payload: any) => {
      // TradingView Advanced Charts handle their own real-time updates via datafeed
      // No need to manually refresh. Just log for debugging.
      const updateSymbol = String(payload.symbol || payload.Symbol || payload.S || payload.s || '').toUpperCase();
      if (updateSymbol === selectedSymbol.toUpperCase()) {
        console.log('📊 [ExponentialMovingAverage] Real-time update (handled by TradingView):', updateSymbol);
      }
    };

    // Connect to WebSocket and subscribe to symbol
    tradingViewWebSocket.connect().then(() => {
      tradingViewWebSocket.subscribe([selectedSymbol]);
      console.log('📊 [ExponentialMovingAverage] Subscribed to WebSocket for:', selectedSymbol);
    }).catch(error => {
      console.error('📊 [ExponentialMovingAverage] WebSocket connection error:', error);
    });

    // Register callback
    tradingViewWebSocket.onPriceUpdate(handlePriceUpdate);

    // Cleanup
    return () => {
      tradingViewWebSocket.removePriceUpdateCallback(handlePriceUpdate);
      tradingViewWebSocket.unsubscribe([selectedSymbol]);
      tradingViewWebSocket.disconnect();
    };
  }, [selectedSymbol]);

  return (
    <div className="relative flex flex-col h-full bg-widget-body overflow-hidden">
      <WidgetHeader
        title="Exponential Moving Average"
        onRemove={onRemove}
        onSettings={() => setShowSettings(true)}
        onFullscreen={onFullscreen}
        helpContent="Displays an Exponential Moving Average (EMA) indicator on the chart. Choose between Retail (21-period EMA) or Institutional (200-period EMA) data types to analyze different market perspectives."
      />

      <WidgetSettingsSlideIn
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        widgetType="exponential-moving-average"
        widgetPosition={wgid || "exponential-moving-average"}
        widgetInstanceId={wgid}
        currentSettings={widgetSettings}
        onSave={handleSaveSettings}
      />

      <div className="flex-1 relative">
        {loading && (
          <div
            className="absolute inset-0 flex items-center justify-center z-10"
            style={{ backgroundColor: isDark ? "#0A0A0A" : "#f9fafb" }}
          >
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-4 border-[#FFB02E] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-gray-400">Loading chart...</p>
            </div>
          </div>
        )}
        {error && (
          <div
            className="absolute inset-0 flex items-center justify-center z-10"
            style={{ backgroundColor: isDark ? "#0A0A0A" : "#fef2f2" }}
          >
            <div className="flex flex-col items-center gap-2 text-center px-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
