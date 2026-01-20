/**
 * @file ChartController.ts
 * @description Main controller that orchestrates Canvas rendering, SVG overlays, and interactions
 * Implements data virtualization with sliding window for efficient rendering
 */

import * as d3 from 'd3';
import { 
  Trade, FootprintCandle, ChartSettings, Drawing, DrawingPoint, 
  DEFAULT_CONFIG, DEFAULT_THEMES
} from '../types';
import { CanvasRenderer } from './CanvasRenderer';
import { SVGOverlayRenderer } from './SVGOverlayRenderer';
import { InteractionManager } from './InteractionManager';
import { aggregateTrades, getTickSize } from '../utils/mathUtils';

interface ViewState {
  viewOffset: number;
  viewCount: number;
  yDomain: [number, number] | null;
}

export class ChartController {
  private container: HTMLElement;
  private canvasRenderer: CanvasRenderer;
  private svgRenderer: SVGOverlayRenderer;
  private interactionManager: InteractionManager;
  private resizeObserver: ResizeObserver;

  // Data
  private fullData: FootprintCandle[] = [];
  private visibleData: FootprintCandle[] = [];
  private rawTrades: Trade[] = [];

  // View state
  private viewState: ViewState = {
    viewOffset: 0,
    viewCount: 20,
    yDomain: null
  };

  // Scales
  private xScale: d3.ScaleLinear<number, number> | null = null;
  private yScale: d3.ScaleLinear<number, number> | null = null;

  // Settings
  private settings: ChartSettings;
  private intervalMs: number = 60000;

  // Dimensions
  private width: number = 0;
  private height: number = 0;
  private chartWidth: number = 0;
  private chartHeight: number = 0;
  private margin = { top: 20, right: 70, bottom: 30, left: 0 };

  // Web Worker (optional - for heavy processing)
  private worker: Worker | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    
    // Initialize default settings
    this.settings = {
      instrument: '@EU#',
      chartType: 'bid_ask',
      timeframe: 1,
      tickMultiplier: 1,
      showHeatmap: false,
      showCandlesticks: true,
      showDOM: true,
      showPOC: true,
      showValueArea: true,
      showImbalances: true,
      activeTool: 'cursor',
      drawings: [],
      theme: DEFAULT_THEMES[0]
    };

    // Create renderers
    this.canvasRenderer = new CanvasRenderer(container);
    this.svgRenderer = new SVGOverlayRenderer(container);

    // Create interaction manager
    this.interactionManager = new InteractionManager(
      container,
      this.svgRenderer.getSVGElement(),
      {
        onViewChange: (vs) => {
          if (vs.yDomain) {
            this.handleViewChange(vs as { viewOffset: number; viewCount: number; yDomain: [number, number] });
          } else {
            this.handleViewChange({ ...vs, yDomain: this.viewState.yDomain || [0, 1] });
          }
        },
        onCrosshairMove: (pos) => this.handleCrosshairMove(pos),
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        onDrawingStart: (type, point) => { /* Handled internally by InteractionManager */ },
        onDrawingUpdate: (id, points) => this.handleDrawingUpdate(id, points),
        onDrawingComplete: (drawing) => this.handleDrawingComplete(drawing),
        onDrawingSelect: (id) => this.handleDrawingSelect(id),
        onDrawingDelete: (id) => this.handleDrawingDelete(id)
      }
    );

