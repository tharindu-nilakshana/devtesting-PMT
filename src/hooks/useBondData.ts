'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchBondYields, transformToChartData, getDateRange } from '@/utils/bondApi';
import { ChartDataPoint, BondDataStatus, BondStats, TimeRangePreset, BondYieldsRequest } from '@/types/bond';

interface UseBondDataOptions {
  symbol: string;
  timeRange?: TimeRangePreset;
  startDate?: string;
  endDate?: string;
  limit?: number;
  enabled?: boolean;
}

interface UseBondDataReturn {
  data: ChartDataPoint[];
  status: BondDataStatus;
  error: Error | null;
  refetch: () => void;
  stats: BondStats | null;
  lastUpdated: Date | null;
}

export function useBondData({
  symbol,
  timeRange = '1M',
  startDate,
  endDate,
  limit = 1000,
  enabled = true,
}: UseBondDataOptions): UseBondDataReturn {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [status, setStatus] = useState<BondDataStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [stats, setStats] = useState<BondStats | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const isFirstLoad = useRef(true);

  const calculateStats = useCallback((chartData: ChartDataPoint[]): BondStats | null => {
    if (chartData.length === 0) return null;

    const values = chartData.map(d => d.value);
    const current = values[values.length - 1];
    const first = values[0];
    const high = Math.max(...values);
    const low = Math.min(...values);
    const change = current - first;
    const changePercent = (change / first) * 100;
    const roc = changePercent;

    return {
      current,
      high,
      low,
      change,
      changePercent,
      roc,
    };
  }, []);

  const fetchData = useCallback(async () => {
    if (!enabled || !symbol) return;

    // Only set loading on first load to avoid flickering
    if (isFirstLoad.current) {
      setStatus('loading');
    }
    setError(null);

    try {
      const dateRange = startDate && endDate
        ? { start: startDate, end: endDate }
        : getDateRange(timeRange);

      const params: BondYieldsRequest = {
        Symbol: symbol,
        startDate: dateRange.start,
        endDate: dateRange.end,
        limit,
        offset: 0,
      };

      console.log('Fetching bond data at:', new Date().toLocaleTimeString());
      const response = await fetchBondYields(params);

      const chartData = transformToChartData(response);
      console.log('Chart data points:', chartData.length, 'Latest:', chartData[chartData.length - 1]);

      // Always update to trigger re-render
      setData([...chartData]);
      const newStats = calculateStats(chartData);
      setStats(newStats);
      setLastUpdated(new Date());
      setStatus('success');
      isFirstLoad.current = false;

      console.log('Stats updated:', newStats);
    } catch (err) {
      console.error('Bond data fetch error:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch bond data'));
      setStatus('error');
    }
  }, [symbol, startDate, endDate, timeRange, limit, enabled, calculateStats]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 4 seconds
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      fetchData();
    }, 4000); // 4 seconds

    return () => clearInterval(interval);
  }, [enabled, fetchData]);

  return {
    data,
    status,
    error,
    refetch: fetchData,
    stats,
    lastUpdated,
  };
}

export default useBondData;
