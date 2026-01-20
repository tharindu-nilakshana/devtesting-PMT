import React from 'react';
import { LayoutType } from '../types';
import { getTabbedWidgetCellPosition, getGridCellPosition } from '../utils/gridPositionCalculator';
import { ResizablePair } from '../components/bloomberg-ui/ResizablePair';
import { ResizableGroup } from '../components/bloomberg-ui/ResizableGroup';

interface LayoutRendererProps {
  selectedLayout: LayoutType;
  gridSizes: { [key: string]: number[] };
  containerRef: React.RefObject<HTMLDivElement>;
  handleMouseDown?: (e: React.MouseEvent, direction: 'horizontal' | 'vertical', layoutKey: string, dividerIndex?: number) => void; // Optional for backward compatibility
  WidgetSection: React.ComponentType<{ sectionId: string }>;
  FreeFloatingCanvas?: React.ComponentType<{
    onAddWidget?: () => void;
    widgetCatalog?: unknown[];
  }>;
  onAddWidget?: () => void;
  widgetCatalog?: unknown[];
  templateId?: string; // Optional template ID for saving grid positions
  setGridSizes?: React.Dispatch<React.SetStateAction<{ [key: string]: number[] }>>; // Optional callback to update grid sizes
}

export function renderLayout({
  selectedLayout,
  gridSizes,
  containerRef,
  handleMouseDown,
  WidgetSection,
  FreeFloatingCanvas,
  onAddWidget,
  widgetCatalog,
  templateId,
  setGridSizes
}: LayoutRendererProps): React.ReactNode {
  const currentSizes = gridSizes[selectedLayout] || [];
  
  // Generate unique grid cell IDs for all grid layouts (except free-floating)
  const getCellId = (cellIndex: number) => {
    // For free-floating layouts, don't use grid cell IDs
    if (selectedLayout === 'no-grid') {
      return 'single';
    }
    return getGridCellPosition(selectedLayout, cellIndex);
  };
  
  // Helper to update grid sizes if setGridSizes is provided
  const updateGridSizes = (newSizes: number[]) => {
    if (setGridSizes) {
      setGridSizes(prev => ({
        ...prev,
        [selectedLayout]: newSizes
      }));
    }
  };
  
  switch (selectedLayout) {
    case 'single':
      return <WidgetSection sectionId={getCellId(0)} />;
    
    case 'two-vertical':
    case '2-grid-vertical':
      // Use ResizablePair for two-column layouts
      if (setGridSizes && templateId) {
        const sizes: [string, string] = [
          `${currentSizes[0] || 50}%`,
          `${currentSizes[1] || 50}%`
        ];
        return (
          <ResizablePair
            direction="horizontal"
            minSize={60}
            initialSizes={sizes}
            templateId={templateId}
            layout={selectedLayout}
            onSizeChange={(newSizes) => {
              updateGridSizes([parseFloat(newSizes[0]), parseFloat(newSizes[1])]);
            }}
          >
            <div className="w-full h-full"><WidgetSection sectionId={getCellId(0)} /></div>
            <div className="w-full h-full"><WidgetSection sectionId={getCellId(1)} /></div>
          </ResizablePair>
        );
      }
      // Fallback to old implementation if setGridSizes/templateId not provided
      return (
        <div className="flex w-full h-full" ref={containerRef}>
          <div style={{ width: `${currentSizes[0] || 50}%` }}>
            <WidgetSection sectionId={getCellId(0)} />
          </div>
          <div 
            className="w-1 bg-neutral-700 hover:bg-primary cursor-col-resize transition-colors flex items-center justify-center"
            onMouseDown={(e) => handleMouseDown?.(e, 'horizontal', 'two-vertical')}
          >
            <div className="w-0.5 h-8 bg-neutral-500 hover:bg-primary transition-colors"></div>
          </div>
          <div style={{ width: `${currentSizes[1] || 50}%` }}>
            <WidgetSection sectionId={getCellId(1)} />
          </div>
        </div>
      );
    
    case 'two-horizontal':
    case '2-grid-horizontal':
      // Use ResizablePair for two-row layouts
      if (setGridSizes && templateId) {
        const sizes: [string, string] = [
          `${currentSizes[0] || 50}%`,
          `${currentSizes[1] || 50}%`
        ];
        return (
          <ResizablePair
            direction="vertical"
            minSize={60}
            initialSizes={sizes}
            templateId={templateId}
            layout={selectedLayout}
            onSizeChange={(newSizes) => {
              updateGridSizes([parseFloat(newSizes[0]), parseFloat(newSizes[1])]);
            }}
          >
            <div className="w-full h-full"><WidgetSection sectionId={getCellId(0)} /></div>
            <div className="w-full h-full"><WidgetSection sectionId={getCellId(1)} /></div>
          </ResizablePair>
        );
      }
      // Fallback to old implementation
      return (
        <div className="flex flex-col w-full h-full" ref={containerRef}>
          <div style={{ height: `${currentSizes[0] || 50}%` }}>
            <WidgetSection sectionId={getCellId(0)} />
          </div>
          <div 
            className="h-1 bg-neutral-700 hover:bg-primary cursor-row-resize transition-colors flex items-center justify-center"
            onMouseDown={(e) => handleMouseDown?.(e, 'vertical', 'two-horizontal')}
          >
            <div className="h-0.5 w-8 bg-neutral-500 hover:bg-primary transition-colors"></div>
          </div>
          <div style={{ height: `${currentSizes[1] || 50}%` }}>
            <WidgetSection sectionId={getCellId(1)} />
          </div>
        </div>
      );
    
    case 'three-vertical':
    case '3-grid-columns':
      // Use ResizableGroup for three-column layouts
      if (setGridSizes && templateId) {
        const sizes = [
          `${currentSizes[0] || 33.33}%`,
          `${currentSizes[1] || 33.33}%`,
          `${currentSizes[2] || 33.34}%`
        ];
        return (
          <ResizableGroup
            direction="horizontal"
            minSize={60}
            cells={[
              { content: <div className="w-full h-full"><WidgetSection sectionId={getCellId(0)} /></div>, position: getCellId(0), initialSize: sizes[0] },
              { content: <div className="w-full h-full"><WidgetSection sectionId={getCellId(1)} /></div>, position: getCellId(1), initialSize: sizes[1] },
              { content: <div className="w-full h-full"><WidgetSection sectionId={getCellId(2)} /></div>, position: getCellId(2), initialSize: sizes[2] }
            ]}
            templateId={templateId}
            layout={selectedLayout}
            onSizeChange={(newSizes) => {
              updateGridSizes(newSizes.map(s => parseFloat(s)));
            }}
          />
        );
      }
      // Fallback to old implementation
      return (
        <div className="flex w-full h-full" ref={containerRef}>
          <div style={{ width: `${currentSizes[0] || 33.33}%` }}>
            <WidgetSection sectionId={getCellId(0)} />
          </div>
          <div 
            className="w-1 bg-neutral-700 hover:bg-primary cursor-col-resize transition-colors flex items-center justify-center"
            onMouseDown={(e) => handleMouseDown?.(e, 'horizontal', 'three-vertical', 0)}
          >
            <div className="w-0.5 h-8 bg-neutral-500 hover:bg-primary transition-colors"></div>
          </div>
          <div style={{ width: `${currentSizes[1] || 33.33}%` }}>
            <WidgetSection sectionId={getCellId(1)} />
          </div>
          <div 
            className="w-1 bg-neutral-700 hover:bg-primary cursor-col-resize transition-colors flex items-center justify-center"
            onMouseDown={(e) => handleMouseDown?.(e, 'horizontal', 'three-vertical', 1)}
          >
            <div className="w-0.5 h-8 bg-neutral-500 hover:bg-primary transition-colors"></div>
          </div>
          <div style={{ width: `${currentSizes[2] || 33.34}%` }}>
            <WidgetSection sectionId={getCellId(2)} />
          </div>
        </div>
      );

    case 'three-horizontal':
    case '3-grid-rows':
      // Use ResizableGroup for three-row layouts
      if (setGridSizes && templateId) {
        const sizes = [
          `${currentSizes[0] || 33.33}%`,
          `${currentSizes[1] || 33.33}%`,
          `${currentSizes[2] || 33.34}%`
        ];
        return (
          <ResizableGroup
            direction="vertical"
            minSize={60}
            cells={[
              { content: <div className="w-full h-full"><WidgetSection sectionId={getCellId(0)} /></div>, position: getCellId(0), initialSize: sizes[0] },
              { content: <div className="w-full h-full"><WidgetSection sectionId={getCellId(1)} /></div>, position: getCellId(1), initialSize: sizes[1] },
              { content: <div className="w-full h-full"><WidgetSection sectionId={getCellId(2)} /></div>, position: getCellId(2), initialSize: sizes[2] }
            ]}
            templateId={templateId}
            layout={selectedLayout}
            onSizeChange={(newSizes) => {
              updateGridSizes(newSizes.map(s => parseFloat(s)));
            }}
          />
        );
      }
      // Fallback to old implementation
      return (
        <div className="flex flex-col w-full h-full" ref={containerRef}>
          <div style={{ height: `${currentSizes[0] || 33.33}%` }}>
            <WidgetSection sectionId={getCellId(0)} />
          </div>
          <div 
            className="h-1 bg-neutral-700 hover:bg-primary cursor-row-resize transition-colors flex items-center justify-center"
            onMouseDown={(e) => handleMouseDown?.(e, 'vertical', 'three-horizontal', 0)}
          >
            <div className="h-0.5 w-8 bg-neutral-500 hover:bg-primary transition-colors"></div>
          </div>
          <div style={{ height: `${currentSizes[1] || 33.33}%` }}>
            <WidgetSection sectionId={getCellId(1)} />
          </div>
          <div 
            className="h-1 bg-neutral-700 hover:bg-primary cursor-row-resize transition-colors flex items-center justify-center"
            onMouseDown={(e) => handleMouseDown?.(e, 'vertical', 'three-horizontal', 1)}
          >
            <div className="h-0.5 w-8 bg-neutral-500 hover:bg-primary transition-colors"></div>
          </div>
          <div style={{ height: `${currentSizes[2] || 33.34}%` }}>
            <WidgetSection sectionId={getCellId(2)} />
          </div>
        </div>
      );
    
    case 'no-grid':
      return FreeFloatingCanvas ? 
        <FreeFloatingCanvas onAddWidget={onAddWidget} widgetCatalog={widgetCatalog} /> : 
        <div>Free floating canvas not available</div>;
    
    default:
      return <WidgetSection sectionId={getCellId(0)} />;
  }
}

