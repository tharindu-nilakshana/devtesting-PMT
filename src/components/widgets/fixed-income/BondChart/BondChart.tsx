'use client';

import { useEffect, useRef } from 'react';
import { ChartDataPoint } from '@/types/bond';

interface BondChartProps {
  data: ChartDataPoint[];
  height?: number;
}

export function BondChart({ data }: BondChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<unknown>(null);
  const seriesRef = useRef<unknown>(null);
  const chartModuleRef = useRef<unknown>(null);

  // Create chart on mount (NOT on data change)
  useEffect(() => {
    if (!chartContainerRef.current) return;

    let isMounted = true;

    // Dynamically import lightweight-charts
    import('lightweight-charts').then((module) => {
      if (!chartContainerRef.current || !isMounted) return;

      chartModuleRef.current = module;

      // Cleanup existing chart
      if (chartRef.current) {
        (chartRef.current as { remove: () => void }).remove();
        chartRef.current = null;
        seriesRef.current = null;
      }

      const { createChart, ColorType, LineSeries } = module;

      // Custom time formatter
      const timeFormatter = (timestamp: number) => {
        const date = new Date(timestamp * 1000);
        try {
          return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
          }).format(date);
        } catch {
          return date.toLocaleDateString();
        }
      };

      // Chart color configuration - dark theme
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: '#0f0f0f' },
          textColor: '#9ca3af',
        },
        grid: {
          vertLines: { color: '#374151' },
          horzLines: { color: '#374151' },
        },
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight || 400,
        rightPriceScale: {
          borderColor: '#374151',
          scaleMargins: { top: 0.1, bottom: 0.1 },
        },
        timeScale: {
          borderColor: '#374151',
          timeVisible: true,
          secondsVisible: false,
        },
        crosshair: {
          mode: 1,
          vertLine: {
            color: '#ff6b35',
            style: 2,
            labelBackgroundColor: '#1f2937',
          },
          horzLine: {
            color: '#ff6b35',
            style: 2,
            labelBackgroundColor: '#1f2937',
          },
        },
        localization: {
          priceFormatter: (price: number) => `${price.toFixed(2)}%`,
          timeFormatter: timeFormatter,
        },
      });

      chartRef.current = chart;

      // Add line series using v5 API - Primary color: #ff6b35
      const seriesOptions = {
        color: '#ff6b35',
        lineWidth: 2 as const,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 6,
        crosshairMarkerBackgroundColor: '#ff6b35',
        priceFormat: {
          type: 'custom' as const,
          formatter: (price: number) => `${price.toFixed(2)}%`,
        },
      };

      // v5 uses addSeries with LineSeries type
      let series;
      try {
        series = chart.addSeries(LineSeries, seriesOptions);
      } catch {
        // Fallback for older API
        const chartAny = chart as unknown as Record<string, Function>;
        if (chartAny.addLineSeries) {
          series = chartAny.addLineSeries(seriesOptions);
        }
      }

      seriesRef.current = series;

      // Set initial data if available
      if (series && data.length > 0) {
        console.log('Setting initial chart data:', data.length, 'points');
        series.setData(data);
        chart.timeScale().fitContent();
      }
    }).catch(err => {
      console.error('Failed to load chart library:', err);
    });

    // Cleanup
    return () => {
      isMounted = false;
      if (chartRef.current) {
        (chartRef.current as { remove: () => void }).remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
    };
  }, []); // Only run on mount

  // Update data separately without recreating chart
  useEffect(() => {
    if (seriesRef.current && data.length > 0) {
      console.log('Updating chart data:', data.length, 'points, latest:', data[data.length - 1]);
      const series = seriesRef.current as { setData: (data: ChartDataPoint[]) => void };
      series.setData(data);

      if (chartRef.current) {
        const chart = chartRef.current as { timeScale: () => { fitContent: () => void } };
        chart.timeScale().fitContent();
      }
    }
  }, [data]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        (chartRef.current as { applyOptions: (opts: { width: number; height: number }) => void }).applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    // Also use ResizeObserver for container size changes
    const resizeObserver = new ResizeObserver(handleResize);
    if (chartContainerRef.current) {
      resizeObserver.observe(chartContainerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, []);

  return <div ref={chartContainerRef} className="w-full h-full" />;
}

export default BondChart;
