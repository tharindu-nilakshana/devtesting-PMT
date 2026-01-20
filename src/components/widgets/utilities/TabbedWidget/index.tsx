/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Settings2, X, Trash2, Loader2 } from 'lucide-react';
import * as Icons from 'lucide-react';
import { LayoutType } from '@/types';
import { WidgetComponents } from '../../index';
import { availableWidgets } from '@/constants/widgets';
import { insertTabGridPosition, getTabGridPositionsByTabId } from '@/lib/gridPositionApi';
import { calculateTabbedWidgetPositions, getTabbedWidgetCellPosition } from '@/utils/gridPositionCalculator';
import { insertTabWidget, getAllTabWidgets, deleteTabWidget, updateTabWidget, renameDashboardTab, type InsertTabWidgetRequest } from '@/lib/tabWidgetApi';
import { parseWidthPercentages, parseHeightPercentages } from '@/utils/gridPositionParser';
import { ConfirmDialog } from '@/components/bloomberg-ui/ConfirmDialog';
import { TabMenuWidgetSettings } from './TabMenuWidgetSettings';
import { LockedWidgetOverlay } from '@/components/widgets/LockedWidgetOverlay';
import { WidgetPanel } from '@/components/bloomberg-ui/WidgetPanel';
import { ResizablePair } from '@/components/bloomberg-ui/ResizablePair';
import { ResizableGroup } from '@/components/bloomberg-ui/ResizableGroup';
import { useTemplates } from '@/hooks/useTemplates';
import type { Widget } from '@/types';
import { shouldShowSettingsIcon } from '@/utils/widgetSettings';
import { 
  clearTabStorageKeys, 
  clearAllTabbedWidgetStorageKeys,
  clearTabbedWidgetState,
  loadTabbedWidgetState,
  saveTabbedWidgetState,
  type TabbedWidgetState
} from '@/lib/tabbedWidgetStorage';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { WidgetSettingsSlideIn, type WidgetSettings } from '@/components/bloomberg-ui/WidgetSettingsSlideIn';

interface TabbedWidgetProps {
  wgid?: string;
  onRemove?: () => void;
  onSettings?: () => void;
  onFullscreen?: () => void;
  settings?: Record<string, unknown>;
}

interface Tab {
  id: string;
  name: string;
  layout: LayoutType;
  icon?: string;
  color?: string;
  symbol?: string;
  isFavorite?: boolean;
  order: number;
  isPredefined?: boolean; // true if tab is from a details template
}

interface WidgetSlot {
  widgetId?: string;
  settings?: Record<string, unknown>;
  isPredefinedWidget?: boolean; // true if widget is from a details template (cannot change module/symbol)
}

function areWidgetSlotMapsEqual(
  a: Record<string, WidgetSlot>,
  b: Record<string, WidgetSlot>
): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);

  if (aKeys.length !== bKeys.length) {
    return false;
  }

  for (const key of aKeys) {
    const slotA = a[key];
    const slotB = b[key];
    if (!slotB) {
      return false;
    }

    if (slotA.widgetId !== slotB.widgetId) {
      return false;
    }

    const slotASettings = slotA.settings ?? {};
    const slotBSettings = slotB.settings ?? {};

    if (JSON.stringify(slotASettings) !== JSON.stringify(slotBSettings)) {
      return false;
    }
  }

  return true;
}

interface ResizeState {
  isResizing: boolean;
  direction: 'horizontal' | 'vertical';
  startPos: number;
  startSizes: number[];
  dividerIndex?: number;
  tabId: string;
}


// Default grid size configurations for each layout type
const DEFAULT_GRID_SIZES: Record<LayoutType, number[]> = {
  'single': [100],
  'two-vertical': [50, 50],
  'two-horizontal': [50, 50],
  'three-vertical': [33.33, 33.33, 33.34],
  'three-horizontal': [33.33, 33.33, 33.34],
  'three-left-right': [50, 25, 25],
  'three-top-bottom': [25, 25, 50],
  'three-left-stack': [25, 25, 50],
  'three-right-stack': [50, 25, 25],
  'four-grid': [50, 50, 50, 50],
  '4-grid': [25, 25, 25, 25],
  'four-vertical': [25, 25, 25, 25],
  'four-horizontal': [25, 25, 25, 25],
  'five-grid': [20, 20, 20, 20, 20],
  'five-vertical': [20, 20, 20, 20, 20],
  'five-horizontal': [20, 20, 20, 20, 20],
  // 3-cell layouts (additional)
  '3-grid-rows': [33.33, 33.33, 33.34],
  '3-grid-columns': [33.33, 33.33, 33.34],
  '3-grid-left-large': [66.67, 16.67, 16.66],
  '3-grid-right-large': [16.67, 16.67, 66.66],
  '3-grid-top-large': [66.67, 16.67, 16.66],
  '3-grid-bottom-large': [16.67, 16.67, 66.66],
  // 4-cell layouts (additional)
  '4-grid-columns': [25, 25, 25, 25],
  '4-grid-rows': [25, 25, 25, 25],
  '4-grid-left-large': [50, 16.67, 16.67, 16.66],
  '4-grid-right-large': [16.67, 16.67, 16.67, 49.99],
  '4-grid-top-large': [50, 16.67, 16.67, 16.66],
  '4-grid-bottom-large': [16.67, 16.67, 16.67, 50],
  // 5-cell layouts (additional)
  '5-grid-rows': [20, 20, 20, 20, 20],
  '5-grid-columns': [20, 20, 20, 20, 20],
  '5-grid-complex': [40, 40, 20, 20, 20],
  // 6-cell layouts
  '6-grid-2x3': Array(6).fill(16.67),
  '6-grid-3x2': Array(6).fill(16.67),
  '6-grid-rows': Array(6).fill(16.67),
  '6-grid-left-large': [66.67, 6.67, 6.67, 6.67, 6.67, 6.65],
  // 7-cell layouts
  '7-grid-left': [14.29, 14.29, 14.29, 14.29, 14.29, 14.29, 14.26],
  '7-grid-large': [66.67, 5.56, 5.56, 5.56, 5.56, 5.56, 5.53],
  '7-grid-complex1': [14.29, 14.29, 14.29, 14.29, 14.29, 14.29, 14.26],
  '7-grid-complex2': [14.29, 14.29, 14.29, 14.29, 14.29, 14.29, 14.26],
  // 8-cell layouts
  '8-grid-2x4': Array(8).fill(12.5),
  '8-grid-4x2': Array(8).fill(12.5),
  '8-grid-columns': Array(8).fill(12.5),
  '8-grid-rows': Array(8).fill(12.5),
  // 9-cell layout
  '9-grid': Array(9).fill(11.11),
  // 12-cell layouts
  '12-grid-3x4': Array(12).fill(8.33),
  '12-grid-4x3': Array(12).fill(8.33),
  // 16-cell layout
  '16-grid': Array(16).fill(6.25),
  // 24-cell layouts
  '24-grid-4x6': Array(24).fill(4.17),
  '24-grid-6x4': Array(24).fill(4.17),
  '24-grid-rows': Array(24).fill(4.17),
  '24-grid-columns': Array(24).fill(4.17),
  // 28-cell layouts
  '28-grid-4x7': Array(28).fill(3.57),
  '28-grid-7x4': Array(28).fill(3.57),
  // 32-cell layouts
  '32-grid-4x8': Array(32).fill(3.125),
  '32-grid-8x4': Array(32).fill(3.125),
  'no-grid': [100],
  '2-grid-vertical': [],
  '2-grid-horizontal': [],
  '1-grid': []
};

function isForbiddenResponse(input: unknown): boolean {
  if (input === null || input === undefined) {
    return false;
  }

  if (typeof input === 'string') {
    const normalized = input.toLowerCase();
    return normalized.includes('403') || normalized.includes('forbidden');
  }

  if (typeof input === 'object') {
    const maybeStatus = (input as { status?: number }).status;
    if (maybeStatus === 403) {
      return true;
    }

    const maybeResponseStatus = (input as { response?: { status?: number } }).response?.status;
    if (maybeResponseStatus === 403) {
      return true;
    }

    const maybeMessage = (input as { message?: string }).message;
    if (typeof maybeMessage === 'string') {
      return isForbiddenResponse(maybeMessage);
    }
  }

  return false;
}

const TABBED_WIDGET_ID = 'tabbed-widget';
const TAB_COMPATIBLE_WIDGETS = availableWidgets.filter(
  (widget) => widget.id !== TABBED_WIDGET_ID
);

/**
 * Parse widget settings from template widget data
 * Similar to getWidgetSettings in BloombergDashboard - parses additionalSettings
 * and combines with module/symbols to create a proper settings object
 */
function parseWidgetSettingsFromTemplate(widgetName: string, widgetSettings: Record<string, unknown>): Record<string, unknown> {
  const normalizedName = widgetName.toLowerCase().replace(/\s+/g, '-');
  const additionalSettings = typeof widgetSettings.additionalSettings === 'string'
    ? widgetSettings.additionalSettings
    : '';

  // Start with metadata that should be preserved
  const parsedSettings: Record<string, unknown> = {
    customDashboardWidgetID: widgetSettings.customDashboardWidgetID,
    customTabsID: widgetSettings.customTabsID,
    coordinates: widgetSettings.coordinates,
    zIndex: widgetSettings.zIndex,
  };

  // All widgets now use JSON format for additionalSettings
  // Try to parse as JSON first
  if (additionalSettings) {
    try {
      const parsed = JSON.parse(additionalSettings);
      console.log('🔍 [parseWidgetSettingsFromTemplate] Parsed additionalSettings JSON:', {
        widgetName,
        additionalSettings,
        parsed,
        parsedType: typeof parsed
      });
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        Object.assign(parsedSettings, parsed);
        console.log('🔍 [parseWidgetSettingsFromTemplate] After Object.assign:', parsedSettings);
      }
    } catch (e) {
      console.log('🔍 [parseWidgetSettingsFromTemplate] JSON parse failed, using fallback:', {
        widgetName,
        additionalSettings,
        error: e
      });
      // Backward compatibility: handle old pipe-separated formats
      if (normalizedName === 'price-chart') {
        const parts = additionalSettings.split("|");
        if (parts.length >= 2) {
          const chartStyleMap: Record<string, string> = { "1": "candlestick", "2": "area", "3": "line" };
          parsedSettings.chartType = chartStyleMap[parts[0]] || "candlestick";
          parsedSettings.showVolume = parts[1] === "1";
          parsedSettings.timeframe = parts[2] || "1h";
        }
      } else if (normalizedName === 'exponential-moving-average') {
        const parts = additionalSettings.split("|");
        if (parts.length >= 2) {
          parsedSettings.dataType = parts[0] || "Institutional";
          parsedSettings.timeframe = parts[1] || "4h";
        }
      } else if (normalizedName === 'supertrend' || normalizedName === 'supply-and-demand-areas' || normalizedName === 'high-and-low-points') {
        // Old format: just timeframe
        parsedSettings.timeframe = additionalSettings;
      } else if (normalizedName === 'tabbed-widget') {
        if (additionalSettings === 'bottom' || additionalSettings === 'top') {
          parsedSettings.tabBarPosition = additionalSettings;
        }
      }
      // For session-ranges and percent-monthly-targets, old format was "selectAll" - ignore
    }
  }

  // Also include module and symbols if present
  // Skip this for DMX widgets as they store everything in additionalSettings JSON
  const isDMXWidget = normalizedName === 'dmx-positioning' || normalizedName === 'dmx-open-interest';
  
  if (!isDMXWidget) {
    if (widgetSettings.module) parsedSettings.module = widgetSettings.module;
    // Only use symbols column if it has a value AND we haven't already parsed a symbol from additionalSettings
    // This allows widgets like COT positioning and seasonality to preserve their symbol from JSON additionalSettings
    if (widgetSettings.symbols && !parsedSettings.symbol) {
      parsedSettings.symbol = widgetSettings.symbols;
    }
  }

  return parsedSettings;
}

