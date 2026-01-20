/**
 * Grid Position Calculator
 * 
 * Calculates Top, Left, Height, Width CSS values from gridSizes percentages
 * for the insertMainGridPositionWeb API endpoint.
 */

import { LayoutType } from '../types';
import { TabGridPositionCell } from '../lib/gridPositionApi';

/**
 * Maps frontend layout types to API layout codes (g21, g22, etc.)
 */
export function mapLayoutToApiCode(layout: LayoutType | string): string {
  const layoutMap: Record<string, string> = {
      'single': 'g11',
      'two-vertical': 'g21',
      'two-horizontal': 'g22',
      'three-vertical': 'g32',
      'three-horizontal': 'g31',
      'three-left-right': 'g34',
      'three-top-bottom': 'g35',
      'three-left-stack': 'g34', // Similar to left-right
      'three-right-stack': 'g36',
      'four-grid': 'g41',
      'four-vertical': 'g42',
      'four-horizontal': 'g43',
      'five-grid': 'g51',
      'five-vertical': 'g52',
      'five-horizontal': 'g53',
      'no-grid': 'g11',
      // NEW FORMAT LAYOUT NAMES (matching the actual template layout values)
      '1-grid': 'g11',
      '2-grid-vertical': 'g21',
      '2-grid-horizontal': 'g22',
      '3-grid-rows': 'g31',
      '3-grid-columns': 'g32',
      '3-grid-left-large': 'g34',
      '3-grid-right-large': 'g36',
      '3-grid-top-large': 'g35',
      '3-grid-bottom-large': 'g33',
      '4-grid': 'g41',
      '4-grid-columns': 'g42',
      '4-grid-rows': 'g43',
      '4-grid-top-large': 'g44',
      '4-grid-left-large': 'g45',
      '4-grid-right-large': 'g46',
      '4-grid-bottom-large': 'g47',
      '5-grid-rows': 'g51',
      '5-grid-columns': 'g52',
      '5-grid-complex': 'g53',
      '6-grid-2x3': 'g61',
      '6-grid-3x2': 'g62',
      '6-grid-rows': 'g63',
      '6-grid-left-large': 'g64',
      '7-grid-complex1': 'g71',
      '7-grid-complex2': 'g72',
      '7-grid-left': 'g73',
      '7-grid-large': 'g74',
      '8-grid-2x4': 'g81',
      '8-grid-4x2': 'g82',
      '8-grid-columns': 'g83',
      '8-grid-rows': 'g84',
      '9-grid': 'g91',
      '12-grid-3x4': 'g121',
      '12-grid-4x3': 'g122',
      '16-grid': 'g161',
      '24-grid-4x6': 'g241',
      '24-grid-6x4': 'g242',
      '24-grid-rows': 'g243',
      '24-grid-columns': 'g244',
      '28-grid-4x7': 'g281',
      '28-grid-7x4': 'g282',
      '32-grid-4x8': 'g321',
      '32-grid-8x4': 'g322'
  };

  return layoutMap[layout] || 'g11';
}

/**
 * Maps frontend layout types to tabbed widget API layout codes (gt21, gt22, etc.)
 * Same as mapLayoutToApiCode but with 't' prefix for tabbed widgets
 */
export function mapLayoutToTabbedApiCode(layout: LayoutType | string): string {
  const apiCode = mapLayoutToApiCode(layout);
  // Replace 'g' with 'gt' to indicate tabbed widget
  return apiCode.replace(/^g/, 'gt');
}

/**
 * Generate cell position name for tabbed widgets (gtXX_N format)
 */
export function getTabbedWidgetCellPosition(layout: LayoutType | string, cellIndex: number): string {
  const tabbedApiCode = mapLayoutToTabbedApiCode(layout);
  // cellIndex is 0-based, but positions are 1-based
  return `${tabbedApiCode}_${cellIndex + 1}`;
}

/**
 * Generate cell position name for regular (non-tabbed) grids (gXX_N format)
 * Example: For 3-column layout, returns g31_1, g31_2, g31_3
 */
export function getGridCellPosition(layout: LayoutType | string, cellIndex: number): string {
  const apiCode = mapLayoutToApiCode(layout);
  // cellIndex is 0-based, but positions are 1-based
  return `${apiCode}_${cellIndex + 1}`;
}

/**
 * Calculate tabbed widget cell positions for API
 * Returns array of cell positions in the format expected by insertTabGridPositionWeb
 * 
 * @param layout Layout type
 * @param gridSizes Array of percentage sizes for each cell
 * @param tabid The tab ID (same for all cells)
 * @param containerHeight Optional container height for calc() functions (defaults to 100vh - 35px)
 */
