/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { LayoutType } from '@/types';
import { ResizableGridProvider } from '@/components/bloomberg-ui/ResizableGridContext';
import { ResizablePair } from '@/components/bloomberg-ui/ResizablePair';
import { ResizableGroup } from '@/components/bloomberg-ui/ResizableGroup';
import { EmptyGridCell } from '@/components/bloomberg-ui/EmptyGridCell';
import { calculateDynamicGridSizes } from '@/utils/dynamicCoordinateCalculator';
import { getLayoutConfigByName } from '@/config/layouts';
import { DynamicLayoutProps } from '@/types/layouts';
import { getGridCellPosition, calculateGridPositions, mapLayoutToApiCode } from '@/utils/gridPositionCalculator';
import { templateGridSizesStorage } from '@/lib/templateGridSizes';
import { insertMainGridPosition } from '@/lib/gridPositionApi';

export function DynamicGridRenderer({
  layout,
  widgets,
  templateId,
  onResize,
  onResizeStop,
  renderWidget,
  getWidget,
  onSetTargetPosition,
  onSetIsWidgetPanelOpen,
  onDragOver,
  onDragLeave,
  onDrop,
  isDragOver
}: DynamicLayoutProps) {
  // Track which cell is being hovered for visual feedback
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  // Get layout configuration
  const layoutConfig = useMemo(() => {
    return getLayoutConfigByName(layout);
  }, [layout]);

  // Calculate grid sizes from coordinates or stored grid sizes
  // Use state + effect to react to localStorage changes
  // Helper function to get default grid sizes for a layout
  const getDefaultGridSizesForLayout = useCallback((layoutType: string): Record<string, string> => {
    const defaults: Record<string, string> = {};
    switch (layoutType) {
      case "2-grid-vertical":
        return { left: "50%", right: "50%" };
      case "2-grid-horizontal":
        return { top: "50%", bottom: "50%" };
      case "3-grid-rows":
        return { top: "33.33%", middle: "33.33%", bottom: "33.34%" };
      case "3-grid-columns":
        return { left: "33.33%", middle: "33.33%", right: "33.34%" };
      case "3-grid-left-large":
        return { left: "50%", right: "50%", rightTop: "50%", rightBottom: "50%" };
      case "3-grid-right-large":
        return { left: "50%", right: "50%", leftTop: "50%", leftBottom: "50%" };
      case "3-grid-top-large":
        return { top: "50%", bottom: "50%", bottomLeft: "50%", bottomRight: "50%" };
      case "3-grid-bottom-large":
        return { top: "50%", bottom: "50%", topLeft: "50%", topRight: "50%" };
      case "4-grid":
        return { top: "50%", bottom: "50%", topLeft: "50%", topRight: "50%", bottomLeft: "50%", bottomRight: "50%" };
      case "5-grid-complex":
        return { top: "50%", left: "50%", right: "50%", bottomLeft: "33.33%", bottomMiddle: "33.33%", bottomRight: "33.34%" };
      default:
        return defaults;
    }
  }, []);

  // Helper function to convert percentages array to gridSizes object format
  // Must be defined before useState that uses it
  const convertPercentagesToGridSizes = useCallback((layoutType: string, percentages: number[]): Record<string, string> | null => {
    if (!percentages || percentages.length === 0) {
      return null;
    }

    let gridSizesObj: Record<string, string> = {};

    if (layoutType === '2-grid-vertical' || layoutType === 'two-vertical') {
      gridSizesObj = { left: `${percentages[0] || 50}%`, right: `${percentages[1] || (100 - (percentages[0] || 50))}%` };
    } else if (layoutType === '2-grid-horizontal' || layoutType === 'two-horizontal') {
      gridSizesObj = { top: `${percentages[0] || 50}%`, bottom: `${percentages[1] || (100 - (percentages[0] || 50))}%` };
    } else if (layoutType === '3-grid-columns' || layoutType === 'three-vertical') {
      gridSizesObj = {
        left: `${percentages[0] || 33.33}%`,
        middle: `${percentages[1] || 33.33}%`,
        right: `${percentages[2] || (100 - (percentages[0] || 33.33) - (percentages[1] || 33.33))}%`
      };
    } else if (layoutType === '3-grid-rows' || layoutType === 'three-horizontal') {
      gridSizesObj = {
        top: `${percentages[0] || 33.33}%`,
        middle: `${percentages[1] || 33.33}%`,
        bottom: `${percentages[2] || (100 - (percentages[0] || 33.33) - (percentages[1] || 33.33))}%`
      };
    } else if (layoutType === '3-grid-left-large' || layoutType === 'three-left-right') {
      const leftPercent = percentages[0] || 50;
      const rightTotal = 100 - leftPercent;
      gridSizesObj = {
        left: `${leftPercent}%`,
        right: `${rightTotal}%`,
        rightTop: `${percentages[1] || 50}%`,
        rightBottom: `${percentages[2] || 50}%`
      };
    } else if (layoutType === '3-grid-right-large' || layoutType === 'three-right-stack') {
      const rightPercent = percentages[2] || 50;
      const leftTotal = 100 - rightPercent;
      gridSizesObj = {
        left: `${leftTotal}%`,
        right: `${rightPercent}%`,
        leftTop: `${percentages[0] || 50}%`,
        leftBottom: `${percentages[1] || 50}%`
      };
    } else if (layoutType === '3-grid-top-large' || layoutType === 'three-top-bottom') {
      const topPercent = percentages[0] || 50;
      const bottomTotal = 100 - topPercent;
      gridSizesObj = {
        top: `${topPercent}%`,
        bottom: `${bottomTotal}%`,
        bottomLeft: `${percentages[1] || 50}%`,
        bottomRight: `${percentages[2] || 50}%`
      };
    } else if (layoutType === '3-grid-bottom-large') {
      const bottomPercent = percentages[2] || 50;
      const topTotal = 100 - bottomPercent;
      gridSizesObj = {
        top: `${topTotal}%`,
        bottom: `${bottomPercent}%`,
        topLeft: `${percentages[0] || 50}%`,
        topRight: `${percentages[1] || 50}%`
      };
    } else if (layoutType === '4-grid-columns' || layoutType === 'four-vertical') {
      gridSizesObj = {
        left: `${percentages[0] || 25}%`,
        leftMiddle: `${percentages[1] || 25}%`,
        rightMiddle: `${percentages[2] || 25}%`,
        right: `${percentages[3] || (100 - (percentages[0] || 25) - (percentages[1] || 25) - (percentages[2] || 25))}%`
      };
    } else if (layoutType === '4-grid-rows' || layoutType === 'four-horizontal') {
      gridSizesObj = {
        top: `${percentages[0] || 25}%`,
        topMiddle: `${percentages[1] || 25}%`,
        bottomMiddle: `${percentages[2] || 25}%`,
        bottom: `${percentages[3] || (100 - (percentages[0] || 25) - (percentages[1] || 25) - (percentages[2] || 25))}%`
      };
    } else if (layoutType === '4-grid' || layoutType === 'four-grid') {
      // 2x2 grid: percentages[0]=top height, [1]=topLeft width, [2]=topRight width, [3]=bottomLeft width, [4]=bottomRight width, [5]=bottom height
      // If we have 6 values (new format with heights), use them
      // If we have 4 values (old format with only widths), use defaults for heights
      if (percentages.length >= 6) {
        const topHeight = percentages[0] || 50;
        const bottomHeight = percentages[5] || (100 - topHeight);
        gridSizesObj = {
          top: `${topHeight}%`,
          bottom: `${bottomHeight}%`,
          topLeft: `${percentages[1] || 50}%`,
          topRight: `${percentages[2] || (100 - (percentages[1] || 50))}%`,
          bottomLeft: `${percentages[3] || 50}%`,
          bottomRight: `${percentages[4] || (100 - (percentages[3] || 50))}%`
        };
      } else {
        // Old format with only 4 widths - use default heights
        gridSizesObj = {
          top: '50%',
          bottom: '50%',
          topLeft: `${percentages[0] || 50}%`,
          topRight: `${percentages[1] || (100 - (percentages[0] || 50))}%`,
          bottomLeft: `${percentages[2] || 50}%`,
          bottomRight: `${percentages[3] || (100 - (percentages[2] || 50))}%`
        };
      }
    } else if (layoutType === '4-grid-top-large') {
      // 1 large top panel + 3 bottom panels
      // Format: [top height, bottomLeft width, bottomMiddle width]
      const topHeight = percentages[0] || 50;
      const bottomLeft = percentages[1] || 33.33;
      const bottomMiddle = percentages[2] || 33.33;
      const bottomRight = 100 - bottomLeft - bottomMiddle;
      gridSizesObj = {
        top: `${topHeight}%`,
        bottomLeft: `${bottomLeft}%`,
        bottomMiddle: `${bottomMiddle}%`,
        bottomRight: `${bottomRight}%`
      };
    } else if (layoutType === '4-grid-left-large') {
      // 1 large left panel + 3 right panels
      // Format: [left width, rightTop height, rightMiddle height]
      const leftWidth = percentages[0] || 50;
      const rightTop = percentages[1] || 33.33;
      const rightMiddle = percentages[2] || 33.33;
      const rightBottom = 100 - rightTop - rightMiddle;
      gridSizesObj = {
        left: `${leftWidth}%`,
        rightTop: `${rightTop}%`,
        rightMiddle: `${rightMiddle}%`,
        rightBottom: `${rightBottom}%`
      };
    } else if (layoutType === '4-grid-bottom-large') {
      // 3 top panels + 1 large bottom panel
      // Format: [topLeft width, topMiddle width, <topRight auto-calculated>, bottom height]
      const topLeft = percentages[0] || 33.33;
      const topMiddle = percentages[1] || 33.33;
      const topRight = 100 - topLeft - topMiddle;
      const bottomHeight = percentages[3] || 50;
      gridSizesObj = {
        topLeft: `${topLeft}%`,
        topMiddle: `${topMiddle}%`,
        topRight: `${topRight}%`,
        bottom: `${bottomHeight}%`
      };
    } else if (layoutType === '4-grid-right-large') {
      // 3 left panels + 1 large right panel
      // Format: [leftTop height, leftMiddle height, <leftBottom auto-calculated>, right width]
      const leftTop = percentages[0] || 33.33;
      const leftMiddle = percentages[1] || 33.33;
      const leftBottom = 100 - leftTop - leftMiddle;
      const rightWidth = percentages[3] || 50;
      gridSizesObj = {
        leftTop: `${leftTop}%`,
        leftMiddle: `${leftMiddle}%`,
        leftBottom: `${leftBottom}%`,
        right: `${rightWidth}%`
      };
    } else if (layoutType === '5-grid-columns' || layoutType === 'five-vertical') {
      gridSizesObj = {
        left: `${percentages[0] || 20}%`,
        leftMiddle1: `${percentages[1] || 20}%`,
        leftMiddle2: `${percentages[2] || 20}%`,
        rightMiddle: `${percentages[3] || 20}%`,
        right: `${percentages[4] || (100 - (percentages[0] || 20) - (percentages[1] || 20) - (percentages[2] || 20) - (percentages[3] || 20))}%`
      };
    } else if (layoutType === '5-grid-rows' || layoutType === 'five-horizontal') {
      gridSizesObj = {
        top: `${percentages[0] || 20}%`,
        topMiddle1: `${percentages[1] || 20}%`,
        topMiddle2: `${percentages[2] || 20}%`,
        bottomMiddle: `${percentages[3] || 20}%`,
        bottom: `${percentages[4] || (100 - (percentages[0] || 20) - (percentages[1] || 20) - (percentages[2] || 20) - (percentages[3] || 20))}%`
      };
    } else if (layoutType === '5-grid-complex') {
      // 5-grid-complex: top row (2 cells) + bottom row (3 cells)
      // Format: [top height, topLeft width, topRight width, bottomLeft width, bottomMiddle width, bottomRight width]
      const topHeight = percentages[0] || 50;
      const topLeft = percentages[1] || 50;
      const topRight = percentages[2] || 50;
      const bottomLeft = percentages[3] || 33.33;
      const bottomMiddle = percentages[4] || 33.33;
      const bottomRight = percentages[5] || 33.34;
      gridSizesObj = {
        top: `${topHeight}%`,
        left: `${topLeft}%`,
        right: `${topRight}%`,
        bottomLeft: `${bottomLeft}%`,
        bottomMiddle: `${bottomMiddle}%`,
        bottomRight: `${bottomRight}%`
      };
    } else if (layoutType === '8-grid-2x4') {
      // 8-grid-2x4: 2 columns x 4 rows (left column: area-1,3,5,7 / right column: area-2,4,6,8)
      // Format: [left width%, leftRow1 height%, leftRow2 height%, leftRow3 height%, leftRow4 height%, rightRow1 height%, rightRow2 height%, rightRow3 height%, rightRow4 height%]
      const leftWidth = percentages[0] || 50;
      gridSizesObj = {
        left: `${leftWidth}%`,
        top: `${percentages[1] || 25}%`,
        topMiddle1: `${percentages[2] || 25}%`,
        bottomMiddle1: `${percentages[3] || 25}%`,
        bottom: `${percentages[4] || 25}%`,
        rightTop: `${percentages[5] || 25}%`,
        rightTopMiddle: `${percentages[6] || 25}%`,
        rightBottomMiddle: `${percentages[7] || 25}%`,
        rightBottom: `${percentages[8] || 25}%`
      };
    } else if (layoutType === '8-grid-4x2') {
      // 8-grid-4x2: 2 rows x 4 columns (4 top cells, 4 bottom cells)
      // Format: [top height%, topCol1 width%, topCol2 width%, topCol3 width%, topCol4 width%, bottomCol1 width%, bottomCol2 width%, bottomCol3 width%, bottomCol4 width%]
      const topHeight = percentages[0] || 50;
      gridSizesObj = {
        top: `${topHeight}%`,
        topLeft: `${percentages[1] || 25}%`,
        topMiddle1: `${percentages[2] || 25}%`,
        topMiddle2: `${percentages[3] || 25}%`,
        topRight: `${percentages[4] || 25}%`,
        bottomLeft: `${percentages[5] || 25}%`,
        bottomMiddle1: `${percentages[6] || 25}%`,
        bottomMiddle2: `${percentages[7] || 25}%`,
        bottomRight: `${percentages[8] || 25}%`
      };
    } else if (layoutType === '8-grid-columns') {
      gridSizesObj = {
        left: `${percentages[0] || 12.5}%`,
        leftMiddle1: `${percentages[1] || 12.5}%`,
        leftMiddle2: `${percentages[2] || 12.5}%`,
        leftMiddle3: `${percentages[3] || 12.5}%`,
        rightMiddle3: `${percentages[4] || 12.5}%`,
        rightMiddle2: `${percentages[5] || 12.5}%`,
        rightMiddle1: `${percentages[6] || 12.5}%`,
        right: `${percentages[7] || (100 - (percentages[0] || 12.5) - (percentages[1] || 12.5) - (percentages[2] || 12.5) - (percentages[3] || 12.5) - (percentages[4] || 12.5) - (percentages[5] || 12.5) - (percentages[6] || 12.5))}%`
      };
    } else if (layoutType === '8-grid-rows') {
      gridSizesObj = {
        top: `${percentages[0] || 12.5}%`,
        topMiddle1: `${percentages[1] || 12.5}%`,
        topMiddle2: `${percentages[2] || 12.5}%`,
        topMiddle3: `${percentages[3] || 12.5}%`,
        bottomMiddle3: `${percentages[4] || 12.5}%`,
        bottomMiddle2: `${percentages[5] || 12.5}%`,
        bottomMiddle1: `${percentages[6] || 12.5}%`,
        bottom: `${percentages[7] || (100 - (percentages[0] || 12.5) - (percentages[1] || 12.5) - (percentages[2] || 12.5) - (percentages[3] || 12.5) - (percentages[4] || 12.5) - (percentages[5] || 12.5) - (percentages[6] || 12.5))}%`
      };
    } else if (layoutType === '32-grid-4x8') {
      // 4 columns x 8 rows
      // NEW FORMAT: percentages[0-7] = row heights, percentages[8-39] = per-row column widths (row1col1-row8col4)
      // OLD FORMAT (backward compat): percentages[0-7] = row heights, percentages[8-11] = shared column widths
      const numRows = 8;
      const numCols = 4;
      const defaultRowHeight = 12.5;
      const defaultColWidth = 25;

      gridSizesObj = {};

      // Parse row heights
      for (let i = 0; i < numRows; i++) {
        if (i < numRows - 1) {
          gridSizesObj[`row${i + 1}`] = `${percentages[i] || defaultRowHeight}%`;
        } else {
          // Last row takes remaining height
          const usedHeight = percentages.slice(0, numRows - 1).reduce((sum, p) => sum + (p || defaultRowHeight), 0);
          gridSizesObj[`row${i + 1}`] = `${percentages[i] || (100 - usedHeight)}%`;
        }
      }

      // Check if we have new format (per-row columns) or old format (shared columns)
      const expectedNewFormatLength = numRows + (numRows * numCols); // 8 + 32 = 40

      if (percentages.length >= expectedNewFormatLength - 1) {
        // NEW FORMAT: per-row column widths
        for (let row = 0; row < numRows; row++) {
          for (let col = 0; col < numCols; col++) {
            const index = numRows + (row * numCols) + col;
            if (col < numCols - 1) {
              gridSizesObj[`row${row + 1}col${col + 1}`] = `${percentages[index] || defaultColWidth}%`;
            } else {
              // Last column in row takes remaining width
              const usedWidth = percentages.slice(numRows + (row * numCols), index).reduce((sum, p) => sum + (p || defaultColWidth), 0);
              gridSizesObj[`row${row + 1}col${col + 1}`] = `${percentages[index] || (100 - usedWidth)}%`;
            }
          }
        }
      } else {
        // OLD FORMAT or no data: use shared columns (backward compatibility)
        for (let col = 0; col < numCols; col++) {
          const colValue = percentages[numRows + col];
          if (col < numCols - 1) {
            gridSizesObj[`col${col + 1}`] = `${colValue || defaultColWidth}%`;
          } else {
            const usedWidth = percentages.slice(numRows, numRows + numCols - 1).reduce((sum, p) => sum + (p || defaultColWidth), 0);
            gridSizesObj[`col${col + 1}`] = `${colValue || (100 - usedWidth)}%`;
          }
        }
      }
    } else if (layoutType === '32-grid-8x4') {
      // 8 columns x 4 rows
      // NEW FORMAT: percentages[0-3] = row heights, percentages[4-35] = per-row column widths (row1col1-row4col8)
      // OLD FORMAT (backward compat): percentages[0-3] = row heights, percentages[4-11] = shared column widths
      const numRows = 4;
      const numCols = 8;
      const defaultRowHeight = 25;
      const defaultColWidth = 12.5;

      gridSizesObj = {};

      // Parse row heights
      for (let i = 0; i < numRows; i++) {
        if (i < numRows - 1) {
          gridSizesObj[`row${i + 1}`] = `${percentages[i] || defaultRowHeight}%`;
        } else {
          // Last row takes remaining height
          const usedHeight = percentages.slice(0, numRows - 1).reduce((sum, p) => sum + (p || defaultRowHeight), 0);
          gridSizesObj[`row${i + 1}`] = `${percentages[i] || (100 - usedHeight)}%`;
        }
      }

      // Check if we have new format (per-row columns) or old format (shared columns)
      const expectedNewFormatLength = numRows + (numRows * numCols); // 4 + 32 = 36

      if (percentages.length >= expectedNewFormatLength - 1) {
        // NEW FORMAT: per-row column widths
        for (let row = 0; row < numRows; row++) {
          for (let col = 0; col < numCols; col++) {
            const index = numRows + (row * numCols) + col;
            if (col < numCols - 1) {
              gridSizesObj[`row${row + 1}col${col + 1}`] = `${percentages[index] || defaultColWidth}%`;
            } else {
              // Last column in row takes remaining width
              const usedWidth = percentages.slice(numRows + (row * numCols), index).reduce((sum, p) => sum + (p || defaultColWidth), 0);
              gridSizesObj[`row${row + 1}col${col + 1}`] = `${percentages[index] || (100 - usedWidth)}%`;
            }
          }
        }
      } else {
        // OLD FORMAT or no data: use shared columns (backward compatibility)
        for (let col = 0; col < numCols; col++) {
          const colValue = percentages[numRows + col];
          if (col < numCols - 1) {
            gridSizesObj[`col${col + 1}`] = `${colValue || defaultColWidth}%`;
          } else {
            const usedWidth = percentages.slice(numRows, numRows + numCols - 1).reduce((sum, p) => sum + (p || defaultColWidth), 0);
            gridSizesObj[`col${col + 1}`] = `${colValue || (100 - usedWidth)}%`;
          }
        }
      }
    } else if (layoutType === '6-grid-2x3') {
      // Top row (3 cells) + bottom row (3 cells)
      // Format: [top height%, topLeft width%, topMiddle width%, topRight width%, bottomLeft width%, bottomMiddle width%, bottomRight width%]
      const topHeight = percentages[0] || 50;
      gridSizesObj = {
        top: `${topHeight}%`,
        topLeft: `${percentages[1] || 33.33}%`,
        topMiddle: `${percentages[2] || 33.33}%`,
        topRight: `${percentages[3] || (100 - (percentages[1] || 33.33) - (percentages[2] || 33.33))}%`,
        bottomLeft: `${percentages[4] || 33.33}%`,
        bottomMiddle: `${percentages[5] || 33.33}%`,
        bottomRight: `${percentages[6] || (100 - (percentages[4] || 33.33) - (percentages[5] || 33.33))}%`
      };
    } else if (layoutType === '6-grid-3x2') {
      // 2 columns x 3 rows (as actually rendered)
      // Format: [left width%, leftTop height%, leftMiddle height%, leftBottom height%, rightTop height%, rightMiddle height%, rightBottom height%]
      const leftWidth = percentages[0] || 50;
      gridSizesObj = {
        left: `${leftWidth}%`,
        leftTop: `${percentages[1] || 33.33}%`,
        leftMiddle: `${percentages[2] || 33.33}%`,
        leftBottom: `${percentages[3] || 33.34}%`,
        right: `${100 - leftWidth}%`,
        rightTop: `${percentages[4] || 33.33}%`,
        rightMiddle: `${percentages[5] || 33.33}%`,
        rightBottom: `${percentages[6] || 33.34}%`
      };
    } else if (layoutType === '6-grid-rows') {
      // 6 vertical rows: simple array of 6 percentages
      gridSizesObj = {
        top: `${percentages[0] || 16.67}%`,
        topMiddle1: `${percentages[1] || 16.67}%`,
        topMiddle2: `${percentages[2] || 16.67}%`,
        bottomMiddle1: `${percentages[3] || 16.67}%`,
        bottomMiddle2: `${percentages[4] || 16.67}%`,
        bottom: `${percentages[5] || (100 - (percentages[0] || 16.67) - (percentages[1] || 16.67) - (percentages[2] || 16.67) - (percentages[3] || 16.67) - (percentages[4] || 16.67))}%`
      };
    } else if (layoutType === '6-grid-left-large') {
      // Large left panel (2 cells) + right panel (4 cells)
      // Format: [left width%, leftTop height%, leftBottom height%, rightTop height%, rightMiddle1 height%, rightMiddle2 height%, rightBottom height%]
      const leftWidth = percentages[0] || 66;
      gridSizesObj = {
        left: `${leftWidth}%`,
        leftTop: `${percentages[1] || 75}%`,
        leftBottom: `${percentages[2] || 25}%`,
        rightTop: `${percentages[3] || 25}%`,
        rightMiddle: `${percentages[4] || 25}%`,
        rightMiddle2: `${percentages[5] || 25}%`,
        rightBottom: `${percentages[6] || 25}%`
      };
    } else if (layoutType === '7-grid-left' || layoutType === '7-grid-complex1' || layoutType === '7-grid-complex2') {
      // 7-cell layouts: treat as column-based (width percentages)
      gridSizesObj = {
        left: `${percentages[0] || 14.29}%`,
        leftMiddle1: `${percentages[1] || 14.29}%`,
        leftMiddle2: `${percentages[2] || 14.29}%`,
        leftMiddle3: `${percentages[3] || 14.29}%`,
        rightMiddle3: `${percentages[4] || 14.29}%`,
        rightMiddle2: `${percentages[5] || 14.29}%`,
        right: `${percentages[6] || (100 - (percentages[0] || 14.29) - (percentages[1] || 14.29) - (percentages[2] || 14.29) - (percentages[3] || 14.29) - (percentages[4] || 14.29) - (percentages[5] || 14.29))}%`
      };
    } else if (layoutType === '7-grid-large') {
      // 7-cell with large panel: 1 left cell + 6 right cells (vertical split)
      // Data format: [leftWidth, rightCell1Height, rightCell2Height, rightCell3Height, rightCell4Height, rightCell5Height, rightCell6Height]
      // The API returns 7 width percentages (from default fallback), but we need to extract:
      // - First value: left panel width
      // - Remaining 6 values: right cell heights (they're percentages of the right column height)
      const leftWidth = percentages[0] || 50;
      // Extract right cell heights (percentages 1-6)
      // If we have 7 values, use them; otherwise use defaults
      const rightCellHeights = percentages.length >= 7
        ? percentages.slice(1, 7)
        : [16.67, 16.67, 16.67, 16.67, 16.67, 16.67];

      gridSizesObj = {
        left: `${leftWidth}%`,
        rightCell1: `${rightCellHeights[0]}%`,
        rightCell2: `${rightCellHeights[1]}%`,
        rightCell3: `${rightCellHeights[2]}%`,
        rightCell4: `${rightCellHeights[3]}%`,
        rightCell5: `${rightCellHeights[4]}%`,
        rightCell6: `${rightCellHeights[5]}%`
      };
    } else if (layoutType === '9-grid') {
      // 3x3 grid: 3 rows, each with 3 cells
      // Format: [top height%, topLeft width%, topMiddle width%, topRight width%, middle height%, middleLeft width%, middleCenter width%, middleRight width%, bottomLeft width%, bottomMiddle width%, bottomRight width%]
      const topHeight = percentages[0] || 33.33;
      const middleHeight = percentages[4] || 33.33;
      gridSizesObj = {
        top: `${topHeight}%`,
        topLeft: `${percentages[1] || 33.33}%`,
        topMiddle: `${percentages[2] || 33.33}%`,
        topRight: `${percentages[3] || (100 - (percentages[1] || 33.33) - (percentages[2] || 33.33))}%`,
        middle: `${middleHeight}%`,
        middleLeft: `${percentages[5] || 33.33}%`,
        middleCenter: `${percentages[6] || 33.33}%`,
        middleRight: `${percentages[7] || (100 - (percentages[5] || 33.33) - (percentages[6] || 33.33))}%`,
        bottomLeft: `${percentages[8] || 33.33}%`,
        bottomMiddle: `${percentages[9] || 33.33}%`,
        bottomRight: `${percentages[10] || (100 - (percentages[8] || 33.33) - (percentages[9] || 33.33))}%`
      };
    } else if (layoutType === '12-grid-3x4') {
      // 3 rows x 4 columns
      // Format: [top height%, topLeft width%, topMiddle1 width%, topMiddle2 width%, topRight width%, middle height%, middleLeft width%, middleCenter1 width%, middleCenter2 width%, middleRight width%, bottomLeft width%, bottomMiddle1 width%, bottomMiddle2 width%, bottomRight width%]
      const topHeight = percentages[0] || 33.33;
      const middleHeight = percentages[5] || 33.33;
      gridSizesObj = {
        top: `${topHeight}%`,
        topLeft: `${percentages[1] || 25}%`,
        topMiddle1: `${percentages[2] || 25}%`,
        topMiddle2: `${percentages[3] || 25}%`,
        topRight: `${percentages[4] || (100 - (percentages[1] || 25) - (percentages[2] || 25) - (percentages[3] || 25))}%`,
        middle: `${middleHeight}%`,
        middleLeft: `${percentages[6] || 25}%`,
        middleCenter1: `${percentages[7] || 25}%`,
        middleCenter2: `${percentages[8] || 25}%`,
        middleRight: `${percentages[9] || (100 - (percentages[6] || 25) - (percentages[7] || 25) - (percentages[8] || 25))}%`,
        bottomLeft: `${percentages[10] || 25}%`,
        bottomMiddle1: `${percentages[11] || 25}%`,
        bottomMiddle2: `${percentages[12] || 25}%`,
        bottomRight: `${percentages[13] || (100 - (percentages[10] || 25) - (percentages[11] || 25) - (percentages[12] || 25))}%`
      };
    } else if (layoutType === '12-grid-4x3') {
      // 4 rows x 3 columns: percentages[0-2] = column widths, [3-5] = left col row heights, [6-8] = middle col row heights, [9-11] = right col row heights
      const leftWidth = percentages[0] || 33.33;
      const leftMiddleWidth = percentages[1] || 33.33;
      const rightWidth = percentages[2] || (100 - leftWidth - leftMiddleWidth);

      gridSizesObj = {
        left: `${leftWidth}%`,
        leftMiddle: `${leftMiddleWidth}%`,
        right: `${rightWidth}%`,
        // Left column row heights (4 rows)
        leftRow1: `${percentages[3] || 25}%`,
        leftRow2: `${percentages[4] || 25}%`,
        leftRow3: `${percentages[5] || 25}%`,
        leftRow4: `${percentages[6] || (100 - (percentages[3] || 25) - (percentages[4] || 25) - (percentages[5] || 25))}%`,
        // Middle column row heights (4 rows)
        middleRow1: `${percentages[7] || 25}%`,
        middleRow2: `${percentages[8] || 25}%`,
        middleRow3: `${percentages[9] || 25}%`,
        middleRow4: `${percentages[10] || (100 - (percentages[7] || 25) - (percentages[8] || 25) - (percentages[9] || 25))}%`,
        // Right column row heights (4 rows)
        rightRow1: `${percentages[11] || 25}%`,
        rightRow2: `${percentages[12] || 25}%`,
        rightRow3: `${percentages[13] || 25}%`,
        rightRow4: `${percentages[14] || (100 - (percentages[11] || 25) - (percentages[12] || 25) - (percentages[13] || 25))}%`,
      };
    } else if (layoutType === '16-grid') {
      // 4 rows x 4 columns (16 cells)
      // Format: [top height%, topLeft width%, topMiddle1 width%, topMiddle2 width%, topRight width%, middle1 height%, middle1Left width%, middle1Center1 width%, middle1Center2 width%, middle1Right width%, middle2 height%, middle2Left width%, middle2Center1 width%, middle2Center2 width%, middle2Right width%, bottomLeft width%, bottomCenter1 width%, bottomCenter2 width%, bottomRight width%]
      const topHeight = percentages[0] || 25;
      const middle1Height = percentages[5] || 25;
      const middle2Height = percentages[10] || 25;
      gridSizesObj = {
        top: `${topHeight}%`,
        topLeft: `${percentages[1] || 25}%`,
        topMiddle1: `${percentages[2] || 25}%`,
        topMiddle2: `${percentages[3] || 25}%`,
        topRight: `${percentages[4] || (100 - (percentages[1] || 25) - (percentages[2] || 25) - (percentages[3] || 25))}%`,
        middle1: `${middle1Height}%`,
        middle1Left: `${percentages[6] || 25}%`,
        middle1Center1: `${percentages[7] || 25}%`,
        middle1Center2: `${percentages[8] || 25}%`,
        middle1Right: `${percentages[9] || (100 - (percentages[6] || 25) - (percentages[7] || 25) - (percentages[8] || 25))}%`,
        middle2: `${middle2Height}%`,
        middle2Left: `${percentages[11] || 25}%`,
        middle2Center1: `${percentages[12] || 25}%`,
        middle2Center2: `${percentages[13] || 25}%`,
        middle2Right: `${percentages[14] || (100 - (percentages[11] || 25) - (percentages[12] || 25) - (percentages[13] || 25))}%`,
        bottomLeft: `${percentages[15] || 25}%`,
        bottomCenter1: `${percentages[16] || 25}%`,
        bottomCenter2: `${percentages[17] || 25}%`,
        bottomRight: `${percentages[18] || (100 - (percentages[15] || 25) - (percentages[16] || 25) - (percentages[17] || 25))}%`
      };
    } else if (layoutType === '24-grid-4x6') {
      // 4 columns x 6 rows
      // NEW FORMAT: percentages[0-5] = row heights, percentages[6-29] = per-row column widths (row1col1-row6col4)
      // OLD FORMAT (backward compat): percentages[0-5] = row heights, percentages[6-9] = shared column widths
      const numRows = 6;
      const numCols = 4;
      const defaultRowHeight = 16.67;
      const defaultColWidth = 25;

      gridSizesObj = {};

      // Parse row heights
      for (let i = 0; i < numRows; i++) {
        if (i < numRows - 1) {
          gridSizesObj[`row${i + 1}`] = `${percentages[i] || defaultRowHeight}%`;
        } else {
          // Last row takes remaining height
          const usedHeight = percentages.slice(0, numRows - 1).reduce((sum, p) => sum + (p || defaultRowHeight), 0);
          gridSizesObj[`row${i + 1}`] = `${percentages[i] || (100 - usedHeight)}%`;
        }
      }

      // Check if we have new format (per-row columns) or old format (shared columns)
      const expectedNewFormatLength = numRows + (numRows * numCols); // 6 + 24 = 30

      if (percentages.length >= expectedNewFormatLength - 1) {
        // NEW FORMAT: per-row column widths
        for (let row = 0; row < numRows; row++) {
          for (let col = 0; col < numCols; col++) {
            const index = numRows + (row * numCols) + col;
            if (col < numCols - 1) {
              gridSizesObj[`row${row + 1}col${col + 1}`] = `${percentages[index] || defaultColWidth}%`;
            } else {
              // Last column in row takes remaining width
              const usedWidth = percentages.slice(numRows + (row * numCols), index).reduce((sum, p) => sum + (p || defaultColWidth), 0);
              gridSizesObj[`row${row + 1}col${col + 1}`] = `${percentages[index] || (100 - usedWidth)}%`;
            }
          }
        }
      } else {
        // OLD FORMAT or no data: use shared columns (backward compatibility)
        for (let col = 0; col < numCols; col++) {
          const colValue = percentages[numRows + col];
          if (col < numCols - 1) {
            gridSizesObj[`col${col + 1}`] = `${colValue || defaultColWidth}%`;
          } else {
            const usedWidth = percentages.slice(numRows, numRows + numCols - 1).reduce((sum, p) => sum + (p || defaultColWidth), 0);
            gridSizesObj[`col${col + 1}`] = `${colValue || (100 - usedWidth)}%`;
          }
        }
      }
    } else if (layoutType === '24-grid-6x4') {
      // 6 columns x 4 rows
      // NEW FORMAT: percentages[0-3] = row heights, percentages[4-27] = per-row column widths (row1col1-row4col6)
      // OLD FORMAT (backward compat): percentages[0-3] = row heights, percentages[4-9] = shared column widths
      const numRows = 4;
      const numCols = 6;
      const defaultRowHeight = 25;
      const defaultColWidth = 16.67;

      gridSizesObj = {};

      // Parse row heights
      for (let i = 0; i < numRows; i++) {
        if (i < numRows - 1) {
          gridSizesObj[`row${i + 1}`] = `${percentages[i] || defaultRowHeight}%`;
        } else {
          // Last row takes remaining height
          const usedHeight = percentages.slice(0, numRows - 1).reduce((sum, p) => sum + (p || defaultRowHeight), 0);
          gridSizesObj[`row${i + 1}`] = `${percentages[i] || (100 - usedHeight)}%`;
        }
      }

      // Check if we have new format (per-row columns) or old format (shared columns)
      const expectedNewFormatLength = numRows + (numRows * numCols); // 4 + 24 = 28

      if (percentages.length >= expectedNewFormatLength - 1) {
        // NEW FORMAT: per-row column widths
        for (let row = 0; row < numRows; row++) {
          for (let col = 0; col < numCols; col++) {
            const index = numRows + (row * numCols) + col;
            if (col < numCols - 1) {
              gridSizesObj[`row${row + 1}col${col + 1}`] = `${percentages[index] || defaultColWidth}%`;
            } else {
              // Last column in row takes remaining width
              const usedWidth = percentages.slice(numRows + (row * numCols), index).reduce((sum, p) => sum + (p || defaultColWidth), 0);
              gridSizesObj[`row${row + 1}col${col + 1}`] = `${percentages[index] || (100 - usedWidth)}%`;
            }
          }
        }
      } else {
        // OLD FORMAT or no data: use shared columns (backward compatibility)
        for (let col = 0; col < numCols; col++) {
          const colValue = percentages[numRows + col];
          if (col < numCols - 1) {
            gridSizesObj[`col${col + 1}`] = `${colValue || defaultColWidth}%`;
          } else {
            const usedWidth = percentages.slice(numRows, numRows + numCols - 1).reduce((sum, p) => sum + (p || defaultColWidth), 0);
            gridSizesObj[`col${col + 1}`] = `${colValue || (100 - usedWidth)}%`;
          }
        }
      }
    } else if (layoutType === '24-grid-rows') {
      // 24 vertical rows: simple array of 24 percentages
      const perRow = 100 / 24;
      gridSizesObj = {};
      for (let i = 0; i < 24; i++) {
        if (i === 0) {
          gridSizesObj.top = `${percentages[i] || perRow}%`;
        } else if (i < 23) {
          gridSizesObj[`topMiddle${i}`] = `${percentages[i] || perRow}%`;
        } else {
          gridSizesObj.bottom = `${percentages[i] || (100 - percentages.slice(0, i).reduce((sum, p) => sum + (p || perRow), 0))}%`;
        }
      }
    } else if (layoutType === '24-grid-columns') {
      // 24 horizontal columns: simple array of 24 percentages
      const perCol = 100 / 24;
      gridSizesObj = {};
      for (let i = 0; i < 24; i++) {
        if (i === 0) {
          gridSizesObj.left = `${percentages[i] || perCol}%`;
        } else if (i < 23) {
          gridSizesObj[`leftMiddle${i}`] = `${percentages[i] || perCol}%`;
        } else {
          gridSizesObj.right = `${percentages[i] || (100 - percentages.slice(0, i).reduce((sum, p) => sum + (p || perCol), 0))}%`;
        }
      }
    } else if (layoutType === '28-grid-4x7') {
      // 4 columns x 7 rows
      // NEW FORMAT: percentages[0-6] = row heights, percentages[7-34] = per-row column widths (row1col1-row7col4)
      // OLD FORMAT (backward compat): percentages[0-6] = row heights, percentages[7-10] = shared column widths
      const numRows = 7;
      const numCols = 4;
      const defaultRowHeight = 14.29;
      const defaultColWidth = 25;

      gridSizesObj = {};

      // Parse row heights
      for (let i = 0; i < numRows; i++) {
        if (i < numRows - 1) {
          gridSizesObj[`row${i + 1}`] = `${percentages[i] || defaultRowHeight}%`;
        } else {
          // Last row takes remaining height
          const usedHeight = percentages.slice(0, numRows - 1).reduce((sum, p) => sum + (p || defaultRowHeight), 0);
          gridSizesObj[`row${i + 1}`] = `${percentages[i] || (100 - usedHeight)}%`;
        }
      }

      // Check if we have new format (per-row columns) or old format (shared columns)
      const expectedNewFormatLength = numRows + (numRows * numCols); // 7 + 28 = 35

      if (percentages.length >= expectedNewFormatLength - 1) {
        // NEW FORMAT: per-row column widths
        for (let row = 0; row < numRows; row++) {
          for (let col = 0; col < numCols; col++) {
            const index = numRows + (row * numCols) + col;
            if (col < numCols - 1) {
              gridSizesObj[`row${row + 1}col${col + 1}`] = `${percentages[index] || defaultColWidth}%`;
            } else {
              // Last column in row takes remaining width
              const usedWidth = percentages.slice(numRows + (row * numCols), index).reduce((sum, p) => sum + (p || defaultColWidth), 0);
              gridSizesObj[`row${row + 1}col${col + 1}`] = `${percentages[index] || (100 - usedWidth)}%`;
            }
          }
        }
      } else {
        // OLD FORMAT or no data: use shared columns (backward compatibility)
        for (let col = 0; col < numCols; col++) {
          const colValue = percentages[numRows + col];
          if (col < numCols - 1) {
            gridSizesObj[`col${col + 1}`] = `${colValue || defaultColWidth}%`;
          } else {
            const usedWidth = percentages.slice(numRows, numRows + numCols - 1).reduce((sum, p) => sum + (p || defaultColWidth), 0);
            gridSizesObj[`col${col + 1}`] = `${colValue || (100 - usedWidth)}%`;
          }
        }
      }
    } else if (layoutType === '28-grid-7x4') {
      // 7 columns x 4 rows
      // NEW FORMAT: percentages[0-3] = row heights, percentages[4-31] = per-row column widths (row1col1-row4col7)
      // OLD FORMAT (backward compat): percentages[0-3] = row heights, percentages[4-10] = shared column widths
      const numRows = 4;
      const numCols = 7;
      const defaultRowHeight = 25;
      const defaultColWidth = 14.29;

      gridSizesObj = {};

      // Parse row heights
      for (let i = 0; i < numRows; i++) {
        if (i < numRows - 1) {
          gridSizesObj[`row${i + 1}`] = `${percentages[i] || defaultRowHeight}%`;
        } else {
          // Last row takes remaining height
          const usedHeight = percentages.slice(0, numRows - 1).reduce((sum, p) => sum + (p || defaultRowHeight), 0);
          gridSizesObj[`row${i + 1}`] = `${percentages[i] || (100 - usedHeight)}%`;
        }
      }

      // Check if we have new format (per-row columns) or old format (shared columns)
      const expectedNewFormatLength = numRows + (numRows * numCols); // 4 + 28 = 32

      if (percentages.length >= expectedNewFormatLength - 1) {
        // NEW FORMAT: per-row column widths
        for (let row = 0; row < numRows; row++) {
          for (let col = 0; col < numCols; col++) {
            const index = numRows + (row * numCols) + col;
            if (col < numCols - 1) {
              gridSizesObj[`row${row + 1}col${col + 1}`] = `${percentages[index] || defaultColWidth}%`;
            } else {
              // Last column in row takes remaining width
              const usedWidth = percentages.slice(numRows + (row * numCols), index).reduce((sum, p) => sum + (p || defaultColWidth), 0);
              gridSizesObj[`row${row + 1}col${col + 1}`] = `${percentages[index] || (100 - usedWidth)}%`;
            }
          }
        }
      } else {
        // OLD FORMAT or no data: use shared columns (backward compatibility)
        for (let col = 0; col < numCols; col++) {
          const colValue = percentages[numRows + col];
          if (col < numCols - 1) {
            gridSizesObj[`col${col + 1}`] = `${colValue || defaultColWidth}%`;
          } else {
            const usedWidth = percentages.slice(numRows, numRows + numCols - 1).reduce((sum, p) => sum + (p || defaultColWidth), 0);
            gridSizesObj[`col${col + 1}`] = `${colValue || (100 - usedWidth)}%`;
          }
        }
      }
    } else {
      // For other layouts, try to use the percentages directly
      // This is a fallback - ideally all layouts should be explicitly handled
      return null;
    }

    return Object.keys(gridSizesObj).length > 0 ? gridSizesObj : null;
  }, []);

  // Initialize with defaults to prevent null errors, but allow updates from storage/API
  // IMPORTANT: Always tries to load from localStorage first to preserve user's resized grid state
  // This ensures grid resizing persists across:
  // - Page refresh
  // - Logout/login
  // - Template switching

  // Track if initial state loaded from storage
  const initialLoadedFromStorage = useRef(false);

  const [gridSizes, setGridSizes] = useState<Record<string, string>>(() => {
    // Try to load from storage first (synchronously) - this handles persisted data across reloads
    // This is the source of truth for user's resized grid state
    if (templateId && typeof window !== 'undefined') {
      try {
        const storedSizes = templateGridSizesStorage.getTemplateGridSizes(templateId);

        // Normalize layout names for comparison (handle aliases like 'four-grid' vs '4-grid')
        const normalizeLayoutName = (layoutName: string) => {
          return layoutName.replace(/^four-/g, '4-').replace(/^three-/g, '3-').replace(/^two-/g, '2-');
        };

        const normalizedStoredLayout = storedSizes?.layoutType ? normalizeLayoutName(storedSizes.layoutType) : '';
        const normalizedCurrentLayout = normalizeLayoutName(layout);
        const layoutMatches = normalizedStoredLayout === normalizedCurrentLayout;

        if (storedSizes && layoutMatches && storedSizes.cellSizes.length > 0) {
          const percentages = storedSizes.cellSizes.map(cell => cell.width);

          // Convert percentages array to gridSizes object format
          const initialGridSizes = convertPercentagesToGridSizes(layout, percentages);

          if (initialGridSizes && Object.keys(initialGridSizes).length > 0) {
            // Mark that we successfully loaded from storage
            initialLoadedFromStorage.current = true;
            // Return stored sizes - this preserves user's resized state
            return initialGridSizes;
          }
        }
      } catch (error) {
        // Error loading from storage in initial state
      }
    }

    // Only return defaults if no stored sizes found
    // This ensures we don't reset user's resized grid unless they explicitly resize again
    const defaults = getDefaultGridSizesForLayout(layout);
    return defaults;
  });

  // Track if we've loaded from API to prevent overwriting with defaults
  // Initialize to true if we already loaded from storage in initial state
  const [hasLoadedFromApi, setHasLoadedFromApi] = useState(initialLoadedFromStorage.current);

  // Ref to store latest gridSizes to avoid stale closure issues in handleResizeStop
  // This ensures we always read the most recent values when saving
  const gridSizesRef = useRef<Record<string, string>>(gridSizes);

  // Ref to store latest right cell heights for 7-grid-large layout
  // This ensures we capture the actual resized values from ResizableGroup
  const rightCellHeightsRef = useRef<number[]>([]);

  // OPTIMIZATION: Refs to prevent multiple API calls for nested layouts
  // Map to track save state per layout type (for layouts that need optimization)
  const saveStateRef = useRef<Map<string, { inProgress: boolean; timeout: ReturnType<typeof setTimeout> | null }>>(new Map());

  // Keep ref in sync with state
  useEffect(() => {
    gridSizesRef.current = gridSizes;
  }, [gridSizes]);

  // Helper function to load and apply grid sizes from localStorage
  // IMPORTANT: This function always prioritizes localStorage over defaults
  // Grid sizes are NEVER auto-reset unless user explicitly resizes
  const loadGridSizesFromStorage = useCallback((forceReload = false) => {
    if (templateId) {
      // Always check localStorage first - this is the source of truth for persisted grid resizing
      const storedSizes = templateGridSizesStorage.getTemplateGridSizes(templateId);

      // Normalize layout names for comparison (handle aliases like 'four-grid' vs '4-grid')
      const normalizeLayoutName = (layoutName: string) => {
        return layoutName.replace(/^four-/g, '4-').replace(/^three-/g, '3-').replace(/^two-/g, '2-');
      };

      const normalizedStoredLayout = storedSizes?.layoutType ? normalizeLayoutName(storedSizes.layoutType) : '';
      const normalizedCurrentLayout = normalizeLayoutName(layout);
      const layoutMatches = normalizedStoredLayout === normalizedCurrentLayout;

      if (storedSizes && layoutMatches && storedSizes.cellSizes.length > 0) {
        // Convert stored sizes to gridSizes format based on layout
        const percentages = storedSizes.cellSizes.map(cell => cell.width);

        const newGridSizes = convertPercentagesToGridSizes(layout, percentages);

        if (newGridSizes && Object.keys(newGridSizes).length > 0) {
          // Check if the new grid sizes are different from current
          const gridSizesChanged = JSON.stringify(newGridSizes) !== JSON.stringify(gridSizes);

          // Always update if forceReload is true or if sizes have changed
          if (forceReload || gridSizesChanged) {
            // Replace the entire gridSizes object, not merge, to avoid stale keys
            setGridSizes(newGridSizes);
            setHasLoadedFromApi(true);

            return true;
          } else {
            return true; // Still return true because we found valid data
          }
        }
      } else {
        // console.warn('⚠️ [DynamicGridRenderer] No valid stored sizes found:', {
        //   hasStoredSizes: !!storedSizes,
        //   layoutType: storedSizes?.layoutType,
        //   normalizedStoredLayout,
        //   expectedLayout: layout,
        //   normalizedCurrentLayout,
        //   layoutMatches,
        //   cellSizesCount: storedSizes?.cellSizes?.length || 0
        // });
      }
    }
    return false;
  }, [templateId, layout, convertPercentagesToGridSizes, gridSizes]);

  // Reset hasLoadedFromApi when layout or templateId changes to allow fresh data load
  // But check if we can load from storage immediately to avoid unnecessary reloads
  useEffect(() => {
    // Try to load from storage immediately
    if (templateId && typeof window !== 'undefined') {
      try {
        const storedSizes = templateGridSizesStorage.getTemplateGridSizes(templateId);

        if (storedSizes && storedSizes.layoutType === layout && storedSizes.cellSizes.length > 0) {
          const percentages = storedSizes.cellSizes.map(cell => cell.width);
          const newGridSizes = convertPercentagesToGridSizes(layout, percentages);

          if (newGridSizes && Object.keys(newGridSizes).length > 0) {
            setGridSizes(newGridSizes);
            setHasLoadedFromApi(true);
            return; // Don't reset hasLoadedFromApi
          }
        }
      } catch (error) {
        // Error loading from storage on layout/template change
      }
    }

    // Only reset if we didn't find stored sizes
    setHasLoadedFromApi(false);
  }, [layout, templateId, convertPercentagesToGridSizes]);

  useEffect(() => {
    // IMPORTANT: Always prioritize localStorage over defaults
    // Grid sizes should NEVER be reset unless user explicitly resizes
    // If we already have gridSizes from localStorage/API, don't overwrite them
    if (hasLoadedFromApi) {
      return;
    }

    // Try to load from localStorage first - this preserves user's resized grid state
    // This ensures grid resizing persists across page refresh, logout/login, template switching
    const loaded = loadGridSizesFromStorage();

    if (loaded) {
      setHasLoadedFromApi(true);
      // Don't reset to defaults - preserve user's resized state
      return;
    }

    // If not loaded and we haven't loaded from API yet, wait for API to complete
    // This handles the case where the component mounts before the API call completes
    // Use efficient polling with short intervals instead of long delays
    if (!hasLoadedFromApi && templateId) {
      let retryCount = 0;
      const pollInterval = 100; // Check every 100ms instead of waiting up to 2000ms
      const maxWaitTime = 2000; // Maximum total wait time (20 checks * 100ms)
      const maxRetries = Math.ceil(maxWaitTime / pollInterval); // Calculate max retries based on wait time

      const intervalId = setInterval(() => {
        retryCount++;
        const retryLoaded = loadGridSizesFromStorage();
        if (retryLoaded) {
          setHasLoadedFromApi(true);
          clearInterval(intervalId);
        } else if (retryCount >= maxRetries) {
          // After max retries, fallback to widget coordinates if available
          clearInterval(intervalId);
          const widgetCoordinates = widgets
            .map(widget => widget.settings?.coordinates)
            .filter((coord): coord is { top: number; left: number; width: number; height: number } =>
              coord != null &&
              typeof coord === 'object' &&
              typeof coord.top === 'number' &&
              typeof coord.left === 'number' &&
              typeof coord.width === 'number' &&
              typeof coord.height === 'number'
            );
          if (widgetCoordinates.length > 0) {
            const calculated = calculateDynamicGridSizes(layout, widgetCoordinates);
            if (calculated && Object.keys(calculated).length > 0) {
              setGridSizes(calculated);
              setHasLoadedFromApi(true);
            }
          }
          // If no valid coordinates, keep defaults (gridSizes already initialized with defaults)
        }
      }, pollInterval);

      return () => {
        clearInterval(intervalId);
      };
    } else if (!hasLoadedFromApi && !templateId) {
      // Fallback to widget coordinates if no templateId
      const widgetCoordinates = widgets
        .map(widget => widget.settings?.coordinates)
        .filter((coord): coord is { top: number; left: number; width: number; height: number } =>
          coord != null &&
          typeof coord === 'object' &&
          typeof coord.top === 'number' &&
          typeof coord.left === 'number' &&
          typeof coord.width === 'number' &&
          typeof coord.height === 'number'
        );
      if (widgetCoordinates.length > 0) {
        const calculated = calculateDynamicGridSizes(layout, widgetCoordinates);
        if (calculated && Object.keys(calculated).length > 0) {
          setGridSizes(calculated);
          setHasLoadedFromApi(true);
        }
      }
      // If no valid coordinates, keep defaults (gridSizes already initialized with defaults)
    }
  }, [layout, widgets, templateId, loadGridSizesFromStorage, hasLoadedFromApi, getDefaultGridSizesForLayout]);

  // Listen for storage events to update when localStorage changes (from API load)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Check if the storage key for template grid sizes changed
      if (e.key === 'pmt_template_grid_sizes' && templateId) {
        // Use a small delay to ensure the storage write is complete
        setTimeout(() => {
          loadGridSizesFromStorage();
        }, 50);
      }
    };

    // Also listen for custom events (for same-tab updates)
    const handleCustomStorageUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ templateId?: string }>;
      const eventTemplateId = customEvent.detail?.templateId;

      if (templateId) {
        // Only reload if the event is for this template or no specific template was specified
        if (!eventTemplateId || eventTemplateId === templateId) {
          setTimeout(() => {
            // Force reload to ensure grid sizes are applied even if they were previously loaded
            const loaded = loadGridSizesFromStorage(true);
            if (loaded) {
              setHasLoadedFromApi(true);
            }
          }, 150); // Increased delay to ensure storage write is complete
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('gridSizesUpdated', handleCustomStorageUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('gridSizesUpdated', handleCustomStorageUpdate);
    };
  }, [templateId, loadGridSizesFromStorage]);

  // Helper function to convert area ID (e.g., "area-1") to unique grid cell ID (e.g., "g31_1")
  // For free-floating layouts, returns the original areaId
  const getGridCellId = (areaId: string): string => {
    // Skip conversion for free-floating layouts
    if (layout === 'free-floating' || layout === 'no-grid') {
      return areaId;
    }

    // Extract cell index from area ID (e.g., "area-1" -> 0, "area-2" -> 1)
    const match = areaId.match(/^area-(\d+)$/);
    if (match) {
      const cellIndex = parseInt(match[1], 10) - 1; // Convert 1-based to 0-based
      return getGridCellPosition(layout, cellIndex);
    }

    // If areaId doesn't match pattern, return as-is (for backward compatibility)
    return areaId;
  };

  // Render widget content using the same system as main dashboard
  const renderWidgetContent = (areaId: string) => {
    // Get the unique grid cell ID for this area
    const gridCellId = getGridCellId(areaId);

    // Try to find widget by both old areaId format and new gridCellId format for backward compatibility
    const widgetId = getWidget?.(areaId) || getWidget?.(gridCellId);
    const hasWidget = !!widgetId;

    // Check if this is a TabbedWidget to disable outer hover effect (to prevent double borders)
    const isTabbedWidget = widgetId === 'tabbed-widget' || widgetId === 'tab-menu-widget';

    // Find the widget object to get CustomDashboardWidgetID for data-wgid attribute
    // Check both old and new position formats
    const widget = widgets.find(w => w.position === areaId || w.position === gridCellId);
    const customDashboardWidgetID = widget?.settings?.customDashboardWidgetID as number | undefined;

    const isHovered = hoveredCell === gridCellId && !isTabbedWidget;

    return (
      <div
        className={`w-full h-full bg-background relative group border-2 transition-all duration-200 ${
          isHovered 
            ? 'border-primary/80 shadow-[0_0_0_2px_rgba(var(--primary-rgb),0.15)]' 
            : isTabbedWidget && hasWidget
              ? 'border-transparent'
              : 'border-border/20'
        } ${!hasWidget ? 'z-0' : ''}`}
        data-area={gridCellId.replace(/^g\d+_/, 'area-')}
        data-position={gridCellId}
        data-wgid={customDashboardWidgetID ? customDashboardWidgetID.toString() : undefined}
        onMouseEnter={() => !isTabbedWidget && setHoveredCell(gridCellId)}
        onMouseLeave={() => setHoveredCell(null)}
      >
        {hasWidget ? (
          <div className="w-full h-full overflow-hidden">
            {renderWidget?.(widgetId, gridCellId)}
          </div>
        ) : (
          <EmptyGridCell
            onAddWidget={() => {
              onSetTargetPosition?.(gridCellId);
              onSetIsWidgetPanelOpen?.(true);
            }}
            position={gridCellId}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            isDragOver={isDragOver === areaId || isDragOver === gridCellId}
          />
        )}
      </div>
    );
  };

  // Helper to safely get grid size with default

  // Create a stable key that changes when sizes load from storage to force remount
  // This ensures ResizableGrid components update when gridSizes are loaded from API/storage
  // Similar to how ResizablePair includes sizes in its key

  // Helper to safely parse grid size values
  const safeParseGridSize = (value: string | undefined, defaultValue: number = 50): number => {
    if (!value) return defaultValue;
    const stringValue = String(value).replace('%', '');
    const parsed = parseFloat(stringValue);
    return isNaN(parsed) ? defaultValue : parsed;
  };

  // Custom save handler for nested 3-cell layouts
  // Saves all 3 values together (outer + inner sizes)
  const createNestedLayoutSaveHandler = useCallback((layoutType: string, percentages: number[]) => {
    return async () => {
      if (!templateId || !layoutType) {
        return;
      }

      try {
        // Save to localStorage
        const { templateGridSizesStorage } = await import('@/lib/templateGridSizes');
        templateGridSizesStorage.saveTemplateGridSizes(
          templateId,
          layoutType,
          percentages
        );

        // Save to database via API if template is saved (numeric ID)
        const templateIdNum = parseInt(templateId, 10);
        if (!isNaN(templateIdNum)) {
          const apiLayoutCode = mapLayoutToApiCode(layoutType);
          const positions = calculateGridPositions(
            layoutType as LayoutType,
            percentages,
            apiLayoutCode
          );

          await insertMainGridPosition(
            templateIdNum,
            positions.Top,
            positions.Left,
            positions.Height,
            positions.Width
          );
        }
      } catch (error) {
        // Error saving
      }
    };
  }, [templateId]);

  // Render the layout with ResizableGrid components for common layouts

  // Render the layout with ResizableGrid components for common layouts
  const renderLayout = () => {
    if (!layoutConfig) return null;
    const areas = layoutConfig.structure.areas;

    // Handle specific layouts with ResizableGrid for proper resizing
    switch (layout) {
      case "1-grid":
        return (
          <div className="flex-1 bg-background overflow-hidden h-full">
            {renderWidgetContent("area-1")}
          </div>
        );

      case "2-grid-vertical":
        const verticalSizes: [string, string] = gridSizes ? [gridSizes.left || "50%", gridSizes.right || "50%"] : ["50%", "50%"];
        return (
          <ResizablePair
            key={`vertical-${verticalSizes.join('-')}-${hasLoadedFromApi}`}
            direction="horizontal"
            initialSizes={verticalSizes}
            minSize={150}
            position1="area-1"
            position2="area-2"
            className="flex-1 bg-background overflow-hidden h-full"
            templateId={templateId}
            layout={layout}
          >
            {renderWidgetContent("area-1")}
            {renderWidgetContent("area-2")}
          </ResizablePair>
        );

      case "2-grid-horizontal":
        const horizontalSizes: [string, string] = gridSizes ? [gridSizes.top || "50%", gridSizes.bottom || "50%"] : ["50%", "50%"];
        return (
          <ResizablePair
            key={`horizontal-${horizontalSizes.join('-')}-${hasLoadedFromApi}`}
            direction="vertical"
            initialSizes={horizontalSizes}
            minSize={150}
            position1="area-1"
            position2="area-2"
            className="flex-1 bg-background overflow-hidden h-full"
            templateId={templateId}
            layout={layout}
          >
            {renderWidgetContent("area-1")}
            {renderWidgetContent("area-2")}
          </ResizablePair>
        );

      case "3-grid-rows":
        const rowSizes = gridSizes ? [gridSizes.top || "33.33%", gridSizes.middle || "33.33%", gridSizes.bottom || "33.33%"] : ["33.33%", "33.33%", "33.34%"];
        return (
          <ResizableGroup
            key={`rows-${rowSizes.join('-')}-${hasLoadedFromApi}`}
            direction="vertical"
            minSize={100}
            cells={[
              { content: renderWidgetContent("area-1"), position: "area-1", initialSize: rowSizes[0] },
              { content: renderWidgetContent("area-2"), position: "area-2", initialSize: rowSizes[1] },
              { content: renderWidgetContent("area-3"), position: "area-3", initialSize: rowSizes[2] },
            ]}
            className="flex-1 bg-background overflow-hidden h-full"
            templateId={templateId}
            layout={layout}
          />
        );

      case "3-grid-columns":
        const columnSizes = gridSizes ? [gridSizes.left || "33.33%", gridSizes.middle || "33.33%", gridSizes.right || "33.33%"] : ["33.33%", "33.33%", "33.34%"];
        return (
          <ResizableGroup
            key={`columns-${columnSizes.join('-')}-${hasLoadedFromApi}`}
            direction="horizontal"
            minSize={100}
            cells={[
              { content: renderWidgetContent("area-1"), position: "area-1", initialSize: columnSizes[0] },
              { content: renderWidgetContent("area-2"), position: "area-2", initialSize: columnSizes[1] },
              { content: renderWidgetContent("area-3"), position: "area-3", initialSize: columnSizes[2] },
            ]}
            className="flex-1 bg-background overflow-hidden h-full"
            templateId={templateId}
            layout={layout}
          />
        );

      case "3-grid-left-large": {
        // For this layout: left cell | (rightTop cell / rightBottom cell)
        // We need 3 sizes: [left%, rightTop%, rightBottom%]
        const leftPercent = parseFloat(gridSizes?.left || "50");
        const rightTopPercent = parseFloat(gridSizes?.rightTop || "50");
        const rightBottomPercent = parseFloat(gridSizes?.rightBottom || "50");

        // console.log('🎨 [DynamicGridRenderer] Rendering 3-grid-left-large with flat structure:', { leftPercent, rightTopPercent, rightBottomPercent }, 'gridSizes:', gridSizes);

        // For the main horizontal split
        const horizontalSizes: [string, string] = [`${leftPercent}%`, `${100 - leftPercent}%`];
        // For the right vertical split (as percentages of the right container)
        const rightVerticalSizes: [string, string] = [`${rightTopPercent}%`, `${rightBottomPercent}%`];

        // OPTIMIZATION: Debounced save handler to prevent multiple API calls
        // Initialize save state for this layout if it doesn't exist
        if (!saveStateRef.current.has(layout)) {
          saveStateRef.current.set(layout, { inProgress: false, timeout: null });
        }
        const saveState = saveStateRef.current.get(layout)!;

        // Debounced save handler that only executes once per resize operation
        const saveHandler = async () => {
          // If a save is already in progress or scheduled, skip this call
          if (saveState.inProgress) {
            return;
          }

          // Mark save as in progress IMMEDIATELY to prevent race conditions
          saveState.inProgress = true;

          // Clear any pending timeout
          if (saveState.timeout) {
            clearTimeout(saveState.timeout);
          }

          // Set a small debounce to batch multiple rapid calls
          saveState.timeout = setTimeout(async () => {
            try {
              const percentages = [
                parseFloat(gridSizesRef.current?.left || "50"),
                parseFloat(gridSizesRef.current?.rightTop || "50"),
                parseFloat(gridSizesRef.current?.rightBottom || "50")
              ];

              await createNestedLayoutSaveHandler(layout, percentages)();
            } finally {
              // Reset flag to allow future saves
              saveState.inProgress = false;
              saveState.timeout = null;
            }
          }, 50); // 50ms debounce to batch rapid calls
        };

        return (
          <div className="flex-1 flex bg-background overflow-hidden h-full" data-layout-container="3-grid-left-large">
            <ResizablePair
              direction="horizontal"
              initialSizes={horizontalSizes}
              minSize={150}
              position1="area-1"
              position2="right-container"
              templateId={undefined}
              layout={undefined}
              onSizeChange={(newSizes) => {
                const newGridSizes = {
                  ...gridSizesRef.current,
                  left: newSizes[0],
                  right: newSizes[1]
                };
                gridSizesRef.current = newGridSizes;
                setGridSizes(newGridSizes);
              }}
              onSaveRequired={saveHandler}
            >
              {renderWidgetContent("area-1")}
              {/* Mark the combined right stack container so resize math can use its height */}
              <div data-right-container="true" className="w-full h-full">
                <ResizablePair
                  direction="vertical"
                  initialSizes={rightVerticalSizes}
                  minSize={100}
                  position1="area-2"
                  position2="area-3"
                  templateId={undefined}
                  layout={undefined}
                  onSizeChange={(newSizes) => {
                    const newGridSizes = {
                      ...gridSizesRef.current,
                      rightTop: newSizes[0],
                      rightBottom: newSizes[1]
                    };
                    gridSizesRef.current = newGridSizes;
                    setGridSizes(newGridSizes);
                  }}
                  onSaveRequired={saveHandler}
                >
                  {renderWidgetContent("area-2")}
                  {renderWidgetContent("area-3")}
                </ResizablePair>
              </div>
            </ResizablePair>
          </div>
        );
      }

      case "3-grid-right-large": {
        // For this layout: (leftTop cell / leftBottom cell) | right cell
        // We need 3 sizes: [leftTop%, leftBottom%, right%]
        const rightPercent = parseFloat(gridSizes?.right || "50");
        const leftTopPercent = parseFloat(gridSizes?.leftTop || "50");
        const leftBottomPercent = parseFloat(gridSizes?.leftBottom || "50");

        // console.log('🎨 [DynamicGridRenderer] Rendering 3-grid-right-large with flat structure:', { leftTopPercent, leftBottomPercent, rightPercent }, 'gridSizes:', gridSizes);

        // For the main horizontal split
        const horizontalSizes2: [string, string] = [`${100 - rightPercent}%`, `${rightPercent}%`];
        // For the left vertical split (as percentages of the left container)
        const leftVerticalSizes: [string, string] = [`${leftTopPercent}%`, `${leftBottomPercent}%`];

        // Save handler that reads current values at call time
        const saveHandler = async () => {
          const percentages = [
            parseFloat(gridSizesRef.current?.leftTop || "50"),
            parseFloat(gridSizesRef.current?.leftBottom || "50"),
            parseFloat(gridSizesRef.current?.right || "50")
          ];
          await createNestedLayoutSaveHandler(layout, percentages)();
        };

        return (
          <div className="flex-1 flex bg-background overflow-hidden h-full" data-layout-container="3-grid-right-large">
            <ResizablePair
              direction="horizontal"
              initialSizes={horizontalSizes2}
              minSize={150}
              position1="left-container"
              position2="area-3"
              templateId={undefined}
              layout={undefined}
              onSizeChange={(newSizes) => {
                const newGridSizes = {
                  ...gridSizesRef.current,
                  left: newSizes[0],
                  right: newSizes[1]
                };
                gridSizesRef.current = newGridSizes;
                setGridSizes(newGridSizes);
              }}
              onSaveRequired={saveHandler}
            >
              {/* Mark the combined left stack container so resize math can use its height */}
              <div data-left-container="true" className="w-full h-full">
                <ResizablePair
                  direction="vertical"
                  initialSizes={leftVerticalSizes}
                  minSize={100}
                  position1="area-1"
                  position2="area-2"
                  templateId={undefined}
                  layout={undefined}
                  onSizeChange={(newSizes) => {
                    const newGridSizes = {
                      ...gridSizesRef.current,
                      leftTop: newSizes[0],
                      leftBottom: newSizes[1]
                    };
                    gridSizesRef.current = newGridSizes;
                    setGridSizes(newGridSizes);
                  }}
                  onSaveRequired={saveHandler}
                >
                  {renderWidgetContent("area-1")}
                  {renderWidgetContent("area-2")}
                </ResizablePair>
              </div>
              {renderWidgetContent("area-3")}
            </ResizablePair>
          </div>
        );
      }

      case "3-grid-top-large": {
        // For this layout: top cell on top, (bottomLeft cell | bottomRight cell) on bottom
        // We need 3 sizes: [top%, bottomLeft%, bottomRight%]
        const topPercent = parseFloat(gridSizes?.top || "50");
        const bottomLeftPercent = parseFloat(gridSizes?.bottomLeft || "50");
        const bottomRightPercent = parseFloat(gridSizes?.bottomRight || "50");

        // console.log('🎨 [DynamicGridRenderer] Rendering 3-grid-top-large with flat structure:', { topPercent, bottomLeftPercent, bottomRightPercent }, 'gridSizes:', gridSizes);

        // For the main vertical split: top cell first, then bottom container
        const verticalSizes3: [string, string] = [`${topPercent}%`, `${100 - topPercent}%`];
        // For the bottom horizontal split (as percentages of the bottom container)
        const bottomHorizontalSizes: [string, string] = [`${bottomLeftPercent}%`, `${bottomRightPercent}%`];

        // Save handler that reads current values at call time
        const saveHandler = async () => {
          const percentages = [
            parseFloat(gridSizesRef.current?.top || "50"),
            parseFloat(gridSizesRef.current?.bottomLeft || "50"),
            parseFloat(gridSizesRef.current?.bottomRight || "50")
          ];
          await createNestedLayoutSaveHandler(layout, percentages)();
        };

        return (
          <div className="flex-1 flex flex-col bg-background overflow-hidden h-full" data-layout-container="3-grid-top-large">
            <ResizablePair
              direction="vertical"
              initialSizes={verticalSizes3}
              minSize={150}
              position1="area-1"
              position2="bottom-container"
              templateId={undefined}
              layout={undefined}
              onSizeChange={(newSizes) => {
                const newGridSizes = {
                  ...gridSizesRef.current,
                  top: newSizes[0],
                  bottom: newSizes[1]
                };
                gridSizesRef.current = newGridSizes;
                setGridSizes(newGridSizes);
              }}
              onSaveRequired={saveHandler}
            >
              {renderWidgetContent("area-1")}
              {/* Mark the combined bottom container so resize math can use its width */}
              <div data-bottom-container="true" className="w-full h-full">
                <ResizablePair
                  direction="horizontal"
                  initialSizes={bottomHorizontalSizes}
                  minSize={150}
                  position1="area-2"
                  position2="area-3"
                  templateId={undefined}
                  layout={undefined}
                  onSizeChange={(newSizes) => {
                    const newGridSizes = {
                      ...gridSizesRef.current,
                      bottomLeft: newSizes[0],
                      bottomRight: newSizes[1]
                    };
                    gridSizesRef.current = newGridSizes;
                    setGridSizes(newGridSizes);
                  }}
                  onSaveRequired={saveHandler}
                >
                  {renderWidgetContent("area-2")}
                  {renderWidgetContent("area-3")}
                </ResizablePair>
              </div>
            </ResizablePair>
          </div>
        );
      }

      case "3-grid-bottom-large": {
        // For this layout: (topLeft cell | topRight cell) on top, bottom cell on bottom
        // We need 3 sizes: [topLeft%, topRight%, bottom%]
        const bottomPercent = parseFloat(gridSizes?.bottom || "50");
        const topLeftPercent = parseFloat(gridSizes?.topLeft || "50");
        const topRightPercent = parseFloat(gridSizes?.topRight || "50");

        // console.log('🎨 [DynamicGridRenderer] Rendering 3-grid-bottom-large with flat structure:', { topLeftPercent, topRightPercent, bottomPercent }, 'gridSizes:', gridSizes);

        // For the main vertical split
        const verticalSizes4: [string, string] = [`${100 - bottomPercent}%`, `${bottomPercent}%`];
        // For the top horizontal split (as percentages of the top container)
        const topHorizontalSizes: [string, string] = [`${topLeftPercent}%`, `${topRightPercent}%`];

        // Save handler that reads current values at call time
        const saveHandler = async () => {
          const percentages = [
            parseFloat(gridSizesRef.current?.topLeft || "50"),
            parseFloat(gridSizesRef.current?.topRight || "50"),
            parseFloat(gridSizesRef.current?.bottom || "50")
          ];
          await createNestedLayoutSaveHandler(layout, percentages)();
        };

        return (
          <div className="flex-1 flex flex-col bg-background overflow-hidden h-full" data-layout-container="3-grid-bottom-large">
            <ResizablePair
              direction="vertical"
              initialSizes={verticalSizes4}
              minSize={150}
              position1="top-container"
              position2="area-3"
              templateId={undefined}
              layout={undefined}
              onSizeChange={(newSizes) => {
                const newGridSizes = {
                  ...gridSizesRef.current,
                  top: newSizes[0],
                  bottom: newSizes[1]
                };
                gridSizesRef.current = newGridSizes;
                setGridSizes(newGridSizes);
              }}
              onSaveRequired={saveHandler}
            >
              {/* Mark the combined top container so resize math can use its width */}
              <div data-top-container="true" className="w-full h-full">
                <ResizablePair
                  direction="horizontal"
                  initialSizes={topHorizontalSizes}
                  minSize={150}
                  position1="area-1"
                  position2="area-2"
                  templateId={undefined}
                  layout={undefined}
                  onSizeChange={(newSizes) => {
                    const newGridSizes = {
                      ...gridSizesRef.current,
                      topLeft: newSizes[0],
                      topRight: newSizes[1]
                    };
                    gridSizesRef.current = newGridSizes;
                    setGridSizes(newGridSizes);
                  }}
                  onSaveRequired={saveHandler}
                >
                  {renderWidgetContent("area-1")}
                  {renderWidgetContent("area-2")}
                </ResizablePair>
              </div>
              {renderWidgetContent("area-3")}
            </ResizablePair>
          </div>
        );
      }

      case "4-grid": {
        // For this layout: (topLeft cell | topRight cell) on top, (bottomLeft cell | bottomRight cell) on bottom
        // We need 6 sizes: [top%, topLeft%, topRight%, bottomLeft%, bottomRight%, bottom%]
        const topHeight = parseFloat(gridSizes?.top || "50");
        const bottomHeight = parseFloat(gridSizes?.bottom || "50");
        const topLeftWidth = parseFloat(gridSizes?.topLeft || "50");
        const topRightWidth = parseFloat(gridSizes?.topRight || "50");
        const bottomLeftWidth = parseFloat(gridSizes?.bottomLeft || "50");
        const bottomRightWidth = parseFloat(gridSizes?.bottomRight || "50");

        // console.log('🎨 [DynamicGridRenderer] Rendering 4-grid with flat structure:', { topHeight, bottomHeight, topLeftWidth, topRightWidth, bottomLeftWidth, bottomRightWidth }, 'gridSizes:', gridSizes);

        // For the main vertical split
        const verticalSizes5: [string, string] = [`${topHeight}%`, `${bottomHeight}%`];
        // For the top horizontal split (as percentages of the top container)
        const topHorizontalSizes2: [string, string] = [`${topLeftWidth}%`, `${topRightWidth}%`];
        // For the bottom horizontal split (as percentages of the bottom container)
        const bottomHorizontalSizes2: [string, string] = [`${bottomLeftWidth}%`, `${bottomRightWidth}%`];

        // Save handler that reads current values at call time
        const saveHandler = async () => {
          const percentages = [
            safeParseGridSize(gridSizesRef.current?.top, 50),
            safeParseGridSize(gridSizesRef.current?.topLeft, 50),
            safeParseGridSize(gridSizesRef.current?.topRight, 50),
            safeParseGridSize(gridSizesRef.current?.bottomLeft, 50),
            safeParseGridSize(gridSizesRef.current?.bottomRight, 50),
            safeParseGridSize(gridSizesRef.current?.bottom, 50)
          ];
          await createNestedLayoutSaveHandler(layout, percentages)();
        };

        return (
          <div className="flex-1 flex flex-col bg-background overflow-hidden h-full" data-layout-container="4-grid">
            <ResizablePair
              key={`4grid-outer`}
              direction="vertical"
              initialSizes={verticalSizes5}
              minSize={150}
              position1="top-container"
              position2="bottom-container"
              templateId={undefined}
              layout={undefined}
              onSizeChange={(newSizes) => {
                const newGridSizes = {
                  ...gridSizesRef.current,
                  top: newSizes[0],
                  bottom: newSizes[1]
                };
                gridSizesRef.current = newGridSizes;
                setGridSizes(newGridSizes);
              }}
              onSaveRequired={saveHandler}
            >
              <ResizablePair
                key={`4grid-top`}
                direction="horizontal"
                initialSizes={topHorizontalSizes2}
                minSize={150}
                position1="area-1"
                position2="area-2"
                templateId={undefined}
                layout={undefined}
                onSizeChange={(newSizes) => {
                  const newGridSizes = {
                    ...gridSizesRef.current,
                    topLeft: newSizes[0],
                    topRight: newSizes[1]
                  };
                  gridSizesRef.current = newGridSizes;
                  setGridSizes(newGridSizes);
                }}
                onSaveRequired={saveHandler}
              >
                {renderWidgetContent("area-1")}
                {renderWidgetContent("area-2")}
              </ResizablePair>
              <ResizablePair
                key={`4grid-bottom`}
                direction="horizontal"
                initialSizes={bottomHorizontalSizes2}
                minSize={150}
                position1="area-3"
                position2="area-4"
                templateId={undefined}
                layout={undefined}
                onSizeChange={(newSizes) => {
                  const newGridSizes = {
                    ...gridSizesRef.current,
                    bottomLeft: newSizes[0],
                    bottomRight: newSizes[1]
                  };
                  gridSizesRef.current = newGridSizes;
                  setGridSizes(newGridSizes);
                }}
                onSaveRequired={saveHandler}
              >
                {renderWidgetContent("area-3")}
                {renderWidgetContent("area-4")}
              </ResizablePair>
            </ResizablePair>
          </div>
        );
      }

      case "4-grid-columns": {
        // 4 vertical columns layout
        const columnSizes = gridSizes ? [
          gridSizes.left || "25%",
          gridSizes.leftMiddle || "25%",
          gridSizes.rightMiddle || "25%",
          gridSizes.right || "25%"
        ] : ["25%", "25%", "25%", "25%"];

        return (
          <ResizableGroup
            key={`4-grid-columns-${columnSizes.join('-')}-${hasLoadedFromApi}`}
            direction="horizontal"
            minSize={100}
            cells={[
              { content: renderWidgetContent("area-1"), position: "area-1", initialSize: columnSizes[0] },
              { content: renderWidgetContent("area-2"), position: "area-2", initialSize: columnSizes[1] },
              { content: renderWidgetContent("area-3"), position: "area-3", initialSize: columnSizes[2] },
              { content: renderWidgetContent("area-4"), position: "area-4", initialSize: columnSizes[3] },
            ]}
            className="flex-1 bg-background overflow-hidden h-full"
            templateId={templateId}
            layout={layout}
          />
        );
      }

      case "4-grid-rows": {
        // 4 horizontal rows layout
        const rowSizes = gridSizes ? [
          gridSizes.top || "25%",
          gridSizes.topMiddle || "25%",
          gridSizes.bottomMiddle || "25%",
          gridSizes.bottom || "25%"
        ] : ["25%", "25%", "25%", "25%"];

        return (
          <ResizableGroup
            key={`4-grid-rows-${rowSizes.join('-')}-${hasLoadedFromApi}`}
            direction="vertical"
            minSize={100}
            cells={[
              { content: renderWidgetContent("area-1"), position: "area-1", initialSize: rowSizes[0] },
              { content: renderWidgetContent("area-2"), position: "area-2", initialSize: rowSizes[1] },
              { content: renderWidgetContent("area-3"), position: "area-3", initialSize: rowSizes[2] },
              { content: renderWidgetContent("area-4"), position: "area-4", initialSize: rowSizes[3] },
            ]}
            className="flex-1 bg-background overflow-hidden h-full"
            templateId={templateId}
            layout={layout}
          />
        );
      }

      case "4-grid-top-large": {
        // Top large panel + 3 bottom panels
        const topHeight = parseFloat(gridSizes?.top || "33");
        const bottomLeft = parseFloat(gridSizes?.bottomLeft || "33.33");
        const bottomMiddle = parseFloat(gridSizes?.bottomMiddle || "33.33");
        const bottomRight = parseFloat(gridSizes?.bottomRight || "33.34");

        const verticalSizes: [string, string] = [`${topHeight}%`, `${100 - topHeight}%`];
        const bottomSizes = [`${bottomLeft}%`, `${bottomMiddle}%`, `${bottomRight}%`];

        // Save handler that reads current values at call time
        const saveHandler = async () => {
          const percentages = [
            parseFloat(gridSizesRef.current?.top || "33"),
            parseFloat(gridSizesRef.current?.bottomLeft || "33.33"),
            parseFloat(gridSizesRef.current?.bottomMiddle || "33.33")
          ];
          await createNestedLayoutSaveHandler(layout, percentages)();
        };

        return (
          <div className="flex-1 flex flex-col bg-background overflow-hidden h-full" data-layout-container="4-grid-top-large">
            <ResizablePair
              direction="vertical"
              initialSizes={verticalSizes}
              minSize={150}
              position1="area-1"
              position2="bottom-container"
              templateId={undefined}
              layout={undefined}
              onSizeChange={(newSizes) => {
                // IMPORTANT: Only update ref during drag, save on mouseup to prevent inner ResizableGroup reset
                const newGridSizes = {
                  ...gridSizesRef.current,
                  top: newSizes[0],
                  bottom: newSizes[1]
                };
                gridSizesRef.current = newGridSizes;
                // Don't call setGridSizes here - let it update on mouseup via onSaveRequired
              }}
              onSaveRequired={saveHandler}
            >
              {renderWidgetContent("area-1")}
              <ResizableGroup
                direction="horizontal"
                minSize={100}
                cells={[
                  { content: renderWidgetContent("area-2"), position: "area-2", initialSize: bottomSizes[0] },
                  { content: renderWidgetContent("area-3"), position: "area-3", initialSize: bottomSizes[1] },
                  { content: renderWidgetContent("area-4"), position: "area-4", initialSize: bottomSizes[2] },
                ]}
                templateId={undefined}
                layout={undefined}
                onSizeChange={(newSizes) => {
                  const newGridSizes = {
                    ...gridSizesRef.current,
                    bottomLeft: newSizes[0],
                    bottomMiddle: newSizes[1],
                    bottomRight: newSizes[2]
                  };
                  gridSizesRef.current = newGridSizes;
                  setGridSizes(newGridSizes);
                }}
                onSaveRequired={saveHandler}
              />
            </ResizablePair>
          </div>
        );
      }

      case "4-grid-left-large": {
        // Left large panel + 3 right panels
        const leftWidth = parseFloat(gridSizes?.left || "50");
        const rightTop = parseFloat(gridSizes?.rightTop || "33.33");
        const rightMiddle = parseFloat(gridSizes?.rightMiddle || "33.33");
        const rightBottom = parseFloat(gridSizes?.rightBottom || "33.34");

        const horizontalSizes: [string, string] = [`${leftWidth}%`, `${100 - leftWidth}%`];
        const rightSizes = [`${rightTop}%`, `${rightMiddle}%`, `${rightBottom}%`];

        // Save handler that reads current values at call time
        const saveHandler = async () => {
          const percentages = [
            parseFloat(gridSizesRef.current?.left || "50"),
            parseFloat(gridSizesRef.current?.rightTop || "33.33"),
            parseFloat(gridSizesRef.current?.rightMiddle || "33.33")
          ];
          await createNestedLayoutSaveHandler(layout, percentages)();
        };

        return (
          <div className="flex-1 flex bg-background overflow-hidden h-full" data-layout-container="4-grid-left-large">
            <ResizablePair
              direction="horizontal"
              initialSizes={horizontalSizes}
              minSize={150}
              position1="area-1"
              position2="right-container"
              templateId={undefined}
              layout={undefined}
              onSizeChange={(newSizes) => {
                // IMPORTANT: Only update ref during drag, save on mouseup to prevent inner ResizableGroup reset
                const newGridSizes = {
                  ...gridSizesRef.current,
                  left: newSizes[0],
                  right: newSizes[1]
                };
                gridSizesRef.current = newGridSizes;
                // Don't call setGridSizes here - let it update on mouseup via onSaveRequired
              }}
              onSaveRequired={saveHandler}
            >
              {renderWidgetContent("area-1")}
              <ResizableGroup
                direction="vertical"
                minSize={100}
                cells={[
                  { content: renderWidgetContent("area-2"), position: "area-2", initialSize: rightSizes[0] },
                  { content: renderWidgetContent("area-3"), position: "area-3", initialSize: rightSizes[1] },
                  { content: renderWidgetContent("area-4"), position: "area-4", initialSize: rightSizes[2] },
                ]}
                templateId={undefined}
                layout={undefined}
                onSizeChange={(newSizes) => {
                  const newGridSizes = {
                    ...gridSizesRef.current,
                    rightTop: newSizes[0],
                    rightMiddle: newSizes[1],
                    rightBottom: newSizes[2]
                  };
                  gridSizesRef.current = newGridSizes;
                  setGridSizes(newGridSizes);
                }}
                onSaveRequired={saveHandler}
              />
            </ResizablePair>
          </div>
        );
      }

      case "4-grid-right-large": {
        // 3 left panels + right large panel
        const rightWidth = parseFloat(gridSizes?.right || "50");
        const leftTop = parseFloat(gridSizes?.leftTop || "33.33");
        const leftMiddle = parseFloat(gridSizes?.leftMiddle || "33.33");
        const leftBottom = parseFloat(gridSizes?.leftBottom || "33.34");

        const horizontalSizes: [string, string] = [`${100 - rightWidth}%`, `${rightWidth}%`];
        const leftSizes = [`${leftTop}%`, `${leftMiddle}%`, `${leftBottom}%`];

        // Save handler that reads current values at call time
        const saveHandler = async () => {
          const percentages = [
            parseFloat(gridSizesRef.current?.leftTop || "33.33"),
            parseFloat(gridSizesRef.current?.leftMiddle || "33.33"),
            parseFloat(gridSizesRef.current?.leftBottom || "33.34"),
            parseFloat(gridSizesRef.current?.right || "50")
          ];
          await createNestedLayoutSaveHandler(layout, percentages)();
        };

        return (
          <div className="flex-1 flex bg-background overflow-hidden h-full" data-layout-container="4-grid-right-large">
            <ResizablePair
              direction="horizontal"
              initialSizes={horizontalSizes}
              minSize={150}
              position1="left-container"
              position2="area-4"
              templateId={undefined}
              layout={undefined}
              onSizeChange={(newSizes) => {
                // IMPORTANT: Only update ref during drag, save on mouseup to prevent inner ResizableGroup reset
                const newGridSizes = {
                  ...gridSizesRef.current,
                  left: newSizes[0],
                  right: newSizes[1]
                };
                gridSizesRef.current = newGridSizes;
                // Don't call setGridSizes here - let it update on mouseup via onSaveRequired
              }}
              onSaveRequired={saveHandler}
            >
              <ResizableGroup
                direction="vertical"
                minSize={100}
                cells={[
                  { content: renderWidgetContent("area-1"), position: "area-1", initialSize: leftSizes[0] },
                  { content: renderWidgetContent("area-2"), position: "area-2", initialSize: leftSizes[1] },
                  { content: renderWidgetContent("area-3"), position: "area-3", initialSize: leftSizes[2] },
                ]}
                templateId={undefined}
                layout={undefined}
                onSizeChange={(newSizes) => {
                  const newGridSizes = {
                    ...gridSizesRef.current,
                    leftTop: newSizes[0],
                    leftMiddle: newSizes[1],
                    leftBottom: newSizes[2]
                  };
                  gridSizesRef.current = newGridSizes;
                  setGridSizes(newGridSizes);
                }}
                onSaveRequired={saveHandler}
              />
              {renderWidgetContent("area-4")}
            </ResizablePair>
          </div>
        );
      }

      case "4-grid-bottom-large": {
        // 3 top panels + bottom large panel
        const bottomHeight = parseFloat(gridSizes?.bottom || "50");
        const topLeft = parseFloat(gridSizes?.topLeft || "33.33");
        const topMiddle = parseFloat(gridSizes?.topMiddle || "33.33");
        const topRight = parseFloat(gridSizes?.topRight || "33.34");

        const verticalSizes: [string, string] = [`${100 - bottomHeight}%`, `${bottomHeight}%`];
        const topSizes = [`${topLeft}%`, `${topMiddle}%`, `${topRight}%`];

        // Save handler that reads current values at call time
        const saveHandler = async () => {
          const percentages = [
            parseFloat(gridSizesRef.current?.topLeft || "33.33"),
            parseFloat(gridSizesRef.current?.topMiddle || "33.33"),
            parseFloat(gridSizesRef.current?.topRight || "33.34"),
            parseFloat(gridSizesRef.current?.bottom || "50")
          ];
          await createNestedLayoutSaveHandler(layout, percentages)();
        };

        return (
          <div className="flex-1 flex flex-col bg-background overflow-hidden h-full" data-layout-container="4-grid-bottom-large">
            <ResizablePair
              direction="vertical"
              initialSizes={verticalSizes}
              minSize={150}
              position1="top-container"
              position2="area-4"
              templateId={undefined}
              layout={undefined}
              onSizeChange={(newSizes) => {
                // IMPORTANT: Only update ref during drag, save on mouseup to prevent inner ResizableGroup reset
                const newGridSizes = {
                  ...gridSizesRef.current,
                  top: newSizes[0],
                  bottom: newSizes[1]
                };
                gridSizesRef.current = newGridSizes;
                // Don't call setGridSizes here - let it update on mouseup via onSaveRequired
              }}
              onSaveRequired={saveHandler}
            >
              <ResizableGroup
                direction="horizontal"
                minSize={100}
                cells={[
                  { content: renderWidgetContent("area-1"), position: "area-1", initialSize: topSizes[0] },
                  { content: renderWidgetContent("area-2"), position: "area-2", initialSize: topSizes[1] },
                  { content: renderWidgetContent("area-3"), position: "area-3", initialSize: topSizes[2] },
                ]}
                templateId={undefined}
                layout={undefined}
                onSizeChange={(newSizes) => {
                  const newGridSizes = {
                    ...gridSizesRef.current,
                    topLeft: newSizes[0],
                    topMiddle: newSizes[1],
                    topRight: newSizes[2]
                  };
                  gridSizesRef.current = newGridSizes;
                  setGridSizes(newGridSizes);
                }}
                onSaveRequired={saveHandler}
              />
              {renderWidgetContent("area-4")}
            </ResizablePair>
          </div>
        );
      }

      case "5-grid-rows": {
        // 5 horizontal rows layout
        const rowSizes = gridSizes ? [
          gridSizes.top || "20%",
          gridSizes.topMiddle1 || "20%",
          gridSizes.topMiddle2 || "20%",
          gridSizes.bottomMiddle || "20%",
          gridSizes.bottom || "20%"
        ] : ["20%", "20%", "20%", "20%", "20%"];

        return (
          <ResizableGroup
            key={`5-grid-rows-${rowSizes.join('-')}-${hasLoadedFromApi}`}
            direction="vertical"
            minSize={80}
            cells={[
              { content: renderWidgetContent("area-1"), position: "area-1", initialSize: rowSizes[0] },
              { content: renderWidgetContent("area-2"), position: "area-2", initialSize: rowSizes[1] },
              { content: renderWidgetContent("area-3"), position: "area-3", initialSize: rowSizes[2] },
              { content: renderWidgetContent("area-4"), position: "area-4", initialSize: rowSizes[3] },
              { content: renderWidgetContent("area-5"), position: "area-5", initialSize: rowSizes[4] },
            ]}
            className="flex-1 bg-background overflow-hidden h-full"
            templateId={templateId}
            layout={layout}
          />
        );
      }

      case "5-grid-columns": {
        // 5 vertical columns layout
        const columnSizes = gridSizes ? [
          gridSizes.left || "20%",
          gridSizes.leftMiddle1 || "20%",
          gridSizes.leftMiddle2 || "20%",
          gridSizes.rightMiddle || "20%",
          gridSizes.right || "20%"
        ] : ["20%", "20%", "20%", "20%", "20%"];

        return (
          <ResizableGroup
            key={`5-grid-columns-${columnSizes.join('-')}-${hasLoadedFromApi}`}
            direction="horizontal"
            minSize={80}
            cells={[
              { content: renderWidgetContent("area-1"), position: "area-1", initialSize: columnSizes[0] },
              { content: renderWidgetContent("area-2"), position: "area-2", initialSize: columnSizes[1] },
              { content: renderWidgetContent("area-3"), position: "area-3", initialSize: columnSizes[2] },
              { content: renderWidgetContent("area-4"), position: "area-4", initialSize: columnSizes[3] },
              { content: renderWidgetContent("area-5"), position: "area-5", initialSize: columnSizes[4] },
            ]}
            className="flex-1 bg-background overflow-hidden h-full"
            templateId={templateId}
            layout={layout}
          />
        );
      }

      case "5-grid-complex": {
        // 5-cell complex layout: 2 top cells (area-1 large, area-2) + 3 bottom cells
        const topHeight = parseFloat(gridSizes?.top || "50");
        const topLeft = parseFloat(gridSizes?.left || "50");
        const topRight = parseFloat(gridSizes?.right || "50");
        const bottomLeft = parseFloat(gridSizes?.bottomLeft || "33.33");
        const bottomMiddle = parseFloat(gridSizes?.bottomMiddle || "33.33");
        const bottomRight = parseFloat(gridSizes?.bottomRight || "33.34");

        const verticalSizes: [string, string] = [`${topHeight}%`, `${100 - topHeight}%`];
        const topSizes: [string, string] = [`${topLeft}%`, `${topRight}%`];
        const bottomSizes = [`${bottomLeft}%`, `${bottomMiddle}%`, `${bottomRight}%`];

        // Save handler that reads current values at call time
        // Format: [top height, topLeft width, topRight width, bottomLeft width, bottomMiddle width, bottomRight width]
        const saveHandler = async () => {
          const percentages = [
            parseFloat(gridSizesRef.current?.top || "50"),
            parseFloat(gridSizesRef.current?.left || "50"),
            parseFloat(gridSizesRef.current?.right || "50"),
            parseFloat(gridSizesRef.current?.bottomLeft || "33.33"),
            parseFloat(gridSizesRef.current?.bottomMiddle || "33.33"),
            parseFloat(gridSizesRef.current?.bottomRight || "33.34")
          ];
          await createNestedLayoutSaveHandler(layout, percentages)();
        };

        return (
          <div className="flex-1 flex flex-col bg-background overflow-hidden h-full" data-layout-container="5-grid-complex">
            <ResizablePair
              key={`5complex-outer-${topHeight.toFixed(2)}`}
              direction="vertical"
              initialSizes={verticalSizes}
              minSize={150}
              position1="top-container"
              position2="bottom-container"
              templateId={undefined}
              layout={undefined}
              onSizeChange={(newSizes) => {
                const newGridSizes = {
                  ...gridSizesRef.current,
                  top: newSizes[0],
                  bottom: newSizes[1]
                };
                gridSizesRef.current = newGridSizes;
                setGridSizes(newGridSizes);
              }}
              onSaveRequired={saveHandler}
            >
              <ResizablePair
                key={`5complex-top-${topLeft.toFixed(2)}-${topRight.toFixed(2)}`}
                direction="horizontal"
                initialSizes={topSizes}
                minSize={150}
                position1="area-1"
                position2="area-2"
                templateId={undefined}
                layout={undefined}
                onSizeChange={(newSizes) => {
                  const newGridSizes = {
                    ...gridSizesRef.current,
                    left: newSizes[0],
                    right: newSizes[1]
                  };
                  gridSizesRef.current = newGridSizes;
                  setGridSizes(newGridSizes);
                }}
                onSaveRequired={saveHandler}
              >
                {renderWidgetContent("area-1")}
                {renderWidgetContent("area-2")}
              </ResizablePair>
              <ResizableGroup
                key={`5complex-bottom-${bottomLeft.toFixed(2)}-${bottomMiddle.toFixed(2)}-${bottomRight.toFixed(2)}`}
                direction="horizontal"
                minSize={100}
                cells={[
                  { content: renderWidgetContent("area-3"), position: "area-3", initialSize: bottomSizes[0] },
                  { content: renderWidgetContent("area-4"), position: "area-4", initialSize: bottomSizes[1] },
                  { content: renderWidgetContent("area-5"), position: "area-5", initialSize: bottomSizes[2] },
                ]}
                templateId={undefined}
                layout={undefined}
                onSizeChange={(newSizes) => {
                  const newGridSizes = {
                    ...gridSizesRef.current,
                    bottomLeft: newSizes[0],
                    bottomMiddle: newSizes[1],
                    bottomRight: newSizes[2]
                  };
                  gridSizesRef.current = newGridSizes;
                  setGridSizes(newGridSizes);
                }}
                onSaveRequired={saveHandler}
              />
            </ResizablePair>
          </div>
        );
      }

      case "6-grid-2x3": {
        // 6-cell 2x3 grid: 3 columns, 2 rows
        const topHeight = parseFloat(gridSizes?.top || "50");
        const topLeft = parseFloat(gridSizes?.topLeft || "33.33");
        const topMiddle = parseFloat(gridSizes?.topMiddle || "33.33");
        const topRight = parseFloat(gridSizes?.topRight || "33.34");
        const bottomLeft = parseFloat(gridSizes?.bottomLeft || "33.33");
        const bottomMiddle = parseFloat(gridSizes?.bottomMiddle || "33.33");
        const bottomRight = parseFloat(gridSizes?.bottomRight || "33.34");

        const verticalSizes: [string, string] = [`${topHeight}%`, `${100 - topHeight}%`];
        const topSizes = [`${topLeft}%`, `${topMiddle}%`, `${topRight}%`];
        const bottomSizes = [`${bottomLeft}%`, `${bottomMiddle}%`, `${bottomRight}%`];

        return (
          <div className="flex-1 flex flex-col bg-background overflow-hidden h-full" data-layout-container="6-grid-2x3">
            <ResizablePair
              direction="vertical"
              initialSizes={verticalSizes}
              minSize={150}
              position1="top-container"
              position2="bottom-container"
              templateId={undefined}
              layout={undefined}
              onSizeChange={(newSizes) => {
                const newGridSizes = {
                  ...gridSizesRef.current,
                  top: newSizes[0],
                  bottom: newSizes[1]
                };
                gridSizesRef.current = newGridSizes;
                setGridSizes(newGridSizes);
              }}
              onSaveRequired={createNestedLayoutSaveHandler(
                layout,
                [
                  parseFloat(gridSizesRef.current?.top || "50"),
                  parseFloat(gridSizesRef.current?.topLeft || "33.33"),
                  parseFloat(gridSizesRef.current?.topMiddle || "33.33"),
                  parseFloat(gridSizesRef.current?.topRight || "33.34"),
                  parseFloat(gridSizesRef.current?.bottomLeft || "33.33"),
                  parseFloat(gridSizesRef.current?.bottomMiddle || "33.33"),
                  parseFloat(gridSizesRef.current?.bottomRight || "33.34")
                ]
              )}
            >
              <ResizableGroup
                direction="horizontal"
                minSize={100}
                cells={[
                  { content: renderWidgetContent("area-1"), position: "area-1", initialSize: topSizes[0] },
                  { content: renderWidgetContent("area-2"), position: "area-2", initialSize: topSizes[1] },
                  { content: renderWidgetContent("area-3"), position: "area-3", initialSize: topSizes[2] },
                ]}
                templateId={undefined}
                layout={undefined}
                onSizeChange={(newSizes) => {
                  const newGridSizes = {
                    ...gridSizesRef.current,
                    topLeft: newSizes[0],
                    topMiddle: newSizes[1],
                    topRight: newSizes[2]
                  };
                  gridSizesRef.current = newGridSizes;
                  setGridSizes(newGridSizes);
                }}
                onSaveRequired={createNestedLayoutSaveHandler(
                  layout,
                  [
                    parseFloat(gridSizesRef.current?.top || "50"),
                    parseFloat(gridSizesRef.current?.topLeft || "33.33"),
                    parseFloat(gridSizesRef.current?.topMiddle || "33.33"),
                    parseFloat(gridSizesRef.current?.topRight || "33.34"),
                    parseFloat(gridSizesRef.current?.bottomLeft || "33.33"),
                    parseFloat(gridSizesRef.current?.bottomMiddle || "33.33"),
                    parseFloat(gridSizesRef.current?.bottomRight || "33.34")
                  ]
                )}
              />
              <ResizableGroup
                direction="horizontal"
                minSize={100}
                cells={[
                  { content: renderWidgetContent("area-4"), position: "area-4", initialSize: bottomSizes[0] },
                  { content: renderWidgetContent("area-5"), position: "area-5", initialSize: bottomSizes[1] },
                  { content: renderWidgetContent("area-6"), position: "area-6", initialSize: bottomSizes[2] },
                ]}
                templateId={undefined}
                layout={undefined}
                onSizeChange={(newSizes) => {
                  const newGridSizes = {
                    ...gridSizesRef.current,
                    bottomLeft: newSizes[0],
                    bottomMiddle: newSizes[1],
                    bottomRight: newSizes[2]
                  };
                  gridSizesRef.current = newGridSizes;
                  setGridSizes(newGridSizes);
                }}
                onSaveRequired={createNestedLayoutSaveHandler(
                  layout,
                  [
                    parseFloat(gridSizesRef.current?.top || "50"),
                    parseFloat(gridSizesRef.current?.topLeft || "33.33"),
                    parseFloat(gridSizesRef.current?.topMiddle || "33.33"),
                    parseFloat(gridSizesRef.current?.topRight || "33.34"),
                    parseFloat(gridSizesRef.current?.bottomLeft || "33.33"),
                    parseFloat(gridSizesRef.current?.bottomMiddle || "33.33"),
                    parseFloat(gridSizesRef.current?.bottomRight || "33.34")
                  ]
                )}
              />
            </ResizablePair>
          </div>
        );
      }

      case "6-grid-3x2": {
        // 6-cell 3x2 grid: 2 columns, 3 rows
        const leftWidth = parseFloat(gridSizes?.left || "50");
        const leftTop = parseFloat(gridSizes?.leftTop || "33.33");
        const leftMiddle = parseFloat(gridSizes?.leftMiddle || "33.33");
        const leftBottom = parseFloat(gridSizes?.leftBottom || "33.34");
        const rightTop = parseFloat(gridSizes?.rightTop || "33.33");
        const rightMiddle = parseFloat(gridSizes?.rightMiddle || "33.33");
        const rightBottom = parseFloat(gridSizes?.rightBottom || "33.34");

        const horizontalSizes: [string, string] = [`${leftWidth}%`, `${100 - leftWidth}%`];
        const leftSizes = [`${leftTop}%`, `${leftMiddle}%`, `${leftBottom}%`];
        const rightSizes = [`${rightTop}%`, `${rightMiddle}%`, `${rightBottom}%`];

        return (
          <div className="flex-1 flex bg-background overflow-hidden h-full" data-layout-container="6-grid-3x2">
            <ResizablePair
              direction="horizontal"
              initialSizes={horizontalSizes}
              minSize={150}
              position1="left-container"
              position2="right-container"
              templateId={undefined}
              layout={undefined}
              onSizeChange={(newSizes) => {
                const newGridSizes = {
                  ...gridSizesRef.current,
                  left: newSizes[0],
                  right: newSizes[1]
                };
                gridSizesRef.current = newGridSizes;
                setGridSizes(newGridSizes);
              }}
              onSaveRequired={createNestedLayoutSaveHandler(
                layout,
                [
                  parseFloat(gridSizesRef.current?.left || "50"),
                  parseFloat(gridSizesRef.current?.leftTop || "33.33"),
                  parseFloat(gridSizesRef.current?.leftMiddle || "33.33"),
                  parseFloat(gridSizesRef.current?.leftBottom || "33.34"),
                  parseFloat(gridSizesRef.current?.rightTop || "33.33"),
                  parseFloat(gridSizesRef.current?.rightMiddle || "33.33"),
                  parseFloat(gridSizesRef.current?.rightBottom || "33.34")
                ]
              )}
            >
              <ResizableGroup
                direction="vertical"
                minSize={100}
                cells={[
                  { content: renderWidgetContent("area-1"), position: "area-1", initialSize: leftSizes[0] },
                  { content: renderWidgetContent("area-3"), position: "area-3", initialSize: leftSizes[1] },
                  { content: renderWidgetContent("area-5"), position: "area-5", initialSize: leftSizes[2] },
                ]}
                templateId={undefined}
                layout={undefined}
                onSizeChange={(newSizes) => {
                  const newGridSizes = {
                    ...gridSizesRef.current,
                    leftTop: newSizes[0],
                    leftMiddle: newSizes[1],
                    leftBottom: newSizes[2]
                  };
                  gridSizesRef.current = newGridSizes;
                  setGridSizes(newGridSizes);
                }}
                onSaveRequired={createNestedLayoutSaveHandler(
                  layout,
                  [
                    parseFloat(gridSizesRef.current?.left || "50"),
                    parseFloat(gridSizesRef.current?.leftTop || "33.33"),
                    parseFloat(gridSizesRef.current?.leftMiddle || "33.33"),
                    parseFloat(gridSizesRef.current?.leftBottom || "33.34"),
                    parseFloat(gridSizesRef.current?.rightTop || "33.33"),
                    parseFloat(gridSizesRef.current?.rightMiddle || "33.33"),
                    parseFloat(gridSizesRef.current?.rightBottom || "33.34")
                  ]
                )}
              />
              <ResizableGroup
                direction="vertical"
                minSize={100}
                cells={[
                  { content: renderWidgetContent("area-2"), position: "area-2", initialSize: rightSizes[0] },
                  { content: renderWidgetContent("area-4"), position: "area-4", initialSize: rightSizes[1] },
                  { content: renderWidgetContent("area-6"), position: "area-6", initialSize: rightSizes[2] },
                ]}
                templateId={undefined}
                layout={undefined}
                onSizeChange={(newSizes) => {
                  const newGridSizes = {
                    ...gridSizesRef.current,
                    rightTop: newSizes[0],
                    rightMiddle: newSizes[1],
                    rightBottom: newSizes[2]
                  };
                  gridSizesRef.current = newGridSizes;
                  setGridSizes(newGridSizes);
                }}
                onSaveRequired={createNestedLayoutSaveHandler(
                  layout,
                  [
                    parseFloat(gridSizesRef.current?.left || "50"),
                    parseFloat(gridSizesRef.current?.leftTop || "33.33"),
                    parseFloat(gridSizesRef.current?.leftMiddle || "33.33"),
                    parseFloat(gridSizesRef.current?.leftBottom || "33.34"),
                    parseFloat(gridSizesRef.current?.rightTop || "33.33"),
                    parseFloat(gridSizesRef.current?.rightMiddle || "33.33"),
                    parseFloat(gridSizesRef.current?.rightBottom || "33.34")
                  ]
                )}
              />
            </ResizablePair>
          </div>
        );
      }

      case "6-grid-rows": {
        // 6 horizontal rows layout
        const rowSizes = gridSizes ? [
          gridSizes.top || "16.67%",
          gridSizes.topMiddle1 || "16.67%",
          gridSizes.topMiddle2 || "16.67%",
          gridSizes.bottomMiddle1 || "16.67%",
          gridSizes.bottomMiddle2 || "16.67%",
          gridSizes.bottom || "16.65%"
        ] : ["16.67%", "16.67%", "16.67%", "16.67%", "16.67%", "16.65%"];

        return (
          <ResizableGroup
            key={`6-grid-rows-${rowSizes.join('-')}-${hasLoadedFromApi}`}
            direction="vertical"
            minSize={60}
            cells={[
              { content: renderWidgetContent("area-1"), position: "area-1", initialSize: rowSizes[0] },
              { content: renderWidgetContent("area-2"), position: "area-2", initialSize: rowSizes[1] },
              { content: renderWidgetContent("area-3"), position: "area-3", initialSize: rowSizes[2] },
              { content: renderWidgetContent("area-4"), position: "area-4", initialSize: rowSizes[3] },
              { content: renderWidgetContent("area-5"), position: "area-5", initialSize: rowSizes[4] },
              { content: renderWidgetContent("area-6"), position: "area-6", initialSize: rowSizes[5] },
            ]}
            className="flex-1 bg-background overflow-hidden h-full"
            templateId={templateId}
            layout={layout}
          />
        );
      }

      case "6-grid-left-large": {
        // Large left panel + 5 right panels
        const leftWidth = parseFloat(gridSizes?.left || "50");
        const rightTop = parseFloat(gridSizes?.rightTop || "20");
        const rightMiddle = parseFloat(gridSizes?.rightMiddle || "20");
        const rightMiddle2 = parseFloat(gridSizes?.rightMiddle2 || "20");
        const rightBottom = parseFloat(gridSizes?.rightBottom || "20");
        const rightBottom2 = 100 - rightTop - rightMiddle - rightMiddle2 - rightBottom;

        const horizontalSizes: [string, string] = [`${leftWidth}%`, `${100 - leftWidth}%`];
        const rightSizes = [`${rightTop}%`, `${rightMiddle}%`, `${rightMiddle2}%`, `${rightBottom}%`, `${rightBottom2}%`];

        // Save handler that reads current values at call time
        const saveHandler = async () => {
          const percentages = [
            parseFloat(gridSizesRef.current?.left || "50"),
            parseFloat(gridSizesRef.current?.rightTop || "20"),
            parseFloat(gridSizesRef.current?.rightMiddle || "20"),
            parseFloat(gridSizesRef.current?.rightMiddle2 || "20"),
            parseFloat(gridSizesRef.current?.rightBottom || "20")
            // rightBottom2 is calculated (100 - sum of first 4)
          ];
          await createNestedLayoutSaveHandler(layout, percentages)();
        };

        return (
          <div className="flex-1 flex bg-background overflow-hidden h-full" data-layout-container="6-grid-left-large">
            <ResizablePair
              direction="horizontal"
              initialSizes={horizontalSizes}
              minSize={150}
              position1="area-1"
              position2="right-container"
              templateId={undefined}
              layout={undefined}
              onSizeChange={(newSizes) => {
                // IMPORTANT: Only update ref during drag, save on mouseup to prevent inner ResizableGroup reset
                const newGridSizes = {
                  ...gridSizesRef.current,
                  left: newSizes[0],
                  right: newSizes[1]
                };
                gridSizesRef.current = newGridSizes;
                // Don't call setGridSizes here - let it update on mouseup via onSaveRequired
              }}
              onSaveRequired={saveHandler}
            >
              {renderWidgetContent("area-1")}
              <ResizableGroup
                direction="vertical"
                minSize={100}
                cells={[
                  { content: renderWidgetContent("area-2"), position: "area-2", initialSize: rightSizes[0] },
                  { content: renderWidgetContent("area-3"), position: "area-3", initialSize: rightSizes[1] },
                  { content: renderWidgetContent("area-4"), position: "area-4", initialSize: rightSizes[2] },
                  { content: renderWidgetContent("area-5"), position: "area-5", initialSize: rightSizes[3] },
                  { content: renderWidgetContent("area-6"), position: "area-6", initialSize: rightSizes[4] },
                ]}
                templateId={undefined}
                layout={undefined}
                onSizeChange={(newSizes) => {
                  const newGridSizes = {
                    ...gridSizesRef.current,
                    rightTop: newSizes[0],
                    rightMiddle: newSizes[1],
                    rightMiddle2: newSizes[2],
                    rightBottom: newSizes[3]
                    // rightBottom2 is calculated (100 - sum of first 4)
                  };
                  gridSizesRef.current = newGridSizes;
                  setGridSizes(newGridSizes);
                }}
                onSaveRequired={saveHandler}
              />
            </ResizablePair>
          </div>
        );
      }

      case "7-grid-complex1":
      case "7-grid-left": {
        // 7-cell layout: 4 left cells (vertical) + 3 right cells (vertical)
        const leftWidth = parseFloat(gridSizes?.left || "50");
        const leftCellHeight = 25; // 4 cells = 25% each
        const rightCellHeight = 33.33; // 3 cells = 33.33% each

        return (
          <div className="flex-1 flex bg-background overflow-hidden h-full" data-layout-container="7-grid-complex1">
            <ResizablePair
              direction="horizontal"
              initialSizes={[`${leftWidth}%`, `${100 - leftWidth}%`]}
              minSize={150}
              position1="left-container"
              position2="right-container"
              templateId={templateId}
              layout={layout}
            >
              <ResizableGroup
                direction="vertical"
                minSize={60}
                cells={[
                  { content: renderWidgetContent("area-1"), position: "area-1", initialSize: `${leftCellHeight}%` },
                  { content: renderWidgetContent("area-2"), position: "area-2", initialSize: `${leftCellHeight}%` },
                  { content: renderWidgetContent("area-3"), position: "area-3", initialSize: `${leftCellHeight}%` },
                  { content: renderWidgetContent("area-4"), position: "area-4", initialSize: `${leftCellHeight}%` },
                ]}
                templateId={templateId}
                layout={layout}
              />
              <ResizableGroup
                direction="vertical"
                minSize={60}
                cells={[
                  { content: renderWidgetContent("area-5"), position: "area-5", initialSize: `${rightCellHeight}%` },
                  { content: renderWidgetContent("area-6"), position: "area-6", initialSize: `${rightCellHeight}%` },
                  { content: renderWidgetContent("area-7"), position: "area-7", initialSize: `${rightCellHeight}%` },
                ]}
                templateId={templateId}
                layout={layout}
              />
            </ResizablePair>
          </div>
        );
      }

      case "7-grid-complex2":
      case "7-grid-large": {
        // 7-cell layout: 1 left cell + 6 right cells (vertical)
        const leftWidth = parseFloat(gridSizes?.left || "50");
        // Extract right cell heights from gridSizes, with defaults
        const rightCellHeights = [
          parseFloat(gridSizes?.rightCell1 || "16.67"),
          parseFloat(gridSizes?.rightCell2 || "16.67"),
          parseFloat(gridSizes?.rightCell3 || "16.67"),
          parseFloat(gridSizes?.rightCell4 || "16.67"),
          parseFloat(gridSizes?.rightCell5 || "16.67"),
          parseFloat(gridSizes?.rightCell6 || "16.67")
        ];

        // Create custom save handler that combines left width and right cell heights
        const saveHandler = createNestedLayoutSaveHandler(
          layout,
          [
            leftWidth,
            ...rightCellHeights
          ]
        );

        return (
          <div className="flex-1 flex bg-background overflow-hidden h-full" data-layout-container="7-grid-large">
            <ResizablePair
              direction="horizontal"
              initialSizes={[`${leftWidth}%`, `${100 - leftWidth}%`]}
              minSize={150}
              position1="area-1"
              position2="right-container"
              templateId={undefined} // Disable default save, use custom handler
              layout={undefined}
              onSaveRequired={async () => {
                // Get latest left width from ResizablePair
                // Get latest right cell heights from ResizableGroup (stored in gridSizes)
                await saveHandler();
              }}
              onSizeChange={(newSizes) => {
                // Update left width when ResizablePair is resized
                const newLeftWidth = parseFloat(newSizes[0]);
                const newGridSizes = {
                  ...gridSizesRef.current,
                  left: `${newLeftWidth}%`
                };
                gridSizesRef.current = newGridSizes;
                setGridSizes(newGridSizes);
              }}
            >
              {renderWidgetContent("area-1")}
              <ResizableGroup
                direction="vertical"
                minSize={50}
                cells={[
                  { content: renderWidgetContent("area-2"), position: "area-2", initialSize: `${rightCellHeights[0]}%` },
                  { content: renderWidgetContent("area-3"), position: "area-3", initialSize: `${rightCellHeights[1]}%` },
                  { content: renderWidgetContent("area-4"), position: "area-4", initialSize: `${rightCellHeights[2]}%` },
                  { content: renderWidgetContent("area-5"), position: "area-5", initialSize: `${rightCellHeights[3]}%` },
                  { content: renderWidgetContent("area-6"), position: "area-6", initialSize: `${rightCellHeights[4]}%` },
                  { content: renderWidgetContent("area-7"), position: "area-7", initialSize: `${rightCellHeights[5]}%` },
                ]}
                templateId={undefined} // Disable default save, use custom handler
                layout={undefined}
                onSizeChange={(newSizes) => {
                  // Update right cell heights when ResizableGroup is resized
                  const newHeights = newSizes.map(s => parseFloat(s));
                  const newGridSizes = {
                    ...gridSizesRef.current,
                    rightCell1: `${newHeights[0]}%`,
                    rightCell2: `${newHeights[1]}%`,
                    rightCell3: `${newHeights[2]}%`,
                    rightCell4: `${newHeights[3]}%`,
                    rightCell5: `${newHeights[4]}%`,
                    rightCell6: `${newHeights[5]}%`
                  };
                  gridSizesRef.current = newGridSizes;
                  setGridSizes(newGridSizes);
                  // Store the latest heights in a ref for the save handler
                  rightCellHeightsRef.current = newHeights;
                }}
                onSaveRequired={async () => {
                  // Use the heights from the ref (set by onSizeChange) or fallback to current state
                  const latestRightHeights = rightCellHeightsRef.current.length === 6
                    ? rightCellHeightsRef.current
                    : [
                      parseFloat(gridSizesRef.current?.rightCell1 || "16.67"),
                      parseFloat(gridSizesRef.current?.rightCell2 || "16.67"),
                      parseFloat(gridSizesRef.current?.rightCell3 || "16.67"),
                      parseFloat(gridSizesRef.current?.rightCell4 || "16.67"),
                      parseFloat(gridSizesRef.current?.rightCell5 || "16.67"),
                      parseFloat(gridSizesRef.current?.rightCell6 || "16.67")
                    ];
                  // Get latest left width
                  const currentLeftWidth = parseFloat(gridSizesRef.current?.left || "50");
                  // Save combined data
                  await createNestedLayoutSaveHandler(layout, [currentLeftWidth, ...latestRightHeights])();
                }}
              />
            </ResizablePair>
          </div>
        );
      }

      case "8-grid-2x4": {
        // 8-cell 2x4 grid: 2 columns, 4 rows
        const leftWidth = parseFloat(gridSizes?.left || "50");
        const leftTop = parseFloat(gridSizes?.top || "25");
        const leftTopMiddle = parseFloat(gridSizes?.topMiddle1 || "25");
        const leftBottomMiddle = parseFloat(gridSizes?.bottomMiddle1 || "25");
        const leftBottom = parseFloat(gridSizes?.bottom || "25");
        const rightTop = parseFloat(gridSizes?.rightTop || "25");
        const rightTopMiddle = parseFloat(gridSizes?.rightTopMiddle || "25");
        const rightBottomMiddle = parseFloat(gridSizes?.rightBottomMiddle || "25");
        const rightBottom = parseFloat(gridSizes?.rightBottom || "25");

        const horizontalSizes: [string, string] = [`${leftWidth}%`, `${100 - leftWidth}%`];
        const leftSizes = [`${leftTop}%`, `${leftTopMiddle}%`, `${leftBottomMiddle}%`, `${leftBottom}%`];
        const rightSizes = [`${rightTop}%`, `${rightTopMiddle}%`, `${rightBottomMiddle}%`, `${rightBottom}%`];

        // Save handler that reads current values at call time (not at creation time)
        const saveHandler = async () => {
          const percentages = [
            parseFloat(gridSizesRef.current?.left || "50"),
            parseFloat(gridSizesRef.current?.top || "25"),
            parseFloat(gridSizesRef.current?.topMiddle1 || "25"),
            parseFloat(gridSizesRef.current?.bottomMiddle1 || "25"),
            parseFloat(gridSizesRef.current?.bottom || "25"),
            parseFloat(gridSizesRef.current?.rightTop || "25"),
            parseFloat(gridSizesRef.current?.rightTopMiddle || "25"),
            parseFloat(gridSizesRef.current?.rightBottomMiddle || "25"),
            parseFloat(gridSizesRef.current?.rightBottom || "25")
          ];
          await createNestedLayoutSaveHandler(layout, percentages)();
        };

        return (
          <div className="flex-1 flex bg-background overflow-hidden h-full" data-layout-container="8-grid-2x4">
            <ResizablePair
              direction="horizontal"
              initialSizes={horizontalSizes}
              minSize={150}
              position1="left-container"
              position2="right-container"
              templateId={undefined}
              layout={undefined}
              onSizeChange={(newSizes) => {
                const newGridSizes = {
                  ...gridSizesRef.current,
                  left: newSizes[0],
                  right: newSizes[1]
                };
                gridSizesRef.current = newGridSizes;
                setGridSizes(newGridSizes);
              }}
              onSaveRequired={saveHandler}
            >
              <ResizableGroup
                direction="vertical"
                minSize={60}
                cells={[
                  { content: renderWidgetContent("area-1"), position: "area-1", initialSize: leftSizes[0] },
                  { content: renderWidgetContent("area-3"), position: "area-3", initialSize: leftSizes[1] },
                  { content: renderWidgetContent("area-5"), position: "area-5", initialSize: leftSizes[2] },
                  { content: renderWidgetContent("area-7"), position: "area-7", initialSize: leftSizes[3] },
                ]}
                templateId={undefined}
                layout={undefined}
                onSizeChange={(newSizes) => {
                  const newGridSizes = {
                    ...gridSizesRef.current,
                    top: newSizes[0],
                    topMiddle1: newSizes[1],
                    bottomMiddle1: newSizes[2],
                    bottom: newSizes[3]
                  };
                  gridSizesRef.current = newGridSizes;
                  setGridSizes(newGridSizes);
                }}
                onSaveRequired={saveHandler}
              />
              <ResizableGroup
                direction="vertical"
                minSize={60}
                cells={[
                  { content: renderWidgetContent("area-2"), position: "area-2", initialSize: rightSizes[0] },
                  { content: renderWidgetContent("area-4"), position: "area-4", initialSize: rightSizes[1] },
                  { content: renderWidgetContent("area-6"), position: "area-6", initialSize: rightSizes[2] },
                  { content: renderWidgetContent("area-8"), position: "area-8", initialSize: rightSizes[3] },
                ]}
                templateId={undefined}
                layout={undefined}
                onSizeChange={(newSizes) => {
                  const newGridSizes = {
                    ...gridSizesRef.current,
                    rightTop: newSizes[0],
                    rightTopMiddle: newSizes[1],
                    rightBottomMiddle: newSizes[2],
                    rightBottom: newSizes[3]
                  };
                  gridSizesRef.current = newGridSizes;
                  setGridSizes(newGridSizes);
                }}
                onSaveRequired={saveHandler}
              />
            </ResizablePair>
          </div>
        );
      }

      case "8-grid-4x2": {
        // 8-cell 4x2 grid: 4 columns, 2 rows
        const topHeight = parseFloat(gridSizes?.top || "50");
        const topSizes = [
          gridSizes?.topLeft || "25%",
          gridSizes?.topMiddle1 || "25%",
          gridSizes?.topMiddle2 || "25%",
          gridSizes?.topRight || "25%"
        ];
        const bottomSizes = [
          gridSizes?.bottomLeft || "25%",
          gridSizes?.bottomMiddle1 || "25%",
          gridSizes?.bottomMiddle2 || "25%",
          gridSizes?.bottomRight || "25%"
        ];

        const verticalSizes: [string, string] = [`${topHeight}%`, `${100 - topHeight}%`];

        // Save handler that reads current values at call time (not at creation time)
        const saveHandler = async () => {
          const percentages = [
            parseFloat(gridSizesRef.current?.top || "50"),
            parseFloat(gridSizesRef.current?.topLeft || "25"),
            parseFloat(gridSizesRef.current?.topMiddle1 || "25"),
            parseFloat(gridSizesRef.current?.topMiddle2 || "25"),
            parseFloat(gridSizesRef.current?.topRight || "25"),
            parseFloat(gridSizesRef.current?.bottomLeft || "25"),
            parseFloat(gridSizesRef.current?.bottomMiddle1 || "25"),
            parseFloat(gridSizesRef.current?.bottomMiddle2 || "25"),
            parseFloat(gridSizesRef.current?.bottomRight || "25")
          ];
          await createNestedLayoutSaveHandler(layout, percentages)();
        };

        return (
          <div className="flex-1 flex flex-col bg-background overflow-hidden h-full" data-layout-container="8-grid-4x2">
            <ResizablePair
              direction="vertical"
              initialSizes={verticalSizes}
              minSize={150}
              position1="top-container"
              position2="bottom-container"
              templateId={undefined}
              layout={undefined}
              onSizeChange={(newSizes) => {
                const newGridSizes = {
                  ...gridSizesRef.current,
                  top: newSizes[0],
                  bottom: newSizes[1]
                };
                gridSizesRef.current = newGridSizes;
                setGridSizes(newGridSizes);
              }}
              onSaveRequired={saveHandler}
            >
              <ResizableGroup
                direction="horizontal"
                minSize={60}
                cells={[
                  { content: renderWidgetContent("area-1"), position: "area-1", initialSize: topSizes[0] },
                  { content: renderWidgetContent("area-2"), position: "area-2", initialSize: topSizes[1] },
                  { content: renderWidgetContent("area-3"), position: "area-3", initialSize: topSizes[2] },
                  { content: renderWidgetContent("area-4"), position: "area-4", initialSize: topSizes[3] },
                ]}
                templateId={undefined}
                layout={undefined}
                onSizeChange={(newSizes) => {
                  const newGridSizes = {
                    ...gridSizesRef.current,
                    topLeft: newSizes[0],
                    topMiddle1: newSizes[1],
                    topMiddle2: newSizes[2],
                    topRight: newSizes[3]
                  };
                  gridSizesRef.current = newGridSizes;
                  setGridSizes(newGridSizes);
                }}
                onSaveRequired={saveHandler}
              />
              <ResizableGroup
                direction="horizontal"
                minSize={60}
                cells={[
                  { content: renderWidgetContent("area-5"), position: "area-5", initialSize: bottomSizes[0] },
                  { content: renderWidgetContent("area-6"), position: "area-6", initialSize: bottomSizes[1] },
                  { content: renderWidgetContent("area-7"), position: "area-7", initialSize: bottomSizes[2] },
                  { content: renderWidgetContent("area-8"), position: "area-8", initialSize: bottomSizes[3] },
                ]}
                templateId={undefined}
                layout={undefined}
                onSizeChange={(newSizes) => {
                  const newGridSizes = {
                    ...gridSizesRef.current,
                    bottomLeft: newSizes[0],
                    bottomMiddle1: newSizes[1],
                    bottomMiddle2: newSizes[2],
                    bottomRight: newSizes[3]
                  };
                  gridSizesRef.current = newGridSizes;
                  setGridSizes(newGridSizes);
                }}
                onSaveRequired={saveHandler}
              />
            </ResizablePair>
          </div>
        );
      }

      case "8-grid-columns": {
        // 8 vertical columns layout
        const columnSizes = gridSizes ? [
          gridSizes.left || "12.5%",
          gridSizes.leftMiddle1 || "12.5%",
          gridSizes.leftMiddle2 || "12.5%",
          gridSizes.leftMiddle3 || "12.5%",
          gridSizes.rightMiddle3 || "12.5%",
          gridSizes.rightMiddle2 || "12.5%",
          gridSizes.rightMiddle1 || "12.5%",
          gridSizes.right || "12.5%"
        ] : ["12.5%", "12.5%", "12.5%", "12.5%", "12.5%", "12.5%", "12.5%", "12.5%"];

        // Save handler that reads current values at call time (not at creation time)
        const saveHandler = async () => {
          const percentages = [
            parseFloat(gridSizesRef.current?.left || "12.5"),
            parseFloat(gridSizesRef.current?.leftMiddle1 || "12.5"),
            parseFloat(gridSizesRef.current?.leftMiddle2 || "12.5"),
            parseFloat(gridSizesRef.current?.leftMiddle3 || "12.5"),
            parseFloat(gridSizesRef.current?.rightMiddle3 || "12.5"),
            parseFloat(gridSizesRef.current?.rightMiddle2 || "12.5"),
            parseFloat(gridSizesRef.current?.rightMiddle1 || "12.5"),
            parseFloat(gridSizesRef.current?.right || "12.5")
          ];
          await createNestedLayoutSaveHandler(layout, percentages)();
        };

        return (
          <ResizableGroup
            key={`8-grid-columns-${columnSizes.join('-')}-${hasLoadedFromApi}`}
            direction="horizontal"
            minSize={50}
            cells={[
              { content: renderWidgetContent("area-1"), position: "area-1", initialSize: columnSizes[0] },
              { content: renderWidgetContent("area-2"), position: "area-2", initialSize: columnSizes[1] },
              { content: renderWidgetContent("area-3"), position: "area-3", initialSize: columnSizes[2] },
              { content: renderWidgetContent("area-4"), position: "area-4", initialSize: columnSizes[3] },
              { content: renderWidgetContent("area-5"), position: "area-5", initialSize: columnSizes[4] },
              { content: renderWidgetContent("area-6"), position: "area-6", initialSize: columnSizes[5] },
              { content: renderWidgetContent("area-7"), position: "area-7", initialSize: columnSizes[6] },
              { content: renderWidgetContent("area-8"), position: "area-8", initialSize: columnSizes[7] },
            ]}
            className="flex-1 bg-background overflow-hidden h-full"
            templateId={undefined}
            layout={undefined}
            onSizeChange={(newSizes) => {
              const newGridSizes = {
                ...gridSizesRef.current,
                left: newSizes[0],
                leftMiddle1: newSizes[1],
                leftMiddle2: newSizes[2],
                leftMiddle3: newSizes[3],
                rightMiddle3: newSizes[4],
                rightMiddle2: newSizes[5],
                rightMiddle1: newSizes[6],
                right: newSizes[7]
              };
              gridSizesRef.current = newGridSizes;
              setGridSizes(newGridSizes);
            }}
            onSaveRequired={saveHandler}
          />
        );
      }

      case "8-grid-rows": {
        // 8 horizontal rows layout
        const rowSizes = gridSizes ? [
          gridSizes.top || "12.5%",
          gridSizes.topMiddle1 || "12.5%",
          gridSizes.topMiddle2 || "12.5%",
          gridSizes.topMiddle3 || "12.5%",
          gridSizes.bottomMiddle3 || "12.5%",
          gridSizes.bottomMiddle2 || "12.5%",
          gridSizes.bottomMiddle1 || "12.5%",
          gridSizes.bottom || "12.5%"
        ] : ["12.5%", "12.5%", "12.5%", "12.5%", "12.5%", "12.5%", "12.5%", "12.5%"];

        // Save handler that reads current values at call time (not at creation time)
        const saveHandler = async () => {
          const percentages = [
            parseFloat(gridSizesRef.current?.top || "12.5"),
            parseFloat(gridSizesRef.current?.topMiddle1 || "12.5"),
            parseFloat(gridSizesRef.current?.topMiddle2 || "12.5"),
            parseFloat(gridSizesRef.current?.topMiddle3 || "12.5"),
            parseFloat(gridSizesRef.current?.bottomMiddle3 || "12.5"),
            parseFloat(gridSizesRef.current?.bottomMiddle2 || "12.5"),
            parseFloat(gridSizesRef.current?.bottomMiddle1 || "12.5"),
            parseFloat(gridSizesRef.current?.bottom || "12.5")
          ];
          await createNestedLayoutSaveHandler(layout, percentages)();
        };

        return (
          <ResizableGroup
            key={`8-grid-rows-${rowSizes.join('-')}-${hasLoadedFromApi}`}
            direction="vertical"
            minSize={50}
            cells={[
              { content: renderWidgetContent("area-1"), position: "area-1", initialSize: rowSizes[0] },
              { content: renderWidgetContent("area-2"), position: "area-2", initialSize: rowSizes[1] },
              { content: renderWidgetContent("area-3"), position: "area-3", initialSize: rowSizes[2] },
              { content: renderWidgetContent("area-4"), position: "area-4", initialSize: rowSizes[3] },
              { content: renderWidgetContent("area-5"), position: "area-5", initialSize: rowSizes[4] },
              { content: renderWidgetContent("area-6"), position: "area-6", initialSize: rowSizes[5] },
              { content: renderWidgetContent("area-7"), position: "area-7", initialSize: rowSizes[6] },
              { content: renderWidgetContent("area-8"), position: "area-8", initialSize: rowSizes[7] },
            ]}
            className="flex-1 bg-background overflow-hidden h-full"
            templateId={undefined}
            layout={undefined}
            onSizeChange={(newSizes) => {
              const newGridSizes = {
                ...gridSizesRef.current,
                top: newSizes[0],
                topMiddle1: newSizes[1],
                topMiddle2: newSizes[2],
                topMiddle3: newSizes[3],
                bottomMiddle3: newSizes[4],
                bottomMiddle2: newSizes[5],
                bottomMiddle1: newSizes[6],
                bottom: newSizes[7]
              };
              gridSizesRef.current = newGridSizes;
              setGridSizes(newGridSizes);
            }}
            onSaveRequired={saveHandler}
          />
        );
      }

      case "9-grid": {
        // 9-cell 3x3 grid
        const topHeight = parseFloat(gridSizes?.top || "33.33");
        const middleHeight = parseFloat(gridSizes?.middle || "33.33");
        const bottomHeight = parseFloat(gridSizes?.bottom || "33.34");

        const topSizes = [
          gridSizes?.topLeft || "33.33%",
          gridSizes?.topMiddle || "33.33%",
          gridSizes?.topRight || "33.34%"
        ];
        const middleSizes = [
          gridSizes?.middleLeft || "33.33%",
          gridSizes?.middleCenter || "33.33%",
          gridSizes?.middleRight || "33.34%"
        ];
        const bottomSizes = [
          gridSizes?.bottomLeft || "33.33%",
          gridSizes?.bottomMiddle || "33.33%",
          gridSizes?.bottomRight || "33.34%"
        ];

        // Save handler that reads current values at call time (not at creation time)
        const create9GridSaveHandler = async () => {
          const percentages = [
            parseFloat(gridSizesRef.current?.top || "33.33"),
            parseFloat(gridSizesRef.current?.topLeft || "33.33"),
            parseFloat(gridSizesRef.current?.topMiddle || "33.33"),
            parseFloat(gridSizesRef.current?.topRight || "33.34"),
            parseFloat(gridSizesRef.current?.middle || "33.33"),
            parseFloat(gridSizesRef.current?.middleLeft || "33.33"),
            parseFloat(gridSizesRef.current?.middleCenter || "33.33"),
            parseFloat(gridSizesRef.current?.middleRight || "33.34"),
            parseFloat(gridSizesRef.current?.bottomLeft || "33.33"),
            parseFloat(gridSizesRef.current?.bottomMiddle || "33.33"),
            parseFloat(gridSizesRef.current?.bottomRight || "33.34")
          ];
          await createNestedLayoutSaveHandler(layout, percentages)();
        };

        return (
          <ResizableGroup
            key={`9-grid-${hasLoadedFromApi}`}
            direction="vertical"
            minSize={100}
            cells={[
              {
                content: (
                  <ResizableGroup
                    direction="horizontal"
                    minSize={100}
                    cells={[
                      { content: renderWidgetContent("area-1"), position: "area-1", initialSize: topSizes[0] },
                      { content: renderWidgetContent("area-2"), position: "area-2", initialSize: topSizes[1] },
                      { content: renderWidgetContent("area-3"), position: "area-3", initialSize: topSizes[2] },
                    ]}
                    templateId={undefined}
                    layout={undefined}
                    onSizeChange={(newSizes) => {
                      const newGridSizes = {
                        ...gridSizesRef.current,
                        topLeft: newSizes[0],
                        topMiddle: newSizes[1],
                        topRight: newSizes[2]
                      };
                      gridSizesRef.current = newGridSizes;
                      setGridSizes(newGridSizes);
                    }}
                    onSaveRequired={create9GridSaveHandler}
                  />
                ),
                position: "top-row",
                initialSize: `${topHeight}%`
              },
              {
                content: (
                  <ResizableGroup
                    direction="horizontal"
                    minSize={100}
                    cells={[
                      { content: renderWidgetContent("area-4"), position: "area-4", initialSize: middleSizes[0] },
                      { content: renderWidgetContent("area-5"), position: "area-5", initialSize: middleSizes[1] },
                      { content: renderWidgetContent("area-6"), position: "area-6", initialSize: middleSizes[2] },
                    ]}
                    templateId={undefined}
                    layout={undefined}
                    onSizeChange={(newSizes) => {
                      const newGridSizes = {
                        ...gridSizesRef.current,
                        middleLeft: newSizes[0],
                        middleCenter: newSizes[1],
                        middleRight: newSizes[2]
                      };
                      gridSizesRef.current = newGridSizes;
                      setGridSizes(newGridSizes);
                    }}
                    onSaveRequired={create9GridSaveHandler}
                  />
                ),
                position: "middle-row",
                initialSize: `${middleHeight}%`
              },
              {
                content: (
                  <ResizableGroup
                    direction="horizontal"
                    minSize={100}
                    cells={[
                      { content: renderWidgetContent("area-7"), position: "area-7", initialSize: bottomSizes[0] },
                      { content: renderWidgetContent("area-8"), position: "area-8", initialSize: bottomSizes[1] },
                      { content: renderWidgetContent("area-9"), position: "area-9", initialSize: bottomSizes[2] },
                    ]}
                    templateId={undefined}
                    layout={undefined}
                    onSizeChange={(newSizes) => {
                      const newGridSizes = {
                        ...gridSizesRef.current,
                        bottomLeft: newSizes[0],
                        bottomMiddle: newSizes[1],
                        bottomRight: newSizes[2]
                      };
                      gridSizesRef.current = newGridSizes;
                      setGridSizes(newGridSizes);
                    }}
                    onSaveRequired={create9GridSaveHandler}
                  />
                ),
                position: "bottom-row",
                initialSize: `${bottomHeight}%`
              },
            ]}
            className="flex-1 bg-background overflow-hidden h-full"
            templateId={undefined}
            layout={undefined}
            onSizeChange={(newSizes) => {
              const newGridSizes = {
                ...gridSizesRef.current,
                top: newSizes[0],
                middle: newSizes[1],
                bottom: newSizes[2]
              };
              gridSizesRef.current = newGridSizes;
              setGridSizes(newGridSizes);
            }}
            onSaveRequired={create9GridSaveHandler}
          />
        );
      }

      case "12-grid-3x4": {
        // 12-cell 3x4 grid: 4 columns × 3 rows
        // Use the same property names as convertPercentagesToGridSizes
        const topHeight = parseFloat(gridSizes?.top || "33.33");
        const middleHeight = parseFloat(gridSizes?.middle || "33.33");
        const bottomHeight = 100 - topHeight - middleHeight;

        const row1Cols = [
          gridSizes?.topLeft || "25%",
          gridSizes?.topMiddle1 || "25%",
          gridSizes?.topMiddle2 || "25%",
          gridSizes?.topRight || "25%",
        ];
        const row2Cols = [
          gridSizes?.middleLeft || "25%",
          gridSizes?.middleCenter1 || "25%",
          gridSizes?.middleCenter2 || "25%",
          gridSizes?.middleRight || "25%",
        ];
        const row3Cols = [
          gridSizes?.bottomLeft || "25%",
          gridSizes?.bottomMiddle1 || "25%",
          gridSizes?.bottomMiddle2 || "25%",
          gridSizes?.bottomRight || "25%",
        ];

        // Save handler that reads current values at call time
        const saveHandler = async () => {
          const percentages = [
            parseFloat(gridSizesRef.current?.top || "33.33"),
            parseFloat(gridSizesRef.current?.topLeft || "25"),
            parseFloat(gridSizesRef.current?.topMiddle1 || "25"),
            parseFloat(gridSizesRef.current?.topMiddle2 || "25"),
            parseFloat(gridSizesRef.current?.topRight || "25"),
            parseFloat(gridSizesRef.current?.middle || "33.33"),
            parseFloat(gridSizesRef.current?.middleLeft || "25"),
            parseFloat(gridSizesRef.current?.middleCenter1 || "25"),
            parseFloat(gridSizesRef.current?.middleCenter2 || "25"),
            parseFloat(gridSizesRef.current?.middleRight || "25"),
            parseFloat(gridSizesRef.current?.bottomLeft || "25"),
            parseFloat(gridSizesRef.current?.bottomMiddle1 || "25"),
            parseFloat(gridSizesRef.current?.bottomMiddle2 || "25"),
            parseFloat(gridSizesRef.current?.bottomRight || "25"),
          ];
          await createNestedLayoutSaveHandler(layout, percentages)();
        };

        return (
          <ResizableGroup
            key={`12-grid-3x4-${hasLoadedFromApi}`}
            direction="vertical"
            minSize={80}
            cells={[
              {
                content: (
                  <ResizableGroup
                    direction="horizontal"
                    minSize={80}
                    cells={[
                      { content: renderWidgetContent("area-1"), position: "area-1", initialSize: row1Cols[0] },
                      { content: renderWidgetContent("area-2"), position: "area-2", initialSize: row1Cols[1] },
                      { content: renderWidgetContent("area-3"), position: "area-3", initialSize: row1Cols[2] },
                      { content: renderWidgetContent("area-4"), position: "area-4", initialSize: row1Cols[3] },
                    ]}
                    templateId={undefined}
                    layout={undefined}
                    onSizeChange={(newSizes) => {
                      const newGridSizes = {
                        ...gridSizesRef.current,
                        topLeft: newSizes[0],
                        topMiddle1: newSizes[1],
                        topMiddle2: newSizes[2],
                        topRight: newSizes[3]
                      };
                      gridSizesRef.current = newGridSizes;
                      setGridSizes(newGridSizes);
                    }}
                    onSaveRequired={saveHandler}
                  />
                ),
                position: "row-1",
                initialSize: `${topHeight}%`
              },
              {
                content: (
                  <ResizableGroup
                    direction="horizontal"
                    minSize={80}
                    cells={[
                      { content: renderWidgetContent("area-5"), position: "area-5", initialSize: row2Cols[0] },
                      { content: renderWidgetContent("area-6"), position: "area-6", initialSize: row2Cols[1] },
                      { content: renderWidgetContent("area-7"), position: "area-7", initialSize: row2Cols[2] },
                      { content: renderWidgetContent("area-8"), position: "area-8", initialSize: row2Cols[3] },
                    ]}
                    templateId={undefined}
                    layout={undefined}
                    onSizeChange={(newSizes) => {
                      const newGridSizes = {
                        ...gridSizesRef.current,
                        middleLeft: newSizes[0],
                        middleCenter1: newSizes[1],
                        middleCenter2: newSizes[2],
                        middleRight: newSizes[3]
                      };
                      gridSizesRef.current = newGridSizes;
                      setGridSizes(newGridSizes);
                    }}
                    onSaveRequired={saveHandler}
                  />
                ),
                position: "row-2",
                initialSize: `${middleHeight}%`
              },
              {
                content: (
                  <ResizableGroup
                    direction="horizontal"
                    minSize={80}
                    cells={[
                      { content: renderWidgetContent("area-9"), position: "area-9", initialSize: row3Cols[0] },
                      { content: renderWidgetContent("area-10"), position: "area-10", initialSize: row3Cols[1] },
                      { content: renderWidgetContent("area-11"), position: "area-11", initialSize: row3Cols[2] },
                      { content: renderWidgetContent("area-12"), position: "area-12", initialSize: row3Cols[3] },
                    ]}
                    templateId={undefined}
                    layout={undefined}
                    onSizeChange={(newSizes) => {
                      const newGridSizes = {
                        ...gridSizesRef.current,
                        bottomLeft: newSizes[0],
                        bottomMiddle1: newSizes[1],
                        bottomMiddle2: newSizes[2],
                        bottomRight: newSizes[3]
                      };
                      gridSizesRef.current = newGridSizes;
                      setGridSizes(newGridSizes);
                    }}
                    onSaveRequired={saveHandler}
                  />
                ),
                position: "row-3",
                initialSize: `${bottomHeight}%`
              },
            ]}
            className="flex-1 bg-background overflow-hidden h-full"
            templateId={undefined}
            layout={undefined}
            onSizeChange={(newSizes) => {
              const newGridSizes = {
                ...gridSizesRef.current,
                top: newSizes[0],
                middle: newSizes[1]
              };
              gridSizesRef.current = newGridSizes;
              setGridSizes(newGridSizes);
            }}
            onSaveRequired={saveHandler}
          />
        );
      }

      case "12-grid-4x3": {
        // 12-cell 4x3 grid: 3 resizable columns × 4 resizable rows (per column)
        const leftWidth = parseFloat(gridSizes?.left || "33.33");
        const leftMiddleWidth = parseFloat(gridSizes?.leftMiddle || "33.33");
        const rightWidth = 100 - leftWidth - leftMiddleWidth;

        // Left column row heights
        const leftRow1 = parseFloat(gridSizes?.leftRow1 || "25");
        const leftRow2 = parseFloat(gridSizes?.leftRow2 || "25");
        const leftRow3 = parseFloat(gridSizes?.leftRow3 || "25");
        const leftRow4 = 100 - leftRow1 - leftRow2 - leftRow3;

        // Middle column row heights
        const middleRow1 = parseFloat(gridSizes?.middleRow1 || "25");
        const middleRow2 = parseFloat(gridSizes?.middleRow2 || "25");
        const middleRow3 = parseFloat(gridSizes?.middleRow3 || "25");
        const middleRow4 = 100 - middleRow1 - middleRow2 - middleRow3;

        // Right column row heights
        const rightRow1 = parseFloat(gridSizes?.rightRow1 || "25");
        const rightRow2 = parseFloat(gridSizes?.rightRow2 || "25");
        const rightRow3 = parseFloat(gridSizes?.rightRow3 || "25");
        const rightRow4 = 100 - rightRow1 - rightRow2 - rightRow3;

        // Save handler that reads current values at call time
        const saveHandler = async () => {
          const percentages = [
            // Column widths (3)
            parseFloat(gridSizesRef.current?.left || "33.33"),
            parseFloat(gridSizesRef.current?.leftMiddle || "33.33"),
            parseFloat(gridSizesRef.current?.right || "33.34"),
            // Left column row heights (4)
            parseFloat(gridSizesRef.current?.leftRow1 || "25"),
            parseFloat(gridSizesRef.current?.leftRow2 || "25"),
            parseFloat(gridSizesRef.current?.leftRow3 || "25"),
            parseFloat(gridSizesRef.current?.leftRow4 || "25"),
            // Middle column row heights (4)
            parseFloat(gridSizesRef.current?.middleRow1 || "25"),
            parseFloat(gridSizesRef.current?.middleRow2 || "25"),
            parseFloat(gridSizesRef.current?.middleRow3 || "25"),
            parseFloat(gridSizesRef.current?.middleRow4 || "25"),
            // Right column row heights (4)
            parseFloat(gridSizesRef.current?.rightRow1 || "25"),
            parseFloat(gridSizesRef.current?.rightRow2 || "25"),
            parseFloat(gridSizesRef.current?.rightRow3 || "25"),
            parseFloat(gridSizesRef.current?.rightRow4 || "25"),
          ];
          await createNestedLayoutSaveHandler(layout, percentages)();
        };

        return (
          <ResizableGroup
            key={`12-grid-4x3-${hasLoadedFromApi}`}
            direction="horizontal"
            minSize={100}
            cells={[
              {
                // Left column (4 cells stacked vertically with resizable heights)
                content: (
                  <ResizableGroup
                    direction="vertical"
                    minSize={80}
                    cells={[
                      { content: renderWidgetContent("area-1"), position: "area-1", initialSize: `${leftRow1}%` },
                      { content: renderWidgetContent("area-4"), position: "area-4", initialSize: `${leftRow2}%` },
                      { content: renderWidgetContent("area-7"), position: "area-7", initialSize: `${leftRow3}%` },
                      { content: renderWidgetContent("area-10"), position: "area-10", initialSize: `${leftRow4}%` },
                    ]}
                    templateId={undefined}
                    layout={undefined}
                    onSizeChange={(newSizes) => {
                      const newGridSizes = {
                        ...gridSizesRef.current,
                        leftRow1: newSizes[0],
                        leftRow2: newSizes[1],
                        leftRow3: newSizes[2],
                        leftRow4: newSizes[3]
                      };
                      gridSizesRef.current = newGridSizes;
                      setGridSizes(newGridSizes);
                    }}
                    onSaveRequired={saveHandler}
                  />
                ),
                position: "left-col",
                initialSize: `${leftWidth}%`
              },
              {
                // Middle column (4 cells stacked vertically with resizable heights)
                content: (
                  <ResizableGroup
                    direction="vertical"
                    minSize={80}
                    cells={[
                      { content: renderWidgetContent("area-2"), position: "area-2", initialSize: `${middleRow1}%` },
                      { content: renderWidgetContent("area-5"), position: "area-5", initialSize: `${middleRow2}%` },
                      { content: renderWidgetContent("area-8"), position: "area-8", initialSize: `${middleRow3}%` },
                      { content: renderWidgetContent("area-11"), position: "area-11", initialSize: `${middleRow4}%` },
                    ]}
                    templateId={undefined}
                    layout={undefined}
                    onSizeChange={(newSizes) => {
                      const newGridSizes = {
                        ...gridSizesRef.current,
                        middleRow1: newSizes[0],
                        middleRow2: newSizes[1],
                        middleRow3: newSizes[2],
                        middleRow4: newSizes[3]
                      };
                      gridSizesRef.current = newGridSizes;
                      setGridSizes(newGridSizes);
                    }}
                    onSaveRequired={saveHandler}
                  />
                ),
                position: "leftMiddle-col",
                initialSize: `${leftMiddleWidth}%`
              },
              {
                // Right column (4 cells stacked vertically with resizable heights)
                content: (
                  <ResizableGroup
                    direction="vertical"
                    minSize={80}
                    cells={[
                      { content: renderWidgetContent("area-3"), position: "area-3", initialSize: `${rightRow1}%` },
                      { content: renderWidgetContent("area-6"), position: "area-6", initialSize: `${rightRow2}%` },
                      { content: renderWidgetContent("area-9"), position: "area-9", initialSize: `${rightRow3}%` },
                      { content: renderWidgetContent("area-12"), position: "area-12", initialSize: `${rightRow4}%` },
                    ]}
                    templateId={undefined}
                    layout={undefined}
                    onSizeChange={(newSizes) => {
                      const newGridSizes = {
                        ...gridSizesRef.current,
                        rightRow1: newSizes[0],
                        rightRow2: newSizes[1],
                        rightRow3: newSizes[2],
                        rightRow4: newSizes[3]
                      };
                      gridSizesRef.current = newGridSizes;
                      setGridSizes(newGridSizes);
                    }}
                    onSaveRequired={saveHandler}
                  />
                ),
                position: "right-col",
                initialSize: `${rightWidth}%`
              },
            ]}
            className="flex-1 bg-background overflow-hidden h-full"
            templateId={undefined}
            layout={undefined}
            onSizeChange={(newSizes) => {
              const newGridSizes = {
                ...gridSizesRef.current,
                left: newSizes[0],
                leftMiddle: newSizes[1],
                right: newSizes[2]
              };
              gridSizesRef.current = newGridSizes;
              setGridSizes(newGridSizes);
            }}
            onSaveRequired={saveHandler}
          />
        );
      }

      case "16-grid": {
        // 16-cell 4×4 grid
        // Use API property names
        const topHeight = parseFloat(gridSizes?.top || "25");
        const middle1Height = parseFloat(gridSizes?.middle1 || "25");
        const middle2Height = parseFloat(gridSizes?.middle2 || "25");
        const bottomHeight = 100 - topHeight - middle1Height - middle2Height;

        const rowCols = [
          [gridSizes?.topLeft || "25%", gridSizes?.topMiddle1 || "25%", gridSizes?.topMiddle2 || "25%", gridSizes?.topRight || "25%"],
          [gridSizes?.middle1Left || "25%", gridSizes?.middle1Center1 || "25%", gridSizes?.middle1Center2 || "25%", gridSizes?.middle1Right || "25%"],
          [gridSizes?.middle2Left || "25%", gridSizes?.middle2Center1 || "25%", gridSizes?.middle2Center2 || "25%", gridSizes?.middle2Right || "25%"],
          [gridSizes?.bottomLeft || "25%", gridSizes?.bottomCenter1 || "25%", gridSizes?.bottomCenter2 || "25%", gridSizes?.bottomRight || "25%"],
        ];
        const rowHeights = [topHeight, middle1Height, middle2Height, bottomHeight];

        // Save handler that reads current values at call time
        const saveHandler = async () => {
          const percentages = [
            parseFloat(gridSizesRef.current?.top || "25"),
            parseFloat(gridSizesRef.current?.topLeft || "25"),
            parseFloat(gridSizesRef.current?.topMiddle1 || "25"),
            parseFloat(gridSizesRef.current?.topMiddle2 || "25"),
            parseFloat(gridSizesRef.current?.topRight || "25"),
            parseFloat(gridSizesRef.current?.middle1 || "25"),
            parseFloat(gridSizesRef.current?.middle1Left || "25"),
            parseFloat(gridSizesRef.current?.middle1Center1 || "25"),
            parseFloat(gridSizesRef.current?.middle1Center2 || "25"),
            parseFloat(gridSizesRef.current?.middle1Right || "25"),
            parseFloat(gridSizesRef.current?.middle2 || "25"),
            parseFloat(gridSizesRef.current?.middle2Left || "25"),
            parseFloat(gridSizesRef.current?.middle2Center1 || "25"),
            parseFloat(gridSizesRef.current?.middle2Center2 || "25"),
            parseFloat(gridSizesRef.current?.middle2Right || "25"),
            parseFloat(gridSizesRef.current?.bottomLeft || "25"),
            parseFloat(gridSizesRef.current?.bottomCenter1 || "25"),
            parseFloat(gridSizesRef.current?.bottomCenter2 || "25"),
            parseFloat(gridSizesRef.current?.bottomRight || "25"),
          ];
          await createNestedLayoutSaveHandler(layout, percentages)();
        };

        return (
          <ResizableGroup
            key={`16-grid-${hasLoadedFromApi}`}
            direction="vertical"
            minSize={60}
            cells={Array.from({ length: 4 }, (_, rowIndex) => ({
              content: (
                <ResizableGroup
                  direction="horizontal"
                  minSize={60}
                  cells={Array.from({ length: 4 }, (_, colIndex) => {
                    const areaNum = rowIndex * 4 + colIndex + 1;
                    return {
                      content: renderWidgetContent(`area-${areaNum}`),
                      position: `area-${areaNum}`,
                      initialSize: rowCols[rowIndex][colIndex]
                    };
                  })}
                  templateId={undefined}
                  layout={undefined}
                  onSizeChange={(newSizes) => {
                    const colPrefixes = [
                      ['topLeft', 'topMiddle1', 'topMiddle2', 'topRight'],
                      ['middle1Left', 'middle1Center1', 'middle1Center2', 'middle1Right'],
                      ['middle2Left', 'middle2Center1', 'middle2Center2', 'middle2Right'],
                      ['bottomLeft', 'bottomCenter1', 'bottomCenter2', 'bottomRight']
                    ];
                    const newGridSizes = {
                      ...gridSizesRef.current,
                      [colPrefixes[rowIndex][0]]: newSizes[0],
                      [colPrefixes[rowIndex][1]]: newSizes[1],
                      [colPrefixes[rowIndex][2]]: newSizes[2],
                      [colPrefixes[rowIndex][3]]: newSizes[3]
                    };
                    gridSizesRef.current = newGridSizes;
                    setGridSizes(newGridSizes);
                  }}
                  onSaveRequired={saveHandler}
                />
              ),
              position: `row-${rowIndex + 1}`,
              initialSize: `${rowHeights[rowIndex]}%`
            }))}
            className="flex-1 bg-background overflow-hidden h-full"
            templateId={undefined}
            layout={undefined}
            onSizeChange={(newSizes) => {
              const newGridSizes = {
                ...gridSizesRef.current,
                top: newSizes[0],
                middle1: newSizes[1],
                middle2: newSizes[2]
              };
              gridSizesRef.current = newGridSizes;
              setGridSizes(newGridSizes);
            }}
            onSaveRequired={saveHandler}
          />
        );
      }

      case "24-grid-4x6": {
        // 24-cell 4×6 grid (6 rows, 4 columns)
        // NEW FORMAT: row1-row6 for row heights, row1col1-row6col4 for per-row column widths
        // OLD FORMAT: row1-row6 for row heights, col1-col4 for shared column widths (backward compat)
        const numRows = 6;
        const numCols = 4;
        const defaultRowHeight = 16.67;
        const defaultColWidth = 25;

        const rowHeights = Array.from({ length: numRows }, (_, i) =>
          parseFloat(gridSizes?.[`row${i + 1}`] || `${defaultRowHeight}`)
        );

        // Check if using new format (per-row columns) or old format (shared columns)
        const hasPerRowColumns = gridSizes?.[`row1col1`] !== undefined;

        // Get column widths for each row
        const getColWidths = (rowIndex: number) => {
          if (hasPerRowColumns) {
            // NEW FORMAT: per-row column widths
            return Array.from({ length: numCols }, (_, colIndex) =>
              gridSizes?.[`row${rowIndex + 1}col${colIndex + 1}`] || `${defaultColWidth}%`
            );
          } else {
            // OLD FORMAT: shared column widths (backward compatibility)
            return Array.from({ length: numCols }, (_, colIndex) =>
              gridSizes?.[`col${colIndex + 1}`] || `${defaultColWidth}%`
            );
          }
        };

        // Save handler that reads current values at call time
        const saveHandler = async () => {
          const percentages: number[] = [];
          // First, save all row heights
          for (let i = 0; i < numRows; i++) {
            percentages.push(parseFloat(gridSizesRef.current?.[`row${i + 1}`] || `${defaultRowHeight}`));
          }
          // Then, save all per-row column widths (NEW FORMAT)
          for (let row = 0; row < numRows; row++) {
            for (let col = 0; col < numCols; col++) {
              percentages.push(parseFloat(gridSizesRef.current?.[`row${row + 1}col${col + 1}`] || `${defaultColWidth}`));
            }
          }
          await createNestedLayoutSaveHandler(layout, percentages)();
        };

        return (
          <ResizableGroup
            key={`24-grid-4x6-${hasLoadedFromApi}`}
            direction="vertical"
            minSize={50}
            cells={Array.from({ length: numRows }, (_, rowIndex) => ({
              content: (
                <ResizableGroup
                  direction="horizontal"
                  minSize={60}
                  cells={Array.from({ length: numCols }, (_, colIndex) => {
                    const areaNum = rowIndex * numCols + colIndex + 1;
                    const colWidths = getColWidths(rowIndex);
                    return {
                      content: renderWidgetContent(`area-${areaNum}`),
                      position: `area-${areaNum}`,
                      initialSize: colWidths[colIndex]
                    };
                  })}
                  templateId={undefined}
                  layout={undefined}
                  onSizeChange={(newSizes) => {
                    const newGridSizes: any = { ...gridSizesRef.current };
                    // Update per-row column widths
                    for (let i = 0; i < numCols; i++) {
                      newGridSizes[`row${rowIndex + 1}col${i + 1}`] = newSizes[i];
                    }
                    gridSizesRef.current = newGridSizes;
                    setGridSizes(newGridSizes);
                  }}
                  onSaveRequired={saveHandler}
                />
              ),
              position: `row-${rowIndex + 1}`,
              initialSize: `${rowHeights[rowIndex]}%`
            }))}
            className="flex-1 bg-background overflow-hidden h-full"
            templateId={undefined}
            layout={undefined}
            onSizeChange={(newSizes) => {
              const newGridSizes: any = { ...gridSizesRef.current };
              for (let i = 0; i < numRows; i++) {
                newGridSizes[`row${i + 1}`] = newSizes[i];
              }
              gridSizesRef.current = newGridSizes;
              setGridSizes(newGridSizes);
            }}
            onSaveRequired={saveHandler}
          />
        );
      }

      case "24-grid-6x4": {
        // 24-cell 6×4 grid (4 rows, 6 columns)
        // NEW FORMAT: row1-row4 for row heights, row1col1-row4col6 for per-row column widths
        // OLD FORMAT: row1-row4 for row heights, col1-col6 for shared column widths (backward compat)
        const numRows = 4;
        const numCols = 6;
        const defaultRowHeight = 25;
        const defaultColWidth = 16.67;

        const rowHeights = Array.from({ length: numRows }, (_, i) =>
          parseFloat(gridSizes?.[`row${i + 1}`] || `${defaultRowHeight}`)
        );

        // Check if using new format (per-row columns) or old format (shared columns)
        const hasPerRowColumns = gridSizes?.[`row1col1`] !== undefined;

        // Get column widths for each row
        const getColWidths = (rowIndex: number) => {
          if (hasPerRowColumns) {
            // NEW FORMAT: per-row column widths
            return Array.from({ length: numCols }, (_, colIndex) =>
              gridSizes?.[`row${rowIndex + 1}col${colIndex + 1}`] || `${defaultColWidth}%`
            );
          } else {
            // OLD FORMAT: shared column widths (backward compatibility)
            return Array.from({ length: numCols }, (_, colIndex) =>
              gridSizes?.[`col${colIndex + 1}`] || `${defaultColWidth}%`
            );
          }
        };

        // Save handler that reads current values at call time
        const saveHandler = async () => {
          const percentages: number[] = [];
          // First, save all row heights
          for (let i = 0; i < numRows; i++) {
            percentages.push(parseFloat(gridSizesRef.current?.[`row${i + 1}`] || `${defaultRowHeight}`));
          }
          // Then, save all per-row column widths (NEW FORMAT)
          for (let row = 0; row < numRows; row++) {
            for (let col = 0; col < numCols; col++) {
              percentages.push(parseFloat(gridSizesRef.current?.[`row${row + 1}col${col + 1}`] || `${defaultColWidth}`));
            }
          }
          await createNestedLayoutSaveHandler(layout, percentages)();
        };

        return (
          <ResizableGroup
            key={`24-grid-6x4-${hasLoadedFromApi}`}
            direction="vertical"
            minSize={60}
            cells={Array.from({ length: numRows }, (_, rowIndex) => ({
              content: (
                <ResizableGroup
                  direction="horizontal"
                  minSize={50}
                  cells={Array.from({ length: numCols }, (_, colIndex) => {
                    const areaNum = rowIndex * numCols + colIndex + 1;
                    const colWidths = getColWidths(rowIndex);
                    return {
                      content: renderWidgetContent(`area-${areaNum}`),
                      position: `area-${areaNum}`,
                      initialSize: colWidths[colIndex]
                    };
                  })}
                  templateId={undefined}
                  layout={undefined}
                  onSizeChange={(newSizes) => {
                    const newGridSizes: any = { ...gridSizesRef.current };
                    // Update per-row column widths
                    for (let i = 0; i < numCols; i++) {
                      newGridSizes[`row${rowIndex + 1}col${i + 1}`] = newSizes[i];
                    }
                    gridSizesRef.current = newGridSizes;
                    setGridSizes(newGridSizes);
                  }}
                  onSaveRequired={saveHandler}
                />
              ),
              position: `row-${rowIndex + 1}`,
              initialSize: `${rowHeights[rowIndex]}%`
            }))}
            className="flex-1 bg-background overflow-hidden h-full"
            templateId={undefined}
            layout={undefined}
            onSizeChange={(newSizes) => {
              const newGridSizes: any = { ...gridSizesRef.current };
              for (let i = 0; i < numRows; i++) {
                newGridSizes[`row${i + 1}`] = newSizes[i];
              }
              gridSizesRef.current = newGridSizes;
              setGridSizes(newGridSizes);
            }}
            onSaveRequired={saveHandler}
          />
        );
      }

      case "24-grid-3x8": {
        // 24-cell 3×8 grid (8 rows, 3 columns)
        const numRows = 8;
        const numCols = 3;
        const defaultRowHeight = 12.5;
        const defaultColWidth = 33.33;

        const rowHeights = Array.from({ length: numRows }, (_, i) =>
          parseFloat(gridSizes?.[`row${i + 1}`] || `${defaultRowHeight}`)
        );
        const rowCols = Array.from({ length: numRows }, (_, rowIndex) =>
          Array.from({ length: numCols }, (_, colIndex) =>
            gridSizes?.[`row${rowIndex + 1}Col${colIndex + 1}`] || `${defaultColWidth}%`
          )
        );

        // Save handler that reads current values at call time
        const saveHandler = async () => {
          const percentages: number[] = [];
          for (let i = 0; i < numRows; i++) {
            percentages.push(parseFloat(gridSizesRef.current?.[`row${i + 1}`] || `${defaultRowHeight}`));
            for (let j = 0; j < numCols; j++) {
              percentages.push(parseFloat(gridSizesRef.current?.[`row${i + 1}Col${j + 1}`] || `${defaultColWidth}`));
            }
          }
          await createNestedLayoutSaveHandler(layout, percentages)();
        };

        return (
          <ResizableGroup
            key={`24-grid-3x8-${hasLoadedFromApi}`}
            direction="vertical"
            minSize={40}
            cells={Array.from({ length: numRows }, (_, rowIndex) => ({
              content: (
                <ResizableGroup
                  direction="horizontal"
                  minSize={100}
                  cells={Array.from({ length: numCols }, (_, colIndex) => {
                    const areaNum = rowIndex * numCols + colIndex + 1;
                    return {
                      content: renderWidgetContent(`area-${areaNum}`),
                      position: `area-${areaNum}`,
                      initialSize: rowCols[rowIndex][colIndex]
                    };
                  })}
                  templateId={undefined}
                  layout={undefined}
                  onSizeChange={(newSizes) => {
                    const newGridSizes: any = { ...gridSizesRef.current };
                    for (let i = 0; i < numCols; i++) {
                      newGridSizes[`row${rowIndex + 1}Col${i + 1}`] = newSizes[i];
                    }
                    gridSizesRef.current = newGridSizes;
                    setGridSizes(newGridSizes);
                  }}
                  onSaveRequired={saveHandler}
                />
              ),
              position: `row-${rowIndex + 1}`,
              initialSize: `${rowHeights[rowIndex]}%`
            }))}
            className="flex-1 bg-background overflow-hidden h-full"
            templateId={undefined}
            layout={undefined}
            onSizeChange={(newSizes) => {
              const newGridSizes: any = { ...gridSizesRef.current };
              for (let i = 0; i < numRows; i++) {
                newGridSizes[`row${i + 1}`] = newSizes[i];
              }
              gridSizesRef.current = newGridSizes;
              setGridSizes(newGridSizes);
            }}
            onSaveRequired={saveHandler}
          />
        );
      }

      case "24-grid-8x3": {
        // 24-cell 8×3 grid (3 rows, 8 columns)
        const numRows = 3;
        const numCols = 8;
        const defaultRowHeight = 33.33;
        const defaultColWidth = 12.5;

        const rowHeights = Array.from({ length: numRows }, (_, i) =>
          parseFloat(gridSizes?.[`row${i + 1}`] || `${defaultRowHeight}`)
        );
        const rowCols = Array.from({ length: numRows }, (_, rowIndex) =>
          Array.from({ length: numCols }, (_, colIndex) =>
            gridSizes?.[`row${rowIndex + 1}Col${colIndex + 1}`] || `${defaultColWidth}%`
          )
        );

        // Save handler that reads current values at call time
        const saveHandler = async () => {
          const percentages: number[] = [];
          for (let i = 0; i < numRows; i++) {
            percentages.push(parseFloat(gridSizesRef.current?.[`row${i + 1}`] || `${defaultRowHeight}`));
            for (let j = 0; j < numCols; j++) {
              percentages.push(parseFloat(gridSizesRef.current?.[`row${i + 1}Col${j + 1}`] || `${defaultColWidth}`));
            }
          }
          await createNestedLayoutSaveHandler(layout, percentages)();
        };

        return (
          <ResizableGroup
            key={`24-grid-8x3-${hasLoadedFromApi}`}
            direction="vertical"
            minSize={100}
            cells={Array.from({ length: numRows }, (_, rowIndex) => ({
              content: (
                <ResizableGroup
                  direction="horizontal"
                  minSize={40}
                  cells={Array.from({ length: numCols }, (_, colIndex) => {
                    const areaNum = rowIndex * numCols + colIndex + 1;
                    return {
                      content: renderWidgetContent(`area-${areaNum}`),
                      position: `area-${areaNum}`,
                      initialSize: rowCols[rowIndex][colIndex]
                    };
                  })}
                  templateId={undefined}
                  layout={undefined}
                  onSizeChange={(newSizes) => {
                    const newGridSizes: any = { ...gridSizesRef.current };
                    for (let i = 0; i < numCols; i++) {
                      newGridSizes[`row${rowIndex + 1}Col${i + 1}`] = newSizes[i];
                    }
                    gridSizesRef.current = newGridSizes;
                    setGridSizes(newGridSizes);
                  }}
                  onSaveRequired={saveHandler}
                />
              ),
              position: `row-${rowIndex + 1}`,
              initialSize: `${rowHeights[rowIndex]}%`
            }))}
            className="flex-1 bg-background overflow-hidden h-full"
            templateId={undefined}
            layout={undefined}
            onSizeChange={(newSizes) => {
              const newGridSizes: any = { ...gridSizesRef.current };
              for (let i = 0; i < numRows; i++) {
                newGridSizes[`row${i + 1}`] = newSizes[i];
              }
              gridSizesRef.current = newGridSizes;
              setGridSizes(newGridSizes);
            }}
            onSaveRequired={saveHandler}
          />
        );
      }

      case "28-grid-4x7": {
        // 28-cell 4×7 grid (7 rows, 4 columns)
        // NEW FORMAT: row1-row7 for row heights, row1col1-row7col4 for per-row column widths
        // OLD FORMAT: row1-row7 for row heights, col1-col4 for shared column widths (backward compat)
        const numRows = 7;
        const numCols = 4;
        const defaultRowHeight = 14.29;
        const defaultColWidth = 25;

        const rowHeights = Array.from({ length: numRows }, (_, i) =>
          parseFloat(gridSizes?.[`row${i + 1}`] || `${defaultRowHeight}`)
        );

        // Check if using new format (per-row columns) or old format (shared columns)
        const hasPerRowColumns = gridSizes?.[`row1col1`] !== undefined;

        // Get column widths for each row
        const getColWidths = (rowIndex: number) => {
          if (hasPerRowColumns) {
            // NEW FORMAT: per-row column widths
            return Array.from({ length: numCols }, (_, colIndex) =>
              gridSizes?.[`row${rowIndex + 1}col${colIndex + 1}`] || `${defaultColWidth}%`
            );
          } else {
            // OLD FORMAT: shared column widths (backward compatibility)
            return Array.from({ length: numCols }, (_, colIndex) =>
              gridSizes?.[`col${colIndex + 1}`] || `${defaultColWidth}%`
            );
          }
        };

        // Save handler that reads current values at call time
        const saveHandler = async () => {
          const percentages: number[] = [];
          // First, save all row heights
          for (let i = 0; i < numRows; i++) {
            percentages.push(parseFloat(gridSizesRef.current?.[`row${i + 1}`] || `${defaultRowHeight}`));
          }
          // Then, save all per-row column widths (NEW FORMAT)
          for (let row = 0; row < numRows; row++) {
            for (let col = 0; col < numCols; col++) {
              percentages.push(parseFloat(gridSizesRef.current?.[`row${row + 1}col${col + 1}`] || `${defaultColWidth}`));
            }
          }
          await createNestedLayoutSaveHandler(layout, percentages)();
        };

        return (
          <ResizableGroup
            key={`28-grid-4x7-${hasLoadedFromApi}`}
            direction="vertical"
            minSize={40}
            cells={Array.from({ length: numRows }, (_, rowIndex) => ({
              content: (
                <ResizableGroup
                  direction="horizontal"
                  minSize={60}
                  cells={Array.from({ length: numCols }, (_, colIndex) => {
                    const areaNum = rowIndex * numCols + colIndex + 1;
                    const colWidths = getColWidths(rowIndex);
                    return {
                      content: renderWidgetContent(`area-${areaNum}`),
                      position: `area-${areaNum}`,
                      initialSize: colWidths[colIndex]
                    };
                  })}
                  templateId={undefined}
                  layout={undefined}
                  onSizeChange={(newSizes) => {
                    const newGridSizes: any = { ...gridSizesRef.current };
                    // Update per-row column widths
                    for (let i = 0; i < numCols; i++) {
                      newGridSizes[`row${rowIndex + 1}col${i + 1}`] = newSizes[i];
                    }
                    gridSizesRef.current = newGridSizes;
                    setGridSizes(newGridSizes);
                  }}
                  onSaveRequired={saveHandler}
                />
              ),
              position: `row-${rowIndex + 1}`,
              initialSize: `${rowHeights[rowIndex]}%`
            }))}
            className="flex-1 bg-background overflow-hidden h-full"
            templateId={undefined}
            layout={undefined}
            onSizeChange={(newSizes) => {
              const newGridSizes: any = { ...gridSizesRef.current };
              for (let i = 0; i < numRows; i++) {
                newGridSizes[`row${i + 1}`] = newSizes[i];
              }
              gridSizesRef.current = newGridSizes;
              setGridSizes(newGridSizes);
            }}
            onSaveRequired={saveHandler}
          />
        );
      }

      case "28-grid-7x4": {
        // 28-cell 7×4 grid (4 rows, 7 columns)
        // NEW FORMAT: row1-row4 for row heights, row1col1-row4col7 for per-row column widths
        // OLD FORMAT: row1-row4 for row heights, col1-col7 for shared column widths (backward compat)
        const numRows = 4;
        const numCols = 7;
        const defaultRowHeight = 25;
        const defaultColWidth = 14.29;

        const rowHeights = Array.from({ length: numRows }, (_, i) =>
          parseFloat(gridSizes?.[`row${i + 1}`] || `${defaultRowHeight}`)
        );

        // Check if using new format (per-row columns) or old format (shared columns)
        const hasPerRowColumns = gridSizes?.[`row1col1`] !== undefined;

        // Get column widths for each row
        const getColWidths = (rowIndex: number) => {
          if (hasPerRowColumns) {
            // NEW FORMAT: per-row column widths
            return Array.from({ length: numCols }, (_, colIndex) =>
              gridSizes?.[`row${rowIndex + 1}col${colIndex + 1}`] || `${defaultColWidth}%`
            );
          } else {
            // OLD FORMAT: shared column widths (backward compatibility)
            return Array.from({ length: numCols }, (_, colIndex) =>
              gridSizes?.[`col${colIndex + 1}`] || `${defaultColWidth}%`
            );
          }
        };

        // Save handler that reads current values at call time
        const saveHandler = async () => {
          const percentages: number[] = [];
          // First, save all row heights
          for (let i = 0; i < numRows; i++) {
            percentages.push(parseFloat(gridSizesRef.current?.[`row${i + 1}`] || `${defaultRowHeight}`));
          }
          // Then, save all per-row column widths (NEW FORMAT)
          for (let row = 0; row < numRows; row++) {
            for (let col = 0; col < numCols; col++) {
              percentages.push(parseFloat(gridSizesRef.current?.[`row${row + 1}col${col + 1}`] || `${defaultColWidth}`));
            }
          }
          await createNestedLayoutSaveHandler(layout, percentages)();
        };

        return (
          <ResizableGroup
            key={`28-grid-7x4-${hasLoadedFromApi}`}
            direction="vertical"
            minSize={60}
            cells={Array.from({ length: numRows }, (_, rowIndex) => ({
              content: (
                <ResizableGroup
                  direction="horizontal"
                  minSize={40}
                  cells={Array.from({ length: numCols }, (_, colIndex) => {
                    const areaNum = rowIndex * numCols + colIndex + 1;
                    const colWidths = getColWidths(rowIndex);
                    return {
                      content: renderWidgetContent(`area-${areaNum}`),
                      position: `area-${areaNum}`,
                      initialSize: colWidths[colIndex]
                    };
                  })}
                  templateId={undefined}
                  layout={undefined}
                  onSizeChange={(newSizes) => {
                    const newGridSizes: any = { ...gridSizesRef.current };
                    // Update per-row column widths
                    for (let i = 0; i < numCols; i++) {
                      newGridSizes[`row${rowIndex + 1}col${i + 1}`] = newSizes[i];
                    }
                    gridSizesRef.current = newGridSizes;
                    setGridSizes(newGridSizes);
                  }}
                  onSaveRequired={saveHandler}
                />
              ),
              position: `row-${rowIndex + 1}`,
              initialSize: `${rowHeights[rowIndex]}%`
            }))}
            className="flex-1 bg-background overflow-hidden h-full"
            templateId={undefined}
            layout={undefined}
            onSizeChange={(newSizes) => {
              const newGridSizes: any = { ...gridSizesRef.current };
              for (let i = 0; i < numRows; i++) {
                newGridSizes[`row${i + 1}`] = newSizes[i];
              }
              gridSizesRef.current = newGridSizes;
              setGridSizes(newGridSizes);
            }}
            onSaveRequired={saveHandler}
          />
        );
      }

      case "32-grid-4x8": {
        // 32-cell 4×8 grid (8 rows, 4 columns)
        // NEW FORMAT: row1-row8 for row heights, row1col1-row8col4 for per-row column widths
        // OLD FORMAT: row1-row8 for row heights, col1-col4 for shared column widths (backward compat)
        const numRows = 8;
        const numCols = 4;
        const defaultRowHeight = 12.5;
        const defaultColWidth = 25;

        const rowHeights = Array.from({ length: numRows }, (_, i) =>
          parseFloat(gridSizes?.[`row${i + 1}`] || `${defaultRowHeight}`)
        );

        // Check if using new format (per-row columns) or old format (shared columns)
        const hasPerRowColumns = gridSizes?.[`row1col1`] !== undefined;

        // Get column widths for each row
        const getColWidths = (rowIndex: number) => {
          if (hasPerRowColumns) {
            // NEW FORMAT: per-row column widths
            return Array.from({ length: numCols }, (_, colIndex) =>
              gridSizes?.[`row${rowIndex + 1}col${colIndex + 1}`] || `${defaultColWidth}%`
            );
          } else {
            // OLD FORMAT: shared column widths (backward compatibility)
            return Array.from({ length: numCols }, (_, colIndex) =>
              gridSizes?.[`col${colIndex + 1}`] || `${defaultColWidth}%`
            );
          }
        };

        // Save handler that reads current values at call time
        const saveHandler = async () => {
          const percentages: number[] = [];
          // First, save all row heights
          for (let i = 0; i < numRows; i++) {
            percentages.push(parseFloat(gridSizesRef.current?.[`row${i + 1}`] || `${defaultRowHeight}`));
          }
          // Then, save all per-row column widths (NEW FORMAT)
          for (let row = 0; row < numRows; row++) {
            for (let col = 0; col < numCols; col++) {
              percentages.push(parseFloat(gridSizesRef.current?.[`row${row + 1}col${col + 1}`] || `${defaultColWidth}`));
            }
          }
          await createNestedLayoutSaveHandler(layout, percentages)();
        };

        return (
          <ResizableGroup
            key={`32-grid-4x8-${hasLoadedFromApi}`}
            direction="vertical"
            minSize={40}
            cells={Array.from({ length: numRows }, (_, rowIndex) => ({
              content: (
                <ResizableGroup
                  direction="horizontal"
                  minSize={60}
                  cells={Array.from({ length: numCols }, (_, colIndex) => {
                    const areaNum = rowIndex * numCols + colIndex + 1;
                    const colWidths = getColWidths(rowIndex);
                    return {
                      content: renderWidgetContent(`area-${areaNum}`),
                      position: `area-${areaNum}`,
                      initialSize: colWidths[colIndex]
                    };
                  })}
                  templateId={undefined}
                  layout={undefined}
                  onSizeChange={(newSizes) => {
                    const newGridSizes: any = { ...gridSizesRef.current };
                    // Update per-row column widths
                    for (let i = 0; i < numCols; i++) {
                      newGridSizes[`row${rowIndex + 1}col${i + 1}`] = newSizes[i];
                    }
                    gridSizesRef.current = newGridSizes;
                    setGridSizes(newGridSizes);
                  }}
                  onSaveRequired={saveHandler}
                />
              ),
              position: `row-${rowIndex + 1}`,
              initialSize: `${rowHeights[rowIndex]}%`
            }))}
            className="flex-1 bg-background overflow-hidden h-full"
            templateId={undefined}
            layout={undefined}
            onSizeChange={(newSizes) => {
              const newGridSizes: any = { ...gridSizesRef.current };
              for (let i = 0; i < numRows; i++) {
                newGridSizes[`row${i + 1}`] = newSizes[i];
              }
              gridSizesRef.current = newGridSizes;
              setGridSizes(newGridSizes);
            }}
            onSaveRequired={saveHandler}
          />
        );
      }

      case "32-grid-8x4": {
        // 32-cell 8×4 grid (4 rows, 8 columns)
        // NEW FORMAT: row1-row4 for row heights, row1col1-row4col8 for per-row column widths
        // OLD FORMAT: row1-row4 for row heights, col1-col8 for shared column widths (backward compat)
        const numRows = 4;
        const numCols = 8;
        const defaultRowHeight = 25;
        const defaultColWidth = 12.5;

        const rowHeights = Array.from({ length: numRows }, (_, i) =>
          parseFloat(gridSizes?.[`row${i + 1}`] || `${defaultRowHeight}`)
        );

        // Check if using new format (per-row columns) or old format (shared columns)
        const hasPerRowColumns = gridSizes?.[`row1col1`] !== undefined;

        // Get column widths for each row
        const getColWidths = (rowIndex: number) => {
          if (hasPerRowColumns) {
            // NEW FORMAT: per-row column widths
            return Array.from({ length: numCols }, (_, colIndex) =>
              gridSizes?.[`row${rowIndex + 1}col${colIndex + 1}`] || `${defaultColWidth}%`
            );
          } else {
            // OLD FORMAT: shared column widths (backward compatibility)
            return Array.from({ length: numCols }, (_, colIndex) =>
              gridSizes?.[`col${colIndex + 1}`] || `${defaultColWidth}%`
            );
          }
        };

        // Save handler that reads current values at call time
        const saveHandler = async () => {
          const percentages: number[] = [];
          // First, save all row heights
          for (let i = 0; i < numRows; i++) {
            percentages.push(parseFloat(gridSizesRef.current?.[`row${i + 1}`] || `${defaultRowHeight}`));
          }
          // Then, save all per-row column widths (NEW FORMAT)
          for (let row = 0; row < numRows; row++) {
            for (let col = 0; col < numCols; col++) {
              percentages.push(parseFloat(gridSizesRef.current?.[`row${row + 1}col${col + 1}`] || `${defaultColWidth}`));
            }
          }
          await createNestedLayoutSaveHandler(layout, percentages)();
        };

        return (
          <ResizableGroup
            key={`32-grid-8x4-${hasLoadedFromApi}`}
            direction="vertical"
            minSize={60}
            cells={Array.from({ length: numRows }, (_, rowIndex) => ({
              content: (
                <ResizableGroup
                  direction="horizontal"
                  minSize={40}
                  cells={Array.from({ length: numCols }, (_, colIndex) => {
                    const areaNum = rowIndex * numCols + colIndex + 1;
                    const colWidths = getColWidths(rowIndex);
                    return {
                      content: renderWidgetContent(`area-${areaNum}`),
                      position: `area-${areaNum}`,
                      initialSize: colWidths[colIndex]
                    };
                  })}
                  templateId={undefined}
                  layout={undefined}
                  onSizeChange={(newSizes) => {
                    const newGridSizes: any = { ...gridSizesRef.current };
                    // Update per-row column widths
                    for (let i = 0; i < numCols; i++) {
                      newGridSizes[`row${rowIndex + 1}col${i + 1}`] = newSizes[i];
                    }
                    gridSizesRef.current = newGridSizes;
                    setGridSizes(newGridSizes);
                  }}
                  onSaveRequired={saveHandler}
                />
              ),
              position: `row-${rowIndex + 1}`,
              initialSize: `${rowHeights[rowIndex]}%`
            }))}
            className="flex-1 bg-background overflow-hidden h-full"
            templateId={undefined}
            layout={undefined}
            onSizeChange={(newSizes) => {
              const newGridSizes: any = { ...gridSizesRef.current };
              for (let i = 0; i < numRows; i++) {
                newGridSizes[`row${i + 1}`] = newSizes[i];
              }
              gridSizesRef.current = newGridSizes;
              setGridSizes(newGridSizes);
            }}
            onSaveRequired={saveHandler}
          />
        );
      }

      default:
        // For any other complex layouts, use CSS Grid as fallback
        // This ensures all layouts work, even if not perfectly resizable
        const gridColumns = Math.max(...areas.map(area => area.position.x + area.size.width));
        const gridRows = Math.max(...areas.map(area => area.position.y + area.size.height));

        return (
          <div
            className="w-full h-full bg-background overflow-hidden"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
              gridTemplateRows: `repeat(${gridRows}, 1fr)`,
              gap: '0'
            }}
          >
            {areas.map((area) => (
              <div
                key={area.id}
                className="relative group"
                style={{
                  gridColumn: `${area.position.x + 1} / ${area.position.x + area.size.width + 1}`,
                  gridRow: `${area.position.y + 1} / ${area.position.y + area.size.height + 1}`,
                }}
                data-area={area.id.replace('area-', 'area')}
                data-position={area.id}
              >
                {renderWidgetContent(area.id)}
              </div>
            ))}
          </div>
        );
    }
  };

  // Handler to update gridSizes state when ResizableGrid components are resized
  const handleResize = useCallback((areaId: string, size: { width: number; height: number }) => {
    // console.log('🔄 [DynamicGridRenderer] handleResize called:', { areaId, size, layout });

    // Call the original callback if provided
    onResize?.(areaId, size);

    // Update gridSizes state based on which area was resized and the layout type
    setGridSizes(prev => {
      const updated = { ...prev };

      // For complex layouts, calculate percentages from pixel sizes by finding the container
      if (layout === '3-grid-left-large') {
        const container = document.querySelector('[data-layout-container="3-grid-left-large"]');
        if (container) {
          const containerRect = container.getBoundingClientRect();

          if (areaId === 'area-1') {
            // Left panel resized horizontally (width only)
            const leftWidth = (size.width / containerRect.width) * 100;
            updated.left = `${Math.max(10, Math.min(90, leftWidth)).toFixed(2)}%`;
            // Calculate right from left (don't store right separately to avoid sync issues)
            const rightWidth = 100 - parseFloat(updated.left);
            updated.right = `${rightWidth.toFixed(2)}%`;
            // DON'T update rightTop/rightBottom - keep their current values unchanged
            // Only update if they don't exist (initial load)
            if (!updated.rightTop) {
              updated.rightTop = prev.rightTop || '50%';
            }
            if (!updated.rightBottom) {
              updated.rightBottom = prev.rightBottom || '50%';
            }
            // console.log('📐 [DynamicGridRenderer] Updated left panel size:', { left: updated.left, right: updated.right, containerWidth: containerRect.width, sizeWidth: size.width });
          } else if (areaId === 'area-2') {
            // Right top panel resized vertically (height only)
            const rightContainer = document.querySelector('[data-right-container="true"]');
            if (rightContainer) {
              const rightContainerHeight = rightContainer.getBoundingClientRect().height;
              const topHeight = (size.height / rightContainerHeight) * 100;
              updated.rightTop = `${Math.max(10, Math.min(90, topHeight)).toFixed(2)}%`;
              updated.rightBottom = `${(100 - parseFloat(updated.rightTop)).toFixed(2)}%`;
              // DON'T update left/right - keep their current values unchanged
              if (!updated.left) {
                updated.left = prev.left || '50%';
              }
              if (!updated.right) {
                updated.right = prev.right || '50%';
              }
              // console.log('📐 [DynamicGridRenderer] Updated right top panel size:', { rightTop: updated.rightTop, rightBottom: updated.rightBottom, rightContainerHeight, sizeHeight: size.height });
            }
          } else if (areaId === 'area-3') {
            // Right bottom panel resized vertically (height only)
            const rightContainer = document.querySelector('[data-right-container="true"]');
            if (rightContainer) {
              const rightContainerHeight = rightContainer.getBoundingClientRect().height;
              const bottomHeight = (size.height / rightContainerHeight) * 100;
              updated.rightBottom = `${Math.max(10, Math.min(90, bottomHeight)).toFixed(2)}%`;
              updated.rightTop = `${(100 - parseFloat(updated.rightBottom)).toFixed(2)}%`;
              // DON'T update left/right - keep their current values unchanged
              if (!updated.left) {
                updated.left = prev.left || '50%';
              }
              if (!updated.right) {
                updated.right = prev.right || '50%';
              }
            }
          }
        }
      } else if (layout === '3-grid-right-large') {
        const container = document.querySelector('[data-layout-container="3-grid-right-large"]');
        if (container) {
          const containerRect = container.getBoundingClientRect();

          if (areaId === 'area-3') {
            // Right panel resized horizontally (width only)
            const rightWidth = (size.width / containerRect.width) * 100;
            updated.right = `${Math.max(10, Math.min(90, rightWidth)).toFixed(2)}%`;
            const leftWidth = 100 - parseFloat(updated.right);
            updated.left = `${leftWidth.toFixed(2)}%`;
            // DON'T update leftTop/leftBottom - keep their current values unchanged
            if (!updated.leftTop) {
              updated.leftTop = prev.leftTop || '50%';
            }
            if (!updated.leftBottom) {
              updated.leftBottom = prev.leftBottom || '50%';
            }
          } else if (areaId === 'area-1') {
            // Left top panel resized vertically (height only)
            const leftContainer = document.querySelector('[data-left-container="true"]');
            if (leftContainer) {
              const leftContainerHeight = leftContainer.getBoundingClientRect().height;
              const topHeight = (size.height / leftContainerHeight) * 100;
              updated.leftTop = `${Math.max(10, Math.min(90, topHeight)).toFixed(2)}%`;
              updated.leftBottom = `${(100 - parseFloat(updated.leftTop)).toFixed(2)}%`;
              // DON'T update left/right - keep their current values unchanged
              if (!updated.left) {
                updated.left = prev.left || '50%';
              }
              if (!updated.right) {
                updated.right = prev.right || '50%';
              }
            }
          } else if (areaId === 'area-2') {
            // Left bottom panel resized vertically (height only)
            const leftContainer = document.querySelector('[data-left-container="true"]');
            if (leftContainer) {
              const leftContainerHeight = leftContainer.getBoundingClientRect().height;
              const bottomHeight = (size.height / leftContainerHeight) * 100;
              updated.leftBottom = `${Math.max(10, Math.min(90, bottomHeight)).toFixed(2)}%`;
              updated.leftTop = `${(100 - parseFloat(updated.leftBottom)).toFixed(2)}%`;
              // DON'T update left/right - keep their current values unchanged
              if (!updated.left) {
                updated.left = prev.left || '50%';
              }
              if (!updated.right) {
                updated.right = prev.right || '50%';
              }
            }
          }
        }
      } else if (layout === '3-grid-top-large') {
        const container = document.querySelector('[data-layout-container="3-grid-top-large"]');
        if (container) {
          const containerRect = container.getBoundingClientRect();

          if (areaId === 'area-1') {
            // Top panel resized vertically (height only)
            const topHeight = (size.height / containerRect.height) * 100;
            updated.top = `${Math.max(10, Math.min(90, topHeight)).toFixed(2)}%`;
            const bottomHeight = 100 - parseFloat(updated.top);
            updated.bottom = `${bottomHeight.toFixed(2)}%`;
            // DON'T update bottomLeft/bottomRight - keep their current values unchanged
            if (!updated.bottomLeft) {
              updated.bottomLeft = prev.bottomLeft || '50%';
            }
            if (!updated.bottomRight) {
              updated.bottomRight = prev.bottomRight || '50%';
            }
            console.log('📐 [DynamicGridRenderer] Updated top panel size:', { top: updated.top, bottom: updated.bottom, containerHeight: containerRect.height, sizeHeight: size.height });
          } else if (areaId === 'area-2') {
            // Bottom left panel resized horizontally (width only)
            const bottomContainer = document.querySelector('[data-bottom-container="true"]');
            if (bottomContainer) {
              const bottomContainerWidth = bottomContainer.getBoundingClientRect().width;
              const leftWidth = (size.width / bottomContainerWidth) * 100;
              updated.bottomLeft = `${Math.max(10, Math.min(90, leftWidth)).toFixed(2)}%`;
              updated.bottomRight = `${(100 - parseFloat(updated.bottomLeft)).toFixed(2)}%`;
              // DON'T update top/bottom - keep their current values unchanged
              if (!updated.top) {
                updated.top = prev.top || '50%';
              }
              if (!updated.bottom) {
                updated.bottom = prev.bottom || '50%';
              }
              console.log('📐 [DynamicGridRenderer] Updated bottom left panel size:', { bottomLeft: updated.bottomLeft, bottomRight: updated.bottomRight, bottomContainerWidth, sizeWidth: size.width });
            }
          } else if (areaId === 'area-3') {
            // Bottom right panel resized horizontally (width only)
            const bottomContainer = document.querySelector('[data-bottom-container="true"]');
            if (bottomContainer) {
              const bottomContainerWidth = bottomContainer.getBoundingClientRect().width;
              const rightWidth = (size.width / bottomContainerWidth) * 100;
              updated.bottomRight = `${Math.max(10, Math.min(90, rightWidth)).toFixed(2)}%`;
              updated.bottomLeft = `${(100 - parseFloat(updated.bottomRight)).toFixed(2)}%`;
              // DON'T update top/bottom - keep their current values unchanged
              if (!updated.top) {
                updated.top = prev.top || '50%';
              }
              if (!updated.bottom) {
                updated.bottom = prev.bottom || '50%';
              }
              console.log('📐 [DynamicGridRenderer] Updated bottom right panel size:', { bottomLeft: updated.bottomLeft, bottomRight: updated.bottomRight, bottomContainerWidth, sizeWidth: size.width });
            }
          }
        }
      } else if (layout === '3-grid-bottom-large') {
        const container = document.querySelector('[data-layout-container="3-grid-bottom-large"]');
        if (container) {
          const containerRect = container.getBoundingClientRect();

          if (areaId === 'area-3') {
            // Bottom panel resized vertically (height only)
            const bottomHeight = (size.height / containerRect.height) * 100;
            updated.bottom = `${Math.max(10, Math.min(90, bottomHeight)).toFixed(2)}%`;
            const topHeight = 100 - parseFloat(updated.bottom);
            updated.top = `${topHeight.toFixed(2)}%`;
            // DON'T update topLeft/topRight - keep their current values unchanged
            if (!updated.topLeft) {
              updated.topLeft = prev.topLeft || '50%';
            }
            if (!updated.topRight) {
              updated.topRight = prev.topRight || '50%';
            }
            console.log('📐 [DynamicGridRenderer] Updated bottom panel size:', { top: updated.top, bottom: updated.bottom, containerHeight: containerRect.height, sizeHeight: size.height });
          } else if (areaId === 'area-1') {
            // Top left panel resized horizontally (width only)
            const topContainer = document.querySelector('[data-top-container="true"]');
            if (topContainer) {
              const topContainerWidth = topContainer.getBoundingClientRect().width;
              const leftWidth = (size.width / topContainerWidth) * 100;
              updated.topLeft = `${Math.max(10, Math.min(90, leftWidth)).toFixed(2)}%`;
              updated.topRight = `${(100 - parseFloat(updated.topLeft)).toFixed(2)}%`;
              // DON'T update top/bottom - keep their current values unchanged
              if (!updated.top) {
                updated.top = prev.top || '50%';
              }
              if (!updated.bottom) {
                updated.bottom = prev.bottom || '50%';
              }
              console.log('📐 [DynamicGridRenderer] Updated top left panel size:', { topLeft: updated.topLeft, topRight: updated.topRight, topContainerWidth, sizeWidth: size.width });
            }
          } else if (areaId === 'area-2') {
            // Top right panel resized horizontally (width only)
            const topContainer = document.querySelector('[data-top-container="true"]');
            if (topContainer) {
              const topContainerWidth = topContainer.getBoundingClientRect().width;
              const rightWidth = (size.width / topContainerWidth) * 100;
              updated.topRight = `${Math.max(10, Math.min(90, rightWidth)).toFixed(2)}%`;
              updated.topLeft = `${(100 - parseFloat(updated.topRight)).toFixed(2)}%`;
              // DON'T update top/bottom - keep their current values unchanged
              if (!updated.top) {
                updated.top = prev.top || '50%';
              }
              if (!updated.bottom) {
                updated.bottom = prev.bottom || '50%';
              }
              console.log('📐 [DynamicGridRenderer] Updated top right panel size:', { topLeft: updated.topLeft, topRight: updated.topRight, topContainerWidth, sizeWidth: size.width });
            }
          }
        }
      } else if (layout === '4-grid') {
        const container = document.querySelector('[data-layout-container="4-grid"]');
        if (container) {
          const containerRect = container.getBoundingClientRect();

          if (areaId === 'area-1' || areaId === 'area-2') {
            // Top row panel resized horizontally (width only)
            // Only update top row - bottom row maintains independent widths
            const topContainer = document.querySelector('[data-layout-container="4-grid"] > div > div:first-child');
            if (topContainer) {
              const topContainerWidth = topContainer.getBoundingClientRect().width;
              const width = (size.width / topContainerWidth) * 100;
              const leftWidth = areaId === 'area-1'
                ? Math.max(10, Math.min(90, width))
                : (100 - Math.max(10, Math.min(90, width)));
              const rightWidth = 100 - leftWidth;

              // Only update top row - preserve bottom row widths
              updated.topLeft = `${leftWidth.toFixed(2)}%`;
              updated.topRight = `${rightWidth.toFixed(2)}%`;
              updated.bottomLeft = prev.bottomLeft || '50%';
              updated.bottomRight = prev.bottomRight || '50%';

              // Keep vertical values unchanged
              updated.top = prev.top || '50%';
              updated.bottom = prev.bottom || '50%';
            }
          } else if (areaId === 'area-3' || areaId === 'area-4') {
            // Bottom row panel resized horizontally (width only)
            // Only update bottom row - top row maintains independent widths
            const bottomContainer = container.querySelector('[data-layout-container="4-grid"] > div > div:last-child');
            if (bottomContainer) {
              const bottomContainerWidth = bottomContainer.getBoundingClientRect().width;
              const width = (size.width / bottomContainerWidth) * 100;
              const leftWidth = areaId === 'area-3'
                ? Math.max(10, Math.min(90, width))
                : (100 - Math.max(10, Math.min(90, width)));
              const rightWidth = 100 - leftWidth;

              // Only update bottom row - preserve top row widths
              updated.topLeft = prev.topLeft || '50%';
              updated.topRight = prev.topRight || '50%';
              updated.bottomLeft = `${leftWidth.toFixed(2)}%`;
              updated.bottomRight = `${rightWidth.toFixed(2)}%`;

              // Keep vertical values unchanged
              updated.top = prev.top || '50%';
              updated.bottom = prev.bottom || '50%';
            }
          } else if (areaId === 'top-container' || areaId === 'bottom-container') {
            // Top or bottom container resized vertically (height only)
            const height = (size.height / containerRect.height) * 100;
            if (areaId === 'top-container') {
              updated.top = `${Math.max(10, Math.min(90, height)).toFixed(2)}%`;
              updated.bottom = `${(100 - parseFloat(updated.top)).toFixed(2)}%`;
            } else {
              updated.bottom = `${Math.max(10, Math.min(90, height)).toFixed(2)}%`;
              updated.top = `${(100 - parseFloat(updated.bottom)).toFixed(2)}%`;
            }
            // Keep horizontal values unchanged
            updated.topLeft = prev.topLeft || '50%';
            updated.topRight = prev.topRight || '50%';
            updated.bottomLeft = prev.bottomLeft || '50%';
            updated.bottomRight = prev.bottomRight || '50%';
          }
        }
      } else if (layout === '6-grid-2x3') {
        // 6-grid-2x3: 2 rows x 3 columns (top row: area-1,2,3 / bottom row: area-4,5,6)
        const container = document.querySelector('[data-layout-container="6-grid-2x3"]');
        if (container) {
          // Check if the main vertical divider was resized
          if (areaId === 'top-container' || areaId === 'bottom-container') {
            // Main vertical divider resized
            const containerHeight = container.getBoundingClientRect().height;
            const height = (size.height / containerHeight) * 100;
            if (areaId === 'top-container') {
              updated.top = `${Math.max(10, Math.min(90, height)).toFixed(2)}%`;
              updated.bottom = `${(100 - parseFloat(updated.top)).toFixed(2)}%`;
            } else {
              updated.bottom = `${Math.max(10, Math.min(90, height)).toFixed(2)}%`;
              updated.top = `${(100 - parseFloat(updated.bottom)).toFixed(2)}%`;
            }
            // Keep horizontal values unchanged
            updated.topLeft = prev.topLeft || '33.33%';
            updated.topMiddle = prev.topMiddle || '33.33%';
            updated.topRight = prev.topRight || '33.34%';
            updated.bottomLeft = prev.bottomLeft || '33.33%';
            updated.bottomMiddle = prev.bottomMiddle || '33.33%';
            updated.bottomRight = prev.bottomRight || '33.34%';
          }
          else if (areaId === 'area-1' || areaId === 'area-2' || areaId === 'area-3') {
            // Top row cell resized horizontally (width only)
            const topContainer = container.querySelector('[data-position="top-container"]');
            if (topContainer) {
              const topContainerWidth = topContainer.getBoundingClientRect().width;
              const width = (size.width / topContainerWidth) * 100;
              if (areaId === 'area-1') {
                updated.topLeft = `${Math.max(10, Math.min(90, width)).toFixed(2)}%`;
                updated.topMiddle = prev.topMiddle || '33.33%';
                updated.topRight = prev.topRight || '33.34%';
              } else if (areaId === 'area-2') {
                updated.topMiddle = `${Math.max(10, Math.min(90, width)).toFixed(2)}%`;
                updated.topLeft = prev.topLeft || '33.33%';
                updated.topRight = prev.topRight || '33.34%';
              } else {
                updated.topRight = `${Math.max(10, Math.min(90, width)).toFixed(2)}%`;
                updated.topLeft = prev.topLeft || '33.33%';
                updated.topMiddle = prev.topMiddle || '33.33%';
              }
              // Keep other values unchanged
              updated.top = prev.top || '50%';
              updated.bottom = prev.bottom || '50%';
              updated.bottomLeft = prev.bottomLeft || '33.33%';
              updated.bottomMiddle = prev.bottomMiddle || '33.33%';
              updated.bottomRight = prev.bottomRight || '33.34%';
            }
          } else if (areaId === 'area-4' || areaId === 'area-5' || areaId === 'area-6') {
            // Bottom row cell resized horizontally (width only)
            const bottomContainer = container.querySelector('[data-position="bottom-container"]');
            if (bottomContainer) {
              const bottomContainerWidth = bottomContainer.getBoundingClientRect().width;
              const width = (size.width / bottomContainerWidth) * 100;
              if (areaId === 'area-4') {
                updated.bottomLeft = `${Math.max(10, Math.min(90, width)).toFixed(2)}%`;
                updated.bottomMiddle = prev.bottomMiddle || '33.33%';
                updated.bottomRight = prev.bottomRight || '33.34%';
              } else if (areaId === 'area-5') {
                updated.bottomMiddle = `${Math.max(10, Math.min(90, width)).toFixed(2)}%`;
                updated.bottomLeft = prev.bottomLeft || '33.33%';
                updated.bottomRight = prev.bottomRight || '33.34%';
              } else {
                updated.bottomRight = `${Math.max(10, Math.min(90, width)).toFixed(2)}%`;
                updated.bottomLeft = prev.bottomLeft || '33.33%';
                updated.bottomMiddle = prev.bottomMiddle || '33.33%';
              }
              // Keep other values unchanged
              updated.top = prev.top || '50%';
              updated.bottom = prev.bottom || '50%';
              updated.topLeft = prev.topLeft || '33.33%';
              updated.topMiddle = prev.topMiddle || '33.33%';
              updated.topRight = prev.topRight || '33.34%';
            }
          }
        }
      } else if (layout === '6-grid-3x2') {
        // 6-grid-3x2: 2 columns x 3 rows (left: area-1,3,5 / right: area-2,4,6)
        const container = document.querySelector('[data-layout-container="6-grid-3x2"]');
        if (container) {
          // Check if the main horizontal divider was resized
          if (areaId === 'left-container' || areaId === 'right-container') {
            // Main horizontal divider resized
            const containerWidth = container.getBoundingClientRect().width;
            const width = (size.width / containerWidth) * 100;
            if (areaId === 'left-container') {
              updated.left = `${Math.max(10, Math.min(90, width)).toFixed(2)}%`;
              updated.right = `${(100 - parseFloat(updated.left)).toFixed(2)}%`;
            } else {
              updated.right = `${Math.max(10, Math.min(90, width)).toFixed(2)}%`;
              updated.left = `${(100 - parseFloat(updated.right)).toFixed(2)}%`;
            }
            // Keep vertical values unchanged
            updated.leftTop = prev.leftTop || '33.33%';
            updated.leftMiddle = prev.leftMiddle || '33.33%';
            updated.leftBottom = prev.leftBottom || '33.34%';
            updated.rightTop = prev.rightTop || '33.33%';
            updated.rightMiddle = prev.rightMiddle || '33.33%';
            updated.rightBottom = prev.rightBottom || '33.34%';
          }
          else if (areaId === 'area-1' || areaId === 'area-3' || areaId === 'area-5') {
            // Left column cell resized vertically (height only)
            const leftContainer = container.querySelector('[data-position="left-container"]');
            if (leftContainer) {
              const leftContainerHeight = leftContainer.getBoundingClientRect().height;
              const height = (size.height / leftContainerHeight) * 100;
              if (areaId === 'area-1') {
                updated.leftTop = `${Math.max(10, Math.min(90, height)).toFixed(2)}%`;
                updated.leftMiddle = prev.leftMiddle || '33.33%';
                updated.leftBottom = prev.leftBottom || '33.34%';
              } else if (areaId === 'area-3') {
                updated.leftMiddle = `${Math.max(10, Math.min(90, height)).toFixed(2)}%`;
                updated.leftTop = prev.leftTop || '33.33%';
                updated.leftBottom = prev.leftBottom || '33.34%';
              } else {
                updated.leftBottom = `${Math.max(10, Math.min(90, height)).toFixed(2)}%`;
                updated.leftTop = prev.leftTop || '33.33%';
                updated.leftMiddle = prev.leftMiddle || '33.33%';
              }
              // Keep horizontal values unchanged
              updated.left = prev.left || '50%';
              updated.right = prev.right || '50%';
              updated.rightTop = prev.rightTop || '33.33%';
              updated.rightMiddle = prev.rightMiddle || '33.33%';
              updated.rightBottom = prev.rightBottom || '33.34%';
            }
          } else if (areaId === 'area-2' || areaId === 'area-4' || areaId === 'area-6') {
            // Right column cell resized vertically (height only)
            const rightContainer = container.querySelector('[data-position="right-container"]');
            if (rightContainer) {
              const rightContainerHeight = rightContainer.getBoundingClientRect().height;
              const height = (size.height / rightContainerHeight) * 100;
              if (areaId === 'area-2') {
                updated.rightTop = `${Math.max(10, Math.min(90, height)).toFixed(2)}%`;
                updated.rightMiddle = prev.rightMiddle || '33.33%';
                updated.rightBottom = prev.rightBottom || '33.34%';
              } else if (areaId === 'area-4') {
                updated.rightMiddle = `${Math.max(10, Math.min(90, height)).toFixed(2)}%`;
                updated.rightTop = prev.rightTop || '33.33%';
                updated.rightBottom = prev.rightBottom || '33.34%';
              } else {
                updated.rightBottom = `${Math.max(10, Math.min(90, height)).toFixed(2)}%`;
                updated.rightTop = prev.rightTop || '33.33%';
                updated.rightMiddle = prev.rightMiddle || '33.33%';
              }
              // Keep horizontal values unchanged
              updated.left = prev.left || '50%';
              updated.right = prev.right || '50%';
              updated.leftTop = prev.leftTop || '33.33%';
              updated.leftMiddle = prev.leftMiddle || '33.33%';
              updated.leftBottom = prev.leftBottom || '33.34%';
            }
          }
        }
      } else if (layout === '6-grid-left-large') {
        // 6-grid-left-large: 1 large left panel (area-1) + 5 right panels stacked (area-2,3,4,5,6)
        const container = document.querySelector('[data-layout-container="6-grid-left-large"]');
        if (container) {
          if (areaId === 'area-1' || areaId === 'right-container') {
            // Main horizontal divider resized - only update horizontal values
            const width = (size.width / container.getBoundingClientRect().width) * 100;
            if (areaId === 'area-1') {
              updated.left = `${Math.max(10, Math.min(90, width)).toFixed(2)}%`;
              updated.right = `${(100 - parseFloat(updated.left)).toFixed(2)}%`;
            } else {
              updated.right = `${Math.max(10, Math.min(90, width)).toFixed(2)}%`;
              updated.left = `${(100 - parseFloat(updated.right)).toFixed(2)}%`;
            }
            // Preserve existing vertical values - don't set defaults
            updated.rightTop = prev.rightTop;
            updated.rightMiddle = prev.rightMiddle;
            updated.rightMiddle2 = prev.rightMiddle2;
            updated.rightBottom = prev.rightBottom;
          }
          else if (areaId === 'area-2' || areaId === 'area-3' || areaId === 'area-4' || areaId === 'area-5' || areaId === 'area-6') {
            // Right panel cell resized vertically (height only)
            const rightContainer = container.querySelector('[data-position="right-container"]');
            if (rightContainer) {
              const rightContainerHeight = rightContainer.getBoundingClientRect().height;
              const height = (size.height / rightContainerHeight) * 100;
              if (areaId === 'area-2') {
                updated.rightTop = `${Math.max(10, Math.min(90, height)).toFixed(2)}%`;
                updated.rightMiddle = prev.rightMiddle;
                updated.rightMiddle2 = prev.rightMiddle2;
                updated.rightBottom = prev.rightBottom;
              } else if (areaId === 'area-3') {
                updated.rightMiddle = `${Math.max(10, Math.min(90, height)).toFixed(2)}%`;
                updated.rightTop = prev.rightTop;
                updated.rightMiddle2 = prev.rightMiddle2;
                updated.rightBottom = prev.rightBottom;
              } else if (areaId === 'area-4') {
                updated.rightMiddle2 = `${Math.max(10, Math.min(90, height)).toFixed(2)}%`;
                updated.rightTop = prev.rightTop;
                updated.rightMiddle = prev.rightMiddle;
                updated.rightBottom = prev.rightBottom;
              } else if (areaId === 'area-5') {
                updated.rightBottom = `${Math.max(10, Math.min(90, height)).toFixed(2)}%`;
                updated.rightTop = prev.rightTop;
                updated.rightMiddle = prev.rightMiddle;
                updated.rightMiddle2 = prev.rightMiddle2;
              }
              // area-6 height is implicit (100 - sum of others), tracked via onSizeChange
              // Preserve existing horizontal values
              updated.left = prev.left;
              updated.right = prev.right;
            }
          }
        }
      }

      // console.log('🔄 [DynamicGridRenderer] handleResize updated gridSizes:', updated, 'areaId:', areaId, 'size:', size);
      return updated;
    });
  }, [onResize, layout]);

  // Helper to convert object-based gridSizes to array format for calculateGridPositions
  const convertGridSizesToArray = useCallback((layoutType: string, sizesObj: Record<string, string>): number[] | null => {
    // This handles layouts that use object-based gridSizes (like 3-grid-left-large, 4-grid)
    // Convert to array format expected by calculateGridPositions
    try {
      if (layoutType === '4-grid' || layoutType === 'four-grid') {
        // 2x2 grid: [top height, topLeft width, topRight width, bottomLeft width, bottomRight width, bottom height]
        const top = safeParseGridSize(sizesObj.top, 50);
        const bottom = safeParseGridSize(sizesObj.bottom, 50);
        const topLeft = safeParseGridSize(sizesObj.topLeft, 50);
        const topRight = safeParseGridSize(sizesObj.topRight, 50);
        const bottomLeft = safeParseGridSize(sizesObj.bottomLeft, 50);
        const bottomRight = safeParseGridSize(sizesObj.bottomRight, 50);
        return [top, topLeft, topRight, bottomLeft, bottomRight, bottom];
      } else if (layoutType === '3-grid-left-large' || layoutType === '3-grid-right-large' ||
        layoutType === '3-grid-top-large' || layoutType === '3-grid-bottom-large') {
        // For 3-cell complex layouts, extract percentages from object
        // Use safeParseGridSize to properly handle percentage strings like "50%"
        const left = safeParseGridSize(sizesObj.left, 50);
        const right = safeParseGridSize(sizesObj.right, 50);
        const rightTop = safeParseGridSize(sizesObj.rightTop, 50);
        const rightBottom = safeParseGridSize(sizesObj.rightBottom, 50);
        const leftTop = safeParseGridSize(sizesObj.leftTop, 50);
        const leftBottom = safeParseGridSize(sizesObj.leftBottom, 50);
        const top = safeParseGridSize(sizesObj.top, 50);
        const bottom = safeParseGridSize(sizesObj.bottom, 50);
        const bottomLeft = safeParseGridSize(sizesObj.bottomLeft, 50);
        const bottomRight = safeParseGridSize(sizesObj.bottomRight, 50);
        const topLeft = safeParseGridSize(sizesObj.topLeft, 50);
        const topRight = safeParseGridSize(sizesObj.topRight, 50);

        if (layoutType === '3-grid-left-large') {
          // Left panel + two right panels stacked
          // percentages[0] = left panel width (viewport %)
          // percentages[1] = rightTop panel height (as % of right container)
          // percentages[2] = rightBottom panel height (as % of right container)
          // Note: rightTop and rightBottom are already stored as % of right container in handleResize
          // so we use them directly without conversion
          return [left, rightTop, rightBottom];
        } else if (layoutType === '3-grid-right-large') {
          // Two left panels stacked + right panel
          // percentages[0] = leftTop panel height (as % of left container)
          // percentages[1] = leftBottom panel height (as % of left container)
          // percentages[2] = right panel width (viewport %)
          // Note: leftTop and leftBottom are already stored as % of left container in handleResize
          // so we use them directly without conversion
          return [leftTop, leftBottom, right];
        } else if (layoutType === '3-grid-top-large') {
          // Top panel + two bottom panels side by side
          // percentages[0] = top panel height (viewport %)
          // percentages[1] = bottomLeft panel width (as % of bottom container)
          // percentages[2] = bottomRight panel width (as % of bottom container)
          // Note: bottomLeft and bottomRight are already stored as % of bottom container in handleResize
          // so we use them directly without conversion
          return [top, bottomLeft, bottomRight];
        } else if (layoutType === '3-grid-bottom-large') {
          // Two top panels side by side + bottom panel
          // percentages[0] = topLeft panel width (as % of top container)
          // percentages[1] = topRight panel width (as % of top container)
          // percentages[2] = bottom panel height (viewport %)
          // Note: topLeft and topRight are already stored as % of top container in handleResize
          // so we use them directly without conversion
          return [topLeft, topRight, bottom];
        }
      } else if (layoutType === '5-grid-complex') {
        // 5-grid-complex layout: top row (2 cells) + bottom row (3 cells)
        // Format: [top height, topLeft width, topRight width, bottomLeft width, bottomMiddle width, bottomRight width]
        const top = safeParseGridSize(sizesObj.top, 50);
        const left = safeParseGridSize(sizesObj.left, 50);
        const right = safeParseGridSize(sizesObj.right, 50);
        const bottomLeft = safeParseGridSize(sizesObj.bottomLeft, 33.33);
        const bottomMiddle = safeParseGridSize(sizesObj.bottomMiddle, 33.33);
        const bottomRight = safeParseGridSize(sizesObj.bottomRight, 33.34);
        return [top, left, right, bottomLeft, bottomMiddle, bottomRight];
      } else if (layoutType === '7-grid-large') {
        // 7-grid-large: 1 left cell + 6 right cells (vertical split)
        // Data format: [leftWidth, rightCell1Height, rightCell2Height, rightCell3Height, rightCell4Height, rightCell5Height, rightCell6Height]
        const left = safeParseGridSize(sizesObj.left, 50);
        const rightCell1 = safeParseGridSize(sizesObj.rightCell1, 16.67);
        const rightCell2 = safeParseGridSize(sizesObj.rightCell2, 16.67);
        const rightCell3 = safeParseGridSize(sizesObj.rightCell3, 16.67);
        const rightCell4 = safeParseGridSize(sizesObj.rightCell4, 16.67);
        const rightCell5 = safeParseGridSize(sizesObj.rightCell5, 16.67);
        const rightCell6 = safeParseGridSize(sizesObj.rightCell6, 16.67);
        // Return 7 values: left width, then 6 right cell heights
        return [left, rightCell1, rightCell2, rightCell3, rightCell4, rightCell5, rightCell6];
      } else if (layoutType === '6-grid-2x3') {
        // 6-grid-2x3 layout: percentages[0] = top height, percentages[1] = topLeft width, percentages[2] = topMiddle width, percentages[3] = topRight width, percentages[4] = bottomLeft width, percentages[5] = bottomMiddle width, percentages[6] = bottomRight width
        const top = parseFloat(sizesObj.top || '50');
        const topLeft = parseFloat(sizesObj.topLeft || '33.33');
        const topMiddle = parseFloat(sizesObj.topMiddle || '33.33');
        const topRight = parseFloat(sizesObj.topRight || '33.34');
        const bottomLeft = parseFloat(sizesObj.bottomLeft || '33.33');
        const bottomMiddle = parseFloat(sizesObj.bottomMiddle || '33.33');
        const bottomRight = parseFloat(sizesObj.bottomRight || '33.34');
        return [top, topLeft, topMiddle, topRight, bottomLeft, bottomMiddle, bottomRight];
      } else if (layoutType === '6-grid-3x2') {
        // 6-grid-3x2 layout: Currently rendered as 2 columns x 3 rows in DynamicGridRenderer
        // But gridPositionCalculator expects 3 columns x 2 rows format:
        // [left width, leftTop height, leftBottom height, middle width, middleTop height, middleBottom height, rightTop height, rightBottom height]
        // 
        // Current rendering uses: left, leftTop, leftMiddle, leftBottom, rightTop, rightMiddle, rightBottom
        // We need to convert this to the format expected by gridPositionCalculator
        // 
        // For now, return the data as tracked by DynamicGridRenderer (2 columns x 3 rows):
        // [left width, leftTop, leftMiddle, leftBottom, rightTop, rightMiddle, rightBottom]
        const left = parseFloat(sizesObj.left || '50');
        const leftTop = parseFloat(sizesObj.leftTop || '33.33');
        const leftMiddle = parseFloat(sizesObj.leftMiddle || '33.33');
        const leftBottom = parseFloat(sizesObj.leftBottom || '33.34');
        const rightTop = parseFloat(sizesObj.rightTop || '33.33');
        const rightMiddle = parseFloat(sizesObj.rightMiddle || '33.33');
        const rightBottom = parseFloat(sizesObj.rightBottom || '33.34');

        return [left, leftTop, leftMiddle, leftBottom, rightTop, rightMiddle, rightBottom];
      } else if (layoutType === '6-grid-left-large') {
        // 6-grid-left-large: 1 large left panel + 5 right panels stacked vertically
        // Format: [left width, rightTop height, rightMiddle height, rightMiddle2 height, rightMiddle3 height, rightBottom height]
        // Looking at gridPositionCalculator.ts lines 855-887, the format is:
        // [left width, rightCell1 height, rightCell2 height, rightCell3 height, rightCell4 height, rightCell5 height]
        const left = parseFloat(sizesObj.left || '50');
        const rightTop = parseFloat(sizesObj.rightTop || '20');
        const rightMiddle = parseFloat(sizesObj.rightMiddle || '20');
        const rightMiddle2 = parseFloat(sizesObj.rightMiddle2 || '20');
        const rightBottom = parseFloat(sizesObj.rightBottom || '20');

        // The 5th cell height is calculated from the remaining space
        const rightCell5 = 100 - rightTop - rightMiddle - rightMiddle2 - rightBottom;

        return [left, rightTop, rightMiddle, rightMiddle2, rightBottom, rightCell5];
      } else if (layoutType === '8-grid-2x4') {
        // 8-grid-2x4: 2 columns x 4 rows (left column: area-1,3,5,7 / right column: area-2,4,6,8)
        // Format: [left width, leftTop height, leftTopMiddle height, leftBottomMiddle height, leftBottom height, rightTop height, rightTopMiddle height, rightBottomMiddle height, rightBottom height]
        const left = parseFloat(sizesObj.left || '50');
        const leftTop = parseFloat(sizesObj.top || '25');
        const leftTopMiddle = parseFloat(sizesObj.topMiddle1 || '25');
        const leftBottomMiddle = parseFloat(sizesObj.bottomMiddle1 || '25');
        const leftBottom = parseFloat(sizesObj.bottom || '25');
        const rightTop = parseFloat(sizesObj.rightTop || '25');
        const rightTopMiddle = parseFloat(sizesObj.rightTopMiddle || '25');
        const rightBottomMiddle = parseFloat(sizesObj.rightBottomMiddle || '25');
        const rightBottom = parseFloat(sizesObj.rightBottom || '25');

        return [left, leftTop, leftTopMiddle, leftBottomMiddle, leftBottom, rightTop, rightTopMiddle, rightBottomMiddle, rightBottom];
      } else if (layoutType === '8-grid-4x2') {
        // 8-grid-4x2: 2 rows x 4 columns (4 top cells, 4 bottom cells)
        // Format: [top height, topLeft width, topMiddle1 width, topMiddle2 width, topRight width, bottomLeft width, bottomMiddle1 width, bottomMiddle2 width, bottomRight width]
        const top = parseFloat(sizesObj.top || '50');
        const topLeft = parseFloat(sizesObj.topLeft || '25');
        const topMiddle1 = parseFloat(sizesObj.topMiddle1 || '25');
        const topMiddle2 = parseFloat(sizesObj.topMiddle2 || '25');
        const topRight = parseFloat(sizesObj.topRight || '25');
        const bottomLeft = parseFloat(sizesObj.bottomLeft || '25');
        const bottomMiddle1 = parseFloat(sizesObj.bottomMiddle1 || '25');
        const bottomMiddle2 = parseFloat(sizesObj.bottomMiddle2 || '25');
        const bottomRight = parseFloat(sizesObj.bottomRight || '25');

        return [top, topLeft, topMiddle1, topMiddle2, topRight, bottomLeft, bottomMiddle1, bottomMiddle2, bottomRight];
      } else if (layoutType === '32-grid-4x8') {
        // 4 columns x 8 rows: Format: [row1, row2, row3, row4, row5, row6, row7, col1, col2, col3]
        const row1 = parseFloat(sizesObj.row1 || '12.5');
        const row2 = parseFloat(sizesObj.row2 || '12.5');
        const row3 = parseFloat(sizesObj.row3 || '12.5');
        const row4 = parseFloat(sizesObj.row4 || '12.5');
        const row5 = parseFloat(sizesObj.row5 || '12.5');
        const row6 = parseFloat(sizesObj.row6 || '12.5');
        const row7 = parseFloat(sizesObj.row7 || '12.5');
        const col1 = parseFloat(sizesObj.col1 || '25');
        const col2 = parseFloat(sizesObj.col2 || '25');
        const col3 = parseFloat(sizesObj.col3 || '25');
        return [row1, row2, row3, row4, row5, row6, row7, col1, col2, col3];
      } else if (layoutType === '32-grid-8x4') {
        // 8 columns x 4 rows: Format: [row1, row2, row3, col1, col2, col3, col4, col5, col6, col7]
        const row1 = parseFloat(sizesObj.row1 || '25');
        const row2 = parseFloat(sizesObj.row2 || '25');
        const row3 = parseFloat(sizesObj.row3 || '25');
        const col1 = parseFloat(sizesObj.col1 || '12.5');
        const col2 = parseFloat(sizesObj.col2 || '12.5');
        const col3 = parseFloat(sizesObj.col3 || '12.5');
        const col4 = parseFloat(sizesObj.col4 || '12.5');
        const col5 = parseFloat(sizesObj.col5 || '12.5');
        const col6 = parseFloat(sizesObj.col6 || '12.5');
        const col7 = parseFloat(sizesObj.col7 || '12.5');
        return [row1, row2, row3, col1, col2, col3, col4, col5, col6, col7];
      } else if (layoutType === '9-grid') {
        // 3x3 grid: Format: [top height, topLeft width, topMiddle width, topRight width, middle height, middleLeft width, middleCenter width, middleRight width, bottomLeft width, bottomMiddle width, bottomRight width]
        const top = parseFloat(sizesObj.top || '33.33');
        const topLeft = parseFloat(sizesObj.topLeft || '33.33');
        const topMiddle = parseFloat(sizesObj.topMiddle || '33.33');
        const topRight = parseFloat(sizesObj.topRight || '33.34');
        const middle = parseFloat(sizesObj.middle || '33.33');
        const middleLeft = parseFloat(sizesObj.middleLeft || '33.33');
        const middleCenter = parseFloat(sizesObj.middleCenter || '33.33');
        const middleRight = parseFloat(sizesObj.middleRight || '33.34');
        const bottomLeft = parseFloat(sizesObj.bottomLeft || '33.33');
        const bottomMiddle = parseFloat(sizesObj.bottomMiddle || '33.33');
        const bottomRight = parseFloat(sizesObj.bottomRight || '33.34');
        return [top, topLeft, topMiddle, topRight, middle, middleLeft, middleCenter, middleRight, bottomLeft, bottomMiddle, bottomRight];
      } else if (layoutType === '8-grid-columns') {
        // 8 vertical columns: Format: [left, leftMiddle1, leftMiddle2, leftMiddle3, rightMiddle3, rightMiddle2, rightMiddle1, right]
        const left = parseFloat(sizesObj.left || '12.5');
        const leftMiddle1 = parseFloat(sizesObj.leftMiddle1 || '12.5');
        const leftMiddle2 = parseFloat(sizesObj.leftMiddle2 || '12.5');
        const leftMiddle3 = parseFloat(sizesObj.leftMiddle3 || '12.5');
        const rightMiddle3 = parseFloat(sizesObj.rightMiddle3 || '12.5');
        const rightMiddle2 = parseFloat(sizesObj.rightMiddle2 || '12.5');
        const rightMiddle1 = parseFloat(sizesObj.rightMiddle1 || '12.5');
        const right = parseFloat(sizesObj.right || '12.5');
        return [left, leftMiddle1, leftMiddle2, leftMiddle3, rightMiddle3, rightMiddle2, rightMiddle1, right];
      } else if (layoutType === '8-grid-rows') {
        // 8 horizontal rows: Format: [top, topMiddle1, topMiddle2, topMiddle3, bottomMiddle3, bottomMiddle2, bottomMiddle1, bottom]
        const top = parseFloat(sizesObj.top || '12.5');
        const topMiddle1 = parseFloat(sizesObj.topMiddle1 || '12.5');
        const topMiddle2 = parseFloat(sizesObj.topMiddle2 || '12.5');
        const topMiddle3 = parseFloat(sizesObj.topMiddle3 || '12.5');
        const bottomMiddle3 = parseFloat(sizesObj.bottomMiddle3 || '12.5');
        const bottomMiddle2 = parseFloat(sizesObj.bottomMiddle2 || '12.5');
        const bottomMiddle1 = parseFloat(sizesObj.bottomMiddle1 || '12.5');
        const bottom = parseFloat(sizesObj.bottom || '12.5');
        return [top, topMiddle1, topMiddle2, topMiddle3, bottomMiddle3, bottomMiddle2, bottomMiddle1, bottom];
      }
      // For other layouts, return null to use saved grid sizes
      return null;
    } catch (error) {
      return null;
    }
  }, []);

  // Handler to save grid positions when ResizableGrid components are resized
  const handleResizeStop = useCallback(async (areaId: string, size: { width: number; height: number }) => {
    // Call the original callback if provided
    onResizeStop?.(areaId, size);

    // OPTIMIZATION: Skip saving for nested layouts that have custom onSaveRequired handlers
    // These layouts handle their own saving to prevent duplicate API calls
    const nestedLayoutsWithCustomSave = [
      '3-grid-left-large',
      '3-grid-right-large',
      '3-grid-top-large',
      '3-grid-bottom-large',
      '4-grid',
      '4-grid-top-large',
      '4-grid-left-large',
      '4-grid-right-large',
      '4-grid-bottom-large',
      '5-grid-complex',
      '6-grid-2x3',
      '6-grid-3x2',
      '6-grid-left-large',
      '7-grid-complex1',
      '7-grid-left',
      '7-grid-complex2',
      '7-grid-large',
      '8-grid-2x4',
      '8-grid-4x2',
      '9-grid',
      '12-grid-3x4',
      '12-grid-4x3',
      '16-grid',
      '24-grid-4x6',
      '24-grid-6x4',
      '24-grid-3x8',
      '24-grid-8x3',
      '28-grid-4x7',
      '28-grid-7x4',
      '32-grid-4x8',
      '32-grid-8x4'
    ];

    if (nestedLayoutsWithCustomSave.includes(layout)) {
      return;
    }

    // Save grid positions if templateId and layout are available
    if (!templateId) {
      return;
    }

    if (!layout) {
      return;
    }

    try {
      // Add a small delay to ensure DOM has updated after resize
      // This gives React time to process any pending state updates from handleResize
      await new Promise(resolve => setTimeout(resolve, 50));

      // Use ref to get the latest gridSizes (avoids stale closure from async state updates)
      // This ensures we read the most recent values that were updated by handleResize
      const finalGridSizes = gridSizesRef.current;

      // Convert from object-based gridSizes to array format
      let gridSizesArray: number[] | null = convertGridSizesToArray(layout, finalGridSizes);

      if (!gridSizesArray || gridSizesArray.length === 0) {
        // Fallback: Try to get from localStorage
        const { templateGridSizesStorage } = await import('@/lib/templateGridSizes');
        const savedGridSizes = templateGridSizesStorage.getTemplateGridSizes(templateId);

        if (savedGridSizes && savedGridSizes.layoutType === layout && savedGridSizes.cellSizes.length > 0) {
          gridSizesArray = savedGridSizes.cellSizes.map(cell => cell.width);
        }
      } else {
        // Save updated gridSizes to localStorage
        const { templateGridSizesStorage } = await import('@/lib/templateGridSizes');
        templateGridSizesStorage.saveTemplateGridSizes(
          templateId,
          layout,
          gridSizesArray
        );
      }

      if (gridSizesArray && gridSizesArray.length > 0) {
        const templateIdNum = parseInt(templateId, 10);
        if (!isNaN(templateIdNum)) {
          const { mapLayoutToApiCode, calculateGridPositions } = await import('@/utils/gridPositionCalculator');
          const { insertMainGridPosition } = await import('@/lib/gridPositionApi');

          const apiLayoutCode = mapLayoutToApiCode(layout);
          const positions = calculateGridPositions(
            layout as LayoutType,
            gridSizesArray,
            apiLayoutCode
          );

          const result = await insertMainGridPosition(
            templateIdNum,
            positions.Top,
            positions.Left,
            positions.Height,
            positions.Width
          );

        }
      }
    } catch (error) {
      // Error in handleResizeStop
    }
  }, [onResizeStop, templateId, layout, convertGridSizesToArray, gridSizesRef]);

  // Render the layout with ResizableGrid components for common layouts
  // (renderLayout function is defined earlier in the file at line 960)

  // If no layout config found, fallback to empty
  if (!layoutConfig) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p>Layout not supported: {layout}</p>
          <p className="text-xs mt-2">Please check layout configuration</p>
        </div>
      </div>
    );
  }

  // Return the rendered layout wrapped in ResizableGridProvider
  return (
    <ResizableGridProvider
      onResize={handleResize}
      onResizeStop={handleResizeStop}
    >
      <div className="w-full h-full flex flex-col">
        {renderLayout()}
      </div>
    </ResizableGridProvider>
  );
}
