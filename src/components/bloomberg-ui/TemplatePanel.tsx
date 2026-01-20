"use client";

import { X } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { TemplateManager } from "@/components/bloomberg-ui/TemplateManager";
import { TemplateLibrary } from "@/components/bloomberg-ui/TemplateLibrary";
import { UserTemplate } from "@/lib/templateApi";
import { fetchAllSymbols, isTemplateNameSimilarToSymbol } from "@/utils/symbolValidation";

export interface Template {
  id: string;
  name: string;
  icon: string;
  isFavorite: boolean;
  displayOrder?: number;
  templateType?: string;
  widgets?: {
    id: string;
    type: string;
    position: string;
    settings?: Record<string, unknown>;
  }[];
}

interface TemplatePanelProps {
  isOpen: boolean;
  onClose: () => void;
  templates: UserTemplate[];
  selectedTemplate: string;
  onSelectTemplate: (templateId: string) => void;
  onCreateNewTemplate: () => void;
  onTemplateDelete?: (templateId: string) => void;
  onTemplateRename?: (templateId: string, newName: string) => void;
  onTemplateStar?: (templateId: string, isFavorite: boolean) => void;
  onTemplateDisplayOrder?: (templateId: string, displayOrder: number) => void;
  onTemplateIconChange?: (templateId: string, icon: string) => void;
  onReorderTemplates?: (reorderedTemplates: UserTemplate[]) => void;
}

