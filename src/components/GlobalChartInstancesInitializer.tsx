"use client";

import { useEffect } from 'react';
import { initializeGlobalChartInstances } from '../utils/globalChartInstances';
import { initializeGlobalWidgetOptions } from '../utils/globalWidgetOptions';

/**
 * GlobalChartInstancesInitializer
 * 
 * This component initializes the global chart instance storage and widget options
 * on the client side. It runs once when the application mounts.
 */
export default function GlobalChartInstancesInitializer() {
  useEffect(() => {
    // Initialize global chart instances storage
    initializeGlobalChartInstances();
    
    // Initialize global widget options storage
    initializeGlobalWidgetOptions();
  }, []);

  // This component doesn't render anything
  return null;
}