    // Set up resize observer
    this.resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => this.resize());
    });
    this.resizeObserver.observe(container);

    // Enable SVG pointer events for interactions
    this.svgRenderer.enablePointerEvents();

    // Initial resize
    this.resize();
  }

  // ==================================================================================
  // PUBLIC API
  // ==================================================================================

  /**
   * Update with new raw trade data
   */
  public updateData(trades: Trade[]): void {
    this.rawTrades = trades;
    this.processData();
    this.draw();
  }

  /**
   * Append new trades (for live data)
   */
  public appendTrades(newTrades: Trade[]): void {
    this.rawTrades = [...this.rawTrades, ...newTrades];
    
    // Limit total trades to prevent memory issues
    const MAX_TRADES = 100000;
    if (this.rawTrades.length > MAX_TRADES) {
      this.rawTrades = this.rawTrades.slice(-MAX_TRADES);
    }
    
    this.processData();
    this.draw();
  }

  /**
   * Update chart settings
   */
  public updateSettings(newSettings: Partial<ChartSettings>): void {
    const instrumentChanged = newSettings.instrument && newSettings.instrument !== this.settings.instrument;
    const timeframeChanged = newSettings.timeframe && newSettings.timeframe !== this.settings.timeframe;
    const tickChanged = newSettings.tickMultiplier && newSettings.tickMultiplier !== this.settings.tickMultiplier;

    this.settings = { ...this.settings, ...newSettings };
    this.intervalMs = this.settings.timeframe * 60 * 1000;

    // Update interaction manager tool
    if (newSettings.activeTool !== undefined) {
      this.interactionManager.setActiveTool(newSettings.activeTool);
    }

    // Re-aggregate if data-affecting settings changed
    if (instrumentChanged || timeframeChanged || tickChanged) {
      this.processData();
      this.resetView();
    }

    this.draw();
  }

  /**
   * Get visible candles (for AI analysis, etc.)
   */
  public getVisibleCandles(): FootprintCandle[] {
    return this.visibleData;
  }

  /**
   * Get current settings
   */
  public getSettings(): ChartSettings {
    return { ...this.settings };
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.resizeObserver.disconnect();
    this.canvasRenderer.destroy();
    this.svgRenderer.destroy();
    this.interactionManager.destroy();
    
    if (this.worker) {
      this.worker.terminate();
    }
  }

  // ==================================================================================
  // DATA PROCESSING
  // ==================================================================================

  private processData(): void {
    const tickSize = getTickSize(this.settings.instrument);
    
    this.fullData = aggregateTrades(
      this.rawTrades,
      this.settings.instrument,
      this.settings.timeframe,
      tickSize,
      this.settings.tickMultiplier,
      DEFAULT_CONFIG.features.imbalanceRatio
    );
  }

  // ==================================================================================
  // VIEW MANAGEMENT
  // ==================================================================================

  private resetView(): void {
    this.viewState.viewCount = 20;
    this.viewState.viewOffset = Math.max(0, this.fullData.length - this.viewState.viewCount + 2);
    this.viewState.yDomain = null;
    this.interactionManager.setViewState(this.viewState);
  }

  private handleViewChange(vs: { viewOffset: number; viewCount: number; yDomain: [number, number] }): void {
    this.viewState = { ...vs };
    this.draw();
  }

  // ==================================================================================
  // CROSSHAIR
  // ==================================================================================

  private handleCrosshairMove(pos: { x: number; y: number; price: number; timeLabel: string } | null): void {
    if (pos) {
      this.svgRenderer.renderCrosshair(
        pos.x, pos.y,
        this.width, this.height,
        pos.price, pos.timeLabel,
        this.settings.theme
      );
    } else {
      this.svgRenderer.hideCrosshair();
    }
  }

  // ==================================================================================
  // DRAWING CALLBACKS
  // ==================================================================================

  private handleDrawingUpdate(id: string, points: DrawingPoint[]): void {
    this.settings.drawings = this.settings.drawings.map(d => 
      d.id === id ? { ...d, points } : d
    );
    this.draw();
  }

  private handleDrawingComplete(drawing: Drawing): void {
    // Deselect other drawings
    this.settings.drawings = this.settings.drawings.map(d => ({ ...d, selected: false }));
    this.settings.drawings.push(drawing);
    this.draw();
  }

  private handleDrawingSelect(id: string | null): void {
    this.settings.drawings = this.settings.drawings.map(d => ({
      ...d,
      selected: id === null ? false : d.id === id
    }));
    this.draw();
  }

  private handleDrawingDelete(id: string): void {
    this.settings.drawings = this.settings.drawings.filter(d => d.id !== id);
    this.draw();
  }

  // ==================================================================================
  // RENDERING
  // ==================================================================================

  private resize(): void {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    this.chartWidth = this.width - this.margin.right;
    this.chartHeight = this.height - this.margin.top - this.margin.bottom;

    if (this.chartWidth <= 0 || this.chartHeight <= 0) return;

    this.canvasRenderer.resize(this.width, this.height);
    this.svgRenderer.resize(this.width, this.height);
    
    this.draw();
  }

  private draw(): void {
    if (this.chartWidth <= 0 || this.chartHeight <= 0) return;

    // Calculate visible data range (data virtualization)
    const startIdx = Math.floor(this.viewState.viewOffset);
    const endIdx = Math.ceil(this.viewState.viewOffset + this.viewState.viewCount);
    const safeStart = Math.max(0, startIdx);
    const safeEnd = Math.min(this.fullData.length, endIdx);
    
    this.visibleData = this.fullData.slice(safeStart, safeEnd);

    const tickSize = getTickSize(this.settings.instrument);
    const effectiveTickSize = tickSize * this.settings.tickMultiplier;

    // Create scales
    const { xScale, yScale } = this.createScales(effectiveTickSize);
    this.xScale = xScale;
    this.yScale = yScale;

    // Update yDomain if auto-scaling
    if (!this.viewState.yDomain) {
      this.viewState.yDomain = yScale.domain() as [number, number];
      this.interactionManager.setViewState(this.viewState);
    }

    const stepHeight = Math.abs(yScale(effectiveTickSize) - yScale(0));

    // Update interaction manager context
    this.interactionManager.updateContext(
      xScale, yScale,
      this.fullData, this.settings.drawings,
      this.intervalMs,
      this.width, this.height
    );

    // Clear and render
    this.canvasRenderer.clear();
    this.svgRenderer.clear();

    // Render grid (SVG for crispness)
    this.svgRenderer.renderGrid(yScale, this.chartWidth, this.settings.theme);

    // Render heatmap (Canvas for performance)
    if (this.settings.showHeatmap) {
      this.canvasRenderer.renderHeatmap(
        this.visibleData,
        (idx) => xScale(idx),
        (price) => yScale(price),
        stepHeight,
        safeStart,
        this.settings.theme
      );
    }

    // Render chart content based on type
    if (this.settings.chartType === 'dots') {
      this.canvasRenderer.renderVolumeDots(
        this.visibleData,
        (idx) => xScale(idx),
        (price) => yScale(price),
        safeStart,
        this.settings.theme
      );
    } else {
      // Render candlesticks (Canvas)
      if (this.settings.showCandlesticks) {
        this.canvasRenderer.renderCandlesticks(
          this.visibleData,
          (idx) => xScale(idx),
          (price) => yScale(price),
          safeStart,
          this.settings.theme
        );
      }

      // Render footprint cells (Canvas)
      this.canvasRenderer.renderFootprint(
        this.visibleData,
        (idx) => xScale(idx),
        (price) => yScale(price),
        stepHeight,
        safeStart,
        this.settings.chartType,
        this.settings.showCandlesticks,
        this.settings.showImbalances,
        this.settings.theme
      );
    }

    // Render POC and Value Area (SVG)
    this.svgRenderer.renderPOCLines(
      this.visibleData,
      xScale, yScale,
      safeStart,
      this.settings.showPOC,
      this.settings.showValueArea,
      this.settings.theme
    );

    // Render DOM (SVG)
    if (this.settings.showDOM) {
      this.svgRenderer.renderDOM(
        this.visibleData,
        yScale,
        this.width,
        stepHeight,
        this.settings.theme
      );
    }

    // Render axes (SVG)
    this.svgRenderer.renderXAxis(xScale, this.height, this.fullData, this.intervalMs, this.settings.theme);
    this.svgRenderer.renderYAxis(yScale, this.width, this.settings.theme);

    // Render drawings (SVG)
    this.svgRenderer.renderDrawings(
      this.settings.drawings,
      xScale, yScale,
      this.fullData,
      this.intervalMs,
      this.settings.theme
    );
  }

  private createScales(tickSize: number): {
    xScale: d3.ScaleLinear<number, number>;
    yScale: d3.ScaleLinear<number, number>;
  } {
    // Y Scale (price)
    let yDomain = this.viewState.yDomain;
    
    if (!yDomain) {
      if (this.visibleData.length > 0) {
        const prices = this.visibleData.flatMap(d => [d.high, d.low]);
        const yMin = d3.min(prices) || 0;
        const yMax = d3.max(prices) || 1;
        const padding = tickSize * 10;
        yDomain = [yMin - padding, yMax + padding];
      } else {
        yDomain = [1.1580, 1.1600];
      }
    }

    const yScale = d3.scaleLinear()
      .domain(yDomain)
      .range([this.chartHeight, 0]);

    // X Scale (index-based for linear positioning)
    const xScale = d3.scaleLinear()
      .domain([this.viewState.viewOffset, this.viewState.viewOffset + this.viewState.viewCount])
      .range([0, this.chartWidth]);

    return { xScale, yScale };
  }
}
