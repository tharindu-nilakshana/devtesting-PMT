/**
 * Grid Position Parser
 * 
 * Parses grid position strings from API and converts them to coordinates
 * Format: "g32_1:21.9033%|g32_2:33.2285%"
 */

import { GridPosition } from '@/lib/gridPositionApi';

/**
 * Parse width string to extract percentages for each grid cell
 * Example: "g32_1:21.9033%|g32_2:33.2285%" -> [21.9033, 33.2285]
 * Handles both simple percentages and calc() expressions
 */
export function parseWidthPercentages(widthString: string): number[] {
  const percentages: number[] = [];
  
  if (!widthString || typeof widthString !== 'string') {
    console.warn('⚠️ [GridPositionParser] Invalid widthString:', widthString);
    return percentages;
  }
  
  // Split by pipe to get individual cell definitions
  const parts = widthString.split('|').filter(part => part.trim().length > 0);
  
  for (const part of parts) {
    let percentage: number | null = null;
    
    // Handle calc() expressions like "calc(14.4850% - 2px)" or "calc(43.7112% - 2px)"
    // Extract the percentage from inside calc()
    const calcMatch = part.match(/calc\(([\d.]+)%/);
    if (calcMatch) {
      percentage = parseFloat(calcMatch[1]);
    } else {
      // Handle simple percentage (format: "gXX_N:XX.XXXX%" or just "XX.XXXX%")
      const match = part.match(/:\s*([\d.]+)%|([\d.]+)%/);
      if (match) {
        percentage = parseFloat(match[1] || match[2]);
      }
    }
    
    if (percentage !== null && !isNaN(percentage)) {
      percentages.push(percentage);
    } else {
      console.warn('⚠️ [GridPositionParser] Could not parse percentage from:', part);
    }
  }
  
  return percentages;
}

/**
 * Parse height string to extract percentages for each grid cell
 * Example: "g22_1:50%|g22_2:50%" -> [50, 50]
 * Also handles calc() expressions like "calc(14.4850% - 2px)"
 */
export function parseHeightPercentages(heightString: string): number[] {
  const percentages: number[] = [];
  
  if (!heightString || typeof heightString !== 'string') {
    console.warn('⚠️ [GridPositionParser] Invalid heightString:', heightString);
    return percentages;
  }
  
  // Split by pipe to get individual cell definitions
  const parts = heightString.split('|').filter(part => part.trim().length > 0);
  
  for (const part of parts) {
    let percentage: number | null = null;
    
    // Handle calc() expressions like "calc(14.4850% - 2px)" or "calc(43.7112% - 2px)"
    // Extract the percentage from inside calc()
    const calcMatch = part.match(/calc\(([\d.]+)%/);
    if (calcMatch) {
      percentage = parseFloat(calcMatch[1]);
    } else {
      // Handle simple percentage (format: "gXX_N:XX.XXXX%" or just "XX.XXXX%")
      const match = part.match(/:\s*([\d.]+)%|([\d.]+)%/);
      if (match) {
        percentage = parseFloat(match[1] || match[2]);
      }
    }
    
    if (percentage !== null && !isNaN(percentage)) {
      percentages.push(percentage);
    } else {
      console.warn('⚠️ [GridPositionParser] Could not parse percentage from:', part);
    }
  }
  
  return percentages;
}

/**
 * Convert grid position data to coordinates for grid cells
 * Returns an array of coordinates in order of grid areas
 */
export function convertGridPositionToCoordinates(
  gridPosition: GridPosition,
  layout: string,
  containerWidth: number = 1600,
  containerHeight: number = 1200
): Array<{ top: number; left: number; width: number; height: number }> {
  const coordinates: Array<{ top: number; left: number; width: number; height: number }> = [];
  
  // Parse width and height percentages
  const widthPercentages = parseWidthPercentages(gridPosition.Width);
  const heightPercentages = parseHeightPercentages(gridPosition.Height);
  
  // Parse left positions
  const leftPositions: number[] = [];
  const leftParts = gridPosition.Left.split('|');
  for (const part of leftParts) {
    // Handle calc() expressions like "calc(21.9033% + 2px)"
    const calcMatch = part.match(/calc\(([\d.]+)%\s*\+\s*(\d+)px\)/);
    if (calcMatch) {
      const percent = parseFloat(calcMatch[1]);
      const px = parseFloat(calcMatch[2]);
      leftPositions.push((containerWidth * percent / 100) + px);
    } else {
      // Handle simple percentage or 0
      const simpleMatch = part.match(/:\s*([\d.]+)%/);
      if (simpleMatch) {
        leftPositions.push(containerWidth * parseFloat(simpleMatch[1]) / 100);
      } else if (part.includes(':0')) {
        leftPositions.push(0);
      }
    }
  }
  
  // Parse top positions
  const topPositions: number[] = [];
  const topParts = gridPosition.Top.split('|');
  for (const part of topParts) {
    // Handle calc() expressions
    const calcMatch = part.match(/calc\(([\d.]+)%\s*\+\s*(\d+)px\)/);
    if (calcMatch) {
      const percent = parseFloat(calcMatch[1]);
      const px = parseFloat(calcMatch[2]);
      topPositions.push((containerHeight * percent / 100) + px);
    } else if (part.includes(':0')) {
      topPositions.push(0);
    } else {
      const match = part.match(/:\s*([\d.]+)%/);
      if (match) {
        topPositions.push(containerHeight * parseFloat(match[1]) / 100);
      }
    }
  }
  
  // Parse height - handle calc() expressions like "calc(-50px + 100vh)"
  const parsedHeights: number[] = [];
  const heightParts = gridPosition.Height.split('|');
  for (const part of heightParts) {
    // Handle "calc(-50px + 100vh)" - approximate as full height minus header
    if (part.includes('calc(-50px + 100vh)')) {
      parsedHeights.push(containerHeight);
    } else {
      // Try to extract percentage if available
      const match = part.match(/:\s*([\d.]+)%/);
      if (match) {
        parsedHeights.push(containerHeight * parseFloat(match[1]) / 100);
      } else {
        // Fallback to full height
        parsedHeights.push(containerHeight);
      }
    }
  }
  
  // Build coordinates array - use the count from width percentages as it's most reliable
  const cellCount = Math.max(widthPercentages.length, parsedHeights.length, leftPositions.length, topPositions.length);
  
  for (let i = 0; i < cellCount; i++) {
    // Calculate width from percentage
    const widthPercent = widthPercentages[i] || 0;
    const width = widthPercent > 0 ? (containerWidth * widthPercent / 100) : (cellCount > 0 ? containerWidth / cellCount : containerWidth);
    
    // Use parsed height or fallback to percentage calculation
    const height = parsedHeights[i] || (heightPercentages[i] ? (containerHeight * heightPercentages[i] / 100) : containerHeight);
    
    // Use parsed positions
    const left = leftPositions[i] ?? 0;
    const top = topPositions[i] ?? 0;
    
    coordinates.push({ top, left, width, height });
  }
  
  return coordinates;
}

