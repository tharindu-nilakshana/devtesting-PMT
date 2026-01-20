/**
 * Tabbed Widget Local Storage Utility
 * 
 * Handles saving and loading tabbed widget state to/from localStorage
 * to persist tabs, active tab, widget slots, and grid sizes across page refreshes.
 */

export interface TabbedWidgetState {
  tabs: Array<{
    id: string;
    name: string;
    layout: string;
    color?: string;
    icon?: string;
    order: number;
  }>;
  activeTabId?: string;
  tabBarPosition?: "top" | "bottom";
  widgetSlots: Record<string, {
    widgetId: string;
    settings: Record<string, unknown>;
  }>;
  gridSizes: Record<string, number[]>;
  lastModified: number; // timestamp for sync conflict resolution
  version: number; // increment on each change
}

const STORAGE_PREFIX = 'pmt_tabbed_widget_';

/**
 * Get storage key for a specific tabbed widget instance
 */
function getStorageKey(wgid: string): string {
  return `${STORAGE_PREFIX}${wgid}`;
}

/**
 * Save tabbed widget state to localStorage
 */
export function saveTabbedWidgetState(wgid: string, state: TabbedWidgetState): void {
  if (!wgid) {
    return;
  }

  try {
    // Ensure version and lastModified exist
    const stateToSave: TabbedWidgetState = {
      ...state,
      version: state.version || 1,
      lastModified: state.lastModified || Date.now()
    };

    const storageKey = getStorageKey(wgid);
    const serializedState = JSON.stringify(stateToSave);
    localStorage.setItem(storageKey, serializedState);
  } catch (error) {
    console.error('❌ [TabbedWidgetStorage] Error saving to localStorage:', error);
  }
}

/**
 * Load tabbed widget state from localStorage
 */
export function loadTabbedWidgetState(wgid: string): TabbedWidgetState | null {
  if (!wgid) {
    return null;
  }

  try {
    const storageKey = getStorageKey(wgid);
    const serializedState = localStorage.getItem(storageKey);
    
    if (!serializedState) {
      return null;
    }
    
    const state = JSON.parse(serializedState) as TabbedWidgetState;
    
    // Ensure backward compatibility - add version/lastModified if missing
    if (!state.version) {
      state.version = 1;
    }
    if (!state.lastModified) {
      state.lastModified = Date.now();
    }
    
    // Ensure tabs have order property
    if (state.tabs) {
      state.tabs = state.tabs.map((tab, index) => ({
        ...tab,
        order: tab.order !== undefined ? tab.order : index
      }));
    }
    
    return state;
  } catch (error) {
    console.error('❌ [TabbedWidgetStorage] Error loading from localStorage:', error);
    return null;
  }
}

/**
 * Clear saved tabbed widget state
 */
export function clearTabbedWidgetState(wgid: string): void {
  if (!wgid) {
    return;
  }

  try {
    const storageKey = getStorageKey(wgid);
    localStorage.removeItem(storageKey);
  } catch (error) {
    // Silent fail
  }
}

/**
 * Check if tabbed widget state exists in localStorage
 */
