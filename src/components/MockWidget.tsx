/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from 'react';
import { MockWidgetProps, LayoutType } from '../types';
import { WidgetComponents } from './widgets';
import { initializeWidget } from '../utils/widgetInitializer';

interface MockWidgetPropsWithSSR extends MockWidgetProps {
  ssrSeasonalityPerformanceData?: string;
  ssrSeasonalityPerformanceSymbol?: string;
  ssrWidgetData?: {
    seasonalityForecast: any;
    seasonalityPerformance: any;
    currencyStrength: any;
    realtimeNews: any;
    riskSentiment: any;
  };
}

export function MockWidget({ widget, sectionId, onUpdateWidgetConfig, renderNestedLayout, onRemoveNestedSections, ssrSeasonalityPerformanceData, ssrSeasonalityPerformanceSymbol, ssrWidgetData }: MockWidgetPropsWithSSR) {
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const [cotChartSSRData, setCotChartSSRData] = useState<Record<string, unknown> | null>(null);
  const [seasonalityData, setSeasonalityData] = useState<Record<string, unknown> | null>(null);

  // Cleanup effect to handle widget removal
  useEffect(() => {
    const handleCleanup = (event: CustomEvent) => {
      if (event.detail?.sectionId === sectionId) {
        console.log('🧹 [MockWidget] Cleaning up widget:', sectionId);
        // Clear any pending state updates
        setCotChartSSRData(null);
        setSeasonalityData(null);
      }
    };

    window.addEventListener('widget-cleanup', handleCleanup as EventListener);
    
    return () => {
      window.removeEventListener('widget-cleanup', handleCleanup as EventListener);
    };
  }, [sectionId]);

  // Fetch initial data for COT Chart View widget
  // DISABLED: Let the widget handle its own data fetching with cache to avoid delays
  // useEffect(() => {
  //   if (widget.id === 'cot-chart-view') {
  //     let isMounted = true; // Flag to prevent state updates if component unmounts
  //     
  //     const fetchInitialData = async () => {
  //       try {
  //         const response = await fetch('/api/cot/cot-history-chart', {
  //           method: 'POST',
  //           headers: {
  //             'Content-Type': 'application/json',
  //           },
  //           body: JSON.stringify({
  //             widgetId: sectionId,
  //             symbolPart: 'USD',
  //             type: 'LongShortPosition',
  //             owner: 'Dealer',
  //             interval: '730',
  //             typ: 'optional'
  //           })
  //         });
  //         
  //         if (response.ok && isMounted) {
  //           const result = await response.json();
  //           if (result.success && result.data && isMounted) {
  //             setCotChartSSRData(result.data);
  //           }
  //         }
  //       } catch (error) {
  //         if (isMounted) {
  //           console.warn('Failed to fetch COT Chart initial data:', error);
  //         }
  //       }
  //     };
  //     
  //     fetchInitialData();
  //     
  //     // Cleanup function to prevent state updates after unmount
  //     return () => {
  //       isMounted = false;
  //     };
  //   }
  // }, [widget.id, sectionId]);

  // Fetch initial data for Seasonality Forecast Chart widget
  // DISABLED: Let the widget handle its own data fetching to avoid delays
  // useEffect(() => {
  //   if (widget.id === 'seasonality-forecast-chart') {
  //     let isMounted = true; // Flag to prevent state updates if component unmounts
  //     
  //     const fetchInitialData = async () => {
  //       try {
  //         const response = await fetch('/api/seasonality/seasonality-forecast-chart', {
  //           method: 'POST',
  //           headers: {
  //             'Content-Type': 'application/json',
  //           },
  //           body: JSON.stringify({
  //             symbol: 'EURUSD',
  //             baseYear: '15'
  //           })
  //         });
  //         
  //         if (response.ok && isMounted) {
  //           const result = await response.json();
  //           if (isMounted) {
  //             console.log('✅ [MockWidget] Seasonality data fetched:', {
  //               success: result.success,
  //               symbol: result.symbol,
  //               chartDataLength: result.chartData?.length,
  //               categoryLength: result.category?.length
  //             });
  //             if (result.success) {
  //               setSeasonalityData(result);
  //             }
  //           }
  //         }
  //       } catch (error) {
  //         if (isMounted) {
  //           console.warn('Failed to fetch Seasonality Chart initial data:', error);
  //         }
  //       }
  //     };
  //     
  //     fetchInitialData();
  //     
  //     // Cleanup function to prevent state updates after unmount
  //     return () => {
  //       isMounted = false;
  //     };
  //   }
  // }, [widget.id, sectionId]);

  // Widget initialization following the legacy detection pattern (disabled for now)
  useEffect(() => {
    // Temporarily disabled to allow React components to work
    if (false) {
      const initWidget = async () => {
        // Map our widget IDs to legacy widget types (wgtl)
        const widgetTypeMap: Record<string, string> = {
          'realtime-news-ticker': 'realtime_news_ticker',
          // Legacy currency strength mapping removed - now using React widget
          // Add more mappings as needed
        };

        const wgtl = widgetTypeMap[widget.id];
        if (wgtl && containerRef.current) {
          try {
            // Create mock obj with AdditionalSettings (like legacy code)
            const obj = {
              AdditionalSettings: getDefaultAdditionalSettings(wgtl)
            };

            // Use sectionId as wgid (widget ID)
            await initializeWidget(wgtl, sectionId, obj, containerRef.current);
          } catch (error) {
            console.error(`[MockWidget] Failed to initialize widget ${widget.id}:`, error);
          }
        }
      };

      initWidget();
    }
  }, [widget.id, sectionId]);

  // Get default additional settings for each widget type
  const getDefaultAdditionalSettings = (wgtl: string): string => {
    switch (wgtl) {
      case 'realtime_news_ticker':
        return 'DAX,CAC,SMI,US Equities,Asian Equities,FTSE 100,European Equities,Global Equities,UK Equities,EUROSTOXX,US Equity Plus,US Data,Swiss Data,EU Data,Canadian Data,Other Data,UK Data,Other Central Banks,BoC,RBNZ,RBA,SNB,BoJ,BoE,ECB,PBoC,Fed,Bank Research,Fixed Income,Geopolitical,Rating Agency comments,Global News,Market Analysis,FX Flows,Asian News,Economic Commentary,Brexit,Energy & Power,Metals,Ags & Softs,Crypto,Emerging Markets,US Election,Trade,Newsquawk Update|Important,Rumour,Highlighted,Normal';
      default:
        return '';
    }
  };

  // Get widget-specific props based on widget ID
  const getWidgetProps = (widgetId: string, sectionId: string) => {
    // Common props for all widgets
    const commonProps = {
      onRemove: () => {
        // Remove widget from this section
        setWidgets(prev => {
          const next = { ...prev };
          delete next[sectionId];
          return next;
        });
      }
    };

    switch (widgetId) {
      case 'risk-sentiment':
        return { 
          widgetType: 'risk_sentiment' as const,
          wgid: sectionId,
          useLegacyPattern: false,
          ssrInitialData: ssrWidgetData?.riskSentiment?.data,
          ...commonProps
        };
      case 'risk-indicator':
        return { 
          widgetType: 'risk_indicator' as const,
          wgid: sectionId,
          useLegacyPattern: false,
          ...commonProps
        };
      case 'risk-sentiment-chart':
        return { 
          widgetType: 'risk_sentiment' as const,
          wgid: sectionId,
          useLegacyPattern: false,
          ...commonProps
        };
      // Legacy currency strength case removed - now using React widget
      case 'realtime-news-ticker':
        return {
          useLegacyPattern: false,
          ssrInitialData: ssrWidgetData?.realtimeNews?.data,
          ...commonProps
        };
      case 'cot-chart-view':
        return {
          wgid: sectionId,
          wght: 500,
          additionalSettings: 'USD|Dealer Intermediary|1825|0|Bar Chart',
          templateName: 'Dashboard',
          isStandalone: false,
          useLegacyPattern: false,
          ssrInitialData: cotChartSSRData,
          ...commonProps
        };
      case 'cot-positioning':
        return {
          wgid: sectionId,
          wght: 400,
          additionalSettings: 'USD|Dealer',
          templateName: 'Dashboard',
          isStandalone: false,
          ...commonProps
        };
      // Seasonality widgets
      case 'seasonality-forecast':
        // Skip SSR for this widget - let it load client-side
        return {
          initialData: [],
          initialSymbol: 'EURUSD',
          initialModule: 'Forex',
          initialTimeFrame: '15',
          ...commonProps
        };
      case 'seasonality-forecast-chart':
        return {
          initialData: null, // Let widget fetch its own data
          initialSymbol: 'EURUSD',
          ...commonProps
        };
      case 'seasonality-forecast-table':
        const forecastTableData = ssrWidgetData?.seasonalityForecast?.data;
        return {
          initialData: Array.isArray(forecastTableData) ? forecastTableData : [],
          initialSymbol: 'EURUSD',
          initialModule: 'Forex',
          ...commonProps
        };
      case 'seasonality-performance-table':
        return {
          wgid: sectionId,
          wght: 400,
          additionalSettings: ssrSeasonalityPerformanceSymbol || 'EURUSD',
          templateName: 'Dashboard',
          isStandalone: false,
          useLegacyPattern: false,
          ssrInitialData: ssrWidgetData?.seasonalityPerformance?.data || ssrSeasonalityPerformanceData,
          ssrSymbol: ssrSeasonalityPerformanceSymbol || 'EURUSD',
          ...commonProps
        };
      case 'seasonality-performance-chart':
        return {
          initialData: null,
          initialSymbol: 'EURUSD',
          ...commonProps
        };
      case 'currency-strength':
        return {
          wgid: sectionId,
          wght: 400,
          additionalSettings: '1D|USD,EUR,GBP,JPY,AUD,CAD,CHF,NZD',
          templateName: 'Dashboard',
          isStandalone: false,
          initialData: ssrWidgetData?.currencyStrength?.data,
          ...commonProps
        };
      case 'cot-table-view':
        return {
          wgid: sectionId,
          wght: 400,
          additionalSettings: 'USD|Dealer',
          templateName: 'Dashboard',
          isStandalone: false,
          useLegacyPattern: false,
          ssrInitialData: ssrWidgetData?.cotTableView?.data,
          ssrSymbolPart: ssrWidgetData?.cotTableView?.symbolPart,
          ssrOwner: ssrWidgetData?.cotTableView?.owner,
          ...commonProps
        };
      default:
        return {
          ...commonProps
        };
    }
  };
  
  const renderContent = () => {
    switch (widget.id) {
      case 'tabbed-widget':
        // Dynamic tabs: stored per-widget config
        const tabConfig = widget.config as { tabs?: Array<{ id: string; name: string; layout: LayoutType }> } | undefined;
        const tabs = tabConfig?.tabs || [];
        const [activeTabId] = [widget.config?.activeTabId as string | undefined];
        const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
        return (
          <div className="flex flex-col h-full">
            {/* Content area */}
            <div className="flex-1 min-h-0 p-3 text-neutral-300 text-sm overflow-hidden">
              {tabs.length === 0 ? (
                <div className="text-neutral-400 text-xs">Click + to add a layout tab</div>
              ) : activeTab ? (
                <div className="h-full min-h-0">{renderNestedLayout(activeTab.layout, `${sectionId}::${activeTab.id}`)}</div>
              ) : (
                <div className="text-neutral-400 text-xs">Select a tab to view its layout</div>
              )}
            </div>
            
            {/* Tab bar - conditionally rendered at top or bottom */}
            <div className={`flex items-center justify-between px-3 py-2 bg-neutral-800 ${(widget.config?.tabPosition === 'bottom') ? 'order-last border-t border-neutral-700' : 'order-first border-b border-neutral-700'}`}>
              <div className="flex items-center gap-2 overflow-x-auto">
                {tabs.length === 0 ? (
                  <span className="text-neutral-400 text-xs">No tabs yet</span>
                ) : (
                  tabs.map((t) => (
                    <div key={t.id} className={`flex items-center gap-1 px-1 rounded ${activeTab?.id === t.id ? 'bg-neutral-700' : 'bg-neutral-900 hover:bg-neutral-800'}`}>
                      {editingTabId === t.id ? (
                        <input
                          autoFocus
                          className={`px-2 py-1 text-xs rounded bg-neutral-950 outline-none border border-neutral-600 ${activeTab?.id === t.id ? 'text-neutral-200' : 'text-neutral-400'}`}
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const newName = editingName.trim() || t.name;
                              onUpdateWidgetConfig(sectionId, (prev: Record<string, unknown>) => {
                                const prevTabs = (prev?.tabs || []) as Array<{ id: string; name: string; layout: LayoutType }>;
                                return { ...(prev || {}), tabs: prevTabs.map(tab => tab.id === t.id ? { ...tab, name: newName } : tab) };
                              });
                              setEditingTabId(null);
                            } else if (e.key === 'Escape') {
                              setEditingTabId(null);
                            }
                          }}
                          onBlur={() => {
                            const newName = editingName.trim() || t.name;
                            onUpdateWidgetConfig(sectionId, (prev: Record<string, unknown>) => {
                              const prevTabs = (prev?.tabs || []) as Array<{ id: string; name: string; layout: LayoutType }>;
                              return { ...(prev || {}), tabs: prevTabs.map(tab => tab.id === t.id ? { ...tab, name: newName } : tab) };
                            });
                            setEditingTabId(null);
                          }}
                        />
                      ) : (
                        <>
                          <button
                            className={`px-1.5 py-0.5 text-[11px] rounded whitespace-nowrap ${activeTab?.id === t.id ? 'text-neutral-200' : 'text-neutral-400'}`}
                            onClick={() => {
                              onUpdateWidgetConfig(sectionId, (prev: Record<string, unknown>) => {
                                if (prev?.activeTabId === t.id) return prev; // avoid re-render if already active
                                return { ...(prev || {}), activeTabId: t.id };
                              });
                            }}
                            onDoubleClick={() => {
                              if (activeTab?.id === t.id) {
                                setEditingTabId(t.id);
                                setEditingName(t.name);
                              }
                            }}
                            title="Double click to rename; click to activate"
                          >
                            {t.name}
                          </button>
                          <button
                            className="p-0.5 text-neutral-400 hover:text-white"
                            title="Rename tab"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTabId(t.id);
                              setEditingName(t.name);
                            }}
                          >
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 21v-3.5L16.5 4a2.121 2.121 0 1 1 3 3L6 20H3z" />
                            </svg>
                          </button>
                        </>
                      )}
                      <button
                        className="p-1 text-neutral-400 hover:text-white"
                        title="Close tab"
                        onClick={(e) => {
                          e.stopPropagation();
                          const tabPrefix = `${sectionId}::${t.id}`;
                          onRemoveNestedSections(tabPrefix);
                          onUpdateWidgetConfig(sectionId, (prev: Record<string, unknown>) => {
                            const prevTabs = (prev?.tabs || []) as Array<{ id: string; name: string; layout: LayoutType }>;
                            const filtered = prevTabs.filter((tab) => tab.id !== t.id);
                            let nextActive = prev?.activeTabId;
                            if (nextActive === t.id) nextActive = filtered.length ? filtered[0].id : undefined;
                            return { ...(prev || {}), tabs: filtered, activeTabId: nextActive };
                          });
                        }}
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Tab position toggle controls */}
                <div className="flex items-center gap-1">
                  <button
                    className={`p-1 rounded ${(widget.config?.tabPosition !== 'bottom') ? 'bg-neutral-700 text-neutral-200' : 'text-neutral-400 hover:text-neutral-300'}`}
                    title="Tabs at top"
                    onClick={() => {
                      onUpdateWidgetConfig(sectionId, (prev: Record<string, unknown>) => ({ ...(prev || {}), tabPosition: 'top' }));
                    }}
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M7 14l5-5 5 5" />
                    </svg>
                  </button>
                  <button
                    className={`p-1 rounded ${(widget.config?.tabPosition === 'bottom') ? 'bg-neutral-700 text-neutral-200' : 'text-neutral-400 hover:text-neutral-300'}`}
                    title="Tabs at bottom"
                    onClick={() => {
                      onUpdateWidgetConfig(sectionId, (prev: Record<string, unknown>) => ({ ...(prev || {}), tabPosition: 'bottom' }));
                    }}
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 10l-5 5-5-5" />
                    </svg>
                  </button>
                </div>
                {/* Add tab button */}
                <button
                  data-add-tab
                  className="p-1.5 rounded bg-neutral-700 hover:bg-neutral-600 text-neutral-100"
                  title="Add Tab"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (typeof window !== 'undefined') {
                      const ev = new CustomEvent('open-tabbed-widget-layout-picker', { detail: { widget } });
                      window.dispatchEvent(ev);
                    }
                  }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        );
      

      
      default:
        // Check if we have a specific widget component first
        const WidgetComponent = WidgetComponents[widget.id];
        if (WidgetComponent) {
          // Pass appropriate props based on widget type
          const widgetProps = getWidgetProps(widget.id, sectionId);
          return <WidgetComponent {...widgetProps} />;
        }

        // Fallback: Special handling for widgets using legacy detection pattern (disabled for now)
        if (false && (widget.id === 'realtime-news-ticker' || widget.id === 'currency-strength')) {
          return (
            <div 
              ref={containerRef}
              className={`colDashboardSection${widget.id.replace('-', '_')} h-full w-full`}
              data-wgid={sectionId}
            >
              <div className="DashboardSectionTitle">
                <div className="DashboardSectionTitleText"></div>
              </div>
              <div className="DashboardSection h-full"></div>
            </div>
          );
        }
        
        // Fallback for widgets without specific components
        return (
          <div className="p-4 flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-white text-lg font-bold mb-2">{widget.name}</div>
              <div className="text-neutral-400 text-sm">{widget.description}</div>
              <div className="mt-4 text-xs text-neutral-500">
                Widget implementation pending for {widget.id}
              </div>
            </div>
          </div>
        );
    }
  };

  // Get CustomDashboardWidgetID from widget settings/config for data-wgid attribute
  // Check both config and settings (widgets from templates use settings, others use config)
  const customDashboardWidgetID = (widget.config?.customDashboardWidgetID ?? 
    (widget as any).settings?.customDashboardWidgetID) as number | undefined;
  
  return (
    <div 
      className="w-full h-full min-h-0 bg-neutral-900"
      data-wgid={customDashboardWidgetID ? customDashboardWidgetID.toString() : undefined}
    >
      {renderContent()}
    </div>
  );
}
