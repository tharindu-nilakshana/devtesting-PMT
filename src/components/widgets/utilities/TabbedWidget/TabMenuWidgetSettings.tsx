import React, { useState, useRef, useCallback } from "react";
import { useDrag, useDrop } from "react-dnd";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { 
  X, 
  GripVertical, 
  Edit2, 
  Star, 
  Trash2, 
  Copy, 
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Activity,
  LineChart,
  CandlestickChart,
  PieChart,
  Target,
  Zap,
  Flame,
  Award,
  Crown,
  Diamond,
  Heart,
  Rocket,
  Sparkles,
  Layers,
  Grid3x3,
  Globe,
  Settings,
  Settings2,
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
  Edit,
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
  ChevronRight
} from "lucide-react";
import * as Icons from "lucide-react";
import { LayoutType } from '@/types';
import { updateTabOrder, copyDashboardTab, deleteTabWidget, updateTabFavourite, updateTabWidget } from '@/lib/tabWidgetApi';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface InternalTab {
  id: string;
  name: string;
  layout: LayoutType;
  widgets: Record<string, string>;
  icon?: string;
  color?: string;
  symbol?: string;
  isFavorite?: boolean;
  order?: number;
  isPredefined?: boolean; // true if tab is from a details template
}

interface TabMenuWidgetSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  tabs: InternalTab[];
  onUpdateTabs: (tabs: InternalTab[]) => void;
  activeTabId: string;
  onSetActiveTab: (tabId: string) => void;
  tabDataMap: Record<string, number>; // Map of tab.id to CustomDashboardTabID
  getTabWidgetID: () => number; // Function to get TabWidgetID
  getTabGridId: (layout: LayoutType) => number;
  // Additional widget settings
  tabBarPosition?: "top" | "bottom";
  onTabBarPositionChange?: (position: "top" | "bottom") => void;
  // Details template flag - when true, all tabs are locked (no delete, rename, reorder, copy)
  isDetailsTemplate?: boolean;
}

// Helper to check if a TabWidgetID is likely a generated timestamp ID
const isLikelyGeneratedTabWidgetId = (value: number | null): boolean => {
  if (value === null || Number.isNaN(value)) {
    return false;
  }
  // Generated IDs are timestamp-based (~1e12). Real IDs are expected to be much smaller.
  return value >= 1_000_000_000;
};

const ICON_OPTIONS = [
  { name: "Star", component: Star },
  { name: "TrendingUp", component: TrendingUp },
  { name: "BarChart3", component: BarChart3 },
  { name: "Layers", component: Layers },
  { name: "Grid3x3", component: Grid3x3 },
  { name: "LineChart", component: LineChart },
  { name: "PieChart", component: PieChart },
  { name: "Activity", component: Activity },
  { name: "CandlestickChart", component: CandlestickChart },
  { name: "Target", component: Target },
  { name: "Zap", component: Zap },
  { name: "Flame", component: Flame },
  { name: "Award", component: Award },
  { name: "Crown", component: Crown },
  { name: "Diamond", component: Diamond },
  { name: "Heart", component: Heart },
  { name: "Rocket", component: Rocket },
  { name: "Sparkles", component: Sparkles },
  { name: "Globe", component: Globe },
  { name: "Settings", component: Settings },
  { name: "Home", component: Home },
  { name: "Bookmark", component: Bookmark },
  { name: "Clock", component: Clock },
  { name: "Calendar", component: Calendar },
  { name: "Map", component: Map },
  { name: "Compass", component: Compass },
  { name: "Shield", component: Shield },
  { name: "Lock", component: Lock },
  { name: "Unlock", component: Unlock },
  { name: "Eye", component: Eye },
  { name: "EyeOff", component: EyeOff },
  { name: "Bell", component: Bell },
  { name: "BellOff", component: BellOff },
  { name: "Search", component: Search },
  { name: "Filter", component: Filter },
  { name: "Download", component: Download },
  { name: "Upload", component: Upload },
  { name: "Mail", component: Mail },
  { name: "MessageCircle", component: MessageCircle },
  { name: "Phone", component: Phone },
  { name: "Video", component: Video },
  { name: "Camera", component: Camera },
  { name: "Image", component: Image },
  { name: "File", component: File },
  { name: "Folder", component: Folder },
  { name: "Archive", component: Archive },
  { name: "Trash2", component: Trash2 },
  { name: "Edit", component: Edit },
  { name: "Copy", component: Copy },
  { name: "Check", component: Check },
  { name: "X", component: X },
  { name: "Plus", component: Plus },
  { name: "Minus", component: Minus },
  { name: "ArrowUp", component: ArrowUp },
  { name: "ArrowDown", component: ArrowDown },
  { name: "ArrowLeft", component: ArrowLeft },
  { name: "ArrowRight", component: ArrowRight },
  { name: "ChevronUp", component: ChevronUp },
  { name: "ChevronDown", component: ChevronDown },
  { name: "ChevronLeft", component: ChevronLeft },
  { name: "ChevronRight", component: ChevronRight },
];

