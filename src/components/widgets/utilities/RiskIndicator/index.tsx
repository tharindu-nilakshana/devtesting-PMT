"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiskSentimentRecord, getActiveMarketSession } from '../RiskSentiment/api';
import { useAuth } from '../../../../contexts/AuthContext';
import { Scale, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { getRiskSentimentDataForClient } from '../RiskSentiment/api';
import { WidgetHeader } from '@/components/bloomberg-ui/WidgetHeader';

interface Props {
  widgetType?: 'risk_indicator';
  currentRegion?: string;
  wgid?: string;
  wght?: number;
  onRemove?: () => void; // Close button functionality
  onSettings?: () => void; // Settings button functionality
  onFullscreen?: () => void; // Fullscreen functionality
  // SSR props
  initialData?: RiskSentimentRecord[];
  ssrCurrentRegion?: string;
}

type RiskLevel = "risk-on" | "neutral" | "risk-off";
type Session = "Asia" | "Europe" | "US";

interface AssetClass {
  name: string;
  performance: number;
  trend: "up" | "down" | "neutral";
}

export default function RiskIndicatorWidget({ 
  widgetType = 'risk_indicator',
  currentRegion,
  wgid = 'default-risk-indicator-widget',
  onRemove,
  onSettings,
  onFullscreen,
  initialData,
  ssrCurrentRegion
}: Props) {
  
  console.log('🔍 [RiskIndicatorWidget] Component initialized with widgetType:', widgetType, 'wgid:', wgid);
  const { user, isAuthenticated } = useAuth();
  const [data, setData] = useState<RiskSentimentRecord[]>(initialData || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date("2025-01-08T14:28:24Z"));
  const [currentSession, setCurrentSession] = useState<Session>("Asia");
  
  const loadingRef = useRef(false);
  const loadDataRef = useRef<() => Promise<void>>(() => Promise.resolve());

  // Get latest record for display
  const latestRecord = useMemo(() => {
    if (data.length === 0) return null;
    return data[data.length - 1] || data[0];
  }, [data]);

  // Get current region
  const activeRegion = useMemo(() => {
    return ssrCurrentRegion || currentRegion || getActiveMarketSession();
  }, [ssrCurrentRegion, currentRegion]);

  // Prevent null latestRecord during data transitions with fallback
  const stableLatestRecord = useMemo(() => {
    if (latestRecord) return latestRecord;
    if (data.length > 0) return data[data.length - 1];

    return {
      id: 1,
      timestamp: "2025-01-08T14:28:24Z",
      sentiment_value: -14.0,
      sentiment_name: 'Neutral',
      current_region: activeRegion,
      description: 'Market stabilizing in neutral territory: Cross-asset flows muted, mixed signals across risk assets. Awaiting directional catalyst.'
    } as RiskSentimentRecord;
  }, [latestRecord, data, activeRegion]);

  // Convert sentiment value to risk level
  const sentimentName = stableLatestRecord.sentiment_name || 'Neutral';
  const sentimentValue = typeof stableLatestRecord.sentiment_value === 'number' ? stableLatestRecord.sentiment_value : 0;

  const getRiskLevel = (name: string, value: number): RiskLevel => {
    const normalized = name.toLowerCase();

    if (normalized.includes('risk-on')) return "risk-on";
    if (normalized.includes('risk-off')) return "risk-off";

    if (value < -20) return "risk-off";
    if (value > 20) return "risk-on";
    return "neutral";
  };

  const currentRisk = getRiskLevel(sentimentName, sentimentValue);

  // Get asset class performance from API data
  const assetClasses: AssetClass[] = useMemo(() => {
    console.log('📊 [RiskIndicator] stableLatestRecord:', stableLatestRecord);
    console.log('📊 [RiskIndicator] Performance fields:', {
      perfEquities: stableLatestRecord.perfEquities,
      perfBonds: stableLatestRecord.perfBonds,
      perfSafeHavens: stableLatestRecord.perfSafeHavens,
      perfRiskCurrencies: stableLatestRecord.perfRiskCurrencies,
      perfVolatility: stableLatestRecord.perfVolatility
    });
    
    const perfEquities = parseFloat(stableLatestRecord.perfEquities || '0') * 100;
    const perfBonds = parseFloat(stableLatestRecord.perfBonds || '0') * 100;
    const perfSafeHavens = parseFloat(stableLatestRecord.perfSafeHavens || '0') * 100;
    const perfRiskCurrencies = parseFloat(stableLatestRecord.perfRiskCurrencies || '0') * 100;
    const perfVolatility = parseFloat(stableLatestRecord.perfVolatility || '0') * 100;
    
    console.log('📊 [RiskIndicator] Calculated percentages:', {
      perfEquities,
      perfBonds,
      perfSafeHavens,
      perfRiskCurrencies,
      perfVolatility
    });

    return [
      { name: "Equities", performance: perfEquities, trend: perfEquities > 0 ? "up" : perfEquities < 0 ? "down" : "neutral" },
      { name: "Bonds", performance: perfBonds, trend: perfBonds > 0 ? "up" : perfBonds < 0 ? "down" : "neutral" },
      { name: "Safe Havens", performance: perfSafeHavens, trend: perfSafeHavens > 0 ? "up" : perfSafeHavens < 0 ? "down" : "neutral" },
      { name: "Risk Currencies", performance: perfRiskCurrencies, trend: perfRiskCurrencies > 0 ? "up" : perfRiskCurrencies < 0 ? "down" : "neutral" },
      { name: "Volatility", performance: perfVolatility, trend: perfVolatility > 0 ? "up" : perfVolatility < 0 ? "down" : "neutral" },
    ];
  }, [stableLatestRecord]);

  // Determine session based on current time
  useEffect(() => {
    const updateSession = () => {
      const hour = new Date().getUTCHours();
      
      // Asia: 00:00 - 08:00 UTC
      // Europe: 08:00 - 16:00 UTC
      // US: 16:00 - 00:00 UTC
      if (hour >= 0 && hour < 8) {
        setCurrentSession("Asia");
      } else if (hour >= 8 && hour < 16) {
        setCurrentSession("Europe");
      } else {
        setCurrentSession("US");
      }
    };

    updateSession();
    const interval = setInterval(updateSession, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const loadData = useCallback(async (retryCount = 0) => {
    if (loadingRef.current) {
      return;
    }

    if (!isAuthenticated || !user) {
      setError('Please log in to view risk indicator data');
      return;
    }

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const result = await getRiskSentimentDataForClient('risk_indicator', activeRegion);

      if (result && result.length > 0) {
        console.log('🔍 [RiskIndicator] Received data - total records:', result.length);
        console.log('🔍 [RiskIndicator] First record:', result[0]);
        console.log('🔍 [RiskIndicator] Last record (will display):', result[result.length - 1]);
        console.log('🔍 [RiskIndicator] Last record timestamp:', result[result.length - 1]?.timestamp);
        setData(result);
        setLastUpdated(new Date());
      } else {
        const fallbackData = [
          {
            id: 1,
            timestamp: new Date().toISOString(),
            sentiment_value: -14.0,
            sentiment_name: 'Neutral',
            current_region: activeRegion,
            description: 'Market stabilizing in neutral territory: Cross-asset flows muted, mixed signals across risk assets. Awaiting directional catalyst.'
          }
        ];
        setData(fallbackData);
        setLastUpdated(new Date());
      }
    } catch (err) {
      if (retryCount < 2 && err instanceof Error &&
          (err.message.includes('timeout') || err.message.includes('fetch failed') || err.message.includes('503'))) {
        setTimeout(() => {
          loadData(retryCount + 1);
        }, 2000 * (retryCount + 1));
        return;
      }

      if (err instanceof Error && (err.message.includes('401') || err.message.includes('403'))) {
        setError('Authentication required. Please log in to view risk indicator data.');
      } else if (err instanceof Error && err.message.includes('timeout')) {
        setError('Request timeout - external service is slow. Please try again.');
      } else if (err instanceof Error && err.message.includes('503')) {
        setError('External service temporarily unavailable. Please try again later.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      }
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [activeRegion, isAuthenticated, user]);

  useEffect(() => {
    loadDataRef.current = loadData;
  }, [loadData]);

  useEffect(() => {
    if (!initialData) {
      loadDataRef.current?.();
    }
  }, [initialData]);

  useEffect(() => {
    const handleRefresh = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      const widgetName = customEvent.detail;
      if (widgetName === 'risk_indicator') {
        loadDataRef.current?.();
      }
    };

    window.addEventListener('risk-sentiment-refresh', handleRefresh);
    return () => {
      window.removeEventListener('risk-sentiment-refresh', handleRefresh);
    };
  }, []);

  // Bloomberg UI helper functions
  const formatTimestamp = (date: Date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    
    return `${hours}:${minutes}:${seconds} ${ampm}`;
  };

  const getRiskBadgeColor = () => {
    switch (currentRisk) {
      case "risk-on":
        return "bg-[#06d6a0]";
      case "neutral":
        return "bg-[#f97316]";
      case "risk-off":
        return "bg-[#ff4d6d]";
    }
  };

  const getRiskLabel = () => {
    switch (currentRisk) {
      case "risk-on":
        return "RISK ON";
      case "neutral":
        return "NEUTRAL";
      case "risk-off":
        return "RISK OFF";
    }
  };

  const getRiskIcon = () => {
    switch (currentRisk) {
      case "risk-on":
        return TrendingUp;
      case "neutral":
        return Scale;
      case "risk-off":
        return TrendingDown;
    }
  };

  const getRiskDescription = () => {
    switch (currentRisk) {
      case "risk-on":
        return "Investors are showing increased appetite for riskier assets, driven by positive economic data, strong corporate earnings, and accommodative central bank policies. Capital flows are moving into growth-oriented investments.";
      case "neutral":
        return "Market conditions are balanced with no clear directional bias. Investors are maintaining current positions while monitoring economic indicators and central bank policy signals.";
      case "risk-off":
        return "Investors are seeking safety amid heightened uncertainty, reducing exposure to riskier assets. Capital is flowing into safe-haven investments as market participants prioritize capital preservation.";
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div
        className="w-full h-full flex items-center justify-center bg-widget-body"
        style={{
          fontFamily: "var(--font-inter), 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif"
        }}
      >
        <div className="text-neutral-400 text-center p-4">
          <div className="text-lg mb-2">🔐</div>
          <div className="text-sm">Please log in to view risk indicator data</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-widget-body overflow-hidden">
      {/* Header - Bloomberg Style */}
      <WidgetHeader
        title="Risk Indicator"
        onRemove={onRemove}
        onSettings={onSettings}
        onFullscreen={onFullscreen}
        helpContent="Compact risk sentiment indicator showing overall market risk level. Displays risk-on (green), neutral (yellow), or risk-off (red) based on global market conditions. Shows current market session and live risk assessment."
      />
      
      <div className="flex-1 flex flex-col p-4 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading risk indicator data...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-destructive mb-2">Error: {error}</p>
              <button
                onClick={() => loadData()}
                className="text-xs text-primary hover:underline"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Risk Badge - Bigger and Centered with Icon */}
            <div className="mb-6 flex justify-center">
              <div 
                className={`${getRiskBadgeColor()} px-10 py-4 rounded-lg text-white tracking-wider flex items-center justify-center gap-4`} 
                style={{ fontSize: "2.85rem", fontWeight: 700, lineHeight: 1.2 }}
              >
                {(() => {
                  const Icon = getRiskIcon();
                  return <Icon className="w-12 h-12 flex-shrink-0" style={{ alignSelf: 'center' }} />;
                })()}
                <div className="flex flex-col items-start justify-center leading-tight">
                  <span style={{ fontSize: '1em', lineHeight: 1.2 }}>{sentimentName.toUpperCase()}</span>
                  <span className="opacity-80" style={{ fontSize: '0.45em', lineHeight: 1.2 }}>
                    {sentimentValue > 0 ? '+' : ''}{sentimentValue.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-3">
              <p className="text-muted-foreground text-xs leading-relaxed text-center">
                {getRiskDescription()}
              </p>
            </div>

            {/* Asset Class Performance */}
            <div className="mt-4">
              <div className="mb-3">
                <span className="text-muted-foreground text-xs tracking-wide">ASSET CLASS PERFORMANCE</span>
              </div>

              <div className="space-y-2">
                {assetClasses.map((asset, index) => {
                  const isPositive = asset.performance > 0;
                  const TrendIcon = asset.trend === "up" ? TrendingUp : asset.trend === "down" ? TrendingDown : Minus;
                  const trendColor = isPositive ? "#06d6a0" : "#ff4d6d";
                  
                  return (
                    <div key={index} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <TrendIcon className="w-3 h-3" style={{ color: trendColor }} />
                        <span className="text-foreground text-xs">{asset.name}</span>
                      </div>
                      <span 
                        className="text-xs tabular-nums"
                        style={{ color: trendColor }}
                      >
                        {isPositive ? "+" : ""}{asset.performance.toFixed(3)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer with Session and Updated timestamp */}
            <div className="mt-auto pt-4 border-t border-border">
              <div className="text-muted-foreground text-xs flex items-center justify-between">
                <span>Session: <span className="text-foreground">{currentSession}</span></span>
                <span>Updated: <span className="text-foreground">{formatTimestamp(lastUpdated)}</span></span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}