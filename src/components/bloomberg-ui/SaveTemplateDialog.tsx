"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Save, 
  AlertCircle, 
  Star,
  TrendingUp,
  BarChart3,
  Layers,
  Grid3x3,
  LineChart,
  PieChart,
  Activity,
  CandlestickChart,
  Target,
  Zap,
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
  Clock,
  Calendar,
  Map,
  Compass,
  Shield,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Bell,
  BellOff,
  Search,
  Filter,
  Download,
  Upload,
  Mail,
  MessageCircle,
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
  Plus,
  Minus,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface SaveTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (templateName: string, icon: string) => Promise<{ success: boolean; message: string }>;
  onReplace?: (templateName: string, icon: string) => Promise<void>;
  currentTemplateName?: string;
  currentIcon?: string;
  widgetCount: number;
  isLoading?: boolean;
  isRenaming?: boolean;
}

export function SaveTemplateDialog({
  isOpen,
  onClose,
  onSave,
  onReplace,
  currentTemplateName,
  currentIcon = "Star",
  widgetCount,
  isLoading = false,
  isRenaming = false
}: SaveTemplateDialogProps) {
  const [templateName, setTemplateName] = useState(currentTemplateName || '');
  const [selectedIcon, setSelectedIcon] = useState(currentIcon);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'icons' | 'emojis' | 'flags'>('icons');
  const hasInitialized = useRef(false);

  // Update template name and icon when dialog opens (only on initial open)
  useEffect(() => {
    if (isOpen && !hasInitialized.current) {
      setTemplateName(currentTemplateName || '');
      setSelectedIcon(currentIcon);
      setError(null);
      setShowReplaceConfirm(false);
      hasInitialized.current = true;
    } else if (!isOpen) {
      hasInitialized.current = false;
    }
  }, [isOpen, currentTemplateName, currentIcon]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!templateName.trim()) {
      setError('Template name is required');
      return;
    }

    if (templateName.trim().length < 3) {
      setError('Template name must be at least 3 characters');
      return;
    }

    if (templateName.trim().length > 100) {
      setError('Template name must be less than 100 characters');
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const result = await onSave(templateName.trim(), selectedIcon);
      
      if (result.success) {
        // Close dialog on success
        onClose();
      } else {
        // Handle error result
        const errorMessage = result.message || 'Failed to save template';
        
        // Check if it's a duplicate name error
        if (errorMessage.includes('already have a template named') || errorMessage.includes('already exists')) {
          setError(`A template with the name "${templateName.trim()}" already exists. Please choose a different name or add a number (e.g., "${templateName.trim()} 2").`);
        } else {
          setError(errorMessage);
        }
      }
    } catch (err) {
      // Fallback for any unexpected errors
      const errorMessage = err instanceof Error ? err.message : 'Failed to save template';
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReplace = async () => {
    if (!onReplace) return;
    
    setIsSaving(true);
    try {
      await onReplace(templateName.trim(), selectedIcon);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to replace template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      setTemplateName('');
      setSelectedIcon('Star');
      setError(null);
      setShowReplaceConfirm(false);
      onClose();
    }
  };

  // Available Lucide icons for template selection
  const lucideIcons = [
    { name: "Star", icon: Star },
    { name: "TrendingUp", icon: TrendingUp },
    { name: "BarChart3", icon: BarChart3 },
    { name: "Layers", icon: Layers },
    { name: "Grid3x3", icon: Grid3x3 },
    { name: "LineChart", icon: LineChart },
    { name: "PieChart", icon: PieChart },
    { name: "Activity", icon: Activity },
    { name: "CandlestickChart", icon: CandlestickChart },
    { name: "Target", icon: Target },
    { name: "Zap", icon: Zap },
    { name: "Flame", icon: Flame },
    { name: "Award", icon: Award },
    { name: "Crown", icon: Crown },
    { name: "Diamond", icon: Diamond },
    { name: "Heart", icon: Heart },
    { name: "Rocket", icon: Rocket },
    { name: "Sparkles", icon: Sparkles },
    { name: "Globe", icon: Globe },
    { name: "Settings", icon: Settings },
    { name: "Home", icon: Home },
    { name: "Bookmark", icon: Bookmark },
    { name: "Clock", icon: Clock },
    { name: "Calendar", icon: Calendar },
    { name: "Map", icon: Map },
    { name: "Compass", icon: Compass },
    { name: "Shield", icon: Shield },
    { name: "Lock", icon: Lock },
    { name: "Unlock", icon: Unlock },
    { name: "Eye", icon: Eye },
    { name: "EyeOff", icon: EyeOff },
    { name: "Bell", icon: Bell },
    { name: "BellOff", icon: BellOff },
    { name: "Search", icon: Search },
    { name: "Filter", icon: Filter },
    { name: "Download", icon: Download },
    { name: "Upload", icon: Upload },
    { name: "Mail", icon: Mail },
    { name: "MessageCircle", icon: MessageCircle },
    { name: "Phone", icon: Phone },
    { name: "Video", icon: Video },
    { name: "Camera", icon: Camera },
    { name: "Image", icon: Image },
    { name: "File", icon: File },
    { name: "Folder", icon: Folder },
    { name: "Archive", icon: Archive },
    { name: "Trash", icon: Trash },
    { name: "Edit", icon: Edit },
    { name: "Copy", icon: Copy },
    { name: "Check", icon: Check },
    { name: "X", icon: X },
    { name: "Plus", icon: Plus },
    { name: "Minus", icon: Minus },
    { name: "ArrowUp", icon: ArrowUp },
    { name: "ArrowDown", icon: ArrowDown },
    { name: "ArrowLeft", icon: ArrowLeft },
    { name: "ArrowRight", icon: ArrowRight },
    { name: "ChevronUp", icon: ChevronUp },
    { name: "ChevronDown", icon: ChevronDown },
    { name: "ChevronLeft", icon: ChevronLeft },
    { name: "ChevronRight", icon: ChevronRight },
  ];

  const emojis = [
    "📊", "📈", "📉", "💹", "💰", "💵", "💴", "💶", "💷", "💳",
    "🏦", "🏧", "💱", "💲", "🔥", "⚡", "✨", "💎", "🎯", "🚀",
    "⭐", "🌟", "💫", "🔔", "📢", "📣", "📱", "💻", "🖥️", "⌚",
    "📞", "📧", "📬", "📭", "🔒", "🔓", "🔑", "🎨", "🎭", "🎪",
    "�", "🎰", "🏆", "🥇", "🥈", "🥉", "👑", "💍", "🌈",
    "☀️", "🌙", "🌠", "☁️", "⛅", "⛈️", "🌩️", "🌧️",
    "❄️", "💧", "🌊", "🌍", "🌎", "🌏", "🗺️", "🧭", "🏔️",
    "⛰️", "🌋", "🏕️", "🏖️", "🏝️", "🏜️", "🏞️", "🏟️", "🏛️", "🏗️",
    "🏘️", "🏚️", "🏠", "🏡", "🏢", "🏣", "🏤", "🏥", "🏨",
    "🏩", "🏪", "🏫", "🏬", "🏭", "🏯", "🏰", "💒", "🗼", "🗽",
  ];

  const flags = [
    "🇺🇸", "🇬🇧", "🇪🇺", "🇨🇦", "🇦🇺", "🇯🇵", "🇨🇳", "🇰🇷", "🇮🇳", "🇧🇷",
    "🇲🇽", "🇷🇺", "🇿🇦", "🇸🇬", "🇭🇰", "🇨🇭", "🇳🇴", "🇸🇪", "🇩🇰", "🇫🇮",
    "🇩🇪", "🇫🇷", "🇮🇹", "🇪🇸", "🇵🇹", "🇳🇱", "🇧🇪", "🇦🇹", "🇬🇷", "🇵🇱",
    "🇮🇪", "🇨🇿", "🇭🇺", "🇷🇴", "🇧🇬", "🇭🇷", "🇸🇮", "🇸🇰", "🇱🇹", "🇱🇻",
    "🇪🇪", "🇮🇸", "🇱🇺", "🇲🇹", "🇨🇾", "🇹🇷", "🇸🇦", "🇦🇪", "🇮🇱", "🇪🇬",
    "🇳🇬", "🇰🇪", "🇬🇭", "🇲🇦", "🇹🇳", "🇦🇷", "🇨🇱", "🇨🇴", "🇵🇪", "🇻🇪",
    "🇺🇾", "🇵🇾", "🇧🇴", "🇪🇨", "🇨🇷", "🇵🇦", "🇬🇹", "🇨🇺", "🇩🇴", "🇯🇲",
    "🇹🇭", "🇻🇳", "🇵🇭", "🇮🇩", "🇲🇾", "🇵🇰", "🇧🇩", "🇱🇰", "🇲🇲", "🇰🇭",
    "🇳🇿", "🇫🇯", "🇵🇬", "🇳🇨", "🇵🇫", "🇼🇸", "🇹🇴", "🇻🇺", "🇸🇧", "🇰🇮",
    "🇶🇦", "🇰🇼", "🇧🇭", "🇴🇲", "🇯🇴", "🇱🇧", "🇮🇶", "🇮🇷", "🇦🇫", "🇵🇸",
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 transition-opacity duration-300"
        onClick={handleClose}
      />
      
      {/* Slider Panel */}
      <div className="fixed left-0 top-0 bottom-0 z-50 w-[400px] bg-[#0F0F0F] border-r border-border shadow-2xl transform transition-transform duration-300 ease-out flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <Save className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">{isRenaming ? 'Rename Template' : 'Create New Template'}</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 rounded-md hover:bg-muted p-1.5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-hidden px-6 py-5 flex flex-col">
          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
            <div className="space-y-4 flex-shrink-0">
              <div>
                <label htmlFor="templateName" className="text-xs text-muted-foreground mb-2 block">
                  Template Name
                </label>
              <input
                id="templateName"
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Enter template name..."
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground"
                disabled={isSaving}
                autoFocus
                maxLength={100}
              />
              {error && (
                <div className="flex items-center gap-2 mt-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">{error}</span>
                </div>
              )}
              
              {showReplaceConfirm && (
                <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-semibold text-orange-500">Template Already Exists</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    A template named "{templateName}" already exists. Do you want to replace it with your current template?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowReplaceConfirm(false)}
                      disabled={isSaving}
                      className="px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleReplace}
                      disabled={isSaving}
                      className="px-3 py-1 text-xs font-semibold bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      {isSaving ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Replacing...
                        </>
                      ) : (
                        'Replace Template'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
            </div>

            {/* Icon Selection with Tabs */}
            <div className="flex-1 flex flex-col min-h-0 mt-6">
              <label className="text-xs text-muted-foreground mb-2 block">
                Select Icon
              </label>
              
              {/* Tab Buttons */}
              <div className="flex gap-1 mb-3 bg-widget-header rounded p-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('icons')}
                  disabled={isSaving}
                  className={`flex-1 px-3 py-1.5 rounded text-xs transition-colors border ${
                    activeTab === 'icons'
                      ? 'bg-widget-body border-primary text-primary'
                      : 'text-muted-foreground hover:text-foreground border-transparent'
                  } disabled:opacity-50`}
                >
                  Icons
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('emojis')}
                  disabled={isSaving}
                  className={`flex-1 px-3 py-1.5 rounded text-xs transition-colors border ${
                    activeTab === 'emojis'
                      ? 'bg-widget-body border-primary text-primary'
                      : 'text-muted-foreground hover:text-foreground border-transparent'
                  } disabled:opacity-50`}
                >
                  Emojis
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('flags')}
                  disabled={isSaving}
                  className={`flex-1 px-3 py-1.5 rounded text-xs transition-colors border ${
                    activeTab === 'flags'
                      ? 'bg-widget-body border-primary text-primary'
                      : 'text-muted-foreground hover:text-foreground border-transparent'
                  } disabled:opacity-50`}
                >
                  Flags
                </button>
              </div>
              
              {/* Icons Grid */}
              {activeTab === 'icons' && (
                <div className="grid grid-cols-7 gap-1.5 overflow-y-auto flex-1 content-start">
                  {lucideIcons.map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => setSelectedIcon(item.name)}
                        disabled={isSaving}
                        className={`h-12 w-12 aspect-square flex items-center justify-center rounded border transition-colors ${
                          selectedIcon === item.name
                            ? 'bg-primary/20 border-primary'
                            : 'bg-widget-header border-border hover:border-primary/50'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        title={item.name}
                      >
                        <IconComponent className="w-5 h-5" />
                      </button>
                    );
                  })}
                </div>
              )}
              
              {/* Emojis Grid */}
              {activeTab === 'emojis' && (
                <div className="grid grid-cols-7 gap-1.5 overflow-y-auto flex-1 content-start">
                  {emojis.map((emoji, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedIcon(emoji)}
                      disabled={isSaving}
                      className={`h-12 w-12 aspect-square flex items-center justify-center rounded border transition-colors ${
                        selectedIcon === emoji
                          ? 'bg-primary/20 border-primary'
                          : 'bg-widget-header border-border hover:border-primary/50'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                      title={emoji}
                    >
                      <span className="text-xl">{emoji}</span>
                    </button>
                  ))}
                </div>
              )}
              
              {/* Flags Grid */}
              {activeTab === 'flags' && (
                <div className="grid grid-cols-7 gap-1.5 overflow-y-auto flex-1 content-start">
                  {flags.map((flag, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedIcon(flag)}
                      disabled={isSaving}
                      className={`h-12 w-12 aspect-square flex items-center justify-center rounded border transition-colors ${
                        selectedIcon === flag
                          ? 'bg-primary/20 border-primary'
                          : 'bg-widget-header border-border hover:border-primary/50'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                      title={flag}
                    >
                      <span className="text-xl">{flag}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Actions - Fixed at bottom */}
            <div className="flex gap-3 pt-6 border-t border-border mt-6 flex-shrink-0">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSaving}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || !templateName.trim()}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    {isRenaming ? 'Renaming...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {isRenaming ? 'Rename Template' : 'Save Template'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
