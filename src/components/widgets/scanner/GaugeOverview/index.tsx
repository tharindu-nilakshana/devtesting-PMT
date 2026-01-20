'use client';

import { useState, useEffect } from "react";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import { getAuthToken } from "@/utils/api";
import { Loader2 } from "lucide-react";
import { widgetDataCache } from "@/lib/widgetDataCache";

type WidgetSettings = Record<string, unknown>;

interface GaugeOverviewProps {
  onSettings?: () => void;
  onRemove?: () => void;
  onFullscreen?: () => void;
  settings?: WidgetSettings;
}

// API Response Interface
interface GaugeOverviewApiResponse {
  version?: string;
  SymbolID?: number;
  shortPercentage?: number; // Optional - not available for all modules
  longPercentage?: number; // Optional - not available for all modules
  shortPositions?: number;
  longPositions?: number;
  totalPositions?: number;
  COT1ShortPosition?: number;
  COT1LongPositions?: number;
  COT1ShortPercent?: number;
  COT1LongPercent?: number;
  COT1TotalPositions?: number;
  COT2ShortPosition?: number;
  COT2LongPositions?: number;
  COT2ShortPercent?: number;
  COT2LongPercent?: number;
  COT2TotalPositions?: number;
  ForecastHorizon1?: number;
  Probability1?: number;
  SeasonalPrognosis1?: number;
  ChangeValue1?: string;
  ForecastHorizon2?: number;
  Probability2?: number;
  SeasonalPrognosis2?: number;
  ChangeValue2?: string;
  ForecastBias?: string;
  PForecastHorizon1?: number;
  PProbability1?: number;
  PPatternPrognosis1?: number;
  PChangeValue1?: string;
  PForecastHorizon2?: number;
  PProbability2?: number;
  PPatternPrognosis2?: number;
  PChangeValue2?: string;
  PForecastBias?: string;
  chartDate?: string[];
  maxval?: number;
  minval?: number;
  chartData?: string[];
}

// Data structure for Gauge Overview
interface GaugeOverviewData {
  score: number; // 0-100
  symbol?: string; // Optional symbol (e.g., "EUR/USD")
  indicators: {
    strongBuy: number;
    buy: number;
    neutral: number;
    sell: number;
    strongSell: number;
  };
}

// Helper to format symbol (e.g., "EURUSD" -> "EUR/USD")
function formatSymbol(symbol: string): string {
  if (symbol.length === 6) {
    return `${symbol.slice(0, 3)}/${symbol.slice(3)}`;
  }
  return symbol;
}

