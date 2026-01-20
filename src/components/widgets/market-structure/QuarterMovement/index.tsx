/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import { WidgetSettingsSlideIn, type WidgetSettings } from "@/components/bloomberg-ui/WidgetSettingsSlideIn";
import { datafeed } from "@/components/widgets/price-charts/TradingViewWidget/datafeed";
import { useTheme } from "@/hooks/useTheme";
import { useTemplates } from "@/hooks/useTemplates";
import { fetchQuarterByDate, fetchQuarterByRange, type QuarterMovementData, type QuarterData } from "./api";
import tradingViewWebSocket from "@/utils/tradingViewWebSocket";
import { TrendingUp, TrendingDown } from "lucide-react";
import { widgetDataCache } from "@/lib/widgetDataCache";

type Timeframe = "1h" | "4h" | "1d" | "1w";

const timeframeToResolution: Record<Timeframe, string> = {
  "1h": "60",
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

// Helper to get quarter info for a given date
function getQuarterInfo(date: Date): { quarterNumber: number; quarterStartDate: string; prevQuarterEndDate: string } {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  if (month >= 1 && month <= 3) {
    return {
      quarterNumber: 1,
      quarterStartDate: `${year}-01-01`,
      prevQuarterEndDate: `${year - 1}-12`,
    };
  } else if (month >= 4 && month <= 6) {
    return {
      quarterNumber: 2,
      quarterStartDate: `${year}-04-01`,
      prevQuarterEndDate: `${year}-03`,
    };
  } else if (month >= 7 && month <= 9) {
    return {
      quarterNumber: 3,
      quarterStartDate: `${year}-07-01`,
      prevQuarterEndDate: `${year}-06`,
    };
  } else {
    return {
      quarterNumber: 4,
      quarterStartDate: `${year}-10-01`,
      prevQuarterEndDate: `${year}-09`,
    };
  }
}

// Get quarter end date
function getQuarterEndDate(year: number, quarterNumber: number): string {
  switch (quarterNumber) {
    case 1: return `${year}-03-31`;
    case 2: return `${year}-06-30`;
    case 3: return `${year}-09-30`;
    case 4: return `${year}-12-31`;
    default: return `${year}-12-31`;
  }
}

export default function QuarterMovementWidget({
  wgid = "quarter-movement",
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
  const shapeIdsRef = useRef<string[]>([]);
  const quarterDataRef = useRef<QuarterData[]>([]);
  const hasInitializedRef = useRef<boolean>(false);
  const lastSymbolRef = useRef<string>('');

  const [showSettings, setShowSettings] = useState(false);
  const [quarterData, setQuarterData] = useState<QuarterMovementData | null>(null);

  const [widgetSettings, setWidgetSettings] = useState<WidgetSettings>(() => ({
    module: externalSettings?.module || propModule,
    symbol: externalSettings?.symbol || propSymbol,
    timeframe: externalSettings?.timeframe || "1d",
    ...externalSettings,
  }));

  const selectedSymbol = widgetSettings.symbol || propSymbol;
  const selectedTimeframe = (widgetSettings.timeframe as Timeframe) || "1d";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (externalSettings) {
      setWidgetSettings((prev) => ({ ...prev, ...externalSettings }));
    }
  }, [externalSettings]);

  // Fetch data for multiple quarters
  const fetchAllQuartersData = async (): Promise<QuarterData[]> => {
    // Check cache first
    const cacheKey = widgetDataCache.generateKey('quartermovement', { symbol: selectedSymbol });
    const cachedData = widgetDataCache.get<QuarterData[]>(cacheKey);
    if (cachedData) {
      console.log('✅ [QuarterMovement] Using cached data');
      return cachedData;
    }

    const quarters: QuarterData[] = [];
    const now = new Date();
    
    // Fetch last 4 quarters + current quarter (5 total)
    for (let i = 0; i < 5; i++) {
      try {
        // Calculate the date for this quarter
        const targetDate = new Date(now);
        targetDate.setMonth(targetDate.getMonth() - (i * 3));
        
        const { quarterNumber, quarterStartDate, prevQuarterEndDate } = getQuarterInfo(targetDate);
        const year = targetDate.getFullYear();
        
        // Determine the end date for the range query
        const isCurrentQuarter = i === 0;
        const quarterEndDate = isCurrentQuarter 
          ? `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`
          : getQuarterEndDate(year, quarterNumber);

        console.log(`📅 [QuarterMovement] Fetching Q${quarterNumber} ${year}:`, { quarterStartDate, quarterEndDate, prevQuarterEndDate });

        // Fetch current quarter close price (or end of quarter close for past quarters)
        const endMonthDate = isCurrentQuarter 
          ? `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`
          : `${year}-${(quarterNumber * 3).toString().padStart(2, '0')}`;
        
        const currentMonthData = await fetchQuarterByDate(selectedSymbol, endMonthDate);
        if (!currentMonthData.data || currentMonthData.data.length === 0) {
          console.warn(`⚠️ [QuarterMovement] No data for Q${quarterNumber} ${year}`);
          continue;
        }
        const close1 = currentMonthData.data[0].close;

        // Fetch previous quarter end to get the opening price
        const prevQuarterData = await fetchQuarterByDate(selectedSymbol, prevQuarterEndDate);
        if (!prevQuarterData.data || prevQuarterData.data.length === 0) {
          console.warn(`⚠️ [QuarterMovement] No prev quarter data for Q${quarterNumber} ${year}`);
          continue;
        }
        const open2 = prevQuarterData.data[0].open;

        // Calculate percentage movement
        const movement = close1 - open2;
        const movementPercent = ((close1 - open2) / open2) * 100;

        // Fetch high/low for the quarter range
        const rangeData = await fetchQuarterByRange(selectedSymbol, quarterStartDate, quarterEndDate);
        if (!rangeData.data || rangeData.data.length === 0) {
          console.warn(`⚠️ [QuarterMovement] No range data for Q${quarterNumber} ${year}`);
          continue;
        }
        const high = rangeData.data[0].high;
        const low = rangeData.data[0].low;

        const quarterInfo: QuarterData = {
          quarter: `Q${quarterNumber} ${year}`,
          startPrice: open2,
          endPrice: close1,
          high,
          low,
          movement,
          movementPercent,
          timestamp: new Date(quarterStartDate).getTime(),
          endTimestamp: new Date(quarterEndDate).getTime(),
        };

        console.log(`✅ [QuarterMovement] Q${quarterNumber} ${year}:`, quarterInfo);
        quarters.push(quarterInfo);
      } catch (err) {
        console.error(`❌ [QuarterMovement] Error fetching quarter ${i}:`, err);
      }
    }

    // Cache the result
    widgetDataCache.set(cacheKey, quarters);

    return quarters;
  };

  // Memoized fetch function
  const fetchAllQuarters = useCallback(fetchAllQuartersData, [selectedSymbol]);

  // Draw quarter boxes on the chart
  const drawQuarterBoxes = (tvWidget: any, quarters: QuarterData[]) => {
    if (!tvWidget || !chartReadyRef.current) {
      console.log('⚠️ [QuarterMovement] Cannot draw - widget not ready');
      return;
    }

    const chart = tvWidget.activeChart();
    if (!chart) {
      console.error('❌ [QuarterMovement] No active chart');
      return;
    }

    // Remove old shapes
    shapeIdsRef.current.forEach((id) => {
      try {
        chart.removeEntity(id);
      } catch {
        // Ignore
      }
    });
    shapeIdsRef.current = [];

    console.log('🎨 [QuarterMovement] Drawing', quarters.length, 'quarter boxes');

    quarters.forEach((quarter) => {
      try {
        const isPositive = quarter.movement >= 0;
        const startTime = Math.floor(quarter.timestamp / 1000);
        const endTime = Math.floor(quarter.endTimestamp / 1000);

        // For positive: low to high, for negative: high to low
        const point1Price = isPositive ? quarter.low : quarter.high;
        const point2Price = isPositive ? quarter.high : quarter.low;

        const shapeId = chart.createMultipointShape(
          [
            { time: startTime, price: point1Price },
            { time: endTime, price: point2Price },
          ],
          {
            shape: 'date_and_price_range',
            lock: true,
            disableSelection: false,
            disableSave: true,
            disableUndo: true,
            overrides: {
              linecolor: '#00000000',
              textcolor: '#FFFFFF',
              bold: true,
              fontsize: 12,
              borderWidth: 3,
              borderColor: isPositive ? '#00f01c' : '#d6170d',
              drawBorder: true,
              backgroundColor: isPositive ? '#00f01c' : '#d6170d',
              backgroundTransparency: 80,
              labelBackgroundColor: isPositive ? '#057311' : '#8a0b04',
              showPrice: true,
              showLabel: true,
              fillLabelBackground: true,
              text: `${quarter.quarter}: ${isPositive ? '+' : ''}${quarter.movementPercent.toFixed(2)}%`,
              horzLabelsAlign: 'left',
            },
          }
        );

        if (shapeId) {
          shapeIdsRef.current.push(shapeId);
          console.log(`✅ [QuarterMovement] Drew ${quarter.quarter}:`, shapeId);
        }
      } catch (e) {
        console.error('❌ [QuarterMovement] Failed to draw quarter:', quarter.quarter, e);
      }
    });
  };

  const handleSaveSettings = async (newSettings: WidgetSettings) => {
    setWidgetSettings(newSettings);

    if (widgetRef.current && chartReadyRef.current) {
      try {
        if (newSettings.symbol && newSettings.symbol !== selectedSymbol) {
          widgetRef.current.activeChart().setSymbol(newSettings.symbol);
        }
        if (newSettings.timeframe && newSettings.timeframe !== selectedTimeframe) {
          const res = timeframeToResolution[(newSettings.timeframe as Timeframe) || "1w"] || "W";
          widgetRef.current.activeChart().setResolution(res);
        }
      } catch (e) {
        console.error('❌ [QuarterMovement] Error updating chart settings:', e);
      }
    }

    // Save settings to database
    if (wgid && activeTemplateId) {
      try {
        const additionalSettings = JSON.stringify({
          timeframe: newSettings.timeframe || "1d"
        });

        const updateFields: any = {
          additionalSettings,
          module: newSettings.module || "Forex",
          symbols: newSettings.symbol || "EURUSD"
        };

        console.log('📡 [QuarterMovement] Calling updateWidgetFields API:', {
          widgetId: wgid,
          templateId: activeTemplateId,
          updateFields
        });

        const result = await updateWidgetFields(wgid, activeTemplateId, updateFields);

        if (result.success) {
          console.log('✅ [QuarterMovement] Settings saved to database');
        } else {
          console.warn('⚠️ [QuarterMovement] Failed to save settings:', result.message);
        }
      } catch (error) {
        console.error('❌ [QuarterMovement] Error saving settings to database:', error);
      }
    }
  };

  // Initialize TradingView widget
  useEffect(() => {
    if (!containerRef.current) return;

    const initWidget = () => {
      if (typeof window === "undefined") return;

      if (!(window as any).TradingView || !(window as any).TradingView.widget) {
        setTimeout(initWidget, 100);
        return;
      }

      try {
        // Always use weekly resolution ("W") for candle data as required by the API
        const resolution = "W";

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
            "volume_force_overlay",
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
            "mainSeriesProperties.showCountdown": false,
          },
          loading_screen: {
            backgroundColor: isDark ? "#0A0A0A" : "#f9fafb",
            foregroundColor: "#FFB02E",
          },
        };

        widgetRef.current = new (window as any).TradingView.widget(widgetOptions);

        widgetRef.current.onChartReady(async () => {
          console.log('📈 [QuarterMovement] Chart ready');
          chartReadyRef.current = true;
          setLoading(false);
          setError(null);

          // Remove volume study
          try {
            const chart = widgetRef.current.activeChart();
            chart.getAllStudies().forEach((study: any) => {
              if (study.name === 'Volume' || study.name.toLowerCase().includes('volume')) {
                chart.removeEntity(study.id);
              }
            });
          } catch {
            // Ignore
          }

          // Fetch and draw quarter data
          try {
            const quarters = await fetchAllQuarters();
            quarterDataRef.current = quarters;
            
            if (quarters.length > 0) {
              // Set the current quarter data for display
              const currentQuarter = quarters[0];
              setQuarterData({
                quarters,
                currentQuarter: {
                  quarter: currentQuarter.quarter,
                  startPrice: currentQuarter.startPrice,
                  currentPrice: currentQuarter.endPrice,
                  movement: currentQuarter.movement,
                  movementPercent: currentQuarter.movementPercent,
                  high: currentQuarter.high,
                  low: currentQuarter.low,
                  startTimestamp: currentQuarter.timestamp,
                },
              });

              // Draw boxes after a short delay to ensure chart is fully rendered
              setTimeout(() => {
                drawQuarterBoxes(widgetRef.current, quarters);
                
                // Set visible range to show the current quarter with some context
                try {
                  const chart = widgetRef.current.activeChart();
                  const currentQuarter = quarters[0];
                  if (currentQuarter) {
                    // Show from 3 months before quarter start to now + some padding
                    const fromTime = Math.floor(currentQuarter.timestamp / 1000) - (90 * 24 * 60 * 60);
                    const toTime = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);
                    chart.setVisibleRange({
                      from: fromTime,
                      to: toTime,
                    });
                  }
                } catch (rangeErr) {
                  console.warn('⚠️ [QuarterMovement] Could not set visible range:', rangeErr);
                }
              }, 500);
            }
          } catch (err) {
            console.error('❌ [QuarterMovement] Error fetching quarter data:', err);
          }
        });
      } catch (err) {
        console.error('❌ [QuarterMovement] Widget init error:', err);
        setError("Failed to initialize chart");
        setLoading(false);
      }
    };

    // Load TradingView library if not already loaded
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
        } catch {
          // Ignore
        }
        widgetRef.current = null;
        chartReadyRef.current = false;
        shapeIdsRef.current = [];
        hasInitializedRef.current = false;
      }
    };
  }, [selectedSymbol, selectedTimeframe, isDark]); // Remove fetchAllQuarters from dependencies

  // Listen for TradingView WebSocket price updates
  useEffect(() => {
    const handlePriceUpdate = (payload: any) => {
      // TradingView Advanced Charts handle their own real-time updates via datafeed
      // No need to manually refresh. Just log for debugging.
      const updateSymbol = String(payload.symbol || payload.Symbol || payload.S || payload.s || '').toUpperCase();
      if (updateSymbol === selectedSymbol.toUpperCase()) {
        console.log('📊 [QuarterMovement] Real-time update (handled by TradingView):', updateSymbol);
      }
    };

    // Connect to WebSocket and subscribe to symbol
    tradingViewWebSocket.connect().then(() => {
      tradingViewWebSocket.subscribe([selectedSymbol]);
      console.log('📊 [QuarterMovement] Subscribed to WebSocket for:', selectedSymbol);
    }).catch(error => {
      console.error('📊 [QuarterMovement] WebSocket connection error:', error);
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
        title="Quarter Movement"
        onRemove={onRemove}
        onSettings={() => setShowSettings(true)}
        onFullscreen={onFullscreen}
        helpContent="Visualizes quarterly price movements on the chart. Shows the start and end prices for each quarter with percentage change indicators."
      />

      <WidgetSettingsSlideIn
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        widgetType="quarter-movement"
        widgetPosition={wgid || "quarter-movement"}
        widgetInstanceId={wgid}
        currentSettings={widgetSettings}
        onSave={handleSaveSettings}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
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

        {quarterData && quarterData.quarters && quarterData.quarters.length > 0 && (
          <div className="px-4 py-3 border-t border-border max-h-48 overflow-y-auto">
            <div className="text-xs text-muted-foreground mb-2">QUARTERLY PERFORMANCE</div>
            <div className="space-y-2">
              {quarterData.quarters.map((quarter, index) => (
                <div
                  key={index}
                  className={`p-2 rounded border ${
                    quarter.movement >= 0
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-red-500/10 border-red-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">{quarter.quarter}</span>
                      <div className={`flex items-center gap-1 text-xs ${
                        quarter.movement >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {quarter.movement >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        <span>
                          {quarter.movementPercent >= 0 ? '+' : ''}
                          {quarter.movementPercent.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {quarter.startPrice.toFixed(5)} → {quarter.endPrice.toFixed(5)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
