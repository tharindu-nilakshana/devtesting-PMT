/**
 * Coordinate Integration Utilities
 * 
 * Functions to integrate the dynamic layout system with the existing coordinate system.
 * This handles the conversion between saved coordinates and dynamic layout areas.
 */

import { LayoutConfig } from '@/types/layouts';

/**
 * Convert saved widget coordinates to area-based coordinates
 */
export function convertCoordinatesToAreas(
  widgets: any[],
  layoutConfig: LayoutConfig,
  savedCoordinates: Record<string, any>
): Record<string, any> {
  const areaCoordinates: Record<string, any> = {};

  widgets.forEach(widget => {
    const areaId = widget.position;
    const savedCoord = savedCoordinates[widget.id];
    
    // Only add coordinates if they exist and are valid
    if (savedCoord && typeof savedCoord === 'object') {
      const top = savedCoord.TopPos ?? savedCoord.top ?? savedCoord.Top ?? 0;
      const left = savedCoord.LeftPos ?? savedCoord.left ?? savedCoord.Left ?? 0;
      const width = savedCoord.Width ?? savedCoord.width ?? 400;
      const height = savedCoord.Height ?? savedCoord.height ?? 300;

      // Validate that we have valid numeric values
      if (
        typeof top === 'number' && !isNaN(top) &&
        typeof left === 'number' && !isNaN(left) &&
        typeof width === 'number' && !isNaN(width) && width > 0 &&
        typeof height === 'number' && !isNaN(height) && height > 0
      ) {
        areaCoordinates[areaId] = {
          TopPos: top,
          LeftPos: left,
          Width: width,
          Height: height
        };
      }
    }
  });

  return areaCoordinates;
}

/**
 * Convert area-based coordinates back to widget coordinates
 */
export function convertAreasToCoordinates(
  areaCoordinates: Record<string, any>,
  widgets: any[]
): Record<string, any> {
  const widgetCoordinates: Record<string, any> = {};

  widgets.forEach(widget => {
    const areaId = widget.position;
    const areaCoord = areaCoordinates[areaId];
    
    if (areaCoord) {
      widgetCoordinates[widget.id] = {
        TopPos: areaCoord.TopPos,
        LeftPos: areaCoord.LeftPos,
        Width: areaCoord.Width,
        Height: areaCoord.Height
      };
    }
  });

  return widgetCoordinates;
}

/**
 * Calculate default grid sizes from layout configuration
 */
export function calculateDefaultGridSizes(layoutConfig: LayoutConfig): Record<string, string> {
  const sizes: Record<string, string> = {};
  
  // For simple layouts, use equal splits
  if (layoutConfig.structure.splits.length === 0) {
    return sizes;
  }

  layoutConfig.structure.splits.forEach(split => {
    if (split.direction === 'vertical') {
      // Handle vertical splits
      const totalRatio = split.ratio.reduce((sum, ratio) => sum + ratio, 0);
      let currentPosition = 0;
      
      split.ratio.forEach((ratio, index) => {
        const percentage = (ratio / totalRatio) * 100;
        sizes[`split-${index}`] = `${percentage}%`;
        currentPosition += percentage;
      });
    } else if (split.direction === 'horizontal') {
      // Handle horizontal splits
      const totalRatio = split.ratio.reduce((sum, ratio) => sum + ratio, 0);
      let currentPosition = 0;
      
      split.ratio.forEach((ratio, index) => {
        const percentage = (ratio / totalRatio) * 100;
        sizes[`split-h-${index}`] = `${percentage}%`;
        currentPosition += percentage;
      });
    }
  });

  return sizes;
}

/**
 * Apply coordinate-based sizing to dynamic areas
 */
export function applyCoordinateSizing(
  layoutConfig: LayoutConfig,
  areaCoordinates: Record<string, any>
): Record<string, any> {
  const sizedAreas: Record<string, any> = {};

  layoutConfig.structure.areas.forEach(area => {
    const coordinates = areaCoordinates[area.id];
    
    if (coordinates) {
      sizedAreas[area.id] = {
        ...area,
        size: {
          width: coordinates.Width,
          height: coordinates.Height
        }
      };
    } else {
      sizedAreas[area.id] = area;
    }
  });

  return sizedAreas;
}

/**
 * Generate filled areas array from layout configuration
 */
export function generateFilledAreas(layoutConfig: LayoutConfig): string[] {
  return layoutConfig.structure.areas.map(area => area.id);
}

/**
 * Check if layout supports dynamic resizing
 */
export function supportsDynamicResizing(layoutConfig: LayoutConfig): boolean {
  // Simple layouts (1-2 cells) always support resizing
  if (layoutConfig.cells <= 2) {
    return true;
  }
  
  // Complex layouts need to be evaluated case by case
  // For now, we'll be conservative and only enable for simple layouts
  return layoutConfig.cells <= 4;
}
