"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import { WidgetWithSettings } from "@/components/utils/WidgetWithSettings";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ImageWithFallback } from "@/components/utils/ImageWithFallback";
import { NewsStoryDialog } from "../NewsStory";
import { fetchNewsDashboard } from "./api";
import { formatDistanceToNow } from "date-fns";

// Helper to measure category button width
const ESTIMATED_CATEGORY_BUTTON_WIDTH = 100; // Approximate width per category button including gap

interface NewsDashboardProps {
  onRemove?: () => void;
  onSettings?: () => void;
  onFullscreen?: () => void;
  wgid?: string;
  settings?: Record<string, any>;
}

interface NewsArticle {
  id: string;
  title: string;
  description: string;
  source: string;
  timestamp: string;
  category: string;
  imageUrl: string;
  isFeatured?: boolean;
  content?: string;
  sentiment?: string;
  takeaways?: string[];
}

const categories = [
  "Stocks", "Commodities", "Forex", "Politics", "Housing", "Energy",
  "Technology", "Corporate", "Economy", "Government", "Natural Disasters",
  "Industry", "Inspirational", "Law", "Military", "Society",
  "Transportation", "Conflict", "International", "Crypto", "Sport"
];

const formatTimestamp = (value: string) => {
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return value;
  }
};

const formatFullTimestamp = (value: string) => {
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

function NewsDashboardContent({ onOpenSettings, onRemove, onFullscreen, settings }: { onOpenSettings: () => void; onRemove?: () => void; onFullscreen?: () => void; settings: any }) {
  const [selectedCategory, setSelectedCategory] = useState("Stocks");
  const [selectedStory, setSelectedStory] = useState<NewsArticle | null>(null);
  const [isStoryPanelOpen, setIsStoryPanelOpen] = useState(false);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [currentFeaturedIndex, setCurrentFeaturedIndex] = useState(0);
  const [categoryStartIndex, setCategoryStartIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const categoryContainerRef = useRef<HTMLDivElement>(null);
  const [visibleCategoryCount, setVisibleCategoryCount] = useState(8);

  const ITEMS_PER_PAGE = 8; // Show 8 articles per page (2 rows of 4)

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    async function loadNews() {
      setLoading(true);
      setError(null);
      const response = await fetchNewsDashboard(
        {
          category: selectedCategory,
          limit: 50,
          offset: 0,
        },
        controller.signal
      );

      if (!mounted) return;

      if (!response.success || !response.data) {
        setError(response.error ?? "Unable to load news articles");
        setNewsArticles([]);
        setLoading(false);
        return;
      }

      setNewsArticles(response.data);
      setCurrentFeaturedIndex(0);
      setCurrentPage(1);
      setLoading(false);
    }

    loadNews().catch((err) => {
      if (!mounted) return;
      setError(err instanceof Error ? err.message : "Unknown error");
      setNewsArticles([]);
      setLoading(false);
    });

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [selectedCategory, refreshToken]);

  const handleRetry = () => {
    setRefreshToken((prev) => prev + 1);
  };

  const featuredArticles = useMemo(() => {
    if (newsArticles.length === 0) {
      return [];
    }

    const highlighted = newsArticles.filter((article) => article.isFeatured);
    if (highlighted.length > 0) {
      return highlighted;
    }

    return newsArticles.slice(0, Math.min(4, newsArticles.length));
  }, [newsArticles]);

  const nonFeaturedArticles = useMemo(
    () => newsArticles.filter((article) => !article.isFeatured),
    [newsArticles]
  );

  const currentFeatured =
    featuredArticles.length > 0
      ? featuredArticles[Math.min(currentFeaturedIndex, featuredArticles.length - 1)]
      : undefined;
  
  // Pagination calculations
  const totalPages = Math.ceil(nonFeaturedArticles.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedArticles = nonFeaturedArticles.slice(startIndex, endIndex);

  const handlePreviousFeatured = () => {
    if (featuredArticles.length === 0) return;
    setCurrentFeaturedIndex((prev) =>
      prev === 0 ? featuredArticles.length - 1 : prev - 1
    );
  };

  const handleNextFeatured = () => {
    if (featuredArticles.length === 0) return;
    setCurrentFeaturedIndex((prev) =>
      prev === featuredArticles.length - 1 ? 0 : prev + 1
    );
  };

  // Calculate how many categories can fit based on container width
  useEffect(() => {
    const updateVisibleCount = () => {
      if (!categoryContainerRef.current) return;
      
      const containerWidth = categoryContainerRef.current.clientWidth;
      // Account for arrow buttons (2 * 24px) + gaps (3 * 4px) + padding (2 * 8px) = ~76px
      // But we'll dynamically check if arrows are needed
      const gapSize = 4; // gap-1 = 4px
      const arrowButtonWidth = 24; // w-6 = 24px
      
      // First, check if we need arrows by measuring all categories
      const categoryButtons = categoryContainerRef.current.querySelectorAll('button[data-category-button]');
      
      if (categoryButtons.length > 0) {
        // Calculate total width needed for all categories
        let totalCategoriesWidth = 0;
        categoryButtons.forEach((btn) => {
          totalCategoriesWidth += (btn as HTMLElement).offsetWidth + gapSize;
        });
        totalCategoriesWidth -= gapSize; // Remove last gap
        
        // Check if we need arrows (if all categories don't fit)
        const needsArrows = totalCategoriesWidth > containerWidth - (2 * arrowButtonWidth + 2 * gapSize + 16); // 16px for padding
        
        if (!needsArrows) {
          // All categories fit, show all
          setVisibleCategoryCount(categories.length);
        } else {
          // Calculate how many fit with arrows
          const availableWidth = containerWidth - (2 * arrowButtonWidth + 3 * gapSize + 16); // 16px for padding
          let totalWidth = 0;
          let count = 0;
          
          categoryButtons.forEach((btn) => {
            const btnWidth = (btn as HTMLElement).offsetWidth;
            const buttonWithGap = btnWidth + gapSize;
            if (totalWidth + buttonWithGap <= availableWidth) {
              totalWidth += buttonWithGap;
              count++;
            }
          });
          
          setVisibleCategoryCount(Math.max(count, 1));
        }
      } else {
        // Initial estimate before buttons are rendered
        const estimatedCount = Math.floor((containerWidth - 76) / ESTIMATED_CATEGORY_BUTTON_WIDTH);
        setVisibleCategoryCount(Math.max(estimatedCount, 8));
      }
    };

    // Small delay to ensure buttons are rendered before measuring
    const timeoutId = setTimeout(updateVisibleCount, 50);
    
    const resizeObserver = new ResizeObserver(() => {
      setTimeout(updateVisibleCount, 10);
    });
    
    if (categoryContainerRef.current) {
      resizeObserver.observe(categoryContainerRef.current);
    }

    // Also update on window resize
    const handleResize = () => setTimeout(updateVisibleCount, 10);
    window.addEventListener('resize', handleResize);
    
    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [categories.length]);

  const canScrollCategoriesLeft = categoryStartIndex > 0;
  const canScrollCategoriesRight = categoryStartIndex + visibleCategoryCount < categories.length;

  const handlePreviousCategories = () => {
    setCategoryStartIndex((prev) => Math.max(0, prev - visibleCategoryCount));
  };

  const handleNextCategories = () => {
    setCategoryStartIndex((prev) => Math.min(categories.length - visibleCategoryCount, prev + visibleCategoryCount));
  };

  const visibleCategories = categories.slice(categoryStartIndex, categoryStartIndex + visibleCategoryCount);

  // Reset to page 1 when category changes
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const openStory = (article: NewsArticle) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    setIsStoryPanelOpen(false);
    setSelectedStory(article);

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

  return (
    <>
      <div className="w-full h-full bg-widget-body border border-border rounded-none flex flex-col relative overflow-hidden">
        {/* Header */}
        <WidgetHeader 
          title="News Dashboard"
          onSettings={onOpenSettings}
          onRemove={onRemove}
          onFullscreen={onFullscreen}
          helpContent="Comprehensive news dashboard with categorized stories from global markets. Browse by category and click any story to read the full article with AI-generated highlights and insights."
        />

        {/* Category Tabs */}
        <div className="border-b border-border bg-widget-header">
          <div ref={categoryContainerRef} className="flex items-center gap-1 px-2 py-2">
            {/* Left Arrow - Only show if there are categories to the left */}
            {canScrollCategoriesLeft && (
              <button
                onClick={handlePreviousCategories}
                className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              </button>
            )}

            {/* Category Buttons */}
            <div className="flex-1 flex items-center gap-1 overflow-hidden">
              {/* Render all categories for measurement, but only display visible ones */}
              <div className="flex items-center gap-1 relative" style={{ width: '100%' }}>
                {categories.map((category, index) => {
                  const isVisible = index >= categoryStartIndex && index < categoryStartIndex + visibleCategoryCount;
                  return (
                    <button
                      key={category}
                      data-category-button
                      onClick={() => handleCategoryChange(category)}
                      className={`px-3 py-1 text-xs whitespace-nowrap rounded transition-colors flex-shrink-0 ${
                        selectedCategory === category
                          ? "bg-primary text-white"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                      style={!isVisible ? { position: 'absolute', visibility: 'hidden', pointerEvents: 'none' } : {}}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Arrow - Only show if there are categories to the right */}
            {canScrollCategoriesRight && (
              <button
                onClick={handleNextCategories}
                className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-muted transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1 min-h-0 [&_[data-radix-scroll-area-viewport]]:h-full [&_[data-radix-scroll-area-viewport]]:max-h-full [&_[data-radix-scroll-area-viewport]]:overflow-y-auto">
            {loading ? (
              <div className="flex h-full items-center justify-center py-20 text-base text-muted-foreground">
                Loading latest news...
              </div>
            ) : error ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
                <p className="text-base text-muted-foreground max-w-md">
                  {error}
                </p>
                <Button size="sm" className="text-xs px-4" onClick={handleRetry}>
                  Retry
                </Button>
              </div>
            ) : newsArticles.length === 0 ? (
              <div className="flex h-full items-center justify-center py-20 text-base text-muted-foreground">
                No news articles available for this category yet.
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {/* Featured Story */}
                {currentFeatured && (
                  <div className="relative group/featured">
                    <div
                      className="relative h-[280px] bg-card border border-border rounded-lg overflow-hidden cursor-pointer"
                      onClick={() => openStory(currentFeatured)}
                    >
                      <ImageWithFallback
                        src={currentFeatured.imageUrl}
                        alt={currentFeatured.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

                      {/* Navigation Arrows */}
                      {featuredArticles.length > 1 && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePreviousFeatured();
                            }}
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors"
                          >
                            <ChevronLeft className="w-5 h-5 text-white" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNextFeatured();
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors"
                          >
                            <ChevronRight className="w-5 h-5 text-white" />
                          </button>
                        </>
                      )}

                      <div className="absolute bottom-0 left-0 right-0 p-5">
                        <h2 className="text-white text-2xl mb-3 leading-snug">
                          {currentFeatured.title}
                        </h2>
                        <p className="text-white/80 text-sm mb-3 line-clamp-3">
                          {currentFeatured.description}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-white/60">
                          <span>{currentFeatured.source}</span>
                          <span>•</span>
                          <span>{formatTimestamp(currentFeatured.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* News Grid */}
                <div className="grid grid-cols-4 gap-2">
                  {paginatedArticles.map((article) => (
                    <div
                      key={article.id}
                    onClick={() => openStory(article)}
                      className="bg-card border border-border rounded-lg overflow-hidden cursor-pointer hover:border-primary/50 transition-colors group/article"
                    >
                      <div className="relative h-[140px] bg-muted">
                        <ImageWithFallback
                          src={article.imageUrl}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover/article:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-2.5 space-y-1.5">
                        <h3 className="text-sm text-foreground line-clamp-2 leading-snug">
                          {article.title}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {article.description}
                        </p>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="truncate">{article.source}</span>
                          <span>•</span>
                          <span className="truncate">
                            {formatTimestamp(article.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {paginatedArticles.length === 0 && (
                    <div className="col-span-4 py-8 text-center text-xs text-muted-foreground">
                      No additional articles available.
                    </div>
                  )}
                </div>
              </div>
            )}
          </ScrollArea>

          {/* Pagination Footer - Always visible */}
          <div className="border-t border-border bg-widget-header px-4 py-2.5 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {nonFeaturedArticles.length > 0 ? (
                  <>
                    Showing {Math.min(startIndex + 1, nonFeaturedArticles.length)}-
                    {Math.min(endIndex, nonFeaturedArticles.length)} of {nonFeaturedArticles.length} articles
                  </>
                ) : newsArticles.length > 0 ? (
                  <>Only featured stories are available for this category.</>
                ) : (
                  <>No articles found</>
                )}
              </div>
              {nonFeaturedArticles.length > ITEMS_PER_PAGE && (
                <div className="flex items-center gap-1">
                  {/* Previous Button */}
                  <button
                    onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`h-7 px-2.5 text-xs border border-border rounded hover:bg-muted transition-colors ${
                      currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    Previous
                  </button>
                  
                  {/* Page Numbers */}
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`h-7 w-7 text-xs border rounded transition-colors flex items-center justify-center ${
                          currentPage === pageNum
                            ? 'bg-primary text-white border-primary'
                            : 'border-border hover:bg-muted cursor-pointer'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  {/* Next Button */}
                  <button
                    onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`h-7 px-2.5 text-xs border border-border rounded hover:bg-muted transition-colors ${
                      currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* News Story Dialog */}
      {selectedStory && (
        <NewsStoryDialog
          isOpen={isStoryPanelOpen}
          onClose={closeStory}
          displayMode={settings?.newsDisplayMode || "widget-slider"}
          story={{
            id: selectedStory.id,
            headline: selectedStory.title,
            description: selectedStory.description,
            source: selectedStory.source,
            timestamp: formatFullTimestamp(selectedStory.timestamp),
            category: selectedStory.category,
            thumbnail: selectedStory.imageUrl,
            content: selectedStory.content || selectedStory.description,
            sentiment: selectedStory.sentiment as "Bullish" | "Bearish" | "Neutral" | "Negative" | "Positive" | undefined,
            keyTakeaways: selectedStory.takeaways,
          }}
        />
      )}
    </>
  );
}

export default function NewsDashboard({ onRemove, onSettings, onFullscreen, wgid, settings }: NewsDashboardProps) {
  return (
    <WidgetWithSettings widgetType="news-dashboard">
      {({ onOpenSettings, settings }) => (
        <NewsDashboardContent 
          onOpenSettings={onOpenSettings} 
          onRemove={onRemove}
          onFullscreen={onFullscreen}
          settings={settings}
        />
      )}
    </WidgetWithSettings>
  );
}
