'use client';

import React, { useState, useEffect } from 'react';
import { WidgetHeader } from '@/components/bloomberg-ui/WidgetHeader';
import { WidgetSettingsSlideIn } from '@/components/bloomberg-ui/WidgetSettingsSlideIn';
import {
  fetchAnalystRecommendations,
  transformApiRecommendationsResponse,
  type RatingCounts,
  type HistoricalDataPoint
} from './api';
import { widgetDataCache } from '@/lib/widgetDataCache';

type WidgetSettings = Record<string, unknown>;

interface AnalystRecommendationsProps {
  onSettings?: () => void;
  onRemove?: () => void;
  onFullscreen?: () => void;
  settings?: WidgetSettings;
}

export function AnalystRecommendations({ onSettings, onRemove, onFullscreen, settings = {} }: AnalystRecommendationsProps) {
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);
  const [flashingConsensus, setFlashingConsensus] = useState(false);

  // State for API data
  const [ratingCounts, setRatingCounts] = useState<RatingCounts>({
    'Strong Buy': 0,
    'Buy': 0,
    'Hold': 0,
    'Sell': 0,
    'Strong Sell': 0
  });
  const [consensusRating, setConsensusRating] = useState<string>('');
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync localSettings with external settings prop when it changes
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // Get symbol from localSettings (which updates when user saves from slide-in menu)
  const symbol = (localSettings.symbol as string) || 'NASDAQ:AAL';

  const totalAnalysts = Object.values(ratingCounts).reduce((a, b) => a + b, 0);
  const maxTotal = historicalData.length > 0 
    ? Math.max(...historicalData.map(d => d.strongBuy + d.buy + d.hold + d.sell + d.strongSell))
    : 0;

  // Fetch analyst recommendations when symbol changes
  useEffect(() => {
    const loadRecommendations = async () => {
      const cacheKey = widgetDataCache.generateKey('analyst-recommendations', { symbol });
      const cachedData = widgetDataCache.get<{ ratingCounts: RatingCounts; consensusRating: string; historicalData: HistoricalDataPoint[] }>(cacheKey);
      
      if (cachedData) {
        setRatingCounts(cachedData.ratingCounts);
        setConsensusRating(cachedData.consensusRating);
        setHistoricalData(cachedData.historicalData);
        setIsLoading(false);
        return;
      }

      console.log('🔄 [Analyst Recommendations Component] Starting to load recommendations for:', symbol);
      setIsLoading(true);
      setError(null);
      
      try {
        const apiResponse = await fetchAnalystRecommendations(symbol);
        
        if (!apiResponse) {
          console.error('❌ [Analyst Recommendations Component] API response is null');
          setError('Failed to load analyst recommendations: No response');
          setIsLoading(false);
          return;
        }
        
        if (!apiResponse.success || !apiResponse.data) {
          console.error('❌ [Analyst Recommendations Component] API response not successful');
          setError('Failed to load analyst recommendations: API returned error');
          setIsLoading(false);
          return;
        }
        
        console.log('✅ [Analyst Recommendations Component] Transforming data');
        const transformed = transformApiRecommendationsResponse(apiResponse.data);
        console.log('✅ [Analyst Recommendations Component] Transformed data:', transformed);
        
        setRatingCounts(transformed.ratingCounts);
        setConsensusRating(transformed.consensusRating);
        setHistoricalData(transformed.historicalData);
        widgetDataCache.set(cacheKey, { ratingCounts: transformed.ratingCounts, consensusRating: transformed.consensusRating, historicalData: transformed.historicalData });
        
        setIsLoading(false);
      } catch (err) {
        console.error('❌ [Analyst Recommendations Component] Error loading recommendations:', err);
        setError(err instanceof Error ? err.message : 'Failed to load analyst recommendations');
        setIsLoading(false);
      }
    };
    
    loadRecommendations();
  }, [symbol]);

  // Flash consensus occasionally
  useEffect(() => {
    if (!consensusRating) return;
    
    const interval = setInterval(() => {
      setFlashingConsensus(true);
      
      setTimeout(() => {
        setFlashingConsensus(false);
      }, 300);
    }, 6000);

    return () => clearInterval(interval);
  }, [consensusRating]);

  const getRatingColor = (rating: string): string => {
    switch (rating) {
      case 'Strong Buy':
        return 'bg-green-500/20 text-green-500';
      case 'Buy':
        return 'bg-green-500/10 text-green-400';
      case 'Hold':
        return 'bg-yellow-500/20 text-yellow-500';
      case 'Sell':
        return 'bg-red-500/10 text-red-400';
      case 'Strong Sell':
        return 'bg-red-500/20 text-red-500';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const calculatePercentage = (count: number): number => {
    return (count / totalAnalysts) * 100;
  };

  const handleSaveSettings = (newSettings: Record<string, unknown>) => {
    setLocalSettings(newSettings);
    setIsSettingsPanelOpen(false);
  };

  return (
    <div className="h-full bg-widget-body border border-border rounded-none flex flex-col">
      <WidgetHeader 
        title="Analyst Recommendations"
        subtitle={symbol ? `[@${symbol.replace(/^[^:]+:/, '')}]` : ''}
        onSettings={() => setIsSettingsPanelOpen(true)}
        onRemove={onRemove}
        onFullscreen={onFullscreen}
        helpContent="Analyst consensus rating and distribution. Shows historical rating trends over time with stacked bar chart."
      />
      
      <WidgetSettingsSlideIn
        isOpen={isSettingsPanelOpen}
        onClose={() => setIsSettingsPanelOpen(false)}
        widgetType="analyst-recommendations"
        widgetPosition=""
        currentSettings={localSettings}
        onSave={handleSaveSettings}
      />
      
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-muted-foreground">Loading analyst recommendations...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-destructive">{error}</div>
          </div>
        ) : (
          <>
        {/* Consensus Summary */}
        <div className="bg-background border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Consensus Rating</div>
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded text-base font-semibold transition-all duration-300 ${
                getRatingColor(consensusRating)
              } ${
                flashingConsensus ? 'scale-105 ring-2 ring-primary/50' : ''
              }`}>
                {consensusRating}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground mb-1">Total Analysts</div>
              <div className="text-2xl font-semibold text-primary">{totalAnalysts}</div>
            </div>
          </div>

          {/* Rating Distribution Bar */}
          <div className="space-y-2">
            <div className="flex h-6 rounded-full overflow-hidden bg-background">
              {Object.entries(ratingCounts).map(([rating, count]) => {
                const percentage = calculatePercentage(count);
                if (count === 0) return null;
                
                let bgColor = '';
                switch (rating) {
                  case 'Strong Buy':
                    bgColor = 'bg-green-500';
                    break;
                  case 'Buy':
                    bgColor = 'bg-green-400';
                    break;
                  case 'Hold':
                    bgColor = 'bg-yellow-500';
                    break;
                  case 'Sell':
                    bgColor = 'bg-red-400';
                    break;
                  case 'Strong Sell':
                    bgColor = 'bg-red-500';
                    break;
                }
                
                return (
                  <div
                    key={rating}
                    className={`${bgColor} flex items-center justify-center text-sm font-semibold text-white transition-all duration-300 hover:opacity-80`}
                    style={{ width: `${percentage}%` }}
                    title={`${rating}: ${count} (${percentage.toFixed(1)}%)`}
                  >
                    {percentage > 8 && count}
                  </div>
                );
              })}
            </div>

            {/* Rating Legend */}
            <div className="grid grid-cols-5 gap-2 text-sm">
              {Object.entries(ratingCounts).map(([rating, count]) => (
                <div key={rating} className="flex flex-col items-center">
                  <div className={`px-2 py-1 rounded text-xs font-semibold ${getRatingColor(rating)}`}>
                    {rating.replace(' ', '\n')}
                  </div>
                  <div className="text-muted-foreground mt-1 text-sm">{count}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Historical Rating Trend Chart */}
        <div className="bg-background border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-4 uppercase tracking-wide">Rating Trend Over Time</div>
          
          {/* Legend */}
          <div className="flex items-center gap-4 mb-4 flex-wrap text-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-muted-foreground">Strong Sell</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span className="text-muted-foreground">Sell</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-red-400 rounded"></div>
              <span className="text-muted-foreground">Hold</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-green-400 rounded"></div>
              <span className="text-muted-foreground">Buy</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-purple-500 rounded"></div>
              <span className="text-muted-foreground">Strong Buy</span>
            </div>
          </div>

          {/* Chart */}
          <div className="relative h-64">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-24 w-10 flex flex-col justify-between text-sm text-muted-foreground">
              <span>40</span>
              <span>30</span>
              <span>20</span>
              <span>10</span>
              <span>0</span>
            </div>

            {/* Chart area */}
            <div className="absolute left-12 right-0 top-0 bottom-24 flex items-end justify-between gap-0.5">
              {historicalData.map((data, index) => {
                const total = data.strongBuy + data.buy + data.hold + data.sell + data.strongSell;
                const chartHeight = 100; // percentage
                
                return (
                  <div key={index} className="flex-1 flex flex-col justify-end group relative" style={{ height: '100%' }}>
                    {/* Bar segments */}
                    <div className="flex flex-col-reverse w-full border-r border-border/20">
                      {/* Strong Sell */}
                      {data.strongSell > 0 && (
                        <div 
                          className="bg-blue-500 flex items-center justify-center text-xs font-semibold text-white border-t border-background/20"
                          style={{ height: `${(data.strongSell / maxTotal) * chartHeight}%` }}
                        >
                          {data.strongSell}
                        </div>
                      )}
                      
                      {/* Sell */}
                      {data.sell > 0 && (
                        <div 
                          className="bg-yellow-500 flex items-center justify-center text-xs font-semibold text-white border-t border-background/20"
                          style={{ height: `${(data.sell / maxTotal) * chartHeight}%` }}
                        >
                          {data.sell}
                        </div>
                      )}
                      
                      {/* Hold */}
                      {data.hold > 0 && (
                        <div 
                          className="bg-red-400 flex items-center justify-center text-xs font-semibold text-white border-t border-background/20"
                          style={{ height: `${(data.hold / maxTotal) * chartHeight}%` }}
                        >
                          {data.hold}
                        </div>
                      )}
                      
                      {/* Buy */}
                      {data.buy > 0 && (
                        <div 
                          className="bg-green-400 flex items-center justify-center text-xs font-semibold text-white border-t border-background/20"
                          style={{ height: `${(data.buy / maxTotal) * chartHeight}%` }}
                        >
                          {data.buy}
                        </div>
                      )}
                      
                      {/* Strong Buy */}
                      {data.strongBuy > 0 && (
                        <div 
                          className="bg-purple-500 flex items-center justify-center text-xs font-semibold text-white border-t border-background/20"
                          style={{ height: `${(data.strongBuy / maxTotal) * chartHeight}%` }}
                        >
                          {data.strongBuy}
                        </div>
                      )}
                    </div>
                    
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                      <div className="bg-popover border border-border rounded px-2 py-1 text-sm whitespace-nowrap shadow-lg">
                        <div className="font-semibold mb-1 text-base">{data.date}</div>
                        <div className="space-y-0.5">
                          {data.strongBuy > 0 && <div className="flex items-center gap-1 text-sm"><span className="w-2 h-2 bg-purple-500 rounded"></span> Strong Buy: {data.strongBuy}</div>}
                          {data.buy > 0 && <div className="flex items-center gap-1 text-sm"><span className="w-2 h-2 bg-green-400 rounded"></span> Buy: {data.buy}</div>}
                          {data.hold > 0 && <div className="flex items-center gap-1 text-sm"><span className="w-2 h-2 bg-red-400 rounded"></span> Hold: {data.hold}</div>}
                          {data.sell > 0 && <div className="flex items-center gap-1 text-sm"><span className="w-2 h-2 bg-yellow-500 rounded"></span> Sell: {data.sell}</div>}
                          {data.strongSell > 0 && <div className="flex items-center gap-1 text-sm"><span className="w-2 h-2 bg-blue-500 rounded"></span> Strong Sell: {data.strongSell}</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* X-axis labels */}
            <div className="absolute left-12 right-0 bottom-0 h-24 flex items-start justify-between pt-4">
              {historicalData.map((data, index) => (
                <div 
                  key={index} 
                  className="flex-1 text-center text-xs text-muted-foreground"
                  style={{ 
                    writingMode: index % 2 === 0 ? 'horizontal-tb' : 'horizontal-tb',
                    transform: 'rotate(-45deg)',
                    transformOrigin: 'center',
                    marginTop: '8px'
                  }}
                >
                  {data.date}
                </div>
              ))}
            </div>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AnalystRecommendations;

