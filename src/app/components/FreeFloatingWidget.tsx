'use client';

import { useState, useRef, useEffect } from 'react';
import { WidgetComponents } from '../../components/widgets';

interface Widget {
  id: string;
  name: string;
  description: string;
}

// Widget renderer for free-floating widgets
function WidgetRenderer({ widget }: { widget: Widget }) {
  // Helper function to get widget props for free-floating widgets  
  const getWidgetProps = (widgetId: string, stableId: string) => {
    const baseProps = {
      wgid: `floating-${widgetId}-${stableId}`,
      wght: 500,
      additionalSettings: '',
      templateName: 'Dashboard',
      isStandalone: false  // Use dashboard mode for free-floating to stay within container
    };

    // Add any specific props needed for certain widgets
    switch (widgetId) {
      case 'cot-chart-view':
      case 'cot-table-view':  
      case 'cot-positioning':
        return baseProps;
      case 'currency-strength':
        // Currency Strength widget specific props
        return {
          ...baseProps,
          timeframe: '7d',
          currenciesCsv: 'USD,EUR,JPY,GBP,AUD,CHF,CAD,NZD',
          useLegacyPattern: false
        };
      case 'realtime-headline-ticker':
        return baseProps;
      case 'economic-event-calendar':
        // Special configuration for event calendar widget - disable auto-update to prevent repeated API calls
        return {
          ...baseProps,
          additionalSettings: 'USD,EUR,JPY,GBP|7|vertical|{"enabled":false,"interval":30000}',
          templateName: 'GridSection'
        };
      case 'risk-indicator':
        // Risk Indicator widget - simple display
        return {
          ...baseProps,
          widgetType: 'risk_indicator' as const,
          useLegacyPattern: false
        };
      case 'risk-sentiment':
        // Risk Sentiment widget - full chart display
        return {
          ...baseProps,
          widgetType: 'risk_sentiment' as const,
          useLegacyPattern: false
        };
      case 'risk-sentiment-chart':
        // Risk Sentiment Chart widget - full chart display
        return {
          ...baseProps,
          widgetType: 'risk_sentiment' as const,
          useLegacyPattern: false
        };
      default:
        return baseProps;
    }
  };

  // Create stable ID once to prevent re-rendering/re-fetching
  const stableIdRef = useRef<string>("");
  if (!stableIdRef.current) {
    stableIdRef.current = Math.random().toString(36).substr(2, 9);
  }

  const renderContent = () => {
    // Check if we have a specific widget component first
    const WidgetComponent = WidgetComponents[widget.id];
    if (WidgetComponent) {
      // Pass appropriate props based on widget type, using stable ID to prevent re-mounts
      const widgetProps = getWidgetProps(widget.id, stableIdRef.current!);
      return <WidgetComponent {...widgetProps} />;
    }

    // Fallback for widgets without specific components
        return (
          <div className="p-4 flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-white text-lg font-bold mb-2">{widget.name}</div>
              <div className="text-neutral-400 text-sm">{widget.description}</div>
          <div className="mt-4 text-xs text-neutral-500">Widget component not found for {widget.id}</div>
            </div>
          </div>
        );
  };

  return (
    <div className="w-full h-full bg-widget-body">{renderContent()}</div>
  );
}

interface FreeFloatingWidgetProps {
  id: string; // Unique identifier for this widget instance
  widget: Widget;
  initialPosition?: { x: number; y: number };
  initialSize?: { width: number; height: number };
  canvasRef: React.RefObject<HTMLDivElement | null>;
  onRemove?: (widgetId: string) => void;
  onPositionChange?: (widgetId: string, position: { x: number; y: number }) => void;
  onPositionSave?: (widgetId: string, position: { x: number; y: number }) => void;
  onSizeChange?: (widgetId: string, size: { width: number; height: number }) => void;
  onSizeSave?: (widgetId: string, size: { width: number; height: number }, position: { x: number; y: number }) => void;
}

