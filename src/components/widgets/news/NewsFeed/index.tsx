"use client";

import { Clock, TrendingUp, AlertCircle, DollarSign } from "lucide-react";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import { WidgetWithSettings } from "@/components/utils/WidgetWithSettings";

interface NewsItem {
  id: number;
  title: string;
  source: string;
  time: string;
  category: "market" | "crypto" | "alert" | "earnings";
  impact?: "high" | "medium" | "low";
}

const mockNews: NewsItem[] = [
  {
    id: 1,
    title: "Bitcoin surges past $42,000 as institutional adoption accelerates",
    source: "Bloomberg Markets",
    time: "5 min ago",
    category: "crypto",
    impact: "high"
  },
  {
    id: 2,
    title: "Federal Reserve signals potential rate cuts in Q3 2025",
    source: "Reuters",
    time: "15 min ago",
    category: "market",
    impact: "high"
  },
  {
    id: 3,
    title: "Apple announces record quarterly earnings, beats estimates",
    source: "CNBC",
    time: "32 min ago",
    category: "earnings",
    impact: "medium"
  },
  {
    id: 4,
    title: "Ethereum network upgrade completed successfully, gas fees drop 40%",
    source: "CoinDesk",
    time: "1 hour ago",
    category: "crypto",
    impact: "medium"
  },
  {
    id: 5,
    title: "S&P 500 reaches new all-time high amid positive economic data",
    source: "Financial Times",
    time: "2 hours ago",
    category: "market",
    impact: "medium"
  },
  {
    id: 6,
    title: "BREAKING: Major cryptocurrency exchange reports security breach",
    source: "Bloomberg",
    time: "2 hours ago",
    category: "alert",
    impact: "high"
  },
  {
    id: 7,
    title: "Tesla stock rises 5% on strong delivery numbers for September",
    source: "MarketWatch",
    time: "3 hours ago",
    category: "earnings",
    impact: "medium"
  },
  {
    id: 8,
    title: "Gold prices stabilize as dollar strengthens against major currencies",
    source: "Reuters",
    time: "4 hours ago",
    category: "market",
    impact: "low"
  },
];

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "crypto":
      return <DollarSign className="w-4 h-4" />;
    case "alert":
      return <AlertCircle className="w-4 h-4" />;
    case "market":
      return <TrendingUp className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
};

const getImpactColor = (impact?: string) => {
  switch (impact) {
    case "high":
      return "text-destructive";
    case "medium":
      return "text-accent";
    case "low":
      return "text-muted-foreground";
    default:
      return "text-muted-foreground";
  }
};

interface NewsFeedProps {
  onRemove?: () => void;
  onSettings?: () => void;
  wgid?: string;
  settings?: Record<string, any>;
}

function NewsFeedContent({ onOpenSettings, onRemove, settings = {} }: { onOpenSettings: () => void; onRemove?: () => void; settings: any }) {
  return (
    <div className="w-full h-full bg-widget-body border border-border rounded-none flex flex-col">
      {/* Header */}
      <WidgetHeader 
        title="Market News"
        onOpenSettings={onOpenSettings}
        onRemove={onRemove}
        helpContent="Stay updated with real-time market news from top financial sources. Filter by category (market, crypto, earnings, alerts) and view impact levels to prioritize important events."
      />

      {/* News Content */}
      <div className="flex-1 overflow-auto">
        {mockNews.map((news) => (
          <div
            key={news.id}
            className="p-4 border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className={`mt-1 ${news.category === "alert" ? "text-destructive" : "text-primary"}`}>
                {getCategoryIcon(news.category)}
              </div>
              <div className="flex-1 space-y-1">
                <h4 className="text-foreground leading-snug">
                  {news.title}
                </h4>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span>{news.source}</span>
                  <span>•</span>
                  <span>{news.time}</span>
                  {news.impact && (
                    <>
                      <span>•</span>
                      <span className={getImpactColor(news.impact)}>
                        {news.impact.toUpperCase()} IMPACT
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function NewsFeed({ onRemove, onSettings, wgid, settings }: NewsFeedProps) {
  return (
    <WidgetWithSettings widgetType="news-feed">
      {({ onOpenSettings, settings: widgetSettings }) => (
        <NewsFeedContent 
          onOpenSettings={onOpenSettings}
          onRemove={onRemove} 
          settings={widgetSettings}
        />
      )}
    </WidgetWithSettings>
  );
}

