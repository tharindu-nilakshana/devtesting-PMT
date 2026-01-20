"use client";

import { X, LayoutGrid, Search } from "lucide-react";
import { Button } from "../ui/button";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { widgetPreviews, GenericWidgetPreview } from "./WidgetPreviews";
import { Widget } from "@/types";
import { useTranslation } from "react-i18next";
import { getWidgetTranslationKey, getCategoryTranslationKey } from "@/constants/widgets";
import { Input } from "../ui/input";

interface WidgetPanelProps {
  isOpen: boolean;
  onClose: () => void;
  recentlyUsedWidgets?: Widget[];
  onAddWidget?: (widgetId: string) => void;
  availableWidgets: Widget[];
  onDragStart?: (widget: Widget, e: React.DragEvent) => void;
}

const widgetCategories = [
  "price-charts",
  "seasonality",
  "cot",
  "heatmaps",
  "news",
  "economic-data",
  "central-banks",
  "research",
  "stock-analysis",
  "scanner",
  "options",
  "volatility",
  "sentiment",
  "retail-sentiment",
  "market-structure",
  "orderflow",
  "Others"
];

const categoryDisplayNames: Record<string, string> = {
  "price-charts": "Charts",
  "seasonality": "Seasonality",
  "cot": "COT",
  "heatmaps": "Heatmaps",
  "news": "News",
  "economic-data": "Macroeconomic Data",
  "central-banks": "Central Banks",
  "research": "Research",
  "stock-analysis": "Stock Analysis",
  "scanner": "Scanner",
  "options": "Options",
  "volatility": "Volatility",
  "sentiment": "Sentiment",
  "retail-sentiment": "Retail Sentiment",
  "market-structure": "Market Structure",
  "orderflow": "Orderflow",
  "Others": "Utilities"
};

export function WidgetPanel({ isOpen, onClose, recentlyUsedWidgets = [], onAddWidget, availableWidgets, onDragStart }: WidgetPanelProps) {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState("price-charts");
  const [draggedWidget, setDraggedWidget] = useState<Widget | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const ANIMATION_DURATION_MS = 300;
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const raf = requestAnimationFrame(() => {
        setIsVisible(true);
      });
      return () => cancelAnimationFrame(raf);
    }

    setIsVisible(false);
    const timer = setTimeout(() => {
      setShouldRender(false);
    }, ANIMATION_DURATION_MS);

    return () => clearTimeout(timer);
  }, [isOpen]);

  const filteredWidgets = searchQuery
    ? availableWidgets.filter((widget) => {
      return widget.name.toLowerCase().includes(searchQuery.toLowerCase());
    })
    : availableWidgets.filter(
      (widget) => widget.category === activeCategory
    );

  const recentWidgets = recentlyUsedWidgets.slice(0, 4);

  const handleDragStart = (widget: Widget, e: React.DragEvent) => {
    console.log("WidgetPanel: Drag started for widget:", widget.id);
    setDraggedWidget(widget);
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("text/plain", widget.id);

    // Call the parent's drag start handler if provided
    if (onDragStart) {
      onDragStart(widget, e);
    }

    // Close the panel after a short delay to allow drag to start
    setTimeout(() => {
      onClose();
    }, 100);
  };

  const handleDragEnd = () => {
    setDraggedWidget(null);
  };

  const handleWidgetClick = (widget: Widget) => {
    if (onAddWidget) {
      onAddWidget(widget.id);
    }
  };

  if (!shouldRender) return null;

  // Use portal to render at document body level, escaping any parent stacking contexts
  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/30 z-[9998] transition-opacity duration-300 ${
          isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      />

      {/* Panel */}
      <div
        className={`fixed left-0 top-12 bottom-0 w-[420px] bg-widget-header border-r border-border z-[9999] flex flex-col transition-transform duration-300 ease-out ${
          isVisible ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="h-14 border-b border-border flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-primary" />
            <h2 className="text-foreground">{t('Categories.Widgets')}</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Search Bar */}
        <div className="px-4 py-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search widgets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 h-9 bg-background border-border text-foreground placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Recently Used Widgets */}
        {!searchQuery && recentWidgets.length > 0 && (
          <div className="p-4 border-b border-border">
            <h3 className="text-xs text-muted-foreground mb-2">{t('Categories.RecentlyUsed')}</h3>
            <div className="grid grid-cols-4 gap-2">
              {recentWidgets.map((widget) => {
                const PreviewComponent = widgetPreviews[widget.id] || GenericWidgetPreview;
                return (
                  <div
                    key={widget.id}
                    draggable
                    onDragStart={(e) => handleDragStart(widget, e)}
                    onDragEnd={handleDragEnd}
                    onClick={() => handleWidgetClick(widget)}
                    className={`flex flex-col gap-1.5 p-1.5 bg-popover hover:bg-muted border border-border hover:border-primary/50 rounded cursor-pointer transition-all group ${draggedWidget?.id === widget.id ? "opacity-50" : ""
                      }`}
                  >
                    <div className="w-full h-12 bg-widget-header border border-border rounded overflow-hidden group-hover:border-primary/30 transition-colors">
                      <PreviewComponent />
                    </div>
                    <span className="text-[9px] text-center text-muted-foreground group-hover:text-foreground transition-colors leading-tight line-clamp-2">
                      {widget.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Categories */}
        {!searchQuery && (
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-xs text-muted-foreground mb-2">{t('Categories.Categories')}</h3>
            <div className="flex gap-2 flex-wrap">
              {widgetCategories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`px-3 py-1.5 rounded text-xs transition-colors ${activeCategory === category
                      ? "bg-primary text-primary-foreground"
                      : "bg-popover text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                >
                  {categoryDisplayNames[category] || category}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Widget Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {searchQuery ? (
            <h3 className="text-sm text-foreground mb-4">
              Search Results ({filteredWidgets.length})
            </h3>
          ) : (
            <h3 className="text-sm text-foreground mb-4">
              {categoryDisplayNames[activeCategory] || activeCategory}
            </h3>
          )}
          {filteredWidgets.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p className="text-sm">
                {searchQuery
                  ? `No widgets found for "${searchQuery}"`
                  : "No widgets in this category"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {filteredWidgets.map((widget) => {
                const PreviewComponent = widgetPreviews[widget.id] || GenericWidgetPreview;
                return (
                  <div
                    key={widget.id}
                    draggable
                    onDragStart={(e) => handleDragStart(widget, e)}
                    onDragEnd={handleDragEnd}
                    onClick={() => handleWidgetClick(widget)}
                    className={`flex flex-col gap-2 p-2 bg-popover hover:bg-muted border border-border hover:border-primary/50 rounded cursor-pointer transition-all group ${draggedWidget?.id === widget.id ? "opacity-50" : ""
                      } ${!widget.isImplemented ? "opacity-50" : ""}`}
                    title={!widget.isImplemented ? "Coming soon" : widget.description}
                  >
                    <div className="w-full h-20 bg-widget-header border border-border rounded overflow-hidden group-hover:border-primary/30 transition-colors">
                      <PreviewComponent />
                    </div>
                    <span className="text-sm text-center text-muted-foreground group-hover:text-foreground transition-colors leading-tight font-medium">
                      {widget.name}
                    </span>
                    {!widget.isImplemented && (
                      <span className="text-xs text-center text-warning">
                        Coming Soon
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}

