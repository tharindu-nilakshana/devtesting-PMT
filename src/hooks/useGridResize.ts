import { useState, useCallback, useEffect } from 'react';
import { ResizeState, LayoutType } from '../types';
import { templateGridSizesStorage } from '../lib/templateGridSizes';
import { insertMainGridPosition } from '../lib/gridPositionApi';
import { calculateGridPositions, mapLayoutToApiCode } from '../utils/gridPositionCalculator';

export function useGridResize(
  selectedLayout: LayoutType,
  gridSizes: { [key: string]: number[] },
  setGridSizes: React.Dispatch<React.SetStateAction<{ [key: string]: number[] }>>,
  containerRef: React.RefObject<HTMLDivElement | null>,
  templateId?: string // Optional template ID to save grid sizes
) {
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent, direction: 'horizontal' | 'vertical', layoutKey: string, dividerIndex?: number) => {
    e.preventDefault();
    const startPos = direction === 'horizontal' ? e.clientX : e.clientY;
    const startSizes = [...(gridSizes[layoutKey] || [])];
    
    setResizeState({
      isResizing: true,
      direction,
      startPos,
      startSizes,
      dividerIndex,
      layoutKey
    });
  }, [gridSizes]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizeState || !containerRef.current || !resizeState.layoutKey) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const currentPos = resizeState.direction === 'horizontal' ? e.clientX : e.clientY;
    const containerSize = resizeState.direction === 'horizontal' ? containerRect.width : containerRect.height;
    const delta = currentPos - resizeState.startPos;
    const deltaPercent = (delta / containerSize) * 100;

    const newSizes = [...resizeState.startSizes];
    const layoutKey = resizeState.layoutKey;
    
    // Normalize layout key to handle both old and new format
    const normalizedLayoutKey = layoutKey.replace(/^(\d+)-grid-/, (match, num) => {
      const numMap: Record<string, string> = { '2': 'two', '3': 'three', '4': 'four', '5': 'five' };
      return `${numMap[num] || num}-`;
    });
    
    // Handle different layout types - support both old and new format
    const isTwoCell = layoutKey === 'two-vertical' || layoutKey === 'two-horizontal' || 
                      layoutKey === '2-grid-vertical' || layoutKey === '2-grid-horizontal';
    const isThreeCell = layoutKey === 'three-vertical' || layoutKey === 'three-horizontal' ||
                        layoutKey === '3-grid-columns' || layoutKey === '3-grid-rows';
    
    if (isTwoCell) {
      newSizes[0] = Math.max(10, Math.min(90, resizeState.startSizes[0] + deltaPercent));
      newSizes[1] = 100 - newSizes[0];
    } else if (isThreeCell) {
      // For three-column/row layouts, only adjust the two adjacent sections
      const dividerIndex = resizeState.dividerIndex || 0;
      
      if (dividerIndex === 0) {
        // First divider: adjust sections 0 and 1 (first and middle)
        const totalAdjustable = resizeState.startSizes[0] + resizeState.startSizes[1];
        newSizes[0] = Math.max(10, Math.min(totalAdjustable - 10, resizeState.startSizes[0] + deltaPercent));
        newSizes[1] = totalAdjustable - newSizes[0];
        // Section 2 stays the same
        if (newSizes.length > 2) {
          newSizes[2] = resizeState.startSizes[2];
        }
      } else if (dividerIndex === 1) {
        // Second divider: adjust sections 1 and 2 (middle and last)
        if (newSizes.length > 2) {
          const totalAdjustable = resizeState.startSizes[1] + resizeState.startSizes[2];
          newSizes[1] = Math.max(10, Math.min(totalAdjustable - 10, resizeState.startSizes[1] + deltaPercent));
          newSizes[2] = totalAdjustable - newSizes[1];
          // Section 0 stays the same
          newSizes[0] = resizeState.startSizes[0];
        }
      }
    } else {
      // Generic fallback for layouts with more cells
      // Adjust the two cells adjacent to the divider
      const dividerIndex = resizeState.dividerIndex ?? 0;
      const leftCellIndex = dividerIndex;
      const rightCellIndex = dividerIndex + 1;
      
      if (leftCellIndex < newSizes.length && rightCellIndex < newSizes.length) {
        const totalAdjustable = resizeState.startSizes[leftCellIndex] + resizeState.startSizes[rightCellIndex];
        const minSize = 10;
        const maxLeftSize = totalAdjustable - minSize;
        
        newSizes[leftCellIndex] = Math.max(minSize, Math.min(maxLeftSize, resizeState.startSizes[leftCellIndex] + deltaPercent));
        newSizes[rightCellIndex] = totalAdjustable - newSizes[leftCellIndex];
        
        // Keep all other cells the same
        for (let i = 0; i < newSizes.length; i++) {
          if (i !== leftCellIndex && i !== rightCellIndex) {
            newSizes[i] = resizeState.startSizes[i];
          }
        }
      }
    }

    setGridSizes(prev => ({
      ...prev,
      [layoutKey]: newSizes
    }));
  }, [resizeState, setGridSizes, containerRef]);

  const handleMouseUp = useCallback(async () => {
    // Save grid sizes to local storage if templateId is provided
    if (!resizeState?.layoutKey) {
      console.warn('⚠️ [GridResize] No layoutKey in resizeState, skipping save');
      setResizeState(null);
      return;
    }
    
    if (!templateId) {
      console.warn('⚠️ [GridResize] No templateId provided, skipping save');
      setResizeState(null);
      return;
    }
    
    const currentSizes = gridSizes[resizeState.layoutKey];
    if (!currentSizes || currentSizes.length === 0) {
      console.warn('⚠️ [GridResize] No grid sizes found for layout:', resizeState.layoutKey, 'gridSizes:', gridSizes);
      setResizeState(null);
      return;
    }
    
    try {
      // Save to localStorage
      templateGridSizesStorage.saveTemplateGridSizes(
        templateId,
        resizeState.layoutKey,
        currentSizes
      );
      console.log('✅ [GridResize] Saved to localStorage:', {
        templateId,
        layout: resizeState.layoutKey,
        sizes: currentSizes
      });
      
      // Save to database via API if template is saved (numeric ID)
      const templateIdNum = parseInt(templateId, 10);
      if (!isNaN(templateIdNum)) {
        try {
          const apiLayoutCode = mapLayoutToApiCode(resizeState.layoutKey);
          const positions = calculateGridPositions(
            resizeState.layoutKey as LayoutType,
            currentSizes,
            apiLayoutCode
          );
          
          console.log('💾 [GridResize] Saving grid positions to database:', {
            templateId: templateIdNum,
            layout: resizeState.layoutKey,
            apiLayoutCode,
            sizesCount: currentSizes.length,
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
            console.log('✅ [GridResize] Successfully saved grid positions to database');
          } else {
            console.error('❌ [GridResize] Failed to save grid positions to database:', result.Message);
          }
        } catch (error) {
          console.error('❌ [GridResize] Error saving grid positions to database:', error);
        }
      } else {
        console.log('ℹ️ [GridResize] Template ID is not numeric, skipping database save (template not saved yet)');
      }
    } catch (error) {
      console.error('❌ [GridResize] Error saving to localStorage:', error);
    }
    
    setResizeState(null);
  }, [templateId, resizeState, gridSizes]);

  // Add global mouse event listeners
  useEffect(() => {
    if (resizeState) {
      const handleMouseMoveWithPrevent = (e: MouseEvent) => {
        e.preventDefault();
        handleMouseMove(e);
      };

      const handleMouseUpWithPrevent = (e: MouseEvent) => {
        e.preventDefault();
        handleMouseUp();
      };

      document.addEventListener('mousemove', handleMouseMoveWithPrevent);
      document.addEventListener('mouseup', handleMouseUpWithPrevent);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMoveWithPrevent);
        document.removeEventListener('mouseup', handleMouseUpWithPrevent);
      };
    }
  }, [resizeState, handleMouseMove, handleMouseUp]);

  return {
    resizeState,
    handleMouseDown
  };
}
