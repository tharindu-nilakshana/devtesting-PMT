"use client";

import React, { useState, useEffect, useRef } from 'react';
import { WidgetHeader } from '@/components/bloomberg-ui/WidgetHeader';
import tradingViewWebSocket from '@/utils/tradingViewWebSocket';
import { ConnectionStatusCallback } from '@/utils/tradingViewWebSocket';
import { X, Check, Activity } from 'lucide-react';

interface Props { 
  onRemove?: () => void;
  onSettings?: () => void;
  onFullscreen?: () => void;
  settings?: Record<string, unknown>;
}

interface TickerItem {
  pair: string;
  price: number;
  change: number;
  changePercent: number;
  assetClass: AssetClass;
}

type AssetClass = 'forex' | 'commodities' | 'indices' | 'stocks';

// Common non-FX symbol lists for WS subscription
const COMMODITY_SYMBOLS = [
  'XAUUSD', // Gold
  'XAGUSD', // Silver
  'USOIL',  // WTI
  'UKOIL',  // Brent
  'XPTUSD', // Platinum
  'XPDUSD'  // Palladium
];

const INDEX_SYMBOLS = [
  'SPX500',  // S&P 500
  'NAS100',  // Nasdaq 100
  'DJI',     // Dow Jones
  'FTSE100',
  'DAX40',
  'CAC40',
  'NIKKEI225'
];

const STOCK_SYMBOLS = [
  'AAPL','MSFT','AMZN','GOOGL','META','TSLA','NVDA','JPM','XOM','NFLX'
];

// Vendor alias map (canonical -> aliases). We'll subscribe to all to maximize coverage
const ALIASES: Record<string, string[]> = {
  // Commodities
  'USOIL': ['WTI', 'OILUSD', 'CL'],
  'UKOIL': ['BRENT', 'BRN'],
  'XAUUSD': ['XAU', 'GOLD'],
  'XAGUSD': ['XAG', 'SILVER'],
  // Indices
  'SPX500': ['SPX', 'US500'],
  'NAS100': ['NDX', 'US100'],
  'DJI': ['US30', 'DJ30', 'DOW'],
  'FTSE100': ['UK100', 'FTSE'],
  'DAX40': ['DE40', 'DAX'],
  'CAC40': ['FR40', 'CAC'],
  'NIKKEI225': ['JP225', 'N225'],
  // Stocks (some feeds append .US)
  'AAPL': ['AAPL.US'],
  'MSFT': ['MSFT.US'],
  'AMZN': ['AMZN.US'],
  'GOOGL': ['GOOGL.US', 'GOOG', 'GOOG.US'],
  'META': ['META.US', 'FB', 'FB.US'],
  'TSLA': ['TSLA.US'],
  'NVDA': ['NVDA.US'],
  'JPM': ['JPM.US'],
  'XOM': ['XOM.US'],
  'NFLX': ['NFLX.US'],
};

// Feed-specific mapping (backend guidance)
// Returns an array of vendor symbols to subscribe for a given canonical symbol
const FEED_SYMBOLS = (canonical: string): string[] => {
  const up = canonical.toUpperCase();
  // Commodities
  if (up === 'UKOIL') return ['XBR/USD', 'UKOIL', 'BRENT', 'BRN']; // Brent required as XBR/USD
  if (up === 'XAUUSD') return ['XAUUSD', 'XAU', 'GOLD'];           // Gold as XAUUSD (others fallback)

  // US Stocks – temporary requirement to pass exchange prefix (e.g., NASDAQ:AAPL)
  const nasdaqSet = new Set(['AAPL','MSFT','AMZN','GOOGL','GOOG','META','TSLA','NVDA','NFLX']);
  if (nasdaqSet.has(up)) return [`NASDAQ:${up}`, `${up}`, `${up}.US`];
  // Fallback for other US stocks (JPM, XOM) – try NYSE prefix and plain
  if (STOCK_SYMBOLS.includes(up)) return [`NYSE:${up}`, `${up}`, `${up}.US`];

  // Indices – try canonical + common aliases
  if (INDEX_SYMBOLS.includes(up)) return [up, ...(ALIASES[up] || [])];

  // Commodities general fallback
  if (COMMODITY_SYMBOLS.includes(up)) return [up, ...(ALIASES[up] || [])];

  return [up];
};

