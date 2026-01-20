import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

interface EmptyGridCellProps {
  onAddWidget: () => void;
  position: string;
  onDragOver?: (e: React.DragEvent, position: string) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, position: string) => void;
  isDragOver?: boolean;
}

export function EmptyGridCell({ 
  onAddWidget, 
  position, 
  onDragOver, 
  onDragLeave, 
  onDrop, 
  isDragOver 
}: EmptyGridCellProps) {
  const { t } = useTranslation();
  return (
    <div 
      className={`w-full h-full flex items-center justify-center bg-widget-body transition-all relative z-0 ${
        isDragOver 
          ? "border-2 border-primary bg-primary/5" 
          : ""
      }`}
      onDragOver={onDragOver ? (e) => onDragOver(e, position) : undefined}
      onDragLeave={onDragLeave}
      onDrop={onDrop ? (e) => onDrop(e, position) : undefined}
    >
      <button
        onClick={onAddWidget}
        className="relative z-20 px-4 py-2 bg-popover hover:bg-muted border border-border hover:border-primary/50 rounded flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all"
      >
        <Plus className="w-4 h-4" />
        {t('Dashboard.AddWidget')}
      </button>
    </div>
  );
}

