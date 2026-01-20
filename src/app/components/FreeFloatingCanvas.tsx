/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import FreeFloatingWidget from './FreeFloatingWidget';

interface Widget {
  id: string;
  name: string;
  description: string;
}

interface FloatingWidgetData {
  id: string; // Unique identifier for this widget instance
  widget: Widget;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

interface FreeFloatingCanvasProps {
  onAddWidget?: () => void;
  widgetCatalog?: Widget[]; // list of all available widgets for id lookup
  selectedWidgetId?: string; // widget ID that was just selected from the panel
  templateWidgets?: any[]; // widgets from the selected template (for saved templates)
  templateId?: string; // template ID for API calls
  isTemplateSaved?: boolean; // whether the template is saved (determines if API calls should be made)
  onUpdateWidgetFields?: (widgetId: string, templateId: string, updates: any) => Promise<{ success: boolean; message: string }>;
  onAddWidgetToTemplate?: (templateId: string, widgetId: string, widgetTitle: string, position: string, coordinates?: { top: number; left: number; height: number; width: number }) => Promise<void>;
  onRemoveWidgetFromTemplate?: (templateId: string, widgetId: string) => Promise<void>; // Callback to remove widget via API
  onRefreshTemplates?: () => Promise<void>; // Callback to refresh templates after adding widget
}

export default function FreeFloatingCanvas({ 
  onAddWidget, 
  widgetCatalog = [], 
  selectedWidgetId, 
  templateWidgets = [],
  templateId,
  isTemplateSaved = false,
  onUpdateWidgetFields,
  onAddWidgetToTemplate,
  onRemoveWidgetFromTemplate,
  onRefreshTemplates
}: FreeFloatingCanvasProps) {
  const [floatingWidgets, setFloatingWidgets] = useState<FloatingWidgetData[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // State for widget removal confirmation
  const [widgetToRemove, setWidgetToRemove] = useState<string | null>(null);
  const [isWidgetRemoveConfirmOpen, setIsWidgetRemoveConfirmOpen] = useState(false);

  // Load floating widgets from localStorage on mount
  useEffect(() => {
    try {
      const savedFloatingWidgets = localStorage.getItem('pmt_floating_widgets');
      if (savedFloatingWidgets) {
        const parsed = JSON.parse(savedFloatingWidgets);
        
        // Migrate old widgets that don't have unique IDs
        const migratedWidgets = parsed.map((widget: any, index: number) => {
          if (!widget.id) {
            // Generate unique ID for old widgets
            return {
              ...widget,
              id: `migrated-${widget.widget?.id || 'unknown'}-${index}-${Date.now()}`
            };
          }
          return widget;
        });
        
        setFloatingWidgets(migratedWidgets);
        
        // Save migrated data back to localStorage
        if (migratedWidgets.length !== parsed.length || migratedWidgets.some((w: any, i: number) => !parsed[i]?.id)) {
          localStorage.setItem('pmt_floating_widgets', JSON.stringify(migratedWidgets));
          console.log('✅ Migrated old floating widgets data');
        }
        
        console.log('✅ Floating widgets loaded from localStorage');
      }
    } catch (error) {
      console.error('❌ Failed to load floating widgets:', error);
    }
  }, []);

  // Load widgets from template when templateWidgets prop changes
  useEffect(() => {
    if (templateWidgets && templateWidgets.length > 0) {
      console.log('Loading widgets from template:', templateWidgets);
      
      // Clear localStorage when loading from template to avoid conflicts
      localStorage.removeItem('pmt_floating_widgets');
      
      const loadedWidgets: FloatingWidgetData[] = templateWidgets.map((templateWidget, index) => {
        // Find the widget in the catalog
        const widget = widgetCatalog.find(w => 
          w.id === templateWidget.name || 
          w.name.toLowerCase().replace(/\s+/g, '-') === templateWidget.name
        );
        
        if (!widget) {
          console.warn(`Widget not found in catalog: ${templateWidget.name}`);
          return null;
        }
        
        // Get coordinates from template widget settings
        const coordinates = templateWidget.settings?.coordinates || { top: 50, left: 50, width: 400, height: 300 };
        
        return {
          id: templateWidget.id || `template-${templateWidget.name}-${index}`,
          widget,
          position: { x: coordinates.left, y: coordinates.top },
          size: { width: coordinates.width, height: coordinates.height }
        };
      }).filter(Boolean) as FloatingWidgetData[];
      
      if (loadedWidgets.length > 0) {
        setFloatingWidgets(loadedWidgets);
        console.log('✅ Loaded widgets from template:', loadedWidgets);
      }
    } else if (templateWidgets && templateWidgets.length === 0) {
      // Template has no widgets, clear localStorage and floating widgets
      localStorage.removeItem('pmt_floating_widgets');
      setFloatingWidgets([]);
      console.log('✅ Cleared widgets for empty template');
    }
  }, [templateWidgets, widgetCatalog]);

  // Handle widget selection from the panel
  useEffect(() => {
    if (selectedWidgetId) {
      const widget = widgetCatalog.find(w => w.id === selectedWidgetId);
      if (widget) {
        addWidget(widget);
      }
    }
  }, [selectedWidgetId, widgetCatalog]);

  // Save floating widgets to localStorage only for non-position changes (add/remove/size)
  useEffect(() => {
    // Only save if widgets array has changed (not just position updates)
    if (floatingWidgets.length > 0) {
      try {
        localStorage.setItem('pmt_floating_widgets', JSON.stringify(floatingWidgets));
        console.log('✅ Floating widgets saved to localStorage (non-position change)');
      } catch (error) {
        console.error('❌ Failed to save floating widgets:', error);
      }
    }
  }, [floatingWidgets.length]); // Only trigger on add/remove, not position changes

  // Toast message for user feedback
  const [toast, setToast] = useState<string | null>(null);

  // Helper to show toast for 2 seconds
  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  }, []);

