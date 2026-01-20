import { ReactNode, useRef, useState, useCallback, useEffect } from "react";
import { useResizableGridContext } from "./ResizableGridContext";
import { insertMainGridPosition } from "@/lib/gridPositionApi";
import { calculateGridPositions, mapLayoutToApiCode } from "@/utils/gridPositionCalculator";
import { LayoutType } from "@/types";

interface ResizablePairProps {
  children: [ReactNode, ReactNode];
  direction: "horizontal" | "vertical";
  initialSizes?: [string, string]; // e.g., ["50%", "50%"]
  minSize?: number; // Minimum size in pixels for each cell
  position1?: string; // Position identifier for first cell
  position2?: string; // Position identifier for second cell
  className?: string;
  templateId?: string; // Optional template ID to save grid positions
  layout?: string; // Optional layout type for API calls
  onSizeChange?: (sizes: [string, string]) => void; // Optional callback for external size management
  onSaveRequired?: () => Promise<void>; // Optional custom save handler for complex layouts
}

/**
 * ResizablePair - A component that renders two adjacent cells with a draggable divider between them.
 * When the divider is dragged, it properly adjusts both adjacent cells.
 */
export function ResizablePair({
  children,
  direction,
  initialSizes = ["50%", "50%"],
  minSize = 150,
  position1,
  position2,
  className = "",
  templateId,
  layout,
  onSizeChange,
  onSaveRequired
}: ResizablePairProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [sizes, setSizes] = useState(initialSizes);
  const context = useResizableGridContext();
  
  // Track current sizes in a ref to avoid stale closures and prevent resets during drag
  const sizesRef = useRef<[string, string]>(sizes);
  // Flag to track if we just finished a user-initiated resize (prevents reset after onSizeChange)
  const justResizedRef = useRef<boolean>(false);
  // Track the sizes we just sent via onSizeChange to prevent reset when they come back
  const lastSentSizesRef = useRef<string>('');
  
  // Update ref whenever sizes changes
  useEffect(() => {
    sizesRef.current = sizes;
  }, [sizes]);
  
  // Update sizes when initialSizes prop changes (e.g., after loading from API)
  // Use a ref to track the last initialSizes to avoid unnecessary updates
  const prevInitialSizesRef = useRef<string>('');
  
  // Initialize prevInitialSizesRef on mount to prevent first resize from resetting
  useEffect(() => {
    if (prevInitialSizesRef.current === '') {
      prevInitialSizesRef.current = JSON.stringify(initialSizes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount
  
  useEffect(() => {
    // Don't update while user is actively dragging to prevent reset during resize
    if (isDragging) {
      return;
    }
    
    // Don't update immediately after a user-initiated resize
    // This prevents reset when onSizeChange updates the parent and causes initialSizes to be recalculated
    if (justResizedRef.current) {
      // Clear the flag after a longer delay to allow for parent re-render
      const timeoutId = setTimeout(() => {
        justResizedRef.current = false;
        // Also clear the lastSentSizesRef after the timeout
        lastSentSizesRef.current = '';
      }, 500); // Increased from 100ms to 500ms to give parent time to re-render
      return () => clearTimeout(timeoutId);
    }
    
    // Create a stable string representation for comparison
    const newSizesStr = JSON.stringify(initialSizes);
    
    // Check if the new initialSizes match what we just sent via onSizeChange
    // If they do, this is likely a feedback loop and we should ignore it
    if (lastSentSizesRef.current && lastSentSizesRef.current === newSizesStr) {
      // This is the same as what we just sent - ignore it to prevent reset
      console.log('🚫 [ResizablePair] Ignoring initialSizes update (matches what we just sent):', {
        sentSizes: lastSentSizesRef.current,
        receivedSizes: newSizesStr
      });
      prevInitialSizesRef.current = newSizesStr;
      return;
    }
    
    // Only update if the values actually changed
    if (prevInitialSizesRef.current !== newSizesStr) {
      // Get current sizes from ref to avoid stale closure
      const currentSizes = sizesRef.current;
      const currentSizesNumeric = currentSizes.map(s => parseFloat(s));
      const newSizesNumeric = initialSizes.map(s => parseFloat(s));
      
      // Check if the initial sizes actually changed (not just a reference change)
      const prevStr = prevInitialSizesRef.current;
      let initialSizesChanged = false;
      
      if (prevStr === '') {
        // First time, allow update
        initialSizesChanged = true;
      } else {
        try {
          const prevSizes = JSON.parse(prevStr);
          const prevNumeric = prevSizes.map((s: string) => parseFloat(s));
          
          // Check if any value changed by at least 0.1%
          if (newSizesNumeric.length === prevNumeric.length) {
            initialSizesChanged = newSizesNumeric.some((newVal, index) => {
              return Math.abs(newVal - prevNumeric[index]) >= 0.1;
            });
          } else {
            // Length changed, definitely changed
            initialSizesChanged = true;
          }
        } catch {
          // Can't parse, allow update
          initialSizesChanged = true;
        }
      }
      
      // Calculate if current sizes are "close" to initial sizes (within 2% tolerance)
      // This prevents resetting when onSizeChange updates the parent and causes a slight recalculation
      const sizesAreClose = currentSizesNumeric.length === newSizesNumeric.length &&
        currentSizesNumeric.every((current, index) => {
          const initial = newSizesNumeric[index];
          return Math.abs(current - initial) < 2;
        });
      
      // Only update if:
      // 1. Initial sizes actually changed (not just a reference change), OR
      // 2. Current sizes are close to initial sizes (meaning user hasn't resized)
      // This prevents resetting when the outer container resizes but inner percentages stay the same
      if (initialSizesChanged || sizesAreClose) {
        if (initialSizesChanged && !sizesAreClose) {
          console.log('🔄 [ResizablePair] Initial sizes changed, updating:', {
            oldSizes: currentSizes,
            newSizes: initialSizes,
            direction,
            prevStr: prevInitialSizesRef.current,
            newStr: newSizesStr
          });
        }
        prevInitialSizesRef.current = newSizesStr;
        setSizes(initialSizes);
      } else {
        // Initial sizes didn't actually change, and user has resized - preserve current sizes
        // Just update the ref tracking without resetting
        console.log('🔒 [ResizablePair] Preserving current sizes (initial unchanged, user resized):', {
          currentSizes,
          initialSizes,
          direction,
          prevStr: prevInitialSizesRef.current,
          newStr: newSizesStr
        });
        prevInitialSizesRef.current = newSizesStr;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSizes, direction, isDragging]); // Intentionally excluding 'sizes' to prevent updates during drag

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    // Clear the justResized flag when starting a new drag
    justResizedRef.current = false;
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    
    if (direction === "horizontal") {
      // Vertical divider (left/right resize)
      const containerWidth = containerRect.width;
      const mouseX = e.clientX - containerRect.left;
      const newLeftPercent = (mouseX / containerWidth) * 100;
      
      // Apply minimum size constraints
      const minPercent = (minSize / containerWidth) * 100;
      const maxPercent = 100 - minPercent;
      
      const constrainedLeft = Math.max(minPercent, Math.min(maxPercent, newLeftPercent));
      const constrainedRight = 100 - constrainedLeft;
      
      const newSizes: [string, string] = [`${constrainedLeft}%`, `${constrainedRight}%`];
      setSizes(newSizes);
      // Update ref immediately to ensure handleMouseUp gets latest value
      sizesRef.current = newSizes;
      
      // Call onResize for preview logging
      if (context?.onResize && containerRef.current) {
        const child1 = containerRef.current.children[0] as HTMLElement;
        const child2 = containerRef.current.children[2] as HTMLElement;
        if (position1 && child1) {
          context.onResize(position1, { width: child1.offsetWidth, height: child1.offsetHeight });
        }
        if (position2 && child2) {
          context.onResize(position2, { width: child2.offsetWidth, height: child2.offsetHeight });
        }
      }
    } else {
      // Horizontal divider (top/bottom resize)
      const containerHeight = containerRect.height;
      const mouseY = e.clientY - containerRect.top;
      const newTopPercent = (mouseY / containerHeight) * 100;
      
      // Apply minimum size constraints
      const minPercent = (minSize / containerHeight) * 100;
      const maxPercent = 100 - minPercent;
      
      const constrainedTop = Math.max(minPercent, Math.min(maxPercent, newTopPercent));
      const constrainedBottom = 100 - constrainedTop;
      
      const newSizes: [string, string] = [`${constrainedTop}%`, `${constrainedBottom}%`];
      setSizes(newSizes);
      // Update ref immediately to ensure handleMouseUp gets latest value
      sizesRef.current = newSizes;
      
      // Call onResize for preview logging
      if (context?.onResize && containerRef.current) {
        const child1 = containerRef.current.children[0] as HTMLElement;
        const child2 = containerRef.current.children[2] as HTMLElement;
        if (position1 && child1) {
          context.onResize(position1, { width: child1.offsetWidth, height: child1.offsetHeight });
        }
        if (position2 && child2) {
          context.onResize(position2, { width: child2.offsetWidth, height: child2.offsetHeight });
        }
      }
    }
  }, [isDragging, direction, minSize, context, position1, position2]);

  const handleMouseUp = useCallback(async () => {
    if (isDragging) {
      setIsDragging(false);
      
      // Set flag to prevent reset immediately after user-initiated resize
      justResizedRef.current = true;
      
      // Call external size change callback if provided (now that drag is complete)
      // Use ref to get the latest sizes value (avoid stale closure)
      if (onSizeChange) {
        const latestSizes = sizesRef.current;
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
          const child1 = container.children[0] as HTMLElement;
          const child2 = container.children[2] as HTMLElement; // Skip the divider (index 1)
          
          if (position1 && child1) {
            context.onResizeStop(position1, {
              width: child1.offsetWidth,
              height: child1.offsetHeight
            });
          }
          
          if (position2 && child2) {
            context.onResizeStop(position2, {
              width: child2.offsetWidth,
              height: child2.offsetHeight
            });
          }
        }
        return; // Skip default save logic
      }
      
      // Default save to localStorage and database if templateId and layout are provided
      if (!templateId) {
        console.warn('⚠️ [ResizablePair] No templateId provided, skipping save');
      } else if (!layout) {
        console.warn('⚠️ [ResizablePair] No layout provided, skipping save');
      } else {
        // Convert sizes from string percentages to numbers
        // Use ref to get the absolute latest sizes value (avoid stale closure)
        const latestSizes = sizesRef.current;
        const gridSizesArray = latestSizes.map(size => parseFloat(size));
        
        if (gridSizesArray.length === 0) {
          console.warn('⚠️ [ResizablePair] No sizes to save, sizes:', latestSizes);
        } else {
          // Save to localStorage via templateGridSizesStorage
          try {
            const { templateGridSizesStorage } = await import('@/lib/templateGridSizes');
            templateGridSizesStorage.saveTemplateGridSizes(
              templateId,
              layout,
              gridSizesArray
            );
            console.log('✅ [ResizablePair] Saved to localStorage:', {
              templateId,
              layout,
              sizes: gridSizesArray
            });
          } catch (error) {
            console.error('❌ [ResizablePair] Error saving to localStorage:', error);
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
              
              console.log('💾 [ResizablePair] Saving grid positions to database:', {
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
                console.log('✅ [ResizablePair] Successfully saved grid positions to database');
              } else {
                console.error('❌ [ResizablePair] Failed to save grid positions to database:', result.Message);
              }
            } catch (error) {
              console.error('❌ [ResizablePair] Error saving grid positions to database:', error);
            }
          }
        }
      }
      
      // Notify context about resize completion
      if (context?.onResizeStop && containerRef.current) {
        const container = containerRef.current;
        const child1 = container.children[0] as HTMLElement;
        const child2 = container.children[2] as HTMLElement; // Skip the divider (index 1)
        
        if (position1 && child1) {
          context.onResizeStop(position1, {
            width: child1.offsetWidth,
            height: child1.offsetHeight
          });
        }
        
        if (position2 && child2) {
          context.onResizeStop(position2, {
            width: child2.offsetWidth,
            height: child2.offsetHeight
          });
        }
      }
    }
  }, [isDragging, context, position1, position2, templateId, layout, onSizeChange, onSaveRequired]);

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
        overflow: "hidden"
      }}
    >
      {/* First cell */}
      <div
        data-position={position1}
        style={{
          [direction === "horizontal" ? "width" : "height"]: sizes[0],
          overflow: "hidden",
          position: "relative",
          zIndex: 1
        }}
      >
        {children[0]}
      </div>

      {/* Draggable divider - 1px visible line with extended hit area for easier dragging */}
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
        onMouseDown={handleMouseDown}
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
            // Small invisible hover area (3px) around the 1px line for easier hovering
            [direction === "horizontal" ? "paddingLeft" : "paddingTop"]: "1px",
            [direction === "horizontal" ? "paddingRight" : "paddingBottom"]: "1px",
            [direction === "horizontal" ? "marginLeft" : "marginTop"]: "-1px",
            [direction === "horizontal" ? "marginRight" : "marginBottom"]: "-1px"
          }}
        />
      </div>

      {/* Second cell */}
      <div
        data-position={position2}
        style={{
          [direction === "horizontal" ? "width" : "height"]: sizes[1],
          overflow: "hidden",
          position: "relative",
          zIndex: 1
        }}
      >
        {children[1]}
      </div>
    </div>
  );
}

