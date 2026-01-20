"use client";

import { useState, useEffect } from "react";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import { Tag, getTrendingTopicsData } from "./api";

interface TrendingTopicsProps {
  onRemove?: () => void;
  onSettings?: () => void;
  onFullscreen?: () => void;
  wgid?: string;
  settings?: Record<string, any>;
}

export default function TrendingTopics({ onRemove, onSettings, onFullscreen, wgid, settings }: TrendingTopicsProps) {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);
  const [trendingTags, setTrendingTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const limit = settings?.limit || 15;
        const result = await getTrendingTopicsData(limit);

        if (!result || !result.success) {
          setError(result?.error || 'Failed to fetch trending topics');
          setTrendingTags([]);
          setLoading(false);
          return;
        }

        if (result.data && result.data.length > 0) {
          setTrendingTags(result.data);
        } else {
          setTrendingTags([]);
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch trending topics');
        setTrendingTags([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [settings?.limit]);

  const getTagClasses = (weight: number, isSelected: boolean, isHovered: boolean) => {
    let sizeClasses = "";
    let baseClasses = "px-3 py-1.5 rounded border transition-all duration-200 cursor-pointer inline-flex items-center justify-center";
    
    // Size based on weight
    switch (weight) {
      case 5:
        sizeClasses = "text-lg"; // 18px
        break;
      case 4:
        sizeClasses = "text-base"; // 16px
        break;
      case 3:
        sizeClasses = "text-sm"; // 14px
        break;
      case 2:
        sizeClasses = "text-sm"; // 14px
        break;
      default:
        sizeClasses = "text-sm"; // 14px
    }

    // Color states
    let colorClasses = "";
    if (isSelected) {
      colorClasses = "bg-primary/20 border-primary text-primary";
    } else if (isHovered) {
      colorClasses = "bg-primary/10 border-primary/50 text-primary/90";
    } else {
      colorClasses = "bg-widget-header/50 border-border text-foreground hover:border-primary/30";
    }

    return `${baseClasses} ${sizeClasses} ${colorClasses}`;
  };

  const handleTagClick = (tagId: string) => {
    setSelectedTag(selectedTag === tagId ? null : tagId);
  };

  return (
    <div className="flex flex-col h-full bg-widget border border-border">
      {/* Header */}
      <WidgetHeader
        title="Trending Topics"
        onRemove={onRemove}
        onFullscreen={onFullscreen}
        helpContent="Real-time trending topics and keywords from market news and analysis. Click on any tag to filter related content."
      />

      {/* Content */}
      <div className="flex-1 overflow-auto min-h-0">
        <div className="p-4">
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">Loading trending topics...</div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-red-400">Error: {error}</div>
            </div>
          )}

          {/* No Data State */}
          {!loading && !error && trendingTags.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">No trending topics available</div>
            </div>
          )}

          {/* Tags Display */}
          {!loading && !error && trendingTags.length > 0 && (
            <>
              <div className="flex flex-wrap gap-2">
                {trendingTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => handleTagClick(tag.id)}
                    onMouseEnter={() => setHoveredTag(tag.id)}
                    onMouseLeave={() => setHoveredTag(null)}
                    className={getTagClasses(
                      tag.weight,
                      selectedTag === tag.id,
                      hoveredTag === tag.id
                    )}
                  >
                    {tag.text}
                  </button>
                ))}
              </div>

              {/* Selected Tag Info */}
              {selectedTag && (
                <div className="mt-6 pt-4 border-t border-border">
                  <div className="text-base text-muted-foreground">
                    <span className="text-foreground">Selected:</span>{" "}
                    {trendingTags.find((t) => t.id === selectedTag)?.text}
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Category: {trendingTags.find((t) => t.id === selectedTag)?.category}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer with stats */}
      <div className="px-4 py-2 border-t border-border bg-widget-header">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{trendingTags.length} trending topics</span>
          {!loading && !error && trendingTags.length > 0 && <span>Updated 2m ago</span>}
        </div>
      </div>
    </div>
  );
}

