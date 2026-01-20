/**
 * @file SVGOverlayRenderer.ts
 * @description SVG renderer for crisp text elements: axes, crosshair, drawings, POC lines
 * Uses D3.js for scalable vector graphics where text sharpness matters
 */

import * as d3 from 'd3';
import { FootprintCandle, Drawing, DrawingPoint, Theme } from '../types';
import { formatPrice, formatVolume, getIndexFromTime, getFibLevels } from '../utils/mathUtils';

export class SVGOverlayRenderer {
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private gridGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
  private drawingGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
  private crosshairGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
  private axisGroupX: d3.Selection<SVGGElement, unknown, null, undefined>;
  private axisGroupY: d3.Selection<SVGGElement, unknown, null, undefined>;
  private pocGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
  private domGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
  
  private margin = { top: 20, right: 70, bottom: 30, left: 0 };

  constructor(container: HTMLElement) {
    this.svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .style('position', 'absolute')
      .style('top', '0')
      .style('left', '0')
      .style('pointer-events', 'none');

    // Create layer groups in proper order
    this.gridGroup = this.svg.append('g').attr('class', 'grid-layer');
    this.pocGroup = this.svg.append('g').attr('class', 'poc-layer');
    this.drawingGroup = this.svg.append('g').attr('class', 'drawing-layer');
    this.domGroup = this.svg.append('g').attr('class', 'dom-layer');
    this.crosshairGroup = this.svg.append('g').attr('class', 'crosshair-layer').style('display', 'none');
    this.axisGroupX = this.svg.append('g').attr('class', 'axis-x');
    this.axisGroupY = this.svg.append('g').attr('class', 'axis-y');
  }

  /**
   * Resize SVG to match container
   */
  public resize(width: number, height: number): void {
    this.svg.attr('width', width).attr('height', height);
    
    // Update group transforms
    this.gridGroup.attr('transform', `translate(0, ${this.margin.top})`);
    this.pocGroup.attr('transform', `translate(0, ${this.margin.top})`);
    this.drawingGroup.attr('transform', `translate(0, ${this.margin.top})`);
    this.domGroup.attr('transform', `translate(0, ${this.margin.top})`);
    this.crosshairGroup.attr('transform', `translate(0, ${this.margin.top})`);
  }

  /**
   * Clear all rendered elements
   */
  public clear(): void {
    this.gridGroup.selectAll('*').remove();
    this.pocGroup.selectAll('*').remove();
    this.drawingGroup.selectAll('*').remove();
    this.domGroup.selectAll('*').remove();
    this.axisGroupX.selectAll('*').remove();
    this.axisGroupY.selectAll('*').remove();
  }

  /**
   * Render grid lines
   */
  public renderGrid(
    yScale: d3.ScaleLinear<number, number>,
    width: number,
    theme: Theme
  ): void {
    const ticks = yScale.ticks();
    
    this.gridGroup.selectAll('.grid-line')
      .data(ticks)
      .join('line')
      .attr('class', 'grid-line')
      .attr('x1', 0)
      .attr('x2', width - this.margin.right)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .attr('stroke', theme.colors.borderPrimary)
      .attr('stroke-opacity', 0.3);
  }

