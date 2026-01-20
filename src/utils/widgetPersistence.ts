/**
 * Widget Persistence Utility
 * 
 * Handles saving and loading widget state to/from localStorage
 * to persist widgets across page refreshes.
 */

export interface WidgetState {
  widgets: { [key: string]: unknown };
  selectedLayout: string;
  gridSizes: { [key: string]: number[] };
  freeFloatingWidgets: unknown[];
  recentWidgets: unknown[];
}

const STORAGE_KEY = 'pmt_dashboard_state';

/**
 * Save widget state to localStorage
 */
export function saveWidgetState(state: WidgetState): void {
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serializedState);
    console.log('✅ Widget state saved to localStorage');
  } catch (error) {
    console.error('❌ Failed to save widget state:', error);
  }
}

/**
 * Load widget state from localStorage
 */
export function loadWidgetState(): WidgetState | null {
  try {
    const serializedState = localStorage.getItem(STORAGE_KEY);
    if (!serializedState) {
      console.log('📭 No saved widget state found');
      return null;
    }
    
    const state = JSON.parse(serializedState);
    console.log('✅ Widget state loaded from localStorage');
    return state;
  } catch (error) {
    console.error('❌ Failed to load widget state:', error);
    return null;
  }
}

/**
 * Clear saved widget state
 */
export function clearWidgetState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('🗑️ Widget state cleared from localStorage');
  } catch (error) {
    console.error('❌ Failed to clear widget state:', error);
  }
}

/**
 * Check if widget state exists in localStorage
 */
export function hasSavedWidgetState(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch (error) {
    console.error('❌ Failed to check widget state:', error);
    return false;
  }
}

/**
 * Get widget state size in bytes
 */
export function getWidgetStateSize(): number {
  try {
    const serializedState = localStorage.getItem(STORAGE_KEY);
    return serializedState ? new Blob([serializedState]).size : 0;
  } catch (error) {
    console.error('❌ Failed to get widget state size:', error);
    return 0;
  }
}






