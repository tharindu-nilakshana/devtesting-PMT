/**
 * Dynamic Grid Area Component
 * 
 * Renders individual grid areas with resizing capabilities and widget support.
 * This component handles the coordinate system integration and resize events.
 */

import React, { useState, useEffect, useRef } from 'react';
import { ResizableGrid } from '@/components/bloomberg-ui/ResizableGrid';
import { EmptyGridCell } from '@/components/bloomberg-ui/EmptyGridCell';
import { DynamicAreaProps } from '@/types/layouts';

export function DynamicGridArea({ 
  area, 
  widget, 
  coordinates, 
  onResize, 
  onAddWidget, 
  onRemoveWidget 
}: DynamicAreaProps) {
  const [size, setSize] = useState(() => {
    if (coordinates) {
      return {
        width: `${coordinates.Width}px`,
        height: `${coordinates.Height}px`
      };
    }
    return {
      width: '100%',
      height: '100%'
    };
  });

  const areaRef = useRef<HTMLDivElement>(null);

  // Update size when coordinates change
  useEffect(() => {
    if (coordinates) {
      setSize({
        width: `${coordinates.Width}px`,
        height: `${coordinates.Height}px`
      });
    }
  }, [coordinates]);

  const handleResize = (newSize: { width: number; height: number }) => {
    const sizeStr = {
      width: `${newSize.width}px`,
      height: `${newSize.height}px`
    };
    
    setSize(sizeStr);
    
    if (onResize) {
      onResize(area.id, {
        Width: newSize.width,
        Height: newSize.height,
        TopPos: coordinates?.TopPos || 0,
        LeftPos: coordinates?.LeftPos || 0
      });
    }
  };

  const renderWidget = () => {
    if (!widget) {
      return (
        <EmptyGridCell
          position={area.id}
          onAddWidget={onAddWidget}
        />
      );
    }

    // Find the widget component
    const WidgetComponent = require('@/components/widgets')[widget.name];
    
    if (!WidgetComponent) {
      return (
        <div className="w-full h-full bg-widget-body border border-border rounded-none flex flex-col">
          <div className="px-4 py-2 bg-widget-header border-b border-border">
            <h3 className="text-foreground">{widget.name}</h3>
          </div>
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p>{widget.name}</p>
              <p className="text-xs mt-2">Widget not implemented</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full h-full bg-widget-body border border-border rounded-none overflow-hidden">
        <WidgetComponent 
          wgid={`${area.id}-${widget.id}`}
          onRemove={() => onRemoveWidget?.(area.id)}
          settings={widget.settings || {}}
        />
      </div>
    );
  };

  return (
    <div
      ref={areaRef}
      className="dynamic-grid-area"
      data-area={area.id}
      data-position={area.id}
      style={{
        gridColumn: `${area.position.x + 1} / span ${area.size.width}`,
        gridRow: `${area.position.y + 1} / span ${area.size.height}`,
        minWidth: '150px',
        minHeight: '150px'
      }}
    >
      <ResizableGrid
        defaultSize={size}
        minWidth={150}
        minHeight={150}
        enable={{ 
          left: true, 
          right: true, 
          top: true, 
          bottom: true 
        }}
        onResize={handleResize}
      >
        {renderWidget()}
      </ResizableGrid>
    </div>
  );
}