const COLOR_OPTIONS = [
  { name: "Orange", value: "#ff8c00" },
  { name: "Red", value: "#ef4444" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#10b981" },
  { name: "Purple", value: "#a855f7" },
  { name: "Pink", value: "#ec4899" },
  { name: "Yellow", value: "#eab308" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Emerald", value: "#059669" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Lime", value: "#84cc16" },
  { name: "Amber", value: "#f59e0b" },
];

const EMOJI_OPTIONS = [
  "📊", "📈", "📉", "💹", "💰", "💵", "💴", "💶", "💷", "💳",
  "🏦", "🏧", "💱", "💲", "🔥", "⚡", "✨", "💎", "🎯", "🚀",
  "⭐", "🌟", "💫", "🔔", "📢", "📣", "📱", "💻", "🖥️", "⌚",
  "📞", "📧", "📬", "📭", "🔒", "🔓", "🔑", "🎨", "🎭", "🎪",
  "🎯", "🎲", "🎰", "🏆", "🥇", "🥈", "🥉", "👑", "💍", "🌈",
  "☀️", "🌙", "⭐", "🌠", "☁️", "⛅", "⛈️", "🌩️", "🌧️", "⚡",
  "❄️", "🔥", "💧", "🌊", "🌍", "🌎", "🌏", "🗺️", "🧭", "🏔️",
  "⛰️", "🌋", "🏕️", "🏖️", "🏝️", "🏜️", "🏞️", "🏟️", "🏛️", "🏗️",
  "🏘️", "🏚️", "🏠", "🏡", "🏢", "🏣", "🏤", "🏥", "🏦", "🏨",
  "🏩", "🏪", "🏫", "🏬", "🏭", "🏯", "🏰", "💒", "🗼", "🗽",
];

const FLAG_OPTIONS = [
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

// Extracted TabRow component to properly use hooks at the top level
interface TabRowProps {
  tab: InternalTab;
  index: number;
  isEditing: boolean;
  isDeleting: boolean;
  editingName: string;
  colorPickerTabId: string | null;
  iconPickerTabId: string | null;
  iconPickerActiveTab: 'icons' | 'emojis' | 'flags';
  isCopyingTab: boolean;
  isDetailsTemplate: boolean;
  isDragging?: boolean;
  onStartEdit: (tabId: string, currentName: string) => void;
  onSaveEdit: () => void;
  onEditingNameChange: (name: string) => void;
  onCancelEdit: () => void;
  onDelete: (tabId: string) => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onCopy: (tabId: string) => void;
  onColorPickerToggle: (tabId: string | null) => void;
  onIconPickerToggle: (tabId: string | null) => void;
  onIconPickerActiveTabChange: (tab: 'icons' | 'emojis' | 'flags') => void;
  onColorChange: (tabId: string, color: string) => void;
  onIconChange: (tabId: string, iconName: string) => void;
  moveTab: (dragIndex: number, hoverIndex: number) => void;
  onDragEnd: () => void;
}

function TabRow({
  tab,
  index,
  isEditing,
  isDeleting,
  editingName,
  colorPickerTabId,
  iconPickerTabId,
  iconPickerActiveTab,
  isCopyingTab,
  isDetailsTemplate,
  onStartEdit,
  onSaveEdit,
  onEditingNameChange,
  onCancelEdit,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
  onCopy,
  onColorPickerToggle,
  onIconPickerToggle,
  onIconPickerActiveTabChange,
  onColorChange,
  onIconChange,
  moveTab,
  onDragEnd,
}: TabRowProps) {
  const [{ isDragging }, drag, dragPreview] = useDrag({
    type: "tab",
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: !isDetailsTemplate,
    end: () => {
      onDragEnd();
    },
  });

  const [, drop] = useDrop({
    accept: "tab",
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        moveTab(item.index, index);
        item.index = index;
      }
    },
    canDrop: () => !isDetailsTemplate,
  });

  return (
    <div key={tab.id} className="border-b border-border relative overflow-visible">
      {/* Delete Confirmation - absolute overlay - hidden for details templates */}
      {isDeleting && !isDetailsTemplate && (
        <div className="absolute inset-0 bg-destructive/90 px-3 flex items-center justify-between animate-slide-in-left z-10">
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-white" />
            <span className="text-sm text-white">Really want to delete?</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onConfirmDelete();
              }}
              className="px-3 py-1 bg-white text-destructive text-xs rounded hover:bg-white/90 transition-colors"
            >
              Yes
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCancelDelete();
              }}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* Normal Tab View - always rendered, invisible when deleting */}
      {/* Main Row */}
      <div className={`flex items-center ${isDeleting ? 'invisible' : ''}`}>
        <div
          ref={(node) => {
            dragPreview(drop(node));
          }}
          className={`flex items-center gap-2.5 px-3 py-2.5 hover:bg-[#1a1a1a] transition-colors flex-1 ${
            isDragging ? "opacity-50" : ""
          }`}
        >
          {/* Drag Handle - hidden for details templates */}
          {!isDetailsTemplate ? (
            <div
              ref={(node) => {
                drag(node);
              }}
              className="cursor-move text-muted-foreground hover:text-foreground"
            >
              <GripVertical className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-4" /> /* Spacer for alignment */
          )}

          {/* Color Box - Clickable */}
          <button
            onClick={() => {
              onColorPickerToggle(colorPickerTabId === tab.id ? null : tab.id);
              onIconPickerToggle(null);
            }}
            className="w-5 h-5 rounded border-2 border-[#2a2a2a] hover:border-white/50 transition-colors"
            style={{ backgroundColor: tab.color || '#ff8c00' }}
          />

          {/* Name */}
          {isEditing ? (
            <input
              type="text"
              draggable={false}
              value={editingName}
              onChange={(e) => onEditingNameChange(e.target.value)}
              onBlur={onSaveEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSaveEdit();
                if (e.key === "Escape") {
                  onCancelEdit();
                }
              }}
              autoFocus
              className="flex-1 bg-[#1a1a1a] border border-primary rounded px-2 py-1 text-sm text-foreground outline-none"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="flex-1 flex items-center gap-1.5">
              <span className="text-sm text-foreground">{tab.name}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-0.5">
            {/* Edit - hidden for details templates */}
            {!isDetailsTemplate && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartEdit(tab.id, tab.name);
                }}
                className="w-7 h-7 flex items-center justify-center hover:bg-[#2a2a2a] rounded transition-colors"
                title="Rename tab"
              >
                <Edit2 className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            )}

            {/* Copy - hidden for details templates */}
            {!isDetailsTemplate && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCopy(tab.id);
                }}
                disabled={isCopyingTab}
                className="w-7 h-7 flex items-center justify-center hover:bg-[#2a2a2a] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Copy tab"
              >
                <Copy className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            )}

            {/* Icon/Emoji/Flag selector */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onIconPickerToggle(iconPickerTabId === tab.id ? null : tab.id);
                onColorPickerToggle(null);
              }}
              className="w-7 h-7 flex items-center justify-center hover:bg-[#2a2a2a] rounded transition-colors"
              title="Choose icon"
            >
              {/* Show current icon/emoji/flag or default star */}
              {tab.icon ? (
                // Check if it's an emoji/flag (contains emoji characters)
                /[\u{1F000}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(tab.icon) ? (
                  <span className="text-base">{tab.icon}</span>
                ) : (
                  // It's a Lucide icon name
                  (() => {
                    const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[tab.icon];
                    return IconComponent ? <IconComponent className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" /> : <Star className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />;
                  })()
                )
              ) : (
                <Star className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
              )}
            </button>

            {/* Delete - hidden for details templates */}
            {!isDetailsTemplate && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(tab.id);
                }}
                className="w-7 h-7 flex items-center justify-center rounded transition-colors hover:bg-[#2a2a2a]"
                title="Delete tab"
              >
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Icon Picker Popup with tabs for Icons/Emojis/Flags */}
      {iconPickerTabId === tab.id && (
        <>
          <div
            className="fixed inset-0 z-[10000]"
            onClick={() => onIconPickerToggle(null)}
          />
          <div className="absolute left-12 top-2 z-[10001] bg-[#1a1a1a] border border-[#3a3a3a] rounded shadow-xl p-3 w-96">
            {/* Tab Headers */}
            <div className="flex gap-1 mb-3 p-1 bg-[#0a0a0a] rounded">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onIconPickerActiveTabChange('icons');
                }}
                className={`flex-1 px-3 py-1.5 text-xs rounded transition-all ${
                  iconPickerActiveTab === 'icons'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-[#1a1a1a]'
                }`}
              >
                Icons
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onIconPickerActiveTabChange('emojis');
                }}
                className={`flex-1 px-3 py-1.5 text-xs rounded transition-all ${
                  iconPickerActiveTab === 'emojis'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-[#1a1a1a]'
                }`}
              >
                Emojis
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onIconPickerActiveTabChange('flags');
                }}
                className={`flex-1 px-3 py-1.5 text-xs rounded transition-all ${
                  iconPickerActiveTab === 'flags'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-[#1a1a1a]'
                }`}
              >
                Flags
              </button>
            </div>

            {/* Icon Grid */}
            {iconPickerActiveTab === 'icons' && (
              <div className="grid grid-cols-8 gap-1.5 max-h-64 overflow-y-auto">
                {ICON_OPTIONS.map((icon) => {
                  const Icon = icon.component;
                  return (
                    <button
                      key={icon.name}
                      onClick={(e) => {
                        e.stopPropagation();
                        onIconChange(tab.id, icon.name);
                      }}
                      className={`w-8 h-8 rounded border flex items-center justify-center transition-all ${
                        tab.icon === icon.name
                          ? 'border-primary bg-primary/20 text-primary'
                          : 'border-[#2a2a2a] hover:border-[#3a3a3a] hover:bg-[#2a2a2a] text-muted-foreground'
                      }`}
                      title={icon.name}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Emoji Grid */}
            {iconPickerActiveTab === 'emojis' && (
              <div className="grid grid-cols-10 gap-1.5 max-h-64 overflow-y-auto">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={(e) => {
                      e.stopPropagation();
                      onIconChange(tab.id, emoji);
                    }}
                    className={`w-7 h-7 rounded border transition-all text-base flex items-center justify-center ${
                      tab.icon === emoji
                        ? 'border-primary bg-primary/20'
                        : 'border-[#2a2a2a] hover:border-[#3a3a3a] hover:bg-[#2a2a2a]'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Flag Grid */}
            {iconPickerActiveTab === 'flags' && (
              <div className="grid grid-cols-10 gap-1.5 max-h-64 overflow-y-auto">
                {FLAG_OPTIONS.map((flag) => (
                  <button
                    key={flag}
                    onClick={(e) => {
                      e.stopPropagation();
                      onIconChange(tab.id, flag);
                    }}
                    className={`w-7 h-7 rounded border transition-all text-base flex items-center justify-center ${
                      tab.icon === flag
                        ? 'border-primary bg-primary/20'
                        : 'border-[#2a2a2a] hover:border-[#3a3a3a] hover:bg-[#2a2a2a]'
                    }`}
                  >
                    {flag}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Color Picker Popup */}
      {colorPickerTabId === tab.id && (
        <>
          <div
            className="fixed inset-0 z-[10000]"
            onClick={() => onColorPickerToggle(null)}
          />
          <div className="absolute left-12 top-2 z-[10001] bg-[#1a1a1a] border border-[#3a3a3a] rounded shadow-xl p-3">
            <div className="text-xs text-muted-foreground mb-2">Select Color</div>
            <div className="grid grid-cols-6 gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    onColorChange(tab.id, color.value);
                  }}
                  className={`w-7 h-7 rounded border-2 transition-all ${
                    tab.color === color.value
                      ? 'border-white scale-110'
                      : 'border-[#2a2a2a] hover:border-[#3a3a3a]'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function TabMenuWidgetSettings({
  isOpen,
  onClose,
  tabs,
  onUpdateTabs,
  activeTabId,
  onSetActiveTab,
  tabDataMap,
  getTabWidgetID,
  getTabGridId,
  tabBarPosition = "bottom",
  onTabBarPositionChange,
  isDetailsTemplate = false,
}: TabMenuWidgetSettingsProps) {
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [colorPickerTabId, setColorPickerTabId] = useState<string | null>(null);
  const [iconPickerTabId, setIconPickerTabId] = useState<string | null>(null);
  const [iconPickerActiveTab, setIconPickerActiveTab] = useState<'icons' | 'emojis' | 'flags'>('icons');
  const [isCopyingTab, setIsCopyingTab] = useState(false);
  const [deletingTabId, setDeletingTabId] = useState<string | null>(null);

  const [localTabs, setLocalTabs] = useState<InternalTab[]>(tabs);
  
  // Track if we're currently dragging to prevent sync during drag
  const isDraggingRef = useRef(false);
  // Keep a ref to the latest localTabs for use in drag end callback
  const localTabsRef = useRef(localTabs);
  
  // Update the ref whenever localTabs changes
  React.useEffect(() => {
    localTabsRef.current = localTabs;
  }, [localTabs]);

  // Sync local tabs when props change, but not during drag
  React.useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalTabs(tabs);
    }
  }, [tabs, isDetailsTemplate, localTabs.length]);

  // Reset all picker states when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setIconPickerTabId(null);
      setColorPickerTabId(null);
      setEditingTabId(null);
      setEditingName("");
    }
  }, [isOpen]);

  // Handle tab reordering during drag - only updates local state
  const moveTab = useCallback((dragIndex: number, hoverIndex: number) => {
    isDraggingRef.current = true;
    setLocalTabs((prevTabs) => {
      const newTabs = [...prevTabs];
      const [draggedTab] = newTabs.splice(dragIndex, 1);
      newTabs.splice(hoverIndex, 0, draggedTab);
      return newTabs;
    });
  }, []);

  // Handle drag end - update parent state and call API
  const handleDragEnd = useCallback(async () => {
    isDraggingRef.current = false;
    
    // Get the current local tabs state from ref to ensure we have the latest value
    const currentTabs = localTabsRef.current;
    onUpdateTabs(currentTabs);
    
    // Call API to update tab order
    try {
      const updateOrderRequests = currentTabs.map((tab, index) => {
        const customDashboardTabID = tabDataMap[tab.id];
        if (!customDashboardTabID) {
          return null;
        }
        return {
          tabid: customDashboardTabID,
          order: index + 1
        };
      }).filter((item): item is { tabid: number; order: number } => item !== null);
      
      if (updateOrderRequests.length > 0) {
        await updateTabOrder({
          UpdateTabOrder: updateOrderRequests
        });
      }
    } catch (error) {
      console.error('Error updating tab order:', error);
    }
  }, [onUpdateTabs, tabDataMap]);

  const handleDelete = (tabId: string) => {
    setDeletingTabId(tabId);
  };

  const confirmDeleteTab = async () => {
    if (!deletingTabId) return;
    
    // Get CustomDashboardTabID from tabDataMap
    const customDashboardTabID = tabDataMap[deletingTabId];
    
    // Call API to delete the tab if CustomDashboardTabID exists
    if (customDashboardTabID) {
      try {
        const result = await deleteTabWidget({
          CustomDashboardTabID: customDashboardTabID
        });
      } catch (error) {
        // Continue with local deletion even if API call fails
      }
    }
    
    // Remove from local state
    const newTabs = tabs.filter(t => t.id !== deletingTabId);
    onUpdateTabs(newTabs);
    if (deletingTabId === activeTabId) {
      if (newTabs.length > 0) {
        onSetActiveTab(newTabs[0].id);
      } else {
        onSetActiveTab('');
      }
    }
    
    // Clear deleting state
    setDeletingTabId(null);
  };

  const handleCopy = async (tabId: string) => {
    // Prevent multiple simultaneous tab copy operations
    if (isCopyingTab) {
      return;
    }
    
    const tabToCopy = tabs.find(t => t.id === tabId);
    if (!tabToCopy) return;
    
    setIsCopyingTab(true);
    
    try {
      // Get CustomDashboardTabID for the tab to copy
      const customDashboardTabID = tabDataMap[tabId];
      if (!customDashboardTabID) {
        return;
      }
      
      // Get TabWidgetID
      const tabWidgetID = getTabWidgetID();
      if (!tabWidgetID || isLikelyGeneratedTabWidgetId(tabWidgetID)) {
        // TabWidgetID is not available yet or is a generated placeholder
        console.warn('[TabMenuWidgetSettings] Cannot copy tab - TabWidgetID not ready');
        return;
      }
      
      // Call API to copy the tab
      const response = await copyDashboardTab({
        TabID: customDashboardTabID,
        TabName: `${tabToCopy.name} (Copy)`,
        WgID: tabWidgetID
      });
      
      if (response.success !== false && response.Status !== 'Error' && response.CustomDashboardTabID) {
        // Create a new tab with the API response
        const newTab: InternalTab = {
          id: `tab-${response.CustomDashboardTabID}`,
          name: `${tabToCopy.name} (Copy)`,
          layout: tabToCopy.layout,
          widgets: { ...tabToCopy.widgets }, // Shallow copy of widgets
          icon: tabToCopy.icon,
          color: tabToCopy.color,
          symbol: tabToCopy.symbol,
          isFavorite: false, // Don't copy favorite status
        };
        
        // Find the index of the tab being copied and insert after it
        const tabIndex = tabs.findIndex(t => t.id === tabId);
        const newTabs = [...tabs];
        newTabs.splice(tabIndex + 1, 0, newTab);
        
        // Update tabs and notify parent to update tabDataMap
        onUpdateTabs(newTabs);
        onSetActiveTab(newTab.id);
      }
    } catch (error) {
      // Error copying tab via API
      console.error('Failed to copy tab:', error);
    } finally {
      setIsCopyingTab(false);
    }
  };

  const handleStartEdit = (tabId: string, currentName: string) => {
    setEditingTabId(tabId);
    setEditingName(currentName);
  };

  const handleSaveEdit = async () => {
    if (editingTabId && editingName.trim()) {
      const newName = editingName.trim();
      const currentTab = tabs.find(t => t.id === editingTabId);
      const oldName = currentTab?.name || newName;
      
      // Update local state first
      const newTabs = tabs.map(t =>
        t.id === editingTabId ? { ...t, name: newName } : t
      );
      
      // Update both localTabs and parent state immediately for instant UI feedback
      setLocalTabs(newTabs);
      onUpdateTabs(newTabs);
      
      // Call API to update the tab name using updateTabWidget
      const customDashboardTabID = tabDataMap[editingTabId];
      if (customDashboardTabID && currentTab) {
        const tabWidgetID = getTabWidgetID();
        if (!tabWidgetID || Number.isNaN(tabWidgetID) || isLikelyGeneratedTabWidgetId(tabWidgetID)) {
          // TabWidgetID is not available yet - skip API call but keep local change
          setEditingTabId(null);
          setEditingName("");
          return;
        }

        const tabOrder = tabs.findIndex(t => t.id === editingTabId) + 1;
        const tabGridId = getTabGridId(currentTab.layout);

        try {
          const response = await updateTabWidget({
            CustomDashboardTabID: customDashboardTabID,
            TabWidgetID: tabWidgetID,
            TabIcon: currentTab.icon || 'icon',
            TabName: newName,
            TabGrid: tabGridId.toString(),
            TabWidgetGap: '0',
            TabOrder: tabOrder > 0 ? tabOrder : 1,
            IsPredefined: 0,
            TabColor: currentTab.color || '#ff8c00',
            IsFavourite: currentTab.isFavorite ? 1 : 0
          });
          
          // Check for API error response
          if (response.success === false || response.Status === 'Error') {
            // Revert the name change on error
            const revertedTabs = tabs.map(t =>
              t.id === editingTabId ? { ...t, name: oldName } : t
            );
            setLocalTabs(revertedTabs);
            onUpdateTabs(revertedTabs);
            console.error('Failed to rename tab:', response.Message);
          }
        } catch (error) {
          // Revert the name change on error
          const revertedTabs = tabs.map(t =>
            t.id === editingTabId ? { ...t, name: oldName } : t
          );
          setLocalTabs(revertedTabs);
          onUpdateTabs(revertedTabs);
          console.error('Error renaming tab via API:', error);
        }
      }
    }
    setEditingTabId(null);
    setEditingName("");
  };

  const handleColorChange = async (tabId: string, color: string) => {
    const previousTabs = tabs.map(tab => ({ ...tab }));
    
    // Close color picker immediately for better UX
    setColorPickerTabId(null);

    const customDashboardTabID = tabDataMap[tabId];
    if (!customDashboardTabID) {
      return;
    }

    const tabWidgetID = getTabWidgetID();
    if (!tabWidgetID || Number.isNaN(tabWidgetID) || isLikelyGeneratedTabWidgetId(tabWidgetID)) {
      // TabWidgetID is not available yet or is a generated placeholder - skip API call
      return;
    }

    const updatedTab = tabs.find(t => t.id === tabId);
    if (!updatedTab) {
      return;
    }

    const tabOrder = tabs.findIndex(t => t.id === tabId) + 1;
    const tabGridId = getTabGridId(updatedTab.layout);

    try {
      // Update API first
      const response = await updateTabWidget({
        CustomDashboardTabID: customDashboardTabID,
        TabWidgetID: tabWidgetID,
        TabIcon: updatedTab.icon || 'icon',
        TabName: updatedTab.name,
        TabGrid: tabGridId.toString(),
        TabWidgetGap: '0',
        TabOrder: tabOrder > 0 ? tabOrder : 1,
        IsPredefined: 0,
        TabColor: color,
        IsFavourite: updatedTab.isFavorite ? 1 : 0
      });

      if (response.success === false || response.Status === 'Error') {
        // API call failed, don't update UI
        return;
      }

      // Only update UI after successful API call
      const newTabs = tabs.map(t =>
        t.id === tabId ? { ...t, color } : t
      );
      onUpdateTabs(newTabs);
    } catch (error) {
      // API call failed, don't update UI
    }
  };

  const handleIconChange = async (tabId: string, iconName: string) => {
    const previousTabs = tabs.map(tab => ({ ...tab }));
    const newTabs = tabs.map(t =>
      t.id === tabId ? { ...t, icon: iconName } : t
    );
    onUpdateTabs(newTabs);
    setIconPickerTabId(null);

    // Update icon in API
    const customDashboardTabID = tabDataMap[tabId];
    if (!customDashboardTabID) {
      return;
    }

    const tabWidgetID = getTabWidgetID();
    if (!tabWidgetID || isLikelyGeneratedTabWidgetId(tabWidgetID)) {
      return;
    }

    const updatedTab = newTabs.find(t => t.id === tabId);
    if (!updatedTab) {
      onUpdateTabs(previousTabs);
      return;
    }

    const tabOrder = newTabs.findIndex(t => t.id === tabId) + 1;
    const tabGridId = getTabGridId(updatedTab.layout);

    try {
      const response = await updateTabWidget({
        CustomDashboardTabID: customDashboardTabID,
        TabWidgetID: tabWidgetID,
        TabIcon: iconName,
        TabName: updatedTab.name,
        TabGrid: tabGridId.toString(),
        TabWidgetGap: '0',
        TabOrder: tabOrder > 0 ? tabOrder : 1,
        IsPredefined: 0,
        TabColor: updatedTab.color || '#ff8c00',
        IsFavourite: 0
      });

      if (response.success === false || response.Status === 'Error') {
        onUpdateTabs(previousTabs);
      }
    } catch (error) {
      onUpdateTabs(previousTabs);
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      {/* Backdrop - only within the widget */}
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-md z-[9998] transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Slide-in Panel - positioned within the widget */}
      <div className={`
        absolute top-0 right-0 h-full w-[380px] bg-[#0a0a0a] border-l border-[#2a2a2a] z-[9999] flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'}
      `}>
        {/* Header */}
        <div className="bg-[#1a1a1a] border-b border-[#2a2a2a] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-primary" />
            <h2 className="text-base text-foreground font-semibold">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center hover:bg-[#2a2a2a] rounded transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
          </button>
        </div>

        {/* Settings Content */}
        <div 
          className="flex-1 overflow-y-auto"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => e.preventDefault()}
        >
          {/* Tab Bar Position Setting */}
          {onTabBarPositionChange && (
            <div className="p-4 border-b border-[#2a2a2a]">
              <h3 className="text-foreground text-sm font-medium mb-3">Tab Bar Position</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onTabBarPositionChange('top')}
                  className={`flex items-center justify-between gap-2 border px-3 py-2.5 text-sm transition-colors rounded ${
                    tabBarPosition === 'top'
                      ? "border-primary bg-primary/10 text-foreground font-medium"
                      : "border-[#2a2a2a] bg-[#1a1a1a] text-muted-foreground hover:border-primary/50 hover:bg-[#1a1a1a]/50"
                  }`}
                >
                  <span>Top</span>
                  {tabBarPosition === 'top' && (
                    <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onTabBarPositionChange('bottom')}
                  className={`flex items-center justify-between gap-2 border px-3 py-2.5 text-sm transition-colors rounded ${
                    tabBarPosition === 'bottom'
                      ? "border-primary bg-primary/10 text-foreground font-medium"
                      : "border-[#2a2a2a] bg-[#1a1a1a] text-muted-foreground hover:border-primary/50 hover:bg-[#1a1a1a]/50"
                  }`}
                >
                  <span>Bottom</span>
                  {tabBarPosition === 'bottom' && (
                    <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Choose where the tab bar should be positioned.
              </p>
            </div>
          )}

          {/* Tab Manager Section */}
          <div className="p-4 border-b border-[#2a2a2a]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-foreground text-sm font-medium">Tab Manager</h3>
              <span className="text-xs text-muted-foreground">{tabs.length} {tabs.length === 1 ? 'tab' : 'tabs'}</span>
            </div>
          </div>

          {/* Tab List */}
          {localTabs.map((tab, index) => (
            <TabRow
              key={tab.id}
              tab={tab}
              index={index}
              isEditing={editingTabId === tab.id}
              isDeleting={deletingTabId === tab.id}
              editingName={editingName}
              colorPickerTabId={colorPickerTabId}
              iconPickerTabId={iconPickerTabId}
              iconPickerActiveTab={iconPickerActiveTab}
              isCopyingTab={isCopyingTab}
              isDetailsTemplate={isDetailsTemplate}
              onStartEdit={handleStartEdit}
              onSaveEdit={handleSaveEdit}
              onEditingNameChange={setEditingName}
              onCancelEdit={() => {
                setEditingTabId(null);
                setEditingName("");
              }}
              onDelete={handleDelete}
              onConfirmDelete={confirmDeleteTab}
              onCancelDelete={() => setDeletingTabId(null)}
              onCopy={handleCopy}
              onColorPickerToggle={setColorPickerTabId}
              onIconPickerToggle={setIconPickerTabId}
              onIconPickerActiveTabChange={setIconPickerActiveTab}
              onColorChange={handleColorChange}
              onIconChange={handleIconChange}
              moveTab={moveTab}
              onDragEnd={handleDragEnd}
            />
          ))}
        </div>
      </div>
    </DndProvider>
  );
}