export function calculateTabbedWidgetPositions(
  layout: LayoutType | string,
  gridSizes: number[],
  tabid: number,
  containerHeight: string = 'calc(100% - 35px)'
): TabGridPositionCell[] {
  const cellCount = gridSizes.length;
  const tabbedApiCode = mapLayoutToTabbedApiCode(layout);
  const positions: TabGridPositionCell[] = [];

  // Helper to format cell ID
  const cellId = (index: number) => `${tabbedApiCode}_${index + 1}`;

  // Calculate positions based on layout type
  if (layout === 'two-vertical' || layout === '2-grid-vertical' ||
      layout === 'three-vertical' || layout === '3-grid-columns' ||
      layout === 'four-vertical' || layout === '4-grid-columns' ||
      layout === 'five-vertical' || layout === '5-grid-columns') {
    // Vertical splits: cells side by side
    let leftAccumulator = 0;
    
    for (let i = 0; i < cellCount; i++) {
      const widthPercent = gridSizes[i];
      const leftPercent = leftAccumulator;
      
      positions.push({
        TabID: tabid,
        CellID: cellId(i),
        Left: i === 0 ? '0px' : `calc(${leftPercent.toFixed(4)}% + 1px)`,
        Top: '0px',
        Width: i === 0 ? `calc(${widthPercent.toFixed(4)}% - 1px)` : `calc(${widthPercent.toFixed(4)}% - 1px)`,
        Height: containerHeight
      });
      
      leftAccumulator += widthPercent;
    }
  } else if (layout === 'two-horizontal' || layout === '2-grid-horizontal' ||
             layout === 'three-horizontal' || layout === '3-grid-rows' ||
             layout === 'four-horizontal' || layout === '4-grid-rows' ||
             layout === 'five-horizontal' || layout === '5-grid-rows') {
    // Horizontal splits: cells stacked vertically
    let topAccumulator = 0;
    
    for (let i = 0; i < cellCount; i++) {
      const heightPercent = gridSizes[i];
      
      positions.push({
        TabID: tabid,
        CellID: cellId(i),
        Left: '0px',
        Top: i === 0 ? '0px' : `calc(${topAccumulator.toFixed(4)}% + 1px)`,
        Width: '100%',
        Height: i === 0 ? `calc(${heightPercent.toFixed(4)}% - 1px)` : `calc(${heightPercent.toFixed(4)}% - 1px)`
      });
      
      topAccumulator += heightPercent;
    }
  } else if (layout === 'three-left-right' || layout === '3-grid-left-large') {
    // Left panel + two right panels stacked
    const leftWidth = gridSizes[0];
    const rightTopHeight = gridSizes[1] / (gridSizes[1] + gridSizes[2]) * 100;
    const rightBottomHeight = gridSizes[2] / (gridSizes[1] + gridSizes[2]) * 100;
    
    // Left panel
    positions.push({
      TabID: tabid,
      CellID: cellId(0),
      Left: '0px',
      Top: '0px',
      Width: `calc(${leftWidth.toFixed(4)}% - 1px)`,
      Height: containerHeight
    });
    
    // Top right panel
    positions.push({
      TabID: tabid,
      CellID: cellId(1),
      Left: `calc(${leftWidth.toFixed(4)}% + 1px)`,
      Top: '0px',
      Width: `calc(${(100 - leftWidth).toFixed(4)}% - 1px)`,
      Height: `calc(${rightTopHeight.toFixed(4)}% - 1px)`
    });
    
    // Bottom right panel
    positions.push({
      TabID: tabid,
      CellID: cellId(2),
      Left: `calc(${leftWidth.toFixed(4)}% + 1px)`,
      Top: `calc(${rightTopHeight.toFixed(4)}% + 1px)`,
      Width: `calc(${(100 - leftWidth).toFixed(4)}% - 1px)`,
      Height: `calc(${rightBottomHeight.toFixed(4)}% - 1px)`
    });
  } else if (layout === 'three-right-stack' || layout === '3-grid-right-large') {
    // Two left panels stacked + right panel
    const rightWidth = gridSizes[2];
    const leftTopHeight = gridSizes[0] / (gridSizes[0] + gridSizes[1]) * 100;
    const leftBottomHeight = gridSizes[1] / (gridSizes[0] + gridSizes[1]) * 100;
    
    // Top left panel
    positions.push({
      TabID: tabid,
      CellID: cellId(0),
      Left: '0px',
      Top: '0px',
      Width: `calc(${(100 - rightWidth).toFixed(4)}% - 1px)`,
      Height: `calc(${leftTopHeight.toFixed(4)}% - 1px)`
    });
    
    // Bottom left panel
    positions.push({
      TabID: tabid,
      CellID: cellId(1),
      Left: '0px',
      Top: `calc(${leftTopHeight.toFixed(4)}% + 1px)`,
      Width: `calc(${(100 - rightWidth).toFixed(4)}% - 1px)`,
      Height: `calc(${leftBottomHeight.toFixed(4)}% - 1px)`
    });
    
    // Right panel
    positions.push({
      TabID: tabid,
      CellID: cellId(2),
      Left: `calc(${(100 - rightWidth).toFixed(4)}% + 1px)`,
      Top: '0px',
      Width: `calc(${rightWidth.toFixed(4)}% - 1px)`,
      Height: containerHeight
    });
  } else if (layout === 'four-grid' || layout === '4-grid') {
    // 2x2 grid
    // gridSizes format: [top height, topLeft width, topRight width, bottomLeft width, bottomRight width, bottom height]
    // If we have old format (4 values), use defaults for heights
    const topHeight = gridSizes.length >= 6 ? gridSizes[0] : 50;
    const topLeftWidth = gridSizes.length >= 6 ? gridSizes[1] : gridSizes[0];
    const topRightWidth = gridSizes.length >= 6 ? gridSizes[2] : gridSizes[1];
    const bottomLeftWidth = gridSizes.length >= 6 ? gridSizes[3] : gridSizes[2];
    const bottomRightWidth = gridSizes.length >= 6 ? gridSizes[4] : gridSizes[3];
    const bottomHeight = gridSizes.length >= 6 ? gridSizes[5] : (100 - topHeight);
    
    // Top left
    positions.push({
      TabID: tabid,
      CellID: cellId(0),
      Left: '0px',
      Top: '0px',
      Width: `calc(${topLeftWidth.toFixed(4)}% - 1px)`,
      Height: `calc(${topHeight.toFixed(4)}% - 1px)`
    });
    
    // Top right
    positions.push({
      TabID: tabid,
      CellID: cellId(1),
      Left: `calc(${topLeftWidth.toFixed(4)}% + 1px)`,
      Top: '0px',
      Width: `calc(${topRightWidth.toFixed(4)}% - 1px)`,
      Height: `calc(${topHeight.toFixed(4)}% - 1px)`
    });
    
    // Bottom left
    positions.push({
      TabID: tabid,
      CellID: cellId(2),
      Left: '0px',
      Top: `calc(${topHeight.toFixed(4)}% + 1px)`,
      Width: `calc(${bottomLeftWidth.toFixed(4)}% - 1px)`,
      Height: `calc(${bottomHeight.toFixed(4)}% - 1px)`
    });
    
    // Bottom right
    positions.push({
      TabID: tabid,
      CellID: cellId(3),
      Left: `calc(${bottomLeftWidth.toFixed(4)}% + 1px)`,
      Top: `calc(${topHeight.toFixed(4)}% + 1px)`,
      Width: `calc(${bottomRightWidth.toFixed(4)}% - 1px)`,
      Height: `calc(${bottomHeight.toFixed(4)}% - 1px)`
    });
  } else {
    // Default fallback: treat as vertical split
    let leftAccumulator = 0;
    for (let i = 0; i < cellCount; i++) {
      const widthPercent = gridSizes[i];
      positions.push({
        TabID: tabid,
        CellID: cellId(i),
        Left: i === 0 ? '0px' : `calc(${leftAccumulator.toFixed(4)}% + 1px)`,
        Top: '0px',
        Width: `calc(${widthPercent.toFixed(4)}% - 1px)`,
        Height: containerHeight
      });
      leftAccumulator += widthPercent;
    }
  }

  return positions;
}

/**
 * Calculate grid positions for API
 * Returns Top, Left, Height, Width strings in the format: "gXX_1:value|gXX_2:value"
 */
