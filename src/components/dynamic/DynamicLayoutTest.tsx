/**
 * Dynamic Layout System Test Component
 * 
 * This component demonstrates the dynamic layout system in action.
 * It can be used to test different layouts without manual coding.
 */

import React, { useState } from 'react';
import { DynamicGridRenderer } from './DynamicGridRenderer';
import { getAllLayoutConfigs } from '@/config/layouts';

export function DynamicLayoutTest() {
  const [selectedLayout, setSelectedLayout] = useState('g34'); // 3-grid-left-large
  const [widgets, setWidgets] = useState([
    { id: 'widget-1', name: 'news-ticker', position: 'area-1' },
    { id: 'widget-2', name: 'currency-strength', position: 'area-2' },
    { id: 'widget-3', name: 'cot-table', position: 'area-3' }
  ]);

  const layoutConfigs = getAllLayoutConfigs();

  const handleAddWidget = (areaId: string, widgetId: string) => {
    console.log('Adding widget:', { areaId, widgetId });
    setWidgets(prev => [...prev, { 
      id: `widget-${Date.now()}`, 
      name: widgetId, 
      position: areaId 
    }]);
  };

  const handleRemoveWidget = (areaId: string) => {
    console.log('Removing widget from:', areaId);
    setWidgets(prev => prev.filter(w => w.position !== areaId));
  };

  const handleResize = (areaId: string, newSize: any) => {
    console.log('Resizing area:', { areaId, newSize });
  };

  return (
    <div className="w-full h-screen bg-background">
      <div className="p-4 border-b border-border">
        <h2 className="text-xl font-semibold mb-4">Dynamic Layout System Test</h2>
        
        <div className="flex gap-4 items-center">
          <label className="text-sm font-medium">Layout:</label>
          <select 
            value={selectedLayout} 
            onChange={(e) => setSelectedLayout(e.target.value)}
            className="px-3 py-1 border border-border rounded bg-background"
          >
            {layoutConfigs.map(config => (
              <option key={config.id} value={config.id}>
                {config.name} ({config.cells} cells)
              </option>
            ))}
          </select>
          
          <div className="text-sm text-muted-foreground">
            Widgets: {widgets.length}
          </div>
        </div>
      </div>

      <div className="flex-1 h-full">
        <DynamicGridRenderer
          layout={selectedLayout}
          widgets={widgets}
          coordinates={{}}
          onResize={handleResize}
          onAddWidget={handleAddWidget}
          onRemoveWidget={handleRemoveWidget}
        />
      </div>
    </div>
  );
}