export function hasTabbedWidgetState(wgid: string): boolean {
  if (!wgid) {
    return false;
  }

  try {
    const storageKey = getStorageKey(wgid);
    return localStorage.getItem(storageKey) !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Update specific parts of tabbed widget state
 */
export function updateTabbedWidgetState(
  wgid: string,
  updates: Partial<TabbedWidgetState>
): void {
  if (!wgid) {
    return;
  }

  const currentState = loadTabbedWidgetState(wgid) || {
    tabs: [],
    widgetSlots: {},
    gridSizes: {}
  };

  const updatedState: TabbedWidgetState = {
    ...currentState,
    ...updates
  };

  saveTabbedWidgetState(wgid, updatedState);
}

/**
 * Clear all localStorage keys associated with a specific tab
 */
export function clearTabStorageKeys(wgid: string, tabId: string): void {
  if (!wgid || !tabId) {
    return;
  }

  try {
    // Remove CustomDashboardTabID for this tab
    const customTabIdStorageKey = `pmt_tabbed_widget_custom_tab_id_${wgid}_${tabId}`;
    localStorage.removeItem(customTabIdStorageKey);
    
    // Remove tabid for this tab
    const tabIdStorageKey = `pmt_tabbed_widget_tabid_${wgid}_${tabId}`;
    localStorage.removeItem(tabIdStorageKey);
  } catch (error) {
    // Silent fail
  }
}

/**
 * Clear ALL localStorage keys associated with a tabbed widget (including all tabs)
 */
export function clearAllTabbedWidgetStorageKeys(wgid: string): void {
  if (!wgid) {
    return;
  }

  try {
    // 1. Get the widget state to find CustomDashboardTabIDs before clearing
    const widgetState = loadTabbedWidgetState(wgid);
    const customTabIds: number[] = [];
    
    // Collect CustomDashboardTabIDs from localStorage keys
    const customTabIdPrefix = `pmt_tabbed_widget_custom_tab_id_${wgid}_`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(customTabIdPrefix)) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const customTabId = parseInt(value, 10);
            if (!isNaN(customTabId)) {
              customTabIds.push(customTabId);
            }
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
    
    // 2. Remove these tabs from pmt_tab_widgets
    if (customTabIds.length > 0) {
      try {
        const tabWidgetsKey = 'pmt_tab_widgets';
        const stored = localStorage.getItem(tabWidgetsKey);
        if (stored) {
          const tabWidgetsData = JSON.parse(stored);
          if (tabWidgetsData.Data && Array.isArray(tabWidgetsData.Data)) {
            // Filter out tabs that belong to this widget
            const filteredData = tabWidgetsData.Data.filter(
              (tab: { CustomDashboardTabID: number }) => !customTabIds.includes(tab.CustomDashboardTabID)
            );
            tabWidgetsData.Data = filteredData;
            tabWidgetsData.Count = filteredData.length;
            localStorage.setItem(tabWidgetsKey, JSON.stringify(tabWidgetsData));
            console.log(`✅ [TabbedWidgetStorage] Removed ${customTabIds.length} tabs from pmt_tab_widgets for widget ${wgid}`);
          }
        }
      } catch (error) {
        console.error('❌ [TabbedWidgetStorage] Failed to update pmt_tab_widgets:', error);
      }
    }
    
    // 3. Clear main widget state
    const mainStorageKey = getStorageKey(wgid);
    localStorage.removeItem(mainStorageKey);
    
    // 4. Clear TabWidgetID
    const tabWidgetIdKey = `pmt_tabbed_widget_id_${wgid}`;
    localStorage.removeItem(tabWidgetIdKey);
    
    // 5. Clear all tab-specific keys by iterating through localStorage
    // This handles tabs even if we don't have the tab IDs in memory
    const tabIdPrefix = `pmt_tabbed_widget_tabid_${wgid}_`;
    
    const keysToRemove: string[] = [];
    
    // Collect all keys that belong to this widget
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith(customTabIdPrefix) || key.startsWith(tabIdPrefix))) {
        keysToRemove.push(key);
      }
    }
    
    // Remove collected keys
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    console.log(`✅ [TabbedWidgetStorage] Cleared all storage keys for widget ${wgid}`);
  } catch (error) {
    console.error('❌ [TabbedWidgetStorage] Error clearing widget storage keys:', error);
  }
}

/**
 * Update tab properties (name, color, order, etc.)
 */
export function updateTabProperties(
  wgid: string,
  tabId: string,
  updates: { name?: string; color?: string; order?: number; icon?: string; layout?: string }
): void {
  if (!wgid || !tabId) {
    return;
  }

  const currentState = loadTabbedWidgetState(wgid);
  if (!currentState) {
    return;
  }

  const tabIndex = currentState.tabs.findIndex(tab => tab.id === tabId);
  if (tabIndex === -1) {
    return;
  }

  // Update tab properties
  currentState.tabs[tabIndex] = {
    ...currentState.tabs[tabIndex],
    ...updates
  };

  // Update version and timestamp
  currentState.version = (currentState.version || 0) + 1;
  currentState.lastModified = Date.now();

  saveTabbedWidgetState(wgid, currentState);
}

/**
 * Update tab order - reorder tabs based on provided tab IDs array
 */
