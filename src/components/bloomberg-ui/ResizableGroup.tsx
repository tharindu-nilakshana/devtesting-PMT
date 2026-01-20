import React, { ReactNode, useRef, useState, useCallback, useEffect } from "react";
import { useResizableGridContext } from "./ResizableGridContext";
import { insertMainGridPosition } from "@/lib/gridPositionApi";
import { calculateGridPositions, mapLayoutToApiCode } from "@/utils/gridPositionCalculator";
import { LayoutType } from "@/types";

interface CellConfig {
  content: ReactNode;
  position?: string;
  initialSize?: string; // e.g., "33.33%"
}

interface ResizableGroupProps {
  cells: CellConfig[];
  direction: "horizontal" | "vertical";
  minSize?: number; // Minimum size in pixels for each cell
  className?: string;
  templateId?: string; // Optional template ID to save grid positions
  layout?: string; // Optional layout type for API calls
  onSizeChange?: (sizes: string[]) => void; // Optional callback for external size management
  onSaveRequired?: () => Promise<void>; // Optional custom save handler for complex layouts
}

/**
 * ResizableGroup - A component that renders multiple cells with draggable dividers between them.
 * Each divider only affects the two adjacent cells it separates.
 */
export function ResizableGroup({
  cells,
  direction,
  minSize = 100,
  className = "",
  templateId,
  layout,
  onSizeChange,
  onSaveRequired
}: ResizableGroupProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedDividerIndex, setDraggedDividerIndex] = useState<number | null>(null);
  const [cellSizes, setCellSizes] = useState<string[]>(() => 
    cells.map(cell => cell.initialSize || `${100 / cells.length}%`)
  );
  const context = useResizableGridContext();
  
  // Track previous initial sizes to detect actual changes (not just reference changes)
  const prevInitialSizesRef = useRef<string>('');
  // Track current cell sizes in a ref to avoid stale closures
  const cellSizesRef = useRef<string[]>(cellSizes);
  // Track the starting sizes when drag begins to avoid issues with state updates during drag
  const startSizesRef = useRef<number[] | null>(null);
  // Flag to track if we just finished a user-initiated resize (prevents reset after onSizeChange)
  const justResizedRef = useRef<boolean>(false);
  // Track the sizes we just sent via onSizeChange to prevent reset when they come back
  const lastSentSizesRef = useRef<string>('');
  
  // Update ref whenever cellSizes changes
  useEffect(() => {
    cellSizesRef.current = cellSizes;
  }, [cellSizes]);
  
  // Initialize prevInitialSizesRef on mount to prevent first resize from resetting
  useEffect(() => {
    if (prevInitialSizesRef.current === '') {
      const initialSizes = cells.map(cell => cell.initialSize || `${100 / cells.length}%`);
      prevInitialSizesRef.current = JSON.stringify(initialSizes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount
  
  // Update cell sizes when cells prop changes (e.g., after loading from API)
  // But don't update while user is actively dragging to prevent reset during resize
  // Also, only update if the initial sizes actually changed (not just reference change)
  useEffect(() => {
    if (isDragging) {
      return; // Don't update while dragging
    }
    
    // Don't update immediately after a user-initiated resize
    // This prevents reset when onSizeChange updates the parent and causes initialSizes to be recalculated
    if (justResizedRef.current) {
      // Clear the flag after a longer delay to allow for parent re-render
      const timeoutId = setTimeout(() => {
        justResizedRef.current = false;
        // Also clear the lastSentSizesRef after the timeout
        lastSentSizesRef.current = '';
      }, 500); // Increased to 500ms to give parent time to re-render
      return () => clearTimeout(timeoutId);
    }
    
    // Create a stable string representation of initial sizes for comparison
    const newInitialSizes = cells.map(cell => cell.initialSize || `${100 / cells.length}%`);
    const newInitialSizesStr = JSON.stringify(newInitialSizes);
    
    // Check if the new initialSizes match what we just sent via onSizeChange
    // If they do, this is likely a feedback loop and we should ignore it
    if (lastSentSizesRef.current && lastSentSizesRef.current === newInitialSizesStr) {
      // This is the same as what we just sent - ignore it to prevent reset
      console.log('🚫 [ResizableGroup] Ignoring initialSizes update (matches what we just sent):', {
        sentSizes: lastSentSizesRef.current,
        receivedSizes: newInitialSizesStr
      });
      prevInitialSizesRef.current = newInitialSizesStr;
      return;
    }
    
    // Only update if the initial sizes actually changed from the last time we saw them
    if (prevInitialSizesRef.current !== newInitialSizesStr) {
      // Get current sizes from ref to avoid stale closure
      const currentSizes = cellSizesRef.current.map(size => parseFloat(size));
      const newInitialSizesNumeric = newInitialSizes.map(size => parseFloat(size));
      
      // Check if the initial sizes actually changed (not just a reference change)
      const prevStr = prevInitialSizesRef.current;
      const initialSizesChanged = prevStr === '' ? true : // First time, allow update
        (newInitialSizesNumeric.length === currentSizes.length &&
        newInitialSizesNumeric.some((newVal, index) => {
          try {
            const prevSizes = JSON.parse(prevStr);
            const prevNumeric = prevSizes.map((s: string) => parseFloat(s));
            return Math.abs(newVal - prevNumeric[index]) >= 0.1; // Changed by at least 0.1%
          } catch {
            return true; // Can't parse, allow update
          }
        }));
      
      // Calculate if current sizes are "close" to initial sizes (within 1% tolerance)
      const sizesAreClose = currentSizes.length === newInitialSizesNumeric.length &&
        currentSizes.every((current, index) => {
          const initial = newInitialSizesNumeric[index];
          return Math.abs(current - initial) < 1;
        });
      
      // Only update if:
      // 1. Initial sizes actually changed (not just a reference change), OR
      // 2. Current sizes are close to initial sizes (meaning user hasn't resized), OR
      // 3. Cell count changed
      // This prevents resetting when the outer container resizes but inner percentages stay the same
      if (initialSizesChanged || sizesAreClose || currentSizes.length !== newInitialSizesNumeric.length) {
        setCellSizes(newInitialSizes);
      }
      // Otherwise, preserve the current (resized) sizes
      
      // Update the ref to track what we've seen
      prevInitialSizesRef.current = newInitialSizesStr;
    }
  }, [cells, isDragging]);

  const handleMouseDown = useCallback((dividerIndex: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    // Capture the starting sizes at the beginning of the drag operation
    startSizesRef.current = cellSizesRef.current.map(size => parseFloat(size));
    setIsDragging(true);
    setDraggedDividerIndex(dividerIndex);
    // Clear the justResized flag when starting a new drag
    justResizedRef.current = false;
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || draggedDividerIndex === null || !containerRef.current || !startSizesRef.current) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    
    const leftCellIndex = draggedDividerIndex;
    const rightCellIndex = draggedDividerIndex + 1;
    
    // Use the ref to get the latest sizes without causing callback recreation
    const currentSizes = cellSizesRef.current.map(size => parseFloat(size));
    
    if (direction === "horizontal") {
      // Vertical divider (left/right resize)
      const containerWidth = containerRect.width;
      const mouseX = e.clientX - containerRect.left;
      
      // Calculate the position as a percentage relative to the start of the left cell
      const leftCellStart = currentSizes.slice(0, leftCellIndex).reduce((sum, size) => sum + size, 0);
      const combinedWidth = currentSizes[leftCellIndex] + currentSizes[rightCellIndex];
      
      const mousePercentInContainer = (mouseX / containerWidth) * 100;
      const newLeftCellPercent = mousePercentInContainer - leftCellStart;
      
      // Apply minimum size constraints
      const minPercent = (minSize / containerWidth) * 100;
      const maxLeftPercent = combinedWidth - minPercent;
      
      const constrainedLeftPercent = Math.max(minPercent, Math.min(maxLeftPercent, newLeftCellPercent));
      const constrainedRightPercent = combinedWidth - constrainedLeftPercent;
      
      // Update only the two affected cells
      const newSizes = [...cellSizesRef.current];
      newSizes[leftCellIndex] = `${constrainedLeftPercent}%`;
      newSizes[rightCellIndex] = `${constrainedRightPercent}%`;
      
      setCellSizes(newSizes);
      // Update ref immediately to ensure handleMouseUp gets latest value
      cellSizesRef.current = newSizes;
      
      // Call onResize for preview logging
      if (context?.onResize && containerRef.current) {
        const cellElements = Array.from(containerRef.current.children).filter((_, index) => index % 2 === 0);
        [leftCellIndex, rightCellIndex].forEach(cellIndex => {
          const position = cells[cellIndex]?.position;
          const cellElement = cellElements[cellIndex] as HTMLElement;
          if (position && cellElement && context.onResize) {
            context.onResize(position, {
              width: cellElement.offsetWidth,
              height: cellElement.offsetHeight
            });
          }
        });
      }
    } else {
      // Horizontal divider (top/bottom resize)
      const containerHeight = containerRect.height;
      const mouseY = e.clientY - containerRect.top;
      
      // Calculate the position as a percentage relative to the start of the top cell
      const topCellStart = currentSizes.slice(0, leftCellIndex).reduce((sum, size) => sum + size, 0);
      const combinedHeight = currentSizes[leftCellIndex] + currentSizes[rightCellIndex];
      
      const mousePercentInContainer = (mouseY / containerHeight) * 100;
      const newTopCellPercent = mousePercentInContainer - topCellStart;
      
      // Apply minimum size constraints
      const minPercent = (minSize / containerHeight) * 100;
      const maxTopPercent = combinedHeight - minPercent;
      
      const constrainedTopPercent = Math.max(minPercent, Math.min(maxTopPercent, newTopCellPercent));
      const constrainedBottomPercent = combinedHeight - constrainedTopPercent;
      
      // Update only the two affected cells
      const newSizes = [...cellSizesRef.current];
      newSizes[leftCellIndex] = `${constrainedTopPercent}%`;
      newSizes[rightCellIndex] = `${constrainedBottomPercent}%`;
      
      setCellSizes(newSizes);
      // Update ref immediately to ensure handleMouseUp gets latest value
      cellSizesRef.current = newSizes;
      
      // Call onResize for preview logging
      if (context?.onResize && containerRef.current) {
        const cellElements = Array.from(containerRef.current.children).filter((_, index) => index % 2 === 0);
        [leftCellIndex, rightCellIndex].forEach(cellIndex => {
          const position = cells[cellIndex]?.position;
          const cellElement = cellElements[cellIndex] as HTMLElement;
          if (position && cellElement && context.onResize) {
            context.onResize(position, {
              width: cellElement.offsetWidth,
              height: cellElement.offsetHeight
            });
          }
        });
      }
    }
  }, [isDragging, draggedDividerIndex, direction, minSize, context, cells]);

  const handleMouseUp = useCallback(async () => {
    if (isDragging) {
      setIsDragging(false);
      setDraggedDividerIndex(null);
      // Clear the start sizes ref
      startSizesRef.current = null;
      
      // Set flag to prevent reset immediately after user-initiated resize
      justResizedRef.current = true;
      
      // Call external size change callback if provided (now that drag is complete)
      if (onSizeChange) {
        const latestSizes = cellSizesRef.current;
        // Track what we're sending so we can ignore it when it comes back
        lastSentSizesRef.current = JSON.stringify(latestSizes);
        onSizeChange(latestSizes);
      }
      
      // Use custom save handler if provided (for complex nested layouts)
      if (onSaveRequired) {
        await onSaveRequired();
        // Notify context about resize completion
        if (context?.onResizeStop && containerRef.current) {
          const container = containerRef.current;
          const cellElements = Array.from(container.children).filter((_, index) => index % 2 === 0);
          
          cellElements.forEach((cellElement, index) => {
            const position = cells[index].position;
            if (position && cellElement instanceof HTMLElement && context.onResizeStop) {
              context.onResizeStop(position, {
                width: cellElement.offsetWidth,
                height: cellElement.offsetHeight
              });
            }
          });
        }
        return; // Skip default save logic
      }
      
      // Default save to localStorage and database if templateId and layout are provided
      if (!templateId) {
        console.warn('⚠️ [ResizableGroup] No templateId provided, skipping save');
      } else if (!layout) {
        console.warn('⚠️ [ResizableGroup] No layout provided, skipping save');
      } else {
        // Use ref to get the absolute latest cellSizes value (avoid stale closure)
        const latestCellSizes = cellSizesRef.current;
        // Convert cellSizes from string percentages to numbers
        const gridSizesArray = latestCellSizes.map(size => parseFloat(size));
        
        if (gridSizesArray.length === 0) {
          console.warn('⚠️ [ResizableGroup] No cell sizes to save, cellSizes:', latestCellSizes);
        } else {
          // Save to localStorage via templateGridSizesStorage
          try {
            const { templateGridSizesStorage } = await import('@/lib/templateGridSizes');
            templateGridSizesStorage.saveTemplateGridSizes(
              templateId,
              layout,
              gridSizesArray
            );
            console.log('✅ [ResizableGroup] Saved to localStorage:', {
              templateId,
              layout,
              sizes: gridSizesArray
            });
          } catch (error) {
            console.error('❌ [ResizableGroup] Error saving to localStorage:', error);
          }
          
          // Save to database via API if template is saved (numeric ID)
          const templateIdNum = parseInt(templateId, 10);
          if (!isNaN(templateIdNum)) {
            try {
              const apiLayoutCode = mapLayoutToApiCode(layout);
              const positions = calculateGridPositions(
                layout as LayoutType,
                gridSizesArray,
                apiLayoutCode
              );
              
              console.log('💾 [ResizableGroup] Saving grid positions to database:', {
                templateId: templateIdNum,
                layout,
                apiLayoutCode,
                sizesCount: gridSizesArray.length,
                positionsLength: {
                  top: positions.Top.split('|').length,
                  left: positions.Left.split('|').length,
                  height: positions.Height.split('|').length,
                  width: positions.Width.split('|').length
                }
              });
              
              const result = await insertMainGridPosition(
                templateIdNum,
                positions.Top,
                positions.Left,
                positions.Height,
                positions.Width
              );
              
              if (result.success) {
                console.log('✅ [ResizableGroup] Successfully saved grid positions to database');
              } else {
                console.error('❌ [ResizableGroup] Failed to save grid positions to database:', result.Message);
              }
            } catch (error) {
              console.error('❌ [ResizableGroup] Error saving grid positions to database:', error);
            }
          }
        }
      }
      
      // Notify context about resize completion
      if (context?.onResizeStop && containerRef.current) {
        const container = containerRef.current;
        const cellElements = Array.from(container.children).filter((_, index) => index % 2 === 0);
        
        cellElements.forEach((cellElement, index) => {
          const position = cells[index].position;
          if (position && cellElement instanceof HTMLElement && context.onResizeStop) {
            context.onResizeStop(position, {
              width: cellElement.offsetWidth,
              height: cellElement.offsetHeight
            });
          }
        });
      }
    }
  }, [isDragging, context, cells, templateId, layout, onSizeChange, onSaveRequired]);

  // Add global mouse event listeners when dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      // Prevent text selection while dragging
      document.body.style.userSelect = 'none';
      document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, direction]);

  const flexDirection = direction === "horizontal" ? "row" : "column";

  return (
    <div
      ref={containerRef}
      className={`flex ${className}`}
      style={{ 
        flexDirection,
        width: "100%",
        height: "100%",
        overflow: "visible",
        position: "relative"
      }}
    >
      {cells.map((cell, index) => (
        <React.Fragment key={`cell-group-${index}`}>
          {/* Cell */}
          <div
            data-position={cell.position}
            style={{
              [direction === "horizontal" ? "width" : "height"]: cellSizes[index],
              overflow: "hidden",
              position: "relative",
              minWidth: direction === "horizontal" ? minSize : undefined,
              minHeight: direction === "vertical" ? minSize : undefined,
              zIndex: 1
            }}
          >
            {cell.content}
          </div>

          {/* Draggable divider - 1px visible line with extended hit area for easier dragging */}
          {index < cells.length - 1 && (
            <div
              className="resize-divider relative"
              data-direction={direction}
              style={{
                [direction === "horizontal" ? "width" : "height"]: "1px",
                [direction === "horizontal" ? "minWidth" : "minHeight"]: "1px",
                background: "transparent",
                flexShrink: 0,
                zIndex: 1,
                position: "relative",
                pointerEvents: "auto",
                cursor: direction === "horizontal" ? "col-resize" : "row-resize",
                // Extend the hit area using padding with negative margin to keep visual size at 1px
                // Extended padding makes it easier to grab and drag, but hover only shows on the line
                [direction === "horizontal" ? "paddingLeft" : "paddingTop"]: "6px",
                [direction === "horizontal" ? "paddingRight" : "paddingBottom"]: "6px",
                [direction === "horizontal" ? "marginLeft" : "marginTop"]: "-6px",
                [direction === "horizontal" ? "marginRight" : "marginBottom"]: "-6px"
              }}
              onMouseDown={handleMouseDown(index)}
              onMouseEnter={(e) => {
                const cursor = direction === "horizontal" ? "col-resize" : "row-resize";
                e.currentTarget.style.cursor = cursor;
                document.body.style.cursor = cursor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.cursor = direction === "horizontal" ? "col-resize" : "row-resize";
                document.body.style.cursor = "";
              }}
            >
              {/* Visual indicator - always visible gray line, thicker and colored on hover */}
              <div 
                className={`absolute bg-[var(--grid-line)] hover:bg-primary transition-all duration-200 ${
                  direction === "horizontal" 
                    ? "h-full left-1/2 -translate-x-1/2 w-[1px] hover:w-[3px]" 
                    : "w-full top-1/2 -translate-y-1/2 h-[1px] hover:h-[3px]"
                }`}
                style={{
                  pointerEvents: "auto",
                  cursor: direction === "horizontal" ? "col-resize" : "row-resize",
                  zIndex: 11,
                  // Small invisible hover area (3px) around the 1px line for easier hovering
                  [direction === "horizontal" ? "paddingLeft" : "paddingTop"]: "1px",
                  [direction === "horizontal" ? "paddingRight" : "paddingBottom"]: "1px",
                  [direction === "horizontal" ? "marginLeft" : "marginTop"]: "-1px",
                  [direction === "horizontal" ? "marginRight" : "marginBottom"]: "-1px"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.cursor = direction === "horizontal" ? "col-resize" : "row-resize";
                }}
              />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

