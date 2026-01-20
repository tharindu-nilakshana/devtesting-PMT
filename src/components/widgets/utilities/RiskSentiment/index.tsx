"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiskSentimentRecord, getActiveMarketSession, getRiskSentimentDataForClient } from './api';
import { useAuth } from '../../../../contexts/AuthContext';
import { WidgetHeader } from '@/components/bloomberg-ui/WidgetHeader';

interface Props {
  wgid?: string;
  currentRegion?: string;
  initialData?: RiskSentimentRecord[];
  ssrCurrentRegion?: string;
  onRemove?: () => void; // Close button functionality
  onSettings?: () => void; // Settings button functionality
  onFullscreen?: () => void; // Fullscreen functionality
}

export default function RiskSentimentWidget({
  currentRegion,
  initialData,
  ssrCurrentRegion,
  onRemove,
  onSettings,
  onFullscreen
}: Props) {
  const { user, isAuthenticated } = useAuth();
  const [data, setData] = useState<RiskSentimentRecord[]>(initialData || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadingRef = useRef(false);
  const loadDataRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const latestRecord = useMemo(() => {
    if (data.length === 0) return null;
    // Data is sorted in reverse chronological order (newest first)
    return data[0];
  }, [data]);

  const activeRegion = useMemo(() => {
    return ssrCurrentRegion || currentRegion || getActiveMarketSession();
  }, [ssrCurrentRegion, currentRegion]);

  const stableLatestRecord = useMemo(() => {
    if (latestRecord) return latestRecord;
    // Data is sorted in reverse chronological order (newest first)
    if (data.length > 0) return data[0];

    return {
      id: 1,
      timestamp: new Date().toISOString(),
      sentiment_value: -14.0,
      sentiment_name: 'Neutral',
      current_region: activeRegion,
      description: 'Market stabilizing in neutral territory: Cross-asset flows muted, mixed signals across risk assets. Awaiting directional catalyst.'
    } as RiskSentimentRecord;
  }, [latestRecord, data, activeRegion]);

  const loadData = useCallback(async (retryCount = 0) => {
    if (loadingRef.current) {
      return;
    }

    if (!isAuthenticated || !user) {
      setError('Please log in to view risk sentiment data');
      return;
    }

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const result = await getRiskSentimentDataForClient('risk_sentiment', activeRegion);

      if (result && result.length > 0) {
        console.log('🔍 [RiskSentiment] Received data - total records:', result.length);
        console.log('🔍 [RiskSentiment] First record:', result[0]);
        console.log('🔍 [RiskSentiment] Last record (will display):', result[result.length - 1]);
        console.log('🔍 [RiskSentiment] Last record timestamp:', result[result.length - 1]?.timestamp);
        setData(result);
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
        setError('Authentication required. Please log in to view risk sentiment data.');
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
      if (widgetName === 'risk_sentiment') {
        loadDataRef.current?.();
      }
    };

    window.addEventListener('risk-sentiment-refresh', handleRefresh);
    return () => {
      window.removeEventListener('risk-sentiment-refresh', handleRefresh);
    };
  }, []);

  // Bloomberg UI helper functions
  const getSentimentLabel = (value: number): string => {
    if (value <= -60) return "STRONG RISK-OFF";
    if (value <= -20) return "RISK-OFF";
    if (value < 20) return "NEUTRAL";
    if (value < 60) return "RISK-ON";
    return "STRONG RISK-ON";
  };

  const getBloombergSentimentColor = (value: number): string => {
    if (value <= -60) return "#dc2626";
    if (value <= -20) return "#f97316";
    if (value < 20) return "#eab308";
    if (value < 60) return "#84cc16";
    return "#22c55e";
  };

  const getBloombergSentimentDescription = (value: number): string => {
    if (value <= -60) return "Risk aversion dominant. Capital fleeing to safe havens. Equities, commodities under pressure. Defensive positioning.";
    if (value <= -20) return "Cautious sentiment prevails. Mixed flows. Safe havens supported. Volatility elevated.";
    if (value < 20) return "Balanced risk appetite. Markets consolidating. Flows distributed. Monitoring developments.";
    if (value < 60) return "Risk appetite improving gradually. Flows returning to equities, oil, AUD. Safe havens soften. VIX trending lower.";
    return "Strong risk appetite. Capital flowing to growth assets. Equities rallying. Emerging markets bid. Safe havens weak.";
  };

  // Map API sentiment names to display labels
  const mapSentimentName = (name: string): string => {
    const normalized = name.toUpperCase();
    if (normalized.includes('STRONG RISK-ON')) return 'STRONG RISK-ON';
    if (normalized.includes('STRONG RISK-OFF')) return 'STRONG RISK-OFF';
    if (normalized.includes('WEAK RISK-ON')) return 'WEAK RISK-ON';
    if (normalized.includes('WEAK RISK-OFF')) return 'WEAK RISK-OFF';
    if (normalized.includes('RISK-ON')) return 'RISK-ON';
    if (normalized.includes('RISK-OFF')) return 'RISK-OFF';
    return 'NEUTRAL';
  };

  // Calculate needle rotation (0 degrees = -100 sentiment, 180 degrees = +100 sentiment)
  const needleRotation = ((stableLatestRecord.sentiment_value + 100) / 200) * 180;
  
  // Use API sentiment name first, fall back to calculated label
  const apiSentimentLabel = stableLatestRecord.sentiment_name ? mapSentimentName(stableLatestRecord.sentiment_name) : null;
  const currentLabel = apiSentimentLabel || getSentimentLabel(stableLatestRecord.sentiment_value);
  const currentColor = getBloombergSentimentColor(stableLatestRecord.sentiment_value);
  const currentDescription = getBloombergSentimentDescription(stableLatestRecord.sentiment_value);

  console.log('🎯 [RiskSentiment] Current values:', {
    sentiment_value: stableLatestRecord.sentiment_value,
    sentiment_name: stableLatestRecord.sentiment_name,
    apiSentimentLabel,
    currentLabel,
    needleRotation,
    currentColor
  });

  const sentimentZones = useMemo(
    () => [
      {
        label: 'STRONG RISK-ON',
        min: 60,
        max: 100,
        fill: 'rgba(34,197,94,0.12)',
        textColor: 'rgba(34,197,94,0.7)'
      },
      {
        label: 'WEAK RISK-ON',
        min: 20,
        max: 60,
        fill: 'rgba(163,230,53,0.12)',
        textColor: 'rgba(132,204,22,0.7)'
      },
      {
        label: 'NEUTRAL',
        min: -20,
        max: 20,
        fill: 'rgba(148,163,184,0.12)',
        textColor: 'rgba(148,163,184,0.8)'
      },
      {
        label: 'WEAK RISK-OFF',
        min: -60,
        max: -20,
        fill: 'rgba(248,113,113,0.12)',
        textColor: 'rgba(248,113,113,0.8)'
      },
      {
        label: 'STRONG RISK-OFF',
        min: -100,
        max: -60,
        fill: 'rgba(220,38,38,0.12)',
        textColor: 'rgba(220,38,38,0.8)'
      }
    ],
    []
  );

  // Create historical data from API data
  const historicalData = useMemo(() => {
    return data.slice(-25).map((record) => ({
      date: new Date(record.timestamp).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
      sentiment: record.sentiment_value
    }));
  }, [data]);

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
          <div className="text-sm">Please log in to view risk sentiment data</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-widget-body overflow-hidden">
      {/* Header - Bloomberg Style */}
      <WidgetHeader
        title="Risk Sentiment"
        onRemove={onRemove}
        onSettings={onSettings}
        onFullscreen={onFullscreen}
        helpContent="Displays real-time market risk sentiment across different asset classes including equities, currencies, commodities, and bonds. Shows risk-on (green), neutral (yellow), or risk-off (red) conditions based on market movements and volatility."
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Status Banner */}
        <div 
          className="px-3 py-2 border-b flex-shrink-0"
          style={{ 
            backgroundColor: `${currentColor}08`,
            borderColor: `${currentColor}30`
          }}
        >
          <div className="flex items-center gap-2">
            <div 
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: currentColor }}
            ></div>
            <p className="text-xs leading-snug" style={{ color: currentColor }}>
              <span style={{ fontWeight: 600 }}>{currentLabel}:</span> {currentDescription}
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading risk sentiment data...</p>
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
              {/* Gauge Section */}
              <div className="px-6 py-6">
                <div className="relative w-full mx-auto" style={{ maxWidth: '320px', height: '170px' }}>
                  <svg 
                    className="w-full h-full" 
                    viewBox="0 0 320 170" 
                    preserveAspectRatio="xMidYMid meet"
                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                  >
                    <defs>
                      {/* Smooth gradient for the gauge */}
                      <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#dc2626" />
                        <stop offset="25%" stopColor="#f97316" />
                        <stop offset="50%" stopColor="#eab308" />
                        <stop offset="75%" stopColor="#84cc16" />
                        <stop offset="100%" stopColor="#22c55e" />
                      </linearGradient>
                      
                      {/* Shadow filter */}
                      <filter id="gaugeShadow">
                        <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
                        <feOffset dx="0" dy="1" result="offsetblur"/>
                        <feComponentTransfer>
                          <feFuncA type="linear" slope="0.2"/>
                        </feComponentTransfer>
                        <feMerge>
                          <feMergeNode/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    
                    {/* Background arc */}
                    <path
                      d="M 40 145 A 120 120 0 0 1 280 145"
                      fill="none"
                      stroke="var(--border)"
                      strokeWidth="24"
                      strokeLinecap="round"
                      opacity="0.3"
                    />
                    
                    {/* Colored arc */}
                    <path
                      d="M 40 145 A 120 120 0 0 1 280 145"
                      fill="none"
                      stroke="url(#gaugeGradient)"
                      strokeWidth="20"
                      strokeLinecap="round"
                      opacity="0.9"
                    />
                    
                    {/* Tick marks */}
                    {[-100, -60, -20, 0, 20, 60, 100].map((value, i) => {
                      const angle = ((value + 100) / 200) * 180 - 90;
                      const radians = (angle * Math.PI) / 180;
                      const x1 = 160 + 110 * Math.cos(radians);
                      const y1 = 145 + 110 * Math.sin(radians);
                      const x2 = 160 + 102 * Math.cos(radians);
                      const y2 = 145 + 102 * Math.sin(radians);
                      
                      return (
                        <line
                          key={i}
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke="var(--foreground)"
                          strokeWidth="2"
                          opacity="0.2"
                        />
                      );
                    })}
                    
                    {/* Labels */}
                    <text x="30" y="150" fill="var(--muted-foreground)" fontSize="10" textAnchor="end" opacity="0.7">
                      -100
                    </text>
                    <text x="160" y="35" fill="var(--muted-foreground)" fontSize="10" textAnchor="middle" opacity="0.7">
                      0
                    </text>
                    <text x="290" y="150" fill="var(--muted-foreground)" fontSize="10" textAnchor="start" opacity="0.7">
                      100
                    </text>
                    
                    {/* Needle with shadow */}
                    <g transform={`rotate(${needleRotation - 90} 160 145)`} filter="url(#gaugeShadow)">
                      {/* Needle shadow */}
                      <path
                        d="M 160 145 L 158 140 L 160 30 L 162 140 Z"
                        fill="rgba(0,0,0,0.2)"
                      />
                      {/* Needle */}
                      <path
                        d="M 160 145 L 158 140 L 160 30 L 162 140 Z"
                        fill={currentColor}
                      />
                      {/* Center circle */}
                      <circle cx="160" cy="145" r="7" fill={currentColor} />
                      <circle cx="160" cy="145" r="4" fill="var(--widget-body)" />
                    </g>
                  </svg>
                </div>
                <div className="mt-4 flex justify-center">
                  <div 
                    className="px-3 py-1 rounded text-xs tracking-wider"
                    style={{ 
                      backgroundColor: `${currentColor}12`,
                      color: currentColor,
                      fontWeight: 600,
                      border: `1px solid ${currentColor}30`
                    }}
                  >
                    {currentLabel}
                  </div>
                </div>
              </div>

              {/* Historical Chart */}
              <div className="px-4 pb-4 flex-1 min-h-0">
                <div className="mb-3">
                  <span className="text-muted-foreground text-xs tracking-wide">HISTORICAL SENTIMENT</span>
                </div>
                
                <div className="relative h-full min-h-[200px] max-h-[280px] bg-widget-header rounded border border-border overflow-hidden">
                  {/* Chart container */}
                  <div className="absolute inset-0 p-4">
                    {/* Y-axis */}
                    <div className="absolute left-0 top-4 bottom-10 w-10 flex flex-col justify-between text-xs text-muted-foreground text-right pr-2">
                      <span>100</span>
                      <span>50</span>
                      <span>0</span>
                      <span>-50</span>
                      <span>-100</span>
                    </div>
                    
                    {/* Chart area */}
                    <div className="absolute left-10 right-4 top-4 bottom-10">
                      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        {/* Sentiment zones */}
                        {sentimentZones.map((zone) => {
                          const zoneTop = 50 - zone.max / 2;
                          const zoneHeight = (zone.max - zone.min) / 2;
                          return (
                            <rect
                              key={zone.label}
                              x="0"
                              width="100"
                              y={zoneTop}
                              height={zoneHeight}
                              fill={zone.fill}
                            />
                          );
                        })}
                        {/* Grid lines */}
                        <line x1="0" y1="0" x2="100" y2="0" stroke="var(--border)" strokeWidth="0.5" opacity="0.3" />
                        <line x1="0" y1="25" x2="100" y2="25" stroke="var(--border)" strokeWidth="0.5" opacity="0.3" />
                        <line x1="0" y1="50" x2="100" y2="50" stroke="var(--primary)" strokeWidth="0.8" opacity="0.4" />
                        <line x1="0" y1="75" x2="100" y2="75" stroke="var(--border)" strokeWidth="0.5" opacity="0.3" />
                        <line x1="0" y1="100" x2="100" y2="100" stroke="var(--border)" strokeWidth="0.5" opacity="0.3" />
                        
                        {/* Area gradient */}
                        <defs>
                          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor={currentColor} stopOpacity="0.2" />
                            <stop offset="100%" stopColor={currentColor} stopOpacity="0.02" />
                          </linearGradient>
                        </defs>
                        
                        {/* Area fill */}
                        <path
                          d={`M 0 50 ${historicalData.map((point, index) => {
                            const x = (index / (historicalData.length - 1)) * 100;
                            const y = 50 - (point.sentiment / 2);
                            return `L ${x} ${y}`;
                          }).join(' ')} L 100 50 Z`}
                          fill="url(#areaGradient)"
                        />
                        
                        {/* Line */}
                        <polyline
                          points={historicalData.map((point, index) => {
                            const x = (index / (historicalData.length - 1)) * 100;
                            const y = 50 - (point.sentiment / 2);
                            return `${x},${y}`;
                          }).join(' ')}
                          fill="none"
                          stroke={currentColor}
                          strokeWidth="2"
                          opacity="0.8"
                          style={{ vectorEffect: 'non-scaling-stroke' }}
                        />
                        
                        {/* Data points */}
                        {historicalData.map((point, index) => {
                          if (index % 3 !== 0 || historicalData.length <= 1) return null;
                          const x = (index / (historicalData.length - 1)) * 100;
                          const y = 50 - (point.sentiment / 2);
                          const pointColor = point.sentiment >= 0 ? "#22c55e" : "#dc2626";
                          
                          // Ensure x and y are valid numbers
                          if (isNaN(x) || isNaN(y)) return null;
                          
                          return (
                            <circle
                              key={index}
                              cx={x}
                              cy={y}
                              r="1.5"
                              fill={pointColor}
                              opacity="0.7"
                            />
                          );
                        })}
                      </svg>
                      <div className="absolute inset-0 pointer-events-none">
                        {sentimentZones.map((zone) => {
                          const zoneTopPercent = 50 - zone.max / 2;
                          const zoneHeightPercent = (zone.max - zone.min) / 2;
                          return (
                            <div
                              key={`${zone.label}-label`}
                              className="absolute w-full flex items-center justify-center"
                              style={{
                                top: `${zoneTopPercent}%`,
                                height: `${zoneHeightPercent}%`
                              }}
                            >
                              <span
                                style={{
                                  color: zone.textColor,
                                  fontSize: '0.55rem',
                                  fontWeight: 600,
                                  letterSpacing: '0.08em',
                                  textTransform: 'uppercase'
                                }}
                              >
                                {zone.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* X-axis labels */}
                    <div className="absolute left-10 right-4 bottom-0 h-10 flex justify-between text-xs text-muted-foreground items-start pt-1">
                      {historicalData.filter((_, i) => i % 6 === 0).map((point, index) => (
                        <span key={index}>{point.date}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="px-4 pb-4">
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#dc2626' }}></div>
                    <span>Strong Off</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#f97316' }}></div>
                    <span>Risk-Off</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#eab308' }}></div>
                    <span>Neutral</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#84cc16' }}></div>
                    <span>Risk-On</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22c55e' }}></div>
                    <span>Strong On</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}