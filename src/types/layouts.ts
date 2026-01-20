/**
 * Dynamic Layout System Types
 * 
 * This file defines the metadata structure for all grid layouts,
 * enabling dynamic rendering without manual switch statements.
 */

export interface GridArea {
  id: string;           // "area-1", "area-2", etc.
  position: { x: number; y: number };
  size: { width: number; height: number };
  parent?: string;      // For nested areas
}

export interface SplitConfig {
  direction: 'horizontal' | 'vertical';
  ratio: number[];      // [70, 30] for 70-30 split
  areas: string[];      // Which areas this split affects
}

export interface LayoutStructure {
  areas: GridArea[];
  splits: SplitConfig[];
}

export interface LayoutConfig {
  id: string;           // "g34", "g21", etc.
  name: string;         // "3-grid-left-large"
  cells: number;        // 3
  structure: LayoutStructure;
}

export interface DynamicLayoutProps {
  layout: string;
  widgets: any[];
  coordinates?: Record<string, any>;
  templateId?: string; // Template ID for loading stored grid sizes
  onResize?: (areaId: string, newSize: any) => void;
  onResizeStop?: (areaId: string, newSize: any) => void;
  onAddWidget?: (areaId: string, widgetId: string) => void;
  onRemoveWidget?: (areaId: string) => void;
  // Additional props needed for widget rendering
  renderWidget?: (widgetId: string, position: string) => React.ReactNode;
  getWidget?: (position: string) => string | null;
  onSetTargetPosition?: (position: string) => void;
  onSetIsWidgetPanelOpen?: (open: boolean) => void;
  // Drag and drop handlers
  onDragOver?: (e: React.DragEvent, position: string) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, position: string) => void;
  isDragOver?: string | null;
}

export interface DynamicAreaProps {
  area: GridArea;
  widget?: any;
  coordinates?: any;
  onResize?: (areaId: string, newSize: any) => void;
  onAddWidget?: (areaId: string, widgetId: string) => void;
  onRemoveWidget?: (areaId: string) => void;
}