// Transform API response to widget data structure
function transformApiData(apiData: GaugeOverviewApiResponse, symbol: string): GaugeOverviewData {
  // Calculate score from available data
  // Priority: longPercentage > ForecastBias + Probability > Default (50)
  let score = 50; // Default neutral score
  
  if (apiData.longPercentage !== undefined && apiData.longPercentage !== null) {
    // Use longPercentage if available (Forex, some Commodities)
    score = Math.max(0, Math.min(100, apiData.longPercentage));
  } else {
    // For modules without longPercentage (US Stocks, Indices, some Commodities)
    // Calculate score based on ForecastBias and Probability
    const forecastBias = apiData.ForecastBias?.toUpperCase() || '';
    const probability = apiData.Probability1 || apiData.Probability2 || 50;
    
    if (forecastBias.includes('BULLISH')) {
      // Bullish: score = 50 + (probability - 50) * 0.8 (scaled to 50-90 range)
      score = Math.max(50, Math.min(90, 50 + (probability - 50) * 0.8));
    } else if (forecastBias.includes('BEARISH')) {
      // Bearish: score = 50 - (probability - 50) * 0.8 (scaled to 10-50 range)
      score = Math.max(10, Math.min(50, 50 - (probability - 50) * 0.8));
    } else {
      // Neutral: score stays around 40-60 based on probability
      score = 40 + (probability / 100) * 20;
    }
  }

  // Calculate indicators based on available data
  // We'll distribute indicators based on percentages and COT data
  const totalIndicators = 19; // Total number of indicators to distribute
  
  // Calculate base distribution from long/short percentages (if available)
  // If not available, derive from score
  let longRatio = 0.5;
  let shortRatio = 0.5;
  
  if (apiData.longPercentage !== undefined && apiData.shortPercentage !== undefined) {
    longRatio = apiData.longPercentage / 100;
    shortRatio = apiData.shortPercentage / 100;
  } else {
    // Derive from score
    longRatio = score / 100;
    shortRatio = (100 - score) / 100;
  }
  
  // Use COT data if available to refine the distribution
  const cot1LongRatio = apiData.COT1LongPercent ? apiData.COT1LongPercent / 100 : longRatio;
  const cot1ShortRatio = apiData.COT1ShortPercent ? apiData.COT1ShortPercent / 100 : shortRatio;
  const cot2LongRatio = apiData.COT2LongPercent ? apiData.COT2LongPercent / 100 : longRatio;
  const cot2ShortRatio = apiData.COT2ShortPercent ? apiData.COT2ShortPercent / 100 : shortRatio;
  
  // Average the ratios for more accurate distribution
  const avgLongRatio = (longRatio + cot1LongRatio + cot2LongRatio) / 3;
  const avgShortRatio = (shortRatio + cot1ShortRatio + cot2ShortRatio) / 3;
  
  // Determine forecast bias influence
  const forecastBias = apiData.ForecastBias?.toUpperCase() || '';
  const isBullish = forecastBias.includes('BULLISH');
  const isBearish = forecastBias.includes('BEARISH');
  
  // Calculate indicator distribution
  // Strong signals get more weight when forecast bias is clear
  let strongBuy = 0;
  let buy = 0;
  let neutral = 0;
  let sell = 0;
  let strongSell = 0;
  
  if (avgLongRatio > 0.7) {
    // Very bullish
    strongBuy = Math.round(totalIndicators * avgLongRatio * 0.6);
    buy = Math.round(totalIndicators * avgLongRatio * 0.4);
    neutral = Math.max(1, Math.round(totalIndicators * 0.1));
    sell = Math.round(totalIndicators * avgShortRatio * 0.3);
    strongSell = Math.round(totalIndicators * avgShortRatio * 0.2);
  } else if (avgLongRatio > 0.55) {
    // Moderately bullish
    strongBuy = Math.round(totalIndicators * avgLongRatio * 0.3);
    buy = Math.round(totalIndicators * avgLongRatio * 0.5);
    neutral = Math.max(1, Math.round(totalIndicators * 0.15));
    sell = Math.round(totalIndicators * avgShortRatio * 0.4);
    strongSell = Math.round(totalIndicators * avgShortRatio * 0.1);
  } else if (avgShortRatio > 0.7) {
    // Very bearish
    strongBuy = Math.round(totalIndicators * avgLongRatio * 0.2);
    buy = Math.round(totalIndicators * avgLongRatio * 0.3);
    neutral = Math.max(1, Math.round(totalIndicators * 0.1));
    sell = Math.round(totalIndicators * avgShortRatio * 0.4);
    strongSell = Math.round(totalIndicators * avgShortRatio * 0.6);
  } else if (avgShortRatio > 0.55) {
    // Moderately bearish
    strongBuy = Math.round(totalIndicators * avgLongRatio * 0.1);
    buy = Math.round(totalIndicators * avgLongRatio * 0.4);
    neutral = Math.max(1, Math.round(totalIndicators * 0.15));
    sell = Math.round(totalIndicators * avgShortRatio * 0.5);
    strongSell = Math.round(totalIndicators * avgShortRatio * 0.3);
  } else {
    // Neutral
    strongBuy = Math.round(totalIndicators * avgLongRatio * 0.2);
    buy = Math.round(totalIndicators * avgLongRatio * 0.3);
    neutral = Math.max(2, Math.round(totalIndicators * 0.3));
    sell = Math.round(totalIndicators * avgShortRatio * 0.3);
    strongSell = Math.round(totalIndicators * avgShortRatio * 0.2);
  }
  
  // Adjust based on forecast bias
  if (isBullish) {
    strongBuy = Math.max(strongBuy, Math.round(totalIndicators * 0.3));
    buy = Math.max(buy, Math.round(totalIndicators * 0.4));
  } else if (isBearish) {
    sell = Math.max(sell, Math.round(totalIndicators * 0.4));
    strongSell = Math.max(strongSell, Math.round(totalIndicators * 0.3));
  }
  
  // Normalize to ensure total equals totalIndicators
  const currentTotal = strongBuy + buy + neutral + sell + strongSell;
  if (currentTotal !== totalIndicators) {
    const diff = totalIndicators - currentTotal;
    if (diff > 0) {
      // Add to neutral
      neutral += diff;
    } else {
      // Subtract from largest category
      const maxVal = Math.max(strongBuy, buy, neutral, sell, strongSell);
      if (strongBuy === maxVal) strongBuy += diff;
      else if (buy === maxVal) buy += diff;
      else if (neutral === maxVal) neutral += diff;
      else if (sell === maxVal) sell += diff;
      else strongSell += diff;
    }
  }
  
  // Ensure no negative values
  strongBuy = Math.max(0, strongBuy);
  buy = Math.max(0, buy);
  neutral = Math.max(0, neutral);
  sell = Math.max(0, sell);
  strongSell = Math.max(0, strongSell);

  return {
    score,
    symbol: formatSymbol(symbol),
    indicators: {
      strongBuy,
      buy,
      neutral,
      sell,
      strongSell,
    },
  };
}

