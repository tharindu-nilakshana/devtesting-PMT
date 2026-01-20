/**
 * Global Chart Instance Storage
 * 
 * This module provides global storage for chart instances, matching the original
 * prime_dashboard.js implementation using window.riskChartInstances and window.riskBarChartInstances.
 */

// Extend Window interface to include our chart instances
declare global {
  interface Window {
    riskChartInstances: Record<string, RiskChartInstance>;
    riskBarChartInstances: Record<string, RiskBarChartInstance>;
  }
}

// Risk Chart Instance (Gauge/Radar Chart)
export interface RiskChartInstance {
  root?: unknown;
  chart?: unknown;
  axisDataItem?: unknown;
  title?: unknown;
  // For our current SVG implementation
  svgElement?: SVGElement | null;
  needleElement?: Element | null;
  titleElement?: Element | null;
  // For AmCharts implementation
  amChartInstance?: unknown; // AmChartInstance from widget-specific implementation
}

// Risk Bar Chart Instance
export interface RiskBarChartInstance {
  chart?: unknown;
  dataProvider?: unknown;
  // For our current SVG implementation
  svgElement?: SVGElement | null;
  barsContainer?: Element | null;
}

/**
 * Initialize global chart instance storage
 * This should be called once when the application starts
 */
export function initializeGlobalChartInstances(): void {
  if (typeof window !== 'undefined') {
    window.riskChartInstances = window.riskChartInstances || {};
    window.riskBarChartInstances = window.riskBarChartInstances || {};
    console.log('🌐 [GlobalChartInstances] Initialized global chart instance storage');
  }
}

/**
 * Store a risk chart instance globally
 * @param wgid Widget ID
 * @param instance Chart instance to store
 */
export function storeRiskChartInstance(wgid: string, instance: RiskChartInstance): void {
  if (typeof window !== 'undefined') {
    window.riskChartInstances[wgid] = instance;
    console.log('💾 [GlobalChartInstances] Stored risk chart instance for widget:', wgid);
  }
}

/**
 * Store a risk bar chart instance globally
 * @param wgid Widget ID
 * @param instance Bar chart instance to store
 */
export function storeRiskBarChartInstance(wgid: string, instance: RiskBarChartInstance): void {
  if (typeof window !== 'undefined') {
    window.riskBarChartInstances[wgid] = instance;
    console.log('💾 [GlobalChartInstances] Stored risk bar chart instance for widget:', wgid);
  }
}

/**
 * Get a risk chart instance from global storage
 * @param wgid Widget ID
 * @returns Chart instance or undefined
 */
export function getRiskChartInstance(wgid: string): RiskChartInstance | undefined {
  if (typeof window !== 'undefined') {
    return window.riskChartInstances[wgid];
  }
  return undefined;
}

/**
 * Get a risk bar chart instance from global storage
 * @param wgid Widget ID
 * @returns Bar chart instance or undefined
 */
export function getRiskBarChartInstance(wgid: string): RiskBarChartInstance | undefined {
  if (typeof window !== 'undefined') {
    return window.riskBarChartInstances[wgid];
  }
  return undefined;
}

/**
 * Remove a risk chart instance from global storage
 * @param wgid Widget ID
 */
export function removeRiskChartInstance(wgid: string): void {
  if (typeof window !== 'undefined') {
    delete window.riskChartInstances[wgid];
    console.log('🗑️ [GlobalChartInstances] Removed risk chart instance for widget:', wgid);
  }
}

/**
 * Remove a risk bar chart instance from global storage
 * @param wgid Widget ID
 */
export function removeRiskBarChartInstance(wgid: string): void {
  if (typeof window !== 'undefined') {
    delete window.riskBarChartInstances[wgid];
    console.log('🗑️ [GlobalChartInstances] Removed risk bar chart instance for widget:', wgid);
  }
}

/**
 * Check if a risk chart instance exists
 * @param wgid Widget ID
 * @returns True if instance exists
 */
export function hasRiskChartInstance(wgid: string): boolean {
  if (typeof window !== 'undefined') {
    return wgid in window.riskChartInstances;
  }
  return false;
}

/**
 * Check if a risk bar chart instance exists
 * @param wgid Widget ID
 * @returns True if instance exists
 */
export function hasRiskBarChartInstance(wgid: string): boolean {
  if (typeof window !== 'undefined') {
    return wgid in window.riskBarChartInstances;
  }
  return false;
}

/**
 * Get all stored chart instances (for debugging)
 * @returns Object containing all chart instances
 */
export function getAllChartInstances(): {
  riskCharts: Record<string, RiskChartInstance>;
  riskBarCharts: Record<string, RiskBarChartInstance>;
} {
  if (typeof window !== 'undefined') {
    return {
      riskCharts: window.riskChartInstances || {},
      riskBarCharts: window.riskBarChartInstances || {}
    };
  }
  return { riskCharts: {}, riskBarCharts: {} };
}

/**
 * Clear all chart instances (for cleanup)
 */
export function clearAllChartInstances(): void {
  if (typeof window !== 'undefined') {
    window.riskChartInstances = {};
    window.riskBarChartInstances = {};
    console.log('🧹 [GlobalChartInstances] Cleared all chart instances');
  }
}
