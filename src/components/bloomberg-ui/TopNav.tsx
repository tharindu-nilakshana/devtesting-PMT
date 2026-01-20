"use client";

import { 
  Search, 
  Bell, 
  BellOff,
  User, 
  ChevronDown, 
  X,
  Star,
  TrendingUp,
  BarChart3,
  Layers,
  Grid3x3,
  LayoutTemplate,
  LineChart,
  PieChart,
  Activity,
  CandlestickChart,
  AlertCircle,
  ListChecks,
  Plus,
  Clock,
  ArrowRight,
  Hash,
  MessageCircle,
  FileText,
  Flame,
  Award,
  Crown,
  Diamond,
  Heart,
  Rocket,
  Sparkles,
  Globe,
  Settings,
  Home,
  Bookmark,
  Calendar,
  Map,
  Compass,
  Shield,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Filter,
  Download,
  Upload,
  Mail,
  Phone,
  Video,
  Camera,
  Image,
  File,
  Folder,
  Archive,
  Trash,
  Edit,
  Copy,
  Check,
  Minus,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Target,
  Zap,
  Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PMTLogo } from "@/components/bloomberg-ui/PMTLogo";
import { MarketSentimentIndicator } from "@/components/bloomberg-ui/MarketSentimentIndicator";
import { MacroAIChat } from "@/components/bloomberg-ui/MacroAIChat";
import { LiveSquawk } from "@/components/bloomberg-ui/LiveSquawk";
import { SupportChat } from "@/components/bloomberg-ui/SupportChat";
import { getAllTemplateImagePaths } from "@/utils/templateImage";
import { TemplatePanel } from "@/components/bloomberg-ui/TemplatePanel";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { UserTemplate } from "@/lib/templateApi";
import { usePreferences } from "@/hooks/usePreferences";

/**
 * Component to display template icon or image with fallback logic
 * Used in the TopNav template tabs
 */
