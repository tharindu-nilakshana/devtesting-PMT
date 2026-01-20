/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import { ChevronLeft, ChevronRight, Star, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ComponentType, type DragEvent } from "react";
import * as Icons from "lucide-react";
import { getAllTemplateImagePaths } from "@/utils/templateImage";

interface Tab {
  id: string;
  name: string;
  icon?: string;
  layout?: string;
  saved?: boolean;
}

interface TemplateTabsProps {
  tabs: Tab[];
  activeTabId: string;
  onTabChange: (id: string) => void;
  onTabClose: (id: string) => void;
  onNewTab: () => void;
  onTabsReorder?: (tabs: Tab[]) => void;
  onTabIconChange?: (tabId: string, icon: string) => void;
}

const ICON_OPTIONS = [
  { name: "Star", component: Icons.Star },
  { name: "TrendingUp", component: Icons.TrendingUp },
  { name: "BarChart3", component: Icons.BarChart3 },
  { name: "Activity", component: Icons.Activity },
  { name: "LineChart", component: Icons.LineChart },
  { name: "CandlestickChart", component: Icons.CandlestickChart },
  { name: "PieChart", component: Icons.PieChart },
  { name: "Target", component: Icons.Target },
  { name: "Zap", component: Icons.Zap },
  { name: "Flame", component: Icons.Flame },
];