export function renderNestedLayout(
  layout: LayoutType, 
  parentKey: string,
  gridSizes?: { [key: string]: number[] },
  WidgetSection?: React.ComponentType<{ sectionId: string }>
): React.ReactNode {
  // Default grid sizes if not provided (50/50 split for 2-cell, equal for others)
  const defaultSizes: Record<string, number[]> = {
    'single': [100],
    'two-vertical': [50, 50],
    'two-horizontal': [50, 50],
    'three-vertical': [33.33, 33.33, 33.34],
    'three-horizontal': [33.33, 33.33, 33.34],
    'four-grid': [25, 25, 25, 25]
  };
  
  const currentSizes = gridSizes?.[layout] || defaultSizes[layout] || [100];
  
  // Default WidgetSection component if not provided
  const DefaultWidgetSection: React.ComponentType<{ sectionId: string }> = ({ sectionId }) => (
    <div data-section-id={sectionId} className="w-full h-full" />
  );
  
  const SectionComponent = WidgetSection || DefaultWidgetSection;
  
  // Generate gt-prefixed cell positions for tabbed widgets
  const getTabbedSectionId = (cellIndex: number) => getTabbedWidgetCellPosition(layout, cellIndex);
  
  switch (layout) {
    case 'single':
      return <SectionComponent sectionId={getTabbedSectionId(0)} />;
    case 'two-vertical':
      return (
        <div className="flex w-full h-full min-h-0">
          <div style={{ width: `${currentSizes[0]}%` }}>
            <SectionComponent sectionId={getTabbedSectionId(0)} />
          </div>
          <div className="w-1 bg-neutral-700" />
          <div style={{ width: `${currentSizes[1]}%` }}>
            <SectionComponent sectionId={getTabbedSectionId(1)} />
          </div>
        </div>
      );
    case 'two-horizontal':
      return (
        <div className="flex flex-col w-full h-full min-h-0">
          <div style={{ height: `${currentSizes[0]}%` }}>
            <SectionComponent sectionId={getTabbedSectionId(0)} />
          </div>
          <div className="h-1 bg-neutral-700" />
          <div style={{ height: `${currentSizes[1]}%` }}>
            <SectionComponent sectionId={getTabbedSectionId(1)} />
          </div>
        </div>
      );
    case 'three-vertical':
      return (
        <div className="flex w-full h-full min-h-0">
          <div style={{ width: `${currentSizes[0]}%` }}>
            <SectionComponent sectionId={getTabbedSectionId(0)} />
          </div>
          <div className="w-1 bg-neutral-700" />
          <div style={{ width: `${currentSizes[1]}%` }}>
            <SectionComponent sectionId={getTabbedSectionId(1)} />
          </div>
          <div className="w-1 bg-neutral-700" />
          <div style={{ width: `${currentSizes[2]}%` }}>
            <SectionComponent sectionId={getTabbedSectionId(2)} />
          </div>
        </div>
      );
    case 'three-horizontal':
      return (
        <div className="flex flex-col w-full h-full min-h-0">
          <div style={{ height: `${currentSizes[0]}%` }}>
            <SectionComponent sectionId={getTabbedSectionId(0)} />
          </div>
          <div className="h-1 bg-neutral-700" />
          <div style={{ height: `${currentSizes[1]}%` }}>
            <SectionComponent sectionId={getTabbedSectionId(1)} />
          </div>
          <div className="h-1 bg-neutral-700" />
          <div style={{ height: `${currentSizes[2]}%` }}>
            <SectionComponent sectionId={getTabbedSectionId(2)} />
          </div>
        </div>
      );
    case 'four-grid':
      return (
        <div className="grid grid-cols-2 grid-rows-2 w-full h-full gap-1">
          <div>
            <SectionComponent sectionId={getTabbedSectionId(0)} />
          </div>
          <div>
            <SectionComponent sectionId={getTabbedSectionId(1)} />
          </div>
          <div>
            <SectionComponent sectionId={getTabbedSectionId(2)} />
          </div>
          <div>
            <SectionComponent sectionId={getTabbedSectionId(3)} />
          </div>
        </div>
      );
    // Add more cases as needed...
    default:
      return <SectionComponent sectionId={getTabbedSectionId(0)} />;
  }
}
