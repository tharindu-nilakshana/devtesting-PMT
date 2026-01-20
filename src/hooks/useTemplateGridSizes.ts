/**
 * Hook for managing grid sizes in BloombergDashboard
 * Works with ResizableGrid components and template system
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { templateGridSizesStorage } from '../lib/templateGridSizes';
import type { GridLayout } from '../components/bloomberg-ui/LayoutSelector';

interface CellSizeData {
  width: number;
  height: number;
}

export function useTemplateGridSizes(activeTemplateId: string | null, layout: GridLayout) {
  const [cellSizes, setCellSizes] = useState<Record<string, CellSizeData>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // Load saved grid sizes when template or layout changes
  useEffect(() => {
    if (!activeTemplateId || !layout || layout === 'free-floating') return;

    const savedSizes = templateGridSizesStorage.getTemplateGridSizes(activeTemplateId);
    if (savedSizes && savedSizes.layoutType === layout) {
      console.log('📐 Loading saved grid sizes for template:', activeTemplateId);
      // Convert saved sizes back to cell sizes object
      const loadedCellSizes: Record<string, CellSizeData> = {};
      savedSizes.cellSizes.forEach((cell, index) => {
        loadedCellSizes[`area-${index + 1}`] = {
          width: cell.width || 0,
          height: cell.height || 0
        };
      });
      setCellSizes(loadedCellSizes);
    } else {
      // Reset to empty (will use default sizes)
      setCellSizes({});
    }
  }, [activeTemplateId, layout]);

  // Handler for when a cell is resized
  const handleCellResize = useCallback((position: string, size: { width: number; height: number }) => {
    setCellSizes(prev => ({
      ...prev,
      [position]: size
    }));
  }, []);

  // Save grid sizes when resize stops and we have all necessary data
  useEffect(() => {
    if (!activeTemplateId || !layout || layout === 'free-floating') return;
    if (Object.keys(cellSizes).length === 0) return;

    // Get container dimensions for percentage calculation
    if (!containerRef.current) return;

    const containerWidth = containerRef.current.offsetWidth;
    const containerHeight = containerRef.current.offsetHeight;

    // Convert pixel sizes to percentages based on layout type
    const percentages = convertToPercentages(layout, cellSizes, containerWidth, containerHeight);

    if (percentages.length > 0) {
      console.log('💾 Saving grid sizes for template:', activeTemplateId, percentages);
      templateGridSizesStorage.saveTemplateGridSizes(
        activeTemplateId,
        layout,
        percentages
      );
    }
  }, [activeTemplateId, layout, cellSizes]);

  // Get size for a specific cell (returns percentage string or undefined)
  const getCellSize = useCallback((position: string, dimension: 'width' | 'height'): string | undefined => {
    const size = cellSizes[position];
    if (!size || !containerRef.current) return undefined;

    const containerSize = dimension === 'width' 
      ? containerRef.current.offsetWidth 
      : containerRef.current.offsetHeight;

    if (containerSize === 0) return undefined;

    const percentage = (size[dimension] / containerSize) * 100;
    return `${percentage.toFixed(2)}%`;
  }, [cellSizes]);

  return {
    containerRef,
    cellSizes,
    handleCellResize,
    getCellSize
  };
}

/**
 * Convert cell sizes to percentage array based on layout type
 */
function convertToPercentages(
  layout: GridLayout,
  cellSizes: Record<string, CellSizeData>,
  containerWidth: number,
  containerHeight: number
): number[] {
  const percentages: number[] = [];

  // Get number of cells for this layout
  const cellCount = getLayoutCellCount(layout);

  for (let i = 1; i <= cellCount; i++) {
    const position = `area-${i}`;
    const size = cellSizes[position];

    if (!size) continue;

    // Determine if this layout uses width or height for this cell
    const isVertical = isLayoutVertical(layout);
    const containerSize = isVertical ? containerHeight : containerWidth;
    const cellSize = isVertical ? size.height : size.width;

    if (containerSize > 0) {
      const percentage = (cellSize / containerSize) * 100;
      percentages.push(Math.round(percentage * 100) / 100); // Round to 2 decimals
    }
  }

  return percentages;
}

/**
 * Get the number of cells in a layout
 */
function getLayoutCellCount(layout: GridLayout): number {
  if (layout.includes('32-grid')) return 32;
  if (layout.includes('28-grid')) return 28;
  if (layout.includes('24-grid')) return 24;
  if (layout.includes('16-grid')) return 16;
  if (layout.includes('12-grid')) return 12;
  if (layout.includes('9-grid')) return 9;
  if (layout.includes('8-grid')) return 8;
  if (layout.includes('7-grid')) return 7;
  if (layout.includes('6-grid')) return 6;
  if (layout.includes('5-grid')) return 5;
  if (layout.includes('4-grid')) return 4;
  if (layout.includes('3-grid')) return 3;
  if (layout.includes('2-grid')) return 2;
  if (layout === '1-grid') return 1;
  return 0;
}

/**
 * Determine if a layout is primarily vertical (rows) or horizontal (columns)
 */
function isLayoutVertical(layout: GridLayout): boolean {
  return layout.includes('horizontal') || layout.includes('rows');
}


