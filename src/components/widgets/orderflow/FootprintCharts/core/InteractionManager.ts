/**
 * @file InteractionManager.ts
 * @description Handles all user interactions with TradingView-like controls
 * - CTRL + Wheel: Zoom time axis (horizontal)
 * - Shift + Wheel: Pan time axis
 * - Plain Wheel: Pan vertically
 * - Alt + Wheel: Zoom price axis (vertical)
 * - Drag on chart: Pan both axes
 * - Drag on Y axis: Scale price axis
 * - Drag on X axis: Scale time axis
 */

import * as d3 from 'd3';
import { FootprintCandle, DrawingTool, Drawing, DrawingPoint } from '../types';
import { getTimeFromIndex, getIndexFromTime, distance, distanceToSegment, distanceToPolyline } from '../utils/mathUtils';

type InteractionMode = 'IDLE' | 'DRAWING' | 'DRAGGING' | 'RESIZING' | 'PANNING' | 'AXIS_DRAG_Y' | 'AXIS_DRAG_X';

interface MousePosition {
  x: number;
  y: number;
  price: number;
  index: number;
  time: number;
  timeLabel: string;
}

interface ViewState {
  viewOffset: number;
  viewCount: number;
  yDomain?: [number, number] | null;
}

interface InteractionCallbacks {
  onViewChange: (viewState: ViewState) => void;
  onCrosshairMove: (pos: MousePosition | null) => void;
  onDrawingStart: (type: DrawingTool, point: DrawingPoint) => void;
  onDrawingUpdate: (id: string, points: DrawingPoint[]) => void;
  onDrawingComplete: (drawing: Drawing) => void;
  onDrawingSelect: (id: string | null) => void;
  onDrawingDelete: (id: string) => void;
}

export class InteractionManager {
  private container: HTMLElement;
  private svg: SVGSVGElement;
  private margin = { top: 20, right: 70, bottom: 30, left: 0 };
  
  private mode: InteractionMode = 'IDLE';
  private activeTool: DrawingTool = 'cursor';
  private activeDrawingPoints: DrawingPoint[] = [];
  private dragTargetId: string | null = null;
  private dragAnchorIdx: number | null = null;
  private lastMousePos: MousePosition | null = null;
  
  private viewState: ViewState;
  private xScale: d3.ScaleLinear<number, number> | null = null;
  private yScale: d3.ScaleLinear<number, number> | null = null;
  
  private data: FootprintCandle[] = [];
  private drawings: Drawing[] = [];
  private intervalMs: number = 60000;
  
  private callbacks: InteractionCallbacks;
  private chartWidth: number = 0;
  private chartHeight: number = 0;

  constructor(
    container: HTMLElement,
    svg: SVGSVGElement,
    callbacks: InteractionCallbacks
  ) {
    this.container = container;
    this.svg = svg;
    this.callbacks = callbacks;
    
    this.viewState = {
      viewOffset: 0,
      viewCount: 20,
      yDomain: [1.1580, 1.1620] as [number, number]
    };
    
    this.bindEvents();
  }

  /**
   * Update scales and data for interaction calculations
   */
  public updateContext(
    xScale: d3.ScaleLinear<number, number>,
    yScale: d3.ScaleLinear<number, number>,
    data: FootprintCandle[],
    drawings: Drawing[],
    intervalMs: number,
    width: number,
    height: number
  ): void {
    this.xScale = xScale;
    this.yScale = yScale;
    this.data = data;
    this.drawings = drawings;
    this.intervalMs = intervalMs;
    this.chartWidth = width - this.margin.right;
    this.chartHeight = height - this.margin.top - this.margin.bottom;
  }

  /**
   * Set active drawing tool
   */
  public setActiveTool(tool: DrawingTool): void {
    this.activeTool = tool;
    this.mode = 'IDLE';
    this.activeDrawingPoints = [];
    this.svg.style.cursor = tool === 'cursor' ? 'default' : 'crosshair';
  }

  /**
   * Update view state externally
   */
  public setViewState(viewState: Partial<ViewState>): void {
    this.viewState = { ...this.viewState, ...viewState };
  }

  /**
   * Get current view state
   */
  public getViewState(): ViewState {
    return { ...this.viewState };
  }

  // ==================================================================================
  // EVENT BINDING
  // ==================================================================================