// Helper to format display labels
const formatLabel = (symbol: string, cls: AssetClass): string => {
  if (cls === 'forex') {
    return symbol.slice(0,3) + '/' + symbol.slice(3);
  }
  // For others, keep symbol
  return symbol;
};

const resolveAssetClassBySymbol = (symbol: string): AssetClass => {
  const upper = symbol.toUpperCase();
  // Normalize via aliases
  const canonical = symbolToCanonical(upper);
  if (COMMODITY_SYMBOLS.includes(canonical)) return 'commodities';
  if (INDEX_SYMBOLS.includes(canonical)) return 'indices';
  if (STOCK_SYMBOLS.includes(canonical)) return 'stocks';
  if (COMMODITY_SYMBOLS.includes(upper)) return 'commodities';
  if (INDEX_SYMBOLS.includes(upper)) return 'indices';
  if (STOCK_SYMBOLS.includes(upper)) return 'stocks';
  const isFX = CURRENCY_PAIRS.some(p => p.replace('/', '').toUpperCase() === upper) || upper.length === 6;
  return isFX ? 'forex' : 'stocks';
};

const symbolToCanonical = (upper: string): string => {
  // Exact matches
  if (COMMODITY_SYMBOLS.includes(upper) || INDEX_SYMBOLS.includes(upper) || STOCK_SYMBOLS.includes(upper)) {
    return upper;
  }
  // Alias lookup
  for (const [canon, list] of Object.entries(ALIASES)) {
    if (list.map(a => a.toUpperCase()).includes(upper)) return canon;
  }
  return upper;
};

const CURRENCY_FLAGS: Record<string, string> = {
  "EUR": "🇪🇺",
  "USD": "🇺🇸",
  "JPY": "🇯🇵",
  "GBP": "🇬🇧",
  "CHF": "🇨🇭",
  "AUD": "🇦🇺",
  "CAD": "🇨🇦",
  "NZD": "🇳🇿",
  "SGD": "🇸🇬",
  "CNY": "🇨🇳",
  "HKD": "🇭🇰",
  "NOK": "🇳🇴",
  "SEK": "🇸🇪",
  "DKK": "🇩🇰",
  "ZAR": "🇿🇦",
  "MXN": "🇲🇽",
};

const CURRENCY_PAIRS = [
  "EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD", "USD/CAD",
  "NZD/USD", "EUR/GBP", "EUR/JPY", "GBP/JPY", "EUR/CHF", "AUD/JPY",
  "GBP/CHF", "EUR/AUD", "USD/SGD", "USD/CNY", "USD/HKD", "EUR/NOK",
  "USD/SEK", "USD/DKK", "USD/ZAR", "USD/MXN", "EUR/CAD", "AUD/CAD"
];

const generateInitialData = (): TickerItem[] => {
  const fx = CURRENCY_PAIRS.map(pair => {
    const price = Math.random() * 2 + 0.5;
    const changePercent = (Math.random() - 0.5) * 4;
    const change = price * (changePercent / 100);
    return { pair, price, change, changePercent, assetClass: 'forex' as AssetClass } as TickerItem;
  });
  const others: TickerItem[] = [
    ...COMMODITY_SYMBOLS.map(s => ({ pair: s, price: 0, change: 0, changePercent: 0, assetClass: 'commodities' as AssetClass } as TickerItem)),
    ...INDEX_SYMBOLS.map(s => ({ pair: s, price: 0, change: 0, changePercent: 0, assetClass: 'indices' as AssetClass } as TickerItem)),
    ...STOCK_SYMBOLS.map(s => ({ pair: s, price: 0, change: 0, changePercent: 0, assetClass: 'stocks' as AssetClass } as TickerItem)),
  ];
  return [...fx, ...others];
};

