"use client";

import { useEffect, useState, useRef } from "react";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Newspaper } from "lucide-react";
import { WidgetSettingsSlideIn, WidgetSettings } from "@/components/bloomberg-ui/WidgetSettingsSlideIn";
import { NewsStoryDialog } from "../NewsStory";
import { fetchNewsById } from "../NewsDashboard/api";
import { fetchLatestStories, type LatestStoryItem } from "./api";

interface LatestStoriesProps {
  onRemove?: () => void;
  onSettings?: () => void;
  onFullscreen?: () => void;
  wgid?: string;
  settings?: WidgetSettings;
}

const ALL_NEWS_CATEGORIES = [
  "Stocks",
  "Energy",
  "Politics",
  "Forex",
  "Commodities",
  "Technology",
  "Corporate",
  "Economy",
  "Government",
  "Natural Disasters",
  "Industry",
  "Inspirational",
  "Law",
  "Military",
  "Society",
  "Transportation",
  "Conflict",
  "International",
  "Crypto",
  "Sport",
];

const trendingTopics = [
  { id: "1", text: "US Dollar", weight: 5, category: "currencies" },
  { id: "2", text: "U.S. Tax Bill", weight: 4, category: "politics" },
  { id: "3", text: "Federal Reserve", weight: 5, category: "central-banks" },
  { id: "4", text: "Trade Agreements", weight: 4, category: "trade" },
  { id: "5", text: "Tariffs", weight: 3, category: "trade" },
  { id: "6", text: "Employment Data", weight: 4, category: "economics" },
  { id: "7", text: "Currency Markets", weight: 4, category: "markets" },
  { id: "8", text: "Risk Sentiment", weight: 3, category: "markets" },
  { id: "9", text: "U.S. Economy", weight: 4, category: "economics" },
  { id: "10", text: "Interest Rates", weight: 5, category: "central-banks" },
  { id: "11", text: "US tariffs", weight: 3, category: "trade" },
  { id: "12", text: "Asian currencies", weight: 3, category: "currencies" },
  { id: "13", text: "US Dollar Index", weight: 4, category: "currencies" },
  { id: "14", text: "trade tensions", weight: 3, category: "trade" },
  { id: "15", text: "safe-haven assets", weight: 3, category: "markets" },
  { id: "16", text: "Japanese yen", weight: 3, category: "currencies" },
  { id: "17", text: "South Korean won", weight: 2, category: "currencies" },
  { id: "18", text: "Chinese yuan", weight: 3, category: "currencies" },
  { id: "19", text: "Australian dollar", weight: 3, category: "currencies" },
  { id: "20", text: "Reserve Bank of Australia", weight: 2, category: "central-banks" },
  { id: "21", text: "Swiss franc", weight: 2, category: "currencies" },
  { id: "22", text: "EUR/CHF", weight: 2, category: "currencies" },
  { id: "23", text: "UBS forecast", weight: 2, category: "markets" },
  { id: "24", text: "Swiss inflation", weight: 2, category: "economics" },
  { id: "25", text: "SNB policy", weight: 2, category: "central-banks" },
  { id: "26", text: "Gold", weight: 4, category: "commodities" },
  { id: "27", text: "ECB", weight: 3, category: "central-banks" },
  { id: "28", text: "Inflation", weight: 5, category: "economics" },
  { id: "29", text: "NFP", weight: 4, category: "economics" },
  { id: "30", text: "Brexit", weight: 2, category: "politics" },
  { id: "31", text: "Oil prices", weight: 3, category: "commodities" },
  { id: "32", text: "Volatility", weight: 3, category: "markets" },
  { id: "33", text: "Quantitative Easing", weight: 2, category: "central-banks" },
  { id: "34", text: "Emerging Markets", weight: 3, category: "markets" },
  { id: "35", text: "Euro", weight: 4, category: "currencies" },
];

// Helper function to remove [Content omitted] from text
const removeContentOmitted = (text: string | null | undefined): string => {
  if (!text) return "";
  return text.replace(/\[Content omitted\]/gi, "").trim();
};

const formatFullTimestamp = (value: string | undefined) => {
  if (!value) return "Unknown date";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return value;
  }
};

