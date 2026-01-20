/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchPercentMonthlyTargets } from './api';
import { WidgetHeader } from '@/components/bloomberg-ui/WidgetHeader';
import { WidgetSettingsSlideIn, type WidgetSettings } from '@/components/bloomberg-ui/WidgetSettingsSlideIn';
import { datafeed } from '@/components/widgets/price-charts/TradingViewWidget/datafeed';
import { useTheme } from '@/hooks/useTheme';
import { useTemplates } from '@/hooks/useTemplates';
import tradingViewWebSocket from '@/utils/tradingViewWebSocket';
import { widgetDataCache } from '@/lib/widgetDataCache';
import { getSymbolShortFormat } from '@/utils/symbolMapping';

interface Props {
  wgid?: string;
  onRemove?: () => void;
  onSettings?: () => void;
  onFullscreen?: () => void;
  symbol?: string;
  module?: string;
  settings?: WidgetSettings;
}

export default function PercentMonthlyTargetsWidget({
  wgid = 'percent-monthly-targets',
  onRemove,
  onSettings,
  onFullscreen,
  symbol: propSymbol = 'EURUSD',
  module: propModule = 'Forex',
  settings
}: Props) {
  const { isDark } = useTheme();
  const { activeTemplateId, updateWidgetFields } = useTemplates();
  
  const [showSettings, setShowSettings] = useState(false);
  const [widgetSettings, setWidgetSettings] = useState<WidgetSettings>(() => ({
    ...settings,
    module: settings?.module || propModule,
    symbol: settings?.symbol || propSymbol,
  }));
  
  // Use widgetSettings for current values
  const symbol = widgetSettings.symbol || propSymbol;
  const module = widgetSettings.module || propModule;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openPrice, setOpenPrice] = useState<number | null>(null);
  const [periodStartDate, setPeriodStartDate] = useState<number | null>(null);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);

  // Sync external settings
  useEffect(() => {
    if (settings) {
      setWidgetSettings((prev) => ({ ...prev, ...settings }));
    }
  }, [settings]);

  // Handle settings save
  const handleSaveSettings = async (newSettings: WidgetSettings) => {
    setWidgetSettings(newSettings);

    // Save settings to database
    if (wgid && activeTemplateId) {
      try {
        const updateFields: any = {
          module: newSettings.module || "Forex",
          symbols: newSettings.symbol || "EURUSD"
        };

        console.log('📡 [PercentMonthlyTargets] Calling updateWidgetFields API:', {
          widgetId: wgid,
          templateId: activeTemplateId,
          updateFields
        });

        const result = await updateWidgetFields(wgid, activeTemplateId, updateFields);

        if (result.success) {
          console.log('✅ [PercentMonthlyTargets] Settings saved to database');
        } else {
          console.warn('⚠️ [PercentMonthlyTargets] Failed to save settings:', result.message);
        }
      } catch (error) {
        console.error('❌ [PercentMonthlyTargets] Error saving settings to database:', error);
      }
    }
  };

  // Calculate the date string for Month period (matches reference logic exactly)
  const calculateDateString = useCallback((): string => {
    const todaysDateForTargets = new Date();
    let date = "01";
    let dateString = "";

    // Start with the 1st of current month
    dateString = 
      todaysDateForTargets.getFullYear() +
      "-" +
      (todaysDateForTargets.getMonth() + 1).toString().padStart(2, "0") +
      "-" +
      date;

    const currentDay = new Date(dateString).getDay();
    const currentDate = new Date(dateString);

    // If 1st falls on Saturday (6)
    if (currentDay === 6) {
      if (todaysDateForTargets.getDate() > currentDate.getDate() + 1) {
        // We're past the 2nd, use the 3rd
        date = "03";
        dateString =
          todaysDateForTargets.getFullYear() +
          "-" +
          (todaysDateForTargets.getMonth() + 1).toString().padStart(2, "0") +
          "-" +
          date;
      } else {
        // Use previous month's last day
        const endMonth = currentDate.getMonth(); // Note: NOT +1 here (previous month)
        if ([1, 3, 5, 7, 8, 10, 12].includes(endMonth)) {
          date = "31";
        } else if (endMonth === 2) {
          date = "28";
        } else {
          date = "30";
        }
        dateString =
          todaysDateForTargets.getFullYear() +
          "-" +
          todaysDateForTargets.getMonth().toString().padStart(2, "0") +
          "-" +
          date;
      }
    }

    // If 1st falls on Sunday (0)
    if (currentDay === 0) {
      if (todaysDateForTargets.getDate() > currentDate.getDate()) {
        // We're past the 1st, use the 2nd
        date = "02";
        dateString =
          todaysDateForTargets.getFullYear() +
          "-" +
          (todaysDateForTargets.getMonth() + 1).toString().padStart(2, "0") +
          "-" +
          date;
      } else {
        // Use previous month's last day
        const endMonth = currentDate.getMonth(); // Note: NOT +1 here (previous month)
        if ([1, 3, 5, 7, 8, 10, 12].includes(endMonth)) {
          date = "30";
        } else if (endMonth === 2) {
          date = "27";
        } else {
          date = "29";
        }
        dateString =
          todaysDateForTargets.getFullYear() +
          "-" +
          todaysDateForTargets.getMonth().toString().padStart(2, "0") +
          "-" +
          date;
      }
    }

    console.log('📅 [PercentMonthlyTargets] Calculated dateString:', dateString);
    return dateString;
  }, []);

  // Helper function to draw horizontal lines from cached data
  const drawPercentLinesFromCache = useCallback((widget: any, openForPercent: number, periodName: string) => {
    const dateString = calculateDateString();
    let newDate = new Date(dateString);
    newDate.setUTCHours(0, 0);
    const periodStartTimestamp = Math.round(newDate.getTime() / 1000);
    const endTimestamp = Math.floor(new Date().getTime() / 1000 + 3600 * 60 * 30 * 30);

    // Draw horizontal line at open
    widget.activeChart().createMultipointShape(
      [
        {
          time: periodStartTimestamp,
          price: parseFloat(openForPercent.toString()),
        },
        {
          time: endTimestamp,
          price: parseFloat(openForPercent.toString()),
        },
      ],
      {
        shape: "trend_line",
        text: periodName,
        lock: true,
        overrides: {
          horzLabelsAlign: "left",
          linecolor: "#ff9800",
          textcolor: "#ffffff",
          bold: true,
          linewidth: 1,
          showPrice: true,
          showLabel: true,
        },
      }
    );

    // Draw percentage lines
    for (let i = 1; i <= 5; i++) {
      const maxPercentage = (parseFloat(openForPercent.toString()) * i) / 100 + parseFloat(openForPercent.toString());
      const minPercentage = parseFloat(openForPercent.toString()) - (parseFloat(openForPercent.toString()) * i) / 100;

      widget.activeChart().createMultipointShape(
        [
          {
            time: periodStartTimestamp,
            price: parseFloat(maxPercentage.toString()),
          },
          {
            time: endTimestamp,
            price: parseFloat(maxPercentage.toString()),
          },
        ],
        {
          shape: "trend_line",
          text: "+" + i + ",00%",
          lock: true,
          overrides: {
            horzLabelsAlign: "left",
            linestyle: 2,
            linecolor: "#ff9800",
            textcolor: "#00d10a",
            bold: true,
            linewidth: 1,
            showPrice: true,
            showLabel: true,
          },
        }
      );

      widget.activeChart().createMultipointShape(
        [
          {
            time: periodStartTimestamp,
            price: parseFloat(minPercentage.toString()),
          },
          {
            time: endTimestamp,
            price: parseFloat(minPercentage.toString()),
          },
        ],
        {
          shape: "trend_line",
          text: "-" + i + ",00%",
          lock: true,
          overrides: {
            horzLabelsAlign: "left",
            linestyle: 2,
            linecolor: "#ff9800",
            textcolor: "#ff0000",
            bold: true,
            linewidth: 1,
            showPrice: true,
            showLabel: true,
          },
        }
      );
    }

    // Draw box
    widget.activeChart().createMultipointShape(
      [
        {
          time: periodStartTimestamp,
          price: parseFloat((openForPercent - (openForPercent * 5) / 100).toString()),
        },
        {
          time: endTimestamp,
          price: parseFloat((openForPercent + (openForPercent * 5) / 100).toString()),
        },
      ],
      {
        shape: "rectangle",
        lock: true,
        overrides: {
          transparency: 85,
          color: "#ff9800",
          backgroundColor: "#ff9800",
        },
      }
    );

    // Set visible range
    setTimeout(() => {
      try {
        const fromTime = periodStartTimestamp - (90 * 24 * 60 * 60);
        const toTime = Math.floor(Date.now() / 1000) + (14 * 24 * 60 * 60);
        widget.activeChart().setVisibleRange({
          from: fromTime,
          to: toTime,
        });
      } catch (e) {
        console.warn('⚠️ [PercentMonthlyTargets] Could not set visible range:', e);
      }
    }, 100);
  }, [calculateDateString]);

  const percentTargets = useCallback(async (widget: any) => {
    if (!widget || !symbol) return;

    let openForPercent: number;
    const dateString = calculateDateString();
    const periodName = "Month Open";

    // Check cache first
    const cacheKey = widgetDataCache.generateKey('percentmonthlytargets', { symbol, dateString });
    const cachedResponse = widgetDataCache.get<any>(cacheKey);
    if (cachedResponse) {
      console.log('✅ [PercentMonthlyTargets] Using cached data');
      if (!cachedResponse || !cachedResponse.data || cachedResponse.data.length === 0 || cachedResponse.data[0]?.open == null) {
        console.log('ℹ️ [PercentMonthlyTargets] No data available for this period, showing chart only');
        return;
      }

      const firstItem = cachedResponse.data[0];
      openForPercent = firstItem.open;
      setOpenPrice(openForPercent);
      console.log('✅ [PercentMonthlyTargets] Open price loaded from cache:', openForPercent);

      let newDate = new Date(dateString);
      newDate.setUTCHours(0, 0);
      
      const periodStartTimestamp = Math.round(newDate.getTime() / 1000);
      setPeriodStartDate(periodStartTimestamp);

      // Draw vertical line at period start
      widget.activeChart().createShape(
        {
          time: periodStartTimestamp,
        },
        {
          shape: "vertical_line",
          lock: true,
          overrides: {
            linecolor: "#ff9800",
            textcolor: "#ffffff",
            bold: true,
            linewidth: 1,
            showPrice: true,
            showLabel: true,
          },
          text: periodName,
        }
      );

      // Continue with drawing horizontal lines (rest of cached logic)
      drawPercentLinesFromCache(widget, openForPercent, periodName);
      return;
    }

    try {
      const response = await fetchPercentMonthlyTargets({
        sdate: dateString,
        symbol: symbol
      });

      console.log('🔍 [PercentMonthlyTargets] API Response:', response);

      // If no data, just show the chart without shapes
      if (!response || !response.data || response.data.length === 0 || response.data[0]?.open == null) {
        console.log('ℹ️ [PercentMonthlyTargets] No data available for this period, showing chart only');
        return;
      }

      const firstItem = response.data[0];
      openForPercent = firstItem.open;
      setOpenPrice(openForPercent);
      console.log('✅ [PercentMonthlyTargets] Open price loaded:', openForPercent);

      let newDate = new Date(dateString);
      newDate.setUTCHours(0, 0);
      
      const periodStartTimestamp = Math.round(newDate.getTime() / 1000);
      setPeriodStartDate(periodStartTimestamp);

      // Draw vertical line at period start
      widget.activeChart().createShape(
        {
          time: periodStartTimestamp,
        },
        {
          shape: "vertical_line",
          lock: true,
          overrides: {
            linecolor: "#ff9800",
            textcolor: "#ffffff",
            bold: true,
            linewidth: 1,
            showPrice: true,
            showLabel: true,
          },
        }
      );

        // Calculate end time: extend far into future (same as stable system)
        const endTimestamp = Math.floor(new Date().getTime() / 1000 + 3600 * 60 * 30 * 30);

        widget.activeChart().createMultipointShape(
          [
            {
              time: periodStartTimestamp,
              price: parseFloat(openForPercent.toString()),
            },
            {
              time: endTimestamp,
              price: parseFloat(openForPercent.toString()),
            },
          ],
          {
            shape: "trend_line",
            text: periodName,
            lock: true,
            overrides: {
              horzLabelsAlign: "left",
              linecolor: "#ff9800",
              textcolor: "#ffffff",
              bold: true,
              linewidth: 1,
              showPrice: true,
              showLabel: true,
            },
          }
        );

        for (let i = 1; i <= 5; i++) {
          const maxPercentage = (parseFloat(openForPercent.toString()) * i) / 100 + parseFloat(openForPercent.toString());
          const minPercentage = parseFloat(openForPercent.toString()) - (parseFloat(openForPercent.toString()) * i) / 100;

          widget.activeChart().createMultipointShape(
            [
              {
                time: periodStartTimestamp,
                price: parseFloat(maxPercentage.toString()),
              },
              {
                time: endTimestamp,
                price: parseFloat(maxPercentage.toString()),
              },
            ],
            {
              shape: "trend_line",
              text: "+" + i + ",00%",
              lock: true,
              overrides: {
                horzLabelsAlign: "left",
                linestyle: 2,
                linecolor: "#ff9800",
                textcolor: "#00d10a",
                bold: true,
                linewidth: 1,
                showPrice: true,
                showLabel: true,
              },
            }
          );

          widget.activeChart().createMultipointShape(
            [
              {
                time: periodStartTimestamp,
                price: parseFloat(minPercentage.toString()),
              },
              {
                time: endTimestamp,
                price: parseFloat(minPercentage.toString()),
              },
            ],
            {
              shape: "trend_line",
              text: "-" + i + ",00%",
              lock: true,
              overrides: {
                horzLabelsAlign: "left",
                linestyle: 2,
                linecolor: "#ff9800",
                textcolor: "#ff0000",
                bold: true,
                linewidth: 1,
                showPrice: true,
                showLabel: true,
              },
            }
          );
        }

        widget.activeChart().createMultipointShape(
          [
            {
              time: periodStartTimestamp,
              price: parseFloat((openForPercent - (openForPercent * 5) / 100).toString()),
            },
            {
              time: endTimestamp,
              price: parseFloat((openForPercent + (openForPercent * 5) / 100).toString()),
            },
          ],
          {
            shape: "rectangle",
            lock: true,
            overrides: {
              transparency: 85,
              color: "#ff9800",
              backgroundColor: "#ff9800",
            },
          }
        );

        // Set visible range after drawing shapes to focus on recent data
        // Show from 3 months before month start to current date + some padding
        setTimeout(() => {
          try {
            const fromTime = periodStartTimestamp - (90 * 24 * 60 * 60); // 90 days before period start
            const toTime = Math.floor(Date.now() / 1000) + (14 * 24 * 60 * 60); // 2 weeks buffer
            widget.activeChart().setVisibleRange({
              from: fromTime,
              to: toTime,
            });
          } catch (e) {
            console.warn('⚠️ [PercentMonthlyTargets] Could not set visible range:', e);
          }
        }, 100);

      // Cache the response
      widgetDataCache.set(cacheKey, response);

    } catch (err) {
      console.error('❌ [PercentMonthlyTargets] Failed to fetch percent targets:', err);
      setError(err instanceof Error ? err.message : 'Failed to load percent targets');
    }
  }, [symbol, calculateDateString]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const initWidget = () => {
      if (typeof window === "undefined") return;

      if (!(window as any).TradingView || !(window as any).TradingView.widget) {
        setTimeout(initWidget, 100);
        return;
      }

      try {
        const widgetOptions = {
          symbol: symbol,
          datafeed: datafeed,
          interval: "1D",
          container: chartContainerRef.current,
          library_path: "/charting_library/",
          locale: "en",
          disabled_features: [
            "use_localstorage_for_settings",
            "header_symbol_search",
            "header_compare",
            "header_widget",
            "timeframes_toolbar",
            "create_volume_indicator_by_default",
          ],
          enabled_features: ["study_templates"],
          charts_storage_url: undefined,
          charts_storage_api_version: "1.1",
          client_id: "pmt-platform",
          user_id: "public_user",
          fullscreen: false,
          autosize: true,
          theme: isDark ? "dark" : "light",
          custom_css_url: isDark ? "/tradingview-custom.css" : undefined,
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
          setLoading(false);
          setError(null);
          try {
            percentTargets(widgetRef.current);
          } catch (e) {
            console.error('❌ [PercentMonthlyTargets] Error drawing targets:', e);
            setError('Failed to draw percent targets');
          }
        });
      } catch (e) {
        console.error('❌ [PercentMonthlyTargets] Failed to initialize chart:', e);
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
      }
    };
  }, [symbol, isDark, percentTargets]);

  // Listen for TradingView WebSocket price updates
  useEffect(() => {
    const handlePriceUpdate = (payload: any) => {
      // TradingView Advanced Charts handle their own real-time updates via datafeed
      // No need to manually refresh. Just log for debugging.
      const updateSymbol = String(payload.symbol || payload.Symbol || payload.S || payload.s || '').toUpperCase();
      if (updateSymbol === symbol.toUpperCase()) {
        console.log('📊 [PercentMonthlyTargets] Real-time update (handled by TradingView):', updateSymbol);
      }
    };

    // Connect to WebSocket and subscribe to symbol
    tradingViewWebSocket.connect().then(() => {
      tradingViewWebSocket.subscribe([symbol]);
      console.log('📊 [PercentMonthlyTargets] Subscribed to WebSocket for:', symbol);
    }).catch(error => {
      console.error('📊 [PercentMonthlyTargets] WebSocket connection error:', error);
    });

    // Register callback
    tradingViewWebSocket.onPriceUpdate(handlePriceUpdate);

    // Cleanup
    return () => {
      tradingViewWebSocket.removePriceUpdateCallback(handlePriceUpdate);
      tradingViewWebSocket.unsubscribe([symbol]);
      tradingViewWebSocket.disconnect();
    };
  }, [symbol]);

  return (
    <div className="flex flex-col h-full w-full bg-widget-body overflow-hidden" style={{ minHeight: 0 }}>
      <WidgetHeader
        title="Percent Monthly Targets"
        subtitle={`[${getSymbolShortFormat(symbol)}]`}
        onRemove={onRemove}
        onSettings={() => setShowSettings(true)}
        onFullscreen={onFullscreen}
        helpContent="Visualize percent monthly targets on price charts. This widget helps identify key monthly percentage levels for trading analysis."
      />

      <div className="flex-1 relative overflow-hidden">
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
        <div ref={chartContainerRef} className="w-full h-full" />

      </div>

      <WidgetSettingsSlideIn
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        widgetType="percent-monthly-targets"
        widgetPosition={wgid}
        widgetInstanceId={wgid}
        currentSettings={widgetSettings}
        onSave={handleSaveSettings}
      />
    </div>
  );
}
