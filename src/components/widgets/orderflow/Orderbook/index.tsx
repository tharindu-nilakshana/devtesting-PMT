"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { WidgetHeader } from '@/components/bloomberg-ui/WidgetHeader';
import { fetchOrderbook, type OrderbookResponse } from './api';
import { getSymbolShortFormat } from '@/utils/symbolMapping';

interface Props {
  onRemove?: () => void;
  onSettings?: () => void;
  onFullscreen?: () => void;
  settings?: {
    symbol?: string;
  };
}

interface PriceLevel {
  price: number;
  bidVolume: number;
  askVolume: number;
  isCurrentPrice: boolean;
}

export function OrderbookWidget({
  onRemove,
  onSettings,
  onFullscreen,
  settings
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<OrderbookResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const symbol = settings?.symbol || 'EURUSD';

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetchOrderbook(symbol, 'orderbook');
      setData(response);
    } catch (err) {
      console.error('Error fetching orderbook data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Process data into price levels
  const priceLevels = React.useMemo(() => {
    if (!data) return [];

    const levels: PriceLevel[] = [];
    let currentPriceIndex = -1;
    const closePrice = data.close;

    // Find the vline index (current price marker)
    data.dataLabels.forEach((labelItem, index) => {
      if (labelItem.vline === 'true') {
        currentPriceIndex = index;
      }
    });

    // Build price levels array with original indices
    const priceLevelsWithIndex: Array<PriceLevel & { originalIndex: number }> = [];
    
    data.dataLabels.forEach((labelItem, index) => {
      if (labelItem.label && !labelItem.vline) {
        const priceStr = String(labelItem.label).trim();
        // Skip if label is all zeros or empty
        if (!priceStr || /^0+\.?0*$/.test(priceStr)) return;
        
        const price = parseFloat(priceStr);
        // Skip zero, invalid, or extremely small prices
        if (isNaN(price) || Math.abs(price) < 0.0001) return;
        
        const bidValue = parseFloat(data.dataBuy[index]?.value || '0');
        const askValue = Math.abs(parseFloat(data.dataSell[index]?.value || '0'));
        
        priceLevelsWithIndex.push({
          price,
          bidVolume: bidValue,
          askVolume: askValue,
          isCurrentPrice: false,
          originalIndex: index
        });
      }
    });

    // Sort by price descending (highest at top)
    priceLevelsWithIndex.sort((a, b) => b.price - a.price);

    // Find the price level closest to the current price (close price or vline position)
    if (currentPriceIndex >= 0 && closePrice) {
      let closestIndex = -1;
      let minDistance = Infinity;
      
      priceLevelsWithIndex.forEach((level, idx) => {
        const distance = Math.abs(level.price - closePrice);
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = idx;
        }
      });
      
      if (closestIndex >= 0) {
        priceLevelsWithIndex[closestIndex].isCurrentPrice = true;
      }
    }

    return priceLevelsWithIndex.map(({ originalIndex, ...level }) => level);
  }, [data]);

  // Draw chart
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current || !data || priceLevels.length === 0) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // Set actual size in memory (scaled for DPR)
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    // Scale the canvas back down using CSS
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    
    // Scale the drawing context so everything draws at the correct size
    ctx.scale(dpr, dpr);

    // Skip if canvas is too small
    if (rect.width === 0 || rect.height === 0) return;

    const padding = { top: 20, right: 60, bottom: 40, left: 100 };
    const chartWidth = rect.width - padding.left - padding.right;
    const chartHeight = rect.height - padding.top - padding.bottom;
    const centerX = padding.left + chartWidth / 2;

    // Find max volume for scaling
    const maxVolume = Math.max(
      ...priceLevels.map(l => Math.max(l.bidVolume, l.askVolume))
    );

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Draw background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Draw grid lines
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    
    // Vertical center line
    ctx.beginPath();
    ctx.moveTo(centerX, padding.top);
    ctx.lineTo(centerX, padding.top + chartHeight);
    ctx.stroke();

    // Horizontal grid lines
    const numGridLines = 10;
    for (let i = 0; i <= numGridLines; i++) {
      const y = padding.top + (chartHeight / numGridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();
    }

    // Draw price labels and volume bars
    const priceStep = chartHeight / priceLevels.length;
    const currentPriceY = priceLevels.findIndex(l => l.isCurrentPrice) * priceStep + padding.top;

    // Calculate which labels to show to avoid overlap
    // Each label needs about 20px vertical space
    const minLabelSpacing = 20;
    const minLabelSpacingInLevels = Math.ceil(minLabelSpacing / priceStep);
    const currentPriceIndex = priceLevels.findIndex(l => l.isCurrentPrice);
    
    // Determine which indices should show labels (excluding zero prices)
    const labelIndices = new Set<number>();
    
    // Always show first and last (if not zero)
    if (priceLevels.length > 0) {
      if (Math.abs(priceLevels[0].price) > 0.0001) {
        labelIndices.add(0);
      }
      if (Math.abs(priceLevels[priceLevels.length - 1].price) > 0.0001) {
        labelIndices.add(priceLevels.length - 1);
      }
    }
    
    // Always show current price (if not zero)
    if (currentPriceIndex >= 0 && Math.abs(priceLevels[currentPriceIndex].price) > 0.0001) {
      labelIndices.add(currentPriceIndex);
    }
    
    // Add labels at regular intervals, but skip if too close to existing labels or if price is zero
    const interval = Math.max(1, Math.floor(priceLevels.length / Math.floor(chartHeight / minLabelSpacing)));
    for (let i = 0; i < priceLevels.length; i += interval) {
      // Skip zero prices
      if (Math.abs(priceLevels[i].price) < 0.0001) continue;
      
      // Check if this index is far enough from any existing label
      let tooClose = false;
      for (const existingIndex of labelIndices) {
        if (Math.abs(i - existingIndex) < minLabelSpacingInLevels) {
          tooClose = true;
          break;
        }
      }
      if (!tooClose) {
        labelIndices.add(i);
      }
    }

    priceLevels.forEach((level, index) => {
      const y = padding.top + index * priceStep + priceStep / 2;

      // Draw current price line (yellow dashed) - start after price labels
      if (level.isCurrentPrice) {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(padding.left + 20, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw bid volume bar (red, left side)
      if (level.bidVolume > 0) {
        const barWidth = (level.bidVolume / maxVolume) * (chartWidth / 2);
        ctx.fillStyle = '#DC3545'; // Red
        ctx.fillRect(centerX - barWidth, y - priceStep / 2 + 1, barWidth, priceStep - 2);
      }

      // Draw ask volume bar (green, right side)
      if (level.askVolume > 0) {
        const barWidth = (level.askVolume / maxVolume) * (chartWidth / 2);
        ctx.fillStyle = '#22c55e'; // Green
        ctx.fillRect(centerX, y - priceStep / 2 + 1, barWidth, priceStep - 2);
      }

      // Only draw price label if it's in our set of label indices and price is not zero
      if (labelIndices.has(index) && Math.abs(level.price) > 0.0001) {
        ctx.fillStyle = level.isCurrentPrice ? '#fbbf24' : '#9ca3af';
        ctx.font = '11px "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(level.price.toFixed(5), padding.left + 10, y + 5);
        }
    });

    // Draw volume axis labels
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace';
    ctx.textAlign = 'center';
    
    const volumeLabelY = rect.height - padding.bottom + 20;
    const minLabelSpacingX = 50; // Minimum horizontal spacing between volume labels
    
    // Left side (negative/red) - skip center to avoid overlap
    const numVolumeLabels = 5;
    for (let i = 0; i < numVolumeLabels; i++) {
      const value = -(maxVolume * (i / numVolumeLabels));
      const x = padding.left + (chartWidth / 2) * (i / numVolumeLabels);
      // Only draw if not too close to center
      if (Math.abs(x - centerX) > minLabelSpacingX / 2) {
        ctx.fillText(value.toFixed(2), x, volumeLabelY);
      }
    }
    
    // Draw center "0.00" label
    ctx.fillText('0.00', centerX, volumeLabelY);

    // Right side (positive/green) - skip center to avoid overlap
    for (let i = 1; i <= numVolumeLabels; i++) {
      const value = maxVolume * (i / numVolumeLabels);
      const x = centerX + (chartWidth / 2) * (i / numVolumeLabels);
      // Only draw if not too close to center
      if (Math.abs(x - centerX) > minLabelSpacingX / 2) {
        ctx.fillText(value.toFixed(2), x, volumeLabelY);
      }
    }

    // Draw axis labels - move further down to avoid overlap
    ctx.fillStyle = '#9ca3af';
    ctx.font = '11px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Volume', rect.width / 2, rect.height - 5);
    
    ctx.save();
    ctx.translate(30, rect.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.font = '11px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Price', 0, 0);
    ctx.restore();
  }, [priceLevels, data]);

  // Handle resize - trigger redraw when size changes
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver(() => {
      // Resize will trigger the draw effect to re-run
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div className="flex flex-col h-full bg-widget-body border border-border rounded-none overflow-hidden">
      <WidgetHeader
        title="Orderbook"
        subtitle={`[${getSymbolShortFormat(symbol)}]`}
        onSettings={onSettings}
        onRemove={onRemove}
        onFullscreen={onFullscreen}
        helpContent="Live order book displaying current buy and sell orders with price levels and volumes. Red bars indicate bid volumes (left), green bars indicate ask volumes (right)."
      />
      
      <div className="flex-1 overflow-hidden relative" ref={containerRef}>
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-muted-foreground text-sm">Loading orderbook data...</div>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-destructive text-sm mb-3">{error}</div>
              <button
                onClick={fetchData}
                className="text-xs text-primary hover:underline"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ display: 'block' }}
          />
        )}
      </div>

      {/* Footer info */}
      {data && (
        <div className="px-4 py-2 border-t border-border bg-widget-header">
          <div className="flex justify-between items-center text-xs">
            <span className="text-foreground">Close: <span className="text-primary font-mono">{data.close.toFixed(5)}</span></span>
            <span className="text-foreground">Avg Long: <span className="text-success font-mono">{data.avgLong.toFixed(4)}</span></span>
            <span className="text-foreground">Avg Short: <span className="text-destructive font-mono">{data.avgShort.toFixed(4)}</span></span>
            <span className="text-foreground">Levels: <span className="text-primary font-mono">{data.count}</span></span>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrderbookWidget;
