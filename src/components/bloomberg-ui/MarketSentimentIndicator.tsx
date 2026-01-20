"use client";

import { TrendingUp, TrendingDown, ChevronDown } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { getRiskSentimentDataForClient } from "@/components/widgets/utilities/RiskSentiment/api";

interface AssetClass {
  name: string;
  trend: "up" | "down";
  change: string;
}

type RiskLevel = "risk-on" | "risk-off" | "neutral";

export function MarketSentimentIndicator() {
  // Initialize with fallback value so it shows immediately
  const [sentimentValue, setSentimentValue] = useState<number | null>(-14.0);
  const [sentimentName, setSentimentName] = useState<string>("Neutral");
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("neutral");
  const [assetPerformance, setAssetPerformance] = useState<{
    perfEquities?: string;
    perfBonds?: string;
    perfSafeHavens?: string;
    perfRiskCurrencies?: string;
    perfVolatility?: string;
  }>({});
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [animationBoost, setAnimationBoost] = useState(false);
  const loadingRef = useRef(false);
  
  // Calculate asset classes from API performance data
  const currentAssets: AssetClass[] = [
    {
      name: "Equities",
      trend: (parseFloat(assetPerformance.perfEquities || '0') > 0 ? "up" : "down"),
      change: `${parseFloat(assetPerformance.perfEquities || '0') > 0 ? '+' : ''}${(parseFloat(assetPerformance.perfEquities || '0') * 100).toFixed(3)}%`
    },
    {
      name: "Bonds",
      trend: (parseFloat(assetPerformance.perfBonds || '0') > 0 ? "up" : "down"),
      change: `${parseFloat(assetPerformance.perfBonds || '0') > 0 ? '+' : ''}${(parseFloat(assetPerformance.perfBonds || '0') * 100).toFixed(3)}%`
    },
    {
      name: "Safe Havens",
      trend: (parseFloat(assetPerformance.perfSafeHavens || '0') > 0 ? "up" : "down"),
      change: `${parseFloat(assetPerformance.perfSafeHavens || '0') > 0 ? '+' : ''}${(parseFloat(assetPerformance.perfSafeHavens || '0') * 100).toFixed(3)}%`
    },
    {
      name: "Risk Currencies",
      trend: (parseFloat(assetPerformance.perfRiskCurrencies || '0') > 0 ? "up" : "down"),
      change: `${parseFloat(assetPerformance.perfRiskCurrencies || '0') > 0 ? '+' : ''}${(parseFloat(assetPerformance.perfRiskCurrencies || '0') * 100).toFixed(3)}%`
    },
    {
      name: "Volatility",
      trend: (parseFloat(assetPerformance.perfVolatility || '0') > 0 ? "up" : "down"),
      change: `${parseFloat(assetPerformance.perfVolatility || '0') > 0 ? '+' : ''}${(parseFloat(assetPerformance.perfVolatility || '0') * 100).toFixed(3)}%`
    }
  ];
  
  const sentimentExplanation = riskLevel === "risk-on" 
    ? "Investors are showing increased appetite for riskier assets, driven by positive economic data, strong corporate earnings, and accommodative central bank policies. Capital flows are moving into growth-oriented investments."
    : riskLevel === "risk-off"
    ? "Market participants are seeking safety amid uncertainty. Defensive positioning is evident across asset classes as investors prioritize capital preservation over returns due to geopolitical tensions, economic concerns, or monetary tightening."
    : "Market sentiment is balanced. Cross-asset flows are muted with mixed signals across risk assets. Markets are consolidating and awaiting directional catalyst.";

  // Convert sentiment value to risk level
  const getRiskLevel = useCallback((value: number): RiskLevel => {
    if (value < -20) return "risk-off";
    if (value > 20) return "risk-on";
    return "neutral";
  }, []);

  // Get color classes based on risk level
  const getColorClasses = (level: RiskLevel): string => {
    switch (level) {
      case "risk-on":
        return "bg-success/10 border-success/30 text-success";
      case "risk-off":
        return "bg-destructive/10 border-destructive/30 text-destructive";
      case "neutral":
        return "bg-orange-500/10 border-orange-500/30 text-orange-500";
      default:
        return "bg-muted/10 border-muted/30 text-muted-foreground";
    }
  };

  // Get display text based on risk level
  const getDisplayText = (level: RiskLevel): string => {
    switch (level) {
      case "risk-on":
        return "RISK ON";
      case "risk-off":
        return "RISK OFF";
      case "neutral":
        return "NEUTRAL";
      default:
        return "NEUTRAL";
    }
  };

  // Fetch risk sentiment data
  const fetchRiskSentiment = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    try {
      console.log('📊 [MarketSentimentIndicator] Fetching risk sentiment data...');
      const data = await getRiskSentimentDataForClient('risk_sentiment');
      
      console.log('📊 [MarketSentimentIndicator] Data received:', {
        hasData: !!data,
        dataLength: data?.length || 0,
        firstRecord: data?.[0],
        lastRecord: data?.[data?.length - 1]
      });
      
      if (data && data.length > 0) {
        // Data is sorted in reverse chronological order (newest first)
        const latestRecord = data[0];
        const value = latestRecord.sentiment_value;
        const name = latestRecord.sentiment_name;
        console.log('📊 [MarketSentimentIndicator] Setting sentiment:', { value, name });
        setSentimentValue(value);
        setSentimentName(name);
        setAssetPerformance({
          perfEquities: latestRecord.perfEquities,
          perfBonds: latestRecord.perfBonds,
          perfSafeHavens: latestRecord.perfSafeHavens,
          perfRiskCurrencies: latestRecord.perfRiskCurrencies,
          perfVolatility: latestRecord.perfVolatility
        });
        const level = getRiskLevel(value);
        setRiskLevel(level);
      } else {
        // Use fallback value like RiskIndicator widget
        console.log('📊 [MarketSentimentIndicator] No data, using fallback value -14.0');
        const fallbackValue = -14.0;
        setSentimentValue(fallbackValue);
        setSentimentName('Neutral');
        const level = getRiskLevel(fallbackValue);
        setRiskLevel(level);
      }
    } catch (error) {
      // Use fallback value on error
      const fallbackValue = -14.0;
      setSentimentValue(fallbackValue);
      const level = getRiskLevel(fallbackValue);
      setRiskLevel(level);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [getRiskLevel]);

  // Listen for WebSocket updates
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleWebSocketUpdate = (event: Event) => {
      try {
        const customEvent = event as CustomEvent<{
          widgetName: string;
          data?: any;
          rawData?: string;
          timestamp?: string;
        }>;
        
        const widgetName = customEvent.detail?.widgetName;
        
        // Check if this is a RiskSentiment update (case-insensitive)
        const normalizedName = String(widgetName || '').toLowerCase().trim();
        if (normalizedName === 'risksentiment' || normalizedName === 'risk_sentiment') {
          console.log('📊 [MarketSentimentIndicator] RiskSentiment WebSocket update received');
          // Trigger animation
          setAnimationBoost(true);
          setTimeout(() => {
            setAnimationBoost(false);
          }, 2000); // 2 seconds like bell animation
          fetchRiskSentiment();
        }
      } catch (error) {
        console.error('Error handling WebSocket update:', error);
      }
    };

    const handleRtsUpdate = (event: Event) => {
      try {
        const customEvent = event as CustomEvent<string>;
        const widgetName = customEvent.detail;
        
        // Check if this is a RiskSentiment update (case-insensitive)
        const normalizedName = String(widgetName || '').toLowerCase().trim();
        if (normalizedName === 'risksentiment' || normalizedName === 'risk_sentiment') {
          console.log('📊 [MarketSentimentIndicator] RiskSentiment RTS update received');
          // Trigger animation
          setAnimationBoost(true);
          setTimeout(() => {
            setAnimationBoost(false);
          }, 2000); // 2 seconds like bell animation
          fetchRiskSentiment();
        }
      } catch (error) {
        console.error('Error handling RTS update:', error);
      }
    };

    // Listen to both pmt-widget-data and pmt-rts events
    window.addEventListener('pmt-widget-data', handleWebSocketUpdate);
    window.addEventListener('pmt-rts', handleRtsUpdate);

    // Initial fetch on mount
    fetchRiskSentiment();

    return () => {
      window.removeEventListener('pmt-widget-data', handleWebSocketUpdate);
      window.removeEventListener('pmt-rts', handleRtsUpdate);
    };
  }, [fetchRiskSentiment]);
  
  // Use actual sentiment name from API, uppercased
  const displayText = sentimentName.toUpperCase();
  const colorClasses = getColorClasses(riskLevel);
  const showTrendingUp = riskLevel === "risk-on";
  const iconColorClass =
    riskLevel === "risk-on"
      ? "text-success"
      : riskLevel === "risk-off"
        ? "text-destructive"
        : "text-orange-500";

  // Format sentiment value like RiskSentiment widget: +XX.XX or -XX.XX
  const formatSentimentValue = (value: number | null): string => {
    if (value === null) return '';
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}`;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={`h-8 px-2.5 flex items-center gap-1.5 rounded border transition-all hover:opacity-80 whitespace-nowrap flex-shrink-0 ${colorClasses} ${loading ? "opacity-50" : ""} ${animationBoost ? 'bell-wiggle bell-pulse' : ''}`}
          title={`Market Sentiment: ${displayText}`}
          disabled={loading}
        >
          {showTrendingUp ? (
            <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 flex-shrink-0" />
          )}
          <span className="text-xs uppercase tracking-wide whitespace-nowrap">
            {displayText}
          </span>
          <ChevronDown className={`w-3 h-3 transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""} ml-0.5`} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0 bg-popover border-border" align="start">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            {showTrendingUp ? (
              <TrendingUp className={`w-4 h-4 ${iconColorClass}`} />
            ) : (
              <TrendingDown className={`w-4 h-4 ${iconColorClass}`} />
            )}
            <h3 className="text-foreground">
              Market Sentiment: {displayText}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {sentimentExplanation}
          </p>
        </div>
        
        <div className="p-4">
          <h4 className="text-sm text-muted-foreground mb-3 uppercase tracking-wide">Asset Class Performance</h4>
          <div className="space-y-2">
            {currentAssets.map((asset, index) => (
              <div 
                key={index}
                className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {asset.trend === "up" ? (
                    <TrendingUp className="w-3.5 h-3.5 text-success" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-destructive" />
                  )}
                  <span className="text-sm text-foreground">{asset.name}</span>
                </div>
                <span className={`text-sm ${
                  asset.trend === "up" ? "text-success" : "text-destructive"
                }`}>
                  {asset.change}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="px-4 pb-4">
          <div className="text-xs text-muted-foreground">
            Updated: {new Date().toLocaleTimeString('en-GB', { timeZone: 'UTC' })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