export default function LatestStories({ onRemove, onSettings, onFullscreen, wgid, settings }: LatestStoriesProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState<WidgetSettings>(settings || {});
  const displayMode = localSettings?.displayMode || "latest";
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [hoveredStoryId, setHoveredStoryId] = useState<string | null>(null);
  const [stories, setStories] = useState<LatestStoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [selectedStory, setSelectedStory] = useState<LatestStoryItem | null>(null);
  const [isStoryPanelOpen, setIsStoryPanelOpen] = useState(false);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSaveSettings = (newSettings: WidgetSettings) => {
    setLocalSettings(newSettings);
    if (onSettings) {
      // Pass settings back to parent if needed
    }
  };

  const getTagClasses = (weight: number, isSelected: boolean) => {
    let sizeClasses = "text-xs";
    if (weight >= 5) {
      sizeClasses = "text-base font-semibold";
    } else if (weight === 4) {
      sizeClasses = "text-sm font-medium";
    } else if (weight === 3) {
      sizeClasses = "text-xs font-medium";
    }

    const baseClasses =
      "px-4 py-2 rounded-full border transition-all duration-200 cursor-pointer inline-flex items-center justify-center";

    const colorClasses = isSelected
      ? "bg-primary/15 border-primary text-primary"
      : "bg-surface/70 border-transparent text-foreground hover:bg-primary/10 hover:text-primary";

    return `${baseClasses} ${sizeClasses} ${colorClasses}`;
  };

  const handleTagClick = (tagId: string) => {
    setSelectedTag(selectedTag === tagId ? null : tagId);
  };

  const openStory = (story: LatestStoryItem) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    setIsStoryPanelOpen(false);
    setSelectedStory(story);

    requestAnimationFrame(() => {
      setIsStoryPanelOpen(true);
    });
  };

  const closeStory = () => {
    setIsStoryPanelOpen(false);
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = setTimeout(() => {
      setSelectedStory(null);
      closeTimerRef.current = null;
    }, 500); // matches slide animation duration
  };

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const storedCategories = Array.isArray(localSettings.categories)
      ? localSettings.categories.filter((category: string) => ALL_NEWS_CATEGORIES.includes(category))
      : localSettings.categories === null
      ? null
      : null;
    const selectedCategories =
      storedCategories === null ? ALL_NEWS_CATEGORIES : storedCategories;

    if (selectedCategories.length === 0) {
      setStories([]);
      setTotalCount(0);
      setLoading(false);
      return () => controller.abort();
    }
    const requestCategory =
      selectedCategories.length === 1 ? selectedCategories[0] : localSettings.latestStoriesCategory;
    const shouldFilterLocally =
      (!requestCategory || selectedCategories.length > 1) &&
      selectedCategories.length < ALL_NEWS_CATEGORIES.length;
    const sentimentFilter = localSettings.latestStoriesSentiment;
    const publishedFilter =
      typeof localSettings.latestStoriesPublished === "number"
        ? localSettings.latestStoriesPublished
        : 0; // Default to unpublished (0)
    setLoading(true);
    setError(null);

    fetchLatestStories(
      {
        limit: localSettings.limit ?? 50,
        offset: 0,
        category: requestCategory,
        articleSentiment: sentimentFilter,
        published: publishedFilter,
      },
      controller.signal
    )
      .then((result) => {
        if (result.success && result.data) {
          const filteredStories =
            shouldFilterLocally && selectedCategories.length > 0
              ? result.data.filter((story) =>
                  story.category ? selectedCategories.includes(story.category) : true
                )
              : result.data;

          setStories(filteredStories);
          setTotalCount(filteredStories.length);
          return;
        }

        if (result.error === "Request was cancelled.") {
          return;
        }

        setStories([]);
        setTotalCount(0);
        setError(result.error || "Unable to load latest stories.");
      })
      .catch((err) => {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        setStories([]);
        setTotalCount(0);
        setError(err instanceof Error ? err.message : "Unexpected error while loading stories.");
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [
    localSettings.limit,
    localSettings.latestStoriesCategory,
    localSettings.latestStoriesSentiment,
    localSettings.latestStoriesPublished,
    localSettings.categories,
  ]);

  return (
    <div className="flex flex-col h-full bg-widget border border-border relative overflow-hidden">
      {/* Header */}
      <WidgetHeader
        title={
          displayMode === "trending" ? (
            <span className="text-2xl font-semibold text-foreground">Trending Topics</span>
          ) : (
            <span className="text-2xl font-semibold text-foreground">Latest Stories</span>
          )
        }
        onRemove={onRemove}
        onSettings={() => setIsSettingsOpen(true)}
        onFullscreen={onFullscreen}
        helpContent={displayMode === "trending" ? "Real-time trending topics and keywords from market news and analysis. Click on any tag to filter related content." : "Latest breaking news and market stories. Click on any headline to read the full article."}
      />

      {/* Content */}
      <ScrollArea className="flex-1 min-h-0">
        {displayMode === "trending" ? (
          // Trending Topics View
          <div className="p-5 space-y-5">
            <div className="flex flex-wrap gap-3">
              {trendingTopics.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => handleTagClick(tag.id)}
                  className={getTagClasses(
                    tag.weight,
                    selectedTag === tag.id
                  )}
                >
                  {tag.text}
                </button>
              ))}
            </div>

            {/* Selected Tag Info */}
            {selectedTag && (
              <div className="mt-6 pt-5 border-t border-border">
                <div className="text-sm text-foreground font-medium">
                  Selected:{" "}
                  <span className="text-primary">
                    {trendingTopics.find((t) => t.id === selectedTag)?.text}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground uppercase tracking-wide">
                  Category: {trendingTopics.find((t) => t.id === selectedTag)?.category}
                </div>
              </div>
            )}
          </div>
        ) : (
          // Latest Stories View
          <div className="divide-y divide-border/60">
            {loading ? (
              <div className="px-5 py-6 text-sm text-muted-foreground">Fetching the latest stories...</div>
            ) : error ? (
              <div className="px-5 py-6 text-sm text-destructive">{error}</div>
            ) : stories.length === 0 ? (
              <div className="px-5 py-6 text-sm text-muted-foreground">
                No stories found for the selected filters.
              </div>
            ) : (
              stories.map((story) => {
                const isHovered = hoveredStoryId === story.id;
                return (
                  <div
                    key={story.id}
                    onClick={() => openStory(story)}
                    className="px-5 py-4 hover:bg-surface/60 transition-colors cursor-pointer"
                    onMouseEnter={() => setHoveredStoryId(story.id)}
                    onMouseLeave={() => setHoveredStoryId(null)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="mt-1 shrink-0">
                        <Newspaper
                          className={`w-5 h-5 transition-colors ${
                            isHovered ? "text-primary" : "text-muted-foreground"
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm md:text-base font-medium leading-snug transition-colors ${
                            isHovered ? "text-primary" : "text-foreground"
                          }`}
                        >
                          {story.headline}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {story.timestamp}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border bg-surface">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="text-sm font-medium text-foreground">
            {displayMode === "trending"
              ? `${trendingTopics.length} trending topics`
              : `${totalCount || stories.length} stories`}
          </span>
        </div>
      </div>

      {/* Settings Slide-in */}
      <WidgetSettingsSlideIn
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        widgetType="latest-stories"
        currentSettings={localSettings}
        onSave={handleSaveSettings}
      />

      {/* News Story Dialog */}
      {selectedStory && (
        <NewsStoryDialog
          isOpen={isStoryPanelOpen}
          onClose={closeStory}
          displayMode={localSettings?.newsDisplayMode || "widget-slider"}
          story={{
            id: selectedStory.id,
            headline: selectedStory.headline,
            description: removeContentOmitted(selectedStory.body || selectedStory.headline),
            source: "Latest Stories",
            timestamp: formatFullTimestamp(selectedStory.datetime),
            category: selectedStory.category || "General",
            thumbnail: undefined,
            content: removeContentOmitted(selectedStory.body || selectedStory.headline),
            sentiment: selectedStory.sentiment as "Bullish" | "Bearish" | "Neutral" | "Negative" | "Positive" | undefined,
          }}
        />
      )}
    </div>
  );
}

