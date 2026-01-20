"use client";

import React, { useEffect, useRef, useState } from 'react';
import { WidgetHeader } from '@/components/bloomberg-ui/WidgetHeader';
import { X, Check, Activity } from 'lucide-react';
import { getAuthToken } from '@/utils/api';

interface Props { 
  onRemove?: () => void;
  onSettings?: () => void;
  onFullscreen?: () => void;
  settings?: Record<string, unknown>;
}

type HeatmapType = 'stocks' | 'crypto' | 'etf';

interface HeatmapConfig {
  locale?: string;
  colorTheme?: 'light' | 'dark';
  exchanges?: string[];
  [key: string]: unknown;
}

interface HeatmapApiResponse {
  status: string;
  message: string;
  module: string;
  data: {
    scriptSrc: string;
    config: {
      locale?: string;
      colorTheme?: 'light' | 'dark';
      exchanges?: string[];
      [key: string]: unknown;
    };
    availableLocales?: string[] | { value: string; label: string }[];
    availableExchanges?: string[];
    availableThemes?: ('light' | 'dark')[];
    linkText?: string;
    linkUrl?: string;
  };
}

// API function to fetch heatmap config
async function fetchHeatmapConfig(module: 'Crypto' | 'Stocks' | 'ETF'): Promise<{ 
  config: HeatmapConfig; 
  scriptSrc?: string;
  availableLocales?: string[] | { value: string; label: string }[];
  availableExchanges?: string[];
  availableThemes?: ('light' | 'dark')[];
}> {
  try {
    // Token not required on client; proxy route reads cookie server-side
    console.log(`📊 [StockHeatmap] Fetching config for module: ${module}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    let response: Response;
    try {
      response = await fetch('/api/pmt/heatmap-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ module }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      // Handle different types of fetch errors
      if (fetchError.name === 'AbortError') {
        console.warn(`⏱️ [StockHeatmap] Config fetch timeout for ${module}, using defaults`);
        return { config: {} };
      }
      
      if (fetchError instanceof TypeError && fetchError.message === 'Failed to fetch') {
        // Network error (CORS, offline, etc.) - this is expected in some cases
        console.warn(`🌐 [StockHeatmap] Network error fetching config for ${module} (possibly CORS or offline), using defaults. Error:`, fetchError.message);
        return { config: {} };
      }
      
      // Other errors
      console.warn(`⚠️ [StockHeatmap] Fetch error for ${module}:`, fetchError.message || fetchError);
      return { config: {} };
    }

    if (!response.ok) {
      // HTTP error response
      const errorText = await response.text().catch(() => 'Unknown error');
      console.warn(`⚠️ [StockHeatmap] HTTP ${response.status} error fetching config for ${module}: ${errorText}`);
      return { config: {} };
    }

    let apiResponse: HeatmapApiResponse;
    try {
      apiResponse = await response.json();
    } catch (jsonError) {
      console.warn(`⚠️ [StockHeatmap] Failed to parse JSON response for ${module}, using defaults`);
      return { config: {} };
    }
    
    if (apiResponse.status === 'success' && apiResponse.data) {
      console.log(`✅ [StockHeatmap] Successfully loaded config for ${module}`);
      return {
        config: apiResponse.data.config || {},
        scriptSrc: apiResponse.data.scriptSrc,
        availableLocales: apiResponse.data.availableLocales,
        availableExchanges: apiResponse.data.availableExchanges,
        availableThemes: apiResponse.data.availableThemes,
      };
    }
    
    console.warn(`⚠️ [StockHeatmap] Config response for ${module} had no success status or data, using defaults`);
    return { config: {} };
  } catch (error: any) {
    // Unexpected errors
    console.warn(`⚠️ [StockHeatmap] Unexpected error fetching config for ${module}:`, error?.message || error);
    return { config: {} };
  }
}

export function StockHeatmapWidget({ 
  onRemove,
  onSettings,
  onFullscreen
}: Props) {
  const [heatmapType, setHeatmapType] = useState<HeatmapType>('stocks');
  const [showSettings, setShowSettings] = useState(false);
  const tradingViewRef = useRef<HTMLDivElement>(null);
  
  // Config state
  const [config, setConfig] = useState<HeatmapConfig>({});
  const [scriptSrc, setScriptSrc] = useState<string | undefined>();
  const [locale, setLocale] = useState<string>('en');
  const [colorTheme, setColorTheme] = useState<'light' | 'dark'>('dark');
  const [exchanges, setExchanges] = useState<string[]>([]);
  const [availableExchanges, setAvailableExchanges] = useState<string[]>([]);
  const [availableLocales, setAvailableLocales] = useState<Array<string | { value: string; label: string }>>([]);
  const [availableThemes, setAvailableThemes] = useState<('light' | 'dark')[]>(['dark', 'light']);
  const [blockSize, setBlockSize] = useState<string>('market_cap_basic');
  const [blockColor, setBlockColor] = useState<string>('change');
  const [isZoomEnabled, setIsZoomEnabled] = useState<boolean>(true);
  const [hasSymbolTooltip, setHasSymbolTooltip] = useState<boolean>(true);
  const [isMonoSize, setIsMonoSize] = useState<boolean>(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  // Fetch config when heatmap type changes
  useEffect(() => {
    const moduleMap: Record<HeatmapType, 'Crypto' | 'Stocks' | 'ETF'> = {
      stocks: 'Stocks',
      crypto: 'Crypto',
      etf: 'ETF',
    };

    const module = moduleMap[heatmapType];
    setIsLoadingConfig(true);
    
    fetchHeatmapConfig(module).then(({ 
      config: fetchedConfig, 
      scriptSrc: fetchedScriptSrc,
      availableLocales: fetchedLocales,
      availableExchanges: fetchedExchanges,
      availableThemes: fetchedThemes,
    }) => {
      setConfig(fetchedConfig);
      if (fetchedScriptSrc) {
        setScriptSrc(fetchedScriptSrc);
      }
      
      // Set available options from API
      if (fetchedLocales && fetchedLocales.length > 0) {
        setAvailableLocales(fetchedLocales);
      }
      if (fetchedExchanges && fetchedExchanges.length > 0) {
        setAvailableExchanges(fetchedExchanges);
      }
      if (fetchedThemes && fetchedThemes.length > 0) {
        setAvailableThemes(fetchedThemes);
      }
      
      // Update state with config values
      if (fetchedConfig.locale) {
        setLocale(fetchedConfig.locale);
      }
      if (fetchedConfig.colorTheme) {
        setColorTheme(fetchedConfig.colorTheme);
      }
      if (fetchedConfig.exchanges) {
        setExchanges(Array.isArray(fetchedConfig.exchanges) ? fetchedConfig.exchanges : []);
      }
      if (fetchedConfig.blockSize) {
        setBlockSize(fetchedConfig.blockSize as string);
      }
      if (fetchedConfig.blockColor) {
        setBlockColor(fetchedConfig.blockColor as string);
      }
      if (typeof fetchedConfig.isZoomEnabled !== 'undefined') {
        setIsZoomEnabled(fetchedConfig.isZoomEnabled as boolean);
      }
      if (typeof fetchedConfig.hasSymbolTooltip !== 'undefined') {
        setHasSymbolTooltip(fetchedConfig.hasSymbolTooltip as boolean);
      }
      if (typeof fetchedConfig.isMonoSize !== 'undefined') {
        setIsMonoSize(fetchedConfig.isMonoSize as boolean);
      }
      
      // Set defaults if not provided by API
      if (!fetchedConfig.blockSize) {
        if (module === 'Stocks') {
          setBlockSize('market_cap_basic');
        } else if (module === 'Crypto') {
          setBlockSize('market_cap_calc');
        } else if (module === 'ETF') {
          setBlockSize('volume');
        }
      }
      if (!fetchedConfig.blockColor) {
        if (module === 'Crypto') {
          setBlockColor('24h_close_change|5');
        } else {
          setBlockColor('change');
        }
      }
      
      setIsLoadingConfig(false);
    }).catch(() => {
      setIsLoadingConfig(false);
    });
  }, [heatmapType]);

  // Configuration for each heatmap type
  const getHeatmapConfig = () => {
    const baseConfigs = {
      stocks: {
        scriptSrc: "https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js",
        config: {
          "dataSource": "SPX500",
          "blockSize": blockSize,
          "blockColor": blockColor,
          "grouping": "sector",
          "locale": locale,
          "symbolUrl": "",
          "colorTheme": colorTheme,
          "exchanges": exchanges,
          "hasTopBar": false,
          "isDataSetEnabled": false,
          "isZoomEnabled": isZoomEnabled,
          "hasSymbolTooltip": hasSymbolTooltip,
          "isMonoSize": isMonoSize,
          "width": "100%",
          "height": "100%"
        }
      },
      crypto: {
        scriptSrc: "https://s3.tradingview.com/external-embedding/embed-widget-crypto-coins-heatmap.js",
        config: {
          "dataSource": "Crypto",
          "blockSize": blockSize,
          "blockColor": blockColor,
          "locale": locale,
          "symbolUrl": "",
          "colorTheme": colorTheme,
          "hasTopBar": false,
          "isDataSetEnabled": false,
          "isZoomEnabled": isZoomEnabled,
          "hasSymbolTooltip": hasSymbolTooltip,
          "isMonoSize": isMonoSize,
          "width": "100%",
          "height": "100%"
        }
      },
      etf: {
        scriptSrc: "https://s3.tradingview.com/external-embedding/embed-widget-etf-heatmap.js",
        config: {
          "dataSource": "AllUSEtf",
          "blockSize": blockSize,
          "blockColor": blockColor,
          "grouping": "asset_class",
          "locale": locale,
          "symbolUrl": "",
          "colorTheme": colorTheme,
          "hasTopBar": false,
          "isDataSetEnabled": false,
          "isZoomEnabled": isZoomEnabled,
          "hasSymbolTooltip": hasSymbolTooltip,
          "isMonoSize": isMonoSize,
          "width": "100%",
          "height": "100%"
        }
      }
    };

    const baseConfig = baseConfigs[heatmapType];
    
    // Use API scriptSrc if available, otherwise use default
    const finalScriptSrc = scriptSrc || baseConfig.scriptSrc;
    
    // Merge API config with user-selected settings (user settings take precedence)
    const finalConfig = {
      ...config,
      ...baseConfig.config,
      locale,
      colorTheme,
      exchanges,
    };

    return {
      scriptSrc: finalScriptSrc,
      config: finalConfig,
    };
  };

  // Initialize TradingView widget
  useEffect(() => {
    if (!tradingViewRef.current || isLoadingConfig) return;

    // Clear ALL previous widget content
    tradingViewRef.current.innerHTML = '';
    
    // Create fresh container for widget
    const widgetContainer = document.createElement("div");
    widgetContainer.className = "tradingview-widget-container__widget";
    tradingViewRef.current.appendChild(widgetContainer);

    const config = getHeatmapConfig();

    const script = document.createElement("script");
    script.src = config.scriptSrc;
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify(config.config);
    tradingViewRef.current.appendChild(script);

    return () => {
      // Cleanup is handled by clearing innerHTML on next render
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heatmapType, locale, colorTheme, exchanges, blockSize, blockColor, isZoomEnabled, hasSymbolTooltip, isMonoSize, isLoadingConfig]);

  return (
    <div className="relative h-full w-full overflow-hidden" data-heatmap-container>
      {/* Backdrop - Click to Close */}
      {showSettings && (
        <div
          className="absolute inset-0 z-40 transition-opacity duration-500"
          onClick={() => setShowSettings(false)}
        />
      )}
      
      {/* Content with Blur Effect */}
      <div className={`h-full w-full transition-all duration-500 ${showSettings ? 'blur-sm' : 'blur-0'}`}>
        <div className="flex flex-col h-full bg-widget-body border border-border rounded-none overflow-hidden">
          <WidgetHeader
            title={heatmapType === 'stocks' ? 'Stock Heatmap' : heatmapType === 'crypto' ? 'Crypto Heatmap' : 'ETF Heatmap'}
            onRemove={onRemove}
            onSettings={() => setShowSettings(true)}
            onFullscreen={onFullscreen}
            helpContent={`Real-time ${heatmapType} heatmap by TradingView. Shows ${heatmapType === 'stocks' ? 'S&P 500 stocks grouped by sector' : heatmapType === 'crypto' ? 'cryptocurrencies' : 'ETFs grouped by asset class'}, sized by market cap, colored by price change.`}
          />

          <div className="flex-1 overflow-hidden relative">
            <div className="tradingview-widget-container" ref={tradingViewRef} style={{ width: '100%', height: '100%' }}>
              <div className="tradingview-widget-container__widget"></div>
            </div>
            <style jsx global>{`
              .tradingview-widget-container {
                width: 100%;
                height: 100%;
              }
              .tradingview-widget-container__widget {
                width: 100%;
                height: 100%;
              }
              .tradingview-widget-copyright {
                display: none !important;
              }
            `}</style>
          </div>
        </div>
      </div>

      {/* Slide-in Settings Panel */}
      <div
        className={`absolute top-0 right-0 h-full w-[360px] bg-card border-l border-border z-50 transition-all duration-500 ease-in-out ${
          showSettings ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
        }`}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border bg-widget-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <h3 className="text-base text-foreground font-semibold">Settings</h3>
            </div>
            <button
              className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-none hover:bg-muted transition-colors"
              onClick={() => setShowSettings(false)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {heatmapType === 'stocks' ? 'Stock Heatmap' : heatmapType === 'crypto' ? 'Crypto Heatmap' : 'ETF Heatmap'}
          </p>
        </div>

        {/* Content */}
        <div className="h-[calc(100%-120px)] overflow-y-auto p-4">
          <div className="space-y-3">
            <button
              onClick={() => { setHeatmapType('stocks'); }}
              className={`w-full p-5 rounded-none border transition-all duration-200 ${
                heatmapType === 'stocks' 
                  ? 'border-primary bg-primary/10 shadow-lg' 
                  : 'border-border bg-background hover:border-primary/50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className={`text-base font-bold mb-1 ${heatmapType === 'stocks' ? 'text-primary' : 'text-foreground'}`}>
                    Stock Heatmap
                  </div>
                  <div className="text-sm text-muted-foreground">
                    S&P 500 stocks grouped by sector
                  </div>
                </div>
                {heatmapType === 'stocks' && (
                  <Check className="w-5 h-5 text-primary flex-shrink-0 ml-4" />
                )}
              </div>
            </button>

            <button
              onClick={() => { setHeatmapType('crypto'); }}
              className={`w-full p-5 rounded-none border transition-all duration-200 ${
                heatmapType === 'crypto' 
                  ? 'border-primary bg-primary/10 shadow-lg' 
                  : 'border-border bg-background hover:border-primary/50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className={`text-base font-bold mb-1 ${heatmapType === 'crypto' ? 'text-primary' : 'text-foreground'}`}>
                    Crypto Heatmap
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Cryptocurrencies sized by market cap
                  </div>
                </div>
                {heatmapType === 'crypto' && (
                  <Check className="w-5 h-5 text-primary flex-shrink-0 ml-4" />
                )}
              </div>
            </button>

            <button
              onClick={() => { setHeatmapType('etf'); }}
              className={`w-full p-5 rounded-none border transition-all duration-200 ${
                heatmapType === 'etf' 
                  ? 'border-primary bg-primary/10 shadow-lg' 
                  : 'border-border bg-background hover:border-primary/50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className={`text-base font-bold mb-1 ${heatmapType === 'etf' ? 'text-primary' : 'text-foreground'}`}>
                    ETF Heatmap
                  </div>
                  <div className="text-sm text-muted-foreground">
                    ETFs grouped by asset class
                  </div>
                </div>
                {heatmapType === 'etf' && (
                  <Check className="w-5 h-5 text-primary flex-shrink-0 ml-4" />
                )}
              </div>
            </button>

            {/* Divider */}
            <div className="my-4 border-t border-border"></div>

            {/* Configuration Options */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Language
                </label>
                <select
                  value={locale}
                  onChange={(e) => setLocale(e.target.value)}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-none text-foreground text-base focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {availableLocales.length > 0 ? (
                    // Use API-provided locales
                    availableLocales.map((localeOption) => {
                      if (typeof localeOption === 'string') {
                        const labels: Record<string, string> = {
                          en: 'English', es: 'Spanish', fr: 'French', de: 'German',
                          it: 'Italian', ru: 'Russian', ja: 'Japanese', zh: 'Chinese',
                          ko: 'Korean', pt: 'Portuguese', ar: 'Arabic', tr: 'Turkish',
                          vi: 'Vietnamese', th: 'Thai',
                        };
                        return (
                          <option key={localeOption} value={localeOption}>
                            {labels[localeOption] || localeOption}
                          </option>
                        );
                      } else {
                        return (
                          <option key={localeOption.value} value={localeOption.value}>
                            {localeOption.label}
                          </option>
                        );
                      }
                    })
                  ) : (
                    // Fallback to default locales if API doesn't provide them
                    <>
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="it">Italian</option>
                      <option value="ru">Russian</option>
                      <option value="ja">Japanese</option>
                      <option value="zh">Chinese</option>
                      <option value="ko">Korean</option>
                      <option value="pt">Portuguese</option>
                      <option value="ar">Arabic</option>
                      <option value="tr">Turkish</option>
                      <option value="vi">Vietnamese</option>
                      <option value="th">Thai</option>
                    </>
                  )}
                </select>
              </div>

              {/* <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Color Theme
                </label>
                <div className="flex gap-2">
                  {availableThemes.map((theme) => (
                    <button
                      key={theme}
                      onClick={() => setColorTheme(theme)}
                      className={`flex-1 px-4 py-2.5 rounded-none border transition-all duration-200 text-base font-medium ${
                        colorTheme === theme
                          ? 'border-primary bg-primary/10 text-primary font-semibold'
                          : 'border-border bg-background text-foreground hover:border-primary/50'
                      }`}
                    >
                      {theme.charAt(0).toUpperCase() + theme.slice(1)}
                    </button>
                  ))}
                </div>
              </div> */}

              {heatmapType === 'stocks' && availableExchanges.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Exchanges
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-border rounded-none p-2">
                    {availableExchanges.map((exchange) => (
                      <label key={exchange} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded-none">
                        <input
                          type="checkbox"
                          checked={exchanges.includes(exchange)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setExchanges([...exchanges, exchange]);
                            } else {
                              setExchanges(exchanges.filter((ex) => ex !== exchange));
                            }
                          }}
                          className="rounded-none border-border text-primary focus:ring-primary"
                        />
                        <span className="text-base text-foreground">{exchange}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Block Size */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Block Size
                </label>
                <select
                  value={blockSize}
                  onChange={(e) => setBlockSize(e.target.value)}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-none text-foreground text-base focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {heatmapType === 'stocks' && (
                    <>
                      <option value="market_cap_basic">Market Cap</option>
                      <option value="volume">Volume</option>
                    </>
                  )}
                  {heatmapType === 'crypto' && (
                    <>
                      <option value="market_cap_calc">Market Cap</option>
                      <option value="volume">Volume</option>
                    </>
                  )}
                  {heatmapType === 'etf' && (
                    <>
                      <option value="volume">Volume</option>
                      <option value="market_cap_basic">Market Cap</option>
                    </>
                  )}
                </select>
              </div>

              {/* Block Color */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Block Color
                </label>
                <select
                  value={blockColor}
                  onChange={(e) => setBlockColor(e.target.value)}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-none text-foreground text-base focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {heatmapType === 'stocks' && (
                    <>
                      <option value="change">Price Change</option>
                      <option value="change_percent">Change %</option>
                    </>
                  )}
                  {heatmapType === 'crypto' && (
                    <>
                      <option value="24h_close_change|5">24h Change</option>
                      <option value="change">Price Change</option>
                    </>
                  )}
                  {heatmapType === 'etf' && (
                    <>
                      <option value="change">Price Change</option>
                      <option value="change_percent">Change %</option>
                    </>
                  )}
                </select>
              </div>

              {/* Display Options */}
              <div className="space-y-3 pt-2 border-t border-border">
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Display Options
                </label>
                
                <label className="flex items-center justify-between cursor-pointer p-2 rounded-none hover:bg-muted/50">
                  <span className="text-base text-foreground">Enable Zoom</span>
                  <input
                    type="checkbox"
                    checked={isZoomEnabled}
                    onChange={(e) => setIsZoomEnabled(e.target.checked)}
                    className="rounded-none border-border text-primary focus:ring-primary"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-2 rounded-none hover:bg-muted/50">
                  <span className="text-base text-foreground">Show Tooltips</span>
                  <input
                    type="checkbox"
                    checked={hasSymbolTooltip}
                    onChange={(e) => setHasSymbolTooltip(e.target.checked)}
                    className="rounded-none border-border text-primary focus:ring-primary"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-2 rounded-none hover:bg-muted/50">
                  <span className="text-base text-foreground">Equal Size Blocks</span>
                  <input
                    type="checkbox"
                    checked={isMonoSize}
                    onChange={(e) => setIsMonoSize(e.target.checked)}
                    className="rounded-none border-border text-primary focus:ring-primary"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StockHeatmapWidget;

