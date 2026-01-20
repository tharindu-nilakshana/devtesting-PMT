/**
 * Local Template Storage Service
 * 
 * This service mirrors the backend API structure for template saving
 * and can be easily replaced when the backend API is ready.
 */

export interface TemplateWidget {
  id: string;
  widgetId: string;
  position: string;
  coordinates: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  additionalSettings?: string;
}

export interface SavedTemplate {
  id: string;
  templateName: string;
  layoutType: string;
  isFreeFloating: boolean;
  widgets: TemplateWidget[];
  icon: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateRequest {
  templateName: string;
  layoutType: string;
  isFreeFloating: boolean;
  widgets: {
    widgetId: string;
    position: string;
    coordinates: {
      top: number;
      left: number;
      width: number;
      height: number;
    };
    additionalSettings?: string;
  }[];
  icon: string;
  isFavorite: boolean;
}

export interface CreateTemplateResponse {
  success: boolean;
  templateId: string;
  message: string;
  template: SavedTemplate;
}

export interface GetTemplatesResponse {
  success: boolean;
  templates: SavedTemplate[];
}

class LocalTemplateStorage {
  private storageKey = 'pmt_saved_templates';
  private nextId = 1;

  /**
   * Generate a unique template ID
   */
  private generateTemplateId(): string {
    return `template_${Date.now()}_${this.nextId++}`;
  }

