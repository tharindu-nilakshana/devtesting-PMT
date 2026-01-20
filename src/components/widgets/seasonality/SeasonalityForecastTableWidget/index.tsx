/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import React, { useState, useEffect } from 'react';
import { fetchSeasonalityForecastTable, type SeasonalityForecastRow } from './api';
import { WidgetHeader } from '@/components/bloomberg-ui/WidgetHeader';
import { WidgetSettings } from '@/components/bloomberg-ui/WidgetSettingsSlideIn';
import { useTranslation } from 'react-i18next';
import '@/styles/seasonality/SeasonalityForecastTableWidget/styles/dark.scss';
import '@/styles/seasonality/SeasonalityForecastTableWidget/styles/light.scss';
import { useDateFormat } from '@/hooks/useDateFormat';
import { widgetDataCache } from '@/lib/widgetDataCache';
import { getSymbolShortFormat } from '@/utils/symbolMapping';

interface Props {
  initialData?: SeasonalityForecastRow[];
  initialSymbol?: string;
  initialModule?: string;
  initialError?: string;
  onRemove?: () => void; // Close button functionality
  onSettings?: () => void; // Settings button functionality
  onFullscreen?: () => void; // Fullscreen functionality
  settings?: WidgetSettings; // Widget settings from settings dialog
}

// Removed local formatDate - now using formatDateUtil with user preferences

// Display prognosis exactly as from API - no formatting
function formatPrognosis(value: string | number): string {
  return String(value);
}

function getTrendIcon(trend: SeasonalityForecastRow['trend']): React.ReactNode {
  if (trend === 'bullish') {
    return <span className="text-xl sf-text-success" aria-label="Bullish">↑</span>;
  }
  if (trend === 'bearish') {
    return <span className="text-xl sf-text-destructive" aria-label="Bearish">↓</span>;
  }
  return <span className="text-xl sf-text-neutral" aria-label="Neutral">→</span>;
}


