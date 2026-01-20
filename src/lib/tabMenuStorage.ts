/**
 * Tab Menu Widget Local Storage Utility
 * 
 * Handles saving and loading tab menu widget state to/from localStorage
 * to persist tabs, active tab, widgets, and layouts across page refreshes.
 */

export interface TabMenuWidgetState {
  tabs: Array<{
    id: string;
    name: string;
    layout: string;
    widgets: Record<string, string>;
    icon?: string;
    color?: string;
    symbol?: string;
  }>;
  activeTabId: string;
  tabCounter: number;
  lastModified: number;
  version: number;
}

const STORAGE_PREFIX = 'pmt_tab_menu_widget_';

/**
 * Get storage key for a specific tab menu widget instance
 */
function getStorageKey(wgid: string): string {
  return `${STORAGE_PREFIX}${wgid}`;
}

/**
 * Save tab menu widget state to localStorage
 */
export function saveTabMenuWidgetState(wgid: string, state: TabMenuWidgetState): void {
  if (!wgid) {
    return;
  }

  try {
    const stateToSave: TabMenuWidgetState = {
      ...state,
      version: state.version || 1,
      lastModified: state.lastModified || Date.now()
    };

    const storageKey = getStorageKey(wgid);
    const serializedState = JSON.stringify(stateToSave);
    localStorage.setItem(storageKey, serializedState);
  } catch (error) {
    console.error('❌ [TabMenuStorage] Error saving to localStorage:', error);
  }
}

/**
 * Load tab menu widget state from localStorage
 */
export function loadTabMenuWidgetState(wgid: string): TabMenuWidgetState | null {
  if (!wgid) {
    return null;
  }

  try {
    const storageKey = getStorageKey(wgid);
    const serializedState = localStorage.getItem(storageKey);
    
    if (!serializedState) {
      return null;
    }
    
    const state = JSON.parse(serializedState) as TabMenuWidgetState;
    
    // Ensure backward compatibility
    if (!state.version) {
      state.version = 1;
    }
    if (!state.lastModified) {
      state.lastModified = Date.now();
    }
    
    return state;
  } catch (error) {
    console.error('❌ [TabMenuStorage] Error loading from localStorage:', error);
    return null;
  }
}

/**
 * Clear tab menu widget state from localStorage
 */
export function clearTabMenuWidgetState(wgid: string): void {
  if (!wgid) {
    return;
  }

  try {
    const storageKey = getStorageKey(wgid);
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.error('❌ [TabMenuStorage] Error clearing from localStorage:', error);
  }
}

/**
 * Clear all tab menu widget states from localStorage
 */
export function clearAllTabMenuWidgetStates(): void {
  try {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('❌ [TabMenuStorage] Error clearing all from localStorage:', error);
  }
}