  /**
   * Generate a unique widget ID
   */
  private generateWidgetId(): string {
    return `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get all saved templates from localStorage
   */
  private getTemplates(): SavedTemplate[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading templates from localStorage:', error);
      return [];
    }
  }

  /**
   * Save templates to localStorage
   */
  private saveTemplates(templates: SavedTemplate[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(templates));
    } catch (error) {
      console.error('Error saving templates to localStorage:', error);
    }
  }

  /**
   * Create or update a template by name
   */
  async createOrUpdateTemplate(request: CreateTemplateRequest, replaceExisting: boolean = false): Promise<CreateTemplateResponse> {
    try {
      const templates = this.getTemplates();
      
      // Check if template name already exists
      const existingTemplate = templates.find(t => t.templateName === request.templateName);
      if (existingTemplate && !replaceExisting) {
        return {
          success: false,
          templateId: existingTemplate.id,
          message: 'Template name already exists',
          template: {} as SavedTemplate
        };
      }

      const now = new Date().toISOString();

      // Create widgets with generated IDs
      const widgets: TemplateWidget[] = request.widgets.map(widget => ({
        id: this.generateWidgetId(),
        widgetId: widget.widgetId,
        position: widget.position,
        coordinates: widget.coordinates,
        additionalSettings: widget.additionalSettings || ''
      }));

      let templateToSave: SavedTemplate;
      let isUpdate = false;

      if (existingTemplate && replaceExisting) {
        // Update existing template
        templateToSave = {
          ...existingTemplate,
          templateName: request.templateName,
          layoutType: request.layoutType,
          isFreeFloating: request.isFreeFloating,
          widgets,
          icon: request.icon,
          isFavorite: request.isFavorite,
          updatedAt: now
        };
        isUpdate = true;
        
        // Replace in templates array
        const templateIndex = templates.findIndex(t => t.id === existingTemplate.id);
        if (templateIndex !== -1) {
          templates[templateIndex] = templateToSave;
        }
      } else {
        // Create new template
        templateToSave = {
          id: this.generateTemplateId(),
          templateName: request.templateName,
          layoutType: request.layoutType,
          isFreeFloating: request.isFreeFloating,
          widgets,
          icon: request.icon,
          isFavorite: request.isFavorite,
          createdAt: now,
          updatedAt: now
        };
        
        // Add to templates array
        templates.push(templateToSave);
      }

      this.saveTemplates(templates);

      return {
        success: true,
        templateId: templateToSave.id,
        message: isUpdate ? 'Template updated successfully' : 'Template saved successfully',
        template: templateToSave
      };
    } catch (error) {
      console.error('Error creating template:', error);
      return {
        success: false,
        templateId: '',
        message: 'Failed to save template',
        template: {} as SavedTemplate
      };
    }
  }

  /**
   * Create a new template (backward compatibility)
   */
  async createTemplate(request: CreateTemplateRequest): Promise<CreateTemplateResponse> {
    return this.createOrUpdateTemplate(request, false);
  }

  /**
   * Update an existing template
   */
  async updateTemplate(templateId: string, request: CreateTemplateRequest): Promise<CreateTemplateResponse> {
    try {
      const templates = this.getTemplates();
      const templateIndex = templates.findIndex(t => t.id === templateId);
      
      if (templateIndex === -1) {
        return {
          success: false,
          templateId: '',
          message: 'Template not found',
          template: {} as SavedTemplate
        };
      }

      // Check if new name conflicts with other templates
      const existingTemplate = templates.find(t => t.templateName === request.templateName && t.id !== templateId);
      if (existingTemplate) {
        return {
          success: false,
          templateId: '',
          message: 'Template name already exists',
          template: {} as SavedTemplate
        };
      }

      const now = new Date().toISOString();

      // Create widgets with generated IDs
      const widgets: TemplateWidget[] = request.widgets.map(widget => ({
        id: this.generateWidgetId(),
        widgetId: widget.widgetId,
        position: widget.position,
        coordinates: widget.coordinates,
        additionalSettings: widget.additionalSettings || ''
      }));

      const updatedTemplate: SavedTemplate = {
        ...templates[templateIndex],
        templateName: request.templateName,
        layoutType: request.layoutType,
        isFreeFloating: request.isFreeFloating,
        icon: request.icon,
        isFavorite: request.isFavorite,
        widgets,
        updatedAt: now
      };

      // Update in templates array
      templates[templateIndex] = updatedTemplate;
      this.saveTemplates(templates);

      return {
        success: true,
        templateId,
        message: 'Template updated successfully',
        template: updatedTemplate
      };
    } catch (error) {
      console.error('Error updating template:', error);
      return {
        success: false,
        templateId: '',
        message: 'Failed to update template',
        template: {} as SavedTemplate
      };
    }
  }

  /**
   * Get all templates for the current user
   */
  async getTemplatesByUser(): Promise<GetTemplatesResponse> {
    try {
      const templates = this.getTemplates();
      return {
        success: true,
        templates
      };
    } catch (error) {
      console.error('Error getting templates:', error);
      return {
        success: false,
        templates: []
      };
    }
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string): Promise<{ success: boolean; message: string }> {
    try {
      const templates = this.getTemplates();
      const filteredTemplates = templates.filter(t => t.id !== templateId);
      
      if (filteredTemplates.length === templates.length) {
        return {
          success: false,
          message: 'Template not found'
        };
      }

      this.saveTemplates(filteredTemplates);
      return {
        success: true,
        message: 'Template deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting template:', error);
      return {
        success: false,
        message: 'Failed to delete template'
      };
    }
  }

  /**
   * Reorder templates based on provided template IDs
   */
  async reorderTemplates(templateIds: string[]): Promise<{ success: boolean; message: string }> {
    try {
      const templates = this.getTemplates();
      const reorderedTemplates: SavedTemplate[] = [];
      
      // Reorder templates based on the provided order
      templateIds.forEach(templateId => {
        const template = templates.find(t => t.id === templateId);
        if (template) {
          reorderedTemplates.push(template);
        }
      });
      
      // Add any remaining templates that weren't in the reorder list
      templates.forEach(template => {
        if (!templateIds.includes(template.id)) {
          reorderedTemplates.push(template);
        }
      });
      
      this.saveTemplates(reorderedTemplates);
      
      return {
        success: true,
        message: 'Templates reordered successfully'
      };
    } catch (error) {
      console.error('Error reordering templates:', error);
      return {
        success: false,
        message: 'Failed to reorder templates'
      };
    }
  }

  /**
   * Clear all templates (for testing/reset)
   */
  clearAllTemplates(): void {
    localStorage.removeItem(this.storageKey);
  }
}

// Export singleton instance
export const localTemplateStorage = new LocalTemplateStorage();