  // Adds a widget to the canvas (allows multiple widgets of same type)
  const addWidget = useCallback(async (widget: Widget) => {
    if (widget.id === 'tabbed-widget') {
      showToast('Tabbed widget is only available in grid layouts.');
      return;
    }

    // Calculate widget dimensions and position first
    let DEFAULT_WIDTH = 800;
    let DEFAULT_HEIGHT = 600;
    let centerX = 0;
    let centerY = 0;

    const rect = canvasRef.current?.getBoundingClientRect();

    if (rect) {
      DEFAULT_WIDTH = Math.min(1000, Math.max(800, rect.width * 0.45));
      DEFAULT_HEIGHT = Math.min(800, Math.max(600, rect.height * 0.4));

      centerX = (rect.width - DEFAULT_WIDTH) / 2;
      centerY = (rect.height - DEFAULT_HEIGHT) / 2;
    } else {
      // Fallback to viewport size if canvas not yet measured
      DEFAULT_WIDTH = Math.min(1000, Math.max(800, window.innerWidth * 0.45));
      DEFAULT_HEIGHT = Math.min(800, Math.max(600, window.innerHeight * 0.4));

      centerX = (window.innerWidth - DEFAULT_WIDTH) / 2;
      centerY = (window.innerHeight - DEFAULT_HEIGHT) / 2;
    }

    // First add the widget locally
    setFloatingWidgets((prev) => {
      const newFloatingWidget: FloatingWidgetData = {
        id: `floating-${widget.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        widget,
        position: { x: centerX, y: centerY },
        size: { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT }
      };

      return [...prev, newFloatingWidget];
    });

    // If template is saved, also add widget via API
    if (isTemplateSaved && templateId && onAddWidgetToTemplate) {
      try {
        console.log('🔄 Adding widget to saved template via API');
        
        // For free-floating templates, we use "area-1" as the position
        // since all widgets are in the same free-floating area
        await onAddWidgetToTemplate(templateId, widget.id, widget.name, 'area-1', {
          top: centerY,
          left: centerX,
          height: DEFAULT_HEIGHT,
          width: DEFAULT_WIDTH
        });
        
        console.log('✅ Widget added to template via API');
        
        // Refresh the template to get the updated widget list with correct IDs
        if (onRefreshTemplates) {
          await onRefreshTemplates();
        }
      } catch (error) {
        console.error('❌ Error adding widget to template via API:', error);
      }
    }
  }, [showToast, canvasRef, isTemplateSaved, templateId, onAddWidgetToTemplate, onRefreshTemplates]);

  // Function to remove a widget
  const removeWidget = useCallback((widgetId: string) => {
    // For unsaved templates, remove widget locally without confirmation
    if (!isTemplateSaved) {
      console.log('Removing widget from unsaved template locally:', widgetId);
      setFloatingWidgets(prev => prev.filter(fw => fw.id !== widgetId));
      return;
    }
    
    // For saved templates, show confirmation dialog first
    setWidgetToRemove(widgetId);
    setIsWidgetRemoveConfirmOpen(true);
  }, [isTemplateSaved]);

  // Function to confirm widget removal (for saved templates)
  const confirmRemoveWidget = useCallback(async () => {
    if (!widgetToRemove || !templateId || !onRemoveWidgetFromTemplate) return;
    
    try {
      console.log('🔄 Removing widget from saved template via API:', widgetToRemove);
      
      // Extract the actual widget ID from the composite ID
      const floatingWidget = floatingWidgets.find(fw => fw.id === widgetToRemove);
      let actualWidgetId = widgetToRemove;
      
      if (floatingWidget?.id) {
        if (floatingWidget.id.includes('-') && !floatingWidget.id.startsWith('floating-')) {
          // Format: "templateId-widgetId" - extract the widget ID part
          actualWidgetId = floatingWidget.id.split('-').pop() || widgetToRemove;
        } else if (floatingWidget.id.startsWith('floating-')) {
          // Format: "floating-widgetId-timestamp-random" - this is a local widget, skip API call
          console.log('Skipping API call for local widget:', floatingWidget.id);
          setFloatingWidgets(prev => prev.filter(fw => fw.id !== widgetToRemove));
          setIsWidgetRemoveConfirmOpen(false);
          setWidgetToRemove(null);
          return;
        }
      }
      
      // Call API to remove widget
      await onRemoveWidgetFromTemplate(templateId, actualWidgetId);
      
      // Remove widget from local state
      setFloatingWidgets(prev => prev.filter(fw => fw.id !== widgetToRemove));
      
      console.log('✅ Widget removed from template via API');
      
      // Refresh templates to get updated widget list
      if (onRefreshTemplates) {
        await onRefreshTemplates();
      }
      
    } catch (error) {
      console.error('❌ Error removing widget from template via API:', error);
    } finally {
      setIsWidgetRemoveConfirmOpen(false);
      setWidgetToRemove(null);
    }
  }, [widgetToRemove, templateId, onRemoveWidgetFromTemplate, floatingWidgets, onRefreshTemplates]);

  // Function to update widget position (during drag - no localStorage save)
  const updateWidgetPosition = useCallback((widgetId: string, position: { x: number; y: number }) => {
    setFloatingWidgets(prev => 
      prev.map(fw => 
        fw.id === widgetId 
          ? { ...fw, position }
          : fw
      )
    );
  }, []);

  // Function to save widget position to localStorage (on drop)
  const saveWidgetPosition = useCallback(async (widgetId: string, position: { x: number; y: number }) => {
    setFloatingWidgets(prev => {
      const updated = prev.map(fw => 
        fw.id === widgetId 
          ? { ...fw, position }
          : fw
      );
      
      // Save to localStorage only when dropping
      try {
        localStorage.setItem('pmt_floating_widgets', JSON.stringify(updated));
        console.log('✅ Widget position saved to localStorage on drop');
      } catch (error) {
        console.error('❌ Failed to save widget position:', error);
      }
      
      return updated;
    });

    // If template is saved, also update via API
    if (isTemplateSaved && templateId && onUpdateWidgetFields) {
      try {
        console.log('🔄 Updating widget position via API for saved template');
        
        // Find the widget to get its actual API ID
        const floatingWidget = floatingWidgets.find(fw => fw.id === widgetId);
        // Extract the CustomDashboardWidgetID from the composite ID
        // Handle both formats: "templateId-widgetId" and "floating-widgetId-timestamp-random"
        let apiWidgetId = widgetId;
        if (floatingWidget?.id) {
          if (floatingWidget.id.includes('-') && !floatingWidget.id.startsWith('floating-')) {
            // Format: "templateId-widgetId" - extract the widget ID part
            apiWidgetId = floatingWidget.id.split('-').pop() || widgetId;
          } else if (floatingWidget.id.startsWith('floating-')) {
            // Format: "floating-widgetId-timestamp-random" - this is a local widget, skip API call
            console.log('Skipping API call for local widget:', floatingWidget.id);
            return;
          }
        }
        
        console.log('Widget ID mapping:', { widgetId, floatingWidgetId: floatingWidget?.id, apiWidgetId });
        
        const result = await onUpdateWidgetFields(apiWidgetId, templateId, {
          topPos: position.y,
          leftPos: position.x
        });
        
        if (result.success) {
          console.log('✅ Widget position updated via API');
        } else {
          console.error('❌ Failed to update widget position via API:', result.message);
        }
      } catch (error) {
        console.error('❌ Error updating widget position via API:', error);
      }
    }
  }, [isTemplateSaved, templateId, onUpdateWidgetFields, floatingWidgets]);

  // Function to save widget size and position (on resize end)
  const saveWidgetSize = useCallback(async (widgetId: string, size: { width: number; height: number }, position: { x: number; y: number }) => {
    setFloatingWidgets(prev => {
      const updated = prev.map(fw => 
        fw.id === widgetId 
          ? { ...fw, size, position }
          : fw
      );
      
      // Save to localStorage when resize ends
      try {
        localStorage.setItem('pmt_floating_widgets', JSON.stringify(updated));
        console.log('✅ Widget size and position saved to localStorage on resize end');
      } catch (error) {
        console.error('❌ Failed to save widget size and position:', error);
      }
      
      return updated;
    });

    // If template is saved, also update via API
    if (isTemplateSaved && templateId && onUpdateWidgetFields) {
      try {
        console.log('🔄 Updating widget size and position via API for saved template');
        
        // Find the widget to get its actual API ID
        const floatingWidget = floatingWidgets.find(fw => fw.id === widgetId);
        // Extract the CustomDashboardWidgetID from the composite ID
        // Handle both formats: "templateId-widgetId" and "floating-widgetId-timestamp-random"
        let apiWidgetId = widgetId;
        if (floatingWidget?.id) {
          if (floatingWidget.id.includes('-') && !floatingWidget.id.startsWith('floating-')) {
            // Format: "templateId-widgetId" - extract the widget ID part
            apiWidgetId = floatingWidget.id.split('-').pop() || widgetId;
          } else if (floatingWidget.id.startsWith('floating-')) {
            // Format: "floating-widgetId-timestamp-random" - this is a local widget, skip API call
            console.log('Skipping API call for local widget:', floatingWidget.id);
            return;
          }
        }
        
        console.log('Widget ID mapping:', { widgetId, floatingWidgetId: floatingWidget?.id, apiWidgetId });
        
        const result = await onUpdateWidgetFields(apiWidgetId, templateId, {
          topPos: position.y,
          leftPos: position.x,
          height: size.height,
          width: size.width
        });
        
        if (result.success) {
          console.log('✅ Widget size and position updated via API');
        } else {
          console.error('❌ Failed to update widget size and position via API:', result.message);
        }
      } catch (error) {
        console.error('❌ Error updating widget size and position via API:', error);
      }
    }
  }, [isTemplateSaved, templateId, onUpdateWidgetFields, floatingWidgets]);

  // Function to update widget size
  const updateWidgetSize = useCallback((widgetId: string, size: { width: number; height: number }) => {
    setFloatingWidgets(prev => 
      prev.map(fw => 
        fw.id === widgetId 
          ? { ...fw, size }
          : fw
      )
    );
  }, []);

  // Expose the addWidget function globally so the parent can use it
  // This will be used by the existing "Add Widget" functionality
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).addWidgetToCanvas = addWidget;
  }

  // Handle external drag-over/drop to add widget
  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const widgetId = e.dataTransfer.getData('text/plain');
    if (!widgetId) return;

    const widget = widgetCatalog.find((w) => w.id === widgetId);
    if (widget) {
      addWidget(widget);
    }
  };


  return (
    <div 
      ref={canvasRef}
      className="relative w-full h-full bg-background border border-border rounded-lg overflow-hidden"
      style={{ minHeight: 'calc(100vh - 200px)' }}
      onDragOver={handleCanvasDragOver}
      onDrop={handleCanvasDrop}
    >
      {/* Empty state when no widgets */}
      {floatingWidgets.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-muted-foreground mb-4">
              <svg className="w-20 h-20 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-3">Free Floating Canvas</h3>
            <p className="text-base text-muted-foreground mb-5">Add widgets to create your custom dashboard layout</p>
            <button
              onClick={onAddWidget}
              className="px-6 py-3 text-base font-medium bg-popover hover:bg-popover/80 text-foreground border border-border rounded-lg transition-colors"
            >
              Add Your First Widget
            </button>
          </div>
        </div>
      )}

      {/* Grid overlay (optional - can be toggled) */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="grid grid-cols-12 grid-rows-12 h-full w-full">
          {Array.from({ length: 144 }).map((_, i) => (
            <div key={i} className="border border-border"></div>
          ))}
        </div>
      </div>

      {/* Render all floating widgets */}
      {floatingWidgets.map((floatingWidget) => (
        <FreeFloatingWidget
          key={floatingWidget.id}
          id={floatingWidget.id}
          widget={floatingWidget.widget}
          initialPosition={floatingWidget.position}
          initialSize={floatingWidget.size}
          canvasRef={canvasRef}
          onRemove={removeWidget}
          onPositionChange={updateWidgetPosition}
          onPositionSave={saveWidgetPosition}
          onSizeChange={updateWidgetSize}
          onSizeSave={saveWidgetSize}
        />
      ))}

      {/* Canvas info overlay and Add Widget button */}
      <div className="absolute top-4 right-4 flex items-center gap-3 z-0">
        <button
          onClick={onAddWidget}
          className="px-3 py-2 bg-popover hover:bg-popover/80 text-foreground border border-border text-xs rounded-lg transition-colors"
        >
          Add Widget
        </button>
      </div>


      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-popover text-foreground px-4 py-2 rounded-lg shadow-lg border border-border text-base font-medium">
            {toast}
          </div>
        </div>
      )}

      {/* Widget removal confirmation dialog */}
      {isWidgetRemoveConfirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background border border-border rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-foreground mb-4">Remove Widget</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to remove this widget? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsWidgetRemoveConfirmOpen(false);
                  setWidgetToRemove(null);
                }}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRemoveWidget}
                className="px-4 py-2 text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md transition-colors"
              >
                Remove Widget
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}