export default function FreeFloatingWidget({
  id,
  widget,
  initialPosition = { x: 50, y: 50 },
  initialSize = { width: 800, height: 600 },
  canvasRef,
  onRemove,
  onPositionChange,
  onPositionSave,
  onSizeChange,
  onSizeSave
}: FreeFloatingWidgetProps) {
  const [position, setPosition] = useState(initialPosition);
  const [size, setSize] = useState(initialSize);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string>('');
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0, posX: 0, posY: 0 });
  
  const widgetRef = useRef<HTMLDivElement>(null);

  // Handle dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isResizing) return;
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
    e.preventDefault();
  };

  // Handle resize start
  const handleResizeMouseDown = (e: React.MouseEvent, handle: string) => {
    setIsResizing(true);
    setResizeHandle(handle);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
      posX: position.x,
      posY: position.y
    });
    e.preventDefault();
    e.stopPropagation();
  };

  // Mouse move handler
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const canvasWidth = canvasRect.width;
      const canvasHeight = canvasRect.height;

      if (isDragging) {
        const newX = Math.max(0, Math.min(e.clientX - dragStart.x, canvasWidth - size.width));
        const newY = Math.max(0, Math.min(e.clientY - dragStart.y, canvasHeight - size.height));
        
        const newPosition = { x: newX, y: newY };
        setPosition(newPosition);
        onPositionChange?.(id, newPosition);
      }

      if (isResizing) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        
        let newWidth = size.width;
        let newHeight = size.height;
        let newX = position.x;
        let newY = position.y;

        switch (resizeHandle) {
          case 'se': // Southeast (bottom-right)
            newWidth = Math.max(200, Math.min(resizeStart.width + deltaX, canvasWidth - newX));
            newHeight = Math.max(150, Math.min(resizeStart.height + deltaY, canvasHeight - newY));
            break;
          case 'sw': // Southwest (bottom-left)
            newWidth = Math.max(200, resizeStart.width - deltaX);
            newHeight = Math.max(150, Math.min(resizeStart.height + deltaY, canvasHeight - resizeStart.posY));
            // Calculate new X position: original position + (original width - new width)
            newX = Math.max(0, resizeStart.posX + (resizeStart.width - newWidth));
            // Ensure widget doesn't go beyond canvas boundaries
            if (newX + newWidth > canvasWidth) {
              newWidth = canvasWidth - newX;
            }
            break;
          case 'ne': // Northeast (top-right)
            newWidth = Math.max(200, Math.min(resizeStart.width + deltaX, canvasWidth - resizeStart.posX));
            newHeight = Math.max(150, resizeStart.height - deltaY);
            newY = Math.max(0, resizeStart.posY + (resizeStart.height - newHeight));
            if (newY + newHeight > canvasHeight) {
              newHeight = canvasHeight - newY;
            }
            break;
          case 'nw': // Northwest (top-left)
            newWidth = Math.max(200, resizeStart.width - deltaX);
            newHeight = Math.max(150, resizeStart.height - deltaY);
            newX = Math.max(0, resizeStart.posX + (resizeStart.width - newWidth));
            newY = Math.max(0, resizeStart.posY + (resizeStart.height - newHeight));
            if (newX + newWidth > canvasWidth) {
              newWidth = canvasWidth - newX;
            }
            if (newY + newHeight > canvasHeight) {
              newHeight = canvasHeight - newY;
            }
            break;
          case 'n': // North (top)
            newHeight = Math.max(150, resizeStart.height - deltaY);
            newY = Math.max(0, resizeStart.posY + (resizeStart.height - newHeight));
            if (newY + newHeight > canvasHeight) {
              newHeight = canvasHeight - newY;
            }
            break;
          case 's': // South (bottom)
            newHeight = Math.max(150, Math.min(resizeStart.height + deltaY, canvasHeight - resizeStart.posY));
            break;
          case 'e': // East (right)
            newWidth = Math.max(200, Math.min(resizeStart.width + deltaX, canvasWidth - resizeStart.posX));
            break;
          case 'w': // West (left)
            newWidth = Math.max(200, resizeStart.width - deltaX);
            newX = Math.max(0, resizeStart.posX + (resizeStart.width - newWidth));
            if (newX + newWidth > canvasWidth) {
              newWidth = canvasWidth - newX;
            }
            break;
        }

        const newSize = { width: newWidth, height: newHeight };
        const newPosition = { x: newX, y: newY };
        
        setSize(newSize);
        setPosition(newPosition);
        onSizeChange?.(id, newSize);
        onPositionChange?.(id, newPosition);
      }
    };

    const handleMouseUp = () => {
      // Save position to localStorage when dropping (only if we were dragging)
      if (isDragging && onPositionSave) {
        onPositionSave(id, position);
      }
      
      // Save size and position when resize ends (only if we were resizing)
      if (isResizing && onSizeSave) {
        onSizeSave(id, size, position);
      }
      
      setIsDragging(false);
      setIsResizing(false);
      setResizeHandle('');
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, resizeStart, position, size, id, canvasRef, onPositionChange, onPositionSave, onSizeChange, onSizeSave, resizeHandle]);



  return (
    <div
      ref={widgetRef}
      className="absolute bg-widget-body border border-border rounded-lg shadow-lg overflow-hidden group"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: isDragging || isResizing ? 1000 : 1
      }}
    >
      {/* Header */}
      <div 
        className="bg-widget-header border-b border-border px-3 py-2 flex items-center justify-between select-none"
        onMouseDown={handleMouseDown}
      >
        <div className="text-sm font-medium text-foreground truncate">{widget.name}</div>
        {onRemove && (
          <button
            onClick={() => onRemove(id)}
            className="text-muted-foreground hover:text-destructive transition-colors ml-2 opacity-0 group-hover:opacity-100"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="h-[calc(100%-40px)]">
        <WidgetRenderer widget={widget} />
      </div>

      {/* Resize Handles */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Corner handles */}
        <div
          className="absolute bottom-0 left-0 w-3 h-3 bg-border cursor-sw-resize"
          onMouseDown={(e) => handleResizeMouseDown(e, 'sw')}
        />
        <div
          className="absolute bottom-0 right-0 w-3 h-3 bg-border cursor-se-resize"
          onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
        />
        
        {/* Edge handles */}
        <div
          className="absolute bottom-0 left-3 right-3 h-1 bg-border cursor-s-resize"
          onMouseDown={(e) => handleResizeMouseDown(e, 's')}
        />
        <div
          className="absolute left-0 top-3 bottom-3 w-1 bg-border cursor-w-resize"
          onMouseDown={(e) => handleResizeMouseDown(e, 'w')}
        />
        <div
          className="absolute right-0 top-3 bottom-3 w-1 bg-border cursor-e-resize"
          onMouseDown={(e) => handleResizeMouseDown(e, 'e')}
        />
      </div>
    </div>
  );
} 