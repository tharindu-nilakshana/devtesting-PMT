/**
 * Dynamic Coordinate Calculator
 * 
 * Calculates grid sizes for any layout based on saved widget coordinates.
 * This replaces all manual layout cases with a single dynamic system.
 */

import { LayoutConfig } from '@/types/layouts';
import { getLayoutConfigByName } from '@/config/layouts';

interface WidgetCoordinate {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface GridSizes {
  [key: string]: string;
}

/**
 * Validate that a coordinate has all required properties with valid numeric values
 */
function isValidCoordinate(coord: any): coord is WidgetCoordinate {
  return (
    coord != null &&
    typeof coord === 'object' &&
    typeof coord.top === 'number' &&
    typeof coord.left === 'number' &&
    typeof coord.width === 'number' &&
    typeof coord.height === 'number' &&
    !isNaN(coord.top) &&
    !isNaN(coord.left) &&
    !isNaN(coord.width) &&
    !isNaN(coord.height) &&
    coord.width > 0 &&
    coord.height > 0
  );
}

/**
 * Calculate grid sizes dynamically for any layout
 */
export function calculateDynamicGridSizes(
  layout: string,
  coordinates: WidgetCoordinate[]
): GridSizes {
  // Filter out invalid coordinates
  const validCoordinates = coordinates.filter(isValidCoordinate);
  
  if (validCoordinates.length === 0) {
    return getDefaultGridSizes(layout);
  }

  // Handle specific layouts directly for accurate coordinate calculation
  switch (layout) {
    case "4-grid":
      return calculate4GridSizesFromCoordinates(validCoordinates);
    case "2-grid-vertical":
      return calculate2GridVerticalSizesFromCoordinates(validCoordinates);
    case "2-grid-horizontal":
      return calculate2GridHorizontalSizesFromCoordinates(validCoordinates);
    case "3-grid-left-large":
      return calculate3GridLeftLargeSizesFromCoordinates(validCoordinates);
    case "3-grid-right-large":
      return calculate3GridRightLargeSizesFromCoordinates(validCoordinates);
    case "3-grid-bottom-large":
      return calculate3GridBottomLargeSizesFromCoordinates(validCoordinates);
    case "3-grid-top-large":
      return calculate3GridTopLargeSizesFromCoordinates(validCoordinates);
    case "3-grid-rows":
      return calculate3GridRowsSizesFromCoordinates(validCoordinates);
    case "3-grid-columns":
      return calculate3GridColumnsSizesFromCoordinates(validCoordinates);
    case "5-grid-rows":
      return calculate5GridRowsSizesFromCoordinates(validCoordinates);
    case "5-grid-columns":
      return calculate5GridColumnsSizesFromCoordinates(validCoordinates);
    case "5-grid-complex":
      return calculate5GridComplexSizesFromCoordinates(validCoordinates);
    case "6-grid-2x3":
      return calculate6Grid2x3SizesFromCoordinates(validCoordinates);
    case "6-grid-3x2":
      return calculate6Grid3x2SizesFromCoordinates(validCoordinates);
    case "6-grid-rows":
      return calculate6GridRowsSizesFromCoordinates(validCoordinates);
    case "8-grid-2x4":
      return calculate8Grid2x4SizesFromCoordinates(validCoordinates);
    case "8-grid-4x2":
      return calculate8Grid4x2SizesFromCoordinates(validCoordinates);
    default:
      return getDefaultGridSizes(layout);
  }
}

/**
 * Calculate 4-grid sizes from coordinates
 * For 4-grid: area-1 (top-left), area-2 (top-right), area-3 (bottom-left), area-4 (bottom-right)
 */
function calculate4GridSizesFromCoordinates(coordinates: WidgetCoordinate[]): GridSizes {
  if (coordinates.length < 4) {
    return { top: "50%", bottom: "50%", left: "50%", right: "50%" };
  }

  // Validate we have enough valid coordinates
  if (!coordinates[0] || !coordinates[1] || !coordinates[2] || !coordinates[3]) {
    return { top: "50%", bottom: "50%", left: "50%", right: "50%" };
  }

  // Sort coordinates by area (assuming they're in order: area-1, area-2, area-3, area-4)
  const sortedCoords = [...coordinates].sort((a, b) => {
    // Sort by TopPos first, then LeftPos
    if (a.top !== b.top) return a.top - b.top;
    return a.left - b.left;
  });

  // Calculate horizontal split (top vs bottom)
  const topRowHeight = sortedCoords[0].height; // area-1 height
  const bottomRowHeight = sortedCoords[2].height; // area-3 height
  const totalHeight = topRowHeight + bottomRowHeight;
  if (totalHeight === 0) {
    return { top: "50%", bottom: "50%", left: "50%", right: "50%" };
  }
  const topRatio = parseFloat(((topRowHeight / totalHeight) * 100).toFixed(4));
  const bottomRatio = parseFloat((100 - topRatio).toFixed(4));

  // Calculate vertical split (left vs right) for top row
  const topLeftWidth = sortedCoords[0].width; // area-1 width
  const topRightWidth = sortedCoords[1].width; // area-2 width
  const topTotalWidth = topLeftWidth + topRightWidth;
  if (topTotalWidth === 0) {
    return { top: `${topRatio}%`, bottom: `${bottomRatio}%`, left: "50%", right: "50%" };
  }
  const topLeftRatio = parseFloat(((topLeftWidth / topTotalWidth) * 100).toFixed(4));
  const topRightRatio = parseFloat((100 - topLeftRatio).toFixed(4));

  // Calculate vertical split (left vs right) for bottom row
  const bottomLeftWidth = sortedCoords[2].width; // area-3 width
  const bottomRightWidth = sortedCoords[3].width; // area-4 width
  const bottomTotalWidth = bottomLeftWidth + bottomRightWidth;
  if (bottomTotalWidth === 0) {
    return { top: `${topRatio}%`, bottom: `${bottomRatio}%`, left: "50%", right: "50%" };
  }
  const bottomLeftRatio = parseFloat(((bottomLeftWidth / bottomTotalWidth) * 100).toFixed(4));
  const bottomRightRatio = parseFloat((100 - bottomLeftRatio).toFixed(4));

  const result = {
    top: `${topRatio}%`,
    bottom: `${bottomRatio}%`,
    topLeft: `${topLeftRatio}%`,
    topRight: `${topRightRatio}%`,
    bottomLeft: `${bottomLeftRatio}%`,
    bottomRight: `${bottomRightRatio}%`
  };

  return result;
}

/**
 * Calculate 2-grid-vertical sizes from coordinates
 */
function calculate2GridVerticalSizesFromCoordinates(coordinates: WidgetCoordinate[]): GridSizes {
  if (coordinates.length < 2) {
    return { left: "50%", right: "50%" };
  }

  // Validate coordinates exist and have required properties
  const coord0 = coordinates[0];
  const coord1 = coordinates[1];
  if (!coord0 || !coord1 || coord0.width == null || coord1.width == null) {
    return { left: "50%", right: "50%" };
  }

  const leftWidth = coord0.width;
  const rightWidth = coord1.width;
  const totalWidth = leftWidth + rightWidth;
  if (totalWidth === 0) {
    return { left: "50%", right: "50%" };
  }
  const leftRatio = ((leftWidth / totalWidth) * 100).toFixed(4);
  const rightRatio = (100 - parseFloat(leftRatio)).toFixed(4);

  const result = {
    left: `${leftRatio}%`,
    right: `${rightRatio}%`
  };

  return result;
}

/**
 * Calculate 2-grid-horizontal sizes from coordinates
 */
function calculate2GridHorizontalSizesFromCoordinates(coordinates: WidgetCoordinate[]): GridSizes {
  if (coordinates.length < 2) {
    return { top: "50%", bottom: "50%" };
  }

  // Validate coordinates exist and have required properties
  const coord0 = coordinates[0];
  const coord1 = coordinates[1];
  if (!coord0 || !coord1 || coord0.height == null || coord1.height == null) {
    return { top: "50%", bottom: "50%" };
  }

  const topHeight = coord0.height;
  const bottomHeight = coord1.height;
  const totalHeight = topHeight + bottomHeight;
  if (totalHeight === 0) {
    return { top: "50%", bottom: "50%" };
  }
  const topRatio = ((topHeight / totalHeight) * 100).toFixed(4);
  const bottomRatio = (100 - parseFloat(topRatio)).toFixed(4);

  const result = {
    top: `${topRatio}%`,
    bottom: `${bottomRatio}%`
  };

  return result;
}

/**
 * Calculate 3-grid-left-large sizes from coordinates
 */
function calculate3GridLeftLargeSizesFromCoordinates(coordinates: WidgetCoordinate[]): GridSizes {
  if (coordinates.length < 3) {
    return { left: "50%", rightTop: "50%", rightBottom: "50%" };
  }

  // Validate we have enough valid coordinates
  if (!coordinates[0] || !coordinates[1] || !coordinates[2]) {
    return { left: "50%", rightTop: "50%", rightBottom: "50%" };
  }

  // Sort by position: left column first, then right column
  const sortedCoords = [...coordinates].sort((a, b) => {
    if (a.left !== b.left) return a.left - b.left;
    return a.top - b.top;
  });

  const leftWidth = sortedCoords[0].width;
  const rightWidth = sortedCoords[1].width;
  const totalWidth = leftWidth + rightWidth;
  if (totalWidth === 0) {
    return { left: "50%", rightTop: "50%", rightBottom: "50%" };
  }
  const leftRatio = parseFloat(((leftWidth / totalWidth) * 100).toFixed(4));
  const rightRatio = parseFloat((100 - leftRatio).toFixed(4));

  const rightTopHeight = sortedCoords[1].height;
  const rightBottomHeight = sortedCoords[2].height;
  const rightTotalHeight = rightTopHeight + rightBottomHeight;
  if (rightTotalHeight === 0) {
    return { left: `${leftRatio}%`, right: `${rightRatio}%`, rightTop: "50%", rightBottom: "50%" };
  }
  const rightTopRatio = parseFloat(((rightTopHeight / rightTotalHeight) * 100).toFixed(4));
  const rightBottomRatio = parseFloat((100 - rightTopRatio).toFixed(4));

  const result = {
    left: `${leftRatio}%`,
    right: `${rightRatio}%`,
    rightTop: `${rightTopRatio}%`,
    rightBottom: `${rightBottomRatio}%`
  };

  return result;
}

/**
 * Calculate 3-grid-right-large sizes from coordinates
 */
function calculate3GridRightLargeSizesFromCoordinates(coordinates: WidgetCoordinate[]): GridSizes {
  if (coordinates.length < 3) {
    return { leftTop: "50%", leftBottom: "50%", right: "50%" };
  }

  // Sort by position: left column first, then right column
  const sortedCoords = coordinates.sort((a, b) => {
    if (a.left !== b.left) return a.left - b.left;
    return a.top - b.top;
  });

  const leftWidth = sortedCoords[0].width;
  const rightWidth = sortedCoords[2].width;
  const totalWidth = leftWidth + rightWidth;
  const leftRatio = parseFloat(((leftWidth / totalWidth) * 100).toFixed(4));
  const rightRatio = parseFloat((100 - leftRatio).toFixed(4));

  const leftTopHeight = sortedCoords[0].height;
  const leftBottomHeight = sortedCoords[1].height;
  const leftTotalHeight = leftTopHeight + leftBottomHeight;
  const leftTopRatio = parseFloat(((leftTopHeight / leftTotalHeight) * 100).toFixed(4));
  const leftBottomRatio = parseFloat((100 - leftTopRatio).toFixed(4));

  const result = {
    left: `${leftRatio}%`,
    right: `${rightRatio}%`,
    leftTop: `${leftTopRatio}%`,
    leftBottom: `${leftBottomRatio}%`
  };

  return result;
}

/**
 * Calculate 3-grid-bottom-large sizes from coordinates
 */
function calculate3GridBottomLargeSizesFromCoordinates(coordinates: WidgetCoordinate[]): GridSizes {
  if (coordinates.length < 3) {
    return { topLeft: "50%", topRight: "50%", bottom: "50%" };
  }

  // Sort by position: top row first, then bottom row
  const sortedCoords = coordinates.sort((a, b) => {
    if (a.top !== b.top) return a.top - b.top;
    return a.left - b.left;
  });

  const topHeight = sortedCoords[0].height;
  const bottomHeight = sortedCoords[2].height;
  const totalHeight = topHeight + bottomHeight;
  const topRatio = parseFloat(((topHeight / totalHeight) * 100).toFixed(4));
  const bottomRatio = parseFloat((100 - topRatio).toFixed(4));

  const topLeftWidth = sortedCoords[0].width;
  const topRightWidth = sortedCoords[1].width;
  const topTotalWidth = topLeftWidth + topRightWidth;
  const topLeftRatio = parseFloat(((topLeftWidth / topTotalWidth) * 100).toFixed(4));
  const topRightRatio = parseFloat((100 - topLeftRatio).toFixed(4));

  const result = {
    top: `${topRatio}%`,
    bottom: `${bottomRatio}%`,
    topLeft: `${topLeftRatio}%`,
    topRight: `${topRightRatio}%`
  };

  return result;
}

/**
 * Calculate 5-grid-rows sizes from coordinates
 * 5 widgets stacked vertically
 */
function calculate5GridRowsSizesFromCoordinates(coordinates: WidgetCoordinate[]): GridSizes {
  if (coordinates.length < 5) {
    return { 
      top: "20%", 
      topMiddle1: "20%", 
      topMiddle2: "20%", 
      bottomMiddle: "20%", 
      bottom: "20%" 
    };
  }

  // Sort by top position (vertical order)
  const sortedCoords = coordinates.sort((a, b) => a.top - b.top);

  const heights = sortedCoords.map(coord => coord.height);
  const totalHeight = heights.reduce((sum, height) => sum + height, 0);
  
  const ratios = heights.map(height => parseFloat(((height / totalHeight) * 100).toFixed(4)));
  
  // Ensure ratios sum to 100% (adjust last one if needed due to rounding)
  const totalRatio = ratios.reduce((sum, ratio) => sum + ratio, 0);
  if (Math.abs(totalRatio - 100) > 0.01) {
    ratios[ratios.length - 1] = parseFloat((ratios[ratios.length - 1] + (100 - totalRatio)).toFixed(4));
  }

  const result = {
    top: `${ratios[0]}%`,
    topMiddle1: `${ratios[1]}%`,
    topMiddle2: `${ratios[2]}%`,
    bottomMiddle: `${ratios[3]}%`,
    bottom: `${ratios[4]}%`
  };

  return result;
}

/**
 * Calculate 5-grid-columns sizes from coordinates
 * 5 widgets arranged horizontally
 */
function calculate5GridColumnsSizesFromCoordinates(coordinates: WidgetCoordinate[]): GridSizes {
  if (coordinates.length < 5) {
    return { 
      left: "20%", 
      leftMiddle1: "20%", 
      leftMiddle2: "20%", 
      rightMiddle: "20%", 
      right: "20%" 
    };
  }

  // Sort by left position (horizontal order)
  const sortedCoords = coordinates.sort((a, b) => a.left - b.left);

  const widths = sortedCoords.map(coord => coord.width);
  const totalWidth = widths.reduce((sum, width) => sum + width, 0);
  
  const ratios = widths.map(width => parseFloat(((width / totalWidth) * 100).toFixed(4)));
  
  // Ensure ratios sum to 100% (adjust last one if needed due to rounding)
  const totalRatio = ratios.reduce((sum, ratio) => sum + ratio, 0);
  if (Math.abs(totalRatio - 100) > 0.01) {
    ratios[ratios.length - 1] = parseFloat((ratios[ratios.length - 1] + (100 - totalRatio)).toFixed(4));
  }

  const result = {
    left: `${ratios[0]}%`,
    leftMiddle1: `${ratios[1]}%`,
    leftMiddle2: `${ratios[2]}%`,
    rightMiddle: `${ratios[3]}%`,
    right: `${ratios[4]}%`
  };

  return result;
}

/**
 * Calculate 5-grid-complex sizes from coordinates
 * Complex layout: top row (2 widgets) + bottom row (3 widgets)
 */
function calculate5GridComplexSizesFromCoordinates(coordinates: WidgetCoordinate[]): GridSizes {
  if (coordinates.length < 5) {
    return { 
      top: "40%", 
      bottom: "60%", 
      topLeft: "50%", 
      topRight: "50%", 
      bottomLeft: "33.33%", 
      bottomMiddle: "33.33%", 
      bottomRight: "33.33%" 
    };
  }

  // Sort by position: top row first, then bottom row
  const sortedCoords = coordinates.sort((a, b) => {
    if (a.top !== b.top) return a.top - b.top;
    return a.left - b.left;
  });

  // Calculate horizontal split (top vs bottom)
  const topRowHeight = sortedCoords[0].height; // First widget height
  const bottomRowHeight = sortedCoords[2].height; // Third widget height
  const totalHeight = topRowHeight + bottomRowHeight;
  const topRatio = parseFloat(((topRowHeight / totalHeight) * 100).toFixed(4));
  const bottomRatio = parseFloat((100 - topRatio).toFixed(4));

  // Calculate vertical split for top row (2 widgets)
  const topLeftWidth = sortedCoords[0].width;
  const topRightWidth = sortedCoords[1].width;
  const topTotalWidth = topLeftWidth + topRightWidth;
  const topLeftRatio = parseFloat(((topLeftWidth / topTotalWidth) * 100).toFixed(4));
  const topRightRatio = parseFloat((100 - topLeftRatio).toFixed(4));

  // Calculate vertical split for bottom row (3 widgets)
  const bottomLeftWidth = sortedCoords[2].width;
  const bottomMiddleWidth = sortedCoords[3].width;
  const bottomRightWidth = sortedCoords[4].width;
  const bottomTotalWidth = bottomLeftWidth + bottomMiddleWidth + bottomRightWidth;
  const bottomLeftRatio = parseFloat(((bottomLeftWidth / bottomTotalWidth) * 100).toFixed(4));
  const bottomMiddleRatio = parseFloat(((bottomMiddleWidth / bottomTotalWidth) * 100).toFixed(4));
  const bottomRightRatio = parseFloat((100 - bottomLeftRatio - bottomMiddleRatio).toFixed(4));

  const result = {
    top: `${topRatio}%`,
    bottom: `${bottomRatio}%`,
    topLeft: `${topLeftRatio}%`,
    topRight: `${topRightRatio}%`,
    bottomLeft: `${bottomLeftRatio}%`,
    bottomMiddle: `${bottomMiddleRatio}%`,
    bottomRight: `${bottomRightRatio}%`
  };

  return result;
}

/**
 * Calculate 3-grid-top-large sizes from coordinates
 */
function calculate3GridTopLargeSizesFromCoordinates(coordinates: WidgetCoordinate[]): GridSizes {
  if (coordinates.length < 3) {
    return { top: "50%", bottomLeft: "50%", bottomRight: "50%" };
  }

  // Sort by position: top row first, then bottom row
  const sortedCoords = coordinates.sort((a, b) => {
    if (a.top !== b.top) return a.top - b.top;
    return a.left - b.left;
  });

  const topHeight = sortedCoords[0].height;
  const bottomHeight = sortedCoords[1].height;
  const totalHeight = topHeight + bottomHeight;
  const topRatio = parseFloat(((topHeight / totalHeight) * 100).toFixed(4));
  const bottomRatio = parseFloat((100 - topRatio).toFixed(4));

  const bottomLeftWidth = sortedCoords[1].width;
  const bottomRightWidth = sortedCoords[2].width;
  const bottomTotalWidth = bottomLeftWidth + bottomRightWidth;
  const bottomLeftRatio = parseFloat(((bottomLeftWidth / bottomTotalWidth) * 100).toFixed(4));
  const bottomRightRatio = parseFloat((100 - bottomLeftRatio).toFixed(4));

  const result = {
    top: `${topRatio}%`,
    bottom: `${bottomRatio}%`,
    bottomLeft: `${bottomLeftRatio}%`,
    bottomRight: `${bottomRightRatio}%`
  };

  return result;
}

/**
 * Calculate 3-grid-rows sizes from coordinates
 * 3 widgets stacked vertically
 */
function calculate3GridRowsSizesFromCoordinates(coordinates: WidgetCoordinate[]): GridSizes {
  if (coordinates.length < 3) {
    return { top: "33.33%", middle: "33.33%", bottom: "33.33%" };
  }

  // Sort by top position (vertical order)
  const sortedCoords = coordinates.sort((a, b) => a.top - b.top);

  const heights = sortedCoords.map(coord => coord.height);
  const totalHeight = heights.reduce((sum, height) => sum + height, 0);
  
  const ratios = heights.map(height => parseFloat(((height / totalHeight) * 100).toFixed(4)));
  
  // Ensure ratios sum to 100% (adjust last one if needed due to rounding)
  const totalRatio = ratios.reduce((sum, ratio) => sum + ratio, 0);
  if (Math.abs(totalRatio - 100) > 0.01) {
    ratios[ratios.length - 1] = parseFloat((ratios[ratios.length - 1] + (100 - totalRatio)).toFixed(4));
  }

  const result = {
    top: `${ratios[0]}%`,
    middle: `${ratios[1]}%`,
    bottom: `${ratios[2]}%`
  };

  return result;
}

/**
 * Calculate 3-grid-columns sizes from coordinates
 * 3 widgets arranged horizontally
 */
function calculate3GridColumnsSizesFromCoordinates(coordinates: WidgetCoordinate[]): GridSizes {
  if (coordinates.length < 3) {
    return { left: "33.33%", middle: "33.33%", right: "33.33%" };
  }

  // Sort by left position (horizontal order)
  const sortedCoords = coordinates.sort((a, b) => a.left - b.left);

  const widths = sortedCoords.map(coord => coord.width);
  const totalWidth = widths.reduce((sum, width) => sum + width, 0);
  
  const ratios = widths.map(width => parseFloat(((width / totalWidth) * 100).toFixed(4)));
  
  // Ensure ratios sum to 100% (adjust last one if needed due to rounding)
  const totalRatio = ratios.reduce((sum, ratio) => sum + ratio, 0);
  if (Math.abs(totalRatio - 100) > 0.01) {
    ratios[ratios.length - 1] = parseFloat((ratios[ratios.length - 1] + (100 - totalRatio)).toFixed(4));
  }

  const result = {
    left: `${ratios[0]}%`,
    middle: `${ratios[1]}%`,
    right: `${ratios[2]}%`
  };

  return result;
}

/**
 * Calculate 6-grid-2x3 sizes from coordinates
 * 2 rows, 3 columns each
 */
function calculate6Grid2x3SizesFromCoordinates(coordinates: WidgetCoordinate[]): GridSizes {
  if (coordinates.length < 6) {
    return { 
      top: "50%", 
      bottom: "50%", 
      topLeft: "33.33%", 
      topMiddle: "33.33%", 
      topRight: "33.33%", 
      bottomLeft: "33.33%", 
      bottomMiddle: "33.33%", 
      bottomRight: "33.33%" 
    };
  }

  // Sort by position: top row first, then bottom row
  const sortedCoords = coordinates.sort((a, b) => {
    if (a.top !== b.top) return a.top - b.top;
    return a.left - b.left;
  });

  // Calculate horizontal split (top vs bottom)
  const topRowHeight = sortedCoords[0].height;
  const bottomRowHeight = sortedCoords[3].height;
  const totalHeight = topRowHeight + bottomRowHeight;
  const topRatio = parseFloat(((topRowHeight / totalHeight) * 100).toFixed(4));
  const bottomRatio = parseFloat((100 - topRatio).toFixed(4));

  // Calculate vertical splits for both rows
  const topLeftWidth = sortedCoords[0].width;
  const topMiddleWidth = sortedCoords[1].width;
  const topRightWidth = sortedCoords[2].width;
  const topTotalWidth = topLeftWidth + topMiddleWidth + topRightWidth;
  const topLeftRatio = parseFloat(((topLeftWidth / topTotalWidth) * 100).toFixed(4));
  const topMiddleRatio = parseFloat(((topMiddleWidth / topTotalWidth) * 100).toFixed(4));
  const topRightRatio = parseFloat((100 - topLeftRatio - topMiddleRatio).toFixed(4));

  const bottomLeftWidth = sortedCoords[3].width;
  const bottomMiddleWidth = sortedCoords[4].width;
  const bottomRightWidth = sortedCoords[5].width;
  const bottomTotalWidth = bottomLeftWidth + bottomMiddleWidth + bottomRightWidth;
  const bottomLeftRatio = parseFloat(((bottomLeftWidth / bottomTotalWidth) * 100).toFixed(4));
  const bottomMiddleRatio = parseFloat(((bottomMiddleWidth / bottomTotalWidth) * 100).toFixed(4));
  const bottomRightRatio = parseFloat((100 - bottomLeftRatio - bottomMiddleRatio).toFixed(4));

  const result = {
    top: `${topRatio}%`,
    bottom: `${bottomRatio}%`,
    topLeft: `${topLeftRatio}%`,
    topMiddle: `${topMiddleRatio}%`,
    topRight: `${topRightRatio}%`,
    bottomLeft: `${bottomLeftRatio}%`,
    bottomMiddle: `${bottomMiddleRatio}%`,
    bottomRight: `${bottomRightRatio}%`
  };

  return result;
}

/**
 * Calculate 6-grid-3x2 sizes from coordinates
 * 3 columns, 2 rows each
 */
function calculate6Grid3x2SizesFromCoordinates(coordinates: WidgetCoordinate[]): GridSizes {
  if (coordinates.length < 6) {
    return { 
      left: "33.33%", 
      middle: "33.33%", 
      right: "33.33%", 
      leftTop: "50%", 
      leftBottom: "50%", 
      middleTop: "50%", 
      middleBottom: "50%", 
      rightTop: "50%", 
      rightBottom: "50%" 
    };
  }

  // Sort by position: left column first, then middle, then right
  const sortedCoords = coordinates.sort((a, b) => {
    if (a.left !== b.left) return a.left - b.left;
    return a.top - b.top;
  });

  // Calculate vertical splits (left, middle, right)
  const leftWidth = sortedCoords[0].width;
  const middleWidth = sortedCoords[2].width;
  const rightWidth = sortedCoords[4].width;
  const totalWidth = leftWidth + middleWidth + rightWidth;
  const leftRatio = parseFloat(((leftWidth / totalWidth) * 100).toFixed(4));
  const middleRatio = parseFloat(((middleWidth / totalWidth) * 100).toFixed(4));
  const rightRatio = parseFloat((100 - leftRatio - middleRatio).toFixed(4));

  // Calculate horizontal splits for each column
  const leftTopHeight = sortedCoords[0].height;
  const leftBottomHeight = sortedCoords[1].height;
  const leftTotalHeight = leftTopHeight + leftBottomHeight;
  const leftTopRatio = parseFloat(((leftTopHeight / leftTotalHeight) * 100).toFixed(4));
  const leftBottomRatio = parseFloat((100 - leftTopRatio).toFixed(4));

  const middleTopHeight = sortedCoords[2].height;
  const middleBottomHeight = sortedCoords[3].height;
  const middleTotalHeight = middleTopHeight + middleBottomHeight;
  const middleTopRatio = parseFloat(((middleTopHeight / middleTotalHeight) * 100).toFixed(4));
  const middleBottomRatio = parseFloat((100 - middleTopRatio).toFixed(4));

  const rightTopHeight = sortedCoords[4].height;
  const rightBottomHeight = sortedCoords[5].height;
  const rightTotalHeight = rightTopHeight + rightBottomHeight;
  const rightTopRatio = parseFloat(((rightTopHeight / rightTotalHeight) * 100).toFixed(4));
  const rightBottomRatio = parseFloat((100 - rightTopRatio).toFixed(4));

  const result = {
    left: `${leftRatio}%`,
    middle: `${middleRatio}%`,
    right: `${rightRatio}%`,
    leftTop: `${leftTopRatio}%`,
    leftBottom: `${leftBottomRatio}%`,
    middleTop: `${middleTopRatio}%`,
    middleBottom: `${middleBottomRatio}%`,
    rightTop: `${rightTopRatio}%`,
    rightBottom: `${rightBottomRatio}%`
  };

  return result;
}

/**
 * Calculate 8-grid-2x4 sizes from coordinates
 * 2 columns, 4 rows each (left column: area-1,3,5,7 / right column: area-2,4,6,8)
 * Returns gridSizes compatible with DynamicGridRenderer for '8-grid-2x4'
 */
function calculate8Grid2x4SizesFromCoordinates(coordinates: WidgetCoordinate[]): GridSizes {
  // Fallback defaults when we don't have all 8 cells
  if (coordinates.length < 8) {
    return {
      left: "50%",
      right: "50%",
      top: "25%",
      topMiddle1: "25%",
      bottomMiddle1: "25%",
      bottom: "25%",
      rightTop: "25%",
      rightTopMiddle: "25%",
      rightBottomMiddle: "25%",
      rightBottom: "25%"
    };
  }

  // Sort by column (left to right) then by row (top to bottom)
  const sortedCoords = [...coordinates].sort((a, b) => {
    if (a.left !== b.left) return a.left - b.left;
    return a.top - b.top;
  });

  // Left column: indices 0,1,2,3  |  Right column: 4,5,6,7
  const leftCol = sortedCoords.slice(0, 4);
  const rightCol = sortedCoords.slice(4, 8);

  const leftWidth = leftCol[0].width;
  const rightWidth = rightCol[0].width;
  const totalWidth = leftWidth + rightWidth;

  let leftRatio = 50;
  if (totalWidth > 0) {
    leftRatio = parseFloat(((leftWidth / totalWidth) * 100).toFixed(4));
  }
  const rightRatio = parseFloat((100 - leftRatio).toFixed(4));

  // Derive row heights from average of left/right cells per row
  const rowHeights = [0, 1, 2, 3].map(rowIndex => {
    const leftCell = leftCol[rowIndex];
    const rightCell = rightCol[rowIndex];
    const avgHeight = (leftCell.height + rightCell.height) / 2;
    return avgHeight;
  });

  const totalHeight = rowHeights.reduce((sum, h) => sum + h, 0);

  let rowRatios = [25, 25, 25, 25];
  if (totalHeight > 0) {
    rowRatios = rowHeights.map(h =>
      parseFloat(((h / totalHeight) * 100).toFixed(4))
    );
    // Ensure they sum to 100% (adjust last one for rounding)
    const totalRatio = rowRatios.reduce((sum, r) => sum + r, 0);
    if (Math.abs(totalRatio - 100) > 0.01) {
      rowRatios[3] = parseFloat((rowRatios[3] + (100 - totalRatio)).toFixed(4));
    }
  }

  const [row1, row2, row3, row4] = rowRatios;

  const result: GridSizes = {
    // Column widths
    left: `${leftRatio}%`,
    right: `${rightRatio}%`,
    // Left column row heights (mapped to generic row keys)
    top: `${row1}%`,
    topMiddle1: `${row2}%`,
    bottomMiddle1: `${row3}%`,
    bottom: `${row4}%`,
    // Right column row heights (mirrored so both columns stay aligned)
    rightTop: `${row1}%`,
    rightTopMiddle: `${row2}%`,
    rightBottomMiddle: `${row3}%`,
    rightBottom: `${row4}%`
  };

  return result;
}

/**
 * Calculate 8-grid-4x2 sizes from coordinates
 * 4 columns, 2 rows each
 * Returns gridSizes compatible with DynamicGridRenderer for '8-grid-4x2'
 */
function calculate8Grid4x2SizesFromCoordinates(coordinates: WidgetCoordinate[]): GridSizes {
  // Fallback defaults when we don't have all 8 cells
  if (coordinates.length < 8) {
    return {
      top: "50%",
      topLeft: "25%",
      topMiddle1: "25%",
      topMiddle2: "25%",
      topRight: "25%",
      bottomLeft: "25%",
      bottomMiddle1: "25%",
      bottomMiddle2: "25%",
      bottomRight: "25%"
    };
  }

  // Sort by row (top to bottom) then by column (left to right)
  const sortedCoords = [...coordinates].sort((a, b) => {
    if (a.top !== b.top) return a.top - b.top;
    return a.left - b.left;
  });

  // Top row: 0-3, Bottom row: 4-7
  const topRow = sortedCoords.slice(0, 4);
  const bottomRow = sortedCoords.slice(4, 8);

  const topHeightPx = topRow[0].height;
  const bottomHeightPx = bottomRow[0].height;
  const totalHeight = topHeightPx + bottomHeightPx;

  let topRatio = 50;
  if (totalHeight > 0) {
    topRatio = parseFloat(((topHeightPx / totalHeight) * 100).toFixed(4));
  }
  const bottomRatio = parseFloat((100 - topRatio).toFixed(4));

  // Column widths for top row
  const topWidths = topRow.map(c => c.width);
  const totalTopWidth = topWidths.reduce((sum, w) => sum + w, 0);

  let topColRatios = [25, 25, 25, 25];
  if (totalTopWidth > 0) {
    topColRatios = topWidths.map(w =>
      parseFloat(((w / totalTopWidth) * 100).toFixed(4))
    );
    const totalRatio = topColRatios.reduce((sum, r) => sum + r, 0);
    if (Math.abs(totalRatio - 100) > 0.01) {
      topColRatios[3] = parseFloat(
        (topColRatios[3] + (100 - totalRatio)).toFixed(4)
      );
    }
  }

  // Column widths for bottom row
  const bottomWidths = bottomRow.map(c => c.width);
  const totalBottomWidth = bottomWidths.reduce((sum, w) => sum + w, 0);

  let bottomColRatios = [25, 25, 25, 25];
  if (totalBottomWidth > 0) {
    bottomColRatios = bottomWidths.map(w =>
      parseFloat(((w / totalBottomWidth) * 100).toFixed(4))
    );
    const totalRatio = bottomColRatios.reduce((sum, r) => sum + r, 0);
    if (Math.abs(totalRatio - 100) > 0.01) {
      bottomColRatios[3] = parseFloat(
        (bottomColRatios[3] + (100 - totalRatio)).toFixed(4)
      );
    }
  }

  const [topLeftRatio, topMiddle1Ratio, topMiddle2Ratio, topRightRatio] = topColRatios;
  const [bottomLeftRatio, bottomMiddle1Ratio, bottomMiddle2Ratio, bottomRightRatio] = bottomColRatios;

  const result: GridSizes = {
    // Row heights
    top: `${topRatio}%`,
    bottom: `${bottomRatio}%`,
    // Top row column widths
    topLeft: `${topLeftRatio}%`,
    topMiddle1: `${topMiddle1Ratio}%`,
    topMiddle2: `${topMiddle2Ratio}%`,
    topRight: `${topRightRatio}%`,
    // Bottom row column widths
    bottomLeft: `${bottomLeftRatio}%`,
    bottomMiddle1: `${bottomMiddle1Ratio}%`,
    bottomMiddle2: `${bottomMiddle2Ratio}%`,
    bottomRight: `${bottomRightRatio}%`
  };

  return result;
}

/**
 * Calculate 6-grid-rows sizes from coordinates
 * 6 widgets stacked vertically
 */
function calculate6GridRowsSizesFromCoordinates(coordinates: WidgetCoordinate[]): GridSizes {
  if (coordinates.length < 6) {
    return { 
      top: "16.67%", 
      topMiddle1: "16.67%", 
      topMiddle2: "16.67%", 
      bottomMiddle1: "16.67%", 
      bottomMiddle2: "16.67%", 
      bottom: "16.67%" 
    };
  }

  // Sort by top position (vertical order)
  const sortedCoords = coordinates.sort((a, b) => a.top - b.top);

  const heights = sortedCoords.map(coord => coord.height);
  const totalHeight = heights.reduce((sum, height) => sum + height, 0);
  
  const ratios = heights.map(height => parseFloat(((height / totalHeight) * 100).toFixed(4)));
  
  // Ensure ratios sum to 100% (adjust last one if needed due to rounding)
  const totalRatio = ratios.reduce((sum, ratio) => sum + ratio, 0);
  if (Math.abs(totalRatio - 100) > 0.01) {
    ratios[ratios.length - 1] = parseFloat((ratios[ratios.length - 1] + (100 - totalRatio)).toFixed(4));
  }

  const result = {
    top: `${ratios[0]}%`,
    topMiddle1: `${ratios[1]}%`,
    topMiddle2: `${ratios[2]}%`,
    bottomMiddle1: `${ratios[3]}%`,
    bottomMiddle2: `${ratios[4]}%`,
    bottom: `${ratios[5]}%`
  };

  return result;
}

/**
 * Calculate split ratios from actual coordinates
 */
function calculateSplitRatiosFromCoordinates(split: any, coordinates: WidgetCoordinate[]): number[] {
  const ratios: number[] = [];
  
  // Process each area group in the split
  split.areas.forEach((areaGroup: string, index: number) => {
    // Parse area group (e.g., "area-1,area-4,area-7")
    const areaIds = areaGroup.split(',').map(area => area.trim());
    
    // Find coordinates for this area group
    const areaCoordinates = areaIds.map(areaId => {
      const widgetIndex = parseInt(areaId.replace('area-', '')) - 1;
      return coordinates[widgetIndex];
    }).filter(Boolean);
    
    if (areaCoordinates.length > 0) {
      // Calculate total size for this area group
      const totalSize = areaCoordinates.reduce((sum, coord) => {
        const size = split.direction === 'vertical' ? coord.width : coord.height;
        return sum + size;
      }, 0);
      
      ratios.push(totalSize);
    } else {
      // Fallback to default ratio
      ratios.push(split.ratio[index] || 50);
    }
  });
  
  // Normalize ratios to percentages with precision
  const total = ratios.reduce((sum, ratio) => sum + ratio, 0);
  const normalizedRatios = ratios.map(ratio => parseFloat(((ratio / total) * 100).toFixed(4)));
  
  return normalizedRatios;
}

/**
 * Apply calculated ratios to grid sizes object
 */
function applyRatiosToGridSizes(
  gridSizes: GridSizes,
  split: any,
  ratios: number[],
  splitIndex: number
): void {
  split.areas.forEach((areaGroup: string, index: number) => {
    const ratio = ratios[index];
    
    // Parse area group to get individual areas
    const areaIds = areaGroup.split(',').map(area => area.trim());
    
    // Create keys based on split direction and area groups
    if (split.direction === 'vertical') {
      // Vertical split: left/right columns
      if (areaIds.includes('area-1')) {
        gridSizes.left = `${ratio}%`;
      }
      if (areaIds.includes('area-2')) {
        gridSizes.right = `${ratio}%`;
      }
      // Handle more complex layouts with multiple areas
      if (areaIds.length > 1) {
        // For complex layouts, we might need to set multiple keys
        // This is a simplified approach - we'll set the first area's key
        const firstArea = areaIds[0];
        const areaNum = parseInt(firstArea.replace('area-', ''));
        
        if (areaNum === 1) {
          gridSizes.left = `${ratio}%`;
        } else if (areaNum === 2) {
          gridSizes.right = `${ratio}%`;
        }
      }
    } else if (split.direction === 'horizontal') {
      // Horizontal split: top/bottom rows
      if (areaIds.includes('area-1')) {
        gridSizes.top = `${ratio}%`;
      }
      if (areaIds.includes('area-3')) {
        gridSizes.bottom = `${ratio}%`;
      }
      // Handle more complex layouts with multiple areas
      if (areaIds.length > 1) {
        // For complex layouts, we might need to set multiple keys
        const firstArea = areaIds[0];
        const areaNum = parseInt(firstArea.replace('area-', ''));
        
        if (areaNum === 1) {
          gridSizes.top = `${ratio}%`;
        } else if (areaNum === 3) {
          gridSizes.bottom = `${ratio}%`;
        }
      }
    }
  });
}


/**
 * Calculate split ratios based on actual coordinates
 */
function calculateSplitRatios(
  split: any,
  splitAreas: string[][],
  coordinates: WidgetCoordinate[]
): number[] {
  const ratios: number[] = [];
  
  splitAreas.forEach((areaGroup, index) => {
    // Find coordinates for this area group
    const areaCoordinates = areaGroup.map(areaId => {
      const widgetIndex = parseInt(areaId.replace('area-', '')) - 1;
      return coordinates[widgetIndex];
    }).filter(Boolean);
    
    if (areaCoordinates.length > 0) {
      // Calculate total size for this area group
      const totalSize = areaCoordinates.reduce((sum, coord) => {
        const size = split.direction === 'vertical' ? coord.width : coord.height;
        return sum + size;
      }, 0);
      
      ratios.push(totalSize);
    } else {
      // Fallback to default ratio
      ratios.push(split.ratio[index] || 50);
    }
  });
  
  // Normalize ratios to percentages with precision
  const total = ratios.reduce((sum, ratio) => sum + ratio, 0);
  const normalizedRatios = ratios.map(ratio => parseFloat(((ratio / total) * 100).toFixed(4)));
  
  return normalizedRatios;
}

/**
 * Apply calculated ratios to grid sizes object
 */
function applySplitRatios(
  gridSizes: GridSizes,
  split: any,
  splitAreas: string[][],
  ratios: number[]
): void {
  splitAreas.forEach((areaGroup, index) => {
    const ratio = ratios[index];
    
    // Create keys based on split direction and area groups
    if (split.direction === 'vertical') {
      // Vertical split: left/right columns
      if (areaGroup.includes('area-1')) {
        gridSizes.left = `${ratio}%`;
      }
      if (areaGroup.includes('area-2')) {
        gridSizes.right = `${ratio}%`;
      }
      // Handle more complex layouts
      if (areaGroup.includes('area-1,area-3')) {
        gridSizes.left = `${ratio}%`;
      }
      if (areaGroup.includes('area-2,area-4')) {
        gridSizes.right = `${ratio}%`;
      }
    } else if (split.direction === 'horizontal') {
      // Horizontal split: top/bottom rows
      if (areaGroup.includes('area-1')) {
        gridSizes.top = `${ratio}%`;
      }
      if (areaGroup.includes('area-3')) {
        gridSizes.bottom = `${ratio}%`;
      }
      // Handle more complex layouts
      if (areaGroup.includes('area-1,area-2')) {
        gridSizes.top = `${ratio}%`;
      }
      if (areaGroup.includes('area-3,area-4')) {
        gridSizes.bottom = `${ratio}%`;
      }
    }
  });
}

/**
 * Get default grid sizes for layouts (fallback)
 */
function getDefaultGridSizes(layout: string): GridSizes {
  const layoutConfig = getLayoutConfigByName(layout);
  
  if (!layoutConfig) {
    return {};
  }

  const defaultSizes: GridSizes = {};
  
  // Apply default ratios from layout config
  layoutConfig.structure.splits.forEach(split => {
    const splitAreas = split.areas.map(areaGroup => 
      areaGroup.split(',').map(area => area.trim())
    );
    
    splitAreas.forEach((areaGroup, index) => {
      const ratio = split.ratio[index] || 50;
      
      if (split.direction === 'vertical') {
        if (areaGroup.includes('area-1')) {
          defaultSizes.left = `${ratio}%`;
        }
        if (areaGroup.includes('area-2')) {
          defaultSizes.right = `${ratio}%`;
        }
        if (areaGroup.includes('area-1,area-3')) {
          defaultSizes.left = `${ratio}%`;
        }
        if (areaGroup.includes('area-2,area-4')) {
          defaultSizes.right = `${ratio}%`;
        }
      } else if (split.direction === 'horizontal') {
        if (areaGroup.includes('area-1')) {
          defaultSizes.top = `${ratio}%`;
        }
        if (areaGroup.includes('area-3')) {
          defaultSizes.bottom = `${ratio}%`;
        }
        if (areaGroup.includes('area-1,area-2')) {
          defaultSizes.top = `${ratio}%`;
        }
        if (areaGroup.includes('area-3,area-4')) {
          defaultSizes.bottom = `${ratio}%`;
        }
      }
    });
  });
  
  return defaultSizes;
}

/**
 * Check if a layout should use the dynamic system
 * For now, use dynamic system for all layouts
 */
export function shouldUseDynamicLayout(layout: string): boolean {
  // Special case: free-floating layout should not use dynamic system
  if (layout === 'free-floating') {
    return false;
  }
  
  const layoutConfig = getLayoutConfigByName(layout);
  
  if (!layoutConfig) {
    return false;
  }
  
  // Use dynamic system for all other layouts
  return true;
}