export function calculateGridPositions(
  layout: LayoutType,
  gridSizes: number[],
  apiLayoutCode: string
): {
  Top: string;
  Left: string;
  Height: string;
  Width: string;
} {
  const cellCount = gridSizes.length;
  const positions: {
    top: string[];
    left: string[];
    height: string[];
    width: string[];
  } = {
    top: [],
    left: [],
    height: [],
    width: []
  };

  // Helper to format cell class name
  const cellClass = (index: number) => `${apiLayoutCode}_${index + 1}`;

  // Calculate positions based on layout type
  // Handle both old format ('three-vertical') and new format ('3-grid-columns')
  if (layout === 'two-vertical' || layout === '2-grid-vertical' ||
      layout === 'three-vertical' || layout === '3-grid-columns' ||
      layout === 'four-vertical' || layout === '4-grid-columns' ||
      layout === 'five-vertical' || layout === '5-grid-columns' ||
      layout === '8-grid-columns') {
    // Vertical splits: all cells at top 0, heights are full viewport, widths are percentages, left accumulates
    let leftAccumulator = 0;
    
    for (let i = 0; i < cellCount; i++) {
      positions.top.push(`${cellClass(i)}:0`);
      positions.height.push(`${cellClass(i)}:calc(100vh - 50px)`);
      
      // Width is percentage from gridSizes
      const widthPercent = gridSizes[i];
      
      // First cell: just the percentage, subsequent cells: subtract gap (2px)
      if (i === 0) {
        positions.width.push(`${cellClass(i)}:${widthPercent.toFixed(4)}%`);
      } else {
        positions.width.push(`${cellClass(i)}:calc(${widthPercent.toFixed(4)}% - 2px)`);
      }
      
      // Left position accumulates from previous cells
      if (i === 0) {
        positions.left.push(`${cellClass(i)}:0`);
        leftAccumulator = widthPercent;
      } else {
        // Calculate left position considering gaps (2px between cells)
        const gapPx = 2 * i; // 2px gap for each previous cell
        const leftPercent = leftAccumulator;
        positions.left.push(`${cellClass(i)}:calc(${leftPercent.toFixed(4)}% + ${gapPx}px)`);
        leftAccumulator += widthPercent;
      }
    }
  } else if (layout === 'two-horizontal' || layout === '2-grid-horizontal' ||
             layout === 'three-horizontal' || layout === '3-grid-rows' ||
             layout === 'four-horizontal' || layout === '4-grid-rows' ||
             layout === 'five-horizontal' || layout === '5-grid-rows' ||
             layout === '8-grid-rows') {
    // Horizontal splits: all cells at left 0, widths are full, heights are percentages, top accumulates
    let topAccumulator = 0;
    
    for (let i = 0; i < cellCount; i++) {
      positions.left.push(`${cellClass(i)}:0`);
      positions.width.push(`${cellClass(i)}:100%`);
      
      // Height is percentage from gridSizes
      const heightPercent = gridSizes[i];
      positions.height.push(`${cellClass(i)}:${heightPercent.toFixed(4)}%`);
      
      // Top position accumulates from previous cells
      if (i === 0) {
        positions.top.push(`${cellClass(i)}:0`);
        topAccumulator = heightPercent;
      } else {
        positions.top.push(`${cellClass(i)}:${topAccumulator.toFixed(4)}%`);
        topAccumulator += heightPercent;
      }
    }
  } else if (layout === 'three-left-right' || layout === '3-grid-left-large') {
    // Left panel + two right panels stacked
    // gridSizes format: [left%, rightTop%, rightBottom%]
    // Note: rightTop% and rightBottom% are already percentages of the right container (sum to 100%)
    const leftWidth = gridSizes[0];
    // gridSizes[1] and gridSizes[2] are already percentages of the right container, use them directly
    const rightTopHeight = gridSizes[1];
    const rightBottomHeight = gridSizes[2];
    
    // Left panel
    positions.top.push(`${cellClass(0)}:0`);
    positions.left.push(`${cellClass(0)}:0`);
    positions.height.push(`${cellClass(0)}:calc(100vh - 50px)`);
    positions.width.push(`${cellClass(0)}:${leftWidth.toFixed(4)}%`);
    
    // Top right panel
    // Height needs to be rightTopHeight% of the right container (which is calc(100vh - 50px))
    positions.top.push(`${cellClass(1)}:0`);
    const rightLeft = `calc(${leftWidth.toFixed(4)}% + 2px)`;
    positions.left.push(`${cellClass(1)}:${rightLeft}`);
    positions.height.push(`${cellClass(1)}:calc((100vh - 50px) * ${(rightTopHeight / 100).toFixed(6)})`);
    positions.width.push(`${cellClass(1)}:calc(${(100 - leftWidth).toFixed(4)}% - 2px)`);
    
    // Bottom right panel
    // Top position should be rightTopHeight% of the right container height
    // Height should be rightBottomHeight% of the right container height
    const bottomTop = `calc((100vh - 50px) * ${(rightTopHeight / 100).toFixed(6)})`;
    positions.top.push(`${cellClass(2)}:${bottomTop}`);
    positions.left.push(`${cellClass(2)}:${rightLeft}`);
    positions.height.push(`${cellClass(2)}:calc((100vh - 50px) * ${(rightBottomHeight / 100).toFixed(6)})`);
    positions.width.push(`${cellClass(2)}:calc(${(100 - leftWidth).toFixed(4)}% - 2px)`);
  } else if (layout === 'three-top-bottom' || layout === '3-grid-top-large') {
    // Top panel + two bottom panels side-by-side
    // gridSizes format: [top%, bottomLeft%, bottomRight%]
    // Note: bottomLeft% and bottomRight% are percentages of the bottom container (sum to 100%)
    const topHeight = gridSizes[0];
    const bottomLeftWidth = gridSizes[1];
    const bottomRightWidth = gridSizes[2];
    
    // Top panel
    positions.top.push(`${cellClass(0)}:0`);
    positions.left.push(`${cellClass(0)}:0`);
    positions.height.push(`${cellClass(0)}:${topHeight.toFixed(4)}%`);
    positions.width.push(`${cellClass(0)}:100%`);
    
    // Bottom left panel
    const bottomTop = `${topHeight.toFixed(4)}%`;
    positions.top.push(`${cellClass(1)}:${bottomTop}`);
    positions.left.push(`${cellClass(1)}:0`);
    positions.height.push(`${cellClass(1)}:${(100 - topHeight).toFixed(4)}%`);
    positions.width.push(`${cellClass(1)}:${bottomLeftWidth.toFixed(4)}%`);
    
    // Bottom right panel
    positions.top.push(`${cellClass(2)}:${bottomTop}`);
    positions.left.push(`${cellClass(2)}:calc(${bottomLeftWidth.toFixed(4)}% + 2px)`);
    positions.height.push(`${cellClass(2)}:${(100 - topHeight).toFixed(4)}%`);
    positions.width.push(`${cellClass(2)}:calc(${bottomRightWidth.toFixed(4)}% - 2px)`);
  } else if (layout === '3-grid-bottom-large') {
    // Two top panels side-by-side + bottom panel
    // gridSizes format: [topLeft%, topRight%, bottom%]
    // Note: topLeft% and topRight% are percentages of the top container (sum to 100%)
    const bottomHeight = gridSizes[2];
    const topLeftWidth = gridSizes[0];
    const topRightWidth = gridSizes[1];
    
    // Top left panel
    positions.top.push(`${cellClass(0)}:0`);
    positions.left.push(`${cellClass(0)}:0`);
    positions.height.push(`${cellClass(0)}:${(100 - bottomHeight).toFixed(4)}%`);
    positions.width.push(`${cellClass(0)}:${topLeftWidth.toFixed(4)}%`);
    
    // Top right panel
    positions.top.push(`${cellClass(1)}:0`);
    positions.left.push(`${cellClass(1)}:calc(${topLeftWidth.toFixed(4)}% + 2px)`);
    positions.height.push(`${cellClass(1)}:${(100 - bottomHeight).toFixed(4)}%`);
    positions.width.push(`${cellClass(1)}:calc(${topRightWidth.toFixed(4)}% - 2px)`);
    
    // Bottom panel
    const bottomTop = `${(100 - bottomHeight).toFixed(4)}%`;
    positions.top.push(`${cellClass(2)}:${bottomTop}`);
    positions.left.push(`${cellClass(2)}:0`);
    positions.height.push(`${cellClass(2)}:${bottomHeight.toFixed(4)}%`);
    positions.width.push(`${cellClass(2)}:100%`);
  } else if (layout === 'three-right-stack' || layout === '3-grid-right-large') {
    // Two left panels stacked + right panel
    // gridSizes format: [leftTop%, leftBottom%, right%]
    // Note: leftTop% and leftBottom% are percentages of the left container (sum to 100%)
    const rightWidth = gridSizes[2];
    const leftTopHeight = gridSizes[0];
    const leftBottomHeight = gridSizes[1];
    
    // Top left panel
    // Height needs to be leftTopHeight% of the left container (which is calc(100vh - 50px))
    positions.top.push(`${cellClass(0)}:0`);
    positions.left.push(`${cellClass(0)}:0`);
    positions.height.push(`${cellClass(0)}:calc((100vh - 50px) * ${(leftTopHeight / 100).toFixed(6)})`);
    positions.width.push(`${cellClass(0)}:${(100 - rightWidth).toFixed(4)}%`);
    
    // Bottom left panel
    // Top position should be leftTopHeight% of the left container height
    // Height should be leftBottomHeight% of the left container height
    const bottomTop = `calc((100vh - 50px) * ${(leftTopHeight / 100).toFixed(6)})`;
    positions.top.push(`${cellClass(1)}:${bottomTop}`);
    positions.left.push(`${cellClass(1)}:0`);
    positions.height.push(`${cellClass(1)}:calc((100vh - 50px) * ${(leftBottomHeight / 100).toFixed(6)})`);
    positions.width.push(`${cellClass(1)}:${(100 - rightWidth).toFixed(4)}%`);
    
    // Right panel
    const rightLeft = `calc(${(100 - rightWidth).toFixed(4)}% + 2px)`;
    positions.top.push(`${cellClass(2)}:0`);
    positions.left.push(`${cellClass(2)}:${rightLeft}`);
    positions.height.push(`${cellClass(2)}:calc(100vh - 50px)`);
    positions.width.push(`${cellClass(2)}:calc(${rightWidth.toFixed(4)}% - 2px)`);
  } else if (layout === 'four-grid' || layout === '4-grid') {
    // 2x2 grid layout
    // gridSizes format: [top height, topLeft width, topRight width, bottomLeft width, bottomRight width, bottom height]
    // If we have old format (4 values), use defaults for heights
    const topHeight = (gridSizes.length >= 6 ? gridSizes[0] : 50) || 50;
    const topLeftWidth = (gridSizes.length >= 6 ? gridSizes[1] : (gridSizes[0] || 50)) || 50;
    const topRightWidth = (gridSizes.length >= 6 ? gridSizes[2] : (gridSizes[1] || 50)) || 50;
    const bottomLeftWidth = (gridSizes.length >= 6 ? gridSizes[3] : (gridSizes[2] || 50)) || 50;
    const bottomRightWidth = (gridSizes.length >= 6 ? gridSizes[4] : (gridSizes[3] || 50)) || 50;
    const bottomHeight = (gridSizes.length >= 6 ? gridSizes[5] : (100 - topHeight)) || 50;
    
    // Top left
    positions.top.push(`${cellClass(0)}:0`);
    positions.left.push(`${cellClass(0)}:0`);
    positions.height.push(`${cellClass(0)}:${topHeight.toFixed(4)}%`);
    positions.width.push(`${cellClass(0)}:${topLeftWidth.toFixed(4)}%`);
    
    // Top right
    positions.top.push(`${cellClass(1)}:0`);
    positions.left.push(`${cellClass(1)}:calc(${topLeftWidth.toFixed(4)}% + 2px)`);
    positions.height.push(`${cellClass(1)}:${topHeight.toFixed(4)}%`);
    positions.width.push(`${cellClass(1)}:calc(${topRightWidth.toFixed(4)}% - 2px)`);
    
    // Bottom left
    positions.top.push(`${cellClass(2)}:${topHeight.toFixed(4)}%`);
    positions.left.push(`${cellClass(2)}:0`);
    positions.height.push(`${cellClass(2)}:${bottomHeight.toFixed(4)}%`);
    positions.width.push(`${cellClass(2)}:${bottomLeftWidth.toFixed(4)}%`);
    
    // Bottom right
    positions.top.push(`${cellClass(3)}:${topHeight.toFixed(4)}%`);
    positions.left.push(`${cellClass(3)}:calc(${bottomLeftWidth.toFixed(4)}% + 2px)`);
    positions.height.push(`${cellClass(3)}:${bottomHeight.toFixed(4)}%`);
    positions.width.push(`${cellClass(3)}:calc(${bottomRightWidth.toFixed(4)}% - 2px)`);
  } else if (layout === '4-grid-top-large') {
    // 1 large top panel (full width) + 3 bottom panels (horizontal)
    // gridSizes: [top height, bottomLeft width, bottomMiddle width, bottomRight width (calculated)]
    const topHeight = gridSizes[0];
    const bottomLeft = gridSizes[1] || 33.33;
    const bottomMiddle = gridSizes[2] || 33.33;
    const bottomHeight = 100 - topHeight;
    
    // Top panel (area-1)
    positions.top.push(`${cellClass(0)}:0`);
    positions.left.push(`${cellClass(0)}:0`);
    positions.height.push(`${cellClass(0)}:${topHeight.toFixed(4)}%`);
    positions.width.push(`${cellClass(0)}:100%`);
    
    // Bottom left (area-2)
    positions.top.push(`${cellClass(1)}:${topHeight.toFixed(4)}%`);
    positions.left.push(`${cellClass(1)}:0`);
    positions.height.push(`${cellClass(1)}:${bottomHeight.toFixed(4)}%`);
    positions.width.push(`${cellClass(1)}:${bottomLeft.toFixed(4)}%`);
    
    // Bottom middle (area-3)
    positions.top.push(`${cellClass(2)}:${topHeight.toFixed(4)}%`);
    positions.left.push(`${cellClass(2)}:calc(${bottomLeft.toFixed(4)}% + 2px)`);
    positions.height.push(`${cellClass(2)}:${bottomHeight.toFixed(4)}%`);
    positions.width.push(`${cellClass(2)}:calc(${bottomMiddle.toFixed(4)}% - 2px)`);
    
    // Bottom right (area-4)
    const bottomRight = 100 - bottomLeft - bottomMiddle;
    positions.top.push(`${cellClass(3)}:${topHeight.toFixed(4)}%`);
    positions.left.push(`${cellClass(3)}:calc(${(bottomLeft + bottomMiddle).toFixed(4)}% + 4px)`);
    positions.height.push(`${cellClass(3)}:${bottomHeight.toFixed(4)}%`);
    positions.width.push(`${cellClass(3)}:calc(${bottomRight.toFixed(4)}% - 4px)`);
  } else if (layout === '4-grid-left-large') {
    // 1 large left panel (full height) + 3 right panels (vertical stack)
    // gridSizes: [left width, rightTop height, rightMiddle height, rightBottom height (calculated)]
    // Note: rightTop, rightMiddle, rightBottom are percentages of the right container (sum to ~100%)
    const leftWidth = gridSizes[0];
    const rightTop = gridSizes[1] || 33.33;
    const rightMiddle = gridSizes[2] || 33.33;
    const rightWidth = 100 - leftWidth;
    
    // Left panel (area-1)
    positions.top.push(`${cellClass(0)}:0`);
    positions.left.push(`${cellClass(0)}:0`);
    positions.height.push(`${cellClass(0)}:calc(100vh - 50px)`);
    positions.width.push(`${cellClass(0)}:${leftWidth.toFixed(4)}%`);
    
    // Right top (area-2)
    // Height needs to be rightTop% of the right container (which is calc(100vh - 50px))
    positions.top.push(`${cellClass(1)}:0`);
    positions.left.push(`${cellClass(1)}:calc(${leftWidth.toFixed(4)}% + 2px)`);
    positions.height.push(`${cellClass(1)}:calc((100vh - 50px) * ${(rightTop / 100).toFixed(6)})`);
    positions.width.push(`${cellClass(1)}:calc(${rightWidth.toFixed(4)}% - 2px)`);
    
    // Right middle (area-3)
    // Top position and height are both relative to right container
    positions.top.push(`${cellClass(2)}:calc((100vh - 50px) * ${(rightTop / 100).toFixed(6)})`);
    positions.left.push(`${cellClass(2)}:calc(${leftWidth.toFixed(4)}% + 2px)`);
    positions.height.push(`${cellClass(2)}:calc((100vh - 50px) * ${(rightMiddle / 100).toFixed(6)})`);
    positions.width.push(`${cellClass(2)}:calc(${rightWidth.toFixed(4)}% - 2px)`);
    
    // Right bottom (area-4)
    const rightBottom = 100 - rightTop - rightMiddle;
    positions.top.push(`${cellClass(3)}:calc((100vh - 50px) * ${((rightTop + rightMiddle) / 100).toFixed(6)})`);
    positions.left.push(`${cellClass(3)}:calc(${leftWidth.toFixed(4)}% + 2px)`);
    positions.height.push(`${cellClass(3)}:calc((100vh - 50px) * ${(rightBottom / 100).toFixed(6)})`);
    positions.width.push(`${cellClass(3)}:calc(${rightWidth.toFixed(4)}% - 2px)`);
  } else if (layout === '4-grid-bottom-large') {
    // 1 top panel (full width) + 3 bottom panels (horizontal)
    // gridSizes: [top height, bottomLeft width, bottomMiddle width, bottomRight width (calculated)]
    const topHeight = gridSizes[0] || 50;
    const bottomHeight = 100 - topHeight;
    const bottomLeft = gridSizes[1] || 33.33;
    const bottomMiddle = gridSizes[2] || 33.33;
    const bottomRight = 100 - bottomLeft - bottomMiddle;
    
    // Top panel (area-1) - full width
    positions.top.push(`${cellClass(0)}:0`);
    positions.left.push(`${cellClass(0)}:0`);
    positions.height.push(`${cellClass(0)}:${topHeight.toFixed(4)}%`);
    positions.width.push(`${cellClass(0)}:100%`);
    
    // Bottom left (area-2)
    positions.top.push(`${cellClass(1)}:${topHeight.toFixed(4)}%`);
    positions.left.push(`${cellClass(1)}:0`);
    positions.height.push(`${cellClass(1)}:${bottomHeight.toFixed(4)}%`);
    positions.width.push(`${cellClass(1)}:${bottomLeft.toFixed(4)}%`);
    
    // Bottom middle (area-3)
    positions.top.push(`${cellClass(2)}:${topHeight.toFixed(4)}%`);
    positions.left.push(`${cellClass(2)}:calc(${bottomLeft.toFixed(4)}% + 2px)`);
    positions.height.push(`${cellClass(2)}:${bottomHeight.toFixed(4)}%`);
    positions.width.push(`${cellClass(2)}:calc(${bottomMiddle.toFixed(4)}% - 2px)`);
    
    // Bottom right (area-4)
    positions.top.push(`${cellClass(3)}:${topHeight.toFixed(4)}%`);
    positions.left.push(`${cellClass(3)}:calc(${(bottomLeft + bottomMiddle).toFixed(4)}% + 4px)`);
    positions.height.push(`${cellClass(3)}:${bottomHeight.toFixed(4)}%`);
    positions.width.push(`${cellClass(3)}:calc(${bottomRight.toFixed(4)}% - 4px)`);
  } else if (layout === '4-grid-right-large') {
    // 3 left panels (vertical stack) + 1 large right panel (full height)
    // gridSizes: [leftTop height, leftMiddle height, leftBottom height (calculated), right width]
    // Note: leftTop, leftMiddle, leftBottom are percentages of the left container (sum to ~100%)
    const leftTop = gridSizes[0] || 33.33;
    const leftMiddle = gridSizes[1] || 33.33;
    const rightWidth = gridSizes[3] || gridSizes[2] || 50;
    const leftWidth = 100 - rightWidth;
    
    // Left top (area-1)
    // Height needs to be leftTop% of the left container (which is calc(100vh - 50px))
    positions.top.push(`${cellClass(0)}:0`);
    positions.left.push(`${cellClass(0)}:0`);
    positions.height.push(`${cellClass(0)}:calc((100vh - 50px) * ${(leftTop / 100).toFixed(6)})`);
    positions.width.push(`${cellClass(0)}:${leftWidth.toFixed(4)}%`);
    
    // Left middle (area-2)
    // Top position and height are both relative to left container
    positions.top.push(`${cellClass(1)}:calc((100vh - 50px) * ${(leftTop / 100).toFixed(6)})`);
    positions.left.push(`${cellClass(1)}:0`);
    positions.height.push(`${cellClass(1)}:calc((100vh - 50px) * ${(leftMiddle / 100).toFixed(6)})`);
    positions.width.push(`${cellClass(1)}:${leftWidth.toFixed(4)}%`);
    
    // Left bottom (area-3)
    const leftBottom = 100 - leftTop - leftMiddle;
    positions.top.push(`${cellClass(2)}:calc((100vh - 50px) * ${((leftTop + leftMiddle) / 100).toFixed(6)})`);
    positions.left.push(`${cellClass(2)}:0`);
    positions.height.push(`${cellClass(2)}:calc((100vh - 50px) * ${(leftBottom / 100).toFixed(6)})`);
    positions.width.push(`${cellClass(2)}:${leftWidth.toFixed(4)}%`);
    
    // Right panel (area-4)
    positions.top.push(`${cellClass(3)}:0`);
    positions.left.push(`${cellClass(3)}:calc(${leftWidth.toFixed(4)}% + 2px)`);
    positions.height.push(`${cellClass(3)}:calc(100vh - 50px)`);
    positions.width.push(`${cellClass(3)}:calc(${rightWidth.toFixed(4)}% - 2px)`);
  } else if (layout === '5-grid-complex') {
    // 5-grid-complex: top row (2 cells: area-1 spans 2 columns, area-2) + bottom row (3 cells)
    // gridSizes format: [top height, topLeft width, topRight width, bottomLeft width, bottomMiddle width, bottomRight width]
    const topHeight = gridSizes[0] || 50;
    const topLeftWidth = gridSizes[1] || 50;
    const topRightWidth = gridSizes[2] || 50;
    const bottomLeftWidth = gridSizes[3] || 33.33;
    const bottomMiddleWidth = gridSizes[4] || 33.33;
    const bottomRightWidth = gridSizes[5] || 33.34;
    const bottomHeight = 100 - topHeight;
    
    // Area-1: top left, spans 2 columns (x:0-1, y:0)
    positions.top.push(`${cellClass(0)}:0`);
    positions.left.push(`${cellClass(0)}:0`);
    positions.height.push(`${cellClass(0)}:${topHeight.toFixed(4)}%`);
    positions.width.push(`${cellClass(0)}:${topLeftWidth.toFixed(4)}%`);
    
    // Area-2: top right (x:2, y:0)
    positions.top.push(`${cellClass(1)}:0`);
    positions.left.push(`${cellClass(1)}:calc(${topLeftWidth.toFixed(4)}% + 2px)`);
    positions.height.push(`${cellClass(1)}:${topHeight.toFixed(4)}%`);
    positions.width.push(`${cellClass(1)}:calc(${topRightWidth.toFixed(4)}% - 2px)`);
    
    // Area-3: bottom left (x:0, y:1)
    positions.top.push(`${cellClass(2)}:${topHeight.toFixed(4)}%`);
    positions.left.push(`${cellClass(2)}:0`);
    positions.height.push(`${cellClass(2)}:${bottomHeight.toFixed(4)}%`);
    positions.width.push(`${cellClass(2)}:${bottomLeftWidth.toFixed(4)}%`);
    
    // Area-4: bottom middle (x:1, y:1)
    positions.top.push(`${cellClass(3)}:${topHeight.toFixed(4)}%`);
    positions.left.push(`${cellClass(3)}:calc(${bottomLeftWidth.toFixed(4)}% + 2px)`);
    positions.height.push(`${cellClass(3)}:${bottomHeight.toFixed(4)}%`);
    positions.width.push(`${cellClass(3)}:calc(${bottomMiddleWidth.toFixed(4)}% - 2px)`);
    
    // Area-5: bottom right (x:2, y:1)
    positions.top.push(`${cellClass(4)}:${topHeight.toFixed(4)}%`);
    positions.left.push(`${cellClass(4)}:calc(${(bottomLeftWidth + bottomMiddleWidth).toFixed(4)}% + 4px)`);
    positions.height.push(`${cellClass(4)}:${bottomHeight.toFixed(4)}%`);
    positions.width.push(`${cellClass(4)}:calc(${bottomRightWidth.toFixed(4)}% - 4px)`);
  } else if (layout === '7-grid-large') {
    // 7-grid-large: 1 left cell (full height) + 6 right cells (stacked vertically)
    // gridSizes format: [leftWidth, rightCell1Height, rightCell2Height, rightCell3Height, rightCell4Height, rightCell5Height, rightCell6Height]
    // Note: rightCell heights are percentages of the right container (sum to ~100%)
    const leftWidth = gridSizes[0] || 50;
    const rightWidth = 100 - leftWidth;
    const rightCellHeights = gridSizes.slice(1, 7); // Get heights for 6 right cells
    
    // Left cell (area-1): full height, variable width
    positions.top.push(`${cellClass(0)}:0`);
    positions.left.push(`${cellClass(0)}:0`);
    positions.height.push(`${cellClass(0)}:calc(100vh - 50px)`);
    positions.width.push(`${cellClass(0)}:${leftWidth.toFixed(4)}%`);
    
    // Right cells (areas 2-7): stacked vertically, same width
    // Heights are relative to right container
    let topAccumulator = 0;
    for (let i = 0; i < 6; i++) {
      const cellIndex = i + 1; // area-2 through area-7
      const cellHeight = rightCellHeights[i] || 16.67;
      
      positions.top.push(`${cellClass(cellIndex)}:${i === 0 ? '0' : `calc((100vh - 50px) * ${(topAccumulator / 100).toFixed(6)})`}`);
      positions.left.push(`${cellClass(cellIndex)}:calc(${leftWidth.toFixed(4)}% + 2px)`);
      positions.height.push(`${cellClass(cellIndex)}:calc((100vh - 50px) * ${(cellHeight / 100).toFixed(6)})`);
      positions.width.push(`${cellClass(cellIndex)}:calc(${rightWidth.toFixed(4)}% - 2px)`);
      
      topAccumulator += cellHeight;
    }
  } else if (layout === '6-grid-2x3') {
    // 6-grid-2x3: 2 rows x 3 columns (3 top cells, 3 bottom cells)
    // gridSizes format: [top height, topLeft width, topMiddle width, topRight width, bottomLeft width, bottomMiddle width, bottomRight width]
    const topHeight = gridSizes[0] || 50;
    const topLeftWidth = gridSizes[1] || 33.33;
    const topMiddleWidth = gridSizes[2] || 33.33;
    const topRightWidth = gridSizes[3] || 33.34;
    const bottomLeftWidth = gridSizes[4] || 33.33;
    const bottomMiddleWidth = gridSizes[5] || 33.33;
    const bottomRightWidth = gridSizes[6] || 33.34;
    const bottomHeight = 100 - topHeight;
    
    // Top row - 3 cells
    // Top left
    positions.top.push(`${cellClass(0)}:0`);
    positions.left.push(`${cellClass(0)}:0`);
    positions.height.push(`${cellClass(0)}:${topHeight.toFixed(4)}%`);
    positions.width.push(`${cellClass(0)}:${topLeftWidth.toFixed(4)}%`);
    
    // Top middle
    positions.top.push(`${cellClass(1)}:0`);
    positions.left.push(`${cellClass(1)}:calc(${topLeftWidth.toFixed(4)}% + 2px)`);
    positions.height.push(`${cellClass(1)}:${topHeight.toFixed(4)}%`);
    positions.width.push(`${cellClass(1)}:calc(${topMiddleWidth.toFixed(4)}% - 2px)`);
    
    // Top right
    positions.top.push(`${cellClass(2)}:0`);
    positions.left.push(`${cellClass(2)}:calc(${(topLeftWidth + topMiddleWidth).toFixed(4)}% + 4px)`);
    positions.height.push(`${cellClass(2)}:${topHeight.toFixed(4)}%`);
    positions.width.push(`${cellClass(2)}:calc(${topRightWidth.toFixed(4)}% - 4px)`);
    
    // Bottom row - 3 cells
    // Bottom left
    positions.top.push(`${cellClass(3)}:${topHeight.toFixed(4)}%`);
    positions.left.push(`${cellClass(3)}:0`);
    positions.height.push(`${cellClass(3)}:${bottomHeight.toFixed(4)}%`);
    positions.width.push(`${cellClass(3)}:${bottomLeftWidth.toFixed(4)}%`);
    
    // Bottom middle
    positions.top.push(`${cellClass(4)}:${topHeight.toFixed(4)}%`);
    positions.left.push(`${cellClass(4)}:calc(${bottomLeftWidth.toFixed(4)}% + 2px)`);
    positions.height.push(`${cellClass(4)}:${bottomHeight.toFixed(4)}%`);
    positions.width.push(`${cellClass(4)}:calc(${bottomMiddleWidth.toFixed(4)}% - 2px)`);
    
    // Bottom right
    positions.top.push(`${cellClass(5)}:${topHeight.toFixed(4)}%`);
    positions.left.push(`${cellClass(5)}:calc(${(bottomLeftWidth + bottomMiddleWidth).toFixed(4)}% + 4px)`);
    positions.height.push(`${cellClass(5)}:${bottomHeight.toFixed(4)}%`);
    positions.width.push(`${cellClass(5)}:calc(${bottomRightWidth.toFixed(4)}% - 4px)`);
  } else if (layout === '6-grid-3x2') {
    // 6-grid-3x2: Rendered as 2 columns x 3 rows (left column: area-1,3,5 / right column: area-2,4,6)
    // gridSizes format: [left width, leftTop height, leftMiddle height, leftBottom height, rightTop height, rightMiddle height, rightBottom height]
    // Note: cell heights are percentages of their respective columns
    const leftWidth = gridSizes[0] || 50;
    const leftTopHeight = gridSizes[1] || 33.33;
    const leftMiddleHeight = gridSizes[2] || 33.33;
    const leftBottomHeight = gridSizes[3] || 33.34;
    const rightTopHeight = gridSizes[4] || 33.33;
    const rightMiddleHeight = gridSizes[5] || 33.33;
    const rightBottomHeight = gridSizes[6] || 33.34;
    const rightWidth = 100 - leftWidth;
    
    // Left column - 3 cells stacked vertically
    // area-1 (left top)
    positions.top.push(`${cellClass(0)}:0`);
    positions.left.push(`${cellClass(0)}:0`);
    positions.height.push(`${cellClass(0)}:calc((100vh - 50px) * ${(leftTopHeight / 100).toFixed(6)})`);
    positions.width.push(`${cellClass(0)}:${leftWidth.toFixed(4)}%`);
    
    // area-3 (left middle)
    positions.top.push(`${cellClass(2)}:calc((100vh - 50px) * ${(leftTopHeight / 100).toFixed(6)})`);
    positions.left.push(`${cellClass(2)}:0`);
    positions.height.push(`${cellClass(2)}:calc((100vh - 50px) * ${(leftMiddleHeight / 100).toFixed(6)})`);
    positions.width.push(`${cellClass(2)}:${leftWidth.toFixed(4)}%`);
    
    // area-5 (left bottom)
    positions.top.push(`${cellClass(4)}:calc((100vh - 50px) * ${((leftTopHeight + leftMiddleHeight) / 100).toFixed(6)})`);
    positions.left.push(`${cellClass(4)}:0`);
    positions.height.push(`${cellClass(4)}:calc((100vh - 50px) * ${(leftBottomHeight / 100).toFixed(6)})`);
    positions.width.push(`${cellClass(4)}:${leftWidth.toFixed(4)}%`);
    
    // Right column - 3 cells stacked vertically
    // area-2 (right top)
    positions.top.push(`${cellClass(1)}:0`);
    positions.left.push(`${cellClass(1)}:calc(${leftWidth.toFixed(4)}% + 2px)`);
    positions.height.push(`${cellClass(1)}:calc((100vh - 50px) * ${(rightTopHeight / 100).toFixed(6)})`);
    positions.width.push(`${cellClass(1)}:calc(${rightWidth.toFixed(4)}% - 2px)`);
    
    // area-4 (right middle)
    positions.top.push(`${cellClass(3)}:calc((100vh - 50px) * ${(rightTopHeight / 100).toFixed(6)})`);
    positions.left.push(`${cellClass(3)}:calc(${leftWidth.toFixed(4)}% + 2px)`);
    positions.height.push(`${cellClass(3)}:calc((100vh - 50px) * ${(rightMiddleHeight / 100).toFixed(6)})`);
    positions.width.push(`${cellClass(3)}:calc(${rightWidth.toFixed(4)}% - 2px)`);
    
    // area-6 (right bottom)
    positions.top.push(`${cellClass(5)}:calc((100vh - 50px) * ${((rightTopHeight + rightMiddleHeight) / 100).toFixed(6)})`);
    positions.left.push(`${cellClass(5)}:calc(${leftWidth.toFixed(4)}% + 2px)`);
    positions.height.push(`${cellClass(5)}:calc((100vh - 50px) * ${(rightBottomHeight / 100).toFixed(6)})`);
    positions.width.push(`${cellClass(5)}:calc(${rightWidth.toFixed(4)}% - 2px)`);
  } else if (layout === '6-grid-left-large') {
    // 6-grid-left-large: 1 large left panel + 5 right panels stacked vertically
    // gridSizes format: [left width, rightTop height, rightMiddle height, rightMiddle2 height, rightMiddle3 height, rightBottom height]
    // Note: right cell heights are percentages of the right container (sum to ~100%)
    const leftWidth = gridSizes[0] || 50;
    const rightWidth = 100 - leftWidth;
    const rightCellHeights = [
      gridSizes[1] || 20,
      gridSizes[2] || 20,
      gridSizes[3] || 20,
      gridSizes[4] || 20,
      gridSizes[5] || 20
    ];
    
    // Left panel (area-1)
    positions.top.push(`${cellClass(0)}:0`);
    positions.left.push(`${cellClass(0)}:0`);
    positions.height.push(`${cellClass(0)}:calc(100vh - 50px)`);
    positions.width.push(`${cellClass(0)}:${leftWidth.toFixed(4)}%`);
    
    // Right cells (areas 2-6): stacked vertically
    let topAccumulator = 0;
    for (let i = 0; i < 5; i++) {
      const cellIndex = i + 1; // area-2 through area-6
      const cellHeight = rightCellHeights[i];
      
      positions.top.push(`${cellClass(cellIndex)}:${i === 0 ? '0' : `calc((100vh - 50px) * ${(topAccumulator / 100).toFixed(6)})`}`);
      positions.left.push(`${cellClass(cellIndex)}:calc(${leftWidth.toFixed(4)}% + 2px)`);
      positions.height.push(`${cellClass(cellIndex)}:calc((100vh - 50px) * ${(cellHeight / 100).toFixed(6)})`);
      positions.width.push(`${cellClass(cellIndex)}:calc(${rightWidth.toFixed(4)}% - 2px)`);
      
      topAccumulator += cellHeight;
    }
  } else if (layout === '8-grid-2x4') {
    // 8-grid-2x4: Rendered as 2 columns x 4 rows (left column: area-1,3,5,7 / right column: area-2,4,6,8)
    // gridSizes format: [left width, leftRow1 height, leftRow2 height, leftRow3 height, leftRow4 height, rightRow1 height, rightRow2 height, rightRow3 height, rightRow4 height]
    // Note: cell heights are percentages of their respective columns
    const leftWidth = gridSizes[0] || 50;
    const leftRow1Height = gridSizes[1] || 25;
    const leftRow2Height = gridSizes[2] || 25;
    const leftRow3Height = gridSizes[3] || 25;
    const leftRow4Height = gridSizes[4] || 25;
    const rightRow1Height = gridSizes[5] || 25;
    const rightRow2Height = gridSizes[6] || 25;
    const rightRow3Height = gridSizes[7] || 25;
    const rightRow4Height = gridSizes[8] || 25;
    const rightWidth = 100 - leftWidth;
    
    // Left column - 4 cells stacked vertically
    // area-1 (left row 1)
    positions.top.push(`${cellClass(0)}:0`);
    positions.left.push(`${cellClass(0)}:0`);
    positions.height.push(`${cellClass(0)}:calc((100vh - 50px) * ${(leftRow1Height / 100).toFixed(6)})`);
    positions.width.push(`${cellClass(0)}:${leftWidth.toFixed(4)}%`);
    
    // area-3 (left row 2)
    const leftRow2Top = leftRow1Height;
    positions.top.push(`${cellClass(2)}:calc((100vh - 50px) * ${(leftRow2Top / 100).toFixed(6)})`);
    positions.left.push(`${cellClass(2)}:0`);
    positions.height.push(`${cellClass(2)}:calc((100vh - 50px) * ${(leftRow2Height / 100).toFixed(6)})`);
    positions.width.push(`${cellClass(2)}:${leftWidth.toFixed(4)}%`);
    
    // area-5 (left row 3)
    const leftRow3Top = leftRow1Height + leftRow2Height;
    positions.top.push(`${cellClass(4)}:calc((100vh - 50px) * ${(leftRow3Top / 100).toFixed(6)})`);
    positions.left.push(`${cellClass(4)}:0`);
    positions.height.push(`${cellClass(4)}:calc((100vh - 50px) * ${(leftRow3Height / 100).toFixed(6)})`);
    positions.width.push(`${cellClass(4)}:${leftWidth.toFixed(4)}%`);
    
    // area-7 (left row 4)
    const leftRow4Top = leftRow1Height + leftRow2Height + leftRow3Height;
    positions.top.push(`${cellClass(6)}:calc((100vh - 50px) * ${(leftRow4Top / 100).toFixed(6)})`);
    positions.left.push(`${cellClass(6)}:0`);
    positions.height.push(`${cellClass(6)}:calc((100vh - 50px) * ${(leftRow4Height / 100).toFixed(6)})`);
    positions.width.push(`${cellClass(6)}:${leftWidth.toFixed(4)}%`);
    
    // Right column - 4 cells stacked vertically
    // area-2 (right row 1)
    positions.top.push(`${cellClass(1)}:0`);
    positions.left.push(`${cellClass(1)}:calc(${leftWidth.toFixed(4)}% + 2px)`);
    positions.height.push(`${cellClass(1)}:calc((100vh - 50px) * ${(rightRow1Height / 100).toFixed(6)})`);
    positions.width.push(`${cellClass(1)}:calc(${rightWidth.toFixed(4)}% - 2px)`);
    
    // area-4 (right row 2)
    const rightRow2Top = rightRow1Height;
    positions.top.push(`${cellClass(3)}:calc((100vh - 50px) * ${(rightRow2Top / 100).toFixed(6)})`);
    positions.left.push(`${cellClass(3)}:calc(${leftWidth.toFixed(4)}% + 2px)`);
    positions.height.push(`${cellClass(3)}:calc((100vh - 50px) * ${(rightRow2Height / 100).toFixed(6)})`);
    positions.width.push(`${cellClass(3)}:calc(${rightWidth.toFixed(4)}% - 2px)`);
    
    // area-6 (right row 3)
    const rightRow3Top = rightRow1Height + rightRow2Height;
    positions.top.push(`${cellClass(5)}:calc((100vh - 50px) * ${(rightRow3Top / 100).toFixed(6)})`);
    positions.left.push(`${cellClass(5)}:calc(${leftWidth.toFixed(4)}% + 2px)`);
    positions.height.push(`${cellClass(5)}:calc((100vh - 50px) * ${(rightRow3Height / 100).toFixed(6)})`);
    positions.width.push(`${cellClass(5)}:calc(${rightWidth.toFixed(4)}% - 2px)`);
    
    // area-8 (right row 4)
    const rightRow4Top = rightRow1Height + rightRow2Height + rightRow3Height;
    positions.top.push(`${cellClass(7)}:calc((100vh - 50px) * ${(rightRow4Top / 100).toFixed(6)})`);
    positions.left.push(`${cellClass(7)}:calc(${leftWidth.toFixed(4)}% + 2px)`);
    positions.height.push(`${cellClass(7)}:calc((100vh - 50px) * ${(rightRow4Height / 100).toFixed(6)})`);
    positions.width.push(`${cellClass(7)}:calc(${rightWidth.toFixed(4)}% - 2px)`);
  } else if (layout === '8-grid-4x2') {
    // 8-grid-4x2: 2 rows x 4 columns (4 top cells, 4 bottom cells)
    // gridSizes format: [top height, topCol1 width, topCol2 width, topCol3 width, topCol4 width, bottomCol1 width, bottomCol2 width, bottomCol3 width, bottomCol4 width]
    const topHeight = gridSizes[0] || 50;
    const topCol1Width = gridSizes[1] || 25;
    const topCol2Width = gridSizes[2] || 25;
    const topCol3Width = gridSizes[3] || 25;
    const topCol4Width = gridSizes[4] || 25;
    const bottomCol1Width = gridSizes[5] || 25;
    const bottomCol2Width = gridSizes[6] || 25;
    const bottomCol3Width = gridSizes[7] || 25;
    const bottomCol4Width = gridSizes[8] || 25;
    const bottomHeight = 100 - topHeight;
    
    // Top row - 4 cells
    // Top column 1
    positions.top.push(`${cellClass(0)}:0`);
    positions.left.push(`${cellClass(0)}:0`);
    positions.height.push(`${cellClass(0)}:${topHeight.toFixed(4)}%`);
    positions.width.push(`${cellClass(0)}:${topCol1Width.toFixed(4)}%`);
    
    // Top column 2
    positions.top.push(`${cellClass(1)}:0`);
    positions.left.push(`${cellClass(1)}:calc(${topCol1Width.toFixed(4)}% + 2px)`);
    positions.height.push(`${cellClass(1)}:${topHeight.toFixed(4)}%`);
    positions.width.push(`${cellClass(1)}:calc(${topCol2Width.toFixed(4)}% - 2px)`);
    
    // Top column 3
    const topCol3Left = topCol1Width + topCol2Width;
    positions.top.push(`${cellClass(2)}:0`);
    positions.left.push(`${cellClass(2)}:calc(${topCol3Left.toFixed(4)}% + 4px)`);
    positions.height.push(`${cellClass(2)}:${topHeight.toFixed(4)}%`);
    positions.width.push(`${cellClass(2)}:calc(${topCol3Width.toFixed(4)}% - 2px)`);
    
    // Top column 4
    const topCol4Left = topCol1Width + topCol2Width + topCol3Width;
    positions.top.push(`${cellClass(3)}:0`);
    positions.left.push(`${cellClass(3)}:calc(${topCol4Left.toFixed(4)}% + 6px)`);
    positions.height.push(`${cellClass(3)}:${topHeight.toFixed(4)}%`);
    positions.width.push(`${cellClass(3)}:calc(${topCol4Width.toFixed(4)}% - 6px)`);
    
    // Bottom row - 4 cells
    // Bottom column 1
    positions.top.push(`${cellClass(4)}:${topHeight.toFixed(4)}%`);
    positions.left.push(`${cellClass(4)}:0`);
    positions.height.push(`${cellClass(4)}:${bottomHeight.toFixed(4)}%`);
    positions.width.push(`${cellClass(4)}:${bottomCol1Width.toFixed(4)}%`);
    
    // Bottom column 2
    positions.top.push(`${cellClass(5)}:${topHeight.toFixed(4)}%`);
    positions.left.push(`${cellClass(5)}:calc(${bottomCol1Width.toFixed(4)}% + 2px)`);
    positions.height.push(`${cellClass(5)}:${bottomHeight.toFixed(4)}%`);
    positions.width.push(`${cellClass(5)}:calc(${bottomCol2Width.toFixed(4)}% - 2px)`);
    
    // Bottom column 3
    const bottomCol3Left = bottomCol1Width + bottomCol2Width;
    positions.top.push(`${cellClass(6)}:${topHeight.toFixed(4)}%`);
    positions.left.push(`${cellClass(6)}:calc(${bottomCol3Left.toFixed(4)}% + 4px)`);
    positions.height.push(`${cellClass(6)}:${bottomHeight.toFixed(4)}%`);
    positions.width.push(`${cellClass(6)}:calc(${bottomCol3Width.toFixed(4)}% - 2px)`);
    
    // Bottom column 4
    const bottomCol4Left = bottomCol1Width + bottomCol2Width + bottomCol3Width;
    positions.top.push(`${cellClass(7)}:${topHeight.toFixed(4)}%`);
    positions.left.push(`${cellClass(7)}:calc(${bottomCol4Left.toFixed(4)}% + 6px)`);
    positions.height.push(`${cellClass(7)}:${bottomHeight.toFixed(4)}%`);
    positions.width.push(`${cellClass(7)}:calc(${bottomCol4Width.toFixed(4)}% - 6px)`);
  } else if (layout === '12-grid-4x3') {
    // 12-grid-4x3: 3 columns x 4 rows (col1: area-1,4,7,10 / col2: area-2,5,8,11 / col3: area-3,6,9,12)
    // gridSizes format: [col1 width, col2 width, col3 width, 
    //                    leftRow1, leftRow2, leftRow3, leftRow4, 
    //                    middleRow1, middleRow2, middleRow3, middleRow4,
    //                    rightRow1, rightRow2, rightRow3, rightRow4]
    // Note: cell heights are percentages of their respective columns
    const col1Width = gridSizes[0] || 33.33;
    const col2Width = gridSizes[1] || 33.33;
    const col3Width = gridSizes[2] || 33.34;
    
    // Left column row heights
    const leftRow1Height = gridSizes[3] || 25;
    const leftRow2Height = gridSizes[4] || 25;
    const leftRow3Height = gridSizes[5] || 25;
    const leftRow4Height = gridSizes[6] || 25;
    
    // Middle column row heights
    const middleRow1Height = gridSizes[7] || 25;
    const middleRow2Height = gridSizes[8] || 25;
    const middleRow3Height = gridSizes[9] || 25;
    const middleRow4Height = gridSizes[10] || 25;
    
    // Right column row heights
    const rightRow1Height = gridSizes[11] || 25;
    const rightRow2Height = gridSizes[12] || 25;
    const rightRow3Height = gridSizes[13] || 25;
    const rightRow4Height = gridSizes[14] || 25;
    
    // Left column - 4 cells stacked vertically (area-1, area-4, area-7, area-10)
    // area-1 (left row 1)
    positions.top.push(`${cellClass(0)}:0`);
    positions.left.push(`${cellClass(0)}:0`);
    positions.height.push(`${cellClass(0)}:calc((100vh - 50px) * ${(leftRow1Height / 100).toFixed(6)})`);
    positions.width.push(`${cellClass(0)}:${col1Width.toFixed(4)}%`);
    
    // area-4 (left row 2)
    const leftRow2Top = leftRow1Height;
    positions.top.push(`${cellClass(3)}:calc((100vh - 50px) * ${(leftRow2Top / 100).toFixed(6)})`);
    positions.left.push(`${cellClass(3)}:0`);
    positions.height.push(`${cellClass(3)}:calc((100vh - 50px) * ${(leftRow2Height / 100).toFixed(6)})`);
    positions.width.push(`${cellClass(3)}:${col1Width.toFixed(4)}%`);
    
    // area-7 (left row 3)
    const leftRow3Top = leftRow1Height + leftRow2Height;
    positions.top.push(`${cellClass(6)}:calc((100vh - 50px) * ${(leftRow3Top / 100).toFixed(6)})`);
    positions.left.push(`${cellClass(6)}:0`);
    positions.height.push(`${cellClass(6)}:calc((100vh - 50px) * ${(leftRow3Height / 100).toFixed(6)})`);
    positions.width.push(`${cellClass(6)}:${col1Width.toFixed(4)}%`);
    
    // area-10 (left row 4)
    const leftRow4Top = leftRow1Height + leftRow2Height + leftRow3Height;
    positions.top.push(`${cellClass(9)}:calc((100vh - 50px) * ${(leftRow4Top / 100).toFixed(6)})`);
    positions.left.push(`${cellClass(9)}:0`);
    positions.height.push(`${cellClass(9)}:calc((100vh - 50px) * ${(leftRow4Height / 100).toFixed(6)})`);
    positions.width.push(`${cellClass(9)}:${col1Width.toFixed(4)}%`);
    
    // Middle column - 4 cells stacked vertically (area-2, area-5, area-8, area-11)
    const col2Left = col1Width;
    // area-2 (middle row 1)
    positions.top.push(`${cellClass(1)}:0`);
    positions.left.push(`${cellClass(1)}:calc(${col2Left.toFixed(4)}% + 2px)`);
    positions.height.push(`${cellClass(1)}:calc((100vh - 50px) * ${(middleRow1Height / 100).toFixed(6)})`);
    positions.width.push(`${cellClass(1)}:calc(${col2Width.toFixed(4)}% - 2px)`);
    
    // area-5 (middle row 2)
    const middleRow2Top = middleRow1Height;
    positions.top.push(`${cellClass(4)}:calc((100vh - 50px) * ${(middleRow2Top / 100).toFixed(6)})`);
    positions.left.push(`${cellClass(4)}:calc(${col2Left.toFixed(4)}% + 2px)`);
    positions.height.push(`${cellClass(4)}:calc((100vh - 50px) * ${(middleRow2Height / 100).toFixed(6)})`);
    positions.width.push(`${cellClass(4)}:calc(${col2Width.toFixed(4)}% - 2px)`);
    
    // area-8 (middle row 3)
    const middleRow3Top = middleRow1Height + middleRow2Height;
    positions.top.push(`${cellClass(7)}:calc((100vh - 50px) * ${(middleRow3Top / 100).toFixed(6)})`);
    positions.left.push(`${cellClass(7)}:calc(${col2Left.toFixed(4)}% + 2px)`);
    positions.height.push(`${cellClass(7)}:calc((100vh - 50px) * ${(middleRow3Height / 100).toFixed(6)})`);
    positions.width.push(`${cellClass(7)}:calc(${col2Width.toFixed(4)}% - 2px)`);
    
    // area-11 (middle row 4)
    const middleRow4Top = middleRow1Height + middleRow2Height + middleRow3Height;
    positions.top.push(`${cellClass(10)}:calc((100vh - 50px) * ${(middleRow4Top / 100).toFixed(6)})`);
    positions.left.push(`${cellClass(10)}:calc(${col2Left.toFixed(4)}% + 2px)`);
    positions.height.push(`${cellClass(10)}:calc((100vh - 50px) * ${(middleRow4Height / 100).toFixed(6)})`);
    positions.width.push(`${cellClass(10)}:calc(${col2Width.toFixed(4)}% - 2px)`);
    
    // Right column - 4 cells stacked vertically (area-3, area-6, area-9, area-12)
    const col3Left = col1Width + col2Width;
    // area-3 (right row 1)
    positions.top.push(`${cellClass(2)}:0`);
    positions.left.push(`${cellClass(2)}:calc(${col3Left.toFixed(4)}% + 4px)`);
    positions.height.push(`${cellClass(2)}:calc((100vh - 50px) * ${(rightRow1Height / 100).toFixed(6)})`);
    positions.width.push(`${cellClass(2)}:calc(${col3Width.toFixed(4)}% - 4px)`);
    
    // area-6 (right row 2)
    const rightRow2Top = rightRow1Height;
    positions.top.push(`${cellClass(5)}:calc((100vh - 50px) * ${(rightRow2Top / 100).toFixed(6)})`);
    positions.left.push(`${cellClass(5)}:calc(${col3Left.toFixed(4)}% + 4px)`);
    positions.height.push(`${cellClass(5)}:calc((100vh - 50px) * ${(rightRow2Height / 100).toFixed(6)})`);
    positions.width.push(`${cellClass(5)}:calc(${col3Width.toFixed(4)}% - 4px)`);
    
    // area-9 (right row 3)
    const rightRow3Top = rightRow1Height + rightRow2Height;
    positions.top.push(`${cellClass(8)}:calc((100vh - 50px) * ${(rightRow3Top / 100).toFixed(6)})`);
    positions.left.push(`${cellClass(8)}:calc(${col3Left.toFixed(4)}% + 4px)`);
    positions.height.push(`${cellClass(8)}:calc((100vh - 50px) * ${(rightRow3Height / 100).toFixed(6)})`);
    positions.width.push(`${cellClass(8)}:calc(${col3Width.toFixed(4)}% - 4px)`);
    
    // area-12 (right row 4)
    const rightRow4Top = rightRow1Height + rightRow2Height + rightRow3Height;
    positions.top.push(`${cellClass(11)}:calc((100vh - 50px) * ${(rightRow4Top / 100).toFixed(6)})`);
    positions.left.push(`${cellClass(11)}:calc(${col3Left.toFixed(4)}% + 4px)`);
    positions.height.push(`${cellClass(11)}:calc((100vh - 50px) * ${(rightRow4Height / 100).toFixed(6)})`);
    positions.width.push(`${cellClass(11)}:calc(${col3Width.toFixed(4)}% - 4px)`);
  } else {
    // Default/fallback: treat as vertical split
    let leftAccumulator = 0;
    for (let i = 0; i < cellCount; i++) {
      positions.top.push(`${cellClass(i)}:0`);
      positions.height.push(`${cellClass(i)}:calc(100vh - 50px)`);
      positions.width.push(`${cellClass(i)}:${gridSizes[i].toFixed(4)}%`);
      
      if (i === 0) {
        positions.left.push(`${cellClass(i)}:0`);
        leftAccumulator = gridSizes[i];
      } else {
        const gapPx = 2 * i;
        positions.left.push(`${cellClass(i)}:calc(${leftAccumulator.toFixed(4)}% + ${gapPx}px)`);
        leftAccumulator += gridSizes[i];
      }
    }
  }

  return {
    Top: positions.top.join('|'),
    Left: positions.left.join('|'),
    Height: positions.height.join('|'),
    Width: positions.width.join('|')
  };
}