export function TemplatePanel({
  isOpen,
  onClose,
  templates: externalTemplates,
  selectedTemplate,
  onSelectTemplate,
  onCreateNewTemplate,
  onTemplateDelete,
  onTemplateRename,
  onTemplateStar,
  onTemplateDisplayOrder,
  onTemplateIconChange,
  onReorderTemplates,
}: TemplatePanelProps) {
  const [showLibrary, setShowLibrary] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [symbols, setSymbols] = useState<string[]>([]);
  const [isLoadingSymbols, setIsLoadingSymbols] = useState(false);

  // Fetch symbols from get-symbols API
  useEffect(() => {
    const fetchSymbols = async () => {
      setIsLoadingSymbols(true);
      try {
        const symbols = await fetchAllSymbols();
        setSymbols(symbols);
      } catch (error) {
        console.error('Error fetching symbols:', error);
      } finally {
        setIsLoadingSymbols(false);
      }
    };

    fetchSymbols();
  }, []);

  // Handle slide animation
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      window.dispatchEvent(new CustomEvent('panel-opening', { detail: { panel: 'templates' } }));
    } else {
      setIsAnimating(false);
      setShowLibrary(false);
    }
  }, [isOpen]);

  // Listen for other panels opening
  useEffect(() => {
    const handlePanelOpening = (event: Event) => {
      const customEvent = event as CustomEvent<{ panel: string }>;
      if (customEvent.detail.panel !== 'templates' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('panel-opening', handlePanelOpening);
    return () => window.removeEventListener('panel-opening', handlePanelOpening);
  }, [isOpen, onClose]);

  // Filter templates - hide those with names similar to symbols
  // EXCEPT for Details templates which are named after symbols by design
  const filteredTemplates = externalTemplates.filter(template => {
    if (isLoadingSymbols || symbols.length === 0) {
      return true; // Show all templates while loading or if no symbols found
    }
    // Details templates are intentionally named after symbols, so don't filter them
    if (template.templateType === 'Details') {
      return true;
    }
    return !isTemplateNameSimilarToSymbol(template.name, symbols);
  });

  // Convert UserTemplate to Template format
  const templates = filteredTemplates.map(userTemplate => ({
    id: userTemplate.id,
    name: userTemplate.name,
    icon: userTemplate.icon || "Star",
    isFavorite: userTemplate.isFavorite || false,
    displayOrder: userTemplate.displayOrder,
    templateType: userTemplate.templateType,
    widgets: userTemplate.widgets?.map(widget => ({
      id: widget.id,
      type: widget.name || "",
      position: widget.position,
      settings: widget.settings || {},
    })),
  }));

  const handleSelectTemplate = (templateId: string) => {
    onSelectTemplate(templateId);
    onClose();
  };

  const handleSelectTemplateWithoutClosing = (templateId: string) => {
    onSelectTemplate(templateId);
  };

  const handleUpdateTemplates = (updatedTemplates: Template[]) => {
    // Handle template updates (delete, rename, star toggle, etc.)
    if (onTemplateDelete) {
      const deletedTemplates = templates.filter(t =>
        !updatedTemplates.find(ut => ut.id === t.id)
      );
      deletedTemplates.forEach(template => {
        onTemplateDelete(template.id);
      });
    }

    if (onTemplateRename) {
      updatedTemplates.forEach(updatedTemplate => {
        const originalTemplate = templates.find(t => t.id === updatedTemplate.id);
        if (originalTemplate && originalTemplate.name !== updatedTemplate.name) {
          onTemplateRename(updatedTemplate.id, updatedTemplate.name);
        }
      });
    }

    if (onTemplateStar) {
      updatedTemplates.forEach(updatedTemplate => {
        const originalTemplate = templates.find(t => t.id === updatedTemplate.id);
        if (originalTemplate && originalTemplate.isFavorite !== updatedTemplate.isFavorite) {
          onTemplateStar(updatedTemplate.id, updatedTemplate.isFavorite);
        }
      });
    }

    if (onTemplateDisplayOrder) {
      updatedTemplates.forEach(updatedTemplate => {
        const originalTemplate = templates.find(t => t.id === updatedTemplate.id);
        if (originalTemplate && originalTemplate.displayOrder !== updatedTemplate.displayOrder) {
          onTemplateDisplayOrder(updatedTemplate.id, updatedTemplate.displayOrder ?? 0);
        }
      });
    }

    if (onTemplateIconChange) {
      updatedTemplates.forEach(updatedTemplate => {
        const originalTemplate = templates.find(t => t.id === updatedTemplate.id);
        if (originalTemplate && originalTemplate.icon !== updatedTemplate.icon) {
          onTemplateIconChange(updatedTemplate.id, updatedTemplate.icon);
        }
      });
    }
  };

  const handleReorderTemplates = (updatedTemplates: Template[]) => {
    if (onReorderTemplates) {
      const reorderedUserTemplates = updatedTemplates.map(t => {
        const userTemplate = externalTemplates.find(ut => ut.id === t.id);
        const widgets = (t.widgets ?? []).map(w => ({
          id: w.id,
          name: w.type || '',
          position: w.position,
          settings: w.settings ?? {},
        }));

        if (userTemplate) {
          return {
            ...userTemplate,
            ...t,
            widgets,
          };
        } else {
          return {
            ...t,
            widgets,
            layout: "default",
            saved: true,
          } as UserTemplate;
        }
      });
      onReorderTemplates(reorderedUserTemplates as UserTemplate[]);
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 ${
            isAnimating ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          onClick={onClose}
        />
      )}

      {/* Template Panel - Slides from Left */}
      <div
        className={`fixed left-0 top-0 bottom-0 w-[420px] max-w-[90vw] bg-popover border-r border-border z-50 flex flex-col transition-transform duration-300 ease-out ${
          isAnimating ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-6 pt-6 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg leading-none font-semibold text-foreground">
              {showLibrary ? "Template Library" : "Templates"}
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              {showLibrary
                ? "Choose from our collection of professional trading layouts"
                : "Manage your templates with drag & drop, icons, and favorites"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
          {showLibrary ? (
            <TemplateLibrary
              onSelectTemplate={(libTemplate) => {
                handleSelectTemplate(libTemplate.name);
                setShowLibrary(false);
              }}
              onBack={() => setShowLibrary(false)}
            />
          ) : (
            <TemplateManager
              templates={templates}
              selectedTemplate={selectedTemplate}
              onCreateNewTemplate={() => {
                onCreateNewTemplate();
                onClose();
              }}
              onSelectTemplate={handleSelectTemplate}
              onSelectTemplateWithoutClosing={handleSelectTemplateWithoutClosing}
              onReorderTemplates={handleReorderTemplates}
              onUpdateTemplates={handleUpdateTemplates}
              onShowLibrary={() => setShowLibrary(true)}
            />
          )}
        </div>
      </div>
    </>
  );
}
