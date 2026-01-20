import { useState, useCallback } from 'react';
import { Widget } from '../types';

export function useDragAndDrop(
  widgets: { [key: string]: Widget },
  setWidgets: React.Dispatch<React.SetStateAction<{ [key: string]: Widget }>>,
  recentWidgets: Widget[],
  setRecentWidgets: React.Dispatch<React.SetStateAction<Widget[]>>
) {
  const [draggedWidget, setDraggedWidget] = useState<Widget | null>(null);
  const [dragOverSection, setDragOverSection] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = useCallback((e: React.DragEvent, widget: Widget) => {
    setDraggedWidget(widget);
    setIsDragging(true);
    e.dataTransfer.setData('text/plain', widget.id);
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverSection(sectionId);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    // Only clear if actually leaving the element
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverSection(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    
    if (draggedWidget) {
      setWidgets(prev => ({
        ...prev,
        [sectionId]: draggedWidget
      }));
      
      // Add to recent widgets if not already there
      if (!recentWidgets.some(w => w.id === draggedWidget.id)) {
        setRecentWidgets(prev => [draggedWidget, ...prev.slice(0, 4)]);
      }
    }
    
    setDragOverSection(null);
    setDraggedWidget(null);
    setIsDragging(false);
  }, [draggedWidget, setWidgets, recentWidgets, setRecentWidgets]);

  const handleDragEnd = useCallback(() => {
    setDraggedWidget(null);
    setDragOverSection(null);
    setIsDragging(false);
  }, []);

  return {
    draggedWidget,
    dragOverSection,
    isDragging,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd
  };
}
