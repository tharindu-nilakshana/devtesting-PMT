import { Button } from "../ui/button";
import { Plus, ArrowLeftRight } from "lucide-react";

interface LibraryTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
}

const libraryTemplates: LibraryTemplate[] = [
  {
    id: "lib-default",
    name: "Default Layout",
    description: "Balanced view with all essential widgets",
    thumbnail: "default",
  },
  {
    id: "lib-day-trading",
    name: "Day Trading",
    description: "Fast-paced trading with quick order execution",
    thumbnail: "day-trading",
  },
  {
    id: "lib-swing",
    name: "Swing Trading",
    description: "Multi-day positions with technical analysis",
    thumbnail: "swing",
  },
  {
    id: "lib-crypto",
    name: "Crypto Focus",
    description: "24/7 crypto market monitoring",
    thumbnail: "crypto",
  },
  {
    id: "lib-forex",
    name: "Forex Trading",
    description: "Currency pairs with live spreads",
    thumbnail: "forex",
  },
  {
    id: "lib-multi-chart",
    name: "Multi Chart",
    description: "Multiple timeframes and instruments",
    thumbnail: "multi-chart",
  },
  {
    id: "lib-scalping",
    name: "Scalping View",
    description: "Ultra-fast micro trading setup",
    thumbnail: "scalping",
  },
  {
    id: "lib-options",
    name: "Options Trading",
    description: "Options chains and Greeks analysis",
    thumbnail: "options",
  },
  {
    id: "lib-market",
    name: "Market Overview",
    description: "Broad market sentiment and indicators",
    thumbnail: "market",
  },
  {
    id: "lib-technical",
    name: "Technical Analysis",
    description: "Advanced charting and indicators",
    thumbnail: "technical",
  },
  {
    id: "lib-news",
    name: "News Focus",
    description: "News-driven trading setup",
    thumbnail: "news",
  },
  {
    id: "lib-portfolio",
    name: "Portfolio Manager",
    description: "Track and manage your positions",
    thumbnail: "portfolio",
  },
];

interface TemplateLibraryProps {
  onSelectTemplate: (template: LibraryTemplate) => void;
  onBack: () => void;
}

function TemplateThumbnail({ type }: { type: string }) {
  // Generate a simple visual representation of each template
  const layouts: Record<string, JSX.Element> = {
    default: (
      <div className="grid grid-cols-2 gap-[1px] h-full bg-border">
        <div className="grid grid-rows-2 gap-[1px] bg-border">
          <div className="bg-widget-body" />
          <div className="bg-widget-body" />
        </div>
        <div className="bg-widget-body" />
      </div>
    ),
    "day-trading": (
      <div className="grid grid-cols-[1fr_2fr] gap-[1px] h-full bg-border">
        <div className="bg-widget-body" />
        <div className="grid grid-rows-2 gap-[1px] bg-border">
          <div className="bg-widget-body" />
          <div className="bg-widget-body" />
        </div>
      </div>
    ),
    swing: (
      <div className="grid grid-rows-[2fr_1fr] gap-[1px] h-full bg-border">
        <div className="bg-widget-body" />
        <div className="bg-widget-body" />
      </div>
    ),
    crypto: (
      <div className="grid grid-cols-3 gap-[1px] h-full bg-border">
        <div className="bg-widget-body" />
        <div className="bg-widget-body" />
        <div className="bg-widget-body" />
      </div>
    ),
    forex: (
      <div className="grid grid-rows-[1fr_1fr_1fr] gap-[1px] h-full bg-border">
        <div className="bg-widget-body" />
        <div className="bg-widget-body" />
        <div className="bg-widget-body" />
      </div>
    ),
    "multi-chart": (
      <div className="grid grid-cols-2 gap-[1px] h-full bg-border">
        <div className="bg-widget-body" />
        <div className="bg-widget-body" />
      </div>
    ),
    scalping: (
      <div className="grid grid-cols-[1fr_2fr] gap-[1px] h-full bg-border">
        <div className="grid grid-rows-3 gap-[1px] bg-border">
          <div className="bg-widget-body" />
          <div className="bg-widget-body" />
          <div className="bg-widget-body" />
        </div>
        <div className="bg-widget-body" />
      </div>
    ),
    options: (
      <div className="grid grid-rows-[1fr_1fr_1fr] gap-[1px] h-full bg-border">
        <div className="bg-widget-body" />
        <div className="bg-widget-body" />
        <div className="bg-widget-body" />
      </div>
    ),
    market: (
      <div className="grid grid-cols-[1fr_1fr_1fr] gap-[1px] h-full bg-border">
        <div className="bg-widget-body" />
        <div className="bg-widget-body" />
        <div className="bg-widget-body" />
      </div>
    ),
    technical: (
      <div className="grid grid-rows-[3fr_1fr] gap-[1px] h-full bg-border">
        <div className="bg-widget-body" />
        <div className="bg-widget-body" />
      </div>
    ),
    news: (
      <div className="grid grid-cols-[2fr_1fr] gap-[1px] h-full bg-border">
        <div className="bg-widget-body" />
        <div className="bg-widget-body" />
      </div>
    ),
    portfolio: (
      <div className="grid grid-rows-[1fr_2fr] gap-[1px] h-full bg-border">
        <div className="grid grid-cols-4 gap-[1px] bg-border">
          <div className="bg-widget-body" />
          <div className="bg-widget-body" />
          <div className="bg-widget-body" />
          <div className="bg-widget-body" />
        </div>
        <div className="bg-widget-body" />
      </div>
    ),
  };

  return layouts[type] || layouts.default;
}

export function TemplateLibrary({ onSelectTemplate, onBack }: TemplateLibraryProps) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-2">
        {libraryTemplates.map((template) => (
          <button
            key={template.id}
            data-templateid={template.id}
            onClick={() => onSelectTemplate(template)}
            className="group relative bg-widget-body border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-all"
          >
            <div className="aspect-video bg-background border-b border-border">
              <TemplateThumbnail type={template.thumbnail} />
            </div>
            <div className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="text-left flex-1">
                  <h4 className="text-sm text-foreground group-hover:text-primary transition-colors">
                    {template.name}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {template.description}
                  </p>
                </div>
                <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-0.5" />
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <Button
          onClick={onBack}
          variant="outline"
          className="w-full"
        >
          <ArrowLeftRight className="w-4 h-4 mr-2" />
          Back to My Templates
        </Button>
      </div>
    </div>
  );
}
