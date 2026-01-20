import { useState, ReactNode } from "react";
import { WidgetSettingsSlideIn, WidgetSettings } from "@/components/bloomberg-ui/WidgetSettingsSlideIn";

interface WidgetWithSettingsProps {
  children: (props: { 
    onOpenSettings: () => void; 
    settings: WidgetSettings;
    isSettingsOpen: boolean;
  }) => ReactNode;
  widgetType: string;
  initialSettings?: WidgetSettings;
  onSettingsChange?: (settings: WidgetSettings) => void;
}

export function WidgetWithSettings({
  children,
  widgetType,
  initialSettings = {},
  onSettingsChange,
}: WidgetWithSettingsProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<WidgetSettings>(initialSettings);

  const handleSaveSettings = (newSettings: WidgetSettings) => {
    setSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Main Content with Blur Effect */}
      <div
        className={`h-full w-full transition-all duration-300 ${
          isSettingsOpen ? "blur-sm" : "blur-0"
        }`}
      >
        {children({ 
          onOpenSettings: () => setIsSettingsOpen(true), 
          settings,
          isSettingsOpen 
        })}
      </div>

      {/* Slide-in Settings Panel */}
      <WidgetSettingsSlideIn
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        widgetType={widgetType}
        currentSettings={settings}
        onSave={handleSaveSettings}
      />
    </div>
  );
}