export function updateTabOrder(wgid: string, orderedTabIds: string[]): void {
  if (!wgid || !orderedTabIds || orderedTabIds.length === 0) {
    return;
  }

  const currentState = loadTabbedWidgetState(wgid);
  if (!currentState) {
    return;
  }

  // Create a map of tabs for quick lookup
  const tabMap = new Map(currentState.tabs.map(tab => [tab.id, tab]));

  // Reorder tabs and update their order property
  const reorderedTabs = orderedTabIds
    .map((tabId, index) => {
      const tab = tabMap.get(tabId);
      if (tab) {
        return { ...tab, order: index };
      }
      return null;
    })
    .filter((tab): tab is NonNullable<typeof tab> => tab !== null);

  currentState.tabs = reorderedTabs;
  currentState.version = (currentState.version || 0) + 1;
  currentState.lastModified = Date.now();

  saveTabbedWidgetState(wgid, currentState);
}

/**
 * Update or add a widget slot
 */
export function updateWidgetSlot(
  wgid: string,
  slotKey: string,
  widgetSlot: { widgetId: string; settings: Record<string, unknown> }
): void {
  if (!wgid || !slotKey) {
    return;
  }

  const currentState = loadTabbedWidgetState(wgid);
  if (!currentState) {
    return;
  }

  currentState.widgetSlots[slotKey] = widgetSlot;
  currentState.version = (currentState.version || 0) + 1;
  currentState.lastModified = Date.now();

  saveTabbedWidgetState(wgid, currentState);
}

/**
 * Remove a widget slot
 */
export function removeWidgetSlot(wgid: string, slotKey: string): void {
  if (!wgid || !slotKey) {
    return;
  }

  const currentState = loadTabbedWidgetState(wgid);
  if (!currentState) {
    return;
  }

  delete currentState.widgetSlots[slotKey];
  currentState.version = (currentState.version || 0) + 1;
  currentState.lastModified = Date.now();

  saveTabbedWidgetState(wgid, currentState);
}

/**
 * Update grid sizes for a specific tab
 */
export function updateGridSizes(wgid: string, tabId: string, sizes: number[]): void {
  if (!wgid || !tabId || !sizes) {
    return;
  }

  const currentState = loadTabbedWidgetState(wgid);
  if (!currentState) {
    return;
  }

  currentState.gridSizes[tabId] = sizes;
  currentState.version = (currentState.version || 0) + 1;
  currentState.lastModified = Date.now();

  saveTabbedWidgetState(wgid, currentState);
}

/**
 * Add a new tab
 */
export function addTab(
  wgid: string,
  tab: { id: string; name: string; layout: string; color?: string; icon?: string; order: number }
): void {
  if (!wgid || !tab) {
    return;
  }

  const currentState = loadTabbedWidgetState(wgid);
  if (!currentState) {
    return;
  }

  currentState.tabs.push(tab);
  currentState.version = (currentState.version || 0) + 1;
  currentState.lastModified = Date.now();

  saveTabbedWidgetState(wgid, currentState);
}

/**
 * Remove a tab and its associated data
 */
export function removeTab(wgid: string, tabId: string): void {
  if (!wgid || !tabId) {
    return;
  }

  const currentState = loadTabbedWidgetState(wgid);
  if (!currentState) {
    return;
  }

  // Remove tab
  currentState.tabs = currentState.tabs.filter(tab => tab.id !== tabId);

  // Remove widget slots for this tab
  Object.keys(currentState.widgetSlots).forEach(slotKey => {
    if (slotKey.startsWith(`${tabId}-`)) {
      delete currentState.widgetSlots[slotKey];
    }
  });

  // Remove grid sizes for this tab
  delete currentState.gridSizes[tabId];

  currentState.version = (currentState.version || 0) + 1;
  currentState.lastModified = Date.now();

  saveTabbedWidgetState(wgid, currentState);
  
  // Clean up additional storage keys
  clearTabStorageKeys(wgid, tabId);
}

/**
 * Update active tab ID
 */
export function updateActiveTab(wgid: string, activeTabId: string): void {
  if (!wgid || !activeTabId) {
    return;
  }

  const currentState = loadTabbedWidgetState(wgid);
  if (!currentState) {
    return;
  }

  currentState.activeTabId = activeTabId;
  currentState.version = (currentState.version || 0) + 1;
  currentState.lastModified = Date.now();

  saveTabbedWidgetState(wgid, currentState);
}