export function TemplateTabs({ tabs, activeTabId, onTabChange, onTabClose, onTabsReorder, onTabIconChange }: TemplateTabsProps) {
  const [hoveredTabId, setHoveredTabId] = useState<string | null>(null);
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // console.log('🔍 [TemplateTabs] Debug:', {
  //   activeTabId,
  //   tabIds: tabs.map(t => t.id),
  //   tabNames: tabs.map(t => t.name),
  //   activeTabExists: tabs.some(t => t.id === activeTabId)
  // });

  if (tabs.length === 0) return null;

  const isEmoji = (str: string | undefined): boolean => {
    if (!str) return false;
    const emojiRegex = /^(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F|[\u{1F1E0}-\u{1F1FF}]{2})$/u;
    return emojiRegex.test(str);
  };

  // Component to render tab icon with image fallback support
  const TabIconOrImage = ({ templateName, iconName, className = "w-3 h-3 flex-shrink-0" }: { templateName: string; iconName?: string; className?: string }) => {
    const [imageError, setImageError] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    
    const imagePaths = getAllTemplateImagePaths(templateName);
    
    const tryNextImage = () => {
      if (currentImageIndex < imagePaths.length - 1) {
        setCurrentImageIndex(currentImageIndex + 1);
        setImageError(false);
      } else {
        setImageError(true);
      }
    };
    
    // If image is available and hasn't failed, try to load it
    if (imagePaths.length > 0 && !imageError) {
      return (
        <img 
          src={imagePaths[currentImageIndex]}
          alt={templateName}
          className={className}
          style={{ objectFit: 'contain' }}
          onError={tryNextImage}
        />
      );
    }
    
    // Fallback to icon/emoji
    if (!iconName) {
      return <Star className={className} />;
    }

    if (isEmoji(iconName)) {
      return <span className="text-base leading-none">{iconName}</span>;
    }

    const IconComponent = (Icons as unknown as Record<string, ComponentType<{ className?: string }>>)[iconName] || Star;
    return <IconComponent className={className} />;
  };

  const renderTabIcon = (iconName?: string, className: string = "w-3 h-3 flex-shrink-0") => {
    if (!iconName) {
      return <Star className={className} />;
    }

    if (isEmoji(iconName)) {
      return <span className="text-base leading-none">{iconName}</span>;
    }

    const IconComponent = (Icons as unknown as Record<string, ComponentType<{ className?: string }>>)[iconName] || Star;
    return <IconComponent className={className} />;
  };

  const handleDragStart = (tabId: string, e: DragEvent<HTMLDivElement>) => {
    setDraggedTabId(tabId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (tabId: string, e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedTabId && draggedTabId !== tabId) {
      setDragOverTabId(tabId);
    }
  };

  const handleDrop = (tabId: string, e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (draggedTabId && draggedTabId !== tabId && onTabsReorder) {
      const draggedIndex = tabs.findIndex(t => t.id === draggedTabId);
      const targetIndex = tabs.findIndex(t => t.id === tabId);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const newTabs = [...tabs];
        const [draggedTab] = newTabs.splice(draggedIndex, 1);
        newTabs.splice(targetIndex, 0, draggedTab);
        onTabsReorder(newTabs);
      }
    }
    setDraggedTabId(null);
    setDragOverTabId(null);
  };

  const handleDragEnd = () => {
    setDraggedTabId(null);
    setDragOverTabId(null);
  };

  const updateScrollIndicators = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    
    // Force a reflow to ensure accurate measurements
    el.offsetWidth;
    
    const overflow = el.scrollWidth > el.clientWidth;
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    const currentScrollLeft = el.scrollLeft;
    
    setHasOverflow(overflow);
    
    // Only show arrows if there's overflow and content can actually be scrolled in that direction
    // Use a small threshold (5px) to avoid flickering when at the exact boundary
    setCanScrollLeft(overflow && currentScrollLeft > 5);
    setCanScrollRight(overflow && currentScrollLeft < maxScrollLeft - 5);
  }, []);

  // Force update scroll indicators on mount and when tabs change
  useEffect(() => {
    const timer = setTimeout(() => {
      updateScrollIndicators();
    }, 100);
    return () => clearTimeout(timer);
  }, [tabs.length, updateScrollIndicators]);

  // Effect to handle active tab changes and ensure proper scrolling
  useEffect(() => {
    if (!activeTabId || !scrollRef.current) return;
    
    const activeTabElement = scrollRef.current.querySelector(`[data-tab-id="${activeTabId}"]`) as HTMLElement;
    if (activeTabElement) {
      const container = scrollRef.current;
      const containerRect = container.getBoundingClientRect();
      const tabRect = activeTabElement.getBoundingClientRect();
      
      const isFullyVisible = 
        tabRect.left >= containerRect.left && 
        tabRect.right <= containerRect.right;
      
      if (!isFullyVisible) {
        activeTabElement.scrollIntoView({ 
          behavior: 'smooth', 
          inline: 'nearest' 
        });
        
        setTimeout(() => {
          updateScrollIndicators();
        }, 300);
      }
    }
  }, [activeTabId, updateScrollIndicators]);

  useEffect(() => {
    const rafId1 = requestAnimationFrame(() => {
      const rafId2 = requestAnimationFrame(() => {
        updateScrollIndicators();
      });
      return () => cancelAnimationFrame(rafId2);
    });
    
    const timeoutId = setTimeout(() => {
      updateScrollIndicators();
    }, 100);
    
    return () => {
      cancelAnimationFrame(rafId1);
      clearTimeout(timeoutId);
    };
  }, [tabs.length, updateScrollIndicators]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let rafId: number;
    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => updateScrollIndicators());
    };
    
    el.addEventListener("scroll", onScroll, { passive: true });

    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => updateScrollIndicators());
    });
    ro.observe(el);

    return () => {
      cancelAnimationFrame(rafId);
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, [updateScrollIndicators]);

  const scrollByAmount = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    
    const scrollAmount = Math.max(220, el.clientWidth * 0.7);
    const delta = direction === "left" ? -scrollAmount : scrollAmount;
    
    el.scrollBy({ left: delta, behavior: "smooth" });
    
    setTimeout(() => {
      updateScrollIndicators();
    }, 300);
  };

  return (
    <div className="h-9 bg-widget-header border-b border-border flex items-end relative" data-tour="tabs-section">
      {hasOverflow && (
        <button
          type="button"
          aria-label="Scroll tabs left"
          disabled={!canScrollLeft}
          className={`absolute left-0 top-0 h-full w-8 flex items-center justify-center bg-gradient-to-r from-widget-header via-widget-header to-transparent border-r border-border/80 transition-all duration-200 shadow-md ${
            canScrollLeft ? "text-foreground hover:text-primary hover:bg-muted/30" : "text-muted-foreground/30 cursor-not-allowed"
          }`}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={() => canScrollLeft && scrollByAmount("left")}
          style={{ zIndex: 10 }}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {hasOverflow && (
        <button
          type="button"
          aria-label="Scroll tabs right"
          disabled={!canScrollRight}
          className={`absolute right-0 top-0 h-full w-8 flex items-center justify-center bg-gradient-to-l from-widget-header via-widget-header to-transparent border-l border-border/80 transition-all duration-200 shadow-md ${
            canScrollRight ? "text-foreground hover:text-primary hover:bg-muted/30" : "text-muted-foreground/30 cursor-not-allowed"
          }`}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={() => canScrollRight && scrollByAmount("right")}
          style={{ zIndex: 10 }}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      <div
        ref={scrollRef}
        className={`flex-1 h-full overflow-x-auto hide-scrollbar px-1 transition-all duration-200 ${hasOverflow ? "pl-9 pr-9" : ""}`}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex items-end h-full w-max flex-nowrap">
        {tabs.map((tab, index) => {
          // console.log(`🔍 [TemplateTabs] Rendering tab ${index + 1}/${tabs.length}: ${tab.name} (id: ${tab.id})`);
          
          const isActive = tab.id === activeTabId;
          const isHovered = tab.id === hoveredTabId;
          const isDragOver = tab.id === dragOverTabId;
          
          
          return (
            <div
              key={tab.id}
              data-tab-id={tab.id}
              className="relative flex items-end h-full cursor-move"
              style={{ 
                marginLeft: index > 0 ? '-8px' : '0',
                // Use a reasonable base z-index for tabs (should be lower than modals which use z-50+)
                // Active tab gets highest, hovered/dragover gets second highest, then descending for others
                zIndex: isActive ? 10 : isHovered || isDragOver ? 9 : Math.max(1, 8 - index)
              }}
              onMouseEnter={() => setHoveredTabId(tab.id)}
              onMouseLeave={() => setHoveredTabId(null)}
              draggable
              onDragStart={(e) => handleDragStart(tab.id, e)}
              onDragOver={(e) => handleDragOver(tab.id, e)}
              onDrop={(e) => handleDrop(tab.id, e)}
              onDragEnd={handleDragEnd}
            >
              {/* Tab */}
              <div
                className={`
                  relative flex items-center gap-2 px-4 h-[32px] min-w-[120px] max-w-[200px]
                  transition-all duration-200 cursor-pointer group
                  ${isActive 
                    ? 'bg-background text-foreground' 
                    : 'bg-popover text-muted-foreground hover:bg-muted hover:text-foreground'
                  }
                  ${isDragOver ? 'bg-muted' : ''}
                `}
                style={{
                  clipPath: 'polygon(8px 0%, calc(100% - 8px) 0%, 100% 100%, 0% 100%)',
                }}
                onClick={() => onTabChange(tab.id)}
              >
                {/* Icon or Image */}
                <div className="flex items-center justify-center">
                  <TabIconOrImage templateName={tab.name} iconName={tab.icon} className="w-3 h-3 flex-shrink-0" />
                </div>
                
                {/* Tab Name */}
                <span className="text-xs truncate flex-1">
                  {tab.name}
                </span>
                
                {/* Close Button */}
                {tabs.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTabClose(tab.id);
                    }}
                    className={`
                      flex-shrink-0 hover:bg-muted rounded p-0.5 transition-all
                      ${isActive || isHovered ? 'opacity-100' : 'opacity-0'}
                    `}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Active Tab Border Top Accent */}
              {isActive && (
                <div className="absolute top-0 left-2 right-2 h-[2px] bg-primary" />
              )}

              {/* Right separator for non-active adjacent tabs */}
              {!isActive && index < tabs.length - 1 && tabs[index + 1].id !== activeTabId && (
                <div 
                  className="absolute right-0 top-2 bottom-2 w-[1px] bg-border z-40"
                  style={{ opacity: isHovered ? 0 : 0.5 }}
                />
              )}
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}

