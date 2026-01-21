'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { WidgetHeader } from '@/components/bloomberg-ui/WidgetHeader';
import { useBondData } from '@/hooks/useBondData';
import { TimeRangePreset, getSymbolById, getDefaultSymbol } from '@/types/bond';
import { Header } from './Header';
import { Footer } from './Footer';
import { BondChartSettings } from './BondChartSettings';

// Dynamic import for TradingView chart (no SSR)
const BondChart = dynamic(() => import('./BondChart'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[200px] sm:min-h-[250px] md:min-h-[300px] flex items-center justify-center bg-widget-body animate-pulse">
      <span className="text-muted-foreground text-xs sm:text-sm">Loading chart...</span>
    </div>
  ),
});

interface BondChartWidgetProps {
  wgid?: string;
  onRemove?: () => void;
  onSettings?: () => void;
  onFullscreen?: () => void;
  onSaveSettings?: (settings: Record<string, unknown>) => void;
  settings?: Record<string, unknown>;
  additionalSettings?: string;
}

export function BondChartWidget({
  wgid = 'bond-chart-1',
  onRemove,
  onFullscreen,
  onSaveSettings,
  settings,
  additionalSettings,
}: BondChartWidgetProps) {
  // Parse settings from props or additionalSettings
  const getInitialSettings = () => {
    if (settings?.symbol) {
      return {
        symbol: settings.symbol as string,
        timeRange: (settings.timeRange as TimeRangePreset) || '1M',
        displayMode: (settings.displayMode as string) || 'yield',
      };
    }
    if (additionalSettings) {
      try {
        const parsed = JSON.parse(additionalSettings);
        return {
          symbol: parsed.symbol || getDefaultSymbol(),
          timeRange: parsed.timeRange || '1M',
          displayMode: parsed.displayMode || 'yield',
        };
      } catch {
        // Ignore parse errors
      }
    }
    return {
      symbol: getDefaultSymbol(),
      timeRange: '1M' as TimeRangePreset,
      displayMode: 'yield',
    };
  };

  const initialSettings = getInitialSettings();

  const [timeRange, setTimeRange] = useState<TimeRangePreset>(initialSettings.timeRange);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState(initialSettings.symbol);
  const [selectedDisplay, setSelectedDisplay] = useState(initialSettings.displayMode);

  const { data, status, error, refetch, stats, lastUpdated } = useBondData({
    symbol: selectedSymbol,
    timeRange,
    enabled: true,
  });

  // Get display info based on selected symbol
  const displayInfo = useMemo(() => {
    const symbolData = getSymbolById(selectedSymbol);
    const displayMode = selectedDisplay === 'yield' ? 'Yield' : 'Price';

    return {
      title: symbolData ? `${symbolData.name} ${displayMode}` : `${selectedSymbol} ${displayMode}`,
      legendLabel: `${symbolData?.maturity || ''} ${displayMode}`,
    };
  }, [selectedSymbol, selectedDisplay]);

  // Save settings when they change
  const handleSymbolChange = (symbol: string) => {
    setSelectedSymbol(symbol);
    if (onSaveSettings) {
      onSaveSettings({ symbol, timeRange, displayMode: selectedDisplay });
    }
  };

  const handleDisplayChange = (display: string) => {
    setSelectedDisplay(display);
    if (onSaveSettings) {
      onSaveSettings({ symbol: selectedSymbol, timeRange, displayMode: display });
    }
  };

  const handleTimeRangeChange = (range: TimeRangePreset) => {
    setTimeRange(range);
    if (onSaveSettings) {
      onSaveSettings({ symbol: selectedSymbol, timeRange: range, displayMode: selectedDisplay });
    }
  };

  return (
    <div className="w-full h-full bg-widget-header border border-border rounded flex flex-col relative overflow-hidden">
      {/* Widget Header */}
      <WidgetHeader
        title="Bond Chart"
        subtitle={displayInfo.title}
        onRemove={onRemove}
        onSettings={() => setIsSettingsOpen(true)}
        onFullscreen={onFullscreen}
        helpContent="Bond yields visualization with historical data and time range selection. Shows yield curves for government bonds from multiple countries with customizable time periods."
        widgetName="Bond Chart"
      />

      {/* Header with Timeframe Selector */}
      <Header
        selectedRange={timeRange}
        onRangeChange={handleTimeRangeChange}
        change={stats?.changePercent}
        roc={stats?.roc}
        displayMode={selectedDisplay}
      />

      {/* Loading State */}
      {status === 'loading' && data.length === 0 && (
        <div className="flex-1 p-2 sm:p-4 bg-widget-body">
          <div className="h-full bg-widget-header rounded animate-pulse" />
        </div>
      )}

      {/* Error State */}
      {status === 'error' && (
        <div className="flex-1 p-2 sm:p-4 bg-widget-body flex items-center justify-center">
          <div className="text-center px-4">
            <p className="text-destructive text-xs sm:text-sm">Failed to load bond data</p>
            <p className="text-[10px] sm:text-xs mt-1 text-muted-foreground">
              {error?.message || 'Please try again later'}
            </p>
            <button
              onClick={refetch}
              className="mt-3 px-3 sm:px-4 py-1.5 sm:py-2 bg-primary text-primary-foreground text-xs sm:text-sm rounded hover:bg-primary/90 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Chart Area */}
      {data.length > 0 && (
        <div className="flex-1 p-2 sm:p-4 bg-widget-body overflow-hidden">
          <BondChart data={data} />
        </div>
      )}

      {/* No Data State */}
      {status === 'success' && data.length === 0 && (
        <div className="flex-1 p-2 sm:p-4 bg-widget-body flex items-center justify-center">
          <p className="text-xs sm:text-sm text-muted-foreground">
            No data available for selected period
          </p>
        </div>
      )}

      {/* Footer Stats */}
      <Footer
        current={stats?.current}
        high={stats?.high}
        low={stats?.low}
        lastUpdated={lastUpdated}
        displayMode={selectedDisplay}
      />

      {/* Settings Panel */}
      <BondChartSettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        selectedSymbol={selectedSymbol}
        selectedDisplay={selectedDisplay}
        onSymbolChange={handleSymbolChange}
        onDisplayChange={handleDisplayChange}
      />
    </div>
  );
}

export default BondChartWidget;