  /**
   * Render X axis (time)
   */
  public renderXAxis(
    xScale: d3.ScaleLinear<number, number>,
    height: number,
    data: FootprintCandle[],
    intervalMs: number,
    theme: Theme
  ): void {
    const xAxis = d3.axisBottom(xScale)
      .tickSize(0)
      .tickPadding(10)
      .ticks(5)
      .tickFormat((d) => {
        const idx = Number(d);
        if (data.length === 0) return '';
        
        // Linear extrapolation for time
        const firstTime = data[0]?.time || Date.now();
        const time = firstTime + idx * intervalMs;
        return new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      });

    this.axisGroupX
      .attr('transform', `translate(0, ${height - this.margin.bottom})`)
      .call(xAxis)
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('text').attr('fill', theme.colors.textSecondary));
  }

  /**
   * Render Y axis (price)
   */
  public renderYAxis(
    yScale: d3.ScaleLinear<number, number>,
    width: number,
    theme: Theme
  ): void {
    const yAxis = d3.axisRight(yScale)
      .tickSize(0)
      .tickPadding(5)
      .tickFormat(d3.format('.5f'));

    this.axisGroupY
      .attr('transform', `translate(${width - this.margin.right}, ${this.margin.top})`)
      .call(yAxis)
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('text').attr('fill', theme.colors.textSecondary));
  }

  /**
   * Render POC and Value Area lines
   */
  public renderPOCLines(
    data: FootprintCandle[],
    xScale: d3.ScaleLinear<number, number>,
    yScale: d3.ScaleLinear<number, number>,
    startIdx: number,
    showPOC: boolean,
    showValueArea: boolean,
    theme: Theme
  ): void {
    this.pocGroup.selectAll('*').remove();
    
    const unitWidth = xScale(1) - xScale(0);
    
    data.forEach((candle, i) => {
      const x = xScale(startIdx + i);
      
      if (showPOC && candle.poc.length > 0) {
        candle.poc.forEach(pocPrice => {
          this.pocGroup.append('line')
            .attr('x1', x)
            .attr('x2', x + unitWidth - 2)
            .attr('y1', yScale(pocPrice))
            .attr('y2', yScale(pocPrice))
            .attr('stroke', theme.colors.poc)
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '3,2');
        });
      }
      
      if (showValueArea && candle.vah && candle.val) {
        // VAH line
        this.pocGroup.append('line')
          .attr('x1', x)
          .attr('x2', x + unitWidth - 2)
          .attr('y1', yScale(candle.vah))
          .attr('y2', yScale(candle.vah))
          .attr('stroke', theme.colors.accent)
          .attr('stroke-width', 1)
          .attr('stroke-opacity', 0.5);
          
        // VAL line
        this.pocGroup.append('line')
          .attr('x1', x)
          .attr('x2', x + unitWidth - 2)
          .attr('y1', yScale(candle.val))
          .attr('y2', yScale(candle.val))
          .attr('stroke', theme.colors.accent)
          .attr('stroke-width', 1)
          .attr('stroke-opacity', 0.5);
      }
    });
  }

  /**
   * Render DOM (Depth of Market) on the Y axis
   */
  public renderDOM(
    data: FootprintCandle[],
    yScale: d3.ScaleLinear<number, number>,
    width: number,
    stepHeight: number,
    theme: Theme
  ): void {
    this.domGroup.selectAll('*').remove();
    
    if (data.length === 0) return;
    
    const lastCandle = data[data.length - 1];
    const levels = Array.from(lastCandle.volumeProfile.values());
    const maxLiquidity = Math.max(...levels.map(l => Math.max(l.buyVolume, l.sellVolume)), 1);
    const barWidth = this.margin.right * 0.8;
    const barScale = d3.scaleLinear().domain([0, maxLiquidity]).range([0, barWidth]);

    const domX = width - this.margin.right + 5;

    levels.forEach(level => {
      const y = yScale(level.price) - stepHeight / 2;

      // Sell bar
      this.domGroup.append('rect')
        .attr('x', domX)
        .attr('y', y)
        .attr('width', barScale(level.sellVolume))
        .attr('height', stepHeight)
        .attr('fill', theme.colors.down)
        .attr('opacity', 0.4);

      // Buy bar (overlaid)
      this.domGroup.append('rect')
        .attr('x', domX)
        .attr('y', y)
        .attr('width', barScale(level.buyVolume))
        .attr('height', stepHeight)
        .attr('fill', theme.colors.up)
        .attr('opacity', 0.4);

      // Volume text
      this.domGroup.append('text')
        .attr('x', domX + barWidth - 2)
        .attr('y', y + stepHeight / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'end')
        .attr('fill', theme.colors.textSecondary)
        .style('font-size', '9px')
        .text(formatVolume(level.totalVolume));
    });
  }

  /**
   * Render crosshair
   */
  public renderCrosshair(
    x: number,
    y: number,
    width: number,
    height: number,
    price: number,
    timeLabel: string,
    theme: Theme
  ): void {
    this.crosshairGroup.style('display', null).selectAll('*').remove();

    const chartW = width - this.margin.right;
    const chartH = height - this.margin.top - this.margin.bottom;

    // Horizontal line
    this.crosshairGroup.append('line')
      .attr('x1', 0)
      .attr('x2', chartW)
      .attr('y1', y)
      .attr('y2', y)
      .attr('stroke', theme.colors.textSecondary)
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,4')
      .attr('opacity', 0.5);

    // Vertical line
    this.crosshairGroup.append('line')
      .attr('x1', x)
      .attr('x2', x)
      .attr('y1', 0)
      .attr('y2', chartH)
      .attr('stroke', theme.colors.textSecondary)
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,4')
      .attr('opacity', 0.5);

    // Price label
    const priceLabel = this.crosshairGroup.append('g')
      .attr('transform', `translate(${chartW}, ${y})`);

    priceLabel.append('rect')
      .attr('x', 0)
      .attr('y', -10)
      .attr('width', 55)
      .attr('height', 20)
      .attr('fill', theme.colors.accent)
      .attr('rx', 3);

    priceLabel.append('text')
      .attr('x', 27)
      .attr('y', 4)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .style('font-size', '11px')
      .text(formatPrice(price));

    // Time label
    const timeLabel2 = this.crosshairGroup.append('g')
      .attr('transform', `translate(${x}, ${chartH})`);

    timeLabel2.append('rect')
      .attr('x', -30)
      .attr('y', 0)
      .attr('width', 60)
      .attr('height', 20)
      .attr('fill', theme.colors.accent)
      .attr('rx', 3);

    timeLabel2.append('text')
      .attr('x', 0)
      .attr('y', 14)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .style('font-size', '11px')
      .text(timeLabel);
  }

  /**
   * Hide crosshair
   */
  public hideCrosshair(): void {
    this.crosshairGroup.style('display', 'none');
  }

  /**
   * Render drawings (trendlines, horizontals, fibs, etc.)
   */
  public renderDrawings(
    drawings: Drawing[],
    xScale: d3.ScaleLinear<number, number>,
    yScale: d3.ScaleLinear<number, number>,
    data: FootprintCandle[],
    intervalMs: number,
    theme: Theme
  ): void {
    this.drawingGroup.selectAll('*').remove();

    const getX = (point: DrawingPoint) => {
      const idx = getIndexFromTime(point.time, data, intervalMs);
      return xScale(idx);
    };
    const getY = (point: DrawingPoint) => yScale(point.price);

    const visibleDrawings = drawings.filter(d => d.visible !== false);

    visibleDrawings.forEach(drawing => {
      const g = this.drawingGroup.append('g')
        .attr('class', 'drawing-obj')
        .attr('opacity', drawing.selected ? 1 : 0.9)
        .style('pointer-events', drawing.locked ? 'none' : 'all');

      switch (drawing.type) {
        case 'trendline':
        case 'ray':
          this.renderTrendline(g, drawing, getX, getY);
          break;
        case 'horizontal':
          this.renderHorizontal(g, drawing, getY, xScale);
          break;
        case 'fib':
          this.renderFibonacci(g, drawing, getX, getY, theme);
          break;
        case 'pen':
          this.renderPenDrawing(g, drawing, getX, getY);
          break;
      }

      // Render anchors for selected drawings
      if (drawing.selected && !drawing.locked) {
        drawing.points.forEach(p => {
          g.append('circle')
            .attr('cx', getX(p))
            .attr('cy', getY(p))
            .attr('r', 6)
            .attr('fill', '#fff')
            .attr('stroke', theme.colors.accent)
            .attr('stroke-width', 2)
            .style('cursor', 'crosshair');
        });
      }
    });
  }

  private renderTrendline(
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    drawing: Drawing,
    getX: (p: DrawingPoint) => number,
    getY: (p: DrawingPoint) => number
  ): void {
    if (drawing.points.length < 2) return;

    const x1 = getX(drawing.points[0]);
    const y1 = getY(drawing.points[0]);
    const x2 = getX(drawing.points[1]);
    const y2 = getY(drawing.points[1]);

    // Invisible hit area
    g.append('line')
      .attr('x1', x1).attr('y1', y1)
      .attr('x2', x2).attr('y2', y2)
      .attr('stroke', 'transparent')
      .attr('stroke-width', 15)
      .style('cursor', 'move');

    // Visible line
    g.append('line')
      .attr('x1', x1).attr('y1', y1)
      .attr('x2', x2).attr('y2', y2)
      .attr('stroke', drawing.color)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', drawing.type === 'ray' ? '4,4' : 'none');
  }

  private renderHorizontal(
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    drawing: Drawing,
    getY: (p: DrawingPoint) => number,
    xScale: d3.ScaleLinear<number, number>
  ): void {
    if (drawing.points.length < 1) return;

    const y = getY(drawing.points[0]);
    const x1 = xScale.range()[0];
    const x2 = xScale.range()[1];

    g.append('line')
      .attr('x1', x1).attr('y1', y)
      .attr('x2', x2).attr('y2', y)
      .attr('stroke', drawing.color)
      .attr('stroke-width', 2);
  }

  private renderFibonacci(
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    drawing: Drawing,
    getX: (p: DrawingPoint) => number,
    getY: (p: DrawingPoint) => number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _theme: Theme
  ): void {
    if (drawing.points.length < 2) return;

    const x1 = getX(drawing.points[0]);
    const x2 = getX(drawing.points[1]);
    const levels = getFibLevels(drawing.points[0].price, drawing.points[1].price);

    // Main trendline
    g.append('line')
      .attr('x1', x1).attr('y1', getY(drawing.points[0]))
      .attr('x2', x2).attr('y2', getY(drawing.points[1]))
      .attr('stroke', drawing.color)
      .attr('stroke-dasharray', '2,2')
      .attr('opacity', 0.5);

    // Fib levels
    levels.forEach(l => {
      const y = getY({ price: l.y, time: 0 });
      
      g.append('line')
        .attr('x1', Math.min(x1, x2))
        .attr('x2', Math.max(x1, x2) + 100)
        .attr('y1', y)
        .attr('y2', y)
        .attr('stroke', drawing.color)
        .attr('stroke-width', 1)
        .attr('opacity', 0.7);

      g.append('text')
        .attr('x', Math.min(x1, x2))
        .attr('y', y - 2)
        .text(l.level.toFixed(3))
        .attr('fill', drawing.color)
        .style('font-size', '10px');
    });
  }

  private renderPenDrawing(
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    drawing: Drawing,
    getX: (p: DrawingPoint) => number,
    getY: (p: DrawingPoint) => number
  ): void {
    if (drawing.points.length < 2) return;

    const lineGen = d3.line<DrawingPoint>()
      .x(p => getX(p))
      .y(p => getY(p))
      .curve(d3.curveCatmullRom.alpha(0.5));

    // Hit area
    g.append('path')
      .attr('d', lineGen(drawing.points)!)
      .attr('fill', 'none')
      .attr('stroke', 'transparent')
      .attr('stroke-width', 20)
      .style('cursor', 'move');

    // Visible path
    g.append('path')
      .attr('d', lineGen(drawing.points)!)
      .attr('fill', 'none')
      .attr('stroke', drawing.color)
      .attr('stroke-width', 2)
      .attr('stroke-linejoin', 'round')
      .attr('stroke-linecap', 'round');
  }

  /**
   * Enable pointer events on SVG (for drawing interactions)
   */
  public enablePointerEvents(): void {
    this.svg.style('pointer-events', 'all');
  }

  /**
   * Disable pointer events on SVG
   */
  public disablePointerEvents(): void {
    this.svg.style('pointer-events', 'none');
  }

  /**
   * Get SVG element for event binding
   */
  public getSVGElement(): SVGSVGElement {
    return this.svg.node()!;
  }

  /**
   * Clean up
   */
  public destroy(): void {
    this.svg.remove();
  }
}
