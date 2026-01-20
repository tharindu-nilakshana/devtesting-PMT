/**
 * @file FootprintChart.tsx
 * @description React wrapper component for the ChartController
 */

'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { ChartController } from '../core/ChartController';
import { useFootprintStore } from '../state/footprintStore';
import { Trade, ChartSettings } from '../types';

interface FootprintChartProps {
  data: Trade[];
}

export const FootprintChart: React.FC<FootprintChartProps> = ({ data }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<ChartController | null>(null);

  // Get settings from store
  const { state, getActiveTheme } = useFootprintStore();
  const {
    instrument,
    chartType,
    timeframe,
    tickMultiplier,
    showHeatmap,
    showCandlesticks,
    showDOM,
    showPOC,
    showValueArea,
    showImbalances,
    activeTool,
    drawings,
  } = state;

  // Memoize settings object
  const settings = useMemo<Partial<ChartSettings>>(() => ({
    instrument,
    chartType,
    timeframe,
    tickMultiplier,
    showHeatmap,
    showCandlesticks,
    showDOM,
    showPOC,
    showValueArea,
    showImbalances,
    activeTool: activeTool ?? undefined,
    drawings,
    theme: getActiveTheme()
  }), [
    instrument, chartType, timeframe, tickMultiplier,
    showHeatmap, showCandlesticks, showDOM, showPOC,
    showValueArea, showImbalances, activeTool, drawings,
    getActiveTheme
  ]);

  // Initialize controller
  useEffect(() => {
    if (containerRef.current && !controllerRef.current) {
      controllerRef.current = new ChartController(containerRef.current);
    }

    return () => {
      if (controllerRef.current) {
        controllerRef.current.destroy();
        controllerRef.current = null;
      }
    };
  }, []);

  // Update data
  useEffect(() => {
    if (controllerRef.current && data) {
      controllerRef.current.updateData(data);
    }
  }, [data]);

  // Update settings
  useEffect(() => {
    if (controllerRef.current) {
      controllerRef.current.updateSettings(settings);
    }
  }, [settings]);

  // Handle external data requests (for AI analysis)
  useEffect(() => {
    const handleRequest = () => {
      if (controllerRef.current) {
        const candles = controllerRef.current.getVisibleCandles();
        window.dispatchEvent(
          new CustomEvent('footprint-data-response', { detail: candles.slice(-15) })
        );
      }
    };

    window.addEventListener('request-footprint-data', handleRequest);
    return () => window.removeEventListener('request-footprint-data', handleRequest);
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative"
      style={{
        backgroundColor: 'var(--color-background-primary, #131722)',
        cursor: activeTool === 'cursor' ? 'default' : 'crosshair'
      }}
    />
  );
};

export default FootprintChart;