  private bindEvents(): void {
    const svg = d3.select(this.svg);
    
    svg
      .on('mousedown', (e: MouseEvent) => this.handleMouseDown(e))
      .on('mousemove', (e: MouseEvent) => this.handleMouseMove(e))
      .on('mouseup', () => this.handleMouseUp())
      .on('mouseleave', () => this.handleMouseLeave())
      .on('wheel', (e: WheelEvent) => this.handleWheel(e), { passive: false });

    // Keyboard events
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  /**
   * Clean up event listeners
   */
  public destroy(): void {
    const svg = d3.select(this.svg);
    svg.on('mousedown', null)
       .on('mousemove', null)
       .on('mouseup', null)
       .on('mouseleave', null)
       .on('wheel', null);
  }

  // ==================================================================================
  // COORDINATE CONVERSION
  // ==================================================================================

  private getMousePosition(event: MouseEvent): MousePosition | null {
    if (!this.xScale || !this.yScale) return null;

    const [mx, my] = d3.pointer(event, this.svg);
    const y = my - this.margin.top;
    
    const price = this.yScale.invert(y);
    const index = this.xScale.invert(mx);
    const time = getTimeFromIndex(index, this.data, this.intervalMs);
    const timeLabel = new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return { x: mx, y, price, index, time, timeLabel };
  }

  // ==================================================================================
  // HIT TESTING
  // ==================================================================================

  private hitTest(mx: number, my: number): { id: string; anchorIdx?: number; type: 'anchor' | 'shape' } | null {
    if (!this.xScale || !this.yScale) return null;

    const adjY = my - this.margin.top;
    const visibleDrawings = this.drawings.filter(d => d.visible);

    // Check anchors of selected drawing first
    const selected = visibleDrawings.find(d => d.selected);
    if (selected && !selected.locked) {
      for (let i = 0; i < selected.points.length; i++) {
        const p = selected.points[i];
        const idx = getIndexFromTime(p.time, this.data, this.intervalMs);
        const px = this.xScale(idx);
        const py = this.yScale(p.price);
        if (distance(mx, adjY, px, py) < 8) {
          return { id: selected.id, anchorIdx: i, type: 'anchor' };
        }
      }
    }

    // Check shapes
    for (let i = visibleDrawings.length - 1; i >= 0; i--) {
      const d = visibleDrawings[i];
      if (d.locked) continue;

      const screenPoints = d.points.map(p => ({
        x: this.xScale!(getIndexFromTime(p.time, this.data, this.intervalMs)),
        y: this.yScale!(p.price)
      }));

      let hit = false;
      
      if (d.type === 'trendline' || d.type === 'ray' || d.type === 'fib') {
        if (screenPoints.length < 2) continue;
        const dist = distanceToSegment(mx, adjY, screenPoints[0].x, screenPoints[0].y, screenPoints[1].x, screenPoints[1].y);
        if (dist < 6) hit = true;
      } else if (d.type === 'pen') {
        if (distanceToPolyline(mx, adjY, screenPoints) < 10) hit = true;
      } else if (d.type === 'horizontal') {
        if (Math.abs(adjY - screenPoints[0].y) < 6) hit = true;
      }

      if (hit) return { id: d.id, type: 'shape' };
    }

    return null;
  }

  // ==================================================================================
  // MOUSE HANDLERS
  // ==================================================================================

  private handleMouseDown(event: MouseEvent): void {
    const pos = this.getMousePosition(event);
    if (!pos) return;

    const [mx, my] = d3.pointer(event, this.svg);
    this.lastMousePos = pos;

    // Check if clicking on axis areas
    if (mx > this.chartWidth) {
      this.mode = 'AXIS_DRAG_Y';
      return;
    }
    if (my > this.chartHeight + this.margin.top) {
      this.mode = 'AXIS_DRAG_X';
      return;
    }

    if (this.activeTool === 'cursor') {
      const hit = this.hitTest(mx, my);
      
      if (hit) {
        if (!this.drawings.find(d => d.id === hit.id)?.selected) {
          this.callbacks.onDrawingSelect(hit.id);
        }
        
        if (hit.type === 'anchor' && hit.anchorIdx !== undefined) {
          this.mode = 'RESIZING';
          this.dragTargetId = hit.id;
          this.dragAnchorIdx = hit.anchorIdx;
        } else {
          this.mode = 'DRAGGING';
          this.dragTargetId = hit.id;
        }
        return;
      }

      this.callbacks.onDrawingSelect(null);
      this.mode = 'PANNING';
      this.svg.style.cursor = 'grabbing';
    } else if (this.activeTool === 'pen') {
      this.mode = 'DRAWING';
      this.activeDrawingPoints = [{ price: pos.price, time: pos.time, timeLabel: pos.timeLabel }];
      
      const drawing: Drawing = {
        id: Date.now().toString(),
        type: 'pen',
        color: '#2962ff',
        selected: true,
        locked: false,
        visible: true,
        points: [...this.activeDrawingPoints]
      };
      
      this.callbacks.onDrawingComplete(drawing);
      this.dragTargetId = drawing.id;
    } else {
      // Two-point drawings (trendline, ray, fib, horizontal)
      if (this.activeDrawingPoints.length === 0) {
        this.mode = 'DRAWING';
        this.activeDrawingPoints.push({ price: pos.price, time: pos.time, timeLabel: pos.timeLabel });
        
        if (this.activeTool === 'horizontal') {
          this.finishDrawing();
        }
      } else {
        this.activeDrawingPoints.push({ price: pos.price, time: pos.time, timeLabel: pos.timeLabel });
        this.finishDrawing();
      }
    }
  }

  private handleMouseMove(event: MouseEvent): void {
    const pos = this.getMousePosition(event);
    if (!pos) return;

    const [mx, my] = d3.pointer(event, this.svg);
    const deltaX = mx - (this.lastMousePos?.x || mx);
    const deltaY = my - (this.lastMousePos?.y || my);
    const deltaIndex = pos.index - (this.lastMousePos?.index || pos.index);
    const deltaPrice = pos.price - (this.lastMousePos?.price || pos.price);

    this.lastMousePos = pos;

    // Y Axis scaling
    if (this.mode === 'AXIS_DRAG_Y' && this.yScale && this.viewState.yDomain) {
      const scale = 1 + deltaY * 0.003;
      const mid = this.yScale.invert(this.chartHeight / 2);
      const yDomain = this.viewState.yDomain;
      this.viewState.yDomain = [
        mid - (mid - yDomain[0]) * scale,
        mid + (yDomain[1] - mid) * scale
      ];
      this.callbacks.onViewChange(this.viewState as { viewOffset: number; viewCount: number; yDomain: [number, number] });
      return;
    }

    // X Axis scaling
    if (this.mode === 'AXIS_DRAG_X') {
      const shift = -(deltaX / this.chartWidth) * this.viewState.viewCount;
      this.viewState.viewOffset += shift;
      this.callbacks.onViewChange(this.viewState);
      return;
    }

    // Panning
    if (this.mode === 'PANNING') {
      const shift = -(deltaX / this.chartWidth) * this.viewState.viewCount;
      this.viewState.viewOffset += shift;
      
      if (this.yScale && this.viewState.yDomain) {
        const pShift = this.yScale.invert(0) - this.yScale.invert(deltaY);
        const yDomain = this.viewState.yDomain;
        this.viewState.yDomain = [
          yDomain[0] - pShift,
          yDomain[1] - pShift
        ];
      }
      this.callbacks.onViewChange(this.viewState as { viewOffset: number; viewCount: number; yDomain: [number, number] });
      return;
    }

    // Resizing drawing anchor
    if (this.mode === 'RESIZING' && this.dragTargetId && this.dragAnchorIdx !== null) {
      const drawing = this.drawings.find(d => d.id === this.dragTargetId);
      if (drawing) {
        const newPoints = [...drawing.points];
        newPoints[this.dragAnchorIdx] = { price: pos.price, time: pos.time, timeLabel: pos.timeLabel };
        this.callbacks.onDrawingUpdate(this.dragTargetId, newPoints);
      }
      return;
    }

    // Dragging entire drawing
    if (this.mode === 'DRAGGING' && this.dragTargetId) {
      const drawing = this.drawings.find(d => d.id === this.dragTargetId);
      if (drawing) {
        const newPoints = drawing.points.map(p => {
          const oldIdx = getIndexFromTime(p.time, this.data, this.intervalMs);
          const newT = getTimeFromIndex(oldIdx + deltaIndex, this.data, this.intervalMs);
          return { ...p, price: p.price + deltaPrice, time: newT };
        });
        this.callbacks.onDrawingUpdate(this.dragTargetId, newPoints);
      }
      return;
    }

    // Update crosshair
    this.callbacks.onCrosshairMove(pos);

    // Pen drawing
    if (this.mode === 'DRAWING' && this.activeTool === 'pen' && this.dragTargetId) {
      const drawing = this.drawings.find(d => d.id === this.dragTargetId);
      if (drawing) {
        const newPoints = [...drawing.points, { price: pos.price, time: pos.time, timeLabel: pos.timeLabel }];
        this.callbacks.onDrawingUpdate(this.dragTargetId, newPoints);
      }
    }

    // Update cursor for hit testing
    if (this.mode === 'IDLE' && this.activeTool === 'cursor') {
      const hit = this.hitTest(mx, my);
      this.svg.style.cursor = hit ? (hit.type === 'anchor' ? 'crosshair' : 'move') : 'default';
    }
  }

  private handleMouseUp(): void {
    if (this.mode !== 'IDLE') {
      this.mode = 'IDLE';
      this.dragTargetId = null;
      this.dragAnchorIdx = null;
      this.svg.style.cursor = this.activeTool === 'cursor' ? 'default' : 'crosshair';
    }
  }

  private handleMouseLeave(): void {
    this.callbacks.onCrosshairMove(null);
    
    if (this.mode === 'PANNING' || this.mode === 'AXIS_DRAG_X' || this.mode === 'AXIS_DRAG_Y') {
      this.mode = 'IDLE';
    }
    
    this.svg.style.cursor = 'default';
  }

  // ==================================================================================
  // WHEEL HANDLER (TradingView-like)
  // ==================================================================================

  private handleWheel(event: WheelEvent): void {
    event.preventDefault();
    
    const zoomSpeed = 0.001;
    const panSpeed = 0.5;
    const [mx] = d3.pointer(event, this.svg);
    const mouseRatio = mx / this.chartWidth;

    if (event.ctrlKey) {
      // CTRL + Wheel: Zoom time axis (horizontal zoom focused on cursor)
      const scale = 1 + event.deltaY * zoomSpeed;
      const mouseIndex = this.viewState.viewOffset + this.viewState.viewCount * mouseRatio;
      const newCount = Math.max(5, Math.min(100, this.viewState.viewCount * scale));
      const newOffset = mouseIndex - newCount * mouseRatio;
      
      this.viewState.viewCount = newCount;
      this.viewState.viewOffset = newOffset;
    } else if (event.shiftKey) {
      // Shift + Wheel: Pan time axis (horizontal scroll)
      const shift = (event.deltaY / this.chartHeight) * this.viewState.viewCount * panSpeed;
      this.viewState.viewOffset += shift;
    } else if (event.altKey) {
      // Alt + Wheel: Zoom price axis (vertical zoom)
      if (this.yScale && this.viewState.yDomain) {
        const k = 1 + event.deltaY * zoomSpeed;
        const center = this.yScale.invert(this.chartHeight / 2);
        const yDomain = this.viewState.yDomain;
        this.viewState.yDomain = [
          center - (center - yDomain[0]) * k,
          center + (yDomain[1] - center) * k
        ];
      }
    } else {
      // Plain Wheel: Pan price axis (vertical scroll)
      if (this.yScale && this.viewState.yDomain) {
        const pShift = this.yScale.invert(0) - this.yScale.invert(event.deltaY * panSpeed);
        const yDomain = this.viewState.yDomain;
        this.viewState.yDomain = [
          yDomain[0] + pShift,
          yDomain[1] + pShift
        ];
      }
    }

    this.callbacks.onViewChange(this.viewState as { viewOffset: number; viewCount: number; yDomain: [number, number] });
  }

  // ==================================================================================
  // KEYBOARD HANDLER
  // ==================================================================================

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      const selected = this.drawings.find(d => d.selected);
      if (selected && !selected.locked) {
        this.callbacks.onDrawingDelete(selected.id);
      }
    } else if (event.key === 'Escape') {
      this.mode = 'IDLE';
      this.activeDrawingPoints = [];
      this.callbacks.onDrawingSelect(null);
    }
  }

  // ==================================================================================
  // DRAWING COMPLETION
  // ==================================================================================

  private finishDrawing(): void {
    const drawing: Drawing = {
      id: Date.now().toString(),
      type: this.activeTool,
      color: '#2962ff',
      selected: true,
      locked: false,
      visible: true,
      points: [...this.activeDrawingPoints]
    };

    this.callbacks.onDrawingComplete(drawing);
    this.mode = 'IDLE';
    this.activeDrawingPoints = [];
  }
}
