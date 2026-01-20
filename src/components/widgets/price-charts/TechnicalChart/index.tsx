/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useRef, useState } from "react";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import { WidgetSettingsSlideIn, WidgetSettings } from "@/components/bloomberg-ui/WidgetSettingsSlideIn";
import { datafeed } from "../TradingViewWidget/datafeed";
import { getSymbolShortFormat } from "@/utils/symbolMapping";
import { useTheme } from "@/hooks/useTheme";
import { useDateFormat } from "@/hooks/useDateFormat";

type Timeframe = "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d" | "1w" | "1M";
type AssetModule = "Forex" | "Commodities" | "Indices";

// Map timeframe to TradingView resolution (API format)
const timeframeToResolution: Record<Timeframe, string> = {
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

interface Props {
    symbol?: string;
    module?: string;
    wgid?: string;
    onRemove?: () => void;
    onSettings?: () => void;
    onFullscreen?: () => void;
    settings?: WidgetSettings;
    onSaveSettings?: (settings: WidgetSettings) => void;
}

export default function TechnicalChart({
    symbol: propSymbol = "EURUSD",
    module: propModule = "Forex",
    wgid = "price-chart-1",
    onRemove,
    onSettings: onSettingsProp,
    onFullscreen,
    settings: externalSettings,
    onSaveSettings,
}: Props) {
    const { isDark } = useTheme();
    const { dateFormat } = useDateFormat();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const widgetRef = useRef<any>(null);
    const dateFormatRef = useRef(dateFormat);
    
    // Update dateFormatRef whenever preferences change
    useEffect(() => {
        dateFormatRef.current = dateFormat;
    }, [dateFormat]);
    
    // Generate unique container ID based on wgid
    const containerId = `tradingview_${wgid.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    // Get the symbol to use - prioritize externalSettings, then propSymbol
    // This ensures we use the correct symbol from the database
    const effectiveSymbol = externalSettings?.symbol || propSymbol;
    const effectiveModule = externalSettings?.module || propModule;
    
    console.log('📊 [TechnicalChart] Initializing widget with:', { 
        wgid, 
        containerId, 
        propSymbol, 
        propModule, 
        'externalSettings?.symbol': externalSettings?.symbol,
        'externalSettings?.module': externalSettings?.module,
        effectiveSymbol,
        effectiveModule,
        externalSettings 
    });

    const [showSettings, setShowSettings] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Initialize widget settings - use effectiveSymbol/effectiveModule to ensure database values are used
    const [widgetSettings, setWidgetSettings] = useState<WidgetSettings>(() => ({
        ...externalSettings,
        module: effectiveModule,
        symbol: effectiveSymbol,
        timeframe: externalSettings?.timeframe || "1d",
        chartType: externalSettings?.chartType || "candlestick",
        showVolume: externalSettings?.showVolume ?? true,
    }));

    const selectedModule = (widgetSettings.module as AssetModule) || effectiveModule;
    const selectedSymbol = widgetSettings.symbol || effectiveSymbol;
    const selectedTimeframe = (widgetSettings.timeframe as Timeframe) || "1d";
    const showVolume = widgetSettings.showVolume ?? true;

    // Sync with external settings when they change
    // This ensures that when the dashboard loads saved settings, the widget updates
    useEffect(() => {
        if (externalSettings) {
            console.log(`📊 [TechnicalChart ${wgid}] External settings changed:`, externalSettings);
            setWidgetSettings((prev) => {
                const newSettings = { 
                    ...prev, 
                    ...externalSettings,
                    // Ensure symbol is always set from externalSettings if available
                    symbol: externalSettings.symbol || prev.symbol,
                    module: externalSettings.module || prev.module,
                };
                console.log(`📊 [TechnicalChart ${wgid}] Updated widgetSettings:`, newSettings);
                return newSettings;
            });
        }
    }, [externalSettings, wgid]);

    const handleOpenSettings = () => setShowSettings(true);
    const handleCloseSettings = () => setShowSettings(false);

    const handleSaveSettings = async (newSettings: WidgetSettings) => {
        const prevSettings = widgetSettings;
        setWidgetSettings(newSettings);

        if (widgetRef.current) {
            try {
                if (newSettings.symbol && newSettings.symbol !== prevSettings.symbol) {
                    widgetRef.current.activeChart().setSymbol(newSettings.symbol);
                }

                if (newSettings.timeframe && newSettings.timeframe !== prevSettings.timeframe) {
                    const res = timeframeToResolution[(newSettings.timeframe as Timeframe) || "1d"];
                    widgetRef.current.activeChart().setResolution(res);
                }

                // Handle chart type changes
                if (newSettings.chartType && newSettings.chartType !== prevSettings.chartType) {
                    const chart = widgetRef.current.activeChart();
                    // TradingView SeriesStyle enum: Bars = 0, Candles = 1, Line = 2, Area = 3
                    const styleMap: Record<string, number> = {
                        candlestick: 1,
                        line: 2,
                        area: 3,
                    };
                    const seriesStyle = styleMap[newSettings.chartType || "candlestick"] || 1;
                    chart.setChartType(seriesStyle);
                }

                // Handle volume visibility
                if (newSettings.showVolume !== prevSettings.showVolume) {
                    const chart = widgetRef.current.activeChart();
                    const studies = chart.getAllStudies?.() || [];
                    const volumeStudy = studies.find((s: any) => 
                        (s?.name || "").toLowerCase().includes("volume")
                    );

                    if (newSettings.showVolume && !volumeStudy) {
                        chart.createStudy("Volume", false, false);
                    } else if (!newSettings.showVolume && volumeStudy) {
                        chart.removeEntity(volumeStudy.id);
                    }
                }
            } catch (e) {
                console.error('Error applying settings:', e);
            }
        }

        // Notify parent component
        if (onSaveSettings) {
            console.log('📤 [PriceChart] Calling onSaveSettings callback with settings:', newSettings);
            onSaveSettings(newSettings);
        } else {
            console.warn('⚠️ [PriceChart] onSaveSettings callback is not provided!');
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
                console.log(`📊 [TechnicalChart ${wgid}] Initializing chart with symbol: ${selectedSymbol}, timeframe: ${selectedTimeframe}`);
                const resolution = timeframeToResolution[selectedTimeframe] || "D";
                const disabledFeatures = [
                    "use_localstorage_for_settings",
                    "header_symbol_search",
                    "header_compare",
                    "header_widget",
                    "timeframes_toolbar",
                    "left_toolbar",
                ];

                if (!showVolume) {
                    disabledFeatures.push("create_volume_indicator_by_default");
                }

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
                    enabled_features: [
                        "study_templates",
                        "header_chart_type",
                        "chart_style_hilo",
                        "items_favoriting",
                    ],
                    charts_storage_url: undefined,
                    charts_storage_api_version: "1.1",
                    // Use unique client_id and user_id per widget instance to prevent state conflicts
                    client_id: `pmt-platform-${containerId}`,
                    user_id: `user-${containerId}`,
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

                console.log(`📊 [TechnicalChart ${wgid}] Creating TradingView widget with options:`, { symbol: selectedSymbol, interval: resolution, client_id: widgetOptions.client_id });
                widgetRef.current = new (window as any).TradingView.widget(widgetOptions);

                widgetRef.current.onChartReady(() => {
                    console.log(`📊 [TechnicalChart ${wgid}] Chart ready, loaded symbol: ${selectedSymbol}`);
                    setLoading(false);
                    setError(null);

                    try {
                        const chart = widgetRef.current.activeChart();
                        
                        // Set chart type
                        const styleMap: Record<string, number> = {
                            candlestick: 1,
                            line: 2,
                            area: 3,
                        };
                        const chartType = widgetSettings.chartType || "candlestick";
                        const seriesStyle = styleMap[chartType] || 1;
                        chart.setChartType(seriesStyle);

                    } catch (e) {
                        console.error('Error setting chart type:', e);
                    }
                });
            } catch (e) {
                console.error('Error initializing chart:', e);
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
            console.log(`📊 [TechnicalChart ${wgid}] Cleaning up widget`);
            if (widgetRef.current) {
                try {
                    widgetRef.current.remove();
                } catch (_) {
                    // Ignore
                }
                widgetRef.current = null;
            }
        };
    }, [isDark, selectedSymbol, selectedTimeframe, showVolume, widgetSettings.chartType, wgid, containerId]);

    const fullSymbolName = getSymbolShortFormat(selectedSymbol);

    return (
        <div className="relative flex flex-col h-full bg-widget-body overflow-hidden border border-border">
            <WidgetHeader
                title="Price Chart"
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
                            onClick={() => {
                                const newSettings = { ...widgetSettings, timeframe: timeframeOption.value as Timeframe };
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
                widgetType="price-chart"
                widgetPosition={wgid || "price-chart-1"}
                widgetInstanceId={wgid}
                currentSettings={widgetSettings}
                onSave={handleSaveSettings}
            />

            {/* Chart container */}
            <div className="flex-1 relative">
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
                <div ref={containerRef} id={containerId} className="w-full h-full" />
            </div>
        </div>
    );
}
