/**
 * Template Grid Sizes Usage Examples
 * 
 * This file demonstrates how to use the templateGridSizesStorage service
 * to save and load custom grid sizes for templates.
 */

import { templateGridSizesStorage } from './templateGridSizes';
import { useGridResize } from '../hooks/useGridResize';

// ============================================================================
// EXAMPLE 1: Using with useGridResize hook
// ============================================================================

/*
function MyDashboard() {
  const [selectedLayout, setSelectedLayout] = useState<LayoutType>('3-grid-left-large');
  const [gridSizes, setGridSizes] = useState<{ [key: string]: number[] }>({
    '3-grid-left-large': [50, 25, 25]
  });
  const [currentTemplateId, setCurrentTemplateId] = useState<string>('template_123');
  const containerRef = useRef<HTMLDivElement>(null);

  // Pass templateId to useGridResize to enable auto-saving
  const { resizeState, handleMouseDown } = useGridResize(
    selectedLayout,
    gridSizes,
    setGridSizes,
    containerRef,
    currentTemplateId // <-- This enables automatic saving on resize
  );

  // Grid sizes are now automatically saved when user stops resizing!
  // No additional code needed!
}
*/

// ============================================================================
// EXAMPLE 2: Loading saved grid sizes when a template is loaded
// ============================================================================

/*
function loadTemplate(templateId: string, layoutType: string) {
  // Get default sizes for the layout
  const defaultSizes = DEFAULT_GRID_SIZES[layoutType] || [50, 50];
  
  // Load custom sizes if they exist, otherwise use default
  const gridSizes = templateGridSizesStorage.loadGridSizesForTemplate(
    templateId,
    layoutType,
    defaultSizes
  );
  
  // Set the grid sizes in your state
  setGridSizes({
    [layoutType]: gridSizes
  });
  
  console.log(`Template ${templateId} loaded with grid sizes:`, gridSizes);
}
*/

// ============================================================================
// EXAMPLE 3: Manually saving grid sizes
// ============================================================================

/*
function saveCurrentGridSizes() {
  const templateId = 'template_123';
  const layoutType = '3-grid-left-large';
  const currentSizes = [60, 20, 20]; // Current grid sizes in percentages
  
  templateGridSizesStorage.saveTemplateGridSizes(
    templateId,
    layoutType,
    currentSizes
  );
  
  console.log('Grid sizes saved!');
}
*/

// ============================================================================
// EXAMPLE 4: Check if template has custom grid sizes
// ============================================================================

/*
function checkTemplateHasCustomSizes(templateId: string) {
  const hasCustom = templateGridSizesStorage.hasCustomGridSizes(templateId);
  
  if (hasCustom) {
    console.log(`Template ${templateId} has custom grid sizes`);
  } else {
    console.log(`Template ${templateId} uses default grid sizes`);
  }
}
*/

// ============================================================================
// EXAMPLE 5: Delete grid sizes when template is deleted
// ============================================================================

/*
async function deleteTemplate(templateId: string) {
  // Delete the template
  await templateApi.deleteTemplate(templateId);
  
  // Also delete associated grid sizes
  templateGridSizesStorage.deleteTemplateGridSizes(templateId);
  
  console.log(`Template ${templateId} and its grid sizes deleted`);
}
*/

// ============================================================================
// EXAMPLE 6: Get detailed grid size information
// ============================================================================

/*
function getTemplateGridInfo(templateId: string) {
  const gridInfo = templateGridSizesStorage.getTemplateGridSizes(templateId);
  
  if (gridInfo) {
    console.log('Template ID:', gridInfo.templateId);
    console.log('Layout Type:', gridInfo.layoutType);
    console.log('Last Updated:', gridInfo.updatedAt);
    console.log('Cell Sizes:');
    gridInfo.cellSizes.forEach(cell => {
      console.log(`  ${cell.cellClass}: ${cell.width}%`);
    });
    // Example output:
    // Template ID: template_123
    // Layout Type: 3-grid-left-large
    // Last Updated: 2024-01-15T10:30:00.000Z
    // Cell Sizes:
    //   g34_1: 60%
    //   g34_2: 20%
    //   g34_3: 20%
  }
}
*/

// ============================================================================
// EXAMPLE 7: Reset to default sizes
// ============================================================================

/*
function resetTemplateToDefaultSizes(templateId: string) {
  // Simply delete the custom sizes
  templateGridSizesStorage.deleteTemplateGridSizes(templateId);
  
  // Then reload the template to use default sizes
  // The loadGridSizesForTemplate function will automatically return defaults
}
*/

// ============================================================================
// EXAMPLE 8: Export all grid sizes (for backup/debugging)
// ============================================================================

/*
function exportAllGridSizes() {
  const allTemplatesWithSizes = templateGridSizesStorage.getAllTemplatesWithGridSizes();
  
  console.log('Templates with custom grid sizes:', allTemplatesWithSizes);
  
  // Get detailed info for each
  allTemplatesWithSizes.forEach(templateId => {
    const info = templateGridSizesStorage.getTemplateGridSizes(templateId);
    console.log(templateId, info);
  });
}
*/

// ============================================================================
// COMPLETE INTEGRATION EXAMPLE
// ============================================================================

/*
import { useState, useRef, useEffect } from 'react';
import { templateGridSizesStorage } from './lib/templateGridSizes';
import { useGridResize } from './hooks/useGridResize';
import { DEFAULT_GRID_SIZES } from './constants/layouts';

function CompleteExample() {
  const [currentTemplate, setCurrentTemplate] = useState<string>('template_123');
  const [selectedLayout, setSelectedLayout] = useState<LayoutType>('3-grid-left-large');
  const [gridSizes, setGridSizes] = useState<{ [key: string]: number[] }>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // Load grid sizes when template changes
  useEffect(() => {
    if (currentTemplate && selectedLayout) {
      const defaultSizes = DEFAULT_GRID_SIZES[selectedLayout] || [50, 50];
      const loadedSizes = templateGridSizesStorage.loadGridSizesForTemplate(
        currentTemplate,
        selectedLayout,
        defaultSizes
      );
      
      setGridSizes({
        [selectedLayout]: loadedSizes
      });
    }
  }, [currentTemplate, selectedLayout]);

  // Setup resize handling with auto-save
  const { handleMouseDown } = useGridResize(
    selectedLayout,
    gridSizes,
    setGridSizes,
    containerRef,
    currentTemplate // Auto-saves on resize complete
  );

  return (
    <div ref={containerRef} className="grid-container">
      // Your grid layout here
    </div>
  );
}
*/

export {};


