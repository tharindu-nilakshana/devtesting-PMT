"use client";

import { useState, useRef, useEffect } from "react";
import { Search, ChevronLeft, ChevronRight, X, Check } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";

import { WidgetWithSettings } from "@/components/utils/WidgetWithSettings";
import { ImageWithFallback } from "@/components/utils/ImageWithFallback";
import { fetchNewsDashboard, TransformedNewsArticle, fetchNewsById } from "../NewsDashboard/api";
import { usePreferences } from "@/hooks/usePreferences";

interface NewsStoryItem {
  id: string;
  headline: string;
  description: string;
  source: string;
  timestamp: string;
  category: string;
  thumbnail?: string;
  sentiment?: "Bullish" | "Bearish" | "Neutral" | "Negative" | "Positive";
  author?: string;
  keywords?: string[];
  countries?: string[];
  currencies?: string[];
  stockTickers?: string[];
  companies?: string[];
  assetClasses?: string[];
  fullArticle?: string[];
  detailImage?: string;
  keyTakeaways?: string[];
  content?: string;
}

interface NewsStoryContentProps {
  onOpenSettings: () => void;
  onRemove?: () => void;
  onFullscreen?: () => void;
  settings: any;
}

interface NewsStoryProps {
  onRemove?: () => void;
  onSettings?: () => void;
  onFullscreen?: () => void;
  wgid?: string;
  settings?: Record<string, any>;
}


// Highlight definitions - maps text to explanation
const articleHighlights: Record<string, string> = {
  "reduce dependence on China": "Strategic shift away from Chinese supply chains due to geopolitical tensions and recent export restrictions on critical materials.",
  "clean energy technologies": "Includes electric vehicles, solar panels, wind turbines, and energy storage systems that require rare earth elements and critical minerals.",
  "$4.3 billion in revenue": "Represents 16% increase over OpenAI's entire 2024 revenue, showing accelerated growth in AI services market.",
  "cash burn of $2.6 billion": "High operational costs from compute infrastructure, research, and talent acquisition common in AI scaling phase.",
  "next-generation large language models": "More advanced AI systems with improved reasoning, multimodal capabilities, and reduced hallucinations.",
  "Federal Reserve": "Central bank of the United States responsible for monetary policy, interest rates, and financial system stability.",
  "interest rate adjustments": "Changes to federal funds rate affecting borrowing costs, inflation, and economic growth across all sectors.",
};

const highlightText = (text: string): string => {
  let highlightedText = text;

  Object.entries(articleHighlights).forEach(([phrase, explanation]) => {
    const regex = new RegExp(`(${phrase})`, "gi");
    highlightedText = highlightedText.replace(
      regex,
      `<span class="ai-highlight" data-explanation="${explanation}">$1</span>`
    );
  });

  return highlightedText;
};

// Format date according to user preference
const formatDateByPreference = (date: Date, dateFormat: string): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  let formattedDate: string;
  switch (dateFormat) {
    case 'MM/DD/YYYY':
      formattedDate = `${month}/${day}/${year}`;
      break;
    case 'YYYY-MM-DD':
      formattedDate = `${year}-${month}-${day}`;
      break;
    case 'DD/MM/YYYY':
    default:
      formattedDate = `${day}/${month}/${year}`;
      break;
  }
  
  return `${formattedDate} ${hours}:${minutes}`;
};

