"use client";

import React, { useState, useEffect } from 'react';
import { WidgetHeader } from '@/components/bloomberg-ui/WidgetHeader';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { SentimentData, getNewsSentimentData } from './api';

interface NewsSentimentProps {
  id?: string;
  onRemove?: () => void;
  onSettings?: () => void;
  onFullscreen?: () => void;
  wgid?: string;
  settings?: Record<string, any>;
}

export default function NewsSentiment({ id, onRemove, onSettings, onFullscreen, wgid, settings }: NewsSentimentProps) {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [sentimentData, setSentimentData] = useState<SentimentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get settings with defaults
  const module = settings?.module || 'Forex';
  const symbols = settings?.symbols || 'EURUSD';
  const widgetTitle = settings?.widgetTitle || 'sentiment_score';
  
  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const result = await getNewsSentimentData(symbols, module, widgetTitle);
        
        if (!result || !result.success) {
          setError(result?.error || 'Failed to fetch sentiment data');
          setSentimentData([]);
          setLoading(false);
          return;
        }
        
        if (result.data && result.data.length > 0) {
          // Filter to show only last 30 days
          const last30Days = result.data.slice(-30);
          setSentimentData(last30Days);
        } else {
          setSentimentData([]);
        }
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch sentiment data');
        setSentimentData([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [symbols, module, widgetTitle]);
  
  // Calculate max value for scaling (handle empty data)
  const maxTotal = sentimentData.length > 0 
    ? Math.max(...sentimentData.map(d => d.negative + d.neutral + d.positive))
    : 0;
  const yAxisMax = Math.max(Math.ceil(maxTotal + 1), 1); // Minimum of 1 to prevent division by zero
  
  // Calculate totals for summary (fallback when not hovering)
  const totalPositive = sentimentData.reduce((sum, d) => sum + d.positive, 0);
  const totalNeutral = sentimentData.reduce((sum, d) => sum + d.neutral, 0);
  const totalNegative = sentimentData.reduce((sum, d) => sum + d.negative, 0);
  const grandTotal = totalPositive + totalNeutral + totalNegative;
  
  // Get hovered bar data or use totals
  const hoveredData = hoveredBar !== null && sentimentData[hoveredBar] 
    ? sentimentData[hoveredBar]
    : null;
  
  const displayPositive = hoveredData ? hoveredData.positive : totalPositive;
  const displayNeutral = hoveredData ? hoveredData.neutral : totalNeutral;
  const displayNegative = hoveredData ? hoveredData.negative : totalNegative;
  const displayTotal = hoveredData 
    ? hoveredData.positive + hoveredData.neutral + hoveredData.negative
    : grandTotal;
  
  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] border border-border text-white">
      <WidgetHeader 
        title={
          <span>
            News Sentiment <span className="text-[#FF6B00]">[{symbols}]</span>
          </span>
        }
        onRemove={onRemove}
        onSettings={onSettings}
        onFullscreen={onFullscreen}
      />
      
      <div className="flex-1 flex flex-col p-4 overflow-hidden min-h-0">
        {/* Loading or Error State */}
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-sm text-gray-400">Loading sentiment data...</div>
          </div>
        )}
        
        {error && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-sm text-red-400">Error: {error}</div>
          </div>
        )}
        
        {!loading && !error && sentimentData.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-sm text-gray-400">No sentiment data available</div>
          </div>
        )}
        
        {/* Modern Legend with Stats */}
        {!loading && !error && sentimentData.length > 0 && (
          <>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20">
              <TrendingDown className="w-3 h-3 text-red-500" />
              <span className="text-xs text-red-400">Bearish</span>
              <span className="text-xs text-gray-400">
                {displayTotal > 0 ? ((displayNegative / displayTotal) * 100).toFixed(0) : 0}%
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#FF6B00]/10 border border-[#FF6B00]/20">
              <Minus className="w-3 h-3 text-[#FF6B00]" />
              <span className="text-xs text-[#FF9A4D]">Neutral</span>
              <span className="text-xs text-gray-400">
                {displayTotal > 0 ? ((displayNeutral / displayTotal) * 100).toFixed(0) : 0}%
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20">
              <TrendingUp className="w-3 h-3 text-green-500" />
              <span className="text-xs text-green-400">Bullish</span>
              <span className="text-xs text-gray-400">
                {displayTotal > 0 ? ((displayPositive / displayTotal) * 100).toFixed(0) : 0}%
              </span>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            Total Articles: <span className="text-white">{grandTotal}</span>
          </div>
        </div>
        
        {/* Chart Area */}
        <div className="flex-1 flex gap-4 min-w-0">
          {/* Y-axis */}
          <div className="flex flex-col justify-between text-xs text-gray-500 w-6 flex-shrink-0">
            {Array.from({ length: yAxisMax + 1 }, (_, i) => yAxisMax - i).map((value) => (
              <div key={value} className="text-right pr-2">{value}</div>
            ))}
          </div>
          
          {/* Chart Container - Auto-scaling */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden min-h-0">
            <div className="flex flex-col flex-1 min-h-0 w-full">
              <div className="flex-1 relative min-h-0 overflow-visible">
                {/* Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  {Array.from({ length: yAxisMax + 1 }).map((_, i) => (
                    <div key={i} className="border-t border-gray-800/30"></div>
                  ))}
                </div>
                
                {/* Tooltip - Follows mouse horizontally */}
                {(() => {
                  const shouldShow = hoveredBar !== null && sentimentData.length > 0 && sentimentData[hoveredBar] && mousePosition;
                  if (!shouldShow) return null;
                  
                  const data = sentimentData[hoveredBar!];
                  return (
                  <div 
                    className="fixed z-[99999] px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-xl whitespace-nowrap pointer-events-none"
                    style={{
                      top: '20%',
                      left: `${mousePosition!.x}px`,
                      transform: 'translateX(-50%)',
                      opacity: 1,
                      visibility: 'visible',
                      display: 'block',
                      backgroundColor: '#1a1a1a',
                      color: 'white',
                      minWidth: '150px'
                    }}
                  >
                    <div className="text-xs text-gray-400 mb-1">{data.date}</div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-2 h-2 bg-green-500"></div>
                        <span className="text-green-400">Bullish:</span>
                        <span className="text-white">{data.positive}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-2 h-2 bg-[#FF6B00]"></div>
                        <span className="text-[#FF9A4D]">Neutral:</span>
                        <span className="text-white">{data.neutral}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-2 h-2 bg-red-500"></div>
                        <span className="text-red-400">Bearish:</span>
                        <span className="text-white">{data.negative}</span>
                      </div>
                    </div>
                    <div className="border-t border-gray-700 mt-1.5 pt-1.5 text-xs text-gray-400">
                      Total: <span className="text-white">{data.negative + data.neutral + data.positive}</span>
                    </div>
                  </div>
                  );
                })()}
                
              {/* Bars */}
              <div className="absolute inset-0 flex items-end gap-[3px] px-1">
                {sentimentData.map((data, index) => {
                  const total = data.negative + data.neutral + data.positive;
                  const totalHeight = (total / yAxisMax) * 100;
                  const negativeHeight = (data.negative / total) * totalHeight;
                  const neutralHeight = (data.neutral / total) * totalHeight;
                  const positiveHeight = (data.positive / total) * totalHeight;
                  const isHovered = hoveredBar === index;
                  
                  return (
                    <div
                      key={index}
                      className="flex-1 flex flex-col justify-end group relative"
                      style={{ height: '100%', minWidth: '20px' }}
                      onMouseEnter={() => setHoveredBar(index)}
                      onMouseLeave={() => {
                        setHoveredBar(null);
                        setMousePosition(null);
                      }}
                      onMouseMove={(e) => {
                        setMousePosition({
                          x: e.clientX,
                          y: e.clientY
                        });
                      }}
                    >
                      <div 
                        className={`w-full flex flex-col justify-end overflow-hidden transition-all duration-200 ${
                          isHovered ? 'opacity-100 scale-105' : 'opacity-100'
                        }`}
                        style={{ height: `${totalHeight}%` }}
                      >
                          {/* Positive (top) */}
                          <div 
                            className={`w-full bg-green-500/60 border border-green-500/80 border-t-2 border-t-green-500 transition-all duration-200 ${
                              isHovered ? 'bg-green-500/70 border-green-500/90 shadow-lg shadow-green-500/40' : ''
                            }`}
                            style={{ height: `${positiveHeight}%` }}
                          ></div>
                          {/* Neutral (middle) */}
                          <div 
                            className={`w-full bg-[#FF6B00]/60 border-x border-[#FF6B00]/80 transition-all duration-200 ${
                              isHovered ? 'bg-[#FF6B00]/70 border-[#FF6B00]/90 shadow-lg shadow-[#FF6B00]/40' : ''
                            }`}
                            style={{ height: `${neutralHeight}%` }}
                          ></div>
                          {/* Negative (bottom) */}
                          <div 
                            className={`w-full bg-red-500/60 border border-red-500/80 border-b-2 border-b-red-500 transition-all duration-200 ${
                              isHovered ? 'bg-red-500/70 border-red-500/90 shadow-lg shadow-red-500/40' : ''
                            }`}
                            style={{ height: `${negativeHeight}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* X-axis labels */}
              <div className="flex gap-[3px] px-1 mt-3 flex-shrink-0">
                {sentimentData.map((data, index) => (
                  <div
                    key={index}
                    className="text-center text-xs text-gray-500"
                    style={{
                      minWidth: '20px',
                      transform: 'rotate(-45deg)',
                      transformOrigin: 'top center',
                      marginTop: '10px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {data.date}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
}
