import { Resizable } from "re-resizable";
import { ReactNode, useState, useCallback, useEffect } from "react";
import { useResizableGridContext } from "./ResizableGridContext";
import type { NumberSize } from "re-resizable";

interface ResizableGridProps {
  children: ReactNode;
  direction?: "horizontal" | "vertical";
  defaultSize?: { width: string | number; height: string | number };
  size?: { width: string | number; height: string | number }; // Controlled size prop
  minWidth?: string | number;
  minHeight?: string | number;
  maxWidth?: string | number;
  maxHeight?: string | number;
  enable?: {
    top?: boolean;
    right?: boolean;
    bottom?: boolean;
    left?: boolean;
  };
  position?: string; // Cell position identifier (e.g., "area-1")
  onResizeStop?: (position: string, size: NumberSize) => void;
  onResize?: (position: string, size: NumberSize) => void;
}

export function ResizableGrid({
  children,
  defaultSize,
  size: controlledSize,
  minWidth = 150,
  minHeight = 150,
  maxWidth = "100%",
  maxHeight = "100%",
  enable = { right: true, bottom: true },
  position,
  onResizeStop,
  onResize
}: ResizableGridProps) {
  const context = useResizableGridContext();
  const [currentSize, setCurrentSize] = useState(controlledSize || defaultSize);
  
  // Update currentSize when controlledSize prop changes
  useEffect(() => {
    if (controlledSize) {
      setCurrentSize(controlledSize);
    }
  }, [controlledSize]);
  
  // Update currentSize when defaultSize prop changes (for uncontrolled mode)
  // This ensures components remount properly when sizes load from storage
  // IMPORTANT: Don't update during drag - only on initial mount or when key changes
  useEffect(() => {
    if (!controlledSize && defaultSize) {
      // Only update on initial mount (when currentSize matches defaultSize from useState)
      // This prevents interference during drag operations
      const isInitialMount = currentSize === defaultSize || !currentSize;
      
      if (isInitialMount) {
        setCurrentSize(defaultSize);
      }
    }
  }, [defaultSize, controlledSize]); // Removed currentSize from dependencies to prevent updates during drag
  
  const handleResize = useCallback((
    e: MouseEvent | TouchEvent,
    direction: string,
    ref: HTMLElement,
    d: NumberSize
  ) => {
    const domPosition = position || (ref.querySelector('[data-position]')?.getAttribute('data-position') || undefined);
    const newSize = {
      width: ref.offsetWidth,
      height: ref.offsetHeight
    };
    setCurrentSize(newSize);
    
    // Call local onResize prop with position
    if (onResize && domPosition) {
      onResize(domPosition, newSize);
    }
    
    // Call context onResize for preview logging
    if (domPosition && context?.onResize) {
      context.onResize(domPosition, newSize);
    }
  }, [onResize, position, context]);
  
  const handleResizeStop = (
    e: MouseEvent | TouchEvent,
    direction: string,
    ref: HTMLElement,
    d: NumberSize
  ) => {
    // Determine position from prop or from child DOM if not provided
    const domPosition = position || (ref.querySelector('[data-position]')?.getAttribute('data-position') || undefined);
    const finalSize = {
      width: ref.offsetWidth,
      height: ref.offsetHeight
    };

    if (domPosition) {
      if (onResizeStop) {
        onResizeStop(domPosition, finalSize);
      }
      if (context?.onResizeStop) {
        context.onResizeStop(domPosition, finalSize);
      }
    }
  };

  // Use size prop if provided (controlled), otherwise use defaultSize (uncontrolled)
  const sizeToUse = controlledSize || currentSize || defaultSize;
  
  return (
    <Resizable
      size={controlledSize ? sizeToUse : undefined}
      defaultSize={controlledSize ? undefined : sizeToUse}
      minWidth={minWidth}
      minHeight={minHeight}
      maxWidth={maxWidth}
      maxHeight={maxHeight}
      enable={enable}
      onResize={handleResize}
      onResizeStop={handleResizeStop}
      handleStyles={{
        right: {
          width: "6px",
          right: "-3px",
          cursor: "col-resize",
          background: "hsl(var(--border))",
          transition: "background 0.2s",
          zIndex: 2,
        },
        bottom: {
          height: "6px",
          bottom: "-3px",
          cursor: "row-resize",
          background: "hsl(var(--border))",
          transition: "background 0.2s",
          zIndex: 2,
        },
        left: {
          width: "6px",
          left: "-3px",
          cursor: "col-resize",
          background: "hsl(var(--border))",
          transition: "background 0.2s",
          zIndex: 2,
        },
        top: {
          height: "6px",
          top: "-3px",
          cursor: "row-resize",
          background: "hsl(var(--border))",
          transition: "background 0.2s",
          zIndex: 2,
        },
      }}
      handleClasses={{
        right: "hover:!bg-primary/60",
        bottom: "hover:!bg-primary/60",
        left: "hover:!bg-primary/60",
        top: "hover:!bg-primary/60",
      }}
      className="relative"
    >
      {children}
    </Resizable>
  );
}

