export type LayoutType = 
  | 'single' 
  | 'two-vertical' 
  | 'two-horizontal' 
  | 'three-vertical' 
  | 'three-horizontal' 
  | 'three-left-right' 
  | 'three-top-bottom' 
  | 'three-left-stack' 
  | 'three-right-stack' 
  | 'four-grid' 
  | 'four-vertical' 
  | 'four-horizontal' 
  | 'five-grid' 
  | 'five-vertical' 
  | 'five-horizontal'
  // New format layout names
  | '1-grid'
  | '2-grid-vertical'
  | '2-grid-horizontal'
  // 3-cell layouts (additional)
  | '3-grid-rows'
  | '3-grid-columns'
  | '3-grid-left-large'
  | '3-grid-right-large'
  | '3-grid-top-large'
  | '3-grid-bottom-large'
  // 4-cell layouts (additional)
  | '4-grid'
  | '4-grid-columns'
  | '4-grid-rows'
  | '4-grid-left-large'
  | '4-grid-right-large'
  | '4-grid-top-large'
  | '4-grid-bottom-large'
  // 5-cell layouts (additional)
  | '5-grid-rows'
  | '5-grid-columns'
  | '5-grid-complex'
  // 6-cell layouts
  | '6-grid-2x3'
  | '6-grid-3x2'
  | '6-grid-rows'
  | '6-grid-left-large'
  // 7-cell layouts
  | '7-grid-complex1'
  | '7-grid-complex2'
  | '7-grid-left'
  | '7-grid-large'
  // 8-cell layouts
  | '8-grid-2x4'
  | '8-grid-4x2'
  | '8-grid-columns'
  | '8-grid-rows'
  // 9-cell layout
  | '9-grid'
  // 12-cell layouts
  | '12-grid-3x4'
  | '12-grid-4x3'
  // 16-cell layout
  | '16-grid'
  // 24-cell layouts
  | '24-grid-4x6'
  | '24-grid-6x4'
  | '24-grid-rows'
  | '24-grid-columns'
  // 28-cell layouts
  | '28-grid-4x7'
  | '28-grid-7x4'
  // 32-cell layouts
  | '32-grid-4x8'
  | '32-grid-8x4'
  | 'no-grid';

export interface Widget {
  id: string;
  name: string;
  description: string;
  category?: string;
  isImplemented?: boolean;
  config?: Record<string, unknown>;
}

export interface WidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectWidget: (widget: Widget) => void;
  onAddWidgetDirectly?: (widget: Widget) => void;
  recentWidgets?: Widget[];
  isInsideTabbedWidget?: boolean;
  isFreeFloatingLayout?: boolean;
}

export interface ResizeState {
  isResizing: boolean;
  direction: 'horizontal' | 'vertical';
  startPos: number;
  startSizes: number[];
  dividerIndex?: number;
  layoutKey?: string;
}

export interface MockWidgetProps {
  widget: Widget;
  sectionId: string;
  onUpdateWidgetConfig: (sectionId: string, updater: (prev: Record<string, unknown>) => Record<string, unknown>) => void;
  renderNestedLayout: (layout: LayoutType, parentKey: string) => React.ReactNode;
  onRemoveNestedSections: (prefix: string) => void;
}

export interface WidgetSectionProps {
  sectionId: string;
}

export interface SavedTemplate {
  id: number;
  name: string;
  description: string;
  layout: LayoutType;
}

export interface ConfirmModalData {
  title: string;
  message: string;
  onConfirm: () => void;
}
