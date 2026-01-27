'use client';

/**
 * SingleTicker Widget
 *
 * Real-time price display widget for a single trading symbol.
 * Shows current price, change amount, and percentage change with
 * visual flash effects on price updates.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { WidgetHeader } from '@/components/bloomberg-ui/WidgetHeader';
import { SymbolInfo } from './SymbolInfo';
import { PriceDisplay } from './PriceDisplay';
import { RightSideLayout } from './RightSideLayout';
import { TickerSettings } from './TickerSettings';
import { useTickerData } from './useTickerData';
import { useTemplates } from '@/hooks/useTemplates';
import {
  LayoutType,
  SingleTickerSettings,
  DEFAULT_SETTINGS,
  getSymbolInfo,
} from './types';

interface SingleTickerWidgetProps {
  wgid?: string;
  onRemove?: () => void;
  onSettings?: () => void;
  onFullscreen?: () => void;
  onSaveSettings?: (settings: Record<string, unknown>) => void;
  settings?: Record<string, unknown>;
  additionalSettings?: string;
}

export function SingleTickerWidget({
  wgid = 'single-ticker-1',
  onRemove,
  onFullscreen,
  onSaveSettings,
  settings,
  additionalSettings,
}: SingleTickerWidgetProps) {
  // Parse settings from props or additionalSettings
  const getSettings = useCallback((): SingleTickerSettings => {
    // First try settings object
    if (settings?.symbol) {
      return {
        symbol: (settings.symbol as string) || DEFAULT_SETTINGS.symbol,
        layout: (settings.layout as LayoutType) || DEFAULT_SETTINGS.layout,
        module: (settings.module as string) || DEFAULT_SETTINGS.module,
      };
    }

    // Then try additionalSettings JSON
    if (additionalSettings) {
      try {
        const parsed = JSON.parse(additionalSettings);
        return {
          symbol: parsed.symbol || DEFAULT_SETTINGS.symbol,
          layout: parsed.layout || DEFAULT_SETTINGS.layout,
          module: parsed.module || DEFAULT_SETTINGS.module,
        };
      } catch {
        // Ignore parse errors
      }
    }

    return DEFAULT_SETTINGS;
  }, [settings, additionalSettings]);

  const widgetSettings = getSettings();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedPair, setSelectedPair] = useState(widgetSettings.symbol);
  const [selectedModule, setSelectedModule] = useState(widgetSettings.module);
  const [selectedLayout, setSelectedLayout] = useState<LayoutType>(widgetSettings.layout);

  // Get template context for database updates
  const { activeTemplateId, updateWidgetFields } = useTemplates();

  // Track external settings changes
  const lastPropsSymbolRef = useRef(widgetSettings.symbol);

  // Update state when external settings change
  useEffect(() => {
    const newSettings = getSettings();
    if (newSettings.symbol !== lastPropsSymbolRef.current) {
      lastPropsSymbolRef.current = newSettings.symbol;
      setSelectedPair(newSettings.symbol);
      setSelectedModule(newSettings.module);
      setSelectedLayout(newSettings.layout);
    }
  }, [settings, additionalSettings, getSettings]);

  // Get real-time ticker data
  const { data, status, flashState } = useTickerData({
    symbol: selectedPair,
    enabled: true,
  });

  // Get symbol metadata
  const symbolInfo = getSymbolInfo(selectedPair);

  // Save settings when they change
  const saveSettings = useCallback((newSettings: Partial<SingleTickerSettings>) => {
    if (onSaveSettings) {
      onSaveSettings({
        symbol: newSettings.symbol ?? selectedPair,
        module: newSettings.module ?? selectedModule,
        layout: newSettings.layout ?? selectedLayout,
      });
    }
  }, [onSaveSettings, selectedPair, selectedModule, selectedLayout]);

  // Save settings to database using updateWidgetFieldsWeb API
  const saveSettingsToDatabase = useCallback(async (symbol: string, module: string, layout: LayoutType) => {
    // Get widget ID from settings or wgid
    let widgetIdForApi: string | null = null;

    if (settings?.customDashboardWidgetID) {
      widgetIdForApi = String(settings.customDashboardWidgetID);
      console.log('📊 [SingleTicker] Using customDashboardWidgetID from settings:', widgetIdForApi);
    } else if (wgid) {
      // Check if wgid is composite key (contains hyphens) - skip if so
      if (wgid.includes('-')) {
        console.log('📊 [SingleTicker] wgid is composite key:', wgid, '- skipping direct API call');
      } else {
        const numericWgid = parseInt(wgid, 10);
        if (!isNaN(numericWgid)) {
          widgetIdForApi = wgid;
          console.log('📊 [SingleTicker] Using wgid:', widgetIdForApi);
        }
      }
    }

    // Skip if no valid widget ID or no active template
    if (!widgetIdForApi || !activeTemplateId) {
      console.log('📊 [SingleTicker] Cannot save settings - no valid widget ID or missing activeTemplateId', {
        wgid,
        widgetIdForApi,
        activeTemplateId,
        hasCustomDashboardWidgetID: !!settings?.customDashboardWidgetID
      });
      return;
    }

    try {
      const additionalSettingsObj = {
        symbol: symbol,
        module: module,
        layout: layout
      };

      const updateFields = {
        module: module,
        symbols: symbol,
        additionalSettings: JSON.stringify(additionalSettingsObj),
      };

      console.log('📡 [SingleTicker] Calling updateWidgetFields API:', {
        widgetId: widgetIdForApi,
        templateId: activeTemplateId,
        updateFields
      });

      const result = await updateWidgetFields(widgetIdForApi, activeTemplateId, updateFields);

      if (result.success) {
        console.log('✅ [SingleTicker] Settings saved to database');
      } else {
        console.warn('⚠️ [SingleTicker] Failed to save settings:', result.message);
      }
    } catch (error) {
      console.error('❌ [SingleTicker] Error saving settings to database:', error);
    }
  }, [wgid, settings?.customDashboardWidgetID, activeTemplateId, updateWidgetFields]);

  // Handle symbol change
  const handlePairChange = useCallback((pair: string, module?: string) => {
    setSelectedPair(pair);
    const newModule = module || selectedModule;
    if (module) {
      setSelectedModule(module);
    }
    saveSettings({ symbol: pair, module: newModule });
    // Save to database - use onSaveSettings callback if provided, otherwise use direct API
    if (onSaveSettings) {
      console.log('📊 [SingleTicker] Using onSaveSettings callback');
    } else {
      saveSettingsToDatabase(pair, newModule, selectedLayout);
    }
  }, [saveSettings, selectedModule, selectedLayout, onSaveSettings, saveSettingsToDatabase]);

  // Handle module change
  const handleModuleChange = useCallback((module: string) => {
    setSelectedModule(module);
  }, []);

  // Handle layout change
  const handleLayoutChange = useCallback((layout: LayoutType) => {
    setSelectedLayout(layout);
    saveSettings({ layout });
    // Save to database - use onSaveSettings callback if provided, otherwise use direct API
    if (onSaveSettings) {
      console.log('📊 [SingleTicker] Using onSaveSettings callback');
    } else {
      saveSettingsToDatabase(selectedPair, selectedModule, layout);
    }
  }, [saveSettings, selectedPair, selectedModule, onSaveSettings, saveSettingsToDatabase]);

  // Render loading skeleton for below layout
  const renderLoadingSkeleton = () => (
    <div className="mt-auto space-y-4">
      <div className="border-l-4 border-primary/30 pl-4">
        <div className="h-16 w-48 bg-muted rounded animate-pulse" />
      </div>
      <div className="flex items-center gap-4 pl-4">
        <div className="h-10 w-28 bg-muted rounded animate-pulse" />
        <div className="h-5 w-20 bg-muted rounded animate-pulse" />
      </div>
    </div>
  );

  // Render error state
  const renderError = () => (
    <div className="mt-auto text-center">
      <p className="text-red-500">Connection error</p>
      <p className="text-sm mt-2 text-muted-foreground">
        Unable to connect to price feed
      </p>
    </div>
  );

  // Render loading skeleton for right layout
  const renderRightLayoutSkeleton = () => (
    <div className="flex-1 flex items-center justify-between gap-8">
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-muted animate-pulse" />
        <div>
          <div className="h-8 w-32 bg-muted rounded animate-pulse mb-2" />
          <div className="h-4 w-40 bg-muted rounded animate-pulse" />
        </div>
      </div>
      <div className="space-y-4 text-right">
        <div className="h-16 w-48 bg-muted rounded animate-pulse ml-auto" />
        <div className="flex items-center justify-end gap-4">
          <div className="h-5 w-20 bg-muted rounded animate-pulse" />
          <div className="h-10 w-28 bg-muted rounded animate-pulse" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full h-full bg-background border border-border rounded flex flex-col overflow-hidden relative">
      {/* Header */}
      <WidgetHeader
        title="Single Ticker"
        subtitle={selectedPair}
        onRemove={onRemove}
        onSettings={() => setIsSettingsOpen(true)}
        onFullscreen={onFullscreen}
        helpContent="Real-time price display for a single trading symbol. Shows current price, change amount, and percentage change with visual flash effects on price updates."
        widgetName="Single Ticker" 
      />

      {/* Settings Panel */}
      <TickerSettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        selectedPair={selectedPair}
        selectedModule={selectedModule}
        selectedLayout={selectedLayout}
        onPairChange={handlePairChange}
        onModuleChange={handleModuleChange}
        onLayoutChange={handleLayoutChange}
      />

      {/* Content */}
      <div
        className={`flex-1 flex flex-col p-6 transition-all duration-300 ${
          flashState === 'up'
            ? 'bg-green-500/10'
            : flashState === 'down'
              ? 'bg-red-500/10'
              : ''
        }`}
      >
        {selectedLayout === 'below' ? (
          <>
            {/* Top section with icon and name */}
            <SymbolInfo
              symbol={symbolInfo.symbol}
              description={symbolInfo.description}
              baseCurrency={symbolInfo.baseCurrency}
            />

            {/* Loading state */}
            {status === 'connecting' && !data && renderLoadingSkeleton()}

            {/* Error state */}
            {status === 'error' && !data && renderError()}

            {/* Price section */}
            {data && (
              <PriceDisplay
                price={data.price}
                change={data.change}
                changePercent={data.changePercent}
                showBorder={flashState !== null}
              />
            )}
          </>
        ) : (
          <>
            {/* Loading state for right layout */}
            {status === 'connecting' && !data && renderRightLayoutSkeleton()}

            {/* Error state for right layout */}
            {status === 'error' && !data && (
              <div className="flex-1 flex items-center justify-center">
                {renderError()}
              </div>
            )}

            {/* Data display */}
            {data && (
              <RightSideLayout
                symbol={symbolInfo.symbol}
                description={symbolInfo.description}
                baseCurrency={symbolInfo.baseCurrency}
                price={data.price}
                change={data.change}
                changePercent={data.changePercent}
                showBorder={flashState !== null}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default SingleTickerWidget;
