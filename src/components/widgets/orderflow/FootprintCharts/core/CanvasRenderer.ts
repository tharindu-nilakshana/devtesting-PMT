/**
 * @file CanvasRenderer.ts
 * @description High-performance Canvas renderer for heatmap, volume dots, and footprint cells
 * Uses HTML5 Canvas for efficient rendering of high-density elements
 */

import { FootprintCandle, PriceLevel, ChartType, Theme } from '../types';
import { formatVolume } from '../utils/mathUtils';

// RenderContext interface is defined for future use with Worker offloading
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface RenderContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  xScale: (index: number) => number;
  yScale: (price: number) => number;
  stepHeight: number;
  startIdx: number;
  theme: Theme;
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number;

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.pointerEvents = 'none';
    container.appendChild(this.canvas);

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;

    // Handle high DPI displays
    this.dpr = window.devicePixelRatio || 1;
  }

  /**
   * Resize canvas to match container
   */
  public resize(width: number, height: number): void {
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.scale(this.dpr, this.dpr);
  }

  /**
   * Clear the canvas
   */
  public clear(): void {
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width / this.dpr, this.canvas.height / this.dpr);
  }

  /**
   * Render heatmap (volume density visualization)
   */
  public renderHeatmap(
    data: FootprintCandle[],
    xScale: (index: number) => number,
    yScale: (price: number) => number,
    stepHeight: number,
    startIdx: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _theme: Theme
  ): void {
    // Calculate max volume for color scaling
    const allLevels = data.flatMap((d) => Array.from(d.volumeProfile.values()));
    const maxVol = Math.max(...allLevels.map((l) => l.totalVolume), 1);

    const unitWidth = xScale(1) - xScale(0);

    data.forEach((candle, i) => {
      const x = xScale(startIdx + i);
      const levels = Array.from(candle.volumeProfile.values());

      levels.forEach((level) => {
        const y = yScale(level.price) - stepHeight / 2;
        const intensity = level.totalVolume / maxVol;

        // Use inferno-like color scale
        const color = this.getHeatmapColor(intensity);
        this.ctx.fillStyle = color;
        this.ctx.globalAlpha = 0.5;
        this.ctx.fillRect(x - 0.5, y, unitWidth + 1, stepHeight + 0.5);
      });
    });

    this.ctx.globalAlpha = 1;
  }

  /**
   * Render volume dots
   */
  public renderVolumeDots(
    data: FootprintCandle[],
    xScale: (index: number) => number,
    yScale: (price: number) => number,
    startIdx: number,
    theme: Theme
  ): void {
    const maxVol = Math.max(...data.map((d) => d.totalVolume), 1);
    const unitWidth = xScale(1) - xScale(0);

    data.forEach((candle, i) => {
      const x = xScale(startIdx + i) + unitWidth / 2;
      const y = yScale(candle.close);
      const radius = Math.sqrt(candle.totalVolume / maxVol) * 20 + 2;

      // Draw dot
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius, 0, Math.PI * 2);
      this.ctx.fillStyle = candle.delta > 0 ? theme.colors.up : theme.colors.down;
      this.ctx.globalAlpha = 0.8;
      this.ctx.fill();

      // Draw outline
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    });

    this.ctx.globalAlpha = 1;
  }

  /**
   * Render candlesticks
   */
  public renderCandlesticks(
    data: FootprintCandle[],
    xScale: (index: number) => number,
    yScale: (price: number) => number,
    startIdx: number,
    theme: Theme
  ): void {
    const unitWidth = xScale(1) - xScale(0);
    const bodyWidth = unitWidth * 0.15;
    const padding = 2;

    data.forEach((candle, i) => {
      const x = xScale(startIdx + i) + padding;
      const isUp = candle.close >= candle.open;
      const color = isUp ? theme.colors.up : theme.colors.down;

      // Draw wick
      this.ctx.strokeStyle = theme.colors.wick;
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(x + bodyWidth / 2, yScale(candle.high));
      this.ctx.lineTo(x + bodyWidth / 2, yScale(candle.low));
      this.ctx.stroke();

      // Draw body
      const yTop = yScale(Math.max(candle.open, candle.close));
      const yBottom = yScale(Math.min(candle.open, candle.close));
      const height = Math.max(1, yBottom - yTop);

      this.ctx.fillStyle = color;
      this.ctx.fillRect(x, yTop, bodyWidth, height);
    });
  }

  /**
   * Render footprint cells (bid/ask, volume, delta modes)
   */
  public renderFootprint(
    data: FootprintCandle[],
    xScale: (index: number) => number,
    yScale: (price: number) => number,
    stepHeight: number,
    startIdx: number,
    chartType: ChartType,
    showCandlesticks: boolean,
    showImbalances: boolean,
    theme: Theme
  ): void {
    const unitWidth = xScale(1) - xScale(0);
    const candleSpace = showCandlesticks ? unitWidth * 0.15 + 4 : 0;
    const fpX = candleSpace;
    const fpWidth = unitWidth - candleSpace - 2;

    data.forEach((candle, i) => {
      const baseX = xScale(startIdx + i);
      const levels = Array.from(candle.volumeProfile.values());
      const maxVol = Math.max(...levels.map((l) => l.totalVolume), 1);
      const maxSide = Math.max(...levels.map((l) => Math.max(l.buyVolume, l.sellVolume)), 1);

      levels.forEach((level) => {
        const cellX = baseX + fpX;
        const cellY = yScale(level.price) - stepHeight / 2;

        if (chartType === 'volume') {
          this.renderVolumeCell(cellX, cellY, fpWidth, stepHeight, level, maxVol, theme);
        } else if (chartType === 'delta') {
          this.renderDeltaCell(cellX, cellY, fpWidth, stepHeight, level, levels, theme);
        } else {
          // bid_ask or bid_ask_delta
          this.renderBidAskCell(cellX, cellY, fpWidth, stepHeight, level, maxSide, showImbalances, theme);
        }
      });
    });
  }

  /**
   * Render volume-style cell
   */
  private renderVolumeCell(
    x: number,
    y: number,
    width: number,
    height: number,
    level: PriceLevel,
    maxVol: number,
    theme: Theme
  ): void {
    const opacity = (level.totalVolume / maxVol) * 0.8;

    this.ctx.fillStyle = theme.colors.textSecondary;
    this.ctx.globalAlpha = opacity;
    this.ctx.fillRect(x, y, width, height);
    this.ctx.globalAlpha = 1;

    // Draw text
    this.ctx.fillStyle = theme.colors.textPrimary;
    this.ctx.font = '10px Inter, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(formatVolume(level.totalVolume), x + width / 2, y + height / 2);
  }

  /**
   * Render delta-style cell
   */
  private renderDeltaCell(
    x: number,
    y: number,
    width: number,
    height: number,
    level: PriceLevel,
    allLevels: PriceLevel[],
    theme: Theme
  ): void {
    const delta = level.buyVolume - level.sellVolume;
    const maxDelta = Math.max(...allLevels.map((l) => Math.abs(l.buyVolume - l.sellVolume)), 1);
    const opacity = 0.2 + (Math.abs(delta) / maxDelta) * 0.7;

    this.ctx.fillStyle = delta >= 0 ? theme.colors.up : theme.colors.down;
    this.ctx.globalAlpha = opacity;
    this.ctx.fillRect(x, y, width, height);
    this.ctx.globalAlpha = 1;

    // Draw text
    this.ctx.fillStyle = theme.colors.textPrimary;
    this.ctx.font = '10px Inter, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(delta.toString(), x + width / 2, y + height / 2);
  }

  /**
   * Render bid/ask-style cell
   */
  private renderBidAskCell(
    x: number,
    y: number,
    width: number,
    height: number,
    level: PriceLevel,
    maxSide: number,
    showImbalances: boolean,
    theme: Theme
  ): void {
    const colW = width / 2;
    const gap = 1;
    const buyOpacity = 0.1 + (level.buyVolume / maxSide) * 0.8;
    const sellOpacity = 0.1 + (level.sellVolume / maxSide) * 0.8;

    // Bid (Left / Red)
    this.ctx.fillStyle = theme.colors.down;
    this.ctx.globalAlpha = sellOpacity;
    this.ctx.fillRect(x, y, colW - gap, height);

    // Ask (Right / Green)
    this.ctx.fillStyle = theme.colors.up;
    this.ctx.globalAlpha = buyOpacity;
    this.ctx.fillRect(x + colW, y, colW - gap, height);

    this.ctx.globalAlpha = 1;

    // Imbalance highlighting
    if (showImbalances && level.imbalance !== 'none') {
      this.ctx.strokeStyle = level.imbalance === 'buy' ? '#00ff00' : '#ff0000';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x, y, width, height);
    }

    // Draw text
    this.ctx.fillStyle = theme.colors.textPrimary;
    this.ctx.font = '9px Inter, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    // Sell volume (left)
    this.ctx.fillText(level.sellVolume.toString(), x + (colW - gap) / 2, y + height / 2);
    // Buy volume (right)
    this.ctx.fillText(level.buyVolume.toString(), x + colW + (colW - gap) / 2, y + height / 2);
  }

  /**
   * Get heatmap color (inferno-like scale)
   */
  private getHeatmapColor(intensity: number): string {
    // Inferno-like color scale
    const colors = [
      [0, 0, 4],
      [40, 11, 84],
      [101, 21, 110],
      [159, 42, 99],
      [212, 72, 66],
      [245, 125, 21],
      [250, 193, 39],
      [252, 255, 164]
    ];

    const idx = intensity * (colors.length - 1);
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    const t = idx - lower;

    const r = Math.round(colors[lower][0] + t * (colors[upper][0] - colors[lower][0]));
    const g = Math.round(colors[lower][1] + t * (colors[upper][1] - colors[lower][1]));
    const b = Math.round(colors[lower][2] + t * (colors[upper][2] - colors[lower][2]));

    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * Clean up
   */
  public destroy(): void {
    this.canvas.remove();
  }
}