export function TickerTapeHeatmapWidget({ 
  onRemove,
  onSettings,
  onFullscreen
}: Props) {
  const [tickerData, setTickerData] = useState<TickerItem[]>(generateInitialData());
  const [flashingPairs, setFlashingPairs] = useState<Set<string>>(new Set());
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [selectedAssetClasses, setSelectedAssetClasses] = useState<AssetClass[]>(['forex']);
  const [showSettings, setShowSettings] = useState(false);
  const flashTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
  const prevPricesRef = useRef<Record<string, number>>({});
  const tickerDataMapRef = useRef<Record<string, TickerItem>>({});
  const subscribedRef = useRef<string[]>([]);
  const STORAGE_KEY = 'tickerTape.selectedAssetClasses';

  // Load saved selection on mount
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const valid = parsed.filter((v: string): v is AssetClass => ['forex','commodities','indices','stocks'].includes(v));
        if (valid.length > 0) setSelectedAssetClasses(valid);
      }
    } catch {}
  }, []);

  // Persist selection on change
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedAssetClasses));
    } catch {}
  }, [selectedAssetClasses]);

  // Convert currency pairs to WebSocket symbols
  const getForexSymbols = (): string[] => {
    return CURRENCY_PAIRS.map(pair => pair.replace('/', ''));
  };

  // Aggregate symbols for selected asset classes
  const getSelectedSymbols = (): string[] => {
    const symbols: string[] = [];
    if (selectedAssetClasses.includes('forex')) symbols.push(...getForexSymbols());
    if (selectedAssetClasses.includes('commodities')) {
      COMMODITY_SYMBOLS.forEach(c => symbols.push(...FEED_SYMBOLS(c)));
    }
    if (selectedAssetClasses.includes('indices')) {
      INDEX_SYMBOLS.forEach(c => symbols.push(...FEED_SYMBOLS(c)));
    }
    if (selectedAssetClasses.includes('stocks')) {
      STOCK_SYMBOLS.forEach(c => symbols.push(...FEED_SYMBOLS(c)));
    }
    const out = Array.from(new Set(symbols));
    console.log('[TickerTape] Selected asset classes:', selectedAssetClasses);
    console.log('[TickerTape] Canonical lists:', {
      forex: selectedAssetClasses.includes('forex') ? getForexSymbols() : [],
      commodities: selectedAssetClasses.includes('commodities') ? COMMODITY_SYMBOLS : [],
      indices: selectedAssetClasses.includes('indices') ? INDEX_SYMBOLS : [],
      stocks: selectedAssetClasses.includes('stocks') ? STOCK_SYMBOLS : [],
    });
    console.log('[TickerTape] Alias map used for subscription:', ALIASES);
    console.log('[TickerTape] Final WS subscribe list:', out);
    return out;
  };

  // Handle price updates across all classes
  const handlePriceUpdate = (data: Record<string, unknown>) => {
    try {
    const symbol = String(data.symbol || data.Symbol || data.S || '').toUpperCase();
      const price = parseFloat(String(data.price || data.Price || data.last || data.Last || data.close || data.Close || data.c || 0));
      if (!symbol || isNaN(price)) return;

    const canonical = symbolToCanonical(symbol);
    const assetClass = resolveAssetClassBySymbol(canonical);
    const labelFX = CURRENCY_PAIRS.find(p => p.replace('/', '') === canonical);
    const displayLabel = labelFX || (assetClass === 'forex' ? formatLabel(canonical, 'forex') : canonical);

    // Trace every incoming update to help verify live symbols
    try {
      const pct = prevPricesRef.current[symbol]
        ? (((price - prevPricesRef.current[symbol]) / prevPricesRef.current[symbol]) * 100).toFixed(3)
        : '0.000';
      console.log('[TickerTape] WS update:', {
        rawSymbol: symbol,
        canonical,
        assetClass,
        displayLabel,
        price,
        approxChangePct: pct + '%'
      });
    } catch {}

      const prevPrice = prevPricesRef.current[symbol] ?? price;
      const change = price - prevPrice;
      const changePercent = prevPrice !== 0 ? (change / prevPrice) * 100 : 0;
      prevPricesRef.current[symbol] = price;

      setTickerData(prevData => {
        const exists = prevData.some(it => it.pair === displayLabel);
        const updated = exists
          ? prevData.map(item => item.pair === displayLabel ? { ...item, price, change, changePercent, assetClass } : item)
          : [...prevData, { pair: displayLabel, price, change, changePercent, assetClass }];
        tickerDataMapRef.current[displayLabel] = { pair: displayLabel, price, change, changePercent, assetClass };
        return updated;
      });

      setFlashingPairs(prev => new Set(prev).add(displayLabel));
      if (flashTimeoutRef.current[displayLabel]) clearTimeout(flashTimeoutRef.current[displayLabel]);
      flashTimeoutRef.current[displayLabel] = setTimeout(() => {
        setFlashingPairs(prev => {
          const next = new Set(prev);
          next.delete(displayLabel);
          return next;
        });
      }, 400);
    } catch {}
  };

  // Helper to get items for a class from current state (fall back to symbol lists if missing)
  const getItemsForClass = (cls: AssetClass): TickerItem[] => {
    const list = tickerData.filter(it => it.assetClass === cls);
    if (list.length > 0) return list;
    // Seed fallback rows if none yet
    const seeds = cls === 'forex' ? getForexSymbols().map(s => formatLabel(s, 'forex'))
      : cls === 'commodities' ? COMMODITY_SYMBOLS
      : cls === 'indices' ? INDEX_SYMBOLS
      : STOCK_SYMBOLS;
    return seeds.map(s => ({ pair: s, price: 0, change: 0, changePercent: 0, assetClass: cls } as TickerItem));
  };

  // Unified WebSocket connect/subscribe for all selected classes
  useEffect(() => {
    const handleConnectionStatus: ConnectionStatusCallback = (status) => setConnectionStatus(status);

    const connect = async () => {
      try {
        tradingViewWebSocket.onPriceUpdate(handlePriceUpdate);
        tradingViewWebSocket.onConnectionStatus(handleConnectionStatus);
        await tradingViewWebSocket.connect();

        const newSymbols = getSelectedSymbols();
        const oldSymbols = subscribedRef.current;

        // Unsubscribe symbols that are no longer selected
        const toRemove = oldSymbols.filter(s => !newSymbols.includes(s));
        if (toRemove.length) tradingViewWebSocket.unsubscribe(toRemove);

        // Subscribe to new symbols - batching is handled by the WebSocket manager
        const toAdd = newSymbols.filter(s => !newSymbols.includes(s));
        if (toAdd.length) {
          console.log('[TickerTape] Subscribing to WS symbols:', toAdd);
          tradingViewWebSocket.subscribe(toAdd);
        }

        subscribedRef.current = newSymbols;
      } catch {
        setConnectionStatus('error');
      }
    };

    connect();

    return () => {
      Object.values(flashTimeoutRef.current).forEach(clearTimeout);
      if (subscribedRef.current.length) {
        tradingViewWebSocket.unsubscribe(subscribedRef.current);
        subscribedRef.current = [];
      }
      tradingViewWebSocket.removePriceUpdateCallback(handlePriceUpdate);
      tradingViewWebSocket.removeConnectionStatusCallback(handleConnectionStatus);
    };
  }, [selectedAssetClasses]);

  // Fallback color/number updates for non-Forex tapes when WS feed is silent
  useEffect(() => {
    const interval = setInterval(() => {
      setTickerData(prev => prev.map(item => {
        // Only touch selected non-forex classes; leave forex for real WS
        if (item.assetClass === 'forex' || !selectedAssetClasses.includes(item.assetClass)) return item;
        // Generate a small random percent move (+/- 0.1% to 0.6%)
        const sign = Math.random() < 0.5 ? -1 : 1;
        const pct = (Math.random() * 0.5 + 0.1) * sign; // percent
        const basePrice = item.price && item.price > 0 ? item.price : 1;
        const newPrice = Math.max(0.00001, basePrice * (1 + pct / 100));
        const newChange = newPrice - basePrice;
        return {
          ...item,
          price: newPrice,
          change: newChange,
          changePercent: pct,
        } as TickerItem;
      }));
    }, 1200);
    return () => clearInterval(interval);
  }, [selectedAssetClasses]);

  const formatPrice = (price: number) => {
    if (price < 1) {
      return price.toFixed(5);
    }
    return price.toFixed(4);
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-success brightness-110";
    if (change < 0) return "text-destructive brightness-110";
    return "text-muted-foreground";
  };

  const getBackgroundClass = (change: number) => {
    if (change > 0) return 'bg-up';
    if (change < 0) return 'bg-down';
    return 'bg-flat';
  };

  const getPairFlags = (pair: string) => {
    const [base, quote] = pair.split("/");
    return {
      baseFlag: CURRENCY_FLAGS[base] || "",
      quoteFlag: CURRENCY_FLAGS[quote] || "",
    };
  };

  // Single continuous ticker: one master duration and ref
  const tapeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const masterRef = useRef<HTMLDivElement | null>(null);
  const [masterDuration, setMasterDuration] = useState<number>(120);

  useEffect(() => {
    const pixelsPerSecond = 100; // tuned speed
    const measure = () => {
      const el = masterRef.current;
      if (!el) return;
      const distancePx = el.scrollWidth / 2; // duplicated content => -50%
      const duration = distancePx / pixelsPerSecond;
      setMasterDuration(Math.max(1, duration));
    };
    const raf = requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    if (masterRef.current) ro.observe(masterRef.current);
    window.addEventListener('load', measure);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('load', measure);
    };
  }, [selectedAssetClasses]);

  return (
    <div className="relative flex flex-col h-full bg-widget-body border border-border rounded-none overflow-hidden">
      {/* Backdrop - Click to Close */}
      {showSettings && (
        <div
          className="absolute inset-0 z-40 transition-opacity duration-500"
          onClick={() => setShowSettings(false)}
        />
      )}
      
      {/* Content with Blur Effect */}
      <div className={`h-full w-full transition-all duration-500 ${showSettings ? 'blur-sm' : 'blur-0'}`}>
        <WidgetHeader
          title="Ticker Tape"
          onRemove={onRemove}
          onSettings={() => setShowSettings(true)}
          onFullscreen={onFullscreen}
        helpContent="Real-time prices with percentage changes displayed in a scrolling ticker format. Supports Forex (Live), Commodities, Indices, and US Stocks."
      >
        {/* WebSocket Connection Status Indicator - only show for Forex */}
        {selectedAssetClasses.includes('forex') && (
          <div className="flex items-center gap-1 mr-2">
            <div
              className={`w-2 h-2 rounded-none ${
                connectionStatus === 'connected' ? 'bg-green-500' :
                connectionStatus === 'connecting' ? 'bg-yellow-500' :
                connectionStatus === 'error' ? 'bg-red-500' :
                'bg-gray-500'
              }`}
              title={`WebSocket: ${connectionStatus}`}
            />
            {connectionStatus === 'connected' && (
              <span className="text-xs text-green-500 hidden sm:inline">Live</span>
            )}
          </div>
        )}
      </WidgetHeader>

        <div className="flex-1 overflow-hidden relative">
          {/* Gradient overlays for fade effect */}
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-widget-body to-transparent z-10 pointer-events-none"></div>
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-widget-body to-transparent z-10 pointer-events-none"></div>
          
          {/* Single continuous ticker containing all selected tapes concatenated in one track */}
          <div className="border-t border-border/40">
            <div className="relative overflow-hidden py-3">
              <div
                ref={masterRef}
                className="ticker-scroll inline-flex items-center"
                style={{ animationDuration: `${masterDuration}s`, willChange: 'transform' }}
              >
                {selectedAssetClasses.map((cls) => {
                  const label = cls === 'forex' ? 'FOREX' : cls === 'commodities' ? 'COMMODITIES' : cls === 'indices' ? 'INDICES' : 'US STOCKS';
                  const onePass = getItemsForClass(cls).map((item, index) => {
                  const { baseFlag, quoteFlag } = item.pair.includes('/') ? getPairFlags(item.pair) : { baseFlag: '', quoteFlag: '' };
                  return (
                    <div
                      key={`${cls}-${item.pair}-${index}`}
                      className={`ticker-item flex items-center gap-3 px-4 py-2 rounded-none border border-border/40 flex-shrink-0 ${getBackgroundClass(item.change)} ${flashingPairs.has(item.pair) ? 'tapeflash' : ''}`}
                      style={{ contain: 'layout paint' }}
                    >
                      <div className="flex items-center gap-1.5">
                        {baseFlag && <span className="text-xl leading-none">{baseFlag}</span>}
                        {baseFlag && <span className="text-xs text-muted-foreground/80">/</span>}
                        {quoteFlag && <span className="text-xl leading-none">{quoteFlag}</span>}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground/90 uppercase tracking-wider font-bold" style={{fontSize: '14px'}}>
                          {item.pair}
                        </span>
                        <span className="tabular-nums font-semibold text-foreground ticker-num ticker-num-price" style={{fontFamily: 'SF Mono, Monaco, \"Cascadia Code\", \"Roboto Mono\", Consolas, \"Courier New\", monospace', fontSize: '14px'}}>
                          {formatPrice(item.price)}
                        </span>
                      </div>
                      <div className="w-px h-9 bg-border/60"></div>
                      <div className="flex flex-col items-end">
                        <span className={`tabular-nums font-semibold ticker-num ticker-num-change ${getChangeColor(item.change)}`} style={{fontFamily: 'SF Mono, Monaco, \"Cascadia Code\", \"Roboto Mono\", Consolas, \"Courier New\", monospace', fontSize: '14px'}}>
                          {item.change >= 0 ? '+' : ''}{item.change.toFixed(5)}
                        </span>
                        <span className={`tabular-nums font-semibold ticker-num ticker-num-pct ${getChangeColor(item.changePercent)}`} style={{fontFamily: 'SF Mono, Monaco, \"Cascadia Code\", \"Roboto Mono\", Consolas, \"Courier New\", monospace', fontSize: '14px'}}>
                          {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  );
                });
                  return (
                    <React.Fragment key={`${cls}-segment`}>
                      <div className="px-3 py-2 mr-1 text-xs md:text-sm font-semibold tracking-wider text-muted-foreground/80 uppercase flex-shrink-0">
                        {label}
                      </div>
                      {onePass.map((node) => React.cloneElement(node, { key: (node as any).key, className: ((node as any).props.className || '') + ' mr-1' }))}
                    </React.Fragment>
                  );
                })}
                {/* Duplicate the whole sequence for seamless looping */}
                {selectedAssetClasses.map((cls) => {
                  const label = cls === 'forex' ? 'FOREX' : cls === 'commodities' ? 'COMMODITIES' : cls === 'indices' ? 'INDICES' : 'US STOCKS';
                  const onePassDup = getItemsForClass(cls).map((item, index) => {
                    const { baseFlag, quoteFlag } = item.pair.includes('/') ? getPairFlags(item.pair) : { baseFlag: '', quoteFlag: '' };
                    return (
                      <div
                        key={`dup-${cls}-${item.pair}-${index}`}
                        className={`ticker-item flex items-center gap-3 px-4 py-2 rounded-none border border-border/40 flex-shrink-0 ${getBackgroundClass(item.change)} ${flashingPairs.has(item.pair) ? 'tapeflash' : ''}`}
                        style={{ contain: 'layout paint' }}
                      >
                        <div className="flex items-center gap-1.5">
                          {baseFlag && <span className="text-xl leading-none">{baseFlag}</span>}
                          {baseFlag && <span className="text-xs text-muted-foreground/80">/</span>}
                          {quoteFlag && <span className="text-xl leading-none">{quoteFlag}</span>}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-muted-foreground/90 uppercase tracking-wider font-bold" style={{fontSize: '14px'}}>
                            {item.pair}
                          </span>
                          <span className="tabular-nums font-semibold text-foreground ticker-num ticker-num-price" style={{fontFamily: 'SF Mono, Monaco, \"Cascadia Code\", \"Roboto Mono\", Consolas, \"Courier New\", monospace', fontSize: '14px'}}>
                            {formatPrice(item.price)}
                          </span>
                        </div>
                        <div className="w-px h-9 bg-border/60"></div>
                        <div className="flex flex-col items-end">
                          <span className={`tabular-nums font-semibold ticker-num ticker-num-change ${getChangeColor(item.change)}`} style={{fontFamily: 'SF Mono, Monaco, \"Cascadia Code\", \"Roboto Mono\", Consolas, \"Courier New\", monospace', fontSize: '14px'}}>
                            {item.change >= 0 ? '+' : ''}{item.change.toFixed(5)}
                          </span>
                          <span className={`tabular-nums font-semibold ticker-num ticker-num-pct ${getChangeColor(item.changePercent)}`} style={{fontFamily: 'SF Mono, Monaco, \"Cascadia Code\", \"Roboto Mono\", Consolas, \"Courier New\", monospace', fontSize: '14px'}}>
                            {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    );
                  });
                  return (
                    <React.Fragment key={`dup-${cls}-segment`}>
                      <div className="px-3 py-2 mr-1 text-xs md:text-sm font-semibold tracking-wider text-muted-foreground/80 uppercase flex-shrink-0">
                        {label}
                      </div>
                      {onePassDup}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
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
          <p className="text-sm text-muted-foreground mt-1">Ticker Tape</p>
        </div>

        {/* Content */}
        <div className="h-[calc(100%-120px)] overflow-y-auto p-4">
          <div className="space-y-3">
            
            <div className="space-y-3">
              <button
                onClick={() => {
                  const newSelection: AssetClass[] = selectedAssetClasses.includes('forex')
                    ? selectedAssetClasses.filter((a): a is AssetClass => a !== 'forex')
                    : [...selectedAssetClasses, 'forex'];
                  setSelectedAssetClasses(newSelection);
                }}
                className={`w-full p-5 rounded-none border transition-all duration-200 ${
                  selectedAssetClasses.includes('forex')
                    ? 'border-primary bg-primary/10 shadow-lg'
                    : 'border-border bg-background hover:border-primary/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className={`text-base font-bold mb-1 ${selectedAssetClasses.includes('forex') ? 'text-primary' : 'text-foreground'}`}>
                      Forex {selectedAssetClasses.includes('forex') && <span className="text-xs text-green-500">• Live</span>}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Major currency pairs (EUR/USD, GBP/USD, etc.) - Real-time WebSocket data
                    </div>
                  </div>
                  {selectedAssetClasses.includes('forex') && (
                    <Check className="w-5 h-5 text-primary flex-shrink-0 ml-4" />
                  )}
                </div>
              </button>

              <button
                onClick={() => {
                  const newSelection: AssetClass[] = selectedAssetClasses.includes('commodities')
                    ? selectedAssetClasses.filter((a): a is AssetClass => a !== 'commodities')
                    : [...selectedAssetClasses, 'commodities'];
                  setSelectedAssetClasses(newSelection);
                }}
                className={`w-full p-5 rounded-none border transition-all duration-200 ${
                  selectedAssetClasses.includes('commodities')
                    ? 'border-primary bg-primary/10 shadow-lg'
                    : 'border-border bg-background hover:border-primary/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className={`text-base font-bold mb-1 ${selectedAssetClasses.includes('commodities') ? 'text-primary' : 'text-foreground'}`}>
                      Commodities
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Gold, Silver, Oil, Natural Gas, etc. - Mock data
                    </div>
                  </div>
                  {selectedAssetClasses.includes('commodities') && (
                    <Check className="w-5 h-5 text-primary flex-shrink-0 ml-4" />
                  )}
                </div>
              </button>

              <button
                onClick={() => {
                  const newSelection: AssetClass[] = selectedAssetClasses.includes('indices')
                    ? selectedAssetClasses.filter((a): a is AssetClass => a !== 'indices')
                    : [...selectedAssetClasses, 'indices'];
                  setSelectedAssetClasses(newSelection);
                }}
                className={`w-full p-5 rounded-none border transition-all duration-200 ${
                  selectedAssetClasses.includes('indices')
                    ? 'border-primary bg-primary/10 shadow-lg'
                    : 'border-border bg-background hover:border-primary/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className={`text-base font-bold mb-1 ${selectedAssetClasses.includes('indices') ? 'text-primary' : 'text-foreground'}`}>
                      Indices
                    </div>
                    <div className="text-sm text-muted-foreground">
                      S&P 500, NASDAQ, Dow Jones, FTSE, etc. - Mock data
                    </div>
                  </div>
                  {selectedAssetClasses.includes('indices') && (
                    <Check className="w-5 h-5 text-primary flex-shrink-0 ml-4" />
                  )}
                </div>
              </button>

              <button
                onClick={() => {
                  const newSelection: AssetClass[] = selectedAssetClasses.includes('stocks')
                    ? selectedAssetClasses.filter((a): a is AssetClass => a !== 'stocks')
                    : [...selectedAssetClasses, 'stocks'];
                  setSelectedAssetClasses(newSelection);
                }}
                className={`w-full p-5 rounded-none border transition-all duration-200 ${
                  selectedAssetClasses.includes('stocks')
                    ? 'border-primary bg-primary/10 shadow-lg'
                    : 'border-border bg-background hover:border-primary/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className={`text-base font-bold mb-1 ${selectedAssetClasses.includes('stocks') ? 'text-primary' : 'text-foreground'}`}>
                      US Stocks
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Apple, Microsoft, Tesla, Amazon, etc. - Mock data
                    </div>
                  </div>
                  {selectedAssetClasses.includes('stocks') && (
                    <Check className="w-5 h-5 text-primary flex-shrink-0 ml-4" />
                  )}
                </div>
              </button>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-card">
          <div className="flex gap-2">
            <button
              onClick={() => setShowSettings(false)}
              className="flex-1 h-10 border border-border rounded-none hover:bg-muted transition-colors text-foreground font-semibold text-base"
            >
              Cancel
            </button>
            <button
              onClick={() => setShowSettings(false)}
              className="flex-1 h-10 bg-primary hover:bg-primary/90 text-white font-semibold text-base transition-colors rounded-none"
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {/* Gradient overlays for fade effect */}
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-widget-body to-transparent z-10 pointer-events-none"></div>
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-widget-body to-transparent z-10 pointer-events-none"></div>
        
        <div className="h-full overflow-hidden">
          <style>{`
            @keyframes ticker-scroll {
              0% {
                transform: translate3d(0, 0, 0);
              }
              100% {
                transform: translate3d(-50%, 0, 0);
              }
            }
            .ticker-scroll {
              animation: ticker-scroll 120s linear infinite;
              display: inline-flex;
              will-change: transform;
              backface-visibility: hidden;
              transform: translateZ(0);
              isolation: isolate;
            }
            .ticker-scroll:hover {
              animation-play-state: paused;
            }
            .bg-up { background-color: rgba(34, 197, 94, 0.18); transition: background-color 120ms linear, color 120ms linear; }
            .bg-down { background-color: rgba(239, 68, 68, 0.18); transition: background-color 120ms linear, color 120ms linear; }
            .bg-flat { background-color: transparent; transition: background-color 120ms linear, color 120ms linear; }
            @keyframes tapeflashAnim { 0%{filter:brightness(1.15)} 50%{filter:brightness(1)} 100%{filter:brightness(1.15)} }
            .tapeflash { animation: tapeflashAnim 300ms ease-in-out 1; }
            .ticker-item { contain: layout paint; transform: translateZ(0); will-change: filter, background-color; }
            .ticker-num { display:inline-block; text-align:right; font-variant-numeric: tabular-nums; }
            .ticker-num-price { width: 9ch; }
            .ticker-num-change { width: 8.5ch; }
            .ticker-num-pct { width: 7ch; }
          `}</style>
          {/* Removed legacy single-tape render to avoid duplication; tapes now render per class above */}
        </div>
      </div>
    </div>
  );
}

export default TickerTapeHeatmapWidget;