function TemplateIconImage({ 
  templateName, 
  iconName, 
  className = "w-4 h-4" 
}: { 
  templateName: string; 
  iconName: string | undefined; 
  className?: string;
}) {
  const [imageError, setImageError] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Get all possible image paths for this template
  const imagePaths = getAllTemplateImagePaths(templateName);
  
  // Helper to check if a string is an emoji
  const isEmoji = (str: string) => {
    const emojiRegex = /^(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F|[\u{1F1E0}-\u{1F1FF}]{2})$/u;
    return emojiRegex.test(str);
  };
  
  // Try loading the image
  const tryNextImage = () => {
    if (currentImageIndex < imagePaths.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
      setImageError(false);
    } else {
      setImageError(true);
    }
  };
  
  // If no image paths or all images failed to load, show icon/emoji
  if (imagePaths.length === 0 || (imageError && currentImageIndex >= imagePaths.length - 1)) {
    if (iconName && isEmoji(iconName)) {
      return <span className="text-base leading-none">{iconName}</span>;
    }
    return <Star className={className} />;
  }
  
  // Try to load the image
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

interface Widget {
  id: string;
  type: string;
  position: string;
  settings?: Record<string, unknown>;
}

export interface Template {
  id: string;
  name: string;
  icon: string;
  isFavorite: boolean;
  displayOrder?: number;
  widgets?: Widget[];
}

interface Symbol {
  SymbolID: number;
  Symbol: string;
  NameToDisplay: string;
  Module: string;
}

interface TopNavProps {
  selectedTemplate?: string;
  templates?: UserTemplate[];
  onTemplateSelect?: (templateId: string) => void;
  onTemplateDelete?: (templateId: string) => void;
  onTemplateRename?: (templateId: string, newName: string) => void;
  onTemplateStar?: (templateId: string, isFavorite: boolean) => void;
  onTemplateDisplayOrder?: (templateId: string, displayOrder: number) => void;
  onTemplateIconChange?: (templateId: string, icon: string) => void;
  onReorderTemplates?: (reorderedTemplates: UserTemplate[]) => void;
  onOpenWidgetPanel?: () => void;
  onNewTab?: () => void;
  onSave?: () => void;
  onOpenWatchlist?: () => void;
  onOpenAlerts?: () => void;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  onSymbolSelect?: (symbol: string) => Promise<void>;
  onRefreshTemplates?: (templateIdToSelect?: string) => Promise<void>;
  theme?: "dark" | "light";
  onThemeChange?: (theme: "dark" | "light") => void;
  isCurrentTabSaved?: boolean;
}

export function TopNav({ 
  selectedTemplate: externalSelectedTemplate, 
  templates: externalTemplates = [],
  onTemplateSelect, 
  onTemplateDelete,
  onTemplateRename,
  onTemplateStar,
  onTemplateDisplayOrder,
  onTemplateIconChange,
  onReorderTemplates,
  onOpenWidgetPanel, 
  onNewTab, 
  onOpenWatchlist, 
  onOpenAlerts, 
  onOpenNotifications, 
  onOpenProfile,
  onSymbolSelect,
  theme = "dark",
  
}: TopNavProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { preferences } = usePreferences(user?.id);
  const isNotificationsLoud = preferences.notificationsOn;
  
  // State declarations - must be before useEffect hooks
  const [internalSelectedTemplate, setInternalSelectedTemplate] = useState(t('TopNav.DefaultLayout'));
  const selectedTemplate = externalSelectedTemplate ?? internalSelectedTemplate;
  const [isAllTemplatesOpen, setIsAllTemplatesOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [symbols, setSymbols] = useState<Symbol[]>([]);
  const [symbolsLoading, setSymbolsLoading] = useState(true);
  const [symbolSelectionLoading, setSymbolSelectionLoading] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [bellAnimationBoost, setBellAnimationBoost] = useState(false);
  const [showBreakingNewsBanner, setShowBreakingNewsBanner] = useState(false);
  const [showNotificationAlert, setShowNotificationAlert] = useState(false);
  const [notificationAlertMessage, setNotificationAlertMessage] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);
  
  //console.log('🎯 TopNav component rendered/mounted');
  
  // Fetch symbols from API on mount
  useEffect(() => {
    console.log('🚀 useEffect for fetchSymbols is RUNNING');
    const fetchSymbols = async () => {
      console.log('🔄 Starting fetchSymbols function');
      setSymbolsLoading(true);
      try {
        const modules = ['Forex', 'Indices', 'Commodities', 'US Stocks'];
        const allSymbols: Symbol[] = [];
        
        for (const moduleName of modules) {
          console.log(`🔍 Fetching symbols for module: ${moduleName}`);
          const response = await fetch('/api/pmt/get-symbols', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Module: moduleName }),
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log(`📦 Response for ${moduleName}:`, {
              status: result.status,
              dataLength: result.data?.length,
              sampleSymbols: result.data?.slice(0, 3)
            });
            // Original upstream format: { status: "success", data: [{ SymbolID, Symbol, NameToDisplay, Module }] }
            if (result.status === 'success' && Array.isArray(result.data)) {
              allSymbols.push(...result.data);
            }
          } else {
            console.error(`❌ Failed to fetch ${moduleName} symbols:`, response.status, response.statusText);
          }
        }
        
        setSymbols(allSymbols);
        // console.log('✅ Total symbols loaded:', allSymbols.length);
        // console.log('📊 Symbols by module:', {
        //   Forex: allSymbols.filter(s => s.Module === 'Forex').length,
        //   Indices: allSymbols.filter(s => s.Module === 'Indices').length,
        //   Commodities: allSymbols.filter(s => s.Module === 'Commodities').length,
        //   'US Stocks': allSymbols.filter(s => s.Module === 'US Stocks').length,
        // });
        //console.log('🔍 Sample stock symbols:', allSymbols.filter(s => s.Module === 'US Stocks').slice(0, 5));
      } catch (error) {
        console.error('Failed to fetch symbols:', error);
      } finally {
        setSymbolsLoading(false);
      }
    };
    
    fetchSymbols();
  }, []);

  // Listen for breaking news events from news widgets
  useEffect(() => {
    const handleBreakingNews = (event: Event) => {
      const customEvent = event as CustomEvent<{
        show: boolean;
        count?: number;
        timestamp: number;
      }>;
      
      console.log('📢 [TopNav] Breaking news event received:', customEvent.detail);
      
      // Only show search bar animation in loud mode
      // In silent mode, trigger bell animation instead
      if (customEvent.detail.show) {
        if (preferences.notificationsOn) {
          // Loud mode: Show search bar animation
          setShowBreakingNewsBanner(true);
        } else {
          // Silent mode: Trigger bell animation instead
          setBellAnimationBoost(true);
          setTimeout(() => {
            setBellAnimationBoost(false);
          }, 2000);
        }
      } else {
        // Hide banner
        setShowBreakingNewsBanner(false);
      }
    };

    window.addEventListener('pmt-breaking-news', handleBreakingNews);
    
    return () => {
      window.removeEventListener('pmt-breaking-news', handleBreakingNews);
    };
  }, [preferences.notificationsOn]);

  // Listen for notification alerts
  useEffect(() => {
    const handleNotificationAlert = (event: Event) => {
      const customEvent = event as CustomEvent<{
        show: boolean;
        message: string;
        timestamp: number;
      }>;
      
      console.log('📢 [TopNav] Notification alert event received:', customEvent.detail);
      
      // Only show search bar animation in loud mode
      // In silent mode, trigger bell animation instead
      if (customEvent.detail.show) {
        if (preferences.notificationsOn) {
          // Loud mode: Show search bar animation
          setShowNotificationAlert(true);
        setNotificationAlertMessage(customEvent.detail.message);
        } else {
          // Silent mode: Trigger bell animation instead
          setBellAnimationBoost(true);
          setTimeout(() => {
            setBellAnimationBoost(false);
          }, 2000);
        }
      } else {
        // Hide alert
        setShowNotificationAlert(false);
      }
    };

    window.addEventListener('pmt-notification-alert', handleNotificationAlert);
    
    return () => {
      window.removeEventListener('pmt-notification-alert', handleNotificationAlert);
    };
  }, [preferences.notificationsOn]);

  // Listen for bell animation trigger (when in silent mode and WebSocket updates arrive)
  useEffect(() => {
    const handleBellAnimationTrigger = (event: Event) => {
      const customEvent = event as CustomEvent<{ timestamp: number }>;
      console.log('🔔 [TopNav] Bell animation trigger received:', customEvent.detail);
      
      // Trigger a temporary animation boost
      setBellAnimationBoost(true);
      setTimeout(() => {
        setBellAnimationBoost(false);
      }, 2000); // Boost animation for 2 seconds
    };

    window.addEventListener('pmt-bell-animation-trigger', handleBellAnimationTrigger);
    
    return () => {
      window.removeEventListener('pmt-bell-animation-trigger', handleBellAnimationTrigger);
    };
  }, []);

  // Listen for other panels opening to close chat
  useEffect(() => {
    const handleOtherPanelOpen = (event: Event) => {
      const customEvent = event as CustomEvent<{ panel: string }>;
      if (customEvent.detail.panel !== 'chat' && isChatOpen) {
        setIsChatOpen(false);
      }
    };

    window.addEventListener('panel-opening', handleOtherPanelOpen);
    
    return () => {
      window.removeEventListener('panel-opening', handleOtherPanelOpen);
    };
  }, [isChatOpen]);

  // Handle symbol selection - creates a details template for the symbol
  const handleSymbolClick = async (symbol: string) => {
    if (!onSymbolSelect) return;
    
    setSymbolSelectionLoading(symbol);
    try {
      await onSymbolSelect(symbol);
      setIsSearchOpen(false);
      setSearchQuery("");
    } catch (error) {
      console.error('Failed to create details template:', error);
    } finally {
      setSymbolSelectionLoading(null);
    }
  };

  // Use external templates instead of hardcoded ones
  const templates = externalTemplates.map(userTemplate => ({
    id: userTemplate.id,
    name: userTemplate.name,
    icon: userTemplate.icon || "Star", // Provide default icon if undefined
    isFavorite: userTemplate.isFavorite || false, // Convert UserTemplate to Template format
    displayOrder: userTemplate.displayOrder, // Include displayOrder for template visibility state
    widgets: userTemplate.widgets?.map(widget => ({
      id: widget.id,
      type: widget.name,
      position: widget.position,
      settings: {}
    })) || []
  }));
  
  // console.log('TopNav templates:', templates.map(t => ({ id: t.id, name: t.name, isFavorite: t.isFavorite })));
  
  // Get favorite and recent templates
  const favoriteTemplates = templates.filter((t) => t.isFavorite);
  
  const handleSelectTemplate = (templateId: string) => {
    console.log('🎯 TopNav - Template Selected:', {
      templateId: templateId,
      'data-templateid': templateId,
      timestamp: new Date().toISOString()
    });
    if (onTemplateSelect) {
      onTemplateSelect(templateId);
    } else {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setInternalSelectedTemplate(template.name);
      }
    }
  };
  
  // Map of all available Lucide icons
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Star, TrendingUp, BarChart3, Layers, Grid3x3, LineChart, PieChart, Activity,
    CandlestickChart, Target, Zap, Flame, Award, Crown, Diamond, Heart, Rocket,
    Sparkles, Globe, Settings, Home, Bookmark, Clock, Calendar, Map, Compass,
    Shield, Lock, Unlock, Eye, EyeOff, Bell, BellOff, Search, Filter, Download,
    Upload, Mail, MessageCircle, Phone, Video, Camera, Image, File, Folder,
    Archive, Trash, Edit, Copy, Check, X, Plus, Minus, ArrowUp, ArrowDown,
    ArrowLeft, ArrowRight, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  };

  // Helper to check if a string is an emoji
  const isEmoji = (str: string | undefined): boolean => {
    if (!str) return false;
    const emojiRegex = /^(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F|[\u{1F1E0}-\u{1F1FF}]{2})$/u;
    return emojiRegex.test(str) || (str.length <= 4 && !iconMap[str]);
  };

  // Render template icon (Lucide icon or emoji/flag or custom image)
  const renderTemplateIcon = (iconName: string | undefined, className: string = "w-4 h-4", templateName?: string) => {
    // If template name is provided, try to load custom image
    if (templateName) {
      const imagePaths = getAllTemplateImagePaths(templateName);
      if (imagePaths.length > 0) {
        // Use a wrapper component to handle image loading with fallback
        return <TemplateIconImage templateName={templateName} iconName={iconName} className={className} />;
      }
    }
    
    if (!iconName) {
      return <Star className={className} />;
    }
    
    if (isEmoji(iconName)) {
      return <span className="text-base leading-none">{iconName}</span>;
    }
    
    const IconComponent = iconMap[iconName] || Star;
    return <IconComponent className={className} />;
  };

  // Search data - removed hardcoded demo data

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log('🔍 Search input changed:', value);
    setSearchQuery(value);
    setIsSearchOpen(true);
    console.log('🔍 isSearchOpen set to true');
  };

  const filteredSecurities = symbols.filter(
    (sec) =>
      sec.Symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sec.NameToDisplay.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 10); // Limit to 10 results
  
  // console.log('🔍 Search state:', { 
  //   searchQuery, 
  //   isSearchOpen, 
  //   symbolsCount: symbols.length,
  //   filteredCount: filteredSecurities.length,
  //   symbolsLoading 
  // });

  return (
    <div className="h-12 bg-widget-header flex items-center justify-between px-4 border-b border-border gap-4">
      {/* Left Section - Fixed width container */}
      <div className="flex items-center gap-2 min-w-fit">
        <PMTLogo theme={theme} />
        
        {/* Quick Access Favorite Templates - Boxed Style with fixed width to prevent shifting */}
        {/* Always render container to prevent layout shift, but only show border/background when there are favorites */}
        <div className={`flex items-center gap-0 px-1 py-0.5 rounded w-[272px] ${
          favoriteTemplates.length > 0 ? 'bg-black/30 border border-border/50' : ''
        }`}>
          {favoriteTemplates.slice(0, 8).map((template) => {
            return (
              <button
                key={template.id}
                className={`h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors ${
                  selectedTemplate === template.name ? 'text-primary' : ''
                }`}
                onClick={() => handleSelectTemplate(template.id)}
                title={template.name}
              >
                {renderTemplateIcon(template.icon, "w-4 h-4", template.name)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Center Section - Search - Absolute centering */}
      <div className="flex items-center gap-2 flex-1 justify-center max-w-2xl mx-auto">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-[rgb(133,133,133)] hover:!text-primary hover:!bg-primary/20 flex-shrink-0"
          title="Templates"
          onClick={() => {
            setIsAllTemplatesOpen(true);
            setIsChatOpen(false); // Close chat when templates opens
          }}
          data-tour="templates-button"
        >
          <LayoutTemplate className="w-4 h-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-muted-foreground hover:!text-primary hover:!bg-primary/20 flex-shrink-0"
          title={t('TopNav.AddWidget')}
          onClick={onOpenWidgetPanel}
          data-tour="widgets-button"
        >
          <Layers className="w-4 h-4" />
        </Button>
        <div className="relative w-full" ref={searchRef}>
          {!showBreakingNewsBanner && !showNotificationAlert && <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />}
          
          <Input
            placeholder={showBreakingNewsBanner || showNotificationAlert ? "" : t('TopNav.SearchPlaceholder')}
            className={`pl-10 bg-input border-border h-8 py-1 text-sm leading-none placeholder:text-sm placeholder:leading-none w-full ${
              showBreakingNewsBanner ? 'bg-gray-700 border-orange-500 animate-flash' : 
              showNotificationAlert ? 'bg-gray-700 border-orange-500 animate-flash' : 
              ''
            }`}
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => setIsSearchOpen(true)}
          />
          
          {/* Breaking News Banner - Covers entire search field */}
          {showBreakingNewsBanner && (
            <div className="absolute inset-0 flex items-center gap-1.5 z-10 bg-gray-700 border border-orange-500 rounded animate-flash">
              <div className="flex items-center gap-2 ml-10">
                <svg 
                  className="w-4 h-4 text-orange-500" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14,2 14,8 20,8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10,9 9,9 8,9"></polyline>
                </svg>
                <span className="text-sm font-normal text-white">Breaking News</span>
              </div>
            </div>
          )}

          {/* Notification Alert Banner - Covers entire search field */}
          {showNotificationAlert && (
            <div className="absolute inset-0 flex items-center justify-center gap-1.5 z-10 bg-gray-700 border border-orange-500 rounded animate-flash">
              <div className="flex items-center gap-2">
                <svg 
                  className="w-4 h-4 text-orange-500" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 6v6"></path>
                  <path d="M12 16h.01"></path>
                </svg>
                <span className="text-sm font-normal text-white">{notificationAlertMessage}</span>
              </div>
            </div>
          )}
          
          {/* Search Dropdown */}
          {isSearchOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded shadow-2xl z-[9999] overflow-hidden max-h-[70vh] overflow-y-auto">
              {searchQuery === "" && (
                <>
                  {/* Popular Securities */}
                  <div className="border-b border-border">
                    <div className="px-4 py-2 text-sm text-muted-foreground flex items-center gap-2">
                      <Hash className="w-3.5 h-3.5" />
                      {symbolsLoading ? 'Loading symbols...' : t('TopNav.Search')}
                    </div>
                    {!symbolsLoading && symbols.slice(0, 10).map((security) => (
                      <button
                        key={security.SymbolID}
                        className={`w-full px-4 py-2.5 text-left hover:!bg-primary/20 transition-colors group ${
                          symbolSelectionLoading === security.Symbol ? 'opacity-50 cursor-wait' : ''
                        }`}
                        onClick={() => handleSymbolClick(security.Symbol)}
                        disabled={symbolSelectionLoading !== null}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-foreground font-medium">{security.Symbol}</span>
                              {/* Module badge removed - not showing asset class (Forex/Indices/Commodities) */}
                              {symbolSelectionLoading === security.Symbol && (
                                <span className="text-xs text-muted-foreground animate-pulse">Creating template...</span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">{security.NameToDisplay}</div>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Search Results */}
              {searchQuery !== "" && (
                <>
                  {filteredSecurities.length > 0 && (
                    <div className="border-b border-border">
                      <div className="px-4 py-2 text-sm text-muted-foreground flex items-center gap-2">
                        <Hash className="w-3.5 h-3.5" />
                        SECURITIES ({filteredSecurities.length})
                      </div>
                      {filteredSecurities.map((security) => (
                        <button
                          key={security.SymbolID}
                          className={`w-full px-4 py-2.5 text-left hover:!bg-primary/20 transition-colors group ${
                            symbolSelectionLoading === security.Symbol ? 'opacity-50 cursor-wait' : ''
                          }`}
                          onClick={() => handleSymbolClick(security.Symbol)}
                          disabled={symbolSelectionLoading !== null}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-foreground font-medium">{security.Symbol}</span>
                                {/* Module badge removed - not showing asset class (Forex/Indices/Commodities) */}
                                {symbolSelectionLoading === security.Symbol && (
                                  <span className="text-xs text-muted-foreground animate-pulse">Creating template...</span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">{security.NameToDisplay}</div>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {filteredSecurities.length === 0 && (
                    <div className="px-4 py-8 text-center">
                      <div className="text-sm text-muted-foreground">No results found for &quot;{searchQuery}&quot;</div>
                      <div className="text-sm text-muted-foreground mt-1">Try a different search term</div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        
        {/* Market Sentiment Indicator */}
        <MarketSentimentIndicator />
      </div>

      {/* Right Section - Fixed width container */}
      <div className="flex items-center gap-2 min-w-fit">
        {/* Macro AI Chat */}
        <MacroAIChat />
        
        {/* Live Squawk */}
        <LiveSquawk />
        
        {/* Separator */}
        <div className="h-5 w-px bg-border mx-1"></div>
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-muted-foreground hover:!text-primary hover:!bg-primary/20 relative"
          onClick={() => {
            setIsChatOpen(false);
            onOpenAlerts?.();
          }}
          title={t('TopNav.Alerts')}
        >
          <AlertCircle className="w-4 h-4" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-destructive rounded-full"></span>
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-muted-foreground hover:!text-primary hover:!bg-primary/20"
          onClick={() => {
            setIsChatOpen(false);
            onOpenWatchlist?.();
          }}
          title={t('TopNav.Watchlist')}
        >
          <ListChecks className="w-4 h-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className={`h-8 w-8 hover:!text-primary hover:!bg-primary/20 relative ${
            isNotificationsLoud ? "text-muted-foreground" : "text-muted-foreground/60"
          }`}
          onClick={() => {
            setIsChatOpen(false);
            onOpenNotifications?.();
          }}
          title={
            isNotificationsLoud
              ? t('TopNav.Notifications')
              : t('TopNav.Notifications') + ' (Silenced)'
          }
          data-tour="notifications-button"
        >
          {isNotificationsLoud ? (
          <Bell className="w-4 h-4" />
          ) : (
            <BellOff className={`w-4 h-4 ${bellAnimationBoost ? 'bell-wiggle bell-pulse text-primary' : ''}`} />
          )}
          <Badge 
            variant="destructive" 
            className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 rounded-full flex items-center justify-center"
          >
            3
          </Badge>
        </Button>
        
        {/* Chat Button */}
        <Button 
          variant="ghost" 
          size="icon" 
          className={`h-8 w-8 hover:!text-primary hover:!bg-primary/20 relative ${
            isChatOpen ? 'text-primary bg-primary/20' : 'text-muted-foreground'
          }`}
          onClick={() => {
            const newState = !isChatOpen;
            setIsChatOpen(newState);
            if (newState) {
              setIsAllTemplatesOpen(false); // Close templates when chat opens
              // Dispatch event to close other panels
              window.dispatchEvent(new CustomEvent('panel-opening', { 
                detail: { panel: 'chat' } 
              }));
            }
          }}
          title="Support Chat"
        >
          <MessageCircle className="w-4 h-4" />
        </Button>
        
        {/* Separator */}
        <div className="h-5 w-px bg-border mx-1"></div>
        
        {/* Profile Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setIsChatOpen(false);
            onOpenProfile?.();
          }}
          className="relative w-8 h-8 rounded-full focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-[#0c0c0c] bg-muted"
          title="Profile"
          data-tour="profile-button"
        >
          <User className="w-4 h-4 text-muted-foreground" />
          {/* Green connection indicator */}
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success rounded-full border-2 border-[#0c0c0c]"></span>
        </Button>
      </div>

      {/* Template Panel */}
      <TemplatePanel
        isOpen={isAllTemplatesOpen}
        onClose={() => setIsAllTemplatesOpen(false)}
        templates={externalTemplates}
        selectedTemplate={selectedTemplate}
        onSelectTemplate={handleSelectTemplate}
        onCreateNewTemplate={() => {
          onNewTab?.();
        }}
        onTemplateDelete={onTemplateDelete}
        onTemplateRename={onTemplateRename}
        onTemplateStar={onTemplateStar}
        onTemplateDisplayOrder={onTemplateDisplayOrder}
        onTemplateIconChange={onTemplateIconChange}
        onReorderTemplates={onReorderTemplates}
      />
      
      {/* Support Chat */}
      <SupportChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
    </div>
  );}