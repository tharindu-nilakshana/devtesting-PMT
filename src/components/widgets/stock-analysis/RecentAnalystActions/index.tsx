'use client';

import React, { useState, useEffect } from 'react';
import { WidgetHeader } from '@/components/bloomberg-ui/WidgetHeader';
import { WidgetSettingsSlideIn } from '@/components/bloomberg-ui/WidgetSettingsSlideIn';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { fetchRecentAnalystActions, type Recommendation } from './api';
import { widgetDataCache } from '@/lib/widgetDataCache';

type WidgetSettings = Record<string, unknown>;

interface RecentAnalystActionsProps {
  onSettings?: () => void;
  onRemove?: () => void;
  onFullscreen?: () => void;
  settings?: WidgetSettings;
}

export function RecentAnalystActions({ onSettings, onRemove, onFullscreen, settings = {} }: RecentAnalystActionsProps) {
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);
  const [recentRecommendations, setRecentRecommendations] = useState<Recommendation[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flashingCells, setFlashingCells] = useState<Set<number>>(new Set());

  // Sync localSettings with external settings prop when it changes
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // Fetch recent analyst actions data
  useEffect(() => {
    const loadData = async () => {
      const cacheKey = widgetDataCache.generateKey('recent-analyst-actions', {});
      const cachedData = widgetDataCache.get<{ recommendations: Recommendation[]; currentPrice: number }>(cacheKey);
      
      if (cachedData) {
        setRecentRecommendations(cachedData.recommendations);
        setCurrentPrice(cachedData.currentPrice);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      
      try {
        const data = await fetchRecentAnalystActions();
        if (data) {
          setRecentRecommendations(data.recommendations);
          setCurrentPrice(data.currentPrice);
          widgetDataCache.set(cacheKey, { recommendations: data.recommendations, currentPrice: data.currentPrice });
        } else {
          setError('Failed to load recent analyst actions data');
        }
      } catch (err) {
        console.error('❌ [Recent Analyst Actions] Error loading data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

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

  const getChangeIcon = (change?: string) => {
    if (!change) return null;
    
    switch (change) {
      case 'upgrade':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'downgrade':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'maintain':
        return <Minus className="w-4 h-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const handleSaveSettings = (newSettings: Record<string, unknown>) => {
    setLocalSettings(newSettings);
    setIsSettingsPanelOpen(false);
  };

  return (
    <div className="h-full bg-widget-body border border-border rounded-none flex flex-col">
      <WidgetHeader 
        title="Recent Analyst Actions"
        onSettings={() => setIsSettingsPanelOpen(true)}
        onRemove={onRemove}
        onFullscreen={onFullscreen}
        helpContent="Recent analyst rating changes and price target updates. Shows upgrade, downgrade, and maintain actions with price targets."
      />
      
      <WidgetSettingsSlideIn
        isOpen={isSettingsPanelOpen}
        onClose={() => setIsSettingsPanelOpen(false)}
        widgetType="recent-analyst-actions"
        widgetPosition=""
        currentSettings={localSettings}
        onSave={handleSaveSettings}
      />
      
      <div className="flex-1 overflow-auto">
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-sm text-muted-foreground">Loading recent analyst actions...</div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-64">
            <div className="text-sm text-destructive">{error}</div>
          </div>
        )}

        {!isLoading && !error && (
          <div className="bg-background border-b border-border">
            {recentRecommendations.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-sm text-muted-foreground">No recent analyst actions available</div>
              </div>
            ) : (
              <table className="w-full text-base">
                <thead className="sticky top-0 bg-background z-10 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-2 text-sm font-medium text-muted-foreground">Date</th>
                    <th className="text-left px-4 py-2 text-sm font-medium text-muted-foreground">Firm</th>
                    <th className="text-left px-4 py-2 text-sm font-medium text-muted-foreground">Analyst</th>
                    <th className="text-left px-4 py-2 text-sm font-medium text-muted-foreground">Rating</th>
                    <th className="text-right px-4 py-2 text-sm font-medium text-muted-foreground">Target</th>
                    <th className="text-center px-4 py-2 text-sm font-medium text-muted-foreground">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRecommendations.map((rec, index) => {
                    const isFlashing = flashingCells.has(index);
                    const targetUpside = currentPrice > 0 ? ((rec.priceTarget - currentPrice) / currentPrice) * 100 : 0;
                    
                    return (
                      <tr 
                        key={index}
                        className={`hover:bg-muted/5 transition-all duration-300 ${
                          isFlashing ? 'bg-primary/10 scale-[1.01]' : ''
                        }`}
                      >
                    <td className="px-4 py-2 text-sm text-muted-foreground">{rec.date}</td>
                    <td className="px-4 py-2 text-sm">{rec.firm}</td>
                    <td className="px-4 py-2 text-sm text-muted-foreground">
                      {rec.analyst || 'N/A'}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-block px-2 py-1 rounded text-sm font-semibold ${getRatingColor(rec.rating)}`}>
                        {rec.rating}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {rec.priceTarget > 0 ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-sm font-semibold">${rec.priceTarget.toFixed(2)}</span>
                          {currentPrice > 0 && (
                            <span className={`text-xs ${
                              targetUpside >= 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {targetUpside >= 0 ? '+' : ''}{targetUpside.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">N/A</span>
                      )}
                    </td>
                        <td className="px-4 py-2 text-center">
                          {getChangeIcon(rec.change)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default RecentAnalystActions;