const formatTimestamp = (value: string, dateFormat?: string) => {
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    
    // If dateFormat is provided, use custom formatting
    if (dateFormat) {
      return formatDateByPreference(date, dateFormat);
    }
    
    // Default formatting
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

const sentimentFromArticle = (sentiment?: string): NewsStoryItem["sentiment"] => {
  if (!sentiment) return "Neutral";
  const normalized = sentiment.toLowerCase();
  if (normalized === "positive" || normalized === "bullish") return "Bullish";
  if (normalized === "negative" || normalized === "bearish") return "Bearish";
  return "Neutral";
};

// Helper function to remove [Content omitted] from text
const removeContentOmitted = (text: string | null | undefined): string => {
  if (!text) return "";
  return text.replace(/\[Content omitted\]/gi, "").trim();
};

const mapArticleToStory = (article: TransformedNewsArticle): NewsStoryItem => {
  const cleanedContent = removeContentOmitted(article.content);
  const paragraphs = cleanedContent
    ? cleanedContent
        .split("\n")
        .map((p) => p.trim())
        .filter((p) => p && !p.match(/^\[Content omitted\]$/i)) // Also filter out standalone [Content omitted] lines
    : [];

  return {
    id: article.id,
    headline: article.title,
    description: article.description,
    source: article.source,
    timestamp: formatTimestamp(article.timestamp),
    category: article.category,
    thumbnail: article.imageUrl,
    sentiment: sentimentFromArticle(article.sentiment),
    detailImage: article.imageUrl,
    keyTakeaways: article.takeaways,
    fullArticle: paragraphs,
    content: cleanedContent,
  };
};

const NEWS_CATEGORIES = [
  "Stocks",
  "Commodities",
  "Forex",
  "Politics",
  "Housing",
  "Energy",
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

function NewsStoryContent({ onOpenSettings, onRemove, onFullscreen, settings }: NewsStoryContentProps) {
  const [newsStories, setNewsStories] = useState<NewsStoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStory, setSelectedStory] = useState<NewsStoryItem | null>(null);
  const itemsPerPage = 10;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const storedCategories = Array.isArray(settings?.categories)
    ? settings.categories.filter((category: string) => NEWS_CATEGORIES.includes(category))
    : settings?.categories === null
    ? null
    : null;
  const rawFilter = settings?.newsStoryFilter;
  const normalizedFilter = (() => {
    if (storedCategories === null) {
      if (!rawFilter) {
        return NEWS_CATEGORIES[0] ?? "all";
      }
      if (rawFilter === "all") {
        return "all";
      }
      return NEWS_CATEGORIES.includes(rawFilter) ? rawFilter : NEWS_CATEGORIES[0] ?? "all";
    }

    if (storedCategories.length === 0) {
      return "all";
    }

    if (!rawFilter) {
      return storedCategories[0];
    }

    if (rawFilter === "all") {
      return "all";
    }

    return storedCategories.includes(rawFilter) ? rawFilter : storedCategories[0];
  })();
  const activeCategory = normalizedFilter === "all" ? undefined : normalizedFilter;

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    const sentiment =
      settings?.articleSentiment || settings?.article_sentiment || undefined;

    const published =
      typeof settings?.published === "number"
        ? settings.published
        : typeof settings?.newsPublished === "number"
        ? settings.newsPublished
        : undefined;

    async function loadStories() {
      setLoading(true);
      setError(null);

      const response = await fetchNewsDashboard(
        {
          limit: 50,
          offset: 0,
          category: activeCategory,
          articleSentiment: sentiment,
          published,
        },
        controller.signal
      );

      if (!mounted) {
        return;
      }

      if (!response.success || !response.data) {
        setError(response.error ?? "Unable to load news stories");
        setNewsStories([]);
        setLoading(false);
        return;
      }

      const mapped = response.data.map(mapArticleToStory);
      setNewsStories(mapped);
      setCurrentPage(1);
      setLoading(false);
    }

    loadStories().catch((err) => {
      if (!mounted) {
        return;
      }
      setError(err instanceof Error ? err.message : "Unknown error");
      setNewsStories([]);
      setLoading(false);
    });

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [
    activeCategory,
    settings?.articleSentiment,
    settings?.article_sentiment,
    settings?.published,
    settings?.newsPublished,
    refreshToken,
  ]);

  const handleRetry = () => setRefreshToken((prev) => prev + 1);

  // Filter news stories based on search query
  const filteredStories = newsStories.filter(story => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      story.headline.toLowerCase().includes(query) ||
      story.description.toLowerCase().includes(query) ||
      (story.category || "").toLowerCase().includes(query) ||
      story.source.toLowerCase().includes(query)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredStories.length / itemsPerPage));

  // Paginate filtered stories
  const paginatedStories = filteredStories.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const startItem = filteredStories.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = filteredStories.length === 0 ? 0 : startItem + paginatedStories.length - 1;

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case "Bullish":
        return "text-success";
      case "Bearish":
        return "text-destructive";
      default:
        return "text-warning";
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const categoryLabel = normalizedFilter === "all" ? "All" : normalizedFilter;

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);

  const openStory = (story: NewsStoryItem) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    setIsDetailOpen(false);
    setSelectedStory(story);

    requestAnimationFrame(() => setIsDetailOpen(true));
  };

  const closeStory = () => {
    setIsDetailOpen(false);
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = setTimeout(() => {
      setSelectedStory(null);
      closeTimerRef.current = null;
    }, 500);
  };

  const headerTitle = `News Stories: ${categoryLabel}`;

  return (
    <>
    <div className="flex flex-col h-full bg-widget-body relative border border-border overflow-hidden">
      {/* Header */}
      <WidgetHeader
        title={
          <span className="font-semibold text-foreground">{headerTitle}</span>
        }
        onSettings={onOpenSettings}
        onRemove={onRemove}
        onFullscreen={onFullscreen}
        helpContent="Detailed news stories with full articles, images, and market sentiment analysis. Filter by keywords, view reactions, and explore related companies, currencies, and asset classes."
      >
        {/* Pagination */}
        <div className="flex items-center gap-2 mr-3">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-1 hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Pages</span>
            {Array.from({ length: Math.min(totalPages, 4) }, (_, index) => index + 1).map(
              (page) => (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
                    currentPage === page
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {page.toString().padStart(2, '0')}
                </button>
              )
            )}
            {totalPages > 4 && (
              <>
                <span className="text-xs text-muted-foreground">...</span>
                <button
                  onClick={() => goToPage(totalPages)}
                  className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
                    currentPage === totalPages
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {totalPages.toString().padStart(2, '0')}
                </button>
              </>
            )}
          </div>

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-1 hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded text-sm"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Search */}
        <div className="relative w-56">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search stories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-8 pr-3 text-sm bg-input-background border-border"
          />
        </div>
      </WidgetHeader>

      {/* News Stories List */}
      <ScrollArea className="flex-1 min-h-0 [&_[data-radix-scroll-area-viewport]]:h-full [&_[data-radix-scroll-area-viewport]]:max-h-full [&_[data-radix-scroll-area-viewport]]:overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Fetching latest news stories...
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-sm text-destructive">{error}</p>
            <button
              onClick={handleRetry}
              className="text-sm text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {paginatedStories.map((story) => {
              const thumbnail = story.thumbnail ?? "";
              const hasThumbnail = thumbnail.length > 0;
              const isRemoteThumbnail = hasThumbnail && thumbnail.startsWith("http");
              return (
                <div
                  key={story.id}
                  className="p-3 hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <div 
                    className="flex gap-3 cursor-pointer"
                    onClick={() => openStory(story)}
                  >
                    {/* Thumbnail - Bigger */}
                    <div className="flex-shrink-0 w-40 h-24 bg-muted/50 rounded overflow-hidden border border-border">
                      {hasThumbnail ? (
                        isRemoteThumbnail ? (
                          <ImageWithFallback
                            src={thumbnail}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img
                            src={thumbnail}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        )
                      ) : (
                        <div className="w-full h-full bg-muted/30" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Tag */}
                      <div className="mb-2">
                        {story.category ? (
                          <Badge
                            variant="secondary"
                            className="bg-muted/50 text-muted-foreground border border-border text-sm font-semibold px-3 py-1 h-auto rounded-full tracking-wide"
                          >
                            {story.category}
                          </Badge>
                        ) : null}
                      </div>

                      {/* Headline - White text */}
                      <h3 className="text-base text-foreground mb-1.5 hover:text-primary transition-colors line-clamp-2 font-semibold">
                        {story.headline}
                      </h3>

                      {/* Description - 2 lines */}
                      <p className="text-sm text-muted-foreground leading-relaxed mb-2 line-clamp-2">
                        {story.description}
                      </p>

                      {/* Meta Information */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground font-medium">{story.source}</span>
                          <span className="text-muted-foreground">|</span>
                          <span className={`${getSentimentColor(story.sentiment)} font-semibold`}>
                            {story.sentiment || "Neutral"}
                          </span>
                        </div>
                        <span className="text-muted-foreground italic">
                          {story.timestamp}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {paginatedStories.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No stories found matching your search.
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-border bg-widget-header">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {filteredStories.length === 0
              ? "Showing 0 of 0 stories"
              : `Showing ${startItem}-${endItem} of ${filteredStories.length} stories`}
          </span>
          <span className="font-medium text-foreground">
            Page {currentPage} of {totalPages}
          </span>
        </div>
      </div>
    </div>

      {/* News Story Dialog */}
      {selectedStory && (
        <NewsStoryDialog
          isOpen={isDetailOpen}
          onClose={closeStory}
          displayMode={settings?.newsDisplayMode || "widget-slider"}
          story={selectedStory}
        />
      )}
    </>
  );
}

// Export wrapper with settings
export default function NewsStory({ onRemove, onSettings, onFullscreen, wgid, settings }: NewsStoryProps & { onSettings?: () => void; onFullscreen?: () => void; wgid?: string; settings?: Record<string, any> }) {
  return (
    <WidgetWithSettings widgetType="news-story">
      {({ onOpenSettings, settings }) => (
        <NewsStoryContent 
          onOpenSettings={onOpenSettings} 
          onRemove={onRemove}
          onFullscreen={onFullscreen}
          settings={settings}
        />
      )}
    </WidgetWithSettings>
  );
}

// Standalone News Story Panel for use in other components
interface NewsStoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  displayMode?: "widget-slider" | "fullscreen-slider" | "popup";
  story: NewsStoryItem;
}

export function NewsStoryDialog({ isOpen, onClose, displayMode = "widget-slider", story }: NewsStoryDialogProps) {
  const [detailedStory, setDetailedStory] = useState<NewsStoryItem | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const { preferences } = usePreferences();

  // Fetch detailed story data when dialog opens
  useEffect(() => {
    if (!isOpen || !story.id) return;

    let mounted = true;
    const controller = new AbortController();

    const loadDetails = async () => {
      setIsLoadingDetails(true);
      
      const result = await fetchNewsById(story.id, controller.signal);
      
      if (!mounted) return;

      if (result.success && result.data) {
        setDetailedStory(result.data as NewsStoryItem);
      }
      
      setIsLoadingDetails(false);
    };

    loadDetails().catch(() => {
      if (mounted) {
        setIsLoadingDetails(false);
      }
    });

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [isOpen, story.id]);

  // Reset detailed story when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setDetailedStory(null);
    }
  }, [isOpen]);

  // Handle ESC key to close dialog
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Use detailed story if available, otherwise use prop story
  const displayStory = detailedStory || story;
  
  // Get the timestamp value for formatting
  // If we have detailed story, it should have the original ISO timestamp
  // Otherwise, try to use the story timestamp (might be formatted or ISO)
  const getTimestampForFormatting = (): string => {
    // If detailed story exists, use its timestamp (should be original ISO string)
    if (detailedStory?.timestamp) {
      return detailedStory.timestamp;
    }
    // Otherwise, check if story.timestamp is a valid date string (ISO format)
    const timestamp = story.timestamp;
    // Check if it looks like an ISO date string (contains 'T' or is in YYYY-MM-DD format)
    if (timestamp.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(timestamp)) {
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        return timestamp;
      }
    }
    // If it's already formatted, try to parse it as a date anyway
    // formatTimestamp will handle invalid dates gracefully
    return timestamp;
  };
  
  const timestampForFormatting = getTimestampForFormatting();

  const fallbackTakeaways = [
    "Market volatility expected to increase in coming weeks",
    "Long-term investors should maintain diversified portfolios",
    "Technical indicators suggest potential reversal patterns",
    "Monitor central bank policy announcements closely",
  ];

  const keyTakeaways =
    displayStory.keyTakeaways && displayStory.keyTakeaways.length > 0 ? displayStory.keyTakeaways : fallbackTakeaways;

  const relatedKeywords =
    displayStory.keywords && displayStory.keywords.length > 0
      ? displayStory.keywords
      : ["Markets", "Trading", "Volatility", "Economy", "Interest Rates"];
  const relatedCountries =
    displayStory.countries && displayStory.countries.length > 0 ? displayStory.countries : ["US", "CN", "EU", "JP"];
  const relatedCompanies =
    displayStory.companies && displayStory.companies.length > 0
      ? displayStory.companies
      : ["Apple Inc.", "Microsoft Corp.", "Amazon.com Inc.", "Tesla Inc."];
  const relatedStockTickers =
    displayStory.stockTickers && displayStory.stockTickers.length > 0
      ? displayStory.stockTickers
      : ["AAPL", "MSFT", "AMZN", "TSLA"];
  const relatedCurrencies =
    displayStory.currencies && displayStory.currencies.length > 0 ? displayStory.currencies : ["USD", "EUR", "JPY", "GBP"];
  const relatedAssetClasses =
    displayStory.assetClasses && displayStory.assetClasses.length > 0
      ? displayStory.assetClasses
      : ["Equities", "Bonds", "Commodities", "Forex"];

  const countryNames: Record<string, string> = {
    US: "United States",
    CN: "China",
    EU: "European Union",
    JP: "Japan",
    GB: "United Kingdom",
  };

  // Filter out [Content omitted] from paragraphs
  const filterContentOmitted = (paragraphs: string[]): string[] => {
    return paragraphs
      .map((p) => removeContentOmitted(p))
      .filter((p) => p && !p.match(/^\[Content omitted\]$/i));
  };

  const fullArticleParagraphs =
    displayStory.fullArticle && displayStory.fullArticle.length > 0
      ? filterContentOmitted(displayStory.fullArticle)
      : displayStory.content
      ? filterContentOmitted([displayStory.content])
      : [
          displayStory.description,
          "Financial markets have shown increased sensitivity to macroeconomic developments in recent sessions. Traders and investors are closely monitoring a range of indicators to gauge the health of the global economy.",
          "Looking ahead, market participants will be focusing on upcoming economic data releases and central bank communications for further guidance.",
        ];

  // Shared content component
  const renderContent = () => (
    <div className="px-6 py-8 space-y-8">
      {/* Headline */}
      <h1 className="text-3xl md:text-4xl text-foreground mb-2 leading-tight font-semibold">
        {displayStory.headline}
      </h1>

      {/* Featured Image */}
      {(displayStory.detailImage || displayStory.thumbnail) && (
        <div className="mb-6 rounded-lg overflow-hidden border border-border">
          <ImageWithFallback
            src={displayStory.detailImage || displayStory.thumbnail!}
            alt={displayStory.headline}
            className="w-full h-[320px] object-cover"
          />
        </div>
      )}

      {/* AI Key Takeaways */}
      <div className="p-5 bg-primary/5 border border-primary/20 rounded-lg">
        <div className="flex items-start gap-2 mb-3">
          <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Check className="w-3 h-3 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-3">AI Key Takeaways</h3>
            <div className="space-y-3">
              {keyTakeaways.map((takeaway, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-primary text-base mt-1">•</span>
                  <span className="text-base text-muted-foreground leading-relaxed">{takeaway}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Article Content */}
      <div className="space-y-5">
        {fullArticleParagraphs.map((paragraph, idx) => (
          <p
            key={idx}
            className="text-lg text-foreground/90 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: highlightText(paragraph) }}
          />
        ))}
      </div>

      {/* Metadata Grid */}
      <div className="grid grid-cols-2 gap-8 pt-8 border-t border-border">
        {/* Keywords */}
        <div>
          <h3 className="text-xl font-semibold text-foreground mb-4">Keywords</h3>
          <div className="flex flex-wrap gap-3">
            {relatedKeywords.map((keyword, idx) => (
              <span
                key={idx}
                className="px-4 py-2 bg-background border border-border text-foreground text-sm rounded-md hover:bg-muted cursor-pointer transition-colors"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>

        {/* Stock Tickers */}
        <div>
          <h3 className="text-xl font-semibold text-foreground mb-4">Stock Tickers</h3>
          <div className="flex flex-wrap gap-3">
            {relatedStockTickers.map((ticker, idx) => (
              <span
                key={idx}
                className="px-4 py-2 bg-background border border-border text-primary text-sm font-semibold rounded-md hover:bg-muted cursor-pointer transition-colors"
              >
                {ticker}
              </span>
            ))}
          </div>
        </div>

        {/* Currencies */}
        <div>
          <h3 className="text-xl font-semibold text-foreground mb-4">Currencies</h3>
          <div className="flex flex-wrap gap-3">
            {relatedCurrencies.map((currency, idx) => (
              <span
                key={idx}
                className="px-4 py-2 bg-background border border-border text-foreground text-sm rounded-md hover:bg-muted cursor-pointer transition-colors"
              >
                {currency}
              </span>
            ))}
          </div>
        </div>

        {/* Asset Classes */}
        <div>
          <h3 className="text-xl font-semibold text-foreground mb-4">Asset Classes</h3>
          <div className="flex flex-wrap gap-3">
            {relatedAssetClasses.map((assetClass, idx) => (
              <span
                key={idx}
                className="px-4 py-2 bg-background border border-border text-foreground text-sm rounded-md hover:bg-muted cursor-pointer transition-colors"
              >
                {assetClass}
              </span>
            ))}
          </div>
        </div>

        {/* Countries */}
        <div>
          <h3 className="text-xl font-semibold text-foreground mb-4">Countries</h3>
          <div className="flex flex-wrap gap-3">
            {relatedCountries.map((country, idx) => {
              return (
                <span
                  key={idx}
                  className="px-4 py-2 bg-background border border-border text-foreground text-sm rounded-md hover:bg-muted cursor-placeholder transition-colors"
                >
                  {countryNames[country] || country}
                </span>
              );
            })}
          </div>
        </div>

        {/* Companies */}
        <div>
          <h3 className="text-xl font-semibold text-foreground mb-4">Companies</h3>
          <div className="flex flex-wrap gap-3">
            {relatedCompanies.map((company, idx) => (
              <span
                key={idx}
                className="px-4 py-2 bg-background border border-border text-foreground text-sm rounded-md hover:bg-muted cursor-pointer transition-colors"
              >
                {company}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Render popup dialog mode - centered within widget container
  if (displayMode === "popup") {
    return (
      <>
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-500 ${
            isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
          onClick={onClose}
        />

        {/* Popup Panel - Centered within container */}
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[840px] h-[85%] max-h-[600px] bg-widget-body border border-border rounded-lg z-50 transform transition-all duration-500 ease-in-out shadow-2xl overflow-hidden ${
            isOpen
              ? "opacity-100 scale-100 pointer-events-auto"
              : "opacity-0 scale-95 pointer-events-none"
          }`}
        >
          <div className="flex min-h-0 flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-2 border-b border-border bg-widget-header rounded-t-lg flex-shrink-0">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/20 text-primary hover:bg-primary/30 text-xs font-semibold px-2 py-0.5 rounded-md">
                  {(displayStory.category || "General").toUpperCase()}
                </Badge>
                <p className="text-sm text-muted-foreground">
                  {displayStory.source} • {formatTimestamp(timestampForFormatting, preferences.dateFormat)}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1 min-h-0 overflow-hidden">
              <div className="pb-12">
                {renderContent()}
              </div>
            </ScrollArea>
          </div>
        </div>
      </>
    );
  }

  // Render slider modes (widget or fullscreen)
  const isFullscreen = displayMode === "fullscreen-slider";
  const positionClass = "absolute"; // Always absolute relative to widget container
  // Use percentage-based widths that adapt to container:
  // - widget-slider: 75% of container width (half width slide in)
  // - fullscreen-slider: 100% of container width
  const widthClass = isFullscreen ? "w-full" : "w-3/4";

  return (
    <>
      {/* Backdrop */}
      <div
        className={`${positionClass} inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-500 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Slide-in Panel */}
      <div
        className={`${positionClass} top-0 left-0 h-full ${widthClass} bg-widget-body border-r border-border z-50 transform transition-transform duration-500 ease-in-out ${
          isOpen
            ? "translate-x-0 opacity-100 shadow-2xl"
            : "-translate-x-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex min-h-0 flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-2 border-b border-border bg-widget-header">
            <div className="flex items-center gap-3">
              <Badge className="bg-primary/20 text-primary hover:bg-primary/30 text-xs font-semibold px-2 py-0.5 rounded-md">
                {(displayStory.category || "General").toUpperCase()}
              </Badge>
              <p className="text-sm text-muted-foreground">
                {displayStory.source} • {formatTimestamp(timestampForFormatting, preferences.dateFormat)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1 h-full">
            <div className="pb-12">
              {renderContent()}
            </div>
          </ScrollArea>
        </div>
      </div>
    </>
  );
}