export default function TabbedWidget({ wgid, onRemove, onSettings, onFullscreen, settings }: TabbedWidgetProps) {
  // Get template management functions
  const { activeTemplateId, addWidgetToTemplate, removeWidgetFromTemplate, templates, refreshTemplates, refreshTemplateWidgets, updateWidgetFields } = useTemplates();
  
  // Check if the template that OWNS this widget is a "details template" (symbol-based template like EURUSD, NASDAQ:AAPL)
  // IMPORTANT: We check the template that owns this widget, NOT the currently active template
  // This prevents property bleeding when switching between templates
  const isDetailsTemplate = useMemo(() => {
    // Find which template owns this widget by looking up the widget's customDashboardWidgetID
    let owningTemplate = null;
    let lookupMethod = 'none';
    
    // Strategy 1: Try to find by wgid if it's a pure number (most reliable)
    if (wgid && /^\d+$/.test(wgid.trim())) {
      const widgetId = Number.parseInt(wgid.trim(), 10);
      if (!Number.isNaN(widgetId)) {
        // Search all templates for a widget with this customDashboardWidgetID
        owningTemplate = templates.find(t => 
          t.widgets.some(w => 
            w.settings?.customDashboardWidgetID === widgetId
          )
        );
        if (owningTemplate) {
          lookupMethod = 'by-wgid';
        }
      }
    }
    
    // Strategy 2: Check settings.customDashboardWidgetID
    if (!owningTemplate && settings?.customDashboardWidgetID) {
      const widgetId = typeof settings.customDashboardWidgetID === 'number' 
        ? settings.customDashboardWidgetID 
        : Number.parseInt(String(settings.customDashboardWidgetID), 10);
      
      if (!Number.isNaN(widgetId)) {
        owningTemplate = templates.find(t => 
          t.widgets.some(w => 
            w.settings?.customDashboardWidgetID === widgetId
          )
        );
        if (owningTemplate) {
          lookupMethod = 'by-settings';
        }
      }
    }
    
    // Strategy 3: Try to find by position in active template (widget might be newly added)
    if (!owningTemplate && activeTemplateId && wgid) {
      const position = wgid.includes('-') ? wgid.substring(wgid.indexOf('-') + 1) : null;
      if (position) {
        const activeTemplate = templates.find(t => t.id === activeTemplateId);
        if (activeTemplate) {
          const widget = activeTemplate.widgets.find(w => w.position === position);
          if (widget) {
            owningTemplate = activeTemplate;
            lookupMethod = 'by-position';
          }
        }
      }
    }
    
    // Strategy 4: Fallback to active template (when widget is part of currently displayed template)
    if (!owningTemplate && activeTemplateId) {
      owningTemplate = templates.find(t => t.id === activeTemplateId);
      if (owningTemplate) {
        lookupMethod = 'fallback-active';
      }
    }
    
    if (!owningTemplate?.name) {
      console.log('🔍 [TabbedWidget] Could not determine owning template:', { wgid, activeTemplateId });
      return false;
    }
    
    const templateName = owningTemplate.name.trim();
    console.log('🔍 [TabbedWidget] Calculating isDetailsTemplate:', { 
      templateName, 
      templateId: owningTemplate.id,
      activeTemplateId, 
      wgid,
      lookupMethod,
      isOwningTemplate: owningTemplate.id === activeTemplateId
    });
    
    // Symbol patterns for details templates:
    // - Forex pairs: 6 uppercase letters (e.g., EURUSD, GBPJPY, AUDUSD)
    // - Forex with slash: XXX/XXX (e.g., EUR/USD)
    // - Stock symbols with exchange: EXCHANGE:SYMBOL (e.g., NASDAQ:AAPL, NYSE:MSFT)
    // - Commodities: XAUUSD, XAGUSD, etc.
    // - Crypto: BTCUSD, ETHUSD, etc.
    // - Indices: US30, US500, etc.
    
    // Pattern 1: Forex pairs - 6 uppercase letters
    const forexPattern = /^[A-Z]{6}$/;
    // Pattern 2: Forex with slash - XXX/XXX
    const forexSlashPattern = /^[A-Z]{3}\/[A-Z]{3}$/;
    // Pattern 3: Exchange:Symbol format (NASDAQ:AAPL, NYSE:MSFT, etc.)
    const exchangeSymbolPattern = /^[A-Z]+:[A-Z0-9.]+$/i;
    // Pattern 4: Commodities and metals (XAU, XAG, etc. followed by currency)
    const commodityPattern = /^X[A-Z]{2}[A-Z]{3}$/;
    // Pattern 5: Crypto pairs (BTC, ETH, etc. followed by currency)
    const cryptoPattern = /^(BTC|ETH|XRP|LTC|BCH|ADA|DOT|LINK|XLM|UNI|DOGE|SOL|AVAX|MATIC)[A-Z]{3}$/;
    // Pattern 6: Indices (US30, US500, GER40, UK100, etc.)
    const indexPattern = /^(US|UK|GER|FRA|EU|JP|AU|HK|CH)[0-9]+$/i;
    
    const result = forexPattern.test(templateName) ||
           forexSlashPattern.test(templateName) ||
           exchangeSymbolPattern.test(templateName) ||
           commodityPattern.test(templateName) ||
           cryptoPattern.test(templateName) ||
           indexPattern.test(templateName);
    
    console.log('🔍 [TabbedWidget] isDetailsTemplate result:', { result, templateName, wgid });
    return result;
  }, [activeTemplateId, templates, wgid]);
  
  // Get tab bar position from settings (default: 'bottom') - use local state for modification
  const [tabBarPosition, setTabBarPosition] = useState<"top" | "bottom">(
    (settings?.tabBarPosition as "top" | "bottom") || "bottom"
  );
  
  const [tabs, setTabs] = useState<Tab[]>((settings?.tabs as Tab[]) || []);
  const [activeTabId, setActiveTabId] = useState<string | undefined>(
    (settings?.activeTabId as string) || (tabs.length > 0 ? tabs[0].id : undefined)
  );
  const activeTabIdRef = useRef<string | undefined>(activeTabId);
  
  // Update ref when activeTabId changes
  useEffect(() => {
    activeTabIdRef.current = activeTabId;
  }, [activeTabId]);
  
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [showLayoutPicker, setShowLayoutPicker] = useState(false);
  const [showWidgetPicker, setShowWidgetPicker] = useState(false);
  const [targetSlotKey, setTargetSlotKey] = useState<string | null>(null);
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
  const [isPremiumLocked, setIsPremiumLocked] = useState(false);
  const [isAddingTab, setIsAddingTab] = useState(false);
  const [isLoadingTabs, setIsLoadingTabs] = useState(true);
  
  // Child widget settings panel state
  const [childWidgetSettingsOpen, setChildWidgetSettingsOpen] = useState(false);
  const [childWidgetSettingsSlotKey, setChildWidgetSettingsSlotKey] = useState<string | null>(null);
  const [childWidgetSettingsType, setChildWidgetSettingsType] = useState<string>('');
  
  // Child widget fullscreen state
  const [fullscreenChildSlotKey, setFullscreenChildSlotKey] = useState<string | null>(null);
  
  // Trigger for fetching tabs after localStorage loading (state to trigger re-render)
  const [fetchTrigger, setFetchTrigger] = useState(0);
  
  // Drag and drop state
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);
  const [, setIsDraggingWidget] = useState(false);
  
  // Hover state for visual feedback on grid cells
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);
  
  // Widget slots: key is `${tabId}-${slotIndex}`, value is widget info
  const [widgetSlots, setWidgetSlots] = useState<Record<string, WidgetSlot>>(
    (settings?.widgetSlots as Record<string, WidgetSlot>) || {}
  );

  // Grid sizes per tab: key is tabId, value is grid sizes for that tab's layout
  const [gridSizes, setGridSizes] = useState<Record<string, number[]>>({});
  const gridSizesRef = useRef<Record<string, number[]>>({});
  
  // Update ref when gridSizes changes
  useEffect(() => {
    gridSizesRef.current = gridSizes;
  }, [gridSizes]);
  
  // Resize state (kept for backward compatibility, but will be phased out)
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  
  // Tab data mapping: key is tabId, value is CustomDashboardTabID
  const [tabDataMap, setTabDataMap] = useState<Record<string, number>>({});
  const tabDataMapRef = useRef<Record<string, number>>({});
  
  // Update ref when tabDataMap changes
  useEffect(() => {
    tabDataMapRef.current = tabDataMap;
  }, [tabDataMap]);
  
  // Track previous template ID to detect template changes
  const previousTemplateIdRef = useRef<string | undefined>(undefined);
  
  // Track previous template type (details vs regular) to detect type changes
  const previousIsDetailsTemplateRef = useRef<boolean | undefined>(undefined);
  
  // Track recently deleted tab IDs to prevent them from being re-added by API refresh
  const recentlyDeletedTabIdsRef = useRef<Set<string>>(new Set());
  
  // Track which tabs we've already fetched grid positions for to prevent refetching
  const fetchedGridPositionsRef = useRef<Set<string>>(new Set());
  
  // Track which template+widget combinations have already loaded tabs (to prevent redundant API calls)
  const loadedTabWidgetsRef = useRef<Set<string>>(new Set());
  
  // Clear loaded widgets cache when template changes (but only for this specific widget)
  // This ensures we re-check localStorage/API for the new template while preserving cache for other template+widget combos
  useEffect(() => {
    if (previousTemplateIdRef.current !== undefined && previousTemplateIdRef.current !== activeTemplateId) {
      console.log('🔄 [TabbedWidget] Template changed from', previousTemplateIdRef.current, 'to', activeTemplateId);
      
      // Only clear cache entries for this specific template+widget combination
      // Don't clear entries for other templates - they should keep their cache
      const oldTemplateId = previousTemplateIdRef.current;
      const currentTabWidgetID = settings?.customDashboardWidgetID || settings?.TabWidgetID;
      
      if (currentTabWidgetID) {
        const oldCacheKey = `${oldTemplateId}-${currentTabWidgetID}`;
        if (loadedTabWidgetsRef.current.has(oldCacheKey)) {
          loadedTabWidgetsRef.current.delete(oldCacheKey);
          console.log('🧹 [TabbedWidget] Cleared cache for:', oldCacheKey);
        }
      }
    }
    previousTemplateIdRef.current = activeTemplateId;
  }, [activeTemplateId, settings?.customDashboardWidgetID, settings?.TabWidgetID]);
  
  // Track if data has been loaded from localStorage
  const hasLoadedFromLocalStorageRef = useRef(false);
  
  // Track localStorage version to handle cross-tab sync
  const localStorageVersionRef = useRef<number>(0);
  
  // Debounced API save timer
  const apiSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track last saved state hash to prevent unnecessary saves
  const lastSavedStateHashRef = useRef<string>('');
  
  // Keep a ref to latest templates to avoid stale closure issues in callbacks
  const templatesRef = useRef(templates);
  useEffect(() => {
    templatesRef.current = templates;
  }, [templates]);
  
  // Create save handler for tab grid positions
  const createTabSaveHandler = useCallback((tabId: string, layout: LayoutType) => {
    return async () => {
      const currentTabDataMap = tabDataMapRef.current;
      const customDashboardTabID = currentTabDataMap[tabId];
      if (!customDashboardTabID) {
        return;
      }
      
      const currentSizes = gridSizesRef.current[tabId] || DEFAULT_GRID_SIZES[layout] || [100];
      
      try {
        const positions = calculateTabbedWidgetPositions(
          layout,
          currentSizes,
          customDashboardTabID
        );
        
        await insertTabGridPosition(positions);
      } catch {
        // Error saving tab grid positions
      }
    };
  }, []);

  // Helper: Get current complete state
  const getCurrentState = useCallback((): TabbedWidgetState => {
    return {
      tabs: tabs.map((tab, index) => ({
        id: tab.id,
        name: tab.name,
        layout: tab.layout as string,
        color: tab.color,
        icon: tab.icon,
        order: tab.order !== undefined ? tab.order : index
      })),
      activeTabId,
      tabBarPosition,
      widgetSlots: Object.entries(widgetSlots).reduce((acc, [key, slot]) => {
        if (slot.widgetId) {
          acc[key] = {
            widgetId: slot.widgetId,
            settings: slot.settings || {}
          };
        }
        return acc;
      }, {} as Record<string, { widgetId: string; settings: Record<string, unknown> }>),
      gridSizes,
      lastModified: Date.now(),
      version: localStorageVersionRef.current + 1
    };
  }, [tabs, activeTabId, tabBarPosition, widgetSlots, gridSizes]);

  // Helper: Save current state to localStorage immediately
  const saveToLocalStorage = useCallback(() => {
    if (!wgid) {
      return;
    }

    const state = getCurrentState();
    localStorageVersionRef.current = state.version;
    saveTabbedWidgetState(wgid, state);
  }, [wgid, getCurrentState]);

  // Helper: Save to API with debouncing (500ms)
  const saveToApiDebounced = useCallback(() => {
    if (!wgid) {
      return;
    }

    // Clear existing timer
    if (apiSaveTimerRef.current) {
      clearTimeout(apiSaveTimerRef.current);
    }

    // Set new timer
    apiSaveTimerRef.current = setTimeout(async () => {
      // Here we would save to API
      // For now, the existing API calls in individual handlers will continue to work
      // This is a placeholder for future consolidated API saves
      
      try {
        // TODO: Implement consolidated API save if needed
        // await saveTabbedWidgetToApi(wgid, getCurrentState());
      } catch (error) {
        console.error('❌ [TabbedWidget] Failed to save to API:', error);
      }
    }, 500);
  }, [wgid]);

  // Helper: Save to both localStorage (immediate) and API (debounced)
  const saveToBothStorages = useCallback(() => {
    saveToLocalStorage();
    saveToApiDebounced();
  }, [saveToLocalStorage, saveToApiDebounced]);
  useEffect(() => {
    const incomingWidgetSlots = settings?.widgetSlots as Record<string, WidgetSlot> | undefined;
    if (!incomingWidgetSlots) {
      return;
    }

    setWidgetSlots((prev) => {
      // Merge incoming settings with current local state
      // LOCAL STATE TAKES PRECEDENCE - it represents user's most recent actions
      // Settings only provide defaults for slots not yet in local state
      const mergedSlots: Record<string, WidgetSlot> = {};
      let blockedCount = 0;
      
      // First, add all LOCAL slots (user's current state) EXCEPT recently deleted ones
      for (const [key, slot] of Object.entries(prev)) {
        if (!recentlyDeletedSlotsRef.current.has(key)) {
          mergedSlots[key] = slot;
        }
      }
      
      // Then, add incoming slots for positions that don't exist locally
      // This fills in widgets from settings that haven't been loaded locally yet
      for (const [key, slot] of Object.entries(incomingWidgetSlots)) {
        // Skip if slot already exists locally (local takes precedence)
        if (mergedSlots[key]) {
          continue;
        }
        // Skip recently deleted slots
        if (recentlyDeletedSlotsRef.current.has(key)) {
          blockedCount++;
          console.log('🚫 [TabbedWidget] Settings sync: Blocked deleted slot from being restored:', key);
          continue;
        }
        mergedSlots[key] = slot;
      }
      
      if (blockedCount > 0) {
        console.log('🔄 [TabbedWidget] Settings sync:', {
          incoming: Object.keys(incomingWidgetSlots).length,
          local: Object.keys(prev).length,
          merged: Object.keys(mergedSlots).length,
          blocked: blockedCount,
          deletedSlots: Array.from(recentlyDeletedSlotsRef.current)
        });
      }
      
      if (areWidgetSlotMapsEqual(prev, mergedSlots)) {
        return prev;
      }
      return mergedSlots;
    });
  }, [settings?.widgetSlots]);

  // Track wgid changes to reset the component state when switching templates
  const previousWgidRef = useRef<string | undefined>(undefined);
  
  // Track if wgid just changed to prevent stale state from being saved
  const wgidJustChangedRef = useRef(false);
  
  // Reset state when wgid changes (different widget instance)
  useEffect(() => {
    if (previousWgidRef.current !== undefined && previousWgidRef.current !== wgid) {
      console.log('🔄 [TabbedWidget] wgid changed from', previousWgidRef.current, 'to', wgid, '- resetting state');
      
      // Mark that wgid just changed - this prevents the save effect from saving stale data
      wgidJustChangedRef.current = true;
      
      // Widget ID changed - reset ALL state for the new widget instance
      hasLoadedFromLocalStorageRef.current = false;
      localStorageVersionRef.current = 0;
      fetchedGridPositionsRef.current.clear();
      recentlyDeletedTabIdsRef.current.clear();
      lastSavedStateHashRef.current = '';
      loadedTabWidgetsRef.current.clear(); // Clear loaded widgets cache to allow fetching for new widget instance
      
      // Reset actual state values to empty/defaults to prevent stale data showing
      // The next useEffect will load the correct data for the new wgid from localStorage
      setTabs([]);
      setActiveTabId(undefined);
      setWidgetSlots({});
      setGridSizes({});
      setTabDataMap({});
      setIsPremiumLocked(false);
      setIsLoadingTabs(true); // Show loading state during transition
      
      // Clear recently deleted slots tracking
      recentlyDeletedSlotsRef.current.clear();
    }
    previousWgidRef.current = wgid;
  }, [wgid]);

  // Detect template type changes (details <-> regular) and force reload from API
  useEffect(() => {
    console.log('🔄 [TabbedWidget] Template change effect running:', {
      wgid,
      isDetailsTemplate,
      previousIsDetailsTemplate: previousIsDetailsTemplateRef.current,
      activeTemplateId
    });
    
    // Skip on initial mount
    if (previousIsDetailsTemplateRef.current === undefined) {
      console.log('🔄 [TabbedWidget] Initial mount - setting previousIsDetailsTemplate');
      previousIsDetailsTemplateRef.current = isDetailsTemplate;
      return;
    }

    // Check if template type changed (details <-> regular)
    const templateTypeChanged = previousIsDetailsTemplateRef.current !== isDetailsTemplate;
    console.log('🔄 [TabbedWidget] Template type changed?', templateTypeChanged);
    
    if (templateTypeChanged && wgid) {
      console.log('🔄 [TabbedWidget] Template type changed:', {
        from: previousIsDetailsTemplateRef.current ? 'details' : 'regular',
        to: isDetailsTemplate ? 'details' : 'regular',
        wgid,
        templateId: activeTemplateId
      });
      
      // Clear localStorage for this widget to force fresh load from API
      clearTabbedWidgetState(wgid);
      
      // DON'T clear global tab widgets cache - that would force ALL other widgets to refetch
      // Instead, we'll use forceRefresh=true when fetching to bypass cache for this widget only
      console.log('🔄 [TabbedWidget] Will use forceRefresh to bypass cache for this widget');
      
      // Reset state tracking (but keep hasLoadedFromLocalStorageRef as true so fetch can proceed)
      localStorageVersionRef.current = 0;
      // DON'T clear fetchedGridPositionsRef - grid positions are keyed by CustomDashboardTabID which doesn't change
      // Clearing this would cause unnecessary API calls even though localStorage has the data
      recentlyDeletedTabIdsRef.current.clear();
      lastSavedStateHashRef.current = '';
      loadedTabWidgetsRef.current.clear(); // Clear loaded widgets cache to allow fetching after template type change
      
      // Clear component state to prevent stale UI
      setTabs([]);
      setActiveTabId(undefined);
      setWidgetSlots({});
      // DON'T clear gridSizes - they're keyed by activeTabId but data is from CustomDashboardTabID in localStorage
      // Clearing would cause unnecessary API calls; let them naturally update for the new tabs
      setTabDataMap({});
      setIsLoadingTabs(true); // Show loading state during transition
      
      // Clear recently deleted slots tracking
      recentlyDeletedSlotsRef.current.clear();
      
      // Trigger fresh data load from API with forceRefresh=true
      setFetchTrigger(prev => prev + 1);
    }
    
    previousIsDetailsTemplateRef.current = isDetailsTemplate;
  }, [isDetailsTemplate, wgid, activeTemplateId]);

  // Load tabbed widget state from localStorage on mount or when wgid changes
  useEffect(() => {
    if (!wgid) {
      return;
    }

    const localState = loadTabbedWidgetState(wgid);
    
    if (localState) {
      console.log('📥 [TabbedWidget] Loading from localStorage for wgid:', wgid, {
        tabs: localState.tabs?.length || 0,
        widgetSlots: Object.keys(localState.widgetSlots || {}).length,
        version: localState.version
      });
      
      // Apply localStorage state to component
      if (localState.tabs && localState.tabs.length > 0) {
        const restoredTabs: Tab[] = localState.tabs.map(t => ({
          id: t.id,
          name: t.name,
          layout: t.layout as LayoutType,
          color: t.color,
          icon: t.icon,
          order: t.order
        }));
        setTabs(restoredTabs);
      } else {
        // LocalStorage exists but has no tabs - clear the loaded widgets cache
        // to ensure we fetch from API when template changes
        console.log('📥 [TabbedWidget] LocalStorage has no tabs - clearing cache to allow API fetch');
        loadedTabWidgetsRef.current.clear();
      }
      
      if (localState.activeTabId) {
        setActiveTabId(localState.activeTabId);
      }
      
      if (localState.tabBarPosition) {
        setTabBarPosition(localState.tabBarPosition);
      }
      
      // NOTE: We intentionally DO NOT load widgetSlots from localStorage
      // The database (via template) is the source of truth for widget settings
      // This prevents stale localStorage data from overriding saved settings like symbol, owner, etc.
      // The widgetSlots will be populated from the template when it loads
      console.log('📥 [TabbedWidget] Skipping localStorage widgetSlots - will load from template/database');
      
      if (localState.gridSizes && Object.keys(localState.gridSizes).length > 0) {
        setGridSizes(localState.gridSizes);
      }
      
      // Update version tracker
      localStorageVersionRef.current = localState.version || 1;
    } else {
      console.log('📥 [TabbedWidget] No localStorage data found for wgid:', wgid, '- will fetch from API');
      // No localStorage - clear the loaded widgets cache to ensure we fetch from API
      loadedTabWidgetsRef.current.clear();
    }
    
    hasLoadedFromLocalStorageRef.current = true;
    // Clear the flag and trigger API fetch after localStorage has loaded
    setTimeout(() => {
      wgidJustChangedRef.current = false;
      setFetchTrigger(prev => prev + 1);
    }, 0);
  }, [wgid]);

  // Save tabbed widget state to localStorage whenever it changes
  useEffect(() => {
    // Skip if no wgid or no tabs yet
    if (!wgid || tabs.length === 0) {
      return;
    }
    
    // Skip saving during initial load to prevent overwriting localStorage before we've loaded from it
    if (!hasLoadedFromLocalStorageRef.current) {
      return;
    }
    
    // Build state and save to localStorage
    const state: TabbedWidgetState = {
      tabs: tabs.map(t => ({
        id: t.id,
        name: t.name,
        layout: t.layout,
        color: t.color,
        icon: t.icon,
        order: t.order
      })),
      activeTabId,
      tabBarPosition,
      widgetSlots: Object.entries(widgetSlots).reduce((acc, [key, slot]) => {
        if (slot && slot.widgetId) {
          acc[key] = {
            widgetId: slot.widgetId,
            settings: slot.settings || {}
          };
        }
        return acc;
      }, {} as Record<string, { widgetId: string; settings: Record<string, unknown> }>),
      gridSizes,
      lastModified: Date.now(),
      version: localStorageVersionRef.current + 1
    };
    
    localStorageVersionRef.current = state.version;
    saveTabbedWidgetState(wgid, state);
    console.log('💾 [TabbedWidget] Saved to localStorage - tabs:', tabs.length, 'widgetSlots:', Object.keys(widgetSlots).length);
  }, [wgid, tabs, activeTabId, tabBarPosition, widgetSlots, gridSizes]);

  // Cross-tab synchronization - listen for storage changes from other tabs
  useEffect(() => {
    if (!wgid) {
      return;
    }
    
    const handleStorageChange = (event: StorageEvent) => {
      // Check if this storage change is for our widget
      const expectedKey = `pmt_tabbed_widget_${wgid}`;
      if (event.key !== expectedKey) {
        return;
      }
      
      // Another tab updated our widget's data
      if (event.newValue) {
        try {
          const newState = JSON.parse(event.newValue) as TabbedWidgetState;
          
          // Only apply if the new version is higher than ours
          if (newState.version > localStorageVersionRef.current) {
            console.log('🔄 [TabbedWidget] Cross-tab sync: applying newer version from another tab', {
              ourVersion: localStorageVersionRef.current,
              theirVersion: newState.version
            });
            
            // Apply the newer state
            if (newState.tabs && newState.tabs.length > 0) {
              const restoredTabs: Tab[] = newState.tabs.map(t => ({
                id: t.id,
                name: t.name,
                layout: t.layout as LayoutType,
                color: t.color,
                icon: t.icon,
                order: t.order
              }));
              setTabs(restoredTabs);
            }
            
            if (newState.activeTabId) {
              setActiveTabId(newState.activeTabId);
            }
            
            if (newState.widgetSlots) {
              // Filter out recently deleted slots
              const filteredSlots: Record<string, WidgetSlot> = {};
              for (const [key, value] of Object.entries(newState.widgetSlots)) {
                if (!recentlyDeletedSlotsRef.current.has(key)) {
                  filteredSlots[key] = {
                    widgetId: value.widgetId,
                    settings: value.settings || {}
                  };
                }
              }
              setWidgetSlots(filteredSlots);
            }
            
            if (newState.gridSizes) {
              setGridSizes(newState.gridSizes);
            }
            
            localStorageVersionRef.current = newState.version;
          }
        } catch (error) {
          console.error('❌ [TabbedWidget] Cross-tab sync error:', error);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [wgid]);

  
  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    tabId: string;
    tabName: string;
  }>({
    isOpen: false,
    tabId: '',
    tabName: ''
  });

  const [isWidgetDeleting, setIsWidgetDeleting] = useState(false);
  
  // Toast notification state
  const [toast, setToast] = useState<{
    message: string;
    isVisible: boolean;
  }>({
    message: '',
    isVisible: false
  });
  
  // Container ref for resize calculations
  const containerRef = useRef<HTMLDivElement>(null);
  // Root ref for getting parent data-wgid
  const rootRef = useRef<HTMLDivElement>(null);
  
  // Track recently deleted widget slot keys to prevent them from being restored by stale settings
  const recentlyDeletedSlotsRef = useRef<Set<string>>(new Set());

  // Track the best-known TabWidgetID so we can update consumers when the real ID appears
  const [resolvedTabWidgetId, setResolvedTabWidgetId] = useState<number | null>(null);
  const tabWidgetIdRef = useRef<number | null>(null);

  const resolveTabWidgetIdFromDom = useCallback((): number | null => {
    const elementToCheck = rootRef.current || containerRef.current;
    if (!elementToCheck) {
      return null;
    }

    let parentElement: HTMLElement | null = elementToCheck.parentElement;
    while (parentElement) {
      const parentWgid = parentElement.getAttribute('data-wgid');
      if (parentWgid) {
        const tabWidgetId = parseInt(parentWgid, 10);
        if (!Number.isNaN(tabWidgetId)) {
          return tabWidgetId;
        }
      }
      parentElement = parentElement.parentElement;
    }

    return null;
  }, []);

  const isLikelyGeneratedTabWidgetId = useCallback((value: number | null): boolean => {
    if (value === null || Number.isNaN(value)) {
      return false;
    }

    // Generated IDs are timestamp-based (~1e12). Real IDs are expected to be much smaller.
    return value >= 1_000_000_000;
  }, []);

  // Helper to check if an ID is likely the dashboard ID
  const isLikelyDashboardId = useCallback((candidateId: number, templateId?: string | null): boolean => {
    if (!templateId) return false;
    const parsedTemplateId = Number.parseInt(templateId, 10);
    return !Number.isNaN(parsedTemplateId) && candidateId === parsedTemplateId;
  }, []);

  // Helper to extract position from wgid (e.g., "22-g11_1" -> "g11_1")
  const extractPositionFromWgid = useCallback((wgidValue: string | undefined): string | null => {
    if (!wgidValue) return null;
    const trimmed = wgidValue.trim();
    // Format: "${templateId}-${position}" or just "${widgetId}" or "${widgetId}-${position}"
    const dashIndex = trimmed.indexOf('-');
    if (dashIndex === -1) return null;
    return trimmed.substring(dashIndex + 1);
  }, []);

  // Helper to get customDashboardWidgetID from templates by looking up this widget's position
  const getCustomDashboardWidgetIDFromTemplates = useCallback((): number | null => {
    if (!activeTemplateId || !wgid) return null;
    
    const position = extractPositionFromWgid(wgid);
    if (!position) return null;
    
    const activeTemplate = templates.find(t => t.id === activeTemplateId);
    if (!activeTemplate) return null;
    
    // Find the widget by position
    const widget = activeTemplate.widgets.find(w => w.position === position);
    if (!widget?.settings?.customDashboardWidgetID) return null;
    
    const widgetId = typeof widget.settings.customDashboardWidgetID === 'number'
      ? widget.settings.customDashboardWidgetID
      : Number.parseInt(String(widget.settings.customDashboardWidgetID), 10);
    
    if (Number.isNaN(widgetId)) return null;
    
    // Validate it's not a generated ID or the template ID
    if (isLikelyGeneratedTabWidgetId(widgetId)) return null;
    if (isLikelyDashboardId(widgetId, activeTemplateId)) return null;
    
    return widgetId;
  }, [activeTemplateId, wgid, templates, extractPositionFromWgid, isLikelyGeneratedTabWidgetId, isLikelyDashboardId]);

  // TabWidgetID management - prefer real IDs but gracefully fall back when necessary
  // IMPORTANT: TabWidgetID must be the widget instance ID (CustomDashboardWidgetID), NOT the dashboard ID (CustomDashboardID)
  const getTabWidgetID = useCallback((): number => {
    const updateState = (value: number) => {
      tabWidgetIdRef.current = value;
      setResolvedTabWidgetId((prev) => (prev === value ? prev : value));
      return value;
    };

    // First priority: Check settings.customDashboardWidgetID (most reliable if it exists)
    // This should be the widget instance ID, not dashboard ID
    const customDashboardWidgetID = settings?.customDashboardWidgetID;
    if (customDashboardWidgetID !== undefined && customDashboardWidgetID !== null) {
      const widgetInstanceId = typeof customDashboardWidgetID === 'number' 
        ? customDashboardWidgetID 
        : Number.parseInt(String(customDashboardWidgetID), 10);
      if (!Number.isNaN(widgetInstanceId) && !isLikelyGeneratedTabWidgetId(widgetInstanceId)) {
        // Only use if it's not the dashboard ID
        if (!isLikelyDashboardId(widgetInstanceId, activeTemplateId)) {
          return updateState(widgetInstanceId);
        }
      }
    }

    // Second priority: Check templates context to get customDashboardWidgetID by position
    // This helps when settings prop doesn't have the ID yet (e.g., just after widget insertion)
    const templateWidgetId = getCustomDashboardWidgetIDFromTemplates();
    if (templateWidgetId !== null) {
      return updateState(templateWidgetId);
    }

    // Third priority: Check wgid prop (but avoid if it's dashboard ID format)
    // wgid format can be:
    // - Pure widget instance ID: "119" (good)
    // - Widget instance ID with position: "119-g11_1" (good - extract 119)
    // - Dashboard ID with position: "22-g11_1" (bad - avoid 22, it's dashboard ID)
    if (wgid) {
      const trimmedWgid = wgid.trim();
      
      // Check if wgid is pure number (no dash) - this should be widget instance ID
      if (/^\d+$/.test(trimmedWgid)) {
        const parsed = Number.parseInt(trimmedWgid, 10);
        if (!Number.isNaN(parsed) && !isLikelyGeneratedTabWidgetId(parsed)) {
          // Only use if it's not the dashboard ID
          if (!isLikelyDashboardId(parsed, activeTemplateId)) {
            return updateState(parsed);
          }
        }
      } else {
        // wgid has a dash - extract first part but validate it's not dashboard ID
        const numericMatch = trimmedWgid.match(/^(\d+)/);
        if (numericMatch) {
          const parsed = Number.parseInt(numericMatch[1], 10);
          if (!Number.isNaN(parsed) && !isLikelyGeneratedTabWidgetId(parsed)) {
            // Only use if it's not the dashboard ID
            if (!isLikelyDashboardId(parsed, activeTemplateId)) {
              return updateState(parsed);
            }
          }
        }
      }
    }

    // Fourth priority: Check DOM (but this might return dashboard/template ID, so lower priority)
    const domId = resolveTabWidgetIdFromDom();
    if (domId !== null && !isLikelyGeneratedTabWidgetId(domId)) {
      // Only use if it's not the dashboard ID
      if (!isLikelyDashboardId(domId, activeTemplateId)) {
        return updateState(domId);
      }
    }

    if (tabWidgetIdRef.current !== null) {
      return tabWidgetIdRef.current;
    }

    const newTabWidgetId = Date.now() + Math.floor(Math.random() * 1000);
    return updateState(newTabWidgetId);
  }, [wgid, resolveTabWidgetIdFromDom, settings?.customDashboardWidgetID, isLikelyGeneratedTabWidgetId, activeTemplateId, isLikelyDashboardId, getCustomDashboardWidgetIDFromTemplates]);

  // Actively watch for the real TabWidgetID when we're currently using a generated placeholder
  useEffect(() => {
    const attemptResolveActualId = () => {
      // First priority: Check templates context for customDashboardWidgetID
      const templateWidgetId = getCustomDashboardWidgetIDFromTemplates();
      if (templateWidgetId !== null) {
        tabWidgetIdRef.current = templateWidgetId;
        setResolvedTabWidgetId((prev) => (prev === templateWidgetId ? prev : templateWidgetId));
        return true;
      }

      // Second priority: Try wgid (widget ID) before DOM (which might give template ID)
      // But avoid using dashboard ID
      if (wgid) {
        const trimmedWgid = wgid.trim();
        
        // Check if wgid is pure number (no dash) - this should be widget instance ID
        if (/^\d+$/.test(trimmedWgid)) {
          const parsed = Number.parseInt(trimmedWgid, 10);
          if (!Number.isNaN(parsed) && !isLikelyGeneratedTabWidgetId(parsed)) {
            // Only use if it's not the dashboard ID
            if (!isLikelyDashboardId(parsed, activeTemplateId)) {
              tabWidgetIdRef.current = parsed;
              setResolvedTabWidgetId((prev) => (prev === parsed ? prev : parsed));
              return true;
            }
          }
        } else {
          // wgid has a dash - extract first part but validate it's not dashboard ID
          const numericMatch = trimmedWgid.match(/^(\d+)/);
          if (numericMatch) {
            const parsed = Number.parseInt(numericMatch[1], 10);
            if (!Number.isNaN(parsed) && !isLikelyGeneratedTabWidgetId(parsed)) {
              // Only use if it's not the dashboard ID
              if (!isLikelyDashboardId(parsed, activeTemplateId)) {
                tabWidgetIdRef.current = parsed;
                setResolvedTabWidgetId((prev) => (prev === parsed ? prev : parsed));
                return true;
              }
            }
          }
        }
      }

      // Fallback to DOM ID if wgid didn't work, but avoid dashboard ID
      const domId = resolveTabWidgetIdFromDom();
      if (domId !== null && !isLikelyGeneratedTabWidgetId(domId)) {
        // Only use if it's not the dashboard ID
        if (!isLikelyDashboardId(domId, activeTemplateId)) {
          tabWidgetIdRef.current = domId;
          setResolvedTabWidgetId((prev) => (prev === domId ? prev : domId));
          return true;
        }
      }

      return false;
    };

    // If we already have a non-generated ID, stop watching
    if (resolvedTabWidgetId !== null && !isLikelyGeneratedTabWidgetId(resolvedTabWidgetId)) {
      tabWidgetIdRef.current = resolvedTabWidgetId;
      return;
    }

    if (attemptResolveActualId()) {
      return;
    }

    const observerTarget = rootRef.current?.parentElement || containerRef.current?.parentElement;
    let observer: MutationObserver | null = null;

    if (observerTarget) {
      observer = new MutationObserver(() => {
        if (attemptResolveActualId()) {
          observer?.disconnect();
        }
      });

      observer.observe(observerTarget, {
        attributes: true,
        attributeFilter: ['data-wgid'],
        subtree: true
      });
    }

    const interval = window.setInterval(() => {
      if (attemptResolveActualId()) {
        window.clearInterval(interval);
        observer?.disconnect();
      }
    }, 300);

    return () => {
      observer?.disconnect();
      window.clearInterval(interval);
    };
  }, [wgid, resolvedTabWidgetId, resolveTabWidgetIdFromDom, isLikelyGeneratedTabWidgetId, isLikelyDashboardId, activeTemplateId, getCustomDashboardWidgetIDFromTemplates]);

  const waitForActualTabWidgetId = useCallback(async (timeout = 3000, interval = 100): Promise<number | null> => {
    const deadline = Date.now() + timeout;
    let hasTriggeredRefresh = false;

    while (Date.now() < deadline) {
      // First priority: Check templates context for customDashboardWidgetID
      const templateWidgetId = getCustomDashboardWidgetIDFromTemplates();
      if (templateWidgetId !== null) {
        tabWidgetIdRef.current = templateWidgetId;
        setResolvedTabWidgetId((prev) => (prev === templateWidgetId ? prev : templateWidgetId));
        return templateWidgetId;
      }

      // Check DOM ID, but avoid dashboard ID
      const domId = resolveTabWidgetIdFromDom();
      if (domId !== null && !isLikelyGeneratedTabWidgetId(domId)) {
        // Only use if it's not the dashboard ID
        if (!isLikelyDashboardId(domId, activeTemplateId)) {
          tabWidgetIdRef.current = domId;
          setResolvedTabWidgetId((prev) => (prev === domId ? prev : domId));
          return domId;
        }
      }

      // Check wgid, but avoid dashboard ID
      if (wgid) {
        const trimmedWgid = wgid.trim();
        
        // Check if wgid is pure number (no dash) - this should be widget instance ID
        if (/^\d+$/.test(trimmedWgid)) {
          const parsed = Number.parseInt(trimmedWgid, 10);
          if (!Number.isNaN(parsed) && !isLikelyGeneratedTabWidgetId(parsed)) {
            // Only use if it's not the dashboard ID
            if (!isLikelyDashboardId(parsed, activeTemplateId)) {
              tabWidgetIdRef.current = parsed;
              setResolvedTabWidgetId((prev) => (prev === parsed ? prev : parsed));
              return parsed;
            }
          }
        } else {
          // wgid has a dash - extract first part but validate it's not dashboard ID
          const numericMatch = trimmedWgid.match(/^(\d+)/);
          if (numericMatch) {
            const parsed = Number.parseInt(numericMatch[1], 10);
            if (!Number.isNaN(parsed) && !isLikelyGeneratedTabWidgetId(parsed)) {
              // Only use if it's not the dashboard ID
              if (!isLikelyDashboardId(parsed, activeTemplateId)) {
                tabWidgetIdRef.current = parsed;
                setResolvedTabWidgetId((prev) => (prev === parsed ? prev : parsed));
                return parsed;
              }
            }
          }
        }
      }

      // If we haven't found a valid ID and haven't triggered a refresh yet,
      // trigger a template refresh to get the customDashboardWidgetID from the server
      if (!hasTriggeredRefresh && Date.now() < deadline - 1500) {
        hasTriggeredRefresh = true;
        try {
          // Refresh templates to get the updated widget list with customDashboardWidgetID
          // skipLoading=true prevents the loading UI flash
          await refreshTemplates(undefined, true);
        } catch {
          // Ignore refresh errors, continue polling
        }
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    return null;
  }, [wgid, resolveTabWidgetIdFromDom, isLikelyGeneratedTabWidgetId, isLikelyDashboardId, activeTemplateId, getCustomDashboardWidgetIDFromTemplates, refreshTemplates]);

  // Tab ID management - generate temp IDs (localStorage removed for debugging)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getTabId = useCallback((_tabId: string): number => {
    // Generate new tabid
    // Use timestamp + random to ensure uniqueness
    const newTabid = Date.now() + Math.floor(Math.random() * 1000);
    return newTabid;
  }, []);

  // Save tabid (no-op for now, localStorage removed)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const saveTabId = useCallback((_tabId: string, _tabid: number) => {
    // No-op: localStorage removed for debugging
  }, []);

  // Reverse map: numeric grid IDs to layout types
  const getLayoutFromGridId = useCallback((gridId: number | string): LayoutType => {
    const gridIdNum = typeof gridId === 'string' ? parseInt(gridId, 10) : gridId;
    const gridIdToLayoutMap: Record<number, LayoutType> = {
      1: 'single',
      21: 'two-vertical',
      22: 'two-horizontal',
      31: 'three-vertical',
      32: 'three-horizontal',
      33: 'three-left-right',
      34: 'three-top-bottom',
      35: 'three-left-stack',
      36: 'three-right-stack',
      37: '3-grid-rows',
      38: '3-grid-columns',
      39: '3-grid-left-large',
      40: '3-grid-right-large',
      41: '3-grid-top-large',
      42: '3-grid-bottom-large',
      51: 'four-grid',
      52: 'four-vertical',
      53: 'four-horizontal',
      54: '4-grid-columns',
      55: '4-grid-rows',
      56: '4-grid-left-large',
      57: '4-grid-right-large',
      58: '4-grid-top-large',
      59: '4-grid-bottom-large',
      61: 'five-grid',
      62: 'five-vertical',
      63: 'five-horizontal',
      64: '5-grid-rows',
      65: '5-grid-columns',
      66: '5-grid-complex',
      71: '6-grid-2x3',
      72: '6-grid-3x2',
      73: '6-grid-rows',
      74: '6-grid-left-large',
      81: '7-grid-left',
      82: '7-grid-large',
      83: '7-grid-complex1',
      84: '7-grid-complex2',
      91: '8-grid-2x4',
      92: '8-grid-4x2',
      93: '8-grid-columns',
      94: '8-grid-rows',
      101: '9-grid',
      111: '12-grid-3x4',
      112: '12-grid-4x3',
      121: '16-grid',
      131: '24-grid-4x6',
      132: '24-grid-6x4',
      133: '24-grid-rows',
      134: '24-grid-columns',
      141: '28-grid-4x7',
      142: '28-grid-7x4',
      151: '32-grid-4x8',
      152: '32-grid-8x4',
      0: 'no-grid',
    };
    return gridIdToLayoutMap[gridIdNum] ?? 'single';
  }, []);

  // Map layout types to numeric grid IDs
  const getTabGridId = useCallback((layout: LayoutType): number => {
    const layoutToGridIdMap: Record<LayoutType, number> = {
      'single': 1,
      'two-vertical': 21,
      'two-horizontal': 22,
      'three-vertical': 31,
      'three-horizontal': 32,
      'three-left-right': 33,
      'three-top-bottom': 34,
      'three-left-stack': 35,
      'three-right-stack': 36,
      '3-grid-rows': 37,
      '3-grid-columns': 38,
      '3-grid-left-large': 39,
      '3-grid-right-large': 40,
      '3-grid-top-large': 41,
      '3-grid-bottom-large': 42,
      'four-grid': 51,
      'four-vertical': 52,
      'four-horizontal': 53,
      '4-grid-columns': 54,
      '4-grid-rows': 55,
      '4-grid-left-large': 56,
      '4-grid-right-large': 57,
      '4-grid-top-large': 58,
      '4-grid': 51,
      '4-grid-bottom-large': 59,
      'five-grid': 61,
      'five-vertical': 62,
      'five-horizontal': 63,
      '5-grid-rows': 64,
      '5-grid-columns': 65,
      '5-grid-complex': 66,
      '6-grid-2x3': 71,
      '6-grid-3x2': 72,
      '6-grid-rows': 73,
      '6-grid-left-large': 74,
      '7-grid-left': 81,
      '7-grid-large': 82,
      '7-grid-complex1': 83,
      '7-grid-complex2': 84,
      '8-grid-2x4': 91,
      '8-grid-4x2': 92,
      '8-grid-columns': 93,
      '8-grid-rows': 94,
      '9-grid': 101,
      '12-grid-3x4': 111,
      '12-grid-4x3': 112,
      '16-grid': 121,
      '24-grid-4x6': 131,
      '24-grid-6x4': 132,
      '24-grid-rows': 133,
      '24-grid-columns': 134,
      '28-grid-4x7': 141,
      '28-grid-7x4': 142,
      '32-grid-4x8': 151,
      '32-grid-8x4': 152,
      'no-grid': 0,
      '1-grid': 0,
      '2-grid-vertical': 0,
      '2-grid-horizontal': 0
    };
    
    return layoutToGridIdMap[layout] ?? 1; // Default to 1 (single) if layout not found
  }, []);

  const DEFAULT_TAB_COLOR = '#262626';

  // Sort tabs by order property to ensure consistent display order
  const sortedTabs = useMemo(() => {
    return [...tabs].sort((a, b) => {
      const orderA = a.order !== undefined ? a.order : Infinity;
      const orderB = b.order !== undefined ? b.order : Infinity;
      return orderA - orderB;
    });
  }, [tabs]);

  const activeTab = sortedTabs.find(t => t.id === activeTabId) || sortedTabs[0];

  const handleAddTab = async (layout: LayoutType) => {
    // Prevent multiple simultaneous tab creations
    if (isAddingTab) {
      console.log('⚠️ [TabbedWidget] Already creating a tab, ignoring duplicate click');
      return;
    }
    
    setIsAddingTab(true);
    
    try {
      const newTab: Tab = {
        id: `tab-${Date.now()}`,
        name: `Tab ${tabs.length + 1}`,
        layout,
        icon: 'Star',
        color: DEFAULT_TAB_COLOR,
        order: tabs.length
      };
      
      // Get TabWidgetID for this tabbed widget container
      let tabWidgetID = getTabWidgetID();

      // Wait for actual widget ID if current ID is either generated (timestamp-based) OR is the template/dashboard ID
      if (isLikelyGeneratedTabWidgetId(tabWidgetID) || isLikelyDashboardId(tabWidgetID, activeTemplateId)) {
        const resolvedId = await waitForActualTabWidgetId();
        if (resolvedId !== null) {
          tabWidgetID = resolvedId;
        } else {
          // Could not resolve a valid TabWidgetID - add tab locally only
          // This can happen when the widget was just inserted and server hasn't assigned an ID yet
          console.warn('[TabbedWidget] Could not resolve TabWidgetID - adding tab locally');
          setTabs([...tabs, newTab]);
          setActiveTabId(newTab.id);
          setShowLayoutPicker(false);
          return;
        }
      }

      // Final validation: ensure we're not using the template/dashboard ID
      if (isLikelyDashboardId(tabWidgetID, activeTemplateId)) {
        console.warn('[TabbedWidget] TabWidgetID appears to be the dashboard ID - adding tab locally');
        setTabs([...tabs, newTab]);
        setActiveTabId(newTab.id);
        setShowLayoutPicker(false);
        return;
      }
      
      // Map layout to numeric grid ID
      const tabGridId = getTabGridId(layout);
      
      // Call API to save the tab
      try {
        
        const insertRequest: InsertTabWidgetRequest = {
          TabWidgetID: tabWidgetID,
          TabName: newTab.name,
          TabGrid: tabGridId.toString(),
          TabOrder: 1,
          TabIcon: 'icon',
          TabWidgetGap: '0',
          IsPredefined: 0,
          IsFavourite: 0,
          TabColor: newTab.color ?? DEFAULT_TAB_COLOR
        };

        const response = await insertTabWidget(insertRequest);
        
        // Check if the response indicates success and has CustomDashboardTabID
        // The API returns either Status: 'Success' or success: true, and CustomDashboardTabID on success
        const isSuccess = (response.Status === 'Success' || response.success === true) && !!response.CustomDashboardTabID;
        
        if (isSuccess && response.CustomDashboardTabID) {
          // DISABLED: Save the CustomDashboardTabID to localStorage (removed for debugging)
          // const customTabIdStorageKey = `pmt_tabbed_widget_custom_tab_id_${wgid || 'default'}_${newTab.id}`;
          // localStorage.setItem(customTabIdStorageKey, response.CustomDashboardTabID.toString());
          
          // Update the tab ID to use the CustomDashboardTabID from the API
          // This ensures the tab ID matches what's in the database
          const apiTabId = `tab-${response.CustomDashboardTabID}`;
          const finalTab = apiTabId !== newTab.id ? { ...newTab, id: apiTabId } : newTab;
          
          // Update tabDataMap with the final tab ID (not the temporary one)
          // This ensures the mapping is correct when merging tabs later
          setTabDataMap(prev => {
            const updated = { ...prev };
            // Remove old mapping if ID changed
            if (apiTabId !== newTab.id && updated[newTab.id]) {
              delete updated[newTab.id];
            }
            // Add mapping with the correct tab ID
            updated[finalTab.id] = response.CustomDashboardTabID!;
            return updated;
          });
          
          setTabs([...tabs, finalTab]);
          setActiveTabId(finalTab.id);
          
          // Generate and save tabid for the new tab (for grid position tracking)
          const tabid = getTabId(finalTab.id);
          saveTabId(finalTab.id, tabid);
          
          if (apiTabId !== newTab.id) {
            // DISABLED: Clean up old localStorage entries (removed for debugging)
            // const oldStorageKey = `pmt_tabbed_widget_custom_tab_id_${wgid || 'default'}_${newTab.id}`;
            // localStorage.removeItem(oldStorageKey);
          }
          
          // Refresh tabs from API to ensure we have the latest state
          // Force refresh to bypass cache and get the newly added tab
          // This ensures the new tab appears immediately without needing to refresh the page
          await fetchAllTabWidgets(true);
          
          // Ensure the newly added tab is active after refresh
          // Use the API tab ID to ensure we're using the correct ID format
          setActiveTabId(finalTab.id);
        } else {
          // API call failed - this is expected if TabWidgetID doesn't exist in database yet
          // The tab will be saved locally and can be synced later when the TabWidget container is created
          
          // Still add the tab locally
          setTabs([...tabs, newTab]);
          setActiveTabId(newTab.id);
          
          // Generate and save tabid for the new tab (for grid position tracking)
          const tabid = getTabId(newTab.id);
          saveTabId(newTab.id, tabid);
        }
      } catch {
        // Error saving tab to API - continue with local tab creation even if API call fails
        setTabs([...tabs, newTab]);
        setActiveTabId(newTab.id);
        
        // Generate and save tabid for the new tab (for grid position tracking)
        const tabid = getTabId(newTab.id);
        saveTabId(newTab.id, tabid);
      }
      
      setShowLayoutPicker(false);
    } finally {
      setIsAddingTab(false);
    }
  };


  const confirmDeleteTab = async () => {
    const { tabId } = deleteConfirm;
    
    // Get CustomDashboardTabID from tabDataMap (from getAllTabWidgetsWeb API)
    const customDashboardTabID = tabDataMap[tabId];
    
    // Call API to delete the tab if CustomDashboardTabID exists
    if (customDashboardTabID) {
      try {
        
        const result = await deleteTabWidget({
          CustomDashboardTabID: customDashboardTabID
        });
        
        if (result.success !== false && result.Status !== 'Error') {
        } else {
        }
      } catch {
      }
    }
    
    // Clean up localStorage entries for this tab
    if (wgid) {
      clearTabStorageKeys(wgid, tabId);
    }
    
    // Remove from local state
    const filtered = tabs.filter(t => t.id !== tabId);
    setTabs(filtered);
    
    // Remove all widgets in this tab
    const newSlots = { ...widgetSlots };
    Object.keys(newSlots).forEach(key => {
      if (key.startsWith(`${tabId}-`)) {
        delete newSlots[key];
      }
    });
    setWidgetSlots(newSlots);
    
    // Remove from tabDataMap
    const newTabDataMap = { ...tabDataMap };
    delete newTabDataMap[tabId];
    setTabDataMap(newTabDataMap);
    
    // Remove grid sizes for this tab
    setGridSizes(prevSizes => {
      const newSizes = { ...prevSizes };
      delete newSizes[tabId];
      return newSizes;
    });
    
    if (activeTabId === tabId) {
      setActiveTabId(filtered.length > 0 ? filtered[0].id : undefined);
    }
    
    // Track the deleted tab ID to prevent it from being re-added by API refresh
    // This prevents a race condition where the API might still return the deleted tab
    recentlyDeletedTabIdsRef.current.add(tabId);
    
    // Close confirmation dialog
    setDeleteConfirm({
      isOpen: false,
      tabId: '',
      tabName: ''
    });
    
    // Refresh tabs from API to ensure we have the latest state
    // Force refresh to bypass cache and get the updated list without the deleted tab
    // This ensures the deleted tab is removed immediately without needing to refresh the page
    await fetchAllTabWidgets(true);
    
    // NOTE: We don't clear this tracking with a timeout anymore.
    // The tab stays tracked as deleted until wgid changes or page refresh.
    // This prevents deleted tabs from reappearing due to stale API data.
  };

  const cancelDeleteTab = () => {
    setDeleteConfirm({
      isOpen: false,
      tabId: '',
      tabName: ''
    });
  };

  const handleRenameTab = async (tabId: string, newName: string) => {
    // Capture old name before updating
    const oldName = tabs.find(t => t.id === tabId)?.name || newName;
    
    // Update local state first (optimistic update)
    setTabs(tabs.map(tab => tab.id === tabId ? { ...tab, name: newName } : tab));
    
    // Get CustomDashboardTabID from tabDataMap
    const customDashboardTabID = tabDataMap[tabId];
    
    // Call API to rename the tab if CustomDashboardTabID exists
    if (customDashboardTabID) {
      try {
        await renameDashboardTab({
          RenameDashboardTab: customDashboardTabID,
          NewName: newName
        });
        // localStorage will be updated automatically by the save effect when state changes
      } catch (error) {
        console.error('❌ [TabbedWidget] Failed to rename tab:', error);
        // Revert the name change on error
        setTabs(prevTabs => prevTabs.map(tab => tab.id === tabId ? { ...tab, name: oldName } : tab));
      }
    }
  };

  const handleWidgetSettingsClick = useCallback(() => {
    // Always use the internal combined settings panel
    // which contains both tab bar position and tab manager
    setIsSettingsPanelOpen(true);
  }, []);

  // Handler for opening child widget settings panel
  const handleChildWidgetSettings = useCallback((slotKey: string, widgetId: string) => {
    setChildWidgetSettingsSlotKey(slotKey);
    setChildWidgetSettingsType(widgetId);
    setChildWidgetSettingsOpen(true);
  }, []);

  // Handler for saving child widget settings
  const handleSaveChildWidgetSettings = useCallback(async (newSettings: WidgetSettings) => {
    if (childWidgetSettingsSlotKey) {
      // Update local state immediately
      setWidgetSlots(prev => ({
        ...prev,
        [childWidgetSettingsSlotKey]: {
          ...prev[childWidgetSettingsSlotKey],
          settings: {
            ...prev[childWidgetSettingsSlotKey]?.settings,
            ...newSettings
          }
        }
      }));
      // Save to storage
      saveToBothStorages();

      // Also save to database if template is saved
      const activeTemplate = templates.find(t => t.id === activeTemplateId);
      if (activeTemplate?.saved && activeTemplateId) {
        // Parse slot key to get tabId and slotIndex
        // Format is `${tabId}-${slotIndex}`, but tabId can contain hyphens (e.g., "tab-144-0")
        const lastHyphenIndex = childWidgetSettingsSlotKey.lastIndexOf('-');
        const tabId = childWidgetSettingsSlotKey.substring(0, lastHyphenIndex);
        const slotIndexStr = childWidgetSettingsSlotKey.substring(lastHyphenIndex + 1);
        const slotIndex = parseInt(slotIndexStr, 10);

        // Get the CustomDashboardTabID from tabDataMap
        const customTabsID = tabDataMap[tabId];

        // First try to get customDashboardWidgetID from local widgetSlots state
        let customDashboardWidgetID = widgetSlots[childWidgetSettingsSlotKey]?.settings?.customDashboardWidgetID as number | undefined;

        // If not in local state, look it up directly from templates (like BloombergDashboard does)
        // This handles the case where a widget was just added and templates were refreshed
        // but local widgetSlots state hasn't been updated yet
        if (!customDashboardWidgetID && customTabsID && !isNaN(slotIndex)) {
          // Find the widget in the template by matching customTabsID and slot position
          const tab = tabs.find(t => t.id === tabId);
          if (tab) {
            const cellPosition = getTabbedWidgetCellPosition(tab.layout, slotIndex);
            // Look for widget in template that matches both the customTabsID and position pattern
            const templateWidget = activeTemplate.widgets?.find(w => {
              const widgetCustomTabsID = w.settings?.customTabsID as number | undefined;
              // Match by customTabsID and position (position format: gt22_1, gt22_2, etc.)
              return widgetCustomTabsID === customTabsID && w.position === cellPosition;
            });
            if (templateWidget?.settings?.customDashboardWidgetID) {
              customDashboardWidgetID = templateWidget.settings.customDashboardWidgetID as number;
              console.log('🔍 [TabbedWidget] Found customDashboardWidgetID from template:', {
                customDashboardWidgetID,
                cellPosition,
                customTabsID
              });
            }
          }
        }

        if (customDashboardWidgetID) {
          try {
            let additionalSettings: string;
            let module: string | undefined;
            let symbols: string | undefined;

            // Filter out metadata fields that shouldn't be saved in additionalSettings
            const { 
              customDashboardWidgetID: _cdwid, 
              customTabsID: _ctid, 
              coordinates: _coords, 
              zIndex: _zIndex,
              additionalSettings: _addSettings,
              module: settingsModule,
              symbols: settingsSymbols,
              ...cleanSettings 
            } = newSettings as Record<string, unknown>;

            // All widgets now save as JSON
            additionalSettings = JSON.stringify(cleanSettings);
            
            // Extract module and symbols
            // For dmx-positioning and dmx-open-interest, do NOT save to symbols column
            // Everything should be in additionalSettings JSON
            const widgetType = childWidgetSettingsType?.toLowerCase();
            const isDMXWidget = widgetType === 'dmx-positioning' || widgetType === 'dmx-open-interest';
            
            if (!isDMXWidget) {
              if (settingsModule) module = String(settingsModule);
              else if (newSettings.module) module = newSettings.module;
              if (settingsSymbols) symbols = String(settingsSymbols);
              else if (newSettings.symbol) symbols = newSettings.symbol;
            }

            // Update widget fields in database
            const updateFields: any = { additionalSettings };
            if (module !== undefined) {
              updateFields.module = module;
            }
            if (symbols !== undefined) {
              updateFields.symbols = symbols;
            }

            console.log('📡 [TabbedWidget] Calling updateWidgetFields API for child widget:', {
              customDashboardWidgetID,
              activeTemplateId,
              slotKey: childWidgetSettingsSlotKey,
              widgetType: childWidgetSettingsType,
              updateFields
            });

            const result = await updateWidgetFields(
              String(customDashboardWidgetID),
              activeTemplateId,
              updateFields
            );

            if (result.success) {
              console.log('✅ [TabbedWidget] Child widget settings saved to database:', {
                widgetId: customDashboardWidgetID,
                templateId: activeTemplateId,
                slotKey: childWidgetSettingsSlotKey
              });
            } else {
              console.warn('⚠️ [TabbedWidget] Failed to save child widget settings to database:', result.message);
            }
          } catch (error) {
            console.error('❌ [TabbedWidget] Error saving child widget settings to database:', error);
            // Don't throw - we still want to update local state even if DB save fails
          }
        } else {
          console.warn('⚠️ [TabbedWidget] Cannot save child widget settings to database - customDashboardWidgetID is missing:', {
            slotKey: childWidgetSettingsSlotKey,
            widgetType: childWidgetSettingsType,
            customTabsID,
            tabId,
            slotIndex
          });
        }
      }
    }
    // Don't automatically close the panel - let the user close it manually
    // The panel is closed when user clicks the close button or backdrop
    // setChildWidgetSettingsOpen(false);
  }, [childWidgetSettingsSlotKey, childWidgetSettingsType, widgetSlots, tabDataMap, tabs, activeTemplateId, templates, updateWidgetFields, saveToBothStorages]);

  // Handler for child widgets to save settings inline (e.g., when dropdown values change)
  // This is called by widgets themselves (like COT Positioning, COT Table View) when their settings change
  const handleChildWidgetInlineSave = useCallback(async (slotKey: string, settingsToSave: Record<string, any>) => {
    console.log('📝 [TabbedWidget] handleChildWidgetInlineSave called:', { slotKey, settingsToSave });
    
    // Update local state immediately
    const existingSettings = widgetSlots[slotKey]?.settings || {};
    const mergedSettings = { ...existingSettings, ...settingsToSave };
    
    console.log('📝 [TabbedWidget] Merged settings:', { existingSettings, mergedSettings });
    
    setWidgetSlots(prev => ({
      ...prev,
      [slotKey]: {
        ...prev[slotKey],
        settings: mergedSettings
      }
    }));
    
    // Save to storage
    saveToBothStorages();

    // Also save to database if template is saved
    const activeTemplate = templates.find(t => t.id === activeTemplateId);
    console.log('📝 [TabbedWidget] Active template check:', { 
      activeTemplateId, 
      hasActiveTemplate: !!activeTemplate,
      templateSaved: activeTemplate?.saved,
      widgetCount: activeTemplate?.widgets?.length
    });
    
    if (activeTemplate?.saved && activeTemplateId) {
      try {
        // Parse slot key to get tabId and slotIndex
        const lastHyphenIndex = slotKey.lastIndexOf('-');
        const tabId = slotKey.substring(0, lastHyphenIndex);
        const slotIndexStr = slotKey.substring(lastHyphenIndex + 1);
        const slotIndex = parseInt(slotIndexStr, 10);

        // Get the CustomDashboardTabID from tabDataMap
        const customTabsID = tabDataMap[tabId];
        
        console.log('📝 [TabbedWidget] Slot parsing:', { slotKey, tabId, slotIndex, customTabsID, tabDataMap });

        // Get customDashboardWidgetID from settings
        let customDashboardWidgetID = mergedSettings.customDashboardWidgetID as number | undefined;
        
        console.log('📝 [TabbedWidget] Initial customDashboardWidgetID from settings:', customDashboardWidgetID);

        // If not in merged settings, look it up from template
        if (!customDashboardWidgetID && customTabsID && !isNaN(slotIndex)) {
          const tab = tabs.find(t => t.id === tabId);
          if (tab) {
            const cellPosition = getTabbedWidgetCellPosition(tab.layout, slotIndex);
            console.log('📝 [TabbedWidget] Looking up widget in template:', { 
              tabLayout: tab.layout, 
              cellPosition, 
              customTabsID,
              templateWidgets: activeTemplate.widgets?.map(w => ({ 
                name: w.name, 
                position: w.position, 
                customTabsID: w.settings?.customTabsID,
                customDashboardWidgetID: w.settings?.customDashboardWidgetID
              }))
            });
            
            const templateWidget = activeTemplate.widgets?.find(w => {
              const widgetCustomTabsID = w.settings?.customTabsID as number | undefined;
              return widgetCustomTabsID === customTabsID && w.position === cellPosition;
            });
            if (templateWidget?.settings?.customDashboardWidgetID) {
              customDashboardWidgetID = templateWidget.settings.customDashboardWidgetID as number;
              console.log('🔍 [TabbedWidget] Found customDashboardWidgetID from template:', {
                customDashboardWidgetID,
                cellPosition,
                customTabsID
              });
            } else {
              console.log('⚠️ [TabbedWidget] Widget not found in template or missing customDashboardWidgetID:', {
                templateWidget,
                cellPosition,
                customTabsID
              });
            }
          }
        }

        if (customDashboardWidgetID) {
          // Create additionalSettings JSON from settingsToSave
          const additionalSettings = JSON.stringify(settingsToSave);
          
          const updateFields: any = { additionalSettings };

          console.log('📡 [TabbedWidget] Calling updateWidgetFields API for inline save:', {
            customDashboardWidgetID,
            activeTemplateId,
            slotKey,
            updateFields
          });

          const result = await updateWidgetFields(
            String(customDashboardWidgetID),
            activeTemplateId,
            updateFields
          );

          if (result.success) {
            console.log('✅ [TabbedWidget] Inline settings saved to database:', {
              widgetId: customDashboardWidgetID,
              templateId: activeTemplateId,
              slotKey
            });
          } else {
            console.warn('⚠️ [TabbedWidget] Failed to save inline settings to database:', result.message);
          }
        } else {
          // customDashboardWidgetID not found - widget may have been just added
          // Try refreshing templates to get the latest widget IDs
          console.log('🔄 [TabbedWidget] customDashboardWidgetID not found, refreshing templates to get it...');
          
          if (refreshTemplates) {
            await refreshTemplates(undefined, true);
            
            // After refresh, use templatesRef.current to get fresh data (updated via useEffect)
            // We need to wait a tick for the state update to propagate to the ref
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const refreshedTemplate = templatesRef.current.find(t => t.id === activeTemplateId);
            console.log('🔄 [TabbedWidget] After refresh - got template:', { 
              hasTemplate: !!refreshedTemplate, 
              widgetCount: refreshedTemplate?.widgets?.length 
            });
            
            if (refreshedTemplate && customTabsID && !isNaN(slotIndex)) {
              const tab = tabs.find(t => t.id === tabId);
              if (tab) {
                const cellPosition = getTabbedWidgetCellPosition(tab.layout, slotIndex);
                const templateWidget = refreshedTemplate.widgets?.find(w => {
                  const widgetCustomTabsID = w.settings?.customTabsID as number | undefined;
                  return widgetCustomTabsID === customTabsID && w.position === cellPosition;
                });
                
                if (templateWidget?.settings?.customDashboardWidgetID) {
                  const refreshedWidgetId = templateWidget.settings.customDashboardWidgetID as number;
                  console.log('🔍 [TabbedWidget] Found customDashboardWidgetID after refresh:', refreshedWidgetId);
                  
                  // Now save the settings
                  const additionalSettings = JSON.stringify(settingsToSave);
                  const updateFields: any = { additionalSettings };
                  
                  const result = await updateWidgetFields(
                    String(refreshedWidgetId),
                    activeTemplateId,
                    updateFields
                  );
                  
                  if (result.success) {
                    console.log('✅ [TabbedWidget] Inline settings saved to database after refresh');
                    
                    // Update local widgetSlots with the customDashboardWidgetID so future saves work immediately
                    setWidgetSlots(prev => ({
                      ...prev,
                      [slotKey]: {
                        ...prev[slotKey],
                        settings: {
                          ...prev[slotKey]?.settings,
                          customDashboardWidgetID: refreshedWidgetId
                        }
                      }
                    }));
                  } else {
                    console.warn('⚠️ [TabbedWidget] Failed to save after refresh:', result.message);
                  }
                } else {
                  console.warn('⚠️ [TabbedWidget] Still cannot find customDashboardWidgetID after refresh:', {
                    slotKey,
                    customTabsID,
                    tabId,
                    slotIndex
                  });
                }
              }
            }
          } else {
            console.warn('⚠️ [TabbedWidget] Cannot save inline settings - customDashboardWidgetID is missing and refreshTemplates not available:', {
              slotKey,
              customTabsID,
              tabId,
              slotIndex
            });
          }
        }
      } catch (error) {
        console.error('❌ [TabbedWidget] Error saving inline settings to database:', error);
      }
    }
  }, [widgetSlots, tabDataMap, tabs, activeTemplateId, templates, updateWidgetFields, saveToBothStorages, refreshTemplates]);

  // Handler for tab bar position change
  const handleTabBarPositionChange = useCallback((position: "top" | "bottom") => {
    setTabBarPosition(position);
    // Save to localStorage as part of the widget state
    saveToBothStorages();
  }, [saveToBothStorages]);

  const handleAddWidgetToSlot = (slotKey: string) => {
    setTargetSlotKey(slotKey);
    setShowWidgetPicker(true);
  };

  // Drag and drop handlers for widget slots
  const handleSlotDragOver = useCallback((e: React.DragEvent, slotKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverSlot(slotKey);
    setIsDraggingWidget(true);
  }, []);

  const handleSlotDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only clear if actually leaving the element
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverSlot(null);
    }
  }, []);

  const handleSlotDrop = useCallback(async (e: React.DragEvent, slotKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const widgetId = e.dataTransfer.getData('text/plain');
    
    if (!widgetId || widgetId === TABBED_WIDGET_ID) {
      setDragOverSlot(null);
      setIsDraggingWidget(false);
      return;
    }

    // Parse slot key to get tabId and slotIndex
    const lastHyphenIndex = slotKey.lastIndexOf('-');
    const tabId = slotKey.substring(0, lastHyphenIndex);
    const slotIndexStr = slotKey.substring(lastHyphenIndex + 1);
    const slotIndex = parseInt(slotIndexStr, 10);

    if (isNaN(slotIndex)) {
      setWidgetSlots(prev => ({
        ...prev,
        [slotKey]: { widgetId, settings: {} }
      }));
      setDragOverSlot(null);
      setIsDraggingWidget(false);
      return;
    }

    // Find the tab to get its layout
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) {
      setWidgetSlots(prev => ({
        ...prev,
        [slotKey]: { widgetId, settings: {} }
      }));
      setDragOverSlot(null);
      setIsDraggingWidget(false);
      return;
    }

    // Calculate grid cell position
    const cellPosition = getTabbedWidgetCellPosition(tab.layout, slotIndex);
    
    // Get CustomDashboardTabID from tabDataMap
    const customDashboardTabID = tabDataMap[tabId];

    if (!customDashboardTabID) {
      console.error('❌ Cannot add widget to tab via drag - CustomDashboardTabID is missing:', {
        tabId,
        tabDataMap,
        message: 'Tab may not be synced with database yet. Try refreshing the page.'
      });
      // Clear this slot from recently deleted tracking since user is explicitly dropping a widget
      if (recentlyDeletedSlotsRef.current.has(slotKey)) {
        console.log('🧹 [TabbedWidget] Clearing deleted slot tracking for:', slotKey, '- user dropping widget (no CustomDashboardTabID)');
        recentlyDeletedSlotsRef.current.delete(slotKey);
      }
      // Still update local state so user sees the widget
      const getInitialWidgetSettings = (id: string): Record<string, unknown> => {
        switch (id) {
          case 'currency-strength':
            return {
              currencies: ['USD', 'EUR', 'JPY', 'GBP', 'AUD', 'CHF', 'CAD', 'NZD'],
              timeframe: 'TD',
              showVolume: 1
            };
          default:
            return {};
        }
      };
      setWidgetSlots(prev => ({
        ...prev,
        [slotKey]: { widgetId, settings: getInitialWidgetSettings(widgetId) }
      }));
      setDragOverSlot(null);
      setIsDraggingWidget(false);
      return;
    }

    // Clear this slot from recently deleted tracking since user is explicitly dropping a widget
    if (recentlyDeletedSlotsRef.current.has(slotKey)) {
      console.log('🧹 [TabbedWidget] Clearing deleted slot tracking for:', slotKey, '- user dropping new widget');
      recentlyDeletedSlotsRef.current.delete(slotKey);
    }
    
    // Get widget-specific default settings
    const getInitialWidgetSettings = (id: string): Record<string, unknown> => {
      switch (id) {
        case 'currency-strength':
          return {
            currencies: ['USD', 'EUR', 'JPY', 'GBP', 'AUD', 'CHF', 'CAD', 'NZD'],
            timeframe: 'TD',
            showVolume: 1
          };
        default:
          return {};
      }
    };
    
    // Update local state with initial settings
    setWidgetSlots(prev => ({
      ...prev,
      [slotKey]: { widgetId, settings: getInitialWidgetSettings(widgetId) }
    }));
    setDragOverSlot(null);
    setIsDraggingWidget(false);

    // Call API to add widget to template if we have a template ID
    if (activeTemplateId && addWidgetToTemplate) {
      try {
        const selectedWidget = availableWidgets.find(w => w.id === widgetId);
        const widgetTitle = selectedWidget?.name ?? widgetId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        await addWidgetToTemplate(
          activeTemplateId,
          widgetId,
          widgetTitle,
          cellPosition,
          undefined,
          customDashboardTabID
        );
        
        // Refresh templates to ensure widget persists in UI
        const activeTemplate = templates.find(t => t.id === activeTemplateId);
        if (activeTemplate?.saved && refreshTemplateWidgets) {
          await refreshTemplateWidgets(activeTemplateId);
        }
      } catch (error) {
        console.error('Failed to save dropped widget to API:', error);
      }
    }
  }, [tabs, tabDataMap, activeTemplateId, addWidgetToTemplate, templates, refreshTemplates]);

  const handleSlotDragEnd = useCallback(() => {
    setDragOverSlot(null);
    setIsDraggingWidget(false);
  }, []);

  const closeWidgetPicker = () => {
    setShowWidgetPicker(false);
    setTargetSlotKey(null);
  };

  const handleSelectWidget = async (widgetId: string) => {
    if (widgetId === TABBED_WIDGET_ID) {
      return;
    }
    if (!targetSlotKey) {
      closeWidgetPicker();
      return;
    }

    // Parse slot key to get tabId and slotIndex
    // Format is `${tabId}-${slotIndex}`, but tabId can contain hyphens (e.g., "tab-144-0")
    // So we need to find the last hyphen and split there
    const lastHyphenIndex = targetSlotKey.lastIndexOf('-');
    const tabId = targetSlotKey.substring(0, lastHyphenIndex);
    const slotIndexStr = targetSlotKey.substring(lastHyphenIndex + 1);
    const slotIndex = parseInt(slotIndexStr, 10);
    
    if (isNaN(slotIndex)) {
      // Clear this slot from recently deleted tracking
      if (recentlyDeletedSlotsRef.current.has(targetSlotKey)) {
        recentlyDeletedSlotsRef.current.delete(targetSlotKey);
      }
      const getInitialWidgetSettings = (id: string): Record<string, unknown> => {
        switch (id) {
          case 'currency-strength':
            return {
              currencies: ['USD', 'EUR', 'JPY', 'GBP', 'AUD', 'CHF', 'CAD', 'NZD'],
              timeframe: 'TD',
              showVolume: 1
            };
          default:
            return {};
        }
      };
      setWidgetSlots({
        ...widgetSlots,
        [targetSlotKey]: { widgetId, settings: getInitialWidgetSettings(widgetId) }
      });
      closeWidgetPicker();
      return;
    }

    // Find the tab to get its layout
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) {
      // Clear this slot from recently deleted tracking
      if (recentlyDeletedSlotsRef.current.has(targetSlotKey)) {
        recentlyDeletedSlotsRef.current.delete(targetSlotKey);
      }
      const getInitialWidgetSettings = (id: string): Record<string, unknown> => {
        switch (id) {
          case 'currency-strength':
            return {
              currencies: ['USD', 'EUR', 'JPY', 'GBP', 'AUD', 'CHF', 'CAD', 'NZD'],
              timeframe: 'TD',
              showVolume: 1
            };
          default:
            return {};
        }
      };
      setWidgetSlots({
        ...widgetSlots,
        [targetSlotKey]: { widgetId, settings: getInitialWidgetSettings(widgetId) }
      });
      closeWidgetPicker();
      return;
    }

    // Calculate grid cell position (e.g., gt21_1, gt51_5)
    const cellPosition = getTabbedWidgetCellPosition(tab.layout, slotIndex);
    
    // Get CustomDashboardTabID (CustomTabsID) from tabDataMap
    const customDashboardTabID = tabDataMap[tabId];

    // CRITICAL: Check if customDashboardTabID exists
    // Without it, the widget won't be associated with the tab in the database
    if (!customDashboardTabID) {
      console.error('❌ Cannot add widget to tab - CustomDashboardTabID is missing:', {
        tabId,
        tabDataMap,
        availableTabs: tabs.map(t => ({ id: t.id, name: t.name })),
        message: 'Tab may not be synced with database yet. Try refreshing the page.'
      });
      // Clear this slot from recently deleted tracking
      if (recentlyDeletedSlotsRef.current.has(targetSlotKey)) {
        recentlyDeletedSlotsRef.current.delete(targetSlotKey);
      }
      // Still update local state so user sees the widget, but it won't persist
      const getInitialWidgetSettings = (id: string): Record<string, unknown> => {
        switch (id) {
          case 'currency-strength':
            return {
              currencies: ['USD', 'EUR', 'JPY', 'GBP', 'AUD', 'CHF', 'CAD', 'NZD'],
              timeframe: 'TD',
              showVolume: 1
            };
          default:
            return {};
        }
      };
      setWidgetSlots({
        ...widgetSlots,
        [targetSlotKey]: { widgetId, settings: getInitialWidgetSettings(widgetId) }
      });
      closeWidgetPicker();
      // Show error to user
      if (typeof window !== 'undefined' && 'showToast' in window && typeof (window as { showToast?: (msg: string) => void }).showToast === 'function') {
        ((window as { showToast: (msg: string) => void }).showToast)('Failed to save widget: Tab not synced with database. Please refresh the page.');
      }
      return;
    }

    // Clear this slot from recently deleted tracking since user is explicitly adding a widget
    if (recentlyDeletedSlotsRef.current.has(targetSlotKey)) {
      console.log('🧹 [TabbedWidget] Clearing deleted slot tracking for:', targetSlotKey, '- user adding new widget');
      recentlyDeletedSlotsRef.current.delete(targetSlotKey);
    }
    
    // Get widget-specific default settings to avoid flickering
    const getInitialWidgetSettings = (id: string): Record<string, unknown> => {
      switch (id) {
        case 'currency-strength':
          return {
            currencies: ['USD', 'EUR', 'JPY', 'GBP', 'AUD', 'CHF', 'CAD', 'NZD'],
            timeframe: 'TD',
            showVolume: 1
          };
        default:
          return {};
      }
    };
    
    // Update local state first with initial settings
    setWidgetSlots({
      ...widgetSlots,
      [targetSlotKey]: { widgetId, settings: getInitialWidgetSettings(widgetId) }
    });
    closeWidgetPicker();

    // Call API to add widget to template if we have a template ID
    if (activeTemplateId && addWidgetToTemplate) {
      try {
        const selectedWidget = availableWidgets.find(w => w.id === widgetId);
        const widgetTitle = selectedWidget?.name ?? widgetId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        // Call addWidgetToTemplate with CustomTabsID
        await addWidgetToTemplate(
          activeTemplateId,
          widgetId,
          widgetTitle,
          cellPosition,
          undefined, // coordinates not needed for grid cells
          customDashboardTabID // Pass CustomTabsID
        );
        
        // Refresh templates to get the updated widget list with customDashboardWidgetID
        // This ensures data-wgid attribute is populated and widget persists in UI without page refresh
        // skipLoading=true prevents the loading UI flash
        const activeTemplate = templates.find(t => t.id === activeTemplateId);
        if (activeTemplate?.saved && refreshTemplateWidgets) {
          await refreshTemplateWidgets(activeTemplateId);
        }
      } catch {
        // Don't remove the widget from local state on error - let user see it
      }
    }
  };

  // Show toast notification
  const showToast = (message: string) => {
    setToast({ message, isVisible: true });
    // Auto-hide toast after 3 seconds
    setTimeout(() => {
      setToast({ message: '', isVisible: false });
    }, 3000);
  };

  const handleRemoveWidgetFromSlot = async (slotKey: string) => {
    // Directly remove the widget since confirmation was already handled by WidgetHeader
    if (!slotKey) return;
    
    // Parse slot key to get tabId and slotIndex
    const lastHyphenIndex = slotKey.lastIndexOf('-');
    const tabId = slotKey.substring(0, lastHyphenIndex);
    const slotIndexStr = slotKey.substring(lastHyphenIndex + 1);
    const slotIndex = parseInt(slotIndexStr, 10);
    
    if (isNaN(slotIndex)) {
      return;
    }
    
    // Find the tab to get its layout
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) {
      return;
    }
    
    // Update local state first (optimistic update)
    const newSlots = { ...widgetSlots };
    delete newSlots[slotKey];
    setWidgetSlots(newSlots);
    
    // Mark this slot as recently deleted to prevent it from being restored by stale settings
    recentlyDeletedSlotsRef.current.add(slotKey);
    console.log('🗑️ [TabbedWidget] Marked slot as deleted:', slotKey, 'Currently deleted slots:', Array.from(recentlyDeletedSlotsRef.current));
    
    // NOTE: We don't clear this tracking with a timeout anymore.
    // The slot stays tracked as deleted until:
    // 1. User explicitly adds a new widget to the slot (clears the tracking)
    // 2. wgid changes (all tracking is cleared)
    // 3. Page refresh (state resets)
    // This prevents deleted widgets from reappearing due to stale API/template data.
    
    // Save to localStorage immediately after state update
    // Note: We need to save the newSlots directly since setWidgetSlots is async
    if (wgid) {
      const stateToSave: TabbedWidgetState = {
        tabs: tabs.map((t, index) => ({
          id: t.id,
          name: t.name,
          layout: t.layout as string,
          color: t.color,
          icon: t.icon,
          order: t.order !== undefined ? t.order : index
        })),
        activeTabId,
        tabBarPosition,
        widgetSlots: Object.entries(newSlots).reduce((acc, [key, slot]) => {
          if (slot.widgetId) {
            acc[key] = {
              widgetId: slot.widgetId,
              settings: slot.settings || {}
            };
          }
          return acc;
        }, {} as Record<string, { widgetId: string; settings: Record<string, unknown> }>),
        gridSizes,
        lastModified: Date.now(),
        version: localStorageVersionRef.current + 1
      };
      localStorageVersionRef.current = stateToSave.version;
      saveTabbedWidgetState(wgid, stateToSave);
    }
    
    // Remove from template via API
    if (activeTemplateId && removeWidgetFromTemplate) {
      try {
        // Calculate grid cell position (e.g., gt21_1, gt51_5)
        const cellPosition = getTabbedWidgetCellPosition(tab.layout, slotIndex);
        await removeWidgetFromTemplate(activeTemplateId, cellPosition);
      } catch (error) {
        console.error('❌ [TabbedWidget] Failed to remove widget from template:', error);
        // Show error toast
        showToast('Failed to remove widget from tab');
        // Don't restore the widget to local state - let the user manually re-add if needed
      }
    }
  };

  // Helper function to get grid sizes for a tab
  const getGridSizes = useCallback((tabId: string, layout: LayoutType): number[] => {
    return gridSizes[tabId] || DEFAULT_GRID_SIZES[layout] || [100];
  }, [gridSizes]);

  // Helper to calculate row sizes for NxM grid layouts
  // This ensures each row has independent column widths (not affected by row height changes)
  const getMemoizedRowSizes = useCallback((tabId: string, layout: LayoutType, numRows: number, numCols: number) => {
    const currentSizes = getGridSizes(tabId, layout);
    const defaultColWidth = 100 / numCols;
    const rowSizesMap: { [rowIndex: number]: string[] } = {};
    
    for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
      const rowStart = rowIndex * numCols;
      rowSizesMap[rowIndex] = Array.from({ length: numCols }, (_, colIndex) => {
        const storedSize = currentSizes[rowStart + colIndex];
        return storedSize ? `${storedSize}%` : `${defaultColWidth}%`;
      });
    }
    
    return rowSizesMap;
  }, [getGridSizes]);

  // Resize handlers

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizeState || !containerRef.current) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const currentPos = resizeState.direction === 'horizontal' ? e.clientX : e.clientY;
    const containerSize = resizeState.direction === 'horizontal' ? containerRect.width : containerRect.height;
    const delta = currentPos - resizeState.startPos;
    const deltaPercent = (delta / containerSize) * 100;

    const newSizes = [...resizeState.startSizes];
    const tab = tabs.find(t => t.id === resizeState.tabId);
    if (!tab) return;

    // Handle two-column/row layouts
    if (tab.layout === 'two-vertical' || tab.layout === 'two-horizontal') {
      newSizes[0] = Math.max(10, Math.min(90, resizeState.startSizes[0] + deltaPercent));
      newSizes[1] = 100 - newSizes[0];
    }
    // Handle three-column/row layouts
    else if (
      tab.layout === 'three-vertical' || 
      tab.layout === 'three-horizontal' ||
      tab.layout === '3-grid-columns' ||
      tab.layout === '3-grid-rows'
    ) {
      const dividerIndex = resizeState.dividerIndex || 0;
      if (dividerIndex === 0) {
        const totalAdjustable = resizeState.startSizes[0] + resizeState.startSizes[1];
        newSizes[0] = Math.max(10, Math.min(totalAdjustable - 10, resizeState.startSizes[0] + deltaPercent));
        newSizes[1] = totalAdjustable - newSizes[0];
        newSizes[2] = resizeState.startSizes[2];
      } else {
        const totalAdjustable = resizeState.startSizes[1] + resizeState.startSizes[2];
        newSizes[1] = Math.max(10, Math.min(totalAdjustable - 10, resizeState.startSizes[1] + deltaPercent));
        newSizes[2] = totalAdjustable - newSizes[1];
        newSizes[0] = resizeState.startSizes[0];
      }
    }
    // For simple layouts, just update the adjacent cells
    else {
      const dividerIndex = resizeState.dividerIndex || 0;
      if (dividerIndex < newSizes.length - 1) {
        const totalAdjustable = resizeState.startSizes[dividerIndex] + resizeState.startSizes[dividerIndex + 1];
        newSizes[dividerIndex] = Math.max(10, Math.min(totalAdjustable - 10, resizeState.startSizes[dividerIndex] + deltaPercent));
        newSizes[dividerIndex + 1] = totalAdjustable - newSizes[dividerIndex];
      }
    }

    setGridSizes(prev => ({
      ...prev,
      [resizeState.tabId]: newSizes
    }));
  }, [resizeState, tabs]);

  const handleMouseUp = useCallback(async () => {
    if (!resizeState) {
      return;
    }

    const tab = tabs.find(t => t.id === resizeState.tabId);
    if (!tab) {
      setResizeState(null);
      return;
    }

    // Get current grid sizes for this tab
    const currentSizes = getGridSizes(resizeState.tabId, tab.layout);
    
    // Get CustomDashboardTabID from tabDataMapRef (from getAllTabWidgetsWeb API)
    const currentTabDataMap = tabDataMapRef.current;
    const customDashboardTabID = currentTabDataMap[resizeState.tabId];
    
    if (!customDashboardTabID) {
      setResizeState(null);
      return;
    }
    
    // Calculate positions for all cells in this tab
    try {
      const positions = calculateTabbedWidgetPositions(
        tab.layout,
        currentSizes,
        customDashboardTabID
      );

      // Call API to save positions
      await insertTabGridPosition(positions);
      } catch {
        // Error saving tab grid positions
      }

    setResizeState(null);
  }, [resizeState, tabs, getGridSizes]);

  // Fetch all tab widgets on mount and create tabs from API response
  const fetchAllTabWidgets = useCallback(async (forceRefresh: boolean = false) => {
      try {
        setIsLoadingTabs(true);
        // Get the TabWidgetID for this widget FIRST before deciding on refresh strategy
        const finalTabWidgetID = getTabWidgetID();
        
        if (isLikelyGeneratedTabWidgetId(finalTabWidgetID)) {
          console.log('⏭️ [TabbedWidget] TabWidgetID is generated, skipping fetch:', finalTabWidgetID);
          setIsLoadingTabs(false);
          return;
        }
        
        // Strategy: If forceRefresh is requested, skip cache and go directly to API
        // Otherwise, try cache first then API if needed
        // This prevents double API calls while still allowing fresh data when needed
        
        let response;
        let matchingTabs: typeof response.Data = [];
        
        if (forceRefresh) {
          // Skip cache check and fetch directly from API when forceRefresh is true
          console.log('🔄 [TabbedWidget] ForceRefresh requested, fetching from API:', {
            finalTabWidgetID,
            wgid,
            isDetailsTemplate
          });
          response = await getAllTabWidgets(true, finalTabWidgetID);
          
          if (response.Status === 'Success' && response.Data && response.Data.length > 0) {
            matchingTabs = response.Data.filter(tab => tab.TabWidgetID === finalTabWidgetID);
            console.log('🔍 [TabbedWidget] API result:', {
              finalTabWidgetID,
              totalTabsFromAPI: response.Data.length,
              matchingTabsFromAPI: matchingTabs.length,
              wgid,
              isDetailsTemplate,
              matchingTabNames: matchingTabs.map(t => t.TabName)
            });
          }
        } else {
          // Step 1: Try cache first
          // This is important because createDetailsTemplateWeb adds tabs to cache
          response = await getAllTabWidgets(false, finalTabWidgetID);
          
          if (response.Status === 'Success' && response.Data && response.Data.length > 0) {
            matchingTabs = response.Data.filter(tab => tab.TabWidgetID === finalTabWidgetID);
            console.log('🔍 [TabbedWidget] Cache check:', {
              finalTabWidgetID,
              totalTabsInCache: response.Data.length,
              matchingTabsInCache: matchingTabs.length
            });
          }
          
          // Step 2: If cache doesn't have tabs for this widget, fetch from API
          if (matchingTabs.length === 0) {
            console.log('🔄 [TabbedWidget] No matching tabs in cache, fetching from API:', {
              finalTabWidgetID,
              wgid,
              isDetailsTemplate
            });
            response = await getAllTabWidgets(true, finalTabWidgetID);
            
            if (response.Status === 'Success' && response.Data && response.Data.length > 0) {
              matchingTabs = response.Data.filter(tab => tab.TabWidgetID === finalTabWidgetID);
              console.log('🔍 [TabbedWidget] API result:', {
                finalTabWidgetID,
                totalTabsFromAPI: response.Data.length,
                matchingTabsFromAPI: matchingTabs.length,
                wgid,
                isDetailsTemplate,
                matchingTabNames: matchingTabs.map(t => t.TabName)
              });
            }
          }
        }
        
        // Update previous template ID after fetch
        previousTemplateIdRef.current = activeTemplateId;

        if (response.Status === 'Error') {
          if (isForbiddenResponse(response.Message)) {
            setIsPremiumLocked(true);
          }
          setIsLoadingTabs(false);
          return;
        }

        // Check if API data is newer than localStorage and update localStorage if needed
        if (wgid && response.Status === 'Success' && response.Data && response.Data.length > 0) {
          const localState = loadTabbedWidgetState(wgid);
          const apiTimestamp = Date.now(); // API doesn't provide timestamp, use current time as "API is fresh"
          
          // If localStorage exists and is recent (within last 5 seconds), keep it
          // Otherwise, update localStorage with API data
          const shouldUpdateFromApi = !localState || 
            (localState.lastModified && (apiTimestamp - localState.lastModified) > 5000);
          
          if (shouldUpdateFromApi && hasLoadedFromLocalStorageRef.current) {
            // localStorage will be updated automatically by the save effect when state changes
            // We don't need to manually save here since setTabs will trigger the save effect
          }
        }
        
        if (response.Status === 'Success' && response.Data && response.Data.length > 0) {
          if (!finalTabWidgetID) {
            // Don't show any tabs if we can't identify the widget - prevents showing tabs in wrong widget
            return;
          }
          
          // matchingTabs already contains filtered tabs from above
          
          // REMOVED: Fallback matching for generated IDs
          // This was causing new tabbed widgets to show tabs from other widgets
          // New widgets should always start empty
          
          if (matchingTabs.length === 0) {
            // Don't show any tabs if there's no match - this prevents showing wrong tabs in this widget
            // Only use settings tabs as fallback if they exist
            const hasSettingsTabs = settings?.tabs && Array.isArray(settings.tabs) && (settings.tabs as Tab[]).length > 0;
            if (!hasSettingsTabs) {
              // DON'T clear tabs if localStorage data exists - localStorage is the source of truth for unsaved templates
              // Only clear if this is a genuinely new widget with no local state
              const localState = wgid ? loadTabbedWidgetState(wgid) : null;
              if (!localState || !localState.tabs || localState.tabs.length === 0) {
                console.log('🔍 [TabbedWidget] No API match and no localStorage data - clearing tabs');
                setTabs([]);
              } else {
                console.log('🔍 [TabbedWidget] No API match but localStorage has tabs - keeping localStorage data');
              }
            }
            return;
          }
          
          // Sort tabs by TabOrder to ensure consistent order
          const sortedTabs = [...matchingTabs].sort((a, b) => (a.TabOrder || 0) - (b.TabOrder || 0));
          
          // Debug: Log IsPredefined values from API
          console.log('🔍 [TabbedWidget] Tab IsPredefined values from API:', sortedTabs.map(t => ({
            name: t.TabName,
            IsPredefined: t.IsPredefined
          })));
          
          // Create Tab objects from API response, excluding recently deleted tabs
          // This prevents deleted tabs from reappearing due to API caching or race conditions
          // Also deduplicate by CustomDashboardTabID to prevent duplicate tabs in UI
          const seenCustomDashboardTabIDs = new Set<number>();
          const apiTabs: Tab[] = sortedTabs
            .filter((tabData) => {
              const tabId = `tab-${tabData.CustomDashboardTabID}`;
              const isRecentlyDeleted = recentlyDeletedTabIdsRef.current.has(tabId);
              if (isRecentlyDeleted) {
              }
              
              // Deduplicate by CustomDashboardTabID
              if (seenCustomDashboardTabIDs.has(tabData.CustomDashboardTabID)) {
                console.warn('⚠️ [TabbedWidget] Skipping duplicate CustomDashboardTabID:', tabData.CustomDashboardTabID, tabData.TabName);
                return false;
              }
              seenCustomDashboardTabIDs.add(tabData.CustomDashboardTabID);
              
              return !isRecentlyDeleted;
            })
            .map((tabData, index) => {
              // TabGrid is a number, convert to string for getLayoutFromGridId if needed
              const tabGridValue = tabData.TabGrid || 1;
              const layout = getLayoutFromGridId(tabGridValue);
              return {
                id: `tab-${tabData.CustomDashboardTabID}`,
                name: tabData.TabName || 'Tab',
                layout: layout,
                color: tabData.TabColor || undefined,
                icon: tabData.TabIcon || 'Star',
                order: tabData.TabOrder !== undefined ? tabData.TabOrder : index,
                isPredefined: tabData.IsPredefined === 1 // true if tab is from a details template
              };
            });
          
          // Create mapping of tab IDs to CustomDashboardTabID
          const newTabDataMap: Record<string, number> = {};
          apiTabs.forEach((tab) => {
            const tabData = sortedTabs.find(t => `tab-${t.CustomDashboardTabID}` === tab.id);
            if (tabData) {
              newTabDataMap[tab.id] = tabData.CustomDashboardTabID;
            }
          });
          
          // console.log('📝 Created tabs from API:', {
          //   tabCount: apiTabs.length,
          //   tabs: apiTabs.map(t => ({ id: t.id, name: t.name, layout: t.layout })),
          //   mapping: newTabDataMap
          // });
          
          // Always use API tabs as source of truth if they exist
          // Settings tabs are only used as fallback if API doesn't return any tabs
          const hasSettingsTabs = settings?.tabs && Array.isArray(settings.tabs) && (settings.tabs as Tab[]).length > 0;
          
          // Tabs matched successfully
          
          if (apiTabs.length > 0) {
            // Merge API tabs with current local tabs to preserve newly added tabs that might not be in API yet
            // This prevents losing tabs that were just created but haven't appeared in the API response yet
            setTabs(currentTabs => {
              // Create a map of API tabs by ID for quick lookup
              const apiTabsMap = new Map(apiTabs.map(tab => [tab.id, tab]));
              
              // Create a map of API tabs by CustomDashboardTabID for matching
              // This helps match tabs even when IDs differ (e.g., temporary ID vs API ID)
              const apiTabsByCustomId = new Map<number, Tab>();
              apiTabs.forEach(tab => {
                const tabData = sortedTabs.find(t => `tab-${t.CustomDashboardTabID}` === tab.id);
                if (tabData) {
                  apiTabsByCustomId.set(tabData.CustomDashboardTabID, tab);
                }
              });
              
              // Start with API tabs as the base (source of truth)
              const mergedTabs = [...apiTabs];
              
              // Track preserved tabs to also preserve their tabDataMap entries
              const preservedTabs: Tab[] = [];
              
              // Add any local tabs that aren't in the API response yet
              // These are likely newly created tabs that haven't synced to the API yet (due to caching or timing)
              // Use tabDataMapRef to get current mapping to check CustomDashboardTabID mappings
              const currentTabDataMap = tabDataMapRef.current;
              currentTabs.forEach(localTab => {
                const localCustomId = currentTabDataMap[localTab.id];
                
                // Check if this local tab is already represented in API tabs by ID
                const existsById = apiTabsMap.has(localTab.id);
                
                // Check if this local tab is already represented in API tabs by CustomDashboardTabID
                // This prevents duplicates when a tab has a temporary ID but the API has it with a different ID
                const existsByCustomId = localCustomId !== undefined && apiTabsByCustomId.has(localCustomId);
                
                if (!existsById && !existsByCustomId) {
                  // Preserve tabs that have valid IDs (format: tab-{number} or tab-{timestamp})
                  // This includes both newly created tabs and tabs that were just saved but not yet in API response
                  const hasValidId = localTab.id.startsWith('tab-');
                  
                  if (hasValidId) {
                    mergedTabs.push(localTab);
                    preservedTabs.push(localTab);
                  }
                } else if (existsByCustomId && !existsById) {
                  // Local tab has a different ID but same CustomDashboardTabID as an API tab
                  // This means the tab was created and the API has it, but IDs don't match
                  // Don't add the local tab - use the API version instead
                }
              });
              
              // Update tab IDs for local tabs that match API tabs by CustomDashboardTabID
              // This ensures consistency when a tab has a temporary ID but the API has it with the correct ID
              // Also preserve local changes (like renamed tabs) that might not be in API yet
              const updatedMergedTabs = mergedTabs.map(tab => {
                // First, check if there's a local tab with the same ID (normal case)
                const localTabWithSameId = currentTabs.find(lt => lt.id === tab.id);
                
                // If local tab exists with same ID, prefer local properties (name, color, etc.)
                // This preserves recent changes like renames that might not be in API cache yet
                // BUT always keep isPredefined from API tab (source of truth for details template)
                // EXCEPTION: For color, prefer API value if different from local, as API is source of truth
                // (color updates go to API first, then update local state)
                if (localTabWithSameId) {
                  return {
                    ...tab,
                    name: localTabWithSameId.name, // Prefer local name (user's recent change)
                    color: tab.color, // Always prefer API color (source of truth after updates)
                    icon: localTabWithSameId.icon,
                    symbol: localTabWithSameId.symbol,
                    isFavorite: localTabWithSameId.isFavorite,
                    order: localTabWithSameId.order !== undefined ? localTabWithSameId.order : tab.order, // Preserve local order
                    isPredefined: tab.isPredefined // Always keep isPredefined from API
                  };
                }
                
                // Check if this tab's CustomDashboardTabID matches a local tab with a different ID
                const tabData = sortedTabs.find(t => `tab-${t.CustomDashboardTabID}` === tab.id);
                if (tabData) {
                  const localTabWithSameCustomId = currentTabs.find(lt => {
                    const localCustomId = currentTabDataMap[lt.id];
                    return localCustomId === tabData.CustomDashboardTabID && lt.id !== tab.id;
                  });
                  
                  if (localTabWithSameCustomId) {
                    // Update the tab with the latest properties from local tab (in case color/name changed)
                    // but keep the API ID, isPredefined, and color from API
                    return {
                      ...tab,
                      name: localTabWithSameCustomId.name,
                      color: tab.color, // Always prefer API color (source of truth after updates)
                      icon: localTabWithSameCustomId.icon,
                      symbol: localTabWithSameCustomId.symbol,
                      isFavorite: localTabWithSameCustomId.isFavorite,
                      order: localTabWithSameCustomId.order !== undefined ? localTabWithSameCustomId.order : tab.order, // Preserve local order
                      isPredefined: tab.isPredefined // Always keep isPredefined from API
                    };
                  }
                }
                return tab;
              });
              
              // Set first tab as active if no active tab is set or if current active tab doesn't exist in merged tabs
              // Also update activeTabId if it matches a local tab that was replaced by an API tab
              // Use activeTabIdRef.current to avoid dependency on activeTabId state (prevents widget refresh on tab click)
              const currentActiveTabId = activeTabIdRef.current;
              let finalActiveTabId = currentActiveTabId;
              if (currentActiveTabId) {
                const activeTabInMerged = updatedMergedTabs.find(t => t.id === currentActiveTabId);
                if (!activeTabInMerged) {
                  // Active tab might have been replaced - find the API version
                  const activeTabCustomId = currentTabDataMap[currentActiveTabId];
                  if (activeTabCustomId !== undefined) {
                    const apiTabWithSameCustomId = updatedMergedTabs.find(t => {
                      const tabData = sortedTabs.find(st => `tab-${st.CustomDashboardTabID}` === t.id);
                      return tabData?.CustomDashboardTabID === activeTabCustomId;
                    });
                    if (apiTabWithSameCustomId) {
                      finalActiveTabId = apiTabWithSameCustomId.id;
                    }
                  }
                }
              }
              
              if (!finalActiveTabId && updatedMergedTabs.length > 0) {
                finalActiveTabId = updatedMergedTabs[0].id;
              }
              
              if (finalActiveTabId && finalActiveTabId !== currentActiveTabId) {
                setActiveTabId(finalActiveTabId);
              }
              
              // Preserve tabDataMap entries for preserved tabs
              // Also update tabDataMap to use API tab IDs instead of temporary IDs
              setTabDataMap(prevMap => {
                const mergedMap = { ...newTabDataMap };
                
                // Update entries for tabs that were matched by CustomDashboardTabID
                // This ensures tabDataMap uses API tab IDs, not temporary IDs
                currentTabs.forEach(localTab => {
                  const localCustomId = prevMap[localTab.id];
                  if (localCustomId !== undefined) {
                    // Find the API tab with this CustomDashboardTabID
                    const apiTab = updatedMergedTabs.find(t => {
                      const tabData = sortedTabs.find(st => `tab-${st.CustomDashboardTabID}` === t.id);
                      return tabData?.CustomDashboardTabID === localCustomId;
                    });
                    
                    if (apiTab) {
                      if (apiTab.id !== localTab.id) {
                        // Update the mapping to use the API tab ID (remove old, add new)
                        if (mergedMap[localTab.id]) {
                          delete mergedMap[localTab.id];
                        }
                        mergedMap[apiTab.id] = localCustomId;
                      } else {
                        // Keep the existing mapping
                        mergedMap[apiTab.id] = localCustomId;
                      }
                    } else {
                      // API tab not found, but we have a CustomDashboardTabID - preserve it
                      // This might be a newly created tab that hasn't appeared in API yet
                      mergedMap[localTab.id] = localCustomId;
                    }
                  }
                });
                
                // Preserve existing tabDataMap entries for tabs that are being preserved
                preservedTabs.forEach(tab => {
                  if (prevMap[tab.id] !== undefined) {
                    mergedMap[tab.id] = prevMap[tab.id];
                  }
                });
                
                return mergedMap;
              });
              
              return updatedMergedTabs;
            });
          } else if (hasSettingsTabs) {
            // Only use settings tabs if API didn't return any tabs
            // Update mapping for any matching tabs from settings
            setTabDataMap(newTabDataMap);
          }
        } else {
        }
      } catch (error) {
        // Error fetching all tab widgets
        if (isForbiddenResponse(error)) {
          setIsPremiumLocked(true);
        }
      } finally {
        setIsLoadingTabs(false);
      }
  // Note: activeTabId removed from dependencies - using activeTabIdRef.current instead
  // This prevents fetchAllTabWidgets from being recreated on every tab click,
  // which was causing the useEffect below to re-run and refresh widgets unnecessarily
  }, [wgid, getTabWidgetID, getLayoutFromGridId, settings?.tabs, isLikelyGeneratedTabWidgetId, activeTemplateId, setTabs, setTabDataMap, setActiveTabId, setIsPremiumLocked]);
  
  // Call fetchAllTabWidgets on mount and when template changes
  // Use activeTemplateId directly in dependency array to trigger fetch on template switch
  useEffect(() => {
    // Skip API fetch if wgid just changed - let localStorage loading happen first
    // The localStorage loading effect will increment fetchTrigger when ready
    if (wgidJustChangedRef.current) {
      console.log('⏭️ [TabbedWidget] Skipping API fetch - wgid just changed, will fetch after localStorage load');
      return;
    }
    
    // Skip if localStorage hasn't been loaded yet (this effect runs before localStorage load completes)
    if (!hasLoadedFromLocalStorageRef.current) {
      console.log('⏭️ [TabbedWidget] Skipping API fetch - localStorage not loaded yet');
      return;
    }
    
    // Check if we've already loaded tabs for this template+widget combination
    const tabWidgetID = getTabWidgetID();
    const cacheKey = `${activeTemplateId}-${tabWidgetID}`;
    if (loadedTabWidgetsRef.current.has(cacheKey)) {
      console.log('✅ [TabbedWidget] Tabs already loaded for this template+widget, skipping API call:', cacheKey);
      return;
    }
    
    // Small delay to ensure any state updates from template change are processed
    const timer = setTimeout(() => {
      // Don't force refresh on template change - let the cache work
      // fetchAllTabWidgets will check localStorage first, only call API if needed
      console.log('🔄 [TabbedWidget] Fetching tabs - triggered by:', { activeTemplateId, fetchTrigger, cacheKey });
      fetchAllTabWidgets(false).then(() => {
        // Mark this template+widget as loaded
        loadedTabWidgetsRef.current.add(cacheKey);
      });
    }, 100);
    
    return () => clearTimeout(timer);
     
  }, [activeTemplateId, fetchTrigger, fetchAllTabWidgets, getTabWidgetID]); // Run on mount, template changes, and after localStorage load

  // DISABLED: Fetch tabs from API on component mount (fallback method using stored IDs)
  // NOTE: localStorage removed for debugging
  // The primary method is fetchAllTabWidgets above which uses getAllTabWidgetsWeb
  useEffect(() => {
    // DISABLED: localStorage scanning removed for debugging
  }, []);

  // Track if we've already triggered a refresh to prevent infinite loops
  const hasTriggeredRefreshRef = useRef(false);
  const lastRefreshWgidRef = useRef<string | undefined>(undefined);
  
  // Load widgets from template that belong to tabs in this tabbed widget
  useEffect(() => {
    const loadTabWidgets = async () => {
      if (tabs.length === 0) {
        return;
      }

      // Get the customDashboardWidgetID for this TabbedWidget
      const tabMenuWidgetId = settings?.customDashboardWidgetID as number | undefined;
      
      // CRITICAL FIX: Check if our widget ID exists in ANY template
      // Each component has its OWN templates state (useTemplates uses useState, not Context)
      // So when a new template is created, TabbedWidget's templates array is stale
      // We detect this by checking if our widget ID is missing from all templates
      if (tabMenuWidgetId) {
        const widgetExistsInTemplates = templates.some(t => 
          t.widgets?.some(w => w.settings?.customDashboardWidgetID === tabMenuWidgetId)
        );
        
        if (!widgetExistsInTemplates) {
          // Trigger our own refreshTemplates to sync state
          // Only refresh once per wgid change to prevent infinite loops
          if (!hasTriggeredRefreshRef.current || lastRefreshWgidRef.current !== wgid) {
            hasTriggeredRefreshRef.current = true;
            lastRefreshWgidRef.current = wgid;
            try {
              await refreshTemplates(undefined, true);
            } catch (error) {
              console.log('❌ [TabbedWidget] Error refreshing templates:', error);
              // Failed to refresh templates
            }
          }
          return;
        }
        
        // Reset refresh flag when widget is found
        hasTriggeredRefreshRef.current = false;
      }
      
      // Find template by customDashboardWidgetID (widget ID is always correct and unique)
      // During template creation/switching, the templates array and activeTemplateId might not be in sync
      // We prioritize finding the template by widget ID since that's the most reliable identifier
      let targetTemplate: typeof templates[0] | undefined;
      
      // Step 1: Try to find by widget's customDashboardWidgetID (most reliable)
      if (tabMenuWidgetId) {
        targetTemplate = templates.find(t => 
          t.widgets?.some(w => w.settings?.customDashboardWidgetID === tabMenuWidgetId)
        );
        
        if (!targetTemplate) {
          return;
        }
      }
      
      // Step 2: Fallback to activeTemplateId if no widget ID available
      if (!targetTemplate && activeTemplateId) {
        targetTemplate = templates.find(t => t.id === activeTemplateId);
      }
      
      if (!targetTemplate || !targetTemplate.widgets) {
        return;
      }

      // Get all CustomDashboardTabID values from current tabs
      // Use tabDataMap state directly instead of ref to ensure we have the latest value
      const tabCustomIds = new Set(Object.values(tabDataMap));
      if (tabCustomIds.size === 0) {
        return;
      }

      // Find widgets that have customTabsID matching any of our tabs
      // NOTE: customTabsID is inside settings, set during template conversion
      const tabWidgets = targetTemplate.widgets.filter(widget => {
        const customTabsID = widget.settings?.customTabsID as number | undefined;
        return customTabsID && tabCustomIds.has(customTabsID);
      });

      if (tabWidgets.length === 0) {
        return;
      }

      // Convert widgets to widgetSlots format
      // Key format: ${tabId}-${slotIndex}
      const newWidgetSlots: Record<string, WidgetSlot> = {};

      // Group widgets by their customTabsID
      const widgetsByTab = new Map<number, typeof targetTemplate.widgets>();
      tabWidgets.forEach(widget => {
        const customTabsID = widget.settings?.customTabsID as number;
        if (!widgetsByTab.has(customTabsID)) {
          widgetsByTab.set(customTabsID, []);
        }
        widgetsByTab.get(customTabsID)!.push(widget);
      });

      // For each tab, add its widgets to widgetSlots
      widgetsByTab.forEach((widgets, customDashboardTabID) => {
        // Find the tab ID that matches this CustomDashboardTabID
        // Use tabDataMap state directly instead of ref
        const tabId = Object.keys(tabDataMap).find(
          key => tabDataMap[key] === customDashboardTabID
        );

        if (!tabId) {
          return;
        }

        // Get cell position from widget position (e.g., gt22_1 -> slot index 0)
        widgets.forEach(widget => {
          // Extract slot index from position
          // Position format: gt22_1, gt22_2, etc.
          const match = widget.position.match(/_(\d+)$/);
          if (match) {
            const slotIndex = parseInt(match[1], 10) - 1; // Convert 1-based to 0-based
            const slotKey = `${tabId}-${slotIndex}`;
            
            // Debug: Log widget settings before parsing
            console.log('🔍 [TabbedWidget] Loading widget from template:', {
              widgetName: widget.name,
              position: widget.position,
              slotKey,
              rawSettings: widget.settings,
              customDashboardWidgetID: widget.settings?.customDashboardWidgetID
            });
            
            // Parse the widget settings to extract actual settings from additionalSettings
            // This is similar to how BloombergDashboard's getWidgetSettings works
            const parsedSettings = parseWidgetSettingsFromTemplate(
              widget.name,
              (widget.settings || {}) as Record<string, unknown>
            );
            
            console.log('🔍 [TabbedWidget] Parsed settings:', {
              slotKey,
              parsedSettings,
              hasCustomDashboardWidgetID: !!parsedSettings.customDashboardWidgetID,
              symbol: parsedSettings.symbol,
              owner: parsedSettings.owner
            });
            
            newWidgetSlots[slotKey] = {
              widgetId: widget.name,
              settings: parsedSettings
            };
          }
        });
      });

      // Update widgetSlots state if we found any tab widgets
      // Merge with existing slots to preserve optimistic updates
      setWidgetSlots((prevSlots) => {
        // If no widgets from template, keep existing slots
        if (Object.keys(newWidgetSlots).length === 0) {
          return prevSlots;
        }
        
        console.log('🔄 [TabbedWidget] Starting merge - prevSlots:', JSON.stringify(prevSlots, null, 2));
        console.log('🔄 [TabbedWidget] Starting merge - newWidgetSlots (from template):', JSON.stringify(newWidgetSlots, null, 2));
        
        // Merge template widgets with existing local slots
        // TEMPLATE SETTINGS SHOULD TAKE PRECEDENCE for widget-specific settings
        // because template has the saved database values
        // CRITICAL: Start with empty object, not prevSlots, to avoid restoring deleted widgets
        const mergedSlots: Record<string, WidgetSlot> = {};
        const deletedSlots = Array.from(recentlyDeletedSlotsRef.current);
        
        // First, add all LOCAL slots (user's current state) EXCEPT recently deleted ones
        Object.entries(prevSlots).forEach(([key, slot]) => {
          if (!recentlyDeletedSlotsRef.current.has(key)) {
            mergedSlots[key] = slot;
          }
        });
        
        // Then, merge template widgets - template settings should fill in missing data
        Object.entries(newWidgetSlots).forEach(([key, slot]) => {
          // Skip slots that were recently deleted - this prevents deleted widgets from reappearing
          if (recentlyDeletedSlotsRef.current.has(key)) {
            console.log('🚫 [TabbedWidget] Template sync: Blocked deleted slot from being restored:', key);
            return;
          }
          
          // If slot exists locally, merge template settings into it
          if (mergedSlots[key]) {
            const localSettings = mergedSlots[key].settings || {};
            const templateSettings = slot.settings || {};
            
            // CRITICAL: Template settings come from the database and should be the source of truth
            // Template settings contain:
            // - customDashboardWidgetID, customTabsID (widget identity)
            // - Parsed additionalSettings (symbol, owner, timeframe, etc.) - AUTHORITATIVE FROM DB
            // - coordinates, zIndex (positioning)
            // 
            // We should ALWAYS merge template settings to ensure DB values are respected
            // especially on page refresh where we want saved settings to load correctly
            
            console.log('🔄 [TabbedWidget] Merging template settings into local slot:', key, {
              localSettings,
              templateSettings,
              hasTemplateSettings: Object.keys(templateSettings).length > 0
            });
            
            // Always merge template settings - template is source of truth from database
            // Template settings should override local for widget-specific values (symbol, owner, etc.)
            mergedSlots[key] = {
              ...mergedSlots[key],
              settings: {
                ...localSettings,       // Start with local settings
                ...templateSettings,    // Template settings override (authoritative from DB)
              }
            };
          } else {
            // Slot doesn't exist locally - use template slot entirely
            mergedSlots[key] = slot;
          }
        });
        
        console.log('🔄 [TabbedWidget] Template sync merge:', {
          templateSlots: Object.keys(newWidgetSlots).length,
          prevSlots: Object.keys(prevSlots).length,
          mergedSlots: Object.keys(mergedSlots).length,
          deletedSlots
        });
        
        // Check if anything actually changed
        const prevKeys = Object.keys(prevSlots).sort();
        const mergedKeys = Object.keys(mergedSlots).sort();
        
        if (JSON.stringify(prevKeys) === JSON.stringify(mergedKeys)) {
          // Keys are the same, check if any settings changed
          let hasChanges = false;
          for (const key of mergedKeys) {
            if (prevSlots[key]?.widgetId !== mergedSlots[key]?.widgetId) {
              hasChanges = true;
              break;
            }
            // Deep compare settings to catch ALL changes (symbol, owner, customDashboardWidgetID, etc.)
            const prevSettings = JSON.stringify(prevSlots[key]?.settings || {});
            const mergedSettings = JSON.stringify(mergedSlots[key]?.settings || {});
            if (prevSettings !== mergedSettings) {
              console.log('🔄 [TabbedWidget] Settings changed for slot:', key, {
                prev: prevSlots[key]?.settings,
                merged: mergedSlots[key]?.settings
              });
              hasChanges = true;
              break;
            }
          }
          if (!hasChanges) {
            console.log('🔄 [TabbedWidget] No changes detected, keeping prevSlots');
            return prevSlots;
          }
        }
        
        console.log('🔄 [TabbedWidget] Returning mergedSlots:', JSON.stringify(mergedSlots, null, 2));
        return mergedSlots;
      });
    };

    loadTabWidgets();
     
  }, [
    activeTemplateId, 
    templates.length, // Use length instead of full array to avoid reference issues
    templates.map(t => t.widgets?.length).join(','), // Track widget count changes across all templates
    tabs.length, 
    JSON.stringify(tabDataMap), // Use JSON.stringify to detect actual changes in tabDataMap
    settings?.customDashboardWidgetID
  ]); // Re-run when template, tabs, tabDataMap, or widget ID changes

  // Fetch and apply grid positions when active tab changes
  // Note: We use activeTabId as the only dependency to avoid refetching when tabs array reference changes
  // We access tabs directly from state (not via dependency) to avoid re-running when tabs changes
  useEffect(() => {
    const fetchAndApplyGridPositions = async () => {
      // Only fetch if we have an active tab
      if (!activeTabId) {
        return;
      }

      const activeTab = tabs.find(t => t.id === activeTabId);
      if (!activeTab) {
        return;
      }

      // Skip fetching grid positions for predefined tabs (details template tabs)
      // Details templates don't allow resizing, so they use default grid sizes
      if (activeTab.isPredefined) {
        console.log('⏭️ [TabbedWidget] Skipping grid position fetch for predefined tab:', activeTab.name);
        return;
      }

      // Get the CustomDashboardTabID for this tab
      const currentTabDataMap = tabDataMapRef.current;
      const customDashboardTabID = currentTabDataMap[activeTabId];
      if (!customDashboardTabID) {
        return;
      }

      // Check if we've already fetched grid positions for this tab (prevent infinite loop)
      // Use CustomDashboardTabID as the key since local tab IDs can change between template switches
      const customDashboardTabIDKey = `tabid-${customDashboardTabID}`;
      if (fetchedGridPositionsRef.current.has(customDashboardTabIDKey)) {
        console.log('✅ [TabbedWidget] Already fetched grid positions for this tab:', customDashboardTabIDKey);
        return;
      }

      // Check if we already have grid sizes for this tab (avoid refetching)
      // Use ref to get current value since gridSizes is not in dependencies
      const currentGridSizes = gridSizesRef.current;
      if (currentGridSizes[activeTabId] && currentGridSizes[activeTabId].length > 0) {
        console.log('✅ [TabbedWidget] Already have grid sizes for this tab:', activeTabId);
        // Mark as fetched even if we already have sizes
        // Use CustomDashboardTabID as the key since local tab IDs can change between template switches
        const customDashboardTabIDKey = `tabid-${customDashboardTabID}`;
        fetchedGridPositionsRef.current.add(customDashboardTabIDKey);
        return;
      }

      console.log('📡 [TabbedWidget] Fetching grid positions for tab:', {
        tabId: activeTabId,
        tabName: activeTab.name,
        customDashboardTabID,
        isPredefined: activeTab.isPredefined,
        layout: activeTab.layout
      });

      try {
        const response = await getTabGridPositionsByTabId(customDashboardTabID);
        
        if (response.success && response.Data && response.Data.length > 0) {

          // Sort cells by CellID to ensure correct order (gt32_1, gt32_2, etc.)
          const sortedCells = [...response.Data].sort((a, b) => {
            const aNum = parseInt(a.CellID.match(/\d+$/)?.[0] || '0', 10);
            const bNum = parseInt(b.CellID.match(/\d+$/)?.[0] || '0', 10);
            return aNum - bNum;
          });

          // Determine if layout is horizontal or vertical based on layout type
          const isHorizontalLayout = activeTab.layout.includes('horizontal') || 
                                     activeTab.layout.includes('rows') ||
                                     activeTab.layout === '2-grid-horizontal' ||
                                     activeTab.layout === 'two-horizontal' ||
                                     activeTab.layout === '3-grid-rows' ||
                                     activeTab.layout === 'three-horizontal' ||
                                     activeTab.layout === '4-grid-rows' ||
                                     activeTab.layout === 'four-horizontal' ||
                                     activeTab.layout === '5-grid-rows' ||
                                     activeTab.layout === 'five-horizontal' ||
                                     activeTab.layout === '6-grid-rows' ||
                                     activeTab.layout === '7-grid-large' ||
                                     activeTab.layout === '8-grid-rows' ||
                                     activeTab.layout === '24-grid-rows' ||
                                     activeTab.layout === '24-grid-4x6' ||
                                     activeTab.layout === '28-grid-4x7' ||
                                     activeTab.layout === '32-grid-4x8';
          
          const isVerticalLayout = activeTab.layout.includes('vertical') || 
                                  activeTab.layout.includes('columns') ||
                                  activeTab.layout === '2-grid-vertical' ||
                                  activeTab.layout === 'two-vertical' ||
                                  activeTab.layout === '3-grid-columns' ||
                                  activeTab.layout === 'three-vertical' ||
                                  activeTab.layout === '4-grid-columns' ||
                                  activeTab.layout === 'four-vertical' ||
                                  activeTab.layout === '5-grid-columns' ||
                                  activeTab.layout === 'five-vertical' ||
                                  activeTab.layout === '6-grid-2x3' ||
                                  activeTab.layout === '6-grid-3x2' ||
                                  activeTab.layout === '6-grid-left-large' ||
                                  activeTab.layout === '7-grid-left' ||
                                  activeTab.layout === '7-grid-complex1' ||
                                  activeTab.layout === '7-grid-complex2' ||
                                  activeTab.layout === '8-grid-columns' ||
                                  activeTab.layout === '9-grid' ||
                                  activeTab.layout === '12-grid-3x4' ||
                                  activeTab.layout === '12-grid-4x3' ||
                                  activeTab.layout === '16-grid' ||
                                  activeTab.layout === '24-grid-columns' ||
                                  activeTab.layout === '24-grid-6x4' ||
                                  activeTab.layout === '28-grid-7x4' ||
                                  activeTab.layout === '32-grid-8x4';

          // Extract percentages from grid positions
          // For tabbed widgets, each cell typically has one percentage value in its Width/Height string
          // We need to extract one percentage per cell, in order
          const gridSizePercentages: number[] = [];

          if (isHorizontalLayout) {
            // For horizontal layouts, use Height percentages (one per row)
            sortedCells.forEach(cell => {
              const heightPercentages = parseHeightPercentages(cell.Height);
              // Take the first percentage (or the one that matches this cell's index)
              if (heightPercentages.length > 0) {
                // For horizontal layouts, each cell represents a row, so take the first percentage
                gridSizePercentages.push(heightPercentages[0]);
              }
            });
          } else if (isVerticalLayout) {
            // For vertical layouts, use Width percentages (one per column)
            sortedCells.forEach(cell => {
              const widthPercentages = parseWidthPercentages(cell.Width);
              // Take the first percentage (or the one that matches this cell's index)
              if (widthPercentages.length > 0) {
                // For vertical layouts, each cell represents a column, so take the first percentage
                gridSizePercentages.push(widthPercentages[0]);
              }
            });
          } else {
            // For complex layouts, try to determine from the first cell
            // Most layouts use width for column-based and height for row-based
            if (sortedCells.length > 0) {
              const firstCell = sortedCells[0];
              const widthPercentages = parseWidthPercentages(firstCell.Width);
              const heightPercentages = parseHeightPercentages(firstCell.Height);
              
              // Use whichever has more values (likely the correct dimension)
              // For complex layouts, we might need to aggregate all cells
              if (widthPercentages.length >= heightPercentages.length && widthPercentages.length > 0) {
                // Try to get one percentage per cell from Width
                sortedCells.forEach((cell, index) => {
                  const wps = parseWidthPercentages(cell.Width);
                  if (wps.length > 0) {
                    // Take the percentage that corresponds to this cell's position
                    const percentage = wps[index] || wps[0] || wps[wps.length - 1];
                    gridSizePercentages.push(percentage);
                  }
                });
              } else if (heightPercentages.length > 0) {
                // Try to get one percentage per cell from Height
                sortedCells.forEach((cell, index) => {
                  const hps = parseHeightPercentages(cell.Height);
                  if (hps.length > 0) {
                    // Take the percentage that corresponds to this cell's position
                    const percentage = hps[index] || hps[0] || hps[hps.length - 1];
                    gridSizePercentages.push(percentage);
                  }
                });
              }
            }
          }

          // If we got percentages, apply them to gridSizes
          if (gridSizePercentages.length > 0) {
            // Normalize percentages to sum to 100
            const total = gridSizePercentages.reduce((sum, p) => sum + p, 0);
            const normalized = total > 0 
              ? gridSizePercentages.map(p => (p / total) * 100)
              : gridSizePercentages;

            setGridSizes(prev => ({
              ...prev,
              [activeTabId]: normalized
            }));
          }
        }
      } catch {
        // Error fetching grid positions for tab
      } finally {
        // Mark this tab as fetched to prevent refetching
        // Use CustomDashboardTabID as the key since local tab IDs can change between template switches
        const customDashboardTabIDKey = `tabid-${customDashboardTabID}`;
        fetchedGridPositionsRef.current.add(customDashboardTabIDKey);
      }
    };

    // Only run when activeTabId changes, not when tabs array changes
    // This prevents infinite loops caused by tabs array being recreated with same content
    // Note: gridSizes and tabDataMap are intentionally NOT in dependencies to prevent infinite loops
    // fetchedGridPositionsRef tracks which tabs we've already fetched to prevent repeated API calls
    // tabDataMapRef.current is used to access current mapping without causing re-renders
    fetchAndApplyGridPositions();
     
  }, [activeTabId]);

  // Add global mouse event listeners for resize
  useEffect(() => {
    if (resizeState?.isResizing) {
      const handleMouseMoveWithPrevent = (e: MouseEvent) => {
        e.preventDefault();
        handleMouseMove(e);
      };

      const handleMouseUpWithPrevent = (e: MouseEvent) => {
        e.preventDefault();
        handleMouseUp();
      };

      document.addEventListener('mousemove', handleMouseMoveWithPrevent);
      document.addEventListener('mouseup', handleMouseUpWithPrevent);
      document.body.style.cursor = resizeState.direction === 'horizontal' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMoveWithPrevent);
        document.removeEventListener('mouseup', handleMouseUpWithPrevent);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [resizeState, handleMouseMove, handleMouseUp]);

  // Render a single widget slot - PLACEHOLDER
  const renderWidgetSlot = (tabId: string, slotIndex: number) => {
    const slotKey = `${tabId}-${slotIndex}`;
    const slot = widgetSlots[slotKey];
    const isDragOver = dragOverSlot === slotKey;
    const isHovered = hoveredSlot === slotKey;
    
    // Check if this is a details template (symbol-based template) - all widgets are locked
    // This takes precedence over individual tab/widget isPredefined flags
    const isPredefinedWidget = isDetailsTemplate;

    if (!slot || !slot.widgetId) {
      // Don't allow adding widgets to details template tabs
      if (isPredefinedWidget) {
        return (
          <div 
            className="relative w-full h-full bg-widget-body flex items-center justify-center border-2 border-border/20"
          >
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        );
      }
      return (
        <div 
          className={`relative w-full h-full bg-widget-body flex items-center justify-center group transition-all duration-200 border-2 ${
            isDragOver 
              ? 'border-dashed border-white bg-neutral-800' 
              : isHovered
                ? 'border-primary/80 shadow-[0_0_0_2px_rgba(var(--primary-rgb),0.15)]'
                : 'border-border/20'
          }`}
          onDragOver={(e) => handleSlotDragOver(e, slotKey)}
          onDragLeave={handleSlotDragLeave}
          onDrop={(e) => handleSlotDrop(e, slotKey)}
          onDragEnd={handleSlotDragEnd}
          onMouseEnter={() => setHoveredSlot(slotKey)}
          onMouseLeave={() => setHoveredSlot(null)}
        >
          <button
            onClick={() => handleAddWidgetToSlot(slotKey)}
            className={`px-4 py-2 bg-popover hover:bg-muted border border-border hover:border-primary/50 rounded-none flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all ${
              isDragOver ? 'opacity-50' : ''
            }`}
          >
            {isDragOver ? 'Drop Widget Here' : '+ Add Widget'}
          </button>
        </div>
      );
    }

    const widget = availableWidgets.find(w => w.id === slot.widgetId);
    const WidgetComponent = WidgetComponents[slot.widgetId];

    const accessStatus =
      typeof slot?.settings === 'object' && slot.settings !== null
        ? (slot.settings as { accessStatus?: unknown }).accessStatus
        : undefined;
    const normalizedAccessStatus =
      typeof accessStatus === 'string' ? accessStatus.trim().toLowerCase() : undefined;
    const isAccessRestricted =
      normalizedAccessStatus === 'no access' ||
      normalizedAccessStatus === 'access denied' ||
      normalizedAccessStatus === 'locked';

    if (!widget || !WidgetComponent) {
      return (
        <div className="w-full h-full bg-widget-body rounded-none flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">Widget not found</p>
            <button
              onClick={() => handleRemoveWidgetFromSlot(slotKey)}
              className="mt-2 text-xs text-destructive hover:underline"
            >
              Remove
            </button>
          </div>
        </div>
      );
    }

    if (isAccessRestricted) {
      return (
        <div 
          className={`relative w-full h-full bg-widget-body rounded-none overflow-hidden group transition-all duration-200 border-2 ${
            isHovered ? 'border-primary/80 shadow-[0_0_0_2px_rgba(var(--primary-rgb),0.15)]' : 'border-transparent'
          }`}
          onMouseEnter={() => setHoveredSlot(slotKey)}
          onMouseLeave={() => setHoveredSlot(null)}
        >
          <LockedWidgetOverlay
            onRemove={isPredefinedWidget ? undefined : () => handleRemoveWidgetFromSlot(slotKey)}
            widgetName={widget.name}
          />
        </div>
      );
    }

    return (
      <div 
        className={`relative w-full h-full bg-widget-body rounded-none overflow-hidden group transition-all duration-200 border-2 ${
          isHovered ? 'border-primary/80 shadow-[0_0_0_2px_rgba(var(--primary-rgb),0.15)]' : 'border-transparent'
        }`}
        onMouseEnter={() => setHoveredSlot(slotKey)}
        onMouseLeave={() => setHoveredSlot(null)}
      >
        <WidgetComponent
          wgid={`${wgid}-${slotKey}`}
          onRemove={isPredefinedWidget ? undefined : () => handleRemoveWidgetFromSlot(slotKey)}
          {...(shouldShowSettingsIcon(slot.widgetId!, isDetailsTemplate) ? {
            onSettings: () => handleChildWidgetSettings(slotKey, slot.widgetId!)
          } : {})}
          onSaveSettings={(settingsToSave: Record<string, any>) => handleChildWidgetInlineSave(slotKey, settingsToSave)}
          onFullscreen={() => setFullscreenChildSlotKey(slotKey)}
          isSymbolLocked={isDetailsTemplate}
          settings={slot.settings || {}}
        />
      </div>
    );
  };

  // Render tab content based on layout
  const renderTabContent = (tab: Tab) => {
    const gridSizes = getGridSizes(tab.id, tab.layout);
    // Create a key based on grid sizes to force re-render when sizes change
    const gridSizesKey = gridSizes.join(',');


    // Single
    if (tab.layout === 'single') {
      return <div className="w-full h-full">{renderWidgetSlot(tab.id, 0)}</div>;
    }

    // Two layouts
    if (tab.layout === 'two-vertical') {
      const sizes: [string, string] = [
        `${gridSizes[0]}%`,
        `${gridSizes[1]}%`
      ];
      return (
        <ResizablePair
          key={`${tab.id}-${tab.layout}-${gridSizesKey}`}
          direction="horizontal"
          minSize={60}
          initialSizes={sizes}
          templateId={undefined}
          layout={undefined}
          onSizeChange={(newSizes) => {
            setGridSizes(prev => ({
              ...prev,
              [tab.id]: [parseFloat(newSizes[0]), parseFloat(newSizes[1])]
            }));
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        >
          <div className="w-full h-full">{renderWidgetSlot(tab.id, 0)}</div>
          <div className="w-full h-full">{renderWidgetSlot(tab.id, 1)}</div>
        </ResizablePair>
      );
    }
    if (tab.layout === 'two-horizontal') {
      const sizes: [string, string] = [
        `${gridSizes[0]}%`,
        `${gridSizes[1]}%`
      ];
      return (
        <ResizablePair
          key={`${tab.id}-${tab.layout}-${gridSizesKey}`}
          direction="vertical"
          minSize={60}
          initialSizes={sizes}
          templateId={undefined}
          layout={undefined}
          onSizeChange={(newSizes) => {
            setGridSizes(prev => ({
              ...prev,
              [tab.id]: [parseFloat(newSizes[0]), parseFloat(newSizes[1])]
            }));
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        >
          <div className="w-full h-full">{renderWidgetSlot(tab.id, 0)}</div>
          <div className="w-full h-full">{renderWidgetSlot(tab.id, 1)}</div>
        </ResizablePair>
      );
    }

    // Three layouts
    if (tab.layout === 'three-vertical' || tab.layout === '3-grid-columns') {
      const sizes = [
        `${gridSizes[0]}%`,
        `${gridSizes[1]}%`,
        `${gridSizes[2]}%`
      ];
      return (
        <ResizableGroup
          key={`${tab.id}-${tab.layout}-${gridSizesKey}`}
          direction="horizontal"
          minSize={60}
          cells={[
            { content: renderWidgetSlot(tab.id, 0), position: "slot-0", initialSize: sizes[0] },
            { content: renderWidgetSlot(tab.id, 1), position: "slot-1", initialSize: sizes[1] },
            { content: renderWidgetSlot(tab.id, 2), position: "slot-2", initialSize: sizes[2] }
          ]}
          templateId={undefined}
          layout={undefined}
          onSizeChange={(newSizes) => {
            setGridSizes(prev => ({
              ...prev,
              [tab.id]: newSizes.map(s => parseFloat(s))
            }));
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        />
      );
    }
    if (tab.layout === 'three-horizontal' || tab.layout === '3-grid-rows') {
      const sizes = [
        `${gridSizes[0]}%`,
        `${gridSizes[1]}%`,
        `${gridSizes[2]}%`
      ];
      return (
        <ResizableGroup
          key={`${tab.id}-${tab.layout}-${gridSizesKey}`}
          direction="vertical"
          minSize={60}
          cells={[
            { content: renderWidgetSlot(tab.id, 0), position: "slot-0", initialSize: sizes[0] },
            { content: renderWidgetSlot(tab.id, 1), position: "slot-1", initialSize: sizes[1] },
            { content: renderWidgetSlot(tab.id, 2), position: "slot-2", initialSize: sizes[2] }
          ]}
          templateId={undefined}
          layout={undefined}
          onSizeChange={(newSizes) => {
            setGridSizes(prev => ({
              ...prev,
              [tab.id]: newSizes.map(s => parseFloat(s))
            }));
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        />
      );
    }
    if (tab.layout === 'three-left-right') {
      const topPercent = gridSizes[0];
      const bottomLeftPercent = (gridSizes[1] / (gridSizes[1] + gridSizes[2])) * 100;
      const bottomRightPercent = 100 - bottomLeftPercent;
      return (
        <ResizablePair
          key={`${tab.id}-${tab.layout}-outer-${gridSizesKey}`}
          direction="vertical"
          minSize={60}
          initialSizes={[`${topPercent}%`, `${100 - topPercent}%`]}
          templateId={undefined}
          layout={undefined}
          onSizeChange={(newSizes) => {
            const newTop = parseFloat(newSizes[0]);
            const newBottom = parseFloat(newSizes[1]);
            const bottomLeft = (bottomLeftPercent / 100) * newBottom;
            const bottomRight = newBottom - bottomLeft;
            setGridSizes(prev => ({
              ...prev,
              [tab.id]: [newTop, bottomLeft, bottomRight]
            }));
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        >
          <div className="w-full h-full">{renderWidgetSlot(tab.id, 0)}</div>
          <ResizablePair
            direction="horizontal"
            minSize={60}
            initialSizes={[`${bottomLeftPercent}%`, `${bottomRightPercent}%`]}
            templateId={undefined}
            layout={undefined}
            onSizeChange={(newSizes) => {
              const top = gridSizesRef.current[tab.id]?.[0] || topPercent;
              const bottomLeft = parseFloat(newSizes[0]);
              const bottomRight = parseFloat(newSizes[1]);
              setGridSizes(prev => ({
                ...prev,
                [tab.id]: [top, bottomLeft, bottomRight]
              }));
            }}
            onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
          >
            <div className="w-full h-full">{renderWidgetSlot(tab.id, 1)}</div>
            <div className="w-full h-full">{renderWidgetSlot(tab.id, 2)}</div>
          </ResizablePair>
        </ResizablePair>
      );
    }
    if (tab.layout === 'three-top-bottom') {
      const topLeftPercent = (gridSizes[0] / (gridSizes[0] + gridSizes[1])) * 100;
      const topRightPercent = 100 - topLeftPercent;
      const bottomPercent = gridSizes[2];
      return (
        <ResizablePair
          direction="vertical"
          minSize={60}
          initialSizes={[`${100 - bottomPercent}%`, `${bottomPercent}%`]}
          templateId={undefined}
          layout={undefined}
          onSizeChange={(newSizes) => {
            const newTop = parseFloat(newSizes[0]);
            const newBottom = parseFloat(newSizes[1]);
            const topLeft = (topLeftPercent / 100) * newTop;
            const topRight = newTop - topLeft;
            setGridSizes(prev => ({
              ...prev,
              [tab.id]: [topLeft, topRight, newBottom]
            }));
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        >
          <ResizablePair
            direction="horizontal"
            minSize={60}
            initialSizes={[`${topLeftPercent}%`, `${topRightPercent}%`]}
            templateId={undefined}
            layout={undefined}
            onSizeChange={(newSizes) => {
              const bottom = gridSizesRef.current[tab.id]?.[2] || bottomPercent;
              const topLeft = parseFloat(newSizes[0]);
              const topRight = parseFloat(newSizes[1]);
              setGridSizes(prev => ({
                ...prev,
                [tab.id]: [topLeft, topRight, bottom]
              }));
            }}
            onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
          >
            <div className="w-full h-full">{renderWidgetSlot(tab.id, 0)}</div>
            <div className="w-full h-full">{renderWidgetSlot(tab.id, 1)}</div>
          </ResizablePair>
          <div className="w-full h-full">{renderWidgetSlot(tab.id, 2)}</div>
        </ResizablePair>
      );
    }
    if (tab.layout === 'three-left-stack') {
      const leftTopPercent = (gridSizes[0] / (gridSizes[0] + gridSizes[1])) * 100;
      const leftBottomPercent = 100 - leftTopPercent;
      const rightPercent = gridSizes[2];
      return (
        <ResizablePair
          direction="horizontal"
          minSize={60}
          initialSizes={[`${100 - rightPercent}%`, `${rightPercent}%`]}
          templateId={undefined}
          layout={undefined}
          onSizeChange={(newSizes) => {
            const newLeft = parseFloat(newSizes[0]);
            const newRight = parseFloat(newSizes[1]);
            const leftTop = (leftTopPercent / 100) * newLeft;
            const leftBottom = newLeft - leftTop;
            setGridSizes(prev => ({
              ...prev,
              [tab.id]: [leftTop, leftBottom, newRight]
            }));
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        >
          <ResizablePair
            direction="vertical"
            minSize={60}
            initialSizes={[`${leftTopPercent}%`, `${leftBottomPercent}%`]}
            templateId={undefined}
            layout={undefined}
            onSizeChange={(newSizes) => {
              const right = gridSizesRef.current[tab.id]?.[2] || rightPercent;
              const leftTop = parseFloat(newSizes[0]);
              const leftBottom = parseFloat(newSizes[1]);
              setGridSizes(prev => ({
                ...prev,
                [tab.id]: [leftTop, leftBottom, right]
              }));
            }}
            onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
          >
            <div className="w-full h-full">{renderWidgetSlot(tab.id, 0)}</div>
            <div className="w-full h-full">{renderWidgetSlot(tab.id, 1)}</div>
          </ResizablePair>
          <div className="w-full h-full">{renderWidgetSlot(tab.id, 2)}</div>
        </ResizablePair>
      );
    }
    if (tab.layout === 'three-right-stack') {
      const leftPercent = gridSizes[0];
      const rightTopPercent = (gridSizes[1] / (gridSizes[1] + gridSizes[2])) * 100;
      const rightBottomPercent = 100 - rightTopPercent;
      return (
        <ResizablePair
          key={`${tab.id}-${tab.layout}-outer-${gridSizesKey}`}
          direction="horizontal"
          minSize={60}
          initialSizes={[`${leftPercent}%`, `${100 - leftPercent}%`]}
          templateId={undefined}
          layout={undefined}
          onSizeChange={(newSizes) => {
            const newLeft = parseFloat(newSizes[0]);
            const newRight = parseFloat(newSizes[1]);
            const rightTop = (rightTopPercent / 100) * newRight;
            const rightBottom = newRight - rightTop;
            setGridSizes(prev => ({
              ...prev,
              [tab.id]: [newLeft, rightTop, rightBottom]
            }));
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        >
          <div className="w-full h-full">{renderWidgetSlot(tab.id, 0)}</div>
          <ResizablePair
            direction="vertical"
            minSize={60}
            initialSizes={[`${rightTopPercent}%`, `${rightBottomPercent}%`]}
            templateId={undefined}
            layout={undefined}
            onSizeChange={(newSizes) => {
              const left = gridSizesRef.current[tab.id]?.[0] || leftPercent;
              const rightTop = parseFloat(newSizes[0]);
              const rightBottom = parseFloat(newSizes[1]);
              setGridSizes(prev => ({
                ...prev,
                [tab.id]: [left, rightTop, rightBottom]
              }));
            }}
            onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
          >
            <div className="w-full h-full">{renderWidgetSlot(tab.id, 1)}</div>
            <div className="w-full h-full">{renderWidgetSlot(tab.id, 2)}</div>
          </ResizablePair>
        </ResizablePair>
      );
    }
    if (tab.layout === '3-grid-left-large') {
      const leftPercent = gridSizes[0];
      const rightTopPercent = 50;
      const rightBottomPercent = 50;
      return (
        <ResizablePair
          key={`${tab.id}-${tab.layout}-outer-${gridSizesKey}`}
          direction="horizontal"
          minSize={60}
          initialSizes={[`${leftPercent}%`, `${100 - leftPercent}%`]}
          templateId={undefined}
          layout={undefined}
          onSizeChange={(newSizes) => {
            const newLeft = parseFloat(newSizes[0]);
            const newRight = parseFloat(newSizes[1]);
            setGridSizes(prev => ({
              ...prev,
              [tab.id]: [newLeft, (rightTopPercent / 100) * newRight, (rightBottomPercent / 100) * newRight]
            }));
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        >
          <div className="w-full h-full">{renderWidgetSlot(tab.id, 0)}</div>
          <ResizablePair
            direction="vertical"
            minSize={60}
            initialSizes={[`${rightTopPercent}%`, `${rightBottomPercent}%`]}
            templateId={undefined}
            layout={undefined}
            onSizeChange={(newSizes) => {
              const left = gridSizesRef.current[tab.id]?.[0] || leftPercent;
              const rightTop = parseFloat(newSizes[0]);
              const rightBottom = parseFloat(newSizes[1]);
              setGridSizes(prev => ({
                ...prev,
                [tab.id]: [left, rightTop, rightBottom]
              }));
            }}
            onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
          >
            <div className="w-full h-full">{renderWidgetSlot(tab.id, 1)}</div>
            <div className="w-full h-full">{renderWidgetSlot(tab.id, 2)}</div>
          </ResizablePair>
        </ResizablePair>
      );
    }
    if (tab.layout === '3-grid-right-large') {
      const leftTopPercent = 50;
      const leftBottomPercent = 50;
      const rightPercent = gridSizes[2];
      return (
        <ResizablePair
          direction="horizontal"
          minSize={60}
          initialSizes={[`${100 - rightPercent}%`, `${rightPercent}%`]}
          templateId={undefined}
          layout={undefined}
          onSizeChange={(newSizes) => {
            const newLeft = parseFloat(newSizes[0]);
            const newRight = parseFloat(newSizes[1]);
            setGridSizes(prev => ({
              ...prev,
              [tab.id]: [(leftTopPercent / 100) * newLeft, (leftBottomPercent / 100) * newLeft, newRight]
            }));
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        >
          <ResizablePair
            direction="vertical"
            minSize={60}
            initialSizes={[`${leftTopPercent}%`, `${leftBottomPercent}%`]}
            templateId={undefined}
            layout={undefined}
            onSizeChange={(newSizes) => {
              const right = gridSizesRef.current[tab.id]?.[2] || rightPercent;
              const leftTop = parseFloat(newSizes[0]);
              const leftBottom = parseFloat(newSizes[1]);
              setGridSizes(prev => ({
                ...prev,
                [tab.id]: [leftTop, leftBottom, right]
              }));
            }}
            onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
          >
            <div className="w-full h-full">{renderWidgetSlot(tab.id, 0)}</div>
            <div className="w-full h-full">{renderWidgetSlot(tab.id, 1)}</div>
          </ResizablePair>
          <div className="w-full h-full">{renderWidgetSlot(tab.id, 2)}</div>
        </ResizablePair>
      );
    }
    if (tab.layout === '3-grid-top-large') {
      const topPercent = gridSizes[0];
      const bottomLeftPercent = 50;
      const bottomRightPercent = 50;
      return (
        <ResizablePair
          key={`${tab.id}-${tab.layout}-outer-${gridSizesKey}`}
          direction="vertical"
          minSize={60}
          initialSizes={[`${topPercent}%`, `${100 - topPercent}%`]}
          templateId={undefined}
          layout={undefined}
          onSizeChange={(newSizes) => {
            const newTop = parseFloat(newSizes[0]);
            const newBottom = parseFloat(newSizes[1]);
            setGridSizes(prev => ({
              ...prev,
              [tab.id]: [newTop, (bottomLeftPercent / 100) * newBottom, (bottomRightPercent / 100) * newBottom]
            }));
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        >
          <div className="w-full h-full">{renderWidgetSlot(tab.id, 0)}</div>
          <ResizablePair
            direction="horizontal"
            minSize={60}
            initialSizes={[`${bottomLeftPercent}%`, `${bottomRightPercent}%`]}
            templateId={undefined}
            layout={undefined}
            onSizeChange={(newSizes) => {
              const top = gridSizesRef.current[tab.id]?.[0] || topPercent;
              const bottomLeft = parseFloat(newSizes[0]);
              const bottomRight = parseFloat(newSizes[1]);
              setGridSizes(prev => ({
                ...prev,
                [tab.id]: [top, bottomLeft, bottomRight]
              }));
            }}
            onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
          >
            <div className="w-full h-full">{renderWidgetSlot(tab.id, 1)}</div>
            <div className="w-full h-full">{renderWidgetSlot(tab.id, 2)}</div>
          </ResizablePair>
        </ResizablePair>
      );
    }
    if (tab.layout === '3-grid-bottom-large') {
      const topLeftPercent = 50;
      const topRightPercent = 50;
      const bottomPercent = gridSizes[2];
      return (
        <ResizablePair
          direction="vertical"
          minSize={60}
          initialSizes={[`${100 - bottomPercent}%`, `${bottomPercent}%`]}
          templateId={undefined}
          layout={undefined}
          onSizeChange={(newSizes) => {
            const newTop = parseFloat(newSizes[0]);
            const newBottom = parseFloat(newSizes[1]);
            setGridSizes(prev => ({
              ...prev,
              [tab.id]: [(topLeftPercent / 100) * newTop, (topRightPercent / 100) * newTop, newBottom]
            }));
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        >
          <ResizablePair
            direction="horizontal"
            minSize={60}
            initialSizes={[`${topLeftPercent}%`, `${topRightPercent}%`]}
            templateId={undefined}
            layout={undefined}
            onSizeChange={(newSizes) => {
              const bottom = gridSizesRef.current[tab.id]?.[2] || bottomPercent;
              const topLeft = parseFloat(newSizes[0]);
              const topRight = parseFloat(newSizes[1]);
              setGridSizes(prev => ({
                ...prev,
                [tab.id]: [topLeft, topRight, bottom]
              }));
            }}
            onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
          >
            <div className="w-full h-full">{renderWidgetSlot(tab.id, 0)}</div>
            <div className="w-full h-full">{renderWidgetSlot(tab.id, 1)}</div>
          </ResizablePair>
          <div className="w-full h-full">{renderWidgetSlot(tab.id, 2)}</div>
        </ResizablePair>
      );
    }

    // Four layouts
    if (tab.layout === 'four-grid') {
      // 2 rows x 2 columns
      const numRows = 2;
      const numCols = 2;
      const defaultRowHeight = 100 / numRows;
      const memoizedRowSizes = getMemoizedRowSizes(tab.id, tab.layout, numRows, numCols);
      
      return (
        <ResizableGroup
          direction="vertical"
          minSize={60}
          cells={Array.from({ length: numRows }, (_, rowIndex) => {
            const rowStart = rowIndex * numCols;
            const rowSizes = memoizedRowSizes[rowIndex];
            return {
              content: (
                <ResizableGroup
                  direction="horizontal"
                  minSize={60}
                  cells={Array.from({ length: numCols }, (_, colIndex) => ({
                    content: renderWidgetSlot(tab.id, rowStart + colIndex),
                    position: `slot-${rowStart + colIndex}`,
                    initialSize: rowSizes[colIndex]
                  }))}
                  templateId={undefined}
                  layout={undefined}
                  onSizeChange={(newSizes) => {
                    const allSizes = [...(gridSizesRef.current[tab.id] || [])];
                    newSizes.forEach((size, colIndex) => {
                      allSizes[rowStart + colIndex] = parseFloat(size);
                    });
                    setGridSizes(prev => ({ ...prev, [tab.id]: allSizes }));
                  }}
                  onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
                />
              ),
              position: `row-${rowIndex}`,
              initialSize: `${defaultRowHeight}%`
            };
          })}
          templateId={undefined}
          layout={undefined}
          onSizeChange={() => {
            // When row heights change, don't modify column widths
            // Column widths are managed independently by inner horizontal groups
            // This prevents the weird scaling behavior
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        />
      );
    }
    if (tab.layout === 'four-vertical' || tab.layout === '4-grid-columns') {
      const sizes = gridSizes.map(w => `${w}%`);
      return (
        <ResizableGroup
          key={`${tab.id}-${tab.layout}-${gridSizesKey}`}
          direction="horizontal"
          minSize={60}
          cells={[
            { content: renderWidgetSlot(tab.id, 0), position: "slot-0", initialSize: sizes[0] },
            { content: renderWidgetSlot(tab.id, 1), position: "slot-1", initialSize: sizes[1] },
            { content: renderWidgetSlot(tab.id, 2), position: "slot-2", initialSize: sizes[2] },
            { content: renderWidgetSlot(tab.id, 3), position: "slot-3", initialSize: sizes[3] }
          ]}
          templateId={undefined}
          layout={undefined}
          onSizeChange={(newSizes) => {
            setGridSizes(prev => ({
              ...prev,
              [tab.id]: newSizes.map(s => parseFloat(s))
            }));
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        />
      );
    }
    if (tab.layout === 'four-horizontal' || tab.layout === '4-grid-rows') {
      const sizes = gridSizes.map(h => `${h}%`);
      return (
        <ResizableGroup
          key={`${tab.id}-${tab.layout}-${gridSizesKey}`}
          direction="vertical"
          minSize={60}
          cells={[
            { content: renderWidgetSlot(tab.id, 0), position: "slot-0", initialSize: sizes[0] },
            { content: renderWidgetSlot(tab.id, 1), position: "slot-1", initialSize: sizes[1] },
            { content: renderWidgetSlot(tab.id, 2), position: "slot-2", initialSize: sizes[2] },
            { content: renderWidgetSlot(tab.id, 3), position: "slot-3", initialSize: sizes[3] }
          ]}
          templateId={undefined}
          layout={undefined}
          onSizeChange={(newSizes) => {
            setGridSizes(prev => ({
              ...prev,
              [tab.id]: newSizes.map(s => parseFloat(s))
            }));
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        />
      );
    }
    if (tab.layout === '4-grid-left-large') {
      const leftPercent = gridSizes[0];
      const rightPercent = 100 - leftPercent;
      const rightTopPercent = 33.33;
      const rightMiddlePercent = 33.33;
      const rightBottomPercent = 33.34;
      return (
        <ResizablePair
          direction="horizontal"
          minSize={60}
          initialSizes={[`${leftPercent}%`, `${rightPercent}%`]}
          templateId={undefined}
          layout={undefined}
          onSizeChange={(newSizes) => {
            const newLeft = parseFloat(newSizes[0]);
            const newRight = parseFloat(newSizes[1]);
            setGridSizes(prev => ({
              ...prev,
              [tab.id]: [newLeft, (rightTopPercent / 100) * newRight, (rightMiddlePercent / 100) * newRight, (rightBottomPercent / 100) * newRight]
            }));
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        >
          <div className="w-full h-full">{renderWidgetSlot(tab.id, 0)}</div>
          <ResizableGroup
            direction="vertical"
            minSize={60}
            cells={[
              { content: renderWidgetSlot(tab.id, 1), position: "slot-1", initialSize: `${rightTopPercent}%` },
              { content: renderWidgetSlot(tab.id, 2), position: "slot-2", initialSize: `${rightMiddlePercent}%` },
              { content: renderWidgetSlot(tab.id, 3), position: "slot-3", initialSize: `${rightBottomPercent}%` }
            ]}
            templateId={undefined}
            layout={undefined}
            onSizeChange={(newSizes) => {
              const left = gridSizesRef.current[tab.id]?.[0] || leftPercent;
              const rightTop = parseFloat(newSizes[0]);
              const rightMiddle = parseFloat(newSizes[1]);
              const rightBottom = parseFloat(newSizes[2]);
              setGridSizes(prev => ({
                ...prev,
                [tab.id]: [left, rightTop, rightMiddle, rightBottom]
              }));
            }}
            onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
          />
        </ResizablePair>
      );
    }
    if (tab.layout === '4-grid-right-large') {
      const leftPercent = gridSizes[0] + gridSizes[1] + gridSizes[2];
      const rightPercent = gridSizes[3];
      const leftTopPercent = (gridSizes[0] / leftPercent) * 100;
      const leftMiddlePercent = (gridSizes[1] / leftPercent) * 100;
      const leftBottomPercent = 100 - leftTopPercent - leftMiddlePercent;
      return (
        <ResizablePair
          direction="horizontal"
          minSize={60}
          initialSizes={[`${leftPercent}%`, `${rightPercent}%`]}
          templateId={undefined}
          layout={undefined}
          onSizeChange={(newSizes) => {
            const newLeft = parseFloat(newSizes[0]);
            const newRight = parseFloat(newSizes[1]);
            const leftTop = (leftTopPercent / 100) * newLeft;
            const leftMiddle = (leftMiddlePercent / 100) * newLeft;
            const leftBottom = newLeft - leftTop - leftMiddle;
            setGridSizes(prev => ({
              ...prev,
              [tab.id]: [leftTop, leftMiddle, leftBottom, newRight]
            }));
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        >
          <ResizableGroup
            direction="vertical"
            minSize={60}
            cells={[
              { content: renderWidgetSlot(tab.id, 0), position: "slot-0", initialSize: `${leftTopPercent}%` },
              { content: renderWidgetSlot(tab.id, 1), position: "slot-1", initialSize: `${leftMiddlePercent}%` },
              { content: renderWidgetSlot(tab.id, 2), position: "slot-2", initialSize: `${leftBottomPercent}%` }
            ]}
            templateId={undefined}
            layout={undefined}
            onSizeChange={(newSizes) => {
              const right = gridSizesRef.current[tab.id]?.[3] || rightPercent;
              const leftTop = parseFloat(newSizes[0]);
              const leftMiddle = parseFloat(newSizes[1]);
              const leftBottom = parseFloat(newSizes[2]);
              setGridSizes(prev => ({
                ...prev,
                [tab.id]: [leftTop, leftMiddle, leftBottom, right]
              }));
            }}
            onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
          />
          <div className="w-full h-full">{renderWidgetSlot(tab.id, 3)}</div>
        </ResizablePair>
      );
    }
    if (tab.layout === '4-grid-top-large') {
      const topPercent = gridSizes[0];
      const bottomPercent = 100 - topPercent;
      const bottomLeftPercent = 33.33;
      const bottomMiddlePercent = 33.33;
      const bottomRightPercent = 33.34;
      return (
        <ResizablePair
          direction="vertical"
          minSize={60}
          initialSizes={[`${topPercent}%`, `${bottomPercent}%`]}
          templateId={undefined}
          layout={undefined}
          onSizeChange={(newSizes) => {
            const newTop = parseFloat(newSizes[0]);
            const newBottom = parseFloat(newSizes[1]);
            setGridSizes(prev => ({
              ...prev,
              [tab.id]: [newTop, (bottomLeftPercent / 100) * newBottom, (bottomMiddlePercent / 100) * newBottom, (bottomRightPercent / 100) * newBottom]
            }));
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        >
          <div className="w-full h-full">{renderWidgetSlot(tab.id, 0)}</div>
          <ResizableGroup
            direction="horizontal"
            minSize={60}
            cells={[
              { content: renderWidgetSlot(tab.id, 1), position: "slot-1", initialSize: `${bottomLeftPercent}%` },
              { content: renderWidgetSlot(tab.id, 2), position: "slot-2", initialSize: `${bottomMiddlePercent}%` },
              { content: renderWidgetSlot(tab.id, 3), position: "slot-3", initialSize: `${bottomRightPercent}%` }
            ]}
            templateId={undefined}
            layout={undefined}
            onSizeChange={(newSizes) => {
              const top = gridSizesRef.current[tab.id]?.[0] || topPercent;
              const bottomLeft = parseFloat(newSizes[0]);
              const bottomMiddle = parseFloat(newSizes[1]);
              const bottomRight = parseFloat(newSizes[2]);
              setGridSizes(prev => ({
                ...prev,
                [tab.id]: [top, bottomLeft, bottomMiddle, bottomRight]
              }));
            }}
            onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
          />
        </ResizablePair>
      );
    }
    if (tab.layout === '4-grid-bottom-large') {
      const topLeftPercent = 33.33;
      const topMiddlePercent = 33.33;
      const topRightPercent = 33.34;
      const bottomPercent = gridSizes[3];
      return (
        <ResizablePair
          direction="vertical"
          minSize={60}
          initialSizes={[`${100 - bottomPercent}%`, `${bottomPercent}%`]}
          templateId={undefined}
          layout={undefined}
          onSizeChange={(newSizes) => {
            const newTop = parseFloat(newSizes[0]);
            const newBottom = parseFloat(newSizes[1]);
            setGridSizes(prev => ({
              ...prev,
              [tab.id]: [(topLeftPercent / 100) * newTop, (topMiddlePercent / 100) * newTop, (topRightPercent / 100) * newTop, newBottom]
            }));
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        >
          <ResizableGroup
            direction="horizontal"
            minSize={60}
            cells={[
              { content: renderWidgetSlot(tab.id, 0), position: "slot-0", initialSize: `${topLeftPercent}%` },
              { content: renderWidgetSlot(tab.id, 1), position: "slot-1", initialSize: `${topMiddlePercent}%` },
              { content: renderWidgetSlot(tab.id, 2), position: "slot-2", initialSize: `${topRightPercent}%` }
            ]}
            templateId={undefined}
            layout={undefined}
            onSizeChange={(newSizes) => {
              const bottom = gridSizesRef.current[tab.id]?.[3] || bottomPercent;
              const topLeft = parseFloat(newSizes[0]);
              const topMiddle = parseFloat(newSizes[1]);
              const topRight = parseFloat(newSizes[2]);
              setGridSizes(prev => ({
                ...prev,
                [tab.id]: [topLeft, topMiddle, topRight, bottom]
              }));
            }}
            onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
          />
          <div className="w-full h-full">{renderWidgetSlot(tab.id, 3)}</div>
        </ResizablePair>
      );
    }

    // Five layouts
    if (tab.layout === 'five-grid') {
      const topTotal = gridSizes[0] + gridSizes[1];
      const bottomTotal = gridSizes[2] + gridSizes[3] + gridSizes[4];
      const topLeftPercent = (gridSizes[0] / topTotal) * 100;
      const topRightPercent = 100 - topLeftPercent;
      const bottomLeftPercent = (gridSizes[2] / bottomTotal) * 100;
      const bottomMiddlePercent = (gridSizes[3] / bottomTotal) * 100;
      const bottomRightPercent = 100 - bottomLeftPercent - bottomMiddlePercent;
      return (
        <ResizablePair
          direction="vertical"
          minSize={60}
          initialSizes={[`${topTotal}%`, `${bottomTotal}%`]}
          templateId={undefined}
          layout={undefined}
          onSizeChange={(newSizes) => {
            const newTop = parseFloat(newSizes[0]);
            const newBottom = parseFloat(newSizes[1]);
            const topLeft = (topLeftPercent / 100) * newTop;
            const topRight = newTop - topLeft;
            const bottomLeft = (bottomLeftPercent / 100) * newBottom;
            const bottomMiddle = (bottomMiddlePercent / 100) * newBottom;
            const bottomRight = newBottom - bottomLeft - bottomMiddle;
            setGridSizes(prev => ({
              ...prev,
              [tab.id]: [topLeft, topRight, bottomLeft, bottomMiddle, bottomRight]
            }));
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        >
          <ResizablePair
            direction="horizontal"
            minSize={60}
            initialSizes={[`${topLeftPercent}%`, `${topRightPercent}%`]}
            templateId={undefined}
            layout={undefined}
            onSizeChange={(newSizes) => {
              const bottom = gridSizesRef.current[tab.id]?.[2] + gridSizesRef.current[tab.id]?.[3] + gridSizesRef.current[tab.id]?.[4] || bottomTotal;
              const topLeft = parseFloat(newSizes[0]);
              const topRight = parseFloat(newSizes[1]);
              const bottomLeft = (bottomLeftPercent / 100) * bottom;
              const bottomMiddle = (bottomMiddlePercent / 100) * bottom;
              const bottomRight = bottom - bottomLeft - bottomMiddle;
              setGridSizes(prev => ({
                ...prev,
                [tab.id]: [topLeft, topRight, bottomLeft, bottomMiddle, bottomRight]
              }));
            }}
            onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
          >
            <div className="w-full h-full">{renderWidgetSlot(tab.id, 0)}</div>
            <div className="w-full h-full">{renderWidgetSlot(tab.id, 1)}</div>
          </ResizablePair>
          <ResizableGroup
            direction="horizontal"
            minSize={60}
            cells={[
              { content: renderWidgetSlot(tab.id, 2), position: "slot-2", initialSize: `${bottomLeftPercent}%` },
              { content: renderWidgetSlot(tab.id, 3), position: "slot-3", initialSize: `${bottomMiddlePercent}%` },
              { content: renderWidgetSlot(tab.id, 4), position: "slot-4", initialSize: `${bottomRightPercent}%` }
            ]}
            templateId={undefined}
            layout={undefined}
            onSizeChange={(newSizes) => {
              const top = gridSizesRef.current[tab.id]?.[0] + gridSizesRef.current[tab.id]?.[1] || topTotal;
              const bottomLeft = parseFloat(newSizes[0]);
              const bottomMiddle = parseFloat(newSizes[1]);
              const bottomRight = parseFloat(newSizes[2]);
              const topLeft = (topLeftPercent / 100) * top;
              const topRight = top - topLeft;
              setGridSizes(prev => ({
                ...prev,
                [tab.id]: [topLeft, topRight, bottomLeft, bottomMiddle, bottomRight]
              }));
            }}
            onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
          />
        </ResizablePair>
      );
    }
    if (tab.layout === 'five-vertical' || tab.layout === '5-grid-columns') {
      const sizes = gridSizes.map(w => `${w}%`);
      return (
        <ResizableGroup
          key={`${tab.id}-${tab.layout}-${gridSizesKey}`}
          direction="horizontal"
          minSize={60}
          cells={[
            { content: renderWidgetSlot(tab.id, 0), position: "slot-0", initialSize: sizes[0] },
            { content: renderWidgetSlot(tab.id, 1), position: "slot-1", initialSize: sizes[1] },
            { content: renderWidgetSlot(tab.id, 2), position: "slot-2", initialSize: sizes[2] },
            { content: renderWidgetSlot(tab.id, 3), position: "slot-3", initialSize: sizes[3] },
            { content: renderWidgetSlot(tab.id, 4), position: "slot-4", initialSize: sizes[4] }
          ]}
          templateId={undefined}
          layout={undefined}
          onSizeChange={(newSizes) => {
            setGridSizes(prev => ({
              ...prev,
              [tab.id]: newSizes.map(s => parseFloat(s))
            }));
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        />
      );
    }
    if (tab.layout === 'five-horizontal' || tab.layout === '5-grid-rows') {
      const sizes = gridSizes.map(h => `${h}%`);
      return (
        <ResizableGroup
          key={`${tab.id}-${tab.layout}-${gridSizesKey}`}
          direction="vertical"
          minSize={60}
          cells={[
            { content: renderWidgetSlot(tab.id, 0), position: "slot-0", initialSize: sizes[0] },
            { content: renderWidgetSlot(tab.id, 1), position: "slot-1", initialSize: sizes[1] },
            { content: renderWidgetSlot(tab.id, 2), position: "slot-2", initialSize: sizes[2] },
            { content: renderWidgetSlot(tab.id, 3), position: "slot-3", initialSize: sizes[3] },
            { content: renderWidgetSlot(tab.id, 4), position: "slot-4", initialSize: sizes[4] }
          ]}
          templateId={undefined}
          layout={undefined}
          onSizeChange={(newSizes) => {
            setGridSizes(prev => ({
              ...prev,
              [tab.id]: newSizes.map(s => parseFloat(s))
            }));
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        />
      );
    }
    if (tab.layout === '5-grid-complex') {
      const topPercent = gridSizes[0] + gridSizes[1];
      const bottomPercent = 100 - topPercent;
      const topLeftPercent = (gridSizes[0] / topPercent) * 100;
      const topRightPercent = 100 - topLeftPercent;
      const bottomLeftPercent = (gridSizes[2] / bottomPercent) * 100;
      const bottomMiddlePercent = (gridSizes[3] / bottomPercent) * 100;
      const bottomRightPercent = 100 - bottomLeftPercent - bottomMiddlePercent;
      return (
        <ResizablePair
          direction="vertical"
          minSize={60}
          initialSizes={[`${topPercent}%`, `${bottomPercent}%`]}
          templateId={undefined}
          layout={undefined}
          onSizeChange={(newSizes) => {
            const newTop = parseFloat(newSizes[0]);
            const newBottom = parseFloat(newSizes[1]);
            const topLeft = (topLeftPercent / 100) * newTop;
            const topRight = newTop - topLeft;
            const bottomLeft = (bottomLeftPercent / 100) * newBottom;
            const bottomMiddle = (bottomMiddlePercent / 100) * newBottom;
            const bottomRight = newBottom - bottomLeft - bottomMiddle;
            setGridSizes(prev => ({
              ...prev,
              [tab.id]: [topLeft, topRight, bottomLeft, bottomMiddle, bottomRight]
            }));
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        >
          <ResizablePair
            direction="horizontal"
            minSize={60}
            initialSizes={[`${topLeftPercent}%`, `${topRightPercent}%`]}
            templateId={undefined}
            layout={undefined}
            onSizeChange={(newSizes) => {
              const bottom = gridSizesRef.current[tab.id]?.[2] + gridSizesRef.current[tab.id]?.[3] + gridSizesRef.current[tab.id]?.[4] || bottomPercent;
              const topLeft = parseFloat(newSizes[0]);
              const topRight = parseFloat(newSizes[1]);
              const bottomLeft = (bottomLeftPercent / 100) * bottom;
              const bottomMiddle = (bottomMiddlePercent / 100) * bottom;
              const bottomRight = bottom - bottomLeft - bottomMiddle;
              setGridSizes(prev => ({
                ...prev,
                [tab.id]: [topLeft, topRight, bottomLeft, bottomMiddle, bottomRight]
              }));
            }}
            onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
          >
            <div className="w-full h-full">{renderWidgetSlot(tab.id, 0)}</div>
            <div className="w-full h-full">{renderWidgetSlot(tab.id, 1)}</div>
          </ResizablePair>
          <ResizableGroup
            direction="horizontal"
            minSize={60}
            cells={[
              { content: renderWidgetSlot(tab.id, 2), position: "slot-2", initialSize: `${bottomLeftPercent}%` },
              { content: renderWidgetSlot(tab.id, 3), position: "slot-3", initialSize: `${bottomMiddlePercent}%` },
              { content: renderWidgetSlot(tab.id, 4), position: "slot-4", initialSize: `${bottomRightPercent}%` }
            ]}
            templateId={undefined}
            layout={undefined}
            onSizeChange={(newSizes) => {
              const top = gridSizesRef.current[tab.id]?.[0] + gridSizesRef.current[tab.id]?.[1] || topPercent;
              const bottomLeft = parseFloat(newSizes[0]);
              const bottomMiddle = parseFloat(newSizes[1]);
              const bottomRight = parseFloat(newSizes[2]);
              const topLeft = (topLeftPercent / 100) * top;
              const topRight = top - topLeft;
              setGridSizes(prev => ({
                ...prev,
                [tab.id]: [topLeft, topRight, bottomLeft, bottomMiddle, bottomRight]
              }));
            }}
            onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
          />
        </ResizablePair>
      );
    }

    // Six layouts
    if (tab.layout === '6-grid-2x3') {
      const topPercent = gridSizes[0] + gridSizes[1] + gridSizes[2];
      const bottomPercent = 100 - topPercent;
      const topLeftPercent = (gridSizes[0] / topPercent) * 100;
      const topMiddlePercent = (gridSizes[1] / topPercent) * 100;
      const topRightPercent = 100 - topLeftPercent - topMiddlePercent;
      const bottomLeftPercent = (gridSizes[3] / bottomPercent) * 100;
      const bottomMiddlePercent = (gridSizes[4] / bottomPercent) * 100;
      const bottomRightPercent = 100 - bottomLeftPercent - bottomMiddlePercent;
      return (
        <ResizablePair
          direction="vertical"
          minSize={60}
          initialSizes={[`${topPercent}%`, `${bottomPercent}%`]}
          templateId={undefined}
          layout={undefined}
          onSizeChange={(newSizes) => {
            const newTop = parseFloat(newSizes[0]);
            const newBottom = parseFloat(newSizes[1]);
            const topLeft = (topLeftPercent / 100) * newTop;
            const topMiddle = (topMiddlePercent / 100) * newTop;
            const topRight = newTop - topLeft - topMiddle;
            const bottomLeft = (bottomLeftPercent / 100) * newBottom;
            const bottomMiddle = (bottomMiddlePercent / 100) * newBottom;
            const bottomRight = newBottom - bottomLeft - bottomMiddle;
            setGridSizes(prev => ({
              ...prev,
              [tab.id]: [topLeft, topMiddle, topRight, bottomLeft, bottomMiddle, bottomRight]
            }));
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        >
          <ResizableGroup
            direction="horizontal"
            minSize={60}
            cells={[
              { content: renderWidgetSlot(tab.id, 0), position: "slot-0", initialSize: `${topLeftPercent}%` },
              { content: renderWidgetSlot(tab.id, 1), position: "slot-1", initialSize: `${topMiddlePercent}%` },
              { content: renderWidgetSlot(tab.id, 2), position: "slot-2", initialSize: `${topRightPercent}%` }
            ]}
            templateId={undefined}
            layout={undefined}
            onSizeChange={(newSizes) => {
              const bottom = gridSizesRef.current[tab.id]?.[3] + gridSizesRef.current[tab.id]?.[4] + gridSizesRef.current[tab.id]?.[5] || bottomPercent;
              const topLeft = parseFloat(newSizes[0]);
              const topMiddle = parseFloat(newSizes[1]);
              const topRight = parseFloat(newSizes[2]);
              const bottomLeft = (bottomLeftPercent / 100) * bottom;
              const bottomMiddle = (bottomMiddlePercent / 100) * bottom;
              const bottomRight = bottom - bottomLeft - bottomMiddle;
              setGridSizes(prev => ({
                ...prev,
                [tab.id]: [topLeft, topMiddle, topRight, bottomLeft, bottomMiddle, bottomRight]
              }));
            }}
            onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
          />
          <ResizableGroup
            direction="horizontal"
            minSize={60}
            cells={[
              { content: renderWidgetSlot(tab.id, 3), position: "slot-3", initialSize: `${bottomLeftPercent}%` },
              { content: renderWidgetSlot(tab.id, 4), position: "slot-4", initialSize: `${bottomMiddlePercent}%` },
              { content: renderWidgetSlot(tab.id, 5), position: "slot-5", initialSize: `${bottomRightPercent}%` }
            ]}
            templateId={undefined}
            layout={undefined}
            onSizeChange={(newSizes) => {
              const top = gridSizesRef.current[tab.id]?.[0] + gridSizesRef.current[tab.id]?.[1] + gridSizesRef.current[tab.id]?.[2] || topPercent;
              const bottomLeft = parseFloat(newSizes[0]);
              const bottomMiddle = parseFloat(newSizes[1]);
              const bottomRight = parseFloat(newSizes[2]);
              const topLeft = (topLeftPercent / 100) * top;
              const topMiddle = (topMiddlePercent / 100) * top;
              const topRight = top - topLeft - topMiddle;
              setGridSizes(prev => ({
                ...prev,
                [tab.id]: [topLeft, topMiddle, topRight, bottomLeft, bottomMiddle, bottomRight]
              }));
            }}
            onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
          />
        </ResizablePair>
      );
    }
    if (tab.layout === '6-grid-3x2') {
      const leftPercent = gridSizes[0] + gridSizes[1];
      const middlePercent = gridSizes[2] + gridSizes[3];
      const rightPercent = 100 - leftPercent - middlePercent;
      const leftTopPercent = (gridSizes[0] / leftPercent) * 100;
      const leftBottomPercent = 100 - leftTopPercent;
      const middleTopPercent = (gridSizes[2] / middlePercent) * 100;
      const middleBottomPercent = 100 - middleTopPercent;
      const rightTopPercent = (gridSizes[4] / rightPercent) * 100;
      const rightBottomPercent = 100 - rightTopPercent;
      return (
        <ResizableGroup
          direction="horizontal"
          minSize={60}
          cells={[
            {
              content: (
                <ResizablePair
                  key={`${tab.id}-${tab.layout}-cell-left-${gridSizesKey}`}
                  direction="vertical"
                  minSize={60}
                  initialSizes={[`${leftTopPercent}%`, `${leftBottomPercent}%`]}
                  templateId={undefined}
                  layout={undefined}
                  onSizeChange={(newSizes) => {
                    const middle = gridSizesRef.current[tab.id]?.[2] + gridSizesRef.current[tab.id]?.[3] || middlePercent;
                    const right = gridSizesRef.current[tab.id]?.[4] + gridSizesRef.current[tab.id]?.[5] || rightPercent;
                    const leftTop = parseFloat(newSizes[0]);
                    const leftBottom = parseFloat(newSizes[1]);
                    const middleTop = (middleTopPercent / 100) * middle;
                    const middleBottom = middle - middleTop;
                    const rightTop = (rightTopPercent / 100) * right;
                    const rightBottom = right - rightTop;
                    setGridSizes(prev => ({
                      ...prev,
                      [tab.id]: [leftTop, leftBottom, middleTop, middleBottom, rightTop, rightBottom]
                    }));
                  }}
                  onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
                >
                  <div className="w-full h-full">{renderWidgetSlot(tab.id, 0)}</div>
                  <div className="w-full h-full">{renderWidgetSlot(tab.id, 1)}</div>
                </ResizablePair>
              ),
              position: "col-0",
              initialSize: `${leftPercent}%`
            },
            {
              content: (
                <ResizablePair
                  key={`${tab.id}-${tab.layout}-cell-middle-${gridSizesKey}`}
                  direction="vertical"
                  minSize={60}
                  initialSizes={[`${middleTopPercent}%`, `${middleBottomPercent}%`]}
                  templateId={undefined}
                  layout={undefined}
                  onSizeChange={(newSizes) => {
                    const left = gridSizesRef.current[tab.id]?.[0] + gridSizesRef.current[tab.id]?.[1] || leftPercent;
                    const right = gridSizesRef.current[tab.id]?.[4] + gridSizesRef.current[tab.id]?.[5] || rightPercent;
                    const leftTop = (leftTopPercent / 100) * left;
                    const leftBottom = left - leftTop;
                    const middleTop = parseFloat(newSizes[0]);
                    const middleBottom = parseFloat(newSizes[1]);
                    const rightTop = (rightTopPercent / 100) * right;
                    const rightBottom = right - rightTop;
                    setGridSizes(prev => ({
                      ...prev,
                      [tab.id]: [leftTop, leftBottom, middleTop, middleBottom, rightTop, rightBottom]
                    }));
                  }}
                  onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
                >
                  <div className="w-full h-full">{renderWidgetSlot(tab.id, 2)}</div>
                  <div className="w-full h-full">{renderWidgetSlot(tab.id, 3)}</div>
                </ResizablePair>
              ),
              position: "col-1",
              initialSize: `${middlePercent}%`
            },
            {
              content: (
                <ResizablePair
                  key={`${tab.id}-${tab.layout}-cell-right-${gridSizesKey}`}
                  direction="vertical"
                  minSize={60}
                  initialSizes={[`${rightTopPercent}%`, `${rightBottomPercent}%`]}
                  templateId={undefined}
                  layout={undefined}
                  onSizeChange={(newSizes) => {
                    const left = gridSizesRef.current[tab.id]?.[0] + gridSizesRef.current[tab.id]?.[1] || leftPercent;
                    const middle = gridSizesRef.current[tab.id]?.[2] + gridSizesRef.current[tab.id]?.[3] || middlePercent;
                    const leftTop = (leftTopPercent / 100) * left;
                    const leftBottom = left - leftTop;
                    const middleTop = (middleTopPercent / 100) * middle;
                    const middleBottom = middle - middleTop;
                    const rightTop = parseFloat(newSizes[0]);
                    const rightBottom = parseFloat(newSizes[1]);
                    setGridSizes(prev => ({
                      ...prev,
                      [tab.id]: [leftTop, leftBottom, middleTop, middleBottom, rightTop, rightBottom]
                    }));
                  }}
                  onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
                >
                  <div className="w-full h-full">{renderWidgetSlot(tab.id, 4)}</div>
                  <div className="w-full h-full">{renderWidgetSlot(tab.id, 5)}</div>
                </ResizablePair>
              ),
              position: "col-2",
              initialSize: `${rightPercent}%`
            }
          ]}
          templateId={undefined}
          layout={undefined}
          onSizeChange={(newSizes) => {
            const left = parseFloat(newSizes[0]);
            const middle = parseFloat(newSizes[1]);
            const right = parseFloat(newSizes[2]);
            const leftTop = (leftTopPercent / 100) * left;
            const leftBottom = left - leftTop;
            const middleTop = (middleTopPercent / 100) * middle;
            const middleBottom = middle - middleTop;
            const rightTop = (rightTopPercent / 100) * right;
            const rightBottom = right - rightTop;
            setGridSizes(prev => ({
              ...prev,
              [tab.id]: [leftTop, leftBottom, middleTop, middleBottom, rightTop, rightBottom]
            }));
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        />
      );
    }
    if (tab.layout === '6-grid-rows') {
      const sizes = gridSizes.map(h => `${h}%`);
      return (
        <ResizableGroup
          key={`${tab.id}-${tab.layout}-${gridSizesKey}`}
          direction="vertical"
          minSize={60}
          cells={[
            { content: renderWidgetSlot(tab.id, 0), position: "slot-0", initialSize: sizes[0] },
            { content: renderWidgetSlot(tab.id, 1), position: "slot-1", initialSize: sizes[1] },
            { content: renderWidgetSlot(tab.id, 2), position: "slot-2", initialSize: sizes[2] },
            { content: renderWidgetSlot(tab.id, 3), position: "slot-3", initialSize: sizes[3] },
            { content: renderWidgetSlot(tab.id, 4), position: "slot-4", initialSize: sizes[4] },
            { content: renderWidgetSlot(tab.id, 5), position: "slot-5", initialSize: sizes[5] }
          ]}
          templateId={undefined}
          layout={undefined}
          onSizeChange={(newSizes) => {
            setGridSizes(prev => ({
              ...prev,
              [tab.id]: newSizes.map(s => parseFloat(s))
            }));
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        />
      );
    }
    if (tab.layout === '6-grid-left-large') {
      const leftPercent = gridSizes[0];
      const rightPercent = 100 - leftPercent;
      const rightCellPercent = 100 / 5; // 5 cells, each 20%
      return (
        <ResizablePair
          direction="horizontal"
          minSize={60}
          initialSizes={[`${leftPercent}%`, `${rightPercent}%`]}
          templateId={undefined}
          layout={undefined}
          onSizeChange={(newSizes) => {
            const newLeft = parseFloat(newSizes[0]);
            const newRight = parseFloat(newSizes[1]);
            const rightCellSize = newRight / 5;
            setGridSizes(prev => ({
              ...prev,
              [tab.id]: [newLeft, rightCellSize, rightCellSize, rightCellSize, rightCellSize, rightCellSize]
            }));
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        >
          <div className="w-full h-full">{renderWidgetSlot(tab.id, 0)}</div>
          <ResizableGroup
            direction="vertical"
            minSize={60}
            cells={[
              { content: renderWidgetSlot(tab.id, 1), position: "slot-1", initialSize: `${rightCellPercent}%` },
              { content: renderWidgetSlot(tab.id, 2), position: "slot-2", initialSize: `${rightCellPercent}%` },
              { content: renderWidgetSlot(tab.id, 3), position: "slot-3", initialSize: `${rightCellPercent}%` },
              { content: renderWidgetSlot(tab.id, 4), position: "slot-4", initialSize: `${rightCellPercent}%` },
              { content: renderWidgetSlot(tab.id, 5), position: "slot-5", initialSize: `${rightCellPercent}%` }
            ]}
            templateId={undefined}
            layout={undefined}
            onSizeChange={(newSizes) => {
              const left = gridSizesRef.current[tab.id]?.[0] || leftPercent;
              const cellSizes = newSizes.map(s => parseFloat(s));
              setGridSizes(prev => ({
                ...prev,
                [tab.id]: [left, ...cellSizes]
              }));
            }}
            onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
          />
        </ResizablePair>
      );
    }

    // Seven layouts
    if (tab.layout === '7-grid-left') {
      const leftPercent = 50;
      const rightPercent = 50;
      const leftCellPercent = 25;
      const rightCellPercent = 33.33;
      return (
        <ResizablePair
          direction="horizontal"
          minSize={60}
          initialSizes={[`${leftPercent}%`, `${rightPercent}%`]}
          templateId={undefined}
          layout={undefined}
          onSizeChange={(newSizes) => {
            const newLeft = parseFloat(newSizes[0]);
            const newRight = parseFloat(newSizes[1]);
            const leftCellSize = newLeft / 4;
            const rightCellSize = newRight / 3;
            setGridSizes(prev => ({
              ...prev,
              [tab.id]: [leftCellSize, leftCellSize, leftCellSize, leftCellSize, rightCellSize, rightCellSize, rightCellSize]
            }));
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        >
          <ResizableGroup
            direction="vertical"
            minSize={60}
            cells={[
              { content: renderWidgetSlot(tab.id, 0), position: "slot-0", initialSize: `${leftCellPercent}%` },
              { content: renderWidgetSlot(tab.id, 1), position: "slot-1", initialSize: `${leftCellPercent}%` },
              { content: renderWidgetSlot(tab.id, 2), position: "slot-2", initialSize: `${leftCellPercent}%` },
              { content: renderWidgetSlot(tab.id, 3), position: "slot-3", initialSize: `${leftCellPercent}%` }
            ]}
            templateId={undefined}
            layout={undefined}
            onSizeChange={(newSizes) => {
              const right = gridSizesRef.current[tab.id]?.[4] + gridSizesRef.current[tab.id]?.[5] + gridSizesRef.current[tab.id]?.[6] || rightPercent;
              const cellSizes = newSizes.map(s => parseFloat(s));
              const rightCellSize = right / 3;
              setGridSizes(prev => ({
                ...prev,
                [tab.id]: [...cellSizes, rightCellSize, rightCellSize, rightCellSize]
              }));
            }}
            onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
          />
          <ResizableGroup
            direction="vertical"
            minSize={60}
            cells={[
              { content: renderWidgetSlot(tab.id, 4), position: "slot-4", initialSize: `${rightCellPercent}%` },
              { content: renderWidgetSlot(tab.id, 5), position: "slot-5", initialSize: `${rightCellPercent}%` },
              { content: renderWidgetSlot(tab.id, 6), position: "slot-6", initialSize: `${rightCellPercent}%` }
            ]}
            templateId={undefined}
            layout={undefined}
            onSizeChange={(newSizes) => {
              const left = gridSizesRef.current[tab.id]?.[0] + gridSizesRef.current[tab.id]?.[1] + gridSizesRef.current[tab.id]?.[2] + gridSizesRef.current[tab.id]?.[3] || leftPercent;
              const cellSizes = newSizes.map(s => parseFloat(s));
              const leftCellSize = left / 4;
              setGridSizes(prev => ({
                ...prev,
                [tab.id]: [leftCellSize, leftCellSize, leftCellSize, leftCellSize, ...cellSizes]
              }));
            }}
            onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
          />
        </ResizablePair>
      );
    }
    if (tab.layout === '7-grid-large') {
      const leftPercent = gridSizes[0];
      const rightPercent = 100 - leftPercent;
      const rightCellPercent = 100 / 6;
      return (
        <ResizablePair
          direction="horizontal"
          minSize={60}
          initialSizes={[`${leftPercent}%`, `${rightPercent}%`]}
          templateId={undefined}
          layout={undefined}
          onSizeChange={(newSizes) => {
            const newLeft = parseFloat(newSizes[0]);
            const newRight = parseFloat(newSizes[1]);
            const rightCellSize = newRight / 6;
            setGridSizes(prev => ({
              ...prev,
              [tab.id]: [newLeft, rightCellSize, rightCellSize, rightCellSize, rightCellSize, rightCellSize, rightCellSize]
            }));
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        >
          <div className="w-full h-full">{renderWidgetSlot(tab.id, 0)}</div>
          <ResizableGroup
            direction="vertical"
            minSize={60}
            cells={[
              { content: renderWidgetSlot(tab.id, 1), position: "slot-1", initialSize: `${rightCellPercent}%` },
              { content: renderWidgetSlot(tab.id, 2), position: "slot-2", initialSize: `${rightCellPercent}%` },
              { content: renderWidgetSlot(tab.id, 3), position: "slot-3", initialSize: `${rightCellPercent}%` },
              { content: renderWidgetSlot(tab.id, 4), position: "slot-4", initialSize: `${rightCellPercent}%` },
              { content: renderWidgetSlot(tab.id, 5), position: "slot-5", initialSize: `${rightCellPercent}%` },
              { content: renderWidgetSlot(tab.id, 6), position: "slot-6", initialSize: `${rightCellPercent}%` }
            ]}
            templateId={undefined}
            layout={undefined}
            onSizeChange={(newSizes) => {
              const left = gridSizesRef.current[tab.id]?.[0] || leftPercent;
              const cellSizes = newSizes.map(s => parseFloat(s));
              setGridSizes(prev => ({
                ...prev,
                [tab.id]: [left, ...cellSizes]
              }));
            }}
            onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
          />
        </ResizablePair>
      );
    }
    if (tab.layout === '7-grid-complex1' || tab.layout === '7-grid-complex2') {
      // For 7-cell complex layouts, use a simple fallback with CSS Grid
      // These are asymmetric layouts that are difficult to resize dynamically
      // Fall back to non-resizable CSS Grid for now
      return (
        <div className="w-full h-full grid" style={{ gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'repeat(4, 1fr)' }}>
          <div className="w-full h-full border-r border-b border-border">{renderWidgetSlot(tab.id, 0)}</div>
          <div className="w-full h-full border-b border-border">{renderWidgetSlot(tab.id, 4)}</div>
          <div className="w-full h-full border-r border-b border-border">{renderWidgetSlot(tab.id, 1)}</div>
          <div className="w-full h-full border-b border-border">{renderWidgetSlot(tab.id, 5)}</div>
          <div className="w-full h-full border-r border-b border-border">{renderWidgetSlot(tab.id, 2)}</div>
          <div className="w-full h-full border-b border-border">{renderWidgetSlot(tab.id, 6)}</div>
          <div className="w-full h-full border-r border-border">{renderWidgetSlot(tab.id, 3)}</div>
        </div>
      );
    }

    // Eight layouts
    if (tab.layout === '8-grid-2x4') {
      const topPercent = gridSizes[0] + gridSizes[1] + gridSizes[2] + gridSizes[3];
      const bottomPercent = 100 - topPercent;
      const topCellPercent = 25;
      const bottomCellPercent = 25;
      return (
        <ResizablePair
          direction="vertical"
          minSize={60}
          initialSizes={[`${topPercent}%`, `${bottomPercent}%`]}
          templateId={undefined}
          layout={undefined}
          onSizeChange={(newSizes) => {
            const newTop = parseFloat(newSizes[0]);
            const newBottom = parseFloat(newSizes[1]);
            const topCellSize = newTop / 4;
            const bottomCellSize = newBottom / 4;
            setGridSizes(prev => ({
              ...prev,
              [tab.id]: [topCellSize, topCellSize, topCellSize, topCellSize, bottomCellSize, bottomCellSize, bottomCellSize, bottomCellSize]
            }));
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        >
          <ResizableGroup
            direction="horizontal"
            minSize={60}
            cells={[
              { content: renderWidgetSlot(tab.id, 0), position: "slot-0", initialSize: `${topCellPercent}%` },
              { content: renderWidgetSlot(tab.id, 1), position: "slot-1", initialSize: `${topCellPercent}%` },
              { content: renderWidgetSlot(tab.id, 2), position: "slot-2", initialSize: `${topCellPercent}%` },
              { content: renderWidgetSlot(tab.id, 3), position: "slot-3", initialSize: `${topCellPercent}%` }
            ]}
            templateId={undefined}
            layout={undefined}
            onSizeChange={(newSizes) => {
              const bottom = gridSizesRef.current[tab.id]?.[4] + gridSizesRef.current[tab.id]?.[5] + gridSizesRef.current[tab.id]?.[6] + gridSizesRef.current[tab.id]?.[7] || bottomPercent;
              const cellSizes = newSizes.map(s => parseFloat(s));
              const bottomCellSize = bottom / 4;
              setGridSizes(prev => ({
                ...prev,
                [tab.id]: [...cellSizes, bottomCellSize, bottomCellSize, bottomCellSize, bottomCellSize]
              }));
            }}
            onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
          />
          <ResizableGroup
            direction="horizontal"
            minSize={60}
            cells={[
              { content: renderWidgetSlot(tab.id, 4), position: "slot-4", initialSize: `${bottomCellPercent}%` },
              { content: renderWidgetSlot(tab.id, 5), position: "slot-5", initialSize: `${bottomCellPercent}%` },
              { content: renderWidgetSlot(tab.id, 6), position: "slot-6", initialSize: `${bottomCellPercent}%` },
              { content: renderWidgetSlot(tab.id, 7), position: "slot-7", initialSize: `${bottomCellPercent}%` }
            ]}
            templateId={undefined}
            layout={undefined}
            onSizeChange={(newSizes) => {
              const top = gridSizesRef.current[tab.id]?.[0] + gridSizesRef.current[tab.id]?.[1] + gridSizesRef.current[tab.id]?.[2] + gridSizesRef.current[tab.id]?.[3] || topPercent;
              const cellSizes = newSizes.map(s => parseFloat(s));
              const topCellSize = top / 4;
              setGridSizes(prev => ({
                ...prev,
                [tab.id]: [topCellSize, topCellSize, topCellSize, topCellSize, ...cellSizes]
              }));
            }}
            onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
          />
        </ResizablePair>
      );
    }
    if (tab.layout === '8-grid-4x2') {
      const leftPercent = gridSizes[0] + gridSizes[1];
      const rightPercent = 100 - leftPercent;
      const leftCellPercent = 50;
      const rightCellPercent = 50;
      return (
        <ResizablePair
          direction="horizontal"
          minSize={60}
          initialSizes={[`${leftPercent}%`, `${rightPercent}%`]}
          templateId={undefined}
          layout={undefined}
          onSizeChange={(newSizes) => {
            const newLeft = parseFloat(newSizes[0]);
            const newRight = parseFloat(newSizes[1]);
            const leftCellSize = newLeft / 4;
            const rightCellSize = newRight / 4;
            setGridSizes(prev => ({
              ...prev,
              [tab.id]: [leftCellSize, leftCellSize, leftCellSize, leftCellSize, rightCellSize, rightCellSize, rightCellSize, rightCellSize]
            }));
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        >
          <ResizableGroup
            direction="vertical"
            minSize={60}
            cells={[
              { content: renderWidgetSlot(tab.id, 0), position: "slot-0", initialSize: `${leftCellPercent}%` },
              { content: renderWidgetSlot(tab.id, 1), position: "slot-1", initialSize: `${leftCellPercent}%` },
              { content: renderWidgetSlot(tab.id, 2), position: "slot-2", initialSize: `${leftCellPercent}%` },
              { content: renderWidgetSlot(tab.id, 3), position: "slot-3", initialSize: `${leftCellPercent}%` }
            ]}
            templateId={undefined}
            layout={undefined}
            onSizeChange={(newSizes) => {
              const right = gridSizesRef.current[tab.id]?.[4] + gridSizesRef.current[tab.id]?.[5] + gridSizesRef.current[tab.id]?.[6] + gridSizesRef.current[tab.id]?.[7] || rightPercent;
              const cellSizes = newSizes.map(s => parseFloat(s));
              const rightCellSize = right / 4;
              setGridSizes(prev => ({
                ...prev,
                [tab.id]: [...cellSizes, rightCellSize, rightCellSize, rightCellSize, rightCellSize]
              }));
            }}
            onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
          />
          <ResizableGroup
            direction="vertical"
            minSize={60}
            cells={[
              { content: renderWidgetSlot(tab.id, 4), position: "slot-4", initialSize: `${rightCellPercent}%` },
              { content: renderWidgetSlot(tab.id, 5), position: "slot-5", initialSize: `${rightCellPercent}%` },
              { content: renderWidgetSlot(tab.id, 6), position: "slot-6", initialSize: `${rightCellPercent}%` },
              { content: renderWidgetSlot(tab.id, 7), position: "slot-7", initialSize: `${rightCellPercent}%` }
            ]}
            templateId={undefined}
            layout={undefined}
            onSizeChange={(newSizes) => {
              const left = gridSizesRef.current[tab.id]?.[0] + gridSizesRef.current[tab.id]?.[1] + gridSizesRef.current[tab.id]?.[2] + gridSizesRef.current[tab.id]?.[3] || leftPercent;
              const cellSizes = newSizes.map(s => parseFloat(s));
              const leftCellSize = left / 4;
              setGridSizes(prev => ({
                ...prev,
                [tab.id]: [leftCellSize, leftCellSize, leftCellSize, leftCellSize, ...cellSizes]
              }));
            }}
            onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
          />
        </ResizablePair>
      );
    }
    if (tab.layout === '8-grid-columns') {
      const sizes = gridSizes.map(w => `${w}%`);
      return (
        <ResizableGroup
          direction="horizontal"
          minSize={60}
          cells={[
            { content: renderWidgetSlot(tab.id, 0), position: "slot-0", initialSize: sizes[0] },
            { content: renderWidgetSlot(tab.id, 1), position: "slot-1", initialSize: sizes[1] },
            { content: renderWidgetSlot(tab.id, 2), position: "slot-2", initialSize: sizes[2] },
            { content: renderWidgetSlot(tab.id, 3), position: "slot-3", initialSize: sizes[3] },
            { content: renderWidgetSlot(tab.id, 4), position: "slot-4", initialSize: sizes[4] },
            { content: renderWidgetSlot(tab.id, 5), position: "slot-5", initialSize: sizes[5] },
            { content: renderWidgetSlot(tab.id, 6), position: "slot-6", initialSize: sizes[6] },
            { content: renderWidgetSlot(tab.id, 7), position: "slot-7", initialSize: sizes[7] }
          ]}
          templateId={undefined}
          layout={undefined}
          onSizeChange={(newSizes) => {
            setGridSizes(prev => ({
              ...prev,
              [tab.id]: newSizes.map(s => parseFloat(s))
            }));
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        />
      );
    }
    if (tab.layout === '8-grid-rows') {
      const sizes = gridSizes.map(h => `${h}%`);
      return (
        <ResizableGroup
          direction="vertical"
          minSize={60}
          cells={[
            { content: renderWidgetSlot(tab.id, 0), position: "slot-0", initialSize: sizes[0] },
            { content: renderWidgetSlot(tab.id, 1), position: "slot-1", initialSize: sizes[1] },
            { content: renderWidgetSlot(tab.id, 2), position: "slot-2", initialSize: sizes[2] },
            { content: renderWidgetSlot(tab.id, 3), position: "slot-3", initialSize: sizes[3] },
            { content: renderWidgetSlot(tab.id, 4), position: "slot-4", initialSize: sizes[4] },
            { content: renderWidgetSlot(tab.id, 5), position: "slot-5", initialSize: sizes[5] },
            { content: renderWidgetSlot(tab.id, 6), position: "slot-6", initialSize: sizes[6] },
            { content: renderWidgetSlot(tab.id, 7), position: "slot-7", initialSize: sizes[7] }
          ]}
          templateId={undefined}
          layout={undefined}
          onSizeChange={(newSizes) => {
            setGridSizes(prev => ({
              ...prev,
              [tab.id]: newSizes.map(s => parseFloat(s))
            }));
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        />
      );
    }

    // Nine and above - use nested ResizableGroup
    if (tab.layout === '9-grid') {
      // 3 rows x 3 columns
      const numRows = 3;
      const numCols = 3;
      const defaultRowHeight = 100 / numRows;
      const memoizedRowSizes = getMemoizedRowSizes(tab.id, tab.layout, numRows, numCols);
      
      return (
        <ResizableGroup
          direction="vertical"
          minSize={60}
          cells={Array.from({ length: numRows }, (_, rowIndex) => {
            const rowStart = rowIndex * numCols;
            const rowSizes = memoizedRowSizes[rowIndex];
            return {
              content: (
                <ResizableGroup
                  direction="horizontal"
                  minSize={60}
                  cells={Array.from({ length: numCols }, (_, colIndex) => ({
                    content: renderWidgetSlot(tab.id, rowStart + colIndex),
                    position: `slot-${rowStart + colIndex}`,
                    initialSize: rowSizes[colIndex]
                  }))}
                  templateId={undefined}
                  layout={undefined}
                  onSizeChange={(newSizes) => {
                    const allSizes = [...(gridSizesRef.current[tab.id] || [])];
                    newSizes.forEach((size, colIndex) => {
                      allSizes[rowStart + colIndex] = parseFloat(size);
                    });
                    setGridSizes(prev => ({ ...prev, [tab.id]: allSizes }));
                  }}
                  onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
                />
              ),
              position: `row-${rowIndex}`,
              initialSize: `${defaultRowHeight}%`
            };
          })}
          templateId={undefined}
          layout={undefined}
          onSizeChange={() => {
            // When row heights change, don't modify column widths
            // Column widths are managed independently by inner horizontal groups
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        />
      );
    }
    if (tab.layout === '12-grid-3x4') {
      // 3 rows x 4 columns
      const numRows = 3;
      const numCols = 4;
      const defaultRowHeight = 100 / numRows;
      const memoizedRowSizes = getMemoizedRowSizes(tab.id, tab.layout, numRows, numCols);
      
      return (
        <ResizableGroup
          direction="vertical"
          minSize={60}
          cells={Array.from({ length: numRows }, (_, rowIndex) => {
            const rowStart = rowIndex * numCols;
            const rowSizes = memoizedRowSizes[rowIndex];
            return {
              content: (
                <ResizableGroup
                  direction="horizontal"
                  minSize={60}
                  cells={Array.from({ length: numCols }, (_, colIndex) => ({
                    content: renderWidgetSlot(tab.id, rowStart + colIndex),
                    position: `slot-${rowStart + colIndex}`,
                    initialSize: rowSizes[colIndex]
                  }))}
                  templateId={undefined}
                  layout={undefined}
                  onSizeChange={(newSizes) => {
                    const allSizes = [...(gridSizesRef.current[tab.id] || [])];
                    newSizes.forEach((size, colIndex) => {
                      allSizes[rowStart + colIndex] = parseFloat(size);
                    });
                    setGridSizes(prev => ({ ...prev, [tab.id]: allSizes }));
                  }}
                  onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
                />
              ),
              position: `row-${rowIndex}`,
              initialSize: `${defaultRowHeight}%`
            };
          })}
          templateId={undefined}
          layout={undefined}
          onSizeChange={() => {
            // When row heights change, don't modify column widths
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        />
      );
    }
    if (tab.layout === '12-grid-4x3') {
      // 4 rows x 3 columns
      const numRows = 4;
      const numCols = 3;
      const defaultRowHeight = 100 / numRows;
      const memoizedRowSizes = getMemoizedRowSizes(tab.id, tab.layout, numRows, numCols);
      
      return (
        <ResizableGroup
          direction="vertical"
          minSize={60}
          cells={Array.from({ length: numRows }, (_, rowIndex) => {
            const rowStart = rowIndex * numCols;
            const rowSizes = memoizedRowSizes[rowIndex];
            return {
              content: (
                <ResizableGroup
                  direction="horizontal"
                  minSize={60}
                  cells={Array.from({ length: numCols }, (_, colIndex) => ({
                    content: renderWidgetSlot(tab.id, rowStart + colIndex),
                    position: `slot-${rowStart + colIndex}`,
                    initialSize: rowSizes[colIndex]
                  }))}
                  templateId={undefined}
                  layout={undefined}
                  onSizeChange={(newSizes) => {
                    const allSizes = [...(gridSizesRef.current[tab.id] || [])];
                    newSizes.forEach((size, colIndex) => {
                      allSizes[rowStart + colIndex] = parseFloat(size);
                    });
                    setGridSizes(prev => ({ ...prev, [tab.id]: allSizes }));
                  }}
                  onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
                />
              ),
              position: `row-${rowIndex}`,
              initialSize: `${defaultRowHeight}%`
            };
          })}
          templateId={undefined}
          layout={undefined}
          onSizeChange={() => {
            // When row heights change, don't modify column widths
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        />
      );
    }
    if (tab.layout === '16-grid') {
      // 4 rows x 4 columns
      const numRows = 4;
      const numCols = 4;
      const defaultRowHeight = 100 / numRows;
      const memoizedRowSizes = getMemoizedRowSizes(tab.id, tab.layout, numRows, numCols);
      
      return (
        <ResizableGroup
          direction="vertical"
          minSize={60}
          cells={Array.from({ length: numRows }, (_, rowIndex) => {
            const rowStart = rowIndex * numCols;
            const rowSizes = memoizedRowSizes[rowIndex];
            return {
              content: (
                <ResizableGroup
                  direction="horizontal"
                  minSize={60}
                  cells={Array.from({ length: numCols }, (_, colIndex) => ({
                    content: renderWidgetSlot(tab.id, rowStart + colIndex),
                    position: `slot-${rowStart + colIndex}`,
                    initialSize: rowSizes[colIndex]
                  }))}
                  templateId={undefined}
                  layout={undefined}
                  onSizeChange={(newSizes) => {
                    const allSizes = [...(gridSizesRef.current[tab.id] || [])];
                    newSizes.forEach((size, colIndex) => {
                      allSizes[rowStart + colIndex] = parseFloat(size);
                    });
                    setGridSizes(prev => ({ ...prev, [tab.id]: allSizes }));
                  }}
                  onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
                />
              ),
              position: `row-${rowIndex}`,
              initialSize: `${defaultRowHeight}%`
            };
          })}
          templateId={undefined}
          layout={undefined}
          onSizeChange={() => {
            // When row heights change, don't modify column widths
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        />
      );
    }
    if (tab.layout === '24-grid-4x6') {
      // 4 rows x 6 columns
      const numRows = 4;
      const numCols = 6;
      const defaultRowHeight = 100 / numRows;
      const memoizedRowSizes = getMemoizedRowSizes(tab.id, tab.layout, numRows, numCols);
      
      return (
        <ResizableGroup
          direction="vertical"
          minSize={50}
          cells={Array.from({ length: numRows }, (_, rowIndex) => {
            const rowStart = rowIndex * numCols;
            const rowSizes = memoizedRowSizes[rowIndex];
            return {
              content: (
                <ResizableGroup
                  direction="horizontal"
                  minSize={50}
                  cells={Array.from({ length: numCols }, (_, colIndex) => ({
                    content: renderWidgetSlot(tab.id, rowStart + colIndex),
                    position: `slot-${rowStart + colIndex}`,
                    initialSize: rowSizes[colIndex]
                  }))}
                  templateId={undefined}
                  layout={undefined}
                  onSizeChange={(newSizes) => {
                    const allSizes = [...(gridSizesRef.current[tab.id] || [])];
                    newSizes.forEach((size, colIndex) => {
                      allSizes[rowStart + colIndex] = parseFloat(size);
                    });
                    setGridSizes(prev => ({ ...prev, [tab.id]: allSizes }));
                  }}
                  onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
                />
              ),
              position: `row-${rowIndex}`,
              initialSize: `${defaultRowHeight}%`
            };
          })}
          templateId={undefined}
          layout={undefined}
          onSizeChange={() => {
            // When row heights change, don't modify column widths
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        />
      );
    }
    if (tab.layout === '24-grid-6x4') {
      // 6 rows x 4 columns
      const numRows = 6;
      const numCols = 4;
      const defaultRowHeight = 100 / numRows;
      const memoizedRowSizes = getMemoizedRowSizes(tab.id, tab.layout, numRows, numCols);
      
      return (
        <ResizableGroup
          direction="vertical"
          minSize={50}
          cells={Array.from({ length: numRows }, (_, rowIndex) => {
            const rowStart = rowIndex * numCols;
            const rowSizes = memoizedRowSizes[rowIndex];
            return {
              content: (
                <ResizableGroup
                  direction="horizontal"
                  minSize={50}
                  cells={Array.from({ length: numCols }, (_, colIndex) => ({
                    content: renderWidgetSlot(tab.id, rowStart + colIndex),
                    position: `slot-${rowStart + colIndex}`,
                    initialSize: rowSizes[colIndex]
                  }))}
                  templateId={undefined}
                  layout={undefined}
                  onSizeChange={(newSizes) => {
                    const allSizes = [...(gridSizesRef.current[tab.id] || [])];
                    newSizes.forEach((size, colIndex) => {
                      allSizes[rowStart + colIndex] = parseFloat(size);
                    });
                    setGridSizes(prev => ({ ...prev, [tab.id]: allSizes }));
                  }}
                  onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
                />
              ),
              position: `row-${rowIndex}`,
              initialSize: `${defaultRowHeight}%`
            };
          })}
          templateId={undefined}
          layout={undefined}
          onSizeChange={() => {
            // When row heights change, don't modify column widths
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        />
      );
    }
    if (tab.layout === '24-grid-rows') {
      const sizes = gridSizes.map(h => `${h}%`);
      return (
        <ResizableGroup
          direction="vertical"
          minSize={40}
          cells={Array.from({ length: 24 }, (_, i) => ({
            content: renderWidgetSlot(tab.id, i),
            position: `slot-${i}`,
            initialSize: sizes[i] || `${100 / 24}%`
          }))}
          templateId={undefined}
          layout={undefined}
          onSizeChange={(newSizes) => {
            setGridSizes(prev => ({
              ...prev,
              [tab.id]: newSizes.map(s => parseFloat(s))
            }));
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        />
      );
    }
    if (tab.layout === '24-grid-columns') {
      const sizes = gridSizes.map(w => `${w}%`);
      return (
        <ResizableGroup
          direction="horizontal"
          minSize={40}
          cells={Array.from({ length: 24 }, (_, i) => ({
            content: renderWidgetSlot(tab.id, i),
            position: `slot-${i}`,
            initialSize: sizes[i] || `${100 / 24}%`
          }))}
          templateId={undefined}
          layout={undefined}
          onSizeChange={(newSizes) => {
            setGridSizes(prev => ({
              ...prev,
              [tab.id]: newSizes.map(s => parseFloat(s))
            }));
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        />
      );
    }
    if (tab.layout === '28-grid-4x7') {
      // 4 rows x 7 columns
      const numRows = 4;
      const numCols = 7;
      const defaultRowHeight = 100 / numRows;
      const memoizedRowSizes = getMemoizedRowSizes(tab.id, tab.layout, numRows, numCols);
      
      return (
        <ResizableGroup
          direction="vertical"
          minSize={50}
          cells={Array.from({ length: numRows }, (_, rowIndex) => {
            const rowStart = rowIndex * numCols;
            const rowSizes = memoizedRowSizes[rowIndex];
            return {
              content: (
                <ResizableGroup
                  direction="horizontal"
                  minSize={40}
                  cells={Array.from({ length: numCols }, (_, colIndex) => ({
                    content: renderWidgetSlot(tab.id, rowStart + colIndex),
                    position: `slot-${rowStart + colIndex}`,
                    initialSize: rowSizes[colIndex]
                  }))}
                  templateId={undefined}
                  layout={undefined}
                  onSizeChange={(newSizes) => {
                    const allSizes = [...(gridSizesRef.current[tab.id] || [])];
                    newSizes.forEach((size, colIndex) => {
                      allSizes[rowStart + colIndex] = parseFloat(size);
                    });
                    setGridSizes(prev => ({ ...prev, [tab.id]: allSizes }));
                  }}
                  onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
                />
              ),
              position: `row-${rowIndex}`,
              initialSize: `${defaultRowHeight}%`
            };
          })}
          templateId={undefined}
          layout={undefined}
          onSizeChange={() => {
            // When row heights change, don't modify column widths
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        />
      );
    }
    if (tab.layout === '28-grid-7x4') {
      // 7 rows x 4 columns
      const numRows = 7;
      const numCols = 4;
      const defaultRowHeight = 100 / numRows;
      const memoizedRowSizes = getMemoizedRowSizes(tab.id, tab.layout, numRows, numCols);
      
      return (
        <ResizableGroup
          direction="vertical"
          minSize={50}
          cells={Array.from({ length: numRows }, (_, rowIndex) => {
            const rowStart = rowIndex * numCols;
            const rowSizes = memoizedRowSizes[rowIndex];
            return {
              content: (
                <ResizableGroup
                  direction="horizontal"
                  minSize={50}
                  cells={Array.from({ length: numCols }, (_, colIndex) => ({
                    content: renderWidgetSlot(tab.id, rowStart + colIndex),
                    position: `slot-${rowStart + colIndex}`,
                    initialSize: rowSizes[colIndex]
                  }))}
                  templateId={undefined}
                  layout={undefined}
                  onSizeChange={(newSizes) => {
                    const allSizes = [...(gridSizesRef.current[tab.id] || [])];
                    newSizes.forEach((size, colIndex) => {
                      allSizes[rowStart + colIndex] = parseFloat(size);
                    });
                    setGridSizes(prev => ({ ...prev, [tab.id]: allSizes }));
                  }}
                  onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
                />
              ),
              position: `row-${rowIndex}`,
              initialSize: `${defaultRowHeight}%`
            };
          })}
          templateId={undefined}
          layout={undefined}
          onSizeChange={() => {
            // When row heights change, don't modify column widths
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        />
      );
    }
    if (tab.layout === '32-grid-4x8') {
      // 4 rows x 8 columns
      const numRows = 4;
      const numCols = 8;
      const defaultRowHeight = 100 / numRows;
      const memoizedRowSizes = getMemoizedRowSizes(tab.id, tab.layout, numRows, numCols);
      
      return (
        <ResizableGroup
          direction="vertical"
          minSize={50}
          cells={Array.from({ length: numRows }, (_, rowIndex) => {
            const rowStart = rowIndex * numCols;
            const rowSizes = memoizedRowSizes[rowIndex];
            return {
              content: (
                <ResizableGroup
                  direction="horizontal"
                  minSize={40}
                  cells={Array.from({ length: numCols }, (_, colIndex) => ({
                    content: renderWidgetSlot(tab.id, rowStart + colIndex),
                    position: `slot-${rowStart + colIndex}`,
                    initialSize: rowSizes[colIndex]
                  }))}
                  templateId={undefined}
                  layout={undefined}
                  onSizeChange={(newSizes) => {
                    const allSizes = [...(gridSizesRef.current[tab.id] || [])];
                    newSizes.forEach((size, colIndex) => {
                      allSizes[rowStart + colIndex] = parseFloat(size);
                    });
                    setGridSizes(prev => ({ ...prev, [tab.id]: allSizes }));
                  }}
                  onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
                />
              ),
              position: `row-${rowIndex}`,
              initialSize: `${defaultRowHeight}%`
            };
          })}
          templateId={undefined}
          layout={undefined}
          onSizeChange={() => {
            // When row heights change, don't modify column widths
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        />
      );
    }
    if (tab.layout === '32-grid-8x4') {
      // 8 rows x 4 columns
      const numRows = 8;
      const numCols = 4;
      const defaultRowHeight = 100 / numRows;
      const memoizedRowSizes = getMemoizedRowSizes(tab.id, tab.layout, numRows, numCols);
      
      return (
        <ResizableGroup
          direction="vertical"
          minSize={50}
          cells={Array.from({ length: numRows }, (_, rowIndex) => {
            const rowStart = rowIndex * numCols;
            const rowSizes = memoizedRowSizes[rowIndex];
            return {
              content: (
                <ResizableGroup
                  direction="horizontal"
                  minSize={50}
                  cells={Array.from({ length: numCols }, (_, colIndex) => ({
                    content: renderWidgetSlot(tab.id, rowStart + colIndex),
                    position: `slot-${rowStart + colIndex}`,
                    initialSize: rowSizes[colIndex]
                  }))}
                  templateId={undefined}
                  layout={undefined}
                  onSizeChange={(newSizes) => {
                    const allSizes = [...(gridSizesRef.current[tab.id] || [])];
                    newSizes.forEach((size, colIndex) => {
                      allSizes[rowStart + colIndex] = parseFloat(size);
                    });
                    setGridSizes(prev => ({ ...prev, [tab.id]: allSizes }));
                  }}
                  onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
                />
              ),
              position: `row-${rowIndex}`,
              initialSize: `${defaultRowHeight}%`
            };
          })}
          templateId={undefined}
          layout={undefined}
          onSizeChange={() => {
            // When row heights change, don't modify column widths
          }}
          onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
        />
      );
    }

    // Default fallback - use ResizableGroup
    const sizes = gridSizes.map(h => `${h}%`);
    return (
      <ResizableGroup
        direction="vertical"
        minSize={60}
        cells={gridSizes.map((_, i) => ({
          content: renderWidgetSlot(tab.id, i),
          position: `slot-${i}`,
          initialSize: sizes[i] || `${100 / gridSizes.length}%`
        }))}
        templateId={undefined}
        layout={undefined}
        onSizeChange={(newSizes) => {
          setGridSizes(prev => ({
            ...prev,
            [tab.id]: newSizes.map(s => parseFloat(s))
          }));
        }}
        onSaveRequired={createTabSaveHandler(tab.id, tab.layout)}
      />
    );
  };

  // Available layouts - All 44 layouts
  const layouts: Array<{ id: LayoutType; name: string; icon: React.ReactNode }> = [
    { id: 'single', name: 'Single', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2" /></svg> },
    { id: 'two-vertical', name: 'Two Vertical', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="8" height="18" rx="1" /><rect x="13" y="3" width="8" height="18" rx="1" /></svg> },
    { id: 'two-horizontal', name: 'Two Horizontal', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="18" height="8" rx="1" /><rect x="3" y="13" width="18" height="8" rx="1" /></svg> },
    { id: 'three-left-right', name: 'Top + Bottom Split', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="18" height="8" rx="1" /><rect x="3" y="13" width="8" height="8" rx="1" /><rect x="13" y="13" width="8" height="8" rx="1" /></svg> },
    { id: 'three-top-bottom', name: 'Top Split + Bottom', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="8" height="8" rx="1" /><rect x="13" y="3" width="8" height="8" rx="1" /><rect x="3" y="13" width="18" height="8" rx="1" /></svg> },
    { id: 'three-left-stack', name: 'Left Stack', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="8" height="8" rx="1" /><rect x="3" y="13" width="8" height="8" rx="1" /><rect x="13" y="3" width="8" height="18" rx="1" /></svg> },
    { id: 'three-right-stack', name: 'Right Stack', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="8" height="18" rx="1" /><rect x="13" y="3" width="8" height="8" rx="1" /><rect x="13" y="13" width="8" height="8" rx="1" /></svg> },
    { id: '3-grid-rows', name: '3 Grid Rows', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="2" width="18" height="5" rx="1" /><rect x="3" y="9" width="18" height="5" rx="1" /><rect x="3" y="16" width="18" height="5" rx="1" /></svg> },
    { id: '3-grid-columns', name: '3 Grid Columns', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="2" y="3" width="5" height="18" rx="1" /><rect x="9" y="3" width="5" height="18" rx="1" /><rect x="16" y="3" width="5" height="18" rx="1" /></svg> },
    { id: '3-grid-left-large', name: '3 Grid Left Large', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="12" height="18" rx="1" /><rect x="17" y="3" width="4" height="8" rx="1" /><rect x="17" y="13" width="4" height="8" rx="1" /></svg> },
    { id: '3-grid-right-large', name: '3 Grid Right Large', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="4" height="8" rx="1" /><rect x="3" y="13" width="4" height="8" rx="1" /><rect x="9" y="3" width="12" height="18" rx="1" /></svg> },
    { id: '3-grid-top-large', name: '3 Grid Top Large', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="18" height="12" rx="1" /><rect x="3" y="17" width="8" height="4" rx="1" /><rect x="13" y="17" width="8" height="4" rx="1" /></svg> },
    { id: '3-grid-bottom-large', name: '3 Grid Bottom Large', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="8" height="4" rx="1" /><rect x="13" y="3" width="8" height="4" rx="1" /><rect x="3" y="9" width="18" height="12" rx="1" /></svg> },
    { id: 'four-grid', name: 'Four Grid', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="8" height="8" rx="1" /><rect x="13" y="3" width="8" height="8" rx="1" /><rect x="3" y="13" width="8" height="8" rx="1" /><rect x="13" y="13" width="8" height="8" rx="1" /></svg> },
    { id: '4-grid-columns', name: '4 Grid Columns', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="2" y="3" width="4" height="18" rx="1" /><rect x="7" y="3" width="4" height="18" rx="1" /><rect x="12" y="3" width="4" height="18" rx="1" /><rect x="17" y="3" width="4" height="18" rx="1" /></svg> },
    { id: '4-grid-rows', name: '4 Grid Rows', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="2" width="18" height="4" rx="1" /><rect x="3" y="7" width="18" height="4" rx="1" /><rect x="3" y="12" width="18" height="4" rx="1" /><rect x="3" y="17" width="18" height="4" rx="1" /></svg> },
    { id: '4-grid-left-large', name: '4 Grid Left Large', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="11" height="18" rx="1" /><rect x="16" y="3" width="5" height="5" rx="1" /><rect x="16" y="9.5" width="5" height="5" rx="1" /><rect x="16" y="16" width="5" height="5" rx="1" /></svg> },
    { id: '4-grid-right-large', name: '4 Grid Right Large', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="5" height="5" rx="1" /><rect x="3" y="9.5" width="5" height="5" rx="1" /><rect x="3" y="16" width="5" height="5" rx="1" /><rect x="10" y="3" width="11" height="18" rx="1" /></svg> },
    { id: '4-grid-top-large', name: '4 Grid Top Large', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="18" height="11" rx="1" /><rect x="3" y="16" width="5" height="5" rx="1" /><rect x="9.5" y="16" width="5" height="5" rx="1" /><rect x="16" y="16" width="5" height="5" rx="1" /></svg> },
    { id: 'five-grid', name: 'Five Grid', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="12" y="3" width="9" height="7" rx="1" /><rect x="3" y="12" width="5" height="9" rx="1" /><rect x="10" y="12" width="5" height="9" rx="1" /><rect x="17" y="12" width="4" height="9" rx="1" /></svg> },
    { id: '5-grid-rows', name: '5 Grid Rows', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="2" width="18" height="3" rx="1" /><rect x="3" y="6" width="18" height="3" rx="1" /><rect x="3" y="10" width="18" height="3" rx="1" /><rect x="3" y="14" width="18" height="3" rx="1" /><rect x="3" y="18" width="18" height="3" rx="1" /></svg> },
    { id: '5-grid-columns', name: '5 Grid Columns', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="2" y="3" width="3" height="18" rx="1" /><rect x="6" y="3" width="3" height="18" rx="1" /><rect x="10" y="3" width="3" height="18" rx="1" /><rect x="14" y="3" width="3" height="18" rx="1" /><rect x="18" y="3" width="3" height="18" rx="1" /></svg> },
    { id: '5-grid-complex', name: '5 Grid Complex', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="8" height="8" rx="1" /><rect x="13" y="3" width="8" height="8" rx="1" /><rect x="3" y="13" width="5" height="8" rx="1" /><rect x="10" y="13" width="5" height="8" rx="1" /><rect x="17" y="13" width="4" height="8" rx="1" /></svg> },
    { id: '6-grid-2x3', name: '6 Grid (2x3)', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="5" height="8" rx="1" /><rect x="9.5" y="3" width="5" height="8" rx="1" /><rect x="16" y="3" width="5" height="8" rx="1" /><rect x="3" y="13" width="5" height="8" rx="1" /><rect x="9.5" y="13" width="5" height="8" rx="1" /><rect x="16" y="13" width="5" height="8" rx="1" /></svg> },
    { id: '6-grid-3x2', name: '6 Grid (3x2)', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="8" height="5" rx="1" /><rect x="13" y="3" width="8" height="5" rx="1" /><rect x="3" y="9.5" width="8" height="5" rx="1" /><rect x="13" y="9.5" width="8" height="5" rx="1" /><rect x="3" y="16" width="8" height="5" rx="1" /><rect x="13" y="16" width="8" height="5" rx="1" /></svg> },
    { id: '6-grid-left-large', name: '6 Grid Left Large', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="12" height="18" rx="1" /><rect x="17" y="3" width="4" height="3" rx="1" /><rect x="17" y="7" width="4" height="3" rx="1" /><rect x="17" y="11" width="4" height="3" rx="1" /><rect x="17" y="15" width="4" height="3" rx="1" /><rect x="17" y="19" width="4" height="2" rx="1" /></svg> },
    { id: '7-grid-left', name: '7 Grid Left', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="8" height="4" rx="1" /><rect x="3" y="8.5" width="8" height="4" rx="1" /><rect x="3" y="14" width="8" height="4" rx="1" /><rect x="3" y="19.5" width="8" height="1.5" rx="1" /><rect x="13" y="3" width="8" height="5" rx="1" /><rect x="13" y="10" width="8" height="5" rx="1" /><rect x="13" y="17" width="8" height="4" rx="1" /></svg> },
    { id: '7-grid-large', name: '7 Grid Large', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="13" height="18" rx="1" /><rect x="18" y="3" width="3" height="2.5" rx="1" /><rect x="18" y="6.5" width="3" height="2.5" rx="1" /><rect x="18" y="10" width="3" height="2.5" rx="1" /><rect x="18" y="13.5" width="3" height="2.5" rx="1" /><rect x="18" y="17" width="3" height="2" rx="1" /><rect x="18" y="19.5" width="3" height="1.5" rx="1" /></svg> },
    { id: '8-grid-2x4', name: '8 Grid (2x4)', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="4" height="8" rx="1" /><rect x="8" y="3" width="4" height="8" rx="1" /><rect x="13" y="3" width="4" height="8" rx="1" /><rect x="18" y="3" width="3" height="8" rx="1" /><rect x="3" y="13" width="4" height="8" rx="1" /><rect x="8" y="13" width="4" height="8" rx="1" /><rect x="13" y="13" width="4" height="8" rx="1" /><rect x="18" y="13" width="3" height="8" rx="1" /></svg> },
    { id: '8-grid-4x2', name: '8 Grid (4x2)', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="8" height="4" rx="1" /><rect x="13" y="3" width="8" height="4" rx="1" /><rect x="3" y="8" width="8" height="4" rx="1" /><rect x="13" y="8" width="8" height="4" rx="1" /><rect x="3" y="13" width="8" height="4" rx="1" /><rect x="13" y="13" width="8" height="4" rx="1" /><rect x="3" y="18" width="8" height="3" rx="1" /><rect x="13" y="18" width="8" height="3" rx="1" /></svg> },
    { id: '8-grid-columns', name: '8 Grid Columns', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="2" y="3" width="2.2" height="18" rx="1" /><rect x="5" y="3" width="2.2" height="18" rx="1" /><rect x="8" y="3" width="2.2" height="18" rx="1" /><rect x="11" y="3" width="2.2" height="18" rx="1" /><rect x="14" y="3" width="2.2" height="18" rx="1" /><rect x="17" y="3" width="2.2" height="18" rx="1" /><rect x="20" y="3" width="1.5" height="18" rx="1" /></svg> },
    { id: '8-grid-rows', name: '8 Grid Rows', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="2" width="18" height="2.2" rx="1" /><rect x="3" y="5" width="18" height="2.2" rx="1" /><rect x="3" y="8" width="18" height="2.2" rx="1" /><rect x="3" y="11" width="18" height="2.2" rx="1" /><rect x="3" y="14" width="18" height="2.2" rx="1" /><rect x="3" y="17" width="18" height="2.2" rx="1" /><rect x="3" y="20" width="18" height="1.5" rx="1" /></svg> },
    { id: '9-grid', name: '9 Grid (3x3)', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="5" height="5" rx="1" /><rect x="9.5" y="3" width="5" height="5" rx="1" /><rect x="16" y="3" width="5" height="5" rx="1" /><rect x="3" y="9.5" width="5" height="5" rx="1" /><rect x="9.5" y="9.5" width="5" height="5" rx="1" /><rect x="16" y="9.5" width="5" height="5" rx="1" /><rect x="3" y="16" width="5" height="5" rx="1" /><rect x="9.5" y="16" width="5" height="5" rx="1" /><rect x="16" y="16" width="5" height="5" rx="1" /></svg> },
    { id: '12-grid-3x4', name: '12 Grid (3x4)', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="4" height="5" rx="1" /><rect x="8" y="3" width="4" height="5" rx="1" /><rect x="13" y="3" width="4" height="5" rx="1" /><rect x="18" y="3" width="3" height="5" rx="1" /></svg> },
    { id: '12-grid-4x3', name: '12 Grid (4x3)', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="5" height="4" rx="1" /><rect x="9.5" y="3" width="5" height="4" rx="1" /><rect x="16" y="3" width="5" height="4" rx="1" /><rect x="3" y="8" width="5" height="4" rx="1" /><rect x="9.5" y="8" width="5" height="4" rx="1" /><rect x="16" y="8" width="5" height="4" rx="1" /></svg> },
    { id: '16-grid', name: '16 Grid (4x4)', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="4" height="4" rx="1" /><rect x="8" y="3" width="4" height="4" rx="1" /><rect x="13" y="3" width="4" height="4" rx="1" /><rect x="18" y="3" width="3" height="4" rx="1" /><rect x="3" y="8" width="4" height="4" rx="1" /><rect x="8" y="8" width="4" height="4" rx="1" /><rect x="13" y="8" width="4" height="4" rx="1" /><rect x="18" y="8" width="3" height="4" rx="1" /></svg> },
    { id: '24-grid-4x6', name: '24 Grid (4x6)', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="2.8" height="4" rx="1" /><rect x="6.5" y="3" width="2.8" height="4" rx="1" /><rect x="10" y="3" width="2.8" height="4" rx="1" /><rect x="13.5" y="3" width="2.8" height="4" rx="1" /><rect x="17" y="3" width="2.8" height="4" rx="1" /><rect x="20.5" y="3" width="0.5" height="4" rx="1" /></svg> },
    { id: '24-grid-6x4', name: '24 Grid (6x4)', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="4" height="2.8" rx="1" /><rect x="9" y="3" width="4" height="2.8" rx="1" /><rect x="15" y="3" width="4" height="2.8" rx="1" /><rect x="3" y="6.5" width="4" height="2.8" rx="1" /></svg> },
    { id: '24-grid-rows', name: '24 Grid Rows', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="18" height="1.5" rx="1" /><rect x="3" y="5" width="18" height="1.5" rx="1" /><rect x="3" y="7" width="18" height="1.5" rx="1" /><rect x="3" y="9" width="18" height="1.5" rx="1" /><rect x="3" y="11" width="18" height="1.5" rx="1" /><rect x="3" y="13" width="18" height="1.5" rx="1" /></svg> },
    { id: '24-grid-columns', name: '24 Grid Columns', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="1.5" height="18" rx="1" /><rect x="5" y="3" width="1.5" height="18" rx="1" /><rect x="7" y="3" width="1.5" height="18" rx="1" /><rect x="9" y="3" width="1.5" height="18" rx="1" /><rect x="11" y="3" width="1.5" height="18" rx="1" /><rect x="13" y="3" width="1.5" height="18" rx="1" /></svg> },
    { id: '28-grid-4x7', name: '28 Grid (4x7)', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="2.4" height="4" rx="1" /><rect x="6" y="3" width="2.4" height="4" rx="1" /><rect x="9" y="3" width="2.4" height="4" rx="1" /><rect x="12" y="3" width="2.4" height="4" rx="1" /><rect x="15" y="3" width="2.4" height="4" rx="1" /><rect x="18" y="3" width="2.4" height="4" rx="1" /><rect x="21" y="3" width="0.5" height="4" rx="1" /></svg> },
    { id: '28-grid-7x4', name: '28 Grid (7x4)', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="4" height="2.4" rx="1" /><rect x="9" y="3" width="4" height="2.4" rx="1" /><rect x="15" y="3" width="4" height="2.4" rx="1" /><rect x="3" y="6" width="4" height="2.4" rx="1" /><rect x="9" y="6" width="4" height="2.4" rx="1" /><rect x="15" y="6" width="4" height="2.4" rx="1" /><rect x="3" y="9" width="4" height="2.4" rx="1" /></svg> },
    { id: '32-grid-4x8', name: '32 Grid (4x8)', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="2.2" height="4" rx="1" /><rect x="5.8" y="3" width="2.2" height="4" rx="1" /><rect x="8.6" y="3" width="2.2" height="4" rx="1" /><rect x="11.4" y="3" width="2.2" height="4" rx="1" /><rect x="14.2" y="3" width="2.2" height="4" rx="1" /><rect x="17" y="3" width="2.2" height="4" rx="1" /><rect x="19.8" y="3" width="1.2" height="4" rx="1" /></svg> },
    { id: '32-grid-8x4', name: '32 Grid (8x4)', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="4" height="2.2" rx="1" /><rect x="9" y="3" width="4" height="2.2" rx="1" /><rect x="15" y="3" width="4" height="2.2" rx="1" /><rect x="3" y="5.8" width="4" height="2.2" rx="1" /><rect x="9" y="5.8" width="4" height="2.2" rx="1" /><rect x="15" y="5.8" width="4" height="2.2" rx="1" /><rect x="3" y="8.6" width="4" height="2.2" rx="1" /><rect x="9" y="8.6" width="4" height="2.2" rx="1" /></svg> }
  ];

  const shouldShowPremiumOverlay = false;

  const recentlyUsedWidgets = useMemo(() => {
    const widgetIds = Object.values(widgetSlots)
      .map(slot => slot?.widgetId)
      .filter((id): id is string => Boolean(id));

    const uniqueIds = Array.from(new Set(widgetIds)).slice(0, 6);
    const widgets: Widget[] = [];

    uniqueIds.forEach(id => {
      const widget = TAB_COMPATIBLE_WIDGETS.find(w => w.id === id);
      if (widget) {
        widgets.push(widget);
      }
    });

    return widgets;
  }, [widgetSlots]);

  // Memoize tabs for settings panel to prevent unnecessary re-renders
  const settingsPanelTabs = useMemo(() => {
    return tabs.map(tab => ({
      id: tab.id,
      name: tab.name,
      layout: tab.layout,
      widgets: {}, // Convert widgetSlots to widgets format if needed
      icon: tab.icon,
      color: tab.color,
      symbol: tab.symbol,
      isFavorite: tab.isFavorite,
      order: tab.order,
      isPredefined: tab.isPredefined // Pass through isPredefined flag for details template tabs
    }));
  }, [tabs]);

  // Handler to clean up all localStorage when widget is removed
  const handleRemoveWidget = useCallback(() => {
    // Show confirmation overlay
    setIsWidgetDeleting(true);
  }, []);

  const confirmRemoveWidget = useCallback(() => {
    if (wgid) {
      // Clean up all localStorage keys associated with this widget
      clearAllTabbedWidgetStorageKeys(wgid);
    }
    
    // Call the original onRemove handler
    if (onRemove) {
      onRemove();
    }
    
    setIsWidgetDeleting(false);
  }, [wgid, onRemove]);

  const cancelRemoveWidget = useCallback(() => {
    setIsWidgetDeleting(false);
  }, []);

  if (isPremiumLocked && shouldShowPremiumOverlay) {
    return (
      <LockedWidgetOverlay
        onSettings={onSettings}
        onRemove={handleRemoveWidget}
        widgetName="Tabbed Workspace"
      />
    );
  }

  // Render tab bar
  const renderTabBar = () => (
    <div className={`relative flex items-center h-[32px] px-2 bg-widget-header gap-2 ${
      tabBarPosition === 'top' ? 'border-b border-border/50' : 'border-t border-border/50'
    }`}>
      {/* Delete Confirmation Overlay */}
      {isWidgetDeleting && (
        <div className="absolute inset-0 bg-destructive/90 px-3 flex items-center justify-between animate-slide-in-left z-50">
          <div className="flex items-center gap-1.5">
            <Trash2 className="w-3 h-3 text-white" />
            <span className="text-xs text-white">Really want to remove this tabbed widget?</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                confirmRemoveWidget();
              }}
              className="px-2 py-0.5 bg-white text-destructive text-xs rounded hover:bg-white/90 transition-colors"
            >
              Yes
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                cancelRemoveWidget();
              }}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Normal Tab Bar Content */}
      <div className={`flex items-center w-full gap-2 ${isWidgetDeleting ? 'invisible' : ''}`}>
            <div className="flex items-center gap-1 shrink-0">
              <button
                className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                title="Add Tab"
                onClick={() => setShowLayoutPicker(true)}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            </div>

            <div className="flex-1 min-w-0 h-full overflow-x-auto hide-scrollbar">
              <div className={`flex ${sortedTabs.length === 0 ? 'items-center' : 'items-end'} h-full`}>
                {isLoadingTabs ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-muted-foreground"></div>
                    <span className="text-muted-foreground text-sm">Loading tabs...</span>
                  </div>
                ) : sortedTabs.length === 0 ? (
                  <span className="text-muted-foreground text-xs">No tabs yet</span>
                ) : (
                  sortedTabs.map((t, index) => {
                    const customDashboardTabID = tabDataMap[t.id];
                    const rawTabColor = t.color;
                    const hasCustomColor = Boolean(rawTabColor && rawTabColor !== DEFAULT_TAB_COLOR);
                    const tabColor = hasCustomColor ? rawTabColor! : undefined;
                    const isActive = activeTab?.id === t.id;
                    return (
                      <div
                        key={t.id}
                        data-tabid={customDashboardTabID !== undefined ? customDashboardTabID.toString() : undefined}
                        className="relative flex items-end h-full cursor-pointer"
                        style={{
                          marginLeft: index > 0 ? '-8px' : 0,
                          zIndex: isActive ? 30 : 10 - index
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <div
                          className={`
                            relative flex items-center gap-1.5 px-4 h-[32px] min-w-[120px] max-w-[220px]
                            transition-all duration-200 group cursor-pointer
                            ${isActive 
                              ? 'bg-background text-foreground' 
                              : 'bg-popover text-muted-foreground hover:bg-muted hover:text-foreground'
                            }
                          `}
                          style={{
                            clipPath: 'polygon(8px 0%, calc(100% - 8px) 0%, 100% 100%, 0% 100%)',
                          }}
                          onClick={() => {
                            if (editingTabId !== t.id) {
                              setActiveTabId(t.id);
                            }
                          }}
                          onDoubleClick={() => {
                            if (activeTab?.id === t.id) {
                              setEditingTabId(t.id);
                              setEditingName(t.name);
                            }
                          }}
                          title="Double click to rename; click to activate"
                        >
                          {editingTabId === t.id ? (
                            <input
                              autoFocus
                              className="flex-1 text-xs bg-transparent border border-border/60 rounded-none px-1 py-0.5 outline-none focus:ring-0"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleRenameTab(t.id, editingName.trim() || t.name);
                                  setEditingTabId(null);
                                } else if (e.key === 'Escape') {
                                  setEditingTabId(null);
                                  setEditingName(t.name);
                                }
                              }}
                              onBlur={() => {
                                handleRenameTab(t.id, editingName.trim() || t.name);
                                setEditingTabId(null);
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <>
                              {/* Tab Icon/Emoji/Flag */}
                              {t.icon && (
                                <span className="shrink-0">
                                  {/* Check if it's an emoji/flag (contains emoji characters) */}
                                  {/[\u{1F000}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(t.icon) ? (
                                    <span className="text-xs">{t.icon}</span>
                                  ) : (
                                    /* It's a Lucide icon name */
                                    (() => {
                                      const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[t.icon];
                                      return IconComponent ? <IconComponent className="w-3 h-3" /> : null;
                                    })()
                                  )}
                                </span>
                              )}
                              <span className="text-xs truncate flex-1">
                                {t.name}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Active Tab Border Top Accent */}
                        {isActive && (
                          <div 
                            className="absolute top-0 left-2 right-2 h-[3px]" 
                            style={{ backgroundColor: hasCustomColor ? tabColor : 'hsl(var(--primary))' }}
                          />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-1 shrink-0">
              {/* Hide settings button for details templates */}
              {!isDetailsTemplate && (
                <button
                  className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                  title="Widget Settings"
                  onClick={handleWidgetSettingsClick}
                >
                  <Settings2 className="w-4 h-4" />
                </button>
              )}
              {/* Hide remove button for details templates */}
              {onRemove && !isDetailsTemplate && (
                <button
                  className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-muted/40 transition-colors"
                  title="Remove Widget"
                  onClick={handleRemoveWidget}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
  );

  return (
    <>
      <div
        ref={rootRef}
        className="flex flex-col h-full w-full bg-widget-body border border-border rounded-none overflow-hidden relative"
      >
          {/* Tab bar at top if position is 'top' */}
          {tabBarPosition === 'top' && renderTabBar()}
          
          <div className="flex-1 min-h-0 overflow-hidden">
            {isLoadingTabs ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p>Loading tabs...</p>
                </div>
              </div>
            ) : tabs.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-4">
                  <p className="text-muted-foreground text-sm mb-2">No tabs yet</p>
                  <p className="text-xs text-muted-foreground">
                    Click the + button {tabBarPosition === 'top' ? 'below' : 'above'} to add your first tab
                  </p>
                </div>
              </div>
            ) : tabs.length > 0 ? (
              // Render ALL tabs but hide inactive ones to prevent unmounting/remounting
              // This keeps widgets loaded and prevents refresh on tab switch
              <>
                {tabs.map((tab) => (
                  <div 
                    key={tab.id}
                    ref={tab.id === activeTabId ? containerRef : undefined}
                    className="h-full min-h-0"
                    style={{
                      display: tab.id === activeTabId ? 'block' : 'none'
                    }}
                  >
                    {renderTabContent(tab)}
                  </div>
                ))}
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                Select a tab to view its layout
              </div>
            )}
          </div>
          
          {/* Tab bar at bottom if position is 'bottom' */}
          {tabBarPosition === 'bottom' && renderTabBar()}
        </div>

      <WidgetPanel
        isOpen={showWidgetPicker}
        onClose={closeWidgetPicker}
        recentlyUsedWidgets={recentlyUsedWidgets}
        onAddWidget={handleSelectWidget}
        availableWidgets={TAB_COMPATIBLE_WIDGETS}
      />

      <Dialog open={showLayoutPicker} onOpenChange={setShowLayoutPicker}>
        <DialogContent className="max-w-2xl bg-popover border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-foreground">
              <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z"/>
              </svg>
              Select a layout for the new tab
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Choose a layout structure for your new tab
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <div className="grid grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto">
              {layouts.map((layout) => (
                <button
                  key={layout.id}
                  className="p-3 bg-popover hover:bg-muted border border-border hover:border-primary rounded-none flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => handleAddTab(layout.id)}
                  disabled={isAddingTab}
                  title={layout.name}
                >
                  <div>{layout.icon}</div>
                  <div className="truncate w-full text-center">{layout.name}</div>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={cancelDeleteTab}
        onConfirm={confirmDeleteTab}
        title="Delete Tab"
        message={`Are you sure you want to delete the tab "${deleteConfirm.tabName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
      />

      {/* Tab Settings Panel */}
      <TabMenuWidgetSettings
        key={`${wgid}-${isDetailsTemplate ? 'details' : 'regular'}`}
        isOpen={isSettingsPanelOpen}
        onClose={() => setIsSettingsPanelOpen(false)}
        tabs={settingsPanelTabs}
        tabDataMap={tabDataMap}
        getTabWidgetID={getTabWidgetID}
        getTabGridId={getTabGridId}
        tabBarPosition={tabBarPosition}
        onTabBarPositionChange={handleTabBarPositionChange}
        isDetailsTemplate={isDetailsTemplate}
        onUpdateTabs={async (updatedTabs) => {
          // Convert back to Tab format
          const newTabs: Tab[] = updatedTabs.map((tab, index) => ({
            id: tab.id,
            name: tab.name,
            layout: tab.layout,
            icon: tab.icon,
            color: tab.color,
            symbol: tab.symbol,
            isFavorite: tab.isFavorite,
            order: tab.order !== undefined ? tab.order : index
          }));
          
          // Use refs to get current state (avoid stale closure)
          const currentTabs = tabs;
          const currentTabDataMap = tabDataMapRef.current;
          
          // Detect deleted tabs (tabs that exist in current tabs but not in updated tabs)
          const updatedTabIds = new Set(newTabs.map(t => t.id));
          const deletedTabIds = currentTabs.filter(t => !updatedTabIds.has(t.id)).map(t => t.id);
          
          // Clean up localStorage entries for deleted tabs
          if (wgid && deletedTabIds.length > 0) {
            deletedTabIds.forEach(tabId => {
              clearTabStorageKeys(wgid, tabId);
            });
          }
          
          // Track deleted tabs to prevent them from being re-added by API refresh
          deletedTabIds.forEach(tabId => {
            recentlyDeletedTabIdsRef.current.add(tabId);
            // NOTE: We don't clear with timeout - stays tracked until wgid changes or page refresh
          });
          
          // If the active tab was deleted, switch to the first remaining tab
          if (activeTabId && deletedTabIds.includes(activeTabId)) {
            if (newTabs.length > 0) {
              setActiveTabId(newTabs[0].id);
            } else {
              setActiveTabId(undefined);
            }
          }
          
          // Detect new tabs (tabs that don't exist in current tabs array)
          // Check both by ID and by CustomDashboardTabID to avoid duplicates
          const existingTabIds = new Set(currentTabs.map(t => t.id));
          const existingCustomIds = new Set(Object.values(currentTabDataMap).filter(id => id !== undefined));
          
          const newTabIds = newTabs.filter(t => {
            // If tab ID exists, it's not new
            if (existingTabIds.has(t.id)) {
              return false;
            }
            
            // Check if this tab already has a CustomDashboardTabID in tabDataMap
            // (might have been saved with different ID)
            const customIdFromMap = currentTabDataMap[t.id];
            if (customIdFromMap) {
              if (existingCustomIds.has(customIdFromMap)) {
                return false;
              }
            }
            
            // Check if tab.id format indicates it's from copy API: "tab-{CustomDashboardTabID}"
            const match = t.id.match(/^tab-(\d+)$/);
            if (match) {
              const customDashboardTabID = parseInt(match[1], 10);
              if (!isNaN(customDashboardTabID)) {
                if (existingCustomIds.has(customDashboardTabID)) {
                  return false;
                }
              }
            }
            return true;
          });
          
          // Update tabDataMap for new tabs that might have CustomDashboardTabID from copy API
          // If tab.id starts with "tab-" followed by a number, extract it as CustomDashboardTabID
          const updatedTabDataMap = { ...currentTabDataMap };
          for (const newTab of newTabIds) {
            // Check if tab.id is in format "tab-{CustomDashboardTabID}" (from copy API)
            const match = newTab.id.match(/^tab-(\d+)$/);
            if (match) {
              const customDashboardTabID = parseInt(match[1], 10);
              if (!isNaN(customDashboardTabID)) {
                updatedTabDataMap[newTab.id] = customDashboardTabID;
              }
            }
          }
          
          // Only create new tabs via API if they don't already have CustomDashboardTabID
          // (i.e., they weren't created via copyDashboardTab API)
          const tabsNeedingAPI = newTabIds.filter(tab => {
            const match = tab.id.match(/^tab-(\d+)$/);
            return !match; // If it doesn't match the pattern, it needs to be created via API
          });
          
          if (tabsNeedingAPI.length > 0) {
            let tabWidgetID = getTabWidgetID();

            // Wait for actual widget ID if current ID is either generated (timestamp-based) OR is the template/dashboard ID
            if (isLikelyGeneratedTabWidgetId(tabWidgetID) || isLikelyDashboardId(tabWidgetID, activeTemplateId)) {
              const resolvedId = await waitForActualTabWidgetId();
              if (resolvedId !== null) {
                tabWidgetID = resolvedId;
              } else {
                // Could not resolve a valid TabWidgetID - skip API calls
                console.warn('[TabbedWidget] Could not resolve TabWidgetID for new tabs');
                return;
              }
            }

            // Final validation: ensure we're not using the template/dashboard ID
            if (isLikelyDashboardId(tabWidgetID, activeTemplateId)) {
              console.warn('[TabbedWidget] TabWidgetID appears to be the dashboard ID - skipping API calls');
              return;
            }
            
            for (const newTab of tabsNeedingAPI) {
              const tabGridId = getTabGridId(newTab.layout);
              
              try {
                
                const insertRequest: InsertTabWidgetRequest = {
                  TabWidgetID: tabWidgetID,
                  TabName: newTab.name,
                  TabGrid: tabGridId.toString(),
                  TabOrder: newTabs.findIndex(t => t.id === newTab.id) + 1,
                  TabIcon: newTab.icon || 'icon',
                  TabWidgetGap: '0',
                  IsPredefined: 0,
                  IsFavourite: 0,
                  TabColor: newTab.color ?? DEFAULT_TAB_COLOR
                };

                const response = await insertTabWidget(insertRequest);
                
                if (response.success !== false && response.CustomDashboardTabID) {
                  // DISABLED: Save the CustomDashboardTabID to localStorage (removed for debugging)
                  // const customTabIdStorageKey = `pmt_tabbed_widget_custom_tab_id_${wgid || 'default'}_${newTab.id}`;
                  // localStorage.setItem(customTabIdStorageKey, response.CustomDashboardTabID.toString());
                  
                  // Update tabDataMap immediately
                  updatedTabDataMap[newTab.id] = response.CustomDashboardTabID!;
                }
              } catch {
                // Error saving new tab to API
              }
            }
          }
          
          // Check if tabs were reordered (same IDs but different positions)
          const currentTabIds = currentTabs.map(t => t.id);
          const reorderedTabIds = newTabs.map(t => t.id);
          const isReorder = 
            currentTabIds.length === reorderedTabIds.length &&
            currentTabIds.every(id => reorderedTabIds.includes(id)) &&
            JSON.stringify(currentTabIds) !== JSON.stringify(reorderedTabIds);
          
          // If it's a reorder, use the new order from newTabs; otherwise preserve order for property changes
          const preservedOrderTabs: Tab[] = [];
          const newTabsMap = new Map(newTabs.map(t => [t.id, t]));
          
          if (isReorder) {
            // For reorders, use the new order from newTabs
            newTabs.forEach((newTab, index) => {
              const currentTab = currentTabs.find(t => t.id === newTab.id);
              if (currentTab) {
                preservedOrderTabs.push({
                  ...currentTab,
                  name: newTab.name,
                  color: newTab.color,
                  icon: newTab.icon,
                  symbol: newTab.symbol,
                  isFavorite: newTab.isFavorite,
                  layout: newTab.layout,
                  order: index // Use new position
                });
                newTabsMap.delete(newTab.id);
              }
            });
          } else {
            // For property changes only, preserve the current order
            currentTabs.forEach(currentTab => {
              const updatedTab = newTabsMap.get(currentTab.id);
              if (updatedTab) {
                preservedOrderTabs.push({
                  ...currentTab,
                  name: updatedTab.name,
                  color: updatedTab.color,
                  icon: updatedTab.icon,
                  symbol: updatedTab.symbol,
                  isFavorite: updatedTab.isFavorite,
                  layout: updatedTab.layout,
                  // Keep the current order property to preserve position
                  order: currentTab.order !== undefined ? currentTab.order : preservedOrderTabs.length
                });
                newTabsMap.delete(currentTab.id);
              }
            });
          }
          
          // Then, add any new tabs (that weren't in currentTabs)
          newTabsMap.forEach(newTab => {
            preservedOrderTabs.push({
              ...newTab,
              order: newTab.order !== undefined ? newTab.order : preservedOrderTabs.length
            });
          });
          
          // Detect modified tabs (tabs that exist in both current and updated, but with changed properties)
          // Focus on color and name changes which need to be saved to the API
          const modifiedTabs = preservedOrderTabs.filter(updatedTab => {
            const currentTab = currentTabs.find(t => t.id === updatedTab.id);
            if (!currentTab) return false; // Not modified, it's a new tab
            
            // Check if color or name changed
            return currentTab.color !== updatedTab.color || currentTab.name !== updatedTab.name;
          });
          
          // Save color changes to API using updateTabWidget
          if (modifiedTabs.length > 0) {
            let tabWidgetID = getTabWidgetID();
            
            // Wait for actual widget ID if current ID is either generated (timestamp-based) OR is the template/dashboard ID
            if (isLikelyGeneratedTabWidgetId(tabWidgetID) || isLikelyDashboardId(tabWidgetID, activeTemplateId)) {
              const resolvedId = await waitForActualTabWidgetId();
              if (resolvedId !== null) {
                tabWidgetID = resolvedId;
              } else {
                // Can't update without valid TabWidgetID
                console.warn('[TabbedWidget] Could not resolve TabWidgetID for modified tabs');
                return;
              }
            }

            // Final validation: ensure we're not using the template/dashboard ID
            if (isLikelyDashboardId(tabWidgetID, activeTemplateId)) {
              console.warn('[TabbedWidget] TabWidgetID appears to be the dashboard ID - skipping updates');
              return;
            }
            
            for (const modifiedTab of modifiedTabs) {
              const customDashboardTabID = currentTabDataMap[modifiedTab.id];
              if (customDashboardTabID) {
                try {
                  const tabGridId = getTabGridId(modifiedTab.layout);
                  await updateTabWidget({
                    CustomDashboardTabID: customDashboardTabID,
                    TabWidgetID: tabWidgetID,
                    TabName: modifiedTab.name,
                    TabGrid: tabGridId,
                    TabColor: modifiedTab.color ?? DEFAULT_TAB_COLOR,
                    TabOrder: modifiedTab.order !== undefined ? modifiedTab.order + 1 : undefined, // API uses 1-based order
                    TabIcon: modifiedTab.icon || 'icon',
                    TabWidgetGap: '0',
                    IsPredefined: 0,
                    IsFavourite: modifiedTab.isFavorite ? 1 : 0
                  });
                } catch {
                  // Error updating tab widget - continue with other updates
                }
              }
            }
          }
          
          // Update both tabs and tabDataMap (preserving order)
          setTabs(preservedOrderTabs);
          if (Object.keys(updatedTabDataMap).length > Object.keys(currentTabDataMap).length) {
            setTabDataMap(updatedTabDataMap);
          }
          
          // Check if this is just a property change (rename, color, icon) or reorder
          // For these operations, the TabMenuWidgetSettings already calls the appropriate API
          // so we don't need to refresh from API (which might return stale data before the API save completes)
          const isPropertyChangeOrReorder = 
            deletedTabIds.length === 0 && 
            newTabIds.length === 0 && 
            tabsNeedingAPI.length === 0 &&
            currentTabs.length === newTabs.length &&
            currentTabs.every(tab => newTabs.some(nt => nt.id === tab.id));
          
          // Only refresh tabs from API if there were new tabs added or tabs deleted
          // Skip refresh for property changes (rename, color, icon) and reorders since:
          // - TabMenuWidgetSettings already saves these changes via its own API calls
          // - Fetching from API might return stale data before those API saves complete
          if (!isPropertyChangeOrReorder) {
            // Refresh tabs from API to ensure we have the latest state
            // Force refresh to bypass cache and get the updated tabs
            // This ensures any new tabs created via the settings panel appear immediately
            await fetchAllTabWidgets(true);
          }
        }}
        activeTabId={activeTabId || ''}
        onSetActiveTab={setActiveTabId}
      />

      {/* Child Widget Settings Panel */}
      {childWidgetSettingsSlotKey && (() => {
        // Use isDetailsTemplate to determine if module/symbol should be locked
        // Details templates (symbol-based names like EURUSD, NASDAQ:AAPL) have all widgets locked
        const widgetSlot = widgetSlots[childWidgetSettingsSlotKey];
        
        return (
          <WidgetSettingsSlideIn
            isOpen={childWidgetSettingsOpen}
            onClose={() => setChildWidgetSettingsOpen(false)}
            widgetType={childWidgetSettingsType}
            widgetPosition={childWidgetSettingsSlotKey}
            currentSettings={(widgetSlot?.settings || {}) as WidgetSettings}
            onSave={handleSaveChildWidgetSettings}
            isModuleLocked={isDetailsTemplate}
            isSymbolLocked={isDetailsTemplate}
          />
        );
      })()}
      
      {/* Toast Notification */}
      {toast.isVisible && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg transition-all duration-300 text-sm font-medium">
          {toast.message}
        </div>
      )}
      
      {/* Child Widget Fullscreen Modal - rendered via portal to escape stacking context */}
      {fullscreenChildSlotKey && typeof document !== 'undefined' && (() => {
        const slot = widgetSlots[fullscreenChildSlotKey];
        if (!slot?.widgetId) return null;
        
        const widget = availableWidgets.find(w => w.id === slot.widgetId);
        const FullscreenWidgetComponent = WidgetComponents[slot.widgetId];
        
        if (!widget || !FullscreenWidgetComponent) return null;
        
        return createPortal(
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9998]"
              onClick={() => setFullscreenChildSlotKey(null)}
            />
            
            {/* Fullscreen Widget Container */}
            <div className="fixed inset-0 z-[9999] bg-widget-body border border-border overflow-hidden flex flex-col">
              <div className="h-full w-full flex flex-col">
                <FullscreenWidgetComponent
                  wgid={`${wgid}-${fullscreenChildSlotKey}`}
                  onRemove={undefined}
                  {...(shouldShowSettingsIcon(slot.widgetId!, isDetailsTemplate) ? {
                    onSettings: () => handleChildWidgetSettings(fullscreenChildSlotKey, slot.widgetId!)
                  } : {})}
                  onSaveSettings={(settingsToSave: Record<string, any>) => handleChildWidgetInlineSave(fullscreenChildSlotKey, settingsToSave)}
                  onFullscreen={() => setFullscreenChildSlotKey(null)}
                  isSymbolLocked={isDetailsTemplate}
                  settings={{ ...slot.settings, isFullscreenView: true }}
                />
              </div>
            </div>
            
            {/* Settings Panel for Fullscreen Widget - rendered at higher z-index */}
            {childWidgetSettingsOpen && childWidgetSettingsSlotKey === fullscreenChildSlotKey && (() => {
              const widgetSlot = widgetSlots[fullscreenChildSlotKey];
              if (!widgetSlot) return null;
              
              return (
                <>
                  {/* Settings Backdrop - dims the fullscreen widget */}
                  <div 
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999]"
                    onClick={() => setChildWidgetSettingsOpen(false)}
                  />
                  
                  <div className="z-[10000]">
                    <WidgetSettingsSlideIn
                      isOpen={childWidgetSettingsOpen}
                      onClose={() => setChildWidgetSettingsOpen(false)}
                      widgetType={childWidgetSettingsType}
                      widgetPosition={fullscreenChildSlotKey}
                      currentSettings={(widgetSlot?.settings || {}) as WidgetSettings}
                      onSave={handleSaveChildWidgetSettings}
                      isModuleLocked={isDetailsTemplate}
                      isSymbolLocked={isDetailsTemplate}
                    />
                  </div>
                </>
              );
            })()}
          </>,
          document.body
        );
      })()}
    </>
  );
}