// API function to fetch gauge overview
async function fetchGaugeOverview(symbol: string, module?: string): Promise<GaugeOverviewApiResponse> {
  const token = getAuthToken();
  const response = await fetch('/api/pmt/GetGaugeOverview', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      symbol: symbol,
      Symbols: symbol,
      ...(module ? { Module: module } : {}),
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Request failed: ${response.status}`);
  }
  return (await response.json()) as GaugeOverviewApiResponse;
}

export function GaugeOverview({ onSettings, onRemove, onFullscreen, settings }: GaugeOverviewProps) {
  const [data, setData] = useState<GaugeOverviewData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [prevActiveSegment, setPrevActiveSegment] = useState<number | null>(null);
  const [animatingSegment, setAnimatingSegment] = useState<number | null>(null);
  
  // Get symbol and module from settings or use defaults
  const symbol = (settings?.symbol as string) || 'AUDCAD';
  const module = (settings?.module as string) || 'Forex';

  // Fetch data when symbol or module changes
  useEffect(() => {
    const loadData = async () => {
      const cacheKey = widgetDataCache.generateKey('gauge-overview', { symbol, module });
      const cachedData = widgetDataCache.get<GaugeOverviewData>(cacheKey);
      
      if (cachedData) {
        setData(cachedData);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        const apiData = await fetchGaugeOverview(symbol, module);
        const transformedData = transformApiData(apiData, symbol);
        setData(transformedData);
        widgetDataCache.set(cacheKey, transformedData);
      } catch (err) {
        console.error('Failed to fetch gauge overview:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    if (symbol && module) {
      loadData();
    }
  }, [symbol, module]);

  // Calculate derived values from data
  const score = data?.score ?? 0;
  const indicators = data?.indicators ?? {
    strongBuy: 0,
    buy: 0,
    neutral: 0,
    sell: 0,
    strongSell: 0,
  };

  const totalIndicators =
    indicators.strongBuy +
    indicators.buy +
    indicators.neutral +
    indicators.sell +
    indicators.strongSell;

  const longIndicators = indicators.strongBuy + indicators.buy;
  const shortIndicators = indicators.sell + indicators.strongSell;

  // Determine signal and color based on score
  const getSignal = (score: number) => {
    if (score >= 80) return { text: "Strong Buy", color: "#059669", bg: "bg-emerald-600/20" };
    if (score >= 60) return { text: "Active Buying", color: "#10b981", bg: "bg-emerald-500/20" };
    if (score >= 40) return { text: "Neutral", color: "#f59e0b", bg: "bg-amber-500/20" };
    if (score >= 20) return { text: "Active Selling", color: "#ef4444", bg: "bg-red-500/20" };
    return { text: "Strong Sell", color: "#dc2626", bg: "bg-red-600/20" };
  };

  const signal = getSignal(score);

  // Determine which segment is active based on score
  const getActiveSegment = (score: number) => {
    if (score < 20) return 0; // Strong Sell
    if (score < 40) return 1; // Sell
    if (score < 60) return 2; // Neutral
    if (score < 80) return 3; // Buy
    return 4; // Strong Buy
  };

  const activeSegment = getActiveSegment(score);

  // Track segment changes and trigger animation
  useEffect(() => {
    if (prevActiveSegment !== null && prevActiveSegment !== activeSegment) {
      // Trigger animation when segment changes
      setAnimatingSegment(activeSegment);
      
      // Reset animation after duration
      const timer = setTimeout(() => {
        setAnimatingSegment(null);
      }, 600);
      
      return () => clearTimeout(timer);
    }
    setPrevActiveSegment(activeSegment);
  }, [activeSegment, prevActiveSegment]);

  // Create gauge segments
  const segments = [
    { color: "#dc2626", percentage: 20, label: "Strong Sell" }, // Red
    { color: "#ef4444", percentage: 20, label: "Sell" }, // Light Red
    { color: "#f59e0b", percentage: 20, label: "Neutral" }, // Amber
    { color: "#10b981", percentage: 20, label: "Buy" }, // Green
    { color: "#059669", percentage: 20, label: "Strong Buy" }, // Dark Green
  ];

  return (
    <div className="h-full w-full flex flex-col bg-widget border border-border rounded-sm overflow-hidden">
      <WidgetHeader
        title={
          <span>
            Gauge Overview {data?.symbol && <span className="text-primary">[{data.symbol}]</span>}
          </span>
        }
        widgetName="Gauge Overview"
        onSettings={onSettings}
        onRemove={onRemove}
        onFullscreen={onFullscreen}
        helpContent="Gauge Overview displays the overall technical signal based on multiple indicators, showing a visual gauge with the current market sentiment and indicator breakdown."
      />

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-sm text-destructive mb-2">{error}</p>
            </div>
          </div>
        ) : !data ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-muted-foreground">No data available</div>
          </div>
        ) : (
          <>
        {/* Gauge Container */}
        <div className="relative flex flex-col items-center gap-4">
          {/* SVG Gauge */}
          <div className="relative">
            <svg width="360" height="200" viewBox="0 0 280 160" className="overflow-visible">
              <defs>
                {/* Gradient for each segment */}
                {segments.map((segment, idx) => (
                  <linearGradient
                    key={`gradient-${idx}`}
                    id={`segment-gradient-${idx}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop offset="0%" stopColor={segment.color} stopOpacity={0.8} />
                    <stop offset="100%" stopColor={segment.color} stopOpacity={1} />
                  </linearGradient>
                ))}
                {/* Inner highlight for 3D effect */}
                <linearGradient
                  id="innerHighlight"
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#ffffff" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                </linearGradient>
              </defs>

              {/* Background arc */}
              <path
                d="M 30 140 A 110 110 0 0 1 250 140"
                fill="none"
                stroke="#1a1a1a"
                strokeWidth="32"
                strokeLinecap="butt"
              />

              {/* Colored segments */}
              {segments.map((segment, idx) => {
                const isActive = idx === activeSegment;
                const isAnimating = idx === animatingSegment;
                const startAngle = (idx * 36) - 90; // 180 / 5 = 36 degrees per segment
                const endAngle = startAngle + 36;
                
                const startRad = (startAngle * Math.PI) / 180;
                const endRad = (endAngle * Math.PI) / 180;
                
                // Make active segment slightly larger for 3D effect
                // Add extra size boost during animation
                const baseInnerRadius = 94;
                const baseOuterRadius = 126;
                const activeInnerRadius = 92;
                const activeOuterRadius = 128;
                const animatingInnerRadius = 90;
                const animatingOuterRadius = 130;
                
                const innerRadius = isAnimating ? animatingInnerRadius : (isActive ? activeInnerRadius : baseInnerRadius);
                const outerRadius = isAnimating ? animatingOuterRadius : (isActive ? activeOuterRadius : baseOuterRadius);
                const centerX = 140;
                const centerY = 140;
                
                const x1 = centerX + innerRadius * Math.cos(startRad);
                const y1 = centerY + innerRadius * Math.sin(startRad);
                const x2 = centerX + outerRadius * Math.cos(startRad);
                const y2 = centerY + outerRadius * Math.sin(startRad);
                const x3 = centerX + outerRadius * Math.cos(endRad);
                const y3 = centerY + outerRadius * Math.sin(endRad);
                const x4 = centerX + innerRadius * Math.cos(endRad);
                const y4 = centerY + innerRadius * Math.sin(endRad);
                
                const pathData = `
                  M ${x1} ${y1}
                  L ${x2} ${y2}
                  A ${outerRadius} ${outerRadius} 0 0 1 ${x3} ${y3}
                  L ${x4} ${y4}
                  A ${innerRadius} ${innerRadius} 0 0 0 ${x1} ${y1}
                  Z
                `;
                
                return (
                  <g key={idx}>
                    {/* 3D shadow effect for active segment */}
                    {isActive && (
                      <path
                        d={pathData}
                        fill="#000"
                        opacity={isAnimating ? "0.6" : "0.4"}
                        transform="translate(2, 3)"
                        filter="blur(3px)"
                        style={{
                          transition: "all 0.3s ease-out",
                        }}
                      />
                    )}
                    {/* Pulse ring for animating segment */}
                    {isAnimating && (
                      <>
                        <path
                          d={pathData}
                          fill="none"
                          stroke={segment.color}
                          strokeWidth="4"
                          opacity="0"
                          style={{
                            animation: "pulse-ring 0.6s ease-out",
                          }}
                        />
                        <style>{`
                          @keyframes pulse-ring {
                            0% {
                              opacity: 0.8;
                              stroke-width: 4;
                            }
                            100% {
                              opacity: 0;
                              stroke-width: 12;
                            }
                          }
                        `}</style>
                      </>
                    )}
                    {/* Main segment */}
                    <path
                      d={pathData}
                      fill={`url(#segment-gradient-${idx})`}
                      stroke={isActive ? segment.color : "#0a0a0a"}
                      strokeWidth={isActive ? "2" : "1"}
                      opacity={isActive ? 1 : 0.6}
                      filter={isActive ? "drop-shadow(0 0 " + (isAnimating ? "12px" : "8px") + " " + segment.color + ")" : "none"}
                      style={{
                        transition: isAnimating ? "all 0.2s ease-out" : "all 0.5s ease-out",
                      }}
                    />
                    {/* Inner highlight for 3D effect on active segment */}
                    {isActive && (
                      <path
                        d={pathData}
                        fill="url(#innerHighlight)"
                        opacity={isAnimating ? "0.5" : "0.3"}
                        style={{
                          transition: "opacity 0.3s ease-out",
                        }}
                      />
                    )}
                  </g>
                );
              })}

              {/* Center circle */}
              <circle
                cx="140"
                cy="140"
                r="12"
                fill="#1a1a1a"
                stroke="#333"
                strokeWidth="2"
              />
              <circle
                cx="140"
                cy="140"
                r="6"
                fill="#666"
              />
            </svg>

            {/* Score in center */}
            <div className="absolute top-[105px] left-1/2 -translate-x-1/2 flex flex-col items-center">
              <div 
                className="text-6xl font-bold text-foreground tabular-nums"
                style={{
                  transition: "transform 0.3s ease-out",
                  transform: animatingSegment !== null ? "scale(1.1)" : "scale(1)",
                }}
              >
                {score.toFixed(1)}
              </div>
            </div>
          </div>

          {/* Signal Badge */}
          <div
            className={`${signal.bg} border border-white/10 rounded-full px-6 py-2.5 transition-all duration-300`}
            style={{ 
              borderColor: `${signal.color}40`,
              transform: animatingSegment !== null ? "scale(1.05)" : "scale(1)",
            }}
          >
            <span
              className="text-base font-semibold transition-colors duration-300"
              style={{ color: signal.color }}
            >
              {signal.text}
            </span>
          </div>
        </div>

        {/* Statistics */}
        <div className="w-full max-w-md space-y-3">
          {/* Indicator Breakdown */}
          <div className="bg-slate-500/10 rounded px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span className="text-muted-foreground">Long Signals:</span>
              <span className="text-emerald-400 font-semibold tabular-nums text-base">{longIndicators}</span>
            </div>
            <div className="w-px h-5 bg-border/50"></div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span className="text-muted-foreground">Short Signals:</span>
              <span className="text-red-400 font-semibold tabular-nums text-base">{shortIndicators}</span>
            </div>
            <div className="w-px h-5 bg-border/50"></div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Neutral:</span>
              <span className="text-amber-400 font-semibold tabular-nums text-base">{indicators.neutral}</span>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="grid grid-cols-5 gap-2">
            {[
              { label: "Strong Sell", count: indicators.strongSell, color: "#dc2626" },
              { label: "Sell", count: indicators.sell, color: "#ef4444" },
              { label: "Neutral", count: indicators.neutral, color: "#f59e0b" },
              { label: "Buy", count: indicators.buy, color: "#10b981" },
              { label: "Strong Buy", count: indicators.strongBuy, color: "#059669" },
            ].map((item, idx) => (
              <div
                key={idx}
                className="bg-black/30 rounded p-2.5 flex flex-col items-center gap-1.5"
              >
                <div
                  className="text-xl font-bold tabular-nums"
                  style={{ color: item.color }}
                >
                  {item.count}
                </div>
                <div className="text-xs text-muted-foreground text-center leading-tight font-medium">
                  {item.label}
                </div>
              </div>
            ))}
          </div>

          {/* Total Indicators */}
          <div className="bg-black/20 rounded px-4 py-2.5 flex items-center justify-center gap-2 text-sm">
            <span className="text-muted-foreground">Total Indicators:</span>
            <span className="text-foreground font-semibold tabular-nums text-base">{totalIndicators}</span>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
}

export default GaugeOverview;

