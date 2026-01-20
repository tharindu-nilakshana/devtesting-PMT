import React, { useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { 
  GripVertical, 
  Star, 
  Edit2, 
  Trash2, 
  ArrowLeftRight,
  Plus,
  TrendingUp,
  BarChart3,
  LineChart,
  Activity,
  CandlestickChart,
  Grid3x3,
  Layers,
  PieChart,
  Clock,
  Zap,
  Target,
  Shield,
  Heart,
  Globe,
  Settings,
  Home,
  Bookmark,
  Flame,
  Award,
  Crown,
  Diamond,
  Rocket,
  Sparkles,
  Calendar,
  Map,
  Compass,
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
  FolderOpen,
  Archive,
  Trash,
  Edit,
  Copy,
  Check,
  X,
  Minus,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Input } from "../ui/input";
import { getAllTemplateImagePaths } from "@/utils/templateImage";

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

interface TemplateManagerProps {
  templates: Template[];
  selectedTemplate: string; // Template name for display highlighting
  onSelectTemplate: (templateId: string) => void; // Called with template.id
  onSelectTemplateWithoutClosing?: (templateId: string) => void; // Called with template.id
  onUpdateTemplates: (templates: Template[]) => void;
  onShowLibrary: () => void;
  onCreateNewTemplate?: () => void;
  onReorderTemplates?: (reorderedTemplates: Template[]) => void;
}

interface DraggableTemplateProps {
  template: Template;
  index: number;
  moveTemplate: (dragIndex: number, hoverIndex: number) => void;
  onIconChange: (id: string, icon: string) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onSelect: (name: string) => void;
  onSelectWithoutClosing?: (name: string) => void;
  isSelected: boolean;
  templates: Template[];
  onUpdateTemplates: (templates: Template[]) => void;
  deletingTemplateId: string | null;
  setDeletingTemplateId: (id: string | null) => void;
}

const iconOptions = [
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
  { name: "Trash", component: Trash },
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

// Helper function to check if a string is an emoji (not a Lucide icon name)
const isEmoji = (str: string) => {
  // Emoji regex pattern - matches most common emojis including flags
  const emojiRegex = /^(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F|[\u{1F1E0}-\u{1F1FF}]{2})$/u;
  return emojiRegex.test(str) || str.length <= 4 && !iconOptions.find(opt => opt.name === str);
};

const emojis = [
  "📊", "📈", "📉", "💹", "💰", "💵", "💴", "💶", "💷", "💳",
  "🏦", "🏧", "💱", "💲", "🔥", "⚡", "✨", "💎", "🎯", "🚀",
  "⭐", "🌟", "💫", "🔔", "📢", "📣", "📱", "💻", "🖥️", "⌚",
  "📞", "📧", "📬", "📭", "🔒", "🔓", "🔑", "🎨", "🎭", "🎪",
  "🎯", "🎲", "🎰", "🏆", "🥇", "🥈", "🥉", "👑", "💍", "🌈",
];

const flags = [
  "🇺🇸", "🇬🇧", "🇪🇺", "🇨🇦", "🇦🇺", "🇯🇵", "🇨🇳", "🇰🇷", "🇮🇳", "🇧🇷",
  "🇲🇽", "🇷🇺", "🇿🇦", "🇸🇬", "🇭🇰", "🇨🇭", "🇳🇴", "🇸🇪", "🇩🇰", "🇫🇮",
  "🇩🇪", "🇫🇷", "🇮🇹", "🇪🇸", "🇵🇹", "🇳🇱", "🇧🇪", "🇦🇹", "🇬🇷", "🇵🇱",
  "🇮🇪", "🇨🇿", "🇭🇺", "🇷🇴", "🇧🇬", "🇭🇷", "🇸🇮", "🇸🇰", "🇱🇹", "🇱🇻",
  "🇪🇪", "🇮🇸", "🇱🇺", "🇲🇹", "🇨🇾", "🇹🇷", "🇸🇦", "🇦🇪", "🇮🇱", "🇪🇬",
];

/**
 * Component to display template icon or image with fallback logic
 * Tries to load a custom image first, falls back to icon/emoji if not found
 */
function TemplateIconOrImage({ 
  templateName, 
  icon, 
  className = "w-4 h-4" 
}: { 
  templateName: string; 
  icon: string; 
  className?: string;
}) {
  const [imageError, setImageError] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Get all possible image paths for this template
  const imagePaths = getAllTemplateImagePaths(templateName);
  
  // Check if icon is an emoji or Lucide icon
  const iconOption = iconOptions.find(opt => opt.name === icon);
  const IconComponent = iconOption?.component;
  const isEmojiIcon = !iconOption && isEmoji(icon);
  
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
    if (isEmojiIcon) {
      return <span className="text-base leading-none">{icon}</span>;
    } else if (IconComponent) {
      return <IconComponent className={className} />;
    } else {
      return <TrendingUp className={className} />;
    }
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

function DraggableTemplate({
  template,
  index,
  moveTemplate,
  onIconChange,
  onDelete,
  onRename,
  onSelect,
  onSelectWithoutClosing,
  isSelected,
  templates,
  onUpdateTemplates,
  deletingTemplateId,
  setDeletingTemplateId,
}: DraggableTemplateProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(template.name);
  const [iconTab, setIconTab] = useState<'icons' | 'emojis' | 'flags'>('icons');
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);

  const [{ isDragging }, drag, dragPreview] = useDrag({
    type: "template",
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: "template",
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        moveTemplate(item.index, index);
        item.index = index;
      }
    },
  });

  const iconOption = iconOptions.find(opt => opt.name === template.icon);
  const IconComponent = iconOption?.component;
  const isEmojiIcon = !iconOption && isEmoji(template.icon);
  const hasWidgets = template.widgets && template.widgets.length > 0;

  const handleSave = () => {
    if (editName.trim()) {
      onRename(template.id, editName.trim());
      setIsEditing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setEditName(template.name);
      setIsEditing(false);
    }
  };

  const isDeleting = deletingTemplateId === template.id;

  return (
    <div className="rounded border border-border relative overflow-hidden" data-templateid={template.id}>
      {/* Delete Confirmation - absolute overlay that inherits parent height */}
      {isDeleting && (
        <div className="absolute inset-0 bg-destructive/90 px-3 flex items-center justify-between rounded animate-slide-in-left z-10">
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-white" />
            <span className="text-sm text-white">Really want to delete?</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const updatedTemplates = templates.filter(t => t.id !== template.id);
                onUpdateTemplates(updatedTemplates);
                setDeletingTemplateId(null);
              }}
              className="px-3 py-1 bg-white text-destructive text-xs rounded hover:bg-white/90 transition-colors"
            >
              Yes
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeletingTemplateId(null);
              }}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      {/* Normal Template View - always rendered to maintain height */}
      <div className={`flex items-center ${isDeleting ? 'invisible' : ''}`}>
        <div
          ref={(node) => {
            dragPreview(drop(node));
          }}
          className={`flex items-center gap-2 px-3 py-2 transition-colors flex-1 ${
            isDragging ? "opacity-50" : ""
          } ${
            isSelected
              ? "bg-primary/10 text-primary"
              : "bg-widget-body text-foreground hover:bg-muted"
          }`}
        >
          <div
            ref={(node) => {
              drag(node);
            }}
            className="cursor-move text-muted-foreground hover:text-foreground"
          >
            <GripVertical className="w-4 h-4" />
            </div>

          <Popover open={isIconPickerOpen} onOpenChange={setIsIconPickerOpen}>
            <PopoverTrigger asChild>
              <button className="hover:bg-muted p-1 rounded">
                <TemplateIconOrImage 
                  templateName={template.name}
                  icon={template.icon}
                  className="w-4 h-4"
                />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 bg-popover border-border p-2">
              {/* Tab Buttons */}
              <div className="flex gap-1 p-1 bg-muted/50 border border-border rounded mb-2">
                <button
                  onClick={() => setIconTab('icons')}
                  className={`flex-1 px-2 py-1 text-xs rounded transition-all ${
                    iconTab === 'icons'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  Icons
                </button>
                <button
                  onClick={() => setIconTab('emojis')}
                  className={`flex-1 px-2 py-1 text-xs rounded transition-all ${
                    iconTab === 'emojis'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  Emojis
                </button>
                <button
                  onClick={() => setIconTab('flags')}
                  className={`flex-1 px-2 py-1 text-xs rounded transition-all ${
                    iconTab === 'flags'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  Flags
                </button>
              </div>
              
              {/* Icons Grid */}
              {iconTab === 'icons' && (
                <div className="grid grid-cols-8 gap-1 max-h-[150px] overflow-y-auto">
                  {iconOptions.map((icon) => {
                    const Icon = icon.component;
                    return (
                      <button
                        key={icon.name}
                        onClick={(e) => {
                          e.stopPropagation();
                          onIconChange(template.id, icon.name);
                          setIsIconPickerOpen(false);
                        }}
                        className={`p-1.5 rounded hover:bg-muted transition-colors ${
                          template.icon === icon.name
                            ? "bg-primary/10 text-primary"
                            : "text-foreground"
                        }`}
                        title={icon.name}
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              )}
              
              {/* Emojis Grid */}
              {iconTab === 'emojis' && (
                <div className="grid grid-cols-8 gap-1 max-h-[150px] overflow-y-auto">
                  {emojis.map((emoji, index) => (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation();
                        onIconChange(template.id, emoji);
                        setIsIconPickerOpen(false);
                      }}
                      className={`p-1.5 rounded text-base hover:bg-muted transition-colors ${
                        template.icon === emoji
                          ? "bg-primary/10"
                          : ""
                      }`}
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
              
              {/* Flags Grid */}
              {iconTab === 'flags' && (
                <div className="grid grid-cols-8 gap-1 max-h-[150px] overflow-y-auto">
                  {flags.map((flag, index) => (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation();
                        onIconChange(template.id, flag);
                        setIsIconPickerOpen(false);
                      }}
                      className={`p-1.5 rounded text-base hover:bg-muted transition-colors ${
                        template.icon === flag
                          ? "bg-primary/10"
                          : ""
                      }`}
                      title={flag}
                    >
                      {flag}
                    </button>
                  ))}
                </div>
              )}
            </PopoverContent>
          </Popover>

          {isEditing ? (
            <div className="flex-1 flex items-center gap-1">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={handleKeyPress}
                onBlur={handleSave}
                className="h-6 text-sm"
                autoFocus
              />
            </div>
          ) : (
            <div
              onClick={() => onSelectWithoutClosing ? onSelectWithoutClosing(template.id) : onSelect(template.id)}
              className="text-left flex-1 hover:text-foreground transition-colors cursor-pointer py-1"
            >
              <div className="text-sm font-medium flex items-center gap-2">
                <span>{template.name}</span>
                {template.displayOrder === -1 && (
                  <span className="text-xs px-1.5 py-0.5 bg-muted text-muted-foreground rounded border border-border">
                    Closed
                  </span>
                )}
              </div>
              {hasWidgets && (
                <div className="text-xs text-muted-foreground">
                  {template.widgets?.length} widgets
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Action buttons OUTSIDE of drag/drop wrapper */}
        <div 
          className="flex items-center gap-1 px-2 relative z-50"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
          }}
        >
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
              
              // BYPASS onToggleFavorite - work directly with templates
              const updatedTemplates = templates.map((t) =>
                t.id === template.id ? { ...t, isFavorite: !t.isFavorite } : t
              );
              onUpdateTemplates(updatedTemplates);
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
            }}
            onMouseUp={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
            }}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="p-2 rounded hover:bg-muted transition-colors flex items-center justify-center relative z-50"
            title={template.isFavorite ? "Remove from favorites" : "Add to favorites"}
            style={{ pointerEvents: 'auto' }}
          >
            <Star
              className={`w-5 h-5 transition-all duration-200 ${
                template.isFavorite
                  ? "text-yellow-400 fill-yellow-400"
                  : "text-muted-foreground hover:text-yellow-400 hover:scale-110"
              }`}
              style={{
                fill: template.isFavorite ? 'currentColor' : 'none',
                color: template.isFavorite ? '#fbbf24' : undefined
              }}
            />
          </button>
          
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsEditing(true);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            className="p-2 rounded hover:bg-muted transition-colors flex items-center justify-center"
            title="Rename template"
          >
            <Edit2 className="w-4 h-4 text-muted-foreground hover:text-foreground" />
          </button>
          
          <button
            onClick={(e) => {
              if (template.displayOrder === -1) {
                e.preventDefault();
                e.stopPropagation();
                // Calculate the highest displayOrder and add 1
                const maxDisplayOrder = Math.max(
                  0,
                  ...templates
                    .filter((t) => t.displayOrder !== undefined && t.displayOrder !== -1)
                    .map((t) => t.displayOrder as number)
                );
                const newDisplayOrder = maxDisplayOrder + 1;
                const updatedTemplates = templates.map((t) =>
                  t.id === template.id ? { ...t, displayOrder: newDisplayOrder } : t
                );
                onUpdateTemplates(updatedTemplates);
                
                // Open the template after updating displayOrder
                if (onSelectWithoutClosing) {
                  onSelectWithoutClosing(template.id);
                } else {
                  onSelect(template.id);
                }
              }
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            className={`p-2 rounded flex items-center justify-center ${
              template.displayOrder === -1
                ? "hover:bg-muted transition-colors cursor-pointer"
                : "cursor-default"
            }`}
            title={template.displayOrder === -1 ? "Open template in tab bar" : "Template is open in tab bar"}
          >
            <FolderOpen
              className={`w-4 h-4 ${
                template.displayOrder === -1
                  ? "text-gray-400 hover:text-green-500 transition-colors"
                  : "text-green-500"
              }`}
            />
          </button>
          
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(template.id);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            className="p-2 rounded hover:bg-muted transition-colors flex items-center justify-center"
            title="Delete template"
          >
            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function TemplateManager({
  templates,
  selectedTemplate,
  onSelectTemplate,
  onSelectTemplateWithoutClosing,
  onUpdateTemplates,
  onShowLibrary,
  onCreateNewTemplate,
  onReorderTemplates,
}: TemplateManagerProps) {
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);

  const moveTemplate = (dragIndex: number, hoverIndex: number) => {
    const draggedTemplate = templates[dragIndex];
    const newTemplates = [...templates];
    newTemplates.splice(dragIndex, 1);
    newTemplates.splice(hoverIndex, 0, draggedTemplate);
    
    // Update local UI immediately
    onUpdateTemplates(newTemplates);
    
    // Call API to persist the new order with updated displayOrder values
    if (onReorderTemplates) {
      onReorderTemplates(newTemplates);
    }
  };

  const handleIconChange = (id: string, icon: string) => {
    const updatedTemplates = templates.map((template) =>
      template.id === id ? { ...template, icon } : template
    );
    onUpdateTemplates(updatedTemplates);
  };

  const handleToggleFavorite = (id: string) => {
    const updatedTemplates = templates.map((template) =>
      template.id === id ? { ...template, isFavorite: !template.isFavorite } : template
    );
    
    onUpdateTemplates(updatedTemplates);
  };

  const handleRename = (id: string, newName: string) => {
    const updatedTemplates = templates.map((template) =>
      template.id === id ? { ...template, name: newName } : template
    );
    onUpdateTemplates(updatedTemplates);
  };

  const handleDelete = (id: string) => {
    setDeletingTemplateId(id);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-2">
        {templates.map((template, index) => (
          <DraggableTemplate
            key={template.id}
            template={template}
            index={index}
            moveTemplate={moveTemplate}
            onIconChange={handleIconChange}
            onToggleFavorite={handleToggleFavorite}
            onRename={handleRename}
            onDelete={handleDelete}
            onSelect={onSelectTemplate}
            onSelectWithoutClosing={onSelectTemplateWithoutClosing}
            isSelected={selectedTemplate === template.name}
            templates={templates}
            onUpdateTemplates={onUpdateTemplates}
            deletingTemplateId={deletingTemplateId}
            setDeletingTemplateId={setDeletingTemplateId}
          />
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="space-y-3">
          <Button
            onClick={onCreateNewTemplate}
            className="w-full rounded h-11 bg-primary/5 text-primary border border-dashed border-primary/60 hover:bg-primary/10 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Template
          </Button>

          <Button
            onClick={onShowLibrary}
            className="w-full h-11 rounded bg-transparent text-primary-foreground border border-primary/30 hover:bg-transparent"
          >
            <ArrowLeftRight className="w-4 h-4 mr-2" />
            Template Library
          </Button>
        </div>
      </div>
    </DndProvider>
  );
}