export default function SeasonalityForecastWidget({
  initialData = [],
  initialSymbol = 'EURUSD',
  initialModule = 'Forex',
  initialError,
  onRemove,
  onSettings,
  onFullscreen,
  settings,
}: Props) {
  const { t } = useTranslation();
  const { format: formatDate, dateFormat } = useDateFormat();
  // Use symbol from settings if available, otherwise use initialSymbol
  const symbolFromSettings = (settings?.symbol as string) || initialSymbol;
  
  const [rows, setRows] = useState<SeasonalityForecastRow[]>(initialData);
  const [currentSymbol, setCurrentSymbol] = useState(symbolFromSettings);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError || null);
  const [isSSRData, setIsSSRData] = useState(!!initialData && initialData.length > 0);
  const hasLoadedDataRef = React.useRef<boolean>(false);
  const isLoadingRef = React.useRef<boolean>(false);

  const processedData = React.useMemo(() => {
    // Limit to 90 rows maximum
    return rows.slice(0, 90);
  }, [rows]);

  // Force re-render when date format preference changes
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);
  
  React.useEffect(() => {
    // Re-render table when date format changes
    forceUpdate();
  }, [dateFormat]);

  const loadNewSymbol = async (newSymbol: string) => {
    if (newSymbol === currentSymbol && rows.length > 0) {
      return;
    }

    // Prevent duplicate calls
    if (isLoadingRef.current) {
      console.log('⏭️ [SeasonalityForecastTableWidget] Already loading, skipping duplicate call');
      return;
    }

    // Check cache first
    const cacheKey = widgetDataCache.generateKey('seasonality-forecast-table', { symbol: newSymbol, module: initialModule });
    const cachedData = widgetDataCache.get<SeasonalityForecastRow[]>(cacheKey);
    
    if (cachedData) {
      console.log('✅ [SeasonalityForecastTableWidget] Using cached data');
      setRows(cachedData);
      setCurrentSymbol(newSymbol);
      hasLoadedDataRef.current = true;
      return;
    }

    setLoading(true);
    setError(null);
    setIsSSRData(false);
    isLoadingRef.current = true;

    try {
      const res = await fetchSeasonalityForecastTable({
        symbol: newSymbol,
        module: initialModule,
      });     

      if (res && res.success && Array.isArray(res.data)) {
        setRows(res.data);
        setCurrentSymbol(newSymbol);
        hasLoadedDataRef.current = true;
        // Cache the result
        widgetDataCache.set(cacheKey, res.data);
      } else {
        setError(res?.error || 'Failed to load data');
      }
    } catch (e: unknown) {
      console.error('❌ DEBUG: Error in loadNewSymbol:', e);
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  // Load initial data if no SSR data provided
  useEffect(() => {
    if (rows.length === 0 && !hasLoadedDataRef.current) {
      loadNewSymbol(currentSymbol);
    }
  }, [currentSymbol, rows.length, loadNewSymbol]);

  // Watch for settings changes and reload data when symbol changes
  useEffect(() => {
    const newSymbol = (settings?.symbol as string) || initialSymbol;
    if (newSymbol && newSymbol !== currentSymbol && !isLoadingRef.current) {
      hasLoadedDataRef.current = false; // Reset to allow new load
      loadNewSymbol(newSymbol);
    }
  }, [settings?.symbol, currentSymbol, initialSymbol, loadNewSymbol]);

  return (
    <div className="seasonality-forecast-table-widget w-full h-full flex flex-col border border-border rounded-none overflow-hidden">
      {/* Header - Bloomberg Style */}
      <WidgetHeader
        title={
          <span>
            {t('Widgets.SeasonalityForecastTable')} <span className="text-primary">[{getSymbolShortFormat(currentSymbol)}]</span>
          </span>
        }
        widgetName="Seasonality Forecast Table"
        onRemove={onRemove}
        onSettings={onSettings}
        onFullscreen={onFullscreen}
        helpContent="Shows seasonal forecast data in table format with probability percentages and trend predictions. Displays forecast horizon, probability of occurrence, and expected price movements for forex pairs."
      >
        {/* Status Indicators */}
        <div className="flex items-center gap-4 mr-2">
          {isSSRData && (
            <span className="text-base text-green-400 bg-green-400/10 px-4 py-2 rounded font-semibold">
              SSR
            </span>
          )}
          {loading && <div className="text-base sf-text-secondary font-semibold">Loading…</div>}
          {error && <div className="text-base text-red-400 font-semibold">{error}</div>}
        </div>
      </WidgetHeader>

      {/* Table Container */}
      <div className="flex-1 overflow-auto bg-[#0F0F0F]">
        <table className="sf-table w-full">
        <thead>
          <tr className="sf-header">
            <th className="py-2 pl-4 font-semibold text-left w-48">Forecast</th>
            <th className="py-2 font-semibold text-center">Probability</th>
            <th className="py-2 font-semibold text-center"></th>
            <th className="py-2 pr-4 font-semibold text-right w-48">Seasonality Prediction</th>
          </tr>
        </thead>
        <tbody>
          {processedData.length > 0 ? (
            processedData.map((item, index) => (
              <tr key={`${item.symbol}-${item.horizon}-${index}`} className="sf-row">
                <td className="py-2 pl-4">
                  <div>
                    <span className="sf-text-primary font-medium">
                      {item.horizon} days ({formatDate(item.date)})
                    </span>
                  </div>
                </td>
                <td className="text-center py-2">
                  <span className="font-medium sf-text-primary">
                    {item.probability}%
                  </span>
                </td>
                <td className="text-center py-2 w-8">
                  <span className="text-xl">{getTrendIcon(item.trend)}</span>
                </td>
                <td className="text-right py-2 pr-4">
                  <div className="flex items-baseline justify-end gap-2">
                    <span className={`font-medium ${Number(item.prognosis) >= 0 ? 'sf-text-success' : 'sf-text-destructive'}`}>
                      {formatPrognosis(item.prognosis)}
                    </span>
                    <span className="sf-text-secondary">({item.changeValue})</span>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="text-center py-8 sf-text-secondary">
                {error ? 'Failed to load forecast data' : 'No forecast data available'}
              </td>
            </tr>
          )}
        </tbody>
        </table>
      </div>
    </div>
  );